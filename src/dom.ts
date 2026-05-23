type Child = Node | string;

export type ElementProps = Record<string, string | boolean | number | undefined>;

function applyProps(node: HTMLElement, props: ElementProps): void {
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined) continue;

    if (key === "className") {
      node.className = String(value);
    } else if (key in node && typeof value !== "object") {
      (node as unknown as Record<string, unknown>)[key] = value;
    } else {
      node.setAttribute(key, String(value));
    }
  }
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: ElementProps = {},
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  applyProps(node, props);
  node.append(...children);
  return node;
}

export function btn(
  text: string,
  props: ElementProps = {},
  onClick?: () => void,
): HTMLButtonElement {
  const button = el("button", { type: "button", textContent: text, ...props });
  if (onClick) button.addEventListener("click", onClick);
  return button;
}
