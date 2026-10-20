from generate import *
# Test whether outlet metadata or edge-array order affects explicit cord order.
for name,metadata,reverse in [('16-fanout-metadata',True,False),('17-fanout-reversed',True,True)]:
 p=Patch(name,'Does numoutlets metadata permit explicit cord order to load?')
 b=p.add('button',numinlets=1,numoutlets=1,outlettype=['bang'])
 dest=[p.add(text='t b',numinlets=1,numoutlets=1,outlettype=['bang']) for _ in range(3)]
 for k,order in enumerate([2,0,1]):p.wire(b,dest[k],order=order)
 if reverse:p.lines.reverse()
 for k,x in enumerate(dest):p.tap(x,'destination_'+str(k))
 p.event('bang',b);p.save()
p=Patch('18-dsp','48 kHz offline cosine, quarter-cycle phase, 10 ms envelope, product at gain 0.25')
settings={}
for setting in ['driver','sr','sigvs','iovs','overdrive','takeover','switch']:
 a=p.add(text='adstatus '+setting);settings[setting]=a
 p.tap(a,setting+'_left');p.tap(a,setting+'_right',1)
for setting in settings:p.event('override 1',settings[setting])
p.event('0',settings['switch']);p.event('4',settings['driver'])
p.event('48000',settings['sr'],1);p.event('64',settings['sigvs'],1);p.event('512',settings['iovs'],1)
p.event('0',settings['overdrive']);p.event('0',settings['takeover'])
buf=p.add(text='buffer~ alive_reference_dsp 40 4')
r=p.add(text='record~ alive_reference_dsp 4');osc=p.add(text='cycle~ 1000');quad=p.add(text='cycle~ 1000');env=p.add(text='line~ 0.');gain=p.add(text='sig~ 0.25');mul=p.add(text='*~');out=p.add(text='*~')
p.wire(osc,r);p.wire(quad,r,inlet=1);p.wire(env,r,inlet=2);p.wire(osc,mul);p.wire(env,mul,inlet=1);p.wire(mul,out);p.wire(gain,out,inlet=1);p.wire(out,r,inlet=3)
# dac~ instantiates the DSP graph; NonRealTime has no physical output.
dac=p.add(text='dac~');p.wire(out,dac)
p.event('sizeinsamps 1920',buf);p.event('clear',buf);p.event('0.25',quad,1)
p.event('1',r);p.event('1. 10',env);p.event('1',settings['switch'])
p.event('0',settings['switch'],wait_ms=150)
for setting in settings:p.event('bang',settings[setting])
p.event('capture', 'logger')
p.save(drain=100)
p=Patch('19-depth-first','Does the entire right trigger branch run before the left sibling?')
a=p.add(text='t b b');b=p.add(text='t b b');p.wire(a,b,outlet=1);p.tap(a,'outer_left');p.tap(b,'inner_left');p.tap(b,'inner_right',1);p.event('bang',a);p.save()
