#include "../src-tauri/native/canvas_workspace.hpp"
#include <cassert>
#include <cstdio>
#include <cstring>
#include <memory>
#include <vector>

static ultra::CanvasPlan compiled(UltraCanvasGraph graph) {
 ultra::CanvasPlan result{};assert(ultra::compile_canvas(graph,result));return result;
}
static UltraCanvasGraph pair(uint64_t revision,const char* name,bool sender) {
 UltraCanvasGraph g{};g.revision=revision;g.node_count=2;g.edge_count=1;
 g.nodes[0]={1,sender?2u:27u,0,0,0,0,0};
 g.nodes[1]={2,sender?26u:25u,0,0,0,0,0};
 if(sender)std::strcpy(g.nodes[1].text,name);
 else {std::strcpy(g.nodes[0].text,name);std::strcpy(g.nodes[1].text,"received");}
 g.edges[0]={1,0,2,0};return g;
}

int main() {
 UltraCanvasGraph graph{};graph.revision=1;graph.node_count=1;
 graph.nodes[0]={1,26,0,0,0,0,0};std::strcpy(graph.nodes[0].text,"channel");
 ultra::CanvasPlan plan{};
 assert(ultra::compile_canvas(graph,plan));
 assert(ultra::canvas_inlets(graph.nodes[0])==1&&ultra::canvas_outlets(graph.nodes[0])==0);
 graph.nodes[0].kind=27;
 assert(ultra::compile_canvas(graph,plan));
 assert(ultra::canvas_inlets(graph.nodes[0])==0&&ultra::canvas_outlets(graph.nodes[0])==1);
 graph.nodes[0].text[0]=0;
 assert(ultra::compile_canvas(graph,plan));
 assert(ultra::canvas_inlets(graph.nodes[0])==1&&ultra::canvas_outlets(graph.nodes[0])==1);
 auto workspace=std::make_unique<ultra::CanvasWorkspace>();
 std::vector<alive::Event> events;auto emit=[&](alive::Event e){events.push_back(e);return true;};
 assert(workspace->install(0,compiled(pair(1,"channel",true)),0,emit));
 assert(workspace->install(1,compiled(pair(1,"channel",false)),0,emit));
 workspace->begin_callback();
 ultra::CanvasMessage message{};assert(ultra::canvas_parse_message("list 7 2.5 note",message));
 assert(workspace->event(0,1,2,0,message,0,emit));
 UltraCanvasConsoleRecord row{};
 assert(workspace->runtime(1).pop_console(row));
 assert(row.message.count==3&&row.message.tags[0]==0&&row.message.tags[1]==1&&row.message.tags[2]==2);
 assert(row.message.values[0]==7&&row.message.values[1]==2.5&&!std::strcmp(row.message.symbols[2],"note"));
 assert(workspace->runtime(1).pulses(0)==1);
 assert(!workspace->runtime(0).pop_console(row));
 // Replacing/closing another document cannot reset this document's scalar state.
 assert(ultra::canvas_parse_message("7",message));
 assert(workspace->event(0,1,1,0,message,0,emit));
 assert(workspace->runtime(1).pop_console(row));
 assert(workspace->runtime(0).value(0)==7);
 assert(workspace->install(1,compiled(pair(2,"other",false)),0,emit));
 assert(workspace->runtime(0).value(0)==7&&workspace->runtime(0).pulses(0)==1);
 workspace->close(1,0,emit);
 assert(workspace->runtime(0).value(0)==7&&workspace->runtime(0).pulses(0)==1);
 assert(!workspace->live(1));
 // Empty creation name exposes only a silent set control; named deliveries bypass it.
 auto receiver=pair(3,"",false);assert(workspace->install(1,compiled(receiver),0,emit));
 assert(ultra::canvas_parse_message("set channel",message));
 assert(workspace->event(1,3,1,0,message,0,emit));
 assert(!workspace->runtime(1).pop_console(row));
 assert(ultra::canvas_parse_message("set another",message));
 assert(workspace->event(0,1,2,0,message,0,emit));
 assert(workspace->runtime(1).pop_console(row));
 assert(!std::strcmp(row.message.selector,"set")&&!std::strcmp(row.message.symbols[0],"another"));
 assert(workspace->runtime(1).plan().graph.nodes[0].text[0]==0);
 // A global named cycle exhausts the shared budget rather than recursing in C++.
 UltraCanvasGraph cycle{};cycle.revision=4;cycle.node_count=2;cycle.edge_count=1;
 cycle.nodes[0]={1,27,0,0,0,0,0};cycle.nodes[1]={2,26,0,0,0,0,0};
 std::strcpy(cycle.nodes[0].text,"channel");std::strcpy(cycle.nodes[1].text,"channel");cycle.edges[0]={1,0,2,0};
 assert(workspace->install(1,compiled(cycle),0,emit));workspace->begin_callback();
 assert(ultra::canvas_parse_message("42",message));
 assert(!workspace->event(0,1,1,0,message,0,emit));
 assert(workspace->failed());
 // Fanout can reach every admitted document without the stack being the limit.
 workspace=std::make_unique<ultra::CanvasWorkspace>();
 assert(workspace->install(0,compiled(pair(1,"channel",true)),0,emit));
 UltraCanvasGraph listeners{};listeners.revision=1;listeners.node_count=32;
 for(unsigned i=0;i<32;++i){listeners.nodes[i]={i+1,27,0,0,0,0,0};std::strcpy(listeners.nodes[i].text,"channel");}
 for(unsigned d=1;d<ultra::CanvasWorkspace::MaxDocuments;++d)assert(workspace->install(d,compiled(listeners),0,emit));
 workspace->begin_callback();assert(workspace->event(0,1,2,0,message,0,emit));
 for(unsigned d=1;d<ultra::CanvasWorkspace::MaxDocuments;++d)for(unsigned i=0;i<32;++i)assert(workspace->runtime(d).pulses(i)==1);
 // Device cleanup/configuration is scoped to the requested document's bank pair.
 workspace=std::make_unique<ultra::CanvasWorkspace>();events.clear();
 assert(workspace->install(3,compiled(pair(1,"channel",true)),0,emit));
 for(const auto& e:events)assert(e.device==6||e.device==7);
 std::puts("PASS: independent documents, typed global messages, receive retarget, bounded cycles and device ownership");
}
