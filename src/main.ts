import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { createDropzone, setDropzoneVisible } from "./ui/dropzone";
import { createToolbar, renderRecentList, type ToolbarElements } from "./ui/toolbar";
import { DocumentViewer, LegacyDocError, type DocumentKind, type LoadedDocument } from "./viewer";

interface FileHandle {
  path: string;
  name: string;
}

interface DocumentPayload {
  bytes: number[];
  kind: DocumentKind;
  path: string;
  name: string;
}

const app = document.getElementById("app")!;
let toolbar!: ToolbarElements;
let viewer!: DocumentViewer;
let statusBar!: HTMLElement;
let dropzoneEl!: HTMLElement;
let scrollHost!: HTMLElement;
let dialogBackdrop!: HTMLElement;
let currentPath: string | null = null;

function setStatus(text: string): void {
  statusBar.textContent = text;
}

function showDialog(title: string, message: string): void {
  const dialog = dialogBackdrop.querySelector(".dialog")!;
  dialog.querySelector("h3")!.textContent = title;
  dialog.querySelector("p")!.textContent = message;
  dialogBackdrop.classList.remove("hidden");
}

function hideDialog(): void {
  dialogBackdrop.classList.add("hidden");
}

function updateZoomLabel(): void {
  toolbar.zoomLabel.textContent = `${Math.round(viewer.getZoom() * 100)}%`;
}

async function refreshRecent(): Promise<void> {
  const paths = await invoke<string[]>("recent_files");
  renderRecentList(
    toolbar.recentDropdown,
    paths,
    (path) => void loadFromPath(path),
    () => void clearRecent(),
  );
}

async function clearRecent(): Promise<void> {
  await invoke("clear_recent_files");
  await refreshRecent();
}

function bytesFromPayload(bytes: number[]): Uint8Array {
  return Uint8Array.from(bytes);
}

async function loadDocument(payload: DocumentPayload): Promise<void> {
  const doc: LoadedDocument = {
    bytes: bytesFromPayload(payload.bytes),
    kind: payload.kind,
    path: payload.path,
    name: payload.name,
  };

  try {
    await viewer.render(doc);
    currentPath = doc.path;
    toolbar.printBtn.disabled = false;
    setDropzoneVisible(dropzoneEl, false);
    scrollHost.classList.add("visible");
    setStatus(doc.path);
    updateZoomLabel();
    await refreshRecent();
  } catch (err) {
    if (err instanceof LegacyDocError) {
      showDialog(
        "Legacy .doc not supported yet",
        `"${err.fileName}" uses the older Word 97–2003 format. DocView currently supports .docx only. Future versions may convert .doc via LibreOffice when installed.`,
      );
      setStatus(`Unsupported: ${err.fileName}`);
      return;
    }
    throw err;
  }
}

async function loadFromPath(path: string): Promise<void> {
  try {
    setStatus(`Loading ${path}…`);
    const payload = await invoke<DocumentPayload>("read_document", { path });
    await loadDocument(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    showDialog("Could not open document", message);
    setStatus(`Error: ${message}`);
  }
}

async function openFileDialog(): Promise<void> {
  const handle = await invoke<FileHandle | null>("open_file_dialog");
  if (handle?.path) {
    await loadFromPath(handle.path);
  }
}

function printDocument(): void {
  if (!currentPath) return;
  window.print();
}

async function handleDroppedFiles(files: FileList): Promise<void> {
  const file = files[0];
  if (!file) return;

  const lower = file.name.toLowerCase();
  if (!lower.endsWith(".docx") && !lower.endsWith(".doc")) {
    showDialog("Unsupported file", "Please drop a .docx or .doc file.");
    return;
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  let kind: DocumentKind = "unknown";
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  ) {
    kind = "docx";
  } else if (
    bytes.length >= 8 &&
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0
  ) {
    kind = "legacydoc";
  }

  await loadDocument({
    bytes: Array.from(bytes),
    kind,
    path: file.name,
    name: file.name,
  });
}

function setupKeyboardShortcuts(): void {
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      if (key === "o") {
        e.preventDefault();
        void openFileDialog();
      } else if (key === "p") {
        e.preventDefault();
        printDocument();
      } else if (key === "=" || key === "+") {
        e.preventDefault();
        viewer.zoomIn();
        updateZoomLabel();
      } else if (key === "-") {
        e.preventDefault();
        viewer.zoomOut();
        updateZoomLabel();
      } else if (key === "0") {
        e.preventDefault();
        viewer.resetZoom();
        updateZoomLabel();
      }
    }
  });
}

function buildShell(): void {
  viewer = new DocumentViewer(scrollHost);

  toolbar = createToolbar({
    onOpen: () => void openFileDialog(),
    onPrint: printDocument,
    onZoomIn: () => {
      viewer.zoomIn();
      updateZoomLabel();
    },
    onZoomOut: () => {
      viewer.zoomOut();
      updateZoomLabel();
    },
    onZoomReset: () => {
      viewer.resetZoom();
      updateZoomLabel();
    },
    onRecentSelect: (path) => void loadFromPath(path),
    onClearRecent: () => void clearRecent(),
  });

  const { root: dropzone } = createDropzone((files) => void handleDroppedFiles(files));
  dropzoneEl = dropzone;

  app.append(toolbar.root);

  const main = document.createElement("main");
  main.className = "main";
  main.append(dropzoneEl, scrollHost);
  app.append(main, statusBar, dialogBackdrop);
}

function buildDialog(): void {
  dialogBackdrop = document.createElement("div");
  dialogBackdrop.className = "dialog-backdrop hidden";

  const dialog = document.createElement("div");
  dialog.className = "dialog";
  dialog.innerHTML = "<h3></h3><p></p>";

  const actions = document.createElement("div");
  actions.className = "dialog-actions";
  const okBtn = document.createElement("button");
  okBtn.type = "button";
  okBtn.className = "primary";
  okBtn.textContent = "OK";
  okBtn.addEventListener("click", hideDialog);
  actions.append(okBtn);
  dialog.append(actions);

  dialogBackdrop.append(dialog);
  dialogBackdrop.addEventListener("click", (e) => {
    if (e.target === dialogBackdrop) hideDialog();
  });
}

async function init(): Promise<void> {
  statusBar = document.createElement("footer");
  statusBar.className = "status-bar";
  statusBar.textContent = "Ready";

  scrollHost = document.createElement("div");
  scrollHost.className = "viewer-scroll";

  buildDialog();
  buildShell();
  setupKeyboardShortcuts();

  await listen("menu-open", () => void openFileDialog());
  await listen("menu-print", printDocument);

  await refreshRecent();
  setStatus("Ready — open a .docx file");
}

void init();
