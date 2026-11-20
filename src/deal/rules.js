// Landlord Deal: the property card game, as one reducer.
//
// A turn: draw 2 (5 if your hand is empty) -> up to 3 plays -> end turn (discard down to 7).
// A play: put a property down, put a card in your bank, or play an action / rent card.
// Win: 3 complete property sets of different colors on the table.
//
// Phases:
//   play     - the current player plays cards (PLAY_PROPERTY, BANK, PLAY_ACTION, MOVE_WILD, END_TURN)
//   respond  - someone was hit by an action: whoever is `pending.awaiting` sends SAY_NO (Just Say No) or ACCEPT
//   pay      - `pending.target` chooses cards from their bank / table to pay (PAY)
//   discard  - the current player has more than 7 cards at the end of their turn (DISCARD)
//   over     - someone has 3 complete sets
import { buildDeck, SETS, ACTIONS, cardLabel } from './cards.js'

export const PLAYS_PER_TURN = 3
export const HAND_LIMIT = 7

const shuffle = (a) => {
  const arr = [...a]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
const money = (n) => `$${n}M`

// ---------------- questions about a player's table ----------------

export const colorCards = (p, c) => p.props.filter((x) => x.color === c)
const hasRealCard = (cards) => cards.some((x) => x.card.colors !== 'any')

// a full set needs `size` cards of that color, and not only any-color wildcards
export function isComplete(p, c) {
  const cards = colorCards(p, c)
  return cards.length >= SETS[c].size && hasRealCard(cards)
}
export const completeColors = (p) => Object.keys(SETS).filter((c) => isComplete(p, c))

export function rentFor(p, c) {
  const cards = colorCards(p, c)
  if (!cards.length || !hasRealCard(cards)) return 0
  const set = SETS[c]
  let rent = set.rent[Math.min(cards.length, set.size) - 1]
  if (isComplete(p, c)) {
    if (p.buildings[c]?.house) rent += 3
    if (p.buildings[c]?.hotel) rent += 4
  }
  return rent
}

// can another player take this property with Sly Deal / Forced Deal? (not out of a complete set)
export function takeable(p, cardId) {
  const prop = p.props.find((x) => x.card.id === cardId)
  if (!prop) return false
  const n = colorCards(p, prop.color).length
  return !isComplete(p, prop.color) || n > SETS[prop.color].size
}

export const bankTotal = (p) => p.bank.reduce((t, c) => t + c.value, 0)

// everything on the table that can pay a debt (any-color wildcards are worth nothing and can't pay)
export function assets(p) {
  const list = [...p.bank.map((c) => ({ card: c, from: 'bank' })), ...p.props.filter((x) => x.card.value > 0).map((x) => ({ card: x.card, from: 'prop' }))]
  for (const [c, b] of Object.entries(p.buildings)) {
    if (b.house) list.push({ card: b.house, from: 'building', color: c })
    if (b.hotel) list.push({ card: b.hotel, from: 'building', color: c })
  }
  return list
}
export const assetsTotal = (p) => assets(p).reduce((t, a) => t + a.card.value, 0)

// what the current player may do with a card from their hand right now
export function cardOptions(s, card) {
  const p = s.players[s.current]
  const o = { property: false, bank: false, action: false }
  if (s.phase !== 'play' || s.playsLeft < 1) return o
  if (card.kind === 'property' || card.kind === 'wild') o.property = true
  else o.bank = true
  if (card.kind === 'rent') o.action = rentColors(s, card).length > 0
  if (card.kind === 'action') {
    const others = activeOthers(s)
    switch (card.action) {
      case 'passgo':
      case 'birthday':
      case 'debt':
        o.action = true
        break
      case 'sly':
        o.action = others.some((i) => s.players[i].props.some((x) => takeable(s.players[i], x.card.id)))
        break
      case 'forced':
        o.action = p.props.length > 0 && others.some((i) => s.players[i].props.some((x) => takeable(s.players[i], x.card.id)))
        break
      case 'breaker':
        o.action = others.some((i) => completeColors(s.players[i]).length > 0)
        break
      case 'house':
        o.action = buildable(p, 'house').length > 0
        break
      case 'hotel':
        o.action = buildable(p, 'hotel').length > 0
        break
      default: // Just Say No and Double the Rent are only played as answers / with a rent card
    }
  }
  return o
}

export const activeOthers = (s) => s.players.map((_, i) => i).filter((i) => i !== s.current)

// colors a rent card can charge for (you must have properties of that color)
export function rentColors(s, card, p = s.players[s.current]) {
  const colors = card.colors === 'any' ? Object.keys(SETS) : card.colors
  return colors.filter((c) => rentFor(p, c) > 0)
}

export function buildable(p, kind) {
  return completeColors(p).filter((c) => c !== 'station' && c !== 'utility' && (kind === 'house' ? !p.buildings[c]?.house : p.buildings[c]?.house && !p.buildings[c]?.hotel))
}

// ---------------- helpers that change the state ----------------

function log(s, text) {
  s.log = [text, ...s.log].slice(0, 60)
}

function draw(s, p, n) {
  for (let k = 0; k < n; k++) {
    if (!s.drawPile.length) {
      if (!s.discard.length) return
      s.drawPile = shuffle(s.discard) // the discard pile becomes the new draw pile
      s.discard = []
      log(s, 'The discard pile is shuffled into a new draw pile')
    }
    s.players[p].hand.push(s.drawPile.pop())
  }
}

function fromHand(s, p, cardId) {
  const hand = s.players[p].hand
  const i = hand.findIndex((c) => c.id === cardId)
  return i < 0 ? null : hand.splice(i, 1)[0]
}

// a property card's color when it arrives on someone's table
function landColor(card, wanted) {
  if (card.kind === 'property') return card.color
  if (card.colors === 'any') return wanted ?? 'brown'
  return card.colors.includes(wanted) ? wanted : card.colors[0]
}
function placeProp(p, card, color) {
  // an any-color wildcard joins the set it helps most: the color you have most of
  if (card.colors === 'any' && !color) {
    const counts = Object.keys(SETS).map((c) => [c, colorCards(p, c).filter((x) => x.card.colors !== 'any').length])
    counts.sort((a, b) => b[1] - a[1])
    color = counts[0][1] ? counts[0][0] : 'brown'
  }
  p.props.push({ card, color: landColor(card, color) })
}

// a set that's no longer complete loses its buildings: they go to the owner's bank
function tidyBuildings(p) {
  for (const c of Object.keys(p.buildings)) {
    const b = p.buildings[c]
    if (isComplete(p, c)) continue
    if (b.house) p.bank.push(b.house)
    if (b.hotel) p.bank.push(b.hotel)
    delete p.buildings[c]
  }
}

function takeProp(p, cardId) {
  const i = p.props.findIndex((x) => x.card.id === cardId)
  if (i < 0) return null
  const [prop] = p.props.splice(i, 1)
  tidyBuildings(p)
  return prop
}

function checkWin(s) {
  if (s.phase === 'over') return true
  const order = [s.current, ...s.players.map((_, i) => i).filter((i) => i !== s.current)]
  for (const i of order) {
    if (completeColors(s.players[i]).length >= 3) {
      s.winner = i
      s.phase = 'over'
      s.pending = null
      log(s, `${s.players[i].name} completes 3 sets and wins!`)
      return true
    }
  }
  return false
}

function startTurn(s, p) {
  s.current = p
  s.turn += 1
  s.playsLeft = PLAYS_PER_TURN
  s.phase = 'play'
  const n = s.players[p].hand.length === 0 ? 5 : 2
  draw(s, p, n)
  s.lastDraw = { player: p, count: n, id: ++s.eventId }
  log(s, `${s.players[p].name} draws ${n} cards`)
}

// ---------------- actions against other players ----------------
// pending = { kind, from, card, targets: [queue], target, amount, color, propId, myPropId, chain, awaiting }

function beginPending(s, pending) {
  s.pending = { ...pending, targets: [...pending.targets], target: null, chain: 0, awaiting: null }
  nextTarget(s)
}

function nextTarget(s) {
  const pd = s.pending
  if (checkWin(s)) return
  if (!pd.targets.length) {
    s.pending = null
    s.phase = 'play'
    return
  }
  pd.target = pd.targets.shift()
  pd.chain = 0
  pd.awaiting = pd.target
  s.phase = 'respond'
  autoRespond(s)
}

const holdsNo = (s, p) => s.players[p].hand.some((c) => c.kind === 'action' && c.action === 'no')

// skip the question when the player who'd answer has no Just Say No
function autoRespond(s) {
  while (s.phase === 'respond' && !holdsNo(s, s.pending.awaiting)) accept(s)
}

function accept(s) {
  const pd = s.pending
  if (pd.awaiting === pd.target) applyEffect(s)
  else {
    log(s, `${s.players[pd.target].name}'s Just Say No stands`)
    nextTarget(s)
  }
}

function applyEffect(s) {
  const pd = s.pending
  const from = s.players[pd.from]
  const to = s.players[pd.target]
  switch (pd.kind) {
    case 'charge': {
      const total = assetsTotal(to)
      if (total === 0) {
        log(s, `${to.name} has nothing to pay with`)
        return nextTarget(s)
      }
      if (total <= pd.amount) {
        // everything they have isn't enough: it all goes
        transfer(s, pd.target, pd.from, assets(to).map((a) => a.card.id))
        log(s, `${to.name} pays everything they have (${money(total)})`)
        return nextTarget(s)
      }
      s.phase = 'pay'
      return
    }
    case 'sly': {
      const prop = takeProp(to, pd.propId)
      if (prop) {
        placeProp(from, prop.card, prop.color)
        log(s, `${from.name} takes ${cardLabel(prop.card)} from ${to.name}`)
      }
      return nextTarget(s)
    }
    case 'forced': {
      const theirs = takeProp(to, pd.propId)
      const mine = takeProp(from, pd.myPropId)
      if (theirs) placeProp(from, theirs.card, theirs.color)
      if (mine) placeProp(to, mine.card, mine.color)
      log(s, `${from.name} swaps ${mine ? cardLabel(mine.card) : '?'} for ${to.name}'s ${theirs ? cardLabel(theirs.card) : '?'}`)
      return nextTarget(s)
    }
    case 'breaker': {
      const c = pd.color
      if (isComplete(to, c)) {
        // take a full set: real cards first, then wildcards
        const cards = colorCards(to, c).sort((a, b) => (a.card.kind === 'property' ? 0 : 1) - (b.card.kind === 'property' ? 0 : 1)).slice(0, SETS[c].size)
        const b = to.buildings[c]
        delete to.buildings[c]
        for (const x of cards) {
          to.props.splice(to.props.indexOf(x), 1)
          from.props.push({ card: x.card, color: c })
        }
        // the house / hotel come along, unless the taker already has buildings on that color (then they bank them)
        if (b && !from.buildings[c]) from.buildings[c] = b
        else if (b) {
          if (b.house) from.bank.push(b.house)
          if (b.hotel) from.bank.push(b.hotel)
        }
        tidyBuildings(to)
        log(s, `${from.name} breaks the deal: takes ${to.name}'s ${SETS[c].name} set!`)
      }
      return nextTarget(s)
    }
    default:
      return nextTarget(s)
  }
}

// payment: bank cards and buildings go to the receiver's bank, properties to their table (no change is given)
function transfer(s, fromIdx, toIdx, cardIds) {
  const from = s.players[fromIdx]
  const to = s.players[toIdx]
  for (const id of cardIds) {
    const bi = from.bank.findIndex((c) => c.id === id)
    if (bi >= 0) {
      to.bank.push(from.bank.splice(bi, 1)[0])
      continue
    }
    const prop = from.props.find((x) => x.card.id === id)
    if (prop) {
      from.props.splice(from.props.indexOf(prop), 1)
      placeProp(to, prop.card, prop.color)
      continue
    }
    for (const [c, b] of Object.entries(from.buildings)) {
      if (b.house?.id === id) {
        to.bank.push(b.house)
        b.house = null
      }
      if (b.hotel?.id === id) {
        to.bank.push(b.hotel)
        b.hotel = null
      }
      if (!b.house && !b.hotel) delete from.buildings[c]
    }
  }
  tidyBuildings(from)
}

// ---------------- new game ----------------

export function newDeal({ seats }) {
  const s = {
    game: 'deal',
    players: seats.map((seat, i) => ({ name: seat.name, isBot: seat.isBot, color: seat.color, piece: seat.piece, index: i, hand: [], bank: [], props: [], buildings: {} })),
    drawPile: shuffle(buildDeck()),
    discard: [],
    current: 0,
    turn: 0,
    playsLeft: PLAYS_PER_TURN,
    phase: 'play',
    pending: null,
    winner: null,
    log: [],
    eventId: 0,
    lastPlay: null,
  }
  for (let i = 0; i < s.players.length; i++) draw(s, i, 5)
  const first = Math.floor(Math.random() * s.players.length)
  log(s, `Everyone is dealt 5 cards. ${s.players[first].name} goes first`)
  startTurn(s, first)
  return s
}

// ---------------- the reducer ----------------
// Actions carry `player` (who sends it) so answers from other players are checked too.

export function dealReducer(state, action) {
  if (action.type === 'NEW') return newDeal(action)
  if (!state || state.phase === 'over') return state
  const s = structuredClone(state)
  const me = s.current
  const p = s.players[me]
  const who = action.player ?? me
  const noted = (card, text) => {
    s.lastPlay = { player: me, card, id: ++s.eventId }
    log(s, text)
  }

  switch (action.type) {
    case 'PLAY_PROPERTY': {
      if (s.phase !== 'play' || who !== me || s.playsLeft < 1) return state
      const card = p.hand.find((c) => c.id === action.cardId)
      if (!card || (card.kind !== 'property' && card.kind !== 'wild')) return state
      fromHand(s, me, card.id)
      const color = landColor(card, action.color)
      p.props.push({ card, color })
      s.playsLeft -= 1
      noted(card, `${p.name} plays ${cardLabel(card)}${card.kind === 'wild' ? ` as ${SETS[color].name}` : ''}`)
      checkWin(s)
      return s
    }

    case 'BANK': {
      if (s.phase !== 'play' || who !== me || s.playsLeft < 1) return state
      const card = p.hand.find((c) => c.id === action.cardId)
      if (!card || card.kind === 'property' || card.kind === 'wild') return state // properties never go in the bank
      fromHand(s, me, card.id)
      p.bank.push(card)
      s.playsLeft -= 1
      noted(card, `${p.name} banks ${card.kind === 'money' ? money(card.value) : `${cardLabel(card)} (${money(card.value)})`}`)
      return s
    }

    // turn a wildcard on your table to another of its colors (free, your turn only)
    case 'MOVE_WILD': {
      if (s.phase !== 'play' || who !== me) return state
      const prop = p.props.find((x) => x.card.id === action.cardId)
      if (!prop || prop.card.kind !== 'wild') return state
      const ok = prop.card.colors === 'any' ? !!SETS[action.color] : prop.card.colors.includes(action.color)
      if (!ok || prop.color === action.color) return state
      prop.color = action.color
      tidyBuildings(p)
      log(s, `${p.name} moves a wildcard to ${SETS[action.color].name}`)
      checkWin(s)
      return s
    }

    case 'PLAY_ACTION': {
      if (s.phase !== 'play' || who !== me) return state
      const card = p.hand.find((c) => c.id === action.cardId)
      if (!card || !cardOptions(s, card).action) return state
      const others = activeOthers(s)

      if (card.kind === 'rent') {
        const color = action.color
        if (!rentColors(s, card).includes(color)) return state
        const doubles = (action.doubles ?? []).map((id) => p.hand.find((c) => c.id === id && c.action === 'double')).filter(Boolean)
        if (s.playsLeft < 1 + doubles.length) return state
        const target = card.colors === 'any' ? action.target : null
        if (card.colors === 'any' && !others.includes(target)) return state
        fromHand(s, me, card.id)
        doubles.forEach((d) => s.discard.push(fromHand(s, me, d.id)))
        s.discard.push(card)
        s.playsLeft -= 1 + doubles.length
        const amount = rentFor(p, color) * 2 ** doubles.length
        noted(card, `${p.name} charges ${money(amount)} rent for ${SETS[color].name}${doubles.length ? ' (doubled!)' : ''}${target !== null ? ` to ${s.players[target].name}` : ' to everyone'}`)
        beginPending(s, { kind: 'charge', from: me, card, amount, color, targets: target !== null ? [target] : others })
        return s
      }

      const a = card.action
      const discardIt = () => {
        fromHand(s, me, card.id)
        s.discard.push(card)
        s.playsLeft -= 1
      }
      switch (a) {
        case 'passgo':
          discardIt()
          noted(card, `${p.name} plays Pass Go and draws 2`)
          draw(s, me, 2)
          return s
        case 'birthday':
          discardIt()
          noted(card, `It's ${p.name}'s birthday! Everyone pays ${money(2)}`)
          beginPending(s, { kind: 'charge', from: me, card, amount: 2, targets: others })
          return s
        case 'debt': {
          if (!others.includes(action.target)) return state
          discardIt()
          noted(card, `${p.name} collects a ${money(5)} debt from ${s.players[action.target].name}`)
          beginPending(s, { kind: 'charge', from: me, card, amount: 5, targets: [action.target] })
          return s
        }
        case 'sly': {
          const t = s.players[action.target]
          if (!others.includes(action.target) || !takeable(t, action.propId)) return state
          discardIt()
          noted(card, `${p.name} plays Sly Deal on ${t.name}`)
          beginPending(s, { kind: 'sly', from: me, card, propId: action.propId, targets: [action.target] })
          return s
        }
        case 'forced': {
          const t = s.players[action.target]
          if (!others.includes(action.target) || !takeable(t, action.propId) || !p.props.some((x) => x.card.id === action.myPropId)) return state
          discardIt()
          noted(card, `${p.name} plays Forced Deal on ${t.name}`)
          beginPending(s, { kind: 'forced', from: me, card, propId: action.propId, myPropId: action.myPropId, targets: [action.target] })
          return s
        }
        case 'breaker': {
          const t = s.players[action.target]
          if (!others.includes(action.target) || !isComplete(t, action.color)) return state
          discardIt()
          noted(card, `${p.name} plays Deal Breaker on ${t.name}'s ${SETS[action.color].name} set`)
          beginPending(s, { kind: 'breaker', from: me, card, color: action.color, targets: [action.target] })
          return s
        }
        case 'house':
        case 'hotel': {
          if (!buildable(p, a).includes(action.color)) return state
          fromHand(s, me, card.id)
          s.playsLeft -= 1
          p.buildings[action.color] = { ...(p.buildings[action.color] ?? {}), [a]: card }
          noted(card, `${p.name} builds a ${a} on ${SETS[action.color].name}`)
          return s
        }
        default:
          return state
      }
    }

    case 'SAY_NO': {
      if (s.phase !== 'respond' || who !== s.pending.awaiting) return state
      const card = s.players[who].hand.find((c) => c.kind === 'action' && c.action === 'no')
      if (!card) return state
      fromHand(s, who, card.id)
      s.discard.push(card)
      const pd = s.pending
      pd.chain += 1
      pd.awaiting = pd.awaiting === pd.target ? pd.from : pd.target
      log(s, `${s.players[who].name}: Just Say No!`)
      s.lastNo = { player: who, id: ++s.eventId }
      autoRespond(s)
      return s
    }

    case 'ACCEPT': {
      if (s.phase !== 'respond' || who !== s.pending.awaiting) return state
      accept(s)
      autoRespond(s)
      return s
    }

    case 'PAY': {
      const pd = s.pending
      if (s.phase !== 'pay' || who !== pd.target) return state
      const payer = s.players[who]
      const own = assets(payer)
      const ids = [...new Set(action.cardIds)]
      if (!ids.every((id) => own.some((a) => a.card.id === id))) return state
      const total = own.filter((a) => ids.includes(a.card.id)).reduce((t, a) => t + a.card.value, 0)
      if (total < pd.amount && ids.length < own.length) return state // must cover the debt, unless paying everything
      transfer(s, who, pd.from, ids)
      log(s, `${payer.name} pays ${money(total)} to ${s.players[pd.from].name}`)
      nextTarget(s)
      return s
    }

    case 'END_TURN': {
      if (s.phase !== 'play' || who !== me) return state
      if (p.hand.length > HAND_LIMIT) {
        s.phase = 'discard'
        return s
      }
      startTurn(s, (me + 1) % s.players.length)
      return s
    }

    case 'DISCARD': {
      if (s.phase !== 'discard' || who !== me) return state
      const extra = p.hand.length - HAND_LIMIT
      const ids = [...new Set(action.cardIds)]
      if (ids.length !== extra || !ids.every((id) => p.hand.some((c) => c.id === id))) return state
      ids.forEach((id) => s.discard.push(fromHand(s, me, id)))
      log(s, `${p.name} discards ${extra} card${extra > 1 ? 's' : ''}`)
      startTurn(s, (me + 1) % s.players.length)
      return s
    }

    default:
      return state
  }
}

// who has to act right now
export function actorOf(s) {
  if (s.phase === 'respond') return s.pending.awaiting
  if (s.phase === 'pay') return s.pending.target
  return s.current
}

export { ACTIONS }
