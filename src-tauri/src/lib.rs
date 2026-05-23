mod cache;
mod commands;
mod recent;

use cache::DocumentCache;
use commands::{
    clear_recent_files, open_file_dialog, read_document, read_document_bytes, recent_files,
};
use tauri::Manager;

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
        ])
        .setup(|app| {
            app.manage(DocumentCache::new());
            let store = recent::RecentStore::new(app.handle())?;
            app.manage(store);

            #[cfg(desktop)]
            {
                use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
                use tauri::Emitter;

                let open_item = MenuItem::with_id(app, "open", "Open…", true, None::<&str>)?;
                let print_item = MenuItem::with_id(app, "print", "Print", true, None::<&str>)?;
                let file_menu = Submenu::with_items(
                    app,
                    "File",
                    true,
                    &[&open_item, &PredefinedMenuItem::separator(app)?, &print_item],
                )?;
                let menu = Menu::with_items(
                    app,
                    &[
                        &file_menu,
                        &Submenu::with_items(
                            app,
                            "Help",
                            true,
                            &[&MenuItem::with_id(app, "about", "About DocView", true, None::<&str>)?],
                        )?,
                    ],
                )?;
                app.set_menu(menu)?;

                app.on_menu_event(|app, event| {
                    let id = event.id().as_ref();
                    if let Some(window) = app.get_webview_window("main") {
                        match id {
                            "open" => {
                                let _ = window.emit("menu-open", ());
                            }
                            "print" => {
                                let _ = window.emit("menu-print", ());
                            }
                            _ => {}
                        }
                    }
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
