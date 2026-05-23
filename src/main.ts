import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { isWordExtension } from "./detect";
import { btn, el } from "./dom";
import {
  createDropzone,
  setDropzoneDragOver,
  setDropzoneVisible,
} from "./ui/dropzone";
import { createToolbar, renderRecentList, type ToolbarElements } from "./ui/toolbar";
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
  private dropzoneEl!: HTMLElement;
  private scrollHost!: HTMLElement;
  private dialogBackdrop!: HTMLElement;
  private currentPath: string | null = null;

  async init(): Promise<void> {
    this.statusBar = el("footer", { className: "status-bar", textContent: "Ready" });
    this.scrollHost = el("div", { className: "viewer-scroll" });

    this.buildDialog();
    this.buildShell();
    this.setupKeyboardShortcuts();
    await this.setupDragDrop();

    await listen("menu-open", () => void this.openFileDialog());
    await listen("menu-print", () => this.printFromShortcut());

    await this.refreshRecent();
    this.setStatus("Ready — open a .docx file");
  }

  private setStatus(text: string): void {
    this.statusBar.textContent = text;
  }

  private showDialog(title: string, message: string): void {
    const dialog = this.dialogBackdrop.querySelector(".dialog")!;
    dialog.querySelector("h3")!.textContent = title;
    dialog.querySelector("p")!.textContent = message;
    this.dialogBackdrop.classList.remove("hidden");
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

  private async loadFromPath(path: string): Promise<void> {
    try {
      this.setStatus(`Loading ${path}…`);
      const info = await invoke<DocumentInfo>("read_document", { path });
      const buffer = await invoke<ArrayBuffer>("read_document_bytes", { path });
      await this.loadDocument(info, new Uint8Array(buffer));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.showDialog("Could not open document", message);
      this.setStatus(`Error: ${message}`);
    }
  }

  private async loadDocument(info: DocumentInfo, bytes: Uint8Array): Promise<void> {
    const doc: LoadedDocument = { ...info, bytes };

    try {
      await this.viewer.render(doc);
      this.currentPath = doc.path;
      this.toolbar.printBtn.disabled = false;
      this.setViewerVisible(true);
      this.setStatus(doc.path);
      this.updateZoomLabel();
      await this.refreshRecent();
    } catch (err) {
      if (err instanceof LegacyDocError) {
        this.showDialog(
          "Legacy .doc not supported yet",
          `"${err.fileName}" uses the older Word 97–2003 format. DocView currently supports .docx only. Future versions may convert .doc via LibreOffice when installed.`,
        );
        this.setStatus(`Unsupported: ${err.fileName}`);
        return;
      }
      throw err;
    }
  }

  private setViewerVisible(visible: boolean): void {
    this.scrollHost.classList.toggle("visible", visible);
    setDropzoneVisible(this.dropzoneEl, !visible);
  }

  private async openFileDialog(): Promise<void> {
    const handle = await invoke<FileHandle | null>("open_file_dialog");
    if (handle?.path) {
      await this.loadFromPath(handle.path);
    }
  }

  private printFromShortcut(): void {
    if (!this.currentPath) return;
    window.print();
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
          this.showDialog("Unsupported file", "Please drop a .docx or .doc file.");
          return;
        }
        void this.loadFromPath(path);
      }
    });
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === "o") {
          e.preventDefault();
          void this.openFileDialog();
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
      onPrint: () => window.print(),
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
      onRecentSelect: (path) => void this.loadFromPath(path),
      onClearRecent: () => void this.clearRecent(),
    });

    const { root: dropzone } = createDropzone({
      onDragLeave: () => setDropzoneDragOver(this.dropzoneEl, false),
    });
    this.dropzoneEl = dropzone;

    this.root.append(this.toolbar.root);

    const main = el("main", { className: "main" }, [this.dropzoneEl, this.scrollHost]);
    this.root.append(main, this.statusBar, this.dialogBackdrop);
  }

  private buildDialog(): void {
    this.dialogBackdrop = el("div", { className: "dialog-backdrop hidden" });
    const dialog = el("div", { className: "dialog" });
    dialog.append(el("h3"), el("p"));

    const actions = el("div", { className: "dialog-actions" }, [
      btn("OK", { className: "primary" }, () => this.hideDialog()),
    ]);
    dialog.append(actions);
    this.dialogBackdrop.append(dialog);

    this.dialogBackdrop.addEventListener("click", (e) => {
      if (e.target === this.dialogBackdrop) this.hideDialog();
    });
  }
}

void new App().init();
