use std::sync::Mutex;
use tauri::{Manager, PhysicalPosition, PhysicalSize, Position, Size};

struct PreFullscreen(Mutex<Option<(PhysicalSize<u32>, PhysicalPosition<i32>)>>);


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
    if let Some(win) = app.get_webview_window("main") {
        if win.is_fullscreen().unwrap_or(false) {
            let _ = win.set_fullscreen(false);
            let saved = app.state::<PreFullscreen>().0.lock().unwrap().take();
            if let Some((size, pos)) = saved {
                let _ = win.set_size(Size::Physical(size));
                let _ = win.set_position(Position::Physical(pos));
            }
            let _ = win.set_focus();
        } else {
            let size = win.outer_size().ok();
            let pos  = win.outer_position().ok();
            *app.state::<PreFullscreen>().0.lock().unwrap() = size.zip(pos);
            let _ = win.set_fullscreen(true);
            let _ = win.set_focus();
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(PreFullscreen(Mutex::new(None)))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .invoke_handler(tauri::generate_handler![close_app, toggle_maximize, set_always_on_top])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
