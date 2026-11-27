import { useEffect, useRef, useState } from 'react'
import { SPACES, GROUPS, JAIL_FINE, groupMembers } from '../game/board.js'
import { activePlayers, netWorth, propertiesOf, auctionBidder } from '../game/rules.js'
import { botMove, botActor } from '../game/bot.js'
import Board, { Token } from './Board.jsx'
import Deed from './Deed.jsx'
import ScreenDice from './ScreenDice.jsx'
import { HoldingsStrip, PlayerSheet } from './Holdings.jsx'

const money = (n) => `$${n.toLocaleString('en-US')}`

// where each player sits around the board, going round from you (bottom) in turn order
const SEAT_LAYOUTS = {
  1: ['bottom'],
  2: ['bottom', 'top'],
  3: ['bottom', 'left', 'right'],
  4: ['bottom', 'left', 'top', 'right'],
  5: ['bottom', 'left', 'top-left', 'top-right', 'right'],
  6: ['bottom', 'left', 'top-left', 'top-right', 'right', 'bottom-right'],
}
const HOP_MS = 520 // time per space when a piece hops along (slow enough to follow)
const DICE_MS = 1600 // the dice are thrown, bounce and settle before anything else happens
const CARD_MS = 3200 // how long a drawn card stays up (or until you click it)

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// The director: the game rules jump straight to the result of an action, but the screen plays it out
// one step at a time, so you can follow it:
//   1. the dice tumble and land            (only the dice change)
//   2. the piece walks to its space
//   3. a card comes off its stack          (if the space draws one; the piece waits for it)
//   4. any move the card causes
//   5. then everything else updates: money, the log, who owns what, your buttons
// While that plays, `busy` is true: your buttons wait and so do the bots.
function useDirector(game) {
  const [view, setView] = useState(game) // the game as the screen shows it right now
  const [positions, setPositions] = useState(() => game.players.map((p) => p.pos))
  const [dice, setDice] = useState({ values: game.dice, key: game.rollId }) // the last roll stays on the board
  const [card, setCard] = useState(null)
  const [busy, setBusy] = useState(false)
  const [focus, setFocus] = useState(null) // the player the camera follows while their piece moves
  const unfocus = useRef(0)
  const pos = useRef(game.players.map((p) => p.pos))
  const shown = useRef(game)
  const queue = useRef([])
  const running = useRef(false)
  const closeCardNow = useRef(null)

  const setPos = (p, at) => {
    pos.current = pos.current.map((x, i) => (i === p ? at : x))
    setPositions(pos.current)
  }

  async function walk(moves) {
    if (moves.length) {
      clearTimeout(unfocus.current)
      setFocus(moves[0].player)
      await wait(350) // let the camera move in before the piece sets off
    }
    for (const move of moves) {
      if (move.kind === 'jump') {
        await wait(250)
        setPos(move.player, move.to)
        await wait(450)
        continue
      }
      while (pos.current[move.player] !== move.to) {
        const at = pos.current[move.player]
        setPos(move.player, move.kind === 'back' ? (at + 39) % 40 : (at + 1) % 40)
        await wait(HOP_MS)
      }
    }
  }

  async function play(next) {
    const prev = shown.current
    // a new game: show it straight away
    if (next.moveId < prev.moveId || next.rollId < prev.rollId) {
      pos.current = next.players.map((p) => p.pos)
      setPositions(pos.current)
      setDice({ values: next.dice, key: next.rollId })
      setCard(null)
      shown.current = next
      setView(next)
      return
    }
    const rolled = next.rollId !== prev.rollId
    const newCard = next.lastCard && next.lastCard.id !== prev.lastCard?.id ? next.lastCard : null
    const moves = next.moveId !== prev.moveId ? next.moves : []

    if (rolled) {
      setDice({ values: next.dice, key: next.rollId })
      await wait(DICE_MS)
    }
    // walk up to the card space, show the card, then make the card's own move
    let cut = moves.length
    if (newCard) {
      const c = moves.findIndex((m) => SPACES[m.to].type === 'fortune' || SPACES[m.to].type === 'fund')
      cut = c >= 0 ? c + 1 : 0
    }
    await walk(moves.slice(0, cut))
    if (newCard) {
      setFocus(null) // pull back so the whole board (and the card) is in view
      await wait(450)
      setCard(newCard)
      await new Promise((resolve) => {
        closeCardNow.current = resolve
        setTimeout(resolve, CARD_MS)
      })
      closeCardNow.current = null
      setCard(null)
      await wait(300)
    }
    await walk(moves.slice(cut))
    shown.current = next
    setView(next)
  }

  useEffect(() => {
    queue.current.push(game)
    if (running.current) return
    running.current = true
    setBusy(true)
    ;(async () => {
      while (queue.current.length) await play(queue.current.shift())
      running.current = false
      setBusy(false)
      // stay on the piece for a moment after it lands, then show the whole board again
      clearTimeout(unfocus.current)
      unfocus.current = setTimeout(() => setFocus(null), 1100)
    })()
  }, [game]) // eslint-disable-line react-hooks/exhaustive-deps

  return { view, positions, dice, card, busy, focus, endFocus: () => setFocus(null), closeCard: () => closeCardNow.current?.() }
}

// ---- camera: zoom in on the piece that's moving and follow it, then pull back to the whole board ----
const ZOOM = 2.4
function useCamera({ areaRef, camRef, positions, focus }) {
  const [cam, setCam] = useState({ x: 0, y: 0, s: 1 })
  const spots = useRef(null) // where every space is on screen when the camera is at rest
  const stale = useRef(true)
  const camNow = useRef(cam)
  camNow.current = cam

  // measure the board while it isn't zoomed (on load, and again after the window changes size)
  useEffect(() => {
    const measure = () => {
      const area = areaRef.current
      const board = area?.querySelector('.board')
      if (!area || !board || camNow.current.s !== 1) return (stale.current = true)
      const a = area.getBoundingClientRect()
      const rel = (r) => ({ x: r.left - a.left + r.width / 2, y: r.top - a.top + r.height / 2 })
      const spaces = []
      area.querySelectorAll('.board [data-space]').forEach((el) => (spaces[Number(el.dataset.space)] = rel(el.getBoundingClientRect())))
      const b = board.getBoundingClientRect()
      spots.current = { spaces, board: { l: b.left - a.left, r: b.right - a.left, t: b.top - a.top, b: b.bottom - a.top }, w: a.width, h: a.height }
      stale.current = false
    }
    const later = [60, 300, 900].map((ms) => setTimeout(measure, ms))
    const onResize = () => {
      stale.current = true
      measure()
    }
    window.addEventListener('resize', onResize)
    return () => {
      later.forEach(clearTimeout)
      window.removeEventListener('resize', onResize)
    }
  }, [areaRef])

  const at = focus === null ? null : positions[focus]
  useEffect(() => {
    const m = spots.current
    const camEl = camRef.current
    if (at === null || at === undefined || !m || !camEl) {
      setCam((c) => (c.s === 1 ? c : { x: 0, y: 0, s: 1 }))
      // after pulling back, measure again if the window changed size while zoomed in
      if (stale.current) {
        const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 800)
        return () => clearTimeout(t)
      }
      return
    }
    const p = m.spaces[at]
    if (!p) return
    // the camera scales from its own top-left corner: move it so the space ends up in the middle of the table
    const C = { x: camEl.offsetLeft, y: camEl.offsetTop }
    const s = ZOOM
    let x = m.w / 2 - C.x - s * (p.x - C.x)
    let y = m.h / 2 - C.y - s * (p.y - C.y)
    // don't slide the board so far that empty table shows past its edge
    const clamp = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)))
    // (a little table may show past the edge, so pieces on the outer spaces still end up near the middle)
    const mx = m.w * 0.22
    const my = m.h * 0.22
    x = clamp(x, m.w - mx - C.x - s * (m.board.r - C.x), mx - C.x - s * (m.board.l - C.x))
    y = clamp(y, m.h - my - C.y - s * (m.board.b - C.y), my - C.y - s * (m.board.t - C.y))
    setCam({ x, y, s })
  }, [at, focus]) // eslint-disable-line react-hooks/exhaustive-deps

  return cam
}

// a +$/-$ bubble next to a player's cash whenever it changes
function useCashChanges(players) {
  const prev = useRef(players.map((p) => p.cash))
  const [changes, setChanges] = useState({})
  useEffect(() => {
    const next = {}
    players.forEach((p, i) => {
      const diff = p.cash - prev.current[i]
      if (diff) next[i] = { diff, key: Math.random() }
    })
    prev.current = players.map((p) => p.cash)
    if (Object.keys(next).length) setChanges((c) => ({ ...c, ...next }))
  }, [players])
  return changes
}

export default function Game({ game: latest, dispatch, onPlayAgain, onQuit }) {
  // `latest` is the real game; `game` is what the screen shows, which catches up step by step (see useDirector)
  const { view: game, positions, dice, card, busy, focus, endFocus, closeCard } = useDirector(latest)
  const cashChanges = useCashChanges(game.players)
  const [deed, setDeed] = useState(null)
  const [sheet, setSheet] = useState(null) // which player's property window is open
  const [confirmQuit, setConfirmQuit] = useState(null) // 'bankrupt' | 'end' | null

  const me = game.players[game.current]
  // whose move it is: in an auction, whoever's turn it is to bid
  const actor = game.players[botActor(game)] ?? me
  const myTurn = !actor.isBot && game.phase !== 'over'
  const canRoll = myTurn && !busy && game.phase === 'roll'
  const areaRef = useRef(null)
  const camRef = useRef(null)
  const [follow, setFollow] = useState(() => {
    try {
      return localStorage.getItem('landlord-follow') !== 'off'
    } catch {
      return true
    }
  })
  const toggleFollow = () => {
    setFollow((f) => {
      try {
        localStorage.setItem('landlord-follow', f ? 'off' : 'on')
      } catch { /* storage blocked */ }
      return !f
    })
  }
  // your roll comes up: show the whole board (the roll button sits over the dice tray)
  useEffect(() => {
    if (canRoll) endFocus()
  }, [canRoll]) // eslint-disable-line react-hooks/exhaustive-deps
  const cam = useCamera({ areaRef, camRef, positions, focus: follow ? focus : null })
  const zoomed = cam.s !== 1

  // who sits at the bottom (you): the human whose turn it is; between turns, the last human who played
  const anchorRef = useRef(Math.max(0, game.players.findIndex((p) => !p.isBot)))
  if (!me.isBot) anchorRef.current = game.current
  const seatOrder = game.players.map((_, k) => (anchorRef.current + k) % game.players.length)
  const roll = () => canRoll && dispatch({ type: 'ROLL' })

  // space bar rolls the dice too
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' && canRoll && !['INPUT', 'BUTTON', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault()
        dispatch({ type: 'ROLL' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canRoll, dispatch])

  // bots play by themselves, one action at a time
  useEffect(() => {
    if (!actor.isBot || game.phase === 'over' || busy) return
    const action = botMove(game)
    if (!action) return
    const quick = ['BUILD', 'SELL', 'MORTGAGE', 'UNMORTGAGE'].includes(action.type)
    const t = setTimeout(() => dispatch(action), quick ? 350 : 700)
    return () => clearTimeout(t)
  }, [game, busy, actor.isBot, dispatch])
  // (bots read `game`, which is the real game whenever the screen isn't busy)

  useEffect(() => setConfirmQuit(null), [game.current, game.phase])

  const space = SPACES[me.pos]

  return (
    <div className="game-page">
      <main className={`table-area${zoomed ? ' zoomed' : ''}`} ref={areaRef}>
        {/* the board lies on the table, seen at an angle: the dice roll on it and the cards come off its piles */}
        <div className="camera" ref={camRef} style={{ transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.s})` }}>
        {/* the board is drawn at twice its size and shrunk to fit, so it stays sharp when the camera zooms in */}
        <div className="scene-box">
        <div className="scene">
          <div className="board-tilt">
            <Board
              game={game}
              positions={positions}
              onOpen={setDeed}
              card={card}
              onCardClose={closeCard}
              stepMs={HOP_MS}
            />
          </div>
        </div>
        </div>
        </div>
        <div className={`dice-layer${zoomed ? ' away' : ''}`}>
        <ScreenDice key={dice.key} dice={dice.values} seed={dice.key} onRoll={canRoll ? roll : null} areaRef={areaRef} roller={game.current} hidden={zoomed} />
        </div>
        {/* the roll button floats flat over the middle of the board (outside the 3D board, so nothing cuts it) */}
        {canRoll && !zoomed && (
          <button className="roll-btn2" onClick={roll}>
            <span className="roll-icon">🎲</span>
            <span className="roll-text">
              {me.inJail ? 'Roll for doubles' : 'Roll dice'}
            </span>
          </button>
        )}
        {/* everyone sits around the board, their deeds and money on the table in front of them */}
        {seatOrder.map((pi, k) => (
          <div key={pi} data-seat={pi} className={`seat-spot ${SEAT_LAYOUTS[seatOrder.length][k]}`}>
            <PlayerCard game={game} index={pi} change={cashChanges[pi]} onOpen={setDeed} onSheet={() => setSheet(pi)} you={k === 0 && !game.players[pi].isBot} />
          </div>
        ))}
      </main>

      <aside className="side">
        <div className="side-top">
          <span className="turn-no">Turn {game.turn}</span>
          <div className="side-buttons">
            <button className={`btn small ghost follow-btn${follow ? ' on' : ''}`} title="Zoom in on each piece while it moves" onClick={toggleFollow}>
              🎥 Follow {follow ? 'on' : 'off'}
            </button>
            {game.phase !== 'over' &&
              (confirmQuit === 'end' ? (
                <button className="btn small danger" onClick={() => dispatch({ type: 'END_GAME' })}>End now?</button>
              ) : (
                <button className="btn small ghost" title="End the game: the richest player wins" onClick={() => setConfirmQuit('end')}>End game</button>
              ))}
            <button className="btn small ghost" onClick={onQuit}>Quit</button>
          </div>
        </div>

        {/* what happens next: your buttons, or who we're waiting for */}
        <div className={`action-panel${myTurn && !busy && game.phase !== 'auction' ? ' yours' : ''}`}>
          <div className="prompt">
            {game.phase === 'over' ? null : game.phase === 'auction' ? (
              <Auction game={game} dispatch={dispatch} openDeed={setDeed} busy={busy} />
            ) : !myTurn ? (
              <p className="thinking">
                <Token player={me} index={game.current} /> {me.name} is thinking<span className="dots" />
              </p>
            ) : busy ? (
              <p className="thinking">…</p>
            ) : (
              <Prompt game={game} dispatch={dispatch} space={space} confirm={confirmQuit} setConfirm={setConfirmQuit} openDeed={setDeed} />
            )}
          </div>
          <ul className="log">
            {game.log.slice(0, 4).map((line, i) => (
              <li key={`${game.log.length}-${i}`}>{line}</li>
            ))}
          </ul>
        </div>


        <div className="bank">
          <span title="Houses left in the bank">🏠 {game.bank.houses}</span>
          <span title="Hotels left in the bank">🏨 {game.bank.hotels}</span>
          <span className="muted">Click any property to see its card</span>
        </div>
      </aside>

      {sheet !== null && <PlayerSheet game={game} index={sheet} onOpen={setDeed} onClose={() => setSheet(null)} />}
      {deed !== null && <Deed index={deed} game={game} dispatch={dispatch} onClose={() => setDeed(null)} />}
      {game.phase === 'over' && <GameOver game={game} onPlayAgain={onPlayAgain} onQuit={onQuit} />}
    </div>
  )
}

// what the current (human) player can do right now
function Prompt({ game, dispatch, space, confirm, setConfirm, openDeed }) {
  const p = game.current
  const me = game.players[p]
  const act = (type) => () => dispatch({ type })

  if (game.phase === 'roll') {
    if (me.inJail) {
      return (
        <>
          <p className="prompt-title">You're in jail <small>(try {me.jailTurns + 1} of 3)</small></p>
          {me.jailTurns >= 2 && <p className="prompt-sub">Last try: no doubles means you pay {money(JAIL_FINE)} and move.</p>}
          <p className="prompt-sub">Roll for doubles with the dice on the board, or:</p>
          <div className="prompt-buttons">
            {me.jailTurns < 2 && (
              <button className="btn" disabled={me.cash < JAIL_FINE} onClick={act('PAY_FINE')}>Pay {money(JAIL_FINE)}</button>
            )}
            {me.jailCards.length > 0 && <button className="btn" onClick={act('USE_CARD')}>Use free card</button>}
          </div>
        </>
      )
    }
    return (
      <>
        <p className="prompt-title">{game.dice && game.dice[0] === game.dice[1] ? 'Doubles! Roll again' : `${me.name}, your turn`}</p>
        <p className="prompt-sub roll-hint">🎲 Roll the dice in the middle of the board <small>(or press Space)</small></p>
      </>
    )
  }

  if (game.phase === 'buy') {
    return (
      <>
        <p className="prompt-title">
          Buy <button className="link" onClick={() => openDeed(me.pos)} style={{ '--c': GROUPS[space.group]?.color ?? '#94a3b8' }}>{space.name}</button>?
        </p>
        <div className="prompt-buttons">
          <button className="btn primary" disabled={me.cash < space.price} title={me.cash < space.price ? 'Not enough money' : ''} onClick={act('BUY')}>
            Buy for {money(space.price)}
          </button>
          <button className="btn" onClick={act('DECLINE')}>No thanks</button>
        </div>
      </>
    )
  }

  if (game.phase === 'tax') {
    return (
      <>
        <p className="prompt-title">Income Tax</p>
        <p className="prompt-sub">Pay a flat $200, or 10% of your total worth (cash + property prices + buildings). Choose before you add it up!</p>
        <div className="prompt-buttons">
          <button className="btn primary" onClick={act('TAX_FLAT')}>Pay $200</button>
          <button className="btn" onClick={act('TAX_PERCENT')}>Pay 10%</button>
        </div>
      </>
    )
  }

  if (game.phase === 'end') {
    const canBuildSomething = propertiesOf(game, p).some((i) => SPACES[i].group && groupMembers(SPACES[i].group).every((j) => game.owners[j] === p))
    return (
      <>
        <p className="prompt-title">{canBuildSomething ? 'Build on your streets, or end your turn' : 'All done?'}</p>
        <div className="prompt-buttons">
          <button className="btn primary" onClick={act('END_TURN')}>End turn</button>
        </div>
      </>
    )
  }

  if (game.phase === 'debt') {
    const { amount, to } = game.debt
    const toName = typeof to === 'number' ? game.players[to].name : to === 'each' ? 'the other players' : 'the bank'
    return (
      <>
        <p className="prompt-title danger">You owe {money(amount)} to {toName}</p>
        <p className="prompt-sub">You have {money(me.cash)}. Click your properties to sell houses or mortgage them.</p>
        <div className="prompt-buttons">
          <button className="btn primary" disabled={me.cash < amount} onClick={act('PAY_DEBT')}>Pay {money(amount)}</button>
          {confirm === 'bankrupt' ? (
            <button className="btn danger" onClick={act('BANKRUPT')}>Yes, I'm bankrupt</button>
          ) : (
            <button className="btn ghost" onClick={() => setConfirm('bankrupt')}>Declare bankruptcy</button>
          )}
        </div>
      </>
    )
  }
  return null
}

// the auction in the middle of the board: everyone sees it; the bidder whose turn it is raises or drops out
function Auction({ game, dispatch, openDeed, busy }) {
  const a = game.auction
  const who = auctionBidder(game)
  const bidder = game.players[who]
  const space = SPACES[a.space]
  const [amount, setAmount] = useState('')
  useEffect(() => setAmount(''), [who, a.bid])
  const human = !bidder.isBot && !busy
  const isLeader = who === a.leader
  const bid = (n) => dispatch({ type: 'BID', amount: n, player: who })
  const raises = [1, 10, 50, 100].map((n) => a.bid + n).filter((n) => n <= bidder.cash)
  const custom = Number(amount)

  return (
    <div className="auction">
      <p className="prompt-title">
        Auction:{' '}
        <button className="link" onClick={() => openDeed(a.space)} style={{ '--c': GROUPS[space.group]?.color ?? '#94a3b8' }}>
          {space.name}
        </button>
        <small> (price {money(space.price)})</small>
      </p>
      <div className="auction-bid">
        {a.leader === null ? 'No bids yet' : (<>Top bid <b>{money(a.bid)}</b> by {game.players[a.leader].name}</>)}
      </div>
      <div className="auction-bidders">
        {game.players.map((p, i) =>
          p.out ? null : (
            <span key={i} className={`bidder${a.bidders.includes(i) ? '' : ' dropped'}${i === who ? ' now' : ''}${i === a.leader ? ' leading' : ''}`} style={{ '--c': p.color }}>
              {p.name}
            </span>
          ),
        )}
      </div>
      {human && !isLeader ? (
        <>
          <p className="prompt-sub"><b>{bidder.name}</b>, raise the bid or drop out (you have {money(bidder.cash)})</p>
          <div className="prompt-buttons">
            {raises.map((n) => (
              <button key={n} className="btn" onClick={() => bid(n)}>{money(n)}</button>
            ))}
            <input
              className="bid-input"
              type="number"
              min={a.bid + 1}
              max={bidder.cash}
              placeholder="Other"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && custom > a.bid && custom <= bidder.cash && bid(custom)}
            />
            <button className="btn primary" disabled={!(custom > a.bid && custom <= bidder.cash)} onClick={() => bid(custom)}>Bid</button>
            <button className="btn ghost" onClick={() => dispatch({ type: 'AUCTION_PASS', player: who })}>Drop out</button>
          </div>
        </>
      ) : (
        <p className="thinking">{bidder.name} is deciding<span className="dots" /></p>
      )}
    </div>
  )
}

function PlayerCard({ game, index, change, onOpen, onSheet, you }) {
  const p = game.players[index]
  const isTurn = index === game.current && game.phase !== 'over'
  return (
    <div className={`player seat${isTurn ? ' turn' : ''}${p.out ? ' out' : ''}`} style={{ '--c': p.color }}>
      <button className="player-row" onClick={onSheet} title={`See everything ${p.name} owns`}>
        <Token player={p} index={index} />
        <div className="player-name">
          <strong>
            {p.name}
            {you && <span className="you-tag">YOU</span>}
          </strong>
          <small>
            {p.out ? 'Bankrupt' : p.inJail ? 'In jail' : isTurn ? (p.isBot ? 'Thinking…' : 'Playing') : p.isBot ? 'Bot' : 'Human'}
            {p.jailCards.length > 0 && <span className="jail-card" title="Get Out of Jail Free card"> · 🔓×{p.jailCards.length}</span>}
          </small>
        </div>
        <div className="cash">
          {money(p.cash)}
          {change && (
            <span key={change.key} className={`cash-change${change.diff > 0 ? ' up' : ' down'}`}>
              {change.diff > 0 ? '+' : '−'}{money(Math.abs(change.diff))}
            </span>
          )}
        </div>
      </button>
      {!p.out && <HoldingsStrip game={game} player={index} onOpen={onOpen} />}
    </div>
  )
}

function GameOver({ game, onPlayAgain, onQuit }) {
  const winner = game.players[game.winner]
  return (
    <div className="overlay">
      <div className="game-over">
        <div className="trophy">🏆</div>
        <h2>{winner.name} wins!</h2>
        <p className="muted">{game.endReason}</p>
        <ol className="standings">
          {game.standings.map(({ player, worth }, rank) => (
            <li key={player} style={{ '--c': game.players[player].color }}>
              <span className="rank">{rank + 1}</span>
              <span className="who">{game.players[player].name}</span>
              <span className="what">{game.players[player].out ? 'Bankrupt' : money(worth)}</span>
            </li>
          ))}
        </ol>
        <div className="prompt-buttons">
          <button className="btn primary" onClick={onPlayAgain}>Play again</button>
          <button className="btn" onClick={onQuit}>Change players</button>
        </div>
        <p className="muted small">{activePlayers(game).length > 1 ? 'Ranked by net worth: cash + property + buildings.' : ''}</p>
      </div>
    </div>
  )
}
