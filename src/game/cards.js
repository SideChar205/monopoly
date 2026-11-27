// The two card decks. Effects follow the classic game; the wording is our own.
//
// Effect kinds:
//   move      { to }               go to a space (collect salary if you pass Start)
//   back      { steps }            move back
//   nearest   { kind, factor }     go to the nearest station/utility; if owned, pay a special rent
//   jail                           go straight to jail
//   money     { amount }           + from the bank, - to the bank
//   each      { amount }           + collect from every player, - pay every player
//   repairs   { house, hotel }     pay for each of your houses and hotels
//   free                           keep this card: get out of jail free
//
// Crazy cards (only with the Crazy Fortune / Crazy Town Fund settings):
//   swap                           swap places with the richest other player (and deal with where you land)
//   steal     { amount }           take money from the richest other player
//   allBack   { steps }            everyone else moves back
//   goto      { to }               like move, but never collects salary
//   priciest                       advance to the most expensive property nobody owns
//   lottery   { per }              roll a die: collect per x the number
//   gamble    { win, lose }        heads you win, tails you pay
//   robin     { amount }           the richest player pays the poorest
//   freeHouse                      a free house on your best street (or $100 if you can't build)
//   surprise                       the cheapest property nobody owns goes up for auction
//   amnesty                        pay off one of your mortgages for free (or $50)
//   rentPass                       keep this card: the next rent you'd pay is skipped
//   everyone  { amount }           every player (you too) collects from the bank

export const FORTUNE = [
  { text: 'Advance to Start. Collect $200.', kind: 'move', to: 0 },
  { text: 'Head downtown to Crimson Square. Collect $200 if you pass Start.', kind: 'move', to: 24 },
  { text: 'Take a stroll on Rose Boulevard. Collect $200 if you pass Start.', kind: 'move', to: 11 },
  { text: 'Advance to the nearest utility. If it has an owner, roll and pay them 10 times the dice.', kind: 'nearest', near: 'utility' },
  { text: 'Catch the next train: advance to the nearest station and pay its owner twice the rent.', kind: 'nearest', near: 'station' },
  { text: 'Catch the next train: advance to the nearest station and pay its owner twice the rent.', kind: 'nearest', near: 'station' },
  { text: 'Your shares pay a dividend. Collect $50.', kind: 'money', amount: 50 },
  { text: 'Get out of jail free. Keep this card until you need it.', kind: 'free' },
  { text: 'You took a wrong turn. Go back 3 spaces.', kind: 'back', steps: 3 },
  { text: 'Go directly to jail. Do not pass Start, do not collect $200.', kind: 'jail' },
  { text: 'Upkeep on all your buildings: pay $25 per house and $100 per hotel.', kind: 'repairs', house: 25, hotel: 100 },
  { text: 'Caught speeding. Pay a $15 fine.', kind: 'money', amount: -15 },
  { text: 'Take a trip to North Station. Collect $200 if you pass Start.', kind: 'move', to: 5 },
  { text: 'Treat yourself: go to Royal Crescent.', kind: 'move', to: 39 },
  { text: 'You were voted club president. Pay every player $50.', kind: 'each', amount: -50 },
  { text: 'Your building loan pays out. Collect $150.', kind: 'money', amount: 150 },
]

export const FUND = [
  { text: 'Advance to Start. Collect $200.', kind: 'move', to: 0 },
  { text: 'The bank made a mistake in your favor. Collect $200.', kind: 'money', amount: 200 },
  { text: 'Visit to the doctor. Pay $50.', kind: 'money', amount: -50 },
  { text: 'You sold some shares. Collect $50.', kind: 'money', amount: 50 },
  { text: 'Get out of jail free. Keep this card until you need it.', kind: 'free' },
  { text: 'Go directly to jail. Do not pass Start, do not collect $200.', kind: 'jail' },
  { text: 'Your holiday savings come in. Collect $100.', kind: 'money', amount: 100 },
  { text: 'Tax refund. Collect $20.', kind: 'money', amount: 20 },
  { text: "It's your birthday! Collect $10 from every player.", kind: 'each', amount: 10 },
  { text: 'Your life insurance matures. Collect $100.', kind: 'money', amount: 100 },
  { text: 'Hospital bill. Pay $100.', kind: 'money', amount: -100 },
  { text: 'School fees. Pay $50.', kind: 'money', amount: -50 },
  { text: 'You did some consulting. Collect $25.', kind: 'money', amount: 25 },
  { text: 'The streets need fixing: pay $40 per house and $115 per hotel.', kind: 'repairs', house: 40, hotel: 115 },
  { text: 'Second prize in a talent show. Collect $10.', kind: 'money', amount: 10 },
  { text: 'You inherit $100.', kind: 'money', amount: 100 },
]

export const CRAZY_FORTUNE = [
  { text: 'Body swap! Trade places with the richest other player.', kind: 'swap', crazy: true },
  { text: 'Pickpocket! Take $100 from the richest other player.', kind: 'steal', amount: 100, crazy: true },
  { text: 'Traffic jam: everyone else moves back 3 spaces.', kind: 'allBack', steps: 3, crazy: true },
  { text: 'Take the afternoon off: go straight to Town Square (no salary).', kind: 'goto', to: 20, crazy: true },
  { text: 'Dream big: advance to the most expensive property nobody owns.', kind: 'priciest', crazy: true },
  { text: 'Lottery ticket! Roll a die and collect $50 for each pip.', kind: 'lottery', per: 50, crazy: true },
  { text: 'Double or nothing: flip a coin. Heads win $200, tails pay $100.', kind: 'gamble', win: 200, lose: 100, crazy: true },
  { text: 'Robin Hood: the richest player pays the poorest $150.', kind: 'robin', amount: 150, crazy: true },
]

export const CRAZY_FUND = [
  { text: 'Neighbours chip in: build a free house on your best street.', kind: 'freeHouse', crazy: true },
  { text: 'Surprise sale! The cheapest property nobody owns goes up for auction now.', kind: 'surprise', crazy: true },
  { text: 'Block party! Collect $50 from every player.', kind: 'each', amount: 50, crazy: true },
  { text: 'Mortgage amnesty: one of your mortgages is paid off for free.', kind: 'amnesty', crazy: true },
  { text: 'Lucky find: roll a die and collect $25 for each pip.', kind: 'lottery', per: 25, crazy: true },
  { text: 'Free rent pass! Keep this card: the next rent you would pay is skipped.', kind: 'rentPass', crazy: true },
  { text: 'Bank error, everyone wins: every player collects $50.', kind: 'everyone', amount: 50, crazy: true },
  { text: 'Charity drive: the richest player pays the poorest $100.', kind: 'robin', amount: 100, crazy: true },
]

export const DECKS = { fortune: FORTUNE, fund: FUND }
// the cards in play for a game: the classic ones, plus the crazy ones when that setting is on
export const deckCards = (settings = {}) => ({
  fortune: [...FORTUNE, ...(settings.crazyFortune ? CRAZY_FORTUNE : [])],
  fund: [...FUND, ...(settings.crazyFund ? CRAZY_FUND : [])],
})
