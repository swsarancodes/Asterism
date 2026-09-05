import { EditorView, Panel, ViewUpdate } from '@codemirror/view';
import {
  SearchQuery,
  setSearchQuery,
  getSearchQuery,
  findNext,
  findPrevious,
  replaceNext,
  replaceAll,
  selectMatches,
  closeSearchPanel,
} from '@codemirror/search';

// SVG Icons
const SEARCH_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
const REPLACE_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9l6 6-6 6"/><path d="M4 4v7a4 4 0 0 0 4 4h11"/></svg>`;
const CHEVRON_DOWN = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
const CHEVRON_UP = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`;
const CHEVRON_RIGHT = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
const CLOSE_ICON = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

/**
 * AsterismSearchPanel:
 * A modern, floating glassmorphic Find & Replace panel designed for CodeMirror 6.
 * Features:
 * - Live match counter ("3 of 14", "No match", "Invalid regex")
 * - Case Sensitive (Aa), Whole Word (\b), and Regexp (.*) pill toggles
 * - Expandable Replace row with Replace, Replace All, and Multi-Select buttons
 * - Keyboard shortcuts: Enter, Shift+Enter, Cmd+Enter, Esc, Alt+C/W/R
 * - Floating top-right card with frosted glass backdrop blur & smooth animations
 */
export class AsterismSearchPanel implements Panel {
  dom: HTMLElement;
  top = true;

  private view: EditorView;
  private query: SearchQuery;
  private searchField: HTMLInputElement;
  private replaceField: HTMLInputElement;
  private counterEl: HTMLSpanElement;
  private clearBtn: HTMLButtonElement;
  private caseBtn: HTMLButtonElement;
  private wordBtn: HTMLButtonElement;
  private regexBtn: HTMLButtonElement;
  private expandBtn: HTMLButtonElement;
  private replaceRow: HTMLDivElement;

  private isCaseSensitive = false;
  private isWholeWord = false;
  private isRegexp = false;
  private isReplaceExpanded = false;

  private boundOnReplaceEvent: () => void;

  constructor(view: EditorView) {
    this.view = view;
    this.query = getSearchQuery(view.state);

    this.isCaseSensitive = this.query.caseSensitive;
    this.isWholeWord = this.query.wholeWord;
    this.isRegexp = this.query.regexp;

    // Outer Panel Container
    this.dom = document.createElement('div');
    this.dom.className = 'cm-panel cm-search as-search-panel';
    this.dom.setAttribute('role', 'search');
    this.dom.onkeydown = (e) => this.handleKeyDown(e);

    // ================= ROW 1: FIND =================
    const findRow = document.createElement('div');
    findRow.className = 'as-search-row as-search-row-find';

    // 1. Expand / Collapse Replace Button
    this.expandBtn = document.createElement('button');
    this.expandBtn.type = 'button';
    this.expandBtn.className = 'as-search-icon-btn as-search-expand-btn';
    this.expandBtn.title = 'Toggle Replace (⌥⌘F)';
    this.expandBtn.innerHTML = `<span class="as-search-chevron">${CHEVRON_RIGHT}</span>`;
    this.expandBtn.onclick = (e) => {
      e.stopPropagation();
      this.toggleReplaceRow();
    };

    // 2. Search Input Wrapper
    const searchWrapper = document.createElement('div');
    searchWrapper.className = 'as-search-input-wrapper as-search-main-wrapper';

    const searchIconSpan = document.createElement('span');
    searchIconSpan.className = 'as-search-input-icon';
    searchIconSpan.innerHTML = SEARCH_ICON;

    this.searchField = document.createElement('input');
    this.searchField.type = 'text';
    this.searchField.className = 'as-search-input';
    this.searchField.name = 'search';
    this.searchField.setAttribute('main-field', 'true');
    this.searchField.placeholder = 'Find in document...';
    this.searchField.value = this.query.search || '';
    this.searchField.spellcheck = false;
    this.searchField.autocomplete = 'off';
    this.searchField.oninput = () => {
      this.updateClearBtnVisibility();
      this.commit();
    };

    this.counterEl = document.createElement('span');
    this.counterEl.className = 'as-search-counter';
    this.counterEl.style.display = 'none';

    this.clearBtn = document.createElement('button');
    this.clearBtn.type = 'button';
    this.clearBtn.className = 'as-search-clear-btn';
    this.clearBtn.title = 'Clear search';
    this.clearBtn.innerHTML = '×';
    this.clearBtn.onclick = (e) => {
      e.stopPropagation();
      this.searchField.value = '';
      this.updateClearBtnVisibility();
      this.commit();
      this.searchField.focus();
    };

    searchWrapper.appendChild(searchIconSpan);
    searchWrapper.appendChild(this.searchField);
    searchWrapper.appendChild(this.counterEl);
    searchWrapper.appendChild(this.clearBtn);

    // 3. Toggle Buttons (Case, Word, Regex)
    const togglesContainer = document.createElement('div');
    togglesContainer.className = 'as-search-toggles';

    this.caseBtn = document.createElement('button');
    this.caseBtn.type = 'button';
    this.caseBtn.className = 'as-search-toggle-btn as-toggle-case';
    this.caseBtn.title = 'Match Case (Alt+C)';
    this.caseBtn.textContent = 'Aa';
    this.caseBtn.onclick = (e) => {
      e.stopPropagation();
      this.isCaseSensitive = !this.isCaseSensitive;
      this.updateToggleButtons();
      this.commit();
    };

    this.wordBtn = document.createElement('button');
    this.wordBtn.type = 'button';
    this.wordBtn.className = 'as-search-toggle-btn as-toggle-word';
    this.wordBtn.title = 'Match Whole Word (Alt+W)';
    this.wordBtn.textContent = '\\b';
    this.wordBtn.onclick = (e) => {
      e.stopPropagation();
      this.isWholeWord = !this.isWholeWord;
      this.updateToggleButtons();
      this.commit();
    };

    this.regexBtn = document.createElement('button');
    this.regexBtn.type = 'button';
    this.regexBtn.className = 'as-search-toggle-btn as-toggle-regex';
    this.regexBtn.title = 'Regular Expression (Alt+R)';
    this.regexBtn.textContent = '.*';
    this.regexBtn.onclick = (e) => {
      e.stopPropagation();
      this.isRegexp = !this.isRegexp;
      this.updateToggleButtons();
      this.commit();
    };

    togglesContainer.appendChild(this.caseBtn);
    togglesContainer.appendChild(this.wordBtn);
    togglesContainer.appendChild(this.regexBtn);

    // 4. Navigation Buttons (Prev / Next)
    const navGroup = document.createElement('div');
    navGroup.className = 'as-search-nav-group';

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'as-search-icon-btn as-nav-prev';
    prevBtn.title = 'Previous Match (Shift+Enter)';
    prevBtn.innerHTML = CHEVRON_UP;
    prevBtn.onclick = (e) => {
      e.stopPropagation();
      findPrevious(this.view);
      this.updateMatchCount();
    };

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'as-search-icon-btn as-nav-next';
    nextBtn.title = 'Next Match (Enter)';
    nextBtn.innerHTML = CHEVRON_DOWN;
    nextBtn.onclick = (e) => {
      e.stopPropagation();
      findNext(this.view);
      this.updateMatchCount();
    };

    navGroup.appendChild(prevBtn);
    navGroup.appendChild(nextBtn);

    // 5. Close Button
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.name = 'close';
    closeBtn.className = 'as-search-icon-btn as-search-close';
    closeBtn.title = 'Close (Escape)';
    closeBtn.innerHTML = CLOSE_ICON;
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      closeSearchPanel(this.view);
    };

    findRow.appendChild(this.expandBtn);
    findRow.appendChild(searchWrapper);
    findRow.appendChild(togglesContainer);
    findRow.appendChild(navGroup);
    findRow.appendChild(closeBtn);

    // ================= ROW 2: REPLACE =================
    this.replaceRow = document.createElement('div');
    this.replaceRow.className = 'as-search-row as-search-row-replace as-search-collapsed';

    const spacer = document.createElement('div');
    spacer.className = 'as-search-spacer';

    const replaceWrapper = document.createElement('div');
    replaceWrapper.className = 'as-search-input-wrapper as-search-replace-wrapper';

    const replaceIconSpan = document.createElement('span');
    replaceIconSpan.className = 'as-search-input-icon';
    replaceIconSpan.innerHTML = REPLACE_ICON;

    this.replaceField = document.createElement('input');
    this.replaceField.type = 'text';
    this.replaceField.className = 'as-search-input';
    this.replaceField.name = 'replace';
    this.replaceField.placeholder = 'Replace with...';
    this.replaceField.value = this.query.replace || '';
    this.replaceField.spellcheck = false;
    this.replaceField.autocomplete = 'off';
    this.replaceField.oninput = () => this.commit();

    replaceWrapper.appendChild(replaceIconSpan);
    replaceWrapper.appendChild(this.replaceField);

    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'as-search-actions';

    const replaceBtn = document.createElement('button');
    replaceBtn.type = 'button';
    replaceBtn.className = 'as-search-action-btn as-btn-replace';
    replaceBtn.title = 'Replace Current Match (Enter)';
    replaceBtn.textContent = 'Replace';
    replaceBtn.onclick = (e) => {
      e.stopPropagation();
      replaceNext(this.view);
      this.updateMatchCount();
    };

    const replaceAllBtn = document.createElement('button');
    replaceAllBtn.type = 'button';
    replaceAllBtn.className = 'as-search-action-btn as-btn-replace-all';
    replaceAllBtn.title = 'Replace All Matches (Cmd+Enter)';
    replaceAllBtn.textContent = 'All';
    replaceAllBtn.onclick = (e) => {
      e.stopPropagation();
      replaceAll(this.view);
      this.updateMatchCount();
    };

    const selectAllBtn = document.createElement('button');
    selectAllBtn.type = 'button';
    selectAllBtn.className = 'as-search-action-btn as-btn-select-all';
    selectAllBtn.title = 'Select All Occurrences';
    selectAllBtn.textContent = 'Select';
    selectAllBtn.onclick = (e) => {
      e.stopPropagation();
      selectMatches(this.view);
    };

    actionsContainer.appendChild(replaceBtn);
    actionsContainer.appendChild(replaceAllBtn);
    actionsContainer.appendChild(selectAllBtn);

    this.replaceRow.appendChild(spacer);
    this.replaceRow.appendChild(replaceWrapper);
    this.replaceRow.appendChild(actionsContainer);

    // Assemble outer panel
    this.dom.appendChild(findRow);
    this.dom.appendChild(this.replaceRow);

    // Initialize toggle states
    this.updateToggleButtons();
    this.updateClearBtnVisibility();

    // Listen for custom expand replace events
    this.boundOnReplaceEvent = () => {
      this.setReplaceExpanded(true);
      setTimeout(() => this.replaceField.focus(), 30);
    };
    window.addEventListener('as:open-replace', this.boundOnReplaceEvent);
  }

  mount() {
    this.searchField.select();
    this.updateMatchCount();
  }

  destroy() {
    window.removeEventListener('as:open-replace', this.boundOnReplaceEvent);
  }

  update(update: ViewUpdate) {
    for (const tr of update.transactions) {
      for (const effect of tr.effects) {
        if (effect.is(setSearchQuery) && !effect.value.eq(this.query)) {
          this.setQuery(effect.value);
        }
      }
    }
    if (update.selectionSet || update.docChanged) {
      this.updateMatchCount();
    }
  }

  private setQuery(query: SearchQuery) {
    this.query = query;
    if (this.searchField.value !== query.search) {
      this.searchField.value = query.search;
    }
    if (this.replaceField.value !== query.replace) {
      this.replaceField.value = query.replace;
    }
    this.isCaseSensitive = query.caseSensitive;
    this.isWholeWord = query.wholeWord;
    this.isRegexp = query.regexp;
    this.updateToggleButtons();
    this.updateClearBtnVisibility();
    this.updateMatchCount();
  }

  private commit() {
    const query = new SearchQuery({
      search: this.searchField.value,
      caseSensitive: this.isCaseSensitive,
      regexp: this.isRegexp,
      wholeWord: this.isWholeWord,
      replace: this.replaceField.value,
    });

    if (!query.eq(this.query)) {
      this.query = query;
      this.view.dispatch({ effects: setSearchQuery.of(query) });
      this.updateMatchCount();
    }
  }

  private toggleReplaceRow() {
    this.setReplaceExpanded(!this.isReplaceExpanded);
  }

  private setReplaceExpanded(expanded: boolean) {
    this.isReplaceExpanded = expanded;
    if (expanded) {
      this.replaceRow.classList.remove('as-search-collapsed');
      this.expandBtn.classList.add('is-expanded');
    } else {
      this.replaceRow.classList.add('as-search-collapsed');
      this.expandBtn.classList.remove('is-expanded');
    }
  }

  private updateToggleButtons() {
    this.caseBtn.classList.toggle('is-active', this.isCaseSensitive);
    this.wordBtn.classList.toggle('is-active', this.isWholeWord);
    this.regexBtn.classList.toggle('is-active', this.isRegexp);
  }

  private updateClearBtnVisibility() {
    if (this.searchField.value.length > 0) {
      this.clearBtn.style.display = 'inline-flex';
    } else {
      this.clearBtn.style.display = 'none';
    }
  }

  private updateMatchCount() {
    const query = this.query;
    if (!query || !query.search) {
      this.counterEl.textContent = '';
      this.counterEl.style.display = 'none';
      this.counterEl.classList.remove('as-no-match');
      return;
    }

    try {
      let count = 0;
      let activeIndex = 0;
      const cursor = query.getCursor(this.view.state);
      const selHead = this.view.state.selection.main.head;
      let match = cursor.next();

      // Scan matches up to safe ceiling
      while (!match.done && count < 5000) {
        count++;
        if (match.value.from <= selHead && match.value.to >= selHead) {
          activeIndex = count;
        } else if (match.value.to < selHead) {
          activeIndex = count;
        }
        match = cursor.next();
      }

      this.counterEl.style.display = 'inline-block';
      if (count === 0) {
        this.counterEl.textContent = 'No match';
        this.counterEl.classList.add('as-no-match');
      } else {
        this.counterEl.classList.remove('as-no-match');
        if (activeIndex === 0) activeIndex = 1;
        this.counterEl.textContent = `${activeIndex} of ${count}${count === 5000 ? '+' : ''}`;
      }
    } catch {
      this.counterEl.textContent = 'Invalid regex';
      this.counterEl.classList.add('as-no-match');
      this.counterEl.style.display = 'inline-block';
    }
  }

  private handleKeyDown(e: KeyboardEvent) {
    // 1. Alt shortcuts for toggles
    if (e.altKey && !e.metaKey && !e.ctrlKey) {
      const k = e.key.toLowerCase();
      if (k === 'c') {
        e.preventDefault();
        this.isCaseSensitive = !this.isCaseSensitive;
        this.updateToggleButtons();
        this.commit();
        return;
      }
      if (k === 'w') {
        e.preventDefault();
        this.isWholeWord = !this.isWholeWord;
        this.updateToggleButtons();
        this.commit();
        return;
      }
      if (k === 'r') {
        e.preventDefault();
        this.isRegexp = !this.isRegexp;
        this.updateToggleButtons();
        this.commit();
        return;
      }
    }

    // 2. Escape closes panel
    if (e.key === 'Escape') {
      e.preventDefault();
      closeSearchPanel(this.view);
      this.view.focus();
      return;
    }

    // 3. Search field Enter / Shift+Enter
    if (e.target === this.searchField) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          findPrevious(this.view);
        } else {
          findNext(this.view);
        }
        this.updateMatchCount();
      } else if (e.altKey && e.key === 'ArrowDown') {
        e.preventDefault();
        this.setReplaceExpanded(true);
        this.replaceField.focus();
      }
    }

    // 4. Replace field Enter / Cmd+Enter
    if (e.target === this.replaceField) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.metaKey || e.ctrlKey) {
          replaceAll(this.view);
        } else {
          replaceNext(this.view);
        }
        this.updateMatchCount();
      } else if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault();
        this.searchField.focus();
      }
    }
  }
}
