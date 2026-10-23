use std::{env, path::PathBuf};
fn main() {
    let native = env::var("ULTRA_NATIVE_LIB_DIR").expect("Run apps/ultra/build.sh to build the native engine before Cargo");
    println!("cargo:rustc-link-search=native={native}");
    println!("cargo:rustc-link-lib=dylib=ultra_native");
    println!("cargo:rustc-link-arg=-Wl,-rpath,$ORIGIN");
    println!("cargo:rerun-if-env-changed=ULTRA_NATIVE_LIB_DIR");
    println!("cargo:rerun-if-changed={}", PathBuf::from(native).join("libultra_native.so").display());
    tauri_build::build()
}
