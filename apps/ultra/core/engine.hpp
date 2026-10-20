#pragma once
#include <cstdint>
#include <memory>
namespace alive {
enum class Kind : uint8_t { On, Off, Sustain, Level, AllOff, Reset };
struct Event { uint32_t offset=0; uint8_t device=0; Kind kind=Kind::On; uint8_t note=60, value=100; };
struct Status { bool ready=false, fault=false; uint64_t rendered=0, rejected=0; uint32_t delay_frames=64, queued=0; };
// One instance/process. init/shutdown only while callback stopped. One UI producer.
// queue is UI-thread SPSC; submit and render are callback-thread-only.
// Event offsets refer to the next render's input timeline, max 1024 frames.
// Overload faults/mutes the whole engine until stopped shutdown+init; no leases.
class Engine {
 public:
 Engine(); ~Engine(); Engine(const Engine&)=delete; Engine& operator=(const Engine&)=delete;
 bool init(uint32_t sample_rate=48000); void shutdown();
 bool queue(Event e) noexcept; // UI events must offset=0; bounded 64-entry queue
 bool submit(Event e) noexcept; // MIDI/callback, before render; bounded admission
 void panic() noexcept; // any thread: fail-closed, restart required
 void render(float* left,float* right,const float* input,uint32_t frames,float* diagnostic=nullptr) noexcept;
 Status status() const noexcept;
 private: struct Impl; std::unique_ptr<Impl> p;
};
}
