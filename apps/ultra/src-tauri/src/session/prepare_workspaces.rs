//! Compile immutable source schedules and retain PCM owners outside the callback.
use super::{
    prepare::{FrameEvent, PreparedTrack, PreparedTrackInput},
    workspaces::*,
    *,
};
use std::{collections::BTreeMap, path::Path, sync::Arc};

#[derive(Clone, Debug)]
pub struct PreparedSource {
    pub id: String,
    pub name: String,
    pub descriptor: native::SourceV4,
}
#[derive(Clone, Debug)]
pub struct PreparedSlot {
    pub id: String,
    pub name: String,
    pub slot: usize,
    pub descriptor: native::SlotV4,
}
#[derive(Clone, Debug)]
pub struct PreparedPlacement {
    pub id: String,
    pub descriptor: native::PlacementV4,
}
#[derive(Clone, Debug)]
pub struct PreparedAudio {
    pub source_id: String,
    pub samples: Arc<[f32]>,
    pub waveform_peaks: Vec<[f32; 2]>,
    file: AudioFileV4,
    tempo: f64,
    source_tempo: f64,
}
#[derive(Clone, Debug, Default)]
pub struct PreparedWorkspaces {
    pub sources: Vec<PreparedSource>,
    pub slots: Vec<PreparedSlot>,
    pub placements: Vec<PreparedPlacement>,
    pub audio: Vec<PreparedAudio>,
}
impl PreparedWorkspaces {
    // POD pointers borrow the immutable blocks retained by this entire schedule bank.
    pub fn audio_descriptors(&self) -> Vec<native::AudioBufferV4> {
        self.audio
            .iter()
            .map(|audio| native::AudioBufferV4 {
                channels: 2,
                sample_rate: 48_000,
                frames: (audio.samples.len() / 2) as u64,
                sample_count: audio.samples.len() as u64,
                samples: audio.samples.as_ptr(),
                ..Default::default()
            })
            .collect()
    }
}

pub(super) fn prepare(
    saved: &SavedSession,
    project: &ProjectV4,
    path: &Path,
) -> Result<PreparedSession, String> {
    project.validate()?;
    if project.tracks.len() > 8
        || project
            .tracks
            .iter()
            .map(|t| t.devices().count())
            .sum::<usize>()
            > 6
    {
        return Err("Workspace supports at most eight logical tracks and six device roots; the complete musical work envelope may impose a lower limit".into());
    }
    let document = Document::WorkspacesV4(project.clone());
    super::prepare::check_sources(&document, path, None)?;
    let mut references: Vec<_> = project
        .tracks
        .iter()
        .enumerate()
        .flat_map(|(track, t)| t.devices().map(move |d| (track, d)))
        .collect();
    references.sort_by_key(|(_, d)| &d.instance_id);
    let mut prepared = PreparedSession {
        origin: path.to_owned(),
        saved: saved.with_score(document),
        tracks: vec![],
        devices: vec![],
        events: vec![],
        length_frames: frame_at(project.length_beats, project.tempo)?,
        schedule: Schedule::Workspaces(PreparedWorkspaces::default()),
        notice: None,
    };
    for (track, reference) in references {
        let device = super::prepare::prepare_device(reference, path, track).map_err(|e| {
            format!(
                "Track '{}' instance '{}': {e}",
                project.tracks[track].name, reference.instance_id
            )
        })?;
        let instrument = matches!(&project.tracks[track].chain,ChainV4::Midi{instrument:Some(instrument)} if instrument.instance_id==reference.instance_id);
        let expected = if instrument {
            crate::canvas::device::DeviceKind::Instrument
        } else {
            crate::canvas::device::DeviceKind::AudioEffect
        };
        if device.manifest.kind != expected || (instrument && reference.bypassed) {
            return Err(format!(
                "Track '{}' instance '{}' has incompatible instrument/effect role",
                project.tracks[track].name, reference.instance_id
            ));
        }
        prepared
            .saved
            .score
            .device_mut(&reference.instance_id)?
            .parameters = device
            .manifest
            .parameters
            .iter()
            .map(|p| (p.key.clone(), p.base))
            .collect();
        prepared.devices.push(device);
    }
    compile(project, &mut prepared)?;
    Ok(prepared)
}

pub(super) fn compile(project: &ProjectV4, prepared: &mut PreparedSession) -> Result<(), String> {
    project.validate()?;
    let frame = |beat| frame_at(beat, project.tempo);
    let mut events = Vec::new();
    let mut sources = Vec::new();
    let mut slots = Vec::new();
    let mut placements = Vec::new();
    let mut tracks = Vec::new();
    let mut audio = Vec::new();
    // Existing root order is part of live publication identity and must never be re-sorted here.
    let device_index = |id: &str, track: usize| {
        prepared
            .devices
            .iter()
            .position(|d| d.instance_id == id && d.track == track)
            .ok_or_else(|| format!("Missing or cross-track instance '{id}'"))
    };
    let track_map: BTreeMap<_, _> = project
        .tracks
        .iter()
        .enumerate()
        .map(|(i, t)| (t.id.as_str(), i))
        .collect();
    for (index, t) in project.tracks.iter().enumerate() {
        let input = match &t.chain {
            ChainV4::Midi { instrument } => PreparedTrackInput::Midi {
                instrument: instrument
                    .as_ref()
                    .map(|d| device_index(&d.instance_id, index))
                    .transpose()?,
            },
            ChainV4::Audio {} => PreparedTrackInput::Audio,
        };
        tracks.push(PreparedTrack {
            input,
            effects: t
                .effects
                .iter()
                .map(|e| device_index(&e.instance_id, index))
                .collect::<Result<_, _>>()?,
        });
    }
    let mut ordered: Vec<_> = project.sources.iter().collect();
    ordered.sort_by_key(|s| (track_map[s.track_id()], s.id()));
    let mut audio_frames = 0u64;
    for source in ordered {
        let track = track_map[source.track_id()];
        let begin = events.len();
        let length = source.length_frames(project.tempo)?;
        let mut masks = [0; 16];
        let id = source.id();
        let (name, kind, audio_buffer) = match source {
            SourceV4::Midi { name, notes, .. } => {
                if let Some(instrument) = tracks[track].optional_midi_instrument() {
                    for note in notes {
                        let start = frame(note.beat)?;
                        let end = frame(note.beat + note.duration)?;
                        events.push(FrameEvent {
                            frame: start,
                            track: track as u32,
                            kind: 2,
                            device: instrument as u32,
                            target: note.pitch,
                            value: note.velocity as f64,
                        });
                        if end < length {
                            events.push(FrameEvent {
                                frame: end,
                                track: track as u32,
                                kind: 0,
                                device: instrument as u32,
                                target: note.pitch,
                                value: 0.,
                            });
                        }
                    }
                }
                (name, 1, native::V4_NONE)
            }
            SourceV4::Audio {
                name,
                file,
                source_tempo,
                ..
            } => {
                audio_frames = audio_frames
                    .checked_add(length)
                    .ok_or("Workspace audio frame count overflow")?;
                if audio_frames > 8 * 1024 * 1024 {
                    return Err("Workspace exceeds 64 MiB of prepared stereo PCM".into());
                }
                let retained = match &prepared.schedule {
                    Schedule::Workspaces(old) => old.audio.iter().find(|a| {
                        a.source_id == id
                            && a.file == *file
                            && a.tempo == project.tempo
                            && a.source_tempo == *source_tempo
                    }),
                    _ => None,
                };
                let (samples, waveform_peaks) = if let Some(retained) = retained {
                    (retained.samples.clone(), retained.waveform_peaks.clone())
                } else {
                    let samples =
                        super::wav::prepare(file, &prepared.origin, project.tempo, *source_tempo)?;
                    let waveform_peaks = waveform_peaks(&samples);
                    (samples, waveform_peaks)
                };
                if samples.len() as u64
                    != length
                        .checked_mul(2)
                        .ok_or("Prepared PCM sample count overflow")?
                {
                    return Err(format!(
                        "Source '{id}' PCM duration differs from its beat mapping"
                    ));
                }
                let index = audio.len() as u32;
                audio.push(PreparedAudio {
                    source_id: id.into(),
                    samples,
                    waveform_peaks,
                    file: file.clone(),
                    tempo: project.tempo,
                    source_tempo: *source_tempo,
                });
                (name, 2, index)
            }
        };
        for lane in source.automation() {
            let device = device_index(&lane.instance_id, track)?;
            let (parameter, binding) = prepared.devices[device]
                .manifest
                .parameters
                .iter()
                .enumerate()
                .find(|(_, p)| p.key == lane.key)
                .ok_or_else(|| {
                    format!("Source '{id}': unknown automation parameter '{}'", lane.key)
                })?;
            if lane.enabled {
                masks[device] |= 1 << parameter;
            }
            for point in &lane.points {
                super::prepare::binding_value(binding, point.value)
                    .map_err(|e| format!("Source '{id}': {e}"))?;
                if lane.enabled {
                    events.push(FrameEvent {
                        frame: frame(point.beat)?,
                        track: track as u32,
                        kind: 1,
                        device: device as u32,
                        target: parameter as u32,
                        value: point.value,
                    });
                }
            }
        }
        events[begin..].sort_by_key(|e| (e.frame, e.kind, e.track, e.device, e.target));
        sources.push(PreparedSource {
            id: id.into(),
            name: name.clone(),
            descriptor: native::SourceV4 {
                track: track as u32,
                kind,
                audio_buffer,
                event_begin: begin as u32,
                event_count: (events.len() - begin) as u32,
                lane_count: source.automation().iter().filter(|l| l.enabled).count() as u32,
                length_frames: length,
                owned_masks: masks,
                ..Default::default()
            },
        });
    }
    if events.len() > 1024 {
        return Err("Workspace sources exceed 1024 compiled events".into());
    }
    let source_map: BTreeMap<_, _> = sources
        .iter()
        .enumerate()
        .map(|(i, s)| (s.id.as_str(), i))
        .collect();
    for (track, t) in project.tracks.iter().enumerate() {
        for (slot, s) in t.slots.iter().enumerate() {
            if let Some(s) = s {
                slots.push(PreparedSlot {
                    id: s.id.clone(),
                    name: s.name.clone(),
                    slot,
                    descriptor: native::SlotV4 {
                        track: track as u32,
                        source: source_map[s.source_id.as_str()] as u32,
                        start_marker: frame(s.region.start)?,
                        end_marker: frame(s.region.end)?,
                        loop_start: frame(s.region.loop_start)?,
                        loop_end: frame(s.region.loop_end)?,
                        loop_enabled: s.region.loop_enabled as u32,
                        ..Default::default()
                    },
                });
            }
        }
    }
    for p in &project.placements {
        let start = frame(p.start)?;
        placements.push(PreparedPlacement {
            id: p.id.clone(),
            descriptor: native::PlacementV4 {
                track: track_map[p.track_id.as_str()] as u32,
                source: source_map[p.source_id.as_str()] as u32,
                start_frame: start,
                duration_frames: frame(p.start + p.duration)? - start,
                start_marker: frame(p.region.start)?,
                end_marker: frame(p.region.end)?,
                loop_start: frame(p.region.loop_start)?,
                loop_end: frame(p.region.loop_end)?,
                loop_enabled: p.region.loop_enabled as u32,
                ..Default::default()
            },
        });
    }
    placements.sort_by(|a, b| {
        (a.descriptor.track, a.descriptor.start_frame, &a.id).cmp(&(
            b.descriptor.track,
            b.descriptor.start_frame,
            &b.id,
        ))
    });
    prepared.events = events;
    prepared.tracks = tracks;
    prepared.length_frames = frame(project.length_beats)?;
    prepared.schedule = Schedule::Workspaces(PreparedWorkspaces {
        sources,
        slots,
        placements,
        audio,
    });
    Ok(())
}

fn waveform_peaks(samples: &[f32]) -> Vec<[f32; 2]> {
    let frames = samples.len() / 2;
    let bins = frames.min(256);
    (0..bins)
        .map(|bin| {
            let range = &samples[(bin * frames / bins) * 2..((bin + 1) * frames / bins) * 2];
            range.iter().fold([1f32, -1f32], |[min, max], sample| {
                [min.min(*sample), max.max(*sample)]
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn empty_project() -> ProjectV4 {
        ProjectV4 {
            format: "alive-session-v4".into(),
            title: "Test".into(),
            tempo: 120.,
            length_beats: 8.,
            loop_enabled: false,
            loop_start_beats: 0.,
            loop_end_beats: 8.,
            tracks: vec![TrackV4 {
                id: "track".into(),
                name: "Empty MIDI".into(),
                color: "#c77b61".into(),
                chain: ChainV4::Midi { instrument: None },
                effects: vec![],
                slots: [None, None, None, None],
                gain: 1.,
                mute: false,
                solo: false,
            }],
            sources: vec![],
            placements: vec![],
        }
    }

    fn saved(project: &ProjectV4) -> SavedSession {
        SavedSession {
            score: Document::WorkspacesV4(project.clone()),
            master: MasterSettings { gain: 1. },
            launch: Default::default(),
            wire: SaveWire::V6,
        }
    }

    #[test]
    fn rootless_midi_retains_notes_without_compiling_note_events() {
        let mut project = empty_project();
        project.sources.push(SourceV4::Midi {
            id: "source".into(),
            track_id: "track".into(),
            name: "Notes".into(),
            length_beats: 4.,
            notes: vec![clips::ClipNote {
                id: "note".into(),
                beat: 0.,
                duration: 1.,
                pitch: 60,
                velocity: 90,
            }],
            automation: vec![],
        });
        project.tracks[0].slots[0] = Some(SlotV4 {
            id: "slot".into(),
            name: "Intro".into(),
            source_id: "source".into(),
            region: ClipRegionV4 {
                start: 0.,
                end: 4.,
                loop_start: 1.,
                loop_end: 3.,
                loop_enabled: true,
            },
        });
        let prepared = prepare(&saved(&project), &project, Path::new("/tmp/empty.alive")).unwrap();
        assert!(prepared.events.is_empty());
        assert!(prepared.devices.is_empty());
        assert!(prepared.tracks[0].midi_instrument().is_err());
        assert_eq!(prepared.saved.score, Document::WorkspacesV4(project));
        let Schedule::Workspaces(schedule) = prepared.schedule else {
            panic!()
        };
        let slot = schedule.slots[0].descriptor;
        assert_eq!(
            (
                slot.start_marker,
                slot.end_marker,
                slot.loop_start,
                slot.loop_end
            ),
            (0, 96_000, 24_000, 72_000)
        );
    }

    #[test]
    fn sparse_eight_tracks_prepare_without_imaginary_device_roots() {
        let mut project = empty_project();
        for index in 1..8 {
            let mut track = project.tracks[0].clone();
            track.id = format!("track-{index}");
            if index % 2 == 1 {
                track.chain = ChainV4::Audio {}
            };
            project.tracks.push(track);
        }
        let prepared = prepare(&saved(&project), &project, Path::new("/tmp/sparse.alive")).unwrap();
        assert_eq!(prepared.tracks.len(), 8);
        assert!(prepared.events.is_empty());
        assert!(prepared.devices.is_empty());
    }

    #[test]
    fn first_effect_on_an_instrumentless_track_keeps_its_effect_role() {
        let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../examples/utility.ultra");
        let patch = crate::documents::read_patch(&path).unwrap().patch.unwrap();
        let graph = crate::canvas::prepare(patch.clone()).unwrap().native;
        let manifest = crate::canvas::device::host_manifest(&patch, &graph).unwrap();
        let mut project = empty_project();
        project.tracks[0].effects.push(DeviceInstance {
            instance_id: "effect".into(),
            path: path.to_string_lossy().into(),
            id: manifest.id,
            version: manifest.version,
            source_sha256: super::super::prepare::fingerprint(&patch).unwrap(),
            parameters: Default::default(),
            bypassed: true,
        });
        let prepared = prepare(&saved(&project), &project, Path::new("/tmp/effect.alive")).unwrap();
        assert_eq!(prepared.tracks[0].effects, vec![0]);
        assert!(prepared.tracks[0].midi_instrument().is_err());
    }

    #[test]
    fn recompilation_preserves_existing_root_indices_after_track_reordering() {
        let path = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../alive/examples/two-instruments.alive");
        let old = super::super::read(&path).unwrap();
        let mut project = prospective_from_document(&old.saved.score).unwrap();
        let mut prepared = prepare(
            &old.saved
                .with_score(Document::WorkspacesV4(project.clone())),
            &project,
            &path,
        )
        .unwrap();
        let original_roots: Vec<_> = prepared
            .devices
            .iter()
            .map(|d| d.instance_id.clone())
            .collect();
        project.tracks.reverse();
        for device in &mut prepared.devices {
            device.track = 1 - device.track;
        }
        compile(&project, &mut prepared).unwrap();
        assert_eq!(
            prepared
                .devices
                .iter()
                .map(|d| d.instance_id.clone())
                .collect::<Vec<_>>(),
            original_roots
        );
        for event in &prepared.events {
            assert_eq!(
                prepared.devices[event.device as usize].track,
                event.track as usize
            );
        }
    }

    #[test]
    fn audio_preparation_retains_pcm_owners_across_region_publication() {
        let folder =
            std::env::temp_dir().join(format!("alive-prepared-pcm-{}", std::process::id()));
        std::fs::create_dir_all(&folder).unwrap();
        let path = folder.join("fixture.wav");
        // Four mono PCM16 frames at 48 kHz; duplicated stereo samples are immutable.
        let mut bytes=b"RIFF\x2c\0\0\0WAVEfmt \x10\0\0\0\x01\0\x01\0\x80\xbb\0\0\0\x77\x01\0\x02\0\x10\0data\x08\0\0\0".to_vec();
        bytes.extend([0, 0, 0, 64, 0, 192, 255, 127]);
        std::fs::write(&path, bytes).unwrap();
        let mut file = super::super::wav::inspect(&path).unwrap();
        file.path = "fixture.wav".into();
        let mut project = empty_project();
        project.tracks[0].chain = ChainV4::Audio {};
        project.sources.push(SourceV4::Audio {
            id: "source".into(),
            track_id: "track".into(),
            name: "WAV".into(),
            file,
            source_tempo: 120.,
            warp_mode: "repitch".into(),
            automation: vec![],
        });
        let end = 4. / 24_000.;
        project.tracks[0].slots[0] = Some(SlotV4 {
            id: "slot".into(),
            name: "Audio".into(),
            source_id: "source".into(),
            region: ClipRegionV4 {
                start: 0.,
                end,
                loop_start: 0.,
                loop_end: end,
                loop_enabled: false,
            },
        });
        let mut prepared = prepare(&saved(&project), &project, &folder.join("set.alive")).unwrap();
        let Schedule::Workspaces(initial) = &prepared.schedule else {
            panic!()
        };
        let retained = initial.audio[0].samples.clone();
        assert_eq!(
            &*retained,
            &[
                0.,
                0.,
                0.5,
                0.5,
                -0.5,
                -0.5,
                32767. / 32768.,
                32767. / 32768.
            ]
        );
        assert_eq!(
            initial.audio[0].waveform_peaks,
            vec![
                [0., 0.],
                [0.5, 0.5],
                [-0.5, -0.5],
                [32767. / 32768., 32767. / 32768.]
            ]
        );
        project.tracks[0].slots[0].as_mut().unwrap().region.start = 1. / 24_000.;
        compile(&project, &mut prepared).unwrap();
        let Schedule::Workspaces(updated) = &prepared.schedule else {
            panic!()
        };
        assert!(Arc::ptr_eq(&retained, &updated.audio[0].samples));
        let descriptors = updated.audio_descriptors();
        assert_eq!(descriptors[0].frames, 4);
        assert_eq!(descriptors[0].sample_count, 8);
        assert_eq!(descriptors[0].samples, retained.as_ptr());
        assert_eq!(updated.sources[0].descriptor.kind, 2);
        assert_eq!(updated.slots[0].descriptor.start_marker, 1);
        std::fs::remove_dir_all(folder).unwrap();
    }
}
