// Dev-only stub of @hermes/plugin-sdk — implements just the surface Git Gui
// uses, backed by a real react-query client and a tiny atom. ctx.rest proxies
// to the real dashboard/plugin_api.py served by dev/server.py.

import { useCallback, useSyncExternalStore } from 'react'
import { useStore } from '@nanostores/react'
import { QueryClient } from '@tanstack/react-query'

export { useStore as useValue } from '@nanostores/react'
export { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
export { atom, computed } from 'nanostores'

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 0 } },
})

export const PROFILE_SWATCHES = Array.from({ length: 12 }, (_, i) => `hsl(${i * 30} 68% 58%)`)

// --- atoms / state -----------------------------------------------------------

const params = new URLSearchParams(location.search)
const cwd = params.get('cwd') || ''

import { atom } from 'nanostores'
const $cwd = atom(cwd)

export const host = {
  state: { cwd: $cwd },
  navigate: p => console.log('navigate', p),
  request: (m, p) => { console.log('host.request', m, p); return Promise.resolve({ ok: true }) },
  notify: () => {},
  onEvent: () => () => {},
}

// --- i18n --------------------------------------------------------------------

import { LOCALES } from '../desktop-src/i18n.js'

const locale = params.get('locale') || 'en'

function bundleFor(loc) {
  return LOCALES[loc] || LOCALES.en
}

function makeT(loc) {
  return (key, ...args) => {
    const v = bundleFor(loc)[key] ?? LOCALES.en[key]
    return typeof v === 'function' ? v(...args) : v ?? key
  }
}

export function usePluginI18n() {
  return useCallback(makeT(locale), [])
}

export function useI18n() {
  return { locale, t: k => k }
}

export const translateNow = makeT(locale)

// --- UI stand-ins ------------------------------------------------------------

export const cn = (...xs) => xs.filter(Boolean).join(' ')

export function Button({ children, variant, size, className, ...props }) {
  return (
    <button className={`stub-btn stub-btn-${variant || 'default'} ${className || ''}`} {...props}>
      {children}
    </button>
  )
}

export function EmptyState({ title, description }) {
  return (
    <div className="stub-empty">
      <div style={{ fontWeight: 500 }}>{title}</div>
      {description ? <div style={{ fontSize: '0.75rem', color: 'var(--ui-text-tertiary)', marginTop: 4 }}>{description}</div> : null}
    </div>
  )
}

export const ErrorState = EmptyState

export function Tip({ label, children }) {
  return <span title={typeof label === 'string' ? label : undefined} style={{ display: 'inline-flex' }}>{children}</span>
}
export const Tooltip = Tip
export const TooltipTrigger = ({ children }) => children
export const TooltipContent = ({ children }) => children
export const TooltipProvider = ({ children }) => children

export function Codicon({ name, size }) {
  return <i className={`codicon codicon-${name}`} style={{ fontSize: size }} aria-hidden="true" />
}

export function GlyphSpinner() {
  return <span className="stub-spinner" aria-label="loading">◌</span>
}

export const icons = new Proxy({}, { get: () => () => null })
export const haptic = () => {}

// --- time --------------------------------------------------------------------

const SECOND = 1000, MINUTE = 60 * SECOND, HOUR = 60 * MINUTE, DAY = 24 * HOUR
export function relativeTime(targetMs, nowMs = Date.now(), loc) {
  const rtf = new Intl.RelativeTimeFormat(loc, { numeric: 'auto' })
  const diff = targetMs - nowMs
  const abs = Math.abs(diff)
  const sign = diff < 0 ? -1 : 1
  if (abs < MINUTE) return rtf.format(sign * Math.round(abs / SECOND), 'second')
  if (abs < HOUR) return rtf.format(sign * Math.round(abs / MINUTE), 'minute')
  if (abs < DAY) return rtf.format(sign * Math.round(abs / HOUR), 'hour')
  return rtf.format(sign * Math.round(abs / DAY), 'day')
}
export const fmtDateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

// --- ctx (not used by components directly, but exported for parity) ----------

export const rest = async path => {
  const res = await fetch(`/api/plugins/git-gui${path}`)
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const err = new Error(`${res.status}: ${JSON.stringify(body ?? res.statusText)}`)
    err.statusCode = res.status
    throw err
  }
  return body
}
