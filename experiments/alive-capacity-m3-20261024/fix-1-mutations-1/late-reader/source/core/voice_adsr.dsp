// Times use the canvas's millisecond units; all parameters remain live.
import("stdfaust.lib");
process(gate, attack, decay, sustain, release) =
    en.adsr(attack/1000, decay/1000, sustain, release/1000, gate);
