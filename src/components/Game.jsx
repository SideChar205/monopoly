import { useEffect, useRef, useState } from 'react'
import { SPACES, GROUPS, JAIL_FINE, groupMembers } from '../game/board.js'
import { activePlayers, netWorth, propertiesOf, auctionBidder } from '../game/rules.js'
import { botMove, botActor } from '../game/bot.js'
import Board, { Token } from './Board.jsx'
import Dice from './Dice.jsx'
import Deed from './Deed.jsx'

const money = (n) => `$${n.toLocaleString('en-US')}`
const HOP_MS = 150 // time per space when a token walks
const CARD_MS = 2800 // how long a drawn card stays up

// Tokens walk space by space. The game state jumps straight to the end position,
// so the board plays each move of the last action one after another.
function useTokenPositions(game) {
  const [shown, setShown] = useState(() => game.players.map((p) => p.pos))
  const [walking, setWalking] = useState(false)
  const pos = useRef(game.players.map((p) => p.pos)) // where each token is drawn right now
  const seen = useRef(game.moveId)
  const queue = useRef([])
  const timer = useRef(null)
  const running = useRef(false)

  useEffect(() => {
    // a new game: put everyone on Start without walking
    if (game.moveId < seen.current) {
      clearTimeout(timer.current)
      queue.current = []
      running.current = false
      seen.current = game.moveId
      pos.current = game.players.map((p) => p.pos)
      setShown(pos.current)
      setWalking(false)
      return
    }
    if (game.moveId === seen.current) return
    seen.current = game.moveId
    queue.current.push(...game.moves)
    if (running.current) return

    const step = () => {
      const move = queue.current[0]
      if (!move) {
        running.current = false
        setWalking(false)
        return
      }
      running.current = true
      setWalking(true)
      const at = pos.current[move.player]
      let next
      if (move.kind === 'jump' || at === move.to) next = move.to
      else next = move.kind === 'back' ? (at + 39) % 40 : (at + 1) % 40
      pos.current = pos.current.map((x, i) => (i === move.player ? next : x))
      setShown(pos.current)
      if (next === move.to) queue.current.shift()
      timer.current = setTimeout(step, move.kind === 'jump' ? 450 : HOP_MS)
    }
    step()
  }, [game.moveId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => clearTimeout(timer.current), [])
  return { positions: shown, walking }
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

export default function Game({ game, dispatch, onPlayAgain, onQuit }) {
  const { positions, walking } = useTokenPositions(game)
  const cashChanges = useCashChanges(game.players)
  const [deed, setDeed] = useState(null)
  const [card, setCard] = useState(null)
  const [confirmQuit, setConfirmQuit] = useState(null) // 'bankrupt' | 'end' | null
  const lastCardId = useRef(game.lastCard?.id ?? 0)

  const me = game.players[game.current]
  // whose move it is: in an auction, whoever's turn it is to bid
  const actor = game.players[botActor(game)] ?? me
  const myTurn = !actor.isBot && game.phase !== 'over'
  const busy = walking || card !== null // wait for the token / card before the next step

  // show a drawn card in the middle of the board for a moment
  useEffect(() => {
    if (!game.lastCard || game.lastCard.id === lastCardId.current) return
    lastCardId.current = game.lastCard.id
    const show = setTimeout(() => setCard(game.lastCard), walking ? 400 : 0)
    return () => clearTimeout(show)
  }, [game.lastCard]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!card) return
    const t = setTimeout(() => setCard(null), CARD_MS)
    return () => clearTimeout(t)
  }, [card])

  // bots play by themselves, one action at a time
  useEffect(() => {
    if (!actor.isBot || game.phase === 'over' || busy) return
    const action = botMove(game)
    if (!action) return
    const quick = ['BUILD', 'SELL', 'MORTGAGE', 'UNMORTGAGE'].includes(action.type)
    const t = setTimeout(() => dispatch(action), quick ? 350 : 700)
    return () => clearTimeout(t)
  }, [game, busy, actor.isBot, dispatch])

  useEffect(() => setConfirmQuit(null), [game.current, game.phase])

  const space = SPACES[me.pos]

  return (
    <div className="game-page">
      <main className="table-area">
        <Board game={game} positions={positions} onOpen={setDeed}>
          <div className="logo small">
            <span className="logo-house" aria-hidden="true" />
            LANDLORD
          </div>

          <Dice key={game.rollId} dice={game.dice} />

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
            {game.log.slice(0, 5).map((line, i) => (
              <li key={`${game.log.length}-${i}`}>{line}</li>
            ))}
          </ul>

          {card && (
            <button className={`drawn-card ${card.deck}`} onClick={() => setCard(null)} title="Click to close">
              <small>{card.deck === 'fortune' ? 'Fortune' : 'Town Fund'}</small>
              <span className="card-icon">{card.deck === 'fortune' ? '?' : '💰'}</span>
              <p>{card.text}</p>
              <em>{game.players[card.player].name}</em>
            </button>
          )}
        </Board>
      </main>

      <aside className="side">
        <div className="side-top">
          <span className="turn-no">Turn {game.turn}</span>
          <div className="side-buttons">
            {game.phase !== 'over' &&
              (confirmQuit === 'end' ? (
                <button className="btn small danger" onClick={() => dispatch({ type: 'END_GAME' })}>End now?</button>
              ) : (
                <button className="btn small ghost" title="End the game: the richest player wins" onClick={() => setConfirmQuit('end')}>End game</button>
              ))}
            <button className="btn small ghost" onClick={onQuit}>Quit</button>
          </div>
        </div>

        <ul className="players">
          {game.players.map((p, i) => (
            <PlayerCard key={i} game={game} index={i} change={cashChanges[i]} onOpen={setDeed} />
          ))}
        </ul>

        <div className="bank">
          <span title="Houses left in the bank">🏠 {game.bank.houses}</span>
          <span title="Hotels left in the bank">🏨 {game.bank.hotels}</span>
          <span className="muted">Click any property to see its card</span>
        </div>
      </aside>

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
          <div className="prompt-buttons">
            <button className="btn primary" onClick={act('ROLL')}>Roll for doubles</button>
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
        <div className="prompt-buttons">
          <button className="btn primary big" onClick={act('ROLL')}>🎲 Roll dice</button>
        </div>
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

function PlayerCard({ game, index, change, onOpen }) {
  const p = game.players[index]
  const props = propertiesOf(game, index)
  const isTurn = index === game.current && game.phase !== 'over'
  // the player's properties, grouped by color in board order
  const groups = []
  for (const i of props) {
    const key = SPACES[i].group ?? SPACES[i].type
    const g = groups.find((x) => x.key === key)
    if (g) g.items.push(i)
    else groups.push({ key, items: [i] })
  }

  return (
    <li className={`player${isTurn ? ' turn' : ''}${p.out ? ' out' : ''}`} style={{ '--c': p.color }}>
      <div className="player-row">
        <Token player={p} index={index} />
        <div className="player-name">
          <strong>{p.name}</strong>
          <small>
            {p.out ? 'Bankrupt' : p.inJail ? 'In jail' : p.isBot ? 'Bot' : 'Human'}
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
      </div>
      {props.length > 0 && (
        <div className="holdings">
          {groups.map((g) => (
            <div key={g.key} className="holding-group">
              {g.items.map((i) => (
                <button
                  key={i}
                  className={`holding${game.mortgaged[i] ? ' mortgaged' : ''}`}
                  style={{ '--band': SPACES[i].group ? GROUPS[SPACES[i].group].color : '#94a3b8' }}
                  title={`${SPACES[i].name}${game.mortgaged[i] ? ' (mortgaged)' : ''}${game.houses[i] ? ` · ${game.houses[i] === 5 ? 'hotel' : `${game.houses[i]} house${game.houses[i] > 1 ? 's' : ''}`}` : ''}`}
                  onClick={() => onOpen(i)}
                >
                  {SPACES[i].type === 'station' ? '🚂' : SPACES[i].type === 'utility' ? SPACES[i].icon : game.houses[i] === 5 ? 'H' : game.houses[i] || ''}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
      {!p.out && <div className="worth">Worth {money(netWorth(game, index))}</div>}
    </li>
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
