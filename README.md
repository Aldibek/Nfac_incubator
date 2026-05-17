# Crown Lane

`Crown Lane` is a modern web app for playing checkers on one screen.  
The goal of the project was not to build just another plain board, but to package a medium-level technical implementation inside a product that feels stylish, memorable, and presentation-ready.

## What I built

- A complete local 2-player checkers experience in React
- Full basic rules:
  - diagonal movement
  - mandatory captures
  - multi-capture sequences
  - king promotion
  - winner detection
- Move highlights and forced-capture guidance
- Match history feed
- Auto-save with `localStorage`
- Three visual moods for the same game experience
- Responsive interface for desktop and mobile

## Product idea

Instead of treating checkers like a school assignment, `Crown Lane` frames it as a stylish social ritual for friends, siblings, classmates, or anyone who wants a quick face-to-face duel on one device.

The product angle is simple:

- make the game easy to start
- make it pleasant to watch
- make it feel premium even without backend complexity

## Who it is for

- Students who want a fast offline game together
- Casual players who do not need accounts or matchmaking
- Judges/reviewers who want to see product thinking, not only code

## Why it has value

Most beginner checkers projects stop at “the board works.”  
This project tries to go one step further:

- better first impression through strong visual direction
- clearer game flow through move hints and auto-save
- stronger product identity through theme switching and editorial UI

It is intentionally built at a **medium technical level**, but pushed hard on **creativity, polish, and product presentation**.

## Rules note

This prototype uses a practical 8x8 checkers ruleset:

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

The brief asked for a product that stands out, not just a working board.

`Crown Lane` does that by combining:

- solid medium-level game logic
- a unique visual identity
- simple but real product thinking

It avoids unnecessary technical overengineering while still feeling like something that could grow into a more complete service later.
