//! WebView2-backed "Save as PDF" implementation.
//!
//! Uses `ICoreWebView2_7::PrintToPdf` so the resulting PDF is a vector
//! document with selectable text — the same content the system print
//! dialog would produce, but written directly to a file without showing
//! a dialog.

#[cfg(windows)]
pub async fn print_to_pdf(window: tauri::WebviewWindow, target: String) -> Result<(), String> {
    use std::sync::{Arc, Mutex};
    use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2_7;
    use webview2_com::PrintToPdfCompletedHandler;
    use windows::core::{Interface, HSTRING};

    type Slot = Arc<Mutex<Option<tokio::sync::oneshot::Sender<Result<(), String>>>>>;

    fn deliver(slot: &Slot, msg: Result<(), String>) {
        if let Ok(mut guard) = slot.lock() {
            if let Some(sender) = guard.take() {
                let _ = sender.send(msg);
            }
        }
    }

    let (tx, rx) = tokio::sync::oneshot::channel::<Result<(), String>>();
    let slot: Slot = Arc::new(Mutex::new(Some(tx)));
    let outer_slot = slot.clone();

    let dispatch = window.with_webview(move |webview| {
        let target_h = HSTRING::from(target.as_str());
        unsafe {
            let core = match webview.controller().CoreWebView2() {
                Ok(c) => c,
                Err(e) => {
                    deliver(&outer_slot, Err(format!("CoreWebView2 unavailable: {e}")));
                    return;
                }
            };
            let wv7: ICoreWebView2_7 = match core.cast() {
                Ok(v) => v,
                Err(e) => {
                    deliver(
                        &outer_slot,
                        Err(format!("WebView2 PrintToPdf not supported: {e}")),
                    );
                    return;
                }
            };

            let handler_slot = outer_slot.clone();
            let handler = PrintToPdfCompletedHandler::create(Box::new(
                move |result, is_successful| {
                    let outcome = match result {
                        Ok(()) if is_successful => Ok(()),
                        Ok(()) => Err("Print to PDF failed".to_string()),
                        Err(e) => Err(format!("Print to PDF failed: {e}")),
                    };
                    deliver(&handler_slot, outcome);
                    Ok(())
                },
            ));

            if let Err(e) = wv7.PrintToPdf(&target_h, None, &handler) {
                deliver(&outer_slot, Err(format!("PrintToPdf rejected: {e}")));
            }
        }
    });

    if let Err(e) = dispatch {
        // The closure never ran — drop the sender so any other waiter on `rx` errors out.
        deliver(&slot, Err(format!("with_webview failed: {e}")));
    }

    match rx.await {
        Ok(result) => result,
        Err(_) => Err("Print to PDF was cancelled".to_string()),
    }
}

#[cfg(not(windows))]
pub async fn print_to_pdf(_window: tauri::WebviewWindow, _target: String) -> Result<(), String> {
    Err("Save as PDF is only supported on Windows".to_string())
}
