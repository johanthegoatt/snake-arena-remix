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
};

const context = elements.canvas.getContext("2d");

const appState = {
  game: createInitialState(),
  running: false,
  paused: false,
  lastFrameAt: 0,
  accumulator: 0,
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

function togglePause() {
  if (!appState.running) return;
  appState.paused = !appState.paused;
  elements.pauseBtn.textContent = appState.paused ? "Resume" : "Pause";
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
      appState.running = false;
      elements.startBtn.disabled = false;
      elements.pauseBtn.disabled = true;
      setOverlayVisible(true);
    }
  }

  draw();
  requestAnimationFrame(animate);
}

elements.startBtn.addEventListener("click", startGame);
elements.pauseBtn.addEventListener("click", togglePause);
elements.restartBtn.addEventListener("click", resetGame);

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (key === "arrowup" || key === "w") appState.game = setDirection(appState.game, "up");
  if (key === "arrowdown" || key === "s") appState.game = setDirection(appState.game, "down");
  if (key === "arrowleft" || key === "a") appState.game = setDirection(appState.game, "left");
  if (key === "arrowright" || key === "d") appState.game = setDirection(appState.game, "right");
});

resetGame();
requestAnimationFrame(animate);
