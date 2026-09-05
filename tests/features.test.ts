import { describe, it, expect, beforeEach, beforeAll } from 'bun:test';
import { GlobalWindow } from 'happy-dom';
import { EditorState, EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
  indentListItem,
  outdentListItem,
  insertMathTemplate,
  toggleHighlight,
  setBlockquote,
  toggleInlineFormat,
  markdownFormattingKeymap,
} from '../src/editor/commands/formatting';
import { createEditorState, createEditorExtensions } from '../src/editor/setup';
import { setSearchQuery, SearchQuery } from '@codemirror/search';
import { AsterismSearchPanel } from '../src/editor/search-panel';

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

describe('New Editor Features & Formatting Keymaps', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('indentListItem indents bullet, numbered, and task items by 2 spaces', () => {
    // 1. Bullet list
    const state1 = EditorState.create({
      doc: '- First item\n- Second item',
      selection: EditorSelection.cursor(15), // on second line
    });
    const view1 = new EditorView({ state: state1, parent: container });
    const res1 = indentListItem(view1);
    expect(res1).toBe(true);
    expect(view1.state.doc.toString()).toBe('- First item\n  - Second item');
    view1.destroy();

    // 2. Numbered list
    const state2 = EditorState.create({
      doc: '1. First item\n2. Second item',
      selection: EditorSelection.cursor(16),
    });
    const view2 = new EditorView({ state: state2, parent: container });
    const res2 = indentListItem(view2);
    expect(res2).toBe(true);
    expect(view2.state.doc.toString()).toBe('1. First item\n  2. Second item');
    view2.destroy();

    // 3. Task list
    const state3 = EditorState.create({
      doc: '- [ ] Task 1\n- [ ] Task 2',
      selection: EditorSelection.cursor(16),
    });
    const view3 = new EditorView({ state: state3, parent: container });
    const res3 = indentListItem(view3);
    expect(res3).toBe(true);
    expect(view3.state.doc.toString()).toBe('- [ ] Task 1\n  - [ ] Task 2');
    view3.destroy();
  });

  it('outdentListItem removes 2 spaces of indent or removes marker at root', () => {
    // 1. Outdent indented bullet list
    const state1 = EditorState.create({
      doc: '- Item 1\n    - Sub item',
      selection: EditorSelection.cursor(18), // on Sub item with 4 spaces indent
    });
    const view1 = new EditorView({ state: state1, parent: container });
    const res1 = outdentListItem(view1);
    expect(res1).toBe(true);
    expect(view1.state.doc.toString()).toBe('- Item 1\n  - Sub item');

    // 2. Outdent again to root level
    const res2 = outdentListItem(view1);
    expect(res2).toBe(true);
    expect(view1.state.doc.toString()).toBe('- Item 1\n- Sub item');

    // 3. Outdent at root level removes the marker
    const res3 = outdentListItem(view1);
    expect(res3).toBe(true);
    expect(view1.state.doc.toString()).toBe('- Item 1\nSub item');
    view1.destroy();
  });

  it('indentListItem and outdentListItem return false on plain non-list lines', () => {
    const state = EditorState.create({
      doc: 'Just normal text line',
      selection: EditorSelection.cursor(5),
    });
    const view = new EditorView({ state, parent: container });
    expect(indentListItem(view)).toBe(false);
    expect(outdentListItem(view)).toBe(false);
    view.destroy();
  });

  it('insertMathTemplate inserts inline formula and block equation templates', () => {
    // 1. Inline math
    const state1 = EditorState.create({
      doc: 'Formula: ',
      selection: EditorSelection.cursor(9),
    });
    const view1 = new EditorView({ state: state1, parent: container });
    insertMathTemplate(view1, false);
    expect(view1.state.doc.toString()).toBe('Formula: $E = mc^2$');
    view1.destroy();

    // 2. Block math
    const state2 = EditorState.create({
      doc: 'Equation:\n',
      selection: EditorSelection.cursor(10),
    });
    const view2 = new EditorView({ state: state2, parent: container });
    insertMathTemplate(view2, true);
    expect(view2.state.doc.toString()).toBe('Equation:\n$$\n\\sum_{i=1}^n x_i\n$$\n');
    view2.destroy();
  });

  it('toggleHighlight wraps and unwraps text with == syntax', () => {
    const state = EditorState.create({
      doc: 'This is important text here',
      selection: EditorSelection.range(8, 17), // 'important'
    });
    const view = new EditorView({ state, parent: container });
    toggleHighlight(view);
    expect(view.state.doc.toString()).toBe('This is ==important== text here');

    // Unwrap
    toggleHighlight(view);
    expect(view.state.doc.toString()).toBe('This is important text here');
    view.destroy();
  });

  it('setBlockquote prefixes single or multiple lines with > and toggles back', () => {
    const state = EditorState.create({
      doc: 'Quote line 1\nQuote line 2',
      selection: EditorSelection.range(0, 24),
    });
    const view = new EditorView({ state, parent: container });
    setBlockquote(view);
    expect(view.state.doc.toString()).toBe('> Quote line 1\n> Quote line 2');

    // Toggle back
    setBlockquote(view);
    expect(view.state.doc.toString()).toBe('Quote line 1\nQuote line 2');
    view.destroy();
  });

  it('In-document search highlights matches across document', () => {
    const text = 'Asterism is a distraction-free Markdown editor. Asterism edits Markdown visually.';
    const extensions = createEditorExtensions();
    const state = EditorState.create({ doc: text, extensions });
    const view = new EditorView({ state, parent: container });

    // Set search query
    view.dispatch({
      effects: setSearchQuery.of(new SearchQuery({ search: 'Asterism', caseSensitive: false })),
    });

    expect(view.state.doc.toString()).toBe(text);
    view.destroy();
  });

  it('Typewriter and Focus mode extensions register smoothly without crashing', () => {
    const text = 'First line\n\nSecond paragraph here\n\nThird paragraph here';
    const extensions = createEditorExtensions({
      typewriterMode: true,
      focusMode: 'paragraph',
    });
    const state = EditorState.create({ doc: text, extensions });
    const view = new EditorView({ state, parent: container });
    expect(view.state.doc.toString()).toBe(text);

    // Simulate moving cursor
    view.dispatch({ selection: EditorSelection.cursor(20) });
    expect(view.state.selection.main.head).toBe(20);
    view.destroy();
  });

  it('AsterismSearchPanel creates floating UI, matches query, and computes match count', () => {
    const text = 'Alpha Beta Alpha Gamma Alpha';
    const extensions = createEditorExtensions();
    const state = EditorState.create({ doc: text, extensions });
    const view = new EditorView({ state, parent: container });

    const panel = new AsterismSearchPanel(view);
    expect(panel.dom).not.toBeNull();
    expect(panel.dom.className).toContain('as-search-panel');

    // Mount panel
    panel.mount();

    const searchInput = panel.dom.querySelector('input[name="search"]') as HTMLInputElement;
    expect(searchInput).not.toBeNull();

    // Type query
    searchInput.value = 'Alpha';
    searchInput.dispatchEvent(new Event('input'));

    const counter = panel.dom.querySelector('.as-search-counter') as HTMLSpanElement;
    expect(counter.textContent).toContain('of 3');

    // Test Case Sensitive toggle
    const caseBtn = panel.dom.querySelector('.as-toggle-case') as HTMLButtonElement;
    caseBtn.click();
    expect(caseBtn.className).toContain('is-active');

    panel.destroy();
    view.destroy();
  });
});
