#include "external_device.h"
#include <cstdio>
#if defined(ULTRA_EXTERNAL_DEVICE_EXPERIMENTAL) && defined(__linux__) && defined(__x86_64__)
#include "pe_image.hpp"
#include <algorithm>
#include <array>
#include <cmath>
#include <cstring>
#include <fstream>
#include <memory>
#include <stdexcept>
#include <string>
#include <vector>

extern "C" void* ultra_shim_context_create(void);
extern "C" void ultra_shim_context_destroy(void*);
extern "C" int ultra_shim_call(void*,void*,const uintptr_t[8],uintptr_t*);
extern "C" int ultra_shim_parameter(void*,void*,void*,int64_t,float);
extern "C" int ultra_shim_readable(void*,const void*,size_t);
extern "C" const char* ultra_shim_error(void);

struct UltraExternalDevice {
 void* shim=nullptr;
 std::unique_ptr<ultra_external::PeImage> image;
 void* instance=nullptr;
 std::vector<UltraExternalParameter> parameters;
 std::vector<float> commanded;
 std::vector<uint8_t> known;
 std::array<char,256> error{};
 bool poisoned=false;
 bool invoke(unsigned index,std::array<uintptr_t,8> args,uintptr_t* result=nullptr){
  if(poisoned)return false;
  uintptr_t ignored=0;
  if(!ultra_shim_call(shim,image->function(index),args.data(),result?result:&ignored)){
   poisoned=true;std::snprintf(error.data(),error.size(),"%s",ultra_shim_error());return false;
  }
  return true;
 }
 ~UltraExternalDevice(){if(instance&&!poisoned)invoke(2,{reinterpret_cast<uintptr_t>(instance)});image.reset();ultra_shim_context_destroy(shim);}
};
namespace {
constexpr const char* electric="66a42b09161ca7d48861e1980523e2cb44dd4f08fbd04ac9c4231a56d79b2be8";
constexpr const char* analog="4528afb1fbc78d49ed92161ed13ae1df50606e2e2b2c4f28caeca0cbc1476133";
void require(bool condition,const char* message){if(!condition)throw std::runtime_error(message);}
template<class T>T heap_value(void* shim,uintptr_t address){require(ultra_shim_readable(shim,reinterpret_cast<void*>(address),sizeof(T)),"device heap metadata out of tracked allocation bounds");T result;std::memcpy(&result,reinterpret_cast<void*>(address),sizeof(T));return result;}
int fail(UltraExternalDevice* device,const char* message){if(device)std::snprintf(device->error.data(),device->error.size(),"%s",message);return 0;}
}
extern "C" {
UltraExternalDevice* ultra_external_device_open(const char* path,const char* expected,char* error,size_t capacity){
 try{
  require(path&&path[0]&&expected,"device path and hash are required");
  require(std::strcmp(expected,electric)==0||std::strcmp(expected,analog)==0,"device resource hash is not qualified");
  std::ifstream input(path,std::ios::binary|std::ios::ate);require(bool(input),"cannot open local device resource");
  const auto size=input.tellg();require(size>0&&size<=16*1024*1024,"invalid device resource length");
  std::vector<uint8_t> bytes(static_cast<size_t>(size));input.seekg(0);require(bool(input.read(reinterpret_cast<char*>(bytes.data()),size)),"device resource read failed");
  require(ultra_external::sha256(bytes)==expected,"device resource hash mismatch");
  auto device=std::make_unique<UltraExternalDevice>();device->shim=ultra_shim_context_create();require(device->shim,"device adapter allocation failed");device->image=std::make_unique<ultra_external::PeImage>(bytes,device->shim);
  uintptr_t instance=0;require(device->invoke(1,{},&instance),device->error.data());require(instance,"device instance creation failed");device->instance=reinterpret_cast<void*>(instance);
  const auto synth=heap_value<uintptr_t>(device->shim,instance+8);
  require(synth<=UINTPTR_MAX-0xe0068,"device metadata address overflow");
  const auto first=heap_value<uintptr_t>(device->shim,synth+0xe0060),last=heap_value<uintptr_t>(device->shim,synth+0xe0068);
  const unsigned expected_count=std::strcmp(expected,analog)==0?203:33;
  require(last>=first&&last-first==expected_count*28u&&ultra_shim_readable(device->shim,reinterpret_cast<void*>(first),last-first),"qualified parameter table layout changed");
  for(unsigned i=0;i<expected_count;++i){
   const uintptr_t descriptor=first+i*28;
   UltraExternalParameter p{i,heap_value<uint8_t>(device->shim,descriptor+8),heap_value<int32_t>(device->shim,descriptor),heap_value<int32_t>(device->shim,descriptor+4),heap_value<int32_t>(device->shim,descriptor+12),heap_value<float>(device->shim,descriptor+16),heap_value<float>(device->shim,descriptor+20),heap_value<float>(device->shim,descriptor+24)};
   require(p.initialized<=1&&std::isfinite(p.minimum)&&std::isfinite(p.maximum)&&p.minimum<=p.maximum,"invalid qualified parameter descriptor");device->parameters.push_back(p);
  }
  device->commanded.resize(expected_count);device->known.resize(expected_count);
  uintptr_t accepted=0;require(device->invoke(6,{instance,48000},&accepted)&&accepted==1,"device refused 48000 Hz");
  require(device->invoke(4,{instance}),"device reset failed");
  if(error&&capacity)error[0]=0;
  return device.release();
 }catch(const std::exception& failure){if(error&&capacity)std::snprintf(error,capacity,"%s",failure.what());return nullptr;}
 catch(...){if(error&&capacity)std::snprintf(error,capacity,"native device initialization failed");return nullptr;}
}
const char* ultra_external_device_error(const UltraExternalDevice* device){return device?device->error.data():"no native device";}
uint32_t ultra_external_device_parameter_count(const UltraExternalDevice* device){return device?uint32_t(device->parameters.size()):0;}
int ultra_external_device_parameter(const UltraExternalDevice* device,uint32_t index,UltraExternalParameter* parameter){if(!device||!parameter||index>=device->parameters.size())return 0;*parameter=device->parameters[index];return 1;}
int ultra_external_device_set_parameter(UltraExternalDevice* device,uint32_t index,float value){
 if(!device||device->poisoned||index>=device->parameters.size())return 0;
 const auto& parameter=device->parameters[index];
 if(!parameter.initialized||!std::isfinite(value)||value<parameter.minimum||value>parameter.maximum||(parameter.type==3&&std::trunc(value)!=value))return fail(device,"parameter value outside qualified range/type");
 if(!ultra_shim_parameter(device->shim,device->image->function(5),device->instance,index,value)){device->poisoned=true;return fail(device,ultra_shim_error());}
 device->commanded[index]=value;device->known[index]=1;return 1;
}
int ultra_external_device_get_commanded_parameter(const UltraExternalDevice* device,uint32_t index,float* value){if(!device||!value||index>=device->known.size()||!device->known[index])return 0;*value=device->commanded[index];return 1;}
int ultra_external_device_reset(UltraExternalDevice* device){return device&&device->invoke(4,{reinterpret_cast<uintptr_t>(device->instance)});}
int ultra_external_device_render(UltraExternalDevice* device,uint32_t frames,float* left,float* right,const UltraExternalMidi* midi,uint32_t count){
 if(!device||!left||!right)return 0;
 if(!frames||frames>256||count>ULTRA_EXTERNAL_MAX_MIDI||(count&&!midi))return fail(device,"unsupported render size or MIDI count");
 std::array<uint8_t,16*ULTRA_EXTERNAL_MAX_MIDI> packed{};
 for(unsigned i=0;i<count;++i){const auto& event=midi[i];if(event.offset>=frames||(i&&event.offset<midi[i-1].offset)||event.status<0x80||event.status>=0xf0||event.data1>127||event.data2>127||event.reserved)return fail(device,"invalid MIDI event");std::memcpy(packed.data()+i*16,&event.offset,4);packed[i*16+8]=event.status;packed[i*16+9]=event.data1;packed[i*16+10]=event.data2;}
 std::fill(left,left+frames,0.f);std::fill(right,right+frames,0.f);double transport[4]{};int silent=0;
 if(!device->invoke(0,{reinterpret_cast<uintptr_t>(device->instance),frames,reinterpret_cast<uintptr_t>(left),reinterpret_cast<uintptr_t>(right),count,reinterpret_cast<uintptr_t>(packed.data()),reinterpret_cast<uintptr_t>(transport),reinterpret_cast<uintptr_t>(&silent)}))return 0;
 for(unsigned i=0;i<frames;++i)if(!std::isfinite(left[i])||!std::isfinite(right[i])){device->poisoned=true;std::fill(left,left+frames,0.f);std::fill(right,right+frames,0.f);return fail(device,"device rendered nonfinite PCM");}
 return 1;
}
void ultra_external_device_close(UltraExternalDevice* device){delete device;}
}
#else
struct UltraExternalDevice {};
extern "C" {
UltraExternalDevice* ultra_external_device_open(const char*,const char*,char* error,size_t n){if(error&&n)std::snprintf(error,n,"experimental runtime unavailable");return nullptr;}
const char* ultra_external_device_error(const UltraExternalDevice*){return "experimental runtime unavailable";}
uint32_t ultra_external_device_parameter_count(const UltraExternalDevice*){return 0;}
int ultra_external_device_parameter(const UltraExternalDevice*,uint32_t,UltraExternalParameter*){return 0;}
int ultra_external_device_set_parameter(UltraExternalDevice*,uint32_t,float){return 0;}
int ultra_external_device_get_commanded_parameter(const UltraExternalDevice*,uint32_t,float*){return 0;}
int ultra_external_device_reset(UltraExternalDevice*){return 0;}
int ultra_external_device_render(UltraExternalDevice*,uint32_t,float*,float*,const UltraExternalMidi*,uint32_t){return 0;}
void ultra_external_device_close(UltraExternalDevice*){}
}
#endif
