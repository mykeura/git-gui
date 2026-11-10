// Dev harness entry — renders GitGuiPage with the real components and the
// real plugin_api.py backend (dev/server.py mounts it at /api/plugins/git-gui).
// Query params: ?cwd=, ?theme=light|dark, ?locale=es|ar|…, ?select=<sha|idx:N>,
// ?diff=<path>, ?drawer=0

import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'

import { queryClient } from './sdk-stub.js'
import { GitGuiPage } from '../desktop-src/page.jsx'
import { GitGuiPane } from '../desktop-src/pane.jsx'
import { bindApi } from '../desktop-src/api.js'
import { $drawerView, $selectedSha, selectCommit, setDrawerOpen } from '../desktop-src/store.js'
import { getGraph } from '../desktop-src/api.js'
import { rest } from './sdk-stub.js'
import cssText from '../desktop-src/styles.css'

const params = new URLSearchParams(location.search)

// theme
if (params.get('theme') === 'dark') document.documentElement.classList.add('dark')
const locale = params.get('locale') || 'en'
document.documentElement.lang = locale
if (locale === 'ar') document.documentElement.dir = 'rtl'

// inject plugin css like register() does
const style = document.createElement('style')
style.textContent = cssText
document.head.appendChild(style)

// ctx.rest equivalent
bindApi({ rest, os: { writeClipboard: async () => true }, storage: { get: () => undefined, set: () => {}, remove: () => {} }, i18n: { t: k => k } })

const view = params.get('view')
const paneWidth = Number(params.get('paneWidth') || 300)
const root = createRoot(document.getElementById('app'))
root.render(
  <QueryClientProvider client={queryClient}>
    {view === 'pane' ? (
      <div style={{ display: 'flex', height: '100%' }}>
        <div style={{ flex: 1, padding: '2rem', color: 'var(--ui-text-quaternary)' }}>
          {Array.from({ length: 24 }, (_, i) => <div key={i} style={{ marginBottom: '1.25rem' }}>… chat transcript line {i + 1} …</div>)}
        </div>
        <div style={{ width: paneWidth, flex: 'none', borderInlineStart: '1px solid var(--ui-stroke-tertiary)', background: 'var(--ui-bg-chrome)' }}>
          <GitGuiPane />
        </div>
      </div>
    ) : (
      <GitGuiPage />
    )}
  </QueryClientProvider>,
)

// selection / diff deep links — wait for first graph page, then apply
const sel = params.get('select')
if (sel || params.get('drawer') === '0') {
  const cwd = params.get('cwd')
  const apply = async () => {
    if (params.get('drawer') === '0') setDrawerOpen(false)
    if (sel) {
      const data = await getGraph(cwd, 0, 500)
      const sha = sel.startsWith('idx:')
        ? data.commits[Number(sel.slice(4))]?.sha
        : data.commits.find(c => c.sha.startsWith(sel))?.sha
      if (sha) {
        selectCommit(sha)
        const diff = params.get('diff')
        if (diff) {
          const { getCommit } = await import('./sdk-stub.js').then(() => import('../desktop-src/api.js'))
          const commit = await getCommit(cwd, sha)
          $drawerView.set({ diff: commit.files.find(f => f.path === diff)?.path ?? commit.files[0]?.path })
        }
      }
    }
  }
  apply()
}
