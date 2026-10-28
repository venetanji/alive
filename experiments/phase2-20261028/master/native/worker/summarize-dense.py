#!/usr/bin/env python3
import csv
import json
import sys
from pathlib import Path
root=Path(sys.argv[1])
summary={}
sequences=[]
for mode,round_number in [('baseline',1),('candidate',1),('baseline',2),('candidate',2)]:
    name=f'{mode}-{round_number}'
    with (root/f'{name}.log').open() as stream:
        rows=[row for row in csv.reader(stream) if len(row)==9 and row[0]=='SAMPLE']
    if len(rows)!=1200:
        raise ValueError(f'{name}: expected 1200 samples, got {len(rows)}')
    values=sorted(int(row[6]) for row in rows)
    sequences.append([row[8] for row in rows])
    deadline=1024*1_000_000_000/48000
    summary[name]={'samples':len(values),'mean_ns':sum(values)/len(values),'p99_ns':values[(len(values)-1)*99//100],
                   'p999_ns':values[(len(values)-1)*999//1000],'max_ns':values[-1],
                   'deadline_ns':deadline,'overruns':sum(value>deadline for value in values),
                   'first_wall_ns':int(rows[0][7]),'last_wall_ns':int(rows[-1][7])}
summary['pcm_hash_sequences_identical']=all(sequence==sequences[0] for sequence in sequences)
json.dump(summary,sys.stdout,indent=2)
print()
