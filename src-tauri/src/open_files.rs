use std::path::{Path, PathBuf};
use std::sync::Mutex;

use tauri::{AppHandle, Emitter, Manager, State};

const SUPPORTED_EXTENSIONS: &[&str] = &["docx", "doc"];

fn is_supported_path(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| {
            let lower = ext.to_ascii_lowercase();
            SUPPORTED_EXTENSIONS.iter().any(|e| *e == lower)
        })
        .unwrap_or(false)
}

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
    std::env::args()
        .skip(1)
        .filter(|arg| !arg.starts_with('-'))
        .filter_map(|arg| parse_path_arg(&arg))
        .collect()
}

fn parse_path_arg(value: &str) -> Option<PathBuf> {
    if value.is_empty() {
        return None;
    }

    if value.starts_with("file://") {
        if let Ok(url) = url::Url::parse(value) {
            if let Ok(path) = url.to_file_path() {
                return Some(path);
            }
        }
        return None;
    }

    Some(PathBuf::from(value))
}

pub fn handle_open_files(app: &AppHandle, paths: Vec<PathBuf>, notify_frontend: bool) {
    let paths: Vec<PathBuf> = paths
        .into_iter()
        .filter(|path| is_supported_path(path) && path.is_file())
        .collect();

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
