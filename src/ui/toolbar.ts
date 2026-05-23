import { el } from "../dom";
import { icon, iconBtn } from "./icons";

export interface ToolbarCallbacks {
  onOpen: () => void;
  onPrint: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onFitWidth: () => void;
  onRecentSelect: (path: string) => void;
  onClearRecent: () => void;
}

export interface ToolbarElements {
  root: HTMLElement;
  zoomLabel: HTMLElement;
  printBtn: HTMLButtonElement;
  openBtn: HTMLButtonElement;
  recentToggle: HTMLButtonElement;
  recentDropdown: HTMLElement;
  setDisabled: (disabled: boolean) => void;
}

function basename(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || path;
}

function closeRecentMenu(dropdown: HTMLElement): void {
  dropdown.classList.remove("open");
  document.querySelector<HTMLButtonElement>('[aria-controls="recent-dropdown"]')
    ?.setAttribute("aria-expanded", "false");
}

export function createToolbar(callbacks: ToolbarCallbacks): ToolbarElements {
  const recentDropdown = el("div", {
    className: "recent-dropdown glass",
    id: "recent-dropdown",
  });

  const recentToggle = iconBtn("clock", {
    label: "Recent",
    iconOnly: true,
    props: {
      title: "Recently opened files",
      "aria-haspopup": "true",
      "aria-expanded": "false",
      "aria-controls": "recent-dropdown",
    },
  });

  recentToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = !recentDropdown.classList.contains("open");
    recentDropdown.classList.toggle("open", open);
    recentToggle.setAttribute("aria-expanded", String(open));
    if (open) {
      recentDropdown.querySelector<HTMLButtonElement>(".recent-item, .recent-clear")?.focus();
    }
  });

  document.addEventListener("click", () => closeRecentMenu(recentDropdown));

  recentDropdown.addEventListener("keydown", (e) => {
    const items = [...recentDropdown.querySelectorAll<HTMLButtonElement>(".recent-item, .recent-clear")];
    const index = items.indexOf(document.activeElement as HTMLButtonElement);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[Math.min(index + 1, items.length - 1)]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[Math.max(index - 1, 0)]?.focus();
    } else if (e.key === "Escape") {
      closeRecentMenu(recentDropdown);
      recentToggle.focus();
    }
  });

  const recentMenu = el("div", { className: "recent-menu" }, [recentToggle, recentDropdown]);
  const zoomLabel = el("span", { className: "zoom-label", textContent: "100%" });

  const openBtn = iconBtn("folder", {
    label: "Open",
    iconOnly: true,
    props: { className: "primary", title: "Open document (Ctrl+O)" },
    onClick: callbacks.onOpen,
  });

  const printBtn = iconBtn("print", {
    label: "Print",
    iconOnly: true,
    props: { title: "Print (Ctrl+P)", disabled: true },
    onClick: callbacks.onPrint,
  });

  const zoomOutBtn = iconBtn("zoomOut", {
    label: "Zoom out",
    iconOnly: true,
    props: { className: "zoom-btn", title: "Zoom out (Ctrl+-)" },
    onClick: callbacks.onZoomOut,
  });

  const zoomInBtn = iconBtn("zoomIn", {
    label: "Zoom in",
    iconOnly: true,
    props: { className: "zoom-btn", title: "Zoom in (Ctrl++)" },
    onClick: callbacks.onZoomIn,
  });

  const zoomResetBtn = iconBtn("actualSize", {
    label: "Actual size",
    iconOnly: true,
    props: { title: "Actual size (Ctrl+0)" },
    onClick: callbacks.onZoomReset,
  });

  const fitWidthBtn = iconBtn("fitWidth", {
    label: "Fit width",
    iconOnly: true,
    props: { title: "Fit width" },
    onClick: callbacks.onFitWidth,
  });

  const fileGroup = el("div", { className: "toolbar-group" }, [openBtn, recentMenu]);
  const zoomGroup = el("div", { className: "toolbar-group" }, [
    zoomOutBtn,
    zoomLabel,
    zoomInBtn,
    zoomResetBtn,
    fitWidthBtn,
  ]);

  const printGroup = el("div", { className: "toolbar-group" }, [printBtn]);

  const root = el("header", { className: "toolbar glass" }, [
    fileGroup,
    zoomGroup,
    el("div", { className: "spacer" }),
    printGroup,
  ]);

  const interactive = [openBtn, recentToggle, zoomOutBtn, zoomInBtn, zoomResetBtn, fitWidthBtn, printBtn];

  const setDisabled = (disabled: boolean): void => {
    for (const control of interactive) {
      if (control === printBtn) {
        if (disabled) {
          control.disabled = true;
        } else if (printBtn.dataset.loaded === "true") {
          control.disabled = false;
        }
      } else {
        control.disabled = disabled;
      }
    }
  };

  return {
    root,
    zoomLabel,
    printBtn,
    openBtn,
    recentToggle,
    recentDropdown,
    setDisabled,
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
    const item = el("button", {
      type: "button",
      className: "recent-item",
      title: path,
    }, [
      el("span", { className: "recent-item-row" }, [
        icon("document", "sm"),
        el("span", { className: "recent-item-text" }, [
          el("span", { className: "recent-item-name", textContent: basename(path) }),
          el("span", { className: "recent-item-path", textContent: path }),
        ]),
      ]),
    ]);

    item.addEventListener("click", (e) => {
      e.stopPropagation();
      closeRecentMenu(dropdown);
      onSelect(path);
    });
    dropdown.append(item);
  }

  const clearBtn = el("button", {
    type: "button",
    className: "recent-clear",
    textContent: "Clear recent",
  });
  clearBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeRecentMenu(dropdown);
    onClear();
  });
  dropdown.append(clearBtn);
}
