import type { DocumentKind } from "./detect";

export type { DocumentKind };

export interface LoadedDocument {
  bytes: Uint8Array;
  kind: DocumentKind;
  path: string;
  name: string;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.1;
const FIT_WIDTH_PADDING = 48;

export class DocumentViewer {
  private readonly container: HTMLElement;
  private readonly styleContainer: HTMLElement;
  private readonly stage: HTMLElement;
  private readonly stageWrap: HTMLElement;
  private readonly scrollHost: HTMLElement;
  private zoom = 1;

  constructor(scrollHost: HTMLElement) {
    this.scrollHost = scrollHost;

    this.container = document.createElement("div");
    this.container.className = "viewer-document";

    this.styleContainer = document.createElement("div");
    this.styleContainer.setAttribute("aria-hidden", "true");

    this.stage = document.createElement("div");
    this.stage.className = "viewer-stage";
    this.stage.append(this.styleContainer, this.container);

    this.stageWrap = document.createElement("div");
    this.stageWrap.className = "viewer-stage-wrap";
    this.stageWrap.append(this.stage);
    scrollHost.append(this.stageWrap);
  }

  getZoom(): number {
    return this.zoom;
  }

  getContainer(): HTMLElement {
    return this.container;
  }

  setZoom(value: number): number {
    const scrollRatio = this.getHorizontalScrollRatio();
    this.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
    this.applyZoom();
    this.restoreHorizontalScrollRatio(scrollRatio);
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

  fitWidth(): number {
    const page = this.getPrimaryPage();
    const docWidth = this.getUnscaledWidth(page ?? this.container);
    if (docWidth <= 0 || this.scrollHost.clientWidth <= FIT_WIDTH_PADDING) return this.zoom;

    const viewportWidth = this.scrollHost.clientWidth - FIT_WIDTH_PADDING;
    const target = viewportWidth / docWidth;
    this.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, target));
    this.applyZoom();
    requestAnimationFrame(() => {
      this.scrollHost.scrollLeft = 0;
    });
    return this.zoom;
  }

  clear(): void {
    this.container.replaceChildren();
    this.styleContainer.replaceChildren();
    this.resetZoom();
  }

  private applyZoom(): void {
    this.stage.style.setProperty("zoom", String(this.zoom));
  }

  private getUnscaledWidth(element: HTMLElement): number {
    const rectWidth = element.getBoundingClientRect().width;
    return rectWidth > 0 ? rectWidth / this.zoom : element.offsetWidth;
  }

  private getPrimaryPage(): HTMLElement | null {
    return this.container.querySelector<HTMLElement>("section.docx") ?? this.container.firstElementChild as HTMLElement | null;
  }

  private getHorizontalScrollRatio(): number {
    const scrollable = this.scrollHost.scrollWidth - this.scrollHost.clientWidth;
    if (scrollable <= 0) return 0;
    return (this.scrollHost.scrollLeft + this.scrollHost.clientWidth / 2) / this.scrollHost.scrollWidth;
  }

  private restoreHorizontalScrollRatio(ratio: number): void {
    requestAnimationFrame(() => {
      if (ratio <= 0) {
        this.scrollHost.scrollLeft = 0;
        return;
      }

      const targetCenter = this.scrollHost.scrollWidth * ratio;
      this.scrollHost.scrollLeft = Math.max(0, targetCenter - this.scrollHost.clientWidth / 2);
    });
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

    const { renderAsync } = await import("docx-preview");

    await renderAsync(buffer, this.container, this.styleContainer, {
      className: "docx",
      breakPages: true,
      renderHeaders: true,
      renderFooters: true,
    });

    this.applyZoom();
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
