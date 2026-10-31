#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    ultra_desktop::run_alive(context);
}

fn context() -> tauri::Context<tauri::Wry> {
    tauri::generate_context!()
}

#[cfg(test)]
mod tests {
    #[test]
    fn session_and_editor_context_can_listen_and_close_only_owned_windows() {
        let mut context = super::context();
        let authority = context.runtime_authority_mut();
        for command in ["plugin:event|listen", "plugin:event|unlisten", "plugin:window|close"] {
            for label in ["main", "alive-editor-1"] {
                assert!(authority.resolve_access(command, label, label, &tauri::ipc::Origin::Local).is_some(),
                    "{label} must be allowed to invoke {command}");
            }
            assert!(authority.resolve_access(command, "patch-1", "patch-1", &tauri::ipc::Origin::Local).is_none());
        }
    }
}
