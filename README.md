# DocView

Compact desktop viewer for Microsoft Word `.docx` documents. Built with [Tauri 2](https://v2.tauri.app) (Rust + system WebView) and [docx-preview](https://github.com/VolodymyrBaydalka/docxjs) (Apache-2.0).

## Features

- Open `.docx` via file dialog, drag-and-drop, or recent files list
- Rich layout rendering (tables, images, page breaks, headers/footers)
- Zoom and print (native WebView print / PDF)
- Legacy `.doc` detection with a clear “not supported yet” message
- Small installer (~5–10 MB) — no bundled browser runtime

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/)
- Windows: [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) (preinstalled on Windows 11; bootstrapper included in installer)

## Development

```bash
npm install
npm run tauri dev
```

## Production build (Windows)

```bash
npm run tauri build
```

Installers are written to `src-tauri/target/release/bundle/`.

## License

Application code: MIT. Dependencies use permissive licenses (MIT / Apache-2.0).
