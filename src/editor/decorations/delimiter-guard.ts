import { EditorView, KeyBinding } from '@codemirror/view';
import { EditorState, Extension, EditorSelection, ChangeSpec, Prec } from '@codemirror/state';

interface DelimiterSpan {
  openFrom: number;
  openTo: number;
  closeFrom: number;
  closeTo: number;
  innerFrom: number;
  innerTo: number;
  delimiter: string;
}

/**
 * Finds all active inline delimiter spans in the document
 */
export function findInlineSpans(docText: string): DelimiterSpan[] {
  const spans: DelimiterSpan[] = [];
  const regex = /(\*\*|~~|`|\*)([^\n]+?)(\1)/g;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(docText)) !== null) {
    const d = m[1];
    const dLen = d.length;
    const start = m.index;
    const end = start + m[0].length;
    spans.push({
      openFrom: start,
      openTo: start + dLen,
      closeFrom: end - dLen,
      closeTo: end,
      innerFrom: start + dLen,
      innerTo: end - dLen,
      delimiter: d,
    });
  }

  return spans;
}

/**
 * Smart backspace handler that protects concealed delimiters from accidental deletion
 */
export function smartBackspace(view: EditorView): boolean {
  const { state } = view;
  const doc = state.doc.toString();
  const sel = state.selection.main;
  const spans = findInlineSpans(doc);

  // 1. Non-empty selection deletion (e.g. user selected a word or sub-phrase)
  if (!sel.empty) {
    for (const span of spans) {
      // If selection is inside the span, but touches the closing delimiter boundary
      if (sel.from >= span.innerFrom && sel.to === span.closeTo) {
        // Clamp deletion to the inner content so closing delimiter is NOT destroyed
        view.dispatch({
          changes: { from: sel.from, to: span.innerTo, insert: '' },
          selection: EditorSelection.cursor(sel.from),
        });
        return true;
      }
      // If selection touches opening delimiter boundary but not closing
      if (sel.from === span.openFrom && sel.to <= span.innerTo && sel.to > span.innerFrom) {
        view.dispatch({
          changes: { from: span.innerFrom, to: sel.to, insert: '' },
          selection: EditorSelection.cursor(span.innerFrom),
        });
        return true;
      }
    }
    return false; // Let default backspace handle normal selection
  }

  // 2. Single caret backspace
  const pos = sel.head;

  for (const span of spans) {
    // If caret is right at the end of the entire bold node (after close delimiter: **text**|)
    if (pos === span.closeTo) {
      if (span.innerTo > span.innerFrom) {
        // Delete last character of inner content, NOT the closing delimiter!
        view.dispatch({
          changes: { from: span.innerTo - 1, to: span.innerTo, insert: '' },
          selection: EditorSelection.cursor(span.closeTo - 1),
        });
        return true;
      } else {
        // If content is already empty, delete the whole delimiter pair
        view.dispatch({
          changes: { from: span.openFrom, to: span.closeTo, insert: '' },
          selection: EditorSelection.cursor(span.openFrom),
        });
        return true;
      }
    }

    // If caret is right at the inner end (before close delimiter: **text|**)
    if (pos === span.innerTo) {
      if (span.innerTo > span.innerFrom) {
        view.dispatch({
          changes: { from: span.innerTo - 1, to: span.innerTo, insert: '' },
          selection: EditorSelection.cursor(span.innerTo - 1),
        });
        return true;
      } else {
        view.dispatch({
          changes: { from: span.openFrom, to: span.closeTo, insert: '' },
          selection: EditorSelection.cursor(span.openFrom),
        });
        return true;
      }
    }

    // If caret is right after opening delimiter (**|) and content is empty
    if (pos === span.innerFrom && span.innerFrom === span.innerTo) {
      view.dispatch({
        changes: { from: span.openFrom, to: span.closeTo, insert: '' },
        selection: EditorSelection.cursor(span.openFrom),
      });
      return true;
    }
  }

  return false;
}

/**
 * Smart delete (forward delete) handler that protects concealed delimiters
 */
export function smartDelete(view: EditorView): boolean {
  const { state } = view;
  const doc = state.doc.toString();
  const sel = state.selection.main;
  if (!sel.empty) return false;

  const pos = sel.head;
  const spans = findInlineSpans(doc);

  for (const span of spans) {
    // If caret is right before opening delimiter (|**text**)
    if (pos === span.openFrom) {
      if (span.innerTo > span.innerFrom) {
        // Delete first character of inner content, NOT the opening delimiter!
        view.dispatch({
          changes: { from: span.innerFrom, to: span.innerFrom + 1, insert: '' },
          selection: EditorSelection.cursor(span.openFrom),
        });
        return true;
      } else {
        view.dispatch({
          changes: { from: span.openFrom, to: span.closeTo, insert: '' },
          selection: EditorSelection.cursor(span.openFrom),
        });
        return true;
      }
    }
  }

  return false;
}

/**
 * Transaction filter that normalizes trailing/leading whitespace inside delimiters
 * to ensure CommonMark formatting never breaks into raw un-bold text.
 */
export const delimiterNormalizer = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged) return tr;

  const newDoc = tr.newDoc.toString();
  const regex = /(\*\*|~~|`|\*)([^\n]+?)(\1)/g;
  let m: RegExpExecArray | null;
  const fixes: ChangeSpec[] = [];

  while ((m = regex.exec(newDoc)) !== null) {
    const d = m[1];
    const full = m[0];
    const inner = m[2];
    const start = m.index;
    const end = start + full.length;

    // Check if inner content has trailing space before closing delimiter (e.g. "**hello **")
    const wsMatch = inner.match(/^(\s*)([\s\S]*?)(\s*)$/);
    if (wsMatch && (wsMatch[1].length > 0 || wsMatch[3].length > 0)) {
      const leading = wsMatch[1];
      const core = wsMatch[2];
      const trailing = wsMatch[3];

      if (core.length > 0) {
        // Normalize to " leading**core**trailing "
        const normalized = `${leading}${d}${core}${d}${trailing}`;
        if (normalized !== full) {
          fixes.push({ from: start, to: end, insert: normalized });
        }
      }
    }
  }

  if (fixes.length === 0) return tr;

  return [tr, { changes: fixes, sequential: true }];
});

/**
 * Keybindings for smart delimiter protection
 */
export const delimiterGuardKeymap: KeyBinding[] = [
  {
    key: 'Backspace',
    run: smartBackspace,
  },
  {
    key: 'Delete',
    run: smartDelete,
  },
];

export function delimiterGuard(): Extension {
  return [
    Prec.highest(EditorView.domEventHandlers({
      keydown(e, view) {
        if (e.key === 'Backspace') {
          if (smartBackspace(view)) {
            e.preventDefault();
            e.stopPropagation();
            return true;
          }
        } else if (e.key === 'Delete') {
          if (smartDelete(view)) {
            e.preventDefault();
            e.stopPropagation();
            return true;
          }
        }
        return false;
      },
    })),
    delimiterNormalizer,
  ];
}
