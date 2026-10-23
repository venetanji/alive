#!/usr/bin/env python3
"""Each original source gets its own fresh prefix and private X server."""
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parent
source = Path('/home/venetanji/.cache/alive-max-list-20261021/wine-disposable')
for fixture in ['isolated-root-shown', 'isolated-nesting']:
    prefix = Path('/home/venetanji/.cache/alive-max-tabs-' + fixture + '-20261022-wine-disposable')
    assert not prefix.exists()
    subprocess.run(['cp', '-a', '--reflink=always', str(source), str(prefix)], check=True)
    subprocess.run(['/usr/bin/python3', str(ROOT / 'run-one.py'), fixture], check=True)
