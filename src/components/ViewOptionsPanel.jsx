import React from 'react'
import { saveList, getAllLists, deleteList } from '../lib/db.js'

// Panel grouping filtering, hiding, and named list management
export default function ViewOptionsPanel({
  hideUnselected,
  setHideUnselected,
  filterText,
  setFilterText,
  lists,
  setLists,
  listNameInput,
  setListNameInput,
  selectedListName,
  setSelectedListName,
  selectedIds,
  setSelectedIds,
}) {
  const handleSaveList = async () => {
    const name = listNameInput.trim()
    if (!name || selectedIds.size === 0) return
    try {
      await saveList(name, Array.from(selectedIds))
      const updated = await getAllLists()
      setLists(updated)
      setSelectedListName(name)
    } catch (_) {
      // ignore save error
    }
  }

  const handleDeleteList = async () => {
    if (!selectedListName) return
    const ok = window.confirm(`Delete list "${selectedListName}"?`)
    if (!ok) return
    try {
      await deleteList(selectedListName)
      const updated = await getAllLists()
      setLists(updated)
      setSelectedListName('')
    } catch (_) {
      // ignore delete error
    }
  }

  return (
    <section className="panel" aria-labelledby="viewOptionsHeading" style={{ marginBottom: 16 }}>
      <h2 id="viewOptionsHeading" style={{ margin: '4px 0' }}>View Options</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="checkbox"
              checked={hideUnselected}
              onChange={(e) => setHideUnselected(e.target.checked)}
            />
            Hide unselected items
          </label>
          <label
            style={{ display: 'flex', alignItems: 'center' }}
            title="Leading space forces word boundary (e.g. ' ear' won't match 'year')"
          >
            <span style={{ fontWeight: 600, marginRight: 4 }}>Filter:</span>
            <input
              type="text"
              placeholder="Filter by title..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              style={{ width: 220 }}
            />
            {filterText && (
              <button
                type="button"
                onClick={() => setFilterText('')}
                style={{ marginLeft: 4 }}
                title="Clear filter"
              >
                ×
              </button>
            )}
          </label>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600 }}>Save selection as list</label>
            <input
              type="text"
              placeholder="List name"
              value={listNameInput}
              onChange={(e) => setListNameInput(e.target.value)}
              style={{ marginRight: 8 }}
            />
            <button
              type="button"
              onClick={handleSaveList}
              disabled={selectedIds.size === 0 || !listNameInput.trim()}
              title={selectedIds.size === 0 ? 'Select at least one item to save list' : ''}
            >
              Save List
            </button>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600 }}>Named lists</label>
            <select
              value={selectedListName}
              onChange={(e) => {
                const name = e.target.value
                setSelectedListName(name)
                const match = lists.find((l) => l.name === name)
                if (match) {
                  setSelectedIds(new Set(match.ids))
                }
              }}
            >
              <option value="">-- Choose a list --</option>
              {lists.map((l) => (
                <option key={l.name} value={l.name}>
                  {l.name} ({l.ids?.length || 0})
                </option>
              ))}
            </select>
            <button
              type="button"
              style={{ marginLeft: 8 }}
              onClick={handleDeleteList}
              disabled={!selectedListName}
            >
              Delete List
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
