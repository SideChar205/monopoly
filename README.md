# Landlord: Property Trading Game

The classic property-trading board game, built with React + Vite. Roll the dice, buy streets,
build houses and hotels, collect rent and bankrupt your rivals. Play against bots, or pass and play.

The name, street names and card names are our own. The game is named after *The Landlord's Game* (1904),
the public-domain game that classic property-trading games grew out of.

## Run it

```bash
npm install
npm run dev
```

Opens on port **5176** (5173 = portfolio, 5174 = hr-system, 5175 = uno-game).

## Rules (classic)

- **Start** with $1,500 (or choose $1,000 to $2,500). Collect **$200** each time you pass or land on Start.
- **Roll two dice** and move. Doubles: roll again. Three doubles in a row: go to jail.
- **Unowned property**: buy it, or leave it for someone else.
- **Rent**:
  - Streets: the listed rent, **doubled** if the owner has the whole color group and no houses on it.
  - Stations: $25 / $50 / $100 / $200 for owning 1 / 2 / 3 / 4.
  - Utilities: 4x the dice (one owned) or 10x the dice (both owned).
  - Mortgaged properties don't collect rent.
- **Houses and hotels**: own a whole color group (none mortgaged), then build evenly: one house per street before a
  second on any. Five levels: four houses, then a hotel. The bank has 32 houses and 12 hotels.
  Selling gives back half the price.
- **Mortgage** a property for half its price (sell the buildings in its group first). Paying it off costs 10% extra.
- **Jail**: roll doubles to get out (up to 3 tries), pay $50, or use a Get Out of Jail Free card.
  After the third failed roll you pay $50 and move.
- **Fortune** and **Town Fund** cards: 16 each, the classic effects in our own words.
- **Can't pay?** Sell houses and mortgage until you can. If you still can't, you're bankrupt: everything goes to the
  player you owe (or back to the bank).
- **Winning**: the last player left wins. **End game** stops early: the richest player (cash + property + buildings) wins.

## Code

| File | What it does |
|---|---|
| `src/game/board.js` | The 40 spaces: names, prices, rents, colors |
| `src/game/cards.js` | The Fortune and Town Fund decks |
| `src/game/rules.js` | The whole game as one reducer: every rule lives here |
| `src/game/bot.js` | What computer players do |
| `src/components/Game.jsx` | The game screen: token walking, bots, prompts, side panel |
| `src/components/Board.jsx` | The board and tokens |
| `src/components/Deed.jsx` | A property's card: rents, build / sell / mortgage |
| `src/components/Setup.jsx` | The start screen |

## Coming next

1. Auctions when a player doesn't buy
2. Trading between players (with bots that trade)
3. Online rooms with invite codes (like the UNO game)
4. House rules: Free Parking money, double money on Start, time limit
