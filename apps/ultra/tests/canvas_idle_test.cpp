// The real C ABI must dispatch control messages with no audio device running.
#include "../src-tauri/native/patch_graph.h"
#include "../src-tauri/native/backend.h"
#include <cassert>
#include <cstdio>
#include <chrono>
#include <cstring>
#include <thread>

int main() {
 ultra_audio_stop();
 UltraCanvasGraph graph{};graph.revision=1;graph.node_count=2;graph.edge_count=1;
 graph.nodes[0]={1,2,0,0,0,0,0};graph.nodes[1]={2,2,0,0,0,0,0};
 graph.edges[0]={1,0,2,0};
 assert(ultra_canvas_install(&graph));
 double value=42;
 assert(ultra_canvas_event(1,1,0,1,&value));
 UltraCanvasStatus status{};ultra_canvas_status(&status);
 assert(status.active&&status.nodes[1].value==42&&status.nodes[1].pulses==1);
 // A stopped live parameter edit must retain downstream state and pulse counts.
 assert(ultra_canvas_param(1,1,0,17));
 ultra_canvas_status(&status);
 assert(status.nodes[0].value==17&&status.nodes[1].value==42&&status.nodes[1].pulses==1);
 assert(ultra_canvas_event(1,1,0,0,nullptr));
 ultra_canvas_status(&status);
 assert(status.nodes[1].value==17&&status.nodes[1].pulses==2);
 ultra_canvas_stop();
 assert(!ultra_canvas_event(2,1,0,0,nullptr));
 // The background entry point, rather than a UI poll, advances native line.
 graph={};graph.revision=2;graph.node_count=3;graph.edge_count=2;
 graph.nodes[0]={1,24,0,0,0,0,1,1};
 graph.nodes[1]={2,2,0,0,0,0,0};graph.nodes[2]={3,0,0,0,0,0,0};
 graph.edges[0]={1,0,2,0};graph.edges[1]={1,1,3,0};
 assert(ultra_canvas_install(&graph));
 UltraCanvasMessage message{};message.count=2;message.values[0]=20;message.values[1]=20;
 assert(ultra_canvas_message(2,1,0,&message));
 const auto deadline=std::chrono::steady_clock::now()+std::chrono::milliseconds(250);
 do {
  std::this_thread::sleep_for(std::chrono::milliseconds(2));
  ultra_canvas_idle_tick();ultra_canvas_status(&status);
 }while(!status.nodes[2].pulses&&std::chrono::steady_clock::now()<deadline);
 assert(status.nodes[1].value==20&&status.nodes[1].pulses>1&&status.nodes[2].pulses==1);
 message={};std::memcpy(message.selector,"set",4);message.count=1;message.values[0]=7.5;message.tags[0]=1;
 assert(ultra_canvas_message(2,1,0,&message));ultra_canvas_status(&status);
 assert(status.nodes[0].value==7.5&&status.nodes[1].value==20&&status.nodes[2].pulses==1);
 ultra_audio_stop();
 std::puts("PASS: real native control dispatch, live parameters and timed line completion while DSP is off");
}
