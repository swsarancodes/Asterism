# 07 — Decision Log

Architectural decisions, why they were made, and what we rejected. Read the
relevant entry before proposing a change. Reopening a decision is legitimate —
doing it without addressing the recorded reasoning is not.

Format: Context → Decision → Consequences → Rejected alternatives.

---

## ADR-001 — CodeMirror 6 over a rich-text document model

**Status:** Accepted

**Context.** Visual Markdown editing has two implementations. (A) Parse Markdown
into a rich-text tree (ProseMirror, Tiptap, Lexical), edit the tree, serialize
back. (B) Keep the Markdown text as the model and layer decorations over it.

Approach A gives better rich-editing ergonomics out of the box. It is also lossy:
serialization normalizes list markers, emphasis delimiters, whitespace, and
anything outside the parser's grammar. Users publish these files through static
site generators and commit them to Git. A 400-line diff from merely opening a
file destroys trust.

**Decision.** CodeMirror 6 with decoration-based rendering. The Markdown text is
the only document model.

**Consequences.**
- Round-trip fidelity is guaranteed by construction, not by careful serializer work.
- Source mode and hybrid mode share one engine and one state — no dual-model sync.
- Incremental Lezer parsing and viewport virtualization give us the perf budget.
- Cost: block widgets (tables, images) require more work than in ProseMirror.
- Cost: the decoration + reveal system is genuinely hard. See M2's kill criterion.

**Rejected.**
- *ProseMirror / Tiptap* — lossy round-trip. Fatal against our core principle.
- *Lexical* — same problem, plus a smaller Markdown ecosystem.
- *Monaco* — built for code. No path to concealment or rich block widgets.
- *Custom canvas editor* — would require reimplementing IME, accessibility, RTL,
  and macOS text services. Never do this.

---

## ADR-002 — Tauri v2 over Electron

**Status:** Accepted

**Context.** Desktop shell for a distraction-free writing app that must feel
light and start fast.

**Decision.** Tauri v2, with a React + TypeScript frontend and a thin Rust core.

**Consequences.**
- ~10–15MB bundle, ~80–150MB idle RSS. Electron would be ~150MB and ~250–400MB.
  For an app whose pitch is "gets out of the way," this matters.
- Frontend stays pure TypeScript, so any React developer can contribute without
  learning Rust. Expected Rust surface: FS, watcher, index, menus — a few
  hundred lines.
- Linux and Windows come nearly free later.
- Cost: WKWebView on macOS is not Chromium. Rendering quirks differ. **Develop
  inside Tauri from M0**; never validate only in a browser tab.
- Cost: contributors need a Rust toolchain to build, even if they never write Rust.

**Rejected.**
- *Electron* — defensible (VS Code, Obsidian both use it) and faster to start.
  Rejected on bundle size and memory, which directly contradict the positioning.
- *SwiftUI / native* — best fidelity and smallest binary, but ~10x smaller
  contributor pool and no cross-platform path. Wrong trade for an OSS project.

---

## ADR-003 — Plain `.md` files as the source of truth

**Status:** Accepted

**Context.** Note apps typically maintain a database as the record and treat
files as an export format. That gives faster queries and richer linking, at the
cost of lock-in and opaque data.

**Decision.** The file on disk is the only record. The SQLite index is a
disposable cache.

**Consequences.**
- Deleting the index must be invisible to the user; the app rebuilds it.
- Any external tool — Vim, Git, `rg`, an SSG — is a first-class citizen.
- External-change reconciliation becomes a core requirement, not an afterthought.
- Cost: some features (instant backlink graphs across 50k notes) are harder.
  Accepted; those are non-goals.

**Rejected.**
- *SQLite as record with file export* — lock-in, and it makes "works everywhere"
  a marketing claim rather than a fact.
- *Proprietary format* — non-starter.

---

## ADR-004 — Vite, not Next.js

**Status:** Accepted

**Context.** The frontend needs a bundler and dev server.

**Decision.** Vite.

**Consequences.** Fast HMR, trivial config, no server runtime.

**Rejected.**
- *Next.js* — SSR, file-based routing, server components, and the image
  optimizer buy nothing in a local desktop app with no server and one route.
  It adds a Node runtime to something that has no back end.

---

## ADR-005 — No CRDT / sync layer in v1

**Status:** Accepted

**Context.** Local-first apps often reach for Yjs or Automerge early.

**Decision.** No CRDT in v1. Files are the sync layer; users bring Git, iCloud,
Dropbox, or Syncthing.

**Consequences.**
- Large complexity avoided. External-change reconciliation covers the realistic
  multi-device case.
- Cost: no real-time collaboration. Explicitly a non-goal.
- Revisit only if a concrete collaboration use case emerges with a maintainer
  willing to own it.

**Rejected.**
- *Yjs from day one* — solving a problem we do not have, at high cost to the
  fidelity invariant (CRDTs impose their own document representation).

---

## ADR-006 — remark for tooling, Lezer for editing

**Status:** Accepted

**Context.** Two Markdown parsers in one project looks like duplication.

**Decision.** Lezer (via `@codemirror/lang-markdown`) is the editing parser —
incremental, error-tolerant, integrated with CM6. remark/unified is used only
for offline tooling: HTML export, outline extraction, link analysis.

**Consequences.**
- Clear boundary: Lezer output never leaves the editor; remark output never
  writes back to the buffer.
- Cost: two grammars can disagree on edge cases. Editing behaviour always wins;
  remark is only ever a consumer.

**Rejected.**
- *remark for editing* — not incremental, wrong shape for a live editor.
- *Lezer for export* — lacks the plugin ecosystem for HTML/PDF pipelines.

---

## ADR-007 — Widget state lives in the document text

**Status:** Accepted

**Context.** A table widget could hold its cells in React state and write to the
document on blur. That is simpler to build.

**Decision.** Widgets hold no state. A widget renders from the text range it
replaces and dispatches transactions to change it.

**Consequences.**
- Undo, multi-cursor, external reload, and mode switching all work automatically.
- No sync bugs between widget state and buffer state.
- Cost: widgets re-render on every relevant transaction, so `eq()` must compare
  source text to avoid DOM churn.

**Rejected.**
- *Stateful widgets with deferred writeback* — reintroduces the exact dual-model
  problem ADR-001 exists to avoid, at the widget level instead of the document
  level.

---

## ADR-008 — No telemetry

**Status:** Accepted

**Context.** Usage analytics would meaningfully improve prioritisation.

**Decision.** No telemetry. Not opt-out — absent. Zero outbound network requests
in v1 except a user-triggered update check.

**Consequences.**
- "Works offline, no account, nothing leaves your machine" is verifiable by
  reading the source and by watching the network.
- Cost: prioritisation comes from issues, discussions, and dogfooding.
  Acceptable, and arguably higher-signal.

**Rejected.**
- *Anonymous opt-out analytics* — undermines the trust position for marginal
  data, in a category where privacy is a purchase reason.

---

## ADR-009 — AI deferred to v2

**Status:** Accepted

**Context.** Competing tools lead with AI features.

**Decision.** No AI in v1. The v1 architecture must not preclude it.

**Consequences.**
- v1 ships focused on the actual differentiator: fidelity plus a distraction-free
  editing environment.
- Design constraint carried forward: keep transactions the only write path, so a
  future AI feature writes plain Markdown through the same door as everything else.
- When added: bring-your-own-key or local model, off by default, no network call
  without explicit user action.

**Rejected.**
- *AI in v1* — would compete for attention with the M2 spike, which is the
  project's actual risk.
