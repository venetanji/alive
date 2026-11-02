#include "../src-tauri/native/external_device/live_device.hpp"
#include "../src-tauri/native/alive_session_note_inputs.hpp"
#include "../src-tauri/native/backend.h"
#include "note_companion_test_adapter.hpp"
#include <cassert>
#include <cstdio>
#include <cstring>
#include <memory>

namespace {
struct Discard {bool operator()(alive::Event)noexcept{return true;}} discard;
bool note(void*,unsigned,unsigned,uint64_t)noexcept{return true;}
bool parameter(void*,unsigned,double,uint64_t)noexcept{return true;}
bool sample(void*,double* l,double* r,uint64_t)noexcept{*l=*r=0;return true;}
bool release(void*,uint64_t)noexcept{return true;}
UltraCanvasGraph graph(){
 UltraCanvasGraph g{};g.revision=1;g.node_count=g.edge_count=2;
 g.nodes[0].id=1;g.nodes[0].kind=68;g.nodes[1].id=2;g.nodes[1].kind=49;std::strcpy(g.nodes[1].text,"1 2");
 g.edges[0]={1,0,2,0};g.edges[1]={1,1,2,1};return g;
}
std::array<uint8_t,32> digest(){
 std::array<uint8_t,32> bytes{};
 for(unsigned i=0;i<32;++i){unsigned value=0;assert(std::sscanf(ultra::AnalogLiveDeviceProfile.dll_sha256+2*i,"%2x",&value)==1);bytes[i]=uint8_t(value);}
 return bytes;
}
}
int main(){
 auto g=graph();ultra::CanvasPlan plan{};assert(ultra::compile_canvas(g,plan));
 auto runtime=std::make_unique<ultra::CanvasRuntime>();runtime->reset(plan);
 std::array<float,203> values{};UltraLiveDeviceSource source{1,1,203,0,"live12-analog-v1","synthetic.dll",values.data()};
 char error[256]{};auto bank=ultra::LiveDeviceBank::prepare(g,&source,1,error,sizeof error);assert(bank);
 const auto hash=digest();
 const auto matches=[&](uint64_t revision=1){return bank->matches_note_source(*runtime,1,source.profile,1,hash.data(),revision);};
 assert(!matches());assert(bank->bind(*runtime));assert(matches());
 const auto opens=note_test_opens,writes=note_test_writes,renders=note_test_renders,closes=note_test_closes;
 assert(!bank->matches_note_source(*runtime,1,"unknown",1,hash.data(),1));
 assert(!bank->matches_note_source(*runtime,1,source.profile,2,hash.data(),1));
 auto wrong=hash;wrong[0]^=1;assert(!bank->matches_note_source(*runtime,1,source.profile,1,wrong.data(),1));
 assert(!bank->matches_note_source(*runtime,2,source.profile,1,hash.data(),1));assert(!matches(2));
 assert(!bank->matches_note_source(*runtime,1,source.profile,1,nullptr,1));
 assert(runtime->unbind_external(1));assert(!matches());
 int foreign=0;ultra::CanvasRuntime::ExternalCallbacks callbacks{&foreign,note,parameter,sample,nullptr,false,release};
 assert(runtime->bind_external(1,callbacks));assert(!matches());
 assert(runtime->matches_external_binding(1,&foreign,release));
 assert(!runtime->matches_external_binding(1,bank.get(),release));
 assert(!runtime->matches_external_binding(2,&foreign,release));
 assert(!runtime->matches_external_binding(1,&foreign,nullptr));
 callbacks.release_notes=nullptr;assert(runtime->bind_external(1,callbacks));assert(!matches());
 assert(bank->bind(*runtime));assert(runtime->stop(0,discard));assert(!matches());
 assert(bank->bind(*runtime));assert(matches());
 // Exact retained-owner restoration may use a newer runtime graph revision.
 plan.graph.revision=3;runtime->reset(plan);assert(bank->bind(*runtime));assert(matches(3));assert(!matches());
 runtime->fail();assert(!matches(3));
 runtime->recover();assert(bank->bind(*runtime));
 ultra::CanvasMessage on{};on.count=2;on.values[0]=60;on.values[1]=100;
 assert(runtime->event(3,1,0,on,0,discard));
 assert(!runtime->event(3,1,0,on,0,discard));
 assert(!matches(3));assert(!bank->bind(*runtime));
 assert(note_test_opens==opens&&note_test_writes==writes&&note_test_renders==renders&&note_test_closes==closes);
 // Public installed proof sees the bank built from the synthetic adapter, but
 // still refuses the valid native policy without invoking the adapter again.
 ultra_audio_stop();assert(alive_session_reset());
 assert(ultra_canvas_install_live_devices_document(0,&g,&source,1,error,sizeof error));
 auto c=std::make_unique<AliveSessionConfigV4>();c->version=4;c->struct_bytes=sizeof(*c);
 c->profile=c->work_policy=1;c->preparation_revision=1;c->track_count=c->device_count=1;
 c->tempo_bpm=120;c->length_frames=c->loop_end=4096;c->tracks[0].kind=1;c->tracks[0].gain=1;
 std::fill_n(c->tracks[0].slots,4,ALIVE_SESSION_V4_NONE);
 c->devices[0].kind=1;c->devices[0].note_node=1;c->devices[0].revision=1;c->devices[0].output_channels=c->devices[0].output_layout=2;
 AliveSessionNoteInputsV1 inputs{1,sizeof inputs,1,0,1,{}};
 inputs.inputs[0]={0,0,1,ALIVE_NOTE_NATIVE,1,ALIVE_NOTE_POLICY_NATIVE,1,{},{}};
 std::strcpy(inputs.inputs[0].profile,source.profile);std::copy(hash.begin(),hash.end(),inputs.inputs[0].dll_sha256);
 const auto installed_opens=note_test_opens,installed_writes=note_test_writes,installed_renders=note_test_renders,installed_closes=note_test_closes;
 AliveSessionStateV2 before{};before.version=2;before.struct_bytes=sizeof before;assert(alive_session_state_v2(&before));
 assert(alive_session_configure_notes_v1(c.get(),nullptr,0,&inputs)==ALIVE_SESSION_V4_FEATURE_DISABLED);
 AliveSessionStateV2 after{};after.version=2;after.struct_bytes=sizeof after;assert(alive_session_state_v2(&after));
 assert(!std::memcmp(&before,&after,sizeof before));
 assert(note_test_opens==installed_opens&&note_test_writes==installed_writes&&note_test_renders==installed_renders&&note_test_closes==installed_closes);
 assert(ultra_canvas_stop_document(0));
 assert(alive_session_configure_notes_v1(c.get(),nullptr,0,&inputs)==ALIVE_SESSION_V4_BAD_SOURCE);
 assert(ultra_canvas_close_document(0));
 std::puts("PASS: exact installed bank/armed binding/release ownership; stale, foreign, cleared and failed proofs; closed export invokes no adapter");
}
