// Offline research, not a realtime host: Pd calls lock; arbitrary patches are unbounded.
#include "z_libpd.h"
#include <algorithm>
#include <array>
#include <cmath>
#include <chrono>
#include <iostream>
#include <memory>
#include <stdexcept>
#include <string>
#include <vector>
using Tick = std::array<float,128>;
void require(bool ok,const char* why){if(!ok)throw std::runtime_error(why);}
struct Device {
    t_pdinstance* instance=nullptr; void* patch=nullptr;
    explicit Device(const std::string& path){
        instance=libpd_new_instance(); require(instance,"new instance"); select();
        require(libpd_init_audio(1,2,48000)==0,"init audio");
        patch=libpd_openfile("voice.pd",path.c_str()); require(patch,"open patch");
        libpd_start_message(1);libpd_add_float(1);require(libpd_finish_message("pd","dsp")==0,"dsp on");
        set("frequency",440);set("gain",0.5f);set("gate",0);
    }
    Device(const Device&)=delete; Device& operator=(const Device&)=delete;
    void select(){libpd_set_instance(instance);}
    void set(const char* name,float x){select();require(libpd_float(name,x)==0,"receiver missing");}
    Tick tick(const std::array<float,64>& input={}){
        select();Tick result{};require(libpd_process_float(1,input.data(),result.data())==0,"process");return result;
    }
    ~Device(){select();libpd_closefile(patch);libpd_free_instance(instance);}
};
float peak(const Tick& x,int channel){float m=0;for(int i=channel;i<128;i+=2)m=std::max(m,std::abs(x[i]));return m;}
struct Event {int frame;const char* receiver;float value;};
// Offline score capacity and tick work limit are deliberately explicit, not Pd guarantees.
struct Score {
    std::array<Event,256> events{};int size=0,next=0,rejected=0;bool panic=false;
    bool push(Event e){
        if(size==256){++rejected;panic=true;return false;}
        require(size==0 || events[size-1].frame<=e.frame,"unsorted score");events[size++]=e;return true;
    }
    void apply(Device& d,int tickStart){
        int count=0;while(next<size && events[next].frame<=tickStart && count<16){
            auto e=events[next++];d.set(e.receiver,e.value);++count;
        }
        if(next<size && events[next].frame<=tickStart){panic=true;while(next<size && events[next].frame<=tickStart)++next;}
        // Guaranteed bounded reset for this known patch only; release ends within one tick.
        if(panic){d.set("gate",0);panic=false;}
    }
};
// Causal arbitrary-size input adapter: return previous tick while collecting next.
// Exactly one tick of deliberate latency. Aligned direct processing below needs none.
std::vector<float> render(const std::string& path,const std::vector<int>& chunks,bool events){
    Device d(path);Score score;
    if(events){score.push({65,"gate",1});score.push({257,"gain",0});score.push({385,"gate",0});}
    std::array<float,64> in{};Tick ready{};std::vector<float> out(2048);int cursor=0,k=0;
    while(cursor<1024){int n=std::min(chunks[k++%chunks.size()],1024-cursor);require(n>0,"invalid chunk");
        for(int j=0;j<n;++j){int f=cursor+j,p=f%64;out[2*f]=ready[2*p];out[2*f+1]=ready[2*p+1];
            in[p]=(f==0?1.f:0.f);
            if(p==63){score.apply(d,f-63);ready=d.tick(in);}
        }cursor+=n;
    }return out;
}
int main(int argc,char** argv){try{
    require(argc==2,"usage: probe PATCH_DIRECTORY");std::string path=argv[1];
    libpd_init();require(libpd_blocksize()==64,"requires pinned 64-frame tick");
    {
        Device a(path),b(path);require(libpd_num_instances()>=3,"MULTI build required");
        a.set("gate",1);auto aa=a.tick();auto bb=b.tick();require(peak(aa,0)>0.1f && peak(bb,0)==0,"receiver cross-talk");
        b.set("gate",1);b.set("gain",0.125f);a.set("gain",0);aa=a.tick();bb=b.tick();require(peak(aa,0)==0 && peak(bb,0)>0.01f && peak(bb,0)<=0.12501f,"independent gains");
        b.set("gate",0);b.tick();require(peak(b.tick(),0)==0,"note-off release");
    }std::cout<<"PASS isolation (same receiver names, independent note/gain state)\n";
    {
        Device d(path);Score s;s.push({65,"gate",1});s.push({257,"gain",0});
        for(int t=0;t<7;++t){s.apply(d,t*64);auto x=d.tick();
            if(t<2 || t>=5)require(peak(x,0)==0,"event quantization");else require(peak(x,0)>0.1f,"missing note");
        }
    }std::cout<<"PASS tick_events (65 -> 128 onset tick; 257 -> 320 gain-zero tick)\n";
    {
        Device d(path);std::array<float,64> in{};in[0]=1;auto x=d.tick(in);require(x[1]==1,"aligned input impulse");
        for(int i=1;i<64;++i)require(x[2*i+1]==0,"impulse tail");
        auto r=render(path,{32},false);for(int i=0;i<1024;++i)require(r[2*i+1]==(i==64?1.f:0.f),"FIFO delay");
    }std::cout<<"PASS input_delay (aligned direct=0; causal FIFO=64 frames, 1.333333 ms at 48k)\n";
    {
        auto a=render(path,{64},true);for(auto chunks:std::vector<std::vector<int>>{{32},{128},{1,31,7,96,128,3}}){auto b=render(path,chunks,true);require(a==b,"partition-dependent result");}
        for(int i=0;i<192;++i)require(a[2*i]==0,"FIFO note early");
        require(std::abs(a[2*200])>0.001,"FIFO note missing");
        for(int i=384;i<1024;++i)require(a[2*i]==0,"FIFO gain late");
    }std::cout<<"PASS partitions (32/64/128/variable bit-identical; FIFO gate tick 192, gain 384)\n";
    {
        // All prepare, activation and retirement are stopped/offline. No concurrent load claim.
        auto active=std::make_unique<Device>(path);active->set("gate",1);active->tick();
        auto prepared=std::make_unique<Device>(path);require(peak(prepared->tick(),0)==0,"replacement default not reset");
        prepared->set("gain",0.2f);prepared->set("gate",1);
        auto retired=std::move(active);active=std::move(prepared); // stopped owner/routing swap
        auto x=active->tick();require(peak(x,0)>0.01f && peak(x,0)<=0.20001f,"replacement routing");
        retired.reset();require(peak(active->tick(),0)>0.01f,"retirement corrupts replacement");
    }std::cout<<"PASS replacement (stopped/offline prepare, explicit reset, close/free)\n";
    {
        Device d(path);Score s;for(int i=0;i<300;++i)s.push({0,"gate",1});require(s.size==256 && s.rejected==44,"queue capacity");s.apply(d,0);require(s.next==256,"burst drop");d.tick();require(peak(d.tick(),0)==0,"panic leaves stuck note");
    }std::cout<<"PASS burst (capacity 256, 44 rejected; 16 messages/tick then drop due remainder + gate reset)\n";
    {
        Device d(path);d.set("gate",1);auto attack=d.tick();require(attack[0]==0,"attack starts nonzero");
        d.tick();float maxAmplitude=0,previous=0;int crossings=0;
        for(int t=0;t<750;++t){auto x=d.tick();for(int i=0;i<64;++i){float value=x[2*i];
            if(previous<0 && value>=0){++crossings;} previous=value;maxAmplitude=std::max(maxAmplitude,std::abs(value));}}
        require(std::abs(crossings-440)<=1,"oscillator frequency outside 1 Hz tolerance");
        require(std::abs(maxAmplitude-0.5f)<0.0001f,"gain amplitude outside 1e-4 tolerance");
        d.set("gate",0);int lastNonzero=-1;for(int t=0;t<3;++t){auto x=d.tick();for(int i=0;i<64;++i)if(std::abs(x[2*i])>1e-7f)lastNonzero=t*64+i;}
        require(lastNonzero>=0 && lastNonzero<128,"release exceeds two tick bound");
        std::cout<<"PASS signal (440 Hz crossing estimate="<<crossings<<" +/-1 Hz; gain peak="<<maxAmplitude<<" +/-1e-4; release last nonzero="<<lastNonzero<<" <128 frames)\n";
    }
    {
        Device a(path),b(path);a.set("gate",1);b.set("gate",1);
        std::vector<double> micros(10000);for(int i=0;i<100;++i){a.tick();b.tick();}
        for(auto& elapsed:micros){auto start=std::chrono::steady_clock::now();a.tick();b.tick();
            elapsed=std::chrono::duration<double,std::micro>(std::chrono::steady_clock::now()-start).count();}
        std::sort(micros.begin(),micros.end());
        std::cout<<"OBSERVE two-device 64-frame offline tick us: p50="<<micros[5000]<<" p99="<<micros[9900]<<" p99.9="<<micros[9990]<<" max="<<micros.back()<<"; no load/RT scheduling/hardware, not an acceptance benchmark\n";
    }
    std::cout<<"PASS all offline checks; no hardware or realtime-deadline claim\n";return 0;
}catch(const std::exception& e){std::cerr<<"FAIL "<<e.what()<<'\n';return 1;}}
