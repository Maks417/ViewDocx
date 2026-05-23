export interface DropzoneElements {
  root: HTMLElement;
}

export function createDropzone(onFiles: (files: FileList) => void): DropzoneElements {
  const root = document.createElement("div");
  root.className = "dropzone";

  const title = document.createElement("h2");
  title.textContent = "Open a Word document";

  const hint = document.createElement("p");
  hint.textContent = "Drag and drop a .docx file here, or use Open (Ctrl+O)";

  root.append(title, hint);

  const prevent = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  root.addEventListener("dragenter", (e) => {
    prevent(e);
    root.classList.add("drag-over");
  });

  root.addEventListener("dragover", prevent);

  root.addEventListener("dragleave", (e) => {
    prevent(e);
    root.classList.remove("drag-over");
  });

  root.addEventListener("drop", (e) => {
    prevent(e);
    root.classList.remove("drag-over");
    if (e.dataTransfer?.files?.length) {
      onFiles(e.dataTransfer.files);
    }
  });

  return { root };
}

export function setDropzoneVisible(dropzone: HTMLElement, visible: boolean): void {
  dropzone.classList.toggle("hidden", !visible);
}
