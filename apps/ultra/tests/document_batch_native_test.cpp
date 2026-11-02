#include "../src-tauri/native/document_batch.h"
#include "../src-tauri/native/backend.h"
#include "../src-tauri/native/external_device/profiles/analog_descriptors.hpp"
#include <array>
#include <cassert>
#include <cstdio>
#include <cstring>

static UltraCanvasGraph graph(uint64_t revision){
 UltraCanvasGraph g{};g.revision=revision;g.node_count=1;g.nodes[0].id=1;g.nodes[0].kind=68;return g;
}
static UltraLiveDeviceParameterState snapshot(unsigned document,uint64_t revision){
 std::array<UltraLiveDeviceParameterState,203> states{};
 assert(ultra_canvas_live_device_parameters_document(document,revision,1,states.data(),states.size())==states.size());
 return states[2];
}
int main(int argc,char** argv){
 assert(argc==2);char error[512]{};ultra_audio_stop();
 // Deliberate descriptor-minimum test state, not a factory-initialization claim.
 std::array<float,203> initial{};for(unsigned i=0;i<initial.size();++i)initial[i]=ultra::AnalogLiveDeviceDescriptors[i].minimum;
 auto old=graph(1),next=graph(2);
 UltraLiveDeviceSource original{1,1,203,0,"live12-analog-v1",argv[1],initial.data()};
 for(unsigned d=0;d<2;++d){
  assert(ultra_canvas_install_live_devices_document(d,&old,&original,1,error,sizeof error));
  auto values=initial;values[2]=d?.5f:.25f;UltraLiveDeviceStateUpdate update{1,203,values.data()};
  assert(ultra_canvas_live_devices_set_states_document(d,1,&update,1,error,sizeof error));
  const auto state=snapshot(d,1);assert(state.requested==values[2]&&state.request_version==2&&state.applied_version==1);
 }
 auto a=initial,b=initial;a[2]=.75f;b[2]=.9f;
 std::array<UltraLiveDeviceSource,2> sources{original,original};sources[0].values=a.data();sources[1].values=b.data();
 std::array<UltraPreparedDocumentV1,2> rows{{
  {sizeof(UltraPreparedDocumentV1),0,&next,&sources[0],1,0},
  {sizeof(UltraPreparedDocumentV1),1,&next,&sources[1],1,0}}};
 sources[1].profile="unqualified";
 assert(!ultra_prepare_document_batch_v1(rows.data(),rows.size(),error,sizeof error));
 assert(snapshot(0,1).requested==.25f&&snapshot(1,1).requested==.5f);
 sources[1].profile="live12-analog-v1";
 auto* batch=ultra_prepare_document_batch_v1(rows.data(),rows.size(),error,sizeof error);
 if(!batch){std::fprintf(stderr,"%s\n",error);return 1;}
 assert(snapshot(0,1).request_version==2&&snapshot(1,1).request_version==2);
 UltraDocumentExchange* undo=nullptr;
 assert(ultra_exchange_document_batch_v1(batch,3,&undo,error,sizeof error));
 ultra_release_document_batch_v1(batch);
 assert(snapshot(0,2).requested==.75f&&snapshot(1,2).requested==.9f);
 assert(snapshot(0,2).request_version==1&&snapshot(0,2).applied_version==1);
 std::array<uint64_t,16> revisions{};revisions.fill(3);
 assert(ultra_restore_document_exchange_v1(undo,revisions.data(),revisions.size(),error,sizeof error));
 for(unsigned d=0;d<2;++d){const auto state=snapshot(d,3);
  assert(state.requested==(d?.5f:.25f)&&state.request_version==2&&state.applied_version==1);
 }
 ultra_release_document_exchange_v1(undo);
 for(unsigned d=0;d<2;++d)assert(ultra_canvas_close_document(d));
 std::puts("PASS: real native banks stage independently and restore retained command cells across two roots");
}
