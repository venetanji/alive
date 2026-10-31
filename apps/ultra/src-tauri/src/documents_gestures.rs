//! Live parameter previews belong to the document owner, independently of any UI mount.
use super::*;

#[derive(Clone, Serialize)]
#[serde(rename_all="camelCase")]
pub struct ParameterPreview { pub token:u64, pub view_label:String, pub node:u32, pub key:String, pub value:f64, pub baseline:f64, pub runtime_revision:u64,pub previewed:bool }
#[derive(Clone, Default)]
pub(super) struct GestureState { next:u64, active:BTreeMap<u64,ParameterPreview> }

pub(crate) fn set_parameter(patch:&mut Value,id:u32,key:&str,value:f64)->bool {
    let Some(nodes)=patch.get_mut("nodes").and_then(Value::as_array_mut) else{return false;};
    for node in nodes {if node["id"].as_u64()==Some(u64::from(id)){node["params"][key]=serde_json::json!(value);return true;}if let Some(child)=node.get_mut("patcher"){if set_parameter(child,id,key,value){return true;}}}false
}
impl Document {
    pub fn parameter_previews(&self)->Vec<ParameterPreview>{self.gestures.active.values().cloned().collect()}
    pub fn require_settled_parameter_gestures(&self)->Result<(),String>{if self.gestures.active.is_empty(){Ok(())}else{Err("Finish or cancel the active presentation control before replacing, saving or closing this patch.".into())}}
    pub(super) fn validate_gesture_change(&self,patch:&Value)->Result<(),String>{
        if self.gestures.active.is_empty(){return Ok(());}
        let old=crate::canvas::prepare(self.patch.clone().unwrap())?;let next=crate::canvas::prepare(patch.clone())?;
        if !crate::canvas::CanvasState::live_changes_only(&old,&next){return Err("Finish or cancel the active presentation control before a structural or text edit.".into());}
        for gesture in self.gestures.active.values(){if old.parameter_value(gesture.node,&gesture.key)?!=next.parameter_value(gesture.node,&gesture.key)?{return Err("This parameter is owned by an active presentation gesture. Finish or cancel it first.".into());}}
        Ok(())
    }
}
impl Registry {
    pub fn require_settled_parameter_gestures(&self,label:&str)->Result<(),String>{self.get_open(label)?.require_settled_parameter_gestures()}
    pub fn begin_parameter_gesture(&mut self,label:&str,owner_label:&str,revision:u64,node:u32,key:&str)->Result<u64,String>{
        let owner=self.get_open(label)?;
        if owner.label!=owner_label||owner.runtime_revision!=revision||revision==0{return Err("Presentation gesture scope changed.".into());}
        if owner.close_pending{return Err("This patch is closing; finish its pending control first.".into());}
        if owner.gestures.active.len()>=16{return Err("Up to 16 presentation gestures can be active per document.".into());}
        if owner.gestures.active.values().any(|g|g.node==node&&g.key==key){return Err("This parameter already has an active presentation gesture.".into());}
        let plan=crate::canvas::prepare(owner.patch.clone().unwrap())?;let baseline=plan.parameter_value(node,key)?;
        let owner=self.get_mut(label)?;let token=owner.gestures.next.checked_add(1).filter(|n|*n<=9_007_199_254_740_991).ok_or("Gesture token exhausted")?;
        owner.gestures.next=token;owner.gestures.active.insert(token,ParameterPreview{token,view_label:label.into(),node,key:key.into(),value:baseline,baseline,runtime_revision:revision,previewed:false});Ok(token)
    }
    pub fn parameter_gesture(&self,label:&str,owner_label:&str,revision:u64,token:u64)->Result<ParameterPreview,String>{
        let owner=self.get_open(label)?;if owner.label!=owner_label||owner.runtime_revision!=revision{return Err("Presentation gesture scope changed.".into());}
        let gesture=owner.gestures.active.get(&token).ok_or("Presentation gesture is no longer active")?;
        if gesture.view_label!=label||gesture.runtime_revision!=revision{return Err("Presentation gesture belongs to another view or runtime.".into());}Ok(gesture.clone())
    }
    pub fn accept_parameter_preview(&mut self,label:&str,owner_label:&str,revision:u64,token:u64,value:f64)->Result<(),String>{
        let gesture=self.parameter_gesture(label,owner_label,revision,token)?;
        if !value.is_finite(){return Err("Presentation parameter requires a finite value".into());}
        let mut patch=self.get_open(label)?.patch.clone().unwrap();set_parameter(&mut patch,gesture.node,&gesture.key,value);crate::canvas::prepare(patch)?;
        let gesture=self.get_mut(label)?.gestures.active.get_mut(&token).unwrap();gesture.value=value;gesture.previewed=true;Ok(())
    }
    pub(crate) fn restore_parameter_gesture(&mut self,label:&str,gesture:ParameterPreview)->Result<(),String>{self.get_mut(label)?.gestures.active.insert(gesture.token,gesture);Ok(())}
    pub fn settle_owned_parameter_gesture(&mut self,label:&str,token:u64,admit:impl FnOnce(&Document,&Value)->Result<Admission,String>)->Result<CommitResult,String>{
        let owner=self.get_open(label)?;let owner_label=owner.label.clone();let revision=owner.runtime_revision;
        let previous=owner.gestures.active.get(&token).ok_or("Presentation gesture is no longer active")?.view_label.clone();
        self.get_mut(label)?.gestures.active.get_mut(&token).unwrap().view_label=label.into();
        let result=self.finish_parameter_gesture(label,&owner_label,revision,token,true,admit);
        if result.is_err(){self.get_mut(label)?.gestures.active.get_mut(&token).unwrap().view_label=previous;}result
    }
    pub fn finish_parameter_gesture(&mut self,label:&str,owner_label:&str,revision:u64,token:u64,commit:bool,admit:impl FnOnce(&Document,&Value)->Result<Admission,String>)->Result<CommitResult,String>{
        let gesture=self.parameter_gesture(label,owner_label,revision,token)?;
        if !commit{self.get_mut(label)?.gestures.active.remove(&token);return Ok(CommitResult{accepted:true,document:self.descriptor(label)?});}
        let owner=self.get_open(label)?;let base=owner.authoring_revision;let mut patch=owner.patch.clone().unwrap();
        if !set_parameter(&mut patch,gesture.node,&gesture.key,gesture.value){return Err("Presentation target was removed".into());}
        self.get_mut(label)?.gestures.active.remove(&token);
        match self.commit(label,base,patch,true,admit){Ok(result)=>Ok(result),Err(error)=>{self.get_mut(label)?.gestures.active.insert(token,gesture);Err(error)}}
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn patch() -> Value { serde_json::json!({"version":1,"profile":"ultra-canvas-v1","presentation":null,"nodes":[
        {"id":1,"type":"number","x":0,"y":0,"params":{"value":1}},
        {"id":2,"type":"number","x":0,"y":0,"params":{"value":2}}],"edges":[]}) }
    #[test]
    fn scoped_preview_keeps_canonical_history_and_other_edits() {
        let mut registry=Registry::default();
        let owner=registry.add("Gesture".into(),Kind::Patch,Some(patch()),None,None).unwrap();
        let owner=registry.prepare_runtime(&owner.label, |_|Ok(11.into())).unwrap();
        let token=registry.begin_parameter_gesture(&owner.label,&owner.label,11,1,"value").unwrap();
        registry.accept_parameter_preview(&owner.label,&owner.label,11,token,7.).unwrap();
        assert_eq!(registry.get(&owner.label).unwrap().patch.as_ref().unwrap()["nodes"][0]["params"]["value"],1);
        let mut metadata=patch();metadata["nodes"][0]["x"]=serde_json::json!(30);
        registry.commit(&owner.label,0,metadata,true,|_,_|Ok(11.into())).unwrap();
        let mut other=registry.get(&owner.label).unwrap().patch.clone().unwrap();other["nodes"][1]["params"]["value"]=serde_json::json!(9);
        registry.commit(&owner.label,1,other,true,|_,_|Ok(11.into())).unwrap();
        registry.finish_parameter_gesture(&owner.label,&owner.label,11,token,true,|_,_|Ok(11.into())).unwrap();
        let doc=registry.get(&owner.label).unwrap();assert_eq!(doc.patch.as_ref().unwrap()["nodes"][0]["params"]["value"],7.);
        registry.history(&owner.label,3,"undo",|_,_|Ok(11.into())).unwrap();
        let p=registry.get(&owner.label).unwrap().patch.as_ref().unwrap();assert_eq!(p["nodes"][0]["params"]["value"],1);assert_eq!(p["nodes"][1]["params"]["value"],9);assert_eq!(p["nodes"][0]["x"],30);
    }
    #[test]
    fn preview_refuses_wrong_scope_target_conflicts_structural_changes_and_unsettled_save() {
        let mut r=Registry::default();let owner=r.add("Gesture".into(),Kind::Patch,Some(patch()),None,None).unwrap();r.prepare_runtime(&owner.label, |_|Ok(11.into())).unwrap();
        let token=r.begin_parameter_gesture(&owner.label,&owner.label,11,1,"value").unwrap();
        assert!(r.accept_parameter_preview(&owner.label,"wrong",11,token,3.).is_err());assert!(r.accept_parameter_preview(&owner.label,&owner.label,12,token,3.).is_err());
        let mut conflict=patch();conflict["nodes"][0]["params"]["value"]=serde_json::json!(4);
        assert!(r.commit(&owner.label,0,conflict,true,|_,_|panic!("must refuse before native admission")).is_err());
        let mut structure=patch();structure["nodes"].as_array_mut().unwrap().pop();assert!(r.commit(&owner.label,0,structure,true,|_,_|panic!("must refuse before native admission")).is_err());
        assert!(r.require_settled_parameter_gestures(&owner.label).is_err());
        r.finish_parameter_gesture(&owner.label,&owner.label,11,token,false,|_,_|panic!("cancel has no canonical admission")).unwrap();assert!(r.require_settled_parameter_gestures(&owner.label).is_ok());
        assert!(r.accept_parameter_preview(&owner.label,&owner.label,11,token,3.).is_err());r.remove(&owner.label);assert!(r.accept_parameter_preview(&owner.label,&owner.label,11,token,3.).is_err());
    }
}
