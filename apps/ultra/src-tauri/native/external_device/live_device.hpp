#pragma once
#include "live_device.h"
#include "../patch_graph.hpp"
#include <memory>

namespace ultra {
// One bank is owned by one document. Ownership and callback binding change only
// with the driver fenced; atomic command cells connect the two runtime owners.
class LiveDeviceBank {
 struct State;
 std::unique_ptr<State> state_;
 explicit LiveDeviceBank(std::unique_ptr<State>);
 public:
 ~LiveDeviceBank();
 static std::unique_ptr<LiveDeviceBank> prepare(const UltraCanvasGraph& graph,
  const UltraLiveDeviceSource* sources,unsigned count,char* error,size_t capacity);
 bool bind(CanvasRuntime& runtime)noexcept;
 bool rearm(CanvasRuntime& runtime,char* error,size_t capacity);
 bool set_states(const UltraLiveDeviceStateUpdate* updates,unsigned count,char* error,size_t capacity)noexcept;
 unsigned parameters(unsigned node,UltraLiveDeviceParameterState* states,unsigned capacity)const noexcept;
 bool apply_pending()noexcept;
 bool has(unsigned node)const noexcept;
 unsigned count()const noexcept;
 bool matches_note_source(const CanvasRuntime&,unsigned node,const char* profile,unsigned version,
  const uint8_t* dll_sha256,uint64_t revision)const noexcept;
};
}
