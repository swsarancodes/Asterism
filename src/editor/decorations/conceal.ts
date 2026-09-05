import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';

const concealedMarkDeco = Decoration.mark({ class: 'as-syntax-hidden' });

/**
 * Builds the concealment decoration set for visible ranges.
 * Conceals opening/closing syntax tokens using non-destructive visual span marks.
 */
export function buildConcealDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;
  const rawRanges: Array<{ from: number; to: number }> = [];

  for (const { from, to } of view.visibleRanges) {
    // 1. Iterate AST nodes
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        const name = node.name;

        // Skip anything inside fenced code or tables (they are block widgets)
        if (name === 'FencedCode' || name === 'Table') {
          return false;
        }

        // Bold: StrongEmphasis (**text** or __text__)
        if (name === 'StrongEmphasis') {
          const nodeText = doc.sliceString(node.from, node.to);
          const markerLen = nodeText.startsWith('**') || nodeText.startsWith('__') ? 2 : 0;
          if (markerLen > 0 && node.to - node.from >= markerLen * 2) {
            rawRanges.push({ from: node.from, to: node.from + markerLen });
            rawRanges.push({ from: node.to - markerLen, to: node.to });
          }
        }

        // Italic: Emphasis (*text* or _text_)
        else if (name === 'Emphasis') {
          const markerLen = 1;
          if (node.to - node.from >= markerLen * 2) {
            rawRanges.push({ from: node.from, to: node.from + markerLen });
            rawRanges.push({ from: node.to - markerLen, to: node.to });
          }
        }

        // Strikethrough: Strikethrough (~~text~~)
        else if (name === 'Strikethrough') {
          const markerLen = 2;
          if (node.to - node.from >= markerLen * 2) {
            rawRanges.push({ from: node.from, to: node.from + markerLen });
            rawRanges.push({ from: node.to - markerLen, to: node.to });
          }
        }

        // Inline Code: InlineCode (`code`)
        else if (name === 'InlineCode') {
          const nodeText = doc.sliceString(node.from, node.to);
          let backtickCount = 0;
          while (backtickCount < nodeText.length && nodeText[backtickCount] === '`') {
            backtickCount++;
          }
          if (backtickCount > 0 && node.to - node.from >= backtickCount * 2) {
            rawRanges.push({ from: node.from, to: node.from + backtickCount });
            rawRanges.push({ from: node.to - backtickCount, to: node.to });
          }
        }

        // ATX Headings: Hide # prefix in visual mode
        else if (name.startsWith('ATXHeading')) {
          const lineText = doc.sliceString(node.from, node.to);
          const match = lineText.match(/^(#{1,6}\s+)/);
          if (match) {
            rawRanges.push({ from: node.from, to: node.from + match[1].length });
          }
        }

        // Link: [text](url) -> conceal [ and ](url)
        else if (name === 'Link') {
          const linkText = doc.sliceString(node.from, node.to);
          const closeBracketIdx = linkText.indexOf('](');
          if (linkText.startsWith('[') && closeBracketIdx !== -1 && linkText.endsWith(')')) {
            rawRanges.push({ from: node.from, to: node.from + 1 });
            rawRanges.push({ from: node.from + closeBracketIdx, to: node.to });
          }
        }
      },
    });

    // 2. Resilient pattern matching for inline syntax markers
    const text = doc.sliceString(from, to);

    // Bold pattern: **text**
    const boldRegex = /\*\*([^\*\n]+?)\*\*/g;
    let bm: RegExpExecArray | null;
    while ((bm = boldRegex.exec(text)) !== null) {
      const start = from + bm.index;
      const end = start + bm[0].length;
      rawRanges.push({ from: start, to: start + 2 });
      rawRanges.push({ from: end - 2, to: end });
    }

    // Strikethrough pattern: ~~text~~
    const strikeRegex = /~~([^~\n]+?)~~/g;
    let sm: RegExpExecArray | null;
    while ((sm = strikeRegex.exec(text)) !== null) {
      const start = from + sm.index;
      const end = start + sm[0].length;
      rawRanges.push({ from: start, to: start + 2 });
      rawRanges.push({ from: end - 2, to: end });
    }

    // Highlight pattern: ==text==
    const highlightRegex = /==([^=\n]+?)==/g;
    let hm: RegExpExecArray | null;
    while ((hm = highlightRegex.exec(text)) !== null) {
      const start = from + hm.index;
      const end = start + hm[0].length;
      rawRanges.push({ from: start, to: start + 2 });
      rawRanges.push({ from: end - 2, to: end });
    }

    // Inline code pattern: `code`
    const codeRegex = /`([^`\n]+?)`/g;
    let cm: RegExpExecArray | null;
    while ((cm = codeRegex.exec(text)) !== null) {
      const start = from + cm.index;
      const end = start + cm[0].length;
      rawRanges.push({ from: start, to: start + 1 });
      rawRanges.push({ from: end - 1, to: end });
    }
  }

  // Filter valid ranges, sort, and deduplicate in a single O(N) pass
  const validRanges = rawRanges
    .filter((r) => r.from < r.to)
    .sort((a, b) => a.from - b.from || a.to - b.to);

  let lastFrom = -1;
  let lastTo = -1;

  for (const r of validRanges) {
    if (r.from !== lastFrom || r.to !== lastTo) {
      builder.add(r.from, r.to, concealedMarkDeco);
      lastFrom = r.from;
      lastTo = r.to;
    }
  }

  return builder.finish();
}

/**
 * ViewPlugin that manages syntax concealment.
 */
export const concealPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildConcealDecorations(view);
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        syntaxTree(update.state) !== syntaxTree(update.startState)
      ) {
        this.decorations = buildConcealDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);
