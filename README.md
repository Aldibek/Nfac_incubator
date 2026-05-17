# Crown Lane

`Crown Lane` is a modern checkers web app built as a social product, not just a board.

The idea was to keep the technical side around a strong **medium level**, but push the **creativity, product thinking, and presentation** as far as possible. The result is a stylish checkers experience where friends can either play on one screen or send each other a link and continue the duel online.

## What I built

- Full 8x8 checkers rules in React:
  - diagonal movement
  - mandatory captures
  - multi-capture chains
  - king promotion
  - winner detection
- Local 2-player mode on one device
- Online `duel by link` mode:
  - create a room
  - send the URL to a friend
  - play the same match from two browsers
- Custom series format:
  - players choose how many wins are needed
  - the board resets between rounds
  - the score of the series stays
- `Dare vault`:
  - built-in funny challenges
  - custom dares written by players
  - random challenge for the loser after the whole series
- Cinematic loser ceremony with animated roast screens
- Move history feed
- Theme switching
- Auto-save with `localStorage`
- Responsive layout for desktop and mobile

## Product idea

This is not “just checkers”.

`Crown Lane` turns the match into a small social ritual:

- play face-to-face on one device
- or send a link and play remotely
- make the series feel dramatic
- make losing memorable through roast screens and random dares

The product is aimed at friends, classmates, siblings, and casual players who want something more playful and memorable than a plain board.

## Why it is valuable

Most beginner checkers projects prove only that the rules work.

This project tries to prove something bigger:

- the game logic works correctly
- the product has a clear personality
- the experience is designed for replay value
- the app already hints at a niche: `party checkers with consequences`

That makes it feel closer to a real product prototype than to a standard coursework assignment.

## Multiplayer note

The online mode uses browser-based peer-to-peer room syncing, so the app can stay deployed as a static site on GitHub Pages while still supporting `play by link`.

Current room model:

- 1 host
- 1 guest
- host controls room setup, theme, and dare settings
- both players share the same live match state

## Rules note

This prototype uses a practical 8x8 ruleset:

- regular pieces move diagonally forward
- captures are mandatory
- capture chains continue with the same piece
- kings move one square diagonally in any direction

## Tech stack

- React
- TypeScript
- Vite
- CSS
- LocalStorage
- Trystero / WebRTC for link-based multiplayer

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Submission links

- Live project: [https://aldibek.github.io/Nfac_incubator/](https://aldibek.github.io/Nfac_incubator/)
- GitHub repository: [https://github.com/Aldibek/Nfac_incubator](https://github.com/Aldibek/Nfac_incubator)

## Why this project fits the brief

The brief asked for a product that stands out instead of repeating what already exists.

`Crown Lane` does that by combining:

- medium-level but complete gameplay logic
- strong visual identity
- social mechanics
- replayable best-of-series flow
- a unique “loser challenge” angle

It is intentionally not overengineered, but it still feels like something that could grow into a real service.
