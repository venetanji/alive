#!/usr/bin/env python3
"""Inspect, create or verify a private arithmetic preparation without execution."""
import argparse
import hashlib
import json
from pathlib import Path
import sys

sys.dont_write_bytecode = True
import arithmetic as n


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--prepare', action='store_true')
    mode.add_argument('--verify', action='store_true')
    parser.add_argument('--work', type=Path)
    parser.add_argument('--manifest-name', default='preparation-manifest.json')
    args = parser.parse_args(argv)
    if not args.prepare and not args.verify:
        print(json.dumps(dict(status='NOT_EXECUTED', runtime_started=False, runtime_invocations=0,
            score_binding=n.score_binding(), operation_count=78, event_count=66,
            live_checkpoint_count=72, empty_checkpoint_count=6, numeric_state_count=504,
            expected_original_outlet_count=141, final_live_owners={})))
        return 0
    if args.work is None: parser.error('--work is required for private preparation or verification')
    config = n.prepare_private(args.work, manifest_name=args.manifest_name) if args.prepare else n.verify_private(args.work)
    # Validate the exact independent lifecycle construction before a parent can launch it.
    import lifecycle
    lifecycle._configuration(args.work.absolute(), config)
    print(json.dumps(dict(status='PREPARED_NOT_EXECUTED' if args.prepare else 'PREPARATION_VERIFIED',
        runtime_started=False, runtime_invocations=0, private_work=str(args.work.absolute()),
        score_binding=n.score_binding(), preparation_binding=n.preparation_binding(args.work),
        documents=len(config['documents']), owner_count=len(config['lifecycle']['owners']),
        final_live_owners={})))
    return 0


if __name__ == '__main__':
    try: raise SystemExit(main())
    except (ValueError, OSError, KeyError, TypeError) as error:
        print(json.dumps(dict(status='PREPARATION_REFUSED', runtime_started=False,
            failure_sha256=hashlib.sha256(str(error).encode()).hexdigest())), file=sys.stderr)
        raise SystemExit(1)
