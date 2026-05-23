export interface ToolbarCallbacks {
  onOpen: () => void;
  onPrint: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onRecentSelect: (path: string) => void;
  onClearRecent: () => void;
}

export interface ToolbarElements {
  root: HTMLElement;
  zoomLabel: HTMLElement;
  printBtn: HTMLButtonElement;
  recentDropdown: HTMLElement;
  recentToggle: HTMLButtonElement;
}

export function createToolbar(callbacks: ToolbarCallbacks): ToolbarElements {
  const root = document.createElement("header");
  root.className = "toolbar";

  const openBtn = document.createElement("button");
  openBtn.type = "button";
  openBtn.className = "primary";
  openBtn.textContent = "Open";
  openBtn.title = "Open document (Ctrl+O)";
  openBtn.addEventListener("click", () => callbacks.onOpen());

  const recentMenu = document.createElement("div");
  recentMenu.className = "recent-menu";

  const recentToggle = document.createElement("button");
  recentToggle.type = "button";
  recentToggle.textContent = "Recent";
  recentToggle.title = "Recently opened files";

  const recentDropdown = document.createElement("div");
  recentDropdown.className = "recent-dropdown";

  recentToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    recentDropdown.classList.toggle("open");
  });

  document.addEventListener("click", () => {
    recentDropdown.classList.remove("open");
  });

  recentMenu.append(recentToggle, recentDropdown);

  const zoomOutBtn = document.createElement("button");
  zoomOutBtn.type = "button";
  zoomOutBtn.textContent = "−";
  zoomOutBtn.title = "Zoom out (Ctrl+-)";
  zoomOutBtn.addEventListener("click", () => callbacks.onZoomOut());

  const zoomLabel = document.createElement("span");
  zoomLabel.className = "zoom-label";
  zoomLabel.textContent = "100%";

  const zoomInBtn = document.createElement("button");
  zoomInBtn.type = "button";
  zoomInBtn.textContent = "+";
  zoomInBtn.title = "Zoom in (Ctrl++)";
  zoomInBtn.addEventListener("click", () => callbacks.onZoomIn());

  const zoomResetBtn = document.createElement("button");
  zoomResetBtn.type = "button";
  zoomResetBtn.textContent = "Reset";
  zoomResetBtn.title = "Reset zoom (Ctrl+0)";
  zoomResetBtn.addEventListener("click", () => callbacks.onZoomReset());

  const spacer = document.createElement("div");
  spacer.className = "spacer";

  const printBtn = document.createElement("button");
  printBtn.type = "button";
  printBtn.textContent = "Print";
  printBtn.title = "Print (Ctrl+P)";
  printBtn.disabled = true;
  printBtn.addEventListener("click", () => callbacks.onPrint());

  root.append(
    openBtn,
    recentMenu,
    zoomOutBtn,
    zoomLabel,
    zoomInBtn,
    zoomResetBtn,
    spacer,
    printBtn,
  );

  return {
    root,
    zoomLabel,
    printBtn,
    recentDropdown,
    recentToggle,
  };
}

export function renderRecentList(
  dropdown: HTMLElement,
  paths: string[],
  onSelect: (path: string) => void,
  onClear: () => void,
): void {
  dropdown.replaceChildren();

  if (paths.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No recent files";
    dropdown.append(empty);
    return;
  }

  for (const path of paths) {
    const item = document.createElement("button");
    item.type = "button";
    item.textContent = path;
    item.title = path;
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.remove("open");
      onSelect(path);
    });
    dropdown.append(item);
  }

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.textContent = "Clear recent";
  clearBtn.style.borderTop = "1px solid var(--border)";
  clearBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.remove("open");
    onClear();
  });
  dropdown.append(clearBtn);
}
