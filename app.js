import { createInitialState, setDirection, stepSnake, effectiveTickMs } from "./src/snakeEngine.js";
import { createSound } from "./src/sound.js";

const sound = createSound();

const CELL = 30;

const elements = {
  canvas: document.getElementById("board"),
  overlay: document.getElementById("overlay"),
  startBtn: document.getElementById("startBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  restartBtn: document.getElementById("restartBtn"),
  score: document.getElementById("score"),
  length: document.getElementById("length"),
  level: document.getElementById("level"),
  boost: document.getElementById("boost"),
  best: document.getElementById("best"),
  muteBtn: document.getElementById("muteBtn"),
  overlayTitle: document.getElementById("overlayTitle"),
  overlayNote: document.getElementById("overlayNote"),
};

const BEST_KEY = "snake-arena-best";
// A finger has to travel this far (CSS px) before it counts as a swipe.
const SWIPE_MIN_PX = 24;

function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(score) {
  try {
    localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // Storage blocked: the best score just lasts for this visit.
  }
}

const context = elements.canvas.getContext("2d");

const appState = {
  game: createInitialState(),
  running: false,
  paused: false,
  lastFrameAt: 0,
  accumulator: 0,
  best: readBest(),
};

function setOverlayVisible(visible) {
  elements.overlay.hidden = !visible;
}

function resetGame() {
  appState.game = createInitialState();
  appState.previous = null;
  appState.running = false;
  appState.paused = false;
  appState.lastFrameAt = 0;
  appState.accumulator = 0;
  elements.startBtn.disabled = false;
  elements.pauseBtn.disabled = true;
  elements.pauseBtn.textContent = "Pause";
  setOverlayVisible(false);
  syncStats();
  draw();
}

function syncStats() {
  elements.score.textContent = String(appState.game.score);
  elements.length.textContent = String(appState.game.snake.length);
  elements.level.textContent = String(appState.game.level);
  elements.boost.textContent = appState.game.boostStepsLeft > 0 ? `${appState.game.boostStepsLeft} ticks` : "none";
  elements.best.textContent = String(appState.best);
}

// The canvas backing store follows the device pixel ratio so cells stay
// sharp on phones and retina screens; drawing still happens in CSS pixels.
function fitCanvas() {
  const game = appState.game;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const w = game.width * CELL;
  const h = game.height * CELL;
  if (elements.canvas.width !== Math.round(w * dpr)) {
    elements.canvas.width = Math.round(w * dpr);
    elements.canvas.height = Math.round(h * dpr);
  }
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
}

const sparks = [];

function burst(cell, colour, count = 14) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  for (let i = 0; i < (reduce ? 0 : count); i += 1) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const speed = 0.06 + Math.random() * 0.12;
    sparks.push({
      x: cell.x * CELL + CELL / 2,
      y: cell.y * CELL + CELL / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      colour,
    });
  }
}

function roundRect(x, y, w, h, r) {
  context.beginPath();
  context.roundRect(x, y, w, h, r);
  context.fill();
}

// Between two steps each segment slides from where it was to where it is,
// so movement reads as smooth instead of hopping a cell per tick.
function segmentAt(i, t) {
  const now = appState.game.snake[i];
  const before = appState.previous?.[i] ?? appState.previous?.[appState.previous.length - 1] ?? now;
  if (Math.abs(before.x - now.x) + Math.abs(before.y - now.y) !== 1) return now;
  return { x: before.x + (now.x - before.x) * t, y: before.y + (now.y - before.y) * t };
}

function draw(dt = 0) {
  const game = appState.game;
  fitCanvas();
  const W = game.width * CELL;
  const H = game.height * CELL;

  context.fillStyle = "#102139";
  context.fillRect(0, 0, W, H);

  context.strokeStyle = "rgba(255,255,255,0.08)";
  context.lineWidth = 1;
  context.beginPath();
  for (let x = 0; x <= game.width; x += 1) {
    context.moveTo(x * CELL + 0.5, 0);
    context.lineTo(x * CELL + 0.5, H);
  }
  for (let y = 0; y <= game.height; y += 1) {
    context.moveTo(0, y * CELL + 0.5);
    context.lineTo(W, y * CELL + 0.5);
  }
  context.stroke();

  const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 220);
  if (game.food) {
    context.fillStyle = "#ff8f6b";
    context.shadowColor = "#ff8f6b";
    context.shadowBlur = 8 + pulse * 10;
    roundRect(game.food.x * CELL + 4, game.food.y * CELL + 4, CELL - 8, CELL - 8, 7);
    context.shadowBlur = 0;
  }

  context.fillStyle = "#ff4b6b";
  for (const hazard of game.hazards) {
    roundRect(hazard.x * CELL + 6, hazard.y * CELL + 6, CELL - 12, CELL - 12, 3);
  }

  context.fillStyle = "#4de0ff";
  for (const boost of game.boosts) {
    context.beginPath();
    context.arc(boost.x * CELL + CELL / 2, boost.y * CELL + CELL / 2, CELL / 3.6 + pulse * 2, 0, Math.PI * 2);
    context.fill();
  }

  const stepEvery = effectiveTickMs(game);
  const t = appState.running && !appState.paused && game.alive ? Math.min(1, appState.accumulator / stepEvery) : 1;
  const boosted = game.boostStepsLeft > 0;
  for (let i = game.snake.length - 1; i >= 0; i -= 1) {
    const p = segmentAt(i, t);
    const shade = 1 - (i / Math.max(1, game.snake.length)) * 0.35;
    context.fillStyle = i === 0 ? (boosted ? "#b6fbff" : "#6eff8f") : `rgba(54, 201, 106, ${shade})`;
    roundRect(p.x * CELL + 2, p.y * CELL + 2, CELL - 4, CELL - 4, i === 0 ? 9 : 6);
  }

  if (game.snake.length) {
    const head = segmentAt(0, t);
    const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[game.direction];
    context.fillStyle = "#0b1426";
    for (const side of [-1, 1]) {
      const ex = head.x * CELL + CELL / 2 + v[0] * 6 + v[1] * side * 6;
      const ey = head.y * CELL + CELL / 2 + v[1] * 6 - v[0] * side * 6;
      context.beginPath();
      context.arc(ex, ey, 2.6, 0, Math.PI * 2);
      context.fill();
    }
  }

  for (let i = sparks.length - 1; i >= 0; i -= 1) {
    const spark = sparks[i];
    spark.x += spark.vx * dt;
    spark.y += spark.vy * dt;
    spark.life -= dt / 450;
    if (spark.life <= 0) {
      sparks.splice(i, 1);
      continue;
    }
    context.globalAlpha = spark.life;
    context.fillStyle = spark.colour;
    context.fillRect(spark.x - 2, spark.y - 2, 4, 4);
  }
  context.globalAlpha = 1;

  syncStats();
}

function startGame() {
  sound.unlock();
  if (!appState.game.alive) {
    appState.game = createInitialState();
    appState.previous = null;
  }

  appState.running = true;
  appState.paused = false;
  appState.lastFrameAt = 0;
  appState.accumulator = 0;
  elements.startBtn.disabled = true;
  elements.pauseBtn.disabled = false;
  setOverlayVisible(false);
}

function setPaused(paused) {
  if (!appState.running) return;
  appState.paused = paused;
  // Drop time banked before the pause so the snake does not jump on resume.
  appState.accumulator = 0;
  elements.pauseBtn.textContent = paused ? "Resume" : "Pause";
}

function togglePause() {
  setPaused(!appState.paused);
}

function endGame() {
  appState.running = false;
  elements.startBtn.disabled = false;
  elements.pauseBtn.disabled = true;
  const score = appState.game.score;
  const newBest = score > appState.best;
  if (newBest) {
    appState.best = score;
    saveBest(score);
  }
  elements.overlayTitle.textContent = appState.game.won ? "Board cleared" : "Game over";
  elements.overlayNote.textContent = newBest ? `New best: ${score}` : `Score ${score}. Best ${appState.best}.`;
  setOverlayVisible(true);
  elements.restartBtn.focus();
}

function animate(timestamp) {
  if (!appState.lastFrameAt) {
    appState.lastFrameAt = timestamp;
  }

  const dt = Math.min(timestamp - appState.lastFrameAt, 100);
  appState.lastFrameAt = timestamp;

  if (appState.running && !appState.paused && appState.game.alive) {
    appState.accumulator += dt;
    const stepEvery = effectiveTickMs(appState.game);

    while (appState.accumulator >= stepEvery) {
      appState.accumulator -= stepEvery;
      const before = appState.game;
      appState.previous = before.snake;
      appState.game = stepSnake(before);
      react(before, appState.game);
    }

    if (!appState.game.alive) {
      endGame();
    }
  }

  draw(dt);
  requestAnimationFrame(animate);
}

// What happened on one step, for effects.
function react(before, after) {
  if (after.foodsEaten > before.foodsEaten && before.food) {
    burst(before.food, "#ff8f6b");
    if (after.level === before.level) sound.eat(after.foodsEaten);
  }
  if (after.level > before.level) {
    burst(after.snake[0], "#ffe27a", 24);
    sound.levelUp();
  }
  if (after.boostStepsLeft > before.boostStepsLeft) {
    burst(after.snake[0], "#4de0ff", 18);
    sound.boost();
  }
  if (after.won) sound.win();
  else if (!after.alive) {
    burst(after.snake[0], "#ff4b6b", 30);
    sound.crash();
  }
}

elements.startBtn.addEventListener("click", startGame);
elements.pauseBtn.addEventListener("click", togglePause);
elements.restartBtn.addEventListener("click", resetGame);

const KEY_DIRECTIONS = {
  arrowup: "up",
  w: "up",
  arrowdown: "down",
  s: "down",
  arrowleft: "left",
  a: "left",
  arrowright: "right",
  d: "right",
};

function steer(direction) {
  if (!appState.running && appState.game.alive) {
    startGame();
  }
  appState.game = setDirection(appState.game, direction);
}

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  const direction = KEY_DIRECTIONS[key];
  if (direction) {
    event.preventDefault();
    steer(direction);
    return;
  }
  if (key === "m") {
    toggleMute();
    return;
  }
  if (key === " " || key === "p") {
    if (event.target instanceof HTMLButtonElement && key === " ") return;
    event.preventDefault();
    if (appState.running) togglePause();
    else startGame();
  }
});

// Swipe on the board to steer on a phone. touch-action: none on the canvas
// stops the page from scrolling under the finger.
let swipeStart = null;
elements.canvas.addEventListener("pointerdown", (event) => {
  swipeStart = { x: event.clientX, y: event.clientY };
  elements.canvas.setPointerCapture(event.pointerId);
});
elements.canvas.addEventListener("pointermove", (event) => {
  if (!swipeStart) return;
  const dx = event.clientX - swipeStart.x;
  const dy = event.clientY - swipeStart.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN_PX) return;
  if (Math.abs(dx) > Math.abs(dy)) steer(dx > 0 ? "right" : "left");
  else steer(dy > 0 ? "down" : "up");
  // Start a new swipe from here so one long drag can make two turns.
  swipeStart = { x: event.clientX, y: event.clientY };
});
const endSwipe = () => {
  swipeStart = null;
};
elements.canvas.addEventListener("pointerup", endSwipe);
elements.canvas.addEventListener("pointercancel", endSwipe);

// Pause when the tab is hidden or the window loses focus, so a notification
// or a tab switch does not cost the run.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) setPaused(true);
});
window.addEventListener("blur", () => setPaused(true));

function syncMute() {
  elements.muteBtn.textContent = sound.muted ? "Sound off" : "Sound on";
  elements.muteBtn.setAttribute("aria-pressed", String(sound.muted));
}
function toggleMute() {
  sound.toggle();
  syncMute();
}
elements.muteBtn.addEventListener("click", toggleMute);
syncMute();

resetGame();
requestAnimationFrame(animate);
