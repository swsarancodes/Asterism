import { FileMeta, detectFileMeta } from './file-meta';
import { serializeDocument } from './serialize';

export interface DocumentState {
  id: string;
  meta: FileMeta;
  initialText: string;
  currentText: string;
  isDirty: boolean;
}

export function createDocumentState(initialContent: string, filePath: string | null = null): DocumentState {
  const { text, meta } = detectFileMeta(initialContent, filePath);
  return {
    id: filePath || `doc-${Date.now()}`,
    meta,
    initialText: text,
    currentText: text,
    isDirty: false,
  };
}

export function serializeDocumentState(doc: DocumentState): string {
  return serializeDocument(doc.currentText, doc.meta);
}
