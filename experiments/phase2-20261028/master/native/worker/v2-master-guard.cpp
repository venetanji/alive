#include "backend.h"
#include "alive-master-v1.h"
#include "canvas_callback_guard.hpp"
#include <cassert>
#include <cstdio>
#include <cstring>
int main() {
 UltraCanvasGraph graph{};graph.revision=800001;graph.node_count=3;graph.edge_count=2;
 graph.nodes[0].id=1;graph.nodes[0].kind=60;graph.nodes[0].p0=4;
 graph.nodes[1].id=2;graph.nodes[1].kind=38;std::strcpy(graph.nodes[1].text,"0.25");
 graph.nodes[2].id=3;graph.nodes[2].kind=49;std::strcpy(graph.nodes[2].text,"1 2");
 graph.edges[0]={2,0,3,0};graph.edges[1]={2,0,3,1};
 assert(ultra_canvas_install_document(0,&graph));
 AliveSessionConfig config{};config.version=1;config.track_count=1;config.length_frames=1024;
 auto& track=config.tracks[0];track.document=0;track.note_node=1;track.revision=graph.revision;track.output_channels=2;track.output_layout=2;track.gain=1;
 assert(alive_session_configure(&config));assert(alive_session_master_set(1,0.5,1)==ALIVE_MASTER_OK);
 assert(ultra_external_start());assert(alive_session_start());
 float left[64]{},right[64]{};assert(ultra_external_render(1,left,right));
 for(unsigned i=0;i<63;++i)assert(alive_session_master_set(1,i%2?0.5:4.,2+i)==ALIVE_MASTER_OK);
 assert(alive_session_master_reset_clip(1,65)==ALIVE_MASTER_OK);
 callback_guard::begin();const int ok=ultra_external_render(64,left,right);callback_guard::end();assert(ok);
 AliveSessionStateV2 score{};score.version=2;score.struct_bytes=sizeof score;AliveMasterStateV1 master{};master.version=1;master.struct_bytes=sizeof master;
 assert(alive_session_master_snapshot_v2(&score,&master)==ALIVE_MASTER_OK && master.applied_serial==65);
 ultra_audio_stop();assert(alive_session_reset());assert(ultra_canvas_close_document(0));
 std::puts("PASS: v2 live 64 Master operations and render use no allocation/free/mutex");
}
