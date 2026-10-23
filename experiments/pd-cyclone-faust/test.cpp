#include "host.hpp"
#include "../faust-reference/host.hpp"
#include <iostream>
#include <memory>
#include <cmath>
void check(bool ok,const char* msg){if(!ok)throw std::runtime_error(msg);}
float peak(const Audio& a){float m=0;for(int i=0;i<64;++i)m=std::max(m,std::abs(a[i*3]));return m;}
int main(int argc,char**argv){try{
 check(argc==2,"patch path"); initialize();std::string path=argv[1];
 ReferenceVoice::classInit(48000);
 std::ofstream samples("build/audio.csv");samples<<"frame,oracle,hosted,clipped,input_clipped\n";samples.precision(9);
 {Device d(path);Voice v;v.prepare();double error=0; bool sound=false;
  for(int tick=0;tick<24;++tick){
   if(tick==0){d.param("freq",440);d.param("gain",.8);d.param("gate",1);*v.freq=440;*v.gain=.8;*v.gate=1;}
   if(tick==4){d.param("freq",660);*v.freq=660;}
   if(tick==8){d.param("level",.3);*v.level=.3;}
   if(tick==12){d.param("gate",0);*v.gate=0;}
   if(tick==16){d.reset();v.reset();}
   if(tick==17){d.param("gate",1);*v.gate=1;}
   std::array<float,64> in{}, expected{};for(int i=0;i<64;++i)in[i]=(i-32)/64.f;
   float* output[]={expected.data()};v.dsp.compute(64,nullptr,output);auto actual=d.tick(in);
   for(int i=0;i<64;++i){error=std::max(error,double(std::abs(actual[3*i]-expected[i])));check(actual[3*i+1]==std::clamp(expected[i],-.05f,.05f),"Cyclone voice clip differs");check(actual[3*i+2]==std::clamp(in[i],-.1f,.1f),"Cyclone input clip differs");sound|=std::abs(actual[3*i])>.001;samples<<tick*64+i<<","<<expected[i]<<","<<actual[3*i]<<","<<actual[3*i+1]<<","<<actual[3*i+2]<<"\n";}
  }check(error==0 && sound,"same Faust oracle mismatch/silent external");std::cout<<"PASS same_dsp_tick_exact\n";
 }
 {Device a(path),b(path);a.param("gain",1);a.param("gate",1);check(peak(a.tick())>0 && peak(b.tick())==0,"instance isolation");b.param("gain",.5);b.param("gate",1);b.tick();a.reset();check(peak(a.tick())==0 && peak(b.tick())>0,"reset isolation");}std::cout<<"PASS instance_and_reset\n";
 {auto a=std::make_unique<Device>(path);a->param("gain",1);a->param("gate",1);a->tick();auto b=std::make_unique<Device>(path);check(peak(b->tick())==0,"new default not silent");auto retired=std::move(a);a=std::move(b);retired.reset();a->param("gain",1);a->param("gate",1);check(peak(a->tick())>0,"stopped replacement");}std::cout<<"PASS stopped_replacement\n";
 {auto a=std::make_unique<Device>(path);Device b(path);Voice oracle;oracle.prepare();Score bs;
  bs.push({0,"gain",.5});bs.push({0,"freq",330});bs.push({0,"gate",1});bs.push({128,"freq",660});bs.push({192,"gate",0});bs.push({320,"gate",1});
  for(int tick=0;tick<10;++tick){int frame=tick*64;
   if(tick==0){a->param("gain",1);a->param("gate",1);*oracle.gain=.5;*oracle.freq=330;*oracle.gate=1;}
   if(tick==1)a->reset();
   if(tick==2){auto replacement=std::make_unique<Device>(path);replacement->param("freq",880);replacement->param("gain",.25);replacement->param("gate",1);a=std::move(replacement);*oracle.freq=660;}
   if(tick==3)*oracle.gate=0;
   if(tick==5)*oracle.gate=1;
   a->tick();bs.apply(b,frame);auto actual=b.tick();std::array<float,64> expected{};float*out[]={expected.data()};oracle.dsp.compute(64,nullptr,out);
   for(int i=0;i<64;++i)check(actual[3*i]==expected[i],"A lifecycle alters B exact future sequence");
  }
 }std::cout<<"PASS exact_b_lifecycle_isolation\n";
 {Device d(path);d.testMessages();}std::cout<<"PASS typed_dispatch_order\n";
 {std::ofstream timing("build/timing.csv");timing<<"requested_frame,dispatch_frame,first_nonzero_frame,max_abs_error\n";
  for(int offset:{0,1,31,63,64,65,127}){Device d(path);Score s;Voice reference;reference.prepare();*reference.gain=1;int dispatch=((offset+63)/64)*64,first=-1;double maxError=0;
   check(s.push({offset,"gate",1}),"admit");d.param("gain",1);
   for(int t=0;t<5;++t){int frame=t*64;s.apply(d,frame);if(frame==dispatch)*reference.gate=1;auto actual=d.tick();std::array<float,64> expected{};float*out[]={expected.data()};reference.dsp.compute(64,nullptr,out);
    for(int i=0;i<64;++i){maxError=std::max(maxError,double(std::abs(actual[3*i]-expected[i])));if(first<0&&actual[3*i]!=0)first=frame+i;}
    check((peak(actual)>0)==(frame>=dispatch),"subtick ceil");
   }check(maxError==0,"quantized oracle envelope/phase mismatch");timing<<offset<<","<<dispatch<<","<<first<<","<<maxError<<"\n";
  }
 }std::cout<<"PASS subtick_ceil\n";
 {Device d(path);d.param("gain",1);d.param("gate",1);d.tick();Score s;for(int i=0;i<256;++i)check(s.push({1024+i*64,"gate",1}),"capacity admission");check(!s.push({20000,"gate",0}),"capacity reject");s.apply(d,0);check(peak(d.tick())==0,"capacity panic reset");s.apply(d,20000);check(peak(d.tick())==0 && !s.push({20064,"gate",1}),"pending future rearmed");}std::cout<<"PASS capacity_fail_closed\n";
 {Device d(path);d.param("gain",1);Score s;for(int i=0;i<16;++i)check(s.push({0,"gate",1}),"exact budget admit");s.apply(d,0);check(peak(d.tick())>0 && !s.failed,"exact budget failed");Score over;for(int i=0;i<17;++i)over.push({64,"gate",1});over.push({128,"gate",1});over.apply(d,64);check(over.failed && peak(d.tick())==0,"tick budget panic");over.apply(d,128);check(peak(d.tick())==0,"tick pending rearmed");Score fresh;fresh.push({192,"gate",1});fresh.apply(d,192);check(peak(d.tick())>0,"fresh recovery");}std::cout<<"PASS tick_budget_fail_closed\n";
 {for(int kind=0;kind<5;++kind){Device d(path);d.param("gain",1);d.param("gate",1);d.tick();Score s;HostEvent e{0,"gate",1};if(kind==0)e.frame=-1;if(kind==1)e.name="unknown";if(kind==2)e.value=NAN;if(kind==3)e.value=2;if(kind==4){s.push({128,"gate",1});e.frame=64;}check(!s.push(e),"invalid accepted");s.apply(d,0);check(s.failed && peak(d.tick())==0,"invalid not fail closed");}}std::cout<<"PASS invalid_fail_closed\n";
 {Device d(path);d.param("gain",1);Score s;s.push({0,"gate",1});s.push({0,"gate",0});s.apply(d,0);check(peak(d.tick())==0,"same-frame order off");Score reverse;reverse.push({64,"gate",0});reverse.push({64,"gate",1});reverse.apply(d,64);check(peak(d.tick())>0,"same-frame order on");}std::cout<<"PASS same_frame_stable_order\n";
 std::cout<<"PASS all\n";return 0;
}catch(const std::exception&e){std::cerr<<"FAIL "<<e.what()<<"\n";return 1;}}
