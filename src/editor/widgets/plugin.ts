import { StateField, RangeSetBuilder, EditorState } from '@codemirror/state';
import { EditorView, Decoration, DecorationSet } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { TableWidget } from './table';
import { MermaidWidget } from './mermaid';
import { CodeBlockWidget } from './code-block';
import { CalloutWidget } from './callout';
import { TaskCheckboxWidget } from './checkbox';
import { HRWidget } from './hr';

function isRangeFocused(from: number, to: number, state: EditorState): boolean {
  for (const range of state.selection.ranges) {
    if (range.head >= from && range.head <= to) return true;
    if (range.anchor >= from && range.anchor <= to) return true;
  }
  return false;
}

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

      // 1. Tables: Replace whole Table block when caret is not inside
      if (name === 'Table') {
        if (!isRangeFocused(nodeFrom, nodeTo, state)) {
          const tableText = doc.sliceString(nodeFrom, nodeTo);
          const widget = new TableWidget(tableText, nodeFrom, nodeTo);
          decos.push({
            from: nodeFrom,
            to: nodeTo,
            deco: Decoration.replace({ widget, block: true }),
          });
          return false; // Don't descend into child table cells
        }
      }

      // 2. Fenced Code Blocks (Mermaid or Standard Code)
      else if (name === 'FencedCode') {
        if (!isRangeFocused(nodeFrom, nodeTo, state)) {
          const blockText = doc.sliceString(nodeFrom, nodeTo);
          // Extract language info from first line
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
      }

      // 3. Blockquotes / Callouts
      else if (name === 'Blockquote') {
        if (!isRangeFocused(nodeFrom, nodeTo, state)) {
          const quoteText = doc.sliceString(nodeFrom, nodeTo);
          const widget = new CalloutWidget(quoteText, nodeFrom, nodeTo);
          decos.push({
            from: nodeFrom,
            to: nodeTo,
            deco: Decoration.replace({ widget, block: true }),
          });
          return false;
        }
      }

      // 4. Task Markers: [ ] and [x]
      else if (name === 'TaskMarker') {
        const markerText = doc.sliceString(nodeFrom, nodeTo);
        const isChecked = markerText.includes('x') || markerText.includes('X');
        const widget = new TaskCheckboxWidget(isChecked, nodeFrom, nodeTo);
        decos.push({
          from: nodeFrom,
          to: nodeTo,
          deco: Decoration.replace({ widget }),
        });
      }

      // 5. Horizontal Rules
      else if (name === 'HorizontalRule') {
        if (!isRangeFocused(nodeFrom, nodeTo, state)) {
          const widget = new HRWidget();
          decos.push({
            from: nodeFrom,
            to: nodeTo,
            deco: Decoration.replace({ widget, block: true }),
          });
        }
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
 * In CodeMirror 6, block decorations must be provided via StateField, not ViewPlugin.
 */
export const blockWidgetField = StateField.define<DecorationSet>({
  create(state) {
    return buildBlockWidgets(state);
  },
  update(decorations, tr) {
    if (tr.docChanged || tr.selection) {
      return buildBlockWidgets(tr.state);
    }
    return decorations;
  },
  provide: (f) => EditorView.decorations.from(f),
});
