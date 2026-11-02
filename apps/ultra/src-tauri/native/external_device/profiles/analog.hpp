#pragma once
#include "../device_profile.hpp"
#include "analog_descriptors.hpp"

namespace ultra {
// Qualified facts for the installed Analog image. The lower-level loader still
// independently checks this image's ABI/layout before exposing its descriptors.
inline constexpr LiveDeviceProfile AnalogLiveDeviceProfile{
 "live12-analog-v1","Analog",1,
 "4528afb1fbc78d49ed92161ed13ae1df50606e2e2b2c4f28caeca0cbc1476133",
 unsigned(AnalogLiveDeviceDescriptors.size()),0xe0060,0xe0068,28,
 AnalogLiveDeviceDescriptors.data()
};
}
