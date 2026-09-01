export type LineEnding = 'lf' | 'crlf';

export interface FileMeta {
  filePath: string | null;
  fileName: string;
  lineEnding: LineEnding;
  hasBOM: boolean;
  finalNewline: boolean;
  mtime: number;
  hash: string;
}

export function detectFileMeta(content: string, filePath: string | null = null): { text: string; meta: FileMeta } {
  let text = content;
  let hasBOM = false;

  // Detect UTF-8 BOM
  if (text.charCodeAt(0) === 0xfeff) {
    hasBOM = true;
    text = text.slice(1);
  }

  // Detect line ending (CRLF vs LF)
  const crlfCount = (text.match(/\r\n/g) || []).length;
  const lfOnlyCount = (text.match(/[^\r]\n/g) || []).length;
  const lineEnding: LineEnding = crlfCount > lfOnlyCount ? 'crlf' : 'lf';

  // Normalize text internally to LF for CodeMirror
  const normalizedText = text.replace(/\r\n/g, '\n');

  // Detect final newline
  const finalNewline = normalizedText.endsWith('\n');

  // Derive file name
  const fileName = filePath ? filePath.split(/[\/\\]/).pop() || 'Untitled.md' : 'Untitled.md';

  return {
    text: normalizedText,
    meta: {
      filePath,
      fileName,
      lineEnding,
      hasBOM,
      finalNewline,
      mtime: Date.now(),
      hash: simpleHash(content),
    },
  };
}

export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString(16);
}

/**
 * Returns a clean, human-friendly display title for UI by stripping .md / .markdown extensions.
 * e.g. "Project Notes.md" -> "Project Notes"
 */
export function formatDisplayName(fileName: string): string {
  if (!fileName) return 'Untitled';
  return fileName.replace(/\.(md|markdown)$/i, '');
}
