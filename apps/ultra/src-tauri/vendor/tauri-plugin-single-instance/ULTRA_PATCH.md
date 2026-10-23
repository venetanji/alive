# Ultra Linux Secondary Exit Patch

This directory contains the source and normalized Cargo manifest from the
published `tauri-plugin-single-instance` 2.3.4 crate. The upstream MIT, Apache-2.0
and SPDX license files are included unchanged. The original manifest and VCS
identity are preserved alongside the source.

- Crate: https://crates.io/crates/tauri-plugin-single-instance/2.3.4
- Crate archive SHA256: `fb9cac815bf11c4a80fb498666bcdad66d65b89e3ae24669e47806febb76389c`
- Upstream repository: https://github.com/tauri-apps/plugins-workspace
- Upstream commit: `51b430be986ed98635c02ba504f6f30a35771c01`
- Upstream subdirectory: `plugins/single-instance`

The only source change is the Linux secondary-instance termination call in
`src/platform_impl/linux.rs`: after the existing IPC attempt and Tauri cleanup,
call `libc::_exit(0)` instead of `std::process::exit(0)`. A Linux-only dependency
on the already locked libc 0.2.191 supports that call. No non-Linux source changes.

Tauri constructs Tao's X11 device-event worker before initializing this plugin.
Ultra's Linux crash cores show that worker in `XISelectEvents` / `XextAddDisplay`
while the secondary main thread runs libc exit and shared-library finalizers.
The secondary has not reached document/audio setup, so immediate process
termination safely reclaims its unused resources without racing those workers.
The primary retains its ordinary Tauri and audio shutdown behavior.

`apps/ultra/tests/check_document_startup.py` preloads a test library into secondary
processes only. It verifies the library loaded, file delivery succeeded, normal
exit status is zero, and its registered atexit marker was not called. The same
private test checks file delivery during initialization and 32 later deliveries
of the same canonical path without adding documents. The previous termination
call fails the finalizer assertion deterministically.

Keep this patch local until an upstream release provides equivalent secondary
termination behavior. Recheck this source delta and the private regression when
updating the pinned plugin. Do not edit a Cargo registry cache to apply the fix.
