# Asterism

> ⁂ &nbsp;An open-source, distraction-free Markdown studio.

Asterism edits Markdown **visually** — no preview pane, no compile step — while
treating your `.md` file as the single source of truth. Bytes you don't touch
are bytes we don't rewrite.

```
plain .md on disk  ·  no account  ·  works offline  ·  MIT licensed
```

---

## Why

Markdown editors force a bad trade:

| Category | Example behaviour | The cost |
|---|---|---|
| **Split-pane** | Source left, HTML preview right | You read one pane and write in the other. Constant context switch. |
| **WYSIWYG** | Parses to a rich-text tree, serializes on save | Reformats your file. Footnotes, raw HTML, list markers, spacing — silently normalized. |

Asterism takes a third path: **source-of-truth editing with live decorations.**
The Markdown text *is* the document model. We hide syntax tokens and render
inline styles on top of the real characters. You get WYSIWYG ergonomics with a
byte-faithful file.

If Asterism ever rewrites a line you did not edit, that is a **P0 bug.**

## Principles

1. **The file is the truth.** No proprietary format, no database of record, no lock-in.
2. **Lossless or nothing.** Round-tripping a document through Asterism is a no-op.
3. **Local-first.** No account, no telemetry, no network required. Ever.
4. **Fast at 10k lines.** Incremental parsing and viewport-scoped rendering, not full re-renders.
5. **Boring dependencies.** Every dep is a liability. Justify each one.

## Status

**Pre-alpha.** Nothing is shippable yet. See [the roadmap](docs/05-roadmap.md)
for the current milestone.

## Stack

| Layer | Choice |
|---|---|
| Shell | Tauri v2 (Rust) |
| UI | React 19 + TypeScript + Vite |
| Editor core | CodeMirror 6 + Lezer |
| Markdown tooling | remark / unified (AST for tooling — **not** for editing) |
| Index | SQLite (disposable cache, never source of truth) |

Rationale for each: [Decision Log](docs/07-decision-log.md).

## Quickstart

```bash
# Prerequisites: Node 20+, pnpm 9+, Rust stable, Xcode CLI tools
pnpm install
pnpm tauri dev
```

## Documentation

| Doc | Read it when |
|---|---|
| [01 — Vision & Scope](docs/01-vision-and-scope.md) | You want to know what we will and won't build |
| [02 — Architecture](docs/02-architecture.md) | Before writing any code |
| [03 — Editor Core Spec](docs/03-editor-core-spec.md) | You're touching rendering, decorations, or the buffer |
| [04 — Feature Spec](docs/04-feature-spec.md) | You're implementing a feature |
| [05 — Roadmap](docs/05-roadmap.md) | You want to pick up work |
| [06 — Repo Structure](docs/06-repo-structure.md) | You don't know where a file goes |
| [07 — Decision Log](docs/07-decision-log.md) | You want to relitigate a choice (please read first) |
| [CONTRIBUTING](CONTRIBUTING.md) | You're opening a PR |

## Licence

MIT.

## Prior art & credit

Asterism is an independent project. It is inspired by the category of
distraction-free Markdown editors — including Dinkus, iA Writer, Obsidian, and
Typora — but shares no code, assets, or branding with any of them. An *asterism*
(⁂) is the typographic mark used as a section break.
