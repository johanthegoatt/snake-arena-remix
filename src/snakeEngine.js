const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function samePoint(a, b) {
  return a.x === b.x && a.y === b.y;
}

const OPPOSITES = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

// Turns pressed faster than one tick are kept in order, up to this many.
export const MAX_QUEUED_TURNS = 2;
export const FOODS_PER_LEVEL = 5;
export const FOODS_PER_BOOST = 4;
// New hazards never land this close (in moves) to the snake's head.
export const HAZARD_SAFE_DISTANCE = 3;

function isBlocked(state, cell) {
  return (
    state.snake.some((part) => samePoint(part, cell)) ||
    state.hazards.some((hazard) => samePoint(hazard, cell)) ||
    state.boosts.some((boost) => samePoint(boost, cell)) ||
    (state.food ? samePoint(state.food, cell) : false)
  );
}

// Picks uniformly from every free cell, so it never lands on the snake even
// when the board is nearly full. Returns null when nothing is free.
export function randomFreeCell(state, randomFn = Math.random, minDistanceFromHead = 0) {
  const head = state.snake[0];
  const free = [];
  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      const cell = { x, y };
      if (isBlocked(state, cell)) continue;
      if (head && Math.abs(head.x - x) + Math.abs(head.y - y) < minDistanceFromHead) continue;
      free.push(cell);
    }
  }

  if (free.length === 0) {
    return null;
  }

  return free[Math.min(free.length - 1, Math.floor(randomFn() * free.length))];
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
    turnQueue: [],
    food: null,
    hazards: [],
    boosts: [],
    score: 0,
    foodsEaten: 0,
    level: 1,
    alive: true,
    won: false,
    steps: 0,
    tickMs: 170,
    boostStepsLeft: 0,
  };

  base.food = randomFreeCell(base, randomFn);
  base.hazards = [randomFreeCell(base, randomFn, HAZARD_SAFE_DISTANCE)].filter(Boolean);
  return base;
}

export function setDirection(state, direction) {
  if (!DIRECTIONS[direction]) {
    return state;
  }

  const queue = state.turnQueue || [];
  // Check against the last turn already queued, not the direction the snake is
  // moving now, so "up then left" pressed inside one tick both count.
  const lastPlanned = queue.length ? queue[queue.length - 1] : state.direction;

  if (direction === lastPlanned || OPPOSITES[lastPlanned] === direction) {
    return state;
  }

  if (queue.length >= MAX_QUEUED_TURNS) {
    return state;
  }

  return {
    ...state,
    turnQueue: [...queue, direction],
    pendingDirection: direction,
  };
}

export function stepSnake(state, randomFn = Math.random) {
  if (!state.alive) {
    return state;
  }

  const queue = state.turnQueue || [];
  const direction = queue.length ? queue[0] : state.pendingDirection || state.direction;
  const restQueue = queue.slice(1);

  const next = {
    ...state,
    snake: state.snake.map((part) => ({ ...part })),
    hazards: state.hazards.map((hazard) => ({ ...hazard })),
    boosts: state.boosts.map((boost) => ({ ...boost })),
    direction,
    turnQueue: restQueue,
    pendingDirection: restQueue.length ? restQueue[restQueue.length - 1] : direction,
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

  const ateFood = next.food !== null && samePoint(newHead, next.food);
  // The tail moves out of its cell on this same step unless the snake grows,
  // so following your own tail is a legal move.
  const body = ateFood ? next.snake : next.snake.slice(0, -1);
  if (body.some((part) => samePoint(part, newHead))) {
    next.alive = false;
    return next;
  }

  if (next.hazards.some((hazard) => samePoint(hazard, newHead))) {
    next.alive = false;
    return next;
  }

  next.snake.unshift(newHead);
  if (!ateFood) {
    next.snake.pop();
  }

  if (ateFood) {
    next.foodsEaten += 1;
    next.score += 12 + next.level * 2;
    next.food = null;

    if (next.foodsEaten % FOODS_PER_LEVEL === 0) {
      next.level += 1;
      next.tickMs = Math.max(85, next.tickMs - 12);
      const hazard = randomFreeCell(next, randomFn, HAZARD_SAFE_DISTANCE);
      if (hazard) next.hazards.push(hazard);
    }

    if (next.foodsEaten % FOODS_PER_BOOST === 0) {
      const boost = randomFreeCell(next, randomFn);
      if (boost) next.boosts.push(boost);
    }

    next.food = randomFreeCell(next, randomFn);
    if (next.food === null) {
      // Every cell is snake or hazard: the board is cleared.
      next.won = true;
      next.alive = false;
      return next;
    }
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
