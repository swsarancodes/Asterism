import { create } from 'zustand';
import { DocumentState, createDocumentState } from '../../core/document/document';

const WELCOME_DOC = `# Asterism ⁂

> An open-source, distraction-free Markdown studio with visual hybrid editing.

The Markdown text **is** the document model. Bytes you don't touch are bytes we don't rewrite.

---

> [!NOTE]
> Asterism edits Markdown visually without an AST serialization step. When you move your cursor away from syntax, it renders cleanly; when your caret enters a node, the raw markdown is revealed instantly.

---

## 1. Live Mermaid Architecture

\`\`\`mermaid
flowchart TD
    A[Markdown File on Disk] -->|Zero Loss Read| B[CodeMirror 6 Text Buffer]
    B -->|Incremental Parse| C[Lezer Syntax Tree]
    C -->|Viewport Scoped| D[Hybrid Decoration Engine]
    D --> E[Notion Tables]
    D --> F[Mermaid Diagrams]
    D --> G[Concealed Inline Markdown]
    D --> H[Rich Callouts]
    E & F & G & H -->|Transactions Only| B
    B -->|Atomic Write| A
\`\`\`

---

## 2. Interactive Notion-Style Tables

| Feature | Description | Status |
| :--- | :--- | :---: |
| **Hybrid Concealment** | Hide syntax markers on blur | Ready |
| **Visual Tables** | In-place cell editing with padded writeback | Ready |
| **Mermaid Diagrams** | Live SVG rendering with rounded cards | Ready |
| **Lossless Invariant** | Byte-identical round trip | 100% |

---

## 3. Notion & GitHub Callouts

> [!TIP]
> You can toggle between **Hybrid View** (\`⌘1\`), **Source View** (\`⌘2\`), and **Split View** (\`⌘3\`) anytime using keyboard shortcuts.

> [!IMPORTANT]
> The search index is a disposable cache. Plain \`.md\` files on disk are always the single source of truth.

---

## 4. Interactive Task List

- [x] Fast incremental parsing with Lezer
- [x] Interactive clickable task list checkboxes
- [x] Notion-style tables with column alignment and live editing
- [x] Live Mermaid diagrams with theme matching
- [ ] Try creating your own table or diagram below!

---

## 5. Fenced Code Blocks

\`\`\`typescript
interface AsterismDocument {
  source: string; // The single source of truth
  isByteFaithful: true;
  widgets: ['table', 'mermaid', 'callout', 'checkbox'];
}
\`\`\`

---
*Press \`⌘K\` or \`⌘P\` to open the command palette.*
`;

export interface WorkspaceState {
  documents: DocumentState[];
  activeDocumentId: string | null;
  cursorLine: number;
  cursorCol: number;
  wordCount: number;
  charCount: number;
  readingTimeMin: number;

  createEmptyDocument: (title?: string) => void;
  openDocument: (content: string, filePath?: string | null) => void;
  setActiveDocument: (id: string) => void;
  closeDocument: (id: string) => void;
  updateDocumentContent: (id: string, newContent: string) => void;
  markDocumentSaved: (id: string, newPath?: string) => void;
  updateCursorStats: (line: number, col: number, docText: string) => void;
}

const initialDoc = createDocumentState(WELCOME_DOC, 'Welcome.md');

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  documents: [initialDoc],
  activeDocumentId: initialDoc.id,
  cursorLine: 1,
  cursorCol: 1,
  wordCount: computeWordCount(WELCOME_DOC),
  charCount: WELCOME_DOC.length,
  readingTimeMin: computeReadingTime(computeWordCount(WELCOME_DOC)),

  createEmptyDocument: (title = 'Untitled.md') => {
    const newDoc = createDocumentState('', title);
    set((state) => ({
      documents: [...state.documents, newDoc],
      activeDocumentId: newDoc.id,
    }));
  },

  openDocument: (content: string, filePath = null) => {
    const doc = createDocumentState(content, filePath);
    set((state) => {
      const existing = state.documents.find((d) => d.meta.filePath === filePath && filePath !== null);
      if (existing) {
        return { activeDocumentId: existing.id };
      }
      return {
        documents: [...state.documents, doc],
        activeDocumentId: doc.id,
      };
    });
  },

  setActiveDocument: (id: string) => {
    const doc = get().documents.find((d) => d.id === id);
    if (doc) {
      set({
        activeDocumentId: id,
        wordCount: computeWordCount(doc.currentText),
        charCount: doc.currentText.length,
        readingTimeMin: computeReadingTime(computeWordCount(doc.currentText)),
      });
    }
  },

  closeDocument: (id: string) => {
    set((state) => {
      const remaining = state.documents.filter((d) => d.id !== id);
      const nextActive = state.activeDocumentId === id ? (remaining[0]?.id ?? null) : state.activeDocumentId;
      return {
        documents: remaining,
        activeDocumentId: nextActive,
      };
    });
  },

  updateDocumentContent: (id: string, newContent: string) => {
    set((state) => ({
      documents: state.documents.map((doc) => {
        if (doc.id === id) {
          const isDirty = newContent !== doc.initialText;
          return { ...doc, currentText: newContent, isDirty };
        }
        return doc;
      }),
      wordCount: computeWordCount(newContent),
      charCount: newContent.length,
      readingTimeMin: computeReadingTime(computeWordCount(newContent)),
    }));
  },

  markDocumentSaved: (id: string, newPath?: string) => {
    set((state) => ({
      documents: state.documents.map((doc) => {
        if (doc.id === id) {
          return {
            ...doc,
            initialText: doc.currentText,
            isDirty: false,
            meta: {
              ...doc.meta,
              filePath: newPath || doc.meta.filePath,
              fileName: newPath ? newPath.split(/[\/\\]/).pop() || doc.meta.fileName : doc.meta.fileName,
            },
          };
        }
        return doc;
      }),
    }));
  },

  updateCursorStats: (line: number, col: number, docText: string) => {
    const words = computeWordCount(docText);
    set({
      cursorLine: line,
      cursorCol: col,
      wordCount: words,
      charCount: docText.length,
      readingTimeMin: computeReadingTime(words),
    });
  },
}));

function computeWordCount(text: string): number {
  if (!text.trim()) return 0;
  const matches = text.trim().match(/\S+/g);
  return matches ? matches.length : 0;
}

function computeReadingTime(words: number): number {
  return Math.max(1, Math.ceil(words / 200));
}
