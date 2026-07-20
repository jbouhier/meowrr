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
fn set_always_on_top(app: tauri::AppHandle, value: bool) -> Result<bool, String> {
    let win = app
        .get_webview_window("main")
        .ok_or_else(|| "main window is unavailable".to_string())?;
    win.set_always_on_top(value)
        .map_err(|error| error.to_string())?;
    Ok(value)
}

#[tauri::command]
fn toggle_maximize(app: tauri::AppHandle) -> Result<bool, String> {
    let win = app
        .get_webview_window("main")
        .ok_or_else(|| "main window is unavailable".to_string())?;

    let state = app.state::<PreFullscreen>();
    let current_mode = *state
        .mode
        .lock()
        .map_err(|_| "fullscreen state is unavailable".to_string())?;

    match current_mode {
        FullscreenMode::Off => {
            let size = win.outer_size().ok();
            let pos = win.outer_position().ok();
            *state
                .saved
                .lock()
                .map_err(|_| "saved window state is unavailable".to_string())? = size.zip(pos);

            #[cfg(target_os = "macos")]
            {
                win.set_simple_fullscreen(true)
                    .map_err(|error| error.to_string())?;
                *state
                    .mode
                    .lock()
                    .map_err(|_| "fullscreen state is unavailable".to_string())? =
                    FullscreenMode::Simple;
            }
            #[cfg(not(target_os = "macos"))]
            {
                win.set_fullscreen(true)
                    .map_err(|error| error.to_string())?;
                *state
                    .mode
                    .lock()
                    .map_err(|_| "fullscreen state is unavailable".to_string())? =
                    FullscreenMode::Native;
            }

            let _ = win.set_focus();
            Ok(true)
        }
        FullscreenMode::Simple => {
            #[cfg(target_os = "macos")]
            {
                win.set_simple_fullscreen(false)
                    .map_err(|error| error.to_string())?;
            }
            #[cfg(not(target_os = "macos"))]
            {
                win.set_fullscreen(false)
                    .map_err(|error| error.to_string())?;
            }
            *state
                .mode
                .lock()
                .map_err(|_| "fullscreen state is unavailable".to_string())? = FullscreenMode::Off;

            if let Some((size, pos)) = state
                .saved
                .lock()
                .map_err(|_| "saved window state is unavailable".to_string())?
                .take()
            {
                let _ = win.set_size(Size::Physical(size));
                let _ = win.set_position(Position::Physical(pos));
            }
            let _ = win.set_focus();
            Ok(false)
        }
        FullscreenMode::Native => {
            win.set_fullscreen(false)
                .map_err(|error| error.to_string())?;
            *state
                .mode
                .lock()
                .map_err(|_| "fullscreen state is unavailable".to_string())? = FullscreenMode::Off;

            if let Some((size, pos)) = state
                .saved
                .lock()
                .map_err(|_| "saved window state is unavailable".to_string())?
                .take()
            {
                let _ = win.set_size(Size::Physical(size));
                let _ = win.set_position(Position::Physical(pos));
            }
            let _ = win.set_focus();
            Ok(false)
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
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            close_app,
            toggle_maximize,
            set_always_on_top,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
