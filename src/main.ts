import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { getVersion } from "@tauri-apps/api/app";
import { save as saveFileDialog } from "@tauri-apps/plugin-dialog";
import { isWordExtension } from "./detect";
import { btn, el } from "./dom";
import {
  createDropzone,
  setDropzoneDragOver,
  setDropzoneVisible,
} from "./ui/dropzone";
import { createToolbar, renderRecentList, type ToolbarElements } from "./ui/toolbar";
import { icon } from "./ui/icons";
import { computeDocStats, formatBytes, formatCount } from "./stats";
import { DocumentViewer, LegacyDocError, type DocumentKind, type LoadedDocument } from "./viewer";

interface FileHandle {
  path: string;
  name: string;
}

interface DocumentInfo {
  kind: DocumentKind;
  path: string;
  name: string;
}

class App {
  private readonly root = document.getElementById("app")!;
  private toolbar!: ToolbarElements;
  private viewer!: DocumentViewer;
  private statusBar!: HTMLElement;
  private statusPath!: HTMLElement;
  private statusStats!: HTMLElement;
  private dropzoneEl!: HTMLElement;
  private scrollHost!: HTMLElement;
  private loadingOverlay!: HTMLElement;
  private docContext!: HTMLElement;
  private docContextName!: HTMLElement;
  private docContextPath!: HTMLElement;
  private dialogBackdrop!: HTMLElement;
  private dialogOkBtn!: HTMLButtonElement;
  private currentPath: string | null = null;
  private currentName: string | null = null;
  private loading = false;
  private savingPdf = false;
  private statusFlashTimer: number | null = null;

  async init(): Promise<void> {
    this.statusPath = el("span", { className: "status-path" });
    this.statusStats = el("span", { className: "status-stats" });
    this.statusBar = el("footer", { className: "status-bar glass" }, [
      this.statusPath,
      this.statusStats,
    ]);
    this.scrollHost = el("div", { className: "viewer-scroll" });
    this.loadingOverlay = el("div", { className: "viewer-loading" }, [
      el("div", { className: "viewer-loading-inner glass" }, [
        el("div", { className: "viewer-loading-spinner" }),
        el("span", { textContent: "Loading document…" }),
      ]),
    ]);
    this.scrollHost.append(this.loadingOverlay);

    this.docContextName = el("span", { className: "doc-context-name" });
    this.docContextPath = el("span", { className: "doc-context-path" });
    this.docContext = el("div", { className: "doc-context glass hidden" }, [
      icon("document", "sm"),
      el("div", { className: "doc-context-text" }, [this.docContextName, this.docContextPath]),
    ]);

    this.buildDialog();
    this.buildShell();
    this.setupKeyboardShortcuts();
    await this.setupDragDrop();

    await listen("menu-open", () => void this.openFileDialog());
    await listen("menu-print", () => this.printFromShortcut());
    await listen("menu-save-pdf", () => void this.saveAsPdf());
    await listen("menu-about", () => void this.showAboutDialog());
    await listen<string>("open-file", (event) => void this.loadFromPath(event.payload));

    await this.refreshRecent();
    await this.loadPendingOpenFiles();
    if (!this.currentPath) {
      this.setStatus("Ready — open a .docx file");
    }
  }

  private setStatus(text: string, isError = false): void {
    this.cancelStatusFlash();
    this.statusPath.textContent = text;
    this.statusBar.classList.toggle("status-error", isError);
    this.setStatusStats("");
  }

  private setStatusStats(text: string): void {
    this.statusStats.textContent = text;
  }

  private cancelStatusFlash(): void {
    if (this.statusFlashTimer !== null) {
      window.clearTimeout(this.statusFlashTimer);
      this.statusFlashTimer = null;
    }
  }

  private flashStatus(text: string, durationMs = 4000): void {
    this.cancelStatusFlash();
    const previousPath = this.statusPath.textContent ?? "";
    const previousError = this.statusBar.classList.contains("status-error");
    this.statusPath.textContent = text;
    this.statusBar.classList.remove("status-error");
    this.statusFlashTimer = window.setTimeout(() => {
      this.statusFlashTimer = null;
      this.statusPath.textContent = previousPath;
      this.statusBar.classList.toggle("status-error", previousError);
    }, durationMs);
  }

  private updateDocStats(byteLength: number): void {
    const sizeText = formatBytes(byteLength);
    requestAnimationFrame(() => {
      const { lines, words } = computeDocStats(this.viewer.getContainer());
      this.setStatusStats(
        `${sizeText} · ${formatCount(lines)} lines · ${formatCount(words)} words`,
      );
    });
  }

  private setLoading(loading: boolean): void {
    this.loading = loading;
    this.scrollHost.classList.toggle("loading", loading);
    this.toolbar.setDisabled(loading);
  }

  private updateDocContext(info: DocumentInfo | null): void {
    if (!info) {
      this.docContext.classList.add("hidden");
      this.docContextName.textContent = "";
      this.docContextPath.textContent = "";
      return;
    }

    this.docContext.classList.remove("hidden");
    this.docContextName.textContent = info.name;
    this.docContextPath.textContent = info.path;
    this.docContextPath.title = info.path;
  }

  private showDialog(title: string, message: string): void {
    const dialog = this.dialogBackdrop.querySelector(".dialog")!;
    dialog.querySelector("h3")!.textContent = title;
    dialog.querySelector("p")!.textContent = message;
    this.dialogBackdrop.classList.remove("hidden");
    this.dialogOkBtn.focus();
  }

  private async showAboutDialog(): Promise<void> {
    const version = await getVersion().catch(() => "unknown");
    this.showDialog(
      "About ViewDocx",
      `ViewDocx is a compact desktop viewer for Microsoft Word .docx documents.\n\nVersion ${version}`,
    );
  }

  private hideDialog(): void {
    this.dialogBackdrop.classList.add("hidden");
  }

  private updateZoomLabel(): void {
    this.toolbar.zoomLabel.textContent = `${Math.round(this.viewer.getZoom() * 100)}%`;
  }

  private async refreshRecent(): Promise<void> {
    const paths = await invoke<string[]>("recent_files");
    renderRecentList(
      this.toolbar.recentDropdown,
      paths,
      (path) => void this.loadFromPath(path),
      () => void this.clearRecent(),
    );
  }

  private async clearRecent(): Promise<void> {
    await invoke("clear_recent_files");
    await this.refreshRecent();
  }

  private async loadPendingOpenFiles(): Promise<void> {
    const paths = await invoke<string[]>("take_pending_open_files");
    const path = paths.find((candidate) => isWordExtension(candidate));
    if (path) {
      await this.loadFromPath(path);
    }
  }

  private async loadFromPath(path: string): Promise<void> {
    if (this.loading) return;

    this.setLoading(true);
    try {
      this.setStatus(`Loading ${path}…`);
      const info = await invoke<DocumentInfo>("read_document", { path });
      const buffer = await invoke<ArrayBuffer>("read_document_bytes", { path });
      await this.loadDocument(info, new Uint8Array(buffer));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.showDialog("Could not open document", message);
      this.setStatus(`Error: ${message}`, true);
    } finally {
      this.setLoading(false);
    }
  }

  private async loadDocument(info: DocumentInfo, bytes: Uint8Array): Promise<void> {
    const doc: LoadedDocument = { ...info, bytes };

    try {
      await this.viewer.render(doc);
      this.currentPath = doc.path;
      this.currentName = doc.name;
      this.toolbar.printBtn.disabled = false;
      this.toolbar.printBtn.dataset.loaded = "true";
      this.toolbar.saveAsPdfBtn.disabled = false;
      this.toolbar.saveAsPdfBtn.dataset.loaded = "true";
      this.setViewerVisible(true);
      this.updateDocContext(info);
      this.setStatus(doc.path);
      this.updateDocStats(doc.bytes.byteLength);
      this.updateZoomLabel();
      await this.refreshRecent();
    } catch (err) {
      if (err instanceof LegacyDocError) {
        this.showDialog(
          "Legacy .doc not supported yet",
          `"${err.fileName}" uses the older Word 97–2003 format. ViewDocx currently supports .docx only.`,
        );
        this.setStatus(`Unsupported: ${err.fileName}`, true);
        return;
      }
      throw err;
    }
  }

  private setViewerVisible(visible: boolean): void {
    this.scrollHost.classList.toggle("visible", visible);
    setDropzoneVisible(this.dropzoneEl, !visible);
    if (!visible) {
      this.updateDocContext(null);
      this.toolbar.printBtn.disabled = true;
      delete this.toolbar.printBtn.dataset.loaded;
      this.toolbar.saveAsPdfBtn.disabled = true;
      delete this.toolbar.saveAsPdfBtn.dataset.loaded;
      this.currentName = null;
      this.setStatusStats("");
    }
  }

  private async openFileDialog(): Promise<void> {
    if (this.loading) return;
    const handle = await invoke<FileHandle | null>("open_file_dialog");
    if (handle?.path) {
      await this.loadFromPath(handle.path);
    }
  }

  private printFromShortcut(): void {
    if (!this.currentPath) return;
    window.print();
  }

  private suggestedPdfName(): string {
    const base = this.currentName ?? "document";
    return base.replace(/\.docx?$/i, "") + ".pdf";
  }

  private async saveAsPdf(): Promise<void> {
    if (this.loading || this.savingPdf || !this.currentPath) return;

    let target: string | null = null;
    try {
      target = await saveFileDialog({
        defaultPath: this.suggestedPdfName(),
        filters: [{ name: "PDF document", extensions: ["pdf"] }],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.showDialog("Could not open save dialog", message);
      return;
    }

    if (!target) return;

    this.savingPdf = true;
    this.toolbar.saveAsPdfBtn.disabled = true;

    try {
      await invoke("save_as_pdf", { path: target });
      this.flashStatus(`Saved PDF to ${target}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.showDialog("Could not save PDF", message);
    } finally {
      this.savingPdf = false;
      if (this.toolbar.saveAsPdfBtn.dataset.loaded === "true" && !this.loading) {
        this.toolbar.saveAsPdfBtn.disabled = false;
      }
    }
  }

  private async setupDragDrop(): Promise<void> {
    const webview = getCurrentWebview();
    await webview.onDragDropEvent((event) => {
      if (event.payload.type === "enter" || event.payload.type === "over") {
        setDropzoneDragOver(this.dropzoneEl, true);
      } else if (event.payload.type === "leave") {
        setDropzoneDragOver(this.dropzoneEl, false);
      } else if (event.payload.type === "drop") {
        setDropzoneDragOver(this.dropzoneEl, false);
        const path = event.payload.paths[0];
        if (!path) return;
        if (!isWordExtension(path)) {
          this.showDialog(
            "Unsupported file",
            "Please drop a .docx file. Legacy .doc files are detected but not supported yet.",
          );
          return;
        }
        void this.loadFromPath(path);
      }
    });
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !this.dialogBackdrop.classList.contains("hidden")) {
        e.preventDefault();
        this.hideDialog();
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === "o") {
          e.preventDefault();
          void this.openFileDialog();
        } else if (key === "s" && e.shiftKey) {
          e.preventDefault();
          void this.saveAsPdf();
        } else if (key === "p") {
          e.preventDefault();
          this.printFromShortcut();
        } else if (key === "=" || key === "+") {
          e.preventDefault();
          this.viewer.zoomIn();
          this.updateZoomLabel();
        } else if (key === "-") {
          e.preventDefault();
          this.viewer.zoomOut();
          this.updateZoomLabel();
        } else if (key === "0") {
          e.preventDefault();
          this.viewer.resetZoom();
          this.updateZoomLabel();
        }
      }
    });
  }

  private buildShell(): void {
    this.viewer = new DocumentViewer(this.scrollHost);

    this.toolbar = createToolbar({
      onOpen: () => void this.openFileDialog(),
      onPrint: () => this.printFromShortcut(),
      onSaveAsPdf: () => void this.saveAsPdf(),
      onZoomIn: () => {
        this.viewer.zoomIn();
        this.updateZoomLabel();
      },
      onZoomOut: () => {
        this.viewer.zoomOut();
        this.updateZoomLabel();
      },
      onZoomReset: () => {
        this.viewer.resetZoom();
        this.updateZoomLabel();
      },
      onFitWidth: () => {
        this.viewer.fitWidth();
        this.updateZoomLabel();
      },
      onRecentSelect: (path) => void this.loadFromPath(path),
      onClearRecent: () => void this.clearRecent(),
    });

    const { root: dropzone } = createDropzone({
      onOpen: () => void this.openFileDialog(),
      onDragLeave: () => setDropzoneDragOver(this.dropzoneEl, false),
    });
    this.dropzoneEl = dropzone;

    this.root.append(this.toolbar.root, this.docContext);

    const main = el("main", { className: "main" }, [this.dropzoneEl, this.scrollHost]);
    this.root.append(main, this.statusBar, this.dialogBackdrop);
  }

  private buildDialog(): void {
    this.dialogBackdrop = el("div", {
      className: "dialog-backdrop hidden",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "dialog-title",
    });

    const title = el("h3", { id: "dialog-title" });
    const dialog = el("div", { className: "dialog glass" }, [title, el("p")]);

    this.dialogOkBtn = btn("OK", { className: "primary" }, () => this.hideDialog());

    const actions = el("div", { className: "dialog-actions" }, [this.dialogOkBtn]);
    dialog.append(actions);
    this.dialogBackdrop.append(dialog);

    this.dialogBackdrop.addEventListener("click", (e) => {
      if (e.target === this.dialogBackdrop) this.hideDialog();
    });
  }
}

void new App().init();
