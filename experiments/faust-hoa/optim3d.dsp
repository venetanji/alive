// Test the actual three static library optimizers, not a reimplementation.
ho = library("hoa.lib");
si = library("signals.lib");
process = si.bus(16) <:
    (ho.optimBasic3D(3), ho.optimMaxRe3D(3), ho.optimInPhase3D(3));
