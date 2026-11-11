// SPDX-FileCopyrightText: 2026 Miguel Euraque
// SPDX-License-Identifier: MIT
/**
 * RefChips — the BRANCH/TAG column content for one commit row. Ordering:
 * current branch first (bold + check, tooltip notes it is HEAD), other local
 * branches, remotes (a remote `origin/x` sharing the row with local `x`
 * merges into that chip as a second icon), then tags. A
 * standalone HEAD chip appears only when HEAD is detached. `showRemotes`
 * hides remote-only chips; `max` caps rendered chips to `max` + "+N".
 */

import { Codicon, Tip } from '@hermes/plugin-sdk'

const ICON = { branch: 'git-branch', remote: 'cloud', tag: 'tag', head: 'git-commit' }

export function buildChips(refs, showRemotes) {
  const branches = refs.filter(r => r.type === 'branch')
  const current = branches.find(b => b.current)
  const detached = refs.some(r => r.type === 'head' && r.current) && !current
  const remotes = refs.filter(r => r.type === 'remote')
  const tags = refs.filter(r => r.type === 'tag')

  const chips = []
  if (detached) chips.push({ key: 'head', name: 'HEAD', icons: ['git-commit'], head: true })

  const ordered = current ? [current, ...branches.filter(b => b !== current)] : branches
  const localNames = new Set(ordered.map(b => b.name))
  const byLocal = new Map()

  for (const b of ordered) {
    const chip = { key: `b:${b.name}`, name: b.name, icons: ['git-branch'], current: Boolean(b.current) }
    chips.push(chip)
    byLocal.set(b.name, chip)
  }
  for (const r of remotes) {
    const local = r.name.split('/').slice(1).join('/')
    if (localNames.has(local)) {
      byLocal.get(local).icons.push('cloud')
    } else if (showRemotes) {
      chips.push({ key: `r:${r.name}`, name: r.name, icons: ['cloud'], remote: true })
    }
  }
  for (const tg of tags) chips.push({ key: `t:${tg.name}`, name: tg.name, icons: ['tag'], tag: true })
  return chips
}

export function RefChips({ refs, color, t, showRemotes = true, max = 3 }) {
  const chips = buildChips(refs, showRemotes)
  if (!chips.length) return null
  const shown = chips.slice(0, max)
  const rest = chips.slice(max)
  return (
    <>
      {shown.map(c => (
        <span
          className={`gg-chip${c.current ? ' gg-chip-current' : ''}${c.remote ? ' gg-chip-remote' : ''}`}
          key={c.key}
          style={{ '--gg-chip-color': color }}
          title={c.current ? t('chip.current', c.name) : c.name}
        >
          {c.icons.map(ic => (
            <Codicon key={ic} name={ic} size="0.7rem" />
          ))}
          <bdi className="gg-chip-name">{c.name}</bdi>
          {c.current ? <Codicon name="check" size="0.7rem" /> : null}
        </span>
      ))}
      {rest.length ? (
        <Tip label={rest.map(c => c.name).join(', ')}>
          <span className="gg-chip gg-chip-more">{t('refs.more', rest.length)}</span>
        </Tip>
      ) : null}
    </>
  )
}
