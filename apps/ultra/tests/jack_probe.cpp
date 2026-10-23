#include <jack/jack.h>
#include <jack/midiport.h>
#include <algorithm>
#include <array>
#include <atomic>
#include <chrono>
#include <cmath>
#include <cstdio>
#include <cstring>
#include <thread>
#include <vector>

struct Event { jack_nframes_t frame; std::array<unsigned char, 3> bytes; };
struct Probe {
    jack_client_t *sender = nullptr, *capture = nullptr;
    jack_port_t *midi = nullptr, *left = nullptr, *right = nullptr;
    std::atomic<jack_nframes_t> begin{0}, reached{0}, period{0};
    std::atomic<unsigned> xruns{0}, errors{0};
    std::atomic<bool> cleanup{false}, cleaned{false};
    unsigned recorded_frames = 0, discontinuities = 0;
    int64_t expected_frame = 0;
    std::array<Event, 256> score{};
    unsigned count = 0, next = 0;
    std::vector<float> l = std::vector<float>(48000), r = std::vector<float>(48000);
    void add(unsigned frame, unsigned status, unsigned note, unsigned value) {
        score[count++] = {frame, {static_cast<unsigned char>(status), static_cast<unsigned char>(note), static_cast<unsigned char>(value)}};
    }
    static int send(jack_nframes_t n, void *arg) {
        auto &p = *static_cast<Probe *>(arg);
        void *out = jack_port_get_buffer(p.midi, n);
        jack_midi_clear_buffer(out);
        if (p.cleanup.load(std::memory_order_acquire)) {
            const unsigned char off[2][3] = {{0xb0, 120, 0}, {0xb1, 120, 0}};
            if (!p.cleaned.load(std::memory_order_relaxed)) {
                if (jack_midi_event_write(out, 0, off[0], 3) || jack_midi_event_write(out, 0, off[1], 3)) ++p.errors;
                p.cleaned.store(true, std::memory_order_release);
            }
            return 0;
        }
        auto start = p.begin.load(std::memory_order_acquire);
        if (!start) return 0;
        auto now = jack_last_frame_time(p.sender);
        while (p.next < p.count) {
            auto &e = p.score[p.next];
            int64_t offset = int64_t(start) + e.frame - now;
            if (offset >= n) break;
            if (offset < 0 || jack_midi_event_write(out, offset, e.bytes.data(), 3)) ++p.errors;
            ++p.next;
        }
        return 0;
    }
    static int record(jack_nframes_t n, void *arg) {
        auto &p = *static_cast<Probe *>(arg);
        p.period.store(n, std::memory_order_relaxed);
        auto start = p.begin.load(std::memory_order_acquire);
        if (!start) return 0;
        auto now = jack_last_frame_time(p.capture);
        const auto *l = static_cast<const float *>(jack_port_get_buffer(p.left, n));
        const auto *r = static_cast<const float *>(jack_port_get_buffer(p.right, n));
        for (unsigned i = 0; i < n; ++i) {
            int64_t frame = int64_t(now) + i - start;
            if (frame >= 0 && frame < int64_t(p.l.size())) {
                if (frame != p.expected_frame) ++p.discontinuities;
                p.expected_frame = frame + 1;
                ++p.recorded_frames;
                p.l[frame] = l[i]; p.r[frame] = r[i];
            }
        }
        if (now >= start) p.reached.store(now - start + n, std::memory_order_release);
        return 0;
    }
    static int xrun(void *arg) { ++static_cast<Probe *>(arg)->xruns; return 0; }
    ~Probe() {
        if (sender) { jack_deactivate(sender); jack_client_close(sender); }
        if (capture) { jack_deactivate(capture); jack_client_close(capture); }
    }
};
int main(int argc, char **argv) {
    const bool overload = argc > 1 && !std::strcmp(argv[1], "overload");
    const bool hold = argc > 1 && !std::strcmp(argv[1], "hold");
    const bool capture_only = argc > 1 && !std::strcmp(argv[1], "capture");
    const bool check_free = argc > 1 && !std::strcmp(argv[1], "check-free");
    if (argc > 1 && !overload && !hold && !capture_only && !check_free && std::strcmp(argv[1], "basic")) {
        std::fprintf(stderr, "Usage: jack-probe [basic|overload|hold|capture|check-free] [client=ultra] [capture.f32]\n");
        return 2;
    }
    const char *prefix = argc > 2 ? argv[2] : "ultra";
    if (check_free) {
        jack_status_t status{};
        auto *client = jack_client_open("ultra-probe-preflight", JackNoStartServer, &status);
        if (!client) { std::fprintf(stderr, "Existing JACK server required\n"); return 2; }
        bool occupied = false;
        for (const char *port : {"midi_in", "audio_out_l", "audio_out_r"}) {
            char name[256];
            std::snprintf(name, sizeof name, "%s:%s", prefix, port);
            if (jack_port_by_name(client, name)) {
                std::fprintf(stderr, "Refusing test: existing JACK port %s\n", name);
                occupied = true;
            }
        }
        jack_client_close(client);
        return occupied ? 2 : 0;
    }
    Probe p;
    if (hold) { p.l.resize(144000); p.r.resize(144000); }
    if (overload) {
        p.add(2048, 0x90, 60, 32); p.add(2079, 0x91, 67, 32);
        for (unsigned i = 0; i < 129; ++i) p.add(8192, 0x90, 60, 32);
    } else if (hold) {
        p.add(2048, 0x90, 60, 80); p.add(2079, 0x91, 67, 80);
        p.add(120000, 0xb0, 123, 0); p.add(120000, 0xb1, 123, 0);
    } else if (!capture_only) {
        p.add(2048, 0x90, 60, 80); p.add(2079, 0x91, 67, 80);
        p.add(4096, 0xb1, 64, 127);
        p.add(8192, 0x80, 60, 0); p.add(8192, 0x81, 67, 0);
        p.add(12288, 0xb1, 64, 0);
        p.add(16384, 0x92, 72, 80);
    }
    jack_status_t status{};
    p.sender = jack_client_open("ultra-probe-send", JackNoStartServer, &status);
    p.capture = jack_client_open("ultra-probe-capture", JackNoStartServer, &status);
    if (!p.sender || !p.capture) { std::fprintf(stderr, "Existing JACK server required\n"); return 2; }
    if (jack_get_sample_rate(p.sender) != 48000) return 2;
    p.midi = jack_port_register(p.sender, "events", JACK_DEFAULT_MIDI_TYPE, JackPortIsOutput, 0);
    p.left = jack_port_register(p.capture, "left", JACK_DEFAULT_AUDIO_TYPE, JackPortIsInput, 0);
    p.right = jack_port_register(p.capture, "right", JACK_DEFAULT_AUDIO_TYPE, JackPortIsInput, 0);
    if (!p.midi || !p.left || !p.right) return 2;
    jack_set_process_callback(p.sender, Probe::send, &p);
    jack_set_process_callback(p.capture, Probe::record, &p);
    jack_set_xrun_callback(p.sender, Probe::xrun, &p);
    jack_set_xrun_callback(p.capture, Probe::xrun, &p);
    if (jack_activate(p.capture) || jack_activate(p.sender)) return 2;
    char midi[128], left[128], right[128];
    std::snprintf(midi, sizeof midi, "%s:midi_in", prefix);
    std::snprintf(left, sizeof left, "%s:audio_out_l", prefix);
    std::snprintf(right, sizeof right, "%s:audio_out_r", prefix);
    if ((!capture_only && jack_connect(p.sender, jack_port_name(p.midi), midi)) ||
        jack_connect(p.capture, left, jack_port_name(p.left)) ||
        jack_connect(p.capture, right, jack_port_name(p.right))) {
        std::fprintf(stderr, "Start the real Ultra app before this probe\n"); return 2;
    }
    std::this_thread::sleep_for(std::chrono::milliseconds(200));
    p.begin.store(jack_frame_time(p.sender) + 4800, std::memory_order_release);
    for (unsigned i = 0; p.reached.load() < p.l.size() && i < 600; ++i)
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    // Terminate test notes even when an earlier scheduled release was late.
    if (!capture_only) {
        p.cleanup.store(true, std::memory_order_release);
        for (unsigned i = 0; !p.cleaned.load(std::memory_order_acquire) && i < 20; ++i)
            std::this_thread::sleep_for(std::chrono::milliseconds(10));
        std::this_thread::sleep_for(std::chrono::milliseconds(20));
    }
    jack_deactivate(p.sender); jack_deactivate(p.capture);
    if (argc > 3) {
        FILE *f = std::fopen(argv[3], "wb");
        if (!f) return 2;
        for (unsigned i = 0; i < p.l.size(); ++i) {
            if (std::fwrite(&p.l[i], sizeof(float), 1, f) != 1 ||
                std::fwrite(&p.r[i], sizeof(float), 1, f) != 1) {
                std::fclose(f); return 2;
            }
        }
        if (std::fclose(f)) return 2;
    }
    auto peak = [](const std::vector<float> &v, unsigned begin, unsigned end) {
        float peak = 0;
        for (unsigned i = begin; i < end; ++i) {
            if (!std::isfinite(v[i])) return INFINITY;
            peak = std::max(peak, std::abs(v[i]));
        }
        return peak;
    };
    auto onset = [](const std::vector<float> &v) {
        for (unsigned i = 0; i < v.size(); ++i) if (v[i] != 0) return int(i);
        return -1;
    };
    int a = onset(p.l), b = onset(p.r);
    float a_held = peak(p.l, 9000, 11000), b_held = peak(p.r, 9000, 11000);
    float tail = std::max(peak(p.l, hold ? 140000 : capture_only ? 46000 : 14000, p.l.size()), peak(p.r, hold ? 140000 : capture_only ? 46000 : 14000, p.l.size()));
    bool complete = p.reached.load() >= p.l.size() && p.recorded_frames == p.l.size() && !p.discontinuities;
    bool ok = complete && !p.errors.load() && (capture_only || p.cleaned.load())
        && std::all_of(p.l.begin(), p.l.end(), [](float x) { return std::isfinite(x); })
        && std::all_of(p.r.begin(), p.r.end(), [](float x) { return std::isfinite(x); });
    if (overload) ok = ok && a == 2112 && b == 2143
        && peak(p.l, 5120, 6144) > 1e-5 && peak(p.r, 5120, 6144) > 1e-5
        && peak(p.l, 9000, 48000) == 0 && peak(p.r, 9000, 48000) == 0;
    else if (!hold && !capture_only) ok = ok && a == 2112 && b == 2143 && a_held == 0 && b_held > 1e-5 && tail == 0;
    std::printf("{\"scenario\":\"%s\",\"period\":%u,\"onset_a\":%d,\"onset_b\":%d,\"a_after_off_peak\":%.9g,\"b_sustained_peak\":%.9g,\"tail_peak\":%.9g,\"xruns\":%u,\"send_errors\":%u,\"discontinuities\":%u,\"acquisition_complete\":%s,\"pass\":%s}\n",
        overload ? "overload" : hold ? "hold" : capture_only ? "capture" : "basic", p.period.load(), a, b, a_held, b_held, tail, p.xruns.load(), p.errors.load(), p.discontinuities, complete ? "true" : "false", hold || capture_only ? "null" : ok ? "true" : "false");
    return ok ? 0 : 1;
}
