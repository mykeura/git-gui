// SPDX-FileCopyrightText: 2026 Miguel Euraque
// SPDX-License-Identifier: MIT
/**
 * GitGuiPane — the compact right-sidebar pane: header (repo · branch, refresh,
 * open full view) over a mini commit graph (24px rows, 10px lanes, r=3.5 dots,
 * inline ref chips before the subject). Shares the page's queries/cache and
 * its selection store — a row click selects the commit, then opens /git-gui
 * focused on it.
 */

import { useMemo } from 'react'
import {
  Codicon,
  host,
  queryClient,
  Tip,
  usePluginI18n,
  useValue,
} from '@hermes/plugin-sdk'

import { RefChips } from './chips'
import { BackendGate } from './gate'
import { GraphCell, laneColor, useWindowing } from './graph'
import { layoutGraph } from './lanes'
import { useGitGui } from './repo'
import { $scrollToSha, $showRemotes, selectCommit } from './store'

const PANE_ROW_H = 24
const PANE_LANE_W = 10

export function refreshAll() {
  queryClient.invalidateQueries({ queryKey: ['git-gui'] })
}

export function GitGuiPane() {
  const t = usePluginI18n('git-gui')
  const { repo, repoQuery, status, graph } = useGitGui()
  const showRemotes = useValue($showRemotes)
  const commits = graph.commits
  const { rows, maxLanes } = useMemo(() => layoutGraph(commits), [commits])
  const windowing = useWindowing({
    count: rows.length,
    rowHeight: PANE_ROW_H,
    onNearEnd: () => graph.hasMore && !graph.loadingMore && graph.loadMore(),
  })

  const open = sha => {
    selectCommit(sha)
    $scrollToSha.set(sha)
    host.navigate('/git-gui')
  }

  return (
    <div className="gg-pane">
      <div className="gg-pane-head">
        <span className="gg-pane-title">
          {repo ? <bdi>{repo.name}{repo.branch ? ` · ${repo.branch}` : ''}</bdi> : t('paneTitle')}
        </span>
        <Tip label={t('refresh')}>
          <button className="gg-icon-btn" onClick={refreshAll} type="button">
            <Codicon name="refresh" size="0.75rem" />
          </button>
        </Tip>
        <Tip label={t('openFullView')}>
          <button className="gg-icon-btn" onClick={() => host.navigate('/git-gui')} type="button">
            <Codicon name="arrow-right" size="0.75rem" />
          </button>
        </Tip>
      </div>
      <BackendGate
        status={status}
        message={repoQuery.error?.message}
        onRetry={() => repoQuery.refetch()}
      >
        <div className="gg-pane-body" onScroll={windowing.onScroll} ref={windowing.ref}>
          <div className="gg-rows" style={{ height: windowing.totalHeight }}>
            {rows.slice(windowing.start, windowing.end).map((row, vi) => {
              const i = windowing.start + vi
              const c = commits[i]
              const color = laneColor(row.color)
              return (
                <div
                  className="gg-prow"
                  key={c.sha}
                  onClick={() => open(c.sha)}
                  style={{ top: i * PANE_ROW_H, position: 'absolute', insetInlineStart: 0, width: '100%' }}
                  title={c.subject}
                >
                  <div className="gg-prow-graph" style={{ maxWidth: '40%' }}>
                    <GraphCell
                      dotR={3.5}
                      hasRefs={Boolean(c.refs?.length)}
                      laneWidth={PANE_LANE_W}
                      lanes={maxLanes}
                      row={row}
                      rowHeight={PANE_ROW_H}
                    />
                  </div>
                  <RefChips max={1} refs={c.refs ?? []} color={color} showRemotes={showRemotes} t={t} />
                  <span className="gg-prow-subject">{c.subject}</span>
                </div>
              )
            })}
          </div>
          {graph.loadingMore ? <div className="gg-loading-more">{t('state.loading')}</div> : null}
        </div>
      </BackendGate>
    </div>
  )
}
