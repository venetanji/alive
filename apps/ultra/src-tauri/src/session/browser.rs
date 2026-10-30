//! Read-only locations for the small catalog of bundled Ultra devices.
use std::path::{Path, PathBuf};

#[derive(Debug, PartialEq, Eq)]
pub struct BundledDevice {
    pub id: &'static str,
    pub name: &'static str,
    pub kind: &'static str,
    pub path: PathBuf,
}

pub fn catalog(
    resources: &Path,
    executable_dir: &Path,
    source: &Path,
) -> Result<Vec<BundledDevice>, String> {
    [
        (
            "subtractive",
            "Subtractive",
            "instrument",
            "subtractive.ultra",
        ),
        ("utility", "Stereo Utility", "effect", "utility.ultra"),
        (
            "stereo-lowpass",
            "Stereo Lowpass",
            "effect",
            "stereo-lowpass.ultra",
        ),
    ]
    .into_iter()
    .map(|(id, name, kind, filename)| {
        let relative = Path::new("alive-session/ultra/examples").join(filename);
        let path = [
            resources.join(&relative),
            executable_dir.join("../lib/Ultra Research").join(&relative),
            source.join("../examples").join(filename),
        ]
        .into_iter()
        .find(|path| path.is_file())
        .ok_or_else(|| format!("Bundled device is unavailable: {filename}"))?
        .canonicalize()
        .map_err(|error| format!("Cannot resolve bundled device {filename}: {error}"))?;
        Ok(BundledDevice {
            id,
            name,
            kind,
            path,
        })
    })
    .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{
        fs,
        sync::atomic::{AtomicU64, Ordering},
    };

    struct Fixture(PathBuf);

    impl Fixture {
        fn new() -> Self {
            static NEXT: AtomicU64 = AtomicU64::new(0);
            let unique = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos();
            let root = std::env::temp_dir().join(format!(
                "alive-browser-{}-{unique}-{}",
                std::process::id(),
                NEXT.fetch_add(1, Ordering::Relaxed)
            ));
            fs::create_dir_all(root.join("usr/bin")).unwrap();
            Self(root)
        }

        fn file(&self, relative: &str) -> PathBuf {
            let path = self.0.join(relative);
            fs::create_dir_all(path.parent().unwrap()).unwrap();
            fs::write(&path, b"catalog fixture; not a device document").unwrap();
            path
        }

        fn bundled(&self, directory: &str) {
            for file in ["subtractive.ultra", "utility.ultra", "stereo-lowpass.ultra"] {
                self.file(&format!("{directory}/{file}"));
            }
        }
    }

    impl Drop for Fixture {
        fn drop(&mut self) {
            fs::remove_dir_all(&self.0).unwrap();
        }
    }

    #[test]
    fn installed_companion_catalog_works_without_a_source_tree() {
        let fixture = Fixture::new();
        fixture.bundled("usr/lib/Ultra Research/alive-session/ultra/examples");
        fixture.file("usr/lib/Ultra Research/alive-session/ultra/examples/unlisted.ultra");

        let devices = catalog(
            &fixture.0.join("usr/lib/Alive"),
            &fixture.0.join("usr/bin"),
            &fixture.0.join("missing-source"),
        )
        .unwrap();

        assert_eq!(
            devices
                .iter()
                .map(|device| (device.id, device.name, device.kind))
                .collect::<Vec<_>>(),
            vec![
                ("subtractive", "Subtractive", "instrument"),
                ("utility", "Stereo Utility", "effect"),
                ("stereo-lowpass", "Stereo Lowpass", "effect"),
            ]
        );
        for (device, filename) in
            devices
                .iter()
                .zip(["subtractive.ultra", "utility.ultra", "stereo-lowpass.ultra"])
        {
            assert_eq!(
                device.path.canonicalize().unwrap(),
                fixture
                    .0
                    .join("usr/lib/Ultra Research/alive-session/ultra/examples")
                    .join(filename)
            );
        }
    }

    #[test]
    fn resource_catalog_takes_priority_over_companion_and_source() {
        let fixture = Fixture::new();
        fixture.bundled("resources/alive-session/ultra/examples");
        fixture.bundled("usr/lib/Ultra Research/alive-session/ultra/examples");
        fixture.bundled("source/examples");
        fs::create_dir_all(fixture.0.join("source/src-tauri")).unwrap();

        let devices = catalog(
            &fixture.0.join("resources"),
            &fixture.0.join("usr/bin"),
            &fixture.0.join("source/src-tauri"),
        )
        .unwrap();

        assert_eq!(
            devices[0].path,
            fixture
                .0
                .join("resources/alive-session/ultra/examples/subtractive.ultra")
        );
        assert!(devices
            .iter()
            .all(|device| device.path.starts_with(fixture.0.join("resources"))));
    }

    #[test]
    fn source_catalog_is_available_when_installed_locations_are_missing() {
        let fixture = Fixture::new();
        fixture.bundled("source/examples");
        fs::create_dir_all(fixture.0.join("source/src-tauri")).unwrap();

        let devices = catalog(
            &fixture.0.join("missing-resources"),
            &fixture.0.join("usr/bin"),
            &fixture.0.join("source/src-tauri"),
        )
        .unwrap();

        assert_eq!(
            devices[0].path,
            fixture.0.join("source/examples/subtractive.ultra")
        );
        assert_eq!(
            devices[1].path.canonicalize().unwrap(),
            fixture.0.join("source/examples/utility.ultra")
        );
        assert_eq!(
            devices[2].path.canonicalize().unwrap(),
            fixture.0.join("source/examples/stereo-lowpass.ultra")
        );
    }

    #[test]
    fn a_missing_device_returns_an_explicit_error_instead_of_a_partial_catalog() {
        let fixture = Fixture::new();
        fixture.file("source/examples/subtractive.ultra");
        fixture.file("source/examples/utility.ultra");
        fs::create_dir_all(fixture.0.join("source/src-tauri")).unwrap();

        let error = catalog(
            &fixture.0.join("missing-resources"),
            &fixture.0.join("usr/bin"),
            &fixture.0.join("source/src-tauri"),
        )
        .unwrap_err();

        assert!(error.contains("unavailable"), "{error}");
        assert!(error.contains("stereo-lowpass.ultra"), "{error}");
    }

    #[test]
    fn a_directory_with_a_device_name_is_not_a_catalog_file() {
        let fixture = Fixture::new();
        fs::create_dir_all(
            fixture
                .0
                .join("resources/alive-session/ultra/examples/subtractive.ultra"),
        )
        .unwrap();

        let error = catalog(
            &fixture.0.join("resources"),
            &fixture.0.join("usr/bin"),
            &fixture.0.join("missing-source"),
        )
        .unwrap_err();

        assert!(error.contains("subtractive.ultra"), "{error}");
    }
}
