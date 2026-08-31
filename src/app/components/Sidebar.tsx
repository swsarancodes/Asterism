import React from 'react';
import { useWorkspaceStore } from '../stores/workspace';
import { useSettingsStore } from '../stores/settings';
import { FileText, FolderOpen, Plus, PanelLeftClose, BookOpen } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const documents = useWorkspaceStore((s) => s.documents);
  const activeId = useWorkspaceStore((s) => s.activeDocumentId);
  const setActiveDoc = useWorkspaceStore((s) => s.setActiveDocument);
  const createEmpty = useWorkspaceStore((s) => s.createEmptyDocument);
  const openDoc = useWorkspaceStore((s) => s.openDocument);

  const sidebarOpen = useSettingsStore((s) => s.sidebarOpen);
  const toggleSidebar = useSettingsStore((s) => s.toggleSidebar);

  if (!sidebarOpen) {
    return null;
  }

  const handleOpenLocalFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.markdown,.txt';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const text = await file.text();
        openDoc(text, file.name);
      }
    };
    input.click();
  };

  const handleLoadSampleSpec = () => {
    const specMarkdown = `# 03 — Editor Core Spec

## 1. The model

There is exactly one representation of the document: **the Markdown text**.

\`\`\`
EditorState.doc  ← the only source of truth
      │
      ├── Lezer syntax tree      (derived, incremental, disposable)
      └── DecorationSet          (derived, viewport-scoped, disposable)
\`\`\`

There is no AST-of-record. There is no rich-text model. There is no
serialization step. Saving is \`doc.toString()\` plus line-ending restoration.

**Invariant:** if the user makes no edit, the bytes written equal the bytes read.

Anything that violates this is a P0 bug regardless of how nice it looks.

## 2. Editing modes

- **Hybrid** (default): Syntax concealed except at the caret; block widgets live (\`⌘1\`)
- **Source**: Raw Markdown, syntax highlighted, no concealment, no widgets (\`⌘2\`)
- **Split**: Hybrid and Source side by side, scroll-synced (\`⌘3\`)
`;
    openDoc(specMarkdown, '03-editor-core-spec.md');
  };

  return (
    <div
      style={{
        width: '240px',
        minWidth: '240px',
        height: '100%',
        backgroundColor: 'var(--as-bg-surface)',
        borderRight: '1px solid var(--as-border)',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          borderBottom: '1px solid var(--as-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '16px' }}>⁂</span>
          <span style={{ fontWeight: 650, fontSize: '13px', letterSpacing: '-0.01em' }}>
            Asterism Studio
          </span>
        </div>
        <button
          onClick={toggleSidebar}
          title="Toggle Sidebar (⌘\)"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--as-text-muted)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      {/* Action shortcuts */}
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <button
          onClick={() => createEmpty()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            padding: '7px 10px',
            backgroundColor: 'var(--as-bg-subtle)',
            border: '1px solid var(--as-border)',
            borderRadius: 'var(--as-radius-sm)',
            color: 'var(--as-text)',
            fontSize: '12.5px',
            fontWeight: 550,
            cursor: 'pointer',
            transition: 'background var(--as-transition-fast)',
          }}
        >
          <Plus size={14} />
          <span>New Note</span>
        </button>

        <button
          onClick={handleOpenLocalFile}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            padding: '7px 10px',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: 'var(--as-radius-sm)',
            color: 'var(--as-text-muted)',
            fontSize: '12.5px',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <FolderOpen size={14} />
          <span>Open File…</span>
        </button>

        <button
          onClick={handleLoadSampleSpec}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            padding: '7px 10px',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: 'var(--as-radius-sm)',
            color: 'var(--as-text-muted)',
            fontSize: '12.5px',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <BookOpen size={14} />
          <span>Load Spec Doc</span>
        </button>
      </div>

      {/* Document List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 12px 8px' }}>
        <div
          style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--as-text-dim)',
            padding: '8px 8px 4px 8px',
            fontWeight: 600,
          }}
        >
          Opened Notes ({documents.length})
        </div>

        {documents.map((doc) => {
          const isActive = doc.id === activeId;
          return (
            <div
              key={doc.id}
              onClick={() => setActiveDoc(doc.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 10px',
                borderRadius: 'var(--as-radius-sm)',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--as-text)' : 'var(--as-text-muted)',
                backgroundColor: isActive ? 'var(--as-bg-subtle)' : 'transparent',
                cursor: 'pointer',
                marginBottom: '2px',
                transition: 'all var(--as-transition-fast)',
              }}
            >
              <FileText size={14} style={{ opacity: isActive ? 1 : 0.6 }} />
              <span
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {doc.meta.fileName}
              </span>
              {doc.isDirty && (
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--as-accent)',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
