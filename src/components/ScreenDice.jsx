import { useLayoutEffect, useRef, useState } from 'react'

// Real 3D dice (CSS cubes), thrown onto the open middle of the board.
// - They land at random spots inside the middle (never on the property spaces, never on the card piles).
// - The throw comes from the side of the table where the roller sits: the dice come in high,
//   bounce three times (each lower), spin less and less, then roll to a stop showing the result.
// - They live in a flat layer over the tilted board (so the board can't cut through them); the board's
//   middle is measured on screen to know where its open area is. key={rollId} replays the throw.

const PIPS = { 1: [5], 2: [3, 7], 3: [3, 5, 7], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] }
// how to turn the cube so a number faces up
const UP = { 1: [0, 0], 2: [-90, 0], 3: [0, -90], 4: [0, 90], 5: [90, 0], 6: [0, 180] }
const THROW_MS = 1450

function Face({ n }) {
  return (
    <div className={`sface s${n}`}>
      {Array.from({ length: 9 }, (_, k) => (
        <span key={k} className={PIPS[n].includes(k + 1) ? 'spip' : 'spip off'} />
      ))}
    </div>
  )
}

// the same "random" numbers for the same roll, so the dice stay put when the screen redraws
function rnd(seed, n) {
  const x = Math.sin(seed * 9301 + n * 49297 + 0.5) * 233280
  return x - Math.floor(x)
}

// measure the open middle of the board (its four inner corners on screen), the card piles, and the roller's seat
function measure(area, roller) {
  const a = area.getBoundingClientRect()
  const center = (el) => {
    const r = el.getBoundingClientRect()
    return { x: r.left - a.left + r.width / 2, y: r.top - a.top + r.height / 2, w: r.width, h: r.height }
  }
  const marks = [...area.querySelectorAll('.dice-zone-mark')].sort((p, q) => p.dataset.k - q.dataset.k).map(center)
  if (marks.length !== 4) return null
  const piles = [...area.querySelectorAll('.deck-spot')].map(center)
  const seat = area.querySelector(`.seat-spot[data-seat="${roller}"]`)
  return { quad: marks, piles, seat: seat ? center(seat) : { x: a.width / 2, y: a.height }, w: a.width, h: a.height }
}

// a point in the middle area: u across (0 left, 1 right), v down (0 back, 1 front)
function at(quad, u, v) {
  const [tl, tr, br, bl] = quad
  const top = { x: tl.x + (tr.x - tl.x) * u, y: tl.y + (tr.y - tl.y) * u }
  const bot = { x: bl.x + (br.x - bl.x) * u, y: bl.y + (br.y - bl.y) * u }
  return { x: top.x + (bot.x - top.x) * v, y: top.y + (bot.y - top.y) * v }
}

// where the two dice end up, how big they look there, and where the throw starts
function plan(m, seed, count) {
  const [tl, tr, br, bl] = m.quad
  const width = (v) => (tr.x - tl.x) * (1 - v) + (br.x - bl.x) * v
  const base = Math.max(38, Math.min(72, width(0.5) * 0.1))
  const dice = []
  for (let i = 0; i < count; i++) {
    let best = null
    for (let tries = 0; tries < 40; tries++) {
      const u = 0.12 + rnd(seed, 10 + i * 50 + tries) * 0.76
      const v = 0.14 + rnd(seed, 30 + i * 50 + tries) * 0.72
      const p = at(m.quad, u, v)
      const size = base * (0.86 + 0.28 * v) // nearer the front looks bigger
      const clearPiles = m.piles.every((pile) => Math.abs(p.x - pile.x) > pile.w / 2 + size * 0.7 || Math.abs(p.y - pile.y) > pile.h / 2 + size * 0.7)
      const clearDice = dice.every((d) => Math.hypot(d.x - p.x, d.y - p.y) > (d.size + size) * 0.85)
      const clearMiddle = Math.hypot(p.x - (tl.x + br.x) / 2, (p.y - (tl.y + br.y) / 2) * 1.6) > base * 1.2 // the roll button sits in the very middle
      best = { ...p, size, u, v }
      if (clearPiles && clearDice && clearMiddle) break
    }
    dice.push(best)
  }
  // the throw comes from the roller's side: start in the air near that edge of the middle area
  const mid = { x: (dice[0].x + (dice[1] ?? dice[0]).x) / 2, y: (dice[0].y + (dice[1] ?? dice[0]).y) / 2 }
  let dx = m.seat.x - mid.x
  let dy = m.seat.y - mid.y
  const len = Math.hypot(dx, dy) || 1
  dx /= len
  dy /= len
  return dice.map((d, i) => {
    // how far we can go back towards the roller and still be over the middle area
    let reach = 0
    for (let t = 0; t < 1000; t += 6) {
      const x = d.x + dx * t
      const y = d.y + dy * t
      const inside = x > Math.min(tl.x, bl.x) + d.size * 0.6 && x < Math.max(tr.x, br.x) - d.size * 0.6 && y > tl.y + d.size * 0.5 && y < bl.y - d.size * 0.4
      if (!inside) break
      reach = t
    }
    const back = Math.max(d.size * 1.5, reach * 0.92)
    const side = (rnd(seed, 70 + i) - 0.5) * d.size * 1.2 // a slight sideways drift, different for each die
    return {
      ...d,
      sx: dx * back - dy * side,
      sy: dy * back + dx * side,
      curve: (rnd(seed, 80 + i) - 0.5) * d.size * 0.9,
      yaw: Math.round((rnd(seed, 90 + i) - 0.5) * 80),
      spinX: (rnd(seed, 2 + i) > 0.5 ? 1 : -1) * (720 + Math.round(rnd(seed, 4 + i) * 2) * 360),
      spinY: (rnd(seed, 6 + i) > 0.5 ? 1 : -1) * (360 + Math.round(rnd(seed, 8 + i) * 2) * 360),
      delay: i * 70,
    }
  })
}

export default function ScreenDice({ dice, seed = 0, onRoll, areaRef, roller = 0, hidden }) {
  const values = dice ?? [5, 3]
  const [m, setM] = useState(null)
  const refs = useRef([])
  const thrown = useRef(false)

  // measure the board (again after the window changes size, or when the view comes back from a zoom)
  useLayoutEffect(() => {
    if (hidden) return
    const go = () => areaRef.current && setM(measure(areaRef.current, roller))
    go()
    const again = [60, 250, 700].map((ms) => setTimeout(go, ms))
    window.addEventListener('resize', go)
    return () => {
      again.forEach(clearTimeout)
      window.removeEventListener('resize', go)
    }
  }, [areaRef, roller, hidden])

  const throwPlan = m ? plan(m, seed, values.length) : null

  // the throw (once per roll, the first time the dice can be placed)
  useLayoutEffect(() => {
    if (!throwPlan || !dice || thrown.current) return
    thrown.current = true
    throwPlan.forEach((d, i) => {
      const el = refs.current[i]
      if (!el) return
      const slot = el
      const hop = el.querySelector('.sdie-hop')
      const cube = el.querySelector('.sdie')
      const shadow = el.querySelector('.sdie-shadow')
      const [fx, fy] = UP[values[i]]
      const opts = { duration: THROW_MS, delay: d.delay, fill: 'backwards' }
      // along the ground: fast at first, slowing down; a little curve to the side
      const path = [0, 0.3, 0.5, 0.66, 0.8, 0.9, 1]
      const travel = [0, 0.5, 0.72, 0.86, 0.94, 0.98, 1]
      slot.animate(
        path.map((t, k) => {
          const left = 1 - travel[k]
          const bend = Math.sin(Math.PI * travel[k]) * d.curve
          return { offset: t, transform: `translate(${d.sx * left - (d.sy / (Math.hypot(d.sx, d.sy) || 1)) * bend}px, ${d.sy * left + (d.sx / (Math.hypot(d.sx, d.sy) || 1)) * bend}px)`, opacity: k === 0 ? 0 : 1 }
        }),
        { ...opts, easing: 'linear' },
      )
      // up and down: dropped in from high, three bounces, each lower
      const H = d.size
      hop.animate(
        [
          { offset: 0, transform: `translateY(${-H * 3.2}px)`, easing: 'cubic-bezier(.5, 0, 1, 1)' },
          { offset: 0.3, transform: 'translateY(0)', easing: 'cubic-bezier(0, 0, .5, 1)' },
          { offset: 0.41, transform: `translateY(${-H * 0.9}px)`, easing: 'cubic-bezier(.5, 0, 1, 1)' },
          { offset: 0.52, transform: 'translateY(0)', easing: 'cubic-bezier(0, 0, .5, 1)' },
          { offset: 0.6, transform: `translateY(${-H * 0.32}px)`, easing: 'cubic-bezier(.5, 0, 1, 1)' },
          { offset: 0.68, transform: 'translateY(0)', easing: 'cubic-bezier(0, 0, .5, 1)' },
          { offset: 0.73, transform: `translateY(${-H * 0.08}px)`, easing: 'cubic-bezier(.5, 0, 1, 1)' },
          { offset: 0.78, transform: 'translateY(0)' },
          { offset: 1, transform: 'translateY(0)' },
        ],
        opts,
      )
      // the spin slows with every bounce, then the die rolls over onto its final face
      const turn = (k) => `translateZ(${d.size / 2}px) rotateX(${fx + d.spinX * k}deg) rotateY(${fy + d.spinY * k}deg) rotateZ(0deg)`
      cube.animate(
        [
          { offset: 0, transform: turn(1) },
          { offset: 0.3, transform: turn(0.45) },
          { offset: 0.52, transform: turn(0.18) },
          { offset: 0.68, transform: turn(0.06) },
          { offset: 0.86, transform: turn(0.01) },
          { offset: 1, transform: turn(0) },
        ],
        { ...opts, easing: 'linear' },
      )
      // the shadow shrinks and fades while the die is high up
      shadow.animate(
        [
          { offset: 0, transform: 'scale(.35)', opacity: 0.15 },
          { offset: 0.3, transform: 'scale(1)', opacity: 1 },
          { offset: 0.41, transform: 'scale(.7)', opacity: 0.55 },
          { offset: 0.52, transform: 'scale(1)', opacity: 1 },
          { offset: 0.6, transform: 'scale(.88)', opacity: 0.8 },
          { offset: 0.68, transform: 'scale(1)', opacity: 1 },
          { offset: 1, transform: 'scale(1)', opacity: 1 },
        ],
        opts,
      )
    })
  })

  if (!throwPlan) return null
  return (
    <div className={`table-dice${hidden ? ' away' : ''}${onRoll ? ' can-roll' : ''}${!dice ? ' idle' : ''}${dice && dice[0] === dice[1] ? ' doubles' : ''}`}>
      {throwPlan.map((d, i) => {
        const [sx, sy] = UP[values[i]]
        return (
          <div
            key={i}
            ref={(el) => (refs.current[i] = el)}
            className="sdie-slot"
            style={{ left: d.x - d.size / 2, top: d.y - d.size / 2, '--size': `${d.size}px`, '--yaw': `${d.yaw}deg` }}
            onClick={onRoll ?? undefined}
            title={onRoll ? 'Roll the dice' : undefined}
          >
            <span className="sdie-shadow" />
            <div className="sdie-hop">
              <div className="sdie-view">
                <div className="sdie" style={{ '--sx': `${sx}deg`, '--sy': `${sy}deg` }}>
                  <div className="score" />
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <Face key={n} n={n} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export { THROW_MS }
