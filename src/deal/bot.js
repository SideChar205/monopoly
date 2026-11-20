// What a computer player does in Landlord Deal. Returns one action at a time.
import { SETS } from './cards.js'
import { actorOf, cardOptions, rentColors, rentFor, colorCards, isComplete, completeColors, takeable, assets, buildable, activeOthers, HAND_LIMIT } from './rules.js'

const missing = (p, c) => SETS[c].size - colorCards(p, c).length
// how much a property would help player p (higher = more wanted)
function want(p, color) {
  const left = missing(p, color)
  if (left <= 0) return 0
  return 10 - left * 3 + SETS[color].value
}
function bestColor(p, colors) {
  return [...colors].sort((a, b) => want(p, b) - want(p, a))[0]
}
// the richest / most dangerous opponent first
const leader = (s, list) => [...list].sort((a, b) => completeColors(s.players[b]).length - completeColors(s.players[a]).length || assets(s.players[b]).length - assets(s.players[a]).length)[0]

export function botMove(s) {
  const who = actorOf(s)
  const me = s.players[who]

  if (s.phase === 'respond') {
    const pd = s.pending
    const defending = who === pd.target
    // how bad is it? Deal Breakers always; big charges; steals that hurt
    const big = pd.kind === 'breaker' || (pd.kind === 'charge' && pd.amount >= 4) || pd.kind === 'sly' || pd.kind === 'forced'
    if (big) return { type: 'SAY_NO', player: who }
    return { type: defending ? 'ACCEPT' : 'ACCEPT', player: who }
  }

  if (s.phase === 'pay') {
    // pay with money first (smallest first), then single properties that don't belong to a near-complete set
    const own = assets(me)
    const rank = (a) => (a.from === 'bank' ? 0 : a.from === 'building' ? 1 : 2 + (isComplete(me, colorOf(me, a.card.id)) ? 5 : 0))
    own.sort((a, b) => rank(a) - rank(b) || a.card.value - b.card.value)
    const pick = []
    let total = 0
    for (const a of own) {
      if (total >= s.pending.amount) break
      pick.push(a.card.id)
      total += a.card.value
    }
    return { type: 'PAY', player: who, cardIds: pick }
  }

  if (s.phase === 'discard') {
    const extra = me.hand.length - HAND_LIMIT
    const order = [...me.hand].sort((a, b) => worth(a) - worth(b))
    return { type: 'DISCARD', player: who, cardIds: order.slice(0, extra).map((c) => c.id) }
  }

  if (s.phase !== 'play') return null
  if (s.playsLeft < 1) return { type: 'END_TURN' }
  const others = activeOthers(s)
  const hand = me.hand
  const has = (fn) => hand.find(fn)

  // 1. properties down
  const prop = has((c) => c.kind === 'property')
  if (prop) return { type: 'PLAY_PROPERTY', cardId: prop.id }
  const wild = has((c) => c.kind === 'wild')
  if (wild) return { type: 'PLAY_PROPERTY', cardId: wild.id, color: bestColor(me, wild.colors === 'any' ? Object.keys(SETS) : wild.colors) }

  // 2. Deal Breaker on someone's complete set
  const breaker = has((c) => c.action === 'breaker')
  if (breaker && cardOptions(s, breaker).action) {
    for (const t of others) {
      const colors = completeColors(s.players[t])
      if (colors.length) return { type: 'PLAY_ACTION', cardId: breaker.id, target: t, color: colors.sort((a, b) => rentFor(s.players[t], b) - rentFor(s.players[t], a))[0] }
    }
  }

  // 3. steal a property that helps
  const sly = has((c) => c.action === 'sly')
  if (sly && cardOptions(s, sly).action) {
    let best = null
    for (const t of others) for (const x of s.players[t].props) if (takeable(s.players[t], x.card.id) && x.card.value > 0) {
      const score = want(me, x.color)
      if (!best || score > best.score) best = { t, id: x.card.id, score }
    }
    if (best && best.score > 0) return { type: 'PLAY_ACTION', cardId: sly.id, target: best.t, propId: best.id }
  }

  // 4. rent, doubled when possible
  const rents = hand.filter((c) => c.kind === 'rent' && cardOptions(s, c).action)
  let bestRent = null
  for (const r of rents) {
    for (const color of rentColors(s, r)) {
      const amount = rentFor(me, color) * (r.colors === 'any' ? 1 : others.length)
      if (!bestRent || amount > bestRent.amount) bestRent = { r, color, amount }
    }
  }
  if (bestRent && bestRent.amount >= 2) {
    const dbl = has((c) => c.action === 'double')
    const doubles = dbl && s.playsLeft >= 2 && rentFor(me, bestRent.color) >= 2 ? [dbl.id] : []
    const target = bestRent.r.colors === 'any' ? leader(s, others) : undefined
    return { type: 'PLAY_ACTION', cardId: bestRent.r.id, color: bestRent.color, target, doubles }
  }

  // 5. build
  for (const kind of ['hotel', 'house']) {
    const b = has((c) => c.action === kind)
    if (b && buildable(me, kind).length) return { type: 'PLAY_ACTION', cardId: b.id, color: buildable(me, kind)[0] }
  }

  // 6. collect money
  const debt = has((c) => c.action === 'debt')
  if (debt) return { type: 'PLAY_ACTION', cardId: debt.id, target: leader(s, others) }
  const bday = has((c) => c.action === 'birthday')
  if (bday) return { type: 'PLAY_ACTION', cardId: bday.id }

  // 7. Forced Deal: give away a lonely property for one that helps
  const forced = has((c) => c.action === 'forced')
  if (forced && cardOptions(s, forced).action) {
    const mine = [...me.props].filter((x) => !isComplete(me, x.color)).sort((a, b) => want(me, a.color) - want(me, b.color))[0]
    let best = null
    for (const t of others) for (const x of s.players[t].props) if (takeable(s.players[t], x.card.id) && x.color !== mine?.color) {
      const score = want(me, x.color)
      if (!best || score > best.score) best = { t, id: x.card.id, score }
    }
    if (mine && best && best.score > want(me, mine.color)) return { type: 'PLAY_ACTION', cardId: forced.id, target: best.t, propId: best.id, myPropId: mine.card.id }
  }

  // 8. more cards
  const pass = has((c) => c.action === 'passgo')
  if (pass && hand.length < HAND_LIMIT + 1) return { type: 'PLAY_ACTION', cardId: pass.id }

  // 9. bank money, then spare actions (keep Just Say No and good actions in hand while the hand is small)
  const cash = [...hand].filter((c) => c.kind === 'money').sort((a, b) => b.value - a.value)[0]
  if (cash) return { type: 'BANK', cardId: cash.id }
  const spare = [...hand].filter((c) => (c.kind === 'action' || c.kind === 'rent') && (c.action !== 'no' || hand.length > HAND_LIMIT)).sort((a, b) => worth(a) - worth(b))[0]
  if (spare && hand.length > 4) return { type: 'BANK', cardId: spare.id }
  return { type: 'END_TURN' }
}

const colorOf = (p, id) => p.props.find((x) => x.card.id === id)?.color
const worth = (c) => (c.action === 'no' ? 50 : c.action === 'breaker' ? 40 : c.kind === 'property' || c.kind === 'wild' ? 30 : c.value)
