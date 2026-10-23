//! Authoring validation and boundary-preserving lowering for version 2 trees.
use super::{kind, prepare_flat, validate_json_size, validate_position, validate_style, Document, Edge, Node, Prepared};
use serde::{Deserialize, Deserializer};
use serde_json::{Map, Value};
use std::collections::{HashMap, HashSet};

const MAX_JSON_BYTES: usize = 1024 * 1024;
const MAX_NODES: usize = 512;
const MAX_EDGES: usize = 1024;
const MAX_DEPTH: usize = 16;

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct HierarchyDocument {
    version: u32,
    profile: String,
    nodes: Vec<HierarchyNode>,
    edges: Vec<Edge>,
    #[serde(default, deserialize_with = "super::device::present")]
    device: Option<super::device::Device>,
    #[serde(default, rename = "helpShell", deserialize_with = "present_help_shell")]
    help_shell: Option<HelpShell>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct HelpShell { adapter: String, object: String, basic_node: u32, question_node: u32 }
fn present_help_shell<'de,D:Deserializer<'de>>(deserializer:D)->Result<Option<HelpShell>,D::Error>{
    HelpShell::deserialize(deserializer).map(Some)
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Scope {
    nodes: Vec<HierarchyNode>,
    edges: Vec<Edge>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct HierarchyNode {
    id: u32,
    r#type: String,
    x: f64,
    y: f64,
    params: Map<String, Value>,
    #[serde(default)]
    style: Map<String, Value>,
    #[serde(default, deserialize_with = "present_patcher")]
    patcher: Option<Scope>,
}

// Missing is valid for leaves; an explicitly present null is never a patcher.
fn present_patcher<'de, D: Deserializer<'de>>(deserializer: D) -> Result<Option<Scope>, D::Error> {
    Scope::deserialize(deserializer).map(Some)
}

#[derive(Default)]
struct Bounds {
    nodes: usize,
    edges: usize,
    ids: HashSet<u32>,
}

pub(super) fn prepare(patch: Value) -> Result<Prepared, String> {
    validate_json_size(&patch, MAX_JSON_BYTES, "Hierarchy patch exceeds 1 MiB JSON")?;
    let doc: HierarchyDocument = serde_json::from_value(patch)
        .map_err(|error| format!("Invalid hierarchy schema: {error}"))?;
    if doc.version != 2 || doc.profile != "ultra-patcher-v2" {
        return Err("Expected version 2 and profile ultra-patcher-v2".into());
    }
    let root = Scope { nodes: doc.nodes, edges: doc.edges };
    validate_scope(&root, 0, &mut Bounds::default())?;
    validate_help_shell(&root,doc.help_shell.as_ref())?;
    let mut nodes = Vec::new();
    let mut edges = Vec::new();
    lower_scope(root, &mut nodes, &mut edges)?;
    prepare_flat(Document { version: 1, profile: "ultra-canvas-v1".into(), nodes, edges, device: doc.device }, true)
}

fn validate_scope(scope: &Scope, depth: usize, bounds: &mut Bounds) -> Result<(), String> {
    if depth > MAX_DEPTH {
        return Err("Hierarchy supports at most 16 embedded patcher levels".into());
    }
    bounds.nodes += scope.nodes.len();
    bounds.edges += scope.edges.len();
    if bounds.nodes > MAX_NODES {
        return Err("Hierarchy supports at most 512 total authoring nodes".into());
    }
    if bounds.edges > MAX_EDGES {
        return Err("Hierarchy supports at most 1024 total authoring edges".into());
    }
    for node in &scope.nodes {
        if node.id == 0 || !bounds.ids.insert(node.id) {
            return Err("Node IDs must be globally unique positive u32 integers".into());
        }
        validate_position(node.x, node.y)?;
        match node.r#type.as_str() {
            "patcher" => {
                let name = text_parameter(node, "name")?;
                if name.is_empty() || name.len() > 127 || name.bytes().any(|b| !(32..=126).contains(&b)) {
                    return Err("Patcher name requires 1..127 printable ASCII bytes".into());
                }
                validate_style(u32::MAX, "patcher", &node.style)?;
                let child = node.patcher.as_ref().ok_or("Patcher node requires a patcher scope")?;
                validate_scope(child, depth + 1, bounds)?;
            }
            "comment" => {
                let text = text_parameter(node, "text")?;
                if text.len() > 4096 || text.bytes().any(|b| !(32..=126).contains(&b) && !matches!(b, b'\t' | b'\r' | b'\n')) {
                    return Err("Comment text requires at most 4096 printable ASCII bytes with tab and newlines".into());
                }
                validate_style(u32::MAX, "comment", &node.style)?;
            }
            "help_helper" => {
                if !matches!(text_parameter(node,"role")?,"starter"|"name"|"details"|"arguments") {
                    return Err("Unknown help helper role".into());
                }
                validate_style(u32::MAX,"help_helper",&node.style)?;
            }
            name => {
                kind(name).ok_or_else(|| format!("Unknown canvas object: {name}"))?;
                if matches!(name, "inlet" | "outlet") && !node.params.is_empty() {
                    return Err(format!("Unknown parameter for {name}"));
                }
            }
        }
        if node.r#type != "patcher" && node.patcher.is_some() {
            return Err("Only patcher nodes may contain a patcher scope".into());
        }
    }
    let local: HashMap<_, _> = scope.nodes.iter().map(|node| (node.id, node)).collect();
    let mut cords = HashSet::new();
    for edge in &scope.edges {
        let source = local.get(&edge.from).ok_or("Edge source must be in its immediate authoring scope")?;
        let target = local.get(&edge.to).ok_or("Edge destination must be in its immediate authoring scope")?;
        boundary(source, edge.outlet, true)?;
        boundary(target, edge.inlet, false)?;
        if !cords.insert((edge.from, edge.outlet, edge.to, edge.inlet)) {
            return Err("Duplicate canvas edge".into());
        }
    }
    Ok(())
}

fn validate_help_shell(root:&Scope,shell:Option<&HelpShell>)->Result<(),String>{
    fn helper_count(scope:&Scope)->usize{
        scope.nodes.iter().map(|node|usize::from(node.r#type=="help_helper")+node.patcher.as_ref().map_or(0,helper_count)).sum()
    }
    let Some(shell)=shell else {
        return if helper_count(root)==0 {Ok(())}else{Err("Help helpers require a root helpShell".into())};
    };
    if !matches!((shell.adapter.as_str(),shell.object.as_str()),
        ("max-help-four-v1","append"|"prepend"|"int"|"float")|
        ("max-help-arithmetic-three-v1","times"|"plus"|"minus")) {
        return Err("Unknown help shell adapter or object".into());
    }
    if shell.basic_node==0||shell.question_node==0||shell.basic_node==shell.question_node||root.nodes.len()!=4||!root.edges.is_empty(){
        return Err("Help shell requires four root nodes, distinct Basic/question IDs and no root cables".into());
    }
    let child=|id,name|->Result<&Scope,String>{
        let node=root.nodes.iter().find(|node|node.id==id&&node.r#type=="patcher").ok_or("Help shell tab must be a direct patcher")?;
        if text_parameter(node,"name")?!=name{return Err("Help shell patcher name does not match its role".into());}
        node.patcher.as_ref().ok_or_else(||"Help shell tab requires a patcher scope".into())
    };
    let basic=child(shell.basic_node,"basic")?;let question=child(shell.question_node,"?")?;
    let roles=|scope:&Scope|->Vec<String>{scope.nodes.iter().filter(|node|node.r#type=="help_helper").map(|node|node.params["role"].as_str().unwrap().to_owned()).collect()};
    let mut root_roles=roles(root);root_roles.sort();let mut basic_roles=roles(basic);basic_roles.sort();
    if root_roles!=["name","starter"]||basic_roles!=["arguments","details"]||helper_count(root)!=4{
        return Err("Help shell requires starter/name at root and details/arguments directly in Basic only".into());
    }
    if !question.nodes.is_empty()||!question.edges.is_empty(){return Err("Help shell question patcher must be empty".into());}
    Ok(())
}

fn text_parameter<'a>(node: &'a HierarchyNode, key: &str) -> Result<&'a str, String> {
    if node.params.len() != 1 || !node.params.contains_key(key) {
        return Err(format!("{} requires only the {key} parameter", node.r#type));
    }
    node.params[key].as_str().ok_or_else(|| format!("{} {key} must be a string", node.r#type))
}

fn boundary(node: &HierarchyNode, port: u32, output: bool) -> Result<(u32, u32), String> {
    match node.r#type.as_str() {
        "patcher" => {
            let connector = if output { "outlet" } else { "inlet" };
            let mut nodes: Vec<_> = node.patcher.as_ref().ok_or("Missing child patcher")?.nodes.iter()
                .filter(|child| child.r#type == connector).collect();
            // Stable sorting makes saved node order the tie-breaker, independent of y.
            nodes.sort_by(|a, b| a.x.partial_cmp(&b.x).expect("validated finite positions"));
            let child = nodes.get(port as usize).ok_or_else(|| format!("Invalid patcher {connector} port"))?;
            Ok((child.id, 0))
        }
        "comment" => Err("Comments have no surface ports".into()),
        "help_helper" => Err("Help helpers have no surface ports".into()),
        "inlet" if !output || port != 0 => Err("Invalid inlet connector surface port".into()),
        "outlet" if output || port != 0 => Err("Invalid outlet connector surface port".into()),
        _ => Ok((node.id, port)),
    }
}

fn lower_scope(scope: Scope, nodes: &mut Vec<Node>, edges: &mut Vec<Edge>) -> Result<(), String> {
    let local: HashMap<_, _> = scope.nodes.iter().map(|node| (node.id, node)).collect();
    // Parent edges precede descendant scopes; each saved cable array stays ordered.
    for edge in scope.edges {
        let (from, outlet) = boundary(local[&edge.from], edge.outlet, true)?;
        let (to, inlet) = boundary(local[&edge.to], edge.inlet, false)?;
        edges.push(Edge { from, outlet, to, inlet, _midpoints: None });
    }
    for node in scope.nodes {
        match node.r#type.as_str() {
            "patcher" => lower_scope(node.patcher.ok_or("Missing child patcher")?, nodes, edges)?,
            "comment" | "help_helper" => {},
            _ => nodes.push(Node { id: node.id, r#type: node.r#type, x: node.x, y: node.y,
                params: node.params, style: node.style }),
        }
    }
    Ok(())
}
