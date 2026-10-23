#!/usr/bin/env python3
"""Private source preparation and public evidence normalization; no target execution."""
import hashlib
from collections import Counter
import json
import math
from pathlib import Path
import re
import shutil

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
RESOURCES = Path('/home/venetanji/.wine-ableton/drive_c/ProgramData/Ableton/Live 12 Suite/Resources/Max/resources')
IDENTITIES = {
    'append':('d4a3fe4d87f7fd7b30c747cc18cc09f7ba6dd703adadc279733df38503962729','obj-5'),
    'prepend':('281fec882e5eac1c59f74b677a2c8485701602153028e2bead9e338e1440f5fb','obj-2'),
}
BUILTIN_SELECTORS = {'bang','int','float','list','symbol','set'}
HELPER_NAMES = {'helpstarter.js','helpname.js','helpdetails.js','helpargs.js'}
ANNOTATION_HELPER_SHA256 = '04cce1cb44b358680d9c6d3ef19873fa5ccbb192614905dc909057cf22805469'
ANNOTATION_RECT = [130,195,257.934143,39]
READBACK_METHODS = {'private-serialization','v8-boxtext'}


def write_json(path, value):
    path=Path(path);temporary=path.with_name(path.name+'.tmp')
    temporary.write_text(json.dumps(value,indent=2,ensure_ascii=True,allow_nan=False)+'\n')
    temporary.chmod(0o600)
    temporary.replace(path)


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def require_digest(path, expected):
    if digest(path) != expected:
        raise ValueError('Source identity mismatch: '+str(path))


def require_helpers(resources,helpers):
    if len(helpers)!=4 or {item['name'] for item in helpers}!=HELPER_NAMES:
        raise ValueError('The four pinned help helper identities are required')
    for item in helpers:
        if item['path']!='help/resources/'+item['name']:raise ValueError('Unexpected helper path')
        path=Path(resources)/item['path']
        require_digest(path,item['sha256'])
        if path.stat().st_size!=item['bytes']:raise ValueError('Helper size mismatch')


def helper_metadata(resources=RESOURCES):
    catalog=json.loads((ROOT.parent/'hierarchy-reference-20261021/sources.json').read_text())
    helpers=[dict(name=name,**value) for name,value in sorted(catalog['scripts'].items())]
    require_helpers(resources,helpers)
    return helpers


def windows_path(path):
    return 'Z:'+str(Path(path).resolve()).replace('\\','/')


def symbol_identity(value):
    return 'symbol-sha256:'+hashlib.sha256(value.encode()).hexdigest()


def public_message(message):
    selector = message['selector']
    atoms = []
    for atom in message['atoms']:
        value = atom['value']
        if atom['tag'] == 'symbol':
            value = symbol_identity(value)
        elif not isinstance(value,(int,float)) or not math.isfinite(value):
            raise ValueError('Nonfinite or invalid numeric receipt')
        atoms.append(dict(tag=atom['tag'],value=value))
    return dict(selector=selector if selector in BUILTIN_SELECTORS else symbol_identity(selector),atoms=atoms)


def public_row(row):
    allowed = {'seq','step_id','document','kind','anchor','port','wall_ms','ordinal','interaction','request_id','source_sha256'}
    result = {key:value for key,value in row.items() if key in allowed}
    if row.get('kind') == 'stimulus':
        command=row['value']
        result.update({key:value for key,value in command.items() if key in allowed})
        result['message']=public_message(command['message'])
    elif row.get('kind')=='readback-request':
        identity=row.get('value')
        if (not isinstance(identity,dict) or type(identity.get('request_id')) is not int or
                identity['request_id']<=0 or not isinstance(identity.get('source_sha256'),str) or
                not re.fullmatch(r'[0-9a-f]{64}',identity['source_sha256'])):
            raise ValueError('Invalid public readback request identity')
        result.update({key:identity[key] for key in ['request_id','source_sha256']})
    if 'message' in row:
        result['message'] = public_message(row['message'])
    if 'error' in row:
        result['error_sha256'] = hashlib.sha256(str(row['error']).encode()).hexdigest()
    elif row.get('kind')=='harness-error':
        result['error_sha256'] = hashlib.sha256(str(row.get('value')).encode()).hexdigest()
    return result


def parse_message_text(text):
    if not isinstance(text,str):
        return None
    if any(c in text for c in ['"',';',',','\\','\n','\r','$']):
        raise ValueError('Checkpoint text is outside the finite simple-token profile')
    words = text.split()
    if not words:
        return dict(empty=True,message=None)
    atoms = []
    for word in words:
        if re.fullmatch(r'[+-]?\d+',word):
            atoms.append(dict(tag='int',value=int(word)))
        elif re.fullmatch(r'[+-]?(?:\d+\.\d*|\d*\.\d+)(?:[eE][+-]?\d+)?',word):
            value=float(word)
            if not math.isfinite(value): raise ValueError('Nonfinite saved token')
            atoms.append(dict(tag='float',value=value))
        else:
            atoms.append(dict(tag='symbol',value=word))
    if atoms[0]['tag']=='symbol':
        selector=atoms[0]['value'];atoms=atoms[1:]
    else:
        selector=atoms[0]['tag'] if len(atoms)==1 else 'list'
    return dict(empty=False,message=dict(selector=selector,atoms=atoms))


def public_message_state(text, authored_empty, readback_method='private-serialization'):
    if readback_method not in READBACK_METHODS:raise ValueError('Unknown Message readback method')
    content=parse_message_text(text)
    return dict(authored_empty=authored_empty,
        status=('observed-private-v8-boxtext' if readback_method=='v8-boxtext' else
                'observed-private-serialization') if content is not None else 'unavailable',
        live_content=None if content is None else dict(empty=content['empty'],
            message=None if content['message'] is None else public_message(content['message'])),
        text_sha256=None if text is None else hashlib.sha256(text.encode()).hexdigest(),
        text_characters=None if text is None else len(text),
        rendering='not observed; '+('V8 Message boxtext only' if readback_method=='v8-boxtext' else
                                    'serialized Message content only'))


def matches_serialized_message(raw_message, state):
    content=state['live_content']
    if content is None or content['empty']:return False
    expected=public_message(raw_message);actual=content['message']
    if expected['selector']!=actual['selector'] or len(expected['atoms'])!=len(actual['atoms']):return False
    for left,right in zip(expected['atoms'],actual['atoms']):
        if left['value']!=right['value']:return False
        if left['tag']!='unknown-number' and left['tag']!=right['tag']:return False
    return True


def snapshot_target(document):
    target=Path(document['working_path']).resolve()
    for key in ['source_path','pristine_path']:
        protected=Path(document[key]).resolve()
        if target == protected or (target.exists() and protected.exists() and target.samefile(protected)):
            raise ValueError('Serialization may target only the distinct expendable working copy')
    return target


def inventory(patcher, scope='root'):
    result=[]
    for item in patcher.get('boxes',[]):
        box=item['box'];anchor=scope+'/'+box['id']
        result.append(dict(anchor=anchor,maxclass=box['maxclass'],
            inlets=box.get('numinlets'),outlets=box.get('numoutlets'),
            text_sha256=hashlib.sha256(box.get('text','').encode()).hexdigest(),
            child='patcher' in box))
        if 'patcher' in box:
            result.extend(inventory(box['patcher'],anchor))
    return result


def annotation_width_profile():
    return dict(kind='source-bound-helper-width',source_sha256=IDENTITIES['append'][0],anchor='root/obj-5/obj-4',
        helper_filename='helpargs.js',helper_sha256=ANNOTATION_HELPER_SHA256,source_ignoreclick=1,source_outlets=1,
        saved_incoming_routes=0,saved_outgoing_routes=0,saved_rect=ANNOTATION_RECT[:],
        observer_policy='omit-disconnected-annotation-leaf')


def public_annotation_width_policy(value):
    expected=annotation_width_profile()
    if not isinstance(value,dict) or any(value.get(key)!=item for key,item in expected.items()):
        raise ValueError('Invalid source-bound annotation policy')
    return expected


def derive_annotation_width_policy(document,source_sha256,anchor,box,saved_edges,helper_sha256):
    if (document!='append' or source_sha256!=IDENTITIES['append'][0] or
            anchor!='root/obj-5/obj-4' or box.get('id')!='obj-4' or box.get('maxclass')!='jsui' or
            box.get('filename')!='helpargs.js' or type(box.get('ignoreclick')) is not int or
            box['ignoreclick']!=1 or type(box.get('numoutlets')) is not int or box['numoutlets']!=1 or
            box.get('patching_rect')!=ANNOTATION_RECT or helper_sha256!=ANNOTATION_HELPER_SHA256):
        return None
    incoming=sum(edge.get('destination',[None])[0]=='obj-4' for edge in saved_edges)
    outgoing=sum(edge.get('source',[None])[0]=='obj-4' for edge in saved_edges)
    if incoming or outgoing:return None
    return annotation_width_profile()


def source_metadata(resources=RESOURCES):
    public=[];private=[]
    helpers=helper_metadata(resources)
    annotation_helper=next(item['sha256'] for item in helpers if item['name']=='helpargs.js')
    for name,(expected,basic_id) in IDENTITIES.items():
        path=Path(resources)/'help/max'/(name+'.maxhelp')
        require_digest(path,expected)
        root=json.loads(path.read_text())['patcher']
        basic=next(x['box']['patcher'] for x in root['boxes'] if x['box']['id']==basic_id)
        rectangles=[tuple(x['box']['patching_rect']) for x in basic['boxes']]
        if len(set(rectangles)) != len(rectangles): raise ValueError('Nonunique saved anchor geometry')
        saved_edges=[dict(index=i,**e['patchline']) for i,e in enumerate(basic['lines'])]
        boxes=[];annotation_policies=[]
        for item in basic['boxes']:
            box=item['box'];text=box.get('text','')
            anchor='root/'+basic_id+'/'+box['id']
            expected_box=dict(id=box['id'],anchor=anchor,
                maxclass=box['maxclass'],runtime_class=text.split()[0] if box['maxclass']=='newobj' else box['maxclass'],
                rect=box['patching_rect'],outlets=box.get('numoutlets',0),
                filename=box.get('filename'),ignoreclick=box.get('ignoreclick'),
                authored_empty=not bool(text),authored_text=text)
            policy=derive_annotation_width_policy(name,expected,anchor,box,saved_edges,annotation_helper)
            if policy is not None:
                expected_box.update(annotation_width_policy=policy,observer_policy=policy['observer_policy'])
                annotation_policies.append(policy)
            boxes.append(expected_box)
        facts=dict(document=name,source_sha256=expected,bytes=path.stat().st_size,
            basic_anchor='root/'+basic_id,full_inventory=inventory(root),
            basic_saved_edges=[dict(index=e['index'],source=e['source'],destination=e['destination'],
                                    order=e.get('order')) for e in saved_edges],
            basic_boxes=len(basic['boxes']),basic_cables=len(saved_edges),
            annotation_width_policies=annotation_policies)
        public.append(facts)
        private.append(dict(document=name,source_sha256=expected,source_path=str(path.resolve()),
            basic_id=basic_id,basic_varname='basic_tab',boxes=boxes,saved_edges=saved_edges,
            full_inventory=facts['full_inventory']))
    return public,private


def build_score():
    score=[]
    def add(document,row,box,label,value=None,interaction=None):
        scope=IDENTITIES[document][1]
        score.append(dict(step_id=label,ordinal=len(score),document=document,row=row,
            source_sha256=IDENTITIES[document][0],anchor='root/'+scope+'/'+box,
            action='event',inlet=0,interaction=interaction or ('saved-control-bang' if value is None else 'programmatic-hot-int'),
            message=dict(selector='bang' if value is None else 'int',
                         atoms=[] if value is None else [dict(tag='int',value=value)])))
    for value in [0,7,-3]: add('append','A1','obj-7','a1-value-'+str(value),value)
    for index,box in enumerate(['obj-16','obj-17','obj-16']):add('append','A2',box,'a2-click-'+str(index))
    add('append','A3','obj-24','a3-before-set',7)
    add('append','A3','obj-18','a3-set-first')
    add('append','A3','obj-24','a3-after-first',7)
    add('append','A3','obj-22','a3-set-second')
    add('append','A3','obj-24','a3-after-second',-3)
    add('append','A3','obj-24','a3-repeat-second',-3)
    add('append','A3','obj-18','a3-replace-again')
    add('append','A3','obj-24','a3-after-replace',0)
    for box,upstream,value in [('obj-9','obj-7',7),('obj-10','obj-16',None),('obj-20','obj-24',7)]:
        add('append','A4',box,'a4-display-'+box)
        add('append','A4',upstream,'a4-upstream-'+box,value)
    for index,box in enumerate(['obj-10','obj-11','obj-27','obj-10','obj-11','obj-11']):
        add('prepend','P1',box,'p1-click-'+str(index))
    for index,box in enumerate(['obj-14','obj-15','obj-16','obj-19','obj-19','obj-14','obj-19']):
        add('prepend','P2',box,'p2-click-'+str(index))
    return score


def original_varname(box):
    return '__alive_help_'+box['id'].replace('-','_')


def observer_definitions(document):
    leaves=[]
    for box in document['boxes']:
        if box.get('observer_policy')=='omit-disconnected-annotation-leaf':continue
        for port in range(box['outlets']):
            leaves.append(dict(varname='__alive_help_leaf_'+box['id'].replace('-','_')+'_'+str(port),
                               anchor=box['anchor'],port=port))
    return leaves


def prepare_private(work, resources=RESOURCES, readback_method='private-serialization'):
    if readback_method not in READBACK_METHODS:raise ValueError('Unknown Message readback method')
    work=Path(work).resolve()
    if work==REPO or REPO in work.parents:
        raise ValueError('Licensed source material must remain outside the repository')
    if work.exists(): raise ValueError('Private preparation directory must be new')
    public,documents=source_metadata(resources);helpers=helper_metadata(resources)
    work.mkdir(parents=True,mode=0o700)
    (work/'pristine').mkdir(mode=0o700);(work/'working').mkdir(mode=0o700);(work/'snapshots').mkdir(mode=0o700)
    if readback_method=='v8-boxtext':(work/'observations').mkdir(mode=0o700)
    for document in documents:
        name=document['document']+'.maxhelp'
        pristine=work/'pristine'/name;working=work/'working'/name
        shutil.copyfile(document['source_path'],pristine)
        shutil.copyfile(pristine,working)
        pristine.chmod(0o600);working.chmod(0o600)
        document.update(pristine_path=str(pristine),working_path=str(working),
                        working_windows_path=windows_path(working),initial_working_sha256=digest(working))
        require_digest(pristine,document['source_sha256']);require_digest(working,document['source_sha256'])
        snapshot_target(document)
        if readback_method=='v8-boxtext':
            document.update(observer_leaves=observer_definitions(document),
                readback_path=str(work/'observations'/(document['document']+'.json')),
                readback_windows_path=windows_path(work/'observations'/(document['document']+'.json')))
            Path(document['readback_path']).touch(mode=0o600,exist_ok=False)
    harness=['controller.js','observer.js']+(['v8-readback.js'] if readback_method=='v8-boxtext' else [])
    for name in harness:
        shutil.copyfile(ROOT/name,work/name)
        (work/name).chmod(0o600)
    config=dict(schema_version=2,work=str(work),documents=documents,helpers=helpers,readback_method=readback_method,
        command_path=windows_path(work/'command.json'),ack_path=windows_path(work/'ack.json'),
        ready_path=windows_path(work/'ready.json'),journal_path=windows_path(work/'private-journal.jsonl'),
        observer_path=windows_path(work/'observer.js'),
        harness_sha256={name:digest(ROOT/name) for name in harness},
        global_name='alive_help_roots_'+hashlib.sha256(str(work).encode()).hexdigest()[:16])
    if readback_method=='v8-boxtext':config['readback_helper_path']=windows_path(work/'v8-readback.js')
    driver=dict(patcher=dict(fileversion=1,appversion=dict(major=9,minor=1,revision=5,architecture='x64'),
        rect=[0,0,400,160],locked=1,boxes=[dict(box=dict(id='driver',maxclass='newobj',
        text='js controller.js '+json.dumps(windows_path(work/'config.json')),
        patching_rect=[20,20,350,23]))],lines=[]))
    write_json(work/'driver.maxpat',driver)
    config['driver_sha256']=digest(work/'driver.maxpat')
    write_json(work/'config.json',config)
    write_json(ROOT/'source-identities.json',dict(schema_version=2,status='PREPARED_NOT_EXECUTED',sources=public,helpers=helpers))
    write_json(ROOT/'score.json',build_score())
    return config


def seal_preparation(work):
    work=Path(work).resolve()
    artifacts=[]
    for path in sorted(ROOT.iterdir()):
        if path.is_file() and path.name!='preparation-manifest.json':
            artifacts.append(dict(path=path.name,bytes=path.stat().st_size,sha256=digest(path)))
    manifest=dict(schema_version=1,status='PREPARED_NOT_EXECUTED',runtime_invocations=0,
        screenshots=0,clipboard_actions=0,whole_help_qualification=dict(numerator=0,denominator=2103),
        private_work=str(work),private_config_sha256=digest(work/'config.json'),artifacts=artifacts)
    write_json(ROOT/'preparation-manifest.json',manifest)
    return manifest


def extract_message_states(config, document_name):
    document=next(d for d in config['documents'] if d['document']==document_name)
    path=snapshot_target(document)
    root=json.loads(path.read_text())['patcher']
    basic=next(x['box']['patcher'] for x in root['boxes'] if x['box'].get('varname')==document['basic_varname'])
    states=[];resolved={}
    for expected in document['boxes']:
        varname='__alive_help_'+expected['id'].replace('-','_')
        matches=[x['box'] for x in basic['boxes'] if x['box'].get('varname')==varname]
        if len(matches)!=1:raise ValueError('Serialized source anchor is unavailable')
        resolved[expected['id']]=matches[0]['id']
        if expected['maxclass']!='message':continue
        states.append(dict(document=document_name,anchor=expected['anchor'],
            **public_message_state(matches[0].get('text',''),expected['authored_empty'])))
    lines=[x['patchline'] for x in basic['lines']]
    for edge in document['saved_edges']:
        source=[resolved[edge['source'][0]],edge['source'][1]]
        destination=[resolved[edge['destination'][0]],edge['destination'][1]]
        matches=[x for x in lines if x['source']==source and x['destination']==destination]
        if len(matches)!=1:raise ValueError('Original executable route was not retained')
        if 'order' in edge and matches[0].get('order')!=edge['order']:
            raise ValueError('Original explicit cable order changed')
    return dict(snapshot_sha256=digest(path),snapshot_bytes=path.stat().st_size,states=states,
                original_basic_boxes_retained=len(resolved),
                original_basic_cables_retained=len(document['saved_edges']))


def readback_target(config,document):
    path=Path(document['readback_path']).resolve()
    expected=Path(config['work']).resolve()/'observations'/(document['document']+'.json')
    if path!=expected or Path(document['readback_path']).is_symlink():
        raise ValueError('Private V8 observation target mismatch')
    return path


def finite_rectangle(value):
    if not isinstance(value,list) or len(value)!=4 or not all(
            isinstance(number,(int,float)) and not isinstance(number,bool) and math.isfinite(number) for number in value):
        raise ValueError('Runtime box geometry unavailable')
    return value


def validate_v8_readback(document,raw,request_id,step_id):
    expected_identity=dict(readback_method='v8-boxtext',request_id=request_id,step_id=step_id,
        document=document['document'],source_sha256=document['source_sha256'])
    normalize=lambda value:value.replace('\\','/').lower() if isinstance(value,str) else None
    if (type(request_id) is not int or request_id<1 or raw.get('success') is not True or
            any(raw.get(key)!=value for key,value in expected_identity.items()) or
            type(raw.get('request_id')) is not int or raw.get('root_is_top_level') is not True or
            raw.get('saved_order_observed') is not False or
            normalize(raw.get('working_root_path'))!=normalize(document['working_windows_path'])):
        raise ValueError('V8 checkpoint identity mismatch')
    boxes=raw.get('boxes')
    if not isinstance(boxes,list):raise ValueError('V8 box inventory unavailable')
    by_name={}
    for box in boxes:
        name=box.get('varname')
        if not isinstance(name,str) or not name or name in by_name:raise ValueError('V8 box identity not unique')
        by_name[name]=box
    originals={box['id']:box for box in document['boxes']}
    if len(originals)!=len(document['boxes']):raise ValueError('Source box identity not unique')
    for expected in document['boxes']:
        actual=by_name.get(original_varname(expected))
        if actual is None or actual.get('maxclass') not in {expected['maxclass'],expected['runtime_class']}:
            raise ValueError('V8 original box identity or class changed')
        live=finite_rectangle(actual.get('rect'));saved=finite_rectangle(expected['rect'])
        dimensions=range(4)
        if 'annotation_width_policy' in expected or 'observer_policy' in expected:
            policy=public_annotation_width_policy(expected.get('annotation_width_policy'))
            source_box=dict(id=expected['id'],maxclass=expected['maxclass'],filename=expected.get('filename'),
                ignoreclick=expected.get('ignoreclick'),numoutlets=expected['outlets'],patching_rect=saved)
            derived=derive_annotation_width_policy(document['document'],document['source_sha256'],expected['anchor'],
                source_box,document['saved_edges'],policy['helper_sha256'])
            if (derived!=policy or expected['runtime_class']!='jsui' or actual.get('maxclass')!='jsui' or
                    expected.get('observer_policy')!=policy['observer_policy'] or live[2]<=0):
                raise ValueError('Invalid V8 annotation width profile')
            dimensions=[0,1,3]
        if any(abs(live[index]-saved[index])>0.01 for index in dimensions):
            raise ValueError('V8 original box geometry changed')
    leaves=observer_definitions(document)
    if document.get('observer_leaves')!=leaves:raise ValueError('V8 observer definition mismatch')
    expected_names={original_varname(box) for box in document['boxes']}|{leaf['varname'] for leaf in leaves}
    if set(by_name)!=expected_names:raise ValueError('Unexpected or missing Basic object')
    for leaf in leaves:
        if by_name[leaf['varname']].get('maxclass')!='js':raise ValueError('V8 observer leaf class changed')

    def route_key(route):
        result=[]
        for side in ['source','destination']:
            endpoint=route.get(side,{})
            if endpoint.get('varname') not in expected_names or type(endpoint.get('port')) is not int or endpoint['port']<0:
                raise ValueError('V8 route endpoint unavailable')
            result.extend([endpoint['varname'],endpoint['port']])
        return tuple(result)
    expected_routes=Counter()
    for edge in document['saved_edges']:
        source,destination=edge['source'],edge['destination']
        expected_routes[(original_varname(originals[source[0]]),source[1],
                         original_varname(originals[destination[0]]),destination[1])]+=1
    for leaf in leaves:
        source=next(box for box in document['boxes'] if box['anchor']==leaf['anchor'])
        expected_routes[(original_varname(source),leaf['port'],leaf['varname'],0)]+=1
    for key in ['input_routes','output_routes']:
        if not isinstance(raw.get(key),list) or Counter(route_key(route) for route in raw[key])!=expected_routes:
            raise ValueError('V8 executable endpoint multiset changed')
    messages=raw.get('messages')
    if not isinstance(messages,list):raise ValueError('V8 Message inventory unavailable')
    expected_messages={box['anchor']:box for box in document['boxes'] if box['maxclass']=='message'}
    if Counter(item.get('anchor') for item in messages)!=Counter(expected_messages.keys()):
        raise ValueError('V8 Message anchor inventory changed')
    states=[]
    for message in messages:
        expected=expected_messages[message['anchor']];text=message.get('text')
        if not isinstance(text,str):raise ValueError('V8 Message boxtext unavailable')
        if step_id=='initial' and text!=expected['authored_text']:
            raise ValueError('Initial V8 Message differs from authored prototype')
        states.append(dict(document=document['document'],anchor=expected['anchor'],
            **public_message_state(text,expected['authored_empty'],readback_method='v8-boxtext')))
    return dict(expected_identity,states=states,retention=dict(method='runtime-object-and-endpoint-inventory',
        original_basic_boxes_retained=len(originals),original_basic_cables_retained=len(document['saved_edges']),
        observer_leaf_cables_retained=len(leaves),unexpected_basic_cables=0,saved_order_observed=False))


def extract_v8_readback(config,document_name,request_id,step_id):
    if config.get('readback_method')!='v8-boxtext':raise ValueError('V8 readback method mismatch')
    document=next(item for item in config['documents'] if item['document']==document_name)
    for key in ['source_path','pristine_path','working_path']:require_digest(document[key],document['source_sha256'])
    path=readback_target(config,document);payload=path.read_bytes()
    result=validate_v8_readback(document,json.loads(payload),request_id,step_id)
    for key in ['source_path','pristine_path','working_path']:require_digest(document[key],document['source_sha256'])
    path.chmod(0o600)
    retained=path.parent/('checkpoint-'+str(request_id)+'-'+document_name+'.json')
    with retained.open('xb') as stream:
        retained.chmod(0o600);stream.write(payload)
    return dict(result,observation_sha256=hashlib.sha256(payload).hexdigest(),observation_bytes=len(payload))
