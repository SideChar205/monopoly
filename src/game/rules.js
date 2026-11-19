// The whole game, as one reducer. The UI only sends actions; this file decides what happens.
//
// Turn phases:
//   roll  - the current player rolls (or, in jail, pays the fine / uses a card)
//   buy   - they landed on a property nobody owns: BUY or DECLINE
//   end   - nothing left to do this turn: END_TURN (or build, mortgage...)
//   tax     - Income Tax: TAX_FLAT ($200) or TAX_PERCENT (10% of total worth), chosen before adding it up
//   auction - a property is being auctioned: the bidder whose turn it is sends BID or AUCTION_PASS
//   debt    - they owe more than they have: sell buildings / mortgage, then PAY_DEBT, or BANKRUPT
//   over    - the game has ended
//
// Actions: NEW, ROLL, PAY_FINE, USE_CARD, BUY, DECLINE, TAX_FLAT, TAX_PERCENT, BID, AUCTION_PASS, END_TURN,
//          BUILD, SELL, MORTGAGE, UNMORTGAGE (any player, any time), PAY_DEBT, BANKRUPT, END_GAME
//
// Rules follow the Parker Brothers rulebook (2004/2007 edition).

import {
  SPACES, GROUPS, JAIL, START_SALARY, JAIL_FINE, STARTING_CASH, HOUSES_IN_BANK, HOTELS_IN_BANK,
  isOwnable, groupMembers, STATIONS, UTILITIES, mortgageValue, unmortgageCost,
} from './board.js'
import { DECKS } from './cards.js'

export const TOKEN_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899']

const rollDie = () => 1 + Math.floor(Math.random() * 6)
const shuffled = (n) => {
  const a = Array.from({ length: n }, (_, i) => i)
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const money = (n) => `$${n.toLocaleString('en-US')}`

// ---------------- questions the UI (and bots) ask ----------------

export const activePlayers = (s) => s.players.map((p, i) => (p.out ? -1 : i)).filter((i) => i >= 0)
export const ownsGroup = (s, p, group) => groupMembers(group).every((i) => s.owners[i] === p)
export const propertiesOf = (s, p) => SPACES.map((_, i) => i).filter((i) => s.owners[i] === p)
export const houseCost = (i) => GROUPS[SPACES[i].group]?.house ?? 0

// rent the owner of space i charges (dice: the roll that brought you there)
export function rentFor(s, i, dice) {
  const space = SPACES[i]
  const owner = s.owners[i]
  if (owner === null || s.mortgaged[i]) return 0
  if (space.type === 'street') {
    const h = s.houses[i]
    if (h > 0) return space.rent[h]
    return space.rent[0] * (ownsGroup(s, owner, space.group) ? 2 : 1)
  }
  if (space.type === 'station') {
    const n = STATIONS.filter((j) => s.owners[j] === owner).length
    return 25 * 2 ** (n - 1)
  }
  if (space.type === 'utility') {
    const both = UTILITIES.every((j) => s.owners[j] === owner)
    return (dice ?? 7) * (both ? 10 : 4)
  }
  return 0
}

// everything a player could turn into cash right now (to see if they can survive a debt)
export function sellableValue(s, p) {
  let total = s.players[p].cash
  for (const i of propertiesOf(s, p)) {
    total += (s.houses[i] * houseCost(i)) / 2
    if (!s.mortgaged[i]) total += mortgageValue(SPACES[i])
  }
  return total
}

export function netWorth(s, p) {
  let total = s.players[p].cash
  for (const i of propertiesOf(s, p)) {
    total += s.mortgaged[i] ? mortgageValue(SPACES[i]) : SPACES[i].price
    total += s.houses[i] * houseCost(i)
  }
  return total
}

// "total worth" as the rulebook defines it for Income Tax: cash + printed price of every property
// (mortgaged or not) + the cost of every building
export function totalWorth(s, p) {
  let total = s.players[p].cash
  for (const i of propertiesOf(s, p)) total += SPACES[i].price + s.houses[i] * houseCost(i)
  return total
}

export function canBuild(s, p, i) {
  const space = SPACES[i]
  if (space.type !== 'street' || s.owners[i] !== p) return false
  if (!ownsGroup(s, p, space.group)) return false
  const group = groupMembers(space.group)
  if (group.some((j) => s.mortgaged[j])) return false
  const h = s.houses[i]
  if (h >= 5) return false
  if (h > Math.min(...group.map((j) => s.houses[j]))) return false // build evenly
  if (s.players[p].cash < houseCost(i)) return false
  return h === 4 ? s.bank.hotels > 0 : s.bank.houses > 0
}

export function canSell(s, p, i) {
  if (s.owners[i] !== p || s.houses[i] === 0) return false
  const group = groupMembers(SPACES[i].group)
  if (s.houses[i] < Math.max(...group.map((j) => s.houses[j]))) return false // sell evenly
  return s.houses[i] < 5 || s.bank.houses >= 4 // a hotel turns back into 4 houses
}

export function canMortgage(s, p, i) {
  if (s.owners[i] !== p || s.mortgaged[i]) return false
  const space = SPACES[i]
  if (space.type === 'street' && groupMembers(space.group).some((j) => s.houses[j] > 0)) return false
  return true
}

export const canUnmortgage = (s, p, i) => s.owners[i] === p && s.mortgaged[i] && s.players[p].cash >= unmortgageCost(SPACES[i])

// building, selling and mortgaging are allowed at any time (rulebook), by any player still in the game.
// A player who owes money can only raise it (sell / mortgage), not spend it.
export const canManage = (s, p = s.current) => s.phase !== 'over' && !!s.players[p] && !s.players[p].out
const isDebtor = (s, p) => s.phase === 'debt' && s.debt?.player === p

// ---------------- helpers that change the state ----------------

function addLog(s, text) {
  s.log = [text, ...s.log].slice(0, 40)
}

function nextActive(s, from) {
  const n = s.players.length
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n
    if (!s.players[i].out) return i
  }
  return from
}

function sendToJail(s, p) {
  const player = s.players[p]
  s.lastMove = { player: p, from: player.pos, to: JAIL, kind: 'jump', id: ++s.moveId }
  s.moves.push(s.lastMove)
  player.pos = JAIL
  player.inJail = true
  player.jailTurns = 0
  s.extraRoll = false
  s.doublesInRow = 0
  addLog(s, `${player.name} goes to jail`)
}

// pay someone (to: a player index, 'each' for every other player, or null for the bank).
// If they can't afford it, the game waits in the 'debt' phase until they raise the money or go bankrupt.
function charge(s, p, amount, to, reason, then = null) {
  const player = s.players[p]
  if (amount <= 0) return true
  if (player.cash >= amount) {
    payNow(s, p, amount, to)
    return true
  }
  s.debt = { player: p, amount, to, reason, then }
  s.phase = 'debt'
  addLog(s, `${player.name} owes ${money(amount)} (${reason}) but only has ${money(player.cash)}`)
  return false
}

function payNow(s, p, amount, to) {
  s.players[p].cash -= amount
  if (to === 'each') {
    const others = activePlayers(s).filter((i) => i !== p)
    const share = Math.floor(amount / Math.max(1, others.length))
    others.forEach((i) => (s.players[i].cash += share))
  } else if (to !== null && to !== undefined) {
    s.players[to].cash += amount
  }
}

function drawCard(s, p, deck) {
  const index = s.decks[deck].shift()
  const card = DECKS[deck][index]
  if (card.kind === 'free') s.players[p].jailCards.push({ deck, index })
  else s.decks[deck].push(index)
  s.lastCard = { deck, text: card.text, id: ++s.cardId, player: p }
  addLog(s, `${s.players[p].name} draws ${deck === 'fortune' ? 'Fortune' : 'Town Fund'}: ${card.text}`)
  applyCard(s, p, card)
}

function applyCard(s, p, card) {
  const player = s.players[p]
  switch (card.kind) {
    case 'move':
      return moveTo(s, p, card.to)
    case 'back': {
      const to = (player.pos - card.steps + 40) % 40
      s.lastMove = { player: p, from: player.pos, to, kind: 'back', id: ++s.moveId }
      s.moves.push(s.lastMove)
      player.pos = to
      return landOn(s, p)
    }
    case 'nearest': {
      const list = card.near === 'station' ? STATIONS : UTILITIES
      let to = list.find((i) => i > player.pos)
      if (to === undefined) to = list[0]
      return moveTo(s, p, to, card.near)
    }
    case 'jail':
      return sendToJail(s, p)
    case 'money':
      if (card.amount > 0) player.cash += card.amount
      else charge(s, p, -card.amount, null, 'card')
      return
    case 'each':
      if (card.amount > 0) {
        // everyone else pays what they can
        for (const i of activePlayers(s)) {
          if (i === p) continue
          const paid = Math.min(card.amount, s.players[i].cash)
          s.players[i].cash -= paid
          player.cash += paid
        }
      } else {
        const others = activePlayers(s).filter((i) => i !== p).length
        charge(s, p, -card.amount * others, 'each', 'card')
      }
      return
    case 'repairs': {
      let cost = 0
      for (const i of propertiesOf(s, p)) cost += s.houses[i] === 5 ? card.hotel : s.houses[i] * card.house
      if (cost) addLog(s, `${player.name} pays ${money(cost)} for repairs`)
      charge(s, p, cost, null, 'repairs')
      return
    }
    default:
  }
}

// move forward to a space, collecting the salary when passing (or landing on) Start
function moveTo(s, p, to, special = null) {
  const player = s.players[p]
  const from = player.pos
  if (to < from || (to === 0 && from !== 0)) {
    player.cash += START_SALARY
    addLog(s, `${player.name} passes Start and collects ${money(START_SALARY)}`)
  }
  s.lastMove = { player: p, from, to, kind: 'forward', id: ++s.moveId }
  s.moves.push(s.lastMove)
  player.pos = to
  landOn(s, p, special)
}

function landOn(s, p, special = null) {
  const player = s.players[p]
  const i = player.pos
  const space = SPACES[i]
  switch (space.type) {
    case 'gotojail':
      return sendToJail(s, p)
    case 'tax':
      if (space.choice) {
        s.phase = 'tax' // Income Tax: the player chooses how to pay
        return
      }
      addLog(s, `${player.name} pays ${money(space.amount)} ${space.name}`)
      return void charge(s, p, space.amount, null, space.name)
    case 'fortune':
    case 'fund':
      return drawCard(s, p, space.type)
    default:
  }
  if (!isOwnable(space)) return
  const owner = s.owners[i]
  if (owner === null) {
    s.phase = 'buy'
    return
  }
  if (owner === p) return
  if (s.mortgaged[i]) {
    addLog(s, `${space.name} is mortgaged: no rent`)
    return
  }
  let rent
  if (special === 'utility') {
    const a = rollDie()
    const b = rollDie()
    rent = (a + b) * 10
    addLog(s, `${player.name} rolls ${a + b} for the utility`)
  } else {
    rent = rentFor(s, i, s.dice ? s.dice[0] + s.dice[1] : 7) * (special === 'station' ? 2 : 1)
  }
  addLog(s, `${player.name} pays ${money(rent)} rent to ${s.players[owner].name}`)
  s.lastRent = { from: p, to: owner, amount: rent, id: ++s.cardId }
  charge(s, p, rent, owner, `rent for ${space.name}`)
}

// after a move has been dealt with: roll again (doubles) or end the turn
function finish(s) {
  if (s.phase !== 'resolving') return
  s.phase = s.extraRoll ? 'roll' : 'end'
}

function bankrupt(s, p, to) {
  const player = s.players[p]
  const creditor = typeof to === 'number' ? to : null
  // buildings go back to the bank; their value (half price) goes to the creditor
  let fromBuildings = 0
  for (const i of propertiesOf(s, p)) {
    if (s.houses[i] === 5) s.bank.hotels += 1
    else s.bank.houses += s.houses[i]
    fromBuildings += (s.houses[i] * houseCost(i)) / 2
    s.houses[i] = 0
  }
  if (creditor !== null) {
    const heir = s.players[creditor]
    heir.cash += player.cash + fromBuildings
    let interest = 0
    for (const i of propertiesOf(s, p)) {
      s.owners[i] = creditor
      if (s.mortgaged[i]) interest += Math.ceil(mortgageValue(SPACES[i]) * 0.1) // rulebook: 10% interest right away
    }
    heir.jailCards.push(...player.jailCards)
    addLog(s, `${player.name} is bankrupt! Everything goes to ${heir.name}`)
    if (interest) {
      const paid = Math.min(interest, heir.cash)
      heir.cash -= paid
      addLog(s, `${heir.name} pays ${money(paid)} interest on the mortgaged properties`)
    }
  } else {
    // rulebook: the bank auctions everything it takes (buildings excepted)
    s.auctionQueue = propertiesOf(s, p)
    for (const i of s.auctionQueue) {
      s.owners[i] = null
      s.mortgaged[i] = false
    }
    for (const c of player.jailCards) s.decks[c.deck].push(c.index)
    addLog(s, `${player.name} is bankrupt! The bank will auction their properties`)
  }
  player.jailCards = []
  player.cash = 0
  player.out = true
  player.outAt = s.turn
  s.debt = null
  const left = activePlayers(s)
  if (left.length === 1) endGame(s, left[0], 'Last player standing')
}

function endGame(s, winner, reason) {
  s.phase = 'over'
  s.winner = winner
  s.endReason = reason
  // standings: winner first, then everyone still playing by net worth, then the bankrupt (last out = higher)
  const alive = activePlayers(s).filter((i) => i !== winner).sort((a, b) => netWorth(s, b) - netWorth(s, a))
  const out = s.players.map((_, i) => i).filter((i) => s.players[i].out).sort((a, b) => s.players[b].outAt - s.players[a].outAt)
  s.standings = [winner, ...alive, ...out].map((i) => ({ player: i, worth: s.players[i].out ? 0 : netWorth(s, i) }))
  addLog(s, `${s.players[winner].name} wins! (${reason})`)
}

// ---------------- auctions ----------------
// Everyone still playing can bid (including whoever declined to buy), starting at any amount.
// Bidders take turns: raise the bid or drop out. The last bidder left wins and pays the bank.

function startAuction(s, space, then) {
  // bidding goes round the table starting with the player after the current one
  const order = []
  for (let k = 1; k <= s.players.length; k++) {
    const i = (s.current + k) % s.players.length
    if (!s.players[i].out) order.push(i)
  }
  s.auction = { space, bid: 0, leader: null, bidders: order, turn: 0, then, id: ++s.cardId }
  s.phase = 'auction'
  addLog(s, `${SPACES[space].name} goes up for auction`)
}

function endAuction(s) {
  const a = s.auction
  if (a.leader !== null) {
    s.players[a.leader].cash -= a.bid
    s.owners[a.space] = a.leader
    s.lastBuy = { player: a.leader, space: a.space, id: ++s.cardId }
    addLog(s, `${s.players[a.leader].name} wins the auction for ${SPACES[a.space].name} at ${money(a.bid)}`)
  } else {
    addLog(s, `Nobody bids on ${SPACES[a.space].name}`)
  }
  s.auction = null
  if (a.then.kind === 'finish') {
    s.phase = 'resolving'
    finish(s)
  } else if (s.auctionQueue?.length) {
    startAuction(s, s.auctionQueue.shift(), a.then)
  } else {
    s.auctionQueue = null
    startTurnOf(s, nextActive(s, a.then.after))
  }
}

export const auctionBidder = (s) => (s.auction ? s.auction.bidders[s.auction.turn] : null)

function startTurnOf(s, p) {
  s.current = p
  s.phase = 'roll'
  s.dice = null
  s.doublesInRow = 0
  s.extraRoll = false
  s.turn += 1
}

// ---------------- new game ----------------

// rulebook: everyone rolls, the highest total goes first (ties roll again)
function rollForOrder(seats) {
  let contenders = seats.map((_, i) => i)
  const log = []
  while (contenders.length > 1) {
    const rolls = contenders.map((i) => ({ i, total: rollDie() + rollDie() }))
    const best = Math.max(...rolls.map((r) => r.total))
    log.push(rolls.map((r) => `${seats[r.i].name} ${r.total}`).join(', '))
    contenders = rolls.filter((r) => r.total === best).map((r) => r.i)
  }
  return { first: contenders[0] ?? 0, log }
}

export function newGame({ seats, startingCash = STARTING_CASH }) {
  const order = rollForOrder(seats)
  return {
    players: seats.map((seat, i) => ({
      name: seat.name,
      isBot: seat.isBot,
      color: seat.color ?? TOKEN_COLORS[i % TOKEN_COLORS.length],
      cash: startingCash,
      pos: 0,
      inJail: false,
      jailTurns: 0,
      jailCards: [],
      out: false,
      outAt: null,
    })),
    owners: SPACES.map(() => null),
    houses: SPACES.map(() => 0),
    mortgaged: SPACES.map(() => false),
    bank: { houses: HOUSES_IN_BANK, hotels: HOTELS_IN_BANK },
    decks: { fortune: shuffled(DECKS.fortune.length), fund: shuffled(DECKS.fund.length) },
    current: order.first,
    phase: 'roll',
    dice: null,
    rollId: 0,
    doublesInRow: 0,
    extraRoll: false,
    debt: null,
    lastCard: null,
    lastMove: null,
    moves: [], // every move made by the last action, in order (the board animates them one by one)
    lastRent: null,
    moveId: 0,
    cardId: 0,
    turn: 1,
    auction: null,
    auctionQueue: null,
    log: seats.length
      ? [`${seats[order.first].name} rolled highest and goes first`, ...order.log.reverse().map((l) => `Rolling for first turn: ${l}`)]
      : [],
    winner: null,
    standings: null,
    endReason: null,
  }
}

// ---------------- the reducer ----------------

export function gameReducer(state, action) {
  if (action.type === 'NEW') return newGame(action)
  if (!state) return state
  const s = structuredClone(state)
  s.moves = []
  const p = s.current
  const player = s.players[p]

  switch (action.type) {
    case 'ROLL': {
      if (s.phase !== 'roll') return state
      const dice = action.dice ?? [rollDie(), rollDie()] // tests can pass fixed dice
      s.dice = dice
      s.rollId += 1
      const total = dice[0] + dice[1]
      const doubles = dice[0] === dice[1]
      addLog(s, `${player.name} rolls ${dice[0]} + ${dice[1]}${doubles ? ' (doubles!)' : ''}`)

      if (player.inJail) {
        s.extraRoll = false // leaving jail with doubles doesn't give another roll
        if (doubles) {
          player.inJail = false
          addLog(s, `${player.name} rolls doubles and leaves jail`)
        } else {
          player.jailTurns += 1
          if (player.jailTurns < 3) {
            addLog(s, `${player.name} stays in jail`)
            s.phase = 'end'
            return s
          }
          // third try: pay the fine, then move
          addLog(s, `${player.name} must pay the ${money(JAIL_FINE)} fine`)
          player.inJail = false
          s.phase = 'resolving'
          if (!charge(s, p, JAIL_FINE, null, 'jail fine', { move: total })) return s
        }
        s.phase = 'resolving'
        moveTo(s, p, (player.pos + total) % 40)
        finish(s)
        return s
      }

      s.doublesInRow = doubles ? s.doublesInRow + 1 : 0
      if (s.doublesInRow === 3) {
        addLog(s, `${player.name} rolled doubles three times in a row!`)
        sendToJail(s, p)
        s.phase = 'end'
        return s
      }
      s.extraRoll = doubles
      s.phase = 'resolving'
      moveTo(s, p, (player.pos + total) % 40)
      finish(s)
      return s
    }

    case 'PAY_FINE':
      // the fine can be paid before rolling on the first or second try; on the third you must roll
      if (s.phase !== 'roll' || !player.inJail || player.jailTurns >= 2 || player.cash < JAIL_FINE) return state
      player.cash -= JAIL_FINE
      player.inJail = false
      player.jailTurns = 0
      addLog(s, `${player.name} pays ${money(JAIL_FINE)} to leave jail`)
      return s

    case 'USE_CARD': {
      if (s.phase !== 'roll' || !player.inJail || !player.jailCards.length) return state
      const card = player.jailCards.shift()
      s.decks[card.deck].push(card.index)
      player.inJail = false
      player.jailTurns = 0
      addLog(s, `${player.name} uses a Get Out of Jail Free card`)
      return s
    }

    case 'BUY': {
      if (s.phase !== 'buy') return state
      const space = SPACES[player.pos]
      if (player.cash < space.price) return state
      player.cash -= space.price
      s.owners[player.pos] = p
      s.lastBuy = { player: p, space: player.pos, id: ++s.cardId }
      addLog(s, `${player.name} buys ${space.name} for ${money(space.price)}`)
      s.phase = 'resolving'
      finish(s)
      return s
    }

    case 'DECLINE':
      if (s.phase !== 'buy') return state
      addLog(s, `${player.name} doesn't buy ${SPACES[player.pos].name}`)
      startAuction(s, player.pos, { kind: 'finish' })
      return s

    case 'TAX_FLAT':
    case 'TAX_PERCENT': {
      if (s.phase !== 'tax') return state
      const amount = action.type === 'TAX_FLAT' ? 200 : Math.round(totalWorth(s, p) * 0.1)
      addLog(s, `${player.name} pays ${money(amount)} Income Tax${action.type === 'TAX_PERCENT' ? ' (10% of their worth)' : ''}`)
      s.phase = 'resolving'
      if (charge(s, p, amount, null, 'Income Tax')) finish(s)
      return s
    }

    case 'BID': {
      const a = s.auction
      const who = auctionBidder(s)
      if (s.phase !== 'auction' || (action.player !== undefined && action.player !== who)) return state
      const amount = Math.floor(action.amount)
      if (!(amount > a.bid) || amount > s.players[who].cash) return state
      a.bid = amount
      a.leader = who
      addLog(s, `${s.players[who].name} bids ${money(amount)}`)
      a.turn = (a.turn + 1) % a.bidders.length
      if (a.bidders.length === 1) endAuction(s)
      return s
    }

    case 'AUCTION_PASS': {
      const a = s.auction
      const who = auctionBidder(s)
      if (s.phase !== 'auction' || (action.player !== undefined && action.player !== who)) return state
      if (who === a.leader) return state // the leader waits for the others
      a.bidders.splice(a.turn, 1)
      addLog(s, `${s.players[who].name} drops out of the auction`)
      if (a.bidders.length === 0 || (a.bidders.length === 1 && a.leader === a.bidders[0])) {
        endAuction(s)
        return s
      }
      a.turn %= a.bidders.length
      return s
    }

    case 'END_TURN':
      if (s.phase !== 'end') return state
      startTurnOf(s, nextActive(s, p))
      return s

    case 'BUILD': {
      const i = action.space
      const who = action.player ?? p
      if (!canManage(s, who) || isDebtor(s, who) || !canBuild(s, who, i)) return state
      s.players[who].cash -= houseCost(i)
      if (s.houses[i] === 4) {
        s.bank.hotels -= 1
        s.bank.houses += 4
      } else s.bank.houses -= 1
      s.houses[i] += 1
      s.lastBuild = { space: i, id: ++s.cardId }
      addLog(s, `${s.players[who].name} builds ${s.houses[i] === 5 ? 'a hotel' : 'a house'} on ${SPACES[i].name}`)
      return s
    }

    case 'SELL': {
      const i = action.space
      const who = action.player ?? p
      if (!canManage(s, who) || !canSell(s, who, i)) return state
      if (s.houses[i] === 5) {
        s.bank.hotels += 1
        s.bank.houses -= 4
      } else s.bank.houses += 1
      s.houses[i] -= 1
      s.players[who].cash += houseCost(i) / 2
      addLog(s, `${s.players[who].name} sells a building on ${SPACES[i].name} for ${money(houseCost(i) / 2)}`)
      return s
    }

    case 'MORTGAGE': {
      const i = action.space
      const who = action.player ?? p
      if (!canManage(s, who) || !canMortgage(s, who, i)) return state
      s.mortgaged[i] = true
      s.players[who].cash += mortgageValue(SPACES[i])
      addLog(s, `${s.players[who].name} mortgages ${SPACES[i].name} for ${money(mortgageValue(SPACES[i]))}`)
      return s
    }

    case 'UNMORTGAGE': {
      const i = action.space
      const who = action.player ?? p
      if (!canManage(s, who) || isDebtor(s, who) || !canUnmortgage(s, who, i)) return state
      s.mortgaged[i] = false
      s.players[who].cash -= unmortgageCost(SPACES[i])
      addLog(s, `${s.players[who].name} pays off the mortgage on ${SPACES[i].name}`)
      return s
    }

    case 'PAY_DEBT': {
      if (s.phase !== 'debt' || player.cash < s.debt.amount) return state
      const debt = s.debt
      payNow(s, p, debt.amount, debt.to)
      addLog(s, `${player.name} pays the ${money(debt.amount)} they owed`)
      s.debt = null
      s.phase = 'resolving'
      if (debt.then?.move) moveTo(s, p, (player.pos + debt.then.move) % 40)
      finish(s)
      return s
    }

    case 'BANKRUPT': {
      if (s.phase !== 'debt') return state
      bankrupt(s, p, s.debt.to)
      if (s.phase === 'over') return s
      if (s.auctionQueue?.length) startAuction(s, s.auctionQueue.shift(), { kind: 'queue', after: p })
      else {
        s.auctionQueue = null
        startTurnOf(s, nextActive(s, p))
      }
      return s
    }

    case 'END_GAME': {
      if (s.phase === 'over') return state
      const richest = activePlayers(s).sort((a, b) => netWorth(s, b) - netWorth(s, a))[0]
      endGame(s, richest, 'Richest player when the game was ended')
      return s
    }

    default:
      return state
  }
}
