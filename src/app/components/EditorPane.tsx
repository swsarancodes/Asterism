import React, { useEffect, useRef, useState } from 'react';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { createEditorExtensions } from '../../editor/setup';
import { ViewMode } from '../../editor/modes/view-mode';
import { useWorkspaceStore } from '../stores/workspace';
import { useSettingsStore } from '../stores/settings';
import { FloatingToolbar } from './FloatingToolbar';
import { SlashCommandMenu } from './SlashCommandMenu';
import { toggleInlineFormat, setHeadingLevel } from '../../editor/commands/formatting';

interface EditorPaneProps {
  modeOverride?: ViewMode;
}

export const EditorPane: React.FC<EditorPaneProps> = ({ modeOverride }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const activeDocId = useWorkspaceStore((s) => s.activeDocumentId);
  const activeDoc = useWorkspaceStore((s) =>
    s.documents.find((d) => d.id === s.activeDocumentId)
  );
  const updateContent = useWorkspaceStore((s) => s.updateDocumentContent);
  const updateCursorStats = useWorkspaceStore((s) => s.updateCursorStats);

  const globalMode = useSettingsStore((s) => s.mode);
  const effectiveMode = modeOverride || globalMode;

  // Floating toolbar state (on text selection)
  const [floatingPos, setFloatingPos] = useState<{ top: number; left: number } | null>(null);

  // Slash command menu state (on typing /)
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashPos, setSlashPos] = useState<{ top: number; left: number } | null>(null);
  const [slashRange, setSlashRange] = useState<{ from: number; to: number } | null>(null);

  // Global keydown handler to ensure Cmd+B, Cmd+I, Cmd+E, Cmd+K work reliably
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (!viewRef.current || !viewRef.current.hasFocus) return;
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      const key = e.key.toLowerCase();
      if (key === 'b' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        toggleInlineFormat(viewRef.current, '**');
      } else if (key === 'i' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        toggleInlineFormat(viewRef.current, '*');
      } else if (key === 'e' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        toggleInlineFormat(viewRef.current, '`');
      } else if ((key === 'x' || key === 's') && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        toggleInlineFormat(viewRef.current, '~~');
      } else if (key === '1' && e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        setHeadingLevel(viewRef.current, 1);
      } else if (key === '2' && e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        setHeadingLevel(viewRef.current, 2);
      } else if (key === '3' && e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        setHeadingLevel(viewRef.current, 3);
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts, true);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts, true);
  }, []);

  // Initialize and update CodeMirror EditorView on activeDocId or effectiveMode change
  useEffect(() => {
    if (!containerRef.current) return;

    // Retain previous document text if available
    const initialText = viewRef.current
      ? viewRef.current.state.doc.toString()
      : (activeDoc ? activeDoc.currentText : '');

    const prevSelection = viewRef.current ? viewRef.current.state.selection : undefined;

    // Clean up previous view before creating new one
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    const extensions = createEditorExtensions({
      initialDoc: initialText,
      mode: effectiveMode,
      onDocChange: (newDoc) => {
        if (activeDocId) {
          updateContent(activeDocId, newDoc);
        }
      },
      onCursorChange: (line, col) => {
        const view = viewRef.current;
        if (!view) return;

        updateCursorStats(line, col, view.state.doc.toString());

        const sel = view.state.selection.main;

        // 1. Handle Floating Selection Toolbar
        if (!sel.empty && sel.to > sel.from && effectiveMode !== 'source') {
          const coords = view.coordsAtPos(sel.from);
          if (coords) {
            setFloatingPos({ top: coords.top, left: coords.left + (sel.to - sel.from) * 4 });
          }
          setSlashOpen(false);
        } else {
          setFloatingPos(null);

          // 2. Handle Slash Command Menu (/)
          if (effectiveMode !== 'source') {
            const head = sel.head;
            const lineObj = view.state.doc.lineAt(head);
            const textBefore = lineObj.text.slice(0, head - lineObj.from);
            const slashMatch = textBefore.match(/\/([a-zA-Z0-9_\-]*)$/);

            if (slashMatch) {
              const queryStr = slashMatch[1];
              const startPos = head - slashMatch[0].length;
              const coords = view.coordsAtPos(head);
              if (coords) {
                setSlashPos({ top: coords.bottom, left: coords.left });
                setSlashRange({ from: startPos, to: head });
                setSlashQuery(queryStr);
                setSlashOpen(true);
              }
            } else {
              setSlashOpen(false);
            }
          }
        }
      },
    });

    const state = EditorState.create({
      doc: initialText,
      selection: prevSelection,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [activeDocId, effectiveMode]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Floating Selection Toolbar (Bubble Menu) */}
      <FloatingToolbar view={viewRef.current} position={floatingPos} />

      {/* Notion-style Slash Command Menu (/) */}
      <SlashCommandMenu
        view={viewRef.current}
        isOpen={slashOpen}
        query={slashQuery}
        position={slashPos}
        slashRange={slashRange}
        onClose={() => setSlashOpen(false)}
      />
    </div>
  );
};
