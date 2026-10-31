#pragma once
#include <cstdint>
// Test-only post-render observation. Never used to inject/execute DSP work.
struct Observation {
 uint64_t calls=0, messages=0, late=0, overflow=0, stale=0, malformed=0, spans=0;
 uint64_t immediate0=0, immediate1=0;
 uint32_t max_pending=0, max_messages_per_block=0, max_spans=0;
 int generation[2]{}, active[2]{}, replacements[2]{}, steals[2]{};
 float level[2]{};
};
extern "C" Observation ultra_observe();

struct Lifecycle {uint32_t created=0,destroyed=0,refused=0,in_render=0;};
extern "C" Lifecycle ultra_lifecycle();
