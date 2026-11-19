// What a computer player does. Returns one action at a time (the game asks again after each one).
import { SPACES, GROUPS, JAIL_FINE, isOwnable, groupMembers, unmortgageCost } from './board.js'
import { canBuild, canSell, canMortgage, canUnmortgage, propertiesOf, houseCost, ownsGroup } from './rules.js'

const RESERVE = 150 // cash a bot likes to keep for rent

// would buying space i complete (or nearly complete) a color group for player p?
function groupValue(s, p, i) {
  const space = SPACES[i]
  if (space.type !== 'street') return 0
  const members = groupMembers(space.group)
  const mine = members.filter((j) => s.owners[j] === p).length
  const others = members.filter((j) => s.owners[j] !== null && s.owners[j] !== p).length
  if (others > 0) return 0
  return mine + 1 === members.length ? 2 : mine > 0 ? 1 : 0
}

function bestBuild(s, p) {
  const options = propertiesOf(s, p).filter((i) => canBuild(s, p, i) && s.players[p].cash - houseCost(i) >= RESERVE + 100)
  // the most expensive group first: its rents grow fastest
  options.sort((a, b) => houseCost(b) - houseCost(a) || s.houses[a] - s.houses[b])
  return options[0]
}

function raiseMoney(s, p) {
  // sell buildings first (from the cheapest groups), then mortgage what earns the least
  const sell = propertiesOf(s, p).filter((i) => canSell(s, p, i)).sort((a, b) => houseCost(a) - houseCost(b))[0]
  if (sell !== undefined) return { type: 'SELL', space: sell }
  const mortgage = propertiesOf(s, p)
    .filter((i) => canMortgage(s, p, i))
    .sort((a, b) => {
      // keep complete groups as long as possible
      const ga = SPACES[a].group && ownsGroup(s, p, SPACES[a].group) ? 1 : 0
      const gb = SPACES[b].group && ownsGroup(s, p, SPACES[b].group) ? 1 : 0
      return ga - gb || SPACES[a].price - SPACES[b].price
    })[0]
  if (mortgage !== undefined) return { type: 'MORTGAGE', space: mortgage }
  return null
}

export function botMove(s) {
  const p = s.current
  const me = s.players[p]

  if (s.phase === 'debt') {
    if (me.cash >= s.debt.amount) return { type: 'PAY_DEBT' }
    return raiseMoney(s, p) ?? { type: 'BANKRUPT' }
  }

  if (s.phase === 'buy') {
    const space = SPACES[me.pos]
    const wanted = groupValue(s, p, me.pos)
    const left = me.cash - space.price
    if (left >= RESERVE || (wanted === 2 && left >= 0) || (wanted === 1 && left >= 50)) return { type: 'BUY' }
    return { type: 'DECLINE' }
  }

  if (s.phase === 'roll' || s.phase === 'end') {
    // spend spare money: build first, then pay off mortgages
    const build = bestBuild(s, p)
    if (build !== undefined) return { type: 'BUILD', space: build }
    const unmortgage = propertiesOf(s, p).find(
      (i) => canUnmortgage(s, p, i) && me.cash - unmortgageCost(SPACES[i]) >= RESERVE + 250,
    )
    if (unmortgage !== undefined) return { type: 'UNMORTGAGE', space: unmortgage }
  }

  if (s.phase === 'roll') {
    if (me.inJail) {
      if (me.jailCards.length) return { type: 'USE_CARD' }
      // early on (lots left to buy) it pays to get out; later, jail is a safe place to wait
      const unowned = SPACES.filter((sp, i) => isOwnable(sp) && s.owners[i] === null).length
      if (unowned > 8 && me.cash >= JAIL_FINE + RESERVE) return { type: 'PAY_FINE' }
    }
    return { type: 'ROLL' }
  }

  if (s.phase === 'end') return { type: 'END_TURN' }
  return null
}

export { GROUPS }
