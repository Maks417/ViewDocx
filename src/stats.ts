export interface DocStats {
  lines: number;
  words: number;
}

const BLOCK_SELECTOR = "p, h1, h2, h3, h4, h5, h6, li, td, th";

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0 B";
  if (n < 1024) return `${n} B`;

  const kb = n / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;

  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;

  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}

export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

export function computeDocStats(container: HTMLElement): DocStats {
  const text = container.textContent ?? "";
  const trimmed = text.trim();
  const words = trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;

  let lines = 0;
  const blocks = container.querySelectorAll<HTMLElement>(BLOCK_SELECTOR);

  for (const block of blocks) {
    const range = document.createRange();
    range.selectNodeContents(block);
    const rectCount = range.getClientRects().length;
    range.detach?.();

    if (rectCount > 0) {
      lines += rectCount;
    } else if ((block.textContent ?? "").trim().length === 0) {
      lines += 1;
    }
  }

  return { lines, words };
}
