#!/usr/bin/env python3
"""Read-only package or private preparation validation; no target execution."""
import argparse
import hashlib
import json
from pathlib import Path
import sys
sys.dont_write_bytecode=True
import numeric as n

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    group=parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--package-only',action='store_true');group.add_argument('--work',type=Path)
    args=parser.parse_args()
    try:
        if args.work:n.verify_private(args.work)
        matrix=n.timeline(n.load_score())
        print(json.dumps(dict(status='VERIFIED_NOT_EXECUTED',runtime_started=False,score_binding=n.score_binding(),
            checkpoints=sum(len(r['live_owners']) for r in matrix),numeric_checkpoints=6*sum(len(r['live_owners']) for r in matrix),
            **(n.preparation_binding(args.work) if args.work else n.package_binding()))))
    except BaseException as error:
        print(json.dumps(dict(status='FAILED',failure_sha256=hashlib.sha256(str(error).encode()).hexdigest())),file=sys.stderr)
        raise SystemExit(1)
