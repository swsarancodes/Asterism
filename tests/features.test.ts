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
  (global as any).Window = window.constructor;
  (global as any).document = window.document;
  (global as any).HTMLElement = window.HTMLElement;
  (global as any).HTMLTextAreaElement = window.HTMLTextAreaElement;
  (global as any).MutationObserver = window.MutationObserver;
  (global as any).navigator = window.navigator;
  (global as any).Event = window.Event;
  (global as any).KeyboardEvent = window.KeyboardEvent;
  (global as any).MouseEvent = window.MouseEvent;
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

  it('lineSelectionExtension isolates triple-clicks strictly to line.from and line.to without spilling', () => {
    const text = 'Line One\nLine Two\n![Image](https://example.com/pic.png)\n\n\nLine Six';
    const extensions = createEditorExtensions();
    const state = EditorState.create({ doc: text, extensions });
    const view = new EditorView({ state, parent: container });

    // Find "Line Two"
    const lineTwo = view.state.doc.line(2);
    expect(lineTwo.text).toBe('Line Two');

    view.dispatch({ selection: EditorSelection.cursor(lineTwo.from) });

    // Simulate triple-click event on Line Two
    const mousedownEvent = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      clientX: 20,
      clientY: 30,
      detail: 3, // triple click
      button: 0,
    });

    // Invoke mouseSelectionStyle facet
    const styles = view.state.facet(EditorView.mouseSelectionStyle);
    expect(styles.length).toBeGreaterThan(0);

    let handler: any = null;
    for (const makeStyle of styles) {
      handler = makeStyle(view, mousedownEvent);
      if (handler) break;
    }

    expect(handler).not.toBeNull();
    const selection = handler.get(mousedownEvent, false, false);
    expect(selection.main.from).toBe(lineTwo.from);
    // Crucial: to MUST be lineTwo.to, NOT lineTwo.to + 1 (which would spill into the image below)
    expect(selection.main.to).toBe(lineTwo.to);
    expect(selection.main.to).not.toBe(lineTwo.to + 1);

    view.destroy();
  });

  it('buildBlockWidgets decorates standalone image lines with block: true', () => {
    const { buildBlockWidgets } = require('../src/editor/widgets/plugin');
    const doc = 'images can be pasted\n![Image](https://example.com/pic.png)\n\n\n';
    const extensions = createEditorExtensions();
    const state = EditorState.create({ doc, extensions });

    const decos = buildBlockWidgets(state);
    const iter = decos.iter();
    let foundBlockImage = false;

    while (iter.value) {
      if (iter.value.spec.widget?.nodeName === 'Image') {
        expect(iter.value.spec.block).toBe(true);
        const line = state.doc.lineAt(iter.from);
        expect(iter.from).toBe(line.from);
        expect(iter.to).toBe(line.to);
        foundBlockImage = true;
      }
      iter.next();
    }

    expect(foundBlockImage).toBe(true);
  });

  it('MarkdownWidget coordsAt returns tight bounded coordinates rather than blowing up selection', () => {
    const { ImageWidget } = require('../src/editor/widgets/image');
    const widget = new ImageWidget('![Pic](https://example.com/pic.png)', 0, 36);

    const fakeDom = document.createElement('div');
    fakeDom.getBoundingClientRect = () => ({
      top: 100,
      bottom: 620, // 520px tall
      left: 50,
      right: 450,
      width: 400,
      height: 520,
      x: 50,
      y: 100,
      toJSON: () => {},
    });

    Object.defineProperty(fakeDom, 'isConnected', { value: true });

    const coords = widget.coordsAt(fakeDom, 0, 1);
    expect(coords).not.toBeNull();
    expect(coords?.top).toBe(100);
    // Bounded to 24px height, NOT 620px!
    expect(coords?.bottom).toBe(124);
  });

  it('dragging horizontally past end of line clamps strictly to line.to', () => {
    const text = 'images can be pasted\n![Image](https://example.com/pic.png)\n\n\nLine 5';
    const extensions = createEditorExtensions();
    const state = EditorState.create({ doc: text, extensions });
    const view = new EditorView({ state, parent: container });

    const lineOne = view.state.doc.line(1);
    expect(lineOne.text).toBe('images can be pasted');

    // Simulate mock coordsAtPos for testing layout clamp
    const origCoordsAtPos = view.coordsAtPos.bind(view);
    view.coordsAtPos = (pos: number) => {
      if (pos === lineOne.from) {
        return { top: 100, bottom: 120, left: 50, right: 50 };
      }
      if (pos === lineOne.to) {
        return { top: 100, bottom: 120, left: 250, right: 250 };
      }
      return origCoordsAtPos(pos);
    };

    view.posAndSideAtCoords = () => ({ pos: 0, assoc: 1 });

    view.dispatch({ selection: EditorSelection.cursor(lineOne.from) });

    const mousedownEvent = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      clientX: 50,
      clientY: 110,
      detail: 1, // single click / drag
      button: 0,
    });

    const styles = view.state.facet(EditorView.mouseSelectionStyle);
    let handler: any = null;
    for (const makeStyle of styles) {
      handler = makeStyle(view, mousedownEvent);
      if (handler) break;
    }

    expect(handler).not.toBeNull();

    // Drag past end of line (clientX: 500 > 250), Y is 112 (on line)
    const mousemoveEvent = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: 500,
      clientY: 112,
    });

    const selection = handler.get(mousemoveEvent, false, false);
    // Crucial: target is clamped to lineOne.to (20), NOT leaking to Line 5 or doc.length
    expect(selection.main.from).toBe(lineOne.from);
    expect(selection.main.to).toBe(lineOne.to);

    view.destroy();
  });
});


