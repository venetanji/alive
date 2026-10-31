//! Workspace runtime owner and canonical native identity parsing.
use super::host::Host;
pub fn decimal(value:&str)->Result<u64,String>{
    if value.is_empty()||(value.len()>1&&value.starts_with('0'))||!value.bytes().all(|b|b.is_ascii_digit()){return Err("Expected a canonical unsigned decimal string".into());}
    value.parse().map_err(|_|"Unsigned identity exceeds u64".into())
}
#[derive(Default)]
pub struct Runtime {
    serial:u64,
    pub workspace:super::runtime_workspaces::Runtime,
    pub master_observation:Option<super::native_master::State>,
}
impl Runtime {
    pub fn workspace_request(&mut self,host:&Host,action:super::runtime_workspaces::Action)->Result<super::runtime_workspaces::RequestResult,String>{
        self.workspace.request(host,action,&mut self.serial)
    }
    pub fn poll(&mut self,host:&Host)->Result<(serde_json::Value,serde_json::Value),String>{
        let result=self.workspace.poll(host)?;self.master_observation=self.workspace.master_observation;Ok(result)
    }
}
