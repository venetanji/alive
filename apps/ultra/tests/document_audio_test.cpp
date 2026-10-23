#include "../src-tauri/native/backend.h"
#include "../src-tauri/native/patch_graph.h"
#include <array>
#include <cassert>
#include <cmath>
#include <cstdio>

static UltraCanvasGraph voice(uint64_t revision) {
 UltraCanvasGraph g{};g.revision=revision;g.node_count=4;g.edge_count=4;
 g.nodes[0]={1,11,0,0,0,0,0};g.nodes[1]={2,12,0,0,127,0,0};
 g.nodes[2]={3,13,0,0,0,0,0};g.nodes[3]={4,14,0,0,0,0,0};
 g.edges[0]={1,0,2,0};g.edges[1]={2,0,3,0};g.edges[2]={2,0,3,1};g.edges[3]={3,0,4,0};return g;
}
int main() {
 ultra_audio_stop();auto g=voice(1);
 ultra_audio_routes(3);
 assert(ultra_external_start());
 UltraCanvasMessage note{};note.count=2;note.values[0]=69;note.values[1]=100;
 std::array<float,512> left{},right{};
 auto render=[&] {assert(ultra_external_render(left.size(),left.data(),right.data()));};
 auto energy=[&] {double result=0;for(float v:left)result+=v*v;return result;};
 assert(ultra_audio_event(0,0,69,100));render();assert(energy()>1e-5);
 // Taking bank ownership clears a legacy held note before exposing the graph.
 assert(ultra_canvas_install_document(0,&g));render();assert(energy()==0);
 assert(ultra_canvas_install_document(1,&g));
 assert(ultra_canvas_message_document(1,1,1,0,&note));
 render();assert(energy()>1e-5);
 // Replacing a silent document and closing it cannot clear another bank pair.
 g.revision=2;assert(ultra_canvas_install_document(0,&g));render();assert(energy()>1e-5);
 assert(ultra_canvas_close_document(0));render();assert(energy()>1e-5);
 UltraCanvasStatus status{};ultra_canvas_status_document(0,&status);
 assert(!status.active&&status.node_count==0&&status.revision==2);
 ultra_canvas_status_document(1,&status);assert(status.active&&status.revision==1);
 ultra_canvas_stop_document(1);render();render();assert(energy()==0);
 assert(ultra_canvas_close_document(1));render();
 for(unsigned revision=3;revision<5;++revision){
  g.revision=revision;assert(ultra_canvas_install_document(0,&g));
  assert(ultra_canvas_message_document(0,revision,1,0,&note));render();assert(energy()>1e-5);
  assert(ultra_canvas_close_document(0));render();assert(energy()==0);
 }
 g.revision=5;assert(ultra_canvas_install_document(0,&g));assert(ultra_canvas_message_document(0,5,1,0,&note));
 render();const auto single=left;assert(ultra_canvas_close_document(0));render();
 // All16 documents configure and start in one callback, then mix sample-aligned.
 g.revision=6;
 for(unsigned d=0;d<16;++d){assert(ultra_canvas_install_document(d,&g));assert(ultra_canvas_message_document(d,6,1,0,&note));}
 render();
 for(unsigned i=0;i<left.size();++i)assert(std::abs(left[i]-16*single[i])<1e-6f&&left[i]==right[i]);
 // Fill the FIFO with accepted future gate-ons, then release a held Voice.
 // The safety fallback clears only document 0 and cancels its queued starts.
 assert(ultra_canvas_close_document(1));render();
 for(unsigned d=2;d<16;++d)assert(ultra_canvas_close_document(d));
 render();
 for(unsigned i=0;i<64;++i)assert(ultra_canvas_message_document(0,6,1,0,&note));
 UltraCanvasMessage off=note;off.values[1]=0;
 assert(ultra_canvas_message_document(0,6,1,0,&off));
 render();render();assert(energy()==0);assert(ultra_audio_flags()==3);
 // A later start remains usable after the overload safety boundary.
 assert(ultra_canvas_message_document(0,6,1,0,&note));render();assert(energy()>1e-5);
 g.revision=7;assert(ultra_canvas_install_document(1,&g));
 assert(ultra_canvas_message_document(1,7,1,0,&note));render();
 for(unsigned i=0;i<64;++i)assert(ultra_canvas_message_document(0,6,1,0,&note));
 assert(ultra_canvas_stop_document(0));render();render();
 // Document 1 survives; document 0 cannot rearm after the stop.
 assert(energy()>1e-5);
 assert(ultra_canvas_stop_document(1));render();render();assert(energy()==0);
 // Global stop is coalesced out of band as well, even with a full FIFO.
 for(unsigned i=0;i<64;++i)assert(ultra_canvas_message_document(0,6,1,0,&note));
 ultra_canvas_stop_all();render();render();assert(energy()==0);assert(ultra_audio_flags()==3);
 // Legacy ingress still rejects document-bank addresses.
 assert(!ultra_audio_event(2,0,69,100));
 ultra_audio_stop();
 std::puts("PASS: one engine, independent document audio, isolated replace/close/stop and legacy device bounds");
}
