// Authored resonant lowpass primitive; no hidden instrument wiring.
import("stdfaust.lib");
process(audio, cutoff, q) = fi.resonlp(cutoff, q, 1, audio);
