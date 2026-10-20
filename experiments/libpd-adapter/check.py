#!/usr/bin/env python3
"""Black-box contract checks; fails until the real executable exists and passes."""
import pathlib, subprocess
root=pathlib.Path(__file__).resolve().parent
exe=root/'build/probe'
assert exe.exists(), 'missing real libpd probe'
result=subprocess.run([str(exe),str(root)],capture_output=True,text=True)
print(result.stdout,end='')
print(result.stderr,end='')
assert result.returncode==0, f'probe exit {result.returncode}'
for check in ['isolation','tick_events','input_delay','partitions','replacement','burst','signal']:
    assert f'PASS {check}' in result.stdout, f'missing assertion group: {check}'
