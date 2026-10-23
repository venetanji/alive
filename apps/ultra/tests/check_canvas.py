#!/usr/bin/env python3
"""Actual native graph + explicit fake-JACK ABI checks, not physical JACK evidence."""
import ctypes as C, math, os, pathlib, subprocess, sys, tempfile
root = pathlib.Path(__file__).resolve().parents[1]
class Node(C.Structure):
    _fields_ = [(k,C.c_uint32) for k in ('id','kind','device','count')] + [(k,C.c_double) for k in ('p0','p1','p2','p3','p4','p5')] + [('text',C.c_char*128)]
class Edge(C.Structure):
    _fields_ = [(k,C.c_uint32) for k in ('from_','outlet','to','inlet')]
class Graph(C.Structure):
    _fields_ = [('revision',C.c_uint64),('node_count',C.c_uint32),('edge_count',C.c_uint32),('nodes',Node*32),('edges',Edge*64)]
class Observation(C.Structure):
    _fields_ = [('id',C.c_uint32),('reserved',C.c_uint32),('value',C.c_double),('pulses',C.c_uint64)]
class Status(C.Structure):
    _fields_ = [('revision',C.c_uint64),('node_count',C.c_uint32),('active',C.c_uint32),('nodes',Observation*32)]
def graph(revision, mapping=(0,1), program=False):
    g=Graph();g.revision=revision
    nodes=[Node(1,11,0,0,0,0,0),Node(2,11,1,0,0,0,0),Node(3,12,0,0,90,0,0),Node(4,12,0,0,90,0,0),Node(5,13),Node(6,14),Node(7,10,0,0,16),Node(8,10,0,0,1)]
    edges=[Edge(1,0,3,0),Edge(2,0,4,0),Edge(5,0,6,0),Edge(7,0,1,0),Edge(8,0,2,0)]
    for channel,device in enumerate(mapping):
        if device is not None: edges.append(Edge(device+3,0,5,channel))
    if program:
        nodes += [Node(9,3),Node(10,6,0,0,20.5),Node(11,7,0,0,8),Node(12,8,0,0,48),Node(13,9,0,0,100,10.25)]
        edges += [Edge(9,0,10,0),Edge(10,0,11,0),Edge(11,0,12,0),Edge(12,0,13,0),Edge(13,0,1,0)]
    g.node_count=len(nodes);g.edge_count=len(edges)
    for i,n in enumerate(nodes):g.nodes[i]=n
    for i,e in enumerate(edges):g.edges[i]=e
    return g
if sys.argv[1:]==['--adapter']:
    audio=C.CDLL(str(root/'build/libultra_native.so'),mode=C.RTLD_GLOBAL);jack=C.CDLL('libjack.so.0')
    audio.ultra_canvas_install.argtypes=[C.POINTER(Graph)]
    audio.ultra_canvas_event.argtypes=[C.c_uint64,C.c_uint32,C.c_uint32,C.c_uint32,C.POINTER(C.c_double)]
    audio.ultra_canvas_param.argtypes=[C.c_uint64,C.c_uint32,C.c_uint32,C.c_double]
    audio.ultra_canvas_status.argtypes=[C.POINTER(Status)]
    jack.ultra_fake_left.restype=jack.ultra_fake_right.restype=C.POINTER(C.c_float)
    revision=0
    def install(mapping=(0,1),program=False):
        global revision
        revision+=1;g=graph(revision,mapping,program);assert audio.ultra_canvas_install(C.byref(g));return g
    def event(node,values=(),inlet=0,rev=None):
        v=(C.c_double*len(values))(*values)
        return audio.ultra_canvas_event(revision if rev is None else rev,node,inlet,len(values),v)
    def param(node,index,value):return audio.ultra_canvas_param(revision,node,index,value)
    def status():
        s=Status();audio.ultra_canvas_status(C.byref(s));return s
    def step(n=64):
        jack.ultra_fake_step_frames(n);l=list(jack.ultra_fake_left()[:n]);r=list(jack.ultra_fake_right()[:n]);assert all(math.isfinite(x) for x in l+r);return l,r
    def render(n=1024,parts=(1024,)):
        left,right=[],[];i=0
        while n:
            k=min(n,parts[i%len(parts)]);l,r=step(k);left+=l;right+=r;n-=k;i+=1
        return left,right
    def midi(time,status,note,value):assert jack.ultra_fake_midi(time,status,note,value,3)
    audio.ultra_audio_routes(3)
    install();assert status().active and status().revision==revision
    assert audio.ultra_audio_start()
    try:
        # Wire rewrites use real device buses, including swap, duplicate and silence.
        assert event(1,(60,100));l,r=render();assert any(l) and not any(r)
        old=revision;install((1,0));assert not event(1,(60,100),rev=old)
        assert event(1,(60,100));l,r=render();assert not any(l) and any(r[64:]) and not any(r[:64])
        install((0,0));assert event(1,(60,100));l,r=render();assert l==r and any(l)
        install((None,1));assert event(1,(60,100));l,r=render();assert not any(l+r)
        assert event(2,(67,100));l,r=render();assert not any(l) and any(r)
        # Gain parameter updates change the sounding voice without replacing it.
        stable_revision=status().revision;assert param(4,0,0);l,r=render();assert not any(l+r[128:]) and status().revision==stable_revision
        assert param(4,0,127);l,r=render();assert any(r[128:]) and status().revision==stable_revision
        # Invalid edits retain the valid graph and sound; revision not consumed.
        invalid=graph(revision+1);invalid.edges[0]=Edge(3,0,3,0)
        assert not audio.ultra_canvas_install(C.byref(invalid));l,r=render();assert status().revision==revision and any(r)
        assert not param(1,2,1) and not param(7,0,1)
        # MIDI channel16 drives graph voice A only; legacy channel1 no longer routes A.
        install();render();midi(5,0x9f,60,100);l,r=render(256,parts=(64,));assert next(i for i,x in enumerate(l) if x)==69 and not any(r)
        midi(0,0x8f,60,0);render(256);midi(11,0x90,67,100);l,r=render(256,parts=(64,));assert not any(l) and any(r)
        audio.ultra_canvas_stop();l,r=render(256);assert not any(l+r)
        # Native controls actually dispatch message -> arithmetic -> note creation.
        revision+=1;g=graph(revision)
        extra=[Node(9,0),Node(10,1,0,1,20),Node(11,4,0,0,10),Node(12,5,0,0,2),Node(13,9,0,0,100,10)]
        for n in extra:g.nodes[g.node_count]=n;g.node_count+=1
        for e in [Edge(9,0,10,0),Edge(10,0,11,0),Edge(11,0,12,0),Edge(12,0,13,0),Edge(13,0,1,0)]:g.edges[g.edge_count]=e;g.edge_count+=1
        assert audio.ultra_canvas_install(C.byref(g));assert event(9);l,r=render(1024);assert any(l[64:544]) and not any(l[700:]) and not any(r)
        observations={n.id:n for n in status().nodes[:status().node_count]};assert observations[12].value==60 and observations[12].pulses==1
        # Timeline, real audio, and delayed note-offs remain partition invariant.
        def score(parts):
            audio.ultra_audio_stop();install(program=True);assert audio.ultra_audio_start();assert event(9)
            l,r=render(24000,parts);assert audio.ultra_audio_flags()==3 and not any(r);return l
        assert score((64,))==score((1,7,31,128,511,1024))
        # Param does not reset counter/metro: original next deadline is984 frames.
        audio.ultra_audio_stop();install(program=True);assert audio.ultra_audio_start();assert event(9);render(500)
        assert param(10,0,40);render(484);s=status();obs={n.id:n for n in s.nodes[:s.node_count]};assert obs[11].pulses==1
        step(1);s=status();obs={n.id:n for n in s.nodes[:s.node_count]};assert obs[11].pulses==2 and obs[11].value==1
        audio.ultra_canvas_stop();l,r=render(5000);s=status();obs={n.id:n for n in s.nodes[:s.node_count]};assert not any(l+r) and obs[9].value==0
        # A replaced makenote timer cannot release a new graph's same pitch.
        install(program=True);assert event(13,(60,));render(128);install();assert event(1,(60,100));l,r=render(5000);assert any(l[-1000:])
        # Disconnect and reconnect with long release must not revive old tails.
        assert param(1,1,127);assert event(1,(64,100));render(128);install((None,None));render(128);install();l,r=render(2048);assert not any(l+r)
        # Stop/start preserves the graph but does not replay queued notes or metro.
        install(program=True);assert event(9);audio.ultra_audio_stop();assert status().active
        assert audio.ultra_audio_start();l,r=render(5000);assert not any(l+r) and status().revision==revision
        # Explicit legacy routes exit canvas even when mask is unchanged.
        audio.ultra_audio_routes(3);render();assert not status().active
        assert audio.ultra_audio_event(0,0,60,100);l,r=render();assert any(l)
        # JACK shutdown can mark running=false before the engine is torn down.
        # Stop remains fail-closed without mutating callback-owned graph state.
        install(program=True);render();assert event(9);render(128)
        jack.ultra_fake_shutdown();assert audio.ultra_audio_flags()&8
        audio.ultra_canvas_stop();l,r=step();assert not any(l+r)
        assert not event(1,(60,100))
        audio.ultra_audio_stop();assert audio.ultra_audio_start();l,r=render();assert not any(l+r)
        # Overloaded note termination uses scoped stop, cancelling queued starts.
        install();render();assert event(1,(60,100));render()
        for _ in range(64):assert event(1,(60,100))
        assert event(1,(60,0));assert not audio.ultra_audio_flags()&4
        l,r=render();assert not any(l+r)
        assert event(1,(60,100));l,r=render();assert any(l)
        audio.ultra_audio_stop();assert audio.ultra_audio_start();l,r=render();assert not any(l+r)
    finally:audio.ultra_audio_stop()
    print('PASS: real Engine canvas rewires/swap/duplicate/silence, bounded publication, MIDI, messages/math, sample timers, no-reset params, stale generation, stop/restart and fail-closed overflow')
    raise SystemExit(0)
with tempfile.TemporaryDirectory(prefix='ultra-canvas-') as d:
    p=pathlib.Path(d)
    subprocess.run(['c++','-std=c++17','-O2','-Wall','-Wextra','-Werror',str(root/'tests/patch_graph_test.cpp'),'-o',str(p/'patch-graph-test')],check=True)
    subprocess.run([str(p/'patch-graph-test')],check=True)
    include=os.environ.get('JACK_INCLUDE','/usr/include')
    if not pathlib.Path(include,'jack/jack.h').exists():raise SystemExit('Set JACK_INCLUDE to the directory containing official JACK headers')
    subprocess.run(['c++','-shared','-fPIC','-I'+include,str(root/'tests/fake_jack.cpp'),'-o',str(p/'libjack.so.0')],check=True)
    env=os.environ.copy();env.update(LD_LIBRARY_PATH=d,FAKE_MANUAL='1')
    subprocess.run([sys.executable,__file__,'--adapter'],env=env,check=True)
