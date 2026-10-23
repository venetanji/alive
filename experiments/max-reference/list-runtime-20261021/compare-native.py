#!/usr/bin/env python3
"""Replay original finite Max observations against the current native executor.

The generated C++ needs no JSON dependency. The independent Max JSON captures
selectors/scalar types and atom values, but not numeric tags inside lists.
"""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
KINDS = dict(zip(['iter', 'prepend', 'append', 'zl.reg', 'zl.join', 'zl.len',
                  'zl.iter', 'zl.slice', 'zl.rev', 'zl.rot'],
                 ['Iter', 'Prepend', 'Append', 'ZlReg', 'ZlJoin', 'ZlLen',
                  'ZlIter', 'ZlSlice', 'ZlRev', 'ZlRot']))
PARAMETER = {'zl.iter', 'zl.slice', 'zl.rot'}
TEXT = {'prepend', 'append', 'zl.reg', 'zl.join'}


def cpp_string(value):
    return json.dumps(value, ensure_ascii=True)


def literal(case):
    if 'direct_selector' not in case:
        return case['message']
    atoms = [str(x) if not isinstance(x, str) else x for x in case['direct_atoms']]
    return ' '.join([case['direct_selector']] + atoms)


PREAMBLE = r'''
#include "apps/ultra/src-tauri/native/patch_graph.hpp"
#include <cstdio>
#include <iomanip>
#include <iostream>
#include <memory>
#include <vector>
using namespace ultra;
struct Target {
 CanvasRuntime runtime;
 explicit Target(unsigned kind,double parameter,const char* text) {
  UltraCanvasGraph graph{};graph.revision=1;graph.node_count=kind>=ZlReg?3:2;
  graph.edge_count=graph.node_count-1;
  graph.nodes[0].id=1;graph.nodes[0].kind=kind;graph.nodes[0].p0=parameter;
  std::strcpy(graph.nodes[0].text,text);
  for(unsigned i=1;i<graph.node_count;i++) {
   graph.nodes[i].id=i+1;graph.nodes[i].kind=Print;std::strcpy(graph.nodes[i].text,"capture");
   graph.edges[i-1]={1,i-1,i+1,0};
  }
  CanvasPlan plan{};
  if(!compile_canvas(graph,plan)){std::cerr<<"Graph failed to compile\n";std::exit(2);}
  runtime.reset(plan);
 }
};
void run(Target& target,unsigned index,unsigned inlet,const char* text,bool delivery) {
 CanvasMessage message{};
 if(!canvas_parse_message(text,message)){std::cerr<<"Input failed to parse: "<<text<<"\n";std::exit(3);}
 target.runtime.begin_callback();
 auto discard=[](alive::Event){return true;};
 const bool accepted=!delivery||target.runtime.event(1,1,inlet,message,0,discard);
 std::cout<<"{\"case\":"<<index<<",\"accepted\":"<<(accepted?"true":"false")<<",\"events\":[";
 UltraCanvasConsoleRecord record{};bool first=true;
 while(target.runtime.pop_console(record)) {
  const auto& m=record.message;
  const char* selector=m.selector;
  if(!selector[0])selector=!m.count?"bang":m.count>1?"list":m.tags[0]==2?"symbol":m.tags[0]==1?"float":"int";
  if(!first)std::cout<<",";
  first=false;
  std::cout<<"{\"outlet\":"<<(int(record.node)-2)<<",\"selector\":"<<std::quoted(selector)<<",\"atoms\":[";
  for(unsigned i=0;i<m.count;i++) {
   if(i)std::cout<<",";
   if(m.tags[i]==2)std::cout<<std::quoted(m.symbols[i]);
   else std::cout<<std::setprecision(17)<<m.values[i];
  }
  std::cout<<"]}";
 }
 std::cout<<"]}\n";
}
int main(){
std::vector<std::unique_ptr<Target>> targets;
'''


def equal_number(a, b):
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return math.isclose(a, b, rel_tol=1e-12, abs_tol=1e-12)
    return type(a) is type(b) and a == b


def compare(expected, actual):
    if len(expected) != len(actual):
        return 'output-count'
    for a, b in zip(expected, actual):
        if a['outlet'] != b['outlet']:
            return 'outlet-order'
        if a['selector'] != b['selector']:
            return 'selector-or-scalar-type'
        if len(a['atoms']) != len(b['atoms']):
            return 'atom-count'
        if not all(equal_number(x, y) for x, y in zip(a['atoms'], b['atoms'])):
            return 'atom-value'
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('scores', nargs='*', type=Path)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    paths = args.scores or sorted(ROOT.glob('normalized-*.json'))
    cases, skipped, sources = [], [], []
    code = [PREAMBLE]
    target_index = 0
    for path in paths:
        score = json.loads(path.read_text())
        sources.append(dict(path=str(path.relative_to(REPO)) if path.is_relative_to(REPO) else str(path),
                            sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
        mapping = {}
        for target in score['targets']:
            creation = target['creation'].split(maxsplit=1)
            name, value = creation[0], creation[1] if len(creation) > 1 else ''
            parameter = float(value) if name in PARAMETER and value else 0
            text = value if name in TEXT else ''
            code.append('targets.emplace_back(new Target(%s,%.17g,%s));' % (KINDS[name], parameter, cpp_string(text)))
            mapping[target['key']] = target_index
            target_index += 1
        for case in score['cases']:
            info = dict(fixture=score['fixture'], **case)
            if 'native_replay' in case:
                skipped.append(info)
                continue
            cases.append(info)
            code.append('run(*targets[%d],%d,%d,%s,%s);' % (mapping[case['target']], len(cases)-1,
                        case['inlet'], cpp_string(literal(case)), 'true' if case['delivery'] else 'false'))
    code.append('}\n')
    dependencies = ['patch_graph.hpp', 'patch_graph.h', 'canvas_message.hpp', 'canvas_objects.hpp', 'canvas_list_objects.hpp']
    def native_hashes():
        return {str((REPO / 'apps/ultra/src-tauri/native' / name).relative_to(REPO)):
                hashlib.sha256((REPO / 'apps/ultra/src-tauri/native' / name).read_bytes()).hexdigest()
                for name in dependencies}
    hashes = native_hashes()
    compiler = os.environ.get('CXX', 'c++')
    compiler_version = subprocess.run([compiler, '--version'], text=True, stdout=subprocess.PIPE, check=True).stdout.splitlines()[0]
    generated = '\n'.join(code)
    with tempfile.TemporaryDirectory(prefix='ultra-max-list-compare-') as tmp:
        source, binary = Path(tmp) / 'replay.cpp', Path(tmp) / 'replay'
        source.write_text(generated)
        subprocess.run([compiler, '-std=c++17', '-O2', '-Wall', '-Wextra',
                        '-Werror', '-I', str(REPO), str(source), '-o', str(binary)], check=True)
        result = subprocess.run([str(binary)], text=True, stdout=subprocess.PIPE, check=True)
    actual = [json.loads(line) for line in result.stdout.splitlines()]
    assert len(actual) == len(cases)
    mismatches = []
    for i, (case, received) in enumerate(zip(cases, actual)):
        assert received['case'] == i
        category = compare(case['expected'], received['events'])
        if not received['accepted']:
            category = 'native-event-rejected'
        if category:
            mismatches.append(dict(fixture=case['fixture'], input_id=case['input_id'], target=case['target'],
                                   inlet=case['inlet'], message=literal(case), category=category,
                                   expected=case['expected'], actual=received['events']))
    assert native_hashes() == hashes, 'Production headers changed during native replay; run again after they stabilize'
    report = dict(schema='ultra-max-list-comparison-v1', compared=len(cases), passed=len(cases)-len(mismatches),
                  mismatches=mismatches, skipped=[dict(fixture=x['fixture'], input_id=x['input_id'], reason=x['native_replay']) for x in skipped],
                  comparison='ordered output outlet, selector/scalar type, atom count and values; numeric tags inside lists are unobserved',
                  full_help_conformance={'passing': 0, 'denominator': 2103}, scores=sources, native_sources=hashes,
                  compiler=compiler_version, generated_runner_sha256=hashlib.sha256(generated.encode()).hexdigest())
    print(json.dumps(dict(compared=report['compared'], passed=report['passed'], mismatches=len(mismatches), skipped=len(skipped))))
    for mismatch in mismatches:
        print(json.dumps(mismatch))
    if args.output:
        args.output.write_text(json.dumps(report, indent=2) + '\n')
    raise SystemExit(bool(mismatches))


if __name__ == '__main__':
    main()
