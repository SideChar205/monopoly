// The 40 spaces of the board, in order, starting at Start and going clockwise.
// Prices, rents and building costs follow the classic game; the names are our own.
//
// Space types:
//   street   - can be built on. rent = [no houses, 1, 2, 3, 4 houses, hotel]
//   station  - rent 25 / 50 / 100 / 200 for owning 1 / 2 / 3 / 4 stations
//   utility  - rent is 4x the dice (one owned) or 10x the dice (both owned)
//   start, jail, rest, gotojail, tax, fortune, fund

export const GROUPS = {
  brown: { color: '#8b5a2b', house: 50, name: 'Brown' },
  sky: { color: '#7dd3fc', house: 50, name: 'Light blue' },
  pink: { color: '#e879f9', house: 100, name: 'Pink' },
  orange: { color: '#fb923c', house: 100, name: 'Orange' },
  red: { color: '#ef4444', house: 150, name: 'Red' },
  yellow: { color: '#facc15', house: 150, name: 'Yellow' },
  green: { color: '#22c55e', house: 200, name: 'Green' },
  navy: { color: '#2563eb', house: 200, name: 'Dark blue' },
}

const street = (name, group, price, rent) => ({ type: 'street', name, group, price, rent })
const station = (name) => ({ type: 'station', name, price: 200 })
const utility = (name, icon) => ({ type: 'utility', name, price: 150, icon })

export const SPACES = [
  { type: 'start', name: 'Start' },
  street('Copper Lane', 'brown', 60, [2, 10, 30, 90, 160, 250]),
  { type: 'fund', name: 'Town Fund' },
  street('Rust Row', 'brown', 60, [4, 20, 60, 180, 320, 450]),
  { type: 'tax', name: 'Income Tax', amount: 200 },
  station('North Station'),
  street('Harbor Street', 'sky', 100, [6, 30, 90, 270, 400, 550]),
  { type: 'fortune', name: 'Fortune' },
  street('Dockside Avenue', 'sky', 100, [6, 30, 90, 270, 400, 550]),
  street('Pier Road', 'sky', 120, [8, 40, 100, 300, 450, 600]),
  { type: 'jail', name: 'Jail' },
  street('Rose Boulevard', 'pink', 140, [10, 50, 150, 450, 625, 750]),
  utility('Power Company', '⚡'),
  street('Petal Avenue', 'pink', 140, [10, 50, 150, 450, 625, 750]),
  street('Blossom Street', 'pink', 160, [12, 60, 180, 500, 700, 900]),
  station('East Station'),
  street('Amber Way', 'orange', 180, [14, 70, 200, 550, 750, 950]),
  { type: 'fund', name: 'Town Fund' },
  street('Sunset Drive', 'orange', 180, [14, 70, 200, 550, 750, 950]),
  street('Marigold Avenue', 'orange', 200, [16, 80, 220, 600, 800, 1000]),
  { type: 'rest', name: 'Town Square' },
  street('Ruby Road', 'red', 220, [18, 90, 250, 700, 875, 1050]),
  { type: 'fortune', name: 'Fortune' },
  street('Cardinal Avenue', 'red', 220, [18, 90, 250, 700, 875, 1050]),
  street('Crimson Square', 'red', 240, [20, 100, 300, 750, 925, 1100]),
  station('South Station'),
  street('Golden Street', 'yellow', 260, [22, 110, 330, 800, 975, 1150]),
  street('Sunflower Avenue', 'yellow', 260, [22, 110, 330, 800, 975, 1150]),
  utility('Water Company', '💧'),
  street('Lemon Gardens', 'yellow', 280, [24, 120, 360, 850, 1025, 1200]),
  { type: 'gotojail', name: 'Go to Jail' },
  street('Emerald Park', 'green', 300, [26, 130, 390, 900, 1100, 1275]),
  street('Fern Avenue', 'green', 300, [26, 130, 390, 900, 1100, 1275]),
  { type: 'fund', name: 'Town Fund' },
  street('Willow Heights', 'green', 320, [28, 150, 450, 1000, 1200, 1400]),
  station('West Station'),
  { type: 'fortune', name: 'Fortune' },
  street('Sapphire Plaza', 'navy', 350, [35, 175, 500, 1100, 1300, 1500]),
  { type: 'tax', name: 'Luxury Tax', amount: 100 },
  street('Royal Crescent', 'navy', 400, [50, 200, 600, 1400, 1700, 2000]),
]

export const JAIL = 10
export const START_SALARY = 200
export const JAIL_FINE = 50
export const STARTING_CASH = 1500
export const HOUSES_IN_BANK = 32
export const HOTELS_IN_BANK = 12

export const isOwnable = (space) => space.type === 'street' || space.type === 'station' || space.type === 'utility'
export const groupMembers = (group) => SPACES.map((s, i) => (s.group === group ? i : -1)).filter((i) => i >= 0)
export const STATIONS = SPACES.map((s, i) => (s.type === 'station' ? i : -1)).filter((i) => i >= 0)
export const UTILITIES = SPACES.map((s, i) => (s.type === 'utility' ? i : -1)).filter((i) => i >= 0)
export const mortgageValue = (space) => space.price / 2
export const unmortgageCost = (space) => Math.ceil((space.price / 2) * 1.1)

// where each space sits on the 11x11 grid (row, col), going clockwise from the bottom-right corner
export function gridSpot(i) {
  if (i <= 10) return { row: 11, col: 11 - i, side: 'bottom' }
  if (i <= 20) return { row: 11 - (i - 10), col: 1, side: 'left' }
  if (i <= 30) return { row: 1, col: 1 + (i - 20), side: 'top' }
  return { row: 1 + (i - 30), col: 11, side: 'right' }
}
