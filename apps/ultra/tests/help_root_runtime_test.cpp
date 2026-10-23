#ifndef ULTRA_HELP_ROOT_NO_TRACE
#define ULTRA_CANVAS_TEST_TRACE 1
#endif
#include "../src-tauri/native/canvas_workspace.hpp"
#include <array>
#include <cassert>
#include <cstdio>
#include <cstring>
#include <iomanip>
#include <iostream>
#include <memory>
#include <string>

using namespace ultra;
static auto discard=[](alive::Event){return true;};
struct Receipt {
 const CanvasRuntime* runtime=nullptr;
 unsigned slot=0,port=0;
 bool output=false;
 CanvasMessage message{};
};
struct Trace {
 std::array<Receipt,8192> receipts{};
 unsigned count=0;
 bool overflow=false;
 static void observe(void* owner,const CanvasRuntime* runtime,unsigned slot,unsigned port,bool output,const CanvasMessage& message)noexcept {
  auto& trace=*static_cast<Trace*>(owner);
  if(trace.count==trace.receipts.size()){trace.overflow=true;return;}
  trace.receipts[trace.count++]={runtime,slot,port,output,message};
 }
 void clear()noexcept{count=0;overflow=false;}
};
#ifdef ULTRA_CANVAS_TEST_TRACE
static CanvasMessage literal(const char* text){CanvasMessage m{};assert(canvas_parse_message(text,m));return m;}
static CanvasPlan compile(UltraCanvasGraph graph){CanvasPlan plan{};assert(compile_canvas(graph,plan));return plan;}
static UltraCanvasGraph fanout() {
 UltraCanvasGraph graph{};graph.revision=1;graph.node_count=3;graph.edge_count=2;
 graph.nodes[0]={1,Int,0,0,0,0,0};
 graph.nodes[1]={2,NumberInt,0,0,0,-100000,100000};
 graph.nodes[2]={3,Bang,0,0,0,0,0};
 graph.edges[0]={1,0,2,0};graph.edges[1]={1,0,3,0};return graph;
}
static void same_state(const CanvasWorkspace& a,const CanvasWorkspace& b) {
 for(unsigned document=0;document<CanvasWorkspace::MaxDocuments;document++){
  assert(a.live(document)==b.live(document));if(!a.live(document))continue;
  const auto& x=a.runtime(document);const auto& y=b.runtime(document);
  assert(x.failed()==y.failed());assert(x.plan().graph.node_count==y.plan().graph.node_count);
  assert(!std::memcmp(&x.plan().graph,&y.plan().graph,sizeof(UltraCanvasGraph)));
  for(unsigned slot=0;slot<x.plan().graph.node_count;slot++){
   assert(x.value(slot)==y.value(slot)&&x.pulses(slot)==y.pulses(slot));
   const auto xm=canvas_message_to_pod(x.last_message(slot)),ym=canvas_message_to_pod(y.last_message(slot));
   assert(!std::memcmp(&xm,&ym,sizeof xm));
   if(x.plan().graph.nodes[slot].kind==MessageBox){
    const auto& xb=x.message_box(slot);const auto& yb=y.message_box(slot);
    assert(xb.generation==yb.generation&&xb.content.empty==yb.content.empty);
    assert(xb.content.placeholders==yb.content.placeholders);
    const auto xp=canvas_message_to_pod(xb.content.prototype),yp=canvas_message_to_pod(yb.content.prototype);
    assert(!std::memcmp(&xp,&yp,sizeof xp));
   }
  }
 }
}
static void trace_contracts() {
 auto traced=std::make_unique<CanvasWorkspace>(),plain=std::make_unique<CanvasWorkspace>();
 auto trace=std::make_unique<Trace>();traced->set_test_trace(trace.get(),Trace::observe);
 plain->set_test_trace(nullptr,nullptr);
 const auto plan=compile(fanout());
 assert(traced->install(0,plan,0,discard)&&plain->install(0,plan,0,discard));
 for(const char* input:{"7.75","-3","bang"}){
  traced->begin_callback();plain->begin_callback();trace->clear();
  assert(traced->event(0,1,1,0,literal(input),0,discard)==plain->event(0,1,1,0,literal(input),0,discard));
  same_state(*traced,*plain);assert(!trace->overflow&&trace->count==6);
  for(unsigned i=0;i<6;i++){
   const auto& receipt=trace->receipts[i];
   assert(receipt.runtime==&traced->runtime(0));
   assert(receipt.slot==i/2&&receipt.port==0&&receipt.output==bool(i%2));
  }
  assert(trace->receipts[1].message.tags[0]==0);
 }
 // A cold Message display has a receipt without an outlet emission.
 auto graph=fanout();graph.nodes[0].kind=Append;std::strcpy(graph.nodes[0].text,"original 5");
 graph.nodes[1]={2,MessageBox,0,0,0,0,0};graph.node_count=2;graph.edge_count=1;graph.edges[0].inlet=1;
 const auto cold=compile(graph);assert(traced->install(0,cold,0,discard)&&plain->install(0,cold,0,discard));
 traced->begin_callback();plain->begin_callback();trace->clear();
 assert(traced->event(0,1,1,0,literal("7"),0,discard)&&plain->event(0,1,1,0,literal("7"),0,discard));
 same_state(*traced,*plain);assert(trace->count==3&&!trace->receipts[2].output&&trace->receipts[2].port==1);
 assert(!traced->runtime(0).message_box(1).content.empty);
 assert(traced->runtime(0).message_box(1).generation==2);
 // Refused processing retains the scheduled input trace and has no false output.
 traced->begin_callback();trace->clear();
 assert(!traced->event(0,1,2,1,literal("set unsupported"),0,discard));
 assert(trace->count==1&&!trace->receipts[0].output&&!traced->failed());
 // Iter's continuation items schedule real outputs without extra input receipts.
 graph=fanout();graph.nodes[0].kind=Iter;graph.node_count=2;graph.edge_count=1;
 assert(traced->install(0,compile(graph),0,discard));traced->begin_callback();trace->clear();
 assert(traced->event(0,1,1,0,literal("1 2 3"),0,discard));
 assert(trace->count==10);
 for(unsigned i=0;i<3;i++)assert(trace->receipts[1+i*3].output&&trace->receipts[1+i*3].slot==0&&trace->receipts[1+i*3].message.values[0]==i+1);
}
static void bus_contracts() {
 auto workspace=std::make_unique<CanvasWorkspace>();auto trace=std::make_unique<Trace>();
 workspace->set_test_trace(trace.get(),Trace::observe);
 UltraCanvasGraph source{};source.revision=1;source.node_count=1;source.nodes[0]={1,Float,0,0,3.75,0,0};
 assert(workspace->install(0,compile(source),0,discard));
 auto receiver=fanout();receiver.node_count=2;receiver.edge_count=1;receiver.nodes[0]={1,Receive,0,0,0,0,0};std::strcpy(receiver.nodes[0].text,"original-bus");
 for(unsigned document:{1u,2u})assert(workspace->install(document,compile(receiver),0,discard));
 auto send=[&](){workspace->begin_callback();trace->clear();assert(workspace->event(0,1,1,0,literal("send original-bus"),0,discard));};
 send();assert(trace->count==7);
 for(unsigned i=0;i<2;i++){
  const auto& receipt=trace->receipts[1+i*3];
  assert(receipt.runtime==&workspace->runtime(1+i)&&receipt.output&&receipt.message.tags[0]==1&&receipt.message.values[0]==3.75);
  assert(workspace->runtime(1+i).value(1)==3);
 }
 workspace->close(1,0,discard);send();assert(trace->count==4);
 assert(trace->receipts[1].runtime==&workspace->runtime(2));
 workspace->set_test_trace(nullptr,nullptr);send();assert(trace->count==0);
}
#endif
static void json_string(const char* text) {
 static constexpr char digits[]="0123456789abcdef";
 std::cout<<'"';
 for(const unsigned char* p=reinterpret_cast<const unsigned char*>(text);*p;p++){
  if(*p=='"'||*p=='\\')std::cout<<'\\'<<char(*p);
  else if(*p<32)std::cout<<"\\u00"<<digits[*p>>4]<<digits[*p&15];
  else std::cout<<char(*p);
 }
 std::cout<<'"';
}
static void json_number(double value) {
 if(value==0&&std::signbit(value))std::cout<<"-0.0";else std::cout<<value;
}
static void json_message(const CanvasMessage& message) {
 const char* selector=message.selector;
 if(!*selector)selector=!message.count?"bang":message.count==1?(message.tags[0]==0?"int":message.tags[0]==1?"float":"symbol"):"list";
 std::cout<<"{\"selector\":";json_string(selector);std::cout<<",\"raw_selector\":";json_string(message.selector);
 std::cout<<",\"atoms\":[";
 for(unsigned i=0;i<message.count;i++){
  if(i)std::cout<<',';
  std::cout<<"{\"tag\":\""<<(message.tags[i]==0?"int":message.tags[i]==1?"float":"symbol")<<"\",\"value\":";
  if(message.tags[i]==2)json_string(message.symbols[i]);else json_number(message.values[i]);
  std::cout<<'}';
 }
 std::cout<<"]}";
}
static bool hex_text(std::string encoded,char* destination,unsigned capacity) {
 if(encoded=="-"){destination[0]=0;return true;}
 if(encoded.size()%2||encoded.size()/2>=capacity)return false;
 auto digit=[](char c)->int{return c>='0'&&c<='9'?c-'0':c>='a'&&c<='f'?c-'a'+10:c>='A'&&c<='F'?c-'A'+10:-1;};
 for(unsigned i=0;i<encoded.size();i+=2){
  const int a=digit(encoded[i]),b=digit(encoded[i+1]);if(a<0||b<0||(!a&&!b))return false;
  destination[i/2]=char(a*16+b);
 }
 destination[encoded.size()/2]=0;return true;
}
static bool read_message(CanvasMessage& message) {
 std::string encoded;
 if(!(std::cin>>encoded>>message.count)||message.count>8||!hex_text(encoded,message.selector,32))return false;
 for(unsigned i=0;i<message.count;i++){
  if(!(std::cin>>message.tags[i]>>message.values[i]>>encoded)||!hex_text(encoded,message.symbols[i],32)||message.tags[i]>2||!canvas_number(message.values[i]))return false;
 }
 // The production target/inlet admission owns contextual replacement syntax.
 return true;
}
static unsigned document_for(const CanvasWorkspace& workspace,const CanvasRuntime* runtime) {
 for(unsigned i=0;i<CanvasWorkspace::MaxDocuments;i++)if(&workspace.runtime(i)==runtime)return i;
 return CanvasWorkspace::MaxDocuments;
}
static void json_trace(const CanvasWorkspace& workspace,const Trace& trace) {
 std::cout<<'[';
 for(unsigned i=0;i<trace.count;i++){
  if(i)std::cout<<',';
  const auto& row=trace.receipts[i];const auto& node=row.runtime->plan().graph.nodes[row.slot];
  std::cout<<"{\"ordinal\":"<<i<<",\"document\":"<<document_for(workspace,row.runtime)
   <<",\"node\":"<<node.id<<",\"phase\":\""<<(row.output?"output":"input")<<"\",\"port\":"<<row.port<<",\"message\":";
  json_message(row.message);std::cout<<'}';
 }
 std::cout<<']';
}
static void json_snapshots(const CanvasWorkspace& workspace) {
 std::cout<<'[';bool first=true;
 for(unsigned document=0;document<CanvasWorkspace::MaxDocuments;document++){
  if(!workspace.live(document))continue;
  if(!first)std::cout<<',';
  first=false;const auto& runtime=workspace.runtime(document);const auto& graph=runtime.plan().graph;
  std::cout<<"{\"document\":"<<document<<",\"revision\":"<<graph.revision<<",\"text_edit_serial\":"<<runtime.text_edit_serial()<<",\"console_dropped\":"<<runtime.console_dropped()<<",\"nodes\":[";
  for(unsigned slot=0;slot<graph.node_count;slot++){
   if(slot)std::cout<<',';
   std::cout<<"{\"id\":"<<graph.nodes[slot].id<<",\"kind\":"<<graph.nodes[slot].kind<<",\"value\":";json_number(runtime.value(slot));
   std::cout<<",\"pulses\":"<<runtime.pulses(slot)<<",\"last_message\":";json_message(runtime.last_message(slot));
   if(graph.nodes[slot].kind==MessageBox){
    const auto& box=runtime.message_box(slot);
    std::cout<<",\"message_box\":{\"empty\":"<<(box.content.empty?"true":"false")<<",\"generation\":"<<box.generation<<",\"prototype\":";
    json_message(box.content.prototype);std::cout<<",\"arguments\":";json_message(box.arguments);std::cout<<",\"placeholders\":[";
    for(unsigned atom=0;atom<box.content.prototype.count;atom++){if(atom)std::cout<<',';std::cout<<box.content.placeholders[atom];}
    std::cout<<"]}";
   }
   std::cout<<'}';
  }
  std::cout<<"]}";
 }
 std::cout<<']';
}
static void json_console(CanvasWorkspace& workspace) {
 std::cout<<'[';bool first=true;
 for(unsigned document=0;document<CanvasWorkspace::MaxDocuments;document++){
  UltraCanvasConsoleRecord record{};
  while(workspace.runtime(document).pop_console(record)){
   if(!first)std::cout<<',';
   first=false;
   std::cout<<"{\"document\":"<<document<<",\"node\":"<<record.node<<",\"sequence\":"<<record.sequence<<",\"level\":"<<record.level<<",\"message\":";
   json_message(canvas_message_from_pod(record.message));std::cout<<'}';
  }
 }
 std::cout<<']';
}
static int transport() {
 std::string word;unsigned templates=0;
 if(!(std::cin>>word>>templates)||word!="help-root-native-v1"||templates>16)return 2;
 auto graphs=std::make_unique<std::array<UltraCanvasGraph,16>>();
 std::array<bool,16> defined{};
 for(unsigned index=0;index<templates;index++){
  unsigned id=0;UltraCanvasGraph graph{};graph.revision=1;
  if(!(std::cin>>word>>id>>graph.node_count>>graph.edge_count)||word!="graph"||id>=16||defined[id]||graph.node_count>32||graph.edge_count>64)return 3;
  for(unsigned i=0;i<graph.node_count;i++){
   auto& n=graph.nodes[i];std::string text;
   if(!(std::cin>>n.id>>n.kind>>n.device>>n.count>>n.p0>>n.p1>>n.p2>>n.p3>>n.p4>>n.p5>>text)||!hex_text(text,n.text,128))return 4;
  }
  for(unsigned i=0;i<graph.edge_count;i++){
   auto& e=graph.edges[i];if(!(std::cin>>e.from>>e.outlet>>e.to>>e.inlet))return 5;
  }
  CanvasPlan prepared{};if(!compile_canvas(graph,prepared))return 6;
  (*graphs)[id]=graph;defined[id]=true;
 }
 const auto originals=std::make_unique<std::array<UltraCanvasGraph,16>>(*graphs);
 auto workspace=std::make_unique<CanvasWorkspace>();auto trace=std::make_unique<Trace>();
 auto admitted=std::make_unique<std::array<CanvasPlan,16>>();
#ifdef ULTRA_CANVAS_TEST_TRACE
 workspace->set_test_trace(trace.get(),Trace::observe);
#endif
 std::array<uint64_t,16> revisions{};unsigned operations=0;
 if(!(std::cin>>operations)||operations>4096)return 7;
 std::cout<<std::setprecision(17)<<std::boolalpha;
 for(unsigned step=0;step<operations;step++){
  std::string id,action;unsigned document=0;bool accepted=false;
  if(!(std::cin>>id>>action>>document)||id.size()>127||document>=16)return 8;
  workspace->begin_callback();trace->clear();
  if(action=="install"){
   unsigned source=0;uint64_t revision=0;
   if(!(std::cin>>source>>revision)||source>=16||!defined[source])return 9;
   auto graph=(*graphs)[source];graph.revision=revision;CanvasPlan prepared{};
   accepted=revision>revisions[document]&&compile_canvas(graph,prepared)&&workspace->install(document,prepared,0,discard);
   if(accepted){revisions[document]=revision;(*admitted)[document]=prepared;}
  }else if(action=="event"){
   unsigned node=0,inlet=0;CanvasMessage message{};
   if(!(std::cin>>node>>inlet)||!read_message(message))return 10;
   accepted=workspace->event(document,revisions[document],node,inlet,message,0,discard);
  }else if(action=="tab"){
   unsigned node=0;if(!(std::cin>>node))return 11;
   accepted=workspace->tab(document,revisions[document],node,0,discard);
  }else if(action=="param"){
   unsigned node=0,slot=0,hot=0;double value=0;
   if(!(std::cin>>node>>slot>>value>>hot)||hot>1)return 12;
   if(workspace->live(document)){
    auto& runtime=workspace->runtime(document);auto next=(*admitted)[document];
    const auto message=canvas_scalar(value,std::floor(value)==value?0:1);
    accepted=change_canvas_param(next,node,slot,value)&&(!hot||canvas_event_valid(next,revisions[document],node,0,message))&&runtime.param(next,node,slot,value,0,discard);
    if(accepted){
     if(hot)workspace->event(document,revisions[document],node,0,message,0,discard);
     (*admitted)[document]=next;
    }
   }
  }else if(action=="close"){
   workspace->close(document,0,discard);accepted=true;
  }else return 13;
  const bool unchanged=!std::memcmp(graphs.get(),originals.get(),sizeof *graphs);
  std::cout<<"{\"step_id\":";json_string(id.c_str());std::cout<<",\"action\":";json_string(action.c_str());
  std::cout<<",\"document\":"<<document<<",\"accepted\":"<<accepted<<",\"failed\":"<<workspace->failed()
   <<",\"templates_unchanged\":"<<unchanged<<",\"trace_overflow\":"<<trace->overflow<<",\"trace\":";
  json_trace(*workspace,*trace);std::cout<<",\"console\":";json_console(*workspace);std::cout<<",\"snapshots\":";json_snapshots(*workspace);std::cout<<"}\n";
  if(!unchanged||trace->overflow)return 14;
 }
 if(std::cin>>word)return 15;
 return 0;
}
int main(int argc,char** argv) {
 if(argc==2&&!std::strcmp(argv[1],"--self-test")){
#ifdef ULTRA_CANVAS_TEST_TRACE
  trace_contracts();bus_contracts();std::puts("help-root trace contracts passed");return 0;
#else
  return 1;
#endif
 }
 if(argc!=1)return 1;
 return transport();
}
