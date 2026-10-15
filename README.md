# Snake Arena Remix

## Description
Snake Arena Remix modernizes snake gameplay with hazard cells, temporary speed boosts, and progression-based pacing.

## Features
- Grid-based snake core loop, drawn sharp on high-density screens with the snake gliding between cells and bursts when it eats, levels up or crashes
- Hazard and boost entities
- Food scoring and level progression
- Dynamic speed adjustments based on level/boosts
- Pause/resume flow and restart overlay; pauses itself when the tab is hidden
- Swipe on the board to steer on a phone, Space to start or pause
- Fast turns are queued (two deep), so a quick U-turn never drops a key
- Following your own tail is legal, as in the original game
- Best score kept between visits
- Unit-tested snake engine
- Static Vercel-ready deployment setup

## Run
```bash
cd snake-arena-remix
npm run dev
```
Open `http://127.0.0.1:8108/snake-arena-remix/index.html`.

## Test
```bash
cd snake-arena-remix
npm test
```

## Deploy
```bash
cd snake-arena-remix
npx vercel --prod
```

## Inspiration
- https://github.com/CodeExplainedRepo/Snake-JavaScript

## Structure
```text
snake-arena-remix/
  index.html
  styles.css
  app.js
  src/
    snakeEngine.js
  tests/
    snakeEngine.test.js
  package.json
  vercel.json
  README.md
```
