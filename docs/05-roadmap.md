# 05 — Roadmap

Milestones are gated by **exit criteria**, not dates. A milestone is done when
its criteria pass in CI, not when the code is written.

The critical path runs M0 → M1 → **M2**. M2 is the make-or-break spike.

---

## M0 — Skeleton

**Goal:** prove the stack end-to-end. Nothing pretty.

| Task | Detail |
|---|---|
| Tauri v2 + Vite + React + TS scaffold | `pnpm tauri dev` runs |
| CodeMirror 6 mounted, plain text | No Markdown yet |
| `read_file` / `write_file_atomic` Rust commands | Temp → fsync → rename |
| File meta capture | Line endings, BOM, trailing newline, hash, mtime |
| Typed IPC bindings | `tauri-specta` generated, no hand-written types |
| CI: lint, typecheck, `cargo clippy`, build | Green on macOS runner |

**Exit criteria**
- Open a `.md`, edit, save; disk content is correct.
- A CRLF file with a BOM and no trailing newline round-trips byte-identical.
- `.app` builds and launches on a clean machine.

---

## M1 — Markdown source mode

**Goal:** a genuinely good raw Markdown editor. Ship-worthy on its own.

| Task | Detail |
|---|---|
| `@codemirror/lang-markdown` + GFM extensions | Tables, strikethrough, task lists |
| Syntax highlight theme | CSS variables, light + dark |
| Node classification helpers | Map Lezer node types → semantic kinds |
| Corpus test harness | 1,000+ files, byte-identical assertion |
| Perf bench harness | 10k-line open time, keystroke latency |

**Exit criteria**
- Corpus round-trip test passes at 100%.
- 10k-line document opens in < 300ms.
- Highlighting is correct for nested emphasis and code-in-table cases.

---

## M2 — Hybrid rendering ⚠️ CRITICAL SPIKE

**Goal:** the core bet. Prove concealment feels right or find out now.

| Task | Detail |
|---|---|
| Conceal `ViewPlugin` | Replace-decorations over marker ranges only |
| Reveal-on-caret logic | Node-overlap rule, multi-cursor aware |
| Inline style `ViewPlugin` | Mark-decorations for bold/em/code/heading/link |
| `atomicRanges` for cursor motion | One keypress crosses a concealed marker |
| IME composition guard | Suspend recompute between composition events |
| Mode switching | Hybrid ↔ Source preserving selection and scroll |
| Raw HTML rendered inert | Styled text, never live HTML |

**Exit criteria**
- Typing a full paragraph with mixed inline syntax feels natural — judged by a
  human writing 1,000 words in it, not by a unit test.
- Corpus round-trip still 100%.
- p95 keystroke → paint < 16ms with concealment active.
- Japanese IME input works without dropped or duplicated characters.
- Arrow-key traversal never gets stuck at a concealed boundary.

> **Kill criterion.** If after two focused weeks hybrid editing still feels
> wrong — flickering, cursor jumps, IME breakage — stop. Reassess in
> [07 — Decision Log](07-decision-log.md) before writing another feature. Better
> to pivot in week 3 than month 5.

---

## M3 — Writing environment

**Goal:** the differentiators. Cheap in CM6, high perceived value.

| Task | Detail |
|---|---|
| Typewriter mode | Draggable anchor, padding, soft-wrap correct |
| Focus modes | Sentence / paragraph / line, `Intl.Segmenter` |
| Smart list continuation | Marker and indent preserving |
| Task checkbox widget | Click and `⌘⏎` toggle |
| Auto-pairs | Selection-aware wrapping |
| Configurable measure | CSS variable, persisted |
| `prefers-reduced-motion` support | Disable transitions and smooth scroll |

**Exit criteria**
- Caret Y drift under ±2px in typewriter mode while typing continuously.
- Focus dimming does not strobe during fast typing.
- Sentence detection correct on abbreviations, decimals, and CJK text.

---

## M4 — Vault & file management

**Goal:** stop being a single-file toy.

| Task | Detail |
|---|---|
| Open folder as vault, scoped permissions | Reject traversal in Rust |
| File tree sidebar, virtualized | Handles 10k files |
| Debounced autosave | 500ms, hash-guarded |
| File watcher + reconciliation | Non-modal conflict banner |
| Tabs / document switcher | |
| Command palette + quick open | Fuzzy match |
| Native menu bar | Full macOS menu conventions |
| Create / rename / delete / move | With undo where safe |

**Exit criteria**
- Editing the file in Vim while Manicule is open produces correct reconciliation
  in all three states (clean / dirty / deleted).
- Our own saves never trigger a reload prompt.
- 10k-file vault opens without UI jank.

---

## M5 — Block widgets

**Goal:** feature parity on the rich constructs.

| Task | Detail |
|---|---|
| Widget base class + writeback contract | §5.1 of the editor spec |
| Table widget | Padded re-emit, alignment preserved |
| Code block widget | Lazy language loading |
| Image widget + dialog | Asset protocol, remote blocked by default |
| Front matter widget | YAML / TOML / JSON, key order preserved |
| Footnotes | |
| Find & replace, regex | |
| Split view, scroll-synced | |
| Paste-as-Markdown, image drag-drop | |

**Exit criteria**
- Table edits keep the source aligned and the diff minimal.
- Front matter edit touches only the edited key's bytes.
- Corpus round-trip still 100% with all widgets enabled.
- Widget DOM rebuild count stays flat during fast typing.

---

## M6 — Polish & release

**Goal:** something a stranger can install and trust.

| Task | Detail |
|---|---|
| Theme system + built-in themes | CSS variables, documented |
| Font selection, zen mode, counts | |
| Vault search UI (FTS5) | |
| Document outline | |
| Export HTML / PDF / rich text | |
| Session restore, recent files, multi-window | |
| Code signing + notarization | |
| Auto-update, user-triggered | |
| Accessibility audit | VoiceOver, keyboard-only, contrast |
| Docs site, screenshots, demo | |

**Exit criteria**
- All performance budgets in [02 §6](02-architecture.md) met in CI.
- Signed, notarized `.dmg` installs cleanly on a fresh macOS.
- VoiceOver can read and navigate a document with widgets.
- **Dogfood gate:** a writer uses it exclusively for one week and does not
  reach for another editor.

**→ v1.0 release**

---

## M7 — Post-v1

Unordered. Driven by what users actually ask for.

- Vim mode
- Wiki links, callouts, KaTeX, Mermaid
- Linux and Windows builds
- CLI entry point
- Plugin API design (security model first, code second)
- AI features: BYO-key or local model, off by default

---

## Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| Hybrid mode feels wrong | Fatal | M2 spike with an explicit kill criterion |
| Round-trip fidelity leaks | Fatal | Corpus test blocks merge from M1 onward |
| IME breakage | High | Composition guard in M2; test with real IME early |
| Perf collapse from decorations | High | Viewport scoping enforced; CI perf budgets |
| WKWebView quirks vs Chromium | Medium | Test in Tauri from M0; never develop in the browser alone |
| Scope creep toward Obsidian | Medium | Non-goals list is binding; link to it in PR reviews |
| Solo-maintainer bus factor | Medium | Docs-first repo; every subsystem specified before built |
| Table/front-matter edge cases | Medium | Fall back to raw text rather than render a wrong widget |

---

## Working discipline

1. **Spec before code.** If it isn't in `docs/`, it isn't agreed.
2. **The corpus test is sacred.** Never skip it to land a feature.
3. **One milestone at a time.** Do not start M5 widgets during M2.
4. **Measure, don't assume.** Every perf claim needs a benchmark number.
5. **Write in it.** From M2 onward, the maintainers draft these very docs in
   Manicule. Nothing surfaces bugs faster than depending on your own tool.
