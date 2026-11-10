/**
 * Lane layout for the commit graph — pure, no React. Turns the API's
 * topo-ordered commit list (newest first) into per-row drawing instructions.
 *
 * Model: `active[lane] = { sha, color }` means a line occupies that lane
 * expecting `sha` as the next commit on it. `expect` maps a sha to the lanes
 * waiting for it, so lookups stay O(1). For each commit:
 *  - lanes expecting it converge: leftmost wins the dot, the rest emit an
 *    `in` edge and are freed;
 *  - no expectation → the commit is a branch tip: allocate the first free
 *    lane and a NEW color;
 *  - the first parent keeps the lane and color; each extra parent either
 *    merges into a lane already expecting it (`out` edge) or forks a new
 *    lane with a new color;
 *  - every other occupied lane emits a `pass` vertical.
 * A commit whose parent is past the pagination boundary keeps its lane
 * expecting that sha, so the line just continues when more pages load.
 *
 * The primary branch (first of main/master/trunk/develop found in refs, else
 * the current branch) is pinned: its first-parent chain always takes lane 0
 * with palette index 0, and lane 0 is never given to another line. Colors
 * travel with the line, not the lane — a freed lane's color goes back into
 * the LRU pool so concurrent lines always differ.
 *
 * Row edge vocabulary:
 *  - { type:'pass', lane, color }          full-height vertical
 *  - { type:'in',  fromLane, lane, color } top half into the dot
 *  - { type:'out', toLane,   lane, color } bottom half toward a parent lane
 */

const PALETTE_SIZE = 12

const cache = new WeakMap()

export function layoutGraph(commits, { primary } = {}) {
  if (cache.has(commits)) return cache.get(commits)
  const result = compute(commits, primary)
  cache.set(commits, result)
  return result
}

function resolvePrimary(commits) {
  const seen = new Set()
  let current = null
  for (const c of commits) {
    for (const r of c.refs ?? []) {
      if (r.type !== 'branch') continue
      seen.add(r.name)
      if (r.current && !current) current = r.name
    }
  }
  for (const name of ['main', 'master', 'trunk', 'develop']) {
    if (seen.has(name)) return name
  }
  return current
}

function compute(commits, primary) {
  const bySha = new Map(commits.map((c, i) => [c.sha, i]))

  // Primary chain: resolve the branch name, then walk first parents inside
  // the loaded window. Those shas are pinned to lane 0 / color 0.
  const primaryShas = new Set()
  const primaryName = primary ?? resolvePrimary(commits)
  if (primaryName) {
    let sha = commits.find(c =>
      c.refs?.some(r => r.type === 'branch' && r.name === primaryName)
    )?.sha
    for (let guard = 0; sha && guard <= commits.length; guard++) {
      const i = bySha.get(sha)
      if (i === undefined) break
      primaryShas.add(sha)
      sha = commits[i].parents?.[0]
    }
  }

  const active = []               // per lane: { sha, color } | null
  const expect = new Map()        // sha -> lanes[] waiting for it
  const colorCount = new Array(PALETTE_SIZE).fill(0)
  const lastUsed = new Array(PALETTE_SIZE).fill(0)
  let clock = 0

  const expectAdd = (sha, lane) => {
    const l = expect.get(sha)
    if (l) l.push(lane); else expect.set(sha, [lane])
  }
  const expectDel = (sha, lane) => {
    const l = expect.get(sha)
    if (!l) return
    const i = l.indexOf(lane)
    if (i >= 0) l.splice(i, 1)
    if (!l.length) expect.delete(sha)
  }

  const setActive = (lane, entry) => {
    const prev = active[lane]
    if (prev) {
      expectDel(prev.sha, lane)
      colorCount[prev.color]--
    }
    active[lane] = entry
    if (entry) {
      expectAdd(entry.sha, lane)
      colorCount[entry.color]++
    }
  }

  // Candidates keep index 0 (primary blue) and its two 30-degree neighbors out
  // of branch hands. ORDER spreads picks around the wheel so SEQUENTIAL
  // branches — the common case, where each starts with only lane 0 active —
  // still get clearly different colors instead of always the same hue.
  const CANDIDATES = [2, 3, 4, 5, 6, 7, 8, 9, 10]
  const ORDER = [6, 3, 9, 4, 8, 2, 10, 5, 7]
  const ringDist = (a, b) => Math.min(Math.abs(a - b), PALETTE_SIZE - Math.abs(a - b))

  const newColor = () => {
    // Active hues: every occupied lane's color, primary's 0 always included.
    const busy = [0]
    for (const e of active) if (e && !busy.includes(e.color)) busy.push(e.color)

    // Pick the candidate minimizing (lastUsed, position in ORDER): never-used
    // wins, ties walk the spread order so consecutive branches jump hues.
    const pick = minDist => {
      let best = -1
      for (const i of ORDER) {
        if (!CANDIDATES.includes(i) || colorCount[i]) continue
        let d = PALETTE_SIZE
        for (const b of busy) {
          const r = ringDist(i, b)
          if (r < d) d = r
        }
        if (d < minDist) continue
        if (best < 0 || lastUsed[i] < lastUsed[best]) best = i
      }
      return best
    }

    const lru = pool => {
      let best = -1
      for (const i of pool) if (best < 0 || lastUsed[i] < lastUsed[best]) best = i
      return best
    }

    let best = pick(2)
    if (best < 0) best = pick(1)
    if (best < 0) best = lru(ORDER.filter(i => !colorCount[i]))
    if (best < 0) best = lru(ORDER)
    lastUsed[best] = ++clock
    return best
  }

  const freeLane = () => {
    for (let l = 1; l < active.length; l++) if (!active[l]) return l
    if (!active.length) active.push(null)  // lane 0 stays reserved for primary
    active.push(null)
    return active.length - 1
  }

  const rows = []
  let maxLanes = 0

  for (const c of commits) {
    const isPrimary = primaryShas.has(c.sha)
    const expecting = (expect.get(c.sha) ?? []).filter(l => isPrimary || l > 0)
    const edges = []

    let lane
    if (isPrimary && !expecting.includes(0)) {
      lane = 0  // primary owns lane 0 even when nobody pointed at this commit
    } else if (expecting.length) {
      lane = expecting[0]
    } else {
      lane = isPrimary ? 0 : freeLane()
      if (!active[lane] || active[lane].sha !== c.sha) {
        setActive(lane, { sha: c.sha, color: isPrimary ? 0 : newColor() })
      }
    }
    const color = isPrimary ? 0 : (active[lane]?.color ?? newColor())

    const consumed = new Set([lane])

    // Converge: every other lane expecting this commit folds into the dot.
    for (const l of expecting) {
      if (l === lane) continue
      edges.push({ type: 'in', fromLane: l, lane, color: active[l].color })
      setActive(l, null)
      consumed.add(l)
    }
    // Own line arriving from above.
    if (expecting.includes(lane)) {
      edges.push({ type: 'in', fromLane: lane, lane, color })
    }

    // Outgoing: first parent keeps lane+color; extras merge or fork.
    const parents = c.parents ?? []
    if (parents.length) {
      setActive(lane, { sha: parents[0], color })
      edges.push({ type: 'out', toLane: lane, lane, color })
      for (const p of parents.slice(1)) {
        const pPrimary = primaryShas.has(p)
        let toLane
        if (pPrimary) {
          toLane = 0
        } else {
          const lanes = expect.get(p) ?? []
          toLane = lanes.find(l => l > 0)
          if (toLane === undefined) {
            toLane = freeLane()
            setActive(toLane, { sha: p, color: newColor() })
          }
        }
        edges.push({ type: 'out', toLane, lane, color: pPrimary ? 0 : active[toLane].color })
        consumed.add(toLane)
      }
    } else {
      setActive(lane, null)
    }

    // Pass-throughs for every line we didn't touch.
    for (let l = 0; l < active.length; l++) {
      if (active[l] && !consumed.has(l)) {
        edges.push({ type: 'pass', lane: l, color: active[l].color })
      }
    }

    while (active.length && !active[active.length - 1]) active.pop()
    maxLanes = Math.max(maxLanes, active.length)

    rows.push({
      lane,
      color,
      isMerge: parents.length > 1,
      isHead: Boolean(c.refs?.some(r => r.type === 'head' && r.current)),
      edges,
    })
  }

  return { rows, maxLanes }
}
