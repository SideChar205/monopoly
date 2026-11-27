# Changelog

Version numbers are MAJOR.MINOR.PATCH:

- **PATCH** (0.11.**1**): bug fixes only
- **MINOR** (0.**12**.0): new features (or changes to how the game plays)
- **MAJOR** (**1**.0.0): the launch, and later any big change that breaks things

Below 1.0 the game is in beta (not launched yet).

## 0.13.0

- New: **online games** for the board game. Create a game, send the invite link (or the 5-letter code), and play with friends on their own devices, on any network. Empty seats can be bots.
  - Waiting room: ready up, change your name, the host picks the starting money and the rules (everyone sees them), the host can remove players.
  - The host's browser runs the game and the bots; every move from a guest is checked (your turn, your bid, only your own properties).
  - Drop out and a bot takes over; rejoin from the same browser to take your seat back.
  - After a game: Play again, or Back to the room.
- Online works on the deployed site (Vercel); on `npm run dev` only people on your Wi-Fi can open the link.
- Deal mode is still local only (coming next).

## 0.12.0

- New: a **"Who goes first?" wheel** spins at the start of every game, stops on the first player, then shows the play order (round the table from them). Click to skip. Everything (bots, the card draft, the roll button) waits for it.
- The first player is now picked at random by the wheel (instead of a hidden dice roll-off).

## 0.11.1

- Fixed: a piece could blink straight to the next space (for example when leaving Start) instead of hopping. The pieces are now always drawn in the same order, so the browser never interrupts their glide.

## 0.11.0

- New rule: **Teleport** (on by default). A piece sent far by a card (more than 6 spaces), to jail, or by a swap teleports there instead of hopping every space.
- Income Tax is a flat $200 (no more 10% option).
- Pieces stand in the middle of their space. The jail corner is the exception: in jail you stand inside the cell, just visiting you stand on the strip around it.
- Fixed: pieces were placed slightly towards the top-left of every space (a wrong board measurement).
- The top corners (Town Square, Go To Jail) face outwards, like the rest of the board.

## 0.10.0

- Optional rules on the start screen, each with an (i) explanation: **Auctions**, **Crazy Town Fund**, **Crazy Fortune**, **Free Parking** and **Card Draft**.
- 16 new wild cards (8 per pile) for the crazy piles.
- The Free Parking pot shows as a pile of money on Town Square.

## 0.9.0

- First version number shown on the start screen (beta).
