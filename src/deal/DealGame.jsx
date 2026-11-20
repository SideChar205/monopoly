import { useEffect, useMemo, useRef, useState } from 'react'
import { SETS, ACTIONS, colorHex, cardLabel } from './cards.js'
import {
  actorOf, cardOptions, rentColors, rentFor, colorCards, isComplete, completeColors, takeable, assets, assetsTotal,
  bankTotal, buildable, activeOthers, HAND_LIMIT, PLAYS_PER_TURN,
} from './rules.js'
import { botMove } from './bot.js'
import DealCard, { CardBack } from './DealCard.jsx'
import { PieceIcon } from '../components/Pieces.jsx'
import './deal.css'

const money = (n) => `$${n}M`

export default function DealGame({ game, dispatch, onPlayAgain, onQuit }) {
  const actor = actorOf(game)
  const actorIsBot = game.players[actor]?.isBot
  // whose cards we show: the human who has to act; between turns, the last human who acted
  const lastHuman = useRef(Math.max(0, game.players.findIndex((p) => !p.isBot)))
  if (!actorIsBot && game.phase !== 'over') lastHuman.current = actor
  const viewer = lastHuman.current
  const me = game.players[viewer]
  const myTurn = game.current === viewer && game.phase === 'play' && !me.isBot
  const [menu, setMenu] = useState(null) // a hand card being played: { card, step, ... }
  const [wildMenu, setWildMenu] = useState(null) // a wildcard on my table to move

  // bots play by themselves
  useEffect(() => {
    if (game.phase === 'over' || !actorIsBot) return
    const action = botMove(game)
    if (!action) return
    const slow = action.type === 'PLAY_ACTION' || action.type === 'SAY_NO'
    const t = setTimeout(() => dispatch(action), slow ? 1000 : 650)
    return () => clearTimeout(t)
  }, [game, actorIsBot, dispatch])

  useEffect(() => setMenu(null), [game.phase, game.current])

  const others = game.players.map((_, i) => i).filter((i) => i !== viewer)
  const pd = game.pending
  const status = statusText(game, viewer)

  return (
    <div className="deal-page">
      <header className="deal-top">
        <div className="logo small-flat">
          <span className="logo-house" aria-hidden="true" />
          LANDLORD <em>DEAL</em>
        </div>
        <span className="turn-chip">Turn {game.turn}</span>
        <button className="btn small ghost" onClick={onQuit}>Quit</button>
      </header>

      {/* everyone else, across the top */}
      <section className="opponents-row">
        {others.map((i) => (
          <PlayerZone key={i} game={game} index={i} compact />
        ))}
      </section>

      {/* the middle of the table */}
      <section className="deal-center">
        <div className="pile">
          <CardBack count={game.drawPile.length} />
          <small>Draw pile</small>
        </div>
        <div className="pile">
          {game.discard.length ? <DealCard card={game.discard[game.discard.length - 1]} /> : <div className="dcard big empty-slot" />}
          <small>Discard</small>
        </div>
        <div className={`center-panel${myTurn ? ' yours' : ''}`}>
          <p className="deal-status">{status}</p>
          {game.phase === 'play' && (
            <div className="plays">
              {Array.from({ length: PLAYS_PER_TURN }, (_, k) => (
                <span key={k} className={`play-dot${k < game.playsLeft ? ' on' : ''}`} />
              ))}
              <span>{game.playsLeft} play{game.playsLeft === 1 ? '' : 's'} left</span>
            </div>
          )}
          {myTurn && (
            <button className="btn primary" onClick={() => dispatch({ type: 'END_TURN', player: viewer })}>
              End turn{me.hand.length > HAND_LIMIT ? ` (discard ${me.hand.length - HAND_LIMIT})` : ''}
            </button>
          )}
          <ul className="deal-log">
            {game.log.slice(0, 4).map((l, k) => (
              <li key={`${game.log.length}-${k}`}>{l}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* me: my table and bank, then my hand */}
      <section className="my-zone">
        <PlayerZone game={game} index={viewer} onWild={myTurn ? setWildMenu : null} />
        <div className="hand-row">
          {me.hand.map((card) => {
            const o = cardOptions(game, card)
            const usable = myTurn && (o.property || o.bank || o.action)
            return <DealCard key={card.id} card={card} onClick={usable ? () => setMenu({ card, step: 'choose' }) : undefined} dim={myTurn && !usable} />
          })}
          {!me.hand.length && <p className="muted">No cards in hand. You'll draw 5 next turn.</p>}
        </div>
      </section>

      {menu && <PlayMenu game={game} viewer={viewer} menu={menu} setMenu={setMenu} dispatch={dispatch} />}
      {wildMenu && <WildMenu game={game} viewer={viewer} prop={wildMenu} onClose={() => setWildMenu(null)} dispatch={dispatch} />}
      {game.phase === 'respond' && !game.players[pd.awaiting].isBot && <RespondModal game={game} dispatch={dispatch} />}
      {game.phase === 'pay' && !game.players[pd.target].isBot && <PayModal key={`${pd.target}-${pd.amount}`} game={game} dispatch={dispatch} />}
      {game.phase === 'discard' && !game.players[game.current].isBot && <DiscardModal game={game} dispatch={dispatch} />}
      {game.phase === 'over' && <DealOver game={game} onPlayAgain={onPlayAgain} onQuit={onQuit} />}
    </div>
  )
}

function statusText(g, viewer) {
  const cur = g.players[g.current]
  const pd = g.pending
  if (g.phase === 'over') return `${g.players[g.winner].name} wins!`
  if (g.phase === 'respond') return `${g.players[pd.awaiting].name} is deciding whether to say no…`
  if (g.phase === 'pay') return `${g.players[pd.target].name} is paying ${money(pd.amount)} to ${g.players[pd.from].name}`
  if (g.phase === 'discard') return `${cur.name} has too many cards and discards`
  if (g.current === viewer && !cur.isBot) return g.playsLeft ? 'Your turn: click a card in your hand to play it' : 'No plays left: end your turn'
  return `${cur.name}'s turn${cur.isBot ? '…' : ''}`
}

// ---------------- a player's table: sets, buildings, bank ----------------

export function PlayerZone({ game, index, compact, onWild, pick }) {
  const p = game.players[index]
  const turn = game.current === index && game.phase !== 'over'
  const colors = Object.keys(SETS).filter((c) => colorCards(p, c).length)
  const done = completeColors(p).length
  return (
    <div className={`pzone${compact ? ' compact' : ''}${turn ? ' turn' : ''}`} style={{ '--c': p.color ?? '#64748b' }}>
      <div className="pzone-head">
        <span className="ptoken">
          <PieceIcon id={p.piece} color={p.color} />
        </span>
        <div className="pzone-name">
          <strong>{p.name}</strong>
          <small>{p.isBot ? 'Bot' : 'Human'}{turn ? ' · playing' : ''}</small>
        </div>
        <div className="pzone-stats">
          <span className="stat sets" title="Complete sets (3 wins)">
            {Array.from({ length: 3 }, (_, k) => <i key={k} className={k < done ? 'on' : ''} />)}
          </span>
          <span className="stat" title="Money in the bank">🏦 {money(bankTotal(p))}</span>
          {compact && <span className="stat" title="Cards in hand">🂠 {p.hand.length}</span>}
        </div>
      </div>
      <div className="sets-row">
        {colors.length === 0 && <span className="muted small">No properties yet</span>}
        {colors.map((c) => {
          const cards = colorCards(p, c)
          const full = isComplete(p, c)
          const b = p.buildings[c]
          return (
            <div key={c} className={`set-stack${full ? ' full' : ''}`} style={{ '--sc': colorHex(c) }} title={`${SETS[c].name}: ${cards.length}/${SETS[c].size} · rent ${money(rentFor(p, c))}`}>
              <div className="stack-cards" style={{ '--n': cards.length }}>
                {cards.map((x, k) => (
                  <div key={x.card.id} className="stack-slot" style={{ '--k': k }}>
                    <DealCard
                      card={x.card}
                      size="small"
                      as={x.card.kind === 'wild' ? x.color : undefined}
                      onClick={pick ? (pick.can(x) ? () => pick.on(x) : undefined) : onWild && x.card.kind === 'wild' ? () => onWild(x) : undefined}
                      dim={pick && !pick.can(x)}
                      selected={pick?.selected === x.card.id}
                    />
                  </div>
                ))}
              </div>
              <span className="set-label">
                {cards.length}/{SETS[c].size} · {money(rentFor(p, c))}
                {b?.house && ' 🏠'}
                {b?.hotel && ' 🏨'}
              </span>
            </div>
          )
        })}
      </div>
      {!compact && p.bank.length > 0 && (
        <div className="bank-row">
          <span className="bank-label">Bank {money(bankTotal(p))}</span>
          {p.bank.map((c) => (
            <DealCard key={c.id} card={c} size="small" />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------- playing a card from your hand ----------------

function PlayMenu({ game, viewer, menu, setMenu, dispatch }) {
  const { card } = menu
  const me = game.players[viewer]
  const o = cardOptions(game, card)
  const close = () => setMenu(null)
  const send = (action) => {
    dispatch({ player: viewer, ...action })
    close()
  }
  const others = activeOthers(game)
  const doubleCard = me.hand.find((c) => c.action === 'double')

  let body
  if (menu.step === 'choose') {
    body = (
      <div className="menu-options">
        {o.property && card.kind === 'property' && <button className="btn primary" onClick={() => send({ type: 'PLAY_PROPERTY', cardId: card.id })}>Put it on the table</button>}
        {o.property && card.kind === 'wild' && (
          <div className="color-choices">
            <span>Put it on the table as:</span>
            {(card.colors === 'any' ? Object.keys(SETS) : card.colors).map((c) => (
              <button key={c} className="color-btn" style={{ '--c': colorHex(c) }} onClick={() => send({ type: 'PLAY_PROPERTY', cardId: card.id, color: c })}>
                {SETS[c].name} <small>{colorCards(me, c).length}/{SETS[c].size}</small>
              </button>
            ))}
          </div>
        )}
        {o.action && (
          <button className="btn primary" onClick={() => startAction(card, setMenu, send)}>
            {card.kind === 'rent' ? 'Charge rent' : `Play ${ACTIONS[card.action].name}`}
          </button>
        )}
        {o.bank && <button className="btn" onClick={() => send({ type: 'BANK', cardId: card.id })}>Put in the bank (+{money(card.value)})</button>}
        {card.kind === 'action' && (card.action === 'no' || card.action === 'double') && (
          <p className="muted small">{card.action === 'no' ? 'Just Say No is played when someone acts against you. Keep it in your hand!' : 'Double the Rent is played together with a rent card.'}</p>
        )}
      </div>
    )
  } else if (menu.step === 'target') {
    body = (
      <div className="menu-options">
        <span>{menu.prompt}</span>
        {others.map((i) => (
          <button key={i} className="btn" onClick={() => send({ ...menu.action, target: i })}>
            {game.players[i].name} <small>· {money(assetsTotal(game.players[i]))} on the table</small>
          </button>
        ))}
      </div>
    )
  } else if (menu.step === 'rent') {
    const colors = rentColors(game, card)
    const canDouble = doubleCard && game.playsLeft >= 2
    body = (
      <div className="menu-options">
        <span>Charge rent for which set?</span>
        <div className="color-choices">
          {colors.map((c) => (
            <button key={c} className={`color-btn${menu.color === c ? ' on' : ''}`} style={{ '--c': colorHex(c) }} onClick={() => setMenu({ ...menu, color: c })}>
              {SETS[c].name} <small>{money(rentFor(me, c))}</small>
            </button>
          ))}
        </div>
        {canDouble && (
          <label className="check">
            <input type="checkbox" checked={!!menu.doubled} onChange={(e) => setMenu({ ...menu, doubled: e.target.checked })} /> Also play Double the Rent (uses 2 plays)
          </label>
        )}
        {menu.color && (
          card.colors === 'any' ? (
            <>
              <span>Who pays {money(rentFor(me, menu.color) * (menu.doubled ? 2 : 1))}?</span>
              {others.map((i) => (
                <button key={i} className="btn" onClick={() => send({ type: 'PLAY_ACTION', cardId: card.id, color: menu.color, target: i, doubles: menu.doubled ? [doubleCard.id] : [] })}>
                  {game.players[i].name}
                </button>
              ))}
            </>
          ) : (
            <button className="btn primary" onClick={() => send({ type: 'PLAY_ACTION', cardId: card.id, color: menu.color, doubles: menu.doubled ? [doubleCard.id] : [] })}>
              Everyone pays {money(rentFor(me, menu.color) * (menu.doubled ? 2 : 1))}
            </button>
          )
        )}
      </div>
    )
  } else if (menu.step === 'steal' || menu.step === 'swap-theirs') {
    body = (
      <div className="menu-options wide">
        <span>{menu.step === 'steal' ? 'Pick a property to take (not from a complete set):' : 'Pick the property you want:'}</span>
        {others.map((i) => (
          <PlayerZone
            key={i}
            game={game}
            index={i}
            compact
            pick={{
              can: (x) => takeable(game.players[i], x.card.id),
              on: (x) =>
                menu.step === 'steal'
                  ? send({ type: 'PLAY_ACTION', cardId: card.id, target: i, propId: x.card.id })
                  : setMenu({ ...menu, step: 'swap-mine', target: i, propId: x.card.id }),
            }}
          />
        ))}
      </div>
    )
  } else if (menu.step === 'swap-mine') {
    body = (
      <div className="menu-options wide">
        <span>Which of your properties do you give in return?</span>
        <PlayerZone
          game={game}
          index={viewer}
          compact
          pick={{ can: () => true, on: (x) => send({ type: 'PLAY_ACTION', cardId: card.id, target: menu.target, propId: menu.propId, myPropId: x.card.id }) }}
        />
      </div>
    )
  } else if (menu.step === 'breaker') {
    body = (
      <div className="menu-options">
        <span>Steal which complete set?</span>
        {others.flatMap((i) =>
          completeColors(game.players[i]).map((c) => (
            <button key={`${i}-${c}`} className="color-btn wide" style={{ '--c': colorHex(c) }} onClick={() => send({ type: 'PLAY_ACTION', cardId: card.id, target: i, color: c })}>
              {game.players[i].name}'s {SETS[c].name} set <small>rent {money(rentFor(game.players[i], c))}</small>
            </button>
          )),
        )}
      </div>
    )
  } else if (menu.step === 'build') {
    body = (
      <div className="menu-options">
        <span>Build on which complete set?</span>
        <div className="color-choices">
          {buildable(me, card.action).map((c) => (
            <button key={c} className="color-btn" style={{ '--c': colorHex(c) }} onClick={() => send({ type: 'PLAY_ACTION', cardId: card.id, color: c })}>
              {SETS[c].name}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="overlay" onClick={close}>
      <div className="play-menu" onClick={(e) => e.stopPropagation()}>
        <DealCard card={card} />
        <div className="menu-body">
          <h3>{cardLabel(card)}</h3>
          {body}
          <button className="btn-link" onClick={menu.step === 'choose' ? close : () => setMenu({ card, step: 'choose' })}>{menu.step === 'choose' ? 'Cancel' : '← Back'}</button>
        </div>
      </div>
    </div>
  )
}

// what playing an action card asks for next
function startAction(card, setMenu, send) {
  if (card.kind === 'rent') return setMenu({ card, step: 'rent' })
  switch (card.action) {
    case 'passgo':
    case 'birthday':
      return send({ type: 'PLAY_ACTION', cardId: card.id })
    case 'debt':
      return setMenu({ card, step: 'target', prompt: 'Who pays you $5M?', action: { type: 'PLAY_ACTION', cardId: card.id } })
    case 'sly':
      return setMenu({ card, step: 'steal' })
    case 'forced':
      return setMenu({ card, step: 'swap-theirs' })
    case 'breaker':
      return setMenu({ card, step: 'breaker' })
    case 'house':
    case 'hotel':
      return setMenu({ card, step: 'build' })
    default:
  }
}

function WildMenu({ game, viewer, prop, onClose, dispatch }) {
  const colors = prop.card.colors === 'any' ? Object.keys(SETS) : prop.card.colors
  const me = game.players[viewer]
  return (
    <div className="overlay" onClick={onClose}>
      <div className="play-menu" onClick={(e) => e.stopPropagation()}>
        <DealCard card={prop.card} as={prop.color} />
        <div className="menu-body">
          <h3>Move this wildcard</h3>
          <p className="muted small">Free: it doesn't use a play.</p>
          <div className="color-choices">
            {colors.map((c) => (
              <button
                key={c}
                disabled={c === prop.color}
                className={`color-btn${c === prop.color ? ' on' : ''}`}
                style={{ '--c': colorHex(c) }}
                onClick={() => {
                  dispatch({ type: 'MOVE_WILD', player: viewer, cardId: prop.card.id, color: c })
                  onClose()
                }}
              >
                {SETS[c].name} <small>{colorCards(me, c).length}/{SETS[c].size}</small>
              </button>
            ))}
          </div>
          <button className="btn-link" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ---------------- answering, paying, discarding ----------------

function describe(game) {
  const pd = game.pending
  const from = game.players[pd.from].name
  switch (pd.kind) {
    case 'charge':
      return `${from} wants ${money(pd.amount)} from you${pd.card.kind === 'rent' ? ` (rent for ${SETS[pd.color].name})` : pd.card.action === 'birthday' ? ' (birthday gift)' : ' (debt)'}`
    case 'sly':
      return `${from} wants to take your ${cardLabel(game.players[pd.target].props.find((x) => x.card.id === pd.propId)?.card ?? {})}`
    case 'forced':
      return `${from} wants to swap properties with you`
    case 'breaker':
      return `${from} wants to take your whole ${SETS[pd.color].name} set!`
    default:
      return ''
  }
}

function RespondModal({ game, dispatch }) {
  const pd = game.pending
  const who = pd.awaiting
  const defending = who === pd.target
  const playerName = game.players[who].name
  return (
    <div className="overlay">
      <div className="respond-card">
        <span className="respond-icon">{defending ? '⚠️' : '✋'}</span>
        <h3>{playerName}{defending ? '' : ', they said no!'}</h3>
        <p>{defending ? describe(game) : `${game.players[pd.target].name} played Just Say No on your ${pd.card.kind === 'rent' ? 'rent' : ACTIONS[pd.card.action]?.name}. Say no back?`}</p>
        <div className="respond-btns">
          <button className="btn danger" onClick={() => dispatch({ type: 'SAY_NO', player: who })}>✋ Just Say No!</button>
          <button className="btn" onClick={() => dispatch({ type: 'ACCEPT', player: who })}>{defending ? 'Accept' : 'Let it go'}</button>
        </div>
      </div>
    </div>
  )
}

function PayModal({ game, dispatch }) {
  const pd = game.pending
  const payer = game.players[pd.target]
  const own = useMemo(() => assets(payer), [payer])
  const [picked, setPicked] = useState([])
  const total = own.filter((a) => picked.includes(a.card.id)).reduce((t, a) => t + a.card.value, 0)
  const enough = total >= pd.amount
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const groups = [
    ['From your bank', own.filter((a) => a.from === 'bank')],
    ['Buildings', own.filter((a) => a.from === 'building')],
    ['Properties (they go to their table)', own.filter((a) => a.from === 'prop')],
  ]
  return (
    <div className="overlay">
      <div className="pay-card">
        <h3>{payer.name}, pay {money(pd.amount)} to {game.players[pd.from].name}</h3>
        <p className="muted small">Pick cards from your table. No change is given.</p>
        {groups.map(([title, list]) =>
          list.length ? (
            <div key={title} className="pay-group">
              <span>{title}</span>
              <div className="pay-cards">
                {list.map((a) => (
                  <DealCard key={a.card.id} card={a.card} size="small" selected={picked.includes(a.card.id)} onClick={() => toggle(a.card.id)} />
                ))}
              </div>
            </div>
          ) : null,
        )}
        <div className="pay-foot">
          <span className={`pay-total${enough ? ' ok' : ''}`}>
            {money(total)} / {money(pd.amount)}
          </span>
          <button className="btn primary" disabled={!enough} onClick={() => dispatch({ type: 'PAY', player: pd.target, cardIds: picked })}>
            Pay
          </button>
        </div>
      </div>
    </div>
  )
}

function DiscardModal({ game, dispatch }) {
  const p = game.players[game.current]
  const extra = p.hand.length - HAND_LIMIT
  const [picked, setPicked] = useState([])
  const toggle = (id) => setPicked((x) => (x.includes(id) ? x.filter((y) => y !== id) : x.length < extra ? [...x, id] : x))
  return (
    <div className="overlay">
      <div className="pay-card">
        <h3>Too many cards: discard {extra}</h3>
        <p className="muted small">You can keep {HAND_LIMIT} cards at the end of your turn.</p>
        <div className="pay-cards">
          {p.hand.map((c) => (
            <DealCard key={c.id} card={c} size="small" selected={picked.includes(c.id)} onClick={() => toggle(c.id)} />
          ))}
        </div>
        <div className="pay-foot">
          <span className="pay-total ok">{picked.length} / {extra}</span>
          <button className="btn primary" disabled={picked.length !== extra} onClick={() => dispatch({ type: 'DISCARD', player: game.current, cardIds: picked })}>
            Discard
          </button>
        </div>
      </div>
    </div>
  )
}

function DealOver({ game, onPlayAgain, onQuit }) {
  const w = game.players[game.winner]
  const ranking = game.players.map((p, i) => ({ i, sets: completeColors(p).length, worth: assetsTotal(p) })).sort((a, b) => (a.i === game.winner ? -1 : b.i === game.winner ? 1 : b.sets - a.sets || b.worth - a.worth))
  return (
    <div className="overlay">
      <div className="game-over">
        <div className="trophy">🏆</div>
        <h2>{w.name} wins!</h2>
        <p className="muted">3 complete property sets</p>
        <ol className="standings">
          {ranking.map((r, k) => (
            <li key={r.i} style={{ '--c': game.players[r.i].color }}>
              <span className="rank">{k + 1}</span>
              <span className="who">{game.players[r.i].name}</span>
              <span className="what">{r.sets} set{r.sets === 1 ? '' : 's'} · {money(r.worth)}</span>
            </li>
          ))}
        </ol>
        <div className="prompt-buttons">
          <button className="btn primary" onClick={onPlayAgain}>Play again</button>
          <button className="btn" onClick={onQuit}>Change players</button>
        </div>
      </div>
    </div>
  )
}
