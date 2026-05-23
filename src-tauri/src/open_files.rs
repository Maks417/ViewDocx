use std::path::PathBuf;
use std::sync::Mutex;

use tauri::{AppHandle, Emitter, Manager, State};

pub struct OpenFileQueue(Mutex<Vec<String>>);

impl OpenFileQueue {
    pub fn new() -> Self {
        Self(Mutex::new(Vec::new()))
    }

    fn push(&self, paths: &[PathBuf]) {
        if paths.is_empty() {
            return;
        }

        let mut queue = self.0.lock().expect("open file queue poisoned");
        for path in paths {
            queue.push(path.to_string_lossy().into_owned());
        }
    }

    pub fn take_all(&self) -> Vec<String> {
        self.0.lock().expect("open file queue poisoned").drain(..).collect()
    }
}

#[tauri::command]
pub fn take_pending_open_files(queue: State<'_, OpenFileQueue>) -> Vec<String> {
    queue.take_all()
}

pub fn parse_startup_args() -> Vec<PathBuf> {
    let mut files = Vec::new();

    for maybe_file in std::env::args().skip(1) {
        if maybe_file.starts_with('-') {
            continue;
        }

        if let Ok(url) = url::Url::parse(&maybe_file) {
            if let Ok(path) = url.to_file_path() {
                files.push(path);
            }
        } else {
            files.push(PathBuf::from(maybe_file));
        }
    }

    files
}

pub fn handle_open_files(app: &AppHandle, paths: Vec<PathBuf>, notify_frontend: bool) {
  let paths = paths
      .into_iter()
      .filter(|path| path.is_file())
      .collect::<Vec<_>>();

    if paths.is_empty() {
        return;
    }

    app.state::<OpenFileQueue>().push(&paths);

    if !notify_frontend {
        return;
    }

    if let Some(window) = app.get_webview_window("main") {
        for path in paths {
            let path_str = path.to_string_lossy().into_owned();
            let _ = window.emit("open-file", path_str);
        }
    }
}
