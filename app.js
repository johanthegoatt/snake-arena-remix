import { createInitialState, setDirection, stepSnake, effectiveTickMs } from "./src/snakeEngine.js";

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

function draw() {
  const game = appState.game;

  context.fillStyle = "#102139";
  context.fillRect(0, 0, elements.canvas.width, elements.canvas.height);

  context.strokeStyle = "rgba(255,255,255,0.08)";
  for (let x = 0; x <= game.width; x += 1) {
    context.beginPath();
    context.moveTo(x * CELL, 0);
    context.lineTo(x * CELL, game.height * CELL);
    context.stroke();
  }

  for (let y = 0; y <= game.height; y += 1) {
    context.beginPath();
    context.moveTo(0, y * CELL);
    context.lineTo(game.width * CELL, y * CELL);
    context.stroke();
  }

  context.fillStyle = "#ff8f6b";
  context.fillRect(game.food.x * CELL + 3, game.food.y * CELL + 3, CELL - 6, CELL - 6);

  context.fillStyle = "#ff4b6b";
  for (const hazard of game.hazards) {
    context.fillRect(hazard.x * CELL + 6, hazard.y * CELL + 6, CELL - 12, CELL - 12);
  }

  context.fillStyle = "#4de0ff";
  for (const boost of game.boosts) {
    context.beginPath();
    context.arc(boost.x * CELL + CELL / 2, boost.y * CELL + CELL / 2, CELL / 3.2, 0, Math.PI * 2);
    context.fill();
  }

  for (let i = game.snake.length - 1; i >= 0; i -= 1) {
    const part = game.snake[i];
    context.fillStyle = i === 0 ? "#6eff8f" : "#36c96a";
    context.fillRect(part.x * CELL + 2, part.y * CELL + 2, CELL - 4, CELL - 4);
  }

  syncStats();
}

function startGame() {
  if (!appState.game.alive) {
    appState.game = createInitialState();
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
      appState.game = stepSnake(appState.game);
    }

    if (!appState.game.alive) {
      endGame();
    }
  }

  draw();
  requestAnimationFrame(animate);
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

resetGame();
requestAnimationFrame(animate);
