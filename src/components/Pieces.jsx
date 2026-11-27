import { useId } from 'react'

// Player pieces: everyday objects drawn as little silver "metal" figures (our own drawings).
// Each one is a set of SVG shapes in a 64x64 box; the metal shading is added by <PieceIcon>.
export const PIECES = [
  {
    id: 'car',
    name: 'Car',
    draw: (
      <>
        <path d="M5 41 L8 33 Q9 31 12 31 L22 30 L29 22 Q30 21 32 21 L44 21 Q46 21 47 23 L51 30 L57 32 Q60 33 60 36 L60 41 Z" />
        <path className="dark" d="M31.5 24.5 L43.5 24.5 L46.5 30 L27.5 30 Z" />
        <circle cx="18" cy="42" r="6.5" className="dark" />
        <circle cx="48" cy="42" r="6.5" className="dark" />
        <circle cx="18" cy="42" r="2.6" />
        <circle cx="48" cy="42" r="2.6" />
      </>
    ),
  },
  {
    id: 'hat',
    name: 'Top hat',
    draw: (
      <>
        <ellipse cx="32" cy="50" rx="25" ry="6.5" />
        <path d="M18 49 L20 15 Q32 10 44 15 L46 49 Q32 53 18 49 Z" />
        <ellipse cx="32" cy="15" rx="12" ry="3.6" />
        <path className="dark" d="M19.1 37 Q32 40 44.9 37 L45.4 44 Q32 47.5 18.6 44 Z" />
      </>
    ),
  },
  {
    id: 'dog',
    name: 'Dog',
    draw: (
      <>
        <path d="M10 46 L10 31 Q10 26 15 26 L38 26 L41 18 Q42 13 47 13 L50 13 L53 9 L55 15 L58 19 L60 25 Q60 28 57 28 L51 29 L49 33 L49 46 Q49 48 47 48 L44 48 L44 38 L19 38 L18 48 L13 48 Q10 48 10 46 Z" />
        <path d="M10 31 L4 21 Q3 19 5 18 L7 18 L13 27 Z" />
        <circle cx="50" cy="19" r="1.8" className="dark" />
        <path className="dark" d="M58.5 23.5 L61 24.5 L60 27 Z" />
      </>
    ),
  },
  {
    id: 'ship',
    name: 'Ship',
    draw: (
      <>
        <path d="M3 40 L61 40 L54 52 Q53 53 51 53 L12 53 Q10 53 9.5 52 Z" />
        <rect x="16" y="30" width="30" height="10" rx="1.5" />
        <rect x="35" y="17" width="8" height="13" rx="1" />
        <rect className="dark" x="35" y="17" width="8" height="3.5" />
        <path d="M22.5 30 L22.5 12 L24.5 12 L24.5 30 Z" />
        <circle cx="21" cy="35" r="1.8" className="dark" />
        <circle cx="27" cy="35" r="1.8" className="dark" />
        <circle cx="33" cy="35" r="1.8" className="dark" />
        <path className="dark" d="M7 45 L57 45 L56 47 L8 47 Z" />
      </>
    ),
  },
  {
    id: 'boot',
    name: 'Boot',
    draw: (
      <>
        <path d="M20 7 L37 7 L37 35 Q37 39 41 40 L53 43 Q60 45 60 51 L60 53 L13 53 L13 47 Q19 44 20 38 Z" />
        <path className="dark" d="M13 52 L60 52 L60 57 Q60 58 59 58 L14 58 Q13 58 13 57 Z" />
        <path className="dark" d="M19 7 L38 7 L38 11 L19 11 Z" />
        <path className="lace" d="M27 15 L33 19 M27 21 L33 25 M27 27 L33 31" />
      </>
    ),
  },
  {
    id: 'barrow',
    name: 'Wheelbarrow',
    draw: (
      <>
        <path d="M8 20 L46 20 Q48 20 47 22 L41 37 Q40 38 38 38 L18 38 Q16 38 15 37 Z" />
        <path d="M44 25 L60 18 L61 21 L45 29 Z" />
        <path d="M36 37 L40 52 L37 52 L33 38 Z" />
        <circle cx="16" cy="47" r="8" className="dark" />
        <circle cx="16" cy="47" r="3" />
      </>
    ),
  },
  {
    id: 'thimble',
    name: 'Thimble',
    draw: (
      <>
        <path d="M17 52 L21 17 Q32 7 43 17 L47 52 Z" />
        <rect x="14" y="49" width="36" height="8" rx="3" />
        {[0, 1, 2, 3].flatMap((r) =>
          [0, 1, 2, 3].map((c) => <circle key={`${r}-${c}`} className="dark" cx={24.5 + c * 5 - r * 0.6 + r * 0.6} cy={22 + r * 7} r="1.4" />),
        )}
      </>
    ),
  },
  {
    id: 'iron',
    name: 'Iron',
    draw: (
      <>
        <path d="M5 49 Q8 31 29 29 L55 29 Q59 29 59 34 L59 49 Z" />
        <path className="dark" d="M5 49 L59 49 L59 53 Q59 54 58 54 L5 54 Z" />
        <path d="M23 29 Q23 14 34 14 L51 14 Q55 14 55 18 L55 29 L49 29 L49 20 L33 20 Q29 20 29 29 Z" />
        <circle cx="38" cy="39" r="2.5" className="dark" />
      </>
    ),
  },
]

export const pieceById = (id) => PIECES.find((p) => p.id === id) ?? PIECES[0]

// mix a #rrggbb colour towards another colour (t = 0..1)
function mix(hex, to, t) {
  const a = hex.replace('#', '')
  const b = to.replace('#', '')
  const ch = (h, i) => parseInt(h.slice(i, i + 2), 16)
  const out = [0, 2, 4].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t))
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

// the shades of a metal piece: silver when there's no colour, otherwise cast in the player's colour
export function metalShades(color) {
  if (!color) return { hi: '#ffffff', light: '#d9dee6', mid: '#97a3b6', shine: '#e6eaf0', low: '#8a96a8', line: '#334155', side: '#5b6b82', sideLine: '#3b4a5f', back: '#334155' }
  return {
    hi: mix(color, '#ffffff', 0.8),
    light: mix(color, '#ffffff', 0.4),
    mid: color,
    shine: mix(color, '#ffffff', 0.55),
    low: mix(color, '#000000', 0.3),
    line: mix(color, '#000000', 0.72),
    side: mix(color, '#000000', 0.42),
    sideLine: mix(color, '#000000', 0.6),
    back: mix(color, '#000000', 0.62),
  }
}

// a piece drawn as shiny metal in the player's colour (silver if no colour is given)
export function PieceIcon({ id, color, size }) {
  const uid = useId().replace(/:/g, '')
  const piece = pieceById(id)
  const m = metalShades(color)
  return (
    <svg className="piece" viewBox="0 0 64 64" width={size} height={size} aria-label={piece.name} role="img">
      <defs>
        <linearGradient id={`m${uid}`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor={m.hi} />
          <stop offset=".35" stopColor={m.light} />
          <stop offset=".6" stopColor={m.mid} />
          <stop offset=".85" stopColor={m.shine} />
          <stop offset="1" stopColor={m.low} />
        </linearGradient>
      </defs>
      <g className="metal" fill={`url(#m${uid})`} stroke={m.line} strokeWidth="2" strokeLinejoin="round">
        {piece.draw}
      </g>
    </svg>
  )
}

// A piece with real thickness: the same shape stacked in thin layers, front to back, like a cast metal token.
// The front layer is the shiny face; the layers behind it are the darker metal you see on the sides.
const LAYERS = 7
export function Piece3D({ id, color }) {
  const m = metalShades(color)
  return (
    <span className="piece3d-body" style={{ '--side': m.side, '--side-line': m.sideLine, '--back': m.back, '--line': m.line }}>
      {Array.from({ length: LAYERS }, (_, i) => (
        <span key={i} className={`piece-layer${i === 0 ? ' front' : i === LAYERS - 1 ? ' back' : ' side'}`} style={{ '--z': i }}>
          <PieceIcon id={id} color={color} />
        </span>
      ))}
    </span>
  )
}
