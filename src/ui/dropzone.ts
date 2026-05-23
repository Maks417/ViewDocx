import { el } from "../dom";
import { icon, iconBtn } from "./icons";

export interface DropzoneElements {
  root: HTMLElement;
}

export interface DropzoneCallbacks {
  onOpen: () => void;
  onDragEnter?: () => void;
  onDragLeave?: () => void;
}

export function createDropzone(callbacks: DropzoneCallbacks): DropzoneElements {
  const card = el("div", { className: "dropzone-card glass" }, [
    el("div", { className: "dropzone-icon" }, [icon("document", "lg")]),
    el("h2", { textContent: "Open a .docx document" }),
    el("p", {
      className: "dropzone-lead",
      textContent: "Drag and drop a file here, or choose one from your computer.",
    }),
    iconBtn("folder", {
      label: "Open document",
      props: { className: "primary", title: "Open document (Ctrl+O)" },
      onClick: callbacks.onOpen,
    }),
    el("p", {
      className: "dropzone-note",
      textContent: "ViewDocx supports .docx files. Legacy .doc files are detected but not supported yet.",
    }),
  ]);

  const root = el("div", { className: "dropzone" }, [card]);

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
