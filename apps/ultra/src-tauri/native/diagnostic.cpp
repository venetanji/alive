#include "backend.h"
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <thread>
int main(int argc,char**argv){
 if(argc==3&&!std::strcmp(argv[1],"--render-demo")){int ok=ultra_render_demo(argv[2]);std::printf("Clockwork/Faust offline render: %s\n",ok?"PASS":"FAIL");return ok?0:1;}
 if(argc==3&&!std::strcmp(argv[1],"--run-seconds")){
  ultra_audio_routes(3);if(!ultra_audio_start()){std::fprintf(stderr,"%s\n",ultra_audio_error());ultra_audio_stop();return 2;}
  std::printf("%s\n",ultra_audio_error());std::fflush(stdout);
  int seconds=std::atoi(argv[2]);if(seconds<1||seconds>3600)seconds=10;
  std::this_thread::sleep_for(std::chrono::seconds(seconds));
  std::printf("frames=%llu rejected=%llu flags=%u period=%u xruns=%u\n",(unsigned long long)ultra_audio_frames(),(unsigned long long)ultra_audio_rejected(),ultra_audio_flags(),ultra_audio_period(),ultra_audio_xruns());
  bool ok=(ultra_audio_flags()&13)==1;ultra_audio_stop();return ok?0:1;
 }
 std::puts("Ultra native diagnostic\n  --render-demo output.wav  Offline actual Clockwork/Faust render/check\n  --run-seconds 30          JACK MIDI/audio session, channel 1=A, 2=B");return 0;
}
