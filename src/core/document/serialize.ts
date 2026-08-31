import { FileMeta } from './file-meta';

/**
 * Serializes the editor text back to disk format, restoring
 * the exact original line endings (LF vs CRLF), BOM, and trailing newline.
 *
 * Invariant: open(x) -> no edit -> save(x) produces byte-identical output.
 */
export function serializeDocument(docText: string, meta: FileMeta): string {
  let result = docText;

  // Handle line endings
  if (meta.lineEnding === 'crlf') {
    // Ensure all LF are converted to CRLF without double CR
    result = result.replace(/\r?\n/g, '\r\n');
  } else {
    result = result.replace(/\r\n/g, '\n');
  }

  // Handle final newline preference
  if (meta.finalNewline && !result.endsWith(meta.lineEnding === 'crlf' ? '\r\n' : '\n')) {
    result += meta.lineEnding === 'crlf' ? '\r\n' : '\n';
  } else if (!meta.finalNewline && result.endsWith(meta.lineEnding === 'crlf' ? '\r\n' : '\n')) {
    if (meta.lineEnding === 'crlf' && result.endsWith('\r\n')) {
      result = result.slice(0, -2);
    } else if (result.endsWith('\n')) {
      result = result.slice(0, -1);
    }
  }

  // Handle UTF-8 BOM
  if (meta.hasBOM) {
    result = '\uFEFF' + result;
  }

  return result;
}
