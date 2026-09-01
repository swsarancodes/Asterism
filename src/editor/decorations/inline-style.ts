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
  const doc = view.state.doc;
  const marks: Array<{ from: number; to: number; deco: Decoration }> = [];

  for (const { from, to } of view.visibleRanges) {
    // 1. Traverse syntax tree for standard AST nodes
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        const name = node.name;

        // Skip anything inside fenced code or tables
        if (name === 'FencedCode' || name === 'Table') {
          return false;
        }

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

    // 2. Resilient pattern matching for inline formats (e.g. while editing or deleting words)
    const text = doc.sliceString(from, to);

    // Bold pattern: **text**
    const boldRegex = /\*\*([^\*\n]+?)\*\*/g;
    let bm;
    while ((bm = boldRegex.exec(text)) !== null) {
      marks.push({ from: from + bm.index, to: from + bm.index + bm[0].length, deco: strongDeco });
    }

    // Strikethrough pattern: ~~text~~
    const strikeRegex = /~~([^~\n]+?)~~/g;
    let sm;
    while ((sm = strikeRegex.exec(text)) !== null) {
      marks.push({ from: from + sm.index, to: from + sm.index + sm[0].length, deco: strikeDeco });
    }

    // Inline code pattern: `code`
    const codeRegex = /`([^`\n]+?)`/g;
    let cm;
    while ((cm = codeRegex.exec(text)) !== null) {
      marks.push({ from: from + cm.index, to: from + cm.index + cm[0].length, deco: codeInlineDeco });
    }
  }

  // Sort strictly by `from` ascending, then `to` ascending, and deduplicate
  const sorted = marks
    .filter((m) => m.from < m.to)
    .sort((a, b) => a.from - b.from || a.to - b.to);

  let lastFrom = -1;
  let lastTo = -1;
  let lastClass = '';

  for (const mark of sorted) {
    const markClass = (mark.deco as any).spec?.class || '';
    if (mark.from !== lastFrom || mark.to !== lastTo || markClass !== lastClass) {
      builder.add(mark.from, mark.to, mark.deco);
      lastFrom = mark.from;
      lastTo = mark.to;
      lastClass = markClass;
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
