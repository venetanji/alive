#pragma once
#include <cstdint>
#include <memory>
namespace alive {
inline constexpr uint32_t DocumentCount=16,DocumentDevices=DocumentCount*2;
enum class Kind : uint8_t { On, Off, Sustain, Level, AllOff, Reset, Attack, Release,
                          HardClear }; // Internal route/ownership cleanup, not UI ingress.
struct Event { uint32_t offset=0; uint8_t device=0; Kind kind=Kind::On; uint8_t note=60, value=100; };
struct Status { bool ready=false, fault=false; uint64_t rendered=0, rejected=0; uint32_t delay_frames=64, queued=0; };
// Explicit planar audio bundle: stereo legacy output or 32 prepared device buses.
struct AudioBusView { float* const* channels=nullptr; uint32_t channel_count=0; };
// One instance/process. init/shutdown only while callback stopped. One UI producer.
// queue is UI-thread SPSC; submit and render are callback-thread-only.
// Event offsets refer to the next render's input timeline, max 1024 frames.
// Overload faults/mutes the whole engine until stopped shutdown+init; no leases.
// Attack/Release values: 0 = 16 frames; 1..127 = value*4ms / value*8ms.
// Envelope changes latch at note-on per device. Reset restores 16-frame defaults.
class Engine {
 public:
 Engine(); ~Engine(); Engine(const Engine&)=delete; Engine& operator=(const Engine&)=delete;
 bool init(uint32_t sample_rate=48000); void shutdown();
 bool queue(Event e) noexcept; // UI events must offset=0; bounded 64-entry queue
 bool submit(Event e) noexcept; // MIDI/callback, before render; bounded admission
 bool submit_document(Event e) noexcept; // Prepared document bank 0..31, callback only.
 void panic() noexcept; // any thread: fail-closed, restart required
 // Invalid/null bus widths fault without inspecting or writing channel pointers.
 // A valid bus's two channel buffers must each contain at least frames samples.
 void render_bus(AudioBusView output,const float* input,uint32_t frames,float* diagnostic=nullptr) noexcept;
 void render(float* left,float* right,const float* input,uint32_t frames,float* diagnostic=nullptr) noexcept;
 // Exactly DocumentDevices non-null channels, each holding at least frames samples.
 void render_devices(AudioBusView output,const float* input,uint32_t frames) noexcept;
 Status status() const noexcept;
 private:
 void render_channels(float* const* output,uint32_t channels,const float* input,uint32_t frames,float* diagnostic) noexcept;
 struct Impl; std::unique_ptr<Impl> p;
};
}
