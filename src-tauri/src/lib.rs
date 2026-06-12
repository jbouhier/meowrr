use std::sync::Mutex;
use tauri::{Manager, PhysicalPosition, PhysicalSize, Position, Size};

#[derive(Clone, Copy, PartialEq, Eq)]
#[allow(dead_code)]
enum FullscreenMode {
    Off,
    Native,
    Simple,
}

struct PreFullscreen {
    saved: Mutex<Option<(PhysicalSize<u32>, PhysicalPosition<i32>)>>,
    mode: Mutex<FullscreenMode>,
}


#[tauri::command]
fn close_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[tauri::command]
fn set_always_on_top(app: tauri::AppHandle, value: bool) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.set_always_on_top(value);
    }
}


#[tauri::command]
fn toggle_maximize(app: tauri::AppHandle) {
    let Some(win) = app.get_webview_window("main") else { return };

    let state = app.state::<PreFullscreen>();
    let current_mode = *state.mode.lock().unwrap();

    match current_mode {
        FullscreenMode::Off => {
            let size = win.outer_size().ok();
            let pos = win.outer_position().ok();
            *state.saved.lock().unwrap() = size.zip(pos);

            #[cfg(target_os = "macos")]
            {
                let _ = win.set_simple_fullscreen(true);
                *state.mode.lock().unwrap() = FullscreenMode::Simple;
            }
            #[cfg(not(target_os = "macos"))]
            {
                let _ = win.set_fullscreen(true);
                *state.mode.lock().unwrap() = FullscreenMode::Native;
            }

            let _ = win.set_focus();
        }
        FullscreenMode::Simple => {
            #[cfg(target_os = "macos")]
            {
                let _ = win.set_simple_fullscreen(false);
            }
            #[cfg(not(target_os = "macos"))]
            {
                let _ = win.set_fullscreen(false);
            }
            *state.mode.lock().unwrap() = FullscreenMode::Off;

            if let Some((size, pos)) = state.saved.lock().unwrap().take() {
                let _ = win.set_size(Size::Physical(size));
                let _ = win.set_position(Position::Physical(pos));
            }
            let _ = win.set_focus();
        }
        FullscreenMode::Native => {
            let _ = win.set_fullscreen(false);
            *state.mode.lock().unwrap() = FullscreenMode::Off;

            if let Some((size, pos)) = state.saved.lock().unwrap().take() {
                let _ = win.set_size(Size::Physical(size));
                let _ = win.set_position(Position::Physical(pos));
            }
            let _ = win.set_focus();
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(PreFullscreen {
            saved: Mutex::new(None),
            mode: Mutex::new(FullscreenMode::Off),
        })
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .invoke_handler(tauri::generate_handler![close_app, toggle_maximize, set_always_on_top])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
