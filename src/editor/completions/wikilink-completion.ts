import { CompletionContext, CompletionResult, autocompletion } from '@codemirror/autocomplete';
import { Extension } from '@codemirror/state';
import { useWorkspaceStore } from '../../app/stores/workspace';
import { formatDisplayName } from '../../core/document/file-meta';

export function wikilinkCompletionSource(context: CompletionContext): CompletionResult | null {
  // Match `[[` followed by any non-closing characters up to cursor
  const word = context.matchBefore(/\[\[([^\]\n]*)$/);
  if (!word) return null;

  const query = word.text.slice(2).toLowerCase();
  const documents = useWorkspaceStore.getState().documents;

  const options = documents
    .map((doc) => {
      const title = formatDisplayName(doc.meta.fileName);
      return {
        label: title,
        detail: doc.meta.fileName.endsWith('.md') ? 'Note' : 'Document',
        type: 'text',
        boost: title.toLowerCase().startsWith(query) ? 2 : 1,
        apply: (view: any, completion: any, _from: number, to: number) => {
          const insertText = `[[${completion.label}]]`;
          view.dispatch({
            changes: { from: word.from, to, insert: insertText },
            selection: { anchor: word.from + insertText.length },
          });
        },
      };
    })
    .filter((opt) => opt.label.toLowerCase().includes(query));

  return {
    from: word.from + 2,
    options,
  };
}

export const wikilinkAutocompleteExtension: Extension = autocompletion({
  override: [wikilinkCompletionSource],
  defaultKeymap: true,
  activateOnTyping: true,
});
