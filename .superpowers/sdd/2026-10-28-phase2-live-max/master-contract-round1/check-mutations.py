import json, pathlib, shutil, subprocess, tempfile
src=pathlib.Path('docs/contracts/alive-master-v1-fixtures').resolve()
root=pathlib.Path(tempfile.mkdtemp(prefix='master-check-'))
dest=root/'docs/contracts/alive-master-v1-fixtures'; shutil.copytree(src,dest)
(root/'apps').symlink_to(pathlib.Path('apps').resolve(),target_is_directory=True)
def run(label, name, transform):
    p=dest/name; original=p.read_text(); p.write_text(transform(original))
    r=subprocess.run(['python3',str(dest/'check.py')],capture_output=True,text=True)
    p.write_text(original); print(f'{label}: exit {r.returncode}'); assert r.returncode != 0
r=subprocess.run(['python3',str(dest/'check.py')],capture_output=True,text=True)
print(f'canonical: exit {r.returncode}: {r.stdout.strip()}'); assert r.returncode==0
for filename,value in [('gain-1.json',True),('gain-0.json',False)]:
    def change(text):
        obj=json.loads(text); obj['master']['gain']=value; return json.dumps(obj)
    run(filename+' boolean',filename,change)
run('nested duplicate in second master','invalid-duplicate-outer-master.json',lambda text: text.replace('"master": {\n    "gain": 1\n  }','"master": {\n    "gain": 1, "gain": 2\n  }',1))
for name in ('gain-4.json','invalid-over.json'):
    run(name+' replaced by gain-1',name,lambda _: (dest/'gain-1.json').read_text())
