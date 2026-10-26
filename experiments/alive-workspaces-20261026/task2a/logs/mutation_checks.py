import os,pathlib,subprocess,json
source=pathlib.Path('apps/ultra/src-tauri/src/session/workspaces.rs')
original=source.read_text()
env=dict(os.environ,ULTRA_NATIVE_LIB_DIR=str(pathlib.Path('apps/ultra/build').resolve()),LD_LIBRARY_PATH=str(pathlib.Path('apps/ultra/build').resolve()))
cases=[
 ('duplicates','    serde_json::from_str::<Unique>(text).map_err(|e| format!("Invalid workspace JSON: {e}"))?;', '    let _ = text;', 'wire_rejects'),
 ('decimal',' || (s.len() > 1 && s.starts_with(\'0\'))','', 'wire_rejects'),
 ('event-cap','if events > 1024','if events > 1025','source_event_pool'),
 ('source-end','events = checked_add(events, if end < length { 2 } else { 1 })?;','events = checked_add(events, 2)?;','source_event_pool'),
 ('held-notes','if held > 4','if held > 5','notes_reject'),
 ('endpoint-duration','end - start > period','frame_at(placement.duration, self.tempo)? > period','endpoint_difference'),
 ('operation-order','beat * 48000.0 * 60.0 / tempo','beat * (48000.0 * 60.0 / tempo)','finite_bounds'),
 ('affected-references','changed.extend(project.reference_ids(source.id()));','let _ = source;','shared_source_edits'),
 ('independent-notes','for note in notes { note.id = fresh("note")?; }','let _ = notes;','shared_source_edits'),
]
results=[]
try:
 for name,needle,replacement,test in cases:
  assert original.count(needle)==1,(name,original.count(needle))
  source.write_text(original.replace(needle,replacement))
  command=['cargo','test','--manifest-path','apps/ultra/src-tauri/Cargo.toml','--lib','session::workspaces::tests::'+test,'--','--test-threads=1']
  with open('/tmp/alive-workspaces-task2a/10-red-mutation-'+name+'.log','w') as log:
   r=subprocess.run(command,env=env,stdout=log,stderr=subprocess.STDOUT)
  results.append({'name':name,'exit':r.returncode,'command':command})
  print(name,'exit',r.returncode,flush=True)
  if r.returncode!=101: raise RuntimeError((name,r.returncode))
finally:
 source.write_text(original)
 pathlib.Path('/tmp/alive-workspaces-task2a/10-mutation-results.json').write_text(json.dumps(results,indent=2)+'\n')
