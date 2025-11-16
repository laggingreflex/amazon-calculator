import assert from 'assert'
import { sortProducts, nextSort } from './sort.js'

const sample = [
  { id: 'a', title: 'Banana', price: 30, position: 2 },
  { id: 'b', title: 'Apple', price: 10, position: 0 },
  { id: 'c', title: 'Carrot', price: 20, position: 1 },
]

// Position asc
let sorted = sortProducts(sample, { key: 'position', dir: 'asc' })
assert.deepStrictEqual(sorted.map((p) => p.id), ['b', 'c', 'a'])
// Position desc
sorted = sortProducts(sample, { key: 'position', dir: 'desc' })
assert.deepStrictEqual(sorted.map((p) => p.id), ['a', 'c', 'b'])

// Title asc
sorted = sortProducts(sample, { key: 'title', dir: 'asc' })
assert.deepStrictEqual(sorted.map((p) => p.id), ['b', 'a', 'c'])
// Title desc
sorted = sortProducts(sample, { key: 'title', dir: 'desc' })
assert.deepStrictEqual(sorted.map((p) => p.id), ['c', 'a', 'b'])

// Price asc
sorted = sortProducts(sample, { key: 'price', dir: 'asc' })
assert.deepStrictEqual(sorted.map((p) => p.id), ['b', 'c', 'a'])
// Price desc
sorted = sortProducts(sample, { key: 'price', dir: 'desc' })
assert.deepStrictEqual(sorted.map((p) => p.id), ['a', 'c', 'b'])

// Toggle logic
let state = { key: 'position', dir: 'asc' }
state = nextSort(state, 'position')
assert.deepStrictEqual(state, { key: 'position', dir: 'desc' })
state = nextSort(state, 'title')
assert.deepStrictEqual(state, { key: 'title', dir: 'asc' })
state = nextSort(state, 'title')
assert.deepStrictEqual(state, { key: 'title', dir: 'desc' })

console.log('sort.test.js passed')