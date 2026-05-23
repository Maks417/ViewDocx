import { el } from "../dom";

export interface DropzoneElements {
  root: HTMLElement;
}

export interface DropzoneCallbacks {
  onDragEnter?: () => void;
  onDragLeave?: () => void;
}

export function createDropzone(callbacks: DropzoneCallbacks = {}): DropzoneElements {
  const root = el("div", { className: "dropzone" }, [
    el("h2", { textContent: "Open a Word document" }),
    el("p", { textContent: "Drag and drop a .docx file here, or use Open (Ctrl+O)" }),
  ]);

  root.addEventListener("dragenter", () => {
    root.classList.add("drag-over");
    callbacks.onDragEnter?.();
  });

  root.addEventListener("dragleave", () => {
    root.classList.remove("drag-over");
    callbacks.onDragLeave?.();
  });

  return { root };
}

export function setDropzoneVisible(dropzone: HTMLElement, visible: boolean): void {
  dropzone.classList.toggle("hidden", !visible);
}

export function setDropzoneDragOver(dropzone: HTMLElement, active: boolean): void {
  dropzone.classList.toggle("drag-over", active);
}
