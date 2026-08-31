import React from 'react';
import { useWorkspaceStore } from '../stores/workspace';
import { useSettingsStore } from '../stores/settings';
import { Moon, Sun, PanelLeft } from 'lucide-react';

export const StatusBar: React.FC = () => {
  const line = useWorkspaceStore((s) => s.cursorLine);
  const col = useWorkspaceStore((s) => s.cursorCol);
  const wordCount = useWorkspaceStore((s) => s.wordCount);
  const charCount = useWorkspaceStore((s) => s.charCount);
  const readingTime = useWorkspaceStore((s) => s.readingTimeMin);
  const activeDoc = useWorkspaceStore((s) =>
    s.documents.find((d) => d.id === s.activeDocumentId)
  );

  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const sidebarOpen = useSettingsStore((s) => s.sidebarOpen);
  const toggleSidebar = useSettingsStore((s) => s.toggleSidebar);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '28px',
        backgroundColor: 'var(--as-bg-surface)',
        borderTop: '1px solid var(--as-border)',
        padding: '0 12px',
        fontSize: '11.5px',
        color: 'var(--as-text-dim)',
        userSelect: 'none',
      }}
    >
      {/* Left side: sidebar toggle & word statistics */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {!sidebarOpen && (
          <button
            onClick={toggleSidebar}
            title="Open Sidebar (⌘\)"
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: 0,
            }}
          >
            <PanelLeft size={13} />
          </button>
        )}

        <span>
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </span>
        <span>•</span>
        <span>{charCount} chars</span>
        <span>•</span>
        <span>{readingTime} min read</span>
      </div>

      {/* Right side: cursor coordinates, encoding, theme */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span>
          Ln {line}, Col {col}
        </span>
        <span>•</span>
        <span>
          {activeDoc?.meta.lineEnding === 'crlf' ? 'CRLF' : 'LF'} • UTF-8
        </span>

        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Theme`}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--as-text-muted)',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {theme === 'light' ? <Moon size={13} /> : <Sun size={13} />}
        </button>
      </div>
    </div>
  );
};
