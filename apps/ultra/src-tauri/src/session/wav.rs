//! Bounded WAV decoding and explicit Re-Pitch preparation on the control worker.
use super::workspaces::{AudioFileV4, DecimalU64};
use sha2::{Digest, Sha256};
use std::{io::Read, path::Path, sync::Arc};

pub const MAX_WAV_BYTES: usize = 24 * 1024 * 1024;
pub const MAX_AUDIO_FRAMES: u64 = 48_000 * 60;

pub fn validate_descriptor(file: &AudioFileV4) -> Result<(), String> {
    let supported = match file.encoding.as_str() {
        "wavPcm" => matches!(file.bits_per_sample, 8 | 16 | 24 | 32),
        "wavFloat" => matches!(file.bits_per_sample, 32 | 64),
        _ => false,
    };
    if !supported
        || !matches!(file.channels, 1 | 2)
        || !(8_000..=192_000).contains(&file.sample_rate)
        || file.frames.0 == 0
        || file.frames.0 > u64::from(file.sample_rate) * 60
    {
        return Err("Expected a WAV of at most 60 seconds: mono/stereo PCM 8/16/24/32-bit or IEEE float 32/64-bit WAV at 8..192 kHz".into());
    }
    let bytes = file
        .frames
        .0
        .checked_mul(u64::from(file.channels))
        .and_then(|n| n.checked_mul(u64::from(file.bits_per_sample / 8)))
        .ok_or("WAV sample byte count overflow")?;
    if bytes > MAX_WAV_BYTES as u64 {
        return Err("WAV exceeds the 24 MiB file limit".into());
    }
    Ok(())
}

pub fn inspect(path: &Path) -> Result<AudioFileV4, String> {
    decode(&read_bounded(path)?, &path.to_string_lossy()).map(|(file, _)| file)
}

pub fn prepare(
    file: &AudioFileV4,
    origin: &Path,
    tempo: f64,
    source_tempo: f64,
) -> Result<Arc<[f32]>, String> {
    validate_descriptor(file)?;
    output_frames(file.frames.0, file.sample_rate, tempo, source_tempo)?;
    let path = origin.parent().unwrap_or(Path::new(".")).join(&file.path);
    let (actual, samples) = decode(&read_bounded(&path)?, &file.path)?;
    if &actual != file {
        return Err(format!(
            "Audio source '{}' changed or its saved WAV metadata is invalid",
            file.path
        ));
    }
    resample(&samples, file.sample_rate, tempo, source_tempo)
}

fn read_bounded(path: &Path) -> Result<Vec<u8>, String> {
    let file =
        std::fs::File::open(path).map_err(|e| format!("Read WAV '{}': {e}", path.display()))?;
    if file.metadata().map_err(|e| e.to_string())?.len() > MAX_WAV_BYTES as u64 {
        return Err("WAV exceeds the 24 MiB file limit".into());
    }
    let mut bytes = Vec::new();
    file.take(MAX_WAV_BYTES as u64 + 1)
        .read_to_end(&mut bytes)
        .map_err(|e| e.to_string())?;
    if bytes.len() > MAX_WAV_BYTES {
        return Err("WAV exceeds the 24 MiB file limit".into());
    }
    Ok(bytes)
}

fn decode(bytes: &[u8], path: &str) -> Result<(AudioFileV4, Vec<f32>), String> {
    let bad = || "Malformed or unsupported RIFF/WAVE file".to_string();
    if bytes.len() < 12
        || bytes.len() > MAX_WAV_BYTES
        || &bytes[..4] != b"RIFF"
        || &bytes[8..12] != b"WAVE"
    {
        return Err(bad());
    }
    let u16at = |chunk: &[u8], at: usize| u16::from_le_bytes(chunk[at..at + 2].try_into().unwrap());
    let u32at = |chunk: &[u8], at: usize| u32::from_le_bytes(chunk[at..at + 4].try_into().unwrap());
    if u64::from(u32at(bytes, 4)) + 8 != bytes.len() as u64 {
        return Err(bad());
    }
    let mut format = None;
    let mut data = None;
    let mut at = 12usize;
    while at < bytes.len() {
        let header = bytes
            .get(at..at.checked_add(8).ok_or_else(bad)?)
            .ok_or_else(bad)?;
        let size = u32at(header, 4) as usize;
        at += 8;
        let end = at.checked_add(size).ok_or_else(bad)?;
        let chunk = bytes.get(at..end).ok_or_else(bad)?;
        match &header[..4] {
            b"fmt " => {
                if format.is_some()
                    || !(chunk.len() == 16 || (chunk.len() == 18 && u16at(chunk, 16) == 0))
                {
                    return Err(bad());
                }
                let encoding = u16at(chunk, 0);
                let channels = u16at(chunk, 2);
                let rate = u32at(chunk, 4);
                let bits = u16at(chunk, 14);
                let align = u32::from(channels)
                    .checked_mul(u32::from(bits) / 8)
                    .ok_or_else(bad)?;
                if u32::from(u16at(chunk, 12)) != align
                    || rate.checked_mul(align) != Some(u32at(chunk, 8))
                {
                    return Err(bad());
                }
                format = Some((encoding, channels, rate, bits));
            }
            b"data" => {
                if data.replace(chunk).is_some() {
                    return Err(bad());
                }
            }
            _ => {}
        }
        at = end.checked_add(size % 2).ok_or_else(bad)?;
        if at > bytes.len() {
            return Err(bad());
        }
    }
    let (encoding, channels, rate, bits) = format.ok_or_else(bad)?;
    let data = data.ok_or_else(bad)?;
    let width = usize::from(bits) / 8;
    let align = usize::from(channels)
        .checked_mul(width)
        .filter(|n| *n > 0)
        .ok_or_else(bad)?;
    if data.len() % align != 0 {
        return Err("WAV contains a partial sample frame".into());
    }
    let file = AudioFileV4 {
        path: path.into(),
        source_sha256: format!("{:x}", Sha256::digest(bytes)),
        encoding: match encoding {
            1 => "wavPcm",
            3 => "wavFloat",
            _ => return Err(bad()),
        }
        .into(),
        channels: u32::from(channels),
        sample_rate: rate,
        bits_per_sample: u32::from(bits),
        frames: DecimalU64((data.len() / align) as u64),
    };
    validate_descriptor(&file)?;
    let mut samples = Vec::with_capacity((file.frames.0 as usize).checked_mul(2).ok_or_else(bad)?);
    for frame in data.chunks_exact(align) {
        let sample = |channel: usize| -> Result<f32, String> {
            let s = &frame[channel * width..(channel + 1) * width];
            let value = match (encoding, bits) {
                (1, 8) => (f64::from(s[0]) - 128.) / 128.,
                (1, 16) => f64::from(i16::from_le_bytes(s.try_into().unwrap())) / 32768.,
                (1, 24) => f64::from(i32::from_le_bytes([0, s[0], s[1], s[2]]) >> 8) / 8388608.,
                (1, 32) => f64::from(i32::from_le_bytes(s.try_into().unwrap())) / 2147483648.,
                (3, 32) => f64::from(f32::from_le_bytes(s.try_into().unwrap())),
                (3, 64) => f64::from_le_bytes(s.try_into().unwrap()),
                _ => return Err(bad()),
            };
            if !value.is_finite() || !(-1. ..=1.).contains(&value) {
                return Err("WAV samples must be finite and normalized to -1..1".into());
            }
            Ok(value as f32)
        };
        let left = sample(0)?;
        let right = if channels == 1 { left } else { sample(1)? };
        samples.extend([left, right]);
    }
    Ok((file, samples))
}

fn resample(
    samples: &[f32],
    sample_rate: u32,
    tempo: f64,
    source_tempo: f64,
) -> Result<Arc<[f32]>, String> {
    if !tempo.is_finite()
        || !(30. ..=240.).contains(&tempo)
        || !source_tempo.is_finite()
        || !(30. ..=240.).contains(&source_tempo)
        || !(8_000..=192_000).contains(&sample_rate)
        || samples.is_empty()
        || samples.len() % 2 != 0
    {
        return Err("Invalid Re-Pitch sample rate, tempo or stereo buffer".into());
    }
    let input_frames = samples.len() / 2;
    let frames = output_frames(input_frames as u64, sample_rate, tempo, source_tempo)?;
    let count = (frames as usize)
        .checked_mul(2)
        .ok_or("Prepared audio sample count overflow")?;
    let step = f64::from(sample_rate) / 48_000. * tempo / source_tempo;
    let mut output = Vec::with_capacity(count);
    for frame in 0..frames as usize {
        let position = frame as f64 * step;
        let first = (position.floor() as usize).min(input_frames - 1);
        let next = (first + 1).min(input_frames - 1);
        let fraction = (position - position.floor()) as f32;
        for channel in 0..2 {
            output.push(
                samples[first * 2 + channel]
                    + (samples[next * 2 + channel] - samples[first * 2 + channel]) * fraction,
            );
        }
    }
    Ok(output.into())
}

fn output_frames(
    input_frames: u64,
    sample_rate: u32,
    tempo: f64,
    source_tempo: f64,
) -> Result<u64, String> {
    if !tempo.is_finite()
        || !(30. ..=240.).contains(&tempo)
        || !source_tempo.is_finite()
        || !(30. ..=240.).contains(&source_tempo)
        || !(8_000..=192_000).contains(&sample_rate)
    {
        return Err("Invalid Re-Pitch sample rate or tempo".into());
    }
    let frames =
        (input_frames as f64 / f64::from(sample_rate) * source_tempo / 60. * 48_000. * 60. / tempo)
            .round();
    if !(1. ..=MAX_AUDIO_FRAMES as f64).contains(&frames) {
        return Err("Prepared Re-Pitch audio exceeds the 60-second frame limit".into());
    }
    Ok(frames as u64)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn wav(format: u16, channels: u16, rate: u32, bits: u16, data: &[u8]) -> Vec<u8> {
        let mut bytes = b"RIFF\0\0\0\0WAVEfmt \x10\0\0\0".to_vec();
        bytes.extend(format.to_le_bytes());
        bytes.extend(channels.to_le_bytes());
        bytes.extend(rate.to_le_bytes());
        let align = channels * (bits / 8);
        bytes.extend((rate * u32::from(align)).to_le_bytes());
        bytes.extend(align.to_le_bytes());
        bytes.extend(bits.to_le_bytes());
        bytes.extend(b"data");
        bytes.extend((data.len() as u32).to_le_bytes());
        bytes.extend(data);
        if data.len() % 2 == 1 {
            bytes.push(0);
        }
        let len = bytes.len() as u32 - 8;
        bytes[4..8].copy_from_slice(&len.to_le_bytes());
        bytes
    }

    #[test]
    fn pcm_mono_is_normalized_and_duplicated_to_stereo() {
        let (file, samples) = decode(
            &wav(1, 1, 24_000, 16, &[0, 128, 0, 0, 255, 127]),
            "fixture.wav",
        )
        .unwrap();
        assert_eq!(file.frames.0, 3);
        assert_eq!(file.sample_rate, 24_000);
        assert_eq!(
            samples,
            vec![-1., -1., 0., 0., 32767. / 32768., 32767. / 32768.]
        );
    }

    #[test]
    fn repitch_resampling_changes_duration_and_preserves_stereo_channels() {
        let source = [0., 1., 0.5, -0.5, 1., 0.];
        let normal = resample(&source, 24_000, 120., 120.).unwrap();
        assert_eq!(
            &*normal,
            &[0., 1., 0.25, 0.25, 0.5, -0.5, 0.75, -0.25, 1., 0., 1., 0.]
        );
        let faster = resample(&source, 24_000, 240., 120.).unwrap();
        assert_eq!(&*faster, &source);
        let slower = resample(&source, 24_000, 60., 120.).unwrap();
        assert_eq!(slower.len(), 24);
        assert_eq!(&slower[8..10], &[0.5, -0.5]);
    }

    #[test]
    fn malformed_chunks_counts_encodings_and_float_samples_are_rejected() {
        let good = wav(1, 2, 48_000, 16, &[0; 8]);
        for size in 0..good.len() {
            assert!(
                decode(&good[..size], "short.wav").is_err(),
                "accepted truncation at {size}"
            );
        }
        for (offset, value) in [(4, u32::MAX), (16, u32::MAX), (28, 1), (40, u32::MAX)] {
            let mut bad = good.clone();
            bad[offset..offset + 4].copy_from_slice(&value.to_le_bytes());
            assert!(decode(&bad, "bad.wav").is_err());
        }
        for sample in [f32::NAN, f32::INFINITY, 1.01, -1.01] {
            assert!(decode(&wav(3, 1, 48_000, 32, &sample.to_le_bytes()), "float.wav").is_err());
        }
        assert!(decode(&wav(1, 2, 48_000, 24, &[0; 5]), "partial.wav").is_err());
        assert!(decode(&wav(6, 1, 48_000, 16, &[0; 2]), "alaw.wav").is_err());
        assert!(decode(&wav(1, 1, 0, 16, &[0; 2]), "zero-rate.wav").is_err());
        assert!(resample(&[0.; 2], 48_000, f64::NAN, 120.).is_err());
        let (_, float) =
            decode(&wav(3, 1, 48_000, 32, &0.25f32.to_le_bytes()), "float.wav").unwrap();
        assert_eq!(float, vec![0.25, 0.25]);
    }

    #[test]
    fn preparation_checks_actual_metadata_and_fingerprint() {
        let folder = std::env::temp_dir().join(format!("alive-wav-{}", std::process::id()));
        std::fs::create_dir_all(&folder).unwrap();
        let path = folder.join("input.wav");
        std::fs::write(&path, wav(1, 1, 48_000, 16, &[0; 8])).unwrap();
        let mut file = inspect(&path).unwrap();
        file.path = "input.wav".into();
        assert_eq!(
            prepare(&file, &folder.join("set.alive"), 120., 120.)
                .unwrap()
                .len(),
            8
        );
        file.frames = DecimalU64(3);
        assert!(prepare(&file, &folder.join("set.alive"), 120., 120.).is_err());
        file.frames = DecimalU64(4);
        std::fs::write(&path, wav(1, 1, 48_000, 16, &[1; 8])).unwrap();
        assert!(prepare(&file, &folder.join("set.alive"), 120., 120.).is_err());
        std::fs::remove_dir_all(folder).unwrap();
    }

    #[test]
    fn supported_integer_widths_and_float64_decode_signed_endpoints() {
        for (format, bits, data, want) in [
            (1, 8, vec![0, 128], vec![-1., -1., 0., 0.]),
            (1, 24, vec![0, 0, 128, 0, 0, 64], vec![-1., -1., 0.5, 0.5]),
            (
                1,
                32,
                vec![0, 0, 0, 128, 0, 0, 0, 64],
                vec![-1., -1., 0.5, 0.5],
            ),
            (3, 64, 0.5f64.to_le_bytes().to_vec(), vec![0.5, 0.5]),
        ] {
            let (_, samples) = decode(&wav(format, 1, 44_100, bits, &data), "width.wav").unwrap();
            assert_eq!(samples, want);
        }
        let (_, stereo) = decode(&wav(1, 2, 48_000, 16, &[0, 64, 0, 192]), "stereo.wav").unwrap();
        assert_eq!(stereo, vec![0.5, -0.5]);
    }

    #[test]
    fn chunk_padding_and_descriptor_limits_are_checked_before_pcm_allocation() {
        let good = wav(1, 1, 48_000, 16, &[0; 2]);
        let mut duplicate = good.clone();
        duplicate.extend(&good[36..]);
        let len = duplicate.len() as u32 - 8;
        duplicate[4..8].copy_from_slice(&len.to_le_bytes());
        assert!(decode(&duplicate, "duplicate.wav").is_err());
        let mut unknown = good.clone();
        unknown.extend(b"JUNK\x01\0\0\0\x42\0");
        let len = unknown.len() as u32 - 8;
        unknown[4..8].copy_from_slice(&len.to_le_bytes());
        assert!(decode(&unknown, "unknown.wav").is_ok());
        unknown.pop();
        let len = unknown.len() as u32 - 8;
        unknown[4..8].copy_from_slice(&len.to_le_bytes());
        assert!(decode(&unknown, "padding.wav").is_err());
        let (mut file, _) = decode(&good, "good.wav").unwrap();
        file.frames = DecimalU64(u64::MAX);
        assert!(validate_descriptor(&file).is_err());
        assert!(resample(&[0.; 2], 48_000, 29., 120.).is_err());
        assert!(resample(&[0.; 3], 48_000, 120., 120.).is_err());
    }

    #[test]
    fn repitch_capacity_is_rejected_before_opening_the_audio_file() {
        let (mut file, _) = decode(
            &wav(1, 1, 48_000, 16, &[0; 2]),
            "/definitely-missing-audio.wav",
        )
        .unwrap();
        file.frames = DecimalU64(2_880_000);
        assert_eq!(
            output_frames(file.frames.0, 48_000, 120., 120.).unwrap(),
            2_880_000
        );
        let error = prepare(&file, Path::new("/tmp/set.alive"), 30., 240.).unwrap_err();
        assert!(error.contains("60-second"), "{error}");
        file.frames = DecimalU64(2_880_001);
        assert!(validate_descriptor(&file).is_err());
        file.frames = DecimalU64(11_520_000);
        file.sample_rate = 192_000;
        assert!(validate_descriptor(&file).is_ok());
        file.bits_per_sample = 32;
        assert!(validate_descriptor(&file).unwrap_err().contains("24 MiB"));
    }
}
