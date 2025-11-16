# VS Code Copilot Instructions
## Project Overview
React + Vite app to total prices from an Amazon “Saved for later” HTML export. Everything runs locally in the browser; products and named lists are cached in IndexedDB by ASIN.

#### Tech stack
- Vite (bundler/dev server)
- React 18 (functional components, hooks)
- Plain JavaScript modules (no TypeScript) with ESLint + Prettier
- IndexedDB for persistence (via small helper in `src/lib/db.js`)
- JSZip for Amazon Takeout ZIP parsing

#### Key features
- Upload saved Amazon HTML (.html/.htm) and parse title, price, image
- Select items and see a running total (2 decimal formatting)
- Sort by original order, title, or price (toggle asc/desc on header click)
- Filter by title, hide unselected items, “Select All” for the visible list
- Named lists: save/load/delete current selections (persisted in IndexedDB)
- Export/import full dataset as JSON (products, lists, current selection)
- Import Amazon Takeout ZIP (scans Retail.CartItems.* JSON/CSV/TXT and adds ASINs)

#### Data sources and caveats
- HTML upload (recommended): rich data (title, price, image). Produces the best UX.
- Amazon Takeout ZIP: metadata only (ASIN and flags). No titles/prices/images from Amazon. Items imported from ZIP show as placeholders (title=ASIN, price=0, no image) until enriched by an HTML upload.
- Enrichment workflow: 1) Import ZIP for coverage; 2) Upload one or more saved cart HTML files to fill gaps.

#### Getting started
- Prereqs: Node.js and npm
- Dev server (default port 4345): `npm install` then `npm run dev`
- Build: `npm run build`
- Tests: `npm test` (runs Node scripts in `src/lib/*.test.js`)

#### Privacy
- 100% client-side. Uploaded files never leave the browser.

### Root Folders
- `index.html` — Vite HTML entry
- `vite.config.js` — Vite config (React plugin)
- `package.json` — scripts, deps; notable scripts: `dev`, `build`, `preview`, `lint`, `format`, `test`
- `README.md` — user-facing overview (mirrored here for Copilot context)
- `Docs/Architecture.md` — legacy architecture notes (superseded by this file)
- `public/` — static assets (if any)
- `src/` — application source
	- `main.jsx` — React entry point
	- `App.jsx` — root composition, state, sorting/filtering, wiring
	- `styles.css` — basic styles (including sticky total bar)
	- `components/` — UI building blocks (upload, table, panels, total)
	- `lib/` — small utilities (IndexedDB, sorting, Amazon Takeout ZIP parser + tests)

### Core Architecture (`src/` folder)

#### Component model
- `App.jsx`
	- Owns state: `products`, `selectedIds` (Set), `sortConfig` ({key,dir}), `hideUnselected`, title `filterText`, and named `lists` with selection helpers.
	- Loads cached products and lists from IndexedDB on mount; preserves user order with a `position` field when available.
	- Computes `total` from `selectedIds` and renders the layout: panels, sticky total bar, and `ProductTable`.
	- Handles “select all visible” and sorting via `sortProducts`/`nextSort`.
- `components/ImportExportPanel.jsx`
	- Groups import/export actions: HTML upload (via `FileUpload`), Amazon Takeout ZIP import (JSZip-based), clear cache, export/import JSON backup.
	- After JSON import or clears, reloads products/lists from IndexedDB and rehydrates selection if present.
- `components/FileUpload.jsx`
	- Renders `<input type="file" accept=".html,.htm">`, reads file as text, parses DOM in-browser, and returns `[{ asin, title, price, image }]`.
	- Note: `parseHTMLFile` currently lives inside this component for simplicity (not in `src/lib/parse.js`).
- `components/ViewOptionsPanel.jsx`
	- View controls: hide unselected toggle, title filter input with quick clear, and named list save/apply/delete using `src/lib/db.js` helpers.
- `components/ProductTable.jsx`
	- Displays items with columns: `#` (original order), Select (checkbox + header select-all), Image, Title, Price.
	- Header clicks update sort key/dir; select-all supports indeterminate state; rows are clickable to toggle selection.
	- ASIN-only rows (from ZIP) are highlighted lightly and show an “ASIN-only” badge.
- `components/TotalPrice.jsx`
	- Sticky total bar showing `selected/visible` count and `total.toFixed(2)`.

#### Domain model
Product shape used throughout the UI and persistence:
- `asin: string` — unique key; also used as stable `id`
- `title: string`
- `price: number` — numeric value (currency symbols/commas stripped)
- `image?: string` — image URL if available
- `position?: number` — upload order index to preserve original ordering

#### Parsing HTML (Saved-for-later/Cart)
- Container: `div[data-asin]`
- Title selectors: prefer `a.sc-product-link.sc-product-title`, then `.sc-product-title`, then truncated variants
- Price selectors: `.a-price .a-offscreen` (fall back to `data-price` attribute; final fallback `0`)
- Image extraction: robust fallbacks (src, data-savepage-src, srcset, data-a-dynamic-image), ignore spinner assets, normalize protocol-relative URLs
- Skips items without both `asin` and title

#### Sorting, filtering, selection
- Sorting via `src/lib/sort.js`:
	- `sortProducts(products, { key, dir })` where key ∈ `position|title|price`, dir ∈ `asc|desc`
	- Edge cases: missing `position` treated as +∞, missing `price` as 0; stable tie-breaker by `id`
	- `nextSort(prev, clickedKey)` toggles dir when the same key is clicked, else resets to `asc`
- Filtering: case-insensitive title substring; preserves leading spaces to simulate word-boundary filtering.
- Selection: `selectedIds: Set<string>`; “Select All” operates on the current visible (sorted+filtered+hide) subset.

#### Persistence (IndexedDB)
- Store: `products` (keyPath: `asin`) and `lists` (keyPath: `name`) in DB `amazon-calculator-db` v2.
- API in `src/lib/db.js`:
	- `getAllProducts()`, `upsertProducts(products[])`, `clearAllProducts()`
	- `getAllLists()`, `saveList(name, ids)`, `deleteList(name)`, `clearAllLists()`
- On upload, `App` adds a `position` and upserts, but keeps the freshly parsed order in-memory to avoid reordering.

#### Amazon Takeout ZIP parser
- `src/lib/takeoutZipParser.js` (uses JSZip)
	- Scans ZIP entries for paths containing `Retail.CartItems` or `CartItems` (case-insensitive)
	- Supports JSON, NDJSON/JSONL, CSV, TXT heuristics with flexible key mapping for `asin|title|price`
	- Price coercion strips currency symbols and commas
	- Returns ASIN-unique list; `image` empty; `title` may fallback to ASIN if absent in CSV
	- `enableTakeoutZipDebug(true)` turns on verbose console logging
	- Tests in `src/lib/takeoutZipParser.test.js`

### Finding Related Code
- App wiring and state: `src/App.jsx`
- Upload & HTML parsing: `src/components/FileUpload.jsx` (inline `parseHTMLFile`)
- Amazon Takeout ZIP: `src/lib/takeoutZipParser.js` (imported via `ImportExportPanel.jsx`)
- Sorting: `src/lib/sort.js` (used by `App.jsx` and `ProductTable.jsx`)
- Persistence: `src/lib/db.js` (used by `App.jsx`, `ImportExportPanel.jsx`, `ViewOptionsPanel.jsx`)
- Table & selection UX: `src/components/ProductTable.jsx`
- Named lists and view controls: `src/components/ViewOptionsPanel.jsx`
- Sticky total bar: `src/components/TotalPrice.jsx`

#### Conventions and tips for changes
- Prefer pure helpers in `src/lib/*` with small, focused APIs and light tests (`npm test`).
- When adding new product fields, update: parsing, `ProductTable` columns, JSON export/import, and persistence schema if needed (bump `DB_VERSION`).
- Keep UI deterministic: preserve `position` for original order; use stable tie-breakers (`id`) in sorts.
- For parsing, be resilient to DOM variations; add fallbacks rather than failing silently. Avoid blocking the UI on very large files.
- All features must continue to work offline in the browser; do not introduce server calls.

#### Quick scripts
- Dev: `npm run dev`
- Build: `npm run build`
- Lint/format: `npm run lint` / `npm run format`
- Tests: `npm test` (executes Node-based tests in `src/lib`)
