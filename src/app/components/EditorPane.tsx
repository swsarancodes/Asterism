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
import { Folder, FileText } from 'lucide-react';
import { formatDisplayName } from '../../core/document/file-meta';

interface EditorPaneProps {
  modeOverride?: ViewMode;
}

export const EditorPane: React.FC<EditorPaneProps> = ({ modeOverride }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const activeDocId = useWorkspaceStore((s) => s.activeDocumentId);
  const documents = useWorkspaceStore((s) => s.documents);
  const folders = useWorkspaceStore((s) => s.folders);
  const setActiveDoc = useWorkspaceStore((s) => s.setActiveDocument);
  const updateContent = useWorkspaceStore((s) => s.updateDocumentContent);
  const updateCursorStats = useWorkspaceStore((s) => s.updateCursorStats);

  const globalMode = useSettingsStore((s) => s.mode);
  const effectiveMode = modeOverride || globalMode;

  // Floating toolbar state (on text selection)
  const [floatingPos, setFloatingPos] = useState<{ top: number; left: number } | null>(null);
  const [linkRequested, setLinkRequested] = useState(false);

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
      } else if (key === 'k' && !e.shiftKey && !e.altKey) {
        const view = viewRef.current;
        const sel = view.state.selection.main;
        if (!sel.empty && effectiveMode !== 'source') {
          e.preventDefault();
          e.stopPropagation();
          setLinkRequested(true);
        }
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

    // Clean up previous view before creating new one
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    const currentDoc = useWorkspaceStore.getState().documents.find((d) => d.id === activeDocId);
    const initialText = currentDoc ? currentDoc.currentText : '';

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

        updateCursorStats(line, col);

        const sel = view.state.selection.main;

        // 1. Handle Floating Selection Toolbar
        if (!sel.empty && sel.to > sel.from && effectiveMode !== 'source') {
          const coords = view.coordsAtPos(sel.from);
          if (coords) {
            setFloatingPos({
              top: Math.max(10, coords.top - 46),
              left: Math.max(10, coords.left),
            });
          }
        } else {
          setFloatingPos(null);
        }

        // 2. Handle Notion-style Slash Command Menu Trigger
        if (sel.empty) {
          const pos = sel.from;
          const lineObj = view.state.doc.lineAt(pos);
          const textBefore = lineObj.text.slice(0, pos - lineObj.from);

          const match = textBefore.match(/(?:^|\s)\/([a-zA-Z0-9]*)$/);
          if (match) {
            const slashFrom = pos - match[1].length - 1;
            const coords = view.coordsAtPos(pos);
            if (coords) {
              setSlashPos({
                top: coords.bottom + 4,
                left: coords.left,
              });
              setSlashQuery(match[1]);
              setSlashRange({ from: slashFrom, to: pos });
              setSlashOpen(true);
              return;
            }
          }
        }
        setSlashOpen(false);
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
  }, [activeDocId, effectiveMode]);

  // Compute Notion-style breadcrumb hierarchy
  const currentDoc = documents.find((d) => d.id === activeDocId);

  // Sync external document content updates (e.g. from renameDocument setting the heading) into CodeMirror
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !currentDoc) return;
    const currentEditorText = view.state.doc.toString();
    if (currentEditorText !== currentDoc.currentText) {
      const mainSel = view.state.selection.main;
      view.dispatch({
        changes: {
          from: 0,
          to: currentEditorText.length,
          insert: currentDoc.currentText,
        },
        selection: {
          anchor: Math.min(mainSel.anchor, currentDoc.currentText.length),
          head: Math.min(mainSel.head, currentDoc.currentText.length),
        },
      });
    }
  }, [currentDoc?.currentText]);

  interface BreadcrumbItem {
    id: string;
    title: string;
    type: 'folder' | 'doc';
  }

  const breadcrumbs: BreadcrumbItem[] = [];
  if (currentDoc) {
    let parentId = currentDoc.parentId;
    const visited = new Set<string>();
    while (parentId && !visited.has(parentId)) {
      visited.add(parentId);
      const parentDoc = documents.find((d) => d.id === parentId);
      if (parentDoc) {
        breadcrumbs.unshift({
          id: parentDoc.id,
          title: formatDisplayName(parentDoc.meta.fileName),
          type: 'doc',
        });
        parentId = parentDoc.parentId ?? null;
        continue;
      }
      const parentFolder = folders.find((f) => f.id === parentId);
      if (parentFolder) {
        breadcrumbs.unshift({
          id: parentFolder.id,
          title: parentFolder.name,
          type: 'folder',
        });
        parentId = parentFolder.parentId;
        continue;
      }
      break;
    }
    breadcrumbs.push({
      id: currentDoc.id,
      title: formatDisplayName(currentDoc.meta.fileName),
      type: 'doc',
    });
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Notion-style Breadcrumb Trail */}
      {breadcrumbs.length > 1 && (
        <nav aria-label="Breadcrumbs" className="as-breadcrumbs">
          {breadcrumbs.map((item, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={`crumb-${item.id}-${idx}`}>
                {idx > 0 && <span className="as-breadcrumb-separator">/</span>}
                <span
                  className={isLast ? '' : 'as-breadcrumb-item'}
                  onClick={() => {
                    if (!isLast && item.type === 'doc') {
                      setActiveDoc(item.id);
                    }
                  }}
                  style={{
                    fontWeight: isLast ? 600 : 400,
                    color: isLast ? 'var(--as-text)' : 'inherit',
                    cursor: isLast || item.type === 'folder' ? 'default' : 'pointer',
                  }}
                >
                  {item.type === 'folder' ? (
                    <Folder size={12} style={{ color: 'var(--as-accent)', marginRight: '3px' }} />
                  ) : (
                    <FileText size={12} style={{ opacity: 0.7, marginRight: '3px' }} />
                  )}
                  {item.title}
                </span>
              </React.Fragment>
            );
          })}
        </nav>
      )}

      {/* Editor Container */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          width: '100%',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Floating Selection Toolbar (Bubble Menu) */}
        <FloatingToolbar
          view={viewRef.current}
          position={floatingPos}
          openLinkRequested={linkRequested}
          onLinkHandled={() => setLinkRequested(false)}
        />

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
    </div>
  );
};
