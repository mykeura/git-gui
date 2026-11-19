# Changelog

## 0.1.2

- git subprocesses now receive a minimal allowlisted environment (no inherited API keys); diffs disable external diff/textconv helpers.

## 0.1.1

- Fixed: the page and pane crashed with "Cannot read properties of null (reading 'scrollTop')" while scrolling or loading more history.
- Fixed: the list now measures its real height (it was stuck at 600px).
- Fixed: the column resizers no longer error on mouse release and no longer select text.
- Docs: rewritten user README with screenshots.
- Dev: demo-repo + screenshot scripts, smoke harness.
- Fixed: branches created one after another no longer share the same color.

## 0.1.0

- Read-only lane-based commit graph for Hermes Desktop: compact right-sidebar pane and a full `/git-gui` page (BRANCH / TAG | GRAPH | COMMIT MESSAGE).
- Commit detail drawer: message, author/committer, parents, changed files (path/tree), per-file unified diff, binary/truncated notices.
- Python read-only backend (`/repo`, `/graph`, `/refs`, `/commit`, `/diff`) with polling via a `refsHash` fingerprint — history re-reads only when refs move.
- Nine locales (en, es, fr, de, ru, ja, zh, zh-hant, ar) with RTL support; theme-aware colors from the Hermes palette.
