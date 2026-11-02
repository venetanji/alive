#pragma once
#include "../src-tauri/native/external_device/device_profiles.hpp"
#include <array>
#include <cassert>

// Synthetic adapter only: no DLL loading, filesystem access or native execution.
struct UltraExternalDevice { std::array<float,203> values{}; };
inline unsigned note_test_opens=0,note_test_closes=0,note_test_writes=0,note_test_renders=0;
extern "C" {
UltraExternalDevice* ultra_external_device_open(const char*,const char*,char*,size_t){++note_test_opens;return new UltraExternalDevice;}
void ultra_external_device_close(UltraExternalDevice* device){if(device)++note_test_closes;delete device;}
uint32_t ultra_external_device_parameter_count(const UltraExternalDevice*){return 203;}
int ultra_external_device_parameter(const UltraExternalDevice*,uint32_t index,UltraExternalParameter* out){
 if(index>=203||!out)return 0;
 *out=ultra::AnalogLiveDeviceDescriptors[index];return 1;
}
int ultra_external_device_set_parameter(UltraExternalDevice* device,uint32_t index,float value){
 if(index>=203)return 0;
 ++note_test_writes;device->values[index]=value;return 1;
}
int ultra_external_device_render(UltraExternalDevice*,uint32_t frames,float* left,float* right,const UltraExternalMidi*,uint32_t){
 ++note_test_renders;
 for(unsigned i=0;i<frames;++i)left[i]=right[i]=0;
 return 1;
}
const char* ultra_external_device_error(const UltraExternalDevice*){return "synthetic adapter";}
}
