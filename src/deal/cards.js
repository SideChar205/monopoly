// The Deal deck: 106 playing cards (the 110-card box minus its 4 rule cards).
// Values are in millions ($1M...). Colors use the board's color groups.
import { SPACES, GROUPS } from '../game/board.js'

// how many cards make a full set, the rent for 1..n cards, and what one property card is worth as money
export const SETS = {
  brown: { size: 2, rent: [1, 2], value: 1, name: 'Brown' },
  sky: { size: 3, rent: [1, 2, 3], value: 1, name: 'Light blue' },
  pink: { size: 3, rent: [1, 2, 4], value: 2, name: 'Pink' },
  orange: { size: 3, rent: [1, 3, 5], value: 2, name: 'Orange' },
  red: { size: 3, rent: [2, 3, 6], value: 3, name: 'Red' },
  yellow: { size: 3, rent: [2, 4, 6], value: 3, name: 'Yellow' },
  green: { size: 3, rent: [2, 4, 7], value: 4, name: 'Green' },
  navy: { size: 2, rent: [3, 8], value: 4, name: 'Dark blue' },
  station: { size: 4, rent: [1, 2, 3, 4], value: 2, name: 'Stations' },
  utility: { size: 2, rent: [1, 2], value: 2, name: 'Utilities' },
}
export const COLOR_KEYS = Object.keys(SETS)
export const colorHex = (c) => GROUPS[c]?.color ?? (c === 'station' ? '#1f2937' : c === 'utility' ? '#94a3b8' : '#64748b')

export const ACTIONS = {
  breaker: { name: 'Deal Breaker', value: 5, count: 2, text: 'Steal a complete set of properties from any player (with its house and hotel).' },
  no: { name: 'Just Say No', value: 4, count: 3, text: 'Cancel an action played against you. Can be answered with another Just Say No.' },
  passgo: { name: 'Pass Go', value: 1, count: 10, text: 'Draw 2 extra cards.' },
  forced: { name: 'Forced Deal', value: 3, count: 3, text: "Swap one of your properties with another player's (not part of a complete set)." },
  sly: { name: 'Sly Deal', value: 3, count: 3, text: "Steal a property from a player (not part of a complete set)." },
  debt: { name: 'Debt Collector', value: 3, count: 3, text: 'Force any player to pay you $5M.' },
  birthday: { name: "It's My Birthday", value: 2, count: 3, text: 'All players give you $2M as a gift.' },
  double: { name: 'Double the Rent', value: 1, count: 2, text: 'Play with a rent card to double the rent.' },
  house: { name: 'House', value: 3, count: 3, text: 'Add to a complete set to add $3M to its rent. Not on stations or utilities.' },
  hotel: { name: 'Hotel', value: 4, count: 2, text: 'Add to a complete set that has a house to add $4M to its rent.' },
}

// the board's street names for each color (stations and utilities too)
const namesFor = (c) =>
  SPACES.filter((s) => (c === 'station' ? s.type === 'station' : c === 'utility' ? s.type === 'utility' : s.group === c)).map((s) => s.name)

export function buildDeck() {
  const cards = []
  const add = (card) => cards.push({ id: cards.length, ...card })
  // 20 money cards
  for (const [value, count] of [[1, 6], [2, 5], [3, 3], [4, 3], [5, 2], [10, 1]]) for (let i = 0; i < count; i++) add({ kind: 'money', value })
  // 34 action cards
  for (const [action, a] of Object.entries(ACTIONS)) for (let i = 0; i < a.count; i++) add({ kind: 'action', action, value: a.value, name: a.name })
  // 13 rent cards
  for (const pair of [['navy', 'green'], ['red', 'yellow'], ['pink', 'orange'], ['sky', 'brown'], ['station', 'utility']])
    for (let i = 0; i < 2; i++) add({ kind: 'rent', colors: pair, value: 1, name: 'Rent' })
  for (let i = 0; i < 3; i++) add({ kind: 'rent', colors: 'any', value: 3, name: 'Wild Rent' })
  // 28 property cards (2 / 3 / 4 per color, as in the box)
  const counts = { navy: 2, brown: 2, utility: 2, green: 3, yellow: 3, red: 3, orange: 3, pink: 3, sky: 3, station: 4 }
  for (const [c, n] of Object.entries(counts)) {
    const names = namesFor(c)
    for (let i = 0; i < n; i++) add({ kind: 'property', color: c, value: SETS[c].value, name: names[i % names.length] })
  }
  // 11 property wildcards
  for (const [pair, value, count] of [
    [['navy', 'green'], 4, 1], [['green', 'station'], 4, 1], [['utility', 'station'], 2, 1], [['sky', 'station'], 4, 1],
    [['sky', 'brown'], 1, 1], [['pink', 'orange'], 2, 2], [['red', 'yellow'], 3, 2],
  ])
    for (let i = 0; i < count; i++) add({ kind: 'wild', colors: pair, value, name: 'Property Wildcard' })
  for (let i = 0; i < 2; i++) add({ kind: 'wild', colors: 'any', value: 0, name: 'Property Wildcard (any color)' })
  return cards
}

export const cardLabel = (c) =>
  c.kind === 'money' ? `$${c.value}M` : c.kind === 'property' ? c.name : c.kind === 'wild' ? (c.colors === 'any' ? 'Any-color wildcard' : `${SETS[c.colors[0]].name}/${SETS[c.colors[1]].name} wildcard`) : c.kind === 'rent' ? (c.colors === 'any' ? 'Wild Rent' : `${SETS[c.colors[0]].name}/${SETS[c.colors[1]].name} Rent`) : c.name
