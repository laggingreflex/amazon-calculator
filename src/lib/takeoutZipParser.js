// Parser for Amazon Takeout ZIP exports (client-side)
// Provides flexible extraction of cart items from directories named Retail.CartItems.*
// Exports two functions:
//  - parseAmazonTakeoutZipFile(file: File|Blob): Promise<Product[]>
//  - parseAmazonTakeoutZipFromJSZip(zip: JSZip): Promise<Product[]>
// Product shape: { asin: string, title: string, price: number, image: string }
// (image left blank; takeout does not include images typically)

import JSZip from 'jszip'

// Debug control (verbose logging). Enable by calling enableTakeoutZipDebug(true) or setting localStorage key 'zipDebug' to '1'.
let DEBUG = false
try {
  if (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('zipDebug') === '1') {
    DEBUG = true
  }
} catch (_) {
  // ignore storage access issues
}

export function enableTakeoutZipDebug(on = true) {
  DEBUG = !!on
  if (DEBUG) console.debug('[takeoutZipParser] Debug logging ENABLED')
  else console.debug('[takeoutZipParser] Debug logging DISABLED')
}

// Heuristic candidate key sets for fields across potential JSON structures
const TITLE_KEYS = ['title', 'productTitle', 'itemTitle', 'product_name', 'name']
const PRICE_KEYS = ['price', 'itemPrice', 'priceAmount', 'price_value', 'amount', 'unitPrice']
const ASIN_KEYS = ['asin', 'ASIN', 'itemAsin', 'productAsin']

function coercePrice(val) {
  if (val == null) return 0
  if (typeof val === 'number') return isFinite(val) ? val : 0
  const s = String(val).trim()
  // Remove currency symbols and thousand separators (USD, INR, EUR, etc.)
  const cleaned = s.replace(/[$£€₹,]/g, '')
  const num = parseFloat(cleaned)
  return Number.isFinite(num) ? num : 0
}

function pick(obj, keys) {
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null) {
      return obj[k]
    }
  }
  return undefined
}

function normalizeOne(raw) {
  if (!raw || typeof raw !== 'object') return null
  // Flatten common nesting
  if (raw.item && typeof raw.item === 'object') raw = { ...raw, ...raw.item }
  if (raw.product && typeof raw.product === 'object') raw = { ...raw, ...raw.product }
  const asin = pick(raw, ASIN_KEYS)
  const title = pick(raw, TITLE_KEYS)
  let priceVal = pick(raw, PRICE_KEYS)
  const price = coercePrice(priceVal)
  if (!asin || !title) return null
  return { asin: String(asin).trim(), title: String(title).trim(), price, image: '' }
}

async function parseJSONCart(text) {
  try {
    // Try standard JSON parse first
    const data = JSON.parse(text)
    let arr = []
    if (Array.isArray(data)) arr = data
    else if (data && typeof data === 'object') {
      // Look for array-like properties
      const firstArrayProp = Object.values(data).find((v) => Array.isArray(v))
      if (Array.isArray(firstArrayProp)) arr = firstArrayProp
      else arr = [data]
    }
    const out = []
    for (const item of arr) {
      const norm = normalizeOne(item)
      if (norm) out.push(norm)
    }
    if (DEBUG) console.debug('[takeoutZipParser.parseJSONCart] Parsed standard JSON items:', out.length)
    return out
  } catch (_) {
    // Fallback: NDJSON (newline-delimited objects)
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.startsWith('{') && l.endsWith('}'))
    const out = []
    for (const line of lines) {
      try {
        const obj = JSON.parse(line)
        const norm = normalizeOne(obj)
        if (norm) out.push(norm)
      } catch (_) {
        // ignore individual malformed lines
      }
    }
    if (DEBUG) console.debug('[takeoutZipParser.parseJSONCart] Parsed NDJSON items:', out.length)
    return out
  }
}

function parseCSVCart(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length)
  if (!lines.length) return []
  const header = lines[0]
    .split(',')
    .map((h) => h.trim().replace(/^\ufeff/, '').replace(/^"|"$/g, ''))
  const idx = {
    asin: header.findIndex((h) => /asin/i.test(h)),
    title: header.findIndex((h) => /(title|name|product)/i.test(h)),
    price: header.findIndex((h) => /(price|amount|unit)/i.test(h)),
  }
  const out = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
    const asin = idx.asin >= 0 ? cols[idx.asin] || '' : ''
    let title = idx.title >= 0 ? cols[idx.title] || '' : ''
    const priceRaw = idx.price >= 0 ? cols[idx.price] || '' : ''
    if (!asin) continue
    // Fallback: if no title column present, use ASIN as placeholder
    if (!title) title = asin
    out.push({ asin: asin.trim(), title: title.trim(), price: coercePrice(priceRaw), image: '' })
  }
  if (DEBUG) console.debug('[takeoutZipParser.parseCSVCart] Parsed CSV items:', out.length, 'header:', header)
  return out
}

function uniqueByASIN(products) {
  const map = new Map()
  for (const p of products) {
    if (!map.has(p.asin)) map.set(p.asin, p)
  }
  if (DEBUG) console.debug('[takeoutZipParser.uniqueByASIN] before:', products.length, 'after:', map.size)
  return Array.from(map.values())
}

export async function parseAmazonTakeoutZipFromJSZip(zip) {
  // Broaden matching: any file whose full path contains 'Retail.CartItems' or 'CartItems' (case-insensitive)
  const fileNames = Object.keys(zip.files)
  if (DEBUG) console.debug('[takeoutZipParser.parseAmazonTakeoutZipFromJSZip] total entries:', fileNames.length)
  if (DEBUG) console.debug('[takeoutZipParser.parseAmazonTakeoutZipFromJSZip] first 50 names:', fileNames.slice(0, 50))
  const candidates = fileNames.filter((name) => {
    const lower = name.toLowerCase()
    return !zip.files[name].dir && (lower.includes('retail.cartitems') || /cartitems/i.test(lower))
  })
  if (DEBUG) console.debug('[takeoutZipParser.parseAmazonTakeoutZipFromJSZip] candidate paths:', candidates)
  const all = []
  for (const name of candidates) {
    const fileObj = zip.files[name]
    let content = ''
    try {
      content = await fileObj.async('string')
    } catch (_) {
      if (DEBUG) console.debug('[takeoutZipParser.parseAmazonTakeoutZipFromJSZip] failed to read file:', name)
      continue
    }
    if (DEBUG) console.debug('[takeoutZipParser.parseAmazonTakeoutZipFromJSZip] reading file:', name, 'size(chars):', content.length)
    let parsed = []
    if (/\.(json|jsonl|ndjson)$/i.test(name)) {
      parsed = await parseJSONCart(content)
    } else if (/\.csv$/i.test(name)) {
      parsed = parseCSVCart(content)
    } else if (/\.txt$/i.test(name)) {
      // Try JSON then NDJSON then CSV heuristics
      parsed = await parseJSONCart(content)
      if (!parsed.length) parsed = parseJSONCart(content.split(/\r?\n/).join('\n'))
      if (!parsed.length) parsed = parseCSVCart(content)
    } else {
      // Generic attempt
      parsed = await parseJSONCart(content)
      if (!parsed.length) parsed = parseCSVCart(content)
    }
    if (DEBUG) console.debug('[takeoutZipParser.parseAmazonTakeoutZipFromJSZip] parsed items from', name, ':', parsed.length)
    all.push(...parsed)
  }
  if (DEBUG) console.debug('[takeoutZipParser.parseAmazonTakeoutZipFromJSZip] total parsed (pre-dedupe):', all.length)
  return uniqueByASIN(all)
}

export async function parseAmazonTakeoutZipFile(file) {
  if (!file) return []
  // Basic safety: huge zips may exhaust memory in browser
  if (file.size > 1.2 * 1024 * 1024 * 1024) {
    alert('ZIP too large to process in browser ( >1.2GB ).')
    return []
  }
  try {
    if (DEBUG) console.debug('[takeoutZipParser.parseAmazonTakeoutZipFile] starting parse for file:', file.name, 'size(bytes):', file.size)
    const buf = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(buf, { createFolders: false })
    if (DEBUG) console.debug('[takeoutZipParser.parseAmazonTakeoutZipFile] ZIP loaded')
    const products = await parseAmazonTakeoutZipFromJSZip(zip)
    if (!products.length) {
      // Provide diagnostic info: list candidate file paths so user can verify naming
      const fileNames = Object.keys(zip.files).filter((n) => !zip.files[n].dir)
      const cartCandidates = fileNames.filter((n) => /cartitems/i.test(n))
      if (cartCandidates.length) {
        console.warn('Cart candidate files inspected but yielded no products:', cartCandidates)
      } else {
        console.warn('No files containing "CartItems" substring found in ZIP.')
      }
    }
    if (DEBUG) console.debug('[takeoutZipParser.parseAmazonTakeoutZipFile] final product count:', products.length)
    return products
  } catch (e) {
    console.error('Failed to parse takeout ZIP', e)
    return []
  }
}

// Simple validator usable by UI
export function summarizeTakeoutResult(products) {
  return {
    count: products.length,
    sample: products.slice(0, 3),
  }
}
