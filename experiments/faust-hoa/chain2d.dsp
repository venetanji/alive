// Inputs: mono, azimuth radians, rotation radians.
// Outputs: raw 7, rotated 7, in-phase 7, ring speakers 8, stereo 2.
ho = library("hoa.lib");
si = library("signals.lib");
probe(x, a, r) = ho.encoder(3, x, a) <:
    (si.bus(7), ho.rotate(3, r), ho.optimInPhase(3),
     ho.decoder(3, 8), (ho.optimInPhase(3) : ho.decoderStereo(3)));
process = probe;
