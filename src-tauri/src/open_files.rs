use std::path::PathBuf;
use std::sync::Mutex;

use tauri::{AppHandle, Emitter, Manager, State};

fn debug_log(msg: &str) {
    if let Some(dir) = dirs_next::data_local_dir() {
        let log_dir = dir.join("ViewDocx");
        let _ = std::fs::create_dir_all(&log_dir);
        let log_path = log_dir.join("startup.log");
        use std::io::Write;
        if let Ok(mut f) = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_path)
        {
            let ts = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0);
            let _ = writeln!(f, "[{}] {}", ts, msg);
        }
    }
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
    let args: Vec<String> = std::env::args().collect();
    debug_log(&format!("startup argv: {:?}", args));

    let mut files = Vec::new();

    for maybe_file in args.into_iter().skip(1) {
        if maybe_file.starts_with('-') {
            continue;
        }

        if let Some(path) = parse_path_arg(&maybe_file) {
            debug_log(&format!("parsed path: {}", path.display()));
            files.push(path);
        } else {
            debug_log(&format!("skipped arg: {}", maybe_file));
        }
    }

    files
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
    debug_log(&format!("handle_open_files received {} paths", paths.len()));

    let paths = paths
        .into_iter()
        .filter(|path| {
            let exists = path.is_file();
            if !exists {
                debug_log(&format!("dropped non-existent path: {}", path.display()));
            }
            exists
        })
        .collect::<Vec<_>>();

    if paths.is_empty() {
        debug_log("handle_open_files: no usable paths");
        return;
    }

    app.state::<OpenFileQueue>().push(&paths);
    debug_log(&format!("queued {} path(s) for frontend", paths.len()));

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
