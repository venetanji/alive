#!/usr/bin/env python3
"""Prepare private exact help copies and original harness sources; launch nothing."""
import argparse
import json
from pathlib import Path
import sys

sys.dont_write_bytecode=True
from help_runtime import READBACK_METHODS, RESOURCES, prepare_private, seal_preparation


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--work',type=Path,required=True)
    parser.add_argument('--resources',type=Path,default=RESOURCES)
    parser.add_argument('--readback-method',choices=sorted(READBACK_METHODS),default='private-serialization')
    args=parser.parse_args()
    config=prepare_private(args.work,args.resources,readback_method=args.readback_method)
    manifest=seal_preparation(args.work)
    print(json.dumps(dict(status='PREPARED_NOT_EXECUTED',work=config['work'],
        documents=[dict(document=d['document'],source_sha256=d['source_sha256'],
            initial_working_sha256=d['initial_working_sha256']) for d in config['documents']],
        readback_method=config['readback_method'],runtime_started=False,screenshots=0,clipboard_actions=0,
        artifacts=len(manifest['artifacts']))))


if __name__=='__main__':
    main()
