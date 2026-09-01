import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

class BulletWidget extends WidgetType {
  toDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = 'as-bullet-dot';
    span.textContent = '•';
    span.setAttribute('aria-hidden', 'true');
    return span;
  }

  eq(_other: BulletWidget): boolean {
    return true;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

class TaskCheckboxWidget extends WidgetType {
  constructor(public checked: boolean, public pos: number) {
    super();
  }

  eq(other: TaskCheckboxWidget): boolean {
    return this.checked === other.checked && this.pos === other.pos;
  }

  toDOM(view: EditorView): HTMLElement {
    const wrapper = document.createElement('span');
    wrapper.className = 'as-task-checkbox-wrapper';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = this.checked;
    input.className = 'as-task-checkbox';

    input.addEventListener('change', (e) => {
      e.stopPropagation();
      const line = view.state.doc.lineAt(this.pos);
      const match = line.text.match(/^(\s*-\s*\[)([ xX])(\]\s*)/);
      if (match) {
        const checkPos = line.from + match[1].length;
        view.dispatch({
          changes: { from: checkPos, to: checkPos + 1, insert: input.checked ? 'x' : ' ' },
        });
      }
    });

    wrapper.appendChild(input);
    return wrapper;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

/**
 * Builds list decorations for visible ranges
 */
export function buildListDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;
  const listItems: Array<{ from: number; to: number; deco: Decoration }> = [];

  for (const { from, to } of view.visibleRanges) {
    let pos = from;
    while (pos <= to && pos <= doc.length) {
      const line = doc.lineAt(pos);
      const text = line.text;

      // 1. Task list item: - [ ] or - [x]
      const taskMatch = text.match(/^(\s*)-\s*\[([ xX])\]\s+/);
      if (taskMatch) {
        const indentLen = taskMatch[1].length;
        const markerStart = line.from + indentLen;
        const markerEnd = line.from + taskMatch[0].length;
        const isChecked = taskMatch[2].toLowerCase() === 'x';

        listItems.push({
          from: markerStart,
          to: markerEnd,
          deco: Decoration.replace({
            widget: new TaskCheckboxWidget(isChecked, line.from),
          }),
        });
      }
      // 2. Bullet list item: - item or * item (not task)
      else {
        const bulletMatch = text.match(/^(\s*)([-*])\s+/);
        if (bulletMatch) {
          const indentLen = bulletMatch[1].length;
          const markerStart = line.from + indentLen;
          const markerEnd = line.from + bulletMatch[0].length;

          listItems.push({
            from: markerStart,
            to: markerEnd,
            deco: Decoration.replace({
              widget: new BulletWidget(),
            }),
          });
        }
      }

      pos = line.to + 1;
    }
  }

  listItems.sort((a, b) => a.from - b.from || a.to - b.to);

  for (const item of listItems) {
    builder.add(item.from, item.to, item.deco);
  }

  return builder.finish();
}

export const listWidgetPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildListDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildListDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);
