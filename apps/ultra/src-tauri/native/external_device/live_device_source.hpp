#pragma once
#include "live_device.h"
#include "device_profiles.hpp"
#include <cmath>

namespace ultra {
// Pure source proof shared by preparation and prospective note validation.
// A path is an opaque local locator here; only construction verifies its image.
inline bool validate_live_device_sources(const UltraCanvasGraph& graph,
 const UltraLiveDeviceSource* sources,unsigned count,const char*& error)noexcept{
 auto fail=[&](const char* message){error=message;return false;};
 if(graph.node_count>32||graph.edge_count>64||count>32||(count&&!sources))return fail("Invalid Live device source count.");
 unsigned expected=0;
 for(unsigned i=0;i<graph.node_count;++i){
  if(graph.nodes[i].kind==69)return fail("Owned Live devices do not admit experimental parameter proxies.");
  expected+=graph.nodes[i].kind==68;
 }
 if(expected!=count)return fail("Every live.device~ node requires exactly one source state.");
 for(unsigned i=0;i<count;++i){
  const auto& s=sources[i];
  const auto* profile=live_device_profile(s.profile,s.profile_version);
  if(!profile||!profile->descriptors||s.reserved)return fail("Unsupported Live device profile.");
  if(s.parameter_count!=profile->parameter_count||!s.values||!s.dll_path||!s.dll_path[0])return fail("Live device requires complete source state and a local DLL.");
  bool found=false;
  for(unsigned n=0;n<graph.node_count;++n)found|=graph.nodes[n].id==s.node&&graph.nodes[n].kind==68;
  if(!found)return fail("Live device source references a missing instrument node.");
  for(unsigned prior=0;prior<i;++prior)if(sources[prior].node==s.node)return fail("Duplicate Live device source node.");
  for(unsigned p=0;p<profile->parameter_count;++p){
   const auto& d=profile->descriptors[p];const auto value=s.values[p];
   if(!d.initialized||!std::isfinite(value)||value<d.minimum||value>d.maximum||(d.type==3&&std::trunc(value)!=value))return fail("Live device source state is outside the qualified parameter range.");
  }
 }
 error=nullptr;return true;
}
inline bool live_device_digest_matches(const LiveDeviceProfile& profile,const uint8_t* digest)noexcept{
 if(!digest)return false;
 const auto hex=[](char c)->int{return c>='0'&&c<='9'?c-'0':c>='a'&&c<='f'?c-'a'+10:-1;};
 for(unsigned i=0;i<32;++i){const auto a=hex(profile.dll_sha256[2*i]),b=hex(profile.dll_sha256[2*i+1]);
  if(a<0||b<0||digest[i]!=unsigned(16*a+b))return false;
 }
 return profile.dll_sha256[64]==0;
}
}
