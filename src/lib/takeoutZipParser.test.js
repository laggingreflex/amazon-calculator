import assert from 'assert'
import JSZip from 'jszip'
import { parseAmazonTakeoutZipFromJSZip } from './takeoutZipParser.js'

async function buildSampleZip() {
  const zip = new JSZip()
  const sampleItems = [
    { asin: 'ABC123', title: 'Sample Product A', price: 10.5 },
    { asin: 'DEF456', title: 'Sample Product B', price: '$1,234.00' },
    { asin: 'ABC123', title: 'Duplicate Should Be Ignored', price: 99 },
  ]
  // Nested path that previous matcher might have missed
  zip.file('some/deep/path/Retail.CartItems.2/cart-items.json', JSON.stringify(sampleItems, null, 2))
  // NDJSON variant
  const ndjson = sampleItems.map((o) => JSON.stringify(o)).join('\n')
  zip.file('Retail.CartItems.2/cart-items.ndjson', ndjson)
  // CSV variant with only ASIN (and other metadata) no title/price columns
  const csvHeader = '"DateAddedToCart","Source","ASIN","CartDomain","CartList","Quantity","OneClickBuyable","ToBeGiftWrapped","PrimeSubscription","Pantry","AddOn"'
  const csvRows = [
    '"2024-12-01","WEB","GHI789","amazon.com","ACTIVE_CART","1","TRUE","FALSE","NONE","FALSE","FALSE"',
    '"2024-12-02","WEB","JKL012","amazon.com","ACTIVE_CART","2","TRUE","FALSE","NONE","FALSE","FALSE"'
  ]
  zip.file('Retail.CartItems.1/Retail.CartItems.1.csv', [csvHeader, ...csvRows].join('\n'))
  return zip
}

(async () => {
  const zip = await buildSampleZip()
  const products = await parseAmazonTakeoutZipFromJSZip(zip)
  assert(products.length >= 4, 'Should include JSON + NDJSON + CSV ASIN-only products')
  const a = products.find((p) => p.asin === 'ABC123')
  const b = products.find((p) => p.asin === 'DEF456')
  const c = products.find((p) => p.asin === 'GHI789')
  const d = products.find((p) => p.asin === 'JKL012')
  assert(a && b, 'Both ASINs should be present')
  assert.strictEqual(a.price, 10.5, 'Numeric price preserved for first item')
  assert.strictEqual(b.price, 1234, 'Currency symbols stripped and parsed')
  assert(c && d, 'CSV ASIN-only rows should produce products')
  assert.strictEqual(c.title, 'GHI789', 'Fallback title should be ASIN when absent')
  assert.strictEqual(d.title, 'JKL012', 'Fallback title should be ASIN when absent')
  console.log('takeoutZipParser.test.js passed')
})()
