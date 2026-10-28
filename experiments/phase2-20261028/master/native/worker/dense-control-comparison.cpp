#include "alive_session_capacity_fixture.hpp"
#include <array>
#include <cassert>
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <initializer_list>
using namespace capacity_fixture;
int main(int argc,char** argv) {
 assert(argc==2);const unsigned count=unsigned(std::strtoul(argv[1],nullptr,10));assert(count);
 Fixture fixture(8,16,Music::Dense,true);fixture.install();
 std::array<float,1024> left{},right{};
 auto render=[&]{assert(ultra_external_render(1024,left.data(),right.data()));};
 request(fixture,1);render();assert(!state().fault && state().playing);
 auto prepare=[&](unsigned i){
  for(unsigned command=0;command<61;++command){const unsigned d=command%16,p=command%fixture.config.devices[d].parameter_count;
   assert(alive_session_base_v2(d,fixture.config.devices[d].revision,p,fixture.config.devices[d].parameters[p].base));}
  assert(alive_session_bypass_v2(1,fixture.config.devices[1].revision,i%2));
  assert(alive_session_mixer(i%8,.125,0,0));request(fixture,2,32767);
 };
 for(unsigned i=0;i<64;++i){prepare(i);render();assert(!state().fault);}
 for(unsigned i=0;i<count;++i){prepare(i);const auto start=std::chrono::steady_clock::now();render();
  const auto elapsed=std::chrono::duration_cast<std::chrono::nanoseconds>(std::chrono::steady_clock::now()-start).count();
  assert(!state().fault);const auto wall=std::chrono::duration_cast<std::chrono::nanoseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
  uint64_t hash=1469598103934665603ULL;for(unsigned frame=0;frame<1024;++frame)for(float sample:{left[frame],right[frame]}){uint32_t bits;std::memcpy(&bits,&sample,sizeof bits);hash=(hash^bits)*1099511628211ULL;}
  std::printf("SAMPLE,extended_dense_controls,8,16,1024,%u,%lld,%lld,%llu\n",i,(long long)elapsed,(long long)wall,(unsigned long long)hash);
 }
 ultra_audio_stop();assert(alive_session_reset());
}
