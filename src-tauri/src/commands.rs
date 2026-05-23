use crate::cache::DocumentCache;
use crate::recent::RecentStore;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::ipc::Response;
use tauri::{AppHandle, State};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("file not found: {0}")]
    NotFound(String),
    #[error("failed to read file: {0}")]
    Io(#[from] std::io::Error),
    #[error("unsupported document format")]
    UnsupportedFormat,
    #[error("file is empty")]
    Empty,
    #[error("{0}")]
    PdfFailed(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileHandle {
    pub path: String,
    pub name: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum DocumentKind {
    Docx,
    LegacyDoc,
    Unknown,
}

pub fn detect_kind(bytes: &[u8]) -> DocumentKind {
    if bytes.len() >= 4 && bytes[0..4] == [0x50, 0x4B, 0x03, 0x04] {
        return DocumentKind::Docx;
    }
    if bytes.len() >= 8 && bytes[0..8] == [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1] {
        return DocumentKind::LegacyDoc;
    }
    DocumentKind::Unknown
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentInfo {
    pub kind: DocumentKind,
    pub path: String,
    pub name: String,
}

fn read_and_validate(path: &str) -> Result<(PathBuf, Vec<u8>, DocumentKind), AppError> {
    let path_buf = PathBuf::from(path);
    if !path_buf.is_file() {
        return Err(AppError::NotFound(path.to_string()));
    }

    let bytes = fs::read(&path_buf)?;
    if bytes.is_empty() {
        return Err(AppError::Empty);
    }

    let kind = detect_kind(&bytes);
    if kind == DocumentKind::Unknown {
        return Err(AppError::UnsupportedFormat);
    }

    Ok((path_buf, bytes, kind))
}

fn document_name(path_buf: &Path) -> String {
    path_buf
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_else(|| path_buf.to_string_lossy().into_owned())
}

#[tauri::command]
pub async fn open_file_dialog(app: AppHandle) -> Result<Option<FileHandle>, AppError> {
    use tauri_plugin_dialog::DialogExt;

    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .add_filter("Word documents", &["docx", "doc"])
        .pick_file(move |path| {
            let _ = tx.send(path);
        });

    let path = rx.await.map_err(|_| {
        AppError::Io(std::io::Error::other("file dialog was cancelled"))
    })?;

    Ok(path.map(|p| {
        let path_buf = p.into_path().unwrap_or_default();
        let path_str = path_buf.to_string_lossy().into_owned();
        let name = document_name(&path_buf);
        FileHandle {
            path: path_str,
            name,
        }
    }))
}

#[tauri::command]
pub async fn read_document(
    path: String,
    store: State<'_, RecentStore>,
    cache: State<'_, DocumentCache>,
) -> Result<DocumentInfo, AppError> {
    let (path_buf, bytes, kind) = read_and_validate(&path)?;
    let name = document_name(&path_buf);
    let path_str = path_buf.to_string_lossy().into_owned();

    store.add(&path_buf)?;
    cache.store(path_str.clone(), bytes);

    Ok(DocumentInfo {
        kind,
        path: path_str,
        name,
    })
}

#[tauri::command]
pub async fn read_document_bytes(
    path: String,
    cache: State<'_, DocumentCache>,
) -> Result<Response, AppError> {
    if let Some(bytes) = cache.take(&path) {
        return Ok(Response::new(bytes));
    }

    let (_, bytes, _) = read_and_validate(&path)?;
    Ok(Response::new(bytes))
}

#[tauri::command]
pub fn recent_files(store: State<'_, RecentStore>) -> Result<Vec<String>, AppError> {
    Ok(store.list())
}

#[tauri::command]
pub fn clear_recent_files(store: State<'_, RecentStore>) -> Result<(), AppError> {
    store.clear()?;
    Ok(())
}

#[tauri::command]
pub async fn save_as_pdf(window: tauri::WebviewWindow, path: String) -> Result<(), AppError> {
    crate::pdf::print_to_pdf(window, path)
        .await
        .map_err(AppError::PdfFailed)
}
