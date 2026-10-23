#!/usr/bin/env python3
"""Verify preparation identities only; runtime claims require a later captured run."""
import argparse
import ast
import json
from pathlib import Path
import sys

sys.dont_write_bytecode=True
from help_runtime import (READBACK_METHODS, ROOT, build_score, digest, helper_metadata, observer_definitions,
                          readback_target, require_digest, source_metadata, windows_path)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--work',type=Path)
    args=parser.parse_args()
    manifest=json.loads((ROOT/'preparation-manifest.json').read_text())
    assert manifest['status']=='PREPARED_NOT_EXECUTED' and manifest['runtime_invocations']==0
    assert manifest['whole_help_qualification']==dict(numerator=0,denominator=2103)
    assert {item['path'] for item in manifest['artifacts']}=={
        path.name for path in ROOT.iterdir() if path.is_file() and path.name!='preparation-manifest.json'}
    for item in manifest['artifacts']:
        path=ROOT/item['path']
        assert path.stat().st_size==item['bytes'],item['path']
        require_digest(path,item['sha256'])
    assert json.loads((ROOT/'score.json').read_text())==build_score()
    identities=json.loads((ROOT/'source-identities.json').read_text())
    public,_=source_metadata()
    assert identities['sources']==public
    assert identities['helpers']==helper_metadata()
    assert [len(source['full_inventory']) for source in public]==[19,18]
    assert all(source['basic_cables']==9 for source in public)
    for path in ROOT.glob('*.py'):ast.parse(path.read_text(),filename=str(path))
    if args.work:
        work=args.work.resolve();assert str(work)==manifest['private_work']
        require_digest(work/'config.json',manifest['private_config_sha256'])
        config=json.loads((work/'config.json').read_text())
        method=config.get('readback_method','private-serialization')
        assert method in READBACK_METHODS
        assert config['helpers']==identities['helpers']
        require_digest(work/'driver.maxpat',config['driver_sha256'])
        assert work.stat().st_mode & 0o077 == 0
        assert all(path.stat().st_mode & 0o077 == 0 for path in work.rglob('*'))
        for document in config['documents']:
            for key in ['source_path','pristine_path','working_path']:
                require_digest(document[key],document['source_sha256'])
            if method=='v8-boxtext':
                path=readback_target(config,document)
                assert path.is_file() and path.stat().st_size==0
                assert document['readback_windows_path']==windows_path(path)
                assert document['observer_leaves']==observer_definitions(document)
        if method=='v8-boxtext':
            assert config['readback_helper_path']==windows_path(work/'v8-readback.js')
            assert 'v8-readback.js' in config['harness_sha256']
        for name,expected in config['harness_sha256'].items():require_digest(work/name,expected)
        assert not (work/'private-journal.jsonl').exists()
    print(json.dumps(dict(verified=True,status='PREPARED_NOT_EXECUTED',runtime_invocations=0,
        artifacts=len(manifest['artifacts']),score_steps=len(build_score()),
        full_source_boxes=dict(append=19,prepend=18),original_basic_cables=18,
        whole_help_qualification='0/2103')))


if __name__=='__main__':
    main()
