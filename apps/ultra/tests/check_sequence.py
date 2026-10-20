#!/usr/bin/env python3
"""Native program + explicit fake-JACK ABI integration. NOT physical MIDI sync evidence."""
import ctypes, math, os, pathlib, subprocess, sys, tempfile
root=pathlib.Path(__file__).resolve().parents[1]
class Config(ctypes.Structure):
 _fields_=[(x,ctypes.c_uint32) for x in ['enabled','bpm','root','chord','steps','gate','velocity']]+[('transpose',ctypes.c_int32),('clock_source',ctypes.c_uint32)]
def cfg(**kw):
 values=dict(enabled=1,bpm=120,root=60,chord=0,steps=8,gate=50,velocity=100,transpose=0,clock_source=0);values.update(kw);return Config(**values)
if sys.argv[1:]==['--adapter']:
 audio=ctypes.CDLL(str(root/'build/libultra_native.so'),mode=ctypes.RTLD_GLOBAL);jack=ctypes.CDLL('libjack.so.0')
 audio.ultra_audio_sequence.argtypes=[ctypes.POINTER(Config)];audio.ultra_sequence_ticks.restype=ctypes.c_uint64
 jack.ultra_fake_left.restype=jack.ultra_fake_right.restype=ctypes.POINTER(ctypes.c_float)
 def configure(**kw):return audio.ultra_audio_sequence(ctypes.byref(cfg(**kw)))
 def step(n=64):
  jack.ultra_fake_step_frames(n);l=list(jack.ultra_fake_left()[:n]);r=list(jack.ultra_fake_right()[:n]);assert all(math.isfinite(x) for x in l+r);return l,r
 def render(n=12000):
  l,r=[],[]
  while n: k=min(n,1024);a,b=step(k);l+=a;r+=b;n-=k
  return l,r
 def midi(time,status,note=0,value=0):assert jack.ultra_fake_midi(time,status,note,value,1 if status>=0xf8 else 3)
 audio.ultra_audio_routes(3);assert audio.ultra_audio_start()==1
 try:
  # Route retirement and MIDI CC120 are hard cleanup even with a one-second release.
  assert not audio.ultra_audio_event(0,8,0,0), 'HardClear is internal, not a public UI event'
  assert audio.ultra_audio_event(0,7,0,127);assert audio.ultra_audio_event(0,0,45,100);render(256)
  audio.ultra_audio_routes(2);audio.ultra_audio_routes(3);l,r=render(1024)
  assert not any(l[128:]), 'Disconnected long-release voice revived on reconnect'
  assert audio.ultra_audio_event(0,0,45,100);render(256);midi(0,0xb0,123,0);l,r=render(1024)
  assert any(l[128:]), 'CC123 AllNotesOff must retain the musical release'
  midi(0,0xb0,120,0);l,r=render(256);assert not any(l[128:]), 'CC120 must clear long-release sound immediately'
  assert audio.ultra_audio_event(0,7,0,0)
  assert not configure(bpm=0);assert not configure(root=128);assert not configure(clock_source=2)
  assert audio.ultra_audio_event(0,0,45,100);assert audio.ultra_audio_event(0,2,0,127)
  assert configure();assert not audio.ultra_audio_event(0,0,60,100), 'A must be reserved as soon as config is accepted'
  assert audio.ultra_audio_event(1,0,67,100);l,r=render(13000);assert any(l) and any(r)
  assert audio.ultra_sequence_enabled()==1 and audio.ultra_sequence_ticks()==3 and audio.ultra_sequence_step()==2
  # B-only route edits must not reset or stop A's program.
  ticks=audio.ultra_sequence_ticks();audio.ultra_audio_routes(1);render(6000)
  assert audio.ultra_sequence_enabled() and audio.ultra_sequence_ticks()==ticks+1
  audio.ultra_audio_routes(3);assert audio.ultra_audio_event(1,0,67,100);render(64)
  # A physical manual Off/All sustain must not cross-release the sequencer; B remains playable.
  midi(0,0x80,67);midi(1,0xb0,64,127);step();assert audio.ultra_sequence_enabled()==1
  assert configure(enabled=0);l,r=render(12000);assert not any(l[1000:]) and any(r[1000:]);assert audio.ultra_sequence_note()==128
  ticks=audio.ultra_sequence_ticks();render();assert audio.ultra_sequence_ticks()==ticks and not audio.ultra_sequence_enabled()
  # Every reconfiguration drops old note/future schedule and starts at the new root.
  assert configure(root=72);step();assert audio.ultra_sequence_note()==72 and audio.ultra_sequence_ticks()==1
  assert configure(root=48,chord=1);step();assert audio.ultra_sequence_note()==48 and audio.ultra_sequence_ticks()==1
  audio.ultra_audio_routes(2);audio.ultra_audio_routes(3);l,r=render();assert not audio.ultra_sequence_enabled() and not any(l[1000:]) and any(r[1000:])
  assert configure();step();assert audio.ultra_audio_event(0,4,0,0);l,r=render();assert not audio.ultra_sequence_enabled() and not any(l[1000:])
  # External realtime bytes preserve JACK offsets and require explicit FA/FB.
  assert configure(clock_source=1);render();assert audio.ultra_sequence_ticks()==0
  midi(5,0xfa);midi(23,0xf8);step();assert audio.ultra_sequence_note()==60 and audio.ultra_sequence_ticks()==1
  l,r=render();assert next(i for i,x in enumerate(l) if x)==23, "MIDI F8 must retain its exact JACK offset plus declared64-frame delay";assert not any(l[7000:]) and audio.ultra_sequence_note()==128, 'Missing F8 must not leave a held gate'
  for i in range(6):midi(0,0xf8);step()
  assert audio.ultra_sequence_ticks()==2 and audio.ultra_sequence_step()==1
  midi(17,0xfc);step();ticks=audio.ultra_sequence_ticks();midi(0,0xf8);render();assert audio.ultra_sequence_ticks()==ticks and audio.ultra_sequence_note()==128
  midi(0,0xfb);midi(1,0xf8);step();assert audio.ultra_sequence_step()==2
  midi(0,0xfa);midi(1,0xf8);step();assert audio.ultra_sequence_step()==0 and audio.ultra_sequence_ticks()==1
  midi(0,0xb0,120,0);l,r=render(256);assert not audio.ultra_sequence_enabled() and not any(l[128:]), 'CC120 must cancel future sequence notes'
  # Panic and restart clear pending commands and do not automatically restart the program.
  audio.ultra_audio_panic();l,r=step();assert not any(l+r) and not audio.ultra_sequence_enabled()
  audio.ultra_audio_stop();assert audio.ultra_audio_start()==1;l,r=render();assert not any(l+r) and not audio.ultra_sequence_enabled()
  assert configure();audio.ultra_audio_stop();assert audio.ultra_audio_start()==1;l,r=render();assert not any(l+r) and not audio.ultra_sequence_enabled()
  assert configure();step();
  for i in range(129):midi(0,0xf8)
  l,r=step();assert audio.ultra_audio_flags()&4 and not any(l+r) and not audio.ultra_sequence_enabled()
  # Real Engine output, not only abstract event traces, is partition invariant.
  def partitioned(pattern):
   audio.ultra_audio_stop();assert audio.ultra_audio_start()==1;assert configure(bpm=123)
   output=[];position=0;index=0
   while position<24000:
    n=min(pattern[index%len(pattern)],24000-position);l,r=step(n);output.extend(l);position+=n;index+=1
   assert audio.ultra_audio_flags()==3
   return output
  assert partitioned([64])==partitioned([1,7,31,128,511,1024]), 'Native audio changed with callback partitions'
  def ownership_score(held_manual):
   audio.ultra_audio_stop();assert audio.ultra_audio_start()==1
   assert audio.ultra_audio_event(0,7,0,127)
   if held_manual:
    assert audio.ultra_audio_event(0,0,45,100);assert audio.ultra_audio_event(0,2,0,127)
   render(256);assert configure(root=72);l,r=render(2048);return l[64:]
  assert ownership_score(False)==ownership_score(True), 'Sequence ownership inherited a sustained long-release manual voice'

 finally:audio.ultra_audio_stop()
 print('PASS: real native adapter sequence, A reservation/B isolation, config/route/AllOff/Panic/restart, external transport and clock-loss termination, ingress overflow')
 raise SystemExit(0)
with tempfile.TemporaryDirectory(prefix='ultra-sequence-') as d:
 path=pathlib.Path(d)
 subprocess.run(['c++','-std=c++20','-Wall','-Wextra','-Werror',str(root/'tests/sequence_test.cpp'),'-o',str(path/'sequence-test')],check=True)
 subprocess.run([str(path/'sequence-test')],check=True)
 include=os.environ.get('JACK_INCLUDE','/usr/include')
 if not pathlib.Path(include,'jack/jack.h').exists():raise SystemExit('Set JACK_INCLUDE to the directory containing official JACK headers')
 subprocess.run(['c++','-shared','-fPIC','-I'+include,str(root/'tests/fake_jack.cpp'),'-o',str(path/'libjack.so.0')],check=True)
 env=os.environ.copy();env.update(LD_LIBRARY_PATH=d,FAKE_MANUAL='1')
 subprocess.run([sys.executable,__file__,'--adapter'],env=env,check=True)
