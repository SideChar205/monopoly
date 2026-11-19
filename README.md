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

## Rules

Follows the Parker Brothers rulebook (2004/2007 edition, Hasbro instruction sheet 00009).

- **Who goes first**: everyone rolls; the highest total starts (ties roll again).
- **Start** with $1,500 (or choose $1,000 to $2,500). Collect **$200** each time you pass or land on Start
  (an "Advance to Start" card right after passing it pays twice).
- **Roll two dice** and move. Doubles: roll again. Three doubles in a row: go to jail, turn over.
- **Unowned property**: buy it at its price. If you don't, it's **auctioned**: everyone can bid, including you,
  starting at any amount. Bidders take turns raising or dropping out; the last one left pays the bank.
- **Rent**:
  - Streets: the listed rent, **doubled** if the owner has the whole color group and no houses on it
    (even if another street of the group is mortgaged).
  - Stations: $25 / $50 / $100 / $200 for owning 1 / 2 / 3 / 4.
  - Utilities: 4x the dice (one owned) or 10x the dice (both owned).
  - Mortgaged properties don't collect rent. Owners in jail still do.
- **Income Tax**: pay **$200** or **10% of your total worth** (cash + printed price of every property + buildings).
  You choose before adding it up. **Luxury Tax**: $75.
- **Houses and hotels**: own a whole color group (none mortgaged), then build evenly, one house per street before a
  second on any. Four houses, then a hotel. The bank has 32 houses and 12 hotels; when they run out, wait for some to
  come back. Selling gives back half the price, evenly. You can build, sell and mortgage **at any time**,
  even on someone else's turn: click your property.
- **Mortgage** an unimproved property for half its price (sell the buildings in its group first).
  Paying it off costs the mortgage plus 10%.
- **Jail**: roll doubles on one of your next three turns (move by that roll, no extra roll), use a Get Out of Jail Free
  card, or pay $50 before rolling on your first or second turn. Miss on the third turn: pay $50 and move.
  While in jail you can still collect rent, build and mortgage.
- **Fortune** and **Town Fund** cards: 16 each, the classic effects in our own words. Get Out of Jail Free cards are
  kept until used.
- **Can't pay?** Sell buildings and mortgage until you can. If you still can't, you're bankrupt:
  - owing a player: they get your cash, properties and cards (and pay the bank 10% interest on any mortgaged ones);
  - owing the bank: your properties are **auctioned** to the other players.
- **Winning**: the last player left wins. **End game** stops early: the richest player (cash + property + buildings) wins.

Not in yet: trading between players (including selling Get Out of Jail Free cards), house auctions during a building
shortage, and the optional Speed Die.

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

1. Trading between players (with bots that trade)
2. Online rooms with invite codes (like the UNO game)
3. Optional rules: the Speed Die, a turn limit
