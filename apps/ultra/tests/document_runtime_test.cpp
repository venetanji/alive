#include "../src-tauri/native/backend.h"
#include "../src-tauri/native/patch_graph.h"
#include <array>
#include <cassert>
#include <cstdio>
#include <cstring>

static UltraCanvasGraph pair(uint64_t revision,const char* name,bool sender) {
 UltraCanvasGraph g{};g.revision=revision;g.node_count=2;g.edge_count=1;
 g.nodes[0]={1,sender?2u:27u,0,0,0,0,0};g.nodes[1]={2,sender?26u:25u,0,0,0,0,0};
 std::strcpy(sender?g.nodes[1].text:g.nodes[0].text,name);
 if(!sender)std::strcpy(g.nodes[1].text,"received");
 g.edges[0]={1,0,2,0};return g;
}
static UltraCanvasGraph clock(uint64_t revision) {
 UltraCanvasGraph g{};g.revision=revision;g.node_count=3;g.edge_count=2;
 g.nodes[0]={1,3,0,0,0,0,0};g.nodes[1]={2,6,0,0,20,0,0};g.nodes[2]={3,7,0,0,32,0,0};
 g.edges[0]={1,0,2,0};g.edges[1]={2,0,3,0};return g;
}
static UltraCanvasStatus status(unsigned document) {
 UltraCanvasStatus s{};ultra_canvas_status_document(document,&s);return s;
}
static bool event(unsigned document,uint64_t revision,unsigned node,double value) {
 return ultra_canvas_event_document(document,revision,node,0,1,&value);
}
int main() {
 ultra_audio_stop();auto sender=pair(1,"channel",true),receiver=pair(1,"channel",false);
 assert(ultra_canvas_install_document(8,&sender));assert(ultra_canvas_install_document(9,&receiver));
 assert(!ultra_canvas_install_document(16,&sender));assert(!ultra_canvas_close_document(16));
 assert(event(8,1,1,7));
 UltraCanvasConsoleRecord rows[128]{};uint64_t dropped=0;
 assert(!ultra_canvas_console_document(8,rows,128,&dropped));
 assert(ultra_canvas_console_document(9,rows,128,&dropped)==1&&rows[0].message.values[0]==7);
 // A graph edit retains unread records and their original graph revision.
 assert(event(8,1,1,8));receiver.revision=2;assert(ultra_canvas_install_document(9,&receiver));
 assert(event(8,1,1,9));assert(ultra_canvas_console_document(9,rows,128,&dropped)==2);
 assert(rows[0].revision==1&&rows[1].revision==2);
 for(unsigned i=0;i<130;++i)assert(event(8,1,1,i));
 assert(ultra_canvas_console_document(9,rows,1,&dropped)==1&&dropped==2);
 // Close retires the prior console epoch, even if a later document uses the slot.
 assert(ultra_canvas_close_document(9));assert(!status(9).active&&status(9).revision==2);
 assert(!ultra_canvas_install_document(9,&receiver));receiver.revision=3;
 assert(ultra_canvas_install_document(9,&receiver));assert(!ultra_canvas_console_document(9,rows,128,&dropped)&&dropped==0);
 assert(event(8,1,1,11));assert(ultra_canvas_console_document(9,rows,128,&dropped)==1&&rows[0].sequence==1);
 assert(ultra_canvas_close_document(9));assert(event(8,1,1,12));
 receiver.revision=4;std::strcpy(receiver.nodes[0].text,"elsewhere");assert(ultra_canvas_install_document(9,&receiver));
 assert(event(8,1,1,13));assert(!ultra_canvas_console_document(9,rows,128,&dropped));
 auto timer=clock(1);assert(ultra_canvas_install_document(10,&timer));
 auto dynamic=pair(1,"",false);assert(ultra_canvas_install_document(11,&dynamic));
 UltraCanvasMessage bind{};bind.count=1;bind.tags[0]=2;std::strcpy(bind.selector,"set");std::strcpy(bind.symbols[0],"channel");
 assert(ultra_canvas_message_document(11,1,1,0,&bind));
 auto idle_timer=clock(1);assert(ultra_canvas_install_document(12,&idle_timer));assert(event(12,1,1,1));
 assert(status(12).nodes[0].value==1);
 assert(ultra_external_start());std::array<float,1024> left{},right{};
 assert(status(12).nodes[0].value==1);
 auto render=[&](unsigned frames){assert(ultra_external_render(frames,left.data(),right.data()));};
 assert(event(10,1,1,1));render(500);auto before=status(10);assert(before.nodes[2].pulses==1);
 assert(event(8,1,1,17));render(1);assert(ultra_canvas_console_document(11,rows,128,&dropped)==1);
 sender.revision=2;assert(ultra_canvas_install_document(8,&sender));render(399);
 assert(ultra_canvas_close_document(9));render(60);assert(status(10).nodes[2].pulses==1);
 render(1);assert(status(10).nodes[2].pulses==2);
 // A full FIFO rejects scoped close without retiring the graph or faulting audio.
 for(unsigned i=0;i<64;++i)assert(event(8,2,1,i));
 assert(!ultra_canvas_close_document(8));assert(ultra_audio_flags()==3);
 render(1);assert(status(8).active&&status(8).revision==2);
 // Close/install is FIFO ordered; queued old rows cannot leak into the new document.
 receiver.revision=5;std::strcpy(receiver.nodes[0].text,"channel");assert(ultra_canvas_install_document(9,&receiver));
 assert(event(8,2,1,21));assert(ultra_canvas_close_document(9));receiver.revision=6;
 assert(ultra_canvas_install_document(9,&receiver));assert(event(8,2,1,22));render(64);
 assert(ultra_canvas_console_document(9,rows,128,&dropped)==1&&rows[0].revision==6&&rows[0].message.values[0]==22);
 ultra_canvas_stop_all();render(1024);const auto stopped=status(10).nodes[2].pulses;
 render(1024);assert(status(10).nodes[2].pulses==stopped);
 const auto counter=status(10).nodes[2];assert(event(8,2,1,41));ultra_audio_stop();
 assert(status(8).nodes[0].value==41);
 assert(status(10).nodes[2].pulses==counter.pulses&&status(10).nodes[2].value==counter.value);
 assert(event(8,2,1,31));assert(ultra_canvas_console_document(11,rows,128,&dropped));
 assert(ultra_external_start());assert(status(10).nodes[2].pulses==counter.pulses&&status(10).nodes[2].value==counter.value);
 assert(event(8,2,1,32));render(64);assert(ultra_canvas_console_document(11,rows,128,&dropped)==1&&rows[0].message.values[0]==32);
 ultra_audio_stop();
 // A numeric edit and its hot outlet use one admission, even at FIFO capacity.
 UltraCanvasGraph hot_graph{};hot_graph.revision=1;hot_graph.node_count=2;hot_graph.edge_count=1;
 hot_graph.nodes[0]={1,2,0,0,0,0,0};hot_graph.nodes[1]={2,25,0,0,0,0,0};
 std::strcpy(hot_graph.nodes[1].text,"hot");hot_graph.edges[0]={1,0,2,0};
 assert(ultra_canvas_install_document(13,&hot_graph));
 assert(!ultra_canvas_param_hot_document(13,1,1,0,3,2));
 assert(!ultra_canvas_param_hot_document(13,1,1,7,3,1));
 assert(!ultra_canvas_param_hot_document(13,2,1,0,3,1));
 assert(status(13).nodes[0].value==0);
 assert(ultra_canvas_param_hot_document(13,1,1,0,7,1));
 assert(ultra_canvas_console_document(13,rows,128,&dropped)==1&&rows[0].message.values[0]==7);
 assert(ultra_canvas_param_hot_document(13,1,1,0,8,0));
 assert(status(13).nodes[0].value==8&&!ultra_canvas_console_document(13,rows,128,&dropped));
 assert(ultra_external_start());
 for(unsigned i=0;i<63;++i)assert(event(13,1,1,i));
 assert(ultra_canvas_param_hot_document(13,1,1,0,73,1));
 assert(!ultra_canvas_param_hot_document(13,1,1,0,99,1));
 assert(ultra_audio_flags()==3);render(1);
 assert(status(13).nodes[0].value==73);
 assert(ultra_canvas_console_document(13,rows,128,&dropped)==64);
 assert(rows[63].message.values[0]==73);
 // Quiescing the callback drains an admitted hot edit exactly once as well.
 assert(ultra_canvas_param_hot_document(13,1,1,0,81,1));ultra_audio_stop();
 assert(status(13).nodes[0].value==81);
 assert(ultra_canvas_console_document(13,rows,128,&dropped)==1&&rows[0].message.values[0]==81);
 assert(ultra_canvas_close_document(13));
 std::puts("PASS: document console epochs, close/reuse, named subscriber removal, timer isolation and full-FIFO close rejection");
}
