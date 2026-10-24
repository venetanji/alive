#!/usr/bin/env python3
"""Finite-run measurement helpers; recorder supervision survives sampler stalls."""
import atexit
import hashlib
import json
import os
from pathlib import Path
import resource
import selectors
import shutil
import signal
import subprocess
import sys
import time

MAX_WALL = 2700
MAX_AUDIO = 1 << 30
MAX_METADATA = 64 << 20
MAX_STDERR = 1 << 20
MAX_PROCESSES = 64
MAX_IDENTITIES = 256
RESERVE = 256 << 20


def parse_stat(text):
    left, right = text.index('('), text.rindex(')')
    f = text[right + 1:].split()
    return {'pid': int(text[:left]), 'comm': text[left + 1:right], 'state': f[0],
            'ppid': int(f[1]), 'ticks': int(f[11]) + int(f[12]), 'starttime': int(f[19])}


class CpuTracker:
    def __init__(self, hz=None):
        self.hz = hz if hz is not None else os.sysconf('SC_CLK_TCK')
        self.previous, self.identities = {}, set()

    def update(self, processes, now):
        present, deltas, new = {}, [], []
        for item in processes:
            key = (item['pid'], item['starttime'])
            previous = self.previous.get(key)
            current = {**item, 'monotonic': now, 'cpu_percent': None, 'cpu_seconds': None}
            if previous and now > previous['monotonic'] and item['ticks'] >= previous['ticks']:
                seconds = (item['ticks'] - previous['ticks']) / self.hz
                current.update(cpu_seconds=seconds, cpu_percent=100 * seconds / (now - previous['monotonic']))
                deltas.append(current['cpu_percent'])
            else:
                new.append(list(key))
            present[key] = current
            self.identities.add(key)
        if len(self.identities) > MAX_IDENTITIES: raise RuntimeError('process_identity_limit')
        missing = [value for key, value in self.previous.items() if key not in present]
        self.previous = present
        return {'cpu_percent': sum(deltas) if deltas else None, 'cpu_coverage': 'observed identities only; transient workers can be missed',
                'coverage_gap': bool(missing or new), 'new': new, 'missing': missing,
                'processes': list(present.values()), 'clock_ticks_per_second': self.hz}


class ProcessSampler:
    def __init__(self, root, proc=Path('/proc')):
        self.root, self.proc, self.cpu, self.tracked = root, proc, CpuTracker(), set()

    def sample(self):
        begin = time.monotonic()
        entries, gaps = {}, []
        for path in self.proc.iterdir():
            if not path.name.isdigit(): continue
            try: entries[int(path.name)] = parse_stat((path/'stat').read_text())
            except (OSError, ValueError, IndexError): gaps.append(int(path.name))
        descendants = {self.root}
        while True:
            expanded = descendants | {pid for pid, item in entries.items() if item['ppid'] in descendants}
            if expanded == descendants: break
            descendants = expanded
        # Retain discovered identities through reparenting, but never follow a reused PID.
        descendants |= {pid for pid, start in self.tracked if pid in entries and entries[pid]['starttime'] == start}
        if len(descendants) > MAX_PROCESSES: raise RuntimeError('simultaneous_process_limit')
        rows = []
        unavailable = []
        for pid in sorted(descendants):
            before = entries.get(pid)
            if before is None: unavailable.append({'pid': pid, 'reason': 'missing_stat'}); continue
            row = {**before, 'role': 'webkit_worker' if 'WebKit' in before['comm'] else 'application'}
            path = self.proc/str(pid)
            fields = {}
            try:
                fields = dict(line.split(':', 1) for line in (path/'status').read_text().splitlines() if ':' in line)
            except OSError: pass
            for key, source in [('rss_kib', 'VmRSS'), ('threads', 'Threads')]:
                try: row[key] = int(fields[source].split()[0])
                except (ValueError, KeyError, IndexError): row[key] = None
            try: row['fds'] = len(list((path/'fd').iterdir()))
            except OSError: row['fds'] = None
            try:
                pss = next((line.split()[1] for line in (path/'smaps_rollup').read_text().splitlines() if line.startswith('Pss:')), None)
                row['pss_kib'] = int(pss) if pss is not None else None
            except (OSError, ValueError): row['pss_kib'] = None
            row['unavailable_fields'] = [key for key in ('rss_kib', 'pss_kib', 'threads', 'fds') if row[key] is None]
            try: after = parse_stat((path/'stat').read_text())
            except (OSError, ValueError, IndexError): unavailable.append({'pid': pid, 'reason': 'exited_during_read'}); continue
            if after['starttime'] != before['starttime']: unavailable.append({'pid': pid, 'reason': 'pid_reused_during_read'}); continue
            rows.append(row)
        self.tracked = {(r['pid'], r['starttime']) for r in rows} | {(pid, start) for pid, start in self.tracked if pid not in entries and (self.proc/str(pid)).exists()}
        end = time.monotonic()
        result = self.cpu.update(rows, end)
        result.update(monotonic=end, sample_start=begin, sample_end=end, sample_duration=end-begin,
                      missed_cadences=max(0, int(end-begin)), pids=[r['pid'] for r in rows],
                      unavailable=unavailable, enumeration_gaps=gaps,
                      discovery_coverage='descendants discovered during sampling; initial/transient/reparented-before-discovery workers may be missing')
        for field in ('rss_kib', 'pss_kib', 'threads', 'fds'):
            values = [r[field] for r in rows if r[field] is not None]
            result[field] = sum(values) if len(values) == len(rows) and rows else None
            result[field+'_observed'] = sum(values) if values else None
        return result


class PlayingIntervals:
    def __init__(self): self.last, self.seconds, self.excluded = None, 0., 0.
    def observe(self, now, running, frames, action, rate=48000):
        if self.last:
            old, playing, prior, boundary = self.last
            elapsed = now-old
            if running and playing and action == boundary and frames > prior and 0 < elapsed <= 2.5:
                self.seconds += min(elapsed, (frames-prior)/rate)
            else: self.excluded += max(0, elapsed)
        self.last = now, running, frames, action
        return self.seconds


class JsonLines:
    def __init__(self, path, limit=MAX_METADATA):
        self.path, self.limit = Path(path), limit
        self.size = self.path.stat().st_size if self.path.exists() else 0
    def write(self, value):
        data = (json.dumps(value, separators=(',', ':'))+'\n').encode()
        aggregate = sum(f.stat().st_size for f in self.path.parent.iterdir() if f.is_file() and f.suffix in ('.json', '.jsonl', '.log'))
        if self.size + len(data) > self.limit or aggregate + len(data) > MAX_METADATA: raise RuntimeError('metadata_limit')
        with self.path.open('ab') as out: out.write(data)
        self.size += len(data)
    def manifest(self):
        digest = hashlib.sha256()
        with self.path.open('rb') as data:
            while block := data.read(1 << 20): digest.update(block)
        return {'path': str(self.path), 'bytes': self.size, 'sha256': digest.hexdigest()}


class EpochCollector:
    def __init__(self, writer=None): self.cursor, self.run, self.writer, self.active = 0, None, writer, None
    def accept(self, observation):
        if observation['coverage_gap']: raise RuntimeError('epoch_coverage_gap')
        if self.run is not None and self.run != observation['run_id']: raise RuntimeError('epoch_run_changed')
        self.run = observation['run_id']
        for epoch in observation['completed']:
            identity = int(epoch['epoch_id'])
            if identity <= self.cursor: continue
            if identity != self.cursor + 1: raise RuntimeError('epoch_coverage_gap')
            if identity > 256: raise RuntimeError('epoch_limit')
            if self.writer: self.writer.write(epoch)
            self.cursor = identity
        self.active = observation['active']
        if self.active and int(self.active['epoch_id']) > 256: raise RuntimeError('epoch_limit')
        if self.writer: self.writer.write({'kind': 'observation', 'monotonic': time.monotonic(), 'cursor': str(self.cursor), 'active': self.active})
        return observation['complete']


class Recorder:
    def __init__(self, path, command, max_audio=MAX_AUDIO, max_stderr=MAX_STDERR, max_wall=MAX_WALL, reserve=RESERVE):
        self.path = Path(path)
        if shutil.disk_usage(self.path.parent).free < reserve + max_audio: raise RuntimeError('insufficient_capture_space')
        self.result = self.path.with_suffix('.capture.json')
        self.process = subprocess.Popen([sys.executable, str(Path(__file__).resolve()), '--record', str(self.path),
                                       str(max_audio), str(max_stderr), str(max_wall), str(reserve), *command])
        self.finished = None
        atexit.register(self.finish)
    def finish(self):
        if self.finished is not None: return self.finished
        if self.process.poll() is None: self.process.terminate()
        try: self.process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self.process.kill(); self.process.wait()
            raise RuntimeError('recorder_supervisor_stalled')
        if not self.result.exists(): raise RuntimeError('recorder_manifest_missing')
        self.finished = json.loads(self.result.read_text())
        return self.finished


def supervise(path, audio_limit, stderr_limit, wall_limit, reserve, command):
    path = Path(path)
    reason, stopped = 'requested_stop', False
    def stop(_signum, _frame):
        nonlocal stopped
        stopped = True
    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    def limits(): resource.setrlimit(resource.RLIMIT_FSIZE, (audio_limit, audio_limit))
    start = time.monotonic()
    owner_pid = os.getppid()
    child = None
    stderr_bytes = 0
    try:
        with path.open('wb') as output, path.with_suffix('.stderr').open('wb') as errors:
            child = subprocess.Popen(command, stdout=output, stderr=subprocess.PIPE, preexec_fn=limits, start_new_session=True)
            os.set_blocking(child.stderr.fileno(), False)
            selector = selectors.DefaultSelector(); selector.register(child.stderr, selectors.EVENT_READ)
            while not stopped:
                for _key, _mask in selector.select(.05):
                    block = child.stderr.read(65536)
                    if block:
                        room = max(0, stderr_limit-stderr_bytes); errors.write(block[:room]); stderr_bytes += min(room, len(block))
                        if len(block) > room: reason, stopped = 'stderr_limit', True
                if child.poll() is not None: reason, stopped = 'recorder_exited', True
                if path.stat().st_size >= audio_limit: reason, stopped = 'audio_limit', True
                if time.monotonic()-start >= wall_limit: reason, stopped = 'wall_limit', True
                if shutil.disk_usage(path.parent).free < reserve: reason, stopped = 'disk_reserve', True
                metadata = sum(f.stat().st_size for f in path.parent.iterdir() if f.is_file() and f.suffix in ('.json', '.jsonl', '.log'))
                if metadata >= MAX_METADATA: reason, stopped = 'metadata_limit', True
                if os.getppid() != owner_pid: reason, stopped = 'owner_exited', True
            selector.close()
    except BaseException:
        reason = 'supervisor_error'
        raise
    finally:
        if child is not None:
            # Own the whole recorder group, including helpers, and always reap it.
            try: os.killpg(child.pid, signal.SIGTERM)
            except ProcessLookupError: pass
            try: child.wait(timeout=1)
            except subprocess.TimeoutExpired:
                os.killpg(child.pid, signal.SIGKILL); child.wait()
            child.stderr.close()
        path.with_suffix('.capture.json').write_text(json.dumps({'complete': reason == 'requested_stop', 'reason': reason,
            'recorder_pid': child.pid if child else None, 'returncode': child.returncode if child else None,
            'wall_seconds': time.monotonic()-start, 'audio_bytes': path.stat().st_size if path.exists() else 0,
            'stderr_bytes': stderr_bytes, 'limits': {'wall_seconds': wall_limit, 'audio_bytes': audio_limit,
            'metadata_bytes': MAX_METADATA, 'stderr_bytes': stderr_limit, 'disk_reserve_bytes': reserve}}))


if __name__ == '__main__' and sys.argv[1:2] == ['--record']:
    supervise(sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), float(sys.argv[5]), int(sys.argv[6]), sys.argv[7:])


def histogram_summary(counts, edges, maximum):
    counts = list(map(int, counts)); edges = list(map(int, edges)); total = sum(counts)
    result = {'samples': total, 'maximum': int(maximum), 'overflow_samples': counts[-1], 'intervals': {}}
    for label, numerator, denominator in [('p50', 1, 2), ('p95', 95, 100), ('p99', 99, 100), ('p999', 999, 1000)]:
        rank = (total*numerator + denominator-1)//denominator
        running = 0
        for i, count in enumerate(counts):
            running += count
            if total and running >= rank:
                result['intervals'][label] = {'lower_exclusive': edges[i-1] if i else None, 'upper_inclusive': edges[i] if i < len(edges) else None}
                break
    return result
