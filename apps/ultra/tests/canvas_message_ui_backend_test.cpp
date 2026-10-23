#include "../src-tauri/native/backend.h"
#include <array>
#include <atomic>
#include <cassert>
#include <cstdio>
#include <cstring>
#include <dlfcn.h>
#include <thread>
int main(){
 using Text=int(*)(uint32_t,uint64_t,uint32_t,uint64_t,const char*,uint32_t);
 const auto edit=reinterpret_cast<Text>(dlsym(RTLD_DEFAULT,"ultra_canvas_message_text_document"));
 assert(edit&&"atomic MessageBox text ABI must be exported");
 ultra_audio_stop();UltraCanvasGraph g{};g.revision=1;g.node_count=3;g.edge_count=1;
 g.nodes[0]={1,53,0,0,0,0,0};std::strcpy(g.nodes[0].text,"saved $1 $2");
 g.nodes[1]={2,25,0,0,0,0,0};std::strcpy(g.nodes[1].text,"out");
 g.nodes[2]={3,7,0,0,32,0,0};g.edges[0]={1,0,2,0};
 assert(ultra_canvas_install_document(5,&g));
 UltraCanvasMessageBoxSnapshot boxes{},again{};
 assert(ultra_canvas_message_boxes_document(5,&boxes)&&boxes.revision==1&&boxes.text_edit_serial==0&&boxes.node_count==1);
 assert(boxes.nodes[0].id==1&&boxes.nodes[0].placeholders[0]==1&&boxes.nodes[0].placeholders[1]==2);
 assert(ultra_canvas_message_boxes_document(5,&again)&&!std::memcmp(&boxes,&again,sizeof boxes));
 assert(!edit(16,1,1,1,"x",1)&&!edit(6,1,1,1,"x",1)&&!edit(5,2,1,1,"x",1)&&!edit(5,1,2,1,"x",1));
 assert(!edit(5,1,1,1,"bad $3",6));assert(edit(5,1,1,1,"fresh $1",8));assert(!edit(5,1,1,1,"x",1));
 assert(ultra_canvas_message_boxes_document(5,&again)&&again.text_edit_serial==1&&again.nodes[0].generation>boxes.nodes[0].generation);
 double seven=7;assert(ultra_canvas_event_document(5,1,1,0,1,&seven));
 UltraCanvasConsoleRecord rows[128]{};uint64_t dropped=0;assert(ultra_canvas_console_document(5,rows,128,&dropped)==1);
 assert(!std::strcmp(rows[0].message.selector,"fresh")&&rows[0].message.values[0]==7);
 assert(ultra_external_start());std::array<float,64> left{},right{};
 auto render=[&]{assert(ultra_external_render(64,left.data(),right.data()));};render();
 assert(ultra_canvas_event_document(5,1,3,0,0,nullptr));
 assert(edit(5,1,1,2,"new $1",6));assert(ultra_canvas_event_document(5,1,1,0,1,&seven));render();
 assert(ultra_canvas_message_boxes_document(5,&boxes)&&boxes.text_edit_serial==2&&!std::strcmp(boxes.nodes[0].prototype.selector,"new"));
 assert(ultra_canvas_console_document(5,rows,128,&dropped)==1&&!std::strcmp(rows[0].message.selector,"new"));
 UltraCanvasStatus status{};ultra_canvas_status_document(5,&status);assert(status.nodes[2].pulses==1&&status.revision==1);
 for(unsigned i=0;i<64;++i)assert(edit(5,1,1,3+i,"x",1));
 assert(!edit(5,1,1,67,"refused",7));render();
 assert(edit(5,1,1,67,"drained",7));ultra_audio_stop();
 assert(ultra_canvas_message_boxes_document(5,&boxes)&&boxes.text_edit_serial==67);
 assert(ultra_canvas_event_document(5,1,1,0,0,nullptr));assert(ultra_canvas_console_document(5,rows,128,&dropped)==1&&!std::strcmp(rows[0].message.selector,"drained"));
 std::atomic<bool> done{false};std::atomic<unsigned> reads{0};
 std::thread reader([&]{
  while(!done.load()){
   UltraCanvasMessageBoxSnapshot snapshot{};
   if(!ultra_canvas_message_boxes_document(5,&snapshot))continue;
   assert(snapshot.node_count==1&&snapshot.revision==1);
   const auto serial=snapshot.text_edit_serial;
   assert(!std::strcmp(snapshot.nodes[0].prototype.selector,serial==67?"drained":serial%2?"odd":"even"));
   ++reads;
  }
 });
 while(!reads.load())std::this_thread::yield();
 for(uint64_t serial=68;serial<1068;++serial)assert(edit(5,1,1,serial,serial%2?"odd":"even",serial%2?3:4));
 done=true;reader.join();assert(reads>0);
 assert(ultra_canvas_close_document(5));assert(!edit(5,1,1,68,"closed",6));
 assert(!ultra_canvas_message_boxes_document(5,&boxes));
 g.revision=2;g.node_count=0;g.edge_count=0;assert(ultra_canvas_install_document(5,&g));
 assert(ultra_canvas_message_boxes_document(5,&boxes)&&boxes.revision==2&&boxes.text_edit_serial==0&&boxes.node_count==0);
 assert(ultra_canvas_close_document(5));
 std::puts("message UI backend admission and FIFO passed");
}
