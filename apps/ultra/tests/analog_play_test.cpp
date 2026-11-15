#include "../src-tauri/native/external_device/analog_play.h"
#include <cassert>
#include <initializer_list>
#include <cmath>
#include <cstdio>
#include <atomic>
#include <thread>

int main(int argc,char** argv){
 assert(argc==2);char error[256]{};float left[256]{},right[256]{};
 assert(!ultra_analog_play_active());
 assert(!ultra_analog_play_note(60,100));
 assert(ultra_analog_play_open(argv[1],error,sizeof(error)));
 assert(ultra_analog_play_active());
 const auto generation=ultra_analog_play_generation();assert(generation!=0);
 assert(ultra_analog_play_parameter_count()==203);
 UltraAnalogParameterState parameter{};
 assert(ultra_analog_play_parameter_state(52,&parameter));
 assert(parameter.descriptor.tag_a==3516&&parameter.descriptor.tag_b==2);
 assert(parameter.requested==1&&parameter.applied==1);
 // Startup must leave pitch and other modulation amounts neutral.
 for(unsigned index:{39u,41u,43u,50u,53u,57u,59u,61u,63u,66u,69u,72u,74u,76u,122u}){
  UltraAnalogParameterState initial{};assert(ultra_analog_play_parameter_state(index,&initial));
  assert(initial.requested==0&&initial.applied==0);
 }
 const uint32_t pitch_indices[]={39,40};UltraAnalogParameterState pitch_state[2]{};
 const UltraAnalogParameterValue pitch[]={{39,.25f},{40,0}};
 const UltraAnalogParameterValue invalid_pitch[]={{39,.75f},{40,.5f}};
 const UltraAnalogParameterValue duplicate_pitch[]={{39,.25f},{39,.75f}};
 assert(!ultra_analog_play_set_parameters(generation,invalid_pitch,2));
 assert(!ultra_analog_play_set_parameters(generation,duplicate_pitch,2));
 assert(!ultra_analog_play_set_parameters(generation,pitch,0));
 assert(!ultra_analog_play_set_parameters(generation,pitch,204));
 assert(!ultra_analog_play_set_parameters(generation,nullptr,2));
 assert(!ultra_analog_play_set_parameters(generation+1,pitch,2));
 assert(ultra_analog_play_parameter_states(pitch_indices,2,pitch_state));
 assert(pitch_state[0].requested==0&&pitch_state[1].requested==0);
 assert(ultra_analog_play_set_parameters(generation,pitch,2));
 assert(ultra_analog_play_parameter_states(pitch_indices,2,pitch_state));
 assert(pitch_state[0].requested==.25f&&pitch_state[1].requested==0);
 assert(pitch_state[0].applied==0&&pitch_state[1].applied==0);
 assert(ultra_analog_play_render(256,left,right));
 assert(ultra_analog_play_parameter_states(pitch_indices,2,pitch_state));
 assert(pitch_state[0].applied==.25f&&pitch_state[1].applied==0);
 assert(!ultra_analog_play_set_parameter(generation,203,.5f));
 assert(!ultra_analog_play_set_parameter(generation+1,52,.5f));
 assert(!ultra_analog_play_set_parameter(generation,52,-1));
 assert(!ultra_analog_play_set_parameter(generation,52,NAN));
 assert(!ultra_analog_play_set_parameter(generation,30,.5f));
 for(unsigned i=0;i<10000;++i)assert(ultra_analog_play_set_parameter(generation,52,float(i%100)/100));
 assert(ultra_analog_play_set_parameter(generation,52,.75f));
 assert(ultra_analog_play_parameter_state(52,&parameter));
 assert(parameter.requested==.75f&&parameter.applied==1);
 assert(parameter.request_version!=parameter.applied_version);
 assert(!ultra_analog_play_note(128,100));
 assert(!ultra_analog_play_gain(-1));assert(!ultra_analog_play_gain(NAN));
 assert(ultra_analog_play_render(256,left,right));
 assert(ultra_analog_play_parameter_state(52,&parameter));
 assert(parameter.applied==.75f&&parameter.applied_version==parameter.request_version);
 for(unsigned i=0;i<256;++i)assert(left[i]==0&&right[i]==0);
 assert(ultra_analog_play_note(60,100));double energy=0;
 for(unsigned block=0;block<100;++block){
  assert(ultra_analog_play_render(256,left,right));
  for(unsigned i=0;i<256;++i){assert(std::isfinite(left[i])&&std::isfinite(right[i]));energy+=left[i]*left[i]+right[i]*right[i];}
 }
 assert(energy>0);assert(ultra_analog_play_note(60,0));
 double settled_release=0;
 for(unsigned block=0;block<188;++block){
  assert(ultra_analog_play_render(256,left,right));
  if(block>=160)for(unsigned i=0;i<256;++i)settled_release+=left[i]*left[i]+right[i]*right[i];
 }
 if(settled_release!=0){std::fprintf(stderr,"FAIL: released Analog note keeps sounding (settled energy %.9g)\n",settled_release);return 1;}
 assert(ultra_analog_play_gain(0));assert(ultra_analog_play_render(256,left,right));
 for(unsigned i=0;i<256;++i)assert(left[i]==0&&right[i]==0);
 assert(ultra_analog_play_frames()==25856+2*256+188*256);
 std::atomic<bool> done{false};
 std::thread renderer([&]{float l[256]{},r[256]{};while(!done.load())assert(ultra_analog_play_render(256,l,r));});
 for(unsigned i=0;i<2000;++i){
  const UltraAnalogParameterValue values[]={{39,i%2?.75f:.25f},{40,i%2?1.f:0.f}};
  assert(ultra_analog_play_set_parameters(generation,values,2));
  assert(ultra_analog_play_parameter_states(pitch_indices,2,pitch_state));
  assert((pitch_state[0].requested==.25f&&pitch_state[1].requested==0)||(pitch_state[0].requested==.75f&&pitch_state[1].requested==1));
  assert((pitch_state[0].applied==.25f&&pitch_state[1].applied==0)||(pitch_state[0].applied==.75f&&pitch_state[1].applied==1));
  if(i%100==0){assert(ultra_analog_play_note(60,100));assert(ultra_analog_play_note(60,0));}
 }
 done.store(true);renderer.join();assert(!ultra_analog_play_fault());
 assert(ultra_analog_play_render(256,left,right));
 for(unsigned i=0;i<256;++i)assert(ultra_analog_play_note(60,i%2?0:100));
 assert(!ultra_analog_play_note(60,0));
 assert(!ultra_analog_play_render(256,left,right));
 for(unsigned i=0;i<256;++i)assert(left[i]==0&&right[i]==0);
 ultra_analog_play_close();assert(!ultra_analog_play_active());
 assert(!ultra_analog_play_set_parameter(generation,52,.5f));
 assert(ultra_analog_play_open(argv[1],error,sizeof(error)));
 assert(ultra_analog_play_generation()!=generation);
 assert(!ultra_analog_play_set_parameter(generation,52,.5f));
 ultra_analog_play_close();
 std::printf("PASS: Analog live keyboard queue, graph audio, gain mute, overflow silence and close; energy=%.9g\n",energy);
}
