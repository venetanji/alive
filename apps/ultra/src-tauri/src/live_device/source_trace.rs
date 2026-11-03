use serde_json::{json, Value};
use std::{collections::VecDeque, sync::{Mutex, OnceLock}};

#[derive(Default)]
struct Trace { emitted: usize, catalogs: VecDeque<((u32,u64,u32), String)> }
impl Trace {
    fn record(&mut self, enabled: bool, key: Option<(u32,u64,u32)>, make: impl FnOnce() -> Value) -> Option<String> {
        if !enabled || self.emitted >= 128 { return None; }
        if self.emitted == 127 {
            self.emitted += 1;
            return Some(json!({"event":"trace_budget_exhausted"}).to_string());
        }
        let line = serde_json::to_string(&make()).ok()?;
        if let Some(key) = key {
            if let Some(index) = self.catalogs.iter().position(|(existing, _)| *existing == key) {
                let previous = self.catalogs.remove(index).unwrap();
                let same = previous.1 == line;
                self.catalogs.push_back((key, line.clone()));
                if same { return None; }
            } else {
                if self.catalogs.len() == 8 { self.catalogs.pop_front(); }
                self.catalogs.push_back((key, line.clone()));
            }
        }
        self.emitted += 1;
        Some(line)
    }
}

pub(crate) fn enabled() -> bool { std::env::var_os("ULTRA_TRACE_SOURCE_ACCEPTANCE").is_some() }

fn write_line(writer: &mut impl std::io::Write, line: &str) {
    let _ = writeln!(writer, "ultra-source-acceptance {line}");
}

// Called only by command boundaries after releasing the document and audio locks.
pub(crate) fn emit(key: Option<(u32,u64,u32)>, make: impl FnOnce() -> Value) {
    if !enabled() { return; }
    static TRACE: OnceLock<Mutex<Trace>> = OnceLock::new();
    if let Ok(mut trace) = TRACE.get_or_init(|| Mutex::new(Trace::default())).lock() {
        if let Some(line) = trace.record(true, key, make) { write_line(&mut std::io::stderr().lock(), &line); }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn failed_trace_write_preserves_reply_and_recorder_remains_usable() {
        struct Broken;
        impl std::io::Write for Broken {
            fn write(&mut self, _: &[u8]) -> std::io::Result<usize> { Err(std::io::ErrorKind::BrokenPipe.into()) }
            fn flush(&mut self) -> std::io::Result<()> { Ok(()) }
        }
        let mut trace = Trace::default();
        let mut registry = crate::documents::Registry::default();
        let patch = json!({"version":2,"profile":"ultra-patcher-v2","presentation":null,
            "nodes":[{"id":1,"type":"number","x":0,"y":0,"params":{"value":1}}],"edges":[]});
        let root = registry.add("test".into(), crate::documents::Kind::Patch, Some(patch.clone()), None, None).unwrap();
        let mut edited = patch;
        edited["nodes"][0]["params"]["value"] = json!(2);
        let reply = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            let result = registry.commit(&root.label, 0, edited, true, |_, _| Ok(1.into()));
            if let Some(line) = trace.record(true, None, || json!({"event":"rust_document_reply"})) {
                write_line(&mut Broken, &line);
            }
            result
        }));
        let reply = reply.unwrap().unwrap();
        assert!(reply.accepted);
        assert_eq!(reply.document.authoring_revision, 1);
        assert_eq!(registry.descriptor(&root.label).unwrap().authoring_revision, 1);
        assert!(trace.record(true, None, || json!({"event":"later"})).is_some());
    }

    #[test]
    fn disabled_trace_never_builds_or_remembers_events() {
        let mut trace = Trace::default();
        assert!(trace.record(false, Some((1,2,3)), || panic!("disabled trace built an event")).is_none());
        assert!(trace.record(true, Some((1,2,3)), || json!({"event":"catalog"})).is_some());
    }

    #[test]
    fn catalog_deduplicates_exact_state_but_records_changes_and_revision() {
        let mut trace = Trace::default();
        let catalog = || json!({"event":"cached_catalog","generation":"2","parameters":[{"value":0.5,"applied":0.0,"revision":1,"applied_revision":0}]});
        assert!(trace.record(true, Some((1,2,3)), catalog).is_some());
        assert!(trace.record(true, Some((1,2,3)), catalog).is_none());
        assert!(trace.record(true, Some((1,2,3)), || json!({"event":"cached_catalog","generation":"2","parameters":[{"value":0.5,"applied":0.0,"revision":2,"applied_revision":0}]})).is_some());
        assert!(trace.record(true, Some((1,2,3)), || json!({"event":"cached_catalog","generation":"2","parameters":[{"value":0.5,"applied":0.5,"revision":1,"applied_revision":1}]})).is_some());
        assert!(trace.record(true, Some((1,3,3)), catalog).is_some());
    }

    #[test]
    fn json_escapes_errors_and_budget_caps_emission() {
        let mut trace = Trace::default();
        let line = trace.record(true, None, || json!({"event":"u1_admission","error":"bad \"x\"\nline"})).unwrap();
        assert_eq!(serde_json::from_str::<Value>(&line).unwrap()["error"], "bad \"x\"\nline");
        let emitted = (0..300).filter(|_| trace.record(true, None, || json!({"event":"doc_ack"})).is_some()).count();
        assert!(emitted > 10 && emitted < 300);
    }

    #[test]
    fn catalog_trace_preserves_all_dto_rows_and_widened_values() {
        let rows: Vec<_> = (0..203).map(|index| super::super::Parameter::from(super::super::NativeParameter {
            descriptor: super::super::NativeDescriptor { index, initialized: 1, min: -10.1, max: 24.1, ..Default::default() },
            requested: if index == 194 { 12.1 } else { -0.1 }, applied: 0.65,
            request_version: 3, applied_version: 2,
        })).collect();
        let catalog = super::super::Parameters { generation: "18446744073709551615".into(), parameters: rows };
        let mut trace = Trace::default();
        let line = trace.record(true, Some((1,10,2)), || json!({"event":"host_cached_catalog","owner":1,"runtime_revision":"10","node":2,"catalog":catalog})).unwrap();
        let parsed: Value = serde_json::from_str(&line).unwrap();
        let rows = parsed["catalog"]["parameters"].as_array().unwrap();
        assert_eq!(rows.len(), 203);
        #[derive(serde::Deserialize)]
        struct Envelope { catalog: Wire }
        #[derive(serde::Deserialize)]
        struct Wire { parameters: Vec<std::collections::BTreeMap<String, Box<serde_json::value::RawValue>>> }
        let wire: Envelope = serde_json::from_str(&line).unwrap();
        let number = |index: usize, field: &str| wire.catalog.parameters[index][field].get().parse::<f64>().unwrap();
        assert_eq!(number(194, "value"), f64::from(12.1_f32));
        assert_eq!(number(0, "value"), f64::from(-0.1_f32));
        assert_eq!(number(0, "applied"), f64::from(0.65_f32));
        assert_eq!(rows[0]["revision"], 3);
        assert_eq!(rows[0]["applied_revision"], 2);
        assert_eq!(parsed["catalog"]["generation"], "18446744073709551615");
        assert!(parsed.get("frame").is_none());
    }

    #[test]
    fn evicted_catalog_context_is_observed_again() {
        let mut trace = Trace::default();
        for node in 0..9 { assert!(trace.record(true, Some((1,2,node)), || json!({"node":node})).is_some()); }
        assert!(trace.record(true, Some((1,2,0)), || json!({"node":0})).is_some());
    }
}
