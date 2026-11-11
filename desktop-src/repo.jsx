// SPDX-FileCopyrightText: 2026 Miguel Euraque
// SPDX-License-Identifier: MIT
/**
 * Git Gui data hooks. `/repo` is the cheap poll (15 s + window focus); its
 * `refsHash` fingerprints every ref, so the expensive `/graph` fetch only
 * re-runs when refs actually move. Pagination is manual (`useInfiniteQuery`
 * isn't in the SDK surface): `useCommitGraph` accumulates pages and resets
 * whenever cwd or refsHash changes.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { host, usePluginI18n, useQuery, useValue } from '@hermes/plugin-sdk'

import { getGraph, getRepo } from './api'
import { BackendGate, repoStatus } from './gate'

const PAGE = 500

export function useRepo(cwd) {
  return useQuery({
    queryKey: ['git-gui', 'repo', cwd],
    queryFn: () => getRepo(cwd),
    enabled: Boolean(cwd),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  })
}

const EMPTY = { commits: [], hasMore: false, loading: true, loadingMore: false, error: null }

export function useCommitGraph(cwd, enabled, refsHash) {
  const [state, setState] = useState(EMPTY)
  const gen = useRef(0)
  const busy = useRef(false)
  const len = useRef(0)
  len.current = state.commits.length

  useEffect(() => {
    const g = ++gen.current
    busy.current = false
    if (!cwd || !enabled) {
      setState(EMPTY)
      return
    }
    setState(EMPTY)
    getGraph(cwd, 0, PAGE).then(
      d => gen.current === g && setState({ commits: d.commits, hasMore: d.hasMore, loading: false, loadingMore: false, error: null }),
      e => gen.current === g && setState({ ...EMPTY, loading: false, error: e }),
    )
  }, [cwd, enabled, refsHash])

  const loadMore = useCallback(() => {
    if (busy.current) return
    const g = gen.current
    busy.current = true
    setState(s => (s.hasMore ? { ...s, loadingMore: true } : s))
    getGraph(cwd, len.current, PAGE).then(
      d => {
        busy.current = false
        if (gen.current !== g) return
        setState(s => ({
          commits: [...s.commits, ...d.commits],
          hasMore: d.hasMore,
          loading: false,
          loadingMore: false,
          error: null,
        }))
      },
      e => {
        busy.current = false
        if (gen.current !== g) return
        setState(s => ({ ...s, loadingMore: false, error: e }))
      },
    )
  }, [cwd])

  return { ...state, loadMore }
}

export function useGitGui() {
  const cwd = useValue(host.state.cwd)
  const repoQuery = useRepo(cwd)
  const status = repoStatus(cwd, repoQuery)
  const repo = repoQuery.data
  const graph = useCommitGraph(cwd, status === 'ok', repo?.refsHash)
  return { cwd, repo, repoQuery, status, graph }
}

export function RepoSummary() {
  const t = usePluginI18n('git-gui')
  const { repo, repoQuery, status, graph } = useGitGui()

  return (
    <BackendGate
      status={status}
      message={repoQuery.error?.message}
      onRetry={() => repoQuery.refetch()}
    >
      <div className="gg-repo">
        <div className="gg-repo-name">{repo?.name}</div>
        <div className="gg-repo-sub">
          {repo?.empty ? t('emptyRepo') : repo?.branch ?? t('detached')}
          {graph.commits.length ? ` · ${t('commitCount', graph.commits.length)}${graph.hasMore ? '+' : ''}` : ''}
        </div>
      </div>
    </BackendGate>
  )
}
