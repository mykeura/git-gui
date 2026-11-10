/**
 * Git Gui data layer — thin client over `ctx.rest`, the plugin's own
 * `/api/plugins/git-gui/*` FastAPI namespace (`dashboard/plugin_api.py`).
 * `bindApi(ctx)` runs once in `register(ctx)`; every call below returns
 * parsed JSON or throws a normalized error:
 * `{ kind: 'backend_disabled'|'not_a_repo'|'git_missing'|'error', message }`.
 *
 * `backend_disabled` is the state where the Python half never imported (the
 * plugin is not in `plugins.enabled`): the gateway's plugin-API runtime gate
 * answers 404 `{"detail":"Plugin not found"}` and the hot-mount fallback
 * answers 404 `{"detail":"Not Found"}`, both distinct from our backend's own
 * `{"detail":{"code":...}}` shape — so a 404 without a `code` means "off".
 */

let rest = null
let os = null

export function bindApi(ctx) {
  rest = ctx.rest
  os = ctx.os
}

/** Copy to the OS clipboard through the attributed plugin OS door. */
export const copyText = text => (os ? os.writeClipboard(text) : Promise.resolve(false))

/** The structured JSON body a `hermesApi` error carries after its
 *  `"<status>: "` prefix (see electron/api-transport.ts readJsonErrorBody). */
function errorBody(err) {
  const message = err instanceof Error ? err.message : String(err ?? '')
  const start = message.indexOf('{')
  if (start < 0) return null
  try {
    const parsed = JSON.parse(message.slice(start))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function normalizeError(err) {
  const status = typeof err?.statusCode === 'number' ? err.statusCode : NaN
  const detail = errorBody(err)?.detail
  const code = detail && typeof detail === 'object' ? detail.code : undefined
  const message =
    (detail && typeof detail === 'object' && detail.message) ||
    (typeof detail === 'string' ? detail : '') ||
    err?.message ||
    String(err)

  if (status === 404) {
    // The gate and the hot-mount fallback answer 404 with a PLAIN-string
    // detail; our backend always sends {"code": ...}. A coded 404 is a real
    // answer (not_a_repo / not_found), never "backend off".
    if (!code) {
      return { kind: 'backend_disabled', message }
    }
    return { kind: code === 'not_a_repo' || code === 'not_found' ? code : 'error', message }
  }
  if (code === 'git_missing') {
    return { kind: 'git_missing', message }
  }
  return { kind: 'error', message }
}

function enc(value) {
  return encodeURIComponent(value)
}

async function call(path) {
  try {
    return await rest(path)
  } catch (err) {
    throw normalizeError(err)
  }
}

export const getRepo = cwd => call(`/repo?cwd=${enc(cwd)}`)
export const getGraph = (cwd, skip = 0, limit = 500) =>
  call(`/graph?cwd=${enc(cwd)}&skip=${skip}&limit=${limit}`)
export const getRefs = cwd => call(`/refs?cwd=${enc(cwd)}`)
export const getCommit = (cwd, sha) => call(`/commit?cwd=${enc(cwd)}&sha=${enc(sha)}`)
export const getDiff = (cwd, sha, path) =>
  call(`/diff?cwd=${enc(cwd)}&sha=${enc(sha)}&path=${enc(path)}`)
