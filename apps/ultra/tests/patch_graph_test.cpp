// Portable tests of the real native runtime. No second/interpreted score.
#include "../src-tauri/native/patch_graph.hpp"
#include <cassert>
#include <cstdio>
#include <tuple>
#include <limits>
#include <vector>
using namespace ultra;
static_assert(sizeof(UltraCanvasNode)==40&&sizeof(UltraCanvasEdge)==16&&sizeof(UltraCanvasGraph)==2320);
static_assert(sizeof(UltraCanvasObservation)==24&&sizeof(UltraCanvasStatus)==784);
static UltraCanvasGraph simple(){
 UltraCanvasGraph g{};g.revision=1;
 g.node_count=9;
 g.nodes[0]={1,Toggle,0,0,0,0,0};g.nodes[1]={2,Metro,0,0,20.5,0,0};
 g.nodes[2]={3,Counter,0,0,8,0,0};g.nodes[3]={4,Chord,0,0,48,0,0};
 g.nodes[4]={5,MakeNote,0,0,100,10.25,0};g.nodes[5]={6,Voice,0,0,8,28,0};
 g.nodes[6]={7,Gain,0,0,90,0,0};g.nodes[7]={8,Join,0,0,0,0,0};g.nodes[8]={9,Dac,0,0,0,0,0};
 g.edge_count=8;for(unsigned i=0;i<8;i++)g.edges[i]={i+1,0,i+2,0};return g;
}
using Record=std::tuple<uint64_t,unsigned,unsigned,unsigned,unsigned>;
static std::vector<Record> score(const std::vector<unsigned>& parts){
 CanvasPlan plan;assert(compile_canvas(simple(),plan));CanvasRuntime runtime;runtime.reset(plan);
 uint64_t base=0;std::vector<Record> records;
 auto emit=[&](alive::Event e){records.emplace_back(base+e.offset,unsigned(e.kind),e.device,e.note,e.value);return true;};
 assert(runtime.event(1,1,0,{},0,emit));
 for(unsigned block=0;base<1000000;block++){
  unsigned n=std::min<unsigned>(parts[block%parts.size()],1000000-base);runtime.begin_callback();
  for(unsigned f=0;f<n;f++)assert(runtime.sample(f,emit));
  base+=n;
 }return records;
}
int main(){
 CanvasPlan p;auto g=simple();assert(compile_canvas(g,p));assert(p.output[0]==0&&p.output[1]==-1);
 g.edges[g.edge_count++]={7,0,8,1};assert(compile_canvas(g,p));assert(p.output[1]==0);
 g.edges[g.edge_count++]={6,0,8,1};assert(!compile_canvas(g,p));
 g=simple();g.nodes[9]={10,Gain,0,0,90,0,0};g.node_count=10;g.edges[g.edge_count++]={6,0,10,0};assert(!compile_canvas(g,p));
 g=simple();g.edges[g.edge_count++]={3,0,1,0};assert(!compile_canvas(g,p));
 g=simple();g.nodes[1].p0=19;assert(!compile_canvas(g,p));g=simple();g.nodes[5].device=2;assert(!compile_canvas(g,p));
 g=simple();g.nodes[9]={10,Voice,0,0,8,28,0};g.node_count=10;assert(!compile_canvas(g,p));
 // Malformed descriptors must leave the caller's last compiled plan untouched.
 g=simple();assert(compile_canvas(g,p));auto retained=p.graph.revision;
 g.node_count=33;assert(!compile_canvas(g,p)&&p.graph.revision==retained);
 g=simple();g.edge_count=65;assert(!compile_canvas(g,p));
 g=simple();g.nodes[1].id=1;assert(!compile_canvas(g,p));
 g=simple();g.nodes[0].id=0;assert(!compile_canvas(g,p));
 g=simple();g.nodes[0].kind=15;assert(!compile_canvas(g,p));
 g=simple();g.nodes[0].p0=std::numeric_limits<double>::infinity();assert(!compile_canvas(g,p));
 g=simple();g.nodes[0].p0=std::numeric_limits<double>::quiet_NaN();assert(!compile_canvas(g,p));
 g=simple();g.edges[0].outlet=1;assert(!compile_canvas(g,p));
 g=simple();g.edges[0].inlet=2;assert(!compile_canvas(g,p));
 g=simple();g.edges[g.edge_count++]=g.edges[0];assert(!compile_canvas(g,p));
 g=simple();g.nodes[0]={1,Message,0,4,0,0,0};assert(!compile_canvas(g,p));
 auto a=score({64}),b=score({1,7,31,128,511,1024});assert(a==b);
 const unsigned notes[]={48,52,55,60,64,67,72,76};unsigned on=0;
 for(auto [frame,kind,device,note,value]:a){(void)device;if(kind==unsigned(alive::Kind::On)){assert(frame==on*984);assert(note==notes[on%8]);assert(value==100);++on;}else {assert(kind==unsigned(alive::Kind::Off));assert(frame%984==492);assert(value==0);}}
 assert(on>100);
 // Saved transport values never silently arm playback on install/restart.
 g=simple();g.nodes[0].p0=1;assert(compile_canvas(g,p));CanvasRuntime saved;saved.reset(p);
 assert(saved.value(0)==0&&saved.value(1)==0);unsigned emitted=0;auto no_start=[&](alive::Event){++emitted;return true;};
 for(unsigned i=0;i<4096;i++)assert(saved.sample(i%1024,no_start));
 assert(emitted==0);
 // Explicit depth-first edge order: cold number store precedes bang hot read.
 g={};g.revision=2;g.node_count=6;
 g.nodes[0]={1,Message,0,1,7,0,0};g.nodes[1]={2,Number,0,0,1,0,0};g.nodes[2]={3,Bang,0,0,0,0,0};
 g.nodes[3]={4,Add,0,0,5,0,0};g.nodes[4]={5,Multiply,0,0,2,0,0};g.nodes[5]={6,Number,0,0,0,0,0};
 g.edge_count=6;g.edges[0]={1,0,2,1};g.edges[1]={1,0,3,0};g.edges[2]={3,0,2,0};g.edges[3]={2,0,4,0};g.edges[4]={4,0,5,0};g.edges[5]={5,0,6,0};
 assert(compile_canvas(g,p));CanvasRuntime r;r.reset(p);std::vector<alive::Event> events;auto emit=[&](alive::Event e){events.push_back(e);return true;};
 assert(r.event(2,1,0,{},0,emit));assert(r.value(5)==24&&r.pulses(5)==1);
 assert(!r.event(1,1,0,{},0,emit));assert(r.pulses(5)==1);
 assert(!r.event(2,1,0,{1,{std::numeric_limits<double>::infinity(),0,0}},0,emit));
 assert(!r.event(2,1,0,{1,{100001,0,0}},0,emit));
 assert(!change_canvas_param(p,2,0,std::numeric_limits<double>::quiet_NaN()));
 // A parameter update leaves the running metro deadline/counter intact.
 g=simple();assert(compile_canvas(g,p));r.reset(p);events.clear();assert(r.event(1,1,0,{},0,emit));
 for(unsigned i=0;i<500;i++)assert(r.sample(i,emit));
 assert(change_canvas_param(p,2,0,40));assert(r.param(p,2,0,40,0,emit));
 for(unsigned i=500;i<984;i++)assert(r.sample(i,emit));
 assert(events.size()==2);
 assert(r.sample(0,emit));assert(events.size()==3&&events.back().note==52);
 assert(!change_canvas_param(p,6,2,1));
 assert(r.stop(0,emit));auto count=events.size();for(unsigned i=0;i<5000;i++)assert(r.sample(i%1024,emit));assert(events.size()==count&&r.value(0)==0);
 // Makenote velocity/duration are latched into the outstanding timer.
 g=simple();assert(compile_canvas(g,p));r.reset(p);events.clear();
 assert(r.event(1,5,0,{1,{60,0,0}},0,emit));
 assert(change_canvas_param(p,5,0,80));assert(r.param(p,5,0,80,0,emit));
 assert(change_canvas_param(p,5,1,100));assert(r.param(p,5,1,100,0,emit));
 for(unsigned i=0;i<=492;i++)assert(r.sample(i,emit));
 assert(events.size()==2&&events[0].value==100&&events[1].offset==492&&events[1].kind==alive::Kind::Off);
 // Timer pool exhaustion and downstream admission failure stop all future work.
 g=simple();assert(compile_canvas(g,p));r.reset(p);
 for(unsigned i=0;i<64;i++)assert(r.event(1,5,0,{1,{60,0,0}},0,emit));
 assert(!r.event(1,5,0,{1,{60,0,0}},0,emit)&&r.failed());
 r.reset(p);auto reject=[](alive::Event){return false;};assert(!r.event(1,5,0,{1,{60,0,0}},0,reject)&&r.failed());
 // MIDI matches all sixteen channels, no implicit route to a voice.
 g=simple();g.nodes[9]={10,MidiIn,0,0,16,0,0};g.node_count=10;g.edges[g.edge_count++]={10,0,6,0};assert(compile_canvas(g,p));r.reset(p);events.clear();
 assert(r.midi_input(2,60,100,7,emit)&&events.empty());assert(r.midi_input(16,60,100,7,emit));assert(events.size()==1&&events[0].offset==7&&events[0].kind==alive::Kind::On);
 assert(r.midi_input(16,60,0,12,emit));assert(events.back().kind==alive::Kind::Off);assert(!change_canvas_param(p,10,0,1));
 // Acyclic graphs can still fan out exponentially. The shared callback budget
 // stops the actual depth-first interpreter instead of allocating or spinning.
 g={};g.revision=3;g.node_count=32;
 for(unsigned i=0;i<32;i++)g.nodes[i]={i+1,Bang,0,0,0,0,0};
 g.edges[g.edge_count++]={1,0,3,0};g.edges[g.edge_count++]={1,0,4,0};
 for(unsigned layer=1;layer<15;layer++)for(unsigned from=0;from<2;from++)for(unsigned to=0;to<2;to++)g.edges[g.edge_count++]={layer*2+from+1,0,(layer+1)*2+to+1,0};
 assert(compile_canvas(g,p));r.reset(p);assert(!r.event(3,1,0,{},0,emit)&&r.failed());
 std::puts("PASS: native canvas validation, actual routing plans, depth-first messages/math, MIDI, stale events, million-step bounded timers, partition invariance, live params, stop and rejection safety");
}
