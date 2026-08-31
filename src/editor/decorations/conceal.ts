import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';

const concealedMarkDeco = Decoration.replace({});

/**
 * Checks whether any selection caret touches a specific marker range (from..to).
 */
function isMarkerFocused(from: number, to: number, view: EditorView): boolean {
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

        // Skip anything inside fenced code or tables
        if (name === 'FencedCode' || name === 'Table') {
          return false;
        }

        // Bold: StrongEmphasis (**text** or __text__)
        if (name === 'StrongEmphasis') {
          const nodeText = doc.sliceString(node.from, node.to);
          const markerLen = nodeText.startsWith('**') || nodeText.startsWith('__') ? 2 : 0;
          if (markerLen > 0 && node.to - node.from >= markerLen * 2) {
            if (!isMarkerFocused(node.from, node.from + markerLen, view)) {
              rawRanges.push({ from: node.from, to: node.from + markerLen });
            }
            if (!isMarkerFocused(node.to - markerLen, node.to, view)) {
              rawRanges.push({ from: node.to - markerLen, to: node.to });
            }
          }
        }

        // Italic: Emphasis (*text* or _text_)
        else if (name === 'Emphasis') {
          const markerLen = 1;
          if (node.to - node.from >= markerLen * 2) {
            if (!isMarkerFocused(node.from, node.from + markerLen, view)) {
              rawRanges.push({ from: node.from, to: node.from + markerLen });
            }
            if (!isMarkerFocused(node.to - markerLen, node.to, view)) {
              rawRanges.push({ from: node.to - markerLen, to: node.to });
            }
          }
        }

        // Strikethrough: Strikethrough (~~text~~)
        else if (name === 'Strikethrough') {
          const markerLen = 2;
          if (node.to - node.from >= markerLen * 2) {
            if (!isMarkerFocused(node.from, node.from + markerLen, view)) {
              rawRanges.push({ from: node.from, to: node.from + markerLen });
            }
            if (!isMarkerFocused(node.to - markerLen, node.to, view)) {
              rawRanges.push({ from: node.to - markerLen, to: node.to });
            }
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
            if (!isMarkerFocused(node.from, node.from + backtickCount, view)) {
              rawRanges.push({ from: node.from, to: node.from + backtickCount });
            }
            if (!isMarkerFocused(node.to - backtickCount, node.to, view)) {
              rawRanges.push({ from: node.to - backtickCount, to: node.to });
            }
          }
        }

        // ATX Headings: Hide # prefix unless caret is directly touching the prefix
        else if (name.startsWith('ATXHeading')) {
          const lineText = doc.sliceString(node.from, node.to);
          const match = lineText.match(/^(#{1,6}\s+)/);
          if (match) {
            const prefixEnd = node.from + match[1].length;
            if (!isMarkerFocused(node.from, prefixEnd, view)) {
              rawRanges.push({ from: node.from, to: prefixEnd });
            }
          }
        }

        // Link: [text](url) -> conceal [ and ](url) unless caret touches them
        else if (name === 'Link') {
          const linkText = doc.sliceString(node.from, node.to);
          const closeBracketIdx = linkText.indexOf('](');
          if (linkText.startsWith('[') && closeBracketIdx !== -1 && linkText.endsWith(')')) {
            if (!isMarkerFocused(node.from, node.from + 1, view)) {
              rawRanges.push({ from: node.from, to: node.from + 1 });
            }
            if (!isMarkerFocused(node.from + closeBracketIdx, node.to, view)) {
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
