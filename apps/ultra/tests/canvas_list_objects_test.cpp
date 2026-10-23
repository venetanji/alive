#include "../src-tauri/native/canvas_workspace.hpp"
#include <cassert>
#include <cstdio>
#include <cstring>
#include <vector>

using namespace ultra;
namespace {
constexpr unsigned iter=28,prepend=29,append=30,zlreg=31,zljoin=32,zllen=33,zliter=34,zlslice=35,zlrev=36,zlrot=37;
auto discard=[](alive::Event){return true;};
CanvasMessage literal(const char* text){CanvasMessage result{};assert(canvas_parse_message(text,result));return result;}
UltraCanvasNode node(unsigned id,unsigned kind,double parameter=0,const char* text=""){
 UltraCanvasNode result{};result.id=id;result.kind=kind;result.p0=parameter;std::strcpy(result.text,text);return result;
}
UltraCanvasGraph graph(unsigned kind,double parameter=0,const char* text="",bool second=false){
 UltraCanvasGraph result{};result.revision=1;result.node_count=second?3:2;result.edge_count=second?2:1;
 result.nodes[0]=node(1,kind,parameter,text);result.nodes[1]=node(2,Print,0,"left");result.edges[0]={1,0,2,0};
 if(second){result.nodes[2]=node(3,Print,0,"right");result.edges[1]={1,1,3,0};}return result;
}
struct Score {
 CanvasRuntime runtime;
 explicit Score(const UltraCanvasGraph& graph){CanvasPlan plan{};assert(compile_canvas(graph,plan));runtime.reset(plan);}
 bool send(const char* text,unsigned inlet=0){runtime.begin_callback();return runtime.event(1,1,inlet,literal(text),0,discard);}
 std::vector<UltraCanvasConsoleRecord> take(){std::vector<UltraCanvasConsoleRecord> result;UltraCanvasConsoleRecord event{};while(runtime.pop_console(event))result.push_back(event);return result;}
};
void message(const UltraCanvasMessage& actual,const char* expected){
 const auto wanted=literal(expected);assert(actual.count==wanted.count&&!std::strcmp(actual.selector,wanted.selector));
 for(unsigned i=0;i<actual.count;i++)assert(actual.tags[i]==wanted.tags[i]&&actual.values[i]==wanted.values[i]&&!std::strcmp(actual.symbols[i],wanted.symbols[i]));
}
void capacity_error(Score& score){const auto out=score.take();assert(out.size()==1&&out[0].node==1&&out[0].level==2);message(out[0].message,"error list-capacity-exceeded 8");}
void selected_message(const UltraCanvasMessage& actual,const char* selector,const char* atoms){
 CanvasMessage expected{};assert(canvas_parse_args(atoms,expected));canvas_copy_symbol(expected.selector,selector);
 assert(actual.count==expected.count&&!std::strcmp(actual.selector,expected.selector));
 for(unsigned i=0;i<actual.count;i++)assert(actual.tags[i]==expected.tags[i]&&actual.values[i]==expected.values[i]&&!std::strcmp(actual.symbols[i],expected.symbols[i]));
}
void topology_and_validation(){
 for(unsigned kind=iter;kind<=zlrot;kind++){
  const auto size=kind==zliter||kind==zlslice?1:0;const auto text=kind==prepend?"list":"";
  auto source=graph(kind,size,text,kind>=zlreg);CanvasPlan plan{};assert(compile_canvas(source,plan));
  assert(canvas_inlets(source.nodes[0])==(kind>=zlreg?2u:1u));assert(canvas_outlets(source.nodes[0])==(kind>=zlreg?2u:1u));
  source.nodes[0].p1=1;assert(!compile_canvas(source,plan));source.nodes[0].p1=0;source.nodes[0].p5=1;assert(!compile_canvas(source,plan));
 }
 CanvasPlan plan{};assert(compile_canvas(graph(zliter,0),plan));assert(!compile_canvas(graph(zliter,1.5),plan));
 assert(compile_canvas(graph(prepend),plan));
 assert(!compile_canvas(graph(zlslice,-1),plan));assert(compile_canvas(graph(zlslice,0),plan));
 assert(compile_canvas(graph(zlrot,-100000),plan));assert(!compile_canvas(graph(zlrot,0.5),plan));
 assert(!compile_canvas(graph(iter,0,"unexpected"),plan));
}
void iterator_preserves_types_and_depth_first_order(){
 auto source=graph(iter);source.nodes[2]=node(3,prepend,0,"trace");source.nodes[3]=node(4,Print,0,"trace");source.node_count=4;
 source.edges[1]={1,0,3,0};source.edges[2]={3,0,4,0};source.edge_count=3;
 Score score(source);assert(score.send("list 7 2.5 amber"));auto outputs=score.take();assert(outputs.size()==6);
 const char* direct[]={"7","2.5","amber"};const char* traced[]={"trace 7","trace 2.5","trace amber"};
 for(unsigned i=0;i<3;i++){assert(outputs[2*i].node==2&&outputs[2*i+1].node==4);message(outputs[2*i].message,direct[i]);message(outputs[2*i+1].message,traced[i]);}
 assert(score.send("bang"));outputs=score.take();assert(outputs.size()==6);message(outputs[4].message,"amber");
}
void prefix_and_suffix_replacement(){
 Score prefix(graph(prepend,0,"set color"));assert(prefix.send("list 2.5 amber"));auto out=prefix.take();assert(out.size()==1);message(out[0].message,"set color 2.5 amber");
 assert(prefix.send("set route 3."));assert(prefix.take().empty());assert(prefix.send("peach 9"));out=prefix.take();message(out[0].message,"route 3. peach 9");
 Score suffix(graph(append,0,"9. amber"));assert(suffix.send("list 2 3."));out=suffix.take();assert(out.size()==1);message(out[0].message,"list 2 3. 9. amber");
 assert(suffix.send("set 4. plum"));assert(suffix.take().empty());assert(suffix.send("start 5"));out=suffix.take();message(out[0].message,"start 5 4. plum");
}
void register_and_join_cold_state(){
 Score reg(graph(zlreg,0,"3. amber",true));assert(reg.send("bang"));auto out=reg.take();assert(out.size()==1);message(out[0].message,"list 3. amber");
 assert(reg.send("list 7 8. plum",1));assert(reg.take().empty());assert(reg.send("bang"));out=reg.take();message(out[0].message,"list 7 8. plum");
 Score join(graph(zljoin,0,"8. amber",true));assert(join.send("list 1 2."));out=join.take();assert(out.size()==1);message(out[0].message,"list 1 2. 8. amber");
 assert(join.send("list 9 plum",1));assert(join.take().empty());assert(join.send("bang"));out=join.take();message(out[0].message,"list 1 2. 9 plum");
}
void length_reverse_rotate_and_inactive_ports(){
 Score length(graph(zllen,0,"",true));assert(length.send("list 1 2. amber"));auto out=length.take();assert(out.size()==1);message(out[0].message,"3");
 assert(length.send("list 9 8",1));assert(length.take().empty());
 Score reverse(graph(zlrev,0,"",true));assert(reverse.send("list 1 2. amber"));out=reverse.take();assert(out.size()==1);message(out[0].message,"amber 2. 1");
 assert(reverse.send("list 9 8",1));assert(reverse.take().empty());
 Score rotate(graph(zlrot,2,"",true));assert(rotate.send("list 1 2. amber 4 5"));out=rotate.take();message(out[0].message,"list 4 5 1 2. amber");
 assert(rotate.send("-2",1));assert(rotate.take().empty());assert(rotate.send("list 1 2. amber 4 5"));out=rotate.take();message(out[0].message,"amber 4 5 1 2.");
}
void chunks_and_slices(){
 Score chunks(graph(zliter,3,"",true));assert(chunks.send("list 1 2. amber 4 5. peach 7"));auto out=chunks.take();assert(out.size()==3);
 message(out[0].message,"list 1 2. amber");message(out[1].message,"list 4 5. peach");message(out[2].message,"7");
 Score slices(graph(zlslice,2,"",true));assert(slices.send("list 1 2. amber 4 5"));out=slices.take();assert(out.size()==2&&out[0].node==3&&out[1].node==2);
 message(out[0].message,"amber 4 5");message(out[1].message,"list 1 2.");
}
void over_capacity_is_atomic(){
 Score it(graph(iter));assert(it.send("list 4 5."));it.take();const auto before=it.runtime.pulses(0);assert(!it.send("named 1 2 3 4 5 6 7 8"));capacity_error(it);assert(!it.runtime.failed()&&it.runtime.pulses(0)==before);
 assert(it.send("bang"));auto out=it.take();assert(out.size()==2);message(out[0].message,"4");message(out[1].message,"5.");
 Score prefix(graph(prepend,0,"route 1 2"));assert(!prefix.send("list 3 4 5 6 7 8 9"));capacity_error(prefix);assert(!prefix.runtime.failed());
 assert(prefix.send("5"));out=prefix.take();message(out[0].message,"route 1 2 5");
 Score maximum(graph(prepend,0,"route"));assert(maximum.send("list 1 2 3 4 5 6 7 8"));out=maximum.take();assert(out.size()==1);message(out[0].message,"route 1 2 3 4 5 6 7 8");
 Score join(graph(zljoin,0,"7 8",true));assert(join.send("list 1 2 3 4 5 6"));join.take();assert(!join.send("list 7 8 9",1));capacity_error(join);
 assert(!join.send("list 1 2 3 4 5 6 7"));capacity_error(join);
 assert(join.send("bang"));out=join.take();assert(out.size()==1);message(out[0].message,"list 1 2 3 4 5 6 7 8");
}
void iteration_feedback_retains_global_event_bound(){
 auto source=graph(iter);source.nodes[1]=node(2,Send,0,"loop");source.nodes[2]=node(3,Receive,0,"loop");source.node_count=3;
 source.edges[1]={3,0,1,0};source.edge_count=2;CanvasPlan plan{};assert(compile_canvas(source,plan));
 CanvasWorkspace workspace;workspace.begin_callback();assert(workspace.install(0,plan,0,discard));
 assert(!workspace.event(0,1,1,0,literal("list 1 2"),0,discard));assert(workspace.failed());
 assert(workspace.runtime(0).pulses(0)>1&&workspace.runtime(0).pulses(0)<=4096);
}
void max_symbol_selectors_and_empty_input(){
 Score it(graph(iter));assert(it.send("bang")&&it.take().empty());assert(it.send("symbol apple"));auto out=it.take();assert(out.size()==2);
 selected_message(out[0].message,"symbol","");message(out[1].message,"apple");
 assert(it.send("list")&&it.take().empty());assert(it.send("bang")&&it.take().empty());
 Score len(graph(zllen));assert(len.send("symbol apple"));out=len.take();message(out[0].message,"2");
 Score reg(graph(zlreg));assert(reg.send("symbol apple"));out=reg.take();selected_message(out[0].message,"symbol","apple");
 assert(reg.send("list")&&reg.take().empty());assert(reg.send("bang")&&reg.take().empty());
 Score rev(graph(zlrev));assert(rev.send("symbol apple"));out=rev.take();selected_message(out[0].message,"apple","symbol");
 Score suffix(graph(append,0,"9 tail"));assert(suffix.send("symbol apple"));out=suffix.take();selected_message(out[0].message,"symbol","apple 9 tail");
 assert(suffix.send("list apple"));out=suffix.take();selected_message(out[0].message,"list","apple 9 tail");
}
void max_affix_bang_and_empty_set(){
 Score prefix(graph(prepend,0,"head 9"));assert(prefix.send("bang"));auto out=prefix.take();message(out[0].message,"head 9 bang");
 assert(prefix.send("list"));out=prefix.take();message(out[0].message,"head 9");assert(prefix.send("symbol apple"));out=prefix.take();message(out[0].message,"head 9 symbol apple");
 assert(prefix.send("set")&&prefix.take().empty());assert(prefix.send("bang"));out=prefix.take();assert(out.size()==1&&canvas_bang(canvas_message_from_pod(out[0].message)));
 Score suffix(graph(append,0,"9 tail"));assert(suffix.send("bang")&&suffix.take().empty());assert(suffix.send("8"));suffix.take();assert(suffix.send("bang")&&suffix.take().empty());
 assert(suffix.send("set foo 9")&&suffix.take().empty());assert(suffix.send("bang")&&suffix.take().empty());
}
void empty_affixes_preserve_the_input_message_type(){
 for(unsigned kind:{prepend,append}){
  Score score(graph(kind));
  for(const char* text:{"8","8.","list 8","list apple","symbol apple","apple"}){
   assert(score.send(text));const auto out=score.take();assert(out.size()==1);message(out[0].message,text);
  }
 }
}
void max_cold_parameters_and_recomputation(){
 Score chunks(graph(zliter,0));assert(chunks.send("list 1 2 3 4 5")&&chunks.take().empty());assert(chunks.send("list 2 apple",1)&&chunks.take().empty());assert(chunks.send("bang"));auto out=chunks.take();assert(out.size()==3);
 message(out[0].message,"list 1 2");message(out[1].message,"list 3 4");message(out[2].message,"5");
 assert(chunks.send("-1",1)&&chunks.take().empty());assert(chunks.send("bang")&&chunks.take().empty());
 Score slices(graph(zlslice,0,"",true));assert(slices.send("list 1 2 3"));out=slices.take();assert(out.size()==1&&out[0].node==3);message(out[0].message,"list 1 2 3");
 Score rotated(graph(zlrot,1));assert(rotated.send("list 1 2 3 4 5"));rotated.take();assert(rotated.send("list -2 9",1)&&rotated.take().empty());assert(rotated.send("bang"));out=rotated.take();message(out[0].message,"list 3 4 5 1 2");
}
void max_zl_reset_and_clear_have_distinct_parameter_policies(){
 for(unsigned kind:{zlreg,zljoin,zllen,zliter,zlslice,zlrev,zlrot})for(const char* command:{"zlclear","zlreset"}){
  Score score(graph(kind,kind==zliter||kind==zlslice||kind==zlrot?2:0,"",true));assert(score.send("list 1 2 3"));score.take();assert(score.send(command,1)&&score.take().empty());assert(score.send("bang")&&score.take().empty());
  if(kind==zliter){assert(score.send("list 4 5 6"));const auto out=score.take();if(!std::strcmp(command,"zlclear"))assert(out.empty());else {assert(out.size()==2);message(out[0].message,"list 4 5");message(out[1].message,"6");}}
  if(kind==zlslice){assert(score.send("list 4 5 6"));const auto out=score.take();if(!std::strcmp(command,"zlclear")){assert(out.size()==1&&out[0].node==3);message(out[0].message,"list 4 5 6");}else {assert(out.size()==2&&out[0].node==3&&out[1].node==2);message(out[0].message,"6");message(out[1].message,"list 4 5");}}
  if(kind==zlrot){assert(score.send("list 4 5 6"));const auto out=score.take();message(out[0].message,!std::strcmp(command,"zlclear")?"list 4 5 6":"list 5 6 4");}
 }
}
void direct_empty_list_is_distinct_from_message_box_output(){
 auto source=graph(Message,0,"list");source.nodes[1]=node(2,Iter);source.nodes[2]=node(3,Print,0,"trace");source.node_count=3;source.edges[1]={2,0,3,0};source.edge_count=2;
 Score through_message(source);through_message.runtime.begin_callback();assert(through_message.runtime.event(1,2,0,literal("list 7 8"),0,discard));through_message.take();
 assert(through_message.send("bang")&&through_message.take().empty());
 assert(through_message.runtime.event(1,2,0,{},0,discard));auto out=through_message.take();assert(out.size()==2);message(out[0].message,"7");message(out[1].message,"8");
 Score length(graph(zllen));assert(length.send("list"));out=length.take();message(out[0].message,"0");assert(length.send("bang"));out=length.take();message(out[0].message,"0");
 Score join(graph(zljoin,0,"9"));assert(join.send("list"));out=join.take();message(out[0].message,"9");
 Score suffix(graph(append,0,"tail"));assert(suffix.send("list"));out=suffix.take();selected_message(out[0].message,"list","tail");
}
void max_iter_recall_retains_the_measured_message_history(){
 Score fresh(graph(iter));assert(fresh.send("foo 8 9"));fresh.take();assert(fresh.send("bang"));auto out=fresh.take();assert(out.size()==2);message(out[0].message,"8");message(out[1].message,"9");
 assert(fresh.send("foo 8 9"));fresh.take();assert(fresh.send("bang"));out=fresh.take();assert(out.size()==3);message(out[0].message,"foo");message(out[1].message,"8");message(out[2].message,"9");
 Score bare(graph(iter));assert(bare.send("apple"));bare.take();assert(bare.send("bang")&&bare.take().empty());
 assert(bare.send("pear"));bare.take();assert(bare.send("bang"));out=bare.take();assert(out.size()==1);message(out[0].message,"pear");
 Score prior_list(graph(iter));assert(prior_list.send("list 8 9"));prior_list.take();assert(prior_list.send("symbol apple"));prior_list.take();assert(prior_list.send("bang"));out=prior_list.take();assert(out.size()==2);selected_message(out[0].message,"symbol","");message(out[1].message,"apple");
 assert(prior_list.send("list")&&prior_list.take().empty());assert(prior_list.send("symbol apple"));prior_list.take();assert(prior_list.send("bang"));out=prior_list.take();assert(out.size()==1);message(out[0].message,"apple");
 Score growth(graph(iter));assert(growth.send("list 1 2 3"));growth.take();assert(growth.send("foo 1 2 3"));growth.take();assert(growth.send("bang"));out=growth.take();assert(out.size()==3);message(out[0].message,"1");
 assert(growth.send("foo 1 2 3 4 5"));growth.take();assert(growth.send("bang"));out=growth.take();assert(out.size()==6);message(out[0].message,"foo");
 assert(growth.send("foo 1 2 3 4 5 6"));growth.take();assert(growth.send("bang"));out=growth.take();assert(out.size()==6);message(out[0].message,"1");
}
void unsupported_zl_methods_are_rejected_without_changing_retained_data(){
 Score score(graph(zlreg));assert(score.send("list 1 2."));score.take();
 for(unsigned inlet:{0u,1u})for(const char* name:{"mode","fuzzy","zlmaxsize"}){
  char input[64]{};std::snprintf(input,sizeof(input),"%s 3",name);const auto pulses=score.runtime.pulses(0);
  assert(!score.send(input,inlet)&&!score.runtime.failed()&&score.runtime.pulses(0)==pulses);
  const auto error=score.take();assert(error.size()==1&&error[0].node==1&&error[0].level==2);
  char expected[96]{};std::snprintf(expected,sizeof(expected),"error unsupported-list-method %s",name);message(error[0].message,expected);
  assert(score.send("bang"));const auto out=score.take();assert(out.size()==1);message(out[0].message,"list 1 2.");
 }
}
void capacity_refusal_does_not_stall_line_grains_or_completion(){
 auto source=graph(Line);source.nodes[0].p2=1;source.nodes[0].p3=1;
 source.nodes[1]=node(2,append,0,"1 2 3 4 5 6 7 8");source.nodes[2]=node(3,Print,0,"tick");source.nodes[3]=node(4,Print,0,"done");source.node_count=4;
 source.edges[1]={1,0,3,0};source.edges[2]={1,1,4,0};source.edge_count=3;
 Score score(source);assert(score.send("1 1"));for(unsigned i=0;i<100;i++){score.runtime.begin_callback();assert(score.runtime.sample(0,discard));}
 assert(!score.runtime.failed()&&score.runtime.pulses(2)==2&&score.runtime.pulses(3)==1);
 const auto out=score.take();unsigned errors=0;for(const auto& row:out)if(row.level==2){assert(row.node==2&&(row.frame==0||row.frame==48));++errors;}
 assert(errors==2&&out.size()==5&&score.runtime.value(0)==1);
}
void iter_chunk_feedback_restores_the_active_size(){
 auto source=graph(zliter,2);source.nodes[2]=node(3,Message,0,"3");source.nodes[3]=node(4,Send,0,"chunk-size");source.nodes[4]=node(5,Receive,0,"chunk-size");source.node_count=5;
 source.edges[1]={1,0,3,0};source.edges[2]={3,0,4,0};source.edges[3]={5,0,1,1};source.edge_count=4;
 CanvasPlan plan{};assert(compile_canvas(source,plan));CanvasWorkspace workspace;workspace.begin_callback();assert(workspace.install(0,plan,0,discard));
 for(unsigned run=0;run<2;run++){
  workspace.begin_callback();assert(workspace.event(0,1,1,0,run?CanvasMessage{}:literal("list 1 2 3 4 5"),0,discard));
  auto& runtime=workspace.runtime(0);UltraCanvasConsoleRecord row{};
  for(const char* expected:{"list 1 2","list 3 4","5"}){assert(runtime.pop_console(row)&&row.node==2);message(row.message,expected);}
  assert(!runtime.pop_console(row)&&runtime.plan().graph.nodes[0].p0==2);
  assert(runtime.pulses(4)==uint64_t((run+1)*3));
 }
}
}
int main(){topology_and_validation();iterator_preserves_types_and_depth_first_order();prefix_and_suffix_replacement();register_and_join_cold_state();length_reverse_rotate_and_inactive_ports();chunks_and_slices();over_capacity_is_atomic();iteration_feedback_retains_global_event_bound();max_symbol_selectors_and_empty_input();max_affix_bang_and_empty_set();empty_affixes_preserve_the_input_message_type();capacity_refusal_does_not_stall_line_grains_or_completion();max_cold_parameters_and_recomputation();max_zl_reset_and_clear_have_distinct_parameter_policies();direct_empty_list_is_distinct_from_message_box_output();unsupported_zl_methods_are_rejected_without_changing_retained_data();max_iter_recall_retains_the_measured_message_history();iter_chunk_feedback_restores_the_active_size();std::puts("PASS: bounded typed list objects, state, atomic overflow and synchronous global outlet order");}
