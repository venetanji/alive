#include "backend.h"
#include "patch_graph.h"
#include <array>
#include <cassert>
#include <cmath>
#include <cstdio>
#include <cstring>

static UltraCanvasGraph voice(unsigned revision) {
 UltraCanvasGraph g{};g.revision=revision;g.node_count=4;g.edge_count=4;
 g.nodes[0]={1,11,0,0,0,0,0};g.nodes[1]={2,12,0,0,127,0,0};
 g.nodes[2]={3,13,0,0,0,0,0};g.nodes[3]={4,14,0,0,0,0,0};
 g.edges[0]={1,0,2,0};g.edges[1]={2,0,3,0};g.edges[2]={2,0,3,1};g.edges[3]={3,0,4,0};return g;
}
int main(int argc,char** argv) {
 assert(argc==3);const bool baseline=!std::strcmp(argv[1],"baseline");FILE* output=std::fopen(argv[2],"wb");assert(output);
 ultra_audio_stop();ultra_audio_routes(3);assert(ultra_external_start());auto graph=voice(1);
 for(unsigned d=0;d<2;++d)assert(ultra_canvas_install_document(d,&graph));
 UltraCanvasMessage note{};note.count=2;note.values[0]=69;note.values[1]=100;
 for(unsigned d=0;d<2;++d)assert(ultra_canvas_message_document(d,1,1,0,&note));
 std::array<float,512> left{},right{};
 auto render=[&] {assert(ultra_external_render(left.size(),left.data(),right.data()));assert(ultra_audio_flags()==3);};
 auto energy=[&] {double energy=0;for(float sample:left){assert(std::isfinite(sample));energy+=sample*sample;}return energy;};
 render();assert(energy()>1e-5);
 unsigned cycles=0;
 for(unsigned edits:{1u,7u,8u,9u,31u,63u,64u}) {
  for(unsigned repeat=0;repeat<6;++repeat) {
   if(!baseline){
    for(unsigned i=0;i<edits;++i)assert(ultra_canvas_param_document(0,1,2,0,(i+repeat*7)%128));
    if(edits==64)assert(!ultra_canvas_param_document(0,1,2,0,127));
   }
   for(unsigned stop=0;stop<1+repeat;++stop)assert(ultra_canvas_stop_document(0));
   render();render();assert(energy()>1e-5);
   assert(std::fwrite(left.data(),sizeof(float),left.size(),output)==left.size());
   assert(std::fwrite(right.data(),sizeof(float),right.size(),output)==right.size());
   UltraCanvasStatus status{};ultra_canvas_status_document(0,&status);assert(status.active&&status.revision==1);
   if(!baseline)assert(status.nodes[1].value==(edits-1+repeat*7)%128);
   ++cycles;
  }
 }
 // Other document stopped: a stopped target must not leak voice or signal audio.
 assert(ultra_canvas_stop_document(1));render();render();assert(energy()==0);
 // Retained Gain is applied to deliberate restart: zero is silent, nonzero audible.
 assert(ultra_canvas_param_document(0,1,2,0,0));assert(ultra_canvas_stop_document(0));render();render();
 assert(ultra_canvas_message_document(0,1,1,0,&note));render();render();assert(energy()==0);
 assert(ultra_canvas_param_document(0,1,2,0,93));assert(ultra_canvas_stop_document(0));render();render();assert(energy()==0);
 assert(ultra_canvas_message_document(0,1,1,0,&note));render();render();assert(energy()>1e-5);
 // Global saturation stop and full audio-device stop/start remain usable.
 for(unsigned i=0;i<64;++i)assert(ultra_canvas_param_document(0,1,2,0,60+i));
 ultra_canvas_stop_all();render();render();assert(energy()==0);
 UltraCanvasStatus retained{};ultra_canvas_status_document(0,&retained);assert(retained.nodes[1].value==123);
 ultra_audio_stop();assert(ultra_external_start());assert(ultra_canvas_message_document(0,1,1,0,&note));render();render();assert(energy()>1e-5);
 assert(ultra_canvas_stop_document(0));render();render();assert(energy()==0);
 ultra_audio_stop();assert(!std::fclose(output));std::printf("PASS %s: %u stop cycles; Gain values preserved; FIFO saturation rejection; no engine fault; restart functional\n",argv[1],cycles);
}
