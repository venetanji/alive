from pathlib import Path
import sys
p=Path('/home/venetanji/.codex/worktrees/27be/alive/apps/ultra/tests/ci/alive-chain.spec.mjs')
green='''async function dragBlankLaneRange(page,lane){
  const box=await page.evaluate(()=>{const element=document.querySelector('.timeline-lane'),rect=element?.getBoundingClientRect();return rect&&rect.width&&rect.height?{x:rect.x,y:rect.y}:null;});
  expect(box).not.toBeNull();await dragTimeline(page,lane,[384,35],[480,35],{box});
}'''
red='''async function dragBlankLaneRange(page,lane){
  await dragTimeline(page,lane,[384,35],[480,35]);
}'''
s=p.read_text()
mode=sys.argv[1]
old,new=(green,red) if mode=='red' else (red,green) if mode=='green' else (None,None)
if old is None or s.count(old)!=1 or new in s: raise SystemExit('unexpected mode or source; no edit made')
p.write_text(s.replace(old,new,1))
