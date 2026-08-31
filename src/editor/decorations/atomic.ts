import { EditorView, Decoration } from '@codemirror/view';
import { Extension } from '@codemirror/state';
import { concealPlugin } from './conceal';

/**
 * Ensures horizontal caret motion jumps over concealed ranges in one keystroke.
 */
export function atomicConcealedRanges(): Extension {
  return EditorView.atomicRanges.of((view) => {
    const plugin = view.plugin(concealPlugin);
    return plugin ? plugin.decorations : Decoration.none;
  });
}
