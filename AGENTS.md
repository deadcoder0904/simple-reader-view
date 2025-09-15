# Repository Guidelines

## Project Structure & Module Organization
- `manifest.json` — MV3 config.
- `background.js` — service worker: injects scripts, handles clipboard/download.
- `content/overlay.js` — overlay UI, parsing, Markdown generation.
- `content/overlay.css` — scoped styles for the overlay (Shadow DOM link).
- `offscreen.html` / `offscreen.js` — offscreen doc for clipboard and downloads.
- `vendor/` — third‑party libs: `readability.js`, `turndown.js`.

## Build, Test, and Development Commands
- Build: none. Load as unpacked.
  - Chrome → `chrome://extensions` → Enable Developer Mode → Load unpacked → select repo folder.
- Reload after edits: click Reload on the extension in `chrome://extensions`.
- Package (optional): `zip -r simple-reader.zip . -x "*.git*"`.

## Coding Style & Naming Conventions
- Indentation: 2 spaces; no tabs.
- Filenames: descriptive, kebab/camel as in existing files (`background.js`, `overlay.js`).
- CSS/DOM: prefix overlay selectors with `reader-` (e.g., `.reader-toolbar`, `#reader-root`).
- Keys/flags: use clear names (`__reader_theme`, `__READER_OPEN__`).
- Keep vendor files unmodified; add site tweaks in `overlay.js` only if generic.
- Update all references when renaming (manifest, injection lists, resource paths).

## Testing Guidelines
- No automated tests. Perform manual checks:
  - Toggle overlay on/off; Esc closes and restores page scroll.
  - Theme toggle persists per origin.
  - Copy Markdown places content on clipboard.
  - Download creates `<Title>.md` with content.
  - Works on a few different article sites.

## Commit & Pull Request Guidelines
- Commits: imperative, concise, scoped. Example: `refactor: rename vr-* classes to reader-*`.
- PRs should include:
  - Summary of changes and rationale (what/why, not just how).
  - Before/after screenshot or short screen capture of the overlay.
  - Verification steps (bullet list of manual checks above).

## Security & Configuration Tips
- Keep permissions minimal: `activeTab`, `scripting`, `downloads`, `offscreen`, `clipboardWrite`.
- Avoid network calls and data collection; all processing stays local.
- Shadow DOM and `overlay.css` must remain scoped; do not leak global styles.
