import { useState } from 'react'
import { TOKEN_COLORS, PIECE_IDS, DEFAULT_SETTINGS } from '../game/rules.js'
import { PIECES, PieceIcon } from './Pieces.jsx'
import RulesPicker from './RulesPicker.jsx'
import { STARTING_CASH } from '../game/board.js'
import { randomBotName } from '../game/botNames.js'

const CASH_OPTIONS = [1000, 1500, 2000, 2500]


// a piece nobody else at the table has yet (bots get a random one)
const freePiece = (seats, random = true) => {
  const free = PIECE_IDS.filter((id) => !seats.some((s) => s.piece === id))
  return random ? free[Math.floor(Math.random() * free.length)] : free[0]
}

const defaultSeats = () => {
  const seats = [{ name: 'Player 1', isBot: false, piece: 'car' }]
  for (let k = 1; k < 4; k++) seats.push({ name: randomBotName(seats.map((s) => s.name)), isBot: true, piece: freePiece(seats) })
  return seats
}

// The start screen: who's playing, and with how much money
export default function Setup({ initial, onStart, onOnline }) {
  const [seats, setSeats] = useState(() => initial?.seats ?? defaultSeats())
  const [cash, setCash] = useState(initial?.startingCash ?? STARTING_CASH)
  const [picking, setPicking] = useState(null) // which seat is choosing a piece
  const [mode, setMode] = useState(initial?.mode ?? 'board') // 'board' (the board game) or 'deal' (the card game)
  const [rules, setRules] = useState(() => ({ ...DEFAULT_SETTINGS, ...initial?.settings }))
  const maxPlayers = mode === 'deal' ? 5 : 6

  const setCount = (n) =>
    setSeats((s) => {
      if (n < s.length) return s.slice(0, n)
      const next = [...s]
      while (next.length < n) next.push({ name: randomBotName(next.map((x) => x.name)), isBot: true, piece: freePiece(next) })
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
            {/* not launched yet: a beta version (below 1.0) */}
            <span className="beta-tag" title={`Version ${__APP_VERSION__}, not launched yet`}>BETA</span>
          </div>
          <p>{mode === 'deal' ? 'Collect property sets, charge rent and steal deals. First to 3 complete sets wins.' : 'Roll the dice, buy the town, build houses and hotels, and send your rivals broke.'}</p>
        </header>

        <section>
          <h2>Game</h2>
          <div className="mode-pick">
            <button className={`mode-card${mode === 'board' ? ' on' : ''}`} onClick={() => setMode('board')}>
              <span className="mode-icon">🎲</span>
              <strong>Board game</strong>
              <small>The classic board: roll, buy, build, bankrupt</small>
            </button>
            <button
              className={`mode-card${mode === 'deal' ? ' on' : ''}`}
              onClick={() => {
                setMode('deal')
                if (seats.length > 5) setCount(5)
              }}
            >
              <span className="mode-icon">🃏</span>
              <strong>Deal</strong>
              <small>The fast card game: 3 property sets to win (2–5 players)</small>
            </button>
          </div>
        </section>

        <section>
          <h2>Players</h2>
          <div className="count-row">
            {[2, 3, 4, 5, 6].filter((n) => n <= maxPlayers).map((n) => (
              <button key={n} className={`chip${seats.length === n ? ' on' : ''}`} onClick={() => setCount(n)}>
                {n}
              </button>
            ))}
          </div>
          <ul className="seat-list">
            {seats.map((seat, i) => (
              <li key={i} className="seat-row">
                <button className="piece-btn" title="Choose a piece" onClick={() => setPicking(picking === i ? null : i)}>
                  <PieceIcon id={seat.piece} color={TOKEN_COLORS[i]} size={40} />
                </button>
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
                {picking === i && (
                  <div className="piece-picker">
                    {PIECES.map((pc) => {
                      const takenBy = seats.findIndex((s, j) => j !== i && s.piece === pc.id)
                      return (
                        <button
                          key={pc.id}
                          className={`piece-choice${seat.piece === pc.id ? ' on' : ''}`}
                          title={takenBy >= 0 ? `${pc.name} (swap with ${seats[takenBy].name})` : pc.name}
                          onClick={() => {
                            // picking someone else's piece swaps the two
                            setSeats((all) => all.map((s, j) => (j === i ? { ...s, piece: pc.id } : j === takenBy ? { ...s, piece: seat.piece } : s)))
                            setPicking(null)
                          }}
                        >
                          <PieceIcon id={pc.id} size={38} />
                          <small>{pc.name}</small>
                        </button>
                      )
                    })}
                  </div>
                )}
              </li>
            ))}
          </ul>
          {humans > 1 && <p className="hint">Pass and play: hand the mouse to whoever's turn it is.</p>}
        </section>

        {mode === 'board' && (
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
        )}

        {mode === 'board' && (
          <section>
            <h2>Rules</h2>
            <RulesPicker settings={rules} setSettings={setRules} />
          </section>
        )}

        {mode === 'board' && onOnline && (
          <button className="online-banner" onClick={onOnline}>
            <span className="online-icon">🌐</span>
            <span>
              <strong>Play online</strong>
              <small>Invite friends with a link or a code</small>
            </span>
            <span className="online-arrow">→</span>
          </button>
        )}

        <button
          className="start-btn"
          onClick={() => onStart({ mode, seats: seats.map((s, i) => ({ ...s, color: TOKEN_COLORS[i], name: s.name.trim() || `Player ${i + 1}` })), startingCash: cash, settings: rules })}
        >
          Start game
        </button>
        <p className="fine-print">{mode === 'deal' ? '106 cards: money, properties, wildcards, rent and action cards.' : 'Classic rules from the official rulebook.'}</p>
        <p className="version">Version {__APP_VERSION__} · Beta</p>
      </div>
    </div>
  )
}
