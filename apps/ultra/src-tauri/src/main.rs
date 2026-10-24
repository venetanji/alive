#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    ultra_desktop::run_ultra(|| tauri::generate_context!());
}
