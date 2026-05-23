import { el, type ElementProps } from "../dom";

export type IconName =
  | "document"
  | "folder"
  | "clock"
  | "zoomOut"
  | "zoomIn"
  | "actualSize"
  | "fitWidth"
  | "print";

const ICON_PATHS: Record<IconName, string> = {
  document: `
    <path d="M8 3h6l4 4v14a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 21V4.5A1.5 1.5 0 0 1 7.5 3H8z"/>
    <path d="M14 3v4.5H18.5"/>
    <path d="M9 12h6M9 15.5h6M9 19h4"/>
  `,
  folder: `
    <path d="M4 8.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9.5a1.5 1.5 0 0 0-1.5-1.5H11l-2-2H4a1.5 1.5 0 0 0-1.5 1.5z"/>
    <path d="M4 10.5h16"/>
  `,
  clock: `
    <circle cx="12" cy="12" r="8.25"/>
    <path d="M12 7.5V12l3 2"/>
  `,
  zoomOut: `
    <circle cx="10.75" cy="10.75" r="6.25"/>
    <path d="M16 16l4.5 4.5"/>
    <path d="M8 10.75h5.5"/>
  `,
  zoomIn: `
    <circle cx="10.75" cy="10.75" r="6.25"/>
    <path d="M16 16l4.5 4.5"/>
    <path d="M10.75 8v5.5M8 10.75h5.5"/>
  `,
  actualSize: `
    <path d="M8 4H4v4M16 4h4v4M4 16v4h4M20 16v4h-4"/>
  `,
  fitWidth: `
    <path d="M4 7.5h16v9H4z"/>
    <path d="M7.5 12H6M7.5 12L6 10.5M7.5 12 6 13.5"/>
    <path d="M16.5 12H18M16.5 12 18 10.5M16.5 12 18 13.5"/>
  `,
  print: `
    <path d="M7 8V5.5A1.5 1.5 0 0 1 8.5 4h7A1.5 1.5 0 0 1 17 5.5V8"/>
    <path d="M6 8h12a2.5 2.5 0 0 1 2.5 2.5V15H18v4.5A1.5 1.5 0 0 1 16.5 20h-9A1.5 1.5 0 0 1 6 18.5V15H3.5v-4.5A2.5 2.5 0 0 1 6 8z"/>
    <path d="M6 15h12v3.5H6z"/>
    <path d="M8.5 11.5h.01M8.5 14h7"/>
  `,
};

export function icon(name: IconName, size: "sm" | "md" | "lg" = "sm"): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", `icon icon-${size}`);
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.75");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.innerHTML = ICON_PATHS[name];
  return svg;
}

export interface IconButtonOptions {
  label: string;
  iconOnly?: boolean;
  props?: ElementProps;
  onClick?: () => void;
}

export function iconBtn(iconName: IconName, options: IconButtonOptions): HTMLButtonElement {
  const { label, iconOnly = false, props = {}, onClick } = options;
  const iconEl = icon(iconName, iconOnly ? "md" : "sm");

  const classNames = ["icon-btn", iconOnly ? "icon-only" : "", props.className]
    .filter(Boolean)
    .join(" ");

  const button = el(
    "button",
    {
      ...props,
      type: "button",
      className: classNames,
      title: props.title ?? label,
      "aria-label": iconOnly ? label : undefined,
    },
    iconOnly ? [iconEl] : [iconEl, label],
  );

  if (onClick) button.addEventListener("click", onClick);
  return button;
}

export function iconLabel(iconName: IconName, text: string, className = "icon-label"): HTMLElement {
  return el("span", { className }, [icon(iconName, "sm"), text]);
}
