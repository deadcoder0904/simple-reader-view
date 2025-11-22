# Simple Reader View

A minimal, one‑click reader overlay for Chrome. It extracts the main article, presents it in a clean theme, and lets you copy or download Markdown with a proper file name.

## Features

- One‑click overlay: toggles on the current page, no navigation.
- Clean view: removes site chrome, ads, and noisy elements.
- Markdown export: copy to clipboard or download as `<Title>.md`.
- Reliable filenames: Blob downloads avoid generic “download”.
- Scroll lock: page behind the overlay doesn’t scroll.
- Theme toggle: Dark and Light via toolbar button.

![Simple Reader View - Light Mode](./simple-reader-view-light-mode.jpg)

![Simple Reader View - Dark Mode](./simple-reader-view-dark-mode.jpg)

## Install

No build step. Load as an unpacked extension:

- Visit `chrome://extensions`
- Enable Developer mode
- Click “Load unpacked” and select this folder

## Usage

- Open any article page and click the toolbar button.
- Use the sun/moon icon to toggle theme (persists per origin).
- “Copy Markdown” copies the article; “Download Markdown” saves a file.
- Press `Esc` or click `×` to close.

## How It Works

- `background.js` injects third-party libs (Readability, Turndown) and the content script on click.
- `content/overlay.js` renders a Shadow‑DOM overlay and generates Markdown via Turndown.
- `offscreen.js` handles clipboard and downloads in an offscreen document.

## Project Structure

- `manifest.json` — MV3 config
- `background.js` — service worker (inject + messaging)
- `content/overlay.js` — overlay UI and logic
- `content/overlay.css` — overlay styles (web‑accessible)
- `offscreen.html` / `offscreen.js` — clipboard/download helpers
- Third‑party libs: `@mozilla/readability` and `turndown` (in `node_modules/`)

## What’s New (Readability Pass)

- Renamed files for clarity: `sw.js` → `background.js`, `content/reader.js` → `content/overlay.js`, `content/reader.css` → `content/overlay.css`.
- Consistent overlay naming: CSS classes and IDs now use `reader-` (e.g., `#reader-root`, `.reader-toolbar`).
- Cleaner keys/flags: `__reader_theme`, `__READER_OPEN__`.
- Added `AGENTS.md` with contributor guidelines.

## Permissions & Privacy

- Permissions: `activeTab`, `scripting`, `downloads`, `offscreen`, `clipboardWrite`.
- Privacy: No data leaves your browser; all parsing happens locally.

## Manual Test Checklist

- Toggle overlay on/off; background page remains locked.
- Theme toggle persists across reloads for the same origin.
- Copy places Markdown on clipboard; download saves `<Title>.md`.
- Works on multiple article sites (news, blogs).

## Packaging (optional)

```bash
zip -r simple-reader.zip . -x "*.git*"
```
