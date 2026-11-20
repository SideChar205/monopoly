import { useEffect, useState } from 'react'
// Two real 3D dice (CSS cubes). key={rollId} on the parent replays the tumble for every roll.
const PIPS = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
}

// which way to turn the cube so a given face points at you
const SHOW = {
  1: 'rotateX(0deg) rotateY(0deg)',
  2: 'rotateX(-90deg) rotateY(0deg)',
  3: 'rotateY(-90deg) rotateX(0deg)',
  4: 'rotateY(90deg) rotateX(0deg)',
  5: 'rotateX(90deg) rotateY(0deg)',
  6: 'rotateY(180deg) rotateX(0deg)',
}

function Face({ n }) {
  return (
    <div className={`die-face f${n}`}>
      {Array.from({ length: 9 }, (_, k) => (
        <span key={k} className={PIPS[n].includes(k + 1) ? 'pip' : 'pip off'} />
      ))}
    </div>
  )
}

function Die({ value, spin }) {
  return (
    <div className="die3d-wrap">
      <div className="die3d" style={{ '--show': SHOW[value], '--spin': spin }}>
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <Face key={n} n={n} />
        ))}
      </div>
      <div className="die-shadow" />
    </div>
  )
}

export default function Dice({ dice }) {
  const [a, b] = dice ?? [5, 2]
  return (
    <div className={`dice3d${dice ? ' rolled' : ' idle'}${dice && a === b ? ' doubles' : ''}`}>
      <Die value={a} spin="720deg" />
      <Die value={b} spin="-720deg" />
    </div>
  )
}

// The dice thrown onto the board: two cubes lying on the board, the rolled number on top.
// They fly in from the front edge, bounce and tumble, then settle. key={rollId} replays the throw.
// ---------------- dice on the board ----------------
// Each die is one solid drawing of a cube (top face + two side faces), so it always looks solid.
// While it tumbles the faces flicker through random numbers, then it lands showing the roll on top.

const PIP_SPOTS = { 1: [[.5, .5]], 2: [[.27, .27], [.73, .73]], 3: [[.27, .27], [.5, .5], [.73, .73]], 4: [[.27, .27], [.73, .27], [.27, .73], [.73, .73]], 5: [[.27, .27], [.73, .27], [.5, .5], [.27, .73], [.73, .73]], 6: [[.27, .25], [.73, .25], [.27, .5], [.73, .5], [.27, .75], [.73, .75]] }
// each face drawn on a cube side: the unit square mapped onto the side
const FACES = {
  top: 'matrix(42 -22 42 22 8 30)',
  left: 'matrix(42 22 0 44 8 30)',
  right: 'matrix(42 -22 0 44 50 52)',
}
// two numbers that sit next to `top` on a real die (opposite faces add up to 7)
function sidesFor(top, salt) {
  const around = [1, 2, 3, 4, 5, 6].filter((n) => n !== top && n !== 7 - top)
  const a = around[salt % around.length]
  const b = around.find((n) => n !== a && n !== 7 - a)
  return [a, b]
}

function DieFace({ n, where, fill }) {
  return (
    <g transform={FACES[where]}>
      <rect x="0" y="0" width="1" height="1" rx=".14" fill={fill} stroke="#94a3b8" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      {PIP_SPOTS[n].map(([x, y], k) => (
        <circle key={k} cx={x} cy={y} r={n === 1 ? .12 : .095} fill={where === 'top' ? '#111827' : '#1f2937'} />
      ))}
    </g>
  )
}

function DieDrawing({ top, salt }) {
  const [l, r] = sidesFor(top, salt)
  return (
    <svg className="die-svg" viewBox="0 0 100 100">
      <DieFace n={l} where="left" fill="#e2e8f0" />
      <DieFace n={r} where="right" fill="#cbd5e1" />
      <DieFace n={top} where="top" fill="#ffffff" />
    </svg>
  )
}

const rand6 = () => 1 + Math.floor(Math.random() * 6)

function throwFrom(seed) {
  const r = (n) => {
    const x = Math.sin(seed * 9301 + n * 49297) * 233280
    return x - Math.floor(x)
  }
  const angle = r(1) * Math.PI * 2
  return {
    '--fx': `${Math.round(Math.cos(angle) * 260)}px`,
    '--fy': `${Math.round(Math.sin(angle) * 140) - 60}px`,
    '--spin0': `${Math.round((r(2) - .5) * 1080)}deg`,
    '--land': `${Math.round((r(3) - .5) * 30)}deg`,
  }
}

export function BoardDice({ dice, seed = 0, onRoll }) {
  const values = dice ?? [5, 3]
  const [shown, setShown] = useState(() => (dice ? [rand6(), rand6()] : values))
  const [tumbling, setTumbling] = useState(!!dice)
  useEffect(() => {
    if (!dice) return
    const flicker = setInterval(() => setShown([rand6(), rand6()]), 90)
    const land = setTimeout(() => {
      clearInterval(flicker)
      setShown(dice)
      setTumbling(false)
    }, 820)
    return () => {
      clearInterval(flicker)
      clearTimeout(land)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const doubles = dice && !tumbling && dice[0] === dice[1]
  return (
    <div
      className={`board-dice2${dice ? ' rolled' : ''}${doubles ? ' doubles' : ''}${onRoll ? ' can-roll' : ''}`}
      style={throwFrom(seed)}
      onClick={onRoll ?? undefined}
      aria-label={dice ? `Rolled ${dice[0]} and ${dice[1]}` : undefined}
    >
      {shown.map((v, i) => (
        <div key={i} className="die2" style={{ '--i': i }}>
          <span className="die2-shadow" />
          <span className="die2-body">
            <DieDrawing top={v} salt={seed + i} />
          </span>
        </div>
      ))}
    </div>
  )
}
