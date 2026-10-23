#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
ROOT=$PWD
PD=../libpd-adapter/build/libpd-ba0dc63262901d658af8bbda5e619a60fa975e78
FAUST=../faust-reference
# Existing pinned dependencies are read-only inputs; bootstrap separately if absent.
[[ -f "$PD/libs/libpd.so" && -f "$FAUST/generated/voice.hpp" ]] || { echo 'Run ../libpd-adapter/run.sh and ../faust-reference/setup.sh first.' >&2; exit 1; }
mkdir -p build/externals/cyclone
rm -f build/results.json
CYCLONE=build/pd-cyclone-cyclone_0.9.4
[[ -f build/cyclone.tar.gz ]] || curl -fLsS https://codeload.github.com/porres/pd-cyclone/tar.gz/refs/tags/cyclone_0.9.4 -o build/cyclone.tar.gz
echo '4194fab4abbdf2d29d7645f2613dd420bfd9ef56e4a8dc2f3d66d06c5c2c3779  build/cyclone.tar.gz' | sha256sum -c
[[ -d $CYCLONE ]] || tar xzf build/cyclone.tar.gz -C build
python3 verify_inputs.py
for obj in gate split; do cc -O2 -fPIC -shared -DPDINSTANCE -DPDTHREADS -I"$PD/pure-data/src" -I"$CYCLONE/shared" "$CYCLONE/cyclone_objects/binaries/control/$obj.c" -o "build/externals/cyclone/$obj.pd_linux"; done
cc -O2 -fPIC -shared -DPDINSTANCE -DPDTHREADS -I"$PD/pure-data/src" -I"$CYCLONE/shared" "$CYCLONE/cyclone_objects/binaries/audio/clip.c" -o 'build/externals/cyclone/clip~.pd_linux'
CXXFLAGS=(-std=c++17 -O2 -DPDINSTANCE -DPDTHREADS -I"$PD/pure-data/src" -I"$FAUST/.deps/faust-2.88.0/architecture" -I"$PD/libpd_wrapper")
c++ "${CXXFLAGS[@]}" -fPIC -shared voice_external.cpp -o 'build/externals/alivevoice~.pd_linux'
c++ "${CXXFLAGS[@]}" test.cpp -L"$PD/libs" -Wl,-rpath,"$ROOT/$PD/libs" -lpd -o build/probe
python3 check.py
