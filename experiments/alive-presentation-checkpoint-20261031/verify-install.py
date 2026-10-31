"""Verify archived source hashes and both explicit resource maps against an install."""
import hashlib
import json
from pathlib import Path
import sys

run, install = map(lambda value: Path(value).resolve(strict=True), sys.argv[1:])
manifest = json.loads((run / 'source-build-manifest.json').read_text())
source = Path(manifest['build_source_archive'])
digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
rows = []
for product in ['alive', 'ultra']:
    config_root = source / 'apps' / product / 'src-tauri'
    config = json.loads((config_root / 'tauri.conf.json').read_text())
    for origin, relative in config['bundle']['resources'].items():
        original = config_root / origin
        target = install / 'lib' / config['productName'] / relative
        expected = manifest['resources'][str(target.relative_to(install))]
        assert digest(original) == digest(target) == expected, target
        rows.append({'product': product, 'source': str(original.resolve().relative_to(source)),
                     'installed': str(target.relative_to(install)), 'sha256': expected})
for relative, expected in manifest['source_sha256'].items():
    assert digest(source / relative) == expected, relative
for artifact, expected in manifest['artifacts'].items():
    assert digest(install / 'bin' / artifact) == expected, artifact
assert digest(install / 'icon.png') == manifest['icon_sha256']
assert json.loads((install / 'source-build-manifest.json').read_text()) == manifest
result = {'source_commit': manifest['source_commit'],
          'verified_manifest_source_files': len(manifest['source_sha256']),
          'resource_map_rows': rows, 'all_source_artifact_resource_hashes_match': True}
print(json.dumps(result, indent=2))
