// Conventional +X front, +Y left, +Z up; ACN order and SN3D normalization.
// The pinned library's raw basis is antipodal. Negate odd-degree bands.
// Do not apply this blindly after changing the pinned library version.
ho = library("hoa.lib");
process(x, azimuth, elevation) = ho.encoder3D(7, x, azimuth, elevation) :
    par(i, 64, *(1 - 2 * (int(sqrt(i)) % 2)));
