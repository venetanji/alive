//! Bounded metadata discovery, independent of session, audio and native ownership.
use serde::{Deserialize, Serialize};
use std::{
    collections::HashSet,
    ffi::OsString,
    fs,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
};

mod providers;
use providers::discover;

const PAGE_SIZE: usize = 64;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Provider {
    Bundled,
    User,
    Live,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum MusicalKind {
    Instrument,
    AudioEffect,
    #[allow(dead_code)]
    MidiEffect,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Qualification {
    Qualified,
    Candidate,
    Unsupported,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Availability {
    Ready,
    Unavailable,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Dependency {
    pub kind: String,
    pub identity: String,
    pub available: bool,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    pub id: String,
    pub provider: Provider,
    pub name: String,
    pub kind: MusicalKind,
    pub path: Option<PathBuf>,
    pub profile: Option<String>,
    pub qualification: Qualification,
    pub availability: Availability,
    pub reason: Option<String>,
    pub description: String,
    pub dependencies: Vec<Dependency>,
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Cursor {
    pub revision: String,
    pub offset: usize,
}
#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Request {
    pub refresh: bool,
    pub cursor: Option<Cursor>,
}
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Page {
    pub revision: String,
    pub entries: Vec<Entry>,
    pub next_cursor: Option<Cursor>,
    pub notices: Vec<String>,
}

struct Discovery {
    entries: Vec<Entry>,
    notices: Vec<String>,
}
struct Index {
    revision: u64,
    discovery: Discovery,
}
impl Index {
    fn page(&self, cursor: Option<&Cursor>) -> Result<Page, String> {
        let revision = self.revision.to_string();
        let offset = match cursor {
            None => 0,
            Some(cursor) => {
                if cursor
                    .revision
                    .parse::<u64>()
                    .ok()
                    .filter(|&value| value > 0)
                    .map(|value| value.to_string())
                    .as_deref()
                    != Some(cursor.revision.as_str())
                {
                    return Err("Malformed catalog cursor revision".into());
                }
                if cursor.revision != revision {
                    return Err("Catalog cursor is stale; refresh the catalog".into());
                }
                if cursor.offset == 0
                    || cursor.offset % PAGE_SIZE != 0
                    || cursor.offset >= self.discovery.entries.len()
                {
                    return Err("Malformed or out-of-range catalog cursor".into());
                }
                cursor.offset
            }
        };
        let end = (offset + PAGE_SIZE).min(self.discovery.entries.len());
        Ok(Page {
            revision: revision.clone(),
            entries: self.discovery.entries[offset..end].to_vec(),
            next_cursor: (end < self.discovery.entries.len()).then_some(Cursor {
                revision,
                offset: end,
            }),
            notices: self.discovery.notices.clone(),
        })
    }
}

/// Readers clone the completed index; a rebuild never holds the index lock.
#[derive(Default)]
pub struct CatalogCache {
    current: Mutex<Option<Arc<Index>>>,
    rebuild: Mutex<()>,
}
impl CatalogCache {
    pub fn page(&self, request: Request, config: &Config) -> Result<Page, String> {
        self.request(request, || discover(config, Limits::default()))
    }

    fn request(
        &self,
        request: Request,
        build: impl FnOnce() -> Result<Discovery, String>,
    ) -> Result<Page, String> {
        if request.refresh && request.cursor.is_some() {
            return Err("A catalog refresh cannot continue a cursor".into());
        }
        let snapshot = || {
            self.current
                .lock()
                .map(|guard| guard.clone())
                .map_err(|_| "Catalog cache is unavailable".to_owned())
        };
        if !request.refresh {
            if let Some(index) = snapshot()? {
                return index.page(request.cursor.as_ref());
            }
            if request.cursor.is_some() {
                return Err("Catalog cursor has no current index".into());
            }
        }
        let _rebuild = self
            .rebuild
            .lock()
            .map_err(|_| "Catalog refresh is unavailable")?;
        let previous = snapshot()?;
        if !request.refresh {
            if let Some(index) = previous {
                return index.page(None);
            }
        }
        let revision = previous
            .map_or(Some(1), |index| index.revision.checked_add(1))
            .ok_or("Catalog revision exhausted")?;
        let index = Arc::new(Index {
            revision,
            discovery: build()?,
        });
        let page = index.page(None)?;
        *self
            .current
            .lock()
            .map_err(|_| "Catalog cache is unavailable")? = Some(index);
        Ok(page)
    }
}

pub struct Config {
    resources: PathBuf,
    source: PathBuf,
    user_roots: Vec<PathBuf>,
    live_roots: Vec<PathBuf>,
    live_resources: Vec<PathBuf>,
}
impl Config {
    pub fn environment(resources: PathBuf, source: PathBuf) -> Self {
        Self::from_environment(resources, source, |key| std::env::var_os(key))
    }

    fn from_environment(
        resources: PathBuf,
        source: PathBuf,
        get: impl Fn(&str) -> Option<OsString>,
    ) -> Self {
        let home = get("HOME")
            .filter(|value| !value.is_empty())
            .map(PathBuf::from);
        let mut user_roots = Vec::new();
        if let Some(data) = get("XDG_DATA_HOME")
            .filter(|value| !value.is_empty())
            .map(PathBuf::from)
            .filter(|path| path.is_absolute())
            .or_else(|| home.as_ref().map(|home| home.join(".local/share")))
        {
            user_roots.push(data.join("alive/devices"));
        }
        user_roots.extend(
            get("ALIVE_DEVICE_LIBRARY_PATHS")
                .into_iter()
                .flat_map(|value| {
                    std::env::split_paths(&value)
                        .filter(|path| !path.as_os_str().is_empty())
                        .collect::<Vec<_>>()
                }),
        );
        let mut live_roots: Vec<_> = get("ALIVE_LIVE_ROOTS")
            .into_iter()
            .flat_map(|value| {
                std::env::split_paths(&value)
                    .filter(|path| !path.as_os_str().is_empty())
                    .collect::<Vec<_>>()
            })
            .collect();
        if let Some(home) = home {
            live_roots.extend([home.join(".wine"), home.join(".wine-ableton")]);
        }
        if let Some(prefix) = get("WINEPREFIX").filter(|value| !value.is_empty()) {
            live_roots.push(prefix.into());
        }
        let live_resources = get("ULTRA_LIVE_RESOURCES")
            .filter(|value| !value.is_empty())
            .map(PathBuf::from)
            .into_iter()
            .collect();
        Self {
            resources,
            source,
            user_roots,
            live_roots,
            live_resources,
        }
    }
}

#[derive(Clone, Copy)]
struct Limits {
    entries: usize,
    visits: usize,
    depth: usize,
    read_bytes: u64,
    file_bytes: u64,
}
impl Default for Limits {
    fn default() -> Self {
        Self {
            entries: 1024,
            visits: 4096,
            depth: 8,
            read_bytes: 16 * 1024 * 1024,
            file_bytes: 2 * 1024 * 1024,
        }
    }
}

#[cfg(test)]
mod tests;
