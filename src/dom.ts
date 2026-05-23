type Child = Node | string;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

export function btn(
  text: string,
  props: Partial<HTMLButtonElement> = {},
  onClick?: () => void,
): HTMLButtonElement {
  const button = el("button", { type: "button", textContent: text, ...props });
  if (onClick) button.addEventListener("click", onClick);
  return button;
}
