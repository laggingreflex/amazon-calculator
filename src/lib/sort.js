// Generic product sorting utility
// Contract:
//  - products: array of { id, title, price, position? }
//  - config: { key: 'position' | 'title' | 'price', dir: 'asc' | 'desc' }
//  - Returns new sorted array (does not mutate input)
// Edge cases handled:
//  - Missing numeric fields treated as +Infinity for position, 0 for price
//  - Stable tie-breaking by id to ensure deterministic output
//  - Direction toggle simply reverses comparator multiplier
export function sortProducts(products, config) {
  const { key, dir } = config
  const mult = dir === 'asc' ? 1 : -1
  return [...products].sort((a, b) => {
    if (key === 'title') {
      const cmp = a.title.localeCompare(b.title)
      if (cmp !== 0) return cmp * mult
      return a.id.localeCompare(b.id) * mult
    }
    if (key === 'price') {
      const av = typeof a.price === 'number' ? a.price : 0
      const bv = typeof b.price === 'number' ? b.price : 0
      if (av !== bv) return (av - bv) * mult
      return a.id.localeCompare(b.id) * mult
    }
    // position (default)
    const ap = typeof a.position === 'number' ? a.position : Number.POSITIVE_INFINITY
    const bp = typeof b.position === 'number' ? b.position : Number.POSITIVE_INFINITY
    if (ap !== bp) return (ap - bp) * mult
    return a.id.localeCompare(b.id) * mult
  })
}

// Helper to toggle direction given previous key + dir
export function nextSort(prev, clickedKey) {
  if (prev.key === clickedKey) {
    return { key: prev.key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
  }
  return { key: clickedKey, dir: 'asc' }
}