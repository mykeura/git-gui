// SPDX-FileCopyrightText: 2026 Miguel Euraque
// SPDX-License-Identifier: MIT
// Tests for the pure lane layout (desktop-src/lanes.js).

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { layoutGraph } from '../desktop-src/lanes.js'

let n = 0
const sha = () => `s${(n++).toString(36).padStart(4, '0')}`
const commit = (id, parents = [], refs = []) => ({ sha: id, parents, refs })
const branch = (name, current = false) => ({ name, type: 'branch', current })
const head = () => ({ name: 'HEAD', type: 'head', current: true })

const edgesOf = (row, type) => row.edges.filter(e => e.type === type)

test('linear history stays in lane 0', () => {
  const [a, b, c] = [sha(), sha(), sha()]
  const { rows, maxLanes } = layoutGraph([
    commit(c, [b], [branch('main', true), head()]),
    commit(b, [a]),
    commit(a, []),
  ])
  assert.equal(maxLanes, 1)
  assert.deepEqual(rows.map(r => r.lane), [0, 0, 0])
  assert.ok(rows.every(r => r.color === 0))
  assert.equal(rows[0].isHead, true)
  assert.equal(rows[2].isMerge, false)
  assert.deepEqual(edgesOf(rows[2], 'out'), [])
})

test('feature branch merged --no-ff converges back', () => {
  // topo: merge(m) -> f2 -> f1 -> base ; m parents [base2, f2]
  const [m, b2, f2, f1, b1] = [sha(), sha(), sha(), sha(), sha()]
  const { rows, maxLanes } = layoutGraph([
    commit(m, [b2, f2], [branch('main', true), head()]),
    commit(b2, [b1]),
    commit(f2, [f1]),
    commit(f1, [b1]),
    commit(b1, []),
  ])
  // merge row forks a lane for second parent f2
  const mergeOut = edgesOf(rows[0], 'out')
  assert.equal(rows[0].lane, 0)
  assert.ok(mergeOut.some(e => e.toLane !== 0), 'merge emits out edge to the feature lane')
  // feature tip sits in its own lane with a non-zero color
  const f2row = rows[2]
  assert.notEqual(f2row.lane, 0)
  assert.notEqual(f2row.color, 0)
  // the merge base row converges the feature lane back into lane 0
  const baseRow = rows[4]
  const ins = edgesOf(baseRow, 'in')
  assert.ok(ins.some(e => e.fromLane !== baseRow.lane), 'feature line converges into the base lane')
  assert.equal(baseRow.lane, 0)
  assert.equal(maxLanes, 2)
})

test('two concurrent tips get distinct lanes and colors', () => {
  const [a1, a2, b1, b2, base] = [sha(), sha(), sha(), sha(), sha()]
  const { rows } = layoutGraph([
    commit(a1, [a2], [branch('main', true)]),
    commit(b1, [b2], [branch('other')]),
    commit(a2, [base]),
    commit(b2, [base]),
    commit(base, []),
  ])
  assert.equal(rows[0].lane, 0)
  assert.equal(rows[1].lane, 1)
  assert.notEqual(rows[0].color, rows[1].color)
  // once both lines exist they pass through each other's rows
  assert.ok(edgesOf(rows[1], 'pass').some(e => e.lane === 0))
  assert.ok(edgesOf(rows[2], 'pass').some(e => e.lane === 1))
})

test('primary chain pinned to lane 0 even when a side tip is newer', () => {
  // topo puts a newer side tip first, but main's chain must stay lane 0.
  const [tip, m1, m0] = [sha(), sha(), sha()]
  const { rows } = layoutGraph([
    commit(tip, [m0], [branch('side')]),   // newer, not primary
    commit(m1, [m0], [branch('main', true), head()]),
    commit(m0, []),
  ])
  assert.equal(rows[1].lane, 0)
  assert.equal(rows[1].color, 0)
  assert.equal(rows[0].lane, 1)
  assert.notEqual(rows[0].color, 0)
})

test('lane is reused after a branch ends', () => {
  // b1 branch merges into main at m, so its lane frees; later branch c reuses it.
  const [m2, c1, m1, m0, b1] = [sha(), sha(), sha(), sha(), sha()]
  const { rows } = layoutGraph([
    commit(m2, [m1, c1], [branch('main', true)]),
    commit(c1, [m0]),
    commit(m1, [m0, b1]),
    commit(b1, [m0]),
    commit(m0, []),
  ])
  // two side lines (c1 forked by m2, b1 forked by m1) coexist in lanes 1 and 2
  // with different colors, then both converge into the shared base m0.
  assert.ok(rows.every(r => r.lane <= 2), 'no lane beyond 2 needed')
  assert.notEqual(rows[1].color, rows[3].color)
  const baseIns = edgesOf(rows[4], 'in')
  assert.ok(baseIns.length >= 2, 'both side lanes converge into the base row')
})

test('octopus merge emits an out edge per extra parent', () => {
  const [m, p1, p2, p3, base] = [sha(), sha(), sha(), sha(), sha()]
  const { rows } = layoutGraph([
    commit(m, [p1, p2, p3], [branch('main', true)]),
    commit(p1, [base]),
    commit(p2, [base]),
    commit(p3, [base]),
    commit(base, []),
  ])
  assert.equal(rows[0].isMerge, true)
  const outs = edgesOf(rows[0], 'out')
  assert.equal(outs.length, 3)
  assert.deepEqual(new Set(outs.map(e => e.toLane)).size, 3)
  const colors = new Set([rows[1].color, rows[2].color, rows[3].color])
  assert.equal(colors.size, 3)
})

test('pagination boundary keeps the lane expecting the missing parent', () => {
  const [a, b] = [sha(), 'missing-sha']
  const { rows } = layoutGraph([commit(a, [b], [branch('main', true)])])
  assert.deepEqual(edgesOf(rows[0], 'out'), [{ type: 'out', toLane: 0, lane: 0, color: 0 }])
})

test('5k commits layout under 100 ms', () => {
  // A realistic DAG: main chain with ~500 short-lived side branches of ~5
  // commits each, merged back with --no-ff merge commits.
  const commits = []
  let mainTip = 'root'
  commits.push({ sha: 'root', parents: [], refs: [] })
  for (let b = 0; b < 500; b++) {
    const base = mainTip
    let side = base
    const sideShas = []
    for (let k = 0; k < 5; k++) {
      side = `b${b}x${k}`
      commits.push({ sha: side, parents: [side === `b${b}x0` ? base : sideShas[k - 1]], refs: [] })
      sideShas.push(side)
    }
    mainTip = `b${b}m1`
    commits.push({ sha: mainTip, parents: [base], refs: [] })
    const merge = `b${b}m2`
    commits.push({ sha: merge, parents: [mainTip, side], refs: [] })
    mainTip = merge
  }
  const need = 5000 - commits.length
  for (let i = 0; i < need; i++) {
    const id = `lin${i}`
    commits.push({ sha: id, parents: [mainTip], refs: i === 0 ? [branch('main', true), head()] : [] })
    mainTip = id
  }
  commits.reverse()
  const t0 = performance.now()
  const { rows, maxLanes } = layoutGraph(commits)
  const ms = performance.now() - t0
  assert.equal(rows.length, 5000)
  assert.ok(maxLanes <= 8, `maxLanes ${maxLanes} unexpectedly high`)
  assert.ok(ms < 100, `layout took ${ms.toFixed(1)} ms`)
})

test('4 concurrent branches get colors >= 2 indexes apart, none near blue', () => {
  const base = sha()
  const [a, b, c, d] = [sha(), sha(), sha(), sha()]
  const { rows } = layoutGraph([
    commit(a, [base], [branch('main', true), head()]),
    commit(b, [base], [branch('b')]),
    commit(c, [base], [branch('c')]),
    commit(d, [base], [branch('d')]),
    commit(base, []),
  ])
  const colors = rows.slice(1, 4).map(r => r.color)
  const ring = (x, y) => Math.min(Math.abs(x - y), 12 - Math.abs(x - y))
  for (const col of colors) assert.ok(ring(col, 0) >= 2, `${col} too close to primary`)
  for (let i = 0; i < colors.length; i++)
    for (let j = i + 1; j < colors.length; j++)
      assert.ok(ring(colors[i], colors[j]) >= 2, `${colors[i]} vs ${colors[j]} adjacent`)
})

test('sequential branches each get a different, well-spread color', () => {
  // Each branch is fully merged into main before the next one starts.
  // Topo order, newest first: main ref sits on the last merge.
  const commits = []
  let prev = 'base'
  for (let b = 0; b < 5; b++) {
    commits.unshift(commit(`m${b}`, [prev, `t${b}`], b === 4 ? [branch('main', true)] : []))
    commits.unshift(commit(`t${b}`, [prev], [branch(`b${b}`)]))
    prev = `m${b}`
  }
  commits.push(commit('base', []))
  commits.reverse()
  const { rows } = layoutGraph(commits)
  const tipColors = rows.filter(r => !r.isMerge && r.color !== 0).map(r => r.color)
  assert.equal(new Set(tipColors).size, 5, `colors: ${tipColors}`)
  const ring = (x, y) => Math.min(Math.abs(x - y), 12 - Math.abs(x - y))
  for (let i = 1; i < tipColors.length; i++)
    assert.ok(ring(tipColors[i], tipColors[i - 1]) >= 2, `${tipColors}`)
})

test('first three new colors follow the spread order 6, 3, 9', () => {
  const base = sha()
  const { rows } = layoutGraph([
    commit(sha(), [base], [branch('main', true)]),
    commit(sha(), [base]),
    commit(sha(), [base]),
    commit(sha(), [base]),
    commit(base, []),
  ])
  assert.deepEqual(rows.slice(1, 4).map(r => r.color), [6, 3, 9])
})
