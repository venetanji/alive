#pragma once
#include "../src-tauri/native/alive_session.hpp"

// These older scenarios intentionally use a start-to-source-end clip region.
// Build that explicit current region in the fixture, never in the engine.
inline AliveSessionConfigV4 suffix_region_fixture(AliveSessionConfigV4 c) {
  auto region=[&](auto& r){if(r.source<c.source_count&&r.source<32){
    r.end_marker=c.sources[r.source].length_frames;
    r.loop_start=r.start_marker;r.loop_end=r.end_marker;
  }};
  for(unsigned s=0;s<std::min(c.slot_count,32u);++s)region(c.slots[s]);
  for(unsigned p=0;p<std::min(c.placement_count,64u);++p)region(c.placements[p]);
  return c;
}
inline int configure_suffix_fixture(const AliveSessionConfigV4* c,const AliveSessionAudioBufferV4* audio,unsigned count) {
  if(!c)return 0;
  const auto region=suffix_region_fixture(*c);return alive_session_configure_v4(&region,audio,count);
}
inline int validate_suffix_fixture(const AliveSessionConfigV4* c) {
  if(!c)return 0;
  const auto region=suffix_region_fixture(*c);return alive_session_validate_v4(&region);
}
inline int validate_prepared_suffix_fixture(const AliveSessionConfigV4* c,const UltraCanvasGraph* graphs,unsigned graph_count,const AliveSessionAudioBufferV4* audio,unsigned count) {
  if(!c)return 0;
  const auto region=suffix_region_fixture(*c);return alive_session_validate_prepared_v4(&region,graphs,graph_count,audio,count);
}
