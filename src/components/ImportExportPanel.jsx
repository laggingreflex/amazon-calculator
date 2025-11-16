import React from 'react'
import FileUpload from './FileUpload.jsx'
import {
  getAllProducts,
  getAllLists,
  clearAllProducts,
  clearAllLists,
  upsertProducts,
  saveList,
} from '../lib/db.js'
import { parseAmazonTakeoutZipFile, summarizeTakeoutResult, enableTakeoutZipDebug } from '../lib/takeoutZipParser.js'

// Panel to group all import/export related actions (HTML upload, JSON backup/restore, clear cache)
export default function ImportExportPanel({
  onProductsParsed,
  setProducts,
  setLists,
  selectedIds,
  setSelectedIds,
}) {
  const handleClear = async () => {
    const ok = window.confirm('Clear all cached products? This cannot be undone.')
    if (!ok) return
    try {
      await clearAllProducts()
    } catch (_) {
      /* ignore */
    }
    setProducts([])
    setSelectedIds(new Set())
  }

  const handleExport = async () => {
    try {
      const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        products: await getAllProducts(),
        lists: await getAllLists(),
        currentSelection: Array.from(selectedIds),
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const ts = new Date()
      const yyyy = ts.getFullYear()
      const mm = String(ts.getMonth() + 1).padStart(2, '0')
      const dd = String(ts.getDate()).padStart(2, '0')
      a.href = url
      a.download = `amazon-calculator-backup-${yyyy}${mm}${dd}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Failed to export JSON')
    }
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      const text = await file.text()
      try {
        const obj = JSON.parse(text)
        if (!obj || typeof obj !== 'object') throw new Error('Invalid JSON')
        const doReplace = window.confirm(
          'Replace existing products and lists with imported data?\nOK = Replace, Cancel = Merge'
        )
        if (doReplace) {
          try {
            await clearAllProducts()
          } catch (_) {
            // ignore clear error
          }
          try {
            await clearAllLists()
          } catch (_) {
            // ignore clear error
          }
        }
        if (Array.isArray(obj.products) && obj.products.length) {
          await upsertProducts(obj.products)
        }
        if (Array.isArray(obj.lists)) {
          for (const l of obj.lists) {
            if (l && l.name && Array.isArray(l.ids)) {
              await saveList(l.name, l.ids)
            }
          }
        }
        // Reload state
        try {
          const cached = await getAllProducts()
          const withIds = cached
            .map((p) => ({ id: p.asin, ...p }))
            .sort((a, b) => {
              const pa = typeof a.position === 'number' ? a.position : Number.POSITIVE_INFINITY
              const pb = typeof b.position === 'number' ? b.position : Number.POSITIVE_INFINITY
              if (pa !== pb) return pa - pb
              return a.id.localeCompare(b.id)
            })
          setProducts(withIds)
        } catch (_) {
          // ignore reload error
        }
        try {
          const allLists = await getAllLists()
          setLists(allLists)
        } catch (_) {
          // ignore reload error
        }
        if (Array.isArray(obj.currentSelection)) {
          setSelectedIds(new Set(obj.currentSelection))
        }
        alert('Import complete')
      } catch (err) {
        alert('Invalid or unsupported JSON file')
      }
    }
    input.click()
  }

  return (
    <section className="panel" aria-labelledby="importExportHeading" style={{ marginBottom: 16 }}>
      <h2 id="importExportHeading" style={{ margin: '4px 0' }}>Import / Export</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <label style={{ display: 'inline-flex', flexDirection: 'column', fontSize: 12, gap: 4 }}>
          <span style={{ fontWeight: 600 }}>HTML Cart / Saved Items (Recommended)</span>
          <span style={{ maxWidth: 240, lineHeight: '14px' }}>
            Upload the saved Amazon cart HTML page (&quot;Saved for later&quot; capture). Provides titles, prices & images.
          </span>
          <FileUpload onProductsParsed={onProductsParsed} />
        </label>
        <label style={{ display: 'inline-flex', flexDirection: 'column', fontSize: 12 }}>
          <span style={{ fontWeight: 600, marginBottom: 2 }}>Amazon Takeout ZIP</span>
          <span style={{ maxWidth: 240, lineHeight: '14px', marginBottom: 4 }}>
            Privacy export dataset (Retail.CartItems.*). Contains <strong>only ASINs & metadata</strong>. No titles, prices or images are included by Amazon. Use HTML import above to enrich.
          </span>
          <input
            type="file"
            accept=".zip,application/zip"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              // Force-enable debug logs for this parse so user can inspect console output
              enableTakeoutZipDebug(true)
              const products = await parseAmazonTakeoutZipFile(file)
              if (!products.length) {
                alert('No cart items found in ZIP (looked for Retail.CartItems.* files).')
                return
              }
              const summary = summarizeTakeoutResult(products)
              const proceed = window.confirm(
                `Found ${summary.count} items in ZIP. Import now?\nSample:\n` +
                  summary.sample.map((p) => `• ${p.title} (${p.asin})`).join('\n')
              )
              if (!proceed) return
              onProductsParsed(products)
            }}
          />
        </label>
        <button type="button" onClick={handleClear}>Clear Cache</button>
        <button type="button" onClick={handleExport}>Export JSON</button>
        <button type="button" onClick={handleImport}>Import JSON</button>
      </div>
    </section>
  )
}
