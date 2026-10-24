#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    ultra_desktop::run_alive(|| tauri::generate_context!("tauri.alive.conf.json"));
}
