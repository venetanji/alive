#!/usr/bin/env python3
"""Explicit JACK ABI test double. NOT real JACK, hardware, concurrency or deadline evidence."""
import array, ctypes, math, os, pathlib, subprocess, sys, tempfile
root=pathlib.Path(__file__).resolve().parents[1]
if sys.argv[1:]==['--controls']:
 audio=ctypes.CDLL(str(root/'build/libultra_native.so'),mode=ctypes.RTLD_GLOBAL)
 jack=ctypes.CDLL('libjack.so.0')
 jack.ultra_fake_left.restype=jack.ultra_fake_right.restype=ctypes.POINTER(ctypes.c_float)
 def render():
  left,right=[],[]
  for _ in range(4):
   jack.ultra_fake_step()
   left.extend(jack.ultra_fake_left()[:64]);right.extend(jack.ultra_fake_right()[:64])
  assert all(math.isfinite(x) for x in left+right)
  assert audio.ultra_audio_flags()==3, 'Route edits must not fault the engine'
  return left,right
 audio.ultra_audio_routes(3)
 assert audio.ultra_audio_start()==1
 try:
  assert audio.ultra_audio_event(0,0,60,100)==1
  assert audio.ultra_audio_event(1,0,67,100)==1
  left,right=render();assert any(left) and any(right)
  audio.ultra_audio_routes(2);audio.ultra_audio_routes(3)
  assert audio.ultra_audio_event(0,0,72,100)==1
  left,right=render()
  assert any(left[128:]), 'Cleanup canceled a fresh UI press after reconnect'
  assert audio.ultra_audio_event(0,1,72,0)==1
  left,right=render()
  assert not any(left[128:]), 'Old A note survived disconnect/reconnect'
  assert any(right[128:]), 'Route cleanup silenced B'
  # An old UI press still in ingress must also be retired while disconnected.
  assert audio.ultra_audio_event(0,0,65,100)==1
  audio.ultra_audio_routes(2)
  left,right=render();assert not any(left) and any(right)
  audio.ultra_audio_routes(3)
  left,right=render()
  assert not any(left) and any(right), 'Reconnect revived a queued old UI press'
  # Rejecting termination must mute both devices, then discard queued work.
  for _ in range(64):assert audio.ultra_audio_event(0,0,60,100)==1
  assert audio.ultra_audio_event(1,1,67,0)==0
  assert audio.ultra_audio_flags()&4
  jack.ultra_fake_step()
  assert not any(jack.ultra_fake_left()[:64]+jack.ultra_fake_right()[:64])
  audio.ultra_audio_stop()
  assert audio.ultra_audio_start()==1
  left,right=render();assert not any(left+right), 'Queued notes survived restart'
  assert audio.ultra_audio_event(0,0,60,100)==1
  audio.ultra_audio_stop();assert audio.ultra_audio_start()==1
  left,right=render();assert not any(left+right), 'Undrained UI notes survived restart'
  audio.ultra_audio_panic();audio.ultra_audio_stop()
  os.environ['FAKE_RATE']='44100'
  assert audio.ultra_audio_start()==0
  audio.ultra_audio_error.restype=ctypes.c_char_p
  assert b'48,000 Hz' in audio.ultra_audio_error(), 'Old panic hides new startup failure'
  assert audio.ultra_audio_flags()==0, 'Stopped audio still reports an active fault'
 finally:
  audio.ultra_audio_stop()
 print('PASS: route ordering, fresh UI presses, B isolation, FIFO overflow, stopped cleanup and current recovery errors')
 raise SystemExit(0)
include=os.environ.get('JACK_INCLUDE','/usr/include')
if not pathlib.Path(include,'jack/jack.h').exists():raise SystemExit('Set JACK_INCLUDE to official JACK2 1.9.22 headers (parent directory of jack/). App itself needs no JACK headers.')
with tempfile.TemporaryDirectory(prefix='ultra-test-double-') as d:
 p=pathlib.Path(d)
 subprocess.run(['c++','-shared','-fPIC','-I'+include,str(root/'tests/fake_jack.cpp'),'-o',str(p/'libjack.so.0')],check=True)
 def run(extra,code):
  env=os.environ.copy();env.update(LD_LIBRARY_PATH=d,FAKE_CAPTURE=str(p/'capture.f32'));env.update(extra)
  result=subprocess.run([str(root/'build/ultra-diagnostic'),'--run-seconds','1'],env=env,capture_output=True,text=True)
  assert result.returncode==code,(result.returncode,result.stdout,result.stderr)
  return result
 normal=run({},0)
 a=array.array('f');a.frombytes((p/'capture.f32').read_bytes());assert len(a)==4096 and all(math.isfinite(x) for x in a)
 left,right=a[::2],a[1::2]
 assert next(i for i,x in enumerate(left) if x)==64
 assert next(i for i,x in enumerate(right) if x)==95
 assert max(i for i,x in enumerate(left) if x)==590
 assert max(i for i,x in enumerate(right) if x)==846
 assert all(x==0 for x in left[600:]) and any(x!=0 for x in right[600:750])
 assert all(x==0 for x in right[900:])
 run({'FAKE_ROUTE_RACE':'1'},0)
 a=array.array('f');a.frombytes((p/'capture.f32').read_bytes())
 assert all(x==0 for x in a[400::2]), 'A note admitted before disconnect rearmed after reconnect'
 assert any(x!=0 for x in a[400:1500][1::2]), 'A route cleanup silenced B'
 overloaded=run({'FAKE_OVERLOAD':'1'},1);assert 'flags=7' in overloaded.stdout
 a=array.array('f');a.frombytes((p/'capture.f32').read_bytes());assert all(x==0 for x in a[1024:])
 run({'FAKE_RATE':'44100'},2);run({'FAKE_PERIOD':'2048'},2)
 env=os.environ.copy();env.update(LD_LIBRARY_PATH=d,FAKE_MANUAL='1')
 subprocess.run([sys.executable,__file__,'--controls'],env=env,check=True)
 print('PASS: explicit fake-JACK adapter tests (NOT real JACK/hardware execution)')
