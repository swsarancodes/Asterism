import { EditorState, Extension } from '@codemirror/state';
import { EditorView, keymap, drawSelection, dropCursor } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { createMarkdownExtension } from '../core/markdown/grammar';
import { getModeExtensions, ViewMode } from './modes/view-mode';

export interface EditorSetupOptions {
  initialDoc?: string;
  mode?: ViewMode;
  onDocChange?: (newDoc: string) => void;
  onCursorChange?: (line: number, col: number, selectionCount: number) => void;
}

export function createEditorExtensions(options: EditorSetupOptions = {}): Extension[] {
  const mode = options.mode || 'hybrid';

  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged && options.onDocChange) {
      options.onDocChange(update.state.doc.toString());
    }

    if (options.onCursorChange && (update.selectionSet || update.docChanged)) {
      const head = update.state.selection.main.head;
      const line = update.state.doc.lineAt(head);
      const col = head - line.from + 1;
      const selCount = update.state.selection.ranges.length;
      options.onCursorChange(line.number, col, selCount);
    }
  });

  return [
    history(),
    drawSelection(),
    dropCursor(),
    createMarkdownExtension(),
    ...getModeExtensions(mode),
    updateListener,
    keymap.of([...defaultKeymap, ...historyKeymap]),
    EditorView.lineWrapping,
  ];
}

export function createEditorState(options: EditorSetupOptions = {}): EditorState {
  return EditorState.create({
    doc: options.initialDoc || '',
    extensions: createEditorExtensions(options),
  });
}
