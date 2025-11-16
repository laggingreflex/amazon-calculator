# Architecture

### Tech stack
- Vite (bundler/dev server)
- React + JSX (functional components, hooks)
- Plain JavaScript (no TypeScript for now, but types noted below)

### High-level component model
- `App`
  - Owns application state (products, selected ids, loading/error, select-all state).
  - Renders `HeaderTotal`, `FileUpload`, `ProductTable`.
- `FileUpload`
  - Renders `<input type="file" accept=".html,.htm">`.
  - On file select, reads file with `FileReader`, calls `parseHTMLFile` and passes parsed products up (`onProducts` prop).
- `ProductTable`
  - Props: `products`, `selected`, `onToggle(id)`, `onToggleAll(isChecked)`.
  - Renders a table with: Index, Select (checkbox), Image, Title, Price.
  - Includes a header-level "Select All" checkbox that reflects all/none/some (indeterminate) states.
- `HeaderTotal`
  - Props: `total` (computed by parent from `selected`).
  - Renders the formatted total.

### Domain model
- `Product` (JS doc-style or TypeScript-like shape):
  - `asin: string` — unique key from `data-asin` (also used as `id` in UI)
  - `title: string`
  - `price: number` — numeric value
  - `image?: string` — optional image URL

### Parsing
- `parseHTMLFile(html: string): Product[]`
  - Use `DOMParser` to parse the HTML string to a `Document`.
  - Query product containers with selectors compatible with Amazon Saved-for-later pages:
    - Container: `div[data-asin]`
    - Title: `.sc-product-title`
    - Price: `.sc-item-price-block .a-price .a-offscreen`
    - Image: `.sc-product-image`
  - Clean price by removing units and commas, then `parseFloat`.
  - Build `Product` objects with a stable `id` (prefer `data-asin`, fallback to a generated id).

### State and data flow
1. User selects a file in `FileUpload`.
2. `FileUpload` reads as text and calls `parseHTMLFile`, then invokes `onProducts(products)`.
3. `App` upserts products into IndexedDB by `asin` and reloads the full cached list; resets `selected`.
4. On app start, `App` loads all cached products from IndexedDB.
5. User checks/unchecks items in `ProductTable`.
6. `ProductTable` calls `onToggle(id)`; `App` updates `selected` and recomputes `total`.
7. `HeaderTotal` displays `total` with `toFixed(2)` formatting.

### Formatting and UX
- Show item prices and total with 2 decimals for consistency (e.g., `$1,234.50`).
- Accept `.html` and `.htm` files in the file input.
- Display an empty-state message when no products are parsed.
- Keep table headers aligned with row content: `#`, `Select`, `Image`, `Title`, `Price`.
- "Select All" checkbox supports indeterminate state when some (but not all) are selected.

### Error handling and edge cases
- No or invalid file: ignore gracefully; show helper text.
- Parse errors: catch and show a friendly message.
- No matching selectors: show empty-state guidance (e.g., "No items found—did you export the Saved for later page?").
- Missing price: skip item or treat as 0 (preferred: skip to avoid misleading totals).
- Large files: parsing is synchronous in-browser; for very large inputs, consider yielding UI with a small spinner.

### Folder structure (planned)
- `/index.html` — Vite entry
- `/src/main.jsx` — React entry
- `/src/App.jsx` — Composition/root state
- `/src/components/FileUpload.jsx`
- `/src/components/ProductTable.jsx`
- `/src/components/HeaderTotal.jsx`
- `/src/lib/db.js` — IndexedDB helper (per-ASIN upsert, getAll)
- `/src/lib/parse.js` — `parseHTMLFile`
- `/src/styles/*.css` (or CSS modules)

### Build and run (planned)
- `npm install`
- `npm run dev` — start dev server
- `npm run build` — production build

---

## Legacy Architecture (Vanilla JavaScript)

### Files
- `.old/amazon-calculator.html` — Contains a file input, total display, and a table with `<tbody id="productTable">`.
- `.old/amazon-calculator.css` — Basic layout and table styling.
- `.old/amazon-calculator.js` — Handles file reading, HTML parsing, DOM rendering, and total calculation.

### Flow
1. The user chooses a `.html` file via `<input type="file" id="fileInput" accept=".html">`.
2. `FileReader.readAsText` reads the file; `DOMParser` parses it into a document.
3. The script selects `div[data-asin]` containers and extracts:
   - Title from `.sc-product-title`
   - Price from `.sc-item-price-block .a-price .a-offscreen` (strips `$` and commas, `parseFloat`)
   - Image from `.sc-product-image` (if present)
4. It iterates the parsed products and builds table rows as HTML strings, injecting them into `#productTable`.
5. A delegated `change` listener watches `.product-checkbox` inputs; on change, it sums `data-price` attributes of checked boxes and updates `#totalPrice` with `{total.toFixed(2)}`.

### Characteristics and limitations
- Manual DOM manipulation via `innerHTML` and event delegation.
- Table header vs row mismatch:
  - Headers: `#`, `Select`, `Product Title`, `Price`.
  - Rows: `Select`, `Image`, `Price`, `Title` (no `#` column, includes `Image` without a header).
- Inconsistent formatting:
  - Item prices displayed with 0 decimals, total shows 2 decimals.
- Input restricts to `.html` only (not `.htm`).
- Parsing depends on current Amazon classes/structure; if it changes, parsing may fail silently.
- Minimal error handling; no empty-state messaging.

### Mapping to the new model
- `parseHTMLFile` is preserved but moved to `/src/lib/parse.js` and adjusted to return typed `Product` objects with stable `id`s.
- DOM event listeners and `innerHTML` are replaced by React state and declarative rendering.
- Calculation moves from querying checked checkboxes to deriving total from React state (`selected` set) and `products`.
- UI concerns split into dedicated components for readability and testability.
