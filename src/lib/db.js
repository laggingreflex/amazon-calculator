// Simple IndexedDB wrapper for per-ASIN product caching
// Store name: 'products', keyPath: 'asin'

const DB_NAME = 'amazon-calculator-db'
const DB_VERSION = 2
const STORE_PRODUCTS = 'products'
const STORE_LISTS = 'lists'

let __dbPromise = null

export function openDB() {
  if (__dbPromise) return __dbPromise
  __dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
        db.createObjectStore(STORE_PRODUCTS, { keyPath: 'asin' })
      }
      if (!db.objectStoreNames.contains(STORE_LISTS)) {
        db.createObjectStore(STORE_LISTS, { keyPath: 'name' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return __dbPromise
}

export async function getAllProducts() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PRODUCTS, 'readonly')
    const store = tx.objectStore(STORE_PRODUCTS)
    if ('getAll' in store) {
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => reject(req.error)
    } else {
      const out = []
      const cursorReq = store.openCursor()
      cursorReq.onsuccess = (e) => {
        const cursor = e.target.result
        if (cursor) {
          out.push(cursor.value)
          cursor.continue()
        } else {
          resolve(out)
        }
      }
      cursorReq.onerror = () => reject(cursorReq.error)
    }
  })
}

export async function upsertProducts(products) {
  if (!Array.isArray(products) || products.length === 0) return
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PRODUCTS, 'readwrite')
    const store = tx.objectStore(STORE_PRODUCTS)
    products.forEach((p) => {
      try {
        if (p && p.asin) store.put(p)
      } catch (_) {
        // ignore individual failures
      }
    })
    tx.oncomplete = () => resolve(true)
    tx.onerror = () => reject(tx.error)
  })
}

export async function clearAllProducts() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PRODUCTS, 'readwrite')
    const store = tx.objectStore(STORE_PRODUCTS)
    const req = store.clear()
    req.onsuccess = () => resolve(true)
    req.onerror = () => reject(req.error)
  })
}

// Named selection lists API
export async function getAllLists() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_LISTS, 'readonly')
    const store = tx.objectStore(STORE_LISTS)
    if ('getAll' in store) {
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => reject(req.error)
    } else {
      const out = []
      const cursorReq = store.openCursor()
      cursorReq.onsuccess = (e) => {
        const cursor = e.target.result
        if (cursor) {
          out.push(cursor.value)
          cursor.continue()
        } else {
          resolve(out)
        }
      }
      cursorReq.onerror = () => reject(cursorReq.error)
    }
  })
}

export async function saveList(name, ids) {
  if (!name || !Array.isArray(ids)) return
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_LISTS, 'readwrite')
    const store = tx.objectStore(STORE_LISTS)
    try {
      store.put({ name, ids })
    } catch (e) {
      reject(e)
      return
    }
    tx.oncomplete = () => resolve(true)
    tx.onerror = () => reject(tx.error)
  })
}

export async function deleteList(name) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_LISTS, 'readwrite')
    const store = tx.objectStore(STORE_LISTS)
    const req = store.delete(name)
    req.onsuccess = () => resolve(true)
    req.onerror = () => reject(req.error)
  })
}

export async function clearAllLists() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_LISTS, 'readwrite')
    const store = tx.objectStore(STORE_LISTS)
    const req = store.clear()
    req.onsuccess = () => resolve(true)
    req.onerror = () => reject(req.error)
  })
}
