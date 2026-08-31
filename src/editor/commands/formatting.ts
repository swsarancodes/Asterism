import { EditorView, KeyBinding } from '@codemirror/view';
import { EditorSelection, ChangeSpec } from '@codemirror/state';

/**
 * Wraps or unwraps selection with given delimiter (e.g. ** for bold, * for italic)
 */
export function toggleInlineFormat(view: EditorView, delimiter: string) {
  const { state } = view;
  const dLen = delimiter.length;
  const mainSel = state.selection.main;

  // 1. If selection is collapsed (empty caret), insert empty delimiters and place cursor in the middle
  if (mainSel.empty) {
    const pos = mainSel.from;

    // Check if cursor is already inside empty delimiters (e.g. **|**) -> unwrap/exit
    const before = state.doc.sliceString(Math.max(0, pos - dLen), pos);
    const after = state.doc.sliceString(pos, Math.min(state.doc.length, pos + dLen));

    if (before === delimiter && after === delimiter) {
      view.dispatch({
        changes: { from: pos - dLen, to: pos + dLen, insert: '' },
        selection: EditorSelection.cursor(pos - dLen),
      });
      view.focus();
      return;
    }

    // Insert delimiter pair and place cursor between them
    view.dispatch({
      changes: { from: pos, to: pos, insert: `${delimiter}${delimiter}` },
      selection: EditorSelection.cursor(pos + dLen),
    });
    view.focus();
    return;
  }

  // 2. If text is selected, wrap or unwrap
  let newSelFrom = mainSel.from;
  let newSelTo = mainSel.to;

  const changes = state.selection.ranges.map((range) => {
    const from = range.from;
    const to = range.to;

    // Check if range is already surrounded by delimiter
    const before = state.doc.sliceString(Math.max(0, from - dLen), from);
    const after = state.doc.sliceString(to, Math.min(state.doc.length, to + dLen));

    if (before === delimiter && after === delimiter) {
      newSelFrom = from - dLen;
      newSelTo = to - dLen;
      return {
        from: from - dLen,
        to: to + dLen,
        insert: state.doc.sliceString(from, to),
      };
    }

    const selectedText = state.doc.sliceString(from, to);

    // Check if selection contains delimiter inside
    if (selectedText.startsWith(delimiter) && selectedText.endsWith(delimiter) && selectedText.length >= dLen * 2) {
      newSelFrom = from;
      newSelTo = to - dLen * 2;
      return {
        from,
        to,
        insert: selectedText.slice(dLen, -dLen),
      };
    }

    // Split leading and trailing whitespace so delimiter tightly wraps ONLY the inner text
    const match = selectedText.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const leading = match ? match[1] : '';
    const core = match ? match[2] : selectedText;
    const trailing = match ? match[3] : '';

    const insertedText = `${leading}${delimiter}${core || 'text'}${delimiter}${trailing}`;
    newSelFrom = from + leading.length;
    newSelTo = newSelFrom + dLen + (core || 'text').length + dLen;

    return {
      from,
      to,
      insert: insertedText,
    };
  });

  view.dispatch({
    changes,
    selection: EditorSelection.range(newSelFrom, newSelTo),
  });
  view.focus();
}

/**
 * Strips leading Markdown block prefixes (headings, lists, quotes, checkboxes)
 */
function cleanLinePrefix(text: string): string {
  return text.replace(/^(#{1,6}\s+|-\s*\[[ xX]\]\s+|-\s+|\*\s+|\d+\.\s+|>\s*)/, '');
}

/**
 * Formats all selected lines into a heading level (1, 2, 3, or 0 for paragraph)
 */
export function setHeadingLevel(view: EditorView, level: 1 | 2 | 3 | 0) {
  const { state } = view;
  const sel = state.selection.main;
  const startLine = state.doc.lineAt(sel.from);
  const endLine = state.doc.lineAt(sel.to);
  const changes: ChangeSpec[] = [];

  const prefix = level === 0 ? '' : '#'.repeat(level) + ' ';

  for (let l = startLine.number; l <= endLine.number; l++) {
    const line = state.doc.line(l);
    const clean = cleanLinePrefix(line.text);
    const newLine = `${prefix}${clean}`;
    changes.push({ from: line.from, to: line.to, insert: newLine });
  }

  view.dispatch({ changes });
  view.focus();
}

/**
 * Formats all selected lines into a bulleted list item (- item)
 * If all selected lines are already bullet items, toggles them back to plain text.
 */
export function setBulletList(view: EditorView) {
  const { state } = view;
  const sel = state.selection.main;
  const startLine = state.doc.lineAt(sel.from);
  const endLine = state.doc.lineAt(sel.to);

  // Check if all lines are already bullet points
  let allBullets = true;
  for (let l = startLine.number; l <= endLine.number; l++) {
    const lineText = state.doc.line(l).text;
    if (!/^\s*-\s+(?!\[[ xX]\])/.test(lineText) && lineText.trim().length > 0) {
      allBullets = false;
      break;
    }
  }

  const changes: ChangeSpec[] = [];

  for (let l = startLine.number; l <= endLine.number; l++) {
    const line = state.doc.line(l);
    if (!line.text.trim()) continue;

    const clean = cleanLinePrefix(line.text);
    const newLine = allBullets ? clean : `- ${clean}`;
    changes.push({ from: line.from, to: line.to, insert: newLine });
  }

  view.dispatch({ changes });
  view.focus();
}

/**
 * Formats all selected lines into a numbered list item (1. item, 2. item, ...)
 * If all selected lines are already numbered, toggles them back to plain text.
 */
export function setNumberedList(view: EditorView) {
  const { state } = view;
  const sel = state.selection.main;
  const startLine = state.doc.lineAt(sel.from);
  const endLine = state.doc.lineAt(sel.to);

  // Check if all lines are already numbered
  let allNumbered = true;
  for (let l = startLine.number; l <= endLine.number; l++) {
    const lineText = state.doc.line(l).text;
    if (!/^\s*\d+\.\s+/.test(lineText) && lineText.trim().length > 0) {
      allNumbered = false;
      break;
    }
  }

  const changes: ChangeSpec[] = [];
  let itemIndex = 1;

  for (let l = startLine.number; l <= endLine.number; l++) {
    const line = state.doc.line(l);
    if (!line.text.trim()) continue;

    const clean = cleanLinePrefix(line.text);
    const newLine = allNumbered ? clean : `${itemIndex}. ${clean}`;
    if (!allNumbered) itemIndex++;
    changes.push({ from: line.from, to: line.to, insert: newLine });
  }

  view.dispatch({ changes });
  view.focus();
}

/**
 * Formats all selected lines into a task list item (- [ ] item)
 * If all selected lines are already task items, toggles them back to plain text.
 */
export function setTaskList(view: EditorView) {
  const { state } = view;
  const sel = state.selection.main;
  const startLine = state.doc.lineAt(sel.from);
  const endLine = state.doc.lineAt(sel.to);

  let allTasks = true;
  for (let l = startLine.number; l <= endLine.number; l++) {
    const lineText = state.doc.line(l).text;
    if (!/^\s*-\s*\[[ xX]\]\s+/.test(lineText) && lineText.trim().length > 0) {
      allTasks = false;
      break;
    }
  }

  const changes: ChangeSpec[] = [];

  for (let l = startLine.number; l <= endLine.number; l++) {
    const line = state.doc.line(l);
    if (!line.text.trim()) continue;

    const clean = cleanLinePrefix(line.text);
    const newLine = allTasks ? clean : `- [ ] ${clean}`;
    changes.push({ from: line.from, to: line.to, insert: newLine });
  }

  view.dispatch({ changes });
  view.focus();
}

/**
 * Formats all selected lines into a quote / blockquote (> item)
 */
export function setBlockquote(view: EditorView) {
  const { state } = view;
  const sel = state.selection.main;
  const startLine = state.doc.lineAt(sel.from);
  const endLine = state.doc.lineAt(sel.to);

  const changes: ChangeSpec[] = [];

  for (let l = startLine.number; l <= endLine.number; l++) {
    const line = state.doc.line(l);
    if (!line.text.trim()) continue;

    const clean = cleanLinePrefix(line.text);
    const newLine = `> ${clean}`;
    changes.push({ from: line.from, to: line.to, insert: newLine });
  }

  view.dispatch({ changes });
  view.focus();
}

/**
 * Inserts a Notion-style table template
 */
export function insertTableTemplate(view: EditorView, replaceRange?: { from: number; to: number }) {
  const tableMarkdown = `| Item | Description | Status |
| :--- | :--- | :---: |
| Task 1 | First objective | In Progress |
| Task 2 | Next milestone | Pending |`;

  const { state } = view;
  const target = replaceRange || { from: state.selection.main.from, to: state.selection.main.to };

  view.dispatch({
    changes: { from: target.from, to: target.to, insert: tableMarkdown },
  });
  view.focus();
}

/**
 * Inserts a Mermaid Flowchart template
 */
export function insertMermaidTemplate(view: EditorView, replaceRange?: { from: number; to: number }) {
  const mermaidMarkdown = `\`\`\`mermaid
flowchart TD
    A[Start] --> B[Process Step]
    B --> C{Decision}
    C -->|Yes| D[Result 1]
    C -->|No| E[Result 2]
\`\`\``;

  const { state } = view;
  const target = replaceRange || { from: state.selection.main.from, to: state.selection.main.to };

  view.dispatch({
    changes: { from: target.from, to: target.to, insert: mermaidMarkdown },
  });
  view.focus();
}

/**
 * Inserts a Mermaid Sequence Diagram template
 */
export function insertSequenceTemplate(view: EditorView, replaceRange?: { from: number; to: number }) {
  const mermaidMarkdown = `\`\`\`mermaid
sequenceDiagram
    autonumber
    actor User
    participant Client as Web App
    participant Server as API Gateway
    participant DB as Database

    User->>Client: Click Action
    Client->>Server: POST /api/data
    Server->>DB: Query records
    DB-->>Server: Return rows
    Server-->>Client: 200 OK (JSON)
    Client-->>User: Render updated UI
\`\`\``;

  const { state } = view;
  const target = replaceRange || { from: state.selection.main.from, to: state.selection.main.to };

  view.dispatch({
    changes: { from: target.from, to: target.to, insert: mermaidMarkdown },
  });
  view.focus();
}

/**
 * Inserts a Mermaid Mindmap template
 */
export function insertMindmapTemplate(view: EditorView, replaceRange?: { from: number; to: number }) {
  const mermaidMarkdown = `\`\`\`mermaid
mindmap
  root((Project))
    Origins
      Inspiration
      Vision
    Architecture
      Editor Core
      Decoration Engine
      Markdown AST
    Features
      Tables
      Diagrams
      Typography
\`\`\``;

  const { state } = view;
  const target = replaceRange || { from: state.selection.main.from, to: state.selection.main.to };

  view.dispatch({
    changes: { from: target.from, to: target.to, insert: mermaidMarkdown },
  });
  view.focus();
}

/**
 * Inserts a Mermaid Entity Relationship (ER) Diagram template
 */
export function insertERTemplate(view: EditorView, replaceRange?: { from: number; to: number }) {
  const mermaidMarkdown = `\`\`\`mermaid
erDiagram
    USER ||--o{ DOCUMENT : owns
    DOCUMENT ||--|{ REVISION : contains
    DOCUMENT ||--o{ TAG : labeled_with

    USER {
        string id PK
        string username
        string email
    }
    DOCUMENT {
        string id PK
        string title
        string path
        datetime updated_at
    }
\`\`\``;

  const { state } = view;
  const target = replaceRange || { from: state.selection.main.from, to: state.selection.main.to };

  view.dispatch({
    changes: { from: target.from, to: target.to, insert: mermaidMarkdown },
  });
  view.focus();
}

/**
 * Inserts a Fenced Code Block template
 */
export function insertCodeBlockTemplate(view: EditorView, lang: string = 'typescript', replaceRange?: { from: number; to: number }) {
  const codeMarkdown = `\`\`\`${lang}
function example() {
  console.log("Hello, Manicule!");
}
\`\`\``;

  const { state } = view;
  const target = replaceRange || { from: state.selection.main.from, to: state.selection.main.to };

  view.dispatch({
    changes: { from: target.from, to: target.to, insert: codeMarkdown },
  });
  view.focus();
}

/**
 * Inserts a Callout card template
 */
export function insertCalloutTemplate(
  view: EditorView,
  type: 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION',
  replaceRange?: { from: number; to: number }
) {
  const calloutMarkdown = `> [!${type}]
> Write your ${type.toLowerCase()} content here...`;

  const { state } = view;
  const target = replaceRange || { from: state.selection.main.from, to: state.selection.main.to };

  view.dispatch({
    changes: { from: target.from, to: target.to, insert: calloutMarkdown },
  });
  view.focus();
}

/**
 * Inserts a visual horizontal rule
 */
export function insertDividerTemplate(view: EditorView, replaceRange?: { from: number; to: number }) {
  const { state } = view;
  const target = replaceRange || { from: state.selection.main.from, to: state.selection.main.to };
  view.dispatch({
    changes: { from: target.from, to: target.to, insert: '\n---\n' },
  });
  view.focus();
}

/**
 * Standard Markdown Keyboard Shortcuts:
 * ⌘B / Ctrl+B -> Bold
 * ⌘I / Ctrl+I -> Italic
 * ⌘E / Ctrl+E -> Inline Code
 * ⌘⇧X / ⌘⇧S -> Strikethrough
 * ⌘⌥1 / ⌘⌥2 / ⌘⌥3 -> Headings
 * ⌘⇧8 -> Bulleted list
 * ⌘⇧7 -> Numbered list
 * ⌘⇧9 -> To-do checklist
 */
export const markdownFormattingKeymap: KeyBinding[] = [
  {
    key: 'Mod-b',
    run: (view) => {
      toggleInlineFormat(view, '**');
      return true;
    },
  },
  {
    key: 'Mod-i',
    run: (view) => {
      toggleInlineFormat(view, '*');
      return true;
    },
  },
  {
    key: 'Mod-e',
    run: (view) => {
      toggleInlineFormat(view, '`');
      return true;
    },
  },
  {
    key: 'Mod-Shift-x',
    run: (view) => {
      toggleInlineFormat(view, '~~');
      return true;
    },
  },
  {
    key: 'Mod-Shift-s',
    run: (view) => {
      toggleInlineFormat(view, '~~');
      return true;
    },
  },
  {
    key: 'Mod-Alt-1',
    run: (view) => {
      setHeadingLevel(view, 1);
      return true;
    },
  },
  {
    key: 'Mod-Alt-2',
    run: (view) => {
      setHeadingLevel(view, 2);
      return true;
    },
  },
  {
    key: 'Mod-Alt-3',
    run: (view) => {
      setHeadingLevel(view, 3);
      return true;
    },
  },
  {
    key: 'Mod-Alt-0',
    run: (view) => {
      setHeadingLevel(view, 0);
      return true;
    },
  },
  {
    key: 'Mod-Shift-8',
    run: (view) => {
      setBulletList(view);
      return true;
    },
  },
  {
    key: 'Mod-Shift-7',
    run: (view) => {
      setNumberedList(view);
      return true;
    },
  },
  {
    key: 'Mod-Shift-9',
    run: (view) => {
      setTaskList(view);
      return true;
    },
  },
];
