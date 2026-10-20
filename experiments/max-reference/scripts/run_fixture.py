#!/usr/bin/env python3
"""Open one original probe in a deliberately disposable prefix; monitor completion.

Does not activate/authorize Max, edit preferences, force-close applications, or
reuse an existing Max process. Close the disposable Max normally between runs.
"""
import argparse,json,os,subprocess,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ap=argparse.ArgumentParser();ap.add_argument('fixture');ap.add_argument('--wine',required=True,type=Path);ap.add_argument('--prefix',required=True,type=Path);ap.add_argument('--max-exe',default=r'C:\ProgramData\Ableton\Live 12 Suite\Resources\Max\Max.exe');ap.add_argument('--display',required=True);ap.add_argument('--timeout',type=float,default=120);args=ap.parse_args()
p=ROOT/'fixtures'/(args.fixture+'.maxpat');score=ROOT/'fixtures'/(args.fixture+'.score.json');assert p.is_file() and score.is_file()
assert args.prefix.is_dir() and args.prefix.name not in ['.wine','.wine-ableton'],'Use an explicitly disposable copy of the prefix'
# Refuse to send this fixture into a preexisting Max instance in the same prefix.
for proc in Path('/proc').glob('[0-9]*'):
 try:
  env=proc.joinpath('environ').read_bytes().split(b'\0');comm=proc.joinpath('comm').read_text().strip().lower()
  if comm.startswith('max') and ('WINEPREFIX='+str(args.prefix.resolve())).encode() in env:
   raise SystemExit('Close the disposable Max instance before running another fixture')
 except (PermissionError,FileNotFoundError,ProcessLookupError):pass
out=ROOT/'results'/(args.fixture+'.jsonl')
if out.exists():out.unlink() # Generated output only; fixture inputs are never modified.
env=dict(os.environ,WINEPREFIX=str(args.prefix.resolve()),WINEDEBUG='-all',DISPLAY=args.display,WAYLAND_DISPLAY='')
process=subprocess.Popen([str(args.wine),args.max_exe,'Z:'+str(p).replace('/','\\')],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
start=time.monotonic()
while time.monotonic()-start<args.timeout:
 if out.exists():
  try:
   rows=[json.loads(x) for x in out.read_text().splitlines()]
   if rows and rows[-1]['selector']=='complete':
    print(json.dumps({'fixture':args.fixture,'status':'executed','events':len(rows),'elapsed_wall_s':round(time.monotonic()-start,3)}));break
  except (ValueError,KeyError):pass
 if process.poll() is not None and process.returncode!=0:raise SystemExit('Max launch failed; inspect the disposable Max log')
 time.sleep(.2)
else:raise SystemExit('Timed out without complete evidence; no application was force-closed. Inspect the disposable Max log.')
