import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';

const strongDeco = Decoration.mark({ class: 'as-strong' });
const emDeco = Decoration.mark({ class: 'as-em' });
const strikeDeco = Decoration.mark({ class: 'as-strike' });
const codeInlineDeco = Decoration.mark({ class: 'as-code-inline' });
const linkDeco = Decoration.mark({ class: 'as-link' });

const headingDecos: Record<number, Decoration> = {
  1: Decoration.mark({ class: 'as-h1' }),
  2: Decoration.mark({ class: 'as-h2' }),
  3: Decoration.mark({ class: 'as-h3' }),
  4: Decoration.mark({ class: 'as-h4' }),
  5: Decoration.mark({ class: 'as-h5' }),
  6: Decoration.mark({ class: 'as-h6' }),
};

export function buildInlineStyleDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const marks: Array<{ from: number; to: number; deco: Decoration }> = [];

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        const name = node.name;

        if (name === 'StrongEmphasis') {
          marks.push({ from: node.from, to: node.to, deco: strongDeco });
        } else if (name === 'Emphasis') {
          marks.push({ from: node.from, to: node.to, deco: emDeco });
        } else if (name === 'Strikethrough') {
          marks.push({ from: node.from, to: node.to, deco: strikeDeco });
        } else if (name === 'InlineCode') {
          marks.push({ from: node.from, to: node.to, deco: codeInlineDeco });
        } else if (name === 'Link') {
          marks.push({ from: node.from, to: node.to, deco: linkDeco });
        } else if (name.startsWith('ATXHeading')) {
          const levelMatch = name.match(/ATXHeading(\d)/);
          const level = levelMatch ? parseInt(levelMatch[1], 10) : 1;
          const deco = headingDecos[level] || headingDecos[1];
          marks.push({ from: node.from, to: node.to, deco });
        }
      },
    });
  }

  // Sort strictly by `from` ascending, then `to` ascending
  marks.sort((a, b) => a.from - b.from || a.to - b.to);

  for (const mark of marks) {
    if (mark.from < mark.to) {
      builder.add(mark.from, mark.to, mark.deco);
    }
  }

  return builder.finish();
}

export const inlineStylePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildInlineStyleDecorations(view);
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        syntaxTree(update.state) !== syntaxTree(update.startState)
      ) {
        this.decorations = buildInlineStyleDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);
