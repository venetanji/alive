use std::{env, path::PathBuf};
fn main() {
    let native = env::var("ULTRA_NATIVE_LIB_DIR")
        .expect("Build the Ultra native engine first (build.sh or scripts/release.py)");
    println!("cargo:rustc-link-search=native={native}");
    println!("cargo:rustc-link-lib=dylib=ultra_native");
    let library = match env::var("CARGO_CFG_TARGET_OS").unwrap().as_str() {
        "linux" => {
            // Adjacent developer binary, and Tauri's installed resource directory.
            println!("cargo:rustc-link-arg=-Wl,-rpath,$ORIGIN:$ORIGIN/../lib/Ultra Research");
            "libultra_native.so"
        }
        "macos" => {
            println!("cargo:rustc-link-arg=-Wl,-rpath,@loader_path");
            println!("cargo:rustc-link-arg=-Wl,-rpath,@executable_path/../Frameworks");
            "libultra_native.dylib"
        }
        "windows" => "ultra_native.lib",
        target => panic!("Unsupported Ultra desktop target: {target}"),
    };
    println!("cargo:rerun-if-env-changed=ULTRA_NATIVE_LIB_DIR");
    println!("cargo:rerun-if-changed={}", PathBuf::from(native).join(library).display());
    tauri_build::build()
}
