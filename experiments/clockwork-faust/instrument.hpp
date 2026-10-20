#pragma once
#include <cstdint>
struct Work {uint64_t allocations=0,frees=0,locks=0;};
extern thread_local bool measuring;
extern thread_local Work work;
void instrumentation_control();
