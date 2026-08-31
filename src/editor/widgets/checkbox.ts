import { WidgetType, EditorView } from '@codemirror/view';

export class TaskCheckboxWidget extends WidgetType {
  constructor(
    readonly checked: boolean,
    readonly from: number,
    readonly to: number
  ) {
    super();
  }

  eq(other: TaskCheckboxWidget): boolean {
    return other.checked === this.checked && other.from === this.from && other.to === this.to;
  }

  toDOM(view: EditorView): HTMLElement {
    const wrap = document.createElement('span');
    wrap.className = 'as-task-wrap';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'as-task-checkbox';
    input.checked = this.checked;

    input.onclick = (e) => {
      e.stopPropagation();
      const newMarker = input.checked ? '[x]' : '[ ]';
      view.dispatch({
        changes: { from: this.from, to: this.to, insert: newMarker },
      });
    };

    wrap.appendChild(input);
    return wrap;
  }
}
