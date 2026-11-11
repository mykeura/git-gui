// SPDX-FileCopyrightText: 2026 Miguel Euraque
// SPDX-License-Identifier: MIT
/**
 * DetailDrawer — the right-hand commit inspector on /git-gui. Sections:
 * identity (sha, subject, body), people (author + committer when different),
 * parents (clickable short shas), the changed-file list (Path/Tree toggle),
 * and an in-drawer unified diff view per file. All data from /commit & /diff.
 */

import { useMemo, useState } from 'react'
import {
  Codicon,
  GlyphSpinner,
  Tip,
  useI18n,
  usePluginI18n,
  useQuery,
  useValue,
} from '@hermes/plugin-sdk'

import { copyText, getCommit, getDiff } from './api'
import {
  $drawerOpen,
  $drawerView,
  $fileView,
  $selectedSha,
  scrollToCommit,
  setDrawerOpen,
  setFileView,
} from './store'

const short = sha => sha.slice(0, 8)

const STATUS_LABEL = { A: 'added', M: 'modified', D: 'deleted', R: 'renamed', C: 'copied', T: 'type-changed' }

function PersonLine({ label, person, locale, t }) {
  if (!person) return null
  return (
    <div className="gg-meta-row">
      <span className="gg-meta-label">{label}</span>
      <span className="gg-meta-value">
        <bdi>{person.name}</bdi> <span className="gg-file-dir">&lt;<bdi>{person.email}</bdi>&gt;</span>
        {' · '}
        {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(person.timestamp * 1000)}
      </span>
    </div>
  )
}

function FileRow({ file, depth, onOpen }) {
  const slash = file.path.lastIndexOf('/')
  const dir = slash >= 0 ? file.path.slice(0, slash + 1) : ''
  const base = slash >= 0 ? file.path.slice(slash + 1) : file.path
  return (
    <div className="gg-file" onClick={() => onOpen(file)} role="button" tabIndex={-1}>
      {depth ? <span className="gg-tree-indent" style={{ width: depth * 12 }} /> : null}
      <span className={`gg-file-status gg-file-status-${file.status}`} title={STATUS_LABEL[file.status] ?? file.status}>
        {file.status}
      </span>
      <span className="gg-file-path" title={file.oldPath ? `${file.oldPath} → ${file.path}` : file.path}>
        {file.oldPath ? (
          <>
            <span className="gg-file-dir">{file.oldPath}</span>
            {' → '}
          </>
        ) : null}
        <bdi><span className="gg-file-dir">{dir}</span>{base}</bdi>
      </span>
      <span className="gg-file-stats">
        {file.additions === null ? '—' : <span className="gg-file-add">+{file.additions}</span>}
        {' '}
        {file.deletions === null ? '' : <span className="gg-file-del">−{file.deletions}</span>}
      </span>
    </div>
  )
}

/** Build a depth-labelled tree (dirs first) out of flat file paths. */
function treeRows(files) {
  const root = { dirs: new Map(), files: [] }
  for (const f of files) {
    const parts = f.path.split('/')
    let node = root
    for (const d of parts.slice(0, -1)) {
      if (!node.dirs.has(d)) node.dirs.set(d, { dirs: new Map(), files: [] })
      node = node.dirs.get(d)
    }
    node.files.push(f)
  }
  const rows = []
  const walk = (node, depth) => {
    for (const name of [...node.dirs.keys()].sort()) {
      rows.push({ dir: name, depth })
      walk(node.dirs.get(name), depth + 1)
    }
    for (const f of node.files) rows.push({ file: f, depth })
  }
  walk(root, 0)
  return rows
}

function DiffView({ cwd, sha, path }) {
  const t = usePluginI18n('git-gui')
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['git-gui', 'diff', cwd, sha, path],
    queryFn: () => getDiff(cwd, sha, path),
  })

  if (isPending) {
    return (
      <div className="gg-gate"><GlyphSpinner /></div>
    )
  }
  if (isError) {
    return (
      <div className="gg-diff-notice">
        {error?.message || t('state.error.title')}{' '}
        <button className="gg-parent-link" onClick={() => refetch()} type="button">{t('state.retry')}</button>
      </div>
    )
  }
  if (data.binary) {
    return <div className="gg-diff-notice">{t('drawer.binary')}</div>
  }
  const lines = (data.diff || '').split('\n')
  return (
    <div className="gg-diff">
      {data.truncated ? <div className="gg-diff-notice">{t('drawer.truncated')}</div> : null}
      {lines.map((line, i) => {
        const cls = line.startsWith('+++') || line.startsWith('---')
          ? 'gg-diff-meta'
          : line.startsWith('+')
            ? 'gg-diff-add'
            : line.startsWith('-')
              ? 'gg-diff-del'
              : line.startsWith('@@')
                ? 'gg-diff-hunk'
                : line.startsWith('diff ') || line.startsWith('index ') || line.startsWith('similarity') || line.startsWith('rename') || line.startsWith('new file') || line.startsWith('deleted') || line.startsWith('old mode') || line.startsWith('new mode')
                  ? 'gg-diff-meta'
                  : ''
        return (
          <div className={`gg-diff-line ${cls}`} key={i}>
            {line || ' '}
          </div>
        )
      })}
    </div>
  )
}

export function DetailDrawer({ cwd }) {
  const t = usePluginI18n('git-gui')
  const { locale } = useI18n()
  const sha = useValue($selectedSha)
  const open = useValue($drawerOpen)
  const view = useValue($drawerView)
  const fileView = useValue($fileView)
  const [copied, setCopied] = useState(false)

  const { data: commit, isPending, isError, error, refetch } = useQuery({
    queryKey: ['git-gui', 'commit', cwd, sha],
    queryFn: () => getCommit(cwd, sha),
    enabled: Boolean(sha),
  })

  const rows = useMemo(
    () => (commit && fileView === 'tree' ? treeRows(commit.files) : null),
    [commit, fileView],
  )

  let body
  if (!sha) {
    body = <div className="gg-diff-notice">{t('drawer.noSelection')}</div>
  } else if (view !== 'files') {
    body = (
      <>
        <button className="gg-parent-link" onClick={() => $drawerView.set('files')} type="button">
          ← {t('drawer.back')}
        </button>
        <DiffView cwd={cwd} sha={sha} path={view.diff} />
      </>
    )
  } else if (isPending) {
    body = <div className="gg-gate"><GlyphSpinner /></div>
  } else if (isError) {
    body = (
      <div className="gg-diff-notice">
        {error?.message || t('state.error.title')}{' '}
        <button className="gg-parent-link" onClick={() => refetch()} type="button">{t('state.retry')}</button>
      </div>
    )
  } else {
    const files = commit.files ?? []
    const adds = files.reduce((s, f) => s + (f.additions ?? 0), 0)
    const dels = files.reduce((s, f) => s + (f.deletions ?? 0), 0)
    const samePerson =
      commit.author.name === commit.committer.name &&
      commit.author.email === commit.committer.email &&
      commit.author.timestamp === commit.committer.timestamp
    body = (
      <>
        <div className="gg-subject">{commit.subject}</div>
        {commit.body ? <div className="gg-bodytext">{commit.body}</div> : null}
        <div className="gg-meta">
          <PersonLine label={t('drawer.author')} person={commit.author} locale={locale} t={t} />
          {samePerson ? null : (
            <PersonLine label={t('drawer.committer')} person={commit.committer} locale={locale} t={t} />
          )}
          {commit.parents.length ? (
            <div className="gg-meta-row">
              <span className="gg-meta-label">{t('drawer.parents')}</span>
              <span className="gg-parents">
                {commit.parents.map(p => (
                  <button className="gg-parent-link" key={p} onClick={() => scrollToCommit(p)} type="button">
                    <bdi>{short(p)}</bdi>
                  </button>
                ))}
              </span>
            </div>
          ) : null}
        </div>
        <div className="gg-files-head">
          <span className="gg-files-count">
            {t('drawer.filesChanged', files.length)}
            {adds || dels ? ` · ` : ''}
            {adds ? <span className="gg-file-add">+{adds}</span> : ''}
            {dels ? <span className="gg-file-del"> −{dels}</span> : ''}
          </span>
          <span className="gg-view-toggle">
            <button
              className={`gg-view-btn${fileView === 'path' ? ' gg-view-btn-on' : ''}`}
              onClick={() => setFileView('path')}
              type="button"
            >
              {t('drawer.pathView')}
            </button>
            <button
              className={`gg-view-btn${fileView === 'tree' ? ' gg-view-btn-on' : ''}`}
              onClick={() => setFileView('tree')}
              type="button"
            >
              {t('drawer.treeView')}
            </button>
          </span>
        </div>
        <div>
          {fileView === 'path'
            ? files.map(f => <FileRow file={f} key={f.path} onOpen={f => $drawerView.set({ diff: f.path })} />)
            : rows.map((r, i) =>
                r.dir ? (
                  <div className="gg-file gg-file-dir" key={`d${i}`}>
                    <span className="gg-tree-indent" style={{ width: r.depth * 12 }} />
                    <Codicon name="folder" size="0.75rem" /> {r.dir}
                  </div>
                ) : (
                  <FileRow file={r.file} depth={r.depth} key={r.file.path} onOpen={f => $drawerView.set({ diff: f.path })} />
                ),
              )}
        </div>
      </>
    )
  }

  return (
    <div className="gg-drawer" style={{ width: 'var(--gg-drawer-w, 380px)' }}>
      <div className="gg-drawer-head">
        <span className="gg-drawer-title">
          {sha ? `${t('drawer.title')} ` : t('drawer.title')}
          {sha ? <span className="gg-sha"><bdi>{short(sha)}</bdi></span> : null}
        </span>
        {sha ? (
          <Tip label={copied ? t('drawer.copied') : t('drawer.copySha')}>
            <button
              className="gg-icon-btn"
              onClick={() =>
                copyText(sha).then(ok => {
                  if (ok !== false) {
                    setCopied(true)
                    setTimeout(() => setCopied(false), 1500)
                  }
                })
              }
              type="button"
            >
              <Codicon name={copied ? 'check' : 'copy'} size="0.8rem" />
            </button>
          </Tip>
        ) : null}
        <Tip label={t('drawer.close')}>
          <button className="gg-icon-btn" onClick={() => setDrawerOpen(false)} type="button">
            <Codicon name="chevron-right" size="0.8rem" />
          </button>
        </Tip>
      </div>
      <div className="gg-drawer-body">{body}</div>
    </div>
  )
}
