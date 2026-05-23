import { renderAsync } from "docx-preview";

export type DocumentKind = "docx" | "legacydoc" | "unknown";

export interface LoadedDocument {
  bytes: Uint8Array;
  kind: DocumentKind;
  path: string;
  name: string;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.1;

export class DocumentViewer {
  private readonly container: HTMLElement;
  private readonly styleContainer: HTMLElement;
  private readonly stage: HTMLElement;
  private zoom = 1;

  constructor(scrollHost: HTMLElement) {
    this.container = document.createElement("div");
    this.container.className = "docx-wrapper";

    this.styleContainer = document.createElement("div");
    this.styleContainer.setAttribute("aria-hidden", "true");

    this.stage = document.createElement("div");
    this.stage.className = "viewer-stage";
    this.stage.append(this.styleContainer, this.container);
    scrollHost.append(this.stage);
  }

  getZoom(): number {
    return this.zoom;
  }

  setZoom(value: number): number {
    this.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
    this.stage.style.transform = `scale(${this.zoom})`;
    return this.zoom;
  }

  zoomIn(): number {
    return this.setZoom(this.zoom + ZOOM_STEP);
  }

  zoomOut(): number {
    return this.setZoom(this.zoom - ZOOM_STEP);
  }

  resetZoom(): number {
    return this.setZoom(1);
  }

  clear(): void {
    this.container.replaceChildren();
    this.styleContainer.replaceChildren();
    this.resetZoom();
  }

  async render(doc: LoadedDocument): Promise<void> {
    this.clear();

    if (doc.kind === "legacydoc") {
      throw new LegacyDocError(doc.name);
    }

    if (doc.kind !== "docx") {
      throw new Error("Unsupported document format.");
    }

    const buffer = doc.bytes.buffer.slice(
      doc.bytes.byteOffset,
      doc.bytes.byteOffset + doc.bytes.byteLength,
    ) as ArrayBuffer;

    await renderAsync(buffer, this.container, this.styleContainer, {
      className: "docx",
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      breakPages: true,
      renderHeaders: true,
      renderFooters: true,
    });
  }
}

export class LegacyDocError extends Error {
  readonly fileName: string;

  constructor(fileName: string) {
    super(`Legacy .doc format is not supported yet: ${fileName}`);
    this.name = "LegacyDocError";
    this.fileName = fileName;
  }
}
