import React, { useEffect, useMemo, useState } from 'react'
import ProductTable from './components/ProductTable.jsx'
import TotalPrice from './components/TotalPrice.jsx'
import ImportExportPanel from './components/ImportExportPanel.jsx'
import ViewOptionsPanel from './components/ViewOptionsPanel.jsx'
import { sortProducts, nextSort } from './lib/sort.js'
import { getAllProducts, upsertProducts, getAllLists } from './lib/db.js'

export default function App() {
  const [products, setProducts] = useState([]) // { asin, title, price, image, id }
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [sortConfig, setSortConfig] = useState({ key: 'position', dir: 'asc' }) // unified state
  const [hideUnselected, setHideUnselected] = useState(false)
  const [lists, setLists] = useState([]) // { name, ids[] }
  const [listNameInput, setListNameInput] = useState('')
  const [selectedListName, setSelectedListName] = useState('')
  const [filterText, setFilterText] = useState('') // product title filter

  const total = useMemo(() => {
    return products.reduce((sum, p) => (selectedIds.has(p.id) ? sum + p.price : sum), 0)
  }, [products, selectedIds])

  // Load cache on mount
  useEffect(() => {
    (async () => {
      try {
        const cached = await getAllProducts()
        // Preserve any previously saved order if available
        const withIds = cached
          .map((p) => ({ id: p.asin, ...p }))
          .sort((a, b) => {
            const pa = typeof a.position === 'number' ? a.position : Number.POSITIVE_INFINITY
            const pb = typeof b.position === 'number' ? b.position : Number.POSITIVE_INFINITY
            if (pa !== pb) return pa - pb
            // Fallback stable-ish tie-breaker (keep original relative if equal)
            return a.id.localeCompare(b.id)
          })
        setProducts(withIds)
      } catch (_) {
        // If IndexedDB unavailable, start with empty list
        setProducts([])
      }
      try {
        const allLists = await getAllLists()
        setLists(allLists)
      } catch (_) {
        setLists([])
      }
    })()
  }, [])

  const handleProductsParsed = async (parsed) => {
    // Attach stable positions to preserve DOM order from the uploaded file
    const parsedWithPosition = parsed.map((p, index) => ({ ...p, position: index }))

    // Immediately reflect uploaded order in-memory (do not let cache reorder it)
    const withIds = parsedWithPosition.map((p) => ({ id: p.asin, ...p }))
    setProducts(withIds)
    setSelectedIds(new Set()) // reset selection on new load

    // Upsert into cache by ASIN (includes position for future sessions)
    try {
      await upsertProducts(parsedWithPosition)
    } catch (_) {
      // ignore cache errors; still update in-memory view
    }
    // Do not reload from cache here to avoid losing the freshly parsed order
  }

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }



  const sortedProducts = useMemo(() => {
    return sortProducts(products, sortConfig)
  }, [products, sortConfig])

  const handleSortChange = (key) => {
    setSortConfig((prev) => nextSort(prev, key))
  }

  // Apply title filter (case-insensitive) after sorting, before hide-unselected
  const filteredProducts = useMemo(() => {
    // Preserve user-entered leading/trailing spaces to allow pseudo word-boundary filtering.
    // Example: " ear" won't match "year" but will match titles containing " ear".
    const raw = filterText.toLowerCase()
    const meaningful = raw.trim()
    if (!meaningful) return sortedProducts // empty or only whitespace -> show all
    return sortedProducts.filter((p) => p.title.toLowerCase().includes(raw))
  }, [sortedProducts, filterText])

  const visibleProducts = useMemo(() => {
    if (!hideUnselected) return filteredProducts
    return filteredProducts.filter((p) => selectedIds.has(p.id))
  }, [filteredProducts, hideUnselected, selectedIds])

  const toggleAllVisible = (checked) => {
    if (checked) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        visibleProducts.forEach((p) => next.add(p.id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        visibleProducts.forEach((p) => next.delete(p.id))
        return next
      })
    }
  }

  return (
    <div className="container">
      <header style={{ marginBottom: 16 }}>
        <h1>Amazon Calculator</h1>
        <p>Upload your Amazon Saved-for-later HTML and select items to total.</p>
        <ImportExportPanel
          onProductsParsed={handleProductsParsed}
          setProducts={setProducts}
          setLists={setLists}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
        />
        <ViewOptionsPanel
          hideUnselected={hideUnselected}
          setHideUnselected={setHideUnselected}
          filterText={filterText}
          setFilterText={setFilterText}
          lists={lists}
          setLists={setLists}
          listNameInput={listNameInput}
          setListNameInput={setListNameInput}
          selectedListName={selectedListName}
          setSelectedListName={setSelectedListName}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
        />
      </header>

      {/* Sticky total bar */}
      <TotalPrice
        total={total}
        selectedCount={selectedIds.size}
        // Denominator reflects the number of items currently visible after filter + hide logic
        totalCount={visibleProducts.length}
      />

      <div className="layout">
        <ProductTable
          products={visibleProducts}
          selectedIds={selectedIds}
          onToggleOne={toggleOne}
          onToggleAll={toggleAllVisible}
          sortKey={sortConfig.key}
          sortDir={sortConfig.dir}
          onSortChange={handleSortChange}
        />
      </div>
    </div>
  )
}
