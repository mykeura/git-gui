// SPDX-FileCopyrightText: 2026 Miguel Euraque
// SPDX-License-Identifier: MIT
/**
 * GitGuiPage — the `/git-gui` route: header, three resizable columns
 * (BRANCH / TAG | GRAPH | COMMIT MESSAGE) over one virtualized scroll, and
 * the detail drawer (hidden until a commit is selected). Commit dots are
 * plain circles; each line keeps its own palette color.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  Codicon,
  relativeTime,
  Tip,
  useI18n,
  usePluginI18n,
  useValue,
} from '@hermes/plugin-sdk'

import { RefChips } from './chips'
import { DetailDrawer } from './detail-drawer'
import { BackendGate } from './gate'
import { GraphCell, graphWidth, laneColor, ROW_H, useWindowing } from './graph'
import { layoutGraph } from './lanes'
import { refreshAll } from './pane'
import { useGitGui } from './repo'
import {
  $colWidths,
  $drawerOpen,
  $drawerView,
  $scrollToSha,
  $selectedSha,
  $showRemotes,
  selectCommit,
  setColWidth,
  setDrawerOpen,
  setShowRemotes,
} from './store'

function Resizer({ onDelta }) {
  return (
    <div
      className="gg-resizer"
      onMouseDown={e => {
        e.preventDefault()
        const handle = e.currentTarget  // nulled after dispatch — capture now
        handle.classList.add('gg-resizer-active')
        const move = ev => onDelta(ev.movementX)
        const up = () => {
          handle.classList.remove('gg-resizer-active')
          window.removeEventListener('mousemove', move)
          window.removeEventListener('mouseup', up)
        }
        window.addEventListener('mousemove', move)
        window.addEventListener('mouseup', up)
      }}
    />
  )
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

export function GitGuiPage() {
  const t = usePluginI18n('git-gui')
  const { locale } = useI18n()
  const { cwd, repo, repoQuery, status, graph } = useGitGui()
  const selectedSha = useValue($selectedSha)
  const colWidths = useValue($colWidths)
  const scrollToSha = useValue($scrollToSha)
  const showRemotes = useValue($showRemotes)
  const drawerOpen = useValue($drawerOpen)
  const commits = graph.commits

  const { rows, maxLanes } = useMemo(() => layoutGraph(commits), [commits])

  const windowing = useWindowing({
    count: rows.length,
    rowHeight: ROW_H,
    onNearEnd: () => graph.hasMore && !graph.loadingMore && graph.loadMore(),
  })

  // A parent link / pane click asks the list to reveal a sha: load pages until
  // found, capped at 5000 commits.
  useEffect(() => {
    if (!scrollToSha) return
    const i = commits.findIndex(c => c.sha === scrollToSha)
    if (i >= 0) {
      windowing.scrollToRow(i)
      $scrollToSha.set(null)
    } else if (graph.hasMore && !graph.loadingMore && commits.length < 5000) {
      graph.loadMore()
    }
  }, [scrollToSha, commits, graph, windowing])

  const graphW = colWidths.graph ?? graphWidth(maxLanes)

  const onKeyDown = useCallback(
    e => {
      if (!commits.length) return
      const idx = commits.findIndex(c => c.sha === selectedSha)
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const next = e.key === 'ArrowDown'
          ? Math.min(commits.length - 1, idx < 0 ? 0 : idx + 1)
          : Math.max(0, idx < 0 ? 0 : idx - 1)
        selectCommit(commits[next].sha)
        windowing.scrollToRow(next)
      } else if (e.key === 'Escape') {
        if ($drawerView.get() !== 'files') $drawerView.set('files')
        else setDrawerOpen(false)
      }
    },
    [commits, selectedSha, windowing],
  )

  const visible = rows.slice(windowing.start, windowing.end)

  return (
    <div className="gg-root">
      <header className="gg-header">
        <Codicon name="git-branch" size="0.9rem" />
        <span className="gg-header-title">{repo?.name ?? t('pageTitle')}</span>
        {repo ? (
          <span className="gg-header-branch">
            <bdi>{repo.empty ? t('emptyRepo') : repo.branch ?? t('detached')}</bdi>
          </span>
        ) : null}
        {commits.length ? (
          <span className="gg-header-count">
            {t('commitCount', commits.length)}{graph.hasMore ? '+' : ''}
          </span>
        ) : null}
        <span className="gg-header-spacer" />
        <label className="gg-remote-toggle" title={t('toggle.remotes')}>
          <input
            checked={showRemotes}
            onChange={e => setShowRemotes(e.target.checked)}
            type="checkbox"
          />
          <Codicon name="cloud" size="0.8rem" />
          <span>{t('toggle.remotes')}</span>
        </label>
        <Tip label={t('refresh')}>
          <button className="gg-icon-btn" onClick={refreshAll} type="button">
            <Codicon name="refresh" size="0.8rem" />
          </button>
        </Tip>
      </header>

      <BackendGate
        status={status}
        message={repoQuery.error?.message}
        onRetry={() => repoQuery.refetch()}
      >
        <div className="gg-colheads">
          <div className="gg-colhead" style={{ width: colWidths.refs }}>{t('col.refs')}</div>
          <Resizer onDelta={d => setColWidth('refs', clamp(colWidths.refs + d, 100, 560))} />
          <div className="gg-colhead" style={{ width: graphW }}>{t('col.graph')}</div>
          <Resizer
            onDelta={d => setColWidth('graph', clamp(graphW + d, graphWidth(1), graphWidth(maxLanes) + 160))}
          />
          <div className="gg-colhead" style={{ flex: 1 }}>{t('col.message')}</div>
        </div>
        <div className="gg-body">
          <div
            className="gg-scroll"
            onKeyDown={onKeyDown}
            onScroll={windowing.onScroll}
            ref={windowing.ref}
            tabIndex={0}
          >
            <div className="gg-rows" style={{ height: windowing.totalHeight }}>
              {visible.map((row, vi) => {
                const i = windowing.start + vi
                const c = commits[i]
                const color = laneColor(row.color)
                const cls = [
                  'gg-row',
                  c.sha === selectedSha ? 'gg-row-selected' : '',
                  c.refs?.length ? 'gg-row-hasrefs' : '',
                ].join(' ')
                return (
                  <div
                    className={cls}
                    key={c.sha}
                    onClick={() => selectCommit(c.sha)}
                    style={{ top: i * ROW_H, height: ROW_H }}
                    title={c.subject}
                  >
                    <div className="gg-cell gg-cell-refs" style={{ width: colWidths.refs }}>
                      <RefChips refs={c.refs ?? []} color={color} showRemotes={showRemotes} t={t} />
                    </div>
                    <div className="gg-cell" style={{ width: graphW }}>
                      <GraphCell hasRefs={Boolean(c.refs?.length)} lanes={maxLanes} row={row} />
                    </div>
                    <div className="gg-cell gg-cell-msg" style={{ flex: 1 }}>
                      <span className="gg-msg-subject" title={c.subject}>{c.subject}</span>
                      <span className="gg-msg-meta">
                        <bdi>{c.author}</bdi> · {relativeTime(c.timestamp * 1000, Date.now(), locale)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            {graph.loadingMore ? <div className="gg-loading-more">{t('state.loading')}</div> : null}
          </div>
          {drawerOpen ? (
            <>
              <Resizer onDelta={d => setColWidth('drawer', clamp(colWidths.drawer - d, 240, 640))} />
              <div className="gg-drawer-slot" style={{ '--gg-drawer-w': `${colWidths.drawer}px` }}>
                <DetailDrawer cwd={cwd} />
              </div>
            </>
          ) : null}
        </div>
      </BackendGate>
    </div>
  )
}
