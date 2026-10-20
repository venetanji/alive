#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
bash setup.sh
python3 check.py
