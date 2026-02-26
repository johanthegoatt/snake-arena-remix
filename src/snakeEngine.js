const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function samePoint(a, b) {
  return a.x === b.x && a.y === b.y;
}

function randomCell(width, height, randomFn = Math.random) {
  return {
    x: Math.floor(randomFn() * width),
    y: Math.floor(randomFn() * height),
  };
}

function randomFreeCell(state, randomFn = Math.random) {
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const cell = randomCell(state.width, state.height, randomFn);
    const blocked =
      state.snake.some((part) => samePoint(part, cell)) ||
      state.hazards.some((hazard) => samePoint(hazard, cell)) ||
      state.boosts.some((boost) => samePoint(boost, cell));

    if (!blocked) {
      return cell;
    }
  }

  return { x: 0, y: 0 };
}

export function createInitialState({ width = 24, height = 16 } = {}, randomFn = Math.random) {
  const snake = [
    { x: Math.floor(width / 2), y: Math.floor(height / 2) },
    { x: Math.floor(width / 2) - 1, y: Math.floor(height / 2) },
    { x: Math.floor(width / 2) - 2, y: Math.floor(height / 2) },
  ];

  const base = {
    width,
    height,
    snake,
    direction: "right",
    pendingDirection: "right",
    food: { x: 3, y: 3 },
    hazards: [],
    boosts: [],
    score: 0,
    level: 1,
    alive: true,
    steps: 0,
    tickMs: 170,
    boostStepsLeft: 0,
  };

  base.food = randomFreeCell(base, randomFn);
  base.hazards = [randomFreeCell(base, randomFn)];
  return base;
}

export function setDirection(state, direction) {
  const opposites = {
    up: "down",
    down: "up",
    left: "right",
    right: "left",
  };

  if (!DIRECTIONS[direction]) {
    return state;
  }

  if (opposites[state.direction] === direction) {
    return state;
  }

  return {
    ...state,
    pendingDirection: direction,
  };
}

export function stepSnake(state, randomFn = Math.random) {
  if (!state.alive) {
    return state;
  }

  const next = {
    ...state,
    snake: state.snake.map((part) => ({ ...part })),
    hazards: state.hazards.map((hazard) => ({ ...hazard })),
    boosts: state.boosts.map((boost) => ({ ...boost })),
    direction: state.pendingDirection,
    steps: state.steps + 1,
  };

  const velocity = DIRECTIONS[next.direction];
  const head = next.snake[0];
  const newHead = { x: head.x + velocity.x, y: head.y + velocity.y };

  const hitWall =
    newHead.x < 0 ||
    newHead.x >= next.width ||
    newHead.y < 0 ||
    newHead.y >= next.height;

  if (hitWall) {
    next.alive = false;
    return next;
  }

  const hitBody = next.snake.some((part) => samePoint(part, newHead));
  if (hitBody) {
    next.alive = false;
    return next;
  }

  if (next.hazards.some((hazard) => samePoint(hazard, newHead))) {
    next.alive = false;
    return next;
  }

  next.snake.unshift(newHead);

  let ateFood = false;
  if (samePoint(newHead, next.food)) {
    ateFood = true;
    next.score += 12 + next.level * 2;
    next.food = randomFreeCell(next, randomFn);

    if (next.score % 36 === 0) {
      next.level += 1;
      next.tickMs = Math.max(85, next.tickMs - 12);
      next.hazards.push(randomFreeCell(next, randomFn));
    }

    if (next.score % 48 === 0) {
      next.boosts.push(randomFreeCell(next, randomFn));
    }
  }

  if (!ateFood) {
    next.snake.pop();
  }

  const boostIndex = next.boosts.findIndex((boost) => samePoint(boost, newHead));
  if (boostIndex >= 0) {
    next.boosts.splice(boostIndex, 1);
    next.boostStepsLeft = 14;
  }

  if (next.boostStepsLeft > 0) {
    next.boostStepsLeft -= 1;
  }

  return next;
}

export function effectiveTickMs(state) {
  return state.boostStepsLeft > 0 ? Math.max(45, Math.round(state.tickMs * 0.62)) : state.tickMs;
}
