import { useEffect, useState } from 'react'
import { PieceIcon } from './Pieces.jsx'

// "Who goes first?" A roulette wheel with a slice for every player. It spins, slows down and stops on the
// player the game picked to start; then it shows the play order (round the table from that player).
// Click anywhere to skip.
const SPIN_MS = 4200

export default function OrderWheel({ game, onDone }) {
  const players = game.players
  const n = players.length
  const first = game.current === undefined ? 0 : game.draft ? game.draft.first : game.current
  const slice = 360 / n
  const [stage, setStage] = useState('ready') // ready -> spinning -> result
  // land with the winner's slice under the pointer at the top (a little off-centre, like a real wheel)
  const [turn] = useState(() => 360 * 6 - (first * slice + slice / 2) + (Math.random() - 0.5) * slice * 0.6)

  useEffect(() => {
    const t1 = setTimeout(() => setStage('spinning'), 120)
    const t2 = setTimeout(() => setStage('result'), 120 + SPIN_MS)
    const t3 = setTimeout(onDone, 120 + SPIN_MS + 2600)
    return () => [t1, t2, t3].forEach(clearTimeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const skip = () => (stage === 'result' ? onDone() : setStage('result'))
  const order = players.map((_, k) => (first + k) % n).filter((i) => !players[i].out)
  const R = 100
  const point = (deg, r = R) => {
    const a = ((deg - 90) * Math.PI) / 180
    return [Math.cos(a) * r, Math.sin(a) * r]
  }

  return (
    <div className="order-overlay" onClick={skip}>
      <div className="order-card">
        <h2>Who goes first?</h2>
        <div className="wheel-wrap">
          <span className="wheel-pointer" />
          <svg
            className="wheel"
            viewBox="-110 -110 220 220"
            style={{ transform: `rotate(${stage === 'ready' ? 0 : turn}deg)`, transitionDuration: stage === 'spinning' ? `${SPIN_MS}ms` : stage === 'result' ? '250ms' : '0ms' }}
          >
            <circle r="106" className="wheel-rim" />
            {players.map((p, i) => {
              const [x1, y1] = point(i * slice)
              const [x2, y2] = point((i + 1) * slice)
              const [tx, ty] = point(i * slice + slice / 2, 66)
              const path = n === 1 ? `M0 -${R} A${R} ${R} 0 1 1 -0.01 -${R} Z` : `M0 0 L${x1} ${y1} A${R} ${R} 0 ${slice > 180 ? 1 : 0} 1 ${x2} ${y2} Z`
              return (
                <g key={i}>
                  <path d={path} fill={p.color} className="wheel-slice" />
                  <g transform={`translate(${tx} ${ty}) rotate(${i * slice + slice / 2})`}>
                    <foreignObject x="-17" y="-26" width="34" height="34">
                      <PieceIcon id={p.piece} size={34} />
                    </foreignObject>
                    <text y="20" className="wheel-name">{p.name.length > 9 ? `${p.name.slice(0, 8)}…` : p.name}</text>
                  </g>
                </g>
              )
            })}
            <circle r="16" className="wheel-hub" />
          </svg>
        </div>
        <div className={`order-result${stage === 'result' ? ' show' : ''}`}>
          <p className="order-winner" style={{ '--c': players[first].color }}>
            <PieceIcon id={players[first].piece} color={players[first].color} size={30} /> {players[first].name} goes first!
          </p>
          <ol className="order-list">
            {order.map((i, k) => (
              <li key={i} style={{ '--c': players[i].color, '--k': k }}>
                <span className="order-no">{k + 1}</span>
                <PieceIcon id={players[i].piece} color={players[i].color} size={22} />
                {players[i].name}
              </li>
            ))}
          </ol>
        </div>
        <p className="order-skip">{stage === 'result' ? 'Click to start' : 'Click to skip'}</p>
      </div>
    </div>
  )
}
