#include "../src-tauri/native/external_device/external_device.h"
#include <cassert>
#include <cmath>
#include <cstdio>
#include <cstring>
#include <cstdlib>

int main(int argc,char** argv){
 assert(argc==3||argc==4);
 const unsigned frames=argc==4?unsigned(std::strtoul(argv[3],nullptr,10)):256;assert(frames&&frames<=256&&48128%frames==0);
 char error[256]{};
 auto* invalid=ultra_external_device_open("/nonexistent/ultra-device.dll",argv[2],error,sizeof(error));
 assert(!invalid&&error[0]);
 auto* wrong=ultra_external_device_open(argv[1],"0000000000000000000000000000000000000000000000000000000000000000",error,sizeof(error));
 assert(!wrong&&error[0]);
 for(unsigned note_enabled=0;note_enabled<2;++note_enabled){
  auto* device=ultra_external_device_open(argv[1],argv[2],error,sizeof(error));
  if(!device){std::fprintf(stderr,"open failed: %s\n",error);return 1;}
  const auto count=ultra_external_device_parameter_count(device);assert(count==33||count==203);
  for(unsigned i=0;i<count;++i){
   UltraExternalParameter parameter{};assert(ultra_external_device_parameter(device,i,&parameter));
   if(!parameter.initialized)continue;
   float value=(parameter.minimum+parameter.maximum)*.5f;
   if(parameter.type==3)value=parameter.maximum==1?1:std::round(value);
   assert(ultra_external_device_set_parameter(device,i,value));
   float readback=0;assert(ultra_external_device_get_commanded_parameter(device,i,&readback)&&readback==value);
  }
  float left[256]{},right[256]{};double energy=0;float peak=0;
  UltraExternalMidi midi{0,0x90,60,100,0};
  for(unsigned block=0;block<48128/frames;++block){
   if(!ultra_external_device_render(device,frames,left,right,&midi,note_enabled&&block==0?1:0)){
    std::fprintf(stderr,"render failed: %s\n",ultra_external_device_error(device));return 1;
   }
   for(unsigned i=0;i<frames;++i){assert(std::isfinite(left[i])&&std::isfinite(right[i]));energy+=left[i]*left[i]+right[i]*right[i];peak=std::fmax(peak,std::fabs(left[i]));}
  }
  assert(note_enabled?energy>0&&peak<1:energy==0);
  assert(!ultra_external_device_render(device,257,left,right,nullptr,0));
  assert(ultra_external_device_reset(device));
  ultra_external_device_close(device);
  std::printf("%s frames=%u note=%u parameters=%u energy=%.12g peak=%.9g\n",argv[1],frames,note_enabled,count,energy,peak);
 }
}
