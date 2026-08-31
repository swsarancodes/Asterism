import React, { useState } from 'react';
import { useWorkspaceStore } from '../stores/workspace';
import { useSettingsStore } from '../stores/settings';
import {
  FileText,
  FolderOpen,
  Plus,
  PanelLeftClose,
  BookOpen,
  Search,
  X,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const documents = useWorkspaceStore((s) => s.documents);
  const activeId = useWorkspaceStore((s) => s.activeDocumentId);
  const setActiveDoc = useWorkspaceStore((s) => s.setActiveDocument);
  const closeDoc = useWorkspaceStore((s) => s.closeDocument);
  const createEmpty = useWorkspaceStore((s) => s.createEmptyDocument);
  const openDoc = useWorkspaceStore((s) => s.openDocument);

  const sidebarOpen = useSettingsStore((s) => s.sidebarOpen);
  const toggleSidebar = useSettingsStore((s) => s.toggleSidebar);

  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const visibleDocuments = documents.filter((doc) =>
    doc.meta.fileName.toLowerCase().includes(query.trim().toLowerCase())
  );

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
`;
    openDoc(specMarkdown, '03-editor-core-spec.md');
  };

  return (
    <aside
      aria-label="Sidebar navigation"
      style={{
        width: sidebarOpen ? '240px' : '0px',
        minWidth: sidebarOpen ? '240px' : '0px',
        height: '100%',
        backgroundColor: 'var(--as-bg-surface)',
        borderRight: sidebarOpen ? '1px solid var(--as-border)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        userSelect: 'none',
        transition: 'width 240ms cubic-bezier(0.16, 1, 0.3, 1), min-width 240ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        style={{
          width: '240px',
          minWidth: '240px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top Header Row with Logo and Collapse Button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '42px',
            padding: '0 10px 0 14px',
            borderBottom: '1px solid var(--as-border)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px', color: 'var(--as-accent)' }}>☞</span>
            <span style={{ fontWeight: 650, fontSize: '13.5px', letterSpacing: '-0.015em', color: 'var(--as-text)' }}>
              Manicule Studio
            </span>
          </div>

          <button
            type="button"
            aria-label="Collapse sidebar (⌘\)"
            title="Collapse sidebar (⌘\)"
            onClick={toggleSidebar}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: 'var(--as-radius-sm)',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--as-text-muted)',
              cursor: 'pointer',
              transition: 'all var(--as-transition-fast)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--as-bg-hover)';
              e.currentTarget.style.color = 'var(--as-text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--as-text-muted)';
            }}
          >
            <PanelLeftClose size={16} />
          </button>
        </div>

        {/* Quick Search */}
        <div style={{ padding: '8px 10px 4px 10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              borderRadius: 'var(--as-radius-sm)',
              backgroundColor: searchFocused ? 'var(--as-bg-surface)' : 'var(--as-bg-subtle)',
              border: searchFocused ? '1px solid var(--as-accent)' : '1px solid var(--as-border)',
              boxShadow: searchFocused ? 'var(--as-shadow-sm)' : 'none',
              transition: 'all var(--as-transition-fast)',
            }}
          >
            <Search size={13} style={{ color: 'var(--as-text-dim)', flexShrink: 0 }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Filter notes..."
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '12px',
                color: 'var(--as-text)',
                fontFamily: 'inherit',
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--as-text-muted)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Quick Action Navigation */}
        <div style={{ padding: '4px 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <button
            type="button"
            onClick={() => createEmpty()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '6px 10px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: 'var(--as-radius-sm)',
              color: 'var(--as-text)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background var(--as-transition-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--as-bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Plus size={15} style={{ color: 'var(--as-accent)' }} />
            <span>New Note</span>
          </button>

          <button
            type="button"
            onClick={handleOpenLocalFile}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '6px 10px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: 'var(--as-radius-sm)',
              color: 'var(--as-text-muted)',
              fontSize: '13px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background var(--as-transition-fast)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--as-bg-hover)';
              e.currentTarget.style.color = 'var(--as-text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--as-text-muted)';
            }}
          >
            <FolderOpen size={15} />
            <span>Open File…</span>
          </button>

          <button
            type="button"
            onClick={handleLoadSampleSpec}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '6px 10px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: 'var(--as-radius-sm)',
              color: 'var(--as-text-muted)',
              fontSize: '13px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background var(--as-transition-fast)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--as-bg-hover)';
              e.currentTarget.style.color = 'var(--as-text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--as-text-muted)';
            }}
          >
            <BookOpen size={15} />
            <span>Spec Reference</span>
          </button>
        </div>

        {/* Notes Section List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px 12px 8px' }}>
          <div
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--as-text-dim)',
              padding: '8px 8px 4px 8px',
              fontWeight: 650,
            }}
          >
            Notes ({visibleDocuments.length})
          </div>

          {visibleDocuments.length === 0 ? (
            <div style={{ padding: '12px 8px', fontSize: '12px', color: 'var(--as-text-dim)', fontStyle: 'italic' }}>
              No notes found
            </div>
          ) : (
            visibleDocuments.map((doc) => {
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
                    marginBottom: '1px',
                    transition: 'all var(--as-transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'var(--as-bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <FileText size={14} style={{ opacity: isActive ? 1 : 0.6, flexShrink: 0 }} />
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
                        flexShrink: 0,
                      }}
                    />
                  )}

                  {documents.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeDoc(doc.id);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--as-text-dim)',
                        cursor: 'pointer',
                        padding: '2px',
                        borderRadius: '3px',
                        display: 'flex',
                        alignItems: 'center',
                        opacity: 0.6,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
};
