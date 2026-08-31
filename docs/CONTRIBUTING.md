# Contributing to Asterism

Thanks for helping. This document is short on purpose — the specs in `docs/`
carry the detail.

## Before you write code

1. Read [02 — Architecture](docs/02-architecture.md).
2. If you're touching the editor, read [03 — Editor Core Spec](docs/03-editor-core-spec.md) in full.
3. Check [05 — Roadmap](docs/05-roadmap.md). We work one milestone at a time.
   A great M5 PR during M2 will be asked to wait.
4. Open an issue before starting anything non-trivial. Alignment first, code second.

## Setup

```bash
# Prerequisites
node --version    # 20+
pnpm --version    # 9+
rustc --version   # stable
xcode-select -p   # CLI tools installed

pnpm install
pnpm tauri dev
```

**Develop inside the Tauri window, not a browser tab.** macOS uses WKWebView,
which differs from Chromium in ways that will bite you at review time.

## Commands

```bash
pnpm tauri dev        # Run the app
pnpm test             # Unit + property tests
pnpm test:corpus      # Round-trip fidelity — the important one
pnpm bench            # Performance budgets
pnpm typecheck
pnpm lint
cargo clippy --manifest-path src-tauri/Cargo.toml
```

## The non-negotiables

These fail review immediately, regardless of how good the feature is.

| Rule | Why |
|---|---|
| **Never break round-trip fidelity** | It is the product. `pnpm test:corpus` must be 100%. |
| **Never skip or `.skip` the corpus test** | See above. |
| **Never regex the Markdown for concealment** | Use the Lezer tree. Regex breaks silently inside code blocks and escapes. |
| **Never iterate the whole document in a `ViewPlugin`** | Use `view.visibleRanges`. Full-doc iteration destroys the perf budget. |
| **Never hold widget state outside the document** | See [ADR-007](docs/07-decision-log.md). |
| **Never import React from `src/core/`** | Enforced by lint. Core stays portable and testable. |
| **Never render raw HTML from a document as live HTML** | Security. Display it inert. |
| **Never add telemetry or an unprompted network call** | See [ADR-008](docs/07-decision-log.md). |

## PR checklist

- [ ] Linked to an issue
- [ ] `pnpm test:corpus` passes
- [ ] New Markdown construct? Corpus fixture added in the same PR
- [ ] Editor change? Benchmark numbers included in the description
- [ ] Widget change? Keyboard-navigable and `aria-label`ed
- [ ] Decoration change? Tested with an IME (Japanese, Korean, or Chinese)
- [ ] No new dependency without justification in the PR description
- [ ] Behaviour change reflected in the relevant `docs/` file

## Performance claims need numbers

"This should be faster" is not reviewable. Run `pnpm bench`, paste before/after.
The budgets are in [02 §6](docs/02-architecture.md).

## Adding a dependency

Every dependency is a liability — bundle size, supply chain, maintenance. In
your PR description, answer:

1. What does it do that we can't do in under ~200 lines?
2. Bundle cost?
3. Maintenance status — last release, open issue count?
4. What's the removal path if it's abandoned?

## Commit style

Conventional commits.

```
feat(editor): conceal emphasis markers outside caret node
fix(fidelity): preserve CRLF on save
perf(decorations): scope conceal plugin to visible ranges
docs(spec): clarify reveal rule for multi-cursor
```

## Code style

- TypeScript strict mode. No `any`. No `@ts-ignore` without an adjacent comment
  explaining why.
- Prettier + ESLint, enforced in CI.
- Rust: `cargo fmt`, `cargo clippy -- -D warnings`.
- Comments explain *why*, never *what*. If the *what* needs a comment, rename things.

## Reporting bugs

Fidelity bugs get top priority. If Asterism changed a byte you didn't edit,
that's a P0 — include:

- The input file (minimal reproduction)
- The output file
- A diff
- App version and macOS version

## Non-goals

Please check [01 §5](docs/01-vision-and-scope.md) before proposing a feature.
Collaboration, plugins, graph view, mobile, accounts, and AI are deliberately
out of scope for v1. Proposals for v2 are welcome as discussions.

## Licence

By contributing you agree your work is licensed under the MIT licence.
