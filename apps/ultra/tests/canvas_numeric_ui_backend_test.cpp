#include "../src-tauri/native/backend.h"
#include <array>
#include <cassert>
#include <cstdio>
#include <cstring>
#include <dlfcn.h>

int main() {
 using Tab=int(*)(uint32_t,uint64_t,uint32_t);
 const auto tab=reinterpret_cast<Tab>(dlsym(RTLD_DEFAULT,"ultra_canvas_tab_document"));
 assert(tab&&"dedicated physical Tab ABI must be exported");
 ultra_audio_stop();
 UltraCanvasGraph g{};g.revision=1;g.node_count=3;g.edge_count=2;
 g.nodes[0]={1,52,0,0,0,-100000,100000};
 g.nodes[1]={2,25,0,0,0,0,0};std::strcpy(g.nodes[1].text,"value");
 g.nodes[2]={3,25,0,0,0,0,0};std::strcpy(g.nodes[2].text,"tab");
 g.edges[0]={1,0,2,0};g.edges[1]={1,1,3,0};
 assert(ultra_canvas_install_document(5,&g));
 assert(!tab(16,1,1)&&!tab(6,1,1)&&!tab(5,2,1)&&!tab(5,1,2)&&!tab(5,1,99));
 UltraCanvasMessage selector{};std::strcpy(selector.selector,"tab");
 assert(ultra_canvas_message_document(5,1,1,0,&selector));
 UltraCanvasConsoleRecord rows[8]{};uint64_t dropped=0;
 assert(!ultra_canvas_console_document(5,rows,8,&dropped));
 assert(tab(5,1,1));
 assert(ultra_canvas_console_document(5,rows,8,&dropped)==1&&rows[0].node==3&&rows[0].message.count==0);
 assert(ultra_external_start());
 std::array<float,64> left{},right{};
 auto render=[&]{assert(ultra_external_render(left.size(),left.data(),right.data()));};
 render();
 assert(ultra_canvas_param_hot_document(5,1,1,0,17,1));
 assert(tab(5,1,1));render();
 assert(ultra_canvas_console_document(5,rows,8,&dropped)==2);
 assert(rows[0].node==2&&rows[0].message.values[0]==17&&rows[0].message.tags[0]==0);
 assert(rows[1].node==3&&rows[1].message.count==0);
 UltraCanvasStatus status{};ultra_canvas_status_document(5,&status);
 assert(status.revision==1&&status.nodes[0].value==17);
 // Queue saturation refuses the extra UI action without panicking the engine.
 for(unsigned i=0;i<64;++i)assert(tab(5,1,1));
 assert(!tab(5,1,1));render();
 UltraCanvasConsoleRecord queued[128]{};
 assert(ultra_canvas_console_document(5,queued,128,&dropped)==64);
 assert(!(ultra_audio_flags()&4));
 for(unsigned i=0;i<64;++i)assert(queued[i].node==3&&queued[i].message.count==0);
 // Stop drains an admitted action exactly once even before another callback.
 assert(tab(5,1,1));ultra_audio_stop();
 assert(ultra_canvas_console_document(5,rows,8,&dropped)==1&&rows[0].node==3);
 assert(ultra_canvas_close_document(5));assert(!tab(5,1,1));
 std::puts("numeric UI backend admission, callback order and stop drain passed");
}
