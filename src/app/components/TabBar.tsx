import React from 'react';
import { useWorkspaceStore } from '../stores/workspace';
import { useSettingsStore } from '../stores/settings';
import { ViewMode } from '../../editor/modes/view-mode';
import { FileText, Plus, X, Eye, Code, Columns, PanelLeft, ListTree, Search, Download, Printer, FileDown, ChevronDown } from 'lucide-react';
import { formatDisplayName } from '../../core/document/file-meta';
import { exportToPdf, exportToMarkdown, exportToHtml } from '../../core/document/export';

export const TabBar: React.FC = () => {
  const documents = useWorkspaceStore((s) => s.documents);
  const activeId = useWorkspaceStore((s) => s.activeDocumentId);
  const setActiveDoc = useWorkspaceStore((s) => s.setActiveDocument);
  const closeDoc = useWorkspaceStore((s) => s.closeDocument);
  const createEmpty = useWorkspaceStore((s) => s.createEmptyDocument);
  const renameDoc = useWorkspaceStore((s) => s.renameDocument);

  const mode = useSettingsStore((s) => s.mode);
  const setMode = useSettingsStore((s) => s.setMode);
  const sidebarOpen = useSettingsStore((s) => s.sidebarOpen);
  const toggleSidebar = useSettingsStore((s) => s.toggleSidebar);
  const outlineOpen = useSettingsStore((s) => s.outlineOpen);
  const toggleOutline = useSettingsStore((s) => s.toggleOutline);
  const toggleSearchModal = useSettingsStore((s) => s.toggleSearchModal);

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState('');
  const [exportMenuOpen, setExportMenuOpen] = React.useState(false);
  const exportRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Close export dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    if (exportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [exportMenuOpen]);

  // Global shortcut for PDF Export / Print (⌘P)
  React.useEffect(() => {
    const handlePrint = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        exportToPdf();
      }
    };
    window.addEventListener('keydown', handlePrint);
    return () => window.removeEventListener('keydown', handlePrint);
  }, []);

  // Global shortcut for Document Outline (⌘⇧O)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'O' || e.key === 'o')) {
        e.preventDefault();
        toggleOutline();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleOutline]);

  React.useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const handleStartRename = (docId: string, currentName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingId(docId);
    setEditingName(formatDisplayName(currentName));
  };

  const handleFinishRename = (docId: string) => {
    if (editingName.trim()) {
      renameDoc(docId, editingName.trim());
    }
    setEditingId(null);
  };

  return (
    <div
      className="as-tabbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '42px',
        borderBottom: '1px solid var(--as-border)',
        backgroundColor: 'var(--as-bg-surface)',
        padding: '0 8px',
        userSelect: 'none',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* Left side: Sidebar toggle button + Scrollable Tabs */}
      <div
        className="as-tabbar-left"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          marginRight: '6px',
        }}
      >
        {/* Sidebar Toggle Button */}
        <button
          type="button"
          aria-label={sidebarOpen ? 'Collapse sidebar (⌘\\)' : 'Expand sidebar (⌘\\)'}
          title={sidebarOpen ? 'Collapse sidebar (⌘\\)' : 'Expand sidebar (⌘\\)'}
          onClick={toggleSidebar}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: 'var(--as-radius-sm)',
            border: 'none',
            backgroundColor: !sidebarOpen ? 'var(--as-bg-subtle)' : 'transparent',
            color: !sidebarOpen ? 'var(--as-accent)' : 'var(--as-text-muted)',
            cursor: 'pointer',
            flexShrink: 0,
            marginRight: '4px',
            transition: 'all var(--as-transition-fast)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--as-bg-hover)';
            e.currentTarget.style.color = 'var(--as-text)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = !sidebarOpen ? 'var(--as-bg-subtle)' : 'transparent';
            e.currentTarget.style.color = !sidebarOpen ? 'var(--as-accent)' : 'var(--as-text-muted)';
          }}
        >
          <PanelLeft size={16} />
        </button>

        {/* Scrollable Tabs */}
        <div
          className="as-tab-scroll-container"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            overflowX: 'auto',
            overflowY: 'hidden',
            flex: 1,
            minWidth: 0,
          }}
        >
          {documents
            .filter((doc) => !doc.deletedAt)
            .map((doc) => {
              const isActive = doc.id === activeId;
              const isEditing = doc.id === editingId;

              return (
                <div
                  key={doc.id}
                  onClick={() => setActiveDoc(doc.id)}
                  onDoubleClick={(e) => handleStartRename(doc.id, doc.meta.fileName, e)}
                  className="as-tab-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 10px',
                    borderRadius: 'var(--as-radius-sm)',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'var(--as-text)' : 'var(--as-text-muted)',
                    backgroundColor: isActive ? 'var(--as-bg-subtle)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all var(--as-transition-fast)',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                    maxWidth: '180px',
                    minWidth: '50px',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'var(--as-bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <FileText size={14} style={{ opacity: isActive ? 1 : 0.7, flexShrink: 0 }} />

                  {isEditing ? (
                    <input
                      ref={inputRef}
                      autoFocus
                      type="text"
                      value={editingName}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => handleFinishRename(doc.id)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') {
                          handleFinishRename(doc.id);
                        } else if (e.key === 'Escape') {
                          setEditingId(null);
                        }
                      }}
                      style={{
                        fontSize: '13px',
                        fontWeight: isActive ? 600 : 400,
                        fontFamily: 'inherit',
                        color: 'var(--as-text)',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderBottom: '1.5px solid var(--as-accent)',
                        borderRadius: '0',
                        outline: 'none',
                        padding: '0 1px',
                        margin: 0,
                        width: `${Math.max(40, (editingName.length + 1) * 7.5)}px`,
                        minWidth: '40px',
                      }}
                    />
                  ) : (
                    <span
                      title={`${doc.meta.fileName} (Double-click to rename)`}
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {formatDisplayName(doc.meta.fileName)}
                    </span>
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
                        padding: 0,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'inherit',
                        opacity: 0.6,
                        flexShrink: 0,
                        width: '14px',
                        height: '14px',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              );
            })}

          <button
            type="button"
            onClick={() => createEmpty()}
            title="New Document (⌘N)"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--as-text-muted)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
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
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Right side: Mode Switcher & Actions */}
      <div
        className="as-tabbar-right"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--as-bg-subtle)',
            borderRadius: 'var(--as-radius-sm)',
            padding: '2px',
            gap: '2px',
            flexShrink: 0,
          }}
        >
          {(
            [
              { id: 'hybrid', label: 'Hybrid', icon: Eye, shortcut: '⌘1' },
              { id: 'source', label: 'Source', icon: Code, shortcut: '⌘2' },
              { id: 'split', label: 'Split', icon: Columns, shortcut: '⌘3' },
            ] as Array<{ id: ViewMode; label: string; icon: any; shortcut: string }>
          ).map((item) => {
            const isSelected = mode === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className="as-view-mode-btn"
                onClick={() => setMode(item.id)}
                title={`${item.label} Mode (${item.shortcut})`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: isSelected ? 600 : 400,
                  color: isSelected ? 'var(--as-text)' : 'var(--as-text-muted)',
                  backgroundColor: isSelected ? 'var(--as-bg-surface)' : 'transparent',
                  boxShadow: isSelected ? 'var(--as-shadow-sm)' : 'none',
                  cursor: 'pointer',
                  transition: 'all var(--as-transition-fast)',
                  flexShrink: 0,
                }}
              >
                <Icon size={13} style={{ flexShrink: 0 }} />
                <span className="as-view-mode-label">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Outline Button */}
        <button
          type="button"
          className="as-tabbar-action-btn"
          onClick={toggleOutline}
          title="Document Outline (⌘⇧O)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '5px 8px',
            border: 'none',
            borderRadius: 'var(--as-radius-sm)',
            fontSize: '12px',
            fontWeight: outlineOpen ? 600 : 400,
            color: outlineOpen ? 'var(--as-accent)' : 'var(--as-text-muted)',
            backgroundColor: outlineOpen ? 'var(--as-bg-surface)' : 'transparent',
            boxShadow: outlineOpen ? 'var(--as-shadow-sm)' : 'none',
            cursor: 'pointer',
            transition: 'all var(--as-transition-fast)',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            if (!outlineOpen) {
              e.currentTarget.style.backgroundColor = 'var(--as-bg-subtle)';
              e.currentTarget.style.color = 'var(--as-text)';
            }
          }}
          onMouseLeave={(e) => {
            if (!outlineOpen) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--as-text-muted)';
            }
          }}
        >
          <ListTree size={14} style={{ flexShrink: 0 }} />
          <span className="as-tabbar-btn-label">Outline</span>
        </button>

        {/* Full-Text Search Button */}
        <button
          type="button"
          className="as-tabbar-action-btn"
          onClick={toggleSearchModal}
          title="Full-Text Search (⌘⇧F)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '5px 8px',
            border: 'none',
            borderRadius: 'var(--as-radius-sm)',
            fontSize: '12px',
            fontWeight: 400,
            color: 'var(--as-text-muted)',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            transition: 'all var(--as-transition-fast)',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--as-bg-subtle)';
            e.currentTarget.style.color = 'var(--as-text)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--as-text-muted)';
          }}
        >
          <Search size={14} style={{ flexShrink: 0 }} />
          <span className="as-tabbar-btn-label">Search</span>
        </button>

        {/* Export Dropdown */}
        <div ref={exportRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            type="button"
            className="as-tabbar-action-btn"
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
            title="Export Document (⌘P for PDF)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px 8px',
              border: 'none',
              borderRadius: 'var(--as-radius-sm)',
              fontSize: '12px',
              fontWeight: 400,
              color: 'var(--as-text-muted)',
              backgroundColor: exportMenuOpen ? 'var(--as-bg-subtle)' : 'transparent',
              cursor: 'pointer',
              transition: 'all var(--as-transition-fast)',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (!exportMenuOpen) {
                e.currentTarget.style.backgroundColor = 'var(--as-bg-subtle)';
                e.currentTarget.style.color = 'var(--as-text)';
              }
            }}
            onMouseLeave={(e) => {
              if (!exportMenuOpen) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--as-text-muted)';
              }
            }}
          >
            <Download size={14} style={{ flexShrink: 0 }} />
            <span className="as-tabbar-btn-label">Export</span>
            <ChevronDown size={11} style={{ opacity: 0.7, flexShrink: 0 }} />
          </button>

          {exportMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                width: '180px',
                backgroundColor: 'var(--as-bg-surface)',
                border: '1px solid var(--as-border)',
                borderRadius: 'var(--as-radius-sm, 6px)',
                boxShadow: 'var(--as-shadow-md)',
                padding: '4px',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setExportMenuOpen(false);
                  exportToPdf();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  color: 'var(--as-text)',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--as-bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Printer size={13} style={{ color: 'var(--as-accent)' }} />
                <span>Export PDF (⌘P)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setExportMenuOpen(false);
                  const activeDoc = documents.find((d) => d.id === activeId);
                  if (activeDoc) exportToMarkdown(activeDoc.meta.fileName, activeDoc.currentText);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  color: 'var(--as-text)',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--as-bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <FileDown size={13} style={{ color: 'var(--as-accent)' }} />
                <span>Save Markdown (.md)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setExportMenuOpen(false);
                  const activeDoc = documents.find((d) => d.id === activeId);
                  if (activeDoc) exportToHtml(activeDoc.meta.fileName, activeDoc.currentText);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  color: 'var(--as-text)',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--as-bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <FileText size={13} style={{ color: 'var(--as-accent)' }} />
                <span>Export HTML (.html)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
