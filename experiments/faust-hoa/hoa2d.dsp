// Circular 2D field: 63 coefficients, not a full 3D ACN stream.
ho = library("hoa.lib");
process(x, azimuth) = ho.encoder(31, x, azimuth);
