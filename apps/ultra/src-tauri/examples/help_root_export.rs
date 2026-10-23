//! Offline scoring utility: reuse production preparation; keep output private.
#[allow(dead_code)]
#[path = "../src/canvas.rs"]
mod canvas;

use serde_json::{json, Value};
use std::{env, error::Error, fs::{self, OpenOptions}, io::Write, path::Path};
#[cfg(unix)]
use std::os::unix::fs::OpenOptionsExt;

fn main() -> Result<(), Box<dyn Error>> {
    let args: Vec<_> = env::args_os().skip(1).collect();
    if args.len() != 2 {
        return Err("Usage: help_root_export PRIVATE_AUTHORING_JSON NEW_PRIVATE_NATIVE_JSON".into());
    }
    if fs::metadata(&args[0])?.len() > 1_048_576 {
        return Err("Authoring input exceeds 1 MiB".into());
    }
    let worktree=Path::new(env!("CARGO_MANIFEST_DIR")).ancestors().nth(3).ok_or("Missing worktree")?.canonicalize()?;
    let destination=Path::new(&args[1]);
    let parent=destination.parent().filter(|path|!path.as_os_str().is_empty()).unwrap_or(Path::new(".")).canonicalize()?;
    if parent.starts_with(worktree) {
        return Err("Private native output must be outside the source worktree".into());
    }
    let input: Value = serde_json::from_slice(&fs::read(&args[0])?)?;
    let prepared = canvas::prepare(input)?;
    let graph = &prepared.native;
    let nodes: Vec<_> = graph.nodes[..graph.node_count as usize].iter().map(|node| {
        let end = node.text.iter().position(|&byte| byte == 0).expect("prepared text terminates");
        let text_hex: String = node.text[..end].iter().map(|byte| format!("{byte:02x}")).collect();
        json!({"id":node.id,"kind":node.kind,"device":node.device,"count":node.count,
            "parameters":[node.p0,node.p1,node.p2,node.p3,node.p4,node.p5],"text_hex":text_hex})
    }).collect();
    let edges: Vec<_> = graph.edges[..graph.edge_count as usize].iter().map(|edge| {
        json!({"from":edge.from,"outlet":edge.outlet,"to":edge.to,"inlet":edge.inlet})
    }).collect();
    let export=json!({"schema":"ultra-production-native-descriptors-v1","nodes":nodes,"edges":edges});
    let mut options=OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    options.mode(0o600);
    let mut output=options.open(&args[1])?;
    serde_json::to_writer_pretty(&mut output,&export)?;
    output.write_all(b"\n")?;
    println!("{}",json!({"nodes":graph.node_count,"edges":graph.edge_count,"production_prepare":true}));
    Ok(())
}
