/**
 * Graph primitives: lane → color mapping, the per-row SVG slice, and the
 * windowing hook the page's virtualized list uses. Pure SVG — plain circles
 * for commits (rings for merges, an outer ring at HEAD), cubic curves for
 * lines changing lanes, no images.
 *
 * Lane colors reuse the SDK's PROFILE_SWATCHES (the app's twelve evenly
 * spaced identity hues, already tuned for both themes). Palette index 0 is
 * pinned to the 240° blue slot so the primary branch is always blue.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { PROFILE_SWATCHES } from '@hermes/plugin-sdk'

export const LANE_W = 14
export const ROW_H = 28
const PAD_X = 6

/** color index → CSS color. Index 0 lands on the 240° blue swatch. */
export const laneColor = i => PROFILE_SWATCHES[(i + 8) % PROFILE_SWATCHES.length]

export const graphWidth = maxLanes => PAD_X * 2 + Math.max(1, maxLanes) * LANE_W

const laneX = (lane, laneW) => PAD_X + lane * laneW + laneW / 2

export function GraphCell({ row, rowHeight = ROW_H, laneWidth = LANE_W, lanes, hasRefs = false, dotR }) {
  const w = PAD_X * 2 + Math.max(1, lanes) * laneWidth
  const mid = rowHeight / 2
  const color = laneColor(row.color)
  const x = l => laneX(l, laneWidth)

  const parts = []
  for (const e of row.edges) {
    const stroke = laneColor(e.color)
    if (e.type === 'pass') {
      parts.push(
        <line key={`p${e.lane}`} x1={x(e.lane)} y1={0} x2={x(e.lane)} y2={rowHeight} stroke={stroke} strokeWidth={2} />,
      )
    } else if (e.type === 'in') {
      const x1 = x(e.fromLane)
      const x2 = x(row.lane)
      parts.push(
        e.fromLane === row.lane
          ? <line key={`i${e.fromLane}`} x1={x1} y1={0} x2={x2} y2={mid} stroke={stroke} strokeWidth={2} />
          : <path key={`i${e.fromLane}`} d={`M ${x1} 0 C ${x1} ${mid}, ${x2} 0, ${x2} ${mid}`} stroke={stroke} strokeWidth={2} fill="none" />,
      )
    } else { // out
      const x1 = x(row.lane)
      const x2 = x(e.toLane)
      parts.push(
        e.toLane === row.lane
          ? <line key={`o${e.toLane}`} x1={x1} y1={mid} x2={x2} y2={rowHeight} stroke={stroke} strokeWidth={2} />
          : <path key={`o${e.toLane}`} d={`M ${x1} ${mid} C ${x1} ${rowHeight}, ${x2} ${mid}, ${x2} ${rowHeight}`} stroke={stroke} strokeWidth={2} fill="none" />,
      )
    }
  }

  const r = dotR ?? (rowHeight >= 28 ? 4.5 : 3.5)
  const dot = row.isMerge ? (
    <circle cx={x(row.lane)} cy={mid} r={r} fill="var(--ui-bg-editor)" stroke={color} strokeWidth={2} />
  ) : (
    <circle cx={x(row.lane)} cy={mid} r={r} fill={color} />
  )

  return (
    <svg className="gg-cell-graph" width={w} height={rowHeight} aria-hidden="true">
      {hasRefs ? (
        <line x1={0} y1={mid} x2={x(row.lane) - r - 2} y2={mid} stroke={color} strokeWidth={1} opacity={0.5} />
      ) : null}
      {parts}
      {dot}
      {row.isHead ? (
        <circle cx={x(row.lane)} cy={mid} r={r + 3} fill="none" stroke={color} strokeWidth={1.5} opacity={0.55} />
      ) : null}
    </svg>
  )
}

/**
 * Windowing over a fixed-row-height scroll container. Returns the visible row
 * range (+ overscan) and the props to spread on the scroll element. Calls
 * `onNearEnd` while the tail of the list is within `endPad` rows of view.
 */
export function useWindowing({ count, rowHeight, overscan = 10, endPad = 200, onNearEnd }) {
  const ref = useRef(null)
  const [view, setView] = useState({ top: 0, height: 600 })
  const onNearEndRef = useRef(onNearEnd)
  onNearEndRef.current = onNearEnd

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setView(v => ({ ...v, height: el.clientHeight })))
    ro.observe(el)
    setView({ top: el.scrollTop, height: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  const start = Math.max(0, Math.floor(view.top / rowHeight) - overscan)
  const end = Math.min(count, Math.ceil((view.top + view.height) / rowHeight) + overscan)

  useEffect(() => {
    if (count && end >= count - endPad) onNearEndRef.current?.()
  }, [count, end, endPad])

  const onScroll = useCallback(e => {
    setView(v => (v.top === e.currentTarget.scrollTop ? v : { ...v, top: e.currentTarget.scrollTop }))
  }, [])

  const scrollToRow = useCallback(i => {
    ref.current?.scrollTo({ top: Math.max(0, i * rowHeight - 120) })
  }, [rowHeight])

  return { ref, start, end, onScroll, scrollToRow, totalHeight: count * rowHeight }
}
