#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
fn main() {
    ultra_desktop::run_analog_test(tauri::generate_context!("tauri.analog-test.conf.json"));
}
