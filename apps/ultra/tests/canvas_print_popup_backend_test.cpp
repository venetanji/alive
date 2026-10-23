#include "../src-tauri/native/backend.h"
#include <array>
#include <atomic>
#include <cassert>
#include <chrono>
#include <cstdio>
#include <cstring>
#include <dlfcn.h>
#include <thread>
int main(){
 using Read=int(*)(uint32_t,UltraCanvasPrintPopupSnapshot*);
 const auto read=reinterpret_cast<Read>(dlsym(RTLD_DEFAULT,"ultra_canvas_print_popups_document"));
 assert(read&&"nonconsuming print popup ABI must be exported");
 ultra_audio_stop();UltraCanvasGraph g{};g.revision=1;g.node_count=3;
 g.nodes[0]={1,25,0,0,0,1,0};std::strcpy(g.nodes[0].text,"one");
 g.nodes[1]={2,25,0,0,0,0,0};std::strcpy(g.nodes[1].text,"two");g.nodes[2]={3,2,0,0,0,0,0};
 assert(ultra_canvas_install_document(5,&g));UltraCanvasPrintPopupSnapshot s{},again{};
 assert(!read(16,&s)&&!read(6,&s)&&!read(5,nullptr));
 assert(read(5,&s)&&s.revision==1&&s.node_count==2&&s.nodes[0].enabled==1&&!s.nodes[0].has_value&&!s.nodes[1].enabled);
 assert(read(5,&again)&&!std::memcmp(&s,&again,sizeof s));
 double value=17;assert(ultra_canvas_event_document(5,1,1,0,1,&value));
 assert(read(5,&s)&&s.nodes[0].has_value&&s.nodes[0].generation==1&&s.nodes[0].message.values[0]==17);
 assert(read(5,&again)&&!std::memcmp(&s,&again,sizeof s));
 UltraCanvasConsoleRecord rows[128]{};uint64_t dropped=0;
 assert(ultra_canvas_console_document(5,rows,128,&dropped)==1&&rows[0].message.values[0]==17);
 assert(read(5,&again)&&again.nodes[0].has_value);
 const auto receipt_frame=again.nodes[0].frame, snapshot_frame=again.frame;
 std::this_thread::sleep_for(std::chrono::milliseconds(5));ultra_canvas_idle_tick();UltraCanvasStatus status{};ultra_canvas_status_document(5,&status);
 assert(read(5,&again)&&again.frame>snapshot_frame&&again.nodes[0].frame==receipt_frame&&again.nodes[0].generation==1);
 assert(ultra_canvas_param_document(5,1,1,1,0));assert(read(5,&s)&&!s.nodes[0].enabled&&!s.nodes[0].has_value);
 assert(ultra_canvas_param_document(5,1,1,1,1));assert(read(5,&s)&&s.nodes[0].enabled&&!s.nodes[0].has_value);
 g.revision=2;assert(ultra_canvas_install_document(5,&g));assert(read(5,&s)&&s.revision==2&&!s.nodes[0].has_value&&s.nodes[0].generation==0);
 assert(ultra_external_start());std::array<float,64> left{},right{};
 assert(ultra_external_render(64,left.data(),right.data()));
 assert(read(5,&s));const auto frame=s.frame;assert(ultra_external_render(64,left.data(),right.data()));
 assert(read(5,&s)&&s.frame>frame&&s.nodes[0].generation==0);
 std::atomic<bool> done{false};std::atomic<unsigned> reads{0};
 auto reader=[&]{while(!done.load()){
  UltraCanvasPrintPopupSnapshot snapshot{};if(!read(5,&snapshot))continue;
  assert(snapshot.node_count==2&&snapshot.revision==2&&snapshot.reserved==0);
  const auto& row=snapshot.nodes[0];assert(row.id==1&&row.enabled==1&&row.reserved==0&&row.frame<=snapshot.frame);
  if(row.has_value){assert(row.generation>0&&row.message.count==1&&row.message.values[0]==double(row.generation));}
  assert(!snapshot.nodes[1].has_value);++reads;
 }};
 std::thread first(reader),second(reader);while(reads.load()<2)std::this_thread::yield();
 for(unsigned i=1;i<=1000;++i){value=i;assert(ultra_canvas_event_document(5,2,1,0,1,&value));assert(ultra_external_render(64,left.data(),right.data()));}
 done=true;first.join();second.join();assert(reads>=2);
 ultra_audio_stop();assert(read(5,&s)&&s.nodes[0].generation==1000&&s.nodes[0].message.values[0]==1000);
 assert(ultra_canvas_close_document(5)&&!read(5,&s));
 g.revision=3;g.node_count=0;assert(ultra_canvas_install_document(5,&g));assert(read(5,&s)&&s.revision==3&&s.node_count==0);assert(ultra_canvas_close_document(5));
 std::puts("print popup backend nonconsuming publication and threaded reads passed");
}
