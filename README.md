# Amazon Calculator

React + Vite app to total the prices of selected items from an Amazon “Saved for later” HTML export. Everything runs locally in your browser—no data is uploaded anywhere.

Products are cached in IndexedDB (by ASIN) so your items persist across sessions. You can clear the cache at any time from the app header.

## Features

- Upload a downloaded Amazon HTML file (supports .html and .htm)
- In-browser parsing of product title, price, and image
- Select items to include; running total updates automatically
- Sort by original order, title, or price (click table headers to toggle asc/desc)
- Hide unselected items toggle
- Save current selection into named lists; reapply or delete lists later (persisted in IndexedDB)
- Export/import full dataset as JSON (products, named lists, and current selection)
- “Select All” on the visible list and a friendly empty state
- Import Amazon Takeout ZIP (scans for `Retail.CartItems.*` JSON/CSV files and adds items)

## Data Source Caveats

### HTML Cart / Saved Items Upload (Recommended)
When you save the Amazon cart or "Saved for later" page as HTML and upload it here, the parser can extract:
- Product title
- Price (localized currency symbols are normalized)
- Image URL

This yields the richest dataset and allows meaningful selection & totaling.

### Amazon Takeout ZIP
The privacy export dataset (`Retail.CartItems.*`) only contains metadata about items in your cart (ASIN, dates, flags like `OneClickBuyable`). It does **not** include product titles, prices, or images. Importing the ZIP alone will therefore show placeholder rows (title defaults to ASIN, price=0, no image). Use the HTML upload to enrich those ASIN-only entries.

### Enrichment Workflow
1. Import the Amazon Takeout ZIP (optional) to get a complete list of ASINs.
2. Upload one or more saved cart HTML files to fill in missing titles, prices, and images for matching ASINs.
3. (Future idea) Provide a manual edit or external JSON mapping to fill remaining gaps.


## Getting started

Prereqs: Node.js and npm

Install dependencies and start the dev server:

```cmd
npm install
npm run dev
```

Build for production:

```cmd
npm run build
```

## Project structure

- `index.html` — Vite entry
- `src/main.jsx` — React entry
- `src/App.jsx` — App composition, state, and controls
- `src/components/*` — File upload, product table, total bar
- `src/lib/db.js` — IndexedDB helpers for products and named lists
- `Docs/Architecture.md` — Technical architecture notes

## Privacy

- Everything runs locally in your browser. The uploaded file isn’t sent to any server.

## Architecture

For a technical deep-dive (React/Vite architecture and legacy implementation), see `Docs/Architecture.md`.


---

/Vibe-crafted 🤖❤️
