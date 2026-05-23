use std::sync::Mutex;

pub struct DocumentCache {
    inner: Mutex<Option<(String, Vec<u8>)>>,
}

impl DocumentCache {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(None),
        }
    }

    pub fn store(&self, path: String, bytes: Vec<u8>) {
        if let Ok(mut guard) = self.inner.lock() {
            *guard = Some((path, bytes));
        }
    }

    pub fn take(&self, path: &str) -> Option<Vec<u8>> {
        let mut guard = self.inner.lock().ok()?;
        match guard.as_ref() {
            Some((cached_path, _)) if cached_path == path => guard.take().map(|(_, bytes)| bytes),
            _ => None,
        }
    }
}
