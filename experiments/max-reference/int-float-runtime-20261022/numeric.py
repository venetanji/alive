#!/usr/bin/env python3
"""Finite numeric reference preparation and strict, private observation validation."""
from collections import Counter
import copy
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import re
import secrets
import shutil

ROOT=Path(__file__).resolve().parent
REPO=ROOT.parents[2]
PREVIOUS=ROOT.parent/'help-roots-runtime-20261022'
SCORE=ROOT.parent/'help-roots-native-20261022/int-float-score.json'
SCORE_SHA256='0ea52e269e960d64f7a55f137a1925d2186119cd6d960afabc21730e3c2fad30'
spec=importlib.util.spec_from_file_location('numeric_reference_common',PREVIOUS/'help_runtime.py')
common=importlib.util.module_from_spec(spec);spec.loader.exec_module(common)
digest=common.digest
write_json=common.write_json
windows_path=common.windows_path
original_varname=common.original_varname
observer_definitions=common.observer_definitions
IDENTITIES={'int':'bbb8fc3b458eb168fe69b8709ba343808d23b6d55e2c59cc3086d01976c5ac61',
            'float':'c5e9bd4e89ebc5808d2faf76400031705c35195c32b363b890787a37bbdec15c'}
COUNTS={'int':(25,14,10),'float':(27,16,12)}
NUMERIC={'number','flonum','slider'}
MAIN_EVENTS={f'E{i:02}' for i in [8,9,10,11,13,14,16,17,18,19,20,21,22,24,25,27,28,30,32,43,47]}
SHELL_HELPERS={
    'helpstarter.js':'a72853ae6e4593e9ed183e41a59f40e0454162c04ca8a9185648332baf8eeac8',
    'helpname.js':'49d1091a240f0a2926609462bd82cc7449527a2aadfd748238a5c593aedd12aa',
    'helpdetails.js':'31899d95bdc2dfcb45b1e0a4922a387351131479520992d15c225a594769aea1',
    'helpargs.js':'04cce1cb44b358680d9c6d3ef19873fa5ccbb192614905dc909057cf22805469'}
SHELL_ANCHORS={
    'root/obj-1':('js',[92,94,110,20],'3c299423556feddb0be4ff31bc20e20f1fc305063815420e899f529763daa2e1'),
    'root/obj-2':('patcher',[10,85,50,20],'484a245125c7a3ab76b61a83ed79fdc0813b1a62af7c2405ac22e0fc55c7d393'),
    'root/obj-3':('patcher',[205,205,50,20],'bebf7c3258d1aa320e962f4d3258a831cd0ca12c2d69b5aab221d67d7fefc52a')}
FLOAT_SHELL_ANCHORS=dict(SHELL_ANCHORS,**{
    'root/obj-1':('js',[374,27.5,120,20],'e9cd2d2ae24129f7ce891e9a5ee418d273b18a0b2641d3f3beb34be09def8ab5')})
ANNOTATION_ANCHORS={
    'root/obj-2/obj-23':('comment',[11,186.5,143,54],[11,186.5,143,55],
        '96d3d71a61b0f13d7c759315dc9e49578d5c542d24ac120753d628392a55723d',
        dict(inlets=1,outlets=0,fontname='Arial',fontsize=13.0,bubble=1,bubbleside=3,
             bubblepoint=0.75,bubbletextmargin=None,linecount=3)),
    'root/obj-2/obj-4':('jsui',[291,296,208.315216,39],[291,296,208.19552612304688,39],
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        dict(inlets=1,outlets=1,filename='helpargs.js',ignoreclick=1,
             jsarguments_sha256='c511da579364be932435a248bf3f04254e5c257664551ad10ac69cdc4170a098',
             border=0,parameter_enable=0,outlettype=['']))}
FLOAT_ANNOTATION_ANCHORS={
    'root/obj-2/obj-3':('comment',[411,156.5,133,54],[411,156.5,133,55],
        'de8dbc68910ee493e95c0bad7d48cf0b12577baa5955cd7d894aa80cae1fb027',
        dict(inlets=1,outlets=0,fontname='Arial',fontsize=13.0,bubble=1,bubbleside=None,
             bubblepoint=None,bubbletextmargin=None,linecount=3)),
    'root/obj-2/obj-5':('comment',[14,201.5,143,54],[14,201.5,143,55],
        ANNOTATION_ANCHORS['root/obj-2/obj-23'][3],copy.deepcopy(ANNOTATION_ANCHORS['root/obj-2/obj-23'][4])),
    'root/obj-2/obj-4':('jsui',[289,274,190.328094,39],[289,274,190.31402587890625,39],
        ANNOTATION_ANCHORS['root/obj-2/obj-4'][3],dict(ANNOTATION_ANCHORS['root/obj-2/obj-4'][4],
            jsarguments_sha256='a6c871ff72c57f35934325de26fba3add81b1df8935af30a164fb9a13117949a'))}
FLOAT_MODE_RECTS={'root/obj-2/obj-16':[194,230.5,54,23],'root/obj-2/obj-17':[265,230.5,54,23],
                  'root/obj-2/obj-21':[220,330.5,54,23],'root/obj-2/obj-33':[117,380.5,54,23]}
FLOAT_MODE_ATTRIBUTES=dict(inlets=1,outlets=2,format=6,numdecimalplaces=None,fontname='Arial',fontsize=13.0,
                           outlettype=['','bang'],parameter_enable=0)


def finite(value):
    return type(value) in (int,float) and math.isfinite(value)


def runtime_classes(maxclass,text):
    if maxclass!='newobj':return [maxclass]
    token=text.split()[0];canonical={'i':'int','f':'float','r':'receive','p':'patcher'}.get(token,token)
    return [canonical] if token==canonical else [canonical,token]


def shell_height_policy(document,source_sha256,box,helpers):
    anchor=box['anchor']
    profiles={'int':SHELL_ANCHORS,'float':FLOAT_SHELL_ANCHORS}.get(document,{})
    if anchor not in profiles:return None
    cls,rect,text_sha=profiles[anchor]
    pins={h['name']:h['sha256'] for h in helpers}
    if (source_sha256!=IDENTITIES[document] or len(helpers)!=4 or pins!=SHELL_HELPERS or
        box['maxclass']!='newobj' or box['runtime_class']!=cls or box['rect']!=rect or
        not all(finite(v) for v in box['rect']) or box.get('source_text_sha256')!=text_sha or
        any(type(box.get(k)) is not int or box[k]!=0 for k in ['saved_incoming_routes','saved_outgoing_routes'])):
        raise ValueError('Invalid measured int shell height binding')
    return dict(kind='source-bound-'+document+'-shell-height',document=document,source_sha256=source_sha256,anchor=anchor,
                runtime_class=cls,saved_rect=rect[:],live_rect=rect[:3]+[22],source_text_sha256=text_sha,
                helper_sha256=dict(SHELL_HELPERS),saved_incoming_routes=0,saved_outgoing_routes=0)


def annotation_geometry_policy(document,source_sha256,box,helpers):
    anchor=box['anchor']
    profiles={'int':ANNOTATION_ANCHORS,'float':FLOAT_ANNOTATION_ANCHORS}.get(document,{})
    if anchor not in profiles:return None
    cls,saved,live,text_sha,attributes=profiles[anchor]
    canonical=lambda value:json.dumps(value,sort_keys=True,separators=(',',':'),allow_nan=False)
    if (source_sha256!=IDENTITIES[document] or len(helpers)!=4 or
        {h['name']:h['sha256'] for h in helpers}!=SHELL_HELPERS or
        box['maxclass']!=cls or box['runtime_class']!=cls or box['rect']!=saved or
        not all(finite(v) for v in box['rect']) or box.get('source_text_sha256')!=text_sha or
        canonical(box.get('source_attributes'))!=canonical(attributes) or
        ('outlets' in box and (type(box['outlets']) is not int or box['outlets']!=attributes['outlets'])) or
        ('id' in box and box['id']!=anchor.rsplit('/',1)[-1]) or
        any(type(box.get(k)) is not int or box[k]!=0 for k in ['saved_incoming_routes','saved_outgoing_routes'])):
        raise ValueError('Invalid measured int annotation binding')
    return dict(kind='source-bound-'+document+'-annotation-geometry',document=document,source_sha256=source_sha256,
                anchor=anchor,runtime_class=cls,saved_rect=saved[:],live_rect=live[:],source_text_sha256=text_sha,
                source_attributes=copy.deepcopy(attributes),helper_sha256=dict(SHELL_HELPERS),
                saved_incoming_routes=0,saved_outgoing_routes=0)


def numeric_mode_policy(document,source_sha256,box,helpers):
    anchor=box['anchor']
    if document!='float' or anchor not in FLOAT_MODE_RECTS:return None
    empty=hashlib.sha256(b'').hexdigest();rect=FLOAT_MODE_RECTS[anchor]
    canonical=lambda value:json.dumps(value,sort_keys=True,allow_nan=False)
    if (source_sha256!=IDENTITIES['float'] or len(helpers)!=4 or
        {h['name']:h['sha256'] for h in helpers}!=SHELL_HELPERS or box['maxclass']!='flonum' or
        box['runtime_class']!='flonum' or box['rect']!=rect or not all(finite(v) for v in box['rect']) or
        box.get('source_text_sha256')!=empty or canonical(box.get('source_attributes'))!=canonical(FLOAT_MODE_ATTRIBUTES) or
        ('outlets' in box and (type(box['outlets']) is not int or box['outlets']!=2)) or
        ('id' in box and box['id']!=anchor.rsplit('/',1)[-1])):
        raise ValueError('Invalid source-bound float mode profile')
    return dict(kind='source-bound-float-number-mode',document='float',source_sha256=source_sha256,anchor=anchor,
        source_class='flonum',runtime_class='number',saved_rect=rect[:],source_text_sha256=empty,
        source_attributes=copy.deepcopy(FLOAT_MODE_ATTRIBUTES),helper_sha256=dict(SHELL_HELPERS),
        getter_method='getattr',attribute='format',getter_representation='scalar-number',required_value=6)


def numeric_modes(document,raw,observations):
    expected={b['anchor']:b for b in document['boxes'] if 'numeric_mode_policy' in b}
    rows=raw.get('numeric_modes',[])
    if not isinstance(rows,list) or Counter(v.get('anchor') for v in rows)!=Counter(expected.keys()):
        raise ValueError('Exact float mode observation inventory required')
    helpers=[dict(name=k,sha256=v) for k,v in document.get('helper_sha256',{}).items()];classes={}
    for row in rows:
        box=expected[row['anchor']];policy=numeric_mode_policy(document['document'],document['source_sha256'],box,helpers)
        if policy is None or json.dumps(policy,sort_keys=True,allow_nan=False)!=json.dumps(
                box['numeric_mode_policy'],sort_keys=True,allow_nan=False):
            raise ValueError('Unapproved float mode profile')
        if (row.get('runtime_class')!='number' or row.get('source_class')!='flonum' or
            row.get('getter_method')!='getattr' or row.get('attribute')!='format' or
            row.get('getter_representation')!='scalar-number' or not finite(row.get('getter_value')) or row['getter_value']!=6):
            raise ValueError('Read-only float mode capability unavailable')
        name=original_varname(box);matches=[b for b in raw.get('boxes',[]) if b.get('varname')==name]
        if len(matches)!=1 or matches[0].get('maxclass')!='number':raise ValueError('Float runtime class changed')
        live=common.finite_rectangle(matches[0].get('rect'))
        if any(abs(a-b)>0.01 for a,b in zip(live,policy['saved_rect'])):raise ValueError('Float geometry changed')
        observations.append(dict(row,document=document['document'],source_sha256=document['source_sha256'],
            revision=document['revision'],saved_rect=policy['saved_rect'][:],live_rect=live[:],policy=policy))
        classes[name]='number'
    return classes


def annotation_geometry(document,raw,dispositions):
    replacements={}
    for box in document['boxes']:
        if 'annotation_geometry_policy' not in box:continue
        helpers=[dict(name=k,sha256=v) for k,v in document.get('helper_sha256',{}).items()]
        policy=annotation_geometry_policy(document['document'],document['source_sha256'],box,helpers)
        if policy is None or json.dumps(policy,sort_keys=True,allow_nan=False)!=json.dumps(
                box['annotation_geometry_policy'],sort_keys=True,allow_nan=False):
            raise ValueError('Unapproved numeric annotation policy')
        if any(edge[side][0]==box['id'] for edge in document['saved_edges'] for side in ['source','destination']):
            raise ValueError('Annotation saved route changed')
        name=original_varname(box);matches=[b for b in raw.get('boxes',[]) if b.get('varname')==name]
        if len(matches)!=1 or matches[0].get('maxclass')!=policy['runtime_class']:
            raise ValueError('Annotation runtime identity changed')
        live=common.finite_rectangle(matches[0].get('rect'));saved=policy['saved_rect']
        changed=3 if policy['runtime_class']=='comment' else 2
        full=all(abs(a-b)<=0.01 for a,b in zip(live,saved))
        adapted=live[changed]==policy['live_rect'][changed] and all(
            abs(live[i]-saved[i])<=0.01 for i in range(4) if i!=changed)
        if not full and not adapted:raise ValueError('Annotation runtime geometry changed')
        if adapted:
            replacements[name]=saved[:]
            dispositions.append(dict(document=document['document'],source_sha256=document['source_sha256'],
                revision=document['revision'],anchor=box['anchor'],runtime_class=policy['runtime_class'],
                saved_rect=saved[:],live_rect=live[:],policy=policy))
    return replacements


def validate_message(message):
    if not isinstance(message,dict) or set(message)!={'selector','atoms'}:
        raise ValueError('Finite message shape required')
    selector=message['selector'];atoms=message['atoms']
    if selector not in {'bang','int','float'} or not isinstance(atoms,list):
        raise ValueError('Finite typed message required')
    if selector=='bang':
        if atoms:raise ValueError('Bang has no atoms')
    elif (len(atoms)!=1 or not isinstance(atoms[0],dict) or set(atoms[0])!={'tag','value'} or
          atoms[0]['tag']!=selector or not finite(atoms[0]['value']) or
          (selector=='int' and type(atoms[0]['value']) is not int)):
        raise ValueError('Typed scalar payload mismatch')
    return message


def load_score():
    common.require_digest(SCORE,SCORE_SHA256)
    score=json.loads(SCORE.read_text());timeline(score)
    return score


def timeline(score):
    if not isinstance(score,list) or not score:raise ValueError('Nonempty timeline required')
    live={};revisions={};seen=set();result=[]
    for row in score:
        doc=row.get('document');step=row.get('step_id');action=row.get('action')
        if doc not in IDENTITIES or row.get('source_sha256')!=IDENTITIES[doc]:raise ValueError('Source mismatch')
        if not isinstance(step,str) or not re.fullmatch(r'[A-Za-z0-9_-]+',step) or step in seen:
            raise ValueError('Operation identity mismatch')
        seen.add(step)
        keys={'step_id','action','document','source_sha256'}
        if action=='install':
            keys.add('revision');revision=row.get('revision')
            if type(revision) is not int or revision!=revisions.get(doc,0)+1 or doc in live:
                raise ValueError('Fresh sequential closed-owner revision required')
            live[doc]=revision;revisions[doc]=revision
        elif action=='close':
            if doc not in live:raise ValueError('Absent close owner')
            del live[doc]
        elif action=='event':
            keys|={'anchor','inlet','message'}
            if doc not in live or row.get('inlet')!=0 or type(row.get('inlet')) is not int:
                raise ValueError('Absent event owner or invalid inlet')
            if not isinstance(row.get('anchor'),str) or not re.fullmatch(r'root/obj-2/obj-\d+',row['anchor']):
                raise ValueError('Original Basic anchor required')
            validate_message(row.get('message'))
        else:raise ValueError('Unsupported action')
        if set(row)!=keys:raise ValueError('Unexpected action fields')
        result.append(dict(row,live_owners=dict(live),action_revision=revisions[doc]))
    return result


def score_binding():
    return dict(path=str(SCORE.relative_to(REPO)),sha256=SCORE_SHA256,bytes=SCORE.stat().st_size,operations=len(load_score()))


def public_operation(operation):
    return {key:operation[key] for key in ['request_id','step_id','action','document','source_sha256',
        'action_revision','live_owners','checkpoint_request_ids','working_paths']}


def package_binding():
    files={p.name:digest(p) for p in sorted(ROOT.iterdir()) if p.suffix in {'.py','.js','.cjs'}}
    return dict(package_sha256=hashlib.sha256(json.dumps(files,sort_keys=True,separators=(',',':')).encode()).hexdigest(),
                package_files=files)


def preparation_binding(work):
    return dict(package_binding(),private_config_sha256=digest(Path(work)/'config.json'),
                private_seal_sha256=digest(Path(work)/'seal.json'),
                preparation_manifest_sha256=digest(ROOT/'preparation-manifest.json'))


def validate_checkpoint(document,raw,request_id,step_id,action,geometry_dispositions=None,numeric_mode_observations=None):
    if any(any(key in box for key in ['annotation_width_policy','observer_policy','shell_height_policy'])
           for box in document['boxes']):
        raise ValueError('Unapproved numeric geometry policy')
    if (type(raw.get('revision')) is not int or raw['revision']!=document['revision'] or
            raw.get('action')!=action or raw.get('readback_method')!='v8-numeric-getvalueof'):
        raise ValueError('Numeric checkpoint binding mismatch')
    dispositions=geometry_dispositions if geometry_dispositions is not None else []
    replacements=annotation_geometry(document,raw,dispositions)
    modes=numeric_mode_observations if numeric_mode_observations is not None else []
    mode_classes=numeric_modes(document,raw,modes)
    by_name={original_varname(b):b for b in document['boxes']}
    for actual in raw.get('boxes',[]):
        expected=by_name.get(actual.get('varname'))
        if expected and actual.get('maxclass') not in ([mode_classes[actual['varname']]] if actual.get('varname') in mode_classes
                else expected.get('runtime_classes',[expected['runtime_class']])):
            raise ValueError('Exact source runtime class changed')
    adapter=dict(raw,readback_method='v8-boxtext',messages=[dict(m,text='') for m in raw.get('messages',[])],
                 boxes=[dict(b,maxclass=by_name[b['varname']]['runtime_class'],
                             rect=replacements.get(b['varname'],b.get('rect'))) if b.get('varname') in by_name else b
                        for b in raw.get('boxes',[])])
    topology_document=dict(document,boxes=[dict(b,authored_text='',authored_empty=True) for b in document['boxes']])
    # Reuse the audited duplicate-sensitive original/leaf box and endpoint checks.
    old=common.validate_v8_readback(topology_document,adapter,request_id,step_id)
    messages=raw.get('messages',[]);message_states=[]
    for message in messages:
        box=next(b for b in document['boxes'] if b['anchor']==message['anchor'])
        if message['text']!=box['authored_text']:raise ValueError('Message prototype changed')
        message_states.append(dict(anchor=box['anchor'],text_sha256=hashlib.sha256(message['text'].encode()).hexdigest(),
                                   text_characters=len(message['text']),prototype_unchanged=True))
    expected={b['anchor']:b for b in document['boxes'] if b['maxclass'] in NUMERIC}
    numeric=raw.get('numeric')
    if not isinstance(numeric,list) or Counter(v.get('anchor') for v in numeric)!=Counter(expected.keys()):
        raise ValueError('Numeric getter inventory mismatch')
    states=[]
    for value in numeric:
        box=expected[value['anchor']];cls=box['maxclass'];number=value.get('value')
        tag='float' if cls=='flonum' else 'int'
        basis='flonum-class' if cls=='flonum' else ('number-class' if cls=='number' else 'source-integer-slider-mode')
        if (not finite(number) or value.get('class_name')!=cls or value.get('getter_method')!='getvalueof' or
                value.get('getter_representation') not in {'scalar-number','singleton-number-array'} or
                value.get('semantic_tag')!=tag or value.get('semantic_tag_basis')!=basis or
                (tag=='int' and number!=math.trunc(number))):
            raise ValueError('Numeric getter unavailable or malformed')
        states.append(dict(anchor=box['anchor'],class_name=cls,value=number,semantic_tag=tag,
                           semantic_tag_basis=basis,getter_representation=value['getter_representation'],
                           getter_method='getvalueof',receipt_tag_observed=False))
    return dict(request_id=request_id,step_id=step_id,action=action,document=document['document'],
                source_sha256=document['source_sha256'],revision=document['revision'],
                working_path=document['working_windows_path'],readback_method='v8-numeric-getvalueof',
                numeric_states=states,message_states=message_states,
                retention=dict(old['retention'],input_endpoint_multiset_verified=True,
                               output_endpoint_multiset_verified=True))


def validate_live_checkpoints(operation,checkpoints):
    observed=Counter(row.get('document') for row in checkpoints)
    if not operation['live_owners'] or observed!=Counter(operation['live_owners'].keys()):
        raise ValueError('Exact nonempty all-live checkpoint set required')
    for row in checkpoints:
        if (row['step_id']!=operation['step_id'] or row['action']!=operation['action'] or
                row['revision']!=operation['live_owners'][row['document']]):
            raise ValueError('Live checkpoint revision mismatch')


def retain_raw(path,payload):
    path=Path(path)
    with path.open('xb') as stream:
        path.chmod(0o600);stream.write(payload)
    return dict(raw_sha256=hashlib.sha256(payload).hexdigest(),raw_bytes=len(payload))


def extract_checkpoint(work,document,path,request_id,step_id,action,request_record=None):
    verify_private(work)
    path=Path(path);payload=path.read_bytes();path.chmod(0o600)
    binding=retain_raw(path.with_name('retained-'+path.name),payload)
    if request_record is not None:request_record.update(binding)
    dispositions=[];modes=[];validated=False
    try:
        raw=json.loads(payload)
        result=validate_checkpoint(document,raw,request_id,step_id,action,dispositions,modes);validated=True
    finally:
        try:
            if dispositions or modes:
                sidecar=dict(schema_version=1,request_id=request_id,step_id=step_id,action=action,
                    document=document['document'],revision=document['revision'],source_sha256=document['source_sha256'],
                    checkpoint_validated=validated,geometry_dispositions=dispositions,numeric_mode_observations=modes,**binding)
                retain_raw(path.with_name('geometry-dispositions-'+path.name),
                    (json.dumps(sidecar,sort_keys=True,allow_nan=False)+'\n').encode())
        finally:verify_private(work)
    return dict(result,**binding)


def public_receipt(row):
    result={key:row[key] for key in ['seq','request_id','step_id','action','action_document','action_revision',
        'document','revision','source_sha256','kind','anchor','port','synchronous_dispatch_active',
        'closed_owner_absence_validated'] if key in row}
    if 'message' in row:
        message=row['message']
        if row.get('kind')=='stimulus':validate_message(message)
        else:
            if not isinstance(message.get('selector'),str) or not isinstance(message.get('atoms'),list):
                raise ValueError('Malformed output message')
            if message['selector'] in {'bang','int','float'}:validate_message(message)
            for atom in message['atoms']:
                tag=atom.get('tag');value=atom.get('value')
                if (tag not in {'symbol','int','float','unknown-number'} or
                    (tag=='symbol' and not isinstance(value,str)) or
                    (tag!='symbol' and not finite(value)) or (tag=='int' and type(value) is not int)):
                    raise ValueError('Malformed output atom')
        result['message']=common.public_message(message)
    if row.get('kind')=='harness-error':
        result['error_sha256']=hashlib.sha256(str(row.get('error')).encode()).hexdigest()
    return result


def validate_numeric_progress(document,checkpoint,receipts,prior,initial=False):
    for state in checkpoint['numeric_states']:
        key=(document['document'],document['revision'],state['anchor'])
        source=next(b for b in document['boxes'] if b['anchor']==state['anchor'])
        outputs=[r for r in receipts if r.get('kind')=='receipt' and r.get('document')==document['document'] and
                 r.get('revision')==document['revision'] and r.get('anchor')==state['anchor'] and r.get('port')==0]
        expected=source.get('initial_numeric',0) if initial else prior.get(key)
        if outputs:
            msg=outputs[-1]['message'];validate_message(msg)
            if msg['selector']!=state['semantic_tag']:raise ValueError('UI output semantic type mismatch')
            expected=msg['atoms'][0]['value']
        if expected is None or state['value']!=expected:raise ValueError('Getter differs from initial/actual/silent UI value')
        prior[key]=state['value']


def destination_witness(operation,rows):
    endpoints={}
    for anchor in ['obj-21','obj-24']:
        matches=[r for r in rows if r.get('kind')=='receipt' and r.get('document')==operation['document'] and
                 r.get('revision')==operation['action_revision'] and r.get('request_id')==operation['request_id'] and
                 r.get('step_id')==operation['step_id'] and r.get('anchor')=='root/obj-2/'+anchor and r.get('port')==0]
        if len(matches)!=1 or matches[0].get('synchronous_dispatch_active') is not True:
            raise ValueError('Immediate destination output witness unavailable')
        endpoints[anchor]=matches[0]
    number,button=endpoints['obj-21'],endpoints['obj-24']
    validate_message(number['message']);validate_message(button['message'])
    if (number['message']['selector'] not in {'int','float'} or button['message']['selector']!='bang' or
            type(number['seq']) is not int or type(button['seq']) is not int or number['seq']>=button['seq']):
        raise ValueError('Destination output order changed')
    return dict(step_id=operation['step_id'],document=operation['document'],revision=operation['action_revision'],
                request_id=operation['request_id'],numeric_seq=number['seq'],button_seq=button['seq'],synchronous=True)


def source_metadata(resources=common.RESOURCES):
    helpers=common.helper_metadata(resources);documents=[];public=[]
    for name,sha in IDENTITIES.items():
        source=Path(resources)/'help/max'/(name+'.maxhelp');common.require_digest(source,sha)
        root=json.loads(source.read_text())['patcher']
        basic=next(b['box']['patcher'] for b in root['boxes'] if b['box']['id']=='obj-2')
        boxes=[]
        allowed={'int','i','float','f','r','receive','*'}
        for item in basic['boxes']:
            b=item['box'];text=b.get('text','');classes=runtime_classes(b['maxclass'],text)
            if b['maxclass']=='newobj' and text.split()[0] not in allowed:raise ValueError('Unexpected executable class')
            boxes.append(dict(id=b['id'],anchor='root/obj-2/'+b['id'],maxclass=b['maxclass'],runtime_class=classes[0],runtime_classes=classes,
                rect=b['patching_rect'],outlets=b.get('numoutlets',0),authored_text=text,
                authored_empty=not bool(text),initial_numeric=initial_numeric(b)))
        if len({tuple(b['rect']) for b in boxes})!=len(boxes):raise ValueError('Saved geometry not unique')
        def tree_inventory(patcher,scope='root'):
            result=[]
            for item in patcher.get('boxes',[]):
                b=item['box'];anchor=scope+'/'+b['id'];cls=b['maxclass']
                classes=runtime_classes(cls,b.get('text',''))
                routes=[line['patchline'] for line in patcher.get('lines',[])]
                entry=dict(anchor=anchor,maxclass=cls,runtime_class=classes[0],runtime_classes=classes,
                    rect=b['patching_rect'],child='patcher' in b,source_varname=b.get('varname'),
                    source_text_sha256=hashlib.sha256(b.get('text','').encode()).hexdigest(),
                    saved_incoming_routes=sum(e['destination'][0]==b['id'] for e in routes),
                    saved_outgoing_routes=sum(e['source'][0]==b['id'] for e in routes))
                policy=shell_height_policy(name,sha,entry,helpers)
                if policy is not None:entry['shell_height_policy']=policy
                annotation_profiles={'int':ANNOTATION_ANCHORS,'float':FLOAT_ANNOTATION_ANCHORS}[name]
                if anchor in annotation_profiles:
                    attributes=dict(inlets=b.get('numinlets'),outlets=b.get('numoutlets'))
                    fields=(['fontname','fontsize','bubble','bubbleside','bubblepoint','bubbletextmargin','linecount']
                            if cls=='comment' else ['filename','ignoreclick','border','parameter_enable','outlettype'])
                    attributes.update({k:b.get(k) for k in fields})
                    if cls=='jsui':attributes['jsarguments_sha256']=hashlib.sha256(
                        json.dumps(b.get('jsarguments'),sort_keys=True,separators=(',',':')).encode()).hexdigest()
                    entry['source_attributes']=attributes
                    entry['annotation_geometry_policy']=annotation_geometry_policy(name,sha,entry,helpers)
                if name=='float' and anchor in FLOAT_MODE_RECTS:
                    attributes=dict(inlets=b.get('numinlets'),outlets=b.get('numoutlets'))
                    attributes.update({k:b.get(k) for k in ['format','numdecimalplaces','fontname','fontsize','outlettype','parameter_enable']})
                    entry['source_attributes']=attributes
                    entry['numeric_mode_policy']=numeric_mode_policy(name,sha,entry,helpers)
                result.append(entry)
                if 'patcher' in b:result.extend(tree_inventory(b['patcher'],anchor))
            return result
        inventory=tree_inventory(root);edges=[dict(index=i,**e['patchline']) for i,e in enumerate(basic.get('lines',[]))]
        by_anchor={entry['anchor']:entry for entry in inventory}
        for box in boxes:
            entry=by_anchor[box['anchor']]
            if 'annotation_geometry_policy' in entry:
                box.update({key:copy.deepcopy(entry[key]) for key in ['source_text_sha256','source_attributes',
                    'annotation_geometry_policy','saved_incoming_routes','saved_outgoing_routes']})
            if 'numeric_mode_policy' in entry:
                box.update({key:copy.deepcopy(entry[key]) for key in ['source_text_sha256','source_attributes','numeric_mode_policy']})
        executable=sum(b['maxclass'] not in {'comment','jsui'} for b in boxes)
        # Native node count excludes source-only annotations; full count includes the entire shell.
        if len(inventory)!=COUNTS[name][0] or executable!=COUNTS[name][1] or len(edges)!=COUNTS[name][2]:
            raise ValueError('Pinned numeric full-tree counts changed')
        d=dict(document=name,source_sha256=sha,source_path=str(source.resolve()),basic_varname='basic_tab',
               boxes=boxes,saved_edges=edges,full_inventory=inventory,
               helper_sha256={h['name']:h['sha256'] for h in helpers})
        d['observer_leaves']=observer_definitions(d);documents.append(d)
        public.append(dict(document=name,source_sha256=sha,bytes=source.stat().st_size,full_box_count=len(inventory),
                           basic_box_count=len(boxes),basic_cable_count=len(edges),executable_count=executable,
                           observer_leaf_cables=len(d['observer_leaves']),
                           anchors=[{k:b[k] for k in ['anchor','maxclass','runtime_class','rect','outlets']} for b in boxes]))
    return documents,public,helpers


def initial_numeric(box):
    if box['maxclass'] not in NUMERIC:return None
    value=box.get('value',0)
    if isinstance(value,list) and len(value)==1:value=value[0]
    if not finite(value):raise ValueError('Initial numeric source value unavailable')
    return value


def prepare_private(work,resources=common.RESOURCES):
    work=Path(work).resolve();cache=Path.home()/'.cache/alive-ultra-evidence'
    if work==cache or cache not in work.parents or REPO in work.parents or work.exists():
        raise ValueError('New private alive-ultra-evidence directory required')
    manifest_path=ROOT/'preparation-manifest.json'
    if manifest_path.exists():raise ValueError('Refuse to replace a reviewed public preparation manifest')
    config_argument=windows_path(work/'config.json')
    if any(c.isspace() or c=='"' for c in config_argument):
        raise ValueError('Unquoted driver config path must be whitespace-free and contain no quotation marks')
    docs,public,helpers=source_metadata(resources)
    work.mkdir(parents=True,mode=0o700)
    for folder in ['pristine','working','observations','helpers']:(work/folder).mkdir(mode=0o700)
    for helper in helpers:
        target=work/'helpers'/helper['name'];shutil.copyfile(Path(resources)/helper['path'],target);target.chmod(0o600)
        common.require_digest(target,helper['sha256'])
    revisions=[]
    for doc in docs:
        for revision in [1,2]:
            pristine=work/'pristine'/(doc['document']+'-r'+str(revision)+'.maxhelp')
            working=work/'working'/pristine.name
            for path in [pristine,working]:
                shutil.copyfile(doc['source_path'],path);path.chmod(0o600);common.require_digest(path,doc['source_sha256'])
            revisions.append(dict(doc,revision=revision,pristine_path=str(pristine),working_path=str(working),
                                  working_windows_path=windows_path(working)))
    for name in ['controller.js','observer.js','v8-readback.js','lifecycle-observer.js']:
        shutil.copyfile(ROOT/name,work/name);(work/name).chmod(0o600)
    paths={name:windows_path(work/(name+'.json')) for name in ['command','ack','ready']}
    config=dict(schema_version=1,work=str(work),documents=revisions,helpers=helpers,source_metadata=public,
        safety_sha256={name:digest(PREVIOUS/name) for name in ['run-runtime.py','help_runtime.py']},
        package_sha256={p.name:digest(p) for p in ROOT.iterdir() if p.suffix in {'.py','.js','.cjs'}},
        score_binding=score_binding(),readback_method='v8-numeric-getvalueof',
        global_name='alive_numeric_'+hashlib.sha256(str(work).encode()).hexdigest()[:16],
        journal_path=windows_path(work/'private-journal.jsonl'),observer_path=windows_path(work/'observer.js'),
        readback_helper_path=windows_path(work/'v8-readback.js'),
        **{name+'_path':value for name,value in paths.items()})
    epoch=secrets.token_hex(24);owners=[]
    # Channel symbols are private, fresh, and disjoint from source/score strings.
    def strings(value):
        if isinstance(value,str):yield value
        elif isinstance(value,dict):
            for v in value.values():yield from strings(v)
        elif isinstance(value,list):
            for v in value:yield from strings(v)
    forbidden=set(strings(load_score()))
    for doc in docs:
        for value in strings(json.loads(Path(doc['source_path']).read_text())):
            forbidden.add(value);forbidden.update(value.split())
    for inlet,definition in enumerate(revisions):
        channel='__alive_lifecycle_'+epoch+'_'+str(inlet)
        if channel in forbidden:raise ValueError('Lifecycle channel collides with source/score')
        definition['lifecycle_owner_inlet']=inlet
        owners.append(dict(document=definition['document'],revision=definition['revision'],
            source_sha256=definition['source_sha256'],working_path=definition['working_windows_path'],
            channel=channel,inlet=inlet,root_proof_path=windows_path(work/'observations'/
                ('lifecycle-root-'+definition['document']+'-r'+str(definition['revision'])+'.json'))))
    inventory=[dict(varname='__alive_numeric_controller',maxclass='js',
        boxtext='js controller.js '+config_argument,rect=[20,20,350,50]),
        dict(varname='__alive_numeric_lifecycle_observer',maxclass='v8',
        boxtext='v8 lifecycle-observer.js '+config_argument,rect=[-2000,-2000,300,50])]
    inventory.extend(dict(varname='__alive_numeric_lifecycle_receive_'+str(o['inlet']),maxclass='receive',
        boxtext='receive '+o['channel'],rect=[-2000,-2100-30*o['inlet'],300,50]) for o in owners)
    config['lifecycle']=dict(version='freebang-v1',monitor_epoch=epoch,
        observer_path=windows_path(work/'lifecycle-observer.js'),report_path=windows_path(work/'lifecycle-report.json'),
        driver_inventory=inventory,owners=owners)
    driver=dict(patcher=dict(fileversion=1,rect=[0,0,400,160],locked=1,
        boxes=[dict(box=dict(id=e['varname'],varname=e['varname'],maxclass='newobj',text=e['boxtext'],
            patching_rect=e['rect'])) for e in inventory],
        lines=[dict(patchline=dict(source=['__alive_numeric_lifecycle_receive_'+str(o['inlet']),0],
            destination=['__alive_numeric_lifecycle_observer',o['inlet']+1])) for o in owners]))
    write_json(work/'driver.maxpat',driver);write_json(work/'config.json',config)
    seal={str(p.relative_to(work)):digest(p) for p in work.rglob('*') if p.is_file()}
    write_json(work/'seal.json',dict(files=seal,score_binding=score_binding()))
    write_json(manifest_path,dict(schema_version=1,status='PREPARED_NOT_EXECUTED',runtime_invocations=0,
        private_work=str(work),private_config_sha256=digest(work/'config.json'),private_seal_sha256=digest(work/'seal.json'),
        score_binding=score_binding(),source_metadata=public,helpers=helpers))
    verify_private(work)
    return config


def verify_private(work):
    work=Path(work).resolve()
    validate_preparation_manifest(work,json.loads((ROOT/'preparation-manifest.json').read_text()))
    config=json.loads((work/'config.json').read_text());seal=json.loads((work/'seal.json').read_text())
    if config['work']!=str(work) or config['score_binding']!=score_binding() or seal['score_binding']!=score_binding():
        raise ValueError('Private preparation binding changed')
    for name,sha in seal['files'].items():common.require_digest(work/name,sha)
    for name,sha in config['safety_sha256'].items():common.require_digest(PREVIOUS/name,sha)
    for name,sha in config['package_sha256'].items():common.require_digest(ROOT/name,sha)
    for doc in config['documents']:
        for key in ['source_path','pristine_path','working_path']:common.require_digest(doc[key],doc['source_sha256'])
        for key in ['pristine_path','working_path']:
            p=Path(doc[key]);
            if p.is_symlink() or work not in p.resolve().parents:raise ValueError('Protected revision path escaped work')
    common.require_helpers(common.RESOURCES,config['helpers'])
    for helper in config['helpers']:common.require_digest(work/'helpers'/helper['name'],helper['sha256'])
    for p in [work,*work.rglob('*')]:
        if p.is_symlink() or p.stat().st_mode & 0o077:raise ValueError('Private permissions or symlink mismatch')
    return config


def validate_preparation_manifest(work,manifest):
    if manifest.get('private_work')!=str(Path(work).resolve()) or manifest.get('score_binding')!=score_binding():
        raise ValueError('Reviewed preparation manifest binding changed')
    common.require_digest(Path(work)/'config.json',manifest['private_config_sha256'])
    common.require_digest(Path(work)/'seal.json',manifest['private_seal_sha256'])
