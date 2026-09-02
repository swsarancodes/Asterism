import { StateField, RangeSetBuilder, EditorState } from '@codemirror/state';
import { EditorView, Decoration, DecorationSet } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { TableWidget } from './table';
import { MermaidWidget } from './mermaid';
import { CodeBlockWidget } from './code-block';
import { CalloutWidget } from './callout';
import { HRWidget } from './hr';
import { ImageWidget } from './image';

export function buildBlockWidgets(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = state.doc;
  const decos: Array<{ from: number; to: number; deco: Decoration }> = [];

  syntaxTree(state).iterate({
    from: 0,
    to: doc.length,
    enter: (node) => {
      const name = node.name;
      const nodeFrom = node.from;
      const nodeTo = node.to;

      // 1. Tables: Always render interactive Notion-style table widget
      if (name === 'Table') {
        const tableText = doc.sliceString(nodeFrom, nodeTo);
        const widget = new TableWidget(tableText, nodeFrom, nodeTo);
        decos.push({
          from: nodeFrom,
          to: nodeTo,
          deco: Decoration.replace({ widget, block: true }),
        });
        return false; // Don't descend into child table cells
      }

      // 2. Fenced Code Blocks (Mermaid or Standard Code)
      else if (name === 'FencedCode') {
        const blockText = doc.sliceString(nodeFrom, nodeTo);
        const firstLine = blockText.split('\n')[0] || '';
        const langMatch = firstLine.match(/^```([a-zA-Z0-9_\-]+)?/);
        const lang = (langMatch ? langMatch[1] : '')?.toLowerCase() || '';

        if (lang === 'mermaid') {
          const widget = new MermaidWidget(blockText, nodeFrom, nodeTo);
          decos.push({
            from: nodeFrom,
            to: nodeTo,
            deco: Decoration.replace({ widget, block: true }),
          });
          return false;
        } else {
          const widget = new CodeBlockWidget(blockText, nodeFrom, nodeTo, lang);
          decos.push({
            from: nodeFrom,
            to: nodeTo,
            deco: Decoration.replace({ widget, block: true }),
          });
          return false;
        }
      }

      // 3. Blockquotes / Callouts
      else if (name === 'Blockquote') {
        const quoteText = doc.sliceString(nodeFrom, nodeTo);
        const widget = new CalloutWidget(quoteText, nodeFrom, nodeTo);
        decos.push({
          from: nodeFrom,
          to: nodeTo,
          deco: Decoration.replace({ widget, block: true }),
        });
        return false;
      }

      // 4. Horizontal Rules
      else if (name === 'HorizontalRule') {
        const widget = new HRWidget();
        decos.push({
          from: nodeFrom,
          to: nodeTo,
          deco: Decoration.replace({ widget, block: true }),
        });
      }

      // 6. Image Widget: ![alt](url)
      else if (name === 'Image') {
        const imageText = doc.sliceString(nodeFrom, nodeTo);
        const widget = new ImageWidget(imageText, nodeFrom, nodeTo);
        decos.push({
          from: nodeFrom,
          to: nodeTo,
          deco: Decoration.replace({ widget }),
        });
        return false;
      }
    },
  });

  // Sort strictly by from ascending, to ascending
  decos.sort((a, b) => a.from - b.from || a.to - b.to);

  for (const item of decos) {
    builder.add(item.from, item.to, item.deco);
  }

  return builder.finish();
}

/**
 * StateField for block widgets (Tables, Mermaid, Code Blocks, Callouts)
 */
export const blockWidgetField = StateField.define<DecorationSet>({
  create(state) {
    return buildBlockWidgets(state);
  },
  update(decorations, tr) {
    if (tr.docChanged) {
      return buildBlockWidgets(tr.state);
    }
    return decorations;
  },
  provide: (f) => EditorView.decorations.from(f),
});
