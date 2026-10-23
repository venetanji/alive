#include "engine.hpp"
#include "../../apps/ultra/core/guest/observe.hpp"
#include "../faust-reference/host.hpp"
#include "../clockwork-faust/instrument.hpp"
#include <iostream>
#include <thread>
using Core=alive::Engine;
void check(bool b,const char*s){if(!b)throw std::runtime_error(s);}
using Audio=std::array<std::vector<float>,3>;
Audio run(Core&e,int n,const std::vector<int>&parts,const std::vector<float>*in=nullptr){
 Audio a;for(auto&c:a)c.resize(n);int k=0;
 for(int at=0;at<n;){int count=std::min(n-at,parts[k++%parts.size()]);work={};measuring=true;
 e.render(a[0].data()+at,a[1].data()+at,in?in->data()+at:nullptr,count,a[2].data()+at);measuring=false;
 check(!work.allocations&&!work.frees&&!work.locks,"render allocations/free/mutex");at+=count;}
 return a;
}
void send(Core&e,const std::vector<Event>&s,int dev=0){for(auto v:s)check(e.submit({unsigned(v.frame),uint8_t(dev),alive::Kind(v.kind),uint8_t(v.note),uint8_t(v.value)}),"admit score");}
void reference(){
 const std::vector<Event>s={{0,Kind::On,60,127},{1,Kind::Level,0,90},{31,Kind::On,62,100},{63,Kind::Off,60,0},{64,Kind::On,64,80},{127,Kind::Level,0,77},{127,Kind::Off,62,0},{127,Kind::On,62,90},{256,Kind::AllOff,0,0}};
 const auto expected=render(s,{1},512).audio;
 for(auto parts:std::vector<std::vector<int>>{{1},{32},{64},{128},{256},{1,31,63,64,127,3,17}}){Core e;check(e.init(),"ready");send(e,s);auto a=run(e,576,parts);
  for(int f=0;f<64;f++)check(a[0][f]==0,"causal startup silence");for(int f=0;f<512;f++)check(a[0][f+64]==expected[f],"direct reference exact +64");
  check(!e.status().fault,"unexpected reference fault");check(ultra_observe().max_messages_per_block<=16,"bounded messages");
 }
 std::cout<<"PASS reference equal-time offsets 0,1,31,63,64,127 six partitions bit exact +64\n";
}
void original_score(){
 const std::vector<Event>s={{0,Kind::On,60,127},{31,Kind::On,62,100},{32,Kind::On,64,80},{63,Kind::On,65,60},{64,Kind::On,67,127},{65,Kind::Off,60,0},{80,Kind::Sustain,0,127},{97,Kind::Off,62,0},{111,Kind::Level,0,64},{128,Kind::Sustain,0,0},{160,Kind::AllOff,0,0},{181,Kind::On,69,127},{200,Kind::Reset,0,0},{219,Kind::On,72,127},{260,Kind::Off,72,0}};
 Core e;check(e.init(),"original ready");send(e,s);auto a=run(e,576,{1,31,63,64,127,3,17});auto expected=render(s,{1},512).audio;for(int i=0;i<512;i++)check(a[0][64+i]==expected[i],"original score exact");std::cout<<"PASS unchanged reference score voice-steal sustain reset bit exact +64\n";
}
void bounded_stress(){Core e;check(e.init(),"stress ready");float l[64],r[64];for(int block=0;block<2000;block++){
 for(int i=0;i<16;i++)check(e.submit({unsigned(i*4),uint8_t(i%2),alive::Kind::Level,0,uint8_t(i*8)}),"budget16 accepted");
 work={};measuring=true;e.render(l,r,nullptr,64);measuring=false;check(!work.allocations&&!work.frees&&!work.locks,"stress work");check(!e.status().fault,"stress fault");}
 auto o=ultra_observe();check(o.messages==32000&&o.max_messages_per_block==16&&o.max_pending<=16&&!o.overflow&&!o.late&&!o.malformed,"bounded actual scheduler delivery");std::cout<<"PASS 32000 real scheduler messages exact bounded16/block zero observed callback allocations frees mutex\n";
}
void input(){for(auto parts:std::vector<std::vector<int>>{{1},{32},{64},{128},{256},{1,31,63,64,127,3,17}}){Core e;check(e.init(),"input ready");std::vector<float> in(2048);int k=0;for(int f:{0,1,31,32,33,63,64,127,128,511,1024})in[f]=++k;auto a=run(e,2048,parts,&in);for(int f=0;f<2048;f++)check(a[2][f]==(f<64?0:in[f-64]),"input fixed delay");}std::cout<<"PASS impulse fixed64 delay six partitions\n";}
void overload(){
 for(bool active:{false,true}){Core e;check(e.init(),"overload ready");if(!active)run(e,64,{64});check(e.submit({active?0u:1024u,0,alive::Kind::On,69,127}),"accepted on");run(e,active?128:64,{64});
  for(int i=0;i<16;i++)check(e.submit({1024,1,alive::Kind::Level,0,99}),"fill block budget");check(!e.submit({1024,0,alive::Kind::Off,69,0}),"off rejected at budget");
  auto a=run(e,2048,{31,1,127});for(float v:a[0])check(v==0,"rejected off stranded accepted on");check(e.status().fault&&e.status().queued==0,"fault visible pending invalidated");
 }
 {Core e;check(e.init(),"capacity init");for(int i=0;i<64;i++)check(e.submit({unsigned(i*16),1,alive::Kind::Level,0,99}),"capacity admit");check(!e.submit({1024,0,alive::Kind::Off,69,0}),"capacity reject");check(e.status().fault,"capacity faults");}
 {Core e;check(e.init(),"UI init");for(int i=0;i<64;i++)check(e.queue({0,1,alive::Kind::Level,0,99}),"UI admit");check(!e.queue({0,0,alive::Kind::Off,60,0}),"UI reject");auto a=run(e,128,{64});check(e.status().fault,"UI fault");}
 {Core e;check(e.init(),"UI work init");for(int i=0;i<17;i++)check(e.queue({0,1,alive::Kind::Level,0,99}),"UI ring accepts before admission");auto a=run(e,128,{64});check(e.status().fault,"UI drained budget fault");}
 std::cout<<"PASS active/future rejected termination mute; pending64, perblock16, UI64 bounds fail closed\n";
}
void held(){Core e;check(e.init(),"held ready");send(e,{{0,Kind::On,69,127},{1,Kind::Sustain,0,127},{31,Kind::Off,69,0}});auto a=run(e,10000,{31,1,127});check(a[0][9000]!=0&&!e.status().fault,"no lease");check(e.submit({0,0,alive::Kind::AllOff,0,0}),"alloff accepted");auto b=run(e,256,{31,1,127});for(int i=80;i<256;i++)check(b[0][i]==0,"alloff terminates");std::cout<<"PASS indefinite sustain beyond lease then alloff\n";}
void isolation(){Core e;check(e.init(),"isolation ready");std::vector<Event>b={{0,Kind::Level,0,77},{1,Kind::On,65,99},{127,Kind::Off,65,0},{181,Kind::On,72,110},{260,Kind::Off,72,0}};send(e,b,1);send(e,{{0,Kind::On,60,127},{64,Kind::Reset,0,0},{128,Kind::Level,0,4}});auto a=run(e,576,{1,31,63,127});auto expected=render(b,{1},512).audio;for(int i=0;i<512;i++)check(a[1][64+i]==expected[i],"B changed");std::cout<<"PASS two-device reset parameter and pending isolation\n";}
void lifecycle(){auto before=ultra_lifecycle();for(int i=0;i<10;i++){Core e;check(!e.init(44100),"refuse unsupported rate");check(e.init(),"restart ready");Core duplicate;check(!duplicate.init(),"exclusive attach");run(e,128,{31,1});check(e.submit({512,0,alive::Kind::On,69,127}),"future before shutdown");e.shutdown();check(!e.status().ready,"stopped status");check(e.init(),"same object restart");auto clean=run(e,1024,{64});for(float v:clean[0])check(v==0,"old future survived restart");}auto after=ultra_lifecycle();check(after.created-before.created==20&&after.destroyed-before.destroyed==20,"clean guest destruction every stop");std::cout<<"PASS unsupported refusal exclusive ownership 20 clean starts/stops\n";}
int main(){try{instrumentation_control();reference();original_score();input();overload();held();isolation();bounded_stress();lifecycle();std::cout<<"PASS all hardened core tests\n";return 0;}catch(const std::exception&e){std::cerr<<"FAIL "<<e.what()<<"\n";return 1;}}
