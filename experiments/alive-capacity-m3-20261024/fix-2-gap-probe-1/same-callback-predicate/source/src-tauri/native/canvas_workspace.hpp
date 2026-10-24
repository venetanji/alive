#pragma once
#include "patch_graph.hpp"

namespace ultra {
class CanvasWorkspace {
 public:
 static constexpr unsigned MaxDocuments=alive::DocumentCount;
 private:
 std::array<CanvasRuntime,MaxDocuments> runtimes_{};
 std::array<bool,MaxDocuments> live_{};
 CanvasDispatchContext dispatch_{};
 static void route(void* owner,const char* name,const CanvasMessage& message)noexcept {
  auto& self=*static_cast<CanvasWorkspace*>(owner);
  // Reverse pushes give stable doc/node traversal without promising Max order.
  for(unsigned document=MaxDocuments;document>0;--document){
   const unsigned d=document-1;if(!self.live_[d])continue;
   auto& runtime=self.runtimes_[d];const auto& graph=runtime.plan().graph;
   for(unsigned node=graph.node_count;node>0;--node){
    const unsigned slot=node-1;
    if(graph.nodes[slot].kind!=Receive||std::strcmp(runtime.bound_name(slot),name))continue;
    self.dispatch_.request_resume(&runtime);
    if(!self.dispatch_.push({&runtime,slot,0,message,true,0})){runtime.fail();return;}
   }
  }
 }
 public:
 CanvasWorkspace()noexcept {
  dispatch_.owner=this;dispatch_.route=route;
  for(unsigned d=0;d<MaxDocuments;++d)runtimes_[d].bind_workspace(dispatch_,d);
 }
#ifdef ULTRA_CANVAS_TEST_TRACE
 void set_test_trace(void* owner,void (*trace)(void*,const CanvasRuntime*,unsigned,unsigned,bool,const CanvasMessage&)noexcept)noexcept {
  dispatch_.trace_owner=owner;dispatch_.trace=trace;
 }
#endif
 CanvasRuntime& runtime(unsigned document)noexcept{return runtimes_[document];}
 const CanvasRuntime& runtime(unsigned document)const noexcept{return runtimes_[document];}
 bool live(unsigned document)const noexcept{return document<MaxDocuments&&live_[document];}
 bool any()const noexcept{for(bool value:live_)if(value)return true;return false;}
 bool failed()const noexcept{if(dispatch_.failed)return true;for(unsigned d=0;d<MaxDocuments;++d)if(live_[d]&&runtimes_[d].failed())return true;return false;}
 void begin_callback()noexcept{dispatch_.begin();for(auto& runtime:runtimes_)runtime.begin_callback();}
 template<class Emit> bool install(unsigned document,const CanvasPlan& plan,unsigned offset,Emit& emit)noexcept {
  if(document>=MaxDocuments)return false;
  auto& runtime=runtimes_[document];
  if(!runtime.stop(offset,emit))return false;
  runtime.reset(plan,false);live_[document]=true;
  return runtime.configure_voices(offset,emit);
 }
 template<class Emit> void close(unsigned document,unsigned offset,Emit& emit)noexcept {
  if(!live(document))return;
  runtimes_[document].stop(offset,emit);live_[document]=false;
 }
 template<class Emit> void stop(unsigned document,unsigned offset,Emit& emit)noexcept {
  if(live(document))runtimes_[document].stop(offset,emit);
 }
 void clear_timers()noexcept{for(unsigned d=0;d<MaxDocuments;++d)if(live_[d])runtimes_[d].clear_timers();}
 template<class Emit> bool event(unsigned document,uint64_t revision,uint32_t node,unsigned inlet,const CanvasMessage& message,unsigned offset,Emit& emit)noexcept {
  return live(document)&&runtimes_[document].event(revision,node,inlet,message,offset,emit);
 }
 template<class Emit> bool tab(unsigned document,uint64_t revision,uint32_t node,unsigned offset,Emit& emit)noexcept {
  return live(document)&&runtimes_[document].tab(revision,node,offset,emit);
 }
 template<class Emit> bool sample(unsigned offset,Emit& emit)noexcept {
  for(unsigned d=0;d<MaxDocuments;++d)if(live_[d]&&!runtimes_[d].sample(offset,emit))return false;
  return !dispatch_.failed;
 }
};
}
