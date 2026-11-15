// Build with -DULTRA_EXTERNAL_DEVICE_EXPERIMENTAL to exercise injected callbacks;
// without that define, the same harness verifies production graph refusal.
#include "../src-tauri/native/patch_graph.hpp"
#include <cassert>
#include <cmath>
#include <cstdio>
#include <cstring>
#include <memory>
#include <limits>

using namespace ultra;
namespace {
constexpr unsigned external_instrument=68,external_parameter=69;
auto discard=[](alive::Event){return true;};
UltraCanvasNode node(unsigned id,unsigned kind,double p0=0,double p1=0,double p2=0){
 UltraCanvasNode result{};result.id=id;result.kind=kind;result.p0=p0;result.p1=p1;result.p2=p2;return result;
}
UltraCanvasGraph graph(){
 UltraCanvasGraph result{};result.revision=1;result.node_count=5;result.edge_count=4;
 result.nodes[0]=node(1,external_instrument);result.nodes[1]=node(2,external_parameter,.25,17,1);
 result.nodes[2]=node(3,SignalMultiply,.5);result.nodes[3]=node(4,SignalMultiply,.25);
 result.nodes[4]=node(5,SignalDac);std::strcpy(result.nodes[4].text,"1 2");
 result.edges[0]={1,0,3,0};result.edges[1]={1,1,4,0};result.edges[2]={3,0,5,0};result.edges[3]={4,0,5,1};return result;
}
void topology(){
 CanvasPlan plan{};auto g=graph();
#ifdef ULTRA_EXTERNAL_DEVICE_EXPERIMENTAL
 assert(compile_canvas(g,plan));
 assert(canvas_inlets(g.nodes[0])==1&&canvas_outlets(g.nodes[0])==2);
 assert(canvas_input(g.nodes[0],0)==1&&canvas_output(g.nodes[0],0)==2&&canvas_output(g.nodes[0],1)==2);
 assert(canvas_inlets(g.nodes[1])==1&&canvas_outlets(g.nodes[1])==0);
 auto bad=g;bad.nodes[1].p2=3;assert(!compile_canvas(bad,plan));
 bad=g;bad.nodes[1].p2=1.5;assert(!compile_canvas(bad,plan));
 bad=g;bad.nodes[1].p1=-1;assert(!compile_canvas(bad,plan));
 bad=g;bad.nodes[1].p1=256;assert(!compile_canvas(bad,plan));
 bad=g;bad.nodes[1].p1=17.5;assert(!compile_canvas(bad,plan));
 bad=g;bad.nodes[1].p3=1;assert(!compile_canvas(bad,plan));
 bad=g;bad.nodes[0].p0=1;assert(!compile_canvas(bad,plan));
 bad=g;bad.nodes[0].id=100001;bad.nodes[1].p2=100001;bad.edges[0].from=bad.edges[1].from=100001;assert(!compile_canvas(bad,plan));
 bad=g;bad.nodes[bad.node_count++]=node(6,external_parameter,.5,17,1);assert(!compile_canvas(bad,plan));
 assert(compile_canvas(g,plan));auto changed=plan;assert(change_canvas_param(changed,2,0,.75));
 assert(!change_canvas_param(changed,2,1,18));assert(!change_canvas_param(changed,2,2,3));
#else
 assert(!compile_canvas(g,plan));
 g.node_count=1;g.edge_count=0;g.nodes[0]=node(1,external_parameter,.25,17,1);assert(!compile_canvas(g,plan));
#endif
}
#ifdef ULTRA_EXTERNAL_DEVICE_EXPERIMENTAL
struct Instrument {
 double gain=.25;bool held=false,fail_sample=false,fail_parameter=false,nonfinite_sample=false;unsigned clears=0,notes=0,parameters=0,samples=0;
 uint64_t note_frame=0,parameter_frame=0,sample_frame=0;
};
bool note_callback(void* owner,unsigned pitch,unsigned velocity,uint64_t frame)noexcept{
 auto& state=*static_cast<Instrument*>(owner);assert(pitch==60);state.held=velocity!=0;state.note_frame=frame;++state.notes;return true;
}
bool parameter_callback(void* owner,unsigned index,double value,uint64_t frame)noexcept{
 auto& state=*static_cast<Instrument*>(owner);assert(index==17);if(state.fail_parameter)return false;state.gain=value;state.parameter_frame=frame;++state.parameters;return true;
}
bool sample_callback(void* owner,double* left,double* right,uint64_t frame)noexcept{
 auto& state=*static_cast<Instrument*>(owner);state.sample_frame=frame;++state.samples;
 *left=state.nonfinite_sample?std::numeric_limits<double>::infinity():state.held?state.gain:0;*right=state.held?-state.gain:0;return !state.fail_sample;
}
bool clear_callback(void* owner,uint64_t)noexcept{auto& state=*static_cast<Instrument*>(owner);state.held=false;++state.clears;return true;}
CanvasRuntime::ExternalCallbacks callbacks(Instrument& instrument,bool qualified=true){
 return {&instrument,note_callback,parameter_callback,sample_callback,clear_callback,qualified};
}
CanvasMessage pair(unsigned velocity){CanvasMessage result{};result.count=2;result.values[0]=60;result.values[1]=velocity;return result;}
std::unique_ptr<CanvasRuntime> runtime(Instrument& instrument,bool qualified=true){
 CanvasPlan plan{};assert(compile_canvas(graph(),plan));auto result=std::make_unique<CanvasRuntime>();result->reset(plan);assert(result->bind_external(1,callbacks(instrument,qualified)));return result;
}
std::array<double,2> tick(CanvasRuntime& runtime){runtime.begin_callback();assert(runtime.sample(0,discard));return runtime.signal_sample(0,0,1,discard);}
void notes_parameters_and_isolation(){
 Instrument a{},b{};auto first=runtime(a),second=runtime(b);
 assert(tick(*first)[0]==0);assert(first->event(1,1,0,pair(100),0,discard));
 const auto output=tick(*first);assert(output[0]==.125&&output[1]==-.0625);assert(a.note_frame==1&&a.sample_frame==1);
 assert(tick(*second)[0]==0&&b.notes==0);
 const unsigned before=a.parameters;auto changed=first->plan();assert(change_canvas_param(changed,2,0,.75));
 assert(a.parameters==before);assert(first->param(changed,2,0,.75,0,discard));assert(a.parameter_frame==2);
 const auto updated=tick(*first);assert(updated[0]==.375&&updated[1]==-.1875);
 CanvasMessage value{};value.count=1;value.values[0]=.5;assert(first->event(1,2,0,value,0,discard));
 assert(tick(*first)[0]==.25&&first->plan().graph.nodes[1].p0==.5);
 assert(first->event(1,1,0,pair(0),0,discard));assert(tick(*first)[0]==0);
 const unsigned accepted=a.notes;auto invalid=pair(128);assert(!first->event(1,1,0,invalid,0,discard));assert(a.notes==accepted);
 assert(first->event(1,1,0,pair(100),0,discard));assert(first->stop(0,discard));assert(tick(*first)[0]==0&&a.clears>0);
 assert(first->event(1,1,0,pair(100),0,discard));assert(tick(*first)[0]==.25);
 first->reset(first->plan());assert(tick(*first)[0]==0);
}
void proxy_control_edges(){
 auto g=graph();g.nodes[g.node_count++]=node(6,Number,.5);g.edges[g.edge_count++]={6,0,2,0};
 CanvasPlan plan{};assert(compile_canvas(g,plan));Instrument state{};auto r=std::make_unique<CanvasRuntime>();r->reset(plan);assert(r->bind_external(1,callbacks(state)));
 assert(r->event(1,1,0,pair(100),0,discard));CanvasMessage value{};value.count=1;value.values[0]=.8;
 assert(r->event(1,6,0,value,0,discard));const auto output=tick(*r);assert(output[0]==.4&&output[1]==-.2);
 assert(r->plan().graph.nodes[1].p0==.8&&state.parameter_frame==0);
}
void unqualified_clear_and_failures(){
 Instrument state{};auto r=runtime(state,false);assert(r->event(1,1,0,pair(100),0,discard));assert(tick(*r)[0]!=0);
 assert(r->stop(0,discard));assert(state.clears==0);assert(!r->event(1,1,0,pair(100),0,discard));assert(tick(*r)[0]==0);
 assert(r->bind_external(1,callbacks(state)));assert(r->event(1,1,0,pair(0),0,discard));assert(tick(*r)[0]==0);
 assert(r->unbind_external(1));assert(!r->event(1,1,0,pair(100),0,discard));assert(!r->bind_external(2,callbacks(state)));
 Instrument broken{};auto failure=runtime(broken);assert(failure->event(1,1,0,pair(100),0,discard));broken.fail_sample=true;
 assert(tick(*failure)==(std::array<double,2>{})&&failure->failed());
 Instrument rejected{};auto parameter_failure=runtime(rejected);rejected.fail_parameter=true;auto changed=parameter_failure->plan();assert(change_canvas_param(changed,2,0,.8));
 assert(!parameter_failure->param(changed,2,0,.8,0,discard));assert(parameter_failure->plan().graph.nodes[1].p0==.25);
 assert(parameter_failure->failed());
 Instrument nonfinite{};auto nonfinite_failure=runtime(nonfinite);nonfinite.nonfinite_sample=true;assert(tick(*nonfinite_failure)==(std::array<double,2>{})&&nonfinite_failure->failed());
 auto invalid_callbacks=callbacks(state);invalid_callbacks.clear=nullptr;assert(!r->bind_external(1,invalid_callbacks));
}
#endif
}
int main(){topology();
#ifdef ULTRA_EXTERNAL_DEVICE_EXPERIMENTAL
 notes_parameters_and_isolation();proxy_control_edges();unqualified_clear_and_failures();std::puts("PASS: experimental borrowed external callbacks, stereo graph, note/parameter frames, safe clear and independent roots");
#else
 std::puts("PASS: production graph compiler rejects experimental external device kinds");
#endif
}
