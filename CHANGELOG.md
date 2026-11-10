# Changelog

## 0.1.0

- Read-only GitKraken-style commit graph for Hermes Desktop: compact right-sidebar pane and a full `/git-gui` page (BRANCH / TAG | GRAPH | COMMIT MESSAGE).
- Commit detail drawer: message, author/committer, parents, changed files (path/tree), per-file unified diff, binary/truncated notices.
- Python read-only backend (`/repo`, `/graph`, `/refs`, `/commit`, `/diff`) with polling via a `refsHash` fingerprint — history re-reads only when refs move.
- Nine locales (en, es, fr, de, ru, ja, zh, zh-hant, ar) with RTL support; theme-aware colors from the Hermes palette.
