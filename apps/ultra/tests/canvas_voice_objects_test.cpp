#include "../src-tauri/native/canvas_workspace.hpp"
#include <cassert>
#include <cmath>
#include <cstdio>
#include <cstring>
#include <memory>
#include <vector>

using namespace ultra;
namespace {
constexpr unsigned poly=60,saw=61,filter=62,adsr=63,product=64,mix=65;
auto discard=[](alive::Event){return true;};
UltraCanvasNode node(unsigned id,unsigned kind,double p0=0,double p1=0,double p2=0,double p3=0){
 UltraCanvasNode n{};n.id=id;n.kind=kind;n.p0=p0;n.p1=p1;n.p2=p2;n.p3=p3;return n;
}
UltraCanvasGraph instrument(){
 UltraCanvasGraph g{};g.revision=1;g.node_count=10;
 g.nodes[0]=node(1,poly,4);g.nodes[1]=node(2,saw);g.nodes[2]=node(3,filter,2400,.7);
 g.nodes[3]=node(4,adsr,10,150,.65,30);g.nodes[4]=node(5,product);g.nodes[5]=node(6,product);
 g.nodes[6]=node(7,mix);g.nodes[7]=node(8,Gain,100);g.nodes[8]=node(9,Join);g.nodes[9]=node(10,Dac);
 const UltraCanvasEdge edges[]={{1,0,2,0},{2,0,3,0},{1,1,4,0},{3,0,5,0},{4,0,5,1},{5,0,6,0},{1,2,6,1},{6,0,7,0},{7,0,8,0},{8,0,9,0},{8,0,9,1},{9,0,10,0}};
 for(const auto& edge:edges)g.edges[g.edge_count++]=edge;
 return g;
}
CanvasMessage literal(const char* text){CanvasMessage m{};assert(canvas_parse_message(text,m));return m;}
void message(CanvasRuntime& r,unsigned id,unsigned inlet,const char* text){assert(r.event(r.plan().graph.revision,id,inlet,literal(text),0,discard));}
void parameter(CanvasRuntime& r,unsigned id,unsigned param,double value){auto next=r.plan();assert(change_canvas_param(next,id,param,value));assert(r.param(next,id,param,value,0,discard));}
std::vector<double> render(CanvasRuntime& r,unsigned frames){
 std::vector<double> output;output.reserve(frames);
 for(unsigned f=0;f<frames;f++){r.begin_callback();assert(r.sample(0,discard));const auto v=r.signal_sample(0,0,1,discard);assert(std::isfinite(v[0])&&v[0]==v[1]);output.push_back(v[0]);}
 return output;
}
double energy(const std::vector<double>& values){double result=0;for(double value:values)result+=value*value;return result;}
std::unique_ptr<CanvasRuntime> prepared(UltraCanvasGraph g=instrument()){CanvasPlan p{};assert(compile_canvas(g,p));auto r=std::make_unique<CanvasRuntime>();r->reset(p);return r;}
void topology(){
 auto g=instrument();CanvasPlan p{};assert(compile_canvas(g,p));
 assert(canvas_inlets(g.nodes[0])==2&&canvas_outlets(g.nodes[0])==3);
 for(unsigned out=0;out<3;out++)assert(canvas_output(g.nodes[0],out)==5);
 assert(canvas_input(g.nodes[1],0)==5&&canvas_output(g.nodes[6],0)==2);
 assert(canvas_input(g.nodes[2],1)==1&&canvas_input(g.nodes[3],4)==1);
 for(unsigned kind=poly;kind<=mix;kind++){
  auto bad=g;const unsigned slot=kind-poly;bad.nodes[slot]=node(20+kind,kind,kind==poly?4:kind==filter?2400:kind==adsr?10:0,kind==filter?.7:kind==adsr?150:0,kind==adsr?.65:0,kind==adsr?30:0);
  bad.edge_count=0;assert(compile_canvas(bad,p));bad.nodes[slot].p5=1;assert(!compile_canvas(bad,p));
 }
 auto bad=g;bad.nodes[10]=node(20,poly,4);bad.node_count++;assert(!compile_canvas(bad,p));
 bad=g;bad.edges[0]={7,0,2,0};assert(!compile_canvas(bad,p));
 bad=g;bad.edges[8]={6,0,8,0};assert(!compile_canvas(bad,p));
 bad=g;bad.edges[0]={1,0,9,0};assert(!compile_canvas(bad,p));
 bad=g;bad.edges[0]={2,0,2,0};assert(!compile_canvas(bad,p));
 for(double value:{0.,5.,1.5}){bad=g;bad.nodes[0].p0=value;assert(!compile_canvas(bad,p));}
 bad=g;bad.nodes[0]=node(1,Bang);bad.edge_count=0;assert(compile_canvas(bad,p));
 assert(!canvas_param_valid(poly,0,2));assert(compile_canvas(g,p));
 for(unsigned e=0;e<p.graph.edge_count;e++)if(p.edges[e].domains&CanvasPlan::Voices)assert(p.edges[e].width==4);
}
void authored_audio_and_live_controls(){
 auto r=prepared();assert(energy(render(*r,512))==0);message(*r,1,0,"60 100");assert(energy(render(*r,4000))>.01);
 parameter(*r,8,0,0);assert(energy(render(*r,256))==0);parameter(*r,8,0,100);assert(energy(render(*r,256))>.001);
 parameter(*r,4,2,0);render(*r,9000);assert(energy(render(*r,256))==0);parameter(*r,4,2,.8);assert(energy(render(*r,256))>.001);
 auto low=prepared(),high=prepared(),resonant=prepared();parameter(*low,3,0,80);parameter(*high,3,0,18000);parameter(*resonant,3,1,8);
 for(auto* runtime:{low.get(),high.get(),resonant.get()})message(*runtime,1,0,"60 100");
 const double lo=energy(render(*low,12000)),hi=energy(render(*high,12000)),res=energy(render(*resonant,12000));assert(hi>lo*10&&std::abs(res-hi)>.1);
 auto g=instrument();for(unsigned edge=0;edge<g.edge_count;edge++)if(g.edges[edge].from==3){g.edges[edge]=g.edges[--g.edge_count];break;}
 auto disconnected=prepared(g);message(*disconnected,1,0,"60 100");assert(energy(render(*disconnected,10000))==0);
 g=instrument();g.nodes[0]=node(1,Bang);unsigned count=0;for(unsigned e=0;e<g.edge_count;e++)if(g.edges[e].from!=1)g.edges[count++]=g.edges[e];g.edge_count=count;
 auto partial=prepared(g);assert(energy(render(*partial,512))==0);
}
void sustain_release_and_stop(){
 auto r=prepared();message(*r,1,0,"60 100");render(*r,2000);message(*r,1,1,"127");message(*r,1,0,"60 0");assert(energy(render(*r,4000))>.001);
 message(*r,1,1,"0");render(*r,1600);assert(energy(render(*r,256))==0);
 message(*r,1,0,"64 100");render(*r,1000);message(*r,1,0,"64 0");render(*r,1000);message(*r,1,0,"64 0");parameter(*r,4,3,10000);render(*r,500);assert(energy(render(*r,256))==0);
 message(*r,1,0,"67 100");render(*r,500);message(*r,1,0,"panic");assert(energy(render(*r,256))==0);
 message(*r,1,0,"67 100");render(*r,500);assert(r->stop(0,discard));parameter(*r,3,0,1000);assert(energy(render(*r,256))==0);
 message(*r,1,0,"67 100");assert(energy(render(*r,500))>.001);r->reset(r->plan());assert(energy(render(*r,500))==0);
}
void live_adsr_stages(){
 auto slow=prepared(),fast=prepared();parameter(*slow,4,0,1000);parameter(*fast,4,0,1000);
 message(*slow,1,0,"60 100");message(*fast,1,0,"60 100");render(*slow,500);render(*fast,500);
 parameter(*fast,4,0,1);assert(energy(render(*fast,500))>100*energy(render(*slow,500)));
 auto long_decay=prepared(),short_decay=prepared();for(auto* r:{long_decay.get(),short_decay.get()}){parameter(*r,4,0,1);parameter(*r,4,1,1000);parameter(*r,4,2,.1);message(*r,1,0,"60 100");render(*r,1000);}
 parameter(*short_decay,4,1,1);assert(energy(render(*long_decay,2000))>20*energy(render(*short_decay,2000)));
 auto long_release=prepared(),short_release=prepared();for(auto* r:{long_release.get(),short_release.get()}){parameter(*r,4,3,1000);message(*r,1,0,"60 100");render(*r,3000);message(*r,1,0,"60 0");render(*r,500);}
 parameter(*short_release,4,3,1);assert(energy(render(*short_release,500))==0&&energy(render(*long_release,500))>.001);
}
void oldest_steal_and_independent_roots(){
 auto one_voice=instrument();one_voice.nodes[0].p0=1;auto r=prepared(one_voice);message(*r,1,0,"60 100");render(*r,1000);message(*r,1,0,"64 100");render(*r,1000);message(*r,1,0,"60 0");assert(energy(render(*r,2000))>.001);message(*r,1,0,"64 0");render(*r,1600);assert(energy(render(*r,256))==0);
 auto workspace=std::make_unique<CanvasWorkspace>();CanvasPlan p{};assert(compile_canvas(instrument(),p));assert(workspace->install(0,p,0,discard)&&workspace->install(1,p,0,discard));
 message(workspace->runtime(0),1,0,"60 100");message(workspace->runtime(1),1,0,"67 100");render(workspace->runtime(0),1000);render(workspace->runtime(1),1000);workspace->close(0,0,discard);
 assert(energy(render(workspace->runtime(0),256))==0&&energy(render(workspace->runtime(1),256))>.001);
}
void four_lanes_and_duplicate_notes(){
 auto r=prepared();for(const char* pair:{"60 100","62 100","64 100","65 100","67 100"}){message(*r,1,0,pair);render(*r,32);}assert(r->active_voice_count()==4);
 message(*r,1,0,"60 0");render(*r,1500);assert(r->active_voice_count()==4);
 for(const char* pair:{"62 0","64 0","65 0","67 0"})message(*r,1,0,pair);
 render(*r,1500);assert(r->active_voice_count()==0);
 message(*r,1,0,"60 100");message(*r,1,0,"60 100");assert(r->active_voice_count()==2);render(*r,1000);message(*r,1,0,"60 0");render(*r,1500);assert(r->active_voice_count()==1&&energy(render(*r,256))>.001);message(*r,1,0,"60 0");render(*r,1500);assert(r->active_voice_count()==0);
}
void mix_headroom_and_mono(){
 auto single_graph=instrument();single_graph.nodes[0].p0=1;auto single=prepared(single_graph),four=prepared();
 message(*single,1,0,"60 100");for(unsigned voice=0;voice<4;voice++)message(*four,1,0,"60 100");
 const auto mono=render(*single,512),polyphonic=render(*four,512);for(unsigned f=0;f<512;f++)assert(polyphonic[f]==mono[f]*4);
 auto g=instrument();g.node_count=9;g.nodes[8]=node(9,SignalDac);std::strcpy(g.nodes[8].text,"1");g.edge_count=10;g.edges[9]={8,0,9,0};auto runtime=prepared(g);message(*runtime,1,0,"60 100");bool heard=false;
 for(unsigned f=0;f<512;f++){runtime->begin_callback();assert(runtime->sample(0,discard));const auto value=runtime->signal_sample(0,0,1,discard);assert(value[1]==0);heard|=value[0]!=0;}assert(heard);
}
void midi_ingress_after_stop(){
 auto g=instrument();g.nodes[g.node_count++]=node(11,MidiIn,1);g.edges[g.edge_count++]={11,0,1,0};auto r=prepared(g);
 assert(r->stop(0,discard));r->begin_callback();assert(r->midi_input(2,60,100,0,discard));assert(!r->signal_active());
 assert(r->midi_input(1,60,100,0,discard));assert(r->signal_active());assert(energy(render(*r,1000))>.001);
 r->begin_callback();assert(r->midi_input(1,60,0,0,discard));render(*r,1500);assert(energy(render(*r,256))==0);
}
}
int main(){topology();authored_audio_and_live_controls();sustain_release_and_stop();live_adsr_stages();oldest_steal_and_independent_roots();four_lanes_and_duplicate_notes();mix_headroom_and_mono();midi_ingress_after_stop();std::puts("PASS: authored four-voice Faust graph, exact channel types, live filter/envelope/level, sustain, bounded release, stealing and document isolation");}
