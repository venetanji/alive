#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$PWD"; D="$ROOT/.deps"; mkdir -p "$D"
fetch() {
 local url="$1" path="$2" sum="$3"
 [ -f "$path" ] || curl --fail --location --silent --show-error "$url" -o "$path"
 echo "$sum  $path" | sha256sum --check --status
}
# Official release binaries, installed in this ignored experiment directory only.
fetch https://github.com/Kitware/CMake/releases/download/v3.31.6/cmake-3.31.6-linux-x86_64.tar.gz "$D/cmake.tar.gz" 5a1133ff103c71eb5120e2cc3de922733e7d8a26a98ae716397e8676adb367bf
[ -x "$D/cmake-3.31.6-linux-x86_64/bin/cmake" ] || tar xzf "$D/cmake.tar.gz" -C "$D"
fetch https://static.rust-lang.org/dist/rust-1.85.1-x86_64-unknown-linux-gnu.tar.xz "$D/rust.tar.xz" 912c76f602f5f630138fca2388b2688c2c1aabcf823d71890b2b9155f743792e
if [ ! -x "$D/rust/bin/cargo" ]; then
 tar xf "$D/rust.tar.xz" -C "$D"
 "$D/rust-1.85.1-x86_64-unknown-linux-gnu/install.sh" --prefix="$D/rust" --disable-ldconfig --components=rustc,rust-std-x86_64-unknown-linux-gnu,cargo
fi
REV=94b67500c96e105491682ec68741b5018560eab7
fetch "https://codeload.github.com/samaaron/clockwork/tar.gz/$REV" "$D/clockwork.tar.gz" 09063eee6323b656dbe65258955d5387e5053829c9324afe16b257fca04d07ca
[ -f "$D/clockwork-$REV/CMakeLists.txt" ] || tar xzf "$D/clockwork.tar.gz" -C "$D"
echo "1cad43e702066ecb5a1659b7906306f513d71c5b88b6711323ece88b6458c20c  $D/clockwork-$REV/rust/Cargo.lock" | sha256sum --check --status
# Exactly the reference's generated DSP and architecture headers, not another Faust version.
if [ ! -f ../faust-reference/.deps/faust-2.88.0/architecture/faust/dsp/dsp.h ]; then
 (cd ../faust-reference && bash setup.sh)
fi
export PATH="$D/cmake-3.31.6-linux-x86_64/bin:$D/rust/bin:$PATH"
export CARGO_HOME="$D/cargo"
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
# Build the actual embedding consumer, not unused Clockwork comms applications.
# Upstream always uses cargo --locked; keep the real timed store enabled.
cmake --build build --target probe -j "${JOBS:-4}"
