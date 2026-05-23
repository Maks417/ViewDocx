import { btn, el } from "../dom";

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
}

export function createToolbar(callbacks: ToolbarCallbacks): ToolbarElements {
  const recentDropdown = el("div", { className: "recent-dropdown" });

  const recentToggle = btn("Recent", { title: "Recently opened files" });
  recentToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    recentDropdown.classList.toggle("open");
  });

  document.addEventListener("click", () => {
    recentDropdown.classList.remove("open");
  });

  const recentMenu = el("div", { className: "recent-menu" }, [recentToggle, recentDropdown]);
  const zoomLabel = el("span", { className: "zoom-label", textContent: "100%" });
  const printBtn = btn("Print", { title: "Print (Ctrl+P)", disabled: true }, callbacks.onPrint);

  const root = el("header", { className: "toolbar" }, [
    btn("Open", { className: "primary", title: "Open document (Ctrl+O)" }, callbacks.onOpen),
    recentMenu,
    btn("−", { title: "Zoom out (Ctrl+-)" }, callbacks.onZoomOut),
    zoomLabel,
    btn("+", { title: "Zoom in (Ctrl++)" }, callbacks.onZoomIn),
    btn("Reset", { title: "Reset zoom (Ctrl+0)" }, callbacks.onZoomReset),
    el("div", { className: "spacer" }),
    printBtn,
  ]);

  return {
    root,
    zoomLabel,
    printBtn,
    recentDropdown,
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
    dropdown.append(el("div", { className: "empty", textContent: "No recent files" }));
    return;
  }

  for (const path of paths) {
    const item = btn(path, { title: path });
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.remove("open");
      onSelect(path);
    });
    dropdown.append(item);
  }

  const clearBtn = btn("Clear recent");
  clearBtn.style.borderTop = "1px solid var(--border)";
  clearBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.remove("open");
    onClear();
  });
  dropdown.append(clearBtn);
}
