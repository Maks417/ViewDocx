# ViewDocx

Compact desktop viewer for Microsoft Word `.docx` documents. Built with [Tauri 2](https://v2.tauri.app) (Rust + system WebView) and [docx-preview](https://github.com/VolodymyrBaydalka/docxjs) (Apache-2.0).

## Features

- Open `.docx` via file dialog, drag-and-drop, or recent files list
- Rich layout rendering (tables, images, page breaks, headers/footers)
- Zoom and print
- Save as PDF — vector, selectable-text export via WebView2 `PrintToPdf` (no print dialog)
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

## Release (Windows)

Build artifacts are written to `src-tauri/target/release/bundle/`.

### Local / direct distribution

Small installer (~5–10 MB). Downloads the WebView2 bootstrapper at install time if needed (requires internet on first install).

```bash
npm run build:installer
```

| Output | Typical use |
|--------|-------------|
| `nsis/*-setup.exe` | End users — double-click installer |
| `msi/*.msi` | IT / silent deployment |

Share the `.exe` or `.msi` via your website, GitHub Releases, etc. Without a code-signing certificate, Windows SmartScreen will show an "Unknown publisher" warning on first install — users can click **More info → Run anyway**.

> **Microsoft Store:** publishing to the Store requires a code-signing certificate (Microsoft policy), so it's not currently set up. The config file [`src-tauri/tauri.microsoftstore.conf.json`](src-tauri/tauri.microsoftstore.conf.json) and `npm run build:store` script are left in place for a future Store submission. See [Tauri — Microsoft Store](https://v2.tauri.app/distribute/microsoft-store/) when ready.

### Cutting a GitHub Release

Releases are fully automated by [`.github/workflows/release.yml`](.github/workflows/release.yml) (uses [`tauri-apps/tauri-action`](https://github.com/tauri-apps/tauri-action)). Pushing a `v*.*.*` tag triggers a Windows build and creates a **draft** GitHub Release with `.msi` and `-setup.exe` attached.

```bash
npm run release:bump 0.2.0          # syncs package.json, tauri.conf.json, Cargo.toml
git commit -am "Release v0.2.0"
git tag v0.2.0
git push && git push --tags
```

Then go to the repo's **Releases** page, review the draft, edit notes, and click **Publish release**. Set `releaseDraft: false` in the workflow to publish automatically.

The matrix in the release workflow has commented stubs for macOS and Linux — uncomment to include those installers in the same release.

CI also builds on every push; see [`.github/workflows/build.yml`](.github/workflows/build.yml).

## License

Application code: MIT. Dependencies use permissive licenses (MIT / Apache-2.0).
