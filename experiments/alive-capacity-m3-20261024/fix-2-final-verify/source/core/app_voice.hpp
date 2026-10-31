#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <stdexcept>
#include "faust/dsp/dsp.h"
#include "faust/gui/MapUI.h"
#include "faust/gui/meta.h"
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wunused-parameter"
#include "generated/app_voice.hpp"
#pragma GCC diagnostic pop

namespace alive::app {
constexpr int default_envelope_frames = 16;
constexpr int attack_frames(uint8_t value) { return value ? value*192 : default_envelope_frames; }
constexpr int release_frames(uint8_t value) { return value ? value*384 : default_envelope_frames; }

// UI discovery and table/instance initialization happen only during prepare.
// Envelope parameters are latched at note-on. Edits never touch active voices.
struct Voice {
 UltraAppVoice dsp;
 MapUI ui;
 float *gate=nullptr, *gain=nullptr, *freq=nullptr, *level=nullptr;
 float *attack=nullptr, *release_time=nullptr;
 int note=-1, born=0, started=0, release_at=-1;
 bool down=false;

 void prepare() {
  dsp.instanceInit(48000);
  dsp.buildUserInterface(&ui);
  gate=ui.getParamZone("gate"); gain=ui.getParamZone("gain");
  freq=ui.getParamZone("freq"); level=ui.getParamZone("level");
  attack=ui.getParamZone("attack_frames"); release_time=ui.getParamZone("release_frames");
  if(!gate || !gain || !freq || !level || !attack || !release_time)
   throw std::runtime_error("missing generated app voice UI zone");
 }
 void envelope(int attack_count, int release_count) noexcept {
  *attack=float(attack_count); *release_time=float(release_count);
 }
 void reset() noexcept {
  dsp.instanceClear(); *gate=0; note=-1; down=false; release_at=-1;
 }
 bool active(int frame) const noexcept {
  return note>=0 && (release_at<0 || frame<release_at);
 }
 void release(int frame) noexcept {
  if(release_at>=0) return; // Repeated stop/all-off must not extend the tail.
  *gate=0; down=false;
  // Match generated en.asr's single-precision slope, including early note-off.
  // The duration includes its final zero sample. No variable-time sample loop.
  const float amplitude=std::min(float(frame-started)*(1.f / *attack),1.f);
  const float step=1.f / *release_time;
  int duration=int(std::ceil(amplitude/step));
  // Correct at most one sample of float division/multiplication rounding.
  if(duration>0 && float(duration-1)*step>=amplitude) --duration;
  if(float(duration)*step<amplitude) ++duration;
  release_at=int(std::min<int64_t>(int64_t(frame)+duration,INT32_MAX));
 }
};
}
