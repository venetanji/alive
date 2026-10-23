#!/usr/bin/env python3
"""Generate original disposable patches and explicit input scores, not observations."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
F = ROOT / 'fixtures'
def write(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n')
class Patch:
    def __init__(self, name, question):
        self.name, self.question = name, question
        self.boxes, self.lines, self.labels, self.score = [], [], [], []
        self.add('comment', question, patching_rect=[20., 10., 880., 40.])
    def add(self, cls='newobj', text=None, **kw):
        bid = 'obj-' + str(len(self.boxes)+1)
        b = dict(id=bid, maxclass=cls, patching_rect=[20.+(len(self.boxes)%5)*190, 70.+(len(self.boxes)//5)*65, 175., 22.])
        if text is not None: b['text']=text
        b.update(kw); self.boxes.append({'box': b}); return bid
    def wire(self, src, dst, outlet=0, inlet=0, **kw):
        self.lines.append({'patchline': dict(source=[src,outlet], destination=[dst,inlet], **kw)})
    def tap(self, src, label, outlet=0):
        self.labels.append(label); self.wire(src, 'logger', outlet, len(self.labels)-1)
    def event(self, text, dst, inlet=0, wait_ms=0):
        name='event_'+str(len(self.score)); m=self.add('message',text,varname=name)
        self.wire(m,dst,inlet=inlet)
        self.score.append(dict(id=name, message=text, destination=dst, inlet=inlet, wait_ms=wait_ms))
    def data(self):
        return {'patcher':dict(fileversion=1, appversion=dict(major=9,minor=1,revision=5,architecture='x64',modernui=1),
            classnamespace='box',rect=[0.,0.,1020.,850.],openinpresentation=0,boxes=self.boxes,lines=self.lines)}
    def save(self, drain=100):
        self.boxes.append({'box':dict(id='logger',maxclass='newobj',text='js probe.js '+self.name,varname='logger',
            numinlets=64,numoutlets=0,patching_rect=[20.,770.,500.,22.])})
        self.add(text='thispatcher',varname='saver')
        write(F/(self.name+'.maxpat'),self.data())
        write(F/(self.name+'.score.json'),dict(fixture=self.name,question=self.question,labels=self.labels,events=self.score,drain_ms=drain))

p=Patch('01-trigger','Does trigger emit right to left, and is each downstream chain completed first?')
t=p.add(text='trigger b b b'); p.tap(t,'left',0);p.tap(t,'middle',1);p.tap(t,'right',2);p.event('bang',t);p.save()
p=Patch('02-fanout','Does explicit patchline order override visual cord destination order?')
b=p.add('button'); a=p.add(text='t b');c=p.add(text='t b');d=p.add(text='t b')
p.wire(b,a,order=2);p.wire(b,c,order=0);p.wire(b,d,order=1)
p.tap(a,'order_2');p.tap(c,'order_0');p.tap(d,'order_1');p.event('bang',b);p.save()
p=Patch('03-hot-cold','Do + cold inlet and int right inlet store silently, then emit on hot bang?')
a=p.add(text='+ 10');n=p.add(text='int 7');p.tap(a,'plus');p.tap(n,'int')
for text,dst,inlet in [('2',a,0),('100',a,1),('bang',a,0),('5',a,0),('9',n,1),('bang',n,0),('set 11',n,0),('bang',n,0)]:p.event(text,dst,inlet)
p.save()
# Keep UI number boxes and storage objects in separate fixtures.
for name,cls,text,attrs in [('04-int','newobj','int 7',{}),('05-float','newobj','float 7.',{}),('06-number','number',None,{}),('07-flonum','flonum',None,{})]:
 p=Patch(name,'Numeric type, bang, symbol and list behavior for '+(text or cls))
 n=p.add(cls,text,**attrs);p.tap(n,'output')
 for v in ['bang','3.9','-3.9','symbol kiwi','kiwi','list 4 5','list 6.75 kiwi','set 12','bang']:p.event(v,n)
 p.save()
p=Patch('08-pack','Does only pack inlet zero emit, and how do short/long lists update stored slots?')
a=p.add(text='pack i f s');p.tap(a,'pack')
for text,inlet in [('bang',0),('2.75',1),('symbol pear',2),('5',0),('list 8 9.',0),('list 1 2. peach extra',0),('bang',0)]:p.event(text,a,inlet)
p.save()
p=Patch('09-unpack','Unpack outlet order, coercion, missing fields, excess fields and bang')
a=p.add(text='unpack i f s');[p.tap(a,label,k) for k,label in enumerate(['integer','float','symbol'])]
for v in ['list 3 4.5 pear','list 7','list 8.75 2 kiwi extra','bang','symbol pear','kiwi 2 3']:p.event(v,a)
p.save()
p=Patch('10-select','Select matches, unmatched output, type handling and right inlet replacement')
a=p.add(text='select 2');p.tap(a,'match');p.tap(a,'unmatched',1)
for v in ['2','2.0','2.9','symbol two','list 2 3','bang']:p.event(v,a)
p.event('5',a,1);p.event('2',a);p.event('5',a);p.save()
p=Patch('11-route','Route selector stripping, numeric selectors, unmatched values and list selectors')
a=p.add(text='route foo 2');[p.tap(a,label,k) for k,label in enumerate(['foo','two','unmatched'])]
for v in ['foo 10 20','foo','list foo 9','2 7','2','bar 8','bang','2.5 8']:p.event(v,a)
p.save()
p=Patch('12-ui-message','Button bang conversion, toggle state, and message cold storage versus hot substitution')
a=p.add('button');b=p.add('toggle');m=p.add('message','saved $1');p.tap(a,'button');p.tap(b,'toggle');p.tap(m,'message')
for v,d in [('9',a),('symbol pear',a),('bang',b),('bang',b),('7',b),('set 1',b),('bang',b),('bang',m),('4',m)]:p.event(v,d)
p.event('new $1',m,1);p.event('9',m);p.save()
p=Patch('13-initialization','Loadbang order across nested patchers and explicit saved parameter initial state')
a=p.add(text='loadbang');p.tap(a,'root_loadbang')
child=Patch('child','Embedded child loadbang'); lb=child.add(text='loadbang');o=child.add(text='outlet');child.wire(lb,o)
x=p.add(text='p child',patcher=child.data()['patcher']);p.tap(x,'child_loadbang')
n=p.add('number',varname='saved_number',parameter_enable=1,saved_attribute_attributes={'valueof':{'parameter_longname':'saved_number','parameter_shortname':'saved_number','parameter_type':1,'parameter_initial_enable':1,'parameter_initial':[17]}})
p.tap(n,'parameter');p.event('bang',n);p.save()
p=Patch('14-scheduler','Metro/delay/pipe cancellation and defer/deferlow observed at collector arrival')
for text,label,events in [('metro 10','metro',[('1',0),('0',55)]),('delay 20','delay',[('bang',0),('stop',5),('bang',0)]),('pipe 20','pipe',[('1',0),('2',0),('clear',5),('3',0)]),('defer','defer',[('bang',30)]),('deferlow','deferlow',[('bang',0)])]:
 a=p.add(text=text);p.tap(a,label)
 for v,wait in events:p.event(v,a,wait_ms=wait)
p.save(drain=150)
p=Patch('15-scope','Named send crosses nested patchers; #0 in two abstraction instances isolates local buses')
s=p.add(text='s alive_reference_global');r=p.add(text='r alive_reference_global');p.tap(r,'root_receive')
child=Patch('nested','Nested named receive');r=child.add(text='r alive_reference_global');o=child.add(text='outlet');child.wire(r,o)
x=p.add(text='p nested',patcher=child.data()['patcher']);p.tap(x,'nested_receive')
a=p.add(text='scoped-bus');b=p.add(text='scoped-bus');p.tap(a,'instance_A');p.tap(b,'instance_B');p.event('41',s);p.event('7',a);p.event('8',b);p.save()
a=Patch('abstraction','Original local abstraction');i=a.add(text='inlet');s=a.add(text='s #0-bus');r=a.add(text='r #0-bus');o=a.add(text='outlet');a.wire(i,s);a.wire(r,o);write(F/'scoped-bus.maxpat',a.data())
p=Patch('00-environment','Read current audio/scheduler settings without changing them')
for setting in ['sr','sigvs','iovs','overdrive','takeover','switch','driver']:
 a=p.add(text='adstatus '+setting);p.tap(a,setting+'_left');p.tap(a,setting+'_right',1);p.event('bang',a)
p.save()
# Format deltas are authored inputs until Max's own thispatcher write result exists.
p=Patch('format','One-property at a time file-format comparison inputs');a=p.add(text='+ 1',varname='subject');b=p.add('number');p.wire(a,b)
base=p.data();write(ROOT/'format/base.maxpat',base)
import copy
variants={
 'text':lambda q:q['boxes'][1]['box'].update(text='* 1'),
 'argument':lambda q:q['boxes'][1]['box'].update(text='+ 2'),
 'coordinates':lambda q:q['boxes'][1]['box'].update(patching_rect=[45.,135.,175.,22.]),
 'attribute':lambda q:q['boxes'][2]['box'].update(minimum=0),
 'presentation':lambda q:q['boxes'][2]['box'].update(presentation=1,presentation_rect=[20.,20.,70.,22.]),
 'connection_order':lambda q:q['lines'][0]['patchline'].update(order=0),
 'connection':lambda q:q['lines'][0]['patchline'].update(source=[b,0],destination=[a,0]),
 'embedded':lambda q:q['boxes'][1]['box'].update(patcher=child.data()['patcher'],text='p nested'),
 'dependency':lambda q:q.update(dependency_cache=[{'name':'scoped-bus.maxpat','type':'JSON','implicit':1}]),
 'parameter':lambda q:q['boxes'][2]['box'].update(parameter_enable=1,saved_attribute_attributes={'valueof':{'parameter_initial_enable':1,'parameter_initial':[17]}})
}
for name,mutate in variants.items():
 d=copy.deepcopy(base);mutate(d['patcher']);write(ROOT/'format'/(name+'.maxpat'),d)
print('Generated',len(list(F.glob('*.maxpat'))),'message patches and',len(variants)+1,'format inputs')
