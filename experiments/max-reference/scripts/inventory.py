#!/usr/bin/env python3
"""Extract bounded public interface metadata from the installed official reference XML."""
import argparse, hashlib, json, re
from pathlib import Path
import xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
def text(node):return ' '.join(' '.join(node.itertext()).split()) if node is not None else None
def desc(node):return text(node.find('description')) or text(node.find('digest'))
def main():
 ap=argparse.ArgumentParser();ap.add_argument('docs',type=Path);args=ap.parse_args()
 names=['button','toggle','number','flonum','int','float','message','trigger','pack','unpack','select','route','+','-','*','/','%','metro','delay','pipe','defer','deferlow','loadbang','send','receive','cycle~','sig~','line~','*~','gain~','dac~','ezdac~']
 filenames={'+':'plus','-':'minus','*':'times','/':'div','%':'mod','*~':'times~'}
 aliases={'trigger':['t'],'int':['i'],'float':['f'],'select':['sel'],'send':['s'],'receive':['r'],'delay':['del']}
 fixtures={'button':['02-fanout','12-ui-message'],'toggle':['12-ui-message'],'number':['06-number','13-initialization'],'flonum':['07-flonum'],'int':['03-hot-cold','04-int'],'float':['05-float'],'message':['12-ui-message'],'trigger':['01-trigger'],'pack':['08-pack'],'unpack':['09-unpack'],'select':['10-select'],'route':['11-route'],'+':['03-hot-cold'],'metro':['14-scheduler'],'delay':['14-scheduler'],'pipe':['14-scheduler'],'defer':['14-scheduler'],'deferlow':['14-scheduler'],'loadbang':['13-initialization'],'send':['15-scope'],'receive':['15-scope'],'cycle~':['18-dsp'],'sig~':['18-dsp'],'line~':['18-dsp'],'*~':['18-dsp'],'dac~':['18-dsp']}
 relevant={'minimum','maximum','parameter_enable','parameter_initial','parameter_initial_enable','parameter_mmin','parameter_mmax','parameter_type','floatoutput','interval','active','autostart','phase','frequency','interp','multichannelvariant','size','orientation','scale','synchronous','enable','ramp','listmode','compatmode','value','setmode','outmode','unit','parametername_enable','activeout','maxpoints','fuzzy','matchfloat','exact','blinktime','inc','interpinlet','relative','multislider','buffer','buffer_offset','buffer_sizeinsamps','presentation','presentation_rect','patching_rect','varname','hidden'}
 objs=[];sources=[]
 for name in names:
  basename=filenames.get(name,name)+'.maxref.xml';candidates=list(args.docs.glob('refpages/*/'+basename))
  # Operator file names vary; match declared class without scanning implementation.
  if not candidates:
   for p in args.docs.glob('refpages/*/*.maxref.xml'):
    if p.parent.name not in ['max-ref','msp-ref']:continue
    if re.search(r'<c74object\s+name="'+re.escape(name)+r'"',p.read_text(errors='replace')[:800]):candidates=[p];break
  o={'class':name,'aliases':aliases.get(name,[]),'alias_status':'official-documentation; no alias-equivalence runtime fixture','json_maxclass':name if name in ['button','toggle','number','flonum','message','gain~','ezdac~'] else 'newobj','ui_behavior':{'status':'untested-interaction' if name in ['button','toggle','number','flonum','message','gain~','ezdac~'] else 'not-applicable'},'message_behavior':{'status':'observed-bounded-inputs' if fixtures.get(name) else 'source-inspected-only','fixtures':fixtures.get(name,[])},'dsp_behavior':{'status':'observed-offline-48k' if name in ['cycle~','sig~','line~','*~'] else ('instantiated-offline-no-hardware-output' if name=='dac~' else ('deferred' if '~' in name else 'not-applicable'))},'deferred':['behavior outside the referenced scores','inherited UI attributes and automation unless explicitly listed','unsupported attributes must be preserved, not silently approximated']}
  if candidates:
   p=candidates[0];r=ET.parse(p).getroot();rel=str(p.relative_to(args.docs));url='https://docs.cycling74.com/reference/'+p.name.replace('.maxref.xml','')+'/'
   source={'id':name,'official_url':url,'installed_reference':rel,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'evidence':'source-inspected'};sources.append(source);o['source']=source
   o['arguments']=[dict(a.attrib,description=desc(a)) for a in r.findall('./objarglist/objarg')]
   o['inlets']=[dict(a.attrib,description=desc(a)) for a in r.findall('./inletlist/inlet')]
   o['outlets']=[dict(a.attrib,description=desc(a)) for a in r.findall('./outletlist/outlet')]
   o['port_type_caution']='INLET_TYPE/OUTLET_TYPE and TEXT_HERE are placeholders in the shipped docs, not measured types. Dynamic port counts depend on arguments.'
   o['messages']=[dict(m.attrib,description=desc(m)) for m in r.findall('./methodlist/method')]
   o['attributes']=[dict(a.attrib,description=desc(a)) for a in r.findall('./attributelist/attribute') if a.get('name') in relevant]
   o['documented_defaults']=[{'context':ctx,'text':s} for ctx,s in [('argument:'+a.get('name',''),desc(a)) for a in r.findall('./objarglist/objarg')]+[('message:'+a.get('name',''),desc(a)) for a in r.findall('./methodlist/method')]+[('attribute:'+a.get('name',''),desc(a)) for a in r.findall('./attributelist/attribute')] if s and re.search(r'default|initial|no arguments',s,re.I)]
   o['discussion']=text(r.find('discussion'))
  else:o['source']={'status':'not-found'}
  objs.append(o)
 (ROOT/'objects.json').write_text(json.dumps({'scope':'Bounded inventory, not broad Max/MSP compatibility. Port counts and documented defaults are from the installed public XML. Runtime evidence is limited to referenced input scores.','objects':objs},indent=2)+'\n')
 (ROOT/'docs/sources.json').write_text(json.dumps({'retrieved':'2026-10-20','sources':sources,'guide_urls':['https://docs.cycling74.com/userguide/scheduler/','https://docs.cycling74.com/userguide/non_realtime/','https://docs.cycling74.com/userguide/patcher_lifecycle/','https://docs.cycling74.com/userguide/message_types/','https://docs.cycling74.com/userguide/m4l/live_creatingdevices/','https://cycling74.com/sdk/max-sdk-8.2.0/html/chapter_anatomy.html']},indent=2)+'\n')
 print('Inventory:',len(objs),'classes;',len(sources),'official installed references')
if __name__=='__main__':main()
