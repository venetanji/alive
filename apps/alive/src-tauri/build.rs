fn main() {
    match std::env::var("CARGO_CFG_TARGET_OS").unwrap().as_str() {
        "linux" => println!("cargo:rustc-link-arg=-Wl,-rpath,$ORIGIN:$ORIGIN/../lib/Alive"),
        "macos" => {
            println!("cargo:rustc-link-arg=-Wl,-rpath,@loader_path");
            println!("cargo:rustc-link-arg=-Wl,-rpath,@executable_path/../Frameworks");
        }
        "windows" => {}
        target => panic!("Unsupported Alive desktop target: {target}"),
    }
    tauri_build::build()
}
