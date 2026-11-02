#pragma once
#include <cstddef>
#include <cstdint>
#include "external_device.h"

namespace ultra {
inline constexpr unsigned LiveDeviceMaximumParameters=256;
struct LiveDeviceProfile {
 const char* id;
 const char* device;
 uint32_t version;
 const char* dll_sha256;
 unsigned parameter_count;
 size_t descriptor_begin_offset,descriptor_end_offset,descriptor_record_size;
 const UltraExternalParameter* descriptors;
};
}
