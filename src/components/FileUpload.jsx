import React from 'react'

function parseHTMLFile(htmlContent) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlContent, 'text/html')
  // Includes both active cart and saved-for-later items; we'll filter by having a title.
  const productDivs = doc.querySelectorAll('div[data-asin]')
  const products = []

  productDivs.forEach((div) => {
    const asin = (div.getAttribute('data-asin') || '').trim()

    // Title: Saved-for-later uses an <a> with classes 'sc-product-link sc-product-title aok-block'
    // Fallbacks cover truncated title containers as well.
    const titleElement =
      div.querySelector('a.sc-product-link.sc-product-title') ||
      div.querySelector('.sc-product-title') ||
      div.querySelector('h4 .a-truncate-full') ||
      div.querySelector('h4 .a-truncate-cut')

    // Price: Prefer visible price element anywhere within the item
    let priceElement = div.querySelector('.a-price .a-offscreen')
    let price = NaN
    if (priceElement) {
      const priceText = priceElement.textContent.trim().replace(/[$£€₹,]/g, '')
      price = parseFloat(priceText)
    }
    // Fallback to data-price attribute used on saved items
    if (Number.isNaN(price)) {
      const dataPriceAttr = div.getAttribute('data-price')
      const parsedDataPrice = dataPriceAttr ? parseFloat(dataPriceAttr) : NaN
      if (!Number.isNaN(parsedDataPrice)) {
        price = parsedDataPrice
      }
    }
    // Final fallback: treat as 0 if still NaN so item is not dropped
    if (Number.isNaN(price)) price = 0

    // Image: target the product link image, avoid spinner GIFs, support savepage attributes
    let image = ''
    const imageLink =
      div.querySelector('a.sc-product-link[href*="saved_image"], a.sc-product-link') ||
      null
    let imageElement = null
    if (imageLink) {
      imageElement = imageLink.querySelector('img.sc-product-image, img')
    }
    if (!imageElement) {
      imageElement = div.querySelector('img.sc-product-image')
    }
    if (!imageElement) {
      // Last resort: first non-spinner image inside the item
      const allImgs = Array.from(div.querySelectorAll('img'))
      imageElement = allImgs.find((el) => {
        const src = el.getAttribute('src') || ''
        const dsrc = el.getAttribute('data-savepage-src') || ''
        const inSpinner = !!el.closest('.sc-list-item-spinner')
        const looksSpinner = /loading|spinner/i.test(src) || /loading|spinner/i.test(dsrc)
        return !inSpinner && !looksSpinner
      })
    }
    if (imageElement) {
      let src =
        imageElement.getAttribute('data-savepage-src') ||
        imageElement.getAttribute('src') ||
        imageElement.getAttribute('data-src') ||
        imageElement.getAttribute('data-image') ||
        imageElement.getAttribute('data-old-hires')

      // srcset: prefer data-savepage-srcset then normal srcset
      if (!src) {
        const ss =
          imageElement.getAttribute('data-savepage-srcset') ||
          imageElement.getAttribute('srcset')
        if (ss) {
          const first = ss.split(',')[0].trim().split(' ')[0]
          if (first) src = first
        }
      }

      // data-a-dynamic-image contains a JSON map of URL -> [w,h]
      if (!src) {
        const dyn = imageElement.getAttribute('data-a-dynamic-image')
        if (dyn) {
          try {
            const obj = JSON.parse(dyn)
            const candidates = Object.entries(obj)
            if (candidates.length) {
              candidates.sort((a, b) => {
                const aw = Array.isArray(a[1]) ? a[1][0] : 0
                const bw = Array.isArray(b[1]) ? b[1][0] : 0
                return bw - aw
              })
              src = candidates[0][0]
            }
          } catch (_) {
            // ignore malformed JSON from savepage captures
          }
        }
      }

      // Normalize protocol-relative
      if (src && src.startsWith('//')) src = 'https:' + src

      // Ignore Amazon spinner images
      if (src && /loading|spinner/i.test(src)) {
        src = ''
      }
      image = src || ''
    }

    if (asin && titleElement) {
      const title = titleElement.textContent.trim().replace(/\s+/g, ' ')
      products.push({ asin, title, price, image })
    }
  })

  return products
}

export default function FileUpload({ onProductsParsed }) {
  const onChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const htmlContent = ev.target.result
      const products = parseHTMLFile(htmlContent)
      onProductsParsed(products)
    }
    reader.readAsText(file)
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <input type="file" accept=".html,.htm" onChange={onChange} />
    </div>
  )
}
