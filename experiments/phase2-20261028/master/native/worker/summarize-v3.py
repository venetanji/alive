#!/usr/bin/env python3
import csv
import json
import sys
from collections import defaultdict

groups = defaultdict(list)
for filename in sys.argv[1:]:
    with open(filename, newline='') as stream:
        for row in csv.reader(stream):
            if len(row) == 7 and row[0] == 'SAMPLE':
                _, case, tracks, devices, frames, _, elapsed_ns = row
                groups[(case, int(tracks), int(devices), int(frames))].append(int(elapsed_ns))
summary = {}
for (case, tracks, devices, frames), values in sorted(groups.items()):
    values.sort()
    deadline_ns = frames * 1_000_000_000 / 48000
    key = f'{case}/{tracks}tracks/{devices}devices/{frames}frames'
    summary[key] = {'samples':len(values), 'p50_ns':values[len(values)//2],
        'p99_ns':values[(len(values)-1)*99//100], 'p999_ns':values[(len(values)-1)*999//1000],
        'max_ns':values[-1], 'deadline_ns':deadline_ns,
        'overruns':sum(value > deadline_ns for value in values)}
json.dump(summary, sys.stdout, indent=2)
print()
