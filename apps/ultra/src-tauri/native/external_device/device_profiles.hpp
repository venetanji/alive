#pragma once
#include "profiles/analog.hpp"
#include <cstring>
#include <initializer_list>

namespace ultra {
// Only the coordinator adds a profile here after its native and UI qualification.
// Per-device mapping workers author facts in separate profiles/ files.
inline const LiveDeviceProfile* live_device_profile(const char* id,uint32_t version)noexcept{
 if(!id)return nullptr;
 for(const auto* profile:{&AnalogLiveDeviceProfile})
  if(profile->version==version&&!std::strcmp(profile->id,id)&&profile->parameter_count&&profile->parameter_count<=LiveDeviceMaximumParameters)return profile;
 return nullptr;
}
}
