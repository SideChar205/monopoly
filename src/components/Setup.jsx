import { useState } from 'react'
import { TOKEN_COLORS } from '../game/rules.js'
import { STARTING_CASH } from '../game/board.js'
import { randomBotName } from '../game/botNames.js'

const CASH_OPTIONS = [1000, 1500, 2000, 2500]

const defaultSeats = () => {
  const names = ['Player 1']
  return [
    { name: 'Player 1', isBot: false },
    ...[1, 2, 3].map(() => {
      const name = randomBotName(names)
      names.push(name)
      return { name, isBot: true }
    }),
  ]
}

// The start screen: who's playing, and with how much money
export default function Setup({ initial, onStart }) {
  const [seats, setSeats] = useState(() => initial?.seats ?? defaultSeats())
  const [cash, setCash] = useState(initial?.startingCash ?? STARTING_CASH)

  const setCount = (n) =>
    setSeats((s) => {
      if (n < s.length) return s.slice(0, n)
      const next = [...s]
      while (next.length < n) next.push({ name: randomBotName(next.map((x) => x.name)), isBot: true })
      return next
    })
  const update = (i, patch) => setSeats((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const humans = seats.filter((s) => !s.isBot).length

  return (
    <div className="setup-page">
      <div className="skyline" aria-hidden="true" />
      <div className="setup-card">
        <header className="setup-head">
          <div className="logo">
            <span className="logo-house" aria-hidden="true" />
            LANDLORD
          </div>
          <p>Roll the dice, buy the town, build houses and hotels, and send your rivals broke.</p>
        </header>

        <section>
          <h2>Players</h2>
          <div className="count-row">
            {[2, 3, 4, 5, 6].map((n) => (
              <button key={n} className={`chip${seats.length === n ? ' on' : ''}`} onClick={() => setCount(n)}>
                {n}
              </button>
            ))}
          </div>
          <ul className="seat-list">
            {seats.map((seat, i) => (
              <li key={i} className="seat-row">
                <span className="pawn" style={{ '--c': TOKEN_COLORS[i] }}>{seat.name.slice(0, 1).toUpperCase()}</span>
                <input
                  className="text-input"
                  value={seat.name}
                  maxLength={12}
                  onChange={(e) => update(i, { name: e.target.value })}
                  onBlur={(e) => !e.target.value.trim() && update(i, { name: seat.isBot ? randomBotName(seats.map((x) => x.name)) : `Player ${i + 1}` })}
                />
                {seat.isBot && (
                  <button className="icon-btn" title="New random name" onClick={() => update(i, { name: randomBotName(seats.map((x) => x.name)) })}>
                    🎲
                  </button>
                )}
                <div className="toggle-pair">
                  <button className={!seat.isBot ? 'on' : ''} onClick={() => update(i, { isBot: false, name: seat.isBot ? `Player ${i + 1}` : seat.name })}>
                    Human
                  </button>
                  <button className={seat.isBot ? 'on' : ''} onClick={() => update(i, { isBot: true, name: seat.isBot ? seat.name : randomBotName(seats.map((x) => x.name)) })}>
                    Bot
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {humans > 1 && <p className="hint">Pass and play: hand the mouse to whoever's turn it is.</p>}
        </section>

        <section>
          <h2>Starting money</h2>
          <div className="count-row">
            {CASH_OPTIONS.map((c) => (
              <button key={c} className={`chip wide${cash === c ? ' on' : ''}`} onClick={() => setCash(c)}>
                ${c.toLocaleString('en-US')}
              </button>
            ))}
          </div>
        </section>

        <button
          className="start-btn"
          onClick={() => onStart({ seats: seats.map((s, i) => ({ ...s, name: s.name.trim() || `Player ${i + 1}` })), startingCash: cash })}
        >
          Start game
        </button>
        <p className="fine-print">Classic rules. Auctions, trading and online play are coming next.</p>
      </div>
    </div>
  )
}
