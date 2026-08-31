import { WidgetType, EditorView } from '@codemirror/view';

export class HRWidget extends WidgetType {
  eq(): boolean {
    return true;
  }

  toDOM(_view: EditorView): HTMLElement {
    const hr = document.createElement('hr');
    hr.className = 'as-hr-divider';
    return hr;
  }
}
