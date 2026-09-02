import { FileMeta, detectFileMeta } from './file-meta';
import { serializeDocument } from './serialize';

export interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
}

export function generateFolderId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `folder-${crypto.randomUUID()}`;
  }
  return `folder-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createFolderItem(name: string, parentId: string | null = null): FolderItem {
  return {
    id: generateFolderId(),
    name: name.trim() || 'New Folder',
    parentId,
    createdAt: Date.now(),
  };
}

export interface DocumentState {
  id: string;
  meta: FileMeta;
  initialText: string;
  currentText: string;
  isDirty: boolean;
  parentId?: string | null;
}

export function generateDocId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createDocumentState(
  initialContent: string,
  filePath: string | null = null,
  parentId: string | null = null
): DocumentState {
  const { text, meta } = detectFileMeta(initialContent, filePath);
  return {
    id: generateDocId(),
    meta,
    initialText: text,
    currentText: text,
    isDirty: false,
    parentId: parentId || null,
  };
}

export function serializeDocumentState(doc: DocumentState): string {
  return serializeDocument(doc.currentText, doc.meta);
}

export function syncDocumentHeading(text: string, title: string): string {
  const cleanTitle = title.trim();
  if (!cleanTitle) return text;

  const headingLine = `# ${cleanTitle}`;

  // If text is empty or only whitespace
  if (!text.trim()) {
    return `${headingLine}\n\n`;
  }

  // Check if text starts with YAML frontmatter
  const frontmatterMatch = text.match(/^(---\r?\n[\s\S]*?\r?\n---(?:\r?\n)*)/);
  if (frontmatterMatch) {
    const fm = frontmatterMatch[1];
    const rest = text.slice(fm.length);
    if (/^#\s+[^\r\n]*/.test(rest)) {
      return fm + rest.replace(/^#\s+[^\r\n]*/, headingLine);
    } else {
      return fm + `${headingLine}\n\n` + rest.replace(/^\r?\n*/, '');
    }
  }

  // If text starts with an H1 heading
  if (/^#\s+[^\r\n]*/.test(text)) {
    return text.replace(/^#\s+[^\r\n]*/, headingLine);
  }

  // Otherwise, prepend heading
  return `${headingLine}\n\n` + text.replace(/^\r?\n*/, '');
}

export function extractDocumentHeading(text: string): string | null {
  // Check frontmatter
  const frontmatterMatch = text.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n)*/);
  const body = frontmatterMatch ? text.slice(frontmatterMatch[0].length) : text;

  // Match the first H1 heading line
  const headingMatch = body.match(/^#\s+([^\r\n]+)/m);
  if (!headingMatch) return null;

  const headingText = headingMatch[1].trim();
  // Strip inline formatting like bold or code spans
  const cleanTitle = headingText.replace(/[*_~`]/g, '').trim();
  return cleanTitle || null;
}


