#include "../src-tauri/native/patch_graph.hpp"
#include <cassert>
#include <cstdio>
#include <cstring>
using namespace ultra;
static auto discard=[](alive::Event){return true;};
static CanvasMessage literal(const char* text){CanvasMessage m{};assert(canvas_parse_message(text,m));return m;}
static CanvasPlan setup(const char* text,unsigned kind=53){
 UltraCanvasGraph g{};g.revision=1;g.node_count=2;g.edge_count=1;
 g.nodes[0]={1,kind,0,0,0,0,0};std::strcpy(g.nodes[0].text,text);
 g.nodes[1]={2,Print,0,0,0,0,0};std::strcpy(g.nodes[1].text,"out");g.edges[0]={1,0,2,0};
 CanvasPlan p{};assert(compile_canvas(g,p));return p;
}
int main(){
 CanvasMessageTemplate compiled{};
 for(const char* text:{"$1","symbol $1","bang $1","x $3","x a$1","x $0","x\\y","x,y"})assert(!canvas_message_template(text,compiled));
 assert(canvas_message_template("1 $2",compiled)&&compiled.placeholders[1]==2);
 CanvasRuntime r;r.reset(setup(""));UltraCanvasConsoleRecord row{};
 assert(r.event(1,1,0,literal("bang"),0,discard));assert(!r.pop_console(row));
 assert(r.event(1,1,0,literal("8 9"),0,discard));assert(!r.pop_console(row));
 r.reset(setup("saved $1 $2"));
 auto expect=[&](const char* input,const char* selector,double a,double b){assert(r.event(1,1,0,literal(input),0,discard));assert(r.pop_console(row));assert(!std::strcmp(row.message.selector,selector)&&row.message.count==2&&row.message.values[0]==a&&row.message.values[1]==b);assert(!r.pop_console(row));};
 expect("bang","saved",0,0);expect("8 9","saved",8,9);
 assert(r.message_box(0).content.placeholders[0]==1&&r.message_box(0).content.prototype.values[0]==0);
 auto cold=literal("new 0 0");cold.tags[0]=cold.tags[1]=2;std::strcpy(cold.symbols[0],"$1");std::strcpy(cold.symbols[1],"$2");
 assert(r.event(1,1,1,cold,0,discard));assert(!r.pop_console(row));expect("9","new",9,9);
 assert(r.event(1,1,0,literal("other 2"),0,discard));assert(r.pop_console(row)&&row.message.tags[0]==2&&!std::strcmp(row.message.symbols[0],"other"));
 assert(r.event(1,1,1,cold,0,discard));expect("9","new",9,2);
 assert(r.event(1,1,1,literal("symbol kiwi"),0,discard));assert(r.event(1,1,0,literal("bang"),0,discard));assert(r.pop_console(row)&&!std::strcmp(row.message.selector,"symbol")&&!std::strcmp(row.message.symbols[0],"kiwi"));
 assert(r.event(1,1,1,literal("bang"),0,discard));assert(r.event(1,1,0,literal("bang"),0,discard));assert(r.pop_console(row)&&row.message.count==0&&!row.message.selector[0]);
 assert(r.event(1,1,0,literal("set"),0,discard));assert(r.event(1,1,0,literal("bang"),0,discard));assert(!r.pop_console(row));
 assert(r.message_box(0).content.empty);
 auto set=literal("set fresh 0");set.tags[1]=2;std::strcpy(set.symbols[1],"$1");
 assert(r.event(1,1,0,set,0,discard));assert(!r.pop_console(row));
 assert(r.event(1,1,0,literal("7"),0,discard));assert(r.pop_console(row)&&!std::strcmp(row.message.selector,"fresh")&&row.message.values[0]==7);
 assert(r.message_box(0).content.placeholders[0]==1&&r.message_box(0).content.prototype.values[0]==0);
 assert(r.event(1,1,1,literal("5 pear 2.25"),0,discard));assert(r.event(1,1,0,literal("bang"),0,discard));assert(r.pop_console(row)&&row.message.count==3&&row.message.tags[1]==2&&row.message.tags[2]==1);
 const auto generation=r.message_box(0).generation;auto invalid=cold;std::strcpy(invalid.symbols[0],"$3");
 assert(!r.event(1,1,1,invalid,0,discard));assert(r.message_box(0).generation==generation);
 assert(canvas_message_template("fresh $1",compiled));assert(r.message_text(1,1,1,compiled));assert(r.text_edit_serial()==1);
 assert(!r.message_text(1,1,1,compiled)&&!r.message_text(2,1,2,compiled)&&!r.message_text(1,2,2,compiled));
 r.reset(setup("",Message));assert(r.event(1,1,0,literal("bang"),0,discard));assert(r.pop_console(row)&&row.message.count==0);
 std::puts("message UI oracle contracts passed");
}
