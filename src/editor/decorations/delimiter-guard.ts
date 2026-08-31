import { EditorView } from '@codemirror/view';
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

  // 1. Non-empty selection deletion
  if (!sel.empty) {
    for (const span of spans) {
      // If user selected the entire inner text of a bold tag, delete the whole block
      if (sel.from === span.innerFrom && sel.to === span.innerTo) {
        view.dispatch({
          changes: { from: span.openFrom, to: span.closeTo, insert: '' },
          selection: EditorSelection.cursor(span.openFrom),
        });
        return true;
      }
      // If selection is inside the span, but touches the closing delimiter boundary
      if (sel.from >= span.innerFrom && sel.to === span.closeTo) {
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
    return false;
  }

  // 2. Single caret backspace
  const pos = sel.head;

  for (const span of spans) {
    // If deleting the very last remaining character (inner length == 1)
    if (span.innerTo - span.innerFrom <= 1 && (pos === span.innerTo || pos === span.closeTo)) {
      view.dispatch({
        changes: { from: span.openFrom, to: span.closeTo, insert: '' },
        selection: EditorSelection.cursor(span.openFrom),
      });
      return true;
    }

    // If caret is right at the end of the entire bold node (after close delimiter: **text**|)
    if (pos === span.closeTo) {
      if (span.innerTo > span.innerFrom) {
        view.dispatch({
          changes: { from: span.innerTo - 1, to: span.innerTo, insert: '' },
          selection: EditorSelection.cursor(span.closeTo - 1),
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
    // If deleting the very last character with forward delete
    if (span.innerTo - span.innerFrom <= 1 && (pos === span.openFrom || pos === span.innerFrom)) {
      view.dispatch({
        changes: { from: span.openFrom, to: span.closeTo, insert: '' },
        selection: EditorSelection.cursor(span.openFrom),
      });
      return true;
    }

    // If caret is right before opening delimiter (|**text**)
    if (pos === span.openFrom) {
      if (span.innerTo > span.innerFrom) {
        view.dispatch({
          changes: { from: span.innerFrom, to: span.innerFrom + 1, insert: '' },
          selection: EditorSelection.cursor(span.openFrom),
        });
        return true;
      }
    }
  }

  return false;
}

/**
 * Transaction filter that automatically normalizes whitespace inside delimiters
 * (e.g. "**hi **" -> "**hi** ") so deleting words NEVER invalidates CommonMark bold formatting.
 */
export const delimiterNormalizer = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged) return tr;

  const newDoc = tr.newDoc.toString();
  const changes: ChangeSpec[] = [];

  // 1. Normalize Bold: ** text ** ->  **text** 
  const boldRegex = /\*\*(\s*)([^\*\n]+?)(\s*)\*\*/g;
  let bm: RegExpExecArray | null;
  while ((bm = boldRegex.exec(newDoc)) !== null) {
    const full = bm[0];
    const leading = bm[1];
    const core = bm[2];
    const trailing = bm[3];
    if (leading.length > 0 || trailing.length > 0) {
      changes.push({
        from: bm.index,
        to: bm.index + full.length,
        insert: `${leading}**${core}**${trailing}`,
      });
    }
  }

  // 2. Normalize Italic: * text * ->  *text* 
  const emRegex = /(?<!\*)\*(\s*)([^\*\n]+?)(\s*)\*(?!\*)/g;
  let em: RegExpExecArray | null;
  while ((em = emRegex.exec(newDoc)) !== null) {
    const full = em[0];
    const leading = em[1];
    const core = em[2];
    const trailing = em[3];
    if (leading.length > 0 || trailing.length > 0) {
      changes.push({
        from: em.index,
        to: em.index + full.length,
        insert: `${leading}*${core}*${trailing}`,
      });
    }
  }

  // 3. Normalize Strikethrough: ~~ text ~~ ->  ~~text~~ 
  const strikeRegex = /~~(\s*)([^~\n]+?)(\s*)~~/g;
  let sm: RegExpExecArray | null;
  while ((sm = strikeRegex.exec(newDoc)) !== null) {
    const full = sm[0];
    const leading = sm[1];
    const core = sm[2];
    const trailing = sm[3];
    if (leading.length > 0 || trailing.length > 0) {
      changes.push({
        from: sm.index,
        to: sm.index + full.length,
        insert: `${leading}~~${core}~~${trailing}`,
      });
    }
  }

  if (changes.length === 0) return tr;

  return [tr, { changes, sequential: true }];
});

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
