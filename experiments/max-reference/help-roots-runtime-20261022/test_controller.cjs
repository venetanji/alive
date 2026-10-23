// Offline Max boundary fixture; never starts Max, Wine, or an X server.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/controller.js', 'utf8');

function runFixture(stall, changedGeometry = false) {
    const scheduled = [], writes = [], opened = [], globals = {};
    let mutations = 0;
    function Task(callback) {
        this.schedule = () => scheduled.push(callback);
        this.repeat = () => {};
    }
    const paths = ['Z:/private/test/working/append.maxhelp', 'Z:/private/test/working/prepend.maxhelp'];
    function root(filepath) {
        const child = {firstobject: null};
        if (changedGeometry) child.firstobject = {
            maxclass:'comment',rect:[10,20,110,45],nextobject:null,subpatcher:()=>null,
            getboxattr:()=>[10,20,100,25],getattr:()=>[10,20,100,25],
            text:'source-owned-prose-sentinel',label:'source-owned-label-sentinel'};
        if (changedGeometry && filepath === paths[0]) child.firstobject.nextobject = {
            maxclass:'number',rect:[200,20,260,44],nextobject:null,subpatcher:()=>null,
            getboxattr:()=>[200,20,60,24],getattr:()=>[200,20,60,24]};
        if (changedGeometry) for(let object=child.firstobject;object;object=object.nextobject)
            Object.defineProperty(object,'varname',{get:()=>'',set:()=>{++mutations;}});
        const basic = {maxclass: 'patcher', varname: 'basic_tab', nextobject: null,
            subpatcher: () => child};
        return {filepath,firstobject:basic,getnamed:name=>name==='basic_tab'?basic:null,
            newdefault:()=>{++mutations;return {message:()=>{}};}};
    }
    const max = {frontpatcher:root('Z:/private/test/driver.maxpat'), message(name,handle,path) {
        assert.equal(name,'openfile');assert.match(handle,/^fixture_/);
        assert.equal(path,paths[opened.length]);opened.push(path);
        if (!stall) scheduled.push(()=>{max.frontpatcher=root(path);});
    }};
    const context = {jsarguments:['controller.js','config.json'],Task,max,
        Global:function(){return globals;},Patcher:function(){throw Error('filename constructor cannot load files');}};
    vm.createContext(context);vm.runInContext(source,context);
    const config = {global_name:'fixture',journal_path:'journal',ready_path:'ready',
        documents:paths.map((path,i)=>({document:i?'prepend':'append',working_windows_path:path,
            basic_varname:'basic_tab',full_inventory:changedGeometry?(i===0?[{},{},{}]:[{},{}]):[{}],
            boxes:changedGeometry?[
                {id:'obj-26',anchor:'root/'+(i?'obj-2':'obj-5')+'/obj-26',maxclass:'comment',
                 runtime_class:'comment',rect:[10,20,80,20],outlets:0,authored_text:'source-owned-text-sentinel'},
                ...(i===0?[{id:'obj-27',anchor:'root/obj-5/obj-27',maxclass:'number',runtime_class:'number',
                    rect:[200,20,50,23],outlets:2}]:[])]:[]}))};
    context.read=()=>config;context.write=(path,value)=>writes.push({path,value});
    context.record=()=>{};
    context.start();
    let iterations=0;
    while(scheduled.length && ++iterations<250)scheduled.shift()();
    const ready=writes.find(row=>row.path==='ready');
    assert.ok(ready,'bounded load must publish a capability result');
    if(stall){
        assert.equal(ready.value.ready,false);
        assert.match(ready.value.error,/working-root-load-timeout/);
        assert.ok(ready.value.diagnostics.length);
        assert.equal(opened.length,1);
    } else if (changedGeometry) {
        assert.equal(ready.value.ready,false,'dimension mismatch must still be refused');
        assert.match(ready.value.error,/saved-anchor-not-unique:obj-26/);
        const diagnostic = ready.value.anchor_diagnostics[0];
        assert.equal(diagnostic.expected_anchor,'root/obj-5/obj-26');
        assert.equal(diagnostic.expected_id,'obj-26');
        assert.equal(diagnostic.expected_maxclass,'comment');
        assert.deepEqual(Array.from(diagnostic.expected_rect),[10,20,80,20]);
        assert.equal(diagnostic.full_match_count,0);
        assert.equal(diagnostic.position_class_match_count,1);
        assert.deepEqual(Array.from(diagnostic.position_class_matches[0].rect),[10,20,100,25]);
        assert.equal(diagnostic.position_class_matches[0].maxclass,'comment');
        assert.equal(diagnostic.full_matches.length,0);
        assert.deepEqual(Array.from(ready.value.anchor_diagnostics,d=>d.expected_anchor),
            ['root/obj-5/obj-26','root/obj-5/obj-27','root/obj-2/obj-26']);
        assert.equal(mutations,0,'all documents must preflight before any observer or varname mutation');
        assert.ok(!JSON.stringify(ready.value).includes('sentinel'));
    } else {
        assert.equal(ready.value.ready,true);
        assert.equal(opened.length,2);
        assert.equal(ready.value.capabilities.length,2);
        assert.deepEqual(Array.from(ready.value.capabilities,c=>c.initial_tree_boxes),[1,1]);
    }
}
function runGeometryFixtures() {
    const context={jsarguments:[]};vm.createContext(context);vm.runInContext(source,context);
    const expected=rect=>({id:'obj-26',anchor:'root/obj-5/obj-26',maxclass:'comment',runtime_class:'comment',rect});
    const box=(attribute,raw=[10,20,110,45])=>({maxclass:'comment',rect:raw,nextobject:null,
        getboxattr:name=>{assert.equal(name,'patching_rect');return attribute;},getattr:()=>attribute});
    const saved=[10.5,20.5,100.934143,25],first=box(saved),second=box([10.9,20.5,100.934143,25]);
    first.nextobject=second;
    assert.equal(context.resolve({firstobject:first},expected(saved)),first,
        'floating box attribute must preserve coordinates lost by integer rect');
    assert.equal(context.resolve({firstobject:first},expected([10.9,20.5,100.934143,25])),second,
        'distinct floating rectangles sharing one integer rect must not merge');
    first.nextobject=box([10.505,20.5,100.934143,25]);
    assert.throws(()=>context.resolve({firstobject:first},expected(saved)),/saved-anchor-not-unique/,
        'two full matches under the unchanged component epsilon remain ambiguous');
    const integerSaved=[10,20,100,25];
    for(const [status,getter] of [
        ['unavailable',undefined],['null',()=>null],['threw',()=>{throw Error('source-error-sentinel');}],
        ['malformed',()=>['source-payload-sentinel',20,100,25]],['malformed',()=>[10,20,Infinity,25]]]) {
        context.anchorDiagnostics=[];
        const object=box(integerSaved);object.getboxattr=getter;
        assert.throws(()=>context.resolve({firstobject:object},expected(integerSaved)),/saved-anchor-not-unique/,
            'unavailable box attribute must not fall back to rect or generic getattr');
        const diagnostic=context.anchorDiagnostics[0],candidate=diagnostic.candidates[0];
        assert.equal(diagnostic.full_match_count,0);
        assert.equal(candidate.patching_rect_status,status);
        assert.equal(candidate.patching_rect,null);
        assert.deepEqual(Array.from(candidate.raw_rect),[10,20,110,45]);
        assert.equal(candidate.getattr_patching_rect_status,'observed');
        assert.deepEqual(Array.from(candidate.getattr_patching_rect),integerSaved);
        assert.ok(!JSON.stringify(diagnostic).includes('sentinel'));
    }
}
function runAnnotationWidthFixtures() {
    const context={jsarguments:[]};vm.createContext(context);vm.runInContext(source,context);
    const saved=[130,195,257.934143,39],live=[130,195,257.9139709472656,39];
    const policy={kind:'source-bound-helper-width',source_sha256:'d4a3fe4d87f7fd7b30c747cc18cc09f7ba6dd703adadc279733df38503962729',
        anchor:'root/obj-5/obj-4',helper_filename:'helpargs.js',
        helper_sha256:'04cce1cb44b358680d9c6d3ef19873fa5ccbb192614905dc909057cf22805469',
        source_ignoreclick:1,source_outlets:1,saved_incoming_routes:0,saved_outgoing_routes:0,
        saved_rect:saved,observer_policy:'omit-disconnected-annotation-leaf'};
    const expected={id:'obj-4',anchor:policy.anchor,maxclass:'jsui',runtime_class:'jsui',rect:saved,outlets:1,
        filename:'helpargs.js',ignoreclick:1,annotation_width_policy:policy,observer_policy:policy.observer_policy};
    const box=rect=>({maxclass:'jsui',rect:[130,195,387,234],getboxattr:()=>rect,getattr:()=>rect,
        nextobject:null,subpatcher:()=>null});
    const object=box(live),patcher={firstobject:object};
    assert.equal(context.resolve(patcher,expected),object,'only the approved helper may use its measured live width');
    for(const changed of [
        {...expected,anchor:'root/obj-2/obj-4'}, {...expected,filename:'helpdetails.js'},
        {...expected,annotation_width_policy:{...policy,source_sha256:'0'.repeat(64)}},
        {...expected,annotation_width_policy:{...policy,helper_sha256:'0'.repeat(64)}},
        {...expected,annotation_width_policy:{...policy,saved_incoming_routes:1}},
        {...expected,annotation_width_policy:{...policy,saved_outgoing_routes:1}},
        {...expected,id:'obj-99'}, {...expected,maxclass:'newobj'}, {...expected,runtime_class:'append'},
        {...expected,ignoreclick:0}, {...expected,outlets:0}, {...expected,rect:[130,195,258,39]},
        {...expected,observer_policy:undefined}, {...expected,annotation_width_policy:undefined}])
        assert.throws(()=>context.resolve(patcher,changed),/invalid-source-bound-annotation-policy/);
    for(const rect of [[130,195,0,39],[130,195,-1,39],[130,195,Infinity,39],[130,195,NaN,39],
        [130,195,258,40],[131,195,258,39]])
        assert.throws(()=>context.resolve({firstobject:box(rect)},expected),/saved-anchor-not-unique/);
    const wrongClass={...box(live),maxclass:'append'};
    assert.throws(()=>context.resolve({firstobject:wrongClass},expected),/saved-anchor-not-unique/);
    context.anchorDiagnostics=[];
    object.nextobject=box([130,195,300,39]);
    assert.throws(()=>context.resolve(patcher,expected),/saved-anchor-not-unique/,'annotation matches must remain unique');
    assert.equal(context.anchorDiagnostics[0].full_match_count,0);
    assert.equal(context.anchorDiagnostics[0].annotation_policy_match_count,2);
    assert.equal(context.anchorDiagnostics[0].annotation_width_policy.anchor,expected.anchor);
    object.nextobject=null;
    const ordinary={id:'obj-5',anchor:'root/obj-5/obj-5',maxclass:'append',runtime_class:'append',rect:saved,outlets:1};
    const executable={...box(live),maxclass:'append'};
    assert.throws(()=>context.resolve({firstobject:executable},ordinary),/saved-anchor-not-unique/);
    assert.throws(()=>context.resolve(patcher,{...ordinary,anchor:'root/obj-2/obj-4',maxclass:'jsui',runtime_class:'jsui'}),
        /saved-anchor-not-unique/,'prepend helper retains the full rectangle rule');

    const writes=[],paths=['Z:/private/append.maxhelp','Z:/private/prepend.maxhelp'];let leaves=0;
    function root(path,annotation) {
        const basicScope={firstobject:annotation,newdefault:()=>{++leaves;throw Error('annotation leaf must be omitted');}};
        const basic={maxclass:'patcher',nextobject:null,subpatcher:()=>basicScope};
        return {filepath:path,firstobject:basic,getnamed:()=>basic,newdefault:()=>({message:()=>{}})};
    }
    context.config={ready_path:'ready',documents:[
        {document:'append',source_sha256:policy.source_sha256,working_windows_path:paths[0],basic_varname:'basic_tab',
            full_inventory:[{},{}],saved_edges:[],boxes:[{...expected,authored_text:'source-payload-sentinel'}]},
        {document:'prepend',working_windows_path:paths[1],basic_varname:'basic_tab',full_inventory:[{}],boxes:[]}]};
    context.roots={append:{patcher:root(paths[0],object)},prepend:{patcher:root(paths[1],null)}};
    context.shared={};context.record=()=>{};context.write=(path,value)=>writes.push(value);
    context.Task=function(){this.repeat=()=>{};};context.anchorDiagnostics=[];
    context.bind();
    assert.equal(writes[0].ready,true);assert.equal(leaves,0);
    assert.equal(object.varname,'__alive_help_obj_4','annotation remains bound for snapshot retention');
    const binding=writes[0].capabilities[0].annotation_bindings[0];
    assert.deepEqual(Array.from(binding.saved_rect),saved);assert.deepEqual(Array.from(binding.live_rect),live);
    assert.equal(binding.source_outlets,1);assert.equal(binding.observer_policy,'omit-disconnected-annotation-leaf');
    assert.ok(!JSON.stringify(writes[0]).includes('sentinel'));
    const definition=context.config.documents[0];
    for(const change of [{document:'prepend'},{source_sha256:'0'.repeat(64)},{saved_edges:undefined},
        {saved_edges:[{source:['obj-4',0],destination:['obj-9',0]}]},
        {saved_edges:[{source:['obj-9',0],destination:['obj-4',0]}]}]) {
        context.config.documents[0]={...definition,...change};
        // Both root names share the same fixture to isolate the policy's document guard.
        const oldPrepend=context.roots.prepend;context.roots.prepend=context.roots.append;
        delete object.varname;writes.length=0;
        context.bind();
        context.roots.prepend=oldPrepend;
        assert.equal(writes[0].ready,false);assert.match(writes[0].error,/invalid-source-bound-annotation-policy/);
        assert.equal(Object.hasOwn(object,'varname'),false,'invalid policy must fail before original mutation');
        assert.equal(leaves,0);
    }
}
runFixture(false);runFixture(true);runFixture(false,true);
runGeometryFixtures();
runAnnotationWidthFixtures();
function runWriterDiagnostics() {
    const context={jsarguments:[]};vm.createContext(context);vm.runInContext(source,context);
    assert.equal(typeof context.writerDiagnostics,'function','snapshot failure must observe the actual writer context');
    const patcher={filepath:'Z:/private/append.maxhelp',parentpatcher:null,locked:true,wind:{dirty:1}};
    const writer={valid:true,maxclass:'thispatcher',patcher,understands:name=>name==='write'};
    let value=context.writerDiagnostics({patcher,writer});
    assert.equal(value.writer_valid,true);assert.equal(value.writer_class_is_thispatcher,true);
    assert.equal(value.writer_owner_is_root,true);assert.equal(value.writer_owner_path_matches,true);
    assert.equal(value.writer_understands_write,true);assert.equal(value.root_is_top_level,true);
    assert.equal(value.root_locked,true);assert.equal(value.root_dirty,true);
    patcher.wind={get dirty(){throw Error('source-payload-sentinel');}};
    writer.understands=()=>null;writer.patcher={filepath:'source-path-sentinel'};
    value=context.writerDiagnostics({patcher,writer});
    assert.equal(value.root_dirty,null);assert.equal(value.writer_understands_write,null);
    assert.equal(value.writer_owner_is_root,false);assert.equal(value.writer_owner_path_matches,false);
    assert.ok(!JSON.stringify(value).includes('sentinel'));
}
runWriterDiagnostics();
function runV8DispatchFixture() {
    const context={jsarguments:['controller.js','private-config.json']};vm.createContext(context);vm.runInContext(source,context);
    const writes=[],created=[],calls=[];let current;
    const documents=['append','prepend'].map(document=>({document,source_sha256:(document==='append'?'a':'b').repeat(64),
        working_windows_path:'Z:/private/working/'+document+'.maxhelp',basic_varname:'basic_tab',full_inventory:[{},{}],
        saved_edges:[],boxes:[{id:'obj-1',anchor:'root/'+document+'/obj-1',maxclass:'number',runtime_class:'number',
            rect:[10,20,50,20],outlets:1}]}));
    context.config={readback_method:'v8-boxtext',readback_helper_path:'Z:/private/v8-readback.js',ready_path:'ready',ack_path:'ack',documents};
    context.roots={};context.shared={};context.record=()=>{};context.write=(path,value)=>writes.push({path,value});
    context.read=()=>current;context.Task=function(){this.repeat=()=>{};};
    for(const definition of documents) {
        const object={maxclass:'number',getboxattr:()=>[10,20,50,20],subpatcher:()=>null,nextobject:null};
        const basic={firstobject:object,newdefault:()=>({}),connect:()=>{}};
        const basicBox={maxclass:'patcher',subpatcher:()=>basic,nextobject:null};
        const root={filepath:definition.working_windows_path,firstobject:basicBox,getnamed:()=>basicBox,
            newdefault:(x,y,...args)=>{created.push(args);return {message:(...args)=>calls.push(args)};}};
        context.roots[definition.document]={patcher:root};
    }
    context.bind();
    assert.equal(writes[0].value.ready,true);
    assert.deepEqual(Array.from(writes[0].value.capabilities,item=>item.observer_leaf_cables),[1,1]);
    assert.ok(created.every(args=>args[0]==='v8'),'V8 mode must create no serialization writer');
    assert.deepEqual(created.map(args=>args.slice(1)),documents.map(d=>['Z:/private/v8-readback.js','private-config.json',d.document]));
    current={op:'readback',command_id:4,step_id:'initial',document:'append',source_sha256:documents[0].source_sha256,
        path:'Z:/untrusted/sentinel'};context.tick();
    assert.deepEqual(calls,[['checkpoint',4,'initial']]);
    assert.equal(writes.at(-1).value.success,true);
    current={op:'snapshot',command_id:5,step_id:'forbidden',document:'append'};context.tick();
    assert.equal(writes.at(-1).value.success,false);assert.equal(calls.length,1,'V8 branch cannot send write');
}
runV8DispatchFixture();
console.log('controller loading boundary fixtures passed');
