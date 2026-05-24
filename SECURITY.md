# Security

## Known dependency alert: glib (RUSTSEC-2024-0429)

GitHub Dependabot may report a **moderate** alert on `glib` 0.18.x in `src-tauri/Cargo.lock`.

| Field | Detail |
| --- | --- |
| Advisory | [RUSTSEC-2024-0429](https://rustsec.org/advisories/RUSTSEC-2024-0429.html) |
| Issue | Unsound `VariantStrIter` in glib 0.15–0.19; fixed in glib ≥ 0.20 |
| Path | `tauri` → `tauri-runtime-wry` → `webkit2gtk` / `gtk` → `glib` |
| ViewDocx impact | **None on Windows** — Linux WebKit/GTK only; Windows builds use WebView2 |

There is no safe in-tree upgrade: `gtk` 0.18 requires `glib` 0.18, and Tauri/wry still depend on that stack for Linux targets.

**Action:** Dismiss the Dependabot alert on GitHub as **“Vulnerable but not affected”** — ViewDocx is Windows-only.

Local `cargo audit` respects [`.cargo/audit.toml`](.cargo/audit.toml).

## Reporting issues

Report security concerns via [GitHub Security Advisories](https://github.com/Maks417/ViewDocx/security/advisories/new).
