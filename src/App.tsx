import React, { useEffect } from 'react';
import { useSettingsStore } from './app/stores/settings';
import { Sidebar } from './app/components/Sidebar';
import { TabBar } from './app/components/TabBar';
import { EditorPane } from './app/components/EditorPane';
import { DocumentOutline } from './app/components/DocumentOutline';
import { StatusBar } from './app/components/StatusBar';
import { CommandPalette } from './app/components/CommandPalette';
import { FullTextSearchModal } from './app/components/FullTextSearchModal';
import './editor/theme/base.css';

export const App: React.FC = () => {
  const theme = useSettingsStore((s) => s.theme);
  const mode = useSettingsStore((s) => s.mode);

  // Sync theme to root attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div
      style={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        backgroundColor: 'var(--as-bg)',
        color: 'var(--as-text)',
        overflow: 'hidden',
        fontFamily: 'var(--as-font-body)',
      }}
    >
      {/* Sidebar */}
      <Sidebar />

      {/* Main Workspace */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {/* Tab & Mode Bar */}
        <TabBar />

        {/* Editor & Outline Area */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex' }}>
          {mode === 'split' ? (
            <>
              <div style={{ flex: 1, height: '100%', borderRight: '1px solid var(--as-border)' }}>
                <EditorPane modeOverride="hybrid" />
              </div>
              <div style={{ flex: 1, height: '100%' }}>
                <EditorPane modeOverride="source" />
              </div>
            </>
          ) : (
            <div style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
              <EditorPane />
            </div>
          )}

          {/* Document Outline Drawer */}
          <DocumentOutline />
        </div>

        {/* Status Bar */}
        <StatusBar />
      </div>

      {/* Command Palette (⌘K) */}
      <CommandPalette />

      {/* Full-Text Workspace Search (⌘⇧F) */}
      <FullTextSearchModal />
    </div>
  );
};

export default App;
