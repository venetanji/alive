// Raw library convention; see README before connecting to an AmbiX bus.
ho = library("hoa.lib");
process(x, azimuth, elevation) = ho.encoder3D(7, x, azimuth, elevation);
