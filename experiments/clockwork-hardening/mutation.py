#!/usr/bin/env python3
"""Negative controls: recompile ONLY isolated core copies; never edit source/oracle."""
import pathlib, shlex, subprocess
root=pathlib.Path(__file__).resolve().parent
build=root/'build'
source=(root/'../../apps/ultra/core/engine.cpp').resolve().read_text()
flags={}
for line in (build/'ultra/CMakeFiles/ultra_core.dir/flags.make').read_text().splitlines():
    if ' = ' in line:
        k,v=line.split(' = ',1); flags[k]=shlex.split(v)
link=shlex.split((build/'CMakeFiles/check_core.dir/link.txt').read_text())
for name,old,new,expected in [
 ('timing','std::llround(s.frame*(4294967296.0/48000))','std::llround((s.frame+1)*(4294967296.0/48000))','direct reference exact +64'),
 ('lost_fault','fault.store(true,std::memory_order_release);','/* negative control: discard fault latch */','rejected off stranded accepted on')]:
    assert old in source
    directory=build/('mutation-'+name);directory.mkdir(exist_ok=True)
    cpp=directory/'engine.cpp';cpp.write_text(source.replace(old,new,1))
    obj=directory/'engine.o';archive=directory/'libmutant.a';exe=directory/'check_core'
    subprocess.run(['/usr/bin/c++',*flags['CXX_DEFINES'],*flags['CXX_INCLUDES'],*flags['CXX_FLAGS'],'-c',str(cpp),'-o',str(obj)],check=True)
    subprocess.run(['ar','rcs',str(archive),str(obj)],check=True)
    args=[str(archive) if x=='ultra/libultra_core.a' else str(exe) if x=='check_core' else x for x in link]
    subprocess.run(args,cwd=build,check=True)
    result=subprocess.run([str(exe)],text=True,capture_output=True)
    assert result.returncode==1 and expected in result.stderr,(name,result.returncode,result.stdout,result.stderr)
    print(f'PASS negative control {name}: rejected by {result.stderr.strip()}')
