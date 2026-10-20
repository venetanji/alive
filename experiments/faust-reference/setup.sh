#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p .deps
base=https://github.com/grame-cncm/faust/releases/download/2.88.0
fetch() {
  local name=$1 hash=$2 url=$3
  if [[ ! -f .deps/$name ]]; then curl --fail --location --silent --show-error "$url" -o ".deps/$name"; fi
  echo "$hash  .deps/$name" | sha256sum --check
}
fetch faust.tar.gz e4e175cf236924b5b7d4784cbb8c50cc01e211159e169655dd9e6d8f92b871d9 "$base/faust-2.88.0.tar.gz"
fetch libfaust.zip 7f7784567d8770dfbc1351f53b32dfb4d4c5baef0ba5f39fd925d5407ab63ff2 "$base/libfaust-ubuntu-x86_64.zip"
# Linux x86_64 release compiler. Other platforms require equivalent pinned build.
[[ $(uname -s) == Linux && $(uname -m) == x86_64 ]] || { echo 'Requires Linux x86_64' >&2; exit 1; }
tar -xzf .deps/faust.tar.gz -C .deps
unzip -o .deps/libfaust.zip lib/libfaust.so -d .deps >/dev/null
python3 generate.py
