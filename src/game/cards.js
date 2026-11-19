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

export const DECKS = { fortune: FORTUNE, fund: FUND }
