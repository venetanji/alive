# Audio configuration

Open **Audio settings** in the canvas footer. Choose the audio system, output
device and buffer/period size. **Save settings** leaves sound off. **Save & start
audio** saves the configuration and opens the output. Stop audio to edit a running
configuration. Start failures open this panel with a recovery message.

Settings are local to Ultra, in Tauri's application data directory under
`org.alive.ultra.research/audio-settings.json`. The app writes them only when
you save. It does not edit global audio preferences, restart services, change
the server's forced quantum/rate, or modify patch documents. Audio stays off
on application startup. Missing devices produce an error and retain their
saved identifier; a different device is not substituted silently.

## Architecture and limits

Device discovery, format selection, persistence, stream lifetime and output
conversion use Rust CPAL **0.18.2**, pinned in Cargo.lock. Linux builds enable
native PipeWire and ALSA. CPAL also provides platform backends such as WASAPI
and CoreAudio; this change is verified on Linux only. The existing native
Clockwork/Faust build and packaging still need work before shipping other OSes.
Linux build prerequisites now also include ALSA and PipeWire development files
and libclang for the PipeWire bindings. Their runtime libraries must be present.

The existing prepared DSP runs at **48,000 Hz, two channels**. Other DSP sample
rates, arbitrary channel layouts and microphone input are deferred. PipeWire
may convert an admitted 48 kHz stream to a device/graph at another rate; that
conversion belongs to the server, and is not a claim that the core runs at
44.1 kHz. A device that does not advertise an admitted format is rejected.

The device owns callback size. Requests from 32 to 8192 frames are validated
against advertised capabilities; Automatic uses the backend's choice. The live
panel reports the **last observed callback**, not the requested value or a
hardware measurement. Its buffer duration is not total speaker latency. The
DSP's declared 64-frame pipeline is shown separately.

Rust renders callbacks in native blocks of at most 1024 frames and interleaves
the planar stereo results into the device format. This adds no extra application
FIFO. Callback work is bounded to 16,384 device frames, with fixed preallocated
scratch buffers. Larger/malformed callbacks fail closed. No discovery,
preferences I/O, allocation, locks or logging is introduced in our render
callback. CPAL/driver internals have their own implementation requirements;
this is not a deadline qualification. Failed DSP blocks mute the whole device
callback. Stream errors latch a fault and require Stop/Start; reported xruns are
counted and left to the backend's recovery rather than treated as disconnects.

The stream is dropped before native engine state is reclaimed. Graph admission,
bounded queues, revision checks, Panic and note cleanup retain their native
validation. The direct JACK adapter remains available to `ultra-diagnostic`
and its existing ABI/MIDI tests. The desktop app now uses CPAL. **Physical MIDI
and external MIDI clock are deferred on this path**; CPAL does not provide MIDI.
On-screen graph controls, the original keyboard and internal clocks still use
the native event path. DSP-independent message execution is a separate mapped
task; this audio work does not claim to implement it.

## Reproduction

```sh
bash apps/ultra/build.sh
bash apps/ultra/run.sh
bash apps/ultra/tests/check_cpal_audio.sh /tmp/ultra-cpal-results
bash apps/ultra/tests/check_canvas_desktop.sh --software-audio /tmp/ultra-ui-results
```

Both audio tests create a private software-only PipeWire graph and a policy-only
WirePlumber instance. They load no hardware monitors, use private runtime/state/
application data directories, and clean up their own processes. CPAL 0.18.2
discovers the literal `pipewire-0` socket, so the tests create an alias inside
their own directory. They do not depend on a user server or change its settings.
The loopback test records real output samples, validates finite audible stereo,
checks saved configuration reload, rejects unsupported buffers, and exercises
Stop/Start. The desktop test operates the real built WebKit/Tauri page, saves
512-frame settings and captures a triggered note with a silent untriggered
channel and terminated tail. These are software tests, not physical listening,
MIDI input or calibrated latency measurements.

Official source/API: https://docs.rs/cpal/0.18.2/cpal/
https://github.com/RustAudio/cpal/tree/e1612d5d98152f8dc2a62e1b51ef7cbf4f7f26b7
