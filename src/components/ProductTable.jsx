import React, { useEffect, useRef } from 'react'

export default function ProductTable({
  products,
  selectedIds,
  onToggleOne,
  onToggleAll,
  sortKey = 'position',
  sortDir = 'asc',
  onSortChange,
}) {
  const allChecked = products.length > 0 && selectedIds.size === products.length
  const someChecked = selectedIds.size > 0 && !allChecked

  const selectAllRef = useRef(null)
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someChecked
    }
  }, [someChecked])

  return (
    <div className="product-list">
      <h3>Saved for Later Items</h3>
      <table>
        <thead>
          <tr>
            <th
              role="button"
              tabIndex={0}
              onClick={() => onSortChange && onSortChange('position')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSortChange && onSortChange('position')
                }
              }}
              aria-sort={sortKey === 'position' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
              style={{ cursor: 'pointer', userSelect: 'none' }}
              title="Sort by original order"
            >
              # {sortKey === 'position' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th>
              Select
              <div>
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allChecked}
                  onChange={(e) => onToggleAll(e.target.checked)}
                  aria-label="Select all"
                />
              </div>
            </th>
            <th>Image</th>
            <th
              role="button"
              tabIndex={0}
              onClick={() => onSortChange && onSortChange('title')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSortChange && onSortChange('title')
                }
              }}
              aria-sort={sortKey === 'title' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
              style={{ cursor: 'pointer', userSelect: 'none' }}
              title="Sort by title"
            >
              Product Title {sortKey === 'title' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th
              role="button"
              tabIndex={0}
              onClick={() => onSortChange && onSortChange('price')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSortChange && onSortChange('price')
                }
              }}
              aria-sort={sortKey === 'price' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
              style={{ cursor: 'pointer', userSelect: 'none' }}
              title="Sort by price"
            >
              Price {sortKey === 'price' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
            </th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ opacity: 0.7 }}>
                No items loaded yet.
              </td>
            </tr>
          ) : (
            products.map((product, index) => {
              const asinOnly = product.title === product.asin && product.price === 0 && !product.image
              return (
              <tr
                key={product.id}
                onClick={() => onToggleOne(product.id)}
                style={{ cursor: 'pointer', background: asinOnly ? 'rgba(255,165,0,0.08)' : undefined }}
                className={asinOnly ? 'asin-only-row' : undefined}
              >
                <td>
                  {typeof product.position === 'number' ? product.position + 1 : index + 1}
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(product.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => onToggleOne(product.id)}
                    aria-label={`Select ${product.title}`}
                  />
                </td>
                <td>
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.title}
                      style={{ maxWidth: 100, maxHeight: 100 }}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        // Swap to a lightweight placeholder to stop perpetual loading spinner
                        e.currentTarget.onerror = null
                        e.currentTarget.src =
                          'data:image/svg+xml;utf8,' +
                          encodeURIComponent(
                            `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="#f0f0f0"/><text x="50" y="52" text-anchor="middle" font-size="10" fill="#888">no image</text></svg>`
                          )
                      }}
                    />
                  ) : (
                    <span style={{ opacity: 0.6 }}>(no image)</span>
                  )}
                </td>
                <td>
                  {product.title}
                  {asinOnly && (
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: 11,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: '#ffa50022',
                        color: '#a35f00',
                        fontWeight: 600,
                      }}
                      title="ASIN-only placeholder from Amazon Takeout ZIP; upload HTML to enrich"
                    >ASIN-only</span>
                  )}
                </td>
                <td>
                  {product.price > 0 ? (
                    `${product.price.toFixed(2)}`
                  ) : (
                    <span style={{ opacity: 0.6 }}>—</span>
                  )}
                </td>
              </tr>
            )})
          )}
        </tbody>
      </table>
    </div>
  )
}
