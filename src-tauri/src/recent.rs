use crate::commands::AppError;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

const MAX_RECENT: usize = 10;

pub struct RecentStore {
    path: PathBuf,
    entries: Mutex<Vec<String>>,
}

impl RecentStore {
    pub fn new(app: &AppHandle) -> Result<Self, AppError> {
        let dir = app.path().app_data_dir().map_err(|e| {
            AppError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))
        })?;
        fs::create_dir_all(&dir)?;
        let path = dir.join("recent.json");
        let entries = if path.is_file() {
            let data = fs::read_to_string(&path)?;
            serde_json::from_str(&data).unwrap_or_default()
        } else {
            Vec::new()
        };
        Ok(Self {
            path,
            entries: Mutex::new(entries),
        })
    }

    pub fn list(&self) -> Vec<String> {
        self.entries
            .lock()
            .map(|e| e.clone())
            .unwrap_or_default()
    }

    pub fn add(&self, file_path: &Path) -> Result<(), AppError> {
        let canonical = fs::canonicalize(file_path).unwrap_or_else(|_| file_path.to_path_buf());
        let path_str = canonical.to_string_lossy().into_owned();

        let mut entries = self.entries.lock().map_err(|_| {
            AppError::Io(std::io::Error::new(
                std::io::ErrorKind::Other,
                "recent store lock poisoned",
            ))
        })?;

        entries.retain(|p| p != &path_str);
        entries.insert(0, path_str);
        entries.truncate(MAX_RECENT);

        let json = serde_json::to_string_pretty(&*entries).map_err(|e| {
            AppError::Io(std::io::Error::new(std::io::ErrorKind::InvalidData, e))
        })?;
        fs::write(&self.path, json)?;
        Ok(())
    }

    pub fn clear(&self) -> Result<(), AppError> {
        let mut entries = self.entries.lock().map_err(|_| {
            AppError::Io(std::io::Error::new(
                std::io::ErrorKind::Other,
                "recent store lock poisoned",
            ))
        })?;
        entries.clear();
        if self.path.is_file() {
            fs::remove_file(&self.path)?;
        }
        Ok(())
    }
}

