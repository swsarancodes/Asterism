import React, { useEffect, useRef } from 'react';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { createEditorExtensions } from '../../editor/setup';
import { modeCompartment, getModeExtensions, ViewMode } from '../../editor/modes/view-mode';
import { useWorkspaceStore } from '../stores/workspace';
import { useSettingsStore } from '../stores/settings';

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

  // Initialize CodeMirror EditorView
  useEffect(() => {
    if (!containerRef.current) return;

    const initialText = activeDoc ? activeDoc.currentText : '';

    const extensions = createEditorExtensions({
      initialDoc: initialText,
      mode: effectiveMode,
      onDocChange: (newDoc) => {
        if (activeDocId) {
          updateContent(activeDocId, newDoc);
        }
      },
      onCursorChange: (line, col) => {
        if (viewRef.current) {
          updateCursorStats(line, col, viewRef.current.state.doc.toString());
        }
      },
    });

    const state = EditorState.create({
      doc: initialText,
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
  }, [activeDocId]); // Recreate when switching document

  // Update mode without destroying the view or losing state
  useEffect(() => {
    if (!viewRef.current) return;
    viewRef.current.dispatch({
      effects: modeCompartment.reconfigure(getModeExtensions(effectiveMode)),
    });
  }, [effectiveMode]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
      }}
    />
  );
};
