# ViewDocx

[![Build](https://github.com/Maks417/ViewDocx/actions/workflows/build.yml/badge.svg)](https://github.com/Maks417/ViewDocx/actions/workflows/build.yml)
[![Latest release](https://img.shields.io/github/v/release/Maks417/ViewDocx)](https://github.com/Maks417/ViewDocx/releases)
[![License: MIT](https://img.shields.io/github/license/Maks417/ViewDocx)](LICENSE)
![Platform](https://img.shields.io/badge/platform-Windows%2010%2B-blue)

A small Windows desktop app for opening and viewing Microsoft Word `.docx` files — without installing Microsoft Office.

Built with [Tauri 2](https://v2.tauri.app) and [docx-preview](https://github.com/VolodymyrBaydalka/docxjs) (Apache-2.0).

**Website:** [maks417.github.io/ViewDocx](https://maks417.github.io/ViewDocx/)

## Download

**[Releases](https://github.com/Maks417/ViewDocx/releases)** — pick the latest version and download one of:

| File | Who it's for |
|------|----------------|
| `*-setup.exe` | Most people — run the installer and follow the prompts |
| `*.msi` | IT departments — silent or managed deployment |

The installer is about 5–10 MB. On first install it may download the [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) runtime if your PC does not already have it (internet required once).

**Windows SmartScreen:** the app is not code-signed yet. Windows may show “Unknown publisher” on first run. Choose **More info → Run anyway** to continue.

## Features

- Open `.docx` from the toolbar, drag-and-drop, double-click (file association), or the **Recent** list (up to 10 files)
- Layout rendering for tables, images, page breaks, headers, and footers
- Zoom (including fit width), print, and **Save as PDF** (vector export with selectable text — no print dialog)
- Status bar with file path and document stats
- Small footprint — uses the system WebView instead of bundling a full browser

## Using ViewDocx

1. Install from a release (see above), or build from source (contributors).
2. Open a document:
   - **Open** on the toolbar, or **Ctrl+O**
   - Drag a `.docx` onto the window
   - Double-click a `.docx` in File Explorer (after install)
   - Pick a file from **Recent** (clock icon)
3. Use the toolbar for zoom, print, and PDF export.

### Keyboard shortcuts

| Action | Shortcut |
|--------|----------|
| Open | Ctrl+O |
| Save as PDF | Ctrl+Shift+S |
| Print | Ctrl+P |
| Zoom in | Ctrl++ |
| Zoom out | Ctrl+- |
| Actual size (100%) | Ctrl+0 |

## Requirements and limitations

| | |
|---|---|
| **OS** | Windows 10 or later (64-bit). macOS and Linux builds are not shipped yet. |
| **Runtime** | [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) — included on Windows 11; installed by the setup program on older systems when needed. |
| **Formats** | `.docx` only. Legacy `.doc` files are detected and reported as unsupported. |
| **Save as PDF** | Windows only (uses WebView2 `PrintToPdf`). |
| **Editing** | View-only — this is a reader, not a Word replacement. |

---

## For contributors

![Tauri](https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-stable-orange?logo=rust&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![WebView2](https://img.shields.io/badge/WebView2-required-0078D4?logo=microsoftedge&logoColor=white)

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ (22 used in CI)
- [Rust](https://rustup.rs/) (stable)
- Windows with WebView2 for local runs (same as end users)

On Windows, install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the **Desktop development with C++** workload if `tauri build` fails to find a linker.

### Development

```bash
git clone https://github.com/Maks417/ViewDocx.git
cd ViewDocx
npm install
npm run tauri dev
```

Frontend-only work (no Rust changes):

```bash
npm run dev          # Vite on http://localhost:1420
```

### Repository layout

| Path | Purpose |
|------|---------|
| `src/` | TypeScript UI (toolbar, viewer, drag-and-drop) |
| `src-tauri/` | Rust backend, Tauri config, bundling |
| `.github/workflows/` | CI build on push/PR; release on version tags |

### Build installers locally

Artifacts are written to `src-tauri/target/release/bundle/`.

```bash
npm run build:installer
```

| Output | Use |
|--------|-----|
| `nsis/*-setup.exe` | End-user installer (downloads WebView2 bootstrapper when needed) |
| `msi/*.msi` | MSI for IT / silent install |

**Microsoft Store:** not configured yet (requires a code-signing certificate). [`src-tauri/tauri.microsoftstore.conf.json`](src-tauri/tauri.microsoftstore.conf.json) and `npm run build:store` are kept for a possible future submission — see [Tauri — Microsoft Store](https://v2.tauri.app/distribute/microsoft-store/).

### Releases and CI

- **[`build.yml`](.github/workflows/build.yml)** — builds on every push and pull request to `main` / `master`; uploads Windows installers as workflow artifacts.
- **[`release.yml`](.github/workflows/release.yml)** — runs when a version tag is pushed; builds Windows installers and [publishes a GitHub Release](https://github.com/Maks417/ViewDocx/releases) with assets attached.

**Cutting a release** (maintainers):

```bash
npm run release:bump -- 1.0.4    # syncs package.json, tauri.conf.json, Cargo.toml
git add -A
git commit -m "Release v1.0.4"
git tag v1.0.4
git push
git push origin v1.0.4
```

Accepted tag forms: `v1.0.4` or `1.0.4` (see the workflow `on.push.tags` list).

To also ship macOS or Linux installers, uncomment the extra matrix rows in `release.yml` (and the matching jobs in `build.yml`).

Release notes and assets are defined in the workflow (`releaseBody`, `releaseDraft: false`). Edit [`.github/workflows/release.yml`](.github/workflows/release.yml) to change the default release text or switch to draft releases.

### License

Application code is under the [MIT License](LICENSE). Third-party dependencies use permissive licenses (MIT / Apache-2.0).
