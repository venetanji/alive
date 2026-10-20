#!/usr/bin/env bash
# Linux offline probe. Fetch official source only; no installation/system changes.
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$PWD"
mkdir -p build
cd build
LIBPD=ba0dc63262901d658af8bbda5e619a60fa975e78
PD=f009fd8d7b537e209e09898d487fdf1bf547da2b
fetch() { if [ ! -f "$2" ]; then curl --fail --location --silent --show-error "$1" -o "$2"; fi; }
fetch "https://codeload.github.com/libpd/libpd/tar.gz/$LIBPD" libpd.tar.gz
fetch "https://codeload.github.com/pure-data/pure-data/tar.gz/$PD" pd.tar.gz
printf '%s\n' \
 '7432b9108d6741f8ca5fd786ce83ed391d92b5197e93fd3762a5e81ae663095d  libpd.tar.gz' \
 '29ad07f1f13dd199e2ebcd3c486dca4c496e4874dd856c925dc3891e11e58267  pd.tar.gz' | sha256sum --check
if [ ! -d "libpd-$LIBPD" ]; then tar -xzf libpd.tar.gz; fi
if [ ! -f "libpd-$LIBPD/pure-data/src/m_pd.h" ]; then
 tar -xzf pd.tar.gz
 cp -a "pure-data-$PD/." "libpd-$LIBPD/pure-data/"
fi
make -C "libpd-$LIBPD" -j"${JOBS:-4}" MULTI=true UTIL=false EXTRA=false > upstream-build.log 2>&1
c++ -std=c++17 -O2 -Wall -Wextra \
 -I"libpd-$LIBPD/libpd_wrapper" -I"libpd-$LIBPD/pure-data/src" \
 "$ROOT/probe.cpp" -L"libpd-$LIBPD/libs" \
 -Wl,-rpath,"$ROOT/build/libpd-$LIBPD/libs" -lpd -o probe
python3 "$ROOT/check.py"
