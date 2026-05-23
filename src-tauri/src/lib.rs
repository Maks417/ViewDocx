mod cache;
mod commands;
mod open_files;
mod pdf;
mod recent;

use cache::DocumentCache;
use commands::{
    clear_recent_files, open_file_dialog, read_document, read_document_bytes, recent_files,
    save_as_pdf,
};
use open_files::{handle_open_files, parse_startup_args, take_pending_open_files, OpenFileQueue};
use tauri::Manager;

#[cfg(desktop)]
const MENU_EVENT_MAP: &[(&str, &str)] = &[
    ("open", "menu-open"),
    ("save-pdf", "menu-save-pdf"),
    ("print", "menu-print"),
    ("about", "menu-about"),
];

#[cfg(desktop)]
fn install_app_menu(app: &tauri::App) -> tauri::Result<()> {
    use std::collections::HashMap;
    use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
    use tauri::Emitter;

    let open_item = MenuItem::with_id(app, "open", "Open…", true, None::<&str>)?;
    let save_pdf_item = MenuItem::with_id(app, "save-pdf", "Save as PDF…", true, None::<&str>)?;
    let print_item = MenuItem::with_id(app, "print", "Print", true, None::<&str>)?;
    let about_item = MenuItem::with_id(app, "about", "About ViewDocx", true, None::<&str>)?;

    let file_menu = Submenu::with_items(
        app,
        "File",
        true,
        &[
            &open_item,
            &PredefinedMenuItem::separator(app)?,
            &save_pdf_item,
            &print_item,
        ],
    )?;
    let help_menu = Submenu::with_items(app, "Help", true, &[&about_item])?;

    let menu = Menu::with_items(app, &[&file_menu, &help_menu])?;
    app.set_menu(menu)?;

    let lookup: HashMap<&str, &str> = MENU_EVENT_MAP.iter().copied().collect();
    app.on_menu_event(move |app, event| {
        let Some(event_name) = lookup.get(event.id().as_ref()) else {
            return;
        };
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.emit(event_name, ());
        }
    });

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            open_file_dialog,
            read_document,
            read_document_bytes,
            recent_files,
            clear_recent_files,
            save_as_pdf,
            take_pending_open_files,
        ])
        .setup(|app| {
            app.manage(DocumentCache::new());
            app.manage(OpenFileQueue::new());
            let store = recent::RecentStore::new(app.handle())?;
            app.manage(store);

            #[cfg(any(windows, target_os = "linux"))]
            {
                let files = parse_startup_args();
                handle_open_files(app.handle(), files, false);
            }

            #[cfg(desktop)]
            install_app_menu(app)?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(
            #[allow(unused_variables)]
            |app, event| {
                #[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
                if let tauri::RunEvent::Opened { urls } = event {
                    let files = urls
                        .into_iter()
                        .filter_map(|url| url.to_file_path().ok())
                        .collect::<Vec<_>>();
                    handle_open_files(app, files, true);
                }
            },
        );
}
