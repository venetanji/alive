#!/usr/bin/env python3
"""Prepare fresh private pinned numeric sources; never launch a target."""
import argparse
import hashlib
import json
from pathlib import Path
import sys
sys.dont_write_bytecode=True
import numeric as n

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--work',required=True,type=Path)
    args=parser.parse_args()
    try:
        config=n.prepare_private(args.work)
        print(json.dumps(dict(status='PREPARED_NOT_EXECUTED',runtime_started=False,work=config['work'],
                             source_metadata=config['source_metadata'],score_binding=n.score_binding(),
                             **n.preparation_binding(args.work))))
    except BaseException as error:
        print(json.dumps(dict(status='FAILED',failure_sha256=hashlib.sha256(str(error).encode()).hexdigest())),file=sys.stderr)
        raise SystemExit(1)
