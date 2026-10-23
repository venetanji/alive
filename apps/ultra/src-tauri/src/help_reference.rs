//! Bounded local Max identity and plain-text reference access, off audio.
use quick_xml::{events::Event,Reader};
use serde::Serialize;
use sha2::{Digest,Sha256};
use std::{collections::BTreeMap,ffi::OsString,fs::File,io::Read,path::{Path,PathBuf}};

const SOURCE_LIMIT:usize=8*1024*1024;
const XML_LIMIT:usize=512*1024;
const FIELD_LIMIT:usize=16*1024;
const RESPONSE_LIMIT:usize=256*1024;
const CATALOG:[&str;13]=["append","prepend","int","float","combine","join","pack","pak","zl","message","route","pv","value"];
// Identity facts only, from the hierarchy and arithmetic help-root plans.
const ROOTS:[(&str,&str);7]=[
    ("append","d4a3fe4d87f7fd7b30c747cc18cc09f7ba6dd703adadc279733df38503962729"),
    ("prepend","281fec882e5eac1c59f74b677a2c8485701602153028e2bead9e338e1440f5fb"),
    ("int","bbb8fc3b458eb168fe69b8709ba343808d23b6d55e2c59cc3086d01976c5ac61"),
    ("float","c5e9bd4e89ebc5808d2faf76400031705c35195c32b363b890787a37bbdec15c"),
    ("times","1eea3861a1605453fb3ed4daa4660f71e175fb2cf16ce4c4098cb53c5b94d54b"),
    ("plus","d1443c5af7ba8874c7b1d237e3d22bbe518970ad8ae85a09ec8f10494d084895"),
    ("minus","7968c6cf7d348b39d8fb8044c42977bc2b71fe55c4c7db8542150e79e6a1a0b0")];
const HELPERS:[(&str,&str);4]=[
    ("help/resources/helpstarter.js","a72853ae6e4593e9ed183e41a59f40e0454162c04ca8a9185648332baf8eeac8"),
    ("help/resources/helpname.js","49d1091a240f0a2926609462bd82cc7449527a2aadfd748238a5c593aedd12aa"),
    ("help/resources/helpdetails.js","31899d95bdc2dfcb45b1e0a4922a387351131479520992d15c225a594769aea1"),
    ("help/resources/helpargs.js","04cce1cb44b358680d9c6d3ef19873fa5ccbb192614905dc909057cf22805469")];
struct ArithmeticReference<'a> {object:&'a str,route:&'a str,xml_name:&'a str,sha256:&'a str}
const ARITHMETIC_REFERENCES:[ArithmeticReference<'static>;3]=[
    ArithmeticReference{object:"times",route:"docs/refpages/max-ref/times.maxref.xml",xml_name:"*",sha256:"85baf43d8613f3da7fa70ff326005e0fdd07d049e0b0c2e2a7e0bf7c1623253e"},
    ArithmeticReference{object:"plus",route:"docs/refpages/max-ref/plus.maxref.xml",xml_name:"+",sha256:"441f02ffe58bbc571e594398a6495430affc45240cdde79feecbadc769f91002"},
    ArithmeticReference{object:"minus",route:"docs/refpages/max-ref/minus.maxref.xml",xml_name:"-",sha256:"1cace7ba26cec674dec28196c28c0fd8063b4a8e8bdfd712fd12b64ec8675bcc"}];

#[derive(Serialize)]
#[serde(tag="status",rename_all="kebab-case")]
pub enum Probe {
    Recognized {adapter:&'static str,object:String,#[serde(rename="sourceSha256")]source_sha256:String},
    Unrecognized,
    Unavailable {reason:&'static str},
}
#[derive(Serialize)]
#[serde(tag="status",rename_all="kebab-case")]
pub enum Reference {Available {#[serde(flatten)]reference:ReferencePage},Unavailable {reason:&'static str}}
#[derive(Serialize)]
pub struct ReferencePage {
    object:String,#[serde(rename="sourceSha256")]source_sha256:String,digest:String,description:String,
    arguments:Vec<Argument>,methods:Vec<Entry>,inlets:Vec<Entry>,outlets:Vec<Entry>,related:Vec<Related>,
}
#[derive(Serialize)]
struct Argument {name:String,r#type:String,optional:bool,description:String}
#[derive(Serialize)]
struct Entry {name:String,description:String}
#[derive(Serialize)]
struct Related {name:String,available:bool}

fn authorize_reference(registry:&crate::documents::Registry,label:&str)->Result<(),String>{
    let owner=registry.get_open(label)?;
    if owner.runtime_revision==0{return Err("Reference requires an admitted help shell".into());}
    let patch=owner.patch.as_ref().ok_or("Reference requires a help shell")?;
    if crate::canvas::help_shell_object(patch)?.is_none(){return Err("Reference requires a help shell".into());}
    Ok(())
}
#[tauri::command]
pub fn help_shell_probe(window:tauri::WebviewWindow,documents:tauri::State<crate::document_windows::Documents>,source:String)->Result<Probe,String>{
    {
        let registry=documents.0.lock().map_err(|_|"Document lock poisoned")?;
        registry.get_open(window.label())?;
    }
    Ok(probe(&source))
}
#[tauri::command]
pub fn help_reference(window:tauri::WebviewWindow,documents:tauri::State<crate::document_windows::Documents>,name:String)->Result<Reference,String>{
    {
        let registry=documents.0.lock().map_err(|_|"Document lock poisoned")?;
        authorize_reference(&registry,window.label())?;
    }
    Ok(reference(&name))
}

fn digest(bytes:&[u8])->String{format!("{:x}",Sha256::digest(bytes))}
fn resources_root(configured:Option<OsString>,home:Option<OsString>)->Result<PathBuf,&'static str>{
    let path=match configured {
        Some(path) if !path.is_empty()=>PathBuf::from(path),
        Some(_)=>return Err("not-configured"),
        None=>PathBuf::from(home.ok_or("not-configured")?).join(".wine-ableton/drive_c/ProgramData/Ableton/Live 12 Suite/Resources/Max/resources"),
    };
    let root=path.canonicalize().map_err(|_|"not-configured")?;
    if !root.is_dir(){return Err("not-configured");}Ok(root)
}
fn local_root()->Result<PathBuf,&'static str>{resources_root(std::env::var_os("ULTRA_MAX_RESOURCES"),std::env::var_os("HOME"))}
fn read_contained(root:&Path,relative:&str,limit:usize)->Result<Vec<u8>,&'static str>{
    let path=root.join(relative).canonicalize().map_err(|_|"not-found")?;
    if !path.starts_with(root){return Err("invalid-reference");}
    let file=File::open(path).map_err(|_|"not-found")?;let metadata=file.metadata().map_err(|_|"not-found")?;
    if !metadata.is_file()||metadata.len()>limit as u64{return Err("invalid-reference");}
    let mut bytes=Vec::new();file.take(limit as u64+1).read_to_end(&mut bytes).map_err(|_|"not-found")?;
    if bytes.len()>limit{return Err("invalid-reference");}Ok(bytes)
}
pub fn probe(source:&str)->Probe{probe_at(source,local_root(),&ROOTS,&HELPERS)}
fn probe_at(source:&str,root:Result<PathBuf,&'static str>,roots:&[(&str,&str)],helpers:&[(&str,&str)])->Probe{
    if source.len()>SOURCE_LIMIT{return Probe::Unavailable{reason:"source-too-large"};}
    let source_sha256=digest(source.as_bytes());
    let Some((object,_))=roots.iter().find(|(_,hash)|*hash==source_sha256)else{return Probe::Unrecognized;};
    let adapter=match *object {
        "append"|"prepend"|"int"|"float"=>"max-help-four-v1",
        "times"|"plus"|"minus"=>"max-help-arithmetic-three-v1",
        _=>return Probe::Unrecognized,
    };
    let root=match root {Ok(root)=>root,Err(reason)=>return Probe::Unavailable{reason}};
    for (path,expected) in helpers {
        match read_contained(&root,path,XML_LIMIT){
            Ok(bytes) if digest(&bytes)==*expected=>{},
            Ok(_)=>return Probe::Unavailable{reason:"identity-mismatch"},
            Err(reason)=>return Probe::Unavailable{reason},
        }
    }
    Probe::Recognized{adapter,object:(*object).into(),source_sha256}
}
pub fn reference(name:&str)->Reference{reference_at(name,local_root())}
fn arithmetic_reference(name:&str)->Option<&'static ArithmeticReference<'static>>{
    ARITHMETIC_REFERENCES.iter().find(|identity|identity.object==name)
}
fn read_pinned_reference(root:&Path,identity:&ArithmeticReference<'_>)->Result<ReferencePage,&'static str>{
    let bytes=read_contained(root,identity.route,XML_LIMIT)?;
    if digest(&bytes)!=identity.sha256{return Err("identity-mismatch");}
    parse_reference_as(identity.object,identity.xml_name,&bytes)
}
fn related_page(name:&str)->Option<&str>{
    if CATALOG.contains(&name){return Some(name);}
    ARITHMETIC_REFERENCES.iter().find(|identity|identity.object==name||identity.xml_name==name).map(|identity|identity.object)
}
fn related_available(root:&Path,name:&str)->bool{
    if let Some(identity)=arithmetic_reference(name){return read_pinned_reference(root,identity).is_ok();}
    CATALOG.contains(&name)&&read_contained(root,&format!("docs/refpages/max-ref/{name}.maxref.xml"),XML_LIMIT).is_ok()
}
fn reference_at(name:&str,root:Result<PathBuf,&'static str>)->Reference{
    let result=(||{
        let identity=arithmetic_reference(name);
        if !CATALOG.contains(&name)&&identity.is_none(){return Err("not-found");}
        let root=root?;
        let mut reference=if let Some(identity)=identity {read_pinned_reference(&root,identity)?}else{
            let bytes=read_contained(&root,&format!("docs/refpages/max-ref/{name}.maxref.xml"),XML_LIMIT)?;
            parse_reference(name,&bytes)?
        };
        for related in &mut reference.related {
            if related.available {related.available=related_available(&root,&related.name);}
        }
        Ok(reference)
    })();
    match result {Ok(reference)=>Reference::Available{reference},Err(reason)=>Reference::Unavailable{reason}}
}

enum Part {Text(String),Element(XmlNode)}
struct XmlNode {name:String,attributes:BTreeMap<String,String>,parts:Vec<Part>}
impl XmlNode {
    fn children(&self)->impl Iterator<Item=&XmlNode>{self.parts.iter().filter_map(|part|if let Part::Element(node)=part{Some(node)}else{None})}
    fn child(&self,name:&str)->Result<Option<&XmlNode>,&'static str>{
        let mut children=self.children().filter(|node|node.name==name);let child=children.next();
        if children.next().is_some(){return Err("invalid-reference");}Ok(child)
    }
    fn attribute(&self,name:&str)->&str{self.attributes.get(name).map_or("",String::as_str)}
}
fn valid_text(text:&str)->bool{text.chars().all(|ch|(!ch.is_control()||matches!(ch,'\t'|'\r'|'\n'))&&!matches!(ch,'\u{fffe}'|'\u{ffff}'))}
fn field(text:String)->Result<String,&'static str>{if text.len()>FIELD_LIMIT||!valid_text(&text){Err("invalid-reference")}else{Ok(text)}}
fn xml_node(start:&quick_xml::events::BytesStart<'_>,reader:&Reader<&[u8]>)->Result<XmlNode,&'static str>{
    let name=std::str::from_utf8(start.name().as_ref()).map_err(|_|"invalid-reference")?.to_owned();
    let mut attributes=BTreeMap::new();
    for attribute in start.attributes(){let a=attribute.map_err(|_|"invalid-reference")?;
        let key=std::str::from_utf8(a.key.as_ref()).map_err(|_|"invalid-reference")?.to_owned();
        let value=field(a.decode_and_unescape_value(reader.decoder()).map_err(|_|"invalid-reference")?.into_owned())?;
        if attributes.insert(key,value).is_some(){return Err("invalid-reference");}
    }
    Ok(XmlNode{name,attributes,parts:Vec::new()})
}
fn parse_xml(bytes:&[u8])->Result<XmlNode,&'static str>{
    if bytes.len()>XML_LIMIT{return Err("invalid-reference");}
    let source=std::str::from_utf8(bytes).map_err(|_|"invalid-reference")?;
    if !valid_text(source){return Err("invalid-reference");}
    let source=source.replace("\r\n","\n").replace('\r',"\n");let mut reader=Reader::from_str(&source);
    let mut stack:Vec<XmlNode>=Vec::new();let mut root=None;
    loop {
        let event=reader.read_event().map_err(|_|"invalid-reference")?;
        match event {
            Event::Start(start)=>{if stack.len()>=32{return Err("invalid-reference");}stack.push(xml_node(&start,&reader)?);},
            Event::Empty(start)=>{if stack.len()>=32{return Err("invalid-reference");}let node=xml_node(&start,&reader)?;
                if let Some(parent)=stack.last_mut(){parent.parts.push(Part::Element(node));}else if root.replace(node).is_some(){return Err("invalid-reference");}},
            Event::End(_)=>{let node=stack.pop().ok_or("invalid-reference")?;
                if let Some(parent)=stack.last_mut(){parent.parts.push(Part::Element(node));}else if root.replace(node).is_some(){return Err("invalid-reference");}},
            Event::Text(text)=>append_text(&mut stack,text.xml_content().map_err(|_|"invalid-reference")?.into_owned())?,
            Event::CData(text)=>append_text(&mut stack,text.xml_content().map_err(|_|"invalid-reference")?.into_owned())?,
            Event::GeneralRef(reference)=>{
                let value=if let Some(ch)=reference.resolve_char_ref().map_err(|_|"invalid-reference")?{ch.to_string()}else{
                    match reference.decode().map_err(|_|"invalid-reference")?.as_ref(){"amp"=>"&","lt"=>"<","gt"=>">","quot"=>"\"","apos"=>"'",_=>return Err("invalid-reference")}.into()
                };append_text(&mut stack,value)?;
            },
            Event::DocType(_)=>return Err("invalid-reference"),
            Event::Eof=>break,
            Event::Decl(_)|Event::Comment(_)|Event::PI(_)=>{},
        }
    }
    if !stack.is_empty(){return Err("invalid-reference");}root.ok_or("invalid-reference")
}
fn append_text(stack:&mut [XmlNode],text:String)->Result<(),&'static str>{
    if !valid_text(&text){return Err("invalid-reference");}
    if let Some(node)=stack.last_mut(){node.parts.push(Part::Text(text));}else if !text.trim().is_empty(){return Err("invalid-reference");}Ok(())
}
fn text(node:&XmlNode)->Result<String,&'static str>{
    fn collect(node:&XmlNode,out:&mut String)->Result<(),&'static str>{
        if matches!(node.name.as_str(),"p"|"para"|"paragraph"|"div"|"li"){out.push_str("\n\n");}
        if node.name=="br"{out.push('\n');}
        for part in &node.parts {match part{Part::Text(value)=>out.push_str(value),Part::Element(child)=>collect(child,out)?,}}
        if matches!(node.name.as_str(),"p"|"para"|"paragraph"|"div"|"li"){out.push_str("\n\n");}Ok(())
    }
    let mut out=String::new();collect(node,&mut out)?;
    let mut normalized=String::new();let mut blank=false;
    for line in out.lines(){let line=line.trim();if line.is_empty(){blank=true;continue;}
        if !normalized.is_empty(){normalized.push_str(if blank{"\n\n"}else{"\n"});}normalized.push_str(line);blank=false;
    }
    field(normalized)
}
fn child_text(node:&XmlNode,name:&str)->Result<String,&'static str>{node.child(name)?.map_or(Ok(String::new()),text)}
fn list<'a>(root:&'a XmlNode,name:&str,item:&str)->Result<Vec<&'a XmlNode>,&'static str>{
    let nodes=root.child(name)?.map_or_else(Vec::new,|list|list.children().filter(|node|node.name==item).collect::<Vec<_>>());
    if nodes.len()>64{Err("invalid-reference")}else{Ok(nodes)}
}
fn parse_reference(name:&str,bytes:&[u8])->Result<ReferencePage,&'static str>{
    parse_reference_as(name,name,bytes)
}
fn parse_reference_as(name:&str,xml_name:&str,bytes:&[u8])->Result<ReferencePage,&'static str>{
    let root=parse_xml(bytes)?;
    if root.name!="c74object"{return Err("invalid-reference");}
    if root.attribute("name")!=xml_name{return Err("identity-mismatch");}
    let entries=|group,item|->Result<Vec<Entry>,&'static str>{list(&root,group,item)?.into_iter().map(|node|Ok(Entry{
        name:field(if node.attribute("name").is_empty(){node.attribute("id")}else{node.attribute("name")}.into())?,description:child_text(node,"description")?})).collect()};
    let arguments=list(&root,"objarglist","objarg")?.into_iter().map(|node|Ok(Argument{
        name:field(node.attribute("name").into())?,r#type:field(node.attribute("type").into())?,
        optional:match node.attribute("optional"){""|"0"=>false,"1"=>true,_=>return Err("invalid-reference")},description:child_text(node,"description")?})).collect::<Result<Vec<_>,_>>()?;
    let related=list(&root,"seealsolist","seealso")?.into_iter().map(|node|{
        let raw=field(node.attribute("name").into())?;let page=related_page(&raw);
        Ok(Related{name:page.unwrap_or(&raw).into(),available:page.is_some()})
    }).collect::<Result<Vec<_>,&'static str>>()?;
    let result=ReferencePage{object:name.into(),source_sha256:digest(bytes),digest:child_text(&root,"digest")?,description:child_text(&root,"description")?,
        arguments,methods:entries("methodlist","method")?,inlets:entries("inletlist","inlet")?,outlets:entries("outletlist","outlet")?,related};
    if serde_json::to_vec(&result).map_err(|_|"invalid-reference")?.len()+32>RESPONSE_LIMIT{return Err("invalid-reference");}Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64,Ordering};
    const XML:&str=r#"<?xml version="1.0"?><c74object name="append"><digest>Synthetic summary</digest><description><p>First &amp; <b>second</b>.</p><p>Unicode &#x03B1;.</p></description><objarglist><objarg name="tail" type="anything" optional="1"><description>Original argument.</description></objarg></objarglist><methodlist><method name="bang"><description>Original method.</description></method></methodlist><inletlist><inlet id="0"><description>Input.</description></inlet></inletlist><outletlist><outlet id="0"><description>Output.</description></outlet></outletlist><seealsolist><seealso name="pack"/><seealso name="outside"/></seealsolist></c74object>"#;
    // Match resources_root: macOS /var and Windows verbatim prefixes normalize
    // before containment checks. Never loosen the production boundary for tests.
    fn symlink_file(original:PathBuf,link:PathBuf){
        #[cfg(unix)] std::os::unix::fs::symlink(original,link).unwrap();
        #[cfg(windows)] std::os::windows::fs::symlink_file(original,link).unwrap();
    }
    struct Tree(std::path::PathBuf);
    impl Tree {fn new()->Self{static NEXT:AtomicU64=AtomicU64::new(0);let p=std::env::temp_dir().join(format!("ultra-help-provider-{}-{}",std::process::id(),NEXT.fetch_add(1,Ordering::Relaxed)));std::fs::create_dir(&p).unwrap();Self(p.canonicalize().unwrap())}
        fn write(&self,path:&str,text:&str){let p=self.0.join(path);std::fs::create_dir_all(p.parent().unwrap()).unwrap();std::fs::write(p,text).unwrap();}}
    impl Drop for Tree {fn drop(&mut self){let _=std::fs::remove_dir_all(&self.0);}}
    #[test]
    fn extracts_original_unicode_text_and_catalog_without_markup(){
        let reference=parse_reference("append",XML.as_bytes()).unwrap();
        assert_eq!(reference.object,"append");assert_eq!(reference.digest,"Synthetic summary");
        assert_eq!(reference.description,"First & second.\n\nUnicode \u{03b1}.");
        assert_eq!(reference.arguments[0].name,"tail");assert!(reference.arguments[0].optional);
        assert_eq!(reference.methods[0].name,"bang");assert_eq!(reference.inlets[0].name,"0");
        assert!(reference.related[0].available);assert!(!reference.related[1].available);
        assert_eq!(reference.source_sha256,digest(XML.as_bytes()));
    }
    #[test]
    fn rejects_entities_controls_identity_and_all_parser_bounds(){
        for bad in [XML.replace("<c74object", "<!DOCTYPE x [<!ENTITY q SYSTEM 'file:///tmp/x'>]><c74object"),XML.replace("&amp;","&outside;"),XML.replace("&amp;","&#0;"),XML.replace("&amp;","\u{1}"),XML.replace("name=\"append\"","name=\"int\"")]{assert!(parse_reference("append",bad.as_bytes()).is_err());}
        for body in [format!("<description>{}</description>","x".repeat(16385)),format!("{}x{}","<p>".repeat(32),"</p>".repeat(32)),format!("<methodlist>{}</methodlist>","<method name='x'><description>x</description></method>".repeat(65)),format!("<description>{}</description>"," ".repeat(512*1024))]{
            let xml=format!("<c74object name='append'>{body}</c74object>");assert!(parse_reference("append",xml.as_bytes()).is_err());
        }
        let xml=format!("<c74object name='append'><methodlist>{}</methodlist></c74object>",format!("<method name='x'><description>{}</description></method>","x".repeat(16000)).repeat(18));
        assert!(parse_reference("append",xml.as_bytes()).is_err());
    }
    #[test]
    fn exact_probe_identity_requires_all_helpers_and_preserves_raw_bytes(){
        let tree=Tree::new();let source="original synthetic source";let hash=digest(source.as_bytes());
        let helper="original synthetic helper";let helper_hash=digest(helper.as_bytes());
        let roots=[("append",hash.as_str())];let helpers=[("help/resources/synthetic.js",helper_hash.as_str())];
        assert!(matches!(probe_at(source,Ok(tree.0.clone()),&roots,&helpers),Probe::Unavailable{reason:"not-found"}));
        tree.write(helpers[0].0,helper);
        assert!(matches!(probe_at(source,Ok(tree.0.clone()),&roots,&helpers),Probe::Recognized{..}));
        for changed in [format!("{source}\n"),format!("\u{feff}{source}"),"{}".into()]{assert!(matches!(probe_at(&changed,Ok(tree.0.clone()),&roots,&helpers),Probe::Unrecognized));}
        tree.write(helpers[0].0,"changed");assert!(matches!(probe_at(source,Ok(tree.0.clone()),&roots,&helpers),Probe::Unavailable{reason:"identity-mismatch"}));
        assert!(matches!(probe_at(&"x".repeat(8*1024*1024+1),Ok(tree.0.clone()),&roots,&helpers),Probe::Unavailable{..}));
    }
    #[test]
    fn arithmetic_probe_selects_its_policy_only_after_all_four_helpers_match(){
        let tree=Tree::new();
        let helper_bodies=["synthetic starter", "synthetic name", "synthetic details", "synthetic arguments"];
        let helper_hashes=helper_bodies.map(|body|digest(body.as_bytes()));
        let helpers=[("help/resources/a.js",helper_hashes[0].as_str()),("help/resources/b.js",helper_hashes[1].as_str()),
            ("help/resources/c.js",helper_hashes[2].as_str()),("help/resources/d.js",helper_hashes[3].as_str())];
        for ((path,_),body) in helpers.iter().zip(helper_bodies){tree.write(path,body);}
        for (object,adapter) in [("times","max-help-arithmetic-three-v1"),("plus","max-help-arithmetic-three-v1"),
            ("minus","max-help-arithmetic-three-v1"),("append","max-help-four-v1"),("prepend","max-help-four-v1"),
            ("int","max-help-four-v1"),("float","max-help-four-v1")] {
            let source=format!("synthetic source for {object}");let hash=digest(source.as_bytes());let roots=[(object,hash.as_str())];
            let actual=serde_json::to_value(probe_at(&source,Ok(tree.0.clone()),&roots,&helpers)).unwrap();
            assert_eq!(actual,serde_json::json!({"status":"recognized","adapter":adapter,"object":object,"sourceSha256":hash}));
            for (index,(path,_)) in helpers.iter().enumerate(){
                tree.write(path,"changed helper");
                assert!(matches!(probe_at(&source,Ok(tree.0.clone()),&roots,&helpers),Probe::Unavailable{reason:"identity-mismatch"}));
                std::fs::remove_file(tree.0.join(path)).unwrap();
                assert!(matches!(probe_at(&source,Ok(tree.0.clone()),&roots,&helpers),Probe::Unavailable{reason:"not-found"}));
                tree.write(path,helper_bodies[index]);
            }
            assert!(matches!(probe_at(&format!("{source}\n"),Ok(tree.0.clone()),&roots,&helpers),Probe::Unrecognized));
        }
        let hash=digest(b"synthetic symbolic source");
        assert!(matches!(probe_at("synthetic symbolic source",Ok(tree.0.clone()),&[("*",hash.as_str())],&helpers),Probe::Unrecognized));
    }
    #[test]
    fn arithmetic_reference_routes_reject_unpinned_xml_and_public_symbol_aliases(){
        let tree=Tree::new();
        for (object,symbol) in [("times","*"),("plus","+"),("minus","-")] {
            let path=format!("docs/refpages/max-ref/{object}.maxref.xml");
            tree.write(&path,&format!("<c74object name='{symbol}'><digest>Synthetic arithmetic page.</digest></c74object>"));
            assert!(matches!(reference_at(object,Ok(tree.0.clone())),Reference::Unavailable{reason:"identity-mismatch"}));
            tree.write(&path,&format!("<c74object name='{object}'/>"));
            assert!(matches!(reference_at(object,Ok(tree.0.clone())),Reference::Unavailable{reason:"identity-mismatch"}));
            assert!(matches!(reference_at(symbol,Ok(tree.0.clone())),Reference::Unavailable{reason:"not-found"}));
        }
        for name in ["../times","times.maxref.xml","times/../plus","%2b","unknown"] {
            assert!(matches!(reference_at(name,Ok(tree.0.clone())),Reference::Unavailable{reason:"not-found"}));
        }
    }
    #[test]
    fn arithmetic_reference_tuples_bind_fixed_route_digest_and_exact_symbolic_identity(){
        let tree=Tree::new();
        for (object,symbol,route) in [("times","*","docs/refpages/max-ref/times.maxref.xml"),
            ("plus","+","docs/refpages/max-ref/plus.maxref.xml"),("minus","-","docs/refpages/max-ref/minus.maxref.xml")] {
            let xml=format!("<c74object name='{symbol}'><digest>Original synthetic arithmetic summary.</digest></c74object>");
            let hash=digest(xml.as_bytes());
            let identity=ArithmeticReference{object,route,xml_name:symbol,sha256:&hash};
            tree.write(route,&xml);
            let page=read_pinned_reference(&tree.0,&identity).unwrap();
            assert_eq!(page.object,object);assert_eq!(page.source_sha256,hash);
            tree.write(route,&format!("{xml}\n"));
            assert!(matches!(read_pinned_reference(&tree.0,&identity),Err("identity-mismatch")));
            for wrong_name in [object,"unknown","symbolic-alias","*","+","-"].into_iter().filter(|name|*name!=symbol) {
                let wrong=format!("<c74object name='{wrong_name}'/>");let wrong_hash=digest(wrong.as_bytes());
                let wrong_identity=ArithmeticReference{object,route,xml_name:symbol,sha256:&wrong_hash};
                tree.write(route,&wrong);
                assert!(matches!(read_pinned_reference(&tree.0,&wrong_identity),Err("identity-mismatch")));
            }
            std::fs::remove_file(tree.0.join(route)).unwrap();
            // '*' cannot be a filename on Windows. Still verify missing fixed
            // routes there; Unix additionally proves no symbolic-name fallback.
            if cfg!(unix)||symbol!="*" {tree.write(&format!("docs/refpages/max-ref/{symbol}.maxref.xml"),&xml);}
            assert!(matches!(read_pinned_reference(&tree.0,&identity),Err("not-found")));
            std::fs::create_dir(tree.0.join(route)).unwrap();
            assert!(matches!(read_pinned_reference(&tree.0,&identity),Err("invalid-reference")));
            std::fs::remove_dir(tree.0.join(route)).unwrap();
            let outside=Tree::new();outside.write("external.xml",&xml);
            symlink_file(outside.0.join("external.xml"),tree.0.join(route));
            assert!(matches!(read_pinned_reference(&tree.0,&identity),Err("invalid-reference")));
            std::fs::remove_file(tree.0.join(route)).unwrap();
            tree.write(route,&"x".repeat(XML_LIMIT+1));
            assert!(matches!(read_pinned_reference(&tree.0,&identity),Err("invalid-reference")));
        }
    }
    #[test]
    fn related_symbolic_classes_use_only_the_three_finite_safe_page_ids(){
        let xml="<c74object name='append'><seealsolist><seealso name='*'/><seealso name='+'/><seealso name='-'/><seealso name='times'/><seealso name='/'/><seealso name='../plus'/></seealsolist></c74object>";
        let related=serde_json::to_value(parse_reference("append",xml.as_bytes()).unwrap()).unwrap()["related"].clone();
        assert_eq!(related,serde_json::json!([{"name":"times","available":true},{"name":"plus","available":true},
            {"name":"minus","available":true},{"name":"times","available":true},{"name":"/","available":false},{"name":"../plus","available":false}]));
        let tree=Tree::new();tree.write("docs/refpages/max-ref/append.maxref.xml",xml);
        let unavailable=serde_json::json!([{"name":"times","available":false},{"name":"plus","available":false},
            {"name":"minus","available":false},{"name":"times","available":false},{"name":"/","available":false},{"name":"../plus","available":false}]);
        assert_eq!(serde_json::to_value(reference_at("append",Ok(tree.0.clone()))).unwrap()["related"],unavailable);
        for (object,symbol) in [("times","*"),("plus","+"),("minus","-")] {
            tree.write(&format!("docs/refpages/max-ref/{object}.maxref.xml"),&format!("<c74object name='{symbol}'/>"));
        }
        assert_eq!(serde_json::to_value(reference_at("append",Ok(tree.0.clone()))).unwrap()["related"],unavailable);
    }
    #[test]
    fn files_are_fixed_bounded_and_contained_with_explicit_root_precedence(){
        let tree=Tree::new();tree.write("docs/refpages/max-ref/append.maxref.xml",XML);
        assert!(matches!(reference_at("append",Ok(tree.0.clone())),Reference::Available{..}));
        assert!(matches!(reference_at("../append",Ok(tree.0.clone())),Reference::Unavailable{..}));
        assert!(matches!(reference_at("int",Ok(tree.0.clone())),Reference::Unavailable{reason:"not-found"}));
        assert!(resources_root(Some(tree.0.join("missing").into_os_string()),Some(tree.0.clone().into_os_string())).is_err());
        let outside=Tree::new();outside.write("external.xml",XML);
        symlink_file(outside.0.join("external.xml"),tree.0.join("docs/refpages/max-ref/int.maxref.xml"));
        assert!(matches!(reference_at("int",Ok(tree.0.clone())),Reference::Unavailable{reason:"invalid-reference"}));
    }
    #[test]
    fn reference_requires_admitted_valid_shell_but_probe_does_not(){
        let mut registry=crate::documents::Registry::default();
        let cases:Vec<serde_json::Value>=serde_json::from_str(include_str!("../../tests/fixtures/help-shell-schema.json")).unwrap();
        let ordinary=registry.add("ordinary".into(),crate::documents::Kind::Patch,None,None,None).unwrap();
        assert!(authorize_reference(&registry,&ordinary.label).is_err());
        let owner=registry.add("shell".into(),crate::documents::Kind::Patch,Some(cases[0]["patch"].clone()),None,None).unwrap();
        assert!(authorize_reference(&registry,&owner.label).is_err());
        registry.get_mut(&owner.label).unwrap().runtime_revision=1;
        assert!(authorize_reference(&registry,&owner.label).is_ok());
        let (child,_)=registry.open_view(&owner.label,3).unwrap();assert!(authorize_reference(&registry,&child.label).is_ok());
        registry.get_mut(&owner.label).unwrap().patch.as_mut().unwrap()["helpShell"]["object"]=serde_json::json!("unknown");
        assert!(authorize_reference(&registry,&child.label).is_err());
        registry.remove(&owner.label);assert!(authorize_reference(&registry,&child.label).is_err());
        assert!(matches!(probe("original unrecognized document"),Probe::Unrecognized));
    }
    #[test]
    fn extraction_limits_apply_to_normalized_fields_and_reject_duplicate_sections(){
        let value="x".repeat(FIELD_LIMIT);
        let xml=format!("<c74object name='append'><description><p>{value}</p></description></c74object>");
        assert_eq!(parse_reference("append",xml.as_bytes()).unwrap().description,value);
        for body in ["<description>a</description><description>b</description>","<methodlist/><methodlist/>","<methodlist><method name='x'><description>a</description><description>b</description></method></methodlist>"]{
            let xml=format!("<c74object name='append'>{body}</c74object>");
            assert!(parse_reference("append",xml.as_bytes()).is_err());
        }
        let xml="<c74object name='append'><description>&#xFFFF;</description></c74object>";
        assert!(parse_reference("append",xml.as_bytes()).is_err());
    }
    #[test]
    fn shell_metadata_survives_child_commit_history_and_disk_roundtrip(){
        let cases:Vec<serde_json::Value>=serde_json::from_str(include_str!("../../tests/fixtures/help-shell-schema.json")).unwrap();
        let original=cases[0]["patch"].clone();let mut registry=crate::documents::Registry::default();
        let owner=registry.add("shell".into(),crate::documents::Kind::Patch,Some(original.clone()),None,None).unwrap();
        let (child,_)=registry.open_view(&owner.label,3).unwrap();
        let mut edited=original.clone();edited["nodes"][2]["patcher"]["nodes"][2]["params"]["text"]=serde_json::json!("42");
        let committed=registry.commit(&child.label,0,edited.clone(),true,|_,_|Ok(1.into())).unwrap();
        assert!(committed.accepted);assert_eq!(committed.document.patch,Some(edited.clone()));
        let published=serde_json::to_value(registry.descriptor(&child.label).unwrap()).unwrap();
        assert_eq!(published["patch"]["helpShell"],original["helpShell"]);
        assert_eq!(registry.history(&owner.label,1,"undo",|_,_|Ok(2.into())).unwrap().document.patch,Some(original.clone()));
        assert_eq!(registry.history(&child.label,2,"redo",|_,_|Ok(3.into())).unwrap().document.patch,Some(edited.clone()));
        let mut invalid=edited.clone();invalid["nodes"][0]["params"]["role"]=serde_json::json!("details");
        assert!(registry.commit(&child.label,3,invalid,true,|_,_|panic!("invalid shell reached admission")).is_err());
        assert_eq!(registry.get_open(&owner.label).unwrap().patch,Some(edited.clone()));
        let tree=Tree::new();let path=crate::documents::save_patch(&tree.0.join("shell.ultra"),&edited).unwrap();
        let restored:serde_json::Value=serde_json::from_slice(&std::fs::read(path).unwrap()).unwrap();
        assert_eq!(restored,edited);assert_eq!(restored["helpShell"],original["helpShell"]);
    }
    #[test]
    fn arithmetic_shell_owner_admission_history_and_disk_preserve_safe_policy(){
        let cases:Vec<serde_json::Value>=serde_json::from_str(include_str!("../../tests/fixtures/help-shell-schema.json")).unwrap();
        let tree=Tree::new();
        for object in ["times","plus","minus"] {
            let mut original=cases[0]["patch"].clone();
            original["helpShell"]["adapter"]=serde_json::json!("max-help-arithmetic-three-v1");
            original["helpShell"]["object"]=serde_json::json!(object);
            let mut registry=crate::documents::Registry::default();
            let owner=registry.add(object.into(),crate::documents::Kind::Patch,Some(original.clone()),None,None).unwrap();
            let (child,_)=registry.open_view(&owner.label,3).unwrap();
            assert!(authorize_reference(&registry,&owner.label).is_err());assert!(authorize_reference(&registry,&child.label).is_err());
            let mut edited=original.clone();edited["nodes"][2]["patcher"]["nodes"][2]["params"]["text"]=serde_json::json!("23");
            let commit=registry.commit(&child.label,0,edited.clone(),true,|_,_|Ok(1.into())).unwrap();assert!(commit.accepted);
            assert!(authorize_reference(&registry,&owner.label).is_ok());assert!(authorize_reference(&registry,&child.label).is_ok());
            let published=serde_json::to_value(registry.descriptor(&child.label).unwrap()).unwrap();
            assert_eq!(published["patch"]["helpShell"],original["helpShell"]);
            assert_eq!(registry.history(&owner.label,1,"undo",|_,_|Ok(2.into())).unwrap().document.patch,Some(original.clone()));
            assert_eq!(registry.history(&child.label,2,"redo",|_,_|Ok(3.into())).unwrap().document.patch,Some(edited.clone()));
            let mut crossed=edited.clone();crossed["helpShell"]["adapter"]=serde_json::json!("max-help-four-v1");
            assert!(registry.commit(&child.label,3,crossed,true,|_,_|panic!("crossed policy reached runtime admission")).is_err());
            assert_eq!(registry.get_open(&owner.label).unwrap().patch,Some(edited.clone()));
            let path=crate::documents::save_patch(&tree.0.join(format!("{object}.ultra")),&edited).unwrap();
            let restored:serde_json::Value=serde_json::from_slice(&std::fs::read(path).unwrap()).unwrap();
            assert_eq!(restored,edited);assert!(crate::canvas::prepare(restored).is_ok());
            registry.remove(&owner.label);assert!(authorize_reference(&registry,&child.label).is_err());
        }
    }
    #[test]
    #[ignore = "Reads the user's licensed local installation; emits identity/status facts only"]
    fn local_identity_and_catalog_are_available(){
        let root=local_root().expect("local resources root unavailable");
        for (name,expected) in ROOTS {
            let source=read_contained(&root,&format!("help/max/{name}.maxhelp"),SOURCE_LIMIT).expect("local help unavailable");
            assert!(digest(&source)==expected,"local help identity mismatch: {name}");
            let source=std::str::from_utf8(&source).expect("local help is not UTF-8");
            assert!(matches!(probe_at(source,Ok(root.clone()),&ROOTS,&HELPERS),Probe::Recognized{..}),"local helper verification failed: {name}");
        }
        for name in CATALOG {
            assert!(matches!(reference_at(name,Ok(root.clone())),Reference::Available{..}),"local reference unavailable: {name}");
        }
        for identity in ARITHMETIC_REFERENCES {
            let result=reference_at(identity.object,Ok(root.clone()));
            assert!(matches!(result,Reference::Available{reference} if reference.object==identity.object&&reference.source_sha256==identity.sha256),"local arithmetic reference unavailable: {}",identity.object);
        }
        println!("Verified 7 exact help sources, 4 exact helper sources, 13 existing local references, and 3 pinned arithmetic references.");
    }
}

