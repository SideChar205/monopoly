// Two dice. key={rollId} on the parent replays the tumble for every roll.
const PIPS = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
}

function Die({ value, delay }) {
  return (
    <div className="die" style={{ animationDelay: `${delay}ms` }}>
      {Array.from({ length: 9 }, (_, k) => (
        <span key={k} className={PIPS[value]?.includes(k + 1) ? 'pip' : 'pip off'} />
      ))}
    </div>
  )
}

export default function Dice({ dice }) {
  const [a, b] = dice ?? [6, 6]
  return (
    <div className={`dice${dice ? '' : ' idle'}${dice && a === b ? ' doubles' : ''}`}>
      <Die value={a} delay={0} />
      <Die value={b} delay={60} />
    </div>
  )
}
