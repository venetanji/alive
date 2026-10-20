#include "clockwork_embed.h"
#include "audio_processor.h"
#include "guest/observe.hpp"
#include "instrument.hpp"
#include "../faust-reference/host.hpp"
#include <cstdio>
#include <cstring>
#include <iostream>
#include <string>
#include <cmath>
#include <algorithm>
void check(bool ok,const char*text){if(!ok)throw std::runtime_error(text);}
static bool bad_work=false;
using Audio=std::array<std::vector<float>,3>;
struct Packet {std::array<uint8_t,64>b{};};
void put(uint8_t*p,uint32_t n){p[0]=n>>24;p[1]=n>>16;p[2]=n>>8;p[3]=n;}
Packet packet(int64_t time,int dev,int gen,int kind,int note,int value){
 Packet p;std::memcpy(p.b.data(),"#bundle\0",8);put(&p.b[8],uint64_t(time)>>32);put(&p.b[12],uint32_t(time));put(&p.b[16],44);
 std::memcpy(&p.b[20],"/ultra/event\0",12);std::memcpy(&p.b[32],",iiiiii\0",8);
 put(&p.b[40],dev);put(&p.b[44],gen);put(&p.b[48],kind);put(&p.b[52],note);put(&p.b[56],value);return p;
}
struct Engine {
 ClockworkEmbed*h=nullptr;ClockworkClient*c=nullptr;int block=0;int64_t base=0;Work total{};
 Engine(int size){
  ClockworkEmbedConfig cfg{};cfg.struct_bytes=sizeof cfg;cfg.sample_rate=48000;cfg.block_size=size;cfg.output_channels=3;cfg.input_channels=1;cfg.max_render_frames=1024;
  ClockworkStatus status;h=clockwork_embed_attach(&cfg,&status);check(h&&status==CLOCKWORK_OK,"attach");c=clockwork_embed_client(h);block=clockwork_embed_block_size(h);check(block==size,"block geometry");
  Audio warm;for(auto&v:warm)v.resize(block);tick(warm,0,block,nullptr);
  ClockworkClientSampleClock clock{};clock.struct_bytes=sizeof clock;check(clockwork_client_sample_clock(c,&clock)==CLOCKWORK_OK,"sample clock");
  base=static_cast<int64_t>(static_cast<uint64_t>((static_cast<long double>(clock.dac_ntp)+static_cast<long double>(block)/48000)*4294967296.L));
 }
 ~Engine(){std::cout<<"work allocations="<<total.allocations<<" frees="<<total.frees<<" mutex_locks="<<total.locks<<"\n";bad_work|=total.allocations||total.frees||total.locks;if(h)clockwork_embed_close(h);}
 bool send(int frame,int dev,int gen,int kind,int note,int value){
  int64_t t=base+std::llround(frame*(4294967296.0/48000));auto p=packet(t,dev,gen,kind,note,value);
  return clockwork_client_send(c,p.b.data(),p.b.size(),123)==CLOCKWORK_OK;
 }
 void score(const std::vector<Event>&s,int dev=0,int gen=0){for(auto&e:s)check(send(e.frame,dev,gen,int(e.kind),e.note,e.value),"score send");}
 void tick(Audio&a,int at,int n,const float*input){
  float*o[]={a[0].data()+at,a[1].data()+at,a[2].data()+at};const float*i[]={input};work={};measuring=true;
  auto rendered=clockwork_embed_render(h,o,3,input?i:nullptr,input?1:0,n);measuring=false;
  total.allocations+=work.allocations;total.frees+=work.frees;total.locks+=work.locks;check(rendered==unsigned(n),"render size");
 }
 Audio run(int n,const std::vector<int>&parts,const std::vector<float>*input=nullptr){Audio a;for(auto&v:a)v.resize(n);for(int at=0,k=0;at<n;k++){int count=std::min(parts[k%parts.size()],n-at);tick(a,at,count,input?input->data()+at:nullptr);at+=count;}return a;}
};
float difference(const std::vector<float>&a,const std::vector<float>&b){check(a.size()==b.size(),"comparison length");float x=0;for(size_t i=0;i<a.size();i++){check(std::isfinite(a[i])&&std::isfinite(b[i]),"nonfinite comparison");x=std::max(x,std::abs(a[i]-b[i]));}return x;}
const std::vector<Event> reference={
 {0,Kind::On,60,127},{31,Kind::On,62,100},{32,Kind::On,64,80},{63,Kind::On,65,60},
 {64,Kind::On,67,127},{65,Kind::Off,60,0},{80,Kind::Sustain,0,127},{97,Kind::Off,62,0},
 {111,Kind::Level,0,64},{128,Kind::Sustain,0,0},{160,Kind::AllOff,0,0},
 {181,Kind::On,69,127},{200,Kind::Reset,0,0},{219,Kind::On,72,127},{260,Kind::Off,72,0}};
void compare(int block,const std::vector<int>&parts){
 auto expected=render(reference,{1},512).audio;Engine e(block);e.score(reference);auto got=e.run(512,parts);auto obs=ultra_observe();float err=difference(got[0],expected);
 std::cout<<"compare block="<<block<<" partition="<<parts[0]<<" max_error="<<err<<" allocations="<<e.total.allocations<<" frees="<<e.total.frees<<" locks="<<e.total.locks<<" messages="<<obs.messages<<"\n";
 if(err){for(int i=0;i<512;i++)if(got[0][i]!=expected[i]){std::cerr<<"first diff "<<i<<" actual="<<got[0][i]<<" expected="<<expected[i]<<" late="<<obs.late<<" malformed="<<obs.malformed<<" active="<<obs.active[0]<<"\n";break;}}
 check(err==0,"direct reference not bit-exact");check(obs.messages==reference.size(),"messages not delivered");
 check(e.total.allocations==0&&e.total.frees==0&&e.total.locks==0,"render runtime work");
}

void timing(int block,const std::vector<int>&parts){
 std::vector<Event> score;
 for(int base:{0,256})for(int offset:{0,1,31,63,64,127}){
  score.push_back({base+offset,Kind::On,60+offset%12,110});
  score.push_back({base+offset,Kind::Level,0,32+offset%96});
  score.push_back({base+offset+17,Kind::Off,60+offset%12,0});
 }
 // Equal-time ordering is observable: last level wins and off-before-on restarts.
 score.push_back({31,Kind::Level,0,0});score.push_back({31,Kind::Level,0,127});
 score.push_back({127,Kind::Off,67,0});score.push_back({127,Kind::On,67,99});
 std::stable_sort(score.begin(),score.end(),[](auto&a,auto&b){return a.frame<b.frame;});
 auto expected=render(score,{1},768).audio;Engine e(block);e.score(score);auto got=e.run(768,parts);auto o=ultra_observe();
 std::cout<<"timing block="<<block<<" max_error="<<difference(got[0],expected)<<" late="<<o.late<<" max_spans="<<o.max_spans<<"\n";
 check(difference(got[0],expected)==0,"offset/equal ordering");check(!o.late,"unexpected late");
}
void immediate(int tag){
 Engine e(64);auto p=packet(tag,0,0,int(Kind::On),69,127);
 check(clockwork_client_send(e.c,p.b.data(),p.b.size(),123)==CLOCKWORK_OK,"literal immediate send");
 auto got=e.run(256,{1,31,63});auto want=render({{0,Kind::On,69,127}},{1},256).audio;
 check(got[0]==want&&ultra_observe().late==0,"literal immediate timetag placement");
 std::cout<<"immediate literal_tag="<<tag<<" current_block_exact=1 delivered_zero="<<ultra_observe().immediate0<<" delivered_one="<<ultra_observe().immediate1<<"\n";
}
void late(){Engine e(64);check(e.send(257,0,0,0,69,127),"future enqueue");auto a=e.run(128,{64});check(std::all_of(a[0].begin(),a[0].end(),[](float v){return v==0;}),"future fired early");
 check(e.send(1,1,0,0,72,100),"late enqueue");auto b=e.run(256,{1,31,63});auto want=render({{0,Kind::On,72,100}},{1},256).audio;
 check(b[1]==want,"late clamps current block start");check(ultra_observe().late==1,"late count");check(std::all_of(b[0].begin(),b[0].begin()+129,[](float x){return x==0;})&&b[0][129]!=0,"future frame257");std::cout<<"PASS late_future late=1 future_onset=257\n";
}
void isolation(int operation){
 std::vector<Event>b={{0,Kind::Level,0,77},{1,Kind::On,65,99},{127,Kind::Off,65,0},{181,Kind::On,72,110},{260,Kind::Off,72,0}};
 auto want=render(b,{1},512).audio;Engine e(64);e.score(b,1);check(e.send(0,0,0,0,60,127),"A on");
 check(e.send(127,0,0,0,80,127),"A old future");check(e.send(63,0,0,2,0,127),"A sustain");check(e.send(64,0,0,operation,0,0),"A lifecycle");
 check(e.send(128,0,1,0,69,99),"A new future");check(e.send(200,0,1,1,69,0),"A new off");
 auto got=e.run(512,{1,31,63,64,127});auto obs=ultra_observe();check(got[1]==want,"B altered by A lifecycle");
 check(obs.level[1]==77/127.f&&obs.generation[1]==0,"B parameters/identity");check(obs.stale==1&&obs.generation[0]==1,"A stale future not cancelled");
 check(got[0][127]==0&&got[0][128]!=0,"A swap/reset placement");
 std::cout<<"PASS isolation operation="<<operation<<" B_bit_exact=1 B_level="<<obs.level[1]<<" stale_A="<<obs.stale<<"\n";
}
void input(int block,const std::vector<int>&parts){
 Engine e(block);std::vector<float> in(2048);int k=0;for(int f:{0,1,31,32,33,63,64,127,128,511,1024})in[f]=++k;
 auto out=e.run(2048,parts,&in);std::array<int,12> seen{};int found=0;std::cout<<"input block="<<block<<" partition="<<parts[0]<<" mappings=";
 for(int f=0;f<2048;f++)if(out[2][f]){++found;check(std::isfinite(out[2][f])&&out[2][f]>=1&&out[2][f]<=k,"invalid impulse value");int label=int(out[2][f]);check(label>=1&&label<=k&&out[2][f]==label,"corrupted impulse");++seen[label];int source=int(std::find(in.begin(),in.end(),out[2][f])-in.begin());std::cout<<source<<":"<<f<<",";}
 std::cout<<"\n";check(found==k,"input loss/duplication");for(int i=1;i<=k;i++)check(seen[i]==1,"input duplicate or lost label");
 if(block==64&&parts==std::vector<int>{32})check(out[2][0]==1&&out[2][65]==5&&out[2][1056]==11,"known half-block mapping changed");
 if(block==64&&parts.size()>1)check(out[2][0]==1&&out[2][64]==2&&out[2][1087]==11,"known irregular mapping changed");if(parts.size()==1&&parts[0]%block==0)check(out[2]==in,"aligned input unexpected delay");
}
float tailpeak(const std::vector<float>&a){float peak=0;for(size_t i=a.size()-512;i<a.size();i++)peak=std::max(peak,std::abs(a[i]));return peak;}
void held(){
 std::vector<Event> s={{0,Kind::On,69,127},{1,Kind::Sustain,0,127},{31,Kind::Off,69,0},{5500,Kind::AllOff,0,0}};
 auto want=render(s,{1},6000).audio;Engine e(64);e.score(s);auto got=e.run(6000,{31,1,127});
 check(got[0]==want,"long sustain changed reference policy");check(got[0][4096]!=0,"hidden lease in normal mode");check(tailpeak(got[0])>0,"tail includes release onset");
 check(std::all_of(got[0].begin()+5516,got[0].end(),[](float x){return x==0;}),"alloff release");std::cout<<"PASS held_normal sustained_after2048=1 exact=1\n";
}
void lifecycle(){
 {Engine e(64);check(ultra_lifecycle().created==1,"guest construction");e.run(64,{64});}
 auto before=ultra_lifecycle();check(before.destroyed==0,"embed close unexpectedly destroys guest");
 destroy_dsp();auto after=ultra_lifecycle();check(after.destroyed==1&&after.in_render==0,"explicit stopped destruction");
 std::cout<<"lifecycle embed_close_destroyed=0 internal_destroy_dsp_destroyed=1 render_lifecycle=0\n";
}
void unsupported(int block){
 ClockworkEmbedConfig c{};c.struct_bytes=sizeof c;c.sample_rate=block==0?44100:48000;c.block_size=block?block:64;c.input_channels=1;c.output_channels=3;
 ClockworkStatus status;auto*h=clockwork_embed_attach(&c,&status);check(h&&status==CLOCKWORK_OK,"changed attach failure propagation");
 check(ultra_lifecycle().refused==1&&ultra_lifecycle().created==0,"guest did not refuse unsupported geometry");
 float a[1024]{},b[1024]{},cbuf[1024]{};float*o[]={a,b,cbuf};for(auto*channel:o)std::fill(channel,channel+64,123.f);
 work={};measuring=true;auto rendered=clockwork_embed_render(h,o,3,nullptr,0,64);measuring=false;
 check(rendered==64,"silent failed-guest render");for(auto*channel:o)check(std::all_of(channel,channel+64,[](float x){return x==0;}),"failed guest did not write silence");
 bad_work|=work.allocations||work.frees||work.locks;
 check(ultra_observe().calls==0,"unsupported guest ran");clockwork_embed_close(h);
 std::cout<<"LIMITATION unsupported guest geometry refused but embed attach status=OK block="<<block<<"\n";
}
void overflow(const std::string&mode,bool safety){
 Engine e(64);if(safety){check(e.send(0,0,0,7,0,1),"safety policy");e.run(64,{64});}
 if(mode=="ring"){
  check(e.send(64,0,0,0,69,127),"on admitted");int accepted=0;while(accepted<100000&&e.send(50000,1,0,3,0,127))++accepted;
  check(accepted<100000,"ring not saturated");check(!e.send(128,0,0,1,69,0),"off expected transport refusal");
  auto a=e.run(8192,{64});float peak=tailpeak(a[0]);std::cout<<(safety?"LEASE_POLICY ":"KNOWN_GAP lost_note_off ")<<"ring accepted="<<accepted<<" safety="<<safety<<" tail_peak="<<peak<<"\n";
  check(safety?peak==0:peak>0.1f,"lost-off diagnostic changed");
 }else if(mode=="store"){
  check(e.send(4096,0,0,0,69,127),"on ring");e.run(64,{64});
  for(int n=0;n<511;n++){check(e.send(50000,1,0,3,0,127),"fill ring");if(n%16==15)e.run(64,{64});}e.run(64,{64});
  uint32_t metrics[256]{};clockwork_client_metrics(e.c,metrics,256);check(metrics[3]==512,"scheduler depth");
  check(e.send(4160,0,0,1,69,0),"off transport enqueue should succeed");e.run(64,{64});clockwork_client_metrics(e.c,metrics,256);check(metrics[5]>=1,"scheduler did not reject");
  auto a=e.run(10000,{64});float peak=tailpeak(a[0]);std::cout<<(safety?"LEASE_POLICY ":"KNOWN_GAP lost_note_off ")<<"store capacity="<<metrics[40]<<" dropped="<<metrics[5]<<" safety="<<safety<<" tail_peak="<<peak<<"\n";
  check(safety?peak==0:peak>0.1f,"upstream lost-off diagnostic changed");
 }else{
  check(e.send(5000,1,0,0,65,100),"B future during overload");
  for(int n=0;n<256;n++){check(e.send(4096,0,0,n==0?0:3,n==0?69:0,127),"guest fill");if(n%16==15)e.run(64,{64});}
  check(e.send(4200,0,0,0,72,127),"future after panic");auto a=e.run(6000,{64});auto obs=ultra_observe();
  check(obs.overflow>0&&obs.generation[0]==1&&tailpeak(a[0])==0,"guest overflow failed closed");
  auto b=render({{5000,Kind::On,65,100}},{1},7024).audio;check(std::equal(a[1].begin(),a[1].end(),b.begin()+1024)&&obs.generation[1]==0,"B future changed by A overflow");
  std::cout<<"guest overflow="<<obs.overflow<<" max_delivered_per_block="<<obs.max_messages_per_block<<" max_pending="<<obs.max_pending<<" stale="<<obs.stale<<"\n";
 }
}
int main(int argc,char**argv){try{
 instrumentation_control();std::string mode=argc>1?argv[1]:"reference";int block=argc>2?std::stoi(argv[2]):64;int part=argc>3?std::stoi(argv[3]):0;
 std::vector<int> parts=part?std::vector<int>{part}:std::vector<int>{1,31,63,64,127,3,17};
 if(mode=="reference")compare(block,parts);else if(mode=="timing")timing(block,parts);else if(mode=="late")late();else if(mode=="immediate")immediate(block);else if(mode=="isolation")isolation(block);else if(mode=="input")input(block,parts);
 else if(mode=="held")held();else if(mode=="lifecycle")lifecycle();else if(mode=="unsupported")unsupported(block);
 else if(mode=="ring"||mode=="store"||mode=="guest")overflow(mode,block==1);else throw std::runtime_error("unknown mode");
 check(!bad_work,"instrumented render work nonzero");std::cout<<"PASS assertions "<<mode<<"\n";
 }catch(const std::exception&e){std::cerr<<"FAIL "<<e.what()<<"\n";return 1;}}
