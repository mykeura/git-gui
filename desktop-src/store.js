/**
 * Git Gui feature store — plugin-local atoms (the same primitive Kanban
 * uses). Selection lives here (not in component state) so the compact pane
 * can set a commit and navigate to the page already focused on it.
 * Persisted bits (column widths, drawer open/width, file view) go through
 * `ctx.storage`, bound once in `register`.
 */

import { atom } from '@hermes/plugin-sdk'

/** Selected commit sha (null = nothing selected). */
export const $selectedSha = atom(null)

/** Whether the detail drawer is open — closed by default, opens on select. */
export const $drawerOpen = atom(false)

/** Column widths: { refs, graph, drawer } px. graph=null → auto-fit lanes. Persisted. */
export const $colWidths = atom({ refs: 220, graph: null, drawer: 380 })

/** File list view inside the drawer: 'path' | 'tree'. Persisted. */
export const $fileView = atom('path')

/** Show remote-only branch chips. Persisted. */
export const $showRemotes = atom(true)

/** Drawer content mode: 'files' | { diff: path } — view, not persisted. */
export const $drawerView = atom('files')

let storage = null

const PERSIST = {
  colWidths: $colWidths,
  fileView: $fileView,
  showRemotes: $showRemotes,
}

export function bindStorage(ctx) {
  storage = ctx.storage
  for (const [key, a] of Object.entries(PERSIST)) {
    const v = storage.get(`${key}`)
    if (v !== undefined && v !== null) a.set(v)
  }
}

function persist(key, value) {
  storage?.set(`${key}`, value)
}

export const setDrawerOpen = open => { $drawerOpen.set(open); persist('drawerOpen', open) }
export const setFileView = view => { $fileView.set(view); persist('fileView', view) }
export const setShowRemotes = v => { $showRemotes.set(v); persist('showRemotes', v) }
export const setColWidth = (col, px) => {
  $colWidths.set({ ...$colWidths.get(), [col]: px })
  persist('colWidths', $colWidths.get())
}
export const selectCommit = sha => {
  $selectedSha.set(sha)
  $drawerView.set('files')
  if (sha) setDrawerOpen(true)
}

/** One-shot request to scroll the list to a sha (set → page consumes → clears). */
export const $scrollToSha = atom(null)

export const scrollToCommit = sha => {
  selectCommit(sha)
  $scrollToSha.set(sha)
}
