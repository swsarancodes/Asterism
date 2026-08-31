import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';

const concealedMarkDeco = Decoration.replace({});

/**
 * Checks whether any selection range overlaps the node boundaries (inclusive).
 */
function isNodeFocused(from: number, to: number, view: EditorView): boolean {
  for (const range of view.state.selection.ranges) {
    // Overlap rule: caret inside or touching boundaries
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

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        const name = node.name;

        // Bold: StrongEmphasis (**text** or __text__)
        if (name === 'StrongEmphasis') {
          if (!isNodeFocused(node.from, node.to, view)) {
            // Hide the opening and closing markers
            const nodeText = doc.sliceString(node.from, node.to);
            const markerLen = nodeText.startsWith('**') || nodeText.startsWith('__') ? 2 : 0;
            if (markerLen > 0 && node.to - node.from >= markerLen * 2) {
              builder.add(node.from, node.from + markerLen, concealedMarkDeco);
              builder.add(node.to - markerLen, node.to, concealedMarkDeco);
            }
          }
        }

        // Italic: Emphasis (*text* or _text_)
        else if (name === 'Emphasis') {
          if (!isNodeFocused(node.from, node.to, view)) {
            const markerLen = 1;
            if (node.to - node.from >= markerLen * 2) {
              builder.add(node.from, node.from + markerLen, concealedMarkDeco);
              builder.add(node.to - markerLen, node.to, concealedMarkDeco);
            }
          }
        }

        // Strikethrough: Strikethrough (~~text~~)
        else if (name === 'Strikethrough') {
          if (!isNodeFocused(node.from, node.to, view)) {
            const markerLen = 2;
            if (node.to - node.from >= markerLen * 2) {
              builder.add(node.from, node.from + markerLen, concealedMarkDeco);
              builder.add(node.to - markerLen, node.to, concealedMarkDeco);
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
              builder.add(node.from, node.from + backtickCount, concealedMarkDeco);
              builder.add(node.to - backtickCount, node.to, concealedMarkDeco);
            }
          }
        }

        // ATX Headings: Hide # markers when not focused
        else if (name.startsWith('ATXHeading')) {
          if (!isNodeFocused(node.from, node.to, view)) {
            const lineText = doc.sliceString(node.from, node.to);
            const match = lineText.match(/^(#{1,6}\s+)/);
            if (match) {
              builder.add(node.from, node.from + match[1].length, concealedMarkDeco);
            }
          }
        }

        // Link: [text](url) -> conceal [ and ](url) when not focused
        else if (name === 'Link') {
          if (!isNodeFocused(node.from, node.to, view)) {
            const linkText = doc.sliceString(node.from, node.to);
            const closeBracketIdx = linkText.indexOf('](');
            if (linkText.startsWith('[') && closeBracketIdx !== -1 && linkText.endsWith(')')) {
              // Hide opening bracket
              builder.add(node.from, node.from + 1, concealedMarkDeco);
              // Hide ](...) portion
              builder.add(node.from + closeBracketIdx, node.to, concealedMarkDeco);
            }
          }
        }
      },
    });
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
