// SPDX-FileCopyrightText: 2026 Miguel Euraque
// SPDX-License-Identifier: MIT
/**
 * BackendGate — the shared state machine every Git Gui surface renders
 * through. Maps (cwd, query error) to one of the plugin's honest states:
 * no working directory, backend off, not a repo, git missing, generic
 * failure, or `ok` (children render).
 */

import { Button, EmptyState, GlyphSpinner, host, usePluginI18n } from '@hermes/plugin-sdk'

/** Single status from the repo query: 'ok' means `data.isRepo` was true. */
export function repoStatus(cwd, repoQuery) {
  if (!cwd) return 'no-cwd'
  if (repoQuery.isPending) return 'loading'
  if (repoQuery.isError) return repoQuery.error?.kind ?? 'error'
  if (!repoQuery.data?.isRepo) return 'not_a_repo'
  return 'ok'
}

export function BackendGate({ status, message, onRetry, children }) {
  const t = usePluginI18n('git-gui')

  if (status === 'ok') return children
  if (status === 'loading') {
    return (
      <div className="gg-gate">
        <GlyphSpinner />
      </div>
    )
  }

  const copy = {
    'no-cwd': ['state.noCwd.title', 'state.noCwd.desc'],
    not_a_repo: ['state.notRepo.title', 'state.notRepo.desc'],
    git_missing: ['state.gitMissing.title', 'state.gitMissing.desc'],
    backend_disabled: ['state.backendOff.title', 'state.backendOff.desc'],
    error: ['state.error.title', ''],
    not_found: ['state.error.title', ''],
  }[status] ?? ['state.error.title', '']

  const action = status === 'backend_disabled'
    ? (
        <Button
          onClick={() =>
            host
              .request('plugins.manage', { action: 'toggle', key: 'git-gui', enable: true })
              .then(() => onRetry?.())
              .catch(() => onRetry?.())
          }
          size="sm"
          type="button"
        >
          {t('state.backendOff.action')}
        </Button>
      )
    : status === 'error' || status === 'not_found' || status === 'git_missing'
      ? (
          <Button onClick={() => onRetry?.()} size="sm" type="button" variant="outline">
            {t('state.retry')}
          </Button>
        )
      : null

  return (
    <div className="gg-gate">
      <div className="gg-gate-inner">
        <EmptyState title={t(copy[0])} description={copy[1] ? t(copy[1]) : message} />
        {action ? <div>{action}</div> : null}
      </div>
    </div>
  )
}
