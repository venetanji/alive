// Test double only: exercises application's JACK ABI adapter, NOT JACK execution.
#include <jack/jack.h>
#include <jack/midiport.h>
#include <array>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include "../src-tauri/native/backend.h"
static JackLatencyCallback latency;static void* latency_user;static int latency_updates;static bool latency_ok=true;
static JackProcessCallback process; static void* user;static std::array<float,64> a,b;static unsigned block;static int calls;
extern "C" {
jack_client_t* jack_client_open(const char*,jack_options_t,jack_status_t*,...){latency_updates=0;latency_ok=true;block=0;return reinterpret_cast<jack_client_t*>(1);}
int jack_client_close(jack_client_t*){return 0;}int jack_deactivate(jack_client_t*){return 0;}
jack_nframes_t jack_get_sample_rate(jack_client_t*){return getenv("FAKE_RATE")?atoi(getenv("FAKE_RATE")):48000;}jack_nframes_t jack_get_buffer_size(jack_client_t*){return getenv("FAKE_PERIOD")?atoi(getenv("FAKE_PERIOD")):64;}
int jack_set_process_callback(jack_client_t*,JackProcessCallback p,void*u){process=p;user=u;return 0;}
int jack_set_xrun_callback(jack_client_t*,JackXRunCallback,void*){return 0;}int jack_set_sample_rate_callback(jack_client_t*,JackSampleRateCallback,void*){return 0;}
void jack_on_shutdown(jack_client_t*,JackShutdownCallback,void*){}
jack_port_t* jack_port_register(jack_client_t*,const char*n,const char*,unsigned long,unsigned long){return reinterpret_cast<jack_port_t*>(!strcmp(n,"audio_out_l")?1:!strcmp(n,"audio_out_r")?2:3);}
void* jack_port_get_buffer(jack_port_t*p,jack_nframes_t){return reinterpret_cast<uintptr_t>(p)==1?a.data():reinterpret_cast<uintptr_t>(p)==2?b.data():reinterpret_cast<void*>(3);}
uint32_t jack_midi_get_event_count(void*){if(getenv("FAKE_MANUAL"))return 0;return block==8&&getenv("FAKE_OVERLOAD")?129:block==0?2:block==8?1:block==12?1:0;}
int jack_midi_event_get(jack_midi_event_t*e,void*,uint32_t i){static unsigned char msg[3];e->time=block==0?(i?31:0):0;e->size=3;e->buffer=msg;msg[0]=block==0?(i?0x91:0x90):(block==8?0x80:0x81);msg[1]=block==0?(i?67:60):(block==8?60:67);msg[2]=block==0?100:0;
 // Interleave a control-thread route edit after A's future note was admitted.
 if(getenv("FAKE_ROUTE_RACE")&&block==0){if(i==0)e->time=31;else ultra_audio_routes(2);}
 return 0;}
const char** jack_get_ports(jack_client_t*,const char*,const char*,unsigned long){return nullptr;}const char*jack_port_name(const jack_port_t*){return "fake";}int jack_connect(jack_client_t*,const char*,const char*){return 0;}void jack_free(void*p){free(p);}
int jack_activate(jack_client_t*){if(!latency)return 1;latency(JackCaptureLatency,latency_user);latency(JackPlaybackLatency,latency_user);if(!latency_ok||latency_updates!=3)return 1;if(getenv("FAKE_MANUAL"))return 0;FILE*f=fopen(getenv("FAKE_CAPTURE"),"wb");if(!f)return 1;for(block=0;block<32;block++){
 if(getenv("FAKE_ROUTE_RACE")&&block==1)ultra_audio_routes(3);
 process(64,user);for(unsigned i=0;i<64;i++){fwrite(&a[i],4,1,f);fwrite(&b[i],4,1,f);}calls++;}fclose(f);return 0;}
void ultra_fake_step(){process(64,user);++block;}
const float* ultra_fake_left(){return a.data();}
const float* ultra_fake_right(){return b.data();}
}
extern "C" {
int jack_set_latency_callback(jack_client_t*,JackLatencyCallback f,void*u){latency=f;latency_user=u;return 0;}
void jack_port_get_latency_range(jack_port_t*,jack_latency_callback_mode_t,jack_latency_range_t*r){r->min=0;r->max=0;}
void jack_port_set_latency_range(jack_port_t*,jack_latency_callback_mode_t,jack_latency_range_t*r){++latency_updates;latency_ok=latency_ok&&r->min==64&&r->max==64;}
}
