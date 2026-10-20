// Independent equation checks for the generated library DSP, not app code.
#include <algorithm>
#include <cmath>
#include <iomanip>
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>
#include "faust/dsp/dsp.h"
#include "faust/gui/UI.h"
#include "faust/gui/meta.h"
#include "generated/hoa2d.hpp"
#include "generated/hoa3d.hpp"
#include "generated/hoa3d_ambix.hpp"
#include "generated/chain2d.hpp"
#include "generated/optim3d.hpp"

using Audio = std::vector<std::vector<float>>;
constexpr double PI = 3.14159265358979323846;
double maximumError = 0;
int checks = 0;

void check(bool condition, const std::string& message) {
    ++checks;
    if (!condition) throw std::runtime_error(message);
}

void near(double actual, double expected, const std::string& message,
          double tolerance = 2e-5) {
    maximumError = std::max(maximumError, std::abs(actual - expected));
    check(std::isfinite(actual) && std::abs(actual - expected) <= tolerance,
          message + ": actual=" + std::to_string(actual) +
          " expected=" + std::to_string(expected));
}

template<class Dsp>
Audio render(const Audio& inputs, int outputs,
             const std::vector<int>& partitions = {256}) {
    Dsp dsp;
    dsp.init(48000);
    check(dsp.getNumInputs() == int(inputs.size()), "input channel count");
    check(dsp.getNumOutputs() == outputs, "output channel count");
    int frames = int(inputs.at(0).size());
    Audio result(outputs, std::vector<float>(frames));
    std::vector<float*> in(inputs.size()), out(outputs);
    for (int offset = 0, block = 0; offset < frames; ++block) {
        int count = std::min(frames - offset,
                             partitions[block % partitions.size()]);
        for (size_t c = 0; c < inputs.size(); ++c)
            in[c] = const_cast<float*>(inputs[c].data()) + offset;
        for (int c = 0; c < outputs; ++c)
            out[c] = result[c].data() + offset;
        dsp.compute(count, in.data(), out.data());
        offset += count;
    }
    return result;
}

double factorial(int n) {
    double result = 1;
    for (int i = 2; i <= n; ++i) result *= i;
    return result;
}

// Associated Legendre functions WITHOUT the Condon-Shortley phase.
// Evaluated independently at sin(elevation), unlike the library's -sin(e).
double legendre(int l, int m, double z) {
    double pmm = 1;
    for (int k = 1; k <= m; ++k)
        pmm *= (2 * k - 1) * std::sqrt(std::max(0.0, 1 - z * z));
    if (l == m) return pmm;
    double previous = pmm, current = (2 * m + 1) * z * pmm;
    for (int k = m + 2; k <= l; ++k) {
        double next = ((2 * k - 1) * z * current -
                       (k + m - 1) * previous) / (k - m);
        previous = current;
        current = next;
    }
    return current;
}

// Conventional right-handed XYZ: +X front, +Y left, +Z up.
double sn3d(int acn, double azimuth, double elevation) {
    int l = int(std::sqrt(acn)), m = acn - l * (l + 1);
    int am = std::abs(m);
    if (std::cos(elevation) < 0) azimuth += PI;
    double angular = m < 0 ? std::sin(am * azimuth) :
                     m > 0 ? std::cos(am * azimuth) : 1;
    double norm = std::sqrt((m == 0 ? 1.0 : 2.0) *
                            factorial(l - am) / factorial(l + am));
    return angular * norm * legendre(l, am, std::sin(elevation));
}

Audio controls() {
    Audio input(3, std::vector<float>(521));
    const std::vector<double> elevations =
        {0, 0.3, -0.8, PI / 2, -PI / 2, 2.0, -2.0, 5.0};
    for (size_t i = 0; i < input[0].size(); ++i) {
        input[0][i] = i % 17 == 0 ? 0 : float(std::sin(i * 0.19) * 0.8);
        input[1][i] = float(-PI + (i % 97) * (2 * PI / 96));
        input[2][i] = float(elevations[i % elevations.size()]);
    }
    input[0][0] = 1;
    input[1][0] = 0;
    input[2][0] = 0;
    return input;
}

void test2d(const Audio& controls) {
    Audio input{controls[0], controls[1]};
    auto output = render<Hoa2D>(input, 63);
    for (size_t f = 0; f < input[0].size(); ++f) {
        near(output[0][f], input[0][f], "2D omni gain");
        double energy = double(output[0][f]) * output[0][f];
        for (int n = 1; n <= 31; ++n) {
            near(output[2 * n - 1][f], input[0][f] * std::sin(n * double(input[1][f])),
                 "2D sin ordering and unit normalization");
            near(output[2 * n][f], input[0][f] * std::cos(n * double(input[1][f])),
                 "2D cos ordering and unit normalization");
            energy += double(output[2*n-1][f]) * output[2*n-1][f] +
                      double(output[2*n][f]) * output[2*n][f];
        }
        near(energy, 32 * double(input[0][f]) * input[0][f], "2D energy");
    }
    check(render<Hoa2D>(input, 63, {1}) == output, "2D bit-exact partitioning");
    check(render<Hoa2D>(input, 63, {3, 17, 1, 64}) == output,
          "2D bit-exact irregular partitioning");
    std::cout << "PASS 2D N=31 channels=63 [1,sin(a),cos(a),...,sin(31a),cos(31a)]\n";
}

void test3d(const Audio& input) {
    auto output = render<Hoa3D>(input, 64);
    for (size_t f = 0; f < input[0].size(); ++f) {
        for (int c = 0; c < 64; ++c) {
            int l = int(std::sqrt(c));
            // Raw pinned library emits the antipodal direction.
            near(output[c][f], input[0][f] * sn3d(c, input[1][f], input[2][f]) *
                 (l % 2 ? -1 : 1), "3D ACN SN3D magnitude, odd-degree polarity");
        }
        for (int l = 0; l <= 7; ++l) {
            double energy = 0;
            for (int c = l*l; c < (l+1)*(l+1); ++c)
                energy += double(output[c][f]) * output[c][f];
            near(energy, double(input[0][f]) * input[0][f],
                 "3D SN3D per-degree sum of squares");
        }
    }
    near(output[0][0], 1, "raw +X W");
    near(output[1][0], 0, "raw +X Y");
    near(output[2][0], 0, "raw +X Z");
    near(output[3][0], -1, "raw +X X is negative");
    check(render<Hoa3D>(input, 64, {1}) == output, "3D bit-exact partitioning");
    check(render<Hoa3D>(input, 64, {3, 17, 1, 64}) == output,
          "3D bit-exact irregular partitioning");
    std::cout << "PASS 3D N=7 channels=64 ACN; raw +X first four=[1,0,0,-1]\n";
    std::cout << "PASS 3D SN3D magnitudes, antipodal parity (-1)^degree, extended elevations\n";
}

void testChain(const Audio& input) {
    auto output = render<Chain2D>(input, 31);
    for (size_t f = 0; f < input[0].size(); ++f) {
        double x = input[0][f], a = input[1][f], rotation = input[2][f];
        near(output[0][f], x, "chain raw omni");
        near(output[7][f], x, "rotation preserves omni");
        near(output[14][f], x, "in-phase preserves omni");
        for (int n = 1; n <= 3; ++n) {
            double weight = 36.0 / (factorial(3+n) * factorial(3-n));
            near(output[7+2*n-1][f], x * std::sin(n * (a+rotation)),
                 "2D rotation sine");
            near(output[7+2*n][f], x * std::cos(n * (a+rotation)),
                 "2D rotation cosine");
            near(output[14+2*n-1][f], weight * output[2*n-1][f],
                 "2D in-phase sine");
            near(output[14+2*n][f], weight * output[2*n][f],
                 "2D in-phase cosine");
        }
        double sum = 0;
        for (int speaker = 0; speaker < 8; ++speaker) {
            double expected = x / 8;
            double direction = 2 * PI * speaker / 8;
            for (int n = 1; n <= 3; ++n)
                expected += x * 2 / 8 * std::cos(n * (a-direction));
            near(output[21+speaker][f], expected, "2D ring decoder matrix");
            sum += output[21+speaker][f];
        }
        near(sum, x, "2D ring speaker sum");
        check(std::isfinite(output[29][f]) && std::isfinite(output[30][f]),
              "library stereo decoder finite");
        if (x == 0) {
            near(output[29][f], 0, "stereo silence left");
            near(output[30][f], 0, "stereo silence right");
        }
    }
    check(render<Chain2D>(input, 31, {1, 7, 64}) == output,
          "2D chain bit-exact partitioning");
    std::cout << "PASS 2D N=3 encode, rotate, in-phase, 8-speaker matrix, stereo finite/silence\n";
}

void testAmbixAdapter(const Audio& input) {
    auto output = render<Hoa3DAmbix>(input, 64);
    near(output[3][0], 1, "AmbiX adapter +X must have positive X");
    for (size_t f = 0; f < input[0].size(); ++f)
        for (int c = 0; c < 64; ++c)
            near(output[c][f], input[0][f] * sn3d(c, input[1][f], input[2][f]),
                 "adapted conventional ACN/SN3D");
    check(render<Hoa3DAmbix>(input, 64, {1, 13, 128}) == output,
          "adapted 3D bit-exact partitioning");
    std::cout << "PASS odd-degree sign adapter gives conventional ACN/SN3D, N=7, 64 channels\n";
}

void testOptimizers() {
    Audio input(16, std::vector<float>(3, 1));
    auto output = render<Optim3D>(input, 48);
    for (int c = 0; c < 16; ++c) {
        int l = int(std::sqrt(c));
        near(output[c][0], 1, "3D basic identity");
        near(output[16+c][0], std::cos(l * PI / 8), "3D maxRe coefficient");
        near(output[32+c][0], 36.0 / (factorial(3-l) * factorial(3+l)),
             "3D in-phase coefficient");
    }
    std::cout << "PASS 3D N=3 basic, maxRe, in-phase coefficients\n";
}

int main() {
    try {
        const auto input = controls();
        test2d(input);
        test3d(input);
        testAmbixAdapter(input);
        testChain(input);
        testOptimizers();
        check(2*31+1 <= 64 && 2*32+1 > 64, "64-channel 2D bound");
        check((7+1)*(7+1) == 64 && (8+1)*(8+1) > 64, "64-channel 3D bound");
        std::cout << "PASS 64-channel host cap implies 2D order<=31 (63 channels), 3D order<=7\n";
        std::cout << "PASS checks=" << checks << " max_abs_error="
                  << std::setprecision(10) << maximumError << " tolerance=2e-5\n";
    } catch (const std::exception& error) {
        std::cerr << "FAIL " << error.what() << '\n';
        return 1;
    }
}
