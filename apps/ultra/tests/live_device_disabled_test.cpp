#include "../src-tauri/native/external_device/live_device.h"
#include "../src-tauri/native/document_batch.h"
#include <cassert>
#include <cstdio>
#include <cstring>
int main(){
 UltraCanvasGraph prior{};prior.revision=1;prior.node_count=1;prior.nodes[0].id=2;
 assert(ultra_canvas_install_document(0,&prior));
 char error[256]{};UltraCanvasGraph graph{};graph.revision=2;graph.node_count=1;graph.nodes[0].id=1;graph.nodes[0].kind=68;
 assert(!ultra_canvas_install_document(0,&graph));
 assert(!ultra_canvas_install_live_devices_document(0,&graph,nullptr,0,error,sizeof error));
 assert(std::strstr(error,"does not include"));
 assert(!ultra_canvas_live_devices_count_document(0));
 assert(!ultra_canvas_live_devices_rearm_document(0,error,sizeof error));
 assert(!ultra_canvas_live_devices_set_states_document(0,1,nullptr,0,error,sizeof error));
 assert(!ultra_canvas_live_device_parameters_document(0,1,1,nullptr,0));
 UltraLiveDeviceSource source{};
 UltraPreparedDocumentV1 candidate{sizeof(UltraPreparedDocumentV1),0,&graph,&source,1,0};
 assert(!ultra_prepare_document_batch_v1(&candidate,1,error,sizeof error));
 assert(std::strstr(error,"does not include"));
 UltraCanvasStatus status{};ultra_canvas_status_document(0,&status);
 assert(status.revision==prior.revision&&status.node_count==1&&status.nodes[0].id==2);
 assert(ultra_canvas_close_document(0));
 std::puts("PASS: default build exports explicit unsupported Live-device stubs and rejects external source graphs");
}
