// Research fixture, not a product instrument. Host owns polyphony and MIDI.
import("stdfaust.lib");
freq = hslider("freq", 440, 20, 20000, 0.01);
gain = hslider("gain", 0, 0, 1, 0.001);
gate = button("gate");
level = hslider("level", 1, 0, 1, 0.001);
process = os.oscp(freq, ma.PI/2) * en.asr(16.0/48000,1,16.0/48000,gate) * gain * level * 0.25;
