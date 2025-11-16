import React from 'react'

// Props
// - total: number (sum of selected items)
// - selectedCount: number (how many items selected)
// - totalCount: number (how many items available)
export default function TotalPrice({ total, selectedCount = 0, totalCount = 0 }) {
  return (
    <div className="total-price" role="status" aria-live="polite">
      <div className="total-price__row">
        <h3 className="total-price__title">Total</h3>
        <div className="total-price__counts" title="Selected / Total items">
          {selectedCount}/{totalCount}
        </div>
        <div id="totalPrice" className="total-price__value">{total.toFixed(2)}</div>
      </div>
    </div>
  )
}
