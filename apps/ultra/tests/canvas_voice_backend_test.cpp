#include "../src-tauri/native/backend.h"
#include "canvas_callback_guard.hpp"
#include <algorithm>
#include <array>
#include <cassert>
#include <cmath>
#include <cstdio>
#include <cstring>
#include <vector>

namespace {
uint64_t revision=0;
std::array<float,1024> left{},right{};
UltraCanvasNode node(unsigned id,unsigned kind,double p0=0,double p1=0,double p2=0,double p3=0){
 UltraCanvasNode result{};result.id=id;result.kind=kind;
 result.p0=p0;result.p1=p1;result.p2=p2;result.p3=p3;return result;
}
UltraCanvasGraph graph(unsigned channel){
 UltraCanvasGraph g{};g.revision=++revision;g.node_count=11;
 g.nodes[0]=node(1,60,4);g.nodes[1]=node(2,61);g.nodes[2]=node(3,63,5,20,.7,20);
 g.nodes[3]=node(4,64);g.nodes[4]=node(5,65);g.nodes[5]=node(6,12,100);g.nodes[6]=node(7,13);g.nodes[7]=node(8,14);g.nodes[8]=node(9,50);g.nodes[9]=node(10,50);g.nodes[10]=node(11,62,2400,.7);
 const UltraCanvasEdge edges[]={{1,0,2,0},{1,1,3,0},{2,0,11,0},{11,0,4,0},{3,0,4,1},{4,0,5,0},{5,0,6,0},{6,0,7,channel},{7,0,8,0},{9,0,1,0},{10,0,1,1}};
 for(const auto& edge:edges)g.edges[g.edge_count++]=edge;
 return g;
}
void note(unsigned document,uint64_t rev,unsigned pitch,unsigned velocity,unsigned entry=1){const double values[]={double(pitch),double(velocity)};assert(ultra_canvas_event_document(document,rev,entry,0,2,values));}
void render(unsigned frames=256){callback_guard::begin();const auto accepted=ultra_external_render(frames,left.data(),right.data());callback_guard::end();assert(accepted);for(unsigned i=0;i<frames;i++)assert(std::isfinite(left[i])&&std::isfinite(right[i]));assert(!(ultra_audio_flags()&4));}
bool audible(const std::array<float,1024>& samples,unsigned frames=256){return std::any_of(samples.begin(),samples.begin()+frames,[](float value){return value!=0;});}
void fill(unsigned document,uint64_t rev){for(unsigned i=0;i<64;i++)note(document,rev,60+i%4,100);}
void overload_and_restart(){
 ultra_audio_stop();auto a=graph(0),b=graph(1);assert(ultra_canvas_install_document(0,&a)&&ultra_canvas_install_document(1,&b));note(0,a.revision,60,100);ultra_canvas_stop_all();assert(ultra_external_start());render();assert(!audible(left)&&!audible(right));
 note(0,a.revision,60,100);note(1,b.revision,67,100);render();assert(audible(left)&&audible(right));
 assert(ultra_canvas_param_document(0,a.revision,11,0,1200));assert(ultra_canvas_param_document(0,a.revision,11,1,2));
 assert(ultra_canvas_param_document(0,a.revision,3,0,8));assert(ultra_canvas_param_document(0,a.revision,3,1,30));assert(ultra_canvas_param_document(0,a.revision,3,2,.6));assert(ultra_canvas_param_document(0,a.revision,3,3,20));render();assert(audible(left)&&audible(right));
 fill(0,a.revision);note(0,a.revision,60,0);render();assert(!audible(left)&&audible(right));
 // A routed release must also survive a saturated edit FIFO.
 note(0,a.revision,64,100);render();fill(0,a.revision);note(0,a.revision,64,0,9);render();assert(!audible(left)&&audible(right));
 note(0,a.revision,64,100);render();fill(0,a.revision);const double zero=0;assert(ultra_canvas_event_document(0,a.revision,10,0,1,&zero));render();assert(!audible(left)&&audible(right));
 note(0,a.revision,64,100);render();fill(0,a.revision);UltraCanvasMessage panic{};std::snprintf(panic.selector,sizeof panic.selector,"panic");assert(ultra_canvas_message_document(0,a.revision,1,0,&panic));render();assert(!audible(left)&&audible(right));
 note(0,a.revision,64,100);render();assert(ultra_canvas_stop_document(0));render();assert(!audible(left)&&audible(right));
 note(0,a.revision,64,100);render();a=graph(0);assert(ultra_canvas_install_document(0,&a));render();assert(!audible(left)&&audible(right));
 note(0,a.revision,64,100);render();ultra_audio_stop();assert(ultra_external_start());render();assert(!audible(left)&&!audible(right));
 note(0,a.revision,64,100);render();ultra_audio_panic();assert(!ultra_external_render(256,left.data(),right.data()));assert(!audible(left)&&!audible(right));ultra_audio_stop();assert(ultra_external_start());render();assert(!audible(left)&&!audible(right));
 assert(ultra_canvas_close_document(0));render();note(1,b.revision,67,100);render();assert(!audible(left)&&audible(right));assert(ultra_canvas_close_document(1));ultra_audio_stop();
}
void transformed_release_overflow(){
 ultra_audio_stop();auto a=graph(0),b=graph(1);
 a.nodes[a.node_count++]=node(12,53);std::strcpy(a.nodes[a.node_count-1].text,"60 0");a.edges[a.edge_count++]={12,0,1,0};
 a.nodes[a.node_count++]=node(13,27);std::strcpy(a.nodes[a.node_count-1].text,"saved-release");a.edges[a.edge_count++]={13,0,1,0};
 UltraCanvasGraph router{};router.revision=++revision;router.node_count=3;router.edge_count=2;
 router.nodes[0]=node(1,53);std::strcpy(router.nodes[0].text,"60 0");router.nodes[1]=node(2,26);std::strcpy(router.nodes[1].text,"saved-release");router.nodes[2]=node(3,50);router.edges[0]={1,0,2,0};router.edges[1]={3,0,2,0};
 assert(ultra_canvas_install_document(0,&a)&&ultra_canvas_install_document(1,&b)&&ultra_canvas_install_document(2,&router));assert(ultra_external_start());render();
 note(0,a.revision,60,100);note(1,b.revision,67,100);render();assert(audible(left)&&audible(right));
 assert(ultra_canvas_event_document(0,a.revision,12,0,0,nullptr));for(unsigned i=0;i<5;i++)render();assert(!audible(left)&&audible(right));
 note(0,a.revision,60,100);render();fill(0,a.revision);
 // Incoming bangs reveal their release meaning only after authored transforms.
 (void)ultra_canvas_event_document(0,a.revision,12,0,0,nullptr);render();const bool saved_release_silent=!audible(left);assert(audible(right));
 assert(ultra_canvas_stop_document(0));render();note(0,a.revision,60,100);render();
 assert(ultra_canvas_event_document(2,router.revision,1,0,0,nullptr));for(unsigned i=0;i<5;i++)render();assert(!audible(left)&&audible(right));
 note(0,a.revision,60,100);render();for(unsigned i=0;i<64;i++)note(2,router.revision,60+i%4,100,3);
 (void)ultra_canvas_event_document(2,router.revision,1,0,0,nullptr);render();const bool named_release_silent=!audible(left);assert(audible(right));
 assert(ultra_canvas_stop_document(0));render();note(0,a.revision,60,100);render();
 for(unsigned i=0;i<64;i++)note(2,router.revision,60+i%4,100,3);
 // A local release must also invalidate older events from related senders.
 (void)ultra_canvas_event_document(0,a.revision,12,0,0,nullptr);render();const bool related_sender_silent=!audible(left);assert(audible(right));
 std::fprintf(stderr,"overflow release safety: saved message=%u, named route=%u, related sender=%u\n",saved_release_silent,named_release_silent,related_sender_silent);
 assert(saved_release_silent&&named_release_silent&&related_sender_silent);
 for(unsigned document=0;document<3;document++)assert(ultra_canvas_close_document(document));
 ultra_audio_stop();
}
std::array<std::vector<float>,2> score(const std::vector<unsigned>& partitions){
 ultra_audio_stop();auto g=graph(0);assert(ultra_canvas_install_document(2,&g));assert(ultra_external_start());render(256);
 std::array<std::vector<float>,2> result;for(auto& channel:result)channel.resize(12000);
 const unsigned moments[]={0,1,31,63,64,127,1200,2400,4000,6000,12000};unsigned moment=0,partition=0;
 for(unsigned at=0;at<12000;){
  if(at==moments[moment]){if(moment<6)note(2,g.revision,60+moment,100);else if(moment==6){const double value=127;assert(ultra_canvas_event_document(2,g.revision,1,1,1,&value));}else if(moment==7)note(2,g.revision,65,0);else if(moment==8){const double value=0;assert(ultra_canvas_event_document(2,g.revision,1,1,1,&value));}else if(moment==9)assert(ultra_canvas_stop_document(2));moment++;}
  const unsigned count=std::min({12000-at,partitions[partition++%partitions.size()],moments[moment]-at});assert(count);
  callback_guard::begin();const auto accepted=ultra_external_render(count,result[0].data()+at,result[1].data()+at);callback_guard::end();assert(accepted);at+=count;
 }
 assert(ultra_canvas_close_document(2));ultra_audio_stop();return result;
}
void partitions(){const auto expected=score({1});for(const auto& partition:std::vector<std::vector<unsigned>>{{32},{64},{128},{256},{1,31,63,64,127,3,17},{1024}})assert(score(partition)==expected);}
}
int main(){overload_and_restart();transformed_release_overflow();partitions();std::puts("PASS: authored backend overload noteoff/transformed release/sustain/panic, stale FIFO invalidation, Stop/restart, independent roots and seven callback partitions");}
