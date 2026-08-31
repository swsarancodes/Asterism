import React from 'react';
import { useWorkspaceStore } from '../stores/workspace';
import { useSettingsStore } from '../stores/settings';
import { ViewMode } from '../../editor/modes/view-mode';
import { FileText, Plus, X, Eye, Code, Columns, PanelLeft } from 'lucide-react';

export const TabBar: React.FC = () => {
  const documents = useWorkspaceStore((s) => s.documents);
  const activeId = useWorkspaceStore((s) => s.activeDocumentId);
  const setActiveDoc = useWorkspaceStore((s) => s.setActiveDocument);
  const closeDoc = useWorkspaceStore((s) => s.closeDocument);
  const createEmpty = useWorkspaceStore((s) => s.createEmptyDocument);

  const mode = useSettingsStore((s) => s.mode);
  const setMode = useSettingsStore((s) => s.setMode);
  const sidebarOpen = useSettingsStore((s) => s.sidebarOpen);
  const toggleSidebar = useSettingsStore((s) => s.toggleSidebar);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '42px',
        borderBottom: '1px solid var(--as-border)',
        backgroundColor: 'var(--as-bg-surface)',
        padding: '0 10px',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {/* Left side: Expand sidebar button (when collapsed) + Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto' }}>
        {/* Top-Left Expand Sidebar Button when collapsed */}
        {!sidebarOpen && (
          <button
            type="button"
            aria-label="Expand sidebar (⌘\)"
            title="Expand sidebar (⌘\)"
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
              marginRight: '6px',
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
            <PanelLeft size={16} />
          </button>
        )}

        {documents.map((doc) => {
          const isActive = doc.id === activeId;
          return (
            <div
              key={doc.id}
              onClick={() => setActiveDoc(doc.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: 'var(--as-radius-sm)',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--as-text)' : 'var(--as-text-muted)',
                backgroundColor: isActive ? 'var(--as-bg-subtle)' : 'transparent',
                cursor: 'pointer',
                transition: 'all var(--as-transition-fast)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'var(--as-bg-hover)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <FileText size={14} style={{ opacity: isActive ? 1 : 0.7 }} />
              <span>{doc.meta.fileName}</span>
              {doc.isDirty && (
                <span
                  style={{
                    display: 'inline-block',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--as-accent)',
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
                    padding: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    color: 'inherit',
                    opacity: 0.6,
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

      {/* Right side: Mode Switcher */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'var(--as-bg-subtle)',
          borderRadius: 'var(--as-radius-sm)',
          padding: '2px',
          gap: '2px',
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
              }}
            >
              <Icon size={13} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
