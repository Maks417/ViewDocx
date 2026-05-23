export type DocumentKind = "docx" | "legacydoc" | "unknown";

const DOCX_SIGNATURE = [0x50, 0x4b, 0x03, 0x04] as const;
const LEGACY_DOC_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] as const;

function matchesSignature(bytes: Uint8Array, signature: readonly number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((byte, index) => bytes[index] === byte);
}

export function detectDocumentKind(bytes: Uint8Array): DocumentKind {
  if (matchesSignature(bytes, DOCX_SIGNATURE)) return "docx";
  if (matchesSignature(bytes, LEGACY_DOC_SIGNATURE)) return "legacydoc";
  return "unknown";
}

export function isWordExtension(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith(".docx") || lower.endsWith(".doc");
}
