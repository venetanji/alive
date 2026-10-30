//! Prospective workspace data, deliberately outside the active Document.
//! Validation proves the saved model only: parameter bindings/ranges, graph
//! eligibility, file contents, PCM ownership and runtime admission need preparation.
use super::{clips::ClipNote, DeviceInstance, Document, Lane};
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::collections::{BTreeMap, BTreeSet, HashSet};

const MAX_BYTES: usize = 1024 * 1024;
const MIN_BEATS: f64 = 1. / 64.;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct DecimalU64(pub u64);
impl Serialize for DecimalU64 {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.0.to_string())
    }
}
impl<'de> Deserialize<'de> for DecimalU64 {
    fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        let s = String::deserialize(d)?;
        if s.is_empty()
            || !s.bytes().all(|b| b.is_ascii_digit())
            || (s.len() > 1 && s.starts_with('0'))
        {
            return Err(serde::de::Error::custom(
                "Expected canonical unsigned decimal string",
            ));
        }
        s.parse().map(Self).map_err(serde::de::Error::custom)
    }
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProjectV4 {
    pub format: String,
    pub title: String,
    pub tempo: f64,
    pub length_beats: f64,
    pub loop_enabled: bool,
    pub loop_start_beats: f64,
    pub loop_end_beats: f64,
    pub tracks: Vec<TrackV4>,
    pub sources: Vec<SourceV4>,
    pub placements: Vec<PlacementV4>,
}
#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TrackV4 {
    pub id: String,
    pub name: String,
    pub color: String,
    pub chain: ChainV4,
    pub effects: Vec<DeviceInstance>,
    pub slots: [Option<SlotV4>; 4],
    pub gain: f64,
    pub mute: bool,
    pub solo: bool,
}
#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum ChainV4 {
    Midi { instrument: Option<DeviceInstance> },
    Audio {},
}
#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum SourceV4 {
    Midi {
        id: String,
        track_id: String,
        name: String,
        length_beats: f64,
        notes: Vec<ClipNote>,
        automation: Vec<Lane>,
    },
    Audio {
        id: String,
        track_id: String,
        name: String,
        file: AudioFileV4,
        source_tempo: f64,
        warp_mode: String,
        automation: Vec<Lane>,
    },
}
#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AudioFileV4 {
    pub path: String,
    pub source_sha256: String,
    pub encoding: String,
    pub channels: u32,
    pub sample_rate: u32,
    pub bits_per_sample: u32,
    pub frames: DecimalU64,
}
#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ClipRegionV4 {
    pub start: f64,
    pub end: f64,
    pub loop_start: f64,
    pub loop_end: f64,
    pub loop_enabled: bool,
}
impl ClipRegionV4 {
    pub fn full(length: f64) -> Self {
        Self {
            start: 0.,
            end: length,
            loop_start: 0.,
            loop_end: length,
            loop_enabled: true,
        }
    }
}
#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SlotV4 {
    pub id: String,
    pub name: String,
    pub source_id: String,
    pub region: ClipRegionV4,
}
#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PlacementV4 {
    pub id: String,
    pub track_id: String,
    pub source_id: String,
    pub start: f64,
    pub duration: f64,
    pub region: ClipRegionV4,
}
#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum OccurrenceV4 {
    Slot { track_id: String, slot_id: String },
    Placement { placement_id: String },
}
#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum WorkspaceEditV4 {
    MidiClipCreate {
        track_id: String,
        slot: u32,
        name: String,
    },
    MidiPlacementCreate {
        track_id: String,
        start: f64,
        duration: f64,
        name: String,
    },
    AudioClipImport {
        track_id: String,
        slot: u32,
        name: String,
        file: AudioFileV4,
        source_tempo: f64,
        warp_mode: String,
    },
    RegionSet {
        occurrence: OccurrenceV4,
        region: ClipRegionV4,
    },
    SourceCreateMidi {
        track_id: String,
        name: String,
        length_beats: f64,
    },
    SourceRename {
        source_id: String,
        name: String,
    },
    SourceDelete {
        source_id: String,
    },
    SourceLength {
        source_id: String,
        length_beats: f64,
    },
    SourceIndependent {
        occurrence: OccurrenceV4,
    },
    NoteCreate {
        source_id: String,
        beat: f64,
        duration: f64,
        pitch: u32,
        velocity: u32,
    },
    NoteUpdate {
        source_id: String,
        note_id: String,
        beat: f64,
        duration: f64,
        pitch: u32,
        velocity: u32,
    },
    NoteDelete {
        source_id: String,
        note_id: String,
    },
    AutomationSet {
        source_id: String,
        lanes: Vec<Lane>,
    },
    /// Assign an empty cell with a fresh slot ID; delete an occupied slot first.
    SlotAssign {
        track_id: String,
        slot: u32,
        source_id: String,
        name: String,
        region: ClipRegionV4,
    },
    SlotUpdate {
        track_id: String,
        slot_id: String,
        name: String,
        region: ClipRegionV4,
    },
    SlotDuplicate {
        track_id: String,
        slot_id: String,
        destination_slot: u32,
    },
    SlotDelete {
        track_id: String,
        slot_id: String,
    },
    PlacementCreate {
        track_id: String,
        source_id: String,
        start: f64,
        duration: f64,
        region: ClipRegionV4,
    },
    PlacementUpdate {
        placement_id: String,
        start: f64,
        duration: f64,
        region: ClipRegionV4,
    },
    PlacementDuplicate {
        placement_id: String,
        start: f64,
    },
    PlacementDelete {
        placement_id: String,
    },
    TransportRange {
        tempo: f64,
        length_beats: f64,
        loop_enabled: bool,
        loop_start_beats: f64,
        loop_end_beats: f64,
    },
    TrackPresentation {
        track_id: String,
        name: String,
        color: String,
    },
}
#[derive(Clone, Debug, PartialEq)]
pub struct EditResultV4 {
    pub project: ProjectV4,
    pub affected_ids: Vec<String>,
}

#[derive(Default)]
struct TrackCounts {
    sources: usize,
    notes: usize,
    lanes: usize,
    points: usize,
    placements: usize,
}

pub fn decode(text: &str) -> Result<ProjectV4, String> {
    let project: ProjectV4 = strict_decode(text)?;
    project.validate()?;
    Ok(project)
}
pub fn encode(project: &ProjectV4) -> Result<String, String> {
    project.validate()?;
    let text = serde_json::to_string_pretty(project).map_err(|e| e.to_string())?;
    check_size(text.len())?;
    Ok(text)
}
pub fn decode_edit(text: &str) -> Result<WorkspaceEditV4, String> {
    strict_decode(text)
}

/// The operation order is shared with the prospective native v4 contract.
pub fn frame_at(beat: f64, tempo: f64) -> Result<u64, String> {
    super::prepare::bounded(tempo, 30., 240., "Tempo")?;
    let frame = (beat * 48000.0 * 60.0 / tempo).round();
    if !beat.is_finite()
        || beat < 0.
        || !frame.is_finite()
        || !(0. ..18446744073709551616.0).contains(&frame)
    {
        return Err("Beat cannot be represented as an unsigned audio frame".into());
    }
    Ok(frame as u64)
}
fn check_size(size: usize) -> Result<(), String> {
    if size > MAX_BYTES {
        Err("Workspace exceeds the 1 MiB limit".into())
    } else {
        Ok(())
    }
}
fn strict_decode<T: serde::de::DeserializeOwned>(text: &str) -> Result<T, String> {
    check_size(text.len())?;
    // Inspect the original text before typed enum dispatch or parameter map decoding.
    struct Unique;
    impl<'de> Deserialize<'de> for Unique {
        fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
            struct Visitor;
            impl<'de> serde::de::Visitor<'de> for Visitor {
                type Value = Unique;
                fn expecting(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
                    f.write_str("JSON without duplicate members")
                }
                fn visit_map<M: serde::de::MapAccess<'de>>(
                    self,
                    mut map: M,
                ) -> Result<Unique, M::Error> {
                    let mut keys = HashSet::new();
                    while let Some(key) = map.next_key::<String>()? {
                        if !keys.insert(key) {
                            return Err(serde::de::Error::custom("Duplicate JSON member"));
                        }
                        map.next_value::<Unique>()?;
                    }
                    Ok(Unique)
                }
                fn visit_seq<A: serde::de::SeqAccess<'de>>(
                    self,
                    mut seq: A,
                ) -> Result<Unique, A::Error> {
                    while seq.next_element::<Unique>()?.is_some() {}
                    Ok(Unique)
                }
                fn visit_str<E: serde::de::Error>(self, _: &str) -> Result<Unique, E> {
                    Ok(Unique)
                }
                fn visit_bool<E: serde::de::Error>(self, _: bool) -> Result<Unique, E> {
                    Ok(Unique)
                }
                fn visit_i64<E: serde::de::Error>(self, _: i64) -> Result<Unique, E> {
                    Ok(Unique)
                }
                fn visit_u64<E: serde::de::Error>(self, _: u64) -> Result<Unique, E> {
                    Ok(Unique)
                }
                fn visit_f64<E: serde::de::Error>(self, _: f64) -> Result<Unique, E> {
                    Ok(Unique)
                }
                fn visit_unit<E: serde::de::Error>(self) -> Result<Unique, E> {
                    Ok(Unique)
                }
            }
            d.deserialize_any(Visitor)
        }
    }
    serde_json::from_str::<Unique>(text).map_err(|e| format!("Invalid workspace JSON: {e}"))?;
    serde_json::from_str(text).map_err(|e| format!("Invalid workspace JSON: {e}"))
}

impl TrackV4 {
    pub fn instrument(&self) -> Option<&DeviceInstance> {
        match &self.chain {
            ChainV4::Midi { instrument } => instrument.as_ref(),
            ChainV4::Audio {} => None,
        }
    }
    pub fn devices(&self) -> impl Iterator<Item = &DeviceInstance> {
        self.instrument().into_iter().chain(&self.effects)
    }
}
impl SourceV4 {
    pub fn id(&self) -> &str {
        match self {
            Self::Midi { id, .. } | Self::Audio { id, .. } => id,
        }
    }
    pub fn track_id(&self) -> &str {
        match self {
            Self::Midi { track_id, .. } | Self::Audio { track_id, .. } => track_id,
        }
    }
    pub fn automation(&self) -> &[Lane] {
        match self {
            Self::Midi { automation, .. } | Self::Audio { automation, .. } => automation,
        }
    }
    pub fn length_beats(&self) -> f64 {
        match self {
            Self::Midi { length_beats, .. } => *length_beats,
            Self::Audio {
                file, source_tempo, ..
            } => file.frames.0 as f64 / f64::from(file.sample_rate) * *source_tempo / 60.,
        }
    }
    pub fn length_frames(&self, tempo: f64) -> Result<u64, String> {
        frame_at(self.length_beats(), tempo)
    }
}

impl ProjectV4 {
    pub fn validate(&self) -> Result<(), String> {
        use super::prepare::{bounded, text};
        if self.format != "alive-session-v4" {
            return Err("Expected alive-session-v4".into());
        }
        text(&self.title, 128, "Project title")?;
        bounded(self.tempo, 30., 240., "Tempo")?;
        bounded(self.length_beats, MIN_BEATS, 256., "Song length")?;
        bounded(self.loop_start_beats, 0., self.length_beats, "Loop start")?;
        bounded(self.loop_end_beats, 0., self.length_beats, "Loop end")?;
        let song_end = frame_at(self.length_beats, self.tempo)?;
        let min_period = frame_at(MIN_BEATS, self.tempo)?;
        if self.loop_start_beats >= self.loop_end_beats
            || frame_at(self.loop_end_beats, self.tempo)?
                .checked_sub(frame_at(self.loop_start_beats, self.tempo)?)
                .is_none_or(|p| p < min_period)
        {
            return Err(
                "Loop brace must contain an ordered minimum 1/64-beat period within the song"
                    .into(),
            );
        }
        if self.tracks.is_empty() || self.tracks.len() > 8 {
            return Err("Workspace requires one to eight tracks".into());
        }
        if self.sources.len() > 32 || self.placements.len() > 64 {
            return Err("Workspace exceeds 32 sources or 64 placements".into());
        }
        if self
            .tracks
            .iter()
            .map(|t| t.devices().count())
            .sum::<usize>()
            > 6
        {
            return Err("Workspace exceeds six device roots".into());
        }
        let mut ids = HashSet::new();
        let mut counts = BTreeMap::<&str, TrackCounts>::new();
        for track in &self.tracks {
            unique(&mut ids, &track.id)?;
            text(&track.name, 64, "Track name")?;
            color(&track.color)?;
            bounded(track.gain, 0., 2., "Track gain")?;
            if track.effects.len() > 2 {
                return Err(format!("Track '{}' exceeds two effects", track.id));
            }
            for device in track.devices() {
                unique(&mut ids, &device.instance_id)?;
                text(&device.path, 4096, "Device path")?;
                super::prepare::token(&device.id, "Device ID")?;
                fingerprint(&device.source_sha256)?;
                if !matches!(device.version, 1 | 2) {
                    return Err(format!(
                        "Unsupported manifest version on '{}'",
                        device.instance_id
                    ));
                }
                for (key, value) in &device.parameters {
                    super::prepare::token(key, "Parameter key")?;
                    if !value.is_finite() {
                        return Err(format!("Nonfinite parameter on '{}'", device.instance_id));
                    }
                }
            }
            if matches!(&track.chain, ChainV4::Midi { instrument: Some(instrument) } if instrument.bypassed)
            {
                return Err(format!(
                    "Track '{}' instrument cannot be bypassed",
                    track.id
                ));
            }
            for slot in track.slots.iter().flatten() {
                unique(&mut ids, &slot.id)?;
                text(&slot.name, 64, "Slot name")?;
            }
            counts.insert(&track.id, TrackCounts::default());
        }
        let mut events = 0usize;
        for source in &self.sources {
            let context = |e| format!("Source '{}': {e}", source.id());
            unique(&mut ids, source.id())?;
            let track = self.track(source.track_id()).map_err(context)?;
            let count = counts
                .get_mut(source.track_id())
                .ok_or("Missing source track")?;
            count.sources = checked_add(count.sources, 1)?;
            let length = source.length_frames(self.tempo).map_err(context)?;
            match source {
                SourceV4::Midi {
                    name,
                    length_beats,
                    notes,
                    ..
                } => {
                    if !matches!(track.chain, ChainV4::Midi { .. }) {
                        return Err(context("MIDI source requires its MIDI track".into()));
                    }
                    text(name, 64, "Source name").map_err(context)?;
                    bounded(*length_beats, MIN_BEATS, 256., "MIDI source length")
                        .map_err(context)?;
                    count.notes = checked_add(count.notes, notes.len())?;
                    let mut intervals = Vec::new();
                    let mut edges = Vec::new();
                    for note in notes {
                        unique(&mut ids, &note.id)?;
                        let note_context = |e| context(format!("Note '{}': {e}", note.id));
                        bounded(note.beat, 0., *length_beats, "Note beat").map_err(note_context)?;
                        bounded(
                            note.duration,
                            f64::MIN_POSITIVE,
                            *length_beats,
                            "Note duration",
                        )
                        .map_err(note_context)?;
                        let end_beat = sum(note.beat, note.duration).map_err(note_context)?;
                        if end_beat > *length_beats
                            || note.pitch > 127
                            || !(1..=127).contains(&note.velocity)
                        {
                            return Err(note_context(
                                "Pitch, velocity or note end exceeds bounds".into(),
                            ));
                        }
                        let start = frame_at(note.beat, self.tempo)?;
                        let end = frame_at(end_beat, self.tempo)?;
                        if start >= end || end > length {
                            return Err(note_context(
                                "Note must occupy at least one source frame".into(),
                            ));
                        }
                        if intervals
                            .iter()
                            .any(|&(pitch, a, b)| pitch == note.pitch && start < b && end > a)
                        {
                            return Err(note_context("Same-pitch notes overlap".into()));
                        }
                        intervals.push((note.pitch, start, end));
                        edges.push((start, 1i32));
                        edges.push((end, -1i32));
                        if matches!(
                            track.chain,
                            ChainV4::Midi {
                                instrument: Some(_)
                            }
                        ) {
                            events = checked_add(events, if end < length { 2 } else { 1 })?;
                        }
                    }
                    edges.sort_unstable();
                    let mut held = 0;
                    for (_, change) in edges {
                        held += change;
                        if held > 4 {
                            return Err(context(
                                "At most four simultaneously held notes per source".into(),
                            ));
                        }
                    }
                }
                SourceV4::Audio {
                    name,
                    file,
                    source_tempo,
                    warp_mode,
                    ..
                } => {
                    if !matches!(track.chain, ChainV4::Audio {}) {
                        return Err(context("Audio source requires its audio track".into()));
                    }
                    text(name, 64, "Source name").map_err(context)?;
                    text(&file.path, 4096, "Audio path").map_err(context)?;
                    fingerprint(&file.source_sha256).map_err(context)?;
                    bounded(*source_tempo, 30., 240., "Audio source tempo").map_err(context)?;
                    if warp_mode != "repitch" {
                        return Err(context("Only explicit Re-Pitch Warp is supported".into()));
                    }
                    super::wav::validate_descriptor(file).map_err(context)?;
                    if length == 0 {
                        return Err(context(
                            "Audio source must occupy at least one output frame".into(),
                        ));
                    }
                }
            }
            count.lanes = checked_add(count.lanes, source.automation().len())?;
            let mut targets = HashSet::new();
            for lane in source.automation() {
                track
                    .devices()
                    .find(|d| d.instance_id == lane.instance_id)
                    .ok_or_else(|| {
                        context(format!(
                            "Missing or cross-track automation instance '{}'",
                            lane.instance_id
                        ))
                    })?;
                super::prepare::token(&lane.key, "Automation key").map_err(context)?;
                if !targets.insert((&lane.instance_id, &lane.key)) {
                    return Err(context("Duplicate automation lane".into()));
                }
                count.points = checked_add(count.points, lane.points.len())?;
                let mut previous = None;
                for point in &lane.points {
                    let at = frame_at(point.beat, self.tempo).map_err(context)?;
                    if at >= length
                        || previous.is_some_and(|last| at <= last)
                        || !point.value.is_finite()
                    {
                        return Err(context("Automation needs finite values and strictly increasing frames before source end".into()));
                    }
                    previous = Some(at);
                }
                if lane.enabled {
                    events = checked_add(events, lane.points.len())?;
                }
            }
            if count.sources > 4 || count.notes > 128 || count.lanes > 16 || count.points > 256 {
                return Err(context(format!("Track '{}' exceeds aggregate 4 sources, 128 notes, 16 lanes or 256 points, including disabled lanes", track.id)));
            }
        }
        if events > 1024 {
            return Err("Workspace source pool exceeds 1024 events".into());
        }
        for track in &self.tracks {
            for slot in track.slots.iter().flatten() {
                self.region_length(&track.id, &slot.source_id, &slot.region)
                    .map_err(|e| format!("Slot '{}' source '{}': {e}", slot.id, slot.source_id))?;
            }
        }
        let mut ranges: BTreeMap<&str, Vec<(&PlacementV4, u64, u64)>> = BTreeMap::new();
        for placement in &self.placements {
            unique(&mut ids, &placement.id)?;
            let context = |e| {
                format!(
                    "Placement '{}' source '{}': {e}",
                    placement.id, placement.source_id
                )
            };
            self.track(&placement.track_id).map_err(context)?;
            let count = counts
                .get_mut(placement.track_id.as_str())
                .ok_or("Missing placement track")?;
            count.placements = checked_add(count.placements, 1)?;
            if count.placements > 8 {
                return Err(context("Track exceeds eight placements".into()));
            }
            bounded(placement.start, 0., self.length_beats, "Placement start").map_err(context)?;
            bounded(
                placement.duration,
                f64::MIN_POSITIVE,
                self.length_beats,
                "Placement duration",
            )
            .map_err(context)?;
            let end_beat = sum(placement.start, placement.duration).map_err(context)?;
            let start = frame_at(placement.start, self.tempo).map_err(context)?;
            let end = frame_at(end_beat, self.tempo).map_err(context)?;
            if end_beat > self.length_beats || end > song_end || end <= start {
                return Err(context(
                    "Placement needs at least one frame and song containment".into(),
                ));
            }
            let period = self
                .region_length(&placement.track_id, &placement.source_id, &placement.region)
                .map_err(context)?;
            if !placement.region.loop_enabled && end - start > period {
                return Err(context(
                    "Nonlooping placement exceeds remaining source suffix".into(),
                ));
            }
            let track_ranges = ranges.entry(&placement.track_id).or_default();
            for (other, a, b) in track_ranges.iter() {
                if (placement.start < other.start + other.duration && end_beat > other.start)
                    || (start < *b && end > *a)
                {
                    return Err(context(format!(
                        "Overlap with placement '{}' in beats or compiled frames",
                        other.id
                    )));
                }
            }
            track_ranges.push((placement, start, end));
        }
        check_size(serde_json::to_vec(self).map_err(|e| e.to_string())?.len())
    }
    pub fn identities(&self) -> HashSet<String> {
        let mut ids = HashSet::new();
        for track in &self.tracks {
            ids.insert(track.id.clone());
            ids.extend(track.devices().map(|d| d.instance_id.clone()));
            ids.extend(track.slots.iter().flatten().map(|s| s.id.clone()));
        }
        for source in &self.sources {
            ids.insert(source.id().to_owned());
            if let SourceV4::Midi { notes, .. } = source {
                ids.extend(notes.iter().map(|n| n.id.clone()));
            }
        }
        ids.extend(self.placements.iter().map(|p| p.id.clone()));
        ids
    }
    pub fn reference_ids(&self, source_id: &str) -> Vec<String> {
        let mut ids: Vec<_> = self
            .tracks
            .iter()
            .flat_map(|t| t.slots.iter().flatten())
            .filter(|s| s.source_id == source_id)
            .map(|s| s.id.clone())
            .chain(
                self.placements
                    .iter()
                    .filter(|p| p.source_id == source_id)
                    .map(|p| p.id.clone()),
            )
            .collect();
        ids.sort();
        ids
    }
    fn track(&self, id: &str) -> Result<&TrackV4, String> {
        self.tracks
            .iter()
            .find(|t| t.id == id)
            .ok_or_else(|| format!("Unknown track '{id}'"))
    }
    fn source(&self, id: &str) -> Result<&SourceV4, String> {
        self.sources
            .iter()
            .find(|s| s.id() == id)
            .ok_or_else(|| format!("Unknown source '{id}'"))
    }
    fn region_length(
        &self,
        track_id: &str,
        source_id: &str,
        region: &ClipRegionV4,
    ) -> Result<u64, String> {
        let source = self.source(source_id)?;
        if source.track_id() != track_id {
            return Err("Cross-track source reference".into());
        }
        let length = source.length_beats();
        for (value, label) in [
            (region.start, "Clip start"),
            (region.end, "Clip end"),
            (region.loop_start, "Clip loop start"),
            (region.loop_end, "Clip loop end"),
        ] {
            super::prepare::bounded(value, 0., length, label)?;
        }
        let start = frame_at(region.start, self.tempo)?;
        let end = frame_at(region.end, self.tempo)?;
        let loop_start = frame_at(region.loop_start, self.tempo)?;
        let loop_end = frame_at(region.loop_end, self.tempo)?;
        if region.start >= region.end
            || start >= end
            || region.loop_start >= region.loop_end
            || loop_start >= loop_end
        {
            return Err(
                "Clip markers and loop markers must have ordered, distinct output frames".into(),
            );
        }
        if region.loop_enabled
            && (region.start >= region.loop_end
                || loop_end - loop_start < frame_at(MIN_BEATS, self.tempo)?)
        {
            return Err("Loop must follow the clip start and contain at least 1/64 beat".into());
        }
        Ok(end - start)
    }
}
fn unique(ids: &mut HashSet<String>, id: &str) -> Result<(), String> {
    super::prepare::token(id, "Workspace identity")?;
    if !ids.insert(id.to_owned()) {
        Err(format!("Duplicate workspace identity '{id}'"))
    } else {
        Ok(())
    }
}
fn fingerprint(value: &str) -> Result<(), String> {
    if value.len() == 64
        && value
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
    {
        Ok(())
    } else {
        Err("sourceSha256 requires 64 lowercase hexadecimal bytes".into())
    }
}
fn color(value: &str) -> Result<(), String> {
    if value.len() == 7
        && value.starts_with('#')
        && value[1..]
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
    {
        Ok(())
    } else {
        Err("Track color requires # and six lowercase hexadecimal digits".into())
    }
}
fn sum(a: f64, b: f64) -> Result<f64, String> {
    let result = a + b;
    if !a.is_finite() || !b.is_finite() || !result.is_finite() {
        Err("Nonfinite beat addition".into())
    } else {
        Ok(result)
    }
}
fn checked_add(a: usize, b: usize) -> Result<usize, String> {
    a.checked_add(b)
        .ok_or_else(|| "Workspace count overflow".into())
}

/// Deterministic candidate only. Graph eligibility, manifest bindings and native
/// preparation must succeed before a later controller may enable workspaces.
pub fn prospective_from_document(document: &Document) -> Result<ProjectV4, String> {
    let converted = document.map_to_clips()?;
    let Document::ClipsV3(clips) = &converted else {
        return Err("Expected prospective v3 clip document".into());
    };
    if clips.banks.len() != clips.common.tracks.len()
        || clips.banks.iter().any(|bank| {
            clips
                .banks
                .iter()
                .filter(|b| b.track_id == bank.track_id)
                .count()
                != 1
                || !clips.common.tracks.iter().any(|t| t.id == bank.track_id)
        })
        || clips
            .common
            .tracks
            .iter()
            .any(|t| !t.notes.is_empty() || !t.automation.is_empty())
    {
        return Err("Invalid v3 bank membership or unsupported common musical schedule".into());
    }
    let palette = [
        "#c77b61", "#86a59c", "#b4a269", "#8c9db4", "#b58e9a", "#88a26c", "#c09152", "#a39b8d",
    ];
    let mut project = ProjectV4 {
        format: "alive-session-v4".into(),
        title: clips.common.title.clone(),
        tempo: clips.common.tempo,
        length_beats: clips.common.length_beats,
        loop_enabled: clips.common.loop_enabled,
        loop_start_beats: 0.,
        loop_end_beats: clips.common.length_beats,
        tracks: vec![],
        sources: vec![],
        placements: vec![],
    };
    for (index, track) in clips.common.tracks.iter().enumerate() {
        let bank = converted
            .bank(&track.id)
            .ok_or_else(|| format!("Missing bank for track '{}'", track.id))?;
        if let Some(default) = &bank.default_clip_id {
            if !bank.slots.iter().flatten().any(|clip| &clip.id == default) {
                return Err(format!(
                    "Saved default '{default}' must name a clip on track '{}'",
                    track.id
                ));
            }
        }
        let mut slots: [Option<SlotV4>; 4] = std::array::from_fn(|_| None);
        for (slot_number, clip) in bank.slots.iter().enumerate() {
            let Some(clip) = clip else {
                continue;
            };
            let source_id = identity("source", &["alive-v3-v4-source", &track.id, &clip.id]);
            project.sources.push(SourceV4::Midi {
                id: source_id.clone(),
                track_id: track.id.clone(),
                name: clip.name.clone(),
                length_beats: clip.length_beats,
                notes: clip.notes.clone(),
                automation: clip.automation.clone(),
            });
            slots[slot_number] = Some(SlotV4 {
                id: clip.id.clone(),
                name: clip.name.clone(),
                source_id: source_id.clone(),
                region: ClipRegionV4::full(clip.length_beats),
            });
            if bank.default_clip_id.as_ref() == Some(&clip.id) {
                project.placements.push(PlacementV4 {
                    id: identity("placement", &["alive-v3-v4-placement", &track.id, &clip.id]),
                    track_id: track.id.clone(),
                    source_id,
                    start: 0.,
                    duration: clips.common.length_beats,
                    region: ClipRegionV4::full(clip.length_beats),
                });
            }
        }
        project.tracks.push(TrackV4 {
            id: track.id.clone(),
            name: track.name.clone(),
            color: palette
                .get(index)
                .ok_or("Workspace exceeds eight tracks")?
                .to_string(),
            chain: ChainV4::Midi {
                instrument: Some(track.device.clone()),
            },
            effects: track.effects.clone(),
            slots,
            gain: track.gain,
            mute: track.mute,
            solo: track.solo,
        });
    }
    project.validate()?;
    Ok(project)
}
/// Shares strict v3 wire decoding without native admission; v1/v2 use the unchanged
/// old decoder, including v1's existing strict source resolution.
/// This does not open/install a v4 document or prove its runtime admission.
pub fn prospective_from_legacy_text(
    text: &str,
    origin: &std::path::Path,
) -> Result<ProjectV4, String> {
    check_size(text.len())?;
    super::clips::reject_duplicates(text)?;
    // This header only selects the full decoder; it never replaces wire validation.
    #[derive(Deserialize)]
    struct Format {
        format: String,
    }
    let format: Format =
        serde_json::from_str(text).map_err(|e| format!("Invalid Alive session JSON: {e}"))?;
    let document = if format.format == "alive-session-v3" {
        super::clips::decode_v3_candidate(text)?
    } else if format.format == "alive-session-v1" || format.format == "alive-session-v2" {
        super::persistence::decode(text, origin)?.score
    } else {
        return Err("Expected a bare legacy score for workspace conversion".into());
    };
    prospective_from_document(&document)
}
fn identity(prefix: &str, parts: &[&str]) -> String {
    use sha2::{Digest, Sha256};
    let mut hash = Sha256::new();
    for part in parts {
        hash.update((part.len() as u32).to_be_bytes());
        hash.update(part.as_bytes());
    }
    format!("{prefix}-{}", &format!("{:x}", hash.finalize())[..32])
}
/// Pure transactional edit; `reserved` must include prepared, draft and retained-history IDs.
/// Resolved manifest/graph checks, PCM loading and native admission remain separate gates.
pub fn apply_edit(
    project: &ProjectV4,
    edit: WorkspaceEditV4,
    reserved: &HashSet<String>,
) -> Result<EditResultV4, String> {
    apply_edit_with(project, edit, reserved, |prefix| {
        super::clips::fresh(prefix, &mut HashSet::new())
    })
}

pub fn apply_edit_with<F: FnMut(&str) -> String>(
    project: &ProjectV4,
    edit: WorkspaceEditV4,
    reserved: &HashSet<String>,
    mut mint: F,
) -> Result<EditResultV4, String> {
    project.validate()?;
    let mut candidate = project.clone();
    let mut occupied = project.identities();
    occupied.extend(reserved.iter().cloned());
    let mut fresh = |prefix: &str| -> Result<String, String> {
        for _ in 0..1024 {
            let id = mint(prefix);
            super::prepare::token(&id, "Fresh identity")?;
            if occupied.insert(id.clone()) {
                return Ok(id);
            }
        }
        Err("ID generator did not produce a fresh identity after 1024 attempts".into())
    };
    candidate.edit(edit, &mut fresh)?;
    let affected_ids = affected(project, &candidate)?;
    candidate
        .validate()
        .map_err(|e| format!("{e}; affected IDs: {}", affected_ids.join(", ")))?;
    Ok(EditResultV4 {
        project: candidate,
        affected_ids,
    })
}

impl ProjectV4 {
    fn track_mut(&mut self, id: &str) -> Result<&mut TrackV4, String> {
        self.tracks
            .iter_mut()
            .find(|t| t.id == id)
            .ok_or_else(|| format!("Unknown track '{id}'"))
    }
    fn source_mut(&mut self, id: &str) -> Result<&mut SourceV4, String> {
        self.sources
            .iter_mut()
            .find(|s| s.id() == id)
            .ok_or_else(|| format!("Unknown source '{id}'"))
    }
    fn placement_mut(&mut self, id: &str) -> Result<&mut PlacementV4, String> {
        self.placements
            .iter_mut()
            .find(|p| p.id == id)
            .ok_or_else(|| format!("Unknown placement '{id}'"))
    }
    fn slot_mut(&mut self, track_id: &str, slot_id: &str) -> Result<&mut SlotV4, String> {
        self.track_mut(track_id)?
            .slots
            .iter_mut()
            .flatten()
            .find(|s| s.id == slot_id)
            .ok_or_else(|| format!("Unknown slot '{slot_id}' on track '{track_id}'"))
    }
    fn notes_mut(&mut self, source_id: &str) -> Result<&mut Vec<ClipNote>, String> {
        match self.source_mut(source_id)? {
            SourceV4::Midi { notes, .. } => Ok(notes),
            _ => Err(format!(
                "Source '{source_id}' is audio; MIDI operation requires a MIDI source"
            )),
        }
    }
    fn extend_region_source(
        &mut self,
        source_id: &str,
        region: &ClipRegionV4,
    ) -> Result<(), String> {
        if let SourceV4::Midi { length_beats, .. } = self.source_mut(source_id)? {
            for value in [region.start, region.end, region.loop_start, region.loop_end] {
                super::prepare::bounded(value, 0., 256., "MIDI region marker")?;
                *length_beats = length_beats.max(value);
            }
        }
        Ok(())
    }
    fn edit(
        &mut self,
        edit: WorkspaceEditV4,
        fresh: &mut impl FnMut(&str) -> Result<String, String>,
    ) -> Result<(), String> {
        use WorkspaceEditV4::*;
        match edit {
            MidiPlacementCreate {
                track_id,
                start,
                duration,
                name,
            } => {
                if !matches!(self.track(&track_id)?.chain, ChainV4::Midi { .. }) {
                    return Err(format!("Track '{track_id}' is audio"));
                }
                let source_id = fresh("source")?;
                let placement_id = fresh("placement")?;
                self.sources.push(SourceV4::Midi {
                    id: source_id.clone(),
                    track_id: track_id.clone(),
                    name,
                    length_beats: duration,
                    notes: vec![],
                    automation: vec![],
                });
                self.placements.push(PlacementV4 {
                    id: placement_id,
                    track_id,
                    source_id,
                    start,
                    duration,
                    region: ClipRegionV4::full(duration),
                });
            }
            MidiClipCreate {
                track_id,
                slot,
                name,
            } => {
                if !matches!(self.track(&track_id)?.chain, ChainV4::Midi { .. }) {
                    return Err(format!("Track '{track_id}' is audio"));
                }
                let source_id = fresh("source")?;
                let slot_id = fresh("slot")?;
                let destination = self
                    .track_mut(&track_id)?
                    .slots
                    .get_mut(slot as usize)
                    .ok_or("Slot must be 0..3")?;
                if destination.is_some() {
                    return Err("Clip destination is occupied".into());
                }
                *destination = Some(SlotV4 {
                    id: slot_id,
                    name: name.clone(),
                    source_id: source_id.clone(),
                    region: ClipRegionV4::full(4.),
                });
                self.sources.push(SourceV4::Midi {
                    id: source_id,
                    track_id,
                    name,
                    length_beats: 4.,
                    notes: vec![],
                    automation: vec![],
                });
            }
            AudioClipImport {
                track_id,
                slot,
                name,
                file,
                source_tempo,
                warp_mode,
            } => {
                if !matches!(self.track(&track_id)?.chain, ChainV4::Audio {}) {
                    return Err(format!("Track '{track_id}' is MIDI"));
                }
                let source = SourceV4::Audio {
                    id: fresh("source")?,
                    track_id: track_id.clone(),
                    name: name.clone(),
                    file,
                    source_tempo,
                    warp_mode,
                    automation: vec![],
                };
                let region = ClipRegionV4::full(source.length_beats());
                let slot_id = fresh("slot")?;
                let destination = self
                    .track_mut(&track_id)?
                    .slots
                    .get_mut(slot as usize)
                    .ok_or("Slot must be 0..3")?;
                if destination.is_some() {
                    return Err("Clip destination is occupied".into());
                }
                *destination = Some(SlotV4 {
                    id: slot_id,
                    name,
                    source_id: source.id().into(),
                    region,
                });
                self.sources.push(source);
            }
            RegionSet { occurrence, region } => {
                let source_id = match &occurrence {
                    OccurrenceV4::Slot { track_id, slot_id } => {
                        self.slot_mut(track_id, slot_id)?.source_id.clone()
                    }
                    OccurrenceV4::Placement { placement_id } => {
                        self.placement_mut(placement_id)?.source_id.clone()
                    }
                };
                self.extend_region_source(&source_id, &region)?;
                match occurrence {
                    OccurrenceV4::Slot { track_id, slot_id } => {
                        self.slot_mut(&track_id, &slot_id)?.region = region
                    }
                    OccurrenceV4::Placement { placement_id } => {
                        self.placement_mut(&placement_id)?.region = region
                    }
                }
            }
            SourceCreateMidi {
                track_id,
                name,
                length_beats,
            } => {
                if !matches!(self.track(&track_id)?.chain, ChainV4::Midi { .. }) {
                    return Err(format!("Track '{track_id}' is audio"));
                }
                self.sources.push(SourceV4::Midi {
                    id: fresh("source")?,
                    track_id,
                    name,
                    length_beats,
                    notes: vec![],
                    automation: vec![],
                });
            }
            SourceRename { source_id, name } => match self.source_mut(&source_id)? {
                SourceV4::Midi { name: old, .. } | SourceV4::Audio { name: old, .. } => *old = name,
            },
            SourceDelete { source_id } => {
                self.source(&source_id)?;
                let refs = self.reference_ids(&source_id);
                if !refs.is_empty() {
                    return Err(format!(
                        "Source '{source_id}' is referenced by {}",
                        refs.join(", ")
                    ));
                }
                self.sources.retain(|s| s.id() != source_id);
            }
            SourceLength {
                source_id,
                length_beats,
            } => match self.source_mut(&source_id)? {
                SourceV4::Midi {
                    length_beats: old, ..
                } => *old = length_beats,
                _ => {
                    return Err(format!(
                        "Audio source '{source_id}' has immutable frame length"
                    ))
                }
            },
            SourceIndependent { occurrence } => {
                let source_id = match &occurrence {
                    OccurrenceV4::Slot { track_id, slot_id } => {
                        self.slot_mut(track_id, slot_id)?.source_id.clone()
                    }
                    OccurrenceV4::Placement { placement_id } => {
                        self.placement_mut(placement_id)?.source_id.clone()
                    }
                };
                let mut source = self.source(&source_id)?.clone();
                let new_id = fresh("source")?;
                match &mut source {
                    SourceV4::Midi { id, notes, .. } => {
                        *id = new_id.clone();
                        for note in notes {
                            note.id = fresh("note")?;
                        }
                    }
                    SourceV4::Audio { id, .. } => *id = new_id.clone(),
                }
                self.sources.push(source);
                match occurrence {
                    OccurrenceV4::Slot { track_id, slot_id } => {
                        self.slot_mut(&track_id, &slot_id)?.source_id = new_id
                    }
                    OccurrenceV4::Placement { placement_id } => {
                        self.placement_mut(&placement_id)?.source_id = new_id
                    }
                }
            }
            NoteCreate {
                source_id,
                beat,
                duration,
                pitch,
                velocity,
            } => {
                self.notes_mut(&source_id)?.push(ClipNote {
                    id: fresh("note")?,
                    beat,
                    duration,
                    pitch,
                    velocity,
                });
            }
            NoteUpdate {
                source_id,
                note_id,
                beat,
                duration,
                pitch,
                velocity,
            } => {
                let note = self
                    .notes_mut(&source_id)?
                    .iter_mut()
                    .find(|n| n.id == note_id)
                    .ok_or_else(|| format!("Unknown note '{note_id}' in source '{source_id}'"))?;
                *note = ClipNote {
                    id: note_id,
                    beat,
                    duration,
                    pitch,
                    velocity,
                };
            }
            NoteDelete { source_id, note_id } => {
                let notes = self.notes_mut(&source_id)?;
                let index = notes
                    .iter()
                    .position(|n| n.id == note_id)
                    .ok_or_else(|| format!("Unknown note '{note_id}' in source '{source_id}'"))?;
                notes.remove(index);
            }
            AutomationSet { source_id, lanes } => match self.source_mut(&source_id)? {
                SourceV4::Midi { automation, .. } | SourceV4::Audio { automation, .. } => {
                    *automation = lanes
                }
            },
            SlotAssign {
                track_id,
                slot,
                source_id,
                name,
                region,
            } => {
                self.extend_region_source(&source_id, &region)?;
                let destination = self
                    .track_mut(&track_id)?
                    .slots
                    .get_mut(slot as usize)
                    .ok_or("Slot must be 0..3")?;
                if let Some(existing) = destination {
                    return Err(format!("Track '{track_id}' slot {slot} is occupied by '{}'; delete that slot, then assign", existing.id));
                }
                *destination = Some(SlotV4 {
                    id: fresh("slot")?,
                    name,
                    source_id,
                    region,
                });
            }
            SlotUpdate {
                track_id,
                slot_id,
                name,
                region,
            } => {
                let source_id = self.slot_mut(&track_id, &slot_id)?.source_id.clone();
                self.extend_region_source(&source_id, &region)?;
                let slot = self.slot_mut(&track_id, &slot_id)?;
                slot.name = name;
                slot.region = region;
            }
            SlotDuplicate {
                track_id,
                slot_id,
                destination_slot,
            } => {
                let mut slot = self.slot_mut(&track_id, &slot_id)?.clone();
                let destination = self
                    .track_mut(&track_id)?
                    .slots
                    .get_mut(destination_slot as usize)
                    .ok_or("Slot must be 0..3")?;
                if destination.is_some() {
                    return Err(format!(
                        "Track '{track_id}' destination slot {destination_slot} is occupied"
                    ));
                }
                slot.id = fresh("slot")?;
                *destination = Some(slot);
            }
            SlotDelete { track_id, slot_id } => {
                let track = self.track_mut(&track_id)?;
                let index = track
                    .slots
                    .iter()
                    .position(|s| s.as_ref().is_some_and(|s| s.id == slot_id))
                    .ok_or_else(|| format!("Unknown slot '{slot_id}' on track '{track_id}'"))?;
                track.slots[index] = None;
            }
            PlacementCreate {
                track_id,
                source_id,
                start,
                duration,
                region,
            } => {
                self.extend_region_source(&source_id, &region)?;
                self.placements.push(PlacementV4 {
                    id: fresh("placement")?,
                    track_id,
                    source_id,
                    start,
                    duration,
                    region,
                });
            }
            PlacementUpdate {
                placement_id,
                start,
                duration,
                region,
            } => {
                let source_id = self.placement_mut(&placement_id)?.source_id.clone();
                self.extend_region_source(&source_id, &region)?;
                let placement = self.placement_mut(&placement_id)?;
                placement.start = start;
                placement.duration = duration;
                placement.region = region;
            }
            PlacementDuplicate {
                placement_id,
                start,
            } => {
                let mut placement = self.placement_mut(&placement_id)?.clone();
                placement.id = fresh("placement")?;
                placement.start = start;
                self.placements.push(placement);
            }
            PlacementDelete { placement_id } => {
                self.placement_mut(&placement_id)?;
                self.placements.retain(|p| p.id != placement_id);
            }
            TransportRange {
                tempo,
                length_beats,
                loop_enabled,
                loop_start_beats,
                loop_end_beats,
            } => {
                self.tempo = tempo;
                self.length_beats = length_beats;
                self.loop_enabled = loop_enabled;
                self.loop_start_beats = loop_start_beats;
                self.loop_end_beats = loop_end_beats;
            }
            TrackPresentation {
                track_id,
                name,
                color,
            } => {
                let track = self.track_mut(&track_id)?;
                track.name = name;
                track.color = color;
            }
        }
        Ok(())
    }
}

// Comparing stable records also catches deleted IDs and references to a source-wide edit.
fn affected(before: &ProjectV4, after: &ProjectV4) -> Result<Vec<String>, String> {
    fn records(project: &ProjectV4) -> Result<BTreeMap<String, String>, String> {
        let mut map = BTreeMap::new();
        fn insert<T: Serialize>(
            map: &mut BTreeMap<String, String>,
            id: &str,
            record: &T,
        ) -> Result<(), String> {
            map.insert(
                id.to_owned(),
                serde_json::to_string(record).map_err(|e| e.to_string())?,
            );
            Ok(())
        }
        for track in &project.tracks {
            insert(&mut map, &track.id, track)?;
            for slot in track.slots.iter().flatten() {
                insert(&mut map, &slot.id, slot)?;
            }
        }
        for source in &project.sources {
            insert(&mut map, source.id(), source)?;
            if let SourceV4::Midi { notes, .. } = source {
                for note in notes {
                    insert(&mut map, &note.id, note)?;
                }
            }
        }
        for placement in &project.placements {
            insert(&mut map, &placement.id, placement)?;
        }
        Ok(map)
    }
    let old = records(before)?;
    let new = records(after)?;
    let mut changed = BTreeSet::new();
    for id in old.keys().chain(new.keys()) {
        if old.get(id) != new.get(id) {
            changed.insert(id.clone());
        }
    }
    let transport_changed = before.tempo != after.tempo
        || before.length_beats != after.length_beats
        || before.loop_enabled != after.loop_enabled
        || before.loop_start_beats != after.loop_start_beats
        || before.loop_end_beats != after.loop_end_beats;
    for project in [before, after] {
        for source in &project.sources {
            if changed.contains(source.id()) || transport_changed {
                changed.insert(source.id().to_owned());
                changed.extend(project.reference_ids(source.id()));
            }
        }
        if transport_changed {
            changed.extend(project.tracks.iter().map(|t| t.id.clone()));
        }
    }
    Ok(changed.into_iter().collect())
}
#[cfg(test)]
#[path = "workspaces_tests.rs"]
mod tests;
