// Application instrument. The frozen experiment/oracle is deliberately unchanged.
// Host owns four-voice allocation, MIDI, and note-latched envelope controls.
import("stdfaust.lib");
freq = hslider("freq", 440, 20, 20000, 0.01);
gain = hslider("gain", 0, 0, 1, 0.001);
gate = button("gate");
level = hslider("level", 1, 0, 1, 0.001);
attack = hslider("attack_frames", 16, 16, 24384, 1);
release = hslider("release_frames", 16, 16, 48768, 1);
process = os.oscp(freq, ma.PI/2)
    * en.asr(attack/ma.SR, 1, release/ma.SR, gate) * gain * level * 0.25;
