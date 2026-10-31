//! Calling-window scoped parameter gestures use the existing qualified native bridge.
use super::*;
use serde::Serialize;

#[derive(Deserialize)]
#[serde(rename_all="camelCase",deny_unknown_fields)]
pub struct GestureRequest { pub owner_label:String,pub runtime_revision:u64,pub token:Option<u64>,pub node:u32,pub key:String,pub phase:String,pub value:f64 }
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct GestureReply { pub token:u64,pub document:Document }

pub fn apply(registry:&mut Registry,audio:&mut crate::AudioControl,io:&mut crate::audio::Driver,label:&str,request:GestureRequest)->Result<GestureReply,String>{
    io.reject_retiring()?;
    let owner=registry.get_open(label)?.clone();
    if owner.label!=request.owner_label||owner.runtime_revision!=request.runtime_revision{return Err("Presentation gesture scope changed.".into());}
    let control=&mut audio.graphs[owner.id as usize];
    let hot=crate::canvas::prepare(owner.patch.clone().unwrap())?.parameter_hot(request.node,&request.key);
    // Qualification is shared with canonical parameter admission and never installs a graph.
    control.preview_parameter(request.runtime_revision,request.node,&request.key,request.value,|_,_|true)?;
    let token=if request.phase=="begin"{
        if request.token.is_some(){return Err("A new gesture cannot reuse a token".into());}
        if crate::canvas::prepare(owner.patch.clone().unwrap())?.parameter_value(request.node,&request.key)?!=request.value{return Err("The parameter changed before this presentation gesture began. Refresh and try again.".into());}
        registry.begin_parameter_gesture(label,&owner.label,request.runtime_revision,request.node,&request.key)?
    }else{
        let token=request.token.ok_or("A presentation gesture token is required")?;
        let gesture=registry.parameter_gesture(label,&owner.label,request.runtime_revision,token)?;
        if gesture.node!=request.node||gesture.key!=request.key{return Err("Presentation gesture target changed".into());}
        match request.phase.as_str(){
            "preview"=>{
                control.preview_parameter(request.runtime_revision,gesture.node,&gesture.key,request.value,|slot,value|unsafe{
                    crate::ultra_canvas_param_hot_document(owner.id,request.runtime_revision,gesture.node,slot,value,u32::from(hot))!=0
                })?;
                registry.accept_parameter_preview(label,&owner.label,request.runtime_revision,token,request.value)?;
            },
            "commit"=>{
                let parameter=Parameter{node:gesture.node,key:gesture.key.clone(),value:request.value,hot:hot&&(!gesture.previewed||request.value!=gesture.value)};
                registry.accept_parameter_preview(label,&owner.label,request.runtime_revision,token,request.value)?;
                if let Err(error)=registry.finish_parameter_gesture(label,&owner.label,request.runtime_revision,token,true,|owner,patch|admit_owned(io,control,owner,patch,Some(&parameter),None,false)){
                    registry.restore_parameter_gesture(label,gesture)?;return Err(error);
                }
            },
            "cancel"=>{
                control.preview_parameter(request.runtime_revision,gesture.node,&gesture.key,gesture.baseline,|slot,value|unsafe{
                    crate::ultra_canvas_param_hot_document(owner.id,request.runtime_revision,gesture.node,slot,value,u32::from(hot))!=0
                })?;
                registry.finish_parameter_gesture(label,&owner.label,request.runtime_revision,token,false,|_,_|unreachable!())?;
            },
            _=>return Err("Unknown presentation gesture phase".into())
        }token
    };
    Ok(GestureReply{token,document:registry.descriptor(label)?})
}

pub fn settle(registry:&mut Registry,audio:&mut crate::AudioControl,io:&mut crate::audio::Driver,label:&str)->Result<Document,String>{
    let owner=registry.get_open(label)?.clone();
    for gesture in owner.parameter_previews(){
        // Owner settlement is explicit and may finish a gesture whose UI has detached.
        let parameter=Parameter{node:gesture.node,key:gesture.key.clone(),value:gesture.value,hot:false};
        registry.settle_owned_parameter_gesture(label,gesture.token,|owner,patch|admit_owned(io,&mut audio.graphs[owner.id as usize],owner,patch,Some(&parameter),None,false))?;
    }registry.descriptor(label)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn snapshot(id:u32)->canvas::NativeStatus{let mut s=canvas::NativeStatus::default();unsafe{crate::ultra_canvas_status_document(id,&mut s);}s}
    fn value(id:u32,node:u32)->f64{let s=snapshot(id);s.nodes[..s.node_count as usize].iter().find(|n|n.id==node).unwrap().value}
    fn pulses(id:u32,node:u32)->u64{let s=snapshot(id);s.nodes[..s.node_count as usize].iter().find(|n|n.id==node).unwrap().pulses}
    #[test]
    fn non_hot_baseline_return_commit_reconciles_native_value_without_output_or_reinstall(){
        const NAME:&str="document_windows::commands::parameter_gestures::tests::non_hot_baseline_return_commit_reconciles_native_value_without_output_or_reinstall";
        if std::env::var("ULTRA_PRESENTATION_BASELINE_TEST_PROCESS").as_deref()!=Ok("1"){
            let child=std::process::Command::new(std::env::current_exe().unwrap()).args(["--exact",NAME,"--nocapture"]).env("ULTRA_PRESENTATION_BASELINE_TEST_PROCESS","1").output().unwrap();
            assert!(child.status.success(),"{}\n{}",String::from_utf8_lossy(&child.stdout),String::from_utf8_lossy(&child.stderr));return;
        }
        let _guard=crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
        let patch=serde_json::json!({"version":2,"profile":"ultra-patcher-v2","presentation":null,"nodes":[
            {"id":1,"type":"multiply","x":0,"y":0,"params":{"rhs":0.65}},
            {"id":2,"type":"number","x":0,"y":0,"params":{"value":0}}],"edges":[{"from":1,"outlet":0,"to":2,"inlet":0}]});
        let mut registry=Registry::default();let owner=registry.add("Cold reconciliation".into(),Kind::Patch,Some(patch),None,None).unwrap();
        let mut audio=crate::AudioControl::default();let mut io=crate::audio::Driver::load(PathBuf::from("/nonexistent/ultra-baseline-return-test.json"));
        let owner=registry.prepare_runtime(&owner.label,|owner|admit_owned(&mut io,&mut audio.graphs[owner.id as usize],owner,owner.patch.as_ref().unwrap(),None,None,true)).unwrap();
        let request=|token,phase:&str,value|GestureRequest{owner_label:owner.label.clone(),runtime_revision:owner.runtime_revision,token,node:1,key:"rhs".into(),phase:phase.into(),value};
        let token=apply(&mut registry,&mut audio,&mut io,&owner.label,request(None,"begin",0.65)).unwrap().token;
        apply(&mut registry,&mut audio,&mut io,&owner.label,request(Some(token),"preview",0.4)).unwrap();
        let message=audio.graphs[owner.id as usize].event(owner.runtime_revision,1,0,serde_json::json!([1])).unwrap();
        assert_eq!(unsafe{crate::ultra_canvas_message_document(owner.id,owner.runtime_revision,1,0,&message)},1);assert_eq!(value(owner.id,2),0.4);
        let before=pulses(owner.id,2);
        let final_state=apply(&mut registry,&mut audio,&mut io,&owner.label,request(Some(token),"commit",0.65)).unwrap().document;
        assert_eq!(final_state.patch.unwrap()["nodes"][0]["params"]["rhs"],0.65);assert!(final_state.parameter_previews.is_empty());
        assert_eq!(snapshot(owner.id).revision,owner.runtime_revision);assert_eq!(pulses(owner.id,2),before,"cold reconciliation must not emit a hot output");
        assert_eq!(unsafe{crate::ultra_canvas_message_document(owner.id,owner.runtime_revision,1,0,&message)},1);
        assert_eq!(value(owner.id,2),0.65,"baseline-return commit left native rhs at its earlier preview");
        close_owned(&mut io,owner.id).unwrap();
    }
    #[test]
    fn live_preview_metadata_other_parameter_cancel_commit_history_and_detached_settlement(){
        const NAME:&str="document_windows::commands::parameter_gestures::tests::live_preview_metadata_other_parameter_cancel_commit_history_and_detached_settlement";
        if std::env::var("ULTRA_PRESENTATION_GESTURE_TEST_PROCESS").as_deref()!=Ok("1"){
            let child=std::process::Command::new(std::env::current_exe().unwrap()).args(["--exact",NAME,"--nocapture"]).env("ULTRA_PRESENTATION_GESTURE_TEST_PROCESS","1").output().unwrap();
            assert!(child.status.success(),"{}\n{}",String::from_utf8_lossy(&child.stdout),String::from_utf8_lossy(&child.stderr));return;
        }
        let _guard=crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
        let patch=serde_json::json!({"version":2,"profile":"ultra-patcher-v2","presentation":null,"nodes":[{"id":10,"type":"patcher","x":0,"y":0,"params":{"name":"test"},"patcher":{"presentation":null,"nodes":[
            {"id":1,"type":"number","x":0,"y":0,"params":{"value":1}},{"id":2,"type":"number","x":0,"y":0,"params":{"value":2}},{"id":3,"type":"number","x":0,"y":0,"params":{"value":0}}],"edges":[{"from":1,"outlet":0,"to":3,"inlet":0}]}}],"edges":[]});
        let mut r=Registry::default();let root=r.add("Preview".into(),Kind::Patch,Some(patch),None,None).unwrap();
        let mut audio=crate::AudioControl::default();let mut io=crate::audio::Driver::load(PathBuf::from("/nonexistent/ultra-presentation-gesture-test.json"));
        let root=r.prepare_runtime(&root.label,|owner|admit_owned(&mut io,&mut audio.graphs[owner.id as usize],owner,owner.patch.as_ref().unwrap(),None,None,true)).unwrap();
        let (child,_)=r.open_view(&root.label,10).unwrap();let revision=root.runtime_revision;
        let request=|token,phase:&str,value|GestureRequest{owner_label:root.label.clone(),runtime_revision:revision,token,node:1,key:"value".into(),phase:phase.into(),value};
        let token=apply(&mut r,&mut audio,&mut io,&child.label,request(None,"begin",1.)).unwrap().token;
        apply(&mut r,&mut audio,&mut io,&child.label,request(Some(token),"preview",7.)).unwrap();assert_eq!(value(root.id,1),7.);assert_eq!(value(root.id,3),7.);
        let mut metadata=r.get(&root.label).unwrap().patch.clone().unwrap();metadata["nodes"][0]["x"]=serde_json::json!(40);
        r.commit(&root.label,0,metadata,true,|owner,patch|admit_owned(&mut io,&mut audio.graphs[owner.id as usize],owner,patch,None,None,false)).unwrap();
        assert_eq!(value(root.id,1),7.);assert_eq!(snapshot(root.id).revision,revision);
        let mut other=r.get(&root.label).unwrap().patch.clone().unwrap();other["nodes"][0]["patcher"]["nodes"][1]["params"]["value"]=serde_json::json!(9);
        r.commit(&root.label,1,other,true,|owner,patch|admit_owned(&mut io,&mut audio.graphs[owner.id as usize],owner,patch,None,None,false)).unwrap();assert_eq!(value(root.id,1),7.);assert_eq!(value(root.id,2),9.);
        let before_cancel=pulses(root.id,3);apply(&mut r,&mut audio,&mut io,&child.label,request(Some(token),"cancel",1.)).unwrap();assert_eq!(value(root.id,1),1.);assert_eq!(value(root.id,2),9.);assert_eq!(value(root.id,3),1.);assert_eq!(pulses(root.id,3),before_cancel+1,"cancel must restore one hot output");
        let token=apply(&mut r,&mut audio,&mut io,&child.label,request(None,"begin",1.)).unwrap().token;
        apply(&mut r,&mut audio,&mut io,&child.label,request(Some(token),"preview",6.)).unwrap();
        let before=snapshot(root.id);let pulse_counts=before.nodes[..before.node_count as usize].iter().map(|n|n.pulses).collect::<Vec<_>>();
        apply(&mut r,&mut audio,&mut io,&child.label,request(Some(token),"commit",6.)).unwrap();
        let after=snapshot(root.id);assert_eq!(after.nodes[..after.node_count as usize].iter().map(|n|n.pulses).collect::<Vec<_>>(),pulse_counts,"commit duplicated an already-previewed hot output");assert_eq!(value(root.id,3),6.);
        r.history(&root.label,3,"undo",|owner,patch|admit_owned(&mut io,&mut audio.graphs[owner.id as usize],owner,patch,None,None,false)).unwrap();assert_eq!(value(root.id,1),1.);assert_eq!(value(root.id,2),9.);assert_eq!(snapshot(root.id).revision,revision);
        let token=apply(&mut r,&mut audio,&mut io,&child.label,request(None,"begin",1.)).unwrap().token;
        apply(&mut r,&mut audio,&mut io,&child.label,request(Some(token),"preview",3.)).unwrap();let before_commit=pulses(root.id,3);
        apply(&mut r,&mut audio,&mut io,&child.label,request(Some(token),"commit",4.)).unwrap();assert_eq!(value(root.id,3),4.);assert_eq!(pulses(root.id,3),before_commit+1,"a changed final value must emit one hot output");
        let token=apply(&mut r,&mut audio,&mut io,&child.label,request(None,"begin",4.)).unwrap().token;
        apply(&mut r,&mut audio,&mut io,&child.label,request(Some(token),"preview",5.)).unwrap();r.remove(&child.label);
        assert_eq!(value(root.id,1),5.);let settled=settle(&mut r,&mut audio,&mut io,&root.label).unwrap();assert!(settled.parameter_previews.is_empty());
        assert_eq!(settled.patch.unwrap()["nodes"][0]["patcher"]["nodes"][0]["params"]["value"],5.);assert_eq!(value(root.id,2),9.);assert_eq!(snapshot(root.id).revision,revision);
        close_owned(&mut io,root.id).unwrap();
        let synth_patch:Value=serde_json::from_str(include_str!("../../examples/subtractive.ultra")).unwrap();
        let synth=r.add("Held note".into(),Kind::Patch,Some(synth_patch),None,None).unwrap();
        let synth=r.prepare_runtime(&synth.label,|owner|admit_owned(&mut io,&mut audio.graphs[owner.id as usize],owner,owner.patch.as_ref().unwrap(),None,None,true)).unwrap();
        let running=crate::audio::tests::hold_running(&mut io);assert_eq!(unsafe{crate::session::native::ultra_external_start()},1);
        let message=audio.graphs[synth.id as usize].event(synth.runtime_revision,2,0,serde_json::json!([60,100])).unwrap();
        assert_eq!(unsafe{crate::ultra_canvas_message_document(synth.id,synth.runtime_revision,2,0,&message)},1);
        let energy=||{let(mut left,mut right)=([0.;256],[0.;256]);assert_eq!(unsafe{crate::session::native::ultra_external_render(256,left.as_mut_ptr(),right.as_mut_ptr())},1);left.iter().map(|v|f64::from(*v).abs()).sum::<f64>()};
        assert!(energy()>0.01);
        let request=|token,phase:&str,value|GestureRequest{owner_label:synth.label.clone(),runtime_revision:synth.runtime_revision,token,node:5,key:"sustain".into(),phase:phase.into(),value};
        let baseline=synth.patch.as_ref().unwrap()["nodes"][4]["params"]["sustain"].as_f64().unwrap();
        let token=apply(&mut r,&mut audio,&mut io,&synth.label,request(None,"begin",baseline)).unwrap().token;
        apply(&mut r,&mut audio,&mut io,&synth.label,request(Some(token),"preview",0.4)).unwrap();
        let mut changed=synth.patch.clone().unwrap();changed["presentation"]["items"][0]["label"]=serde_json::json!("Attack time");
        r.commit(&synth.label,0,changed.clone(),true,|owner,patch|admit_owned(&mut io,&mut audio.graphs[owner.id as usize],owner,patch,None,None,false)).unwrap();assert!(energy()>0.01);
        changed["nodes"][3]["params"]["cutoff"]=serde_json::json!(1700);
        r.commit(&synth.label,1,changed,true,|owner,patch|admit_owned(&mut io,&mut audio.graphs[owner.id as usize],owner,patch,None,None,false)).unwrap();assert!(energy()>0.01);
        apply(&mut r,&mut audio,&mut io,&synth.label,request(Some(token),"cancel",baseline)).unwrap();assert!(energy()>0.01);assert_eq!(snapshot(synth.id).revision,synth.runtime_revision);
        drop(running);io.stop().unwrap();close_owned(&mut io,synth.id).unwrap();
    }
}
