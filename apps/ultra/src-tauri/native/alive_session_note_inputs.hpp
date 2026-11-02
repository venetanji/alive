#pragma once
#include "alive_session_note_inputs.h"
#include "external_device/live_device_source.hpp"
#include <cstring>

namespace ultra::note_inputs {
template<class T> inline bool zero(const T& value)noexcept{
 const auto* bytes=reinterpret_cast<const unsigned char*>(&value);
 for(size_t i=0;i<sizeof value;++i)if(bytes[i])return false;
 return true;
}
inline bool profile_text(const char (&text)[64])noexcept{
 unsigned end=0;while(end<64&&text[end]){
  if(text[end]<32||text[end]>126)return false;
  ++end;
 }
 if(!end||end==64)return false;
 for(unsigned i=end+1;i<64;++i)if(text[i])return false;
 return true;
}
inline int metadata(const AliveSessionConfigV4& c,const AliveSessionNoteInputsV1& notes)noexcept{
 if(c.version!=4||c.struct_bytes!=sizeof c||notes.version!=1||notes.struct_bytes!=sizeof notes||notes.reserved)return ALIVE_SESSION_V4_BAD_HEADER;
 if((c.profile!=1&&c.profile!=2)||c.work_policy!=c.profile)return ALIVE_SESSION_V4_BAD_PROFILE;
 if(c.device_count>16||notes.count!=c.device_count)return ALIVE_SESSION_V4_BAD_FIELD;
 if(!c.preparation_revision||notes.preparation_revision!=c.preparation_revision)return ALIVE_SESSION_V4_STALE_PREPARATION;
 unsigned seen=0,documents=0;
 for(unsigned i=0;i<notes.count;++i){
  const auto& r=notes.inputs[i];
  if(r.device>=c.device_count||(seen&(1u<<r.device)))return ALIVE_SESSION_V4_BAD_OWNERSHIP;
  seen|=1u<<r.device;const auto& device=c.devices[r.device];
  if(device.document>=16||r.document!=device.document)return ALIVE_SESSION_V4_BAD_OWNERSHIP;
  if(documents&(1u<<device.document))return ALIVE_SESSION_V4_BAD_OWNERSHIP;
  documents|=1u<<device.document;
  if(!device.revision||r.revision!=device.revision||r.note_node!=device.note_node)return ALIVE_SESSION_V4_GRAPH_REJECTED;
  if(r.kind==ALIVE_NOTE_NATIVE){
   if(device.kind!=ALIVE_SESSION_DEVICE_INSTRUMENT||!r.note_node||r.policy!=ALIVE_NOTE_POLICY_NATIVE)return ALIVE_SESSION_V4_BAD_FIELD;
   if(!profile_text(r.profile))return ALIVE_SESSION_V4_BAD_PROFILE;
   const auto* profile=live_device_profile(r.profile,r.profile_version);
   if(!profile||!live_device_digest_matches(*profile,r.dll_sha256))return ALIVE_SESSION_V4_BAD_PROFILE;
  }else{
   if(r.profile_version||r.policy||!zero(r.profile)||!zero(r.dll_sha256))return ALIVE_SESSION_V4_BAD_FIELD;
   if(r.kind==ALIVE_NOTE_POLY){
    if(device.kind!=ALIVE_SESSION_DEVICE_INSTRUMENT||!r.note_node)return ALIVE_SESSION_V4_BAD_FIELD;
   }else if(r.kind!=ALIVE_NOTE_NONE||device.kind!=ALIVE_SESSION_DEVICE_AUDIO_EFFECT||r.note_node)return ALIVE_SESSION_V4_BAD_FIELD;
  }
 }
 for(unsigned i=notes.count;i<16;++i)if(!zero(notes.inputs[i]))return ALIVE_SESSION_V4_BAD_FIELD;
 return ALIVE_SESSION_V4_OK;
}
inline const AliveSessionNoteInputV1& row(const AliveSessionNoteInputsV1& notes,unsigned device)noexcept{
 for(unsigned i=0;i<notes.count;++i)if(notes.inputs[i].device==device)return notes.inputs[i];
 return notes.inputs[0]; // Only called after exact-cover metadata validation.
}
inline bool has_native(const AliveSessionNoteInputsV1& notes)noexcept{
 for(unsigned i=0;i<notes.count;++i)if(notes.inputs[i].kind==ALIVE_NOTE_NATIVE)return true;
 return false;
}
// The closed policy describes only one external instrument wired to stereo.
// It is independent of adapter compilation and grants no measured admission.
inline bool native_graph(const UltraCanvasGraph& g,unsigned node)noexcept{
 if(!g.revision||g.node_count!=2||g.edge_count!=2)return false;
 const UltraCanvasNode* instrument=nullptr;const UltraCanvasNode* output=nullptr;
 for(unsigned i=0;i<2;++i){const auto& n=g.nodes[i];
  if(!n.id||n.id>100000||n.device||n.count||n.p0||n.p1||n.p2||n.p3||n.p4||n.p5)return false;
  if(n.kind==68&&n.id==node&&zero(n.text))instrument=&n;
  else if(n.kind==49&&n.text[0]=='1'&&n.text[1]==' '&&n.text[2]=='2'&&n.text[3]==0){
   for(unsigned p=4;p<128;++p)if(n.text[p])return false;
   output=&n;
  }else return false;
 }
 if(!instrument||!output||instrument->id==output->id)return false;
 unsigned seen=0;
 for(unsigned i=0;i<g.edge_count;++i){const auto& e=g.edges[i];
  if(e.from!=node||e.to!=output->id||e.outlet>1||e.inlet!=e.outlet||(seen&(1u<<e.outlet)))return false;
  seen|=1u<<e.outlet;
 }
 return seen==3;
}
inline int prepared(const AliveSessionConfigV4& c,const AliveSessionNoteInputsV1& notes,
 const UltraPreparedDocumentV1* documents,unsigned count,UltraCanvasGraph* graphs)noexcept{
 if(count!=c.device_count||(count&&(!documents||!graphs)))return ALIVE_SESSION_V4_GRAPH_REJECTED;
 unsigned seen=0;
 for(unsigned i=0;i<count;++i){const auto& document=documents[i];
  if(document.struct_bytes!=sizeof document||document.reserved)return ALIVE_SESSION_V4_BAD_HEADER;
  if(document.document>=16||!document.graph)return ALIVE_SESSION_V4_GRAPH_REJECTED;
  unsigned d=0;while(d<c.device_count&&c.devices[d].document!=document.document)++d;
  if(d==c.device_count||(seen&(1u<<d)))return ALIVE_SESSION_V4_BAD_OWNERSHIP;
  seen|=1u<<d;const auto& g=*document.graph;const auto& input=row(notes,d);
  if(g.revision!=input.revision||g.node_count>32||g.edge_count>64)return ALIVE_SESSION_V4_GRAPH_REJECTED;
  const char* detail=nullptr;
  if(!validate_live_device_sources(g,document.sources,document.source_count,detail))return ALIVE_SESSION_V4_BAD_SOURCE;
  if(input.kind==ALIVE_NOTE_NATIVE){
   if(document.source_count!=1||!native_graph(g,input.note_node))return ALIVE_SESSION_V4_GRAPH_REJECTED;
   const auto& source=document.sources[0];
   if(source.node!=input.note_node||source.profile_version!=input.profile_version||std::strcmp(source.profile,input.profile))return ALIVE_SESSION_V4_BAD_SOURCE;
  }else if(document.source_count)return ALIVE_SESSION_V4_BAD_SOURCE;
  graphs[d]=g;
 }
 return ALIVE_SESSION_V4_OK;
}
}
