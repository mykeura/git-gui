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
        <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
          <div style={{ alignSelf: 'flex-end', background: 'var(--ui-accent)', color: '#fff', borderRadius: '12px 12px 4px 12px', padding: '0.5rem 0.875rem', maxWidth: '60%' }}>
            Can you fix the login redirect bug? Users land on a 404 after signing in.
          </div>
          <div style={{ alignSelf: 'flex-start', background: 'var(--ui-bg-tertiary)', borderRadius: '12px 12px 12px 4px', padding: '0.5rem 0.875rem', maxWidth: '70%' }}>
            Looking at <code>src/auth.js</code> — the redirect target is hardcoded to /home but the route moved to /dashboard. I'll patch it and add a test.
          </div>
          <div style={{ alignSelf: 'flex-end', background: 'var(--ui-accent)', color: '#fff', borderRadius: '12px 12px 4px 12px', padding: '0.5rem 0.875rem', maxWidth: '60%' }}>
            Thanks — also check the dark mode branch while you're in there.
          </div>
          <div style={{ alignSelf: 'flex-start', background: 'var(--ui-bg-tertiary)', borderRadius: '12px 12px 12px 4px', padding: '0.5rem 0.875rem', maxWidth: '70%' }}>
            Done. The fix is on <code>fix/login-redirect</code> — see the graph on the right: it's merged into main already, dark mode is still open.
          </div>
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

// --- smoke mode: exercise scroll-during-load + resizers, report errors -------
const errors = []
window.addEventListener('error', e => errors.push(String(e.message || e.error)))
window.addEventListener('unhandledrejection', e => errors.push(String(e.reason)))
const origErr = console.error.bind(console)
console.error = (...a) => { errors.push(a.map(String).join(' ')); origErr(...a) }

async function smoke() {
  const cwd = params.get('cwd')
  const scroll = () => document.querySelector('.gg-scroll')
  // wait for rows
  for (let i = 0; i < 100 && !scroll(); i++) await new Promise(r => setTimeout(r, 100))
  const el = scroll()
  if (!el) { errors.push('no .gg-scroll found'); return }
  // storm: scroll to bottom (triggers loadMore) while dispatching events
  for (let round = 0; round < 30; round++) {
    el.scrollTop = el.scrollHeight
    el.dispatchEvent(new Event('scroll'))
    el.scrollTop = Math.random() * el.scrollHeight
    el.dispatchEvent(new Event('scroll'))
    await new Promise(r => setTimeout(r, 60))
  }
  // pane-click path: scroll to a sha deep in history
  const { $scrollToSha, selectCommit } = await import('../desktop-src/store.js')
  const { getGraph } = await import('../desktop-src/api.js')
  const deep = await getGraph(cwd, 800, 20)
  if (deep.commits.length) {
    selectCommit(deep.commits[deep.commits.length - 1].sha)
    $scrollToSha.set(deep.commits[deep.commits.length - 1].sha)
    await new Promise(r => setTimeout(r, 3000))
  }
  // drag the first resizer
  const rz = document.querySelector('.gg-resizer')
  if (rz) {
    const rect = rz.getBoundingClientRect()
    const x = rect.x + 2, y = rect.y + 2
    rz.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: x, clientY: y }))
    for (let i = 0; i < 10; i++) {
      window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: x + i * 4, clientY: y, movementX: 4 }))
      await new Promise(r => setTimeout(r, 30))
    }
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: x + 40, clientY: y }))
  }
  await new Promise(r => setTimeout(r, 500))
}

if (params.get('smoke')) {
  smoke().then(() => {
    const div = document.createElement('div')
    div.id = 'smoke-result'
    div.textContent = errors.length ? `SMOKE-ERRORS: ${errors.join(' | ')}` : 'SMOKE-OK'
    document.body.appendChild(div)
  })
}

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
        : sel.startsWith('sub:')
          ? data.commits.find(c => c.subject.includes(sel.slice(4)))?.sha
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
