// Little drawings for the board spaces (our own art, drawn in SVG so they look the same in every browser)

const Svg = ({ children, className = '', view = '0 0 64 64' }) => (
  <svg className={`art ${className}`} viewBox={view} aria-hidden="true">
    {children}
  </svg>
)

export const Train = () => (
  <Svg>
    <g stroke="#111" strokeWidth="2" strokeLinejoin="round">
      <rect x="8" y="22" width="30" height="20" rx="2" fill="#1f2937" />
      <rect x="36" y="14" width="18" height="28" rx="2" fill="#111827" />
      <rect x="40" y="18" width="10" height="9" rx="1" fill="#fde68a" />
      <rect x="13" y="12" width="7" height="10" fill="#374151" />
      <path d="M4 42 L58 42 L58 46 L4 46 Z" fill="#6b7280" />
      <path d="M4 34 L8 34 L8 42 L2 42 Z" fill="#9ca3af" />
    </g>
    <g fill="#111" stroke="#9ca3af" strokeWidth="2">
      <circle cx="16" cy="50" r="6" />
      <circle cx="30" cy="50" r="6" />
      <circle cx="46" cy="50" r="7" />
    </g>
    <path d="M16 12 Q12 6 18 4 Q22 2 24 6" fill="none" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
  </Svg>
)

export const Bulb = () => (
  <Svg>
    <g stroke="#78350f" strokeWidth="2" strokeLinejoin="round">
      <path d="M32 6 Q48 6 48 23 Q48 31 41 37 Q39 39 39 43 L25 43 Q25 39 23 37 Q16 31 16 23 Q16 6 32 6 Z" fill="#fde047" />
      <rect x="24" y="43" width="16" height="11" rx="2" fill="#a8a29e" />
      <path d="M24 47 L40 47 M24 51 L40 51" />
      <path d="M28 58 L36 58" strokeWidth="3" strokeLinecap="round" />
    </g>
    <path d="M27 30 L30 22 L34 30 L37 22" fill="none" stroke="#b45309" strokeWidth="2" />
    <g stroke="#facc15" strokeWidth="3" strokeLinecap="round">
      <path d="M8 14 L4 11 M56 14 L60 11 M6 26 L1 26 M58 26 L63 26" />
    </g>
  </Svg>
)

export const Tap = () => (
  <Svg>
    <g stroke="#1e3a8a" strokeWidth="2" strokeLinejoin="round">
      <rect x="4" y="18" width="12" height="16" rx="2" fill="#94a3b8" />
      <path d="M16 20 L42 20 Q50 20 50 28 L50 36 L42 36 L42 30 Q42 28 40 28 L16 28 Z" fill="#cbd5e1" />
      <rect x="26" y="10" width="6" height="10" fill="#94a3b8" />
      <rect x="18" y="6" width="22" height="5" rx="2.5" fill="#3b82f6" />
    </g>
    <path d="M46 42 Q42 50 46 54 Q50 50 46 42 Z" fill="#38bdf8" stroke="#0369a1" strokeWidth="1.5" />
    <path d="M46 57 Q44 61 46 63 Q48 61 46 57 Z" fill="#38bdf8" />
  </Svg>
)

export const Chest = () => (
  <Svg>
    <g stroke="#1e3a8a" strokeWidth="2" strokeLinejoin="round">
      <path d="M8 26 Q8 12 32 12 Q56 12 56 26 Z" fill="#3b82f6" />
      <rect x="8" y="26" width="48" height="26" rx="2" fill="#2563eb" />
      <path d="M8 34 L56 34" />
      <rect x="18" y="12" width="6" height="40" fill="#fbbf24" />
      <rect x="40" y="12" width="6" height="40" fill="#fbbf24" />
      <rect x="28" y="28" width="8" height="10" rx="1.5" fill="#fde68a" />
    </g>
    <circle cx="32" cy="33" r="1.5" fill="#1e3a8a" />
  </Svg>
)

export const Question = () => (
  <Svg>
    <text x="32" y="52" textAnchor="middle" fontSize="54" fontWeight="900" fontFamily="Georgia, 'Times New Roman', serif" fill="#ea580c" stroke="#7c2d12" strokeWidth="2">
      ?
    </text>
  </Svg>
)

export const Ring = () => (
  <Svg>
    <circle cx="32" cy="40" r="15" fill="none" stroke="#d97706" strokeWidth="6" />
    <circle cx="32" cy="40" r="15" fill="none" stroke="#fde68a" strokeWidth="2" />
    <path d="M22 18 L32 8 L42 18 L32 28 Z" fill="#bae6fd" stroke="#0369a1" strokeWidth="2" strokeLinejoin="round" />
    <path d="M22 18 L42 18 M32 8 L28 18 L32 28 L36 18 Z" fill="none" stroke="#0369a1" strokeWidth="1.2" />
    <path d="M45 6 L47 10 M50 12 L54 11" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
  </Svg>
)

export const Coins = () => (
  <Svg>
    <g stroke="#92400e" strokeWidth="2">
      <ellipse cx="24" cy="48" rx="16" ry="5" fill="#fbbf24" />
      <path d="M8 40 L8 48 Q24 56 40 48 L40 40" fill="#f59e0b" />
      <ellipse cx="24" cy="40" rx="16" ry="5" fill="#fcd34d" />
      <path d="M8 32 L8 40 Q24 48 40 40 L40 32" fill="#f59e0b" />
      <ellipse cx="24" cy="32" rx="16" ry="5" fill="#fde68a" />
    </g>
    <path d="M44 10 L60 10 L60 30 L44 30 Z" fill="#fff" stroke="#475569" strokeWidth="2" />
    <path d="M47 15 L57 15 M47 20 L57 20 M47 25 L53 25" stroke="#94a3b8" strokeWidth="2" />
  </Svg>
)

// ---- corners ----
export const StartArrow = () => (
  <Svg view="0 0 100 40" className="wide">
    <path d="M96 12 L36 12 L36 2 L4 20 L36 38 L36 28 L96 28 Z" fill="#dc2626" stroke="#7f1d1d" strokeWidth="2.5" strokeLinejoin="round" />
  </Svg>
)

export const Bars = () => (
  <Svg view="0 0 64 64" className="bars">
    <rect x="2" y="2" width="60" height="60" fill="#fb923c" stroke="#111" strokeWidth="3" />
    <rect x="12" y="14" width="40" height="38" fill="#fde68a" />
    <circle cx="32" cy="30" r="9" fill="#e5e7eb" stroke="#111" strokeWidth="2" />
    <path d="M27 29 L30 29 M34 29 L37 29 M28 35 Q32 33 36 35" stroke="#111" strokeWidth="2" strokeLinecap="round" />
    <path d="M18 52 Q18 40 32 40 Q46 40 46 52 Z" fill="#94a3b8" stroke="#111" strokeWidth="2" />
    <path d="M18 44 L46 44 M18 48 L46 48" stroke="#111" strokeWidth="1.5" />
    <g stroke="#111" strokeWidth="3.5">
      <path d="M17 14 L17 52 M25 14 L25 52 M33 14 L33 52 M41 14 L41 52 M49 14 L49 52" />
    </g>
  </Svg>
)

export const Park = () => (
  <Svg>
    <circle cx="20" cy="22" r="13" fill="#22c55e" stroke="#14532d" strokeWidth="2" />
    <rect x="18" y="32" width="4" height="14" fill="#92400e" />
    <circle cx="46" cy="28" r="9" fill="#4ade80" stroke="#14532d" strokeWidth="2" />
    <rect x="44.5" y="35" width="3" height="11" fill="#92400e" />
    <g stroke="#78350f" strokeWidth="2" strokeLinejoin="round">
      <rect x="10" y="44" width="44" height="5" rx="1" fill="#d97706" />
      <rect x="10" y="38" width="44" height="4" rx="1" fill="#f59e0b" />
      <path d="M14 49 L14 57 M50 49 L50 57" strokeWidth="3" />
    </g>
  </Svg>
)

export const Police = () => (
  <Svg>
    <g stroke="#0c1a3a" strokeWidth="2" strokeLinejoin="round">
      <path d="M8 30 Q8 12 32 10 Q56 12 56 30 Z" fill="#1e3a8a" />
      <path d="M6 30 L58 30 L54 38 L10 38 Z" fill="#111827" />
      <path d="M32 14 L35 20 L41 20 L36 24 L38 30 L32 26 L26 30 L28 24 L23 20 L29 20 Z" fill="#fbbf24" />
    </g>
    <path d="M12 46 L44 46" stroke="#111" strokeWidth="4" strokeLinecap="round" />
    <path d="M40 40 L52 46 L40 52" fill="none" stroke="#111" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
)

export const SPACE_ART = { station: Train, fortune: Question, fund: Chest, rest: Park, gotojail: Police }
export const UTILITY_ART = { 'Power Company': Bulb, 'Water Company': Tap }
export const TAX_ART = { 'Income Tax': Coins, 'Luxury Tax': Ring }

// ---- 3D building models that stand on the streets ----
export const HouseModel = () => (
  <svg className="model house-model" viewBox="0 0 40 44" aria-hidden="true">
    <path d="M26 20 L38 14 L38 34 L26 40 Z" fill="#15803d" stroke="#052e16" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M4 20 L26 20 L26 40 L4 40 Z" fill="#22c55e" stroke="#052e16" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M2 21 L15 6 L28 21 Z" fill="#166534" stroke="#052e16" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M15 6 L27 1 L40 15 L28 21 Z" fill="#14532d" stroke="#052e16" strokeWidth="1.2" strokeLinejoin="round" />
    <rect x="12" y="29" width="6" height="11" fill="#7c2d12" stroke="#052e16" strokeWidth="1" />
    <rect x="7" y="24" width="4.5" height="4.5" fill="#fef9c3" stroke="#052e16" strokeWidth=".8" />
    <rect x="19.5" y="24" width="4.5" height="4.5" fill="#fef9c3" stroke="#052e16" strokeWidth=".8" />
    <path d="M30 22 L35 19.5 L35 24.5 L30 27 Z" fill="#fef9c3" stroke="#052e16" strokeWidth=".8" />
  </svg>
)

export const HotelModel = () => (
  <svg className="model hotel-model" viewBox="0 0 64 48" aria-hidden="true">
    <path d="M46 12 L60 6 L60 38 L46 44 Z" fill="#b91c1c" stroke="#450a0a" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M4 12 L46 12 L46 44 L4 44 Z" fill="#ef4444" stroke="#450a0a" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M4 12 L18 6 L60 6 L46 12 Z" fill="#991b1b" stroke="#450a0a" strokeWidth="1.3" strokeLinejoin="round" />
    {[0, 1, 2].map((r) =>
      [0, 1, 2, 3, 4].map((c) => <rect key={`${r}${c}`} x={8 + c * 7.4} y={16 + r * 7.5} width="4.5" height="4.5" fill="#fef3c7" stroke="#450a0a" strokeWidth=".6" />),
    )}
    {[0, 1, 2].map((r) => (
      <path key={r} d={`M49 ${17 + r * 7.5} L56 ${14 + r * 7.5} L56 ${18.5 + r * 7.5} L49 ${21.5 + r * 7.5} Z`} fill="#fde68a" stroke="#450a0a" strokeWidth=".6" />
    ))}
    <rect x="20" y="37" width="10" height="7" fill="#7c2d12" stroke="#450a0a" strokeWidth=".8" />
    <rect x="14" y="2" width="22" height="6" rx="1" fill="#fbbf24" stroke="#450a0a" strokeWidth="1" />
    <text x="25" y="6.8" textAnchor="middle" fontSize="4.6" fontWeight="900" fill="#450a0a" fontFamily="Arial, sans-serif">HOTEL</text>
  </svg>
)

// a street's own model: a little building with a roof in the street's color, and the owner's flag once it's bought
export const StreetModel = ({ roof, flag }) => (
  <svg className="model street-model" viewBox="0 0 40 52" aria-hidden="true">
    {flag && (
      <>
        <path d="M30 4 L30 24" stroke="#1f2937" strokeWidth="1.6" />
        <path d="M30.8 4 L40 7.5 L30.8 11 Z" fill={flag} stroke="#111" strokeWidth=".8" strokeLinejoin="round" />
      </>
    )}
    <path d="M26 28 L36 23 L36 44 L26 49 Z" fill="#d6d3d1" stroke="#292524" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M4 28 L26 28 L26 49 L4 49 Z" fill="#fafaf9" stroke="#292524" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M2 29 L15 15 L28 29 Z" fill={roof} stroke="#292524" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M15 15 L25 10 L38 24 L28 29 Z" fill={roof} stroke="#292524" strokeWidth="1.2" strokeLinejoin="round" style={{ filter: 'brightness(.75)' }} />
    <rect x="12" y="38" width="6" height="11" fill="#92400e" stroke="#292524" strokeWidth=".8" />
    <rect x="7" y="32" width="4.5" height="4.5" fill="#bae6fd" stroke="#292524" strokeWidth=".7" />
    <rect x="19.5" y="32" width="4.5" height="4.5" fill="#bae6fd" stroke="#292524" strokeWidth=".7" />
  </svg>
)

// thickness for any flat drawing: copies stacked front to back, the ones behind darker
export function Extruded({ layers = 6, children }) {
  return (
    <span className="extruded">
      {Array.from({ length: layers }, (_, i) => (
        <span key={i} className={`ex-layer${i === 0 ? ' front' : ''}`} style={{ '--z': i }}>
          {children}
        </span>
      ))}
    </span>
  )
}

// an owned property: a little building painted in the owner's color
export const OwnedModel = ({ color }) => (
  <svg className="model owned-model" viewBox="0 0 40 46" aria-hidden="true">
    <path d="M26 22 L36 17 L36 39 L26 44 Z" fill={color} stroke="#111" strokeWidth="1.3" strokeLinejoin="round" style={{ filter: 'brightness(.7)' }} />
    <path d="M4 22 L26 22 L26 44 L4 44 Z" fill={color} stroke="#111" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M2 23 L15 8 L28 23 Z" fill={color} stroke="#111" strokeWidth="1.3" strokeLinejoin="round" style={{ filter: 'brightness(.55)' }} />
    <path d="M15 8 L25 3 L38 18 L28 23 Z" fill={color} stroke="#111" strokeWidth="1.3" strokeLinejoin="round" style={{ filter: 'brightness(.42)' }} />
    <rect x="12" y="33" width="6" height="11" fill="#fff" fillOpacity=".85" stroke="#111" strokeWidth=".9" />
    <rect x="7" y="27" width="4.5" height="4.5" fill="#fff" fillOpacity=".85" stroke="#111" strokeWidth=".8" />
    <rect x="19.5" y="27" width="4.5" height="4.5" fill="#fff" fillOpacity=".85" stroke="#111" strokeWidth=".8" />
  </svg>
)
