#include "../src-tauri/native/backend.h"
#include <algorithm>
#include <array>
#include <cassert>
#include <cmath>
#include <cstdio>
#include <vector>

// The same native voice through different device callback partitions.
static std::vector<float> render(unsigned block) {
    ultra_audio_routes(3);
    assert(ultra_external_start());
    assert(ultra_audio_event(0, 0, 60, 100));
    std::vector<float> result;
    std::array<float, 1024> left{}, right{};
    unsigned frame = 0;
    while (frame < 8192) {
        const auto count = std::min(block, 8192 - frame);
        assert(ultra_external_render(count, left.data(), right.data()));
        result.insert(result.end(), left.begin(), left.begin() + count);
        for (unsigned i = 0; i < count; ++i) assert(std::isfinite(left[i]));
        frame += count;
    }
    assert(ultra_audio_frames() >= 8192);
    ultra_audio_stop();
    return result;
}

int main() {
    const auto expected = render(64);
    for (auto count : {1u, 127u, 256u, 1024u}) assert(render(count) == expected);
    bool audible = false;
    for (auto sample : expected) audible |= std::abs(sample) > .001f;
    assert(audible);
    assert(ultra_external_start());
    assert(!ultra_external_render(1025, nullptr, nullptr));
    assert(ultra_audio_flags() & 4);
    ultra_audio_stop();
    assert(!(ultra_audio_flags() & 1));
    std::puts("PASS: Rust-host native ABI, callback partition invariance, audible output and bounded failure");
}
