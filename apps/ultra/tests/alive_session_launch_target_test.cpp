#include "../src-tauri/native/alive_session_launch.hpp"
#include <cassert>
#include <cmath>
#include <cstdio>
#include <algorithm>

static uint64_t oracle(unsigned grid, double tempo, uint64_t position, uint64_t length,
                       bool loop, uint64_t begin, uint64_t end) {
  if (loop && position >= end) position = begin;
  if (!grid) return 0;
  const double beats[] = {0,.125,.25,.5,1,2,4,8,16,32};
  uint64_t target = UINT64_MAX;
  for (unsigned k=0; k<=2048; ++k) {
    auto frame=uint64_t(std::round((k*beats[grid])*48000.*60./tempo));
    if (frame >= position && frame < (loop?end:length)) target=std::min(target,frame);
  }
  if (loop) target=std::min(target,position<=begin?begin:end);
  return target==UINT64_MAX?target:target-position;
}
int main() {
  for (double tempo : {30.,137.,240.}) {
    auto length=uint64_t(std::round(256.*48000.*60./tempo));
    for (unsigned grid=0;grid<10;++grid)
      for (bool loop:{false,true})
        for (uint64_t begin : {uint64_t(0),uint64_t(1499),length-1000}) {
          auto end=begin?std::min(length,begin+188):length;
          for (uint64_t position=0;position<length;position+=9973) {
            auto want=oracle(grid,tempo,position,length,loop,begin,end);
            auto actual=ultra::launch::distance(grid,tempo,position,length,loop,begin,end);
            assert(actual==want);
          }
        }
    for(unsigned grid=1;grid<10;++grid) {
      const double beats[]={0,.125,.25,.5,1,2,4,8,16,32};
      for(unsigned k=0;k<8;++k) {
        auto point=uint64_t(std::round(k*beats[grid]*48000.*60./tempo));
        assert(ultra::launch::distance(grid,tempo,point,length,false,0,length)==0);
        if(point) assert(ultra::launch::distance(grid,tempo,point-1,length,false,0,length)==1);
      }
    }
  }
  assert(ultra::launch::distance(10,120,0,100,false,0,100)==UINT64_MAX);
  std::puts("launch target oracle: all grids, equality, tempos, irregular seams passed");
}
