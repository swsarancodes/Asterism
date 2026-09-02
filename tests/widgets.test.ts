import { expect, test, describe, beforeAll } from 'bun:test';
import { GlobalWindow } from 'happy-dom';
import { TableWidget, parseMarkdownTable, serializeMarkdownTable } from '../src/editor/widgets/table';
import { MermaidWidget } from '../src/editor/widgets/mermaid';
import { CodeBlockWidget } from '../src/editor/widgets/code-block';
import { CalloutWidget } from '../src/editor/widgets/callout';
import { ImageWidget, parseImageMarkdown, serializeImageMarkdown } from '../src/editor/widgets/image';
import { EditorState, EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
  wrapWithLink,
  removeLink,
  insertLinkTemplate,
  setTaskList,
  setBulletList,
  setNumberedList,
  setHeadingLevel,
  toggleTaskCompletion,
  markdownFormattingKeymap,
} from '../src/editor/commands/formatting';
import { findLinkUrlAt, imagePasteDropExtension } from '../src/editor/setup';

beforeAll(() => {
  const window = new GlobalWindow();
  (global as any).window = window;
  (global as any).document = window.document;
  (global as any).HTMLElement = window.HTMLElement;
  (global as any).HTMLTextAreaElement = window.HTMLTextAreaElement;
  (global as any).MutationObserver = window.MutationObserver;
  (global as any).navigator = window.navigator;
  (global as any).Event = window.Event;
  (global as any).KeyboardEvent = window.KeyboardEvent;
  (global as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 0);
  (global as any).cancelAnimationFrame = (id: any) => clearTimeout(id);
});

describe('MermaidWidget In-Place Code Editing & Lifecycle', () => {
  test('Creates DOM and supports mode switching to Code and Split', () => {
    const source = '```mermaid\nflowchart TD\n  A --> B\n```';
    const widget = new MermaidWidget(source, 0, source.length);

    const state = EditorState.create({ doc: source });
    const view = new EditorView({ state });

    const dom = widget.toDOM(view);
    expect(dom).not.toBeNull();
    expect(dom.className).toContain('as-diagram-container');

    // Check toolbar mode buttons
    const modeBtns = dom.querySelectorAll('.as-widget-btn');
    const previewBtn = Array.from(modeBtns).find((b) => b.textContent === 'Preview') as HTMLElement;
    const splitBtn = Array.from(modeBtns).find((b) => b.textContent === 'Split') as HTMLElement;
    const codeBtn = Array.from(modeBtns).find((b) => b.textContent === 'Code') as HTMLElement;

    expect(previewBtn).toBeDefined();
    expect(splitBtn).toBeDefined();
    expect(codeBtn).toBeDefined();

    // Switch to Code mode
    codeBtn.click();
    expect(dom.dataset.mode).toBe('code');

    const textarea = dom.querySelector('.as-diagram-textarea') as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();
    expect(textarea.value).toBe('flowchart TD\n  A --> B');

    // Simulate typing in textarea
    textarea.value = 'flowchart TD\n  A --> B\n  B --> C';
    textarea.dispatchEvent(new Event('input'));

    // Test updateDOM preserves the DOM and mode
    const updatedSource = '```mermaid\nflowchart TD\n  A --> B\n  B --> C\n```';
    const nextWidget = new MermaidWidget(updatedSource, 0, updatedSource.length);
    const retained = nextWidget.updateDOM(dom, view);
    expect(retained).toBe(true);
    expect(dom.dataset.mode).toBe('code');

    // Switch to Split mode
    splitBtn.click();
    expect(dom.dataset.mode).toBe('split');
  });
});

describe('TableWidget In-Place Code & Visual Editing', () => {
  test('Supports Visual, Split, and Code modes with live synchronization', () => {
    const source = '| Col A | Col B |\n| :--- | ---: |\n| 1 | 2 |';
    const widget = new TableWidget(source, 0, source.length);

    const state = EditorState.create({ doc: source });
    const view = new EditorView({ state });

    const dom = widget.toDOM(view);
    expect(dom).not.toBeNull();
    expect(dom.className).toContain('as-table-container');

    // Check mode buttons
    const modeBtns = dom.querySelectorAll('.as-widget-btn');
    const visualBtn = Array.from(modeBtns).find((b) => b.textContent === 'Visual') as HTMLElement;
    const splitBtn = Array.from(modeBtns).find((b) => b.textContent === 'Split') as HTMLElement;
    const codeBtn = Array.from(modeBtns).find((b) => b.textContent === 'Code') as HTMLElement;

    expect(visualBtn).toBeDefined();
    expect(splitBtn).toBeDefined();
    expect(codeBtn).toBeDefined();

    // Visual mode initially has interactive cells
    const cells = dom.querySelectorAll('th, td');
    expect(cells.length).toBe(4); // 2 headers + 2 cells

    // Switch to Code mode
    codeBtn.click();
    expect(dom.dataset.mode).toBe('code');

    const textarea = dom.querySelector('.as-table-textarea') as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();
    expect(textarea.value).toContain('| Col A | Col B |');

    // Edit raw markdown table code
    textarea.value = '| Col A | Col B |\n| :--- | ---: |\n| 1 | 2 |\n| 3 | 4 |';
    textarea.dispatchEvent(new Event('input'));

    // Switch to Split mode
    splitBtn.click();
    expect(dom.dataset.mode).toBe('split');

    // In Split mode, visual table has updated row count
    const updatedCells = dom.querySelectorAll('tbody td');
    expect(updatedCells.length).toBe(4); // 2 rows of 2 cols = 4 cells

    // Verify updateDOM returns true
    const nextWidget = new TableWidget(textarea.value, 0, textarea.value.length);
    const retained = nextWidget.updateDOM(dom, view);
    expect(retained).toBe(true);
  });
});

describe('CodeBlockWidget and CalloutWidget In-Place Editing', () => {
  test('CodeBlockWidget toggles Edit and Done with textarea', () => {
    const source = '```python\nprint("hello")\n```';
    const widget = new CodeBlockWidget(source, 0, source.length, 'python');

    const state = EditorState.create({ doc: source });
    const view = new EditorView({ state });

    const dom = widget.toDOM(view);
    const editBtn = Array.from(dom.querySelectorAll('button')).find((b) => b.textContent === 'Edit') as HTMLElement;
    expect(editBtn).toBeDefined();

    // Click Edit
    editBtn.click();
    const textarea = dom.querySelector('.as-codeblock-textarea') as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();
    expect(textarea.style.display).toBe('block');
    expect(textarea.value).toBe('print("hello")');

    // updateDOM returns true
    const nextWidget = new CodeBlockWidget(source, 0, source.length, 'python');
    expect(nextWidget.updateDOM(dom, view)).toBe(true);
  });

  test('CalloutWidget has editable title and body and updateDOM returns true', () => {
    const source = '> [!NOTE] Important Notice\n> Please read this carefully.';
    const widget = new CalloutWidget(source, 0, source.length);

    const state = EditorState.create({ doc: source });
    const view = new EditorView({ state });

    const dom = widget.toDOM(view);
    const titleEl = dom.querySelector('.as-callout-title') as HTMLElement;
    const bodyEl = dom.querySelector('.as-callout-body') as HTMLElement;

    expect(titleEl).not.toBeNull();
    expect(titleEl.contentEditable).toBe('true');
    expect(titleEl.textContent).toBe('Important Notice');

    expect(bodyEl).not.toBeNull();
    expect(bodyEl.contentEditable).toBe('true');
    expect(bodyEl.textContent).toBe('Please read this carefully.');

    const nextWidget = new CalloutWidget(source, 0, source.length);
    expect(nextWidget.updateDOM(dom, view)).toBe(true);
  });
});

describe('Link Attachment Commands & Normalization', () => {
  test('wrapWithLink wraps selected text with normalized URL', () => {
    const doc = 'Check out Google for info';
    const state = EditorState.create({
      doc,
      selection: EditorSelection.single(10, 16), // "Google"
    });
    const view = new EditorView({ state });

    wrapWithLink(view, 'google.com');
    expect(view.state.doc.toString()).toBe('Check out [Google](https://google.com) for info');
  });

  test('wrapWithLink updates existing markdown link URL', () => {
    const doc = 'Check out [Google](https://yahoo.com) for info';
    const state = EditorState.create({
      doc,
      selection: EditorSelection.single(10, 37), // "[Google](https://yahoo.com)"
    });
    const view = new EditorView({ state });

    wrapWithLink(view, 'https://google.com');
    expect(view.state.doc.toString()).toBe('Check out [Google](https://google.com) for info');
  });

  test('removeLink converts [text](url) back to plain text', () => {
    const doc = 'Check out [Google](https://google.com) for info';
    const state = EditorState.create({
      doc,
      selection: EditorSelection.single(10, 38), // "[Google](https://google.com)"
    });
    const view = new EditorView({ state });

    removeLink(view);
    expect(view.state.doc.toString()).toBe('Check out Google for info');
  });

  test('insertLinkTemplate inserts template and focuses URL', () => {
    const doc = 'Hello ';
    const state = EditorState.create({
      doc,
      selection: EditorSelection.single(6, 6),
    });
    const view = new EditorView({ state });

    insertLinkTemplate(view);
    expect(view.state.doc.toString()).toBe('Hello [link](https://)');
  });

  test('findLinkUrlAt extracts link URL from document position', () => {
    const doc = 'Check out [Google](https://google.com) today';
    const state = EditorState.create({ doc });
    const view = new EditorView({ state });

    const url = findLinkUrlAt(view, 15);
    expect(url).toBe('https://google.com');

    const notFound = findLinkUrlAt(view, 2);
    expect(notFound).toBeNull();
  });
});

describe('ImageWidget & Image Paste Support', () => {
  test('parseImageMarkdown extracts alt and url accurately', () => {
    const parsed1 = parseImageMarkdown('![Screenshot](https://example.com/pic.png)');
    expect(parsed1).not.toBeNull();
    expect(parsed1?.alt).toBe('Screenshot');
    expect(parsed1?.url).toBe('https://example.com/pic.png');

    const parsed2 = parseImageMarkdown('![Diagram](data:image/png;base64,iVBORw0KGgo "My Title")');
    expect(parsed2).not.toBeNull();
    expect(parsed2?.alt).toBe('Diagram');
    expect(parsed2?.url).toBe('data:image/png;base64,iVBORw0KGgo');
    expect(parsed2?.title).toBe('My Title');

    const invalid = parseImageMarkdown('not an image markdown');
    expect(invalid).toBeNull();
  });

  test('serializeImageMarkdown formats image markdown correctly', () => {
    expect(serializeImageMarkdown('Architecture', 'https://example.com/arch.svg')).toBe(
      '![Architecture](https://example.com/arch.svg)'
    );
    expect(serializeImageMarkdown('Flow', 'https://example.com/flow.png', 'Flowchart')).toBe(
      '![Flow](https://example.com/flow.png "Flowchart")'
    );
  });

  test('ImageWidget creates DOM element with img, caption, and hover actions', () => {
    const source = '![Banner](https://example.com/banner.png)';
    const widget = new ImageWidget(source, 0, source.length);

    const state = EditorState.create({ doc: source });
    const view = new EditorView({ state });

    const dom = widget.toDOM(view);
    expect(dom).not.toBeNull();
    expect(dom.className).toBe('as-image-widget');

    const img = dom.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.src).toBe('https://example.com/banner.png');
    expect(img?.alt).toBe('Banner');

    const caption = dom.querySelector('.as-image-caption');
    expect(caption).not.toBeNull();
    expect(caption?.textContent).toBe('Banner');

    // Check action buttons exist
    const actionBar = dom.querySelector('.as-image-actions');
    expect(actionBar).not.toBeNull();
    const buttons = actionBar?.querySelectorAll('button');
    expect(buttons?.length).toBe(3); // Copy URL, Edit, Delete

    // Test updateDOM preserves node
    expect(widget.updateDOM(dom)).toBe(true);
  });

  test('imagePasteDropExtension registers without errors', () => {
    const ext = imagePasteDropExtension();
    expect(ext).toBeDefined();

    const state = EditorState.create({
      doc: 'Start\n\nEnd',
      extensions: [ext],
    });
    const view = new EditorView({ state });
    expect(view).toBeDefined();
  });
});

describe('Task List & Empty Line List Formatting', () => {
  test('setTaskList on empty line creates empty todo item with cursor at end', () => {
    const state = EditorState.create({ doc: '' });
    const view = new EditorView({ state });

    setTaskList(view);
    expect(view.state.doc.toString()).toBe('- [ ] ');
    expect(view.state.selection.main.anchor).toBe(6);
  });

  test('setBulletList and setNumberedList on empty line create list items with cursor at end', () => {
    const state1 = EditorState.create({ doc: '' });
    const view1 = new EditorView({ state1 });
    setBulletList(view1);
    expect(view1.state.doc.toString()).toBe('- ');
    expect(view1.state.selection.main.anchor).toBe(2);

    const state2 = EditorState.create({ doc: '' });
    const view2 = new EditorView({ state2 });
    setNumberedList(view2);
    expect(view2.state.doc.toString()).toBe('1. ');
    expect(view2.state.selection.main.anchor).toBe(3);
  });

  test('setHeadingLevel on empty line inserts heading prefix with cursor at end', () => {
    const state = EditorState.create({ doc: '' });
    const view = new EditorView({ state });

    setHeadingLevel(view, 2);
    expect(view.state.doc.toString()).toBe('## ');
    expect(view.state.selection.main.anchor).toBe(3);
  });

  test('Enter on task item continues list; Enter on empty task item exits list', () => {
    const enterCmd = markdownFormattingKeymap.find((k) => k.key === 'Enter');
    expect(enterCmd).toBeDefined();

    // 1. Enter on non-empty task item continues
    const state1 = EditorState.create({ doc: '- [ ] Buy milk' });
    const view1 = new EditorView({ state: state1 });
    view1.dispatch({ selection: { anchor: 14, head: 14 } });
    enterCmd?.run(view1);
    expect(view1.state.doc.toString()).toBe('- [ ] Buy milk\n- [ ] ');

    // 2. Enter on empty task item exits
    const state2 = EditorState.create({ doc: '- [ ] ' });
    const view2 = new EditorView({ state: state2 });
    view2.dispatch({ selection: { anchor: 6, head: 6 } });
    enterCmd?.run(view2);
    expect(view2.state.doc.toString()).toBe('');
  });

  test('Backspace on empty task item clears it', () => {
    const backspaceCmd = markdownFormattingKeymap.find((k) => k.key === 'Backspace');
    expect(backspaceCmd).toBeDefined();

    const state = EditorState.create({ doc: '- [ ] ' });
    const view = new EditorView({ state });
    view.dispatch({ selection: { anchor: 6, head: 6 } });
    backspaceCmd?.run(view);
    expect(view.state.doc.toString()).toBe('');
  });

  test('toggleTaskCompletion toggles checked state and upgrades bullet items', () => {
    // 1. Toggle unchecked to checked
    const state1 = EditorState.create({ doc: '- [ ] Read documentation' });
    const view1 = new EditorView({ state: state1 });
    view1.dispatch({ selection: { anchor: 10, head: 10 } });
    const toggled1 = toggleTaskCompletion(view1);
    expect(toggled1).toBe(true);
    expect(view1.state.doc.toString()).toBe('- [x] Read documentation');

    // 2. Toggle checked back to unchecked
    const toggled2 = toggleTaskCompletion(view1);
    expect(toggled2).toBe(true);
    expect(view1.state.doc.toString()).toBe('- [ ] Read documentation');

    // 3. Upgrades bullet list item to task item
    const state3 = EditorState.create({ doc: '- Plain bullet note' });
    const view3 = new EditorView({ state: state3 });
    view3.dispatch({ selection: { anchor: 5, head: 5 } });
    const toggled3 = toggleTaskCompletion(view3);
    expect(toggled3).toBe(true);
    expect(view3.state.doc.toString()).toBe('- [ ] Plain bullet note');

    // 4. Mod-Enter keybinding triggers toggle
    const modEnter = markdownFormattingKeymap.find((k) => k.key === 'Mod-Enter');
    expect(modEnter).toBeDefined();
    modEnter?.run(view3);
    expect(view3.state.doc.toString()).toBe('- [x] Plain bullet note');
  });
});


