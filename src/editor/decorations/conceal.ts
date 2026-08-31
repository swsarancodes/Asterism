import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';

const concealedMarkDeco = Decoration.replace({});

/**
 * Checks whether any selection range overlaps the node boundaries (inclusive).
 */
function isNodeFocused(from: number, to: number, view: EditorView): boolean {
  for (const range of view.state.selection.ranges) {
    if (range.head >= from && range.head <= to) {
      return true;
    }
    if (range.anchor >= from && range.anchor <= to) {
      return true;
    }
  }
  return false;
}

/**
 * Builds the concealment decoration set for visible ranges.
 * Conceals syntax tokens when the caret is not inside or touching the node.
 */
export function buildConcealDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;
  const rawRanges: Array<{ from: number; to: number }> = [];

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        const name = node.name;

        // Skip anything inside fenced code or tables (they are handled as block widgets)
        if (name === 'FencedCode' || name === 'Table') {
          return false;
        }

        // Bold: StrongEmphasis (**text** or __text__)
        if (name === 'StrongEmphasis') {
          if (!isNodeFocused(node.from, node.to, view)) {
            const nodeText = doc.sliceString(node.from, node.to);
            const markerLen = nodeText.startsWith('**') || nodeText.startsWith('__') ? 2 : 0;
            if (markerLen > 0 && node.to - node.from >= markerLen * 2) {
              rawRanges.push({ from: node.from, to: node.from + markerLen });
              rawRanges.push({ from: node.to - markerLen, to: node.to });
            }
          }
        }

        // Italic: Emphasis (*text* or _text_)
        else if (name === 'Emphasis') {
          if (!isNodeFocused(node.from, node.to, view)) {
            const markerLen = 1;
            if (node.to - node.from >= markerLen * 2) {
              rawRanges.push({ from: node.from, to: node.from + markerLen });
              rawRanges.push({ from: node.to - markerLen, to: node.to });
            }
          }
        }

        // Strikethrough: Strikethrough (~~text~~)
        else if (name === 'Strikethrough') {
          if (!isNodeFocused(node.from, node.to, view)) {
            const markerLen = 2;
            if (node.to - node.from >= markerLen * 2) {
              rawRanges.push({ from: node.from, to: node.from + markerLen });
              rawRanges.push({ from: node.to - markerLen, to: node.to });
            }
          }
        }

        // Inline Code: InlineCode (`code`)
        else if (name === 'InlineCode') {
          if (!isNodeFocused(node.from, node.to, view)) {
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
        }

        // ATX Headings: Hide # markers when not focused
        else if (name.startsWith('ATXHeading')) {
          if (!isNodeFocused(node.from, node.to, view)) {
            const lineText = doc.sliceString(node.from, node.to);
            const match = lineText.match(/^(#{1,6}\s+)/);
            if (match) {
              rawRanges.push({ from: node.from, to: node.from + match[1].length });
            }
          }
        }

        // Link: [text](url) -> conceal [ and ](url) when not focused
        else if (name === 'Link') {
          if (!isNodeFocused(node.from, node.to, view)) {
            const linkText = doc.sliceString(node.from, node.to);
            const closeBracketIdx = linkText.indexOf('](');
            if (linkText.startsWith('[') && closeBracketIdx !== -1 && linkText.endsWith(')')) {
              rawRanges.push({ from: node.from, to: node.from + 1 });
              rawRanges.push({ from: node.from + closeBracketIdx, to: node.to });
            }
          }
        }
      },
    });
  }

  // Filter valid ranges & sort strictly by from ascending, to ascending
  const sorted = rawRanges
    .filter((r) => r.from < r.to)
    .sort((a, b) => a.from - b.from || a.to - b.to);

  // Eliminate overlaps for replace decorations
  let lastTo = -1;
  for (const r of sorted) {
    if (r.from >= lastTo) {
      builder.add(r.from, r.to, concealedMarkDeco);
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
        update.selectionSet ||
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
