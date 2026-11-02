#include "../src-tauri/native/alive_session_note_inputs.hpp"
#include "../src-tauri/native/backend.h"
#include "saved_graphs.hpp"
#include <array>
#include <cassert>
#include <cstdio>
#include <cstring>
#include <limits>
#include <memory>

namespace {
using namespace ultra::note_inputs;
struct Fixture {
 std::unique_ptr<AliveSessionConfigV4> c=std::make_unique<AliveSessionConfigV4>();
 UltraCanvasGraph graph{};AliveSessionNoteInputsV1 notes{};UltraPreparedDocumentV1 document{};
 Fixture(){
  c->version=4;c->struct_bytes=sizeof(*c);c->profile=c->work_policy=1;
  c->track_count=c->device_count=1;c->preparation_revision=1;c->length_frames=c->loop_end=4096;c->tempo_bpm=120;
  c->tracks[0].kind=1;c->tracks[0].gain=1;std::fill_n(c->tracks[0].slots,4,ALIVE_SESSION_V4_NONE);
  saved_0(graph,c->devices[0]);graph.revision=c->devices[0].revision=1;
  notes.version=1;notes.struct_bytes=sizeof notes;notes.count=1;notes.preparation_revision=1;
  notes.inputs[0]={0,0,c->devices[0].note_node,ALIVE_NOTE_POLY,0,0,1,{},{}};
  document={sizeof document,0,&graph,nullptr,0,0};
 }
 void preparation(uint64_t revision){c->preparation_revision=notes.preparation_revision=revision;}
 int validate(){return alive_session_validate_prepared_notes_v1(c.get(),&document,1,nullptr,0,&notes);}
};
AliveSessionStateV4 state(){AliveSessionStateV4 s{};s.version=4;s.struct_bytes=sizeof s;assert(alive_session_state_v4(&s));return s;}
template<class Action> void unchanged(unsigned status,Action action){
 const auto before=state();AliveSessionDiagnosticV4 diagnostic{};diagnostic.version=4;diagnostic.struct_bytes=sizeof diagnostic;
 assert(alive_session_diagnostic_v4(&diagnostic));
 assert(action()==int(status));const auto after=state();assert(!std::memcmp(&before,&after,sizeof before));
 AliveSessionDiagnosticV4 next{};next.version=4;next.struct_bytes=sizeof next;assert(alive_session_diagnostic_v4(&next));
 assert(!std::memcmp(&diagnostic,&next,sizeof next));
}
void native(Fixture& f,std::array<float,203>& values,UltraLiveDeviceSource& source){
 f.preparation(3);f.graph={};f.graph.revision=2;f.graph.node_count=f.graph.edge_count=2;
 f.graph.nodes[0].id=1;f.graph.nodes[0].kind=68;f.graph.nodes[1].id=2;f.graph.nodes[1].kind=49;
 std::strcpy(f.graph.nodes[1].text,"1 2");f.graph.edges[0]={1,0,2,0};f.graph.edges[1]={1,1,2,1};
 f.c->devices[0]={};auto& device=f.c->devices[0];device.kind=1;device.note_node=1;device.output_channels=device.output_layout=2;device.revision=2;
 auto& row=f.notes.inputs[0];row={0,0,1,ALIVE_NOTE_NATIVE,1,ALIVE_NOTE_POLICY_NATIVE,2,{},{}};
 std::strcpy(row.profile,"live12-analog-v1");
 const auto* profile=ultra::live_device_profile(row.profile,1);assert(profile);
 for(unsigned i=0;i<32;++i){unsigned byte=0;assert(std::sscanf(profile->dll_sha256+2*i,"%2x",&byte)==1);row.dll_sha256[i]=uint8_t(byte);}
 source={1,1,203,0,row.profile,"/does-not-exist/never-open.dll",values.data()};
 f.document.source_count=1;f.document.sources=&source;
}
}
int main(){
 Fixture f;ultra_audio_stop();assert(alive_session_reset());
 const int initial=f.validate();if(initial)std::fprintf(stderr,"initial companion status=%d\n",initial);assert(initial==ALIVE_SESSION_V4_OK);
 assert(ultra_canvas_install_document(0,&f.graph));
 assert(alive_session_configure_v4(f.c.get(),nullptr,0));
 f.preparation(2);assert(f.validate()==ALIVE_SESSION_V4_OK);
 unchanged(ALIVE_SESSION_V4_BAD_HEADER,[&]{auto n=f.notes;n.struct_bytes--;return alive_session_validate_prepared_notes_v1(f.c.get(),&f.document,1,nullptr,0,&n);});
 unchanged(ALIVE_SESSION_V4_BAD_HEADER,[&]{auto n=f.notes;n.reserved=1;return alive_session_validate_prepared_notes_v1(f.c.get(),&f.document,1,nullptr,0,&n);});
 unchanged(ALIVE_SESSION_V4_STALE_PREPARATION,[&]{auto n=f.notes;n.preparation_revision=1;return alive_session_validate_prepared_notes_v1(f.c.get(),&f.document,1,nullptr,0,&n);});
 unchanged(ALIVE_SESSION_V4_STALE_PREPARATION,[&]{f.preparation(1);const int status=f.validate();f.preparation(2);return status;});
 for(unsigned field=0;field<6;++field){
  unchanged(ALIVE_SESSION_V4_BAD_FIELD,[&]{auto n=f.notes;auto& r=n.inputs[0];
   switch(field){case 0:r.profile[0]='x';break;case 1:r.dll_sha256[31]=1;break;case 2:r.policy=1;break;case 3:r.profile_version=1;break;case 4:r.kind=99;break;default:n.inputs[15].revision=1;}
   return alive_session_validate_prepared_notes_v1(f.c.get(),&f.document,1,nullptr,0,&n);
  });
 }
 unchanged(ALIVE_SESSION_V4_GRAPH_REJECTED,[&]{auto n=f.notes;n.inputs[0].revision=2;return alive_session_validate_prepared_notes_v1(f.c.get(),&f.document,1,nullptr,0,&n);});
 unchanged(ALIVE_SESSION_V4_BAD_OWNERSHIP,[&]{auto n=f.notes;n.inputs[0].document=1;return alive_session_validate_prepared_notes_v1(f.c.get(),&f.document,1,nullptr,0,&n);});
 unchanged(ALIVE_SESSION_V4_GRAPH_REJECTED,[&]{return alive_session_validate_prepared_notes_v1(f.c.get(),nullptr,1,nullptr,0,&f.notes);});
 unchanged(ALIVE_SESSION_V4_BAD_HEADER,[&]{auto doc=f.document;doc.reserved=1;return alive_session_validate_prepared_notes_v1(f.c.get(),&doc,1,nullptr,0,&f.notes);});
 unchanged(ALIVE_SESSION_V4_GRAPH_REJECTED,[&]{auto doc=f.document;auto graph=f.graph;graph.revision=2;doc.graph=&graph;return alive_session_validate_prepared_notes_v1(f.c.get(),&doc,1,nullptr,0,&f.notes);});
 unchanged(ALIVE_SESSION_V4_GRAPH_REJECTED,[&]{auto doc=f.document;auto graph=f.graph;graph.nodes[0].kind=10000;doc.graph=&graph;return alive_session_validate_prepared_notes_v1(f.c.get(),&doc,1,nullptr,0,&f.notes);});
 assert(alive_session_configure_notes_v1(f.c.get(),nullptr,0,&f.notes)==ALIVE_SESSION_V4_OK);
 assert(state().preparation_revision==2);
 unchanged(ALIVE_SESSION_V4_STALE_PREPARATION,[&]{return alive_session_configure_notes_v1(f.c.get(),nullptr,0,&f.notes);});
 std::array<float,203> values{};UltraLiveDeviceSource source{};native(f,values,source);
 unchanged(ALIVE_SESSION_V4_FEATURE_DISABLED,[&]{return f.validate();});
 // Native metadata must never turn the old measured graph validator on.
 assert(!alive_session_validate_device_v2(&f.c->devices[0],&f.graph));
 for(unsigned variant=0;variant<7;++variant){
  unchanged(ALIVE_SESSION_V4_BAD_PROFILE,[&]{auto n=f.notes;auto& r=n.inputs[0];
   switch(variant){case 0:r.profile[63]='x';break;case 1:std::memset(r.profile,'x',64);break;case 2:r.profile[0]='\x1f';break;
    case 3:r.profile[0]='\0';break;case 4:r.profile_version=2;break;case 5:r.dll_sha256[31]^=1;break;default:std::strcpy(r.profile,"unregistered");}
   return alive_session_validate_prepared_notes_v1(f.c.get(),&f.document,1,nullptr,0,&n);
  });
 }
 unchanged(ALIVE_SESSION_V4_BAD_FIELD,[&]{auto n=f.notes;n.inputs[0].policy=99;return alive_session_validate_prepared_notes_v1(f.c.get(),&f.document,1,nullptr,0,&n);});
 for(unsigned variant=0;variant<7;++variant){
  unchanged(ALIVE_SESSION_V4_BAD_SOURCE,[&]{auto doc=f.document;auto s=source;doc.sources=&s;
   switch(variant){case 0:doc.source_count=0;break;case 1:doc.sources=nullptr;break;case 2:s.reserved=1;break;
    case 3:s.parameter_count=202;break;case 4:s.profile_version=2;break;case 5:s.node=2;break;default:s.values=nullptr;}
   return alive_session_validate_prepared_notes_v1(f.c.get(),&doc,1,nullptr,0,&f.notes);
  });
 }
 values[0]=std::numeric_limits<float>::quiet_NaN();unchanged(ALIVE_SESSION_V4_BAD_SOURCE,[&]{return f.validate();});
 values[0]=1.5f;unchanged(ALIVE_SESSION_V4_BAD_SOURCE,[&]{return f.validate();});values[0]=0;
 unchanged(ALIVE_SESSION_V4_BAD_SOURCE,[&]{std::array<UltraLiveDeviceSource,2> duplicate{source,source};auto doc=f.document;doc.sources=duplicate.data();doc.source_count=2;return alive_session_validate_prepared_notes_v1(f.c.get(),&doc,1,nullptr,0,&f.notes);});
 unchanged(ALIVE_SESSION_V4_GRAPH_REJECTED,[&]{auto graph=f.graph;graph.edges[1].inlet=0;auto doc=f.document;doc.graph=&graph;return alive_session_validate_prepared_notes_v1(f.c.get(),&doc,1,nullptr,0,&f.notes);});
#ifdef ULTRA_EXTERNAL_DEVICE_EXPERIMENTAL
 unchanged(ALIVE_SESSION_V4_GRAPH_REJECTED,[&]{return alive_session_configure_notes_v1(f.c.get(),nullptr,0,&f.notes);});
#else
 unchanged(ALIVE_SESSION_V4_FEATURE_DISABLED,[&]{return alive_session_configure_notes_v1(f.c.get(),nullptr,0,&f.notes);});
#endif
 // Duplicate/missing device and document rows are rejected even when reordered.
 auto c=std::make_unique<AliveSessionConfigV4>(*f.c);c->device_count=2;c->devices[1]=c->devices[0];c->devices[1].document=1;
 auto n=f.notes;n.count=2;n.inputs[1]=n.inputs[0];
 assert(metadata(*c,n)==ALIVE_SESSION_V4_BAD_OWNERSHIP);
 n.inputs[1].device=n.inputs[1].document=1;assert(metadata(*c,n)==0);
 std::swap(n.inputs[0],n.inputs[1]);assert(metadata(*c,n)==0);
 std::array<UltraCanvasGraph,16> graphs{};std::array<UltraPreparedDocumentV1,2> docs{f.document,f.document};
 assert(prepared(*c,n,docs.data(),2,graphs.data())==ALIVE_SESSION_V4_BAD_OWNERSHIP);
 docs[1].document=1;assert(prepared(*c,n,docs.data(),2,graphs.data())==0);
 assert(prepared(*c,n,docs.data(),1,graphs.data())==ALIVE_SESSION_V4_GRAPH_REJECTED);
 assert(alive_session_reset());assert(ultra_canvas_close_document(0));
 // Reset clears the configured score but retains the monotonic preparation floor.
 assert(alive_session_reset());Fixture stale;stale.preparation(2);
 AliveSessionStateV2 reset_before{};reset_before.version=2;reset_before.struct_bytes=sizeof reset_before;
 assert(alive_session_state_v2(&reset_before));
 AliveSessionDiagnosticV4 reset_diagnostic{};reset_diagnostic.version=4;reset_diagnostic.struct_bytes=sizeof reset_diagnostic;
 assert(alive_session_diagnostic_v4(&reset_diagnostic));
 assert(stale.validate()==ALIVE_SESSION_V4_STALE_PREPARATION);
 assert(alive_session_configure_notes_v1(stale.c.get(),nullptr,0,&stale.notes)==ALIVE_SESSION_V4_STALE_PREPARATION);
 AliveSessionStateV2 reset_after{};reset_after.version=2;reset_after.struct_bytes=sizeof reset_after;
 assert(alive_session_state_v2(&reset_after));assert(!std::memcmp(&reset_before,&reset_after,sizeof reset_before));
 AliveSessionDiagnosticV4 reset_next{};reset_next.version=4;reset_next.struct_bytes=sizeof reset_next;
 assert(alive_session_diagnostic_v4(&reset_next));assert(!std::memcmp(&reset_diagnostic,&reset_next,sizeof reset_next));
 std::puts("PASS: strict note ABI metadata, source proof, stale/malformed/identity refusals, closed native, unchanged installed score/diagnostics including reset");
}
