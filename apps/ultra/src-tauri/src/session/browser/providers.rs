use super::*;
use crate::canvas;
use sha2::{Digest, Sha256};
use std::{collections::BTreeSet, io::Read};

struct Builder {
    limits: Limits,
    entries: Vec<Entry>,
    notices: BTreeSet<String>,
    paths: HashSet<PathBuf>,
    directories: HashSet<PathBuf>,
    visits: usize,
    read_bytes: u64,
}
impl Builder {
    fn notice(&mut self, message: impl Into<String>) {
        self.notices.insert(message.into());
    }
    fn push(&mut self, entry: Entry) {
        if self.entries.len() >= self.limits.entries {
            self.notice("Catalog descriptor limit exhausted; some devices were omitted");
        } else {
            self.entries.push(entry);
        }
    }
    fn full(&mut self) -> bool {
        if self.entries.len() < self.limits.entries {
            return false;
        }
        self.notice("Catalog descriptor limit exhausted; some discovery was omitted");
        true
    }

    fn saved(&mut self, mut entry: Entry, user: bool) {
        let Some(path) = entry.path.as_ref() else {
            self.push(entry);
            return;
        };
        if path.to_str().is_none() {
            entry.path = None;
            entry.reason =
                Some("Saved device path must be UTF-8; this path cannot be loaded".into());
            self.push(entry);
            return;
        }
        let result = self.read_saved(path, user);
        match result {
            Ok((name, kind, profile)) => {
                entry.name = name;
                entry.kind = kind;
                entry.profile = Some(profile);
                entry.qualification = Qualification::Qualified;
                entry.availability = Availability::Ready;
                entry.reason = None;
            }
            Err(reason) => {
                entry.reason = Some(reason);
            }
        }
        self.push(entry);
    }

    fn read_saved(
        &mut self,
        path: &Path,
        user: bool,
    ) -> Result<(String, MusicalKind, String), String> {
        let file = fs::File::open(path).map_err(|e| format!("Cannot read saved device: {e}"))?;
        let metadata = file.metadata().map_err(|e| e.to_string())?;
        if !metadata.is_file() {
            return Err("Saved device is not a regular file".into());
        }
        if metadata.len() > self.limits.file_bytes {
            self.notice("Saved-device per-file read limit exhausted");
            return Err("Saved device exceeds the per-file read limit".into());
        }
        let remaining = if user {
            self.limits.read_bytes.saturating_sub(self.read_bytes)
        } else {
            self.limits.file_bytes
        };
        if metadata.len() > remaining {
            self.notice("User-library aggregate read limit exhausted");
            return Err(
                "User-library aggregate read limit reached before this device could be validated"
                    .into(),
            );
        }
        let mut bytes = Vec::new();
        let read = file
            .take(remaining.min(self.limits.file_bytes))
            .read_to_end(&mut bytes);
        if user {
            self.read_bytes += bytes.len() as u64;
        }
        read.map_err(|e| format!("Cannot read saved device: {e}"))?;
        let patch: serde_json::Value =
            serde_json::from_slice(&bytes).map_err(|e| format!("Invalid saved Ultra JSON: {e}"))?;
        let prepared = canvas::prepare(patch.clone())?;
        if prepared.native.nodes[..prepared.native.node_count as usize]
            .iter()
            .any(|node| matches!(node.kind, 11 | 26 | 27))
        {
            return Err("Alive has not admitted native-source Voice or cross-document send/receive profiles".into());
        }
        let manifest = canvas::device::host_manifest(&patch, &prepared.native)?;
        let kind = match manifest.kind {
            canvas::device::DeviceKind::Instrument => MusicalKind::Instrument,
            canvas::device::DeviceKind::AudioEffect => MusicalKind::AudioEffect,
        };
        Ok((
            manifest.name,
            kind,
            patch["profile"].as_str().unwrap_or_default().to_owned(),
        ))
    }

    fn bundled(&mut self, config: &Config) {
        for (id, name, kind, filename) in [
            (
                "subtractive",
                "Subtractive",
                MusicalKind::Instrument,
                "subtractive.ultra",
            ),
            (
                "utility",
                "Stereo Utility",
                MusicalKind::AudioEffect,
                "utility.ultra",
            ),
            (
                "stereo-lowpass",
                "Stereo Lowpass",
                MusicalKind::AudioEffect,
                "stereo-lowpass.ultra",
            ),
        ] {
            let path = [
                config
                    .resources
                    .join("alive-session/ultra/examples")
                    .join(filename),
                config.source.join("../examples").join(filename),
            ]
            .into_iter()
            .find(|path| path.is_file());
            let (path, reason) = match path {
                Some(path) => match path.canonicalize() {
                    Ok(path) => (Some(path), None),
                    Err(e) => (
                        None,
                        Some(format!("Cannot resolve bundled device {filename}: {e}")),
                    ),
                },
                None => (
                    None,
                    Some(format!("Bundled device is unavailable: {filename}")),
                ),
            };
            if let Some(path) = &path {
                if !self.paths.insert(path.clone()) {
                    continue;
                }
            }
            self.saved(
                Entry {
                    id: format!("bundled:{id}"),
                    provider: Provider::Bundled,
                    name: name.into(),
                    kind,
                    path,
                    profile: None,
                    qualification: Qualification::Unsupported,
                    availability: Availability::Unavailable,
                    reason,
                    description: "Bundled Ultra device".into(),
                    dependencies: Vec::new(),
                },
                false,
            );
        }
    }

    fn user_root(&mut self, root: &Path) {
        match fs::symlink_metadata(root) {
            Ok(metadata) if metadata.file_type().is_symlink() => return,
            Ok(metadata) if metadata.is_dir() => {}
            Ok(_) => {
                self.notice(format!(
                    "User-library root is not a directory: {}",
                    root.display()
                ));
                return;
            }
            Err(e) => {
                self.notice(format!(
                    "User-library root is unavailable: {}: {e}",
                    root.display()
                ));
                return;
            }
        }
        if !real_directory(root) {
            return;
        }
        self.walk(root, 0);
    }

    fn walk(&mut self, directory: &Path, depth: usize) {
        if self.full() {
            return;
        }
        if self.visits >= self.limits.visits {
            self.notice("User-library visited filesystem entry limit exhausted");
            return;
        }
        let Ok(canonical) = directory.canonicalize() else {
            return;
        };
        if !self.directories.insert(canonical) {
            return;
        }
        let children = match fs::read_dir(directory) {
            Ok(children) => children,
            Err(e) => {
                self.notice(format!(
                    "Cannot read user-library directory {}: {e}",
                    directory.display()
                ));
                return;
            }
        };
        // Retain only the remaining visit budget before sorting a directory's entries.
        let mut paths = Vec::new();
        for child in children.take(self.limits.visits - self.visits) {
            self.visits += 1;
            match child {
                Ok(child) => paths.push(child.path()),
                Err(e) => self.notice(format!("Cannot enumerate user-library entry: {e}")),
            }
        }
        if self.visits >= self.limits.visits {
            self.notice("User-library visited filesystem entry limit exhausted");
        }
        paths.sort();
        for path in paths {
            if self.full() {
                break;
            }
            let metadata = match fs::symlink_metadata(&path) {
                Ok(metadata) => metadata,
                Err(e) => {
                    self.notice(format!(
                        "Cannot inspect user-library entry {}: {e}",
                        path.display()
                    ));
                    continue;
                }
            };
            if metadata.is_dir() {
                if depth >= self.limits.depth {
                    self.notice("User-library directory depth limit exhausted");
                } else {
                    self.walk(&path, depth + 1);
                }
                continue;
            }
            // File symlinks can name saved devices; directory symlinks are never traversed.
            if path.extension().and_then(|ext| ext.to_str()) != Some("ultra") || !path.is_file() {
                continue;
            }
            let canonical = match path.canonicalize() {
                Ok(path) => path,
                Err(e) => {
                    self.notice(format!(
                        "Cannot resolve saved device {}: {e}",
                        path.display()
                    ));
                    continue;
                }
            };
            if !self.paths.insert(canonical.clone()) {
                continue;
            }
            self.saved(
                Entry {
                    id: identity("user", &canonical),
                    provider: Provider::User,
                    name: path
                        .file_stem()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .chars()
                        .take(64)
                        .collect(),
                    kind: MusicalKind::Instrument,
                    path: Some(canonical),
                    profile: None,
                    qualification: Qualification::Unsupported,
                    availability: Availability::Unavailable,
                    reason: None,
                    description: "Saved Ultra device from your library".into(),
                    dependencies: Vec::new(),
                },
                true,
            );
        }
    }

    fn live(&mut self, config: &Config) {
        let mut roots = config.live_resources.clone();
        let mut parents = Vec::new();
        for root in &config.live_roots {
            roots.extend([root.clone(), root.join("Resources")]);
            parents.extend([root.clone(), root.join("drive_c/ProgramData/Ableton")]);
        }
        let mut visited = HashSet::new();
        let mut root_visits = 0;
        for parent in parents {
            if !real_directory(&parent) {
                continue;
            }
            let Ok(canonical) = parent.canonicalize() else {
                continue;
            };
            if !visited.insert(canonical) {
                continue;
            }
            let Ok(children) = fs::read_dir(parent) else {
                continue;
            };
            for child in children {
                if root_visits >= self.limits.visits {
                    self.notice("Live installation root discovery limit exhausted");
                    break;
                }
                root_visits += 1;
                let Ok(child) = child else {
                    continue;
                };
                if child.file_name().to_string_lossy().starts_with("Live ")
                    && real_directory(&child.path())
                {
                    roots.push(child.path().join("Resources"));
                }
            }
        }
        let mut seen = HashSet::new();
        for root in roots {
            if !real_directory(&root) {
                continue;
            }
            let Ok(root) = root.canonicalize() else {
                continue;
            };
            if !seen.insert(root.clone()) {
                continue;
            }
            for (name, kind, relative, max) in candidates() {
                if self.full() {
                    return;
                }
                let path = root.join(relative);
                if !path.parent().is_some_and(real_directory) {
                    continue;
                }
                // Inspect known artifacts only; no library/resource payload is opened.
                let Ok(metadata) = fs::metadata(&path) else {
                    continue;
                };
                if !metadata.is_file() {
                    continue;
                }
                let Ok(path) = path.canonicalize() else {
                    continue;
                };
                if !self.paths.insert(path.clone()) {
                    continue;
                }
                let reason = if metadata.len() == 0 {
                    "Installed artifact is empty; no qualified saved-device profile is available"
                } else if max {
                    "Installed Max external candidate; its compatibility adapter and saved-device profile are not admitted in Alive"
                } else if name == "Analog" {
                    "Installed Analog candidate; Alive native-source ownership and transport admission are pending"
                } else {
                    "Installed DLL candidate; its native-source profile and Alive integration are not admitted"
                };
                self.push(Entry {
                    id: identity("live", &path),
                    provider: Provider::Live,
                    name: name.into(),
                    kind,
                    path: None,
                    profile: None,
                    qualification: Qualification::Candidate,
                    availability: Availability::Unavailable,
                    reason: Some(reason.into()),
                    description:
                        "Installed Live implementation candidate; requires a saved Ultra device"
                            .into(),
                    dependencies: vec![Dependency {
                        kind: if max { "maxExternal" } else { "nativeLibrary" }.into(),
                        identity: path.to_string_lossy().into_owned(),
                        available: true,
                    }],
                });
            }
        }
    }
}

fn real_directory(path: &Path) -> bool {
    path.ancestors()
        .filter(|ancestor| !ancestor.as_os_str().is_empty())
        .all(|ancestor| {
            fs::symlink_metadata(ancestor)
                .is_ok_and(|metadata| metadata.is_dir() && !metadata.file_type().is_symlink())
        })
}
fn identity(provider: &str, path: &Path) -> String {
    // Canonical path bytes preserve distinct non-UTF8 paths on Unix as well.
    format!(
        "{provider}:{:x}",
        Sha256::digest(path.as_os_str().as_encoded_bytes())
    )
}

fn candidates() -> Vec<(&'static str, MusicalKind, String, bool)> {
    let mut result = [
        ("Amp", MusicalKind::AudioEffect),
        ("Analog", MusicalKind::Instrument),
        ("Cabinet", MusicalKind::AudioEffect),
        ("Collision", MusicalKind::Instrument),
        ("Corpus", MusicalKind::AudioEffect),
        ("Electric", MusicalKind::Instrument),
        ("Tension", MusicalKind::Instrument),
    ]
    .into_iter()
    .map(|(name, kind)| (name, kind, format!("Devices/Pc/{name}_64.dll"), false))
    .collect::<Vec<_>>();
    result.extend(
        [
            ("Auto Filter", "autofilter", MusicalKind::AudioEffect),
            ("Channel EQ", "channeleq", MusicalKind::AudioEffect),
            ("Compressor", "compressor", MusicalKind::AudioEffect),
            ("Delay", "delay", MusicalKind::AudioEffect),
            ("Drift", "drift", MusicalKind::Instrument),
            ("Drum Buss", "drumbuss", MusicalKind::AudioEffect),
            ("Drum Sampler", "drumsampler", MusicalKind::Instrument),
            ("Echo", "echo", MusicalKind::AudioEffect),
            ("Limiter", "limiter", MusicalKind::AudioEffect),
            ("Redux", "redux", MusicalKind::AudioEffect),
            ("Reverb", "reverb", MusicalKind::AudioEffect),
            ("Roar", "roar", MusicalKind::AudioEffect),
            (
                "Spectral Resonator",
                "spectralresonator",
                MusicalKind::AudioEffect,
            ),
            ("Spectral Time", "spectraltime", MusicalKind::AudioEffect),
            ("Utility", "utility", MusicalKind::AudioEffect),
        ]
        .into_iter()
        .map(|(name, slug, kind)| {
            (
                name,
                kind,
                format!("Max/resources/packages/ableton-dsp/externals/abl.device.{slug}~.mxe64"),
                true,
            )
        }),
    );
    result
}

pub(super) fn discover(config: &Config, limits: Limits) -> Result<Discovery, String> {
    let mut builder = Builder {
        limits,
        entries: Vec::new(),
        notices: BTreeSet::new(),
        paths: HashSet::new(),
        directories: HashSet::new(),
        visits: 0,
        read_bytes: 0,
    };
    builder.bundled(config);
    for root in &config.user_roots {
        builder.user_root(root);
    }
    builder.live(config);
    builder.entries.sort_by(|a, b| {
        let rank = |provider| match provider {
            Provider::Bundled => 0,
            Provider::User => 1,
            Provider::Live => 2,
        };
        rank(a.provider)
            .cmp(&rank(b.provider))
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
            .then_with(|| a.id.cmp(&b.id))
    });
    Ok(Discovery {
        entries: builder.entries,
        notices: builder.notices.into_iter().collect(),
    })
}
