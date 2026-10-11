import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialState,
  setDirection,
  stepSnake,
  effectiveTickMs,
  randomFreeCell,
  FOODS_PER_LEVEL,
  HAZARD_SAFE_DISTANCE,
} from "../src/snakeEngine.js";

test("createInitialState initializes snake and entities", () => {
  const state = createInitialState({ width: 20, height: 10 }, () => 0.4);
  assert.equal(state.snake.length, 3);
  assert.equal(state.alive, true);
  assert.equal(state.hazards.length, 1);
});

test("setDirection blocks immediate opposite direction", () => {
  const state = createInitialState({}, () => 0.3);
  const next = setDirection(state, "left");
  assert.equal(next.pendingDirection, "right");
});

test("stepSnake dies when colliding with wall", () => {
  const state = createInitialState({ width: 4, height: 4 }, () => 0.2);
  state.snake[0] = { x: 3, y: 2 };
  state.direction = "right";
  state.pendingDirection = "right";

  const next = stepSnake(state, () => 0.2);
  assert.equal(next.alive, false);
});

test("stepSnake grows and scores after eating food", () => {
  const state = createInitialState({ width: 12, height: 8 }, () => 0.2);
  const head = state.snake[0];
  state.food = { x: head.x + 1, y: head.y };
  state.direction = "right";
  state.pendingDirection = "right";

  const next = stepSnake(state, () => 0.1);
  assert.equal(next.snake.length, state.snake.length + 1);
  assert.ok(next.score > state.score);
});

test("effectiveTickMs accelerates when boost is active", () => {
  const state = createInitialState({}, () => 0.2);
  state.boostStepsLeft = 5;
  assert.ok(effectiveTickMs(state) < state.tickMs);
});

test("two turns pressed inside one tick are both played, in order", () => {
  let state = createInitialState({ width: 20, height: 12 }, () => 0.9);
  state.hazards = [];
  state.food = { x: 0, y: 0 };
  const start = { ...state.snake[0] };
  // Moving right: up then left is a U-turn over two ticks.
  state = setDirection(state, "up");
  state = setDirection(state, "left");
  state = stepSnake(state, () => 0.9);
  assert.deepEqual(state.snake[0], { x: start.x, y: start.y - 1 });
  state = stepSnake(state, () => 0.9);
  assert.deepEqual(state.snake[0], { x: start.x - 1, y: start.y - 1 });
  assert.equal(state.alive, true);
});

test("a reverse is still refused after a queued turn", () => {
  let state = createInitialState({}, () => 0.9);
  state = setDirection(state, "up");
  state = setDirection(state, "down");
  assert.deepEqual(state.turnQueue, ["up"]);
});

test("the queue holds at most two turns", () => {
  let state = createInitialState({}, () => 0.9);
  state = setDirection(state, "up");
  state = setDirection(state, "left");
  state = setDirection(state, "down");
  assert.deepEqual(state.turnQueue, ["up", "left"]);
});

test("moving into the cell the tail is leaving is legal", () => {
  const state = createInitialState({ width: 10, height: 10 }, () => 0.9);
  // A 2x2 loop: head at (5,5) going up into (5,4), where the tail is now.
  state.snake = [
    { x: 5, y: 5 },
    { x: 6, y: 5 },
    { x: 6, y: 4 },
    { x: 5, y: 4 },
  ];
  state.direction = "left";
  state.pendingDirection = "left";
  state.turnQueue = ["up"];
  state.hazards = [];
  state.food = { x: 0, y: 9 };
  const next = stepSnake(state, () => 0.9);
  assert.equal(next.alive, true);
  assert.deepEqual(next.snake[0], { x: 5, y: 4 });
});

test("level goes up every few foods whatever the score per food", () => {
  let state = createInitialState({ width: 30, height: 5 }, () => 0.99);
  state.hazards = [];
  state.snake = [{ x: 2, y: 2 }, { x: 1, y: 2 }, { x: 0, y: 2 }];
  for (let i = 0; i < FOODS_PER_LEVEL; i += 1) {
    const head = state.snake[0];
    state.food = { x: head.x + 1, y: head.y };
    state.hazards = [];
    state.boosts = [];
    state = stepSnake(state, () => 0.99);
    assert.equal(state.alive, true);
  }
  assert.equal(state.level, 2);
  assert.ok(state.tickMs < 170);
});

test("new hazards keep their distance from the head", () => {
  const state = createInitialState({ width: 8, height: 8 }, () => 0);
  const head = state.snake[0];
  for (let i = 0; i < 50; i += 1) {
    const cell = randomFreeCell(state, () => i / 50, HAZARD_SAFE_DISTANCE);
    assert.ok(Math.abs(cell.x - head.x) + Math.abs(cell.y - head.y) >= HAZARD_SAFE_DISTANCE);
  }
});

test("randomFreeCell never returns an occupied cell and is null when full", () => {
  const state = createInitialState({ width: 2, height: 2 }, () => 0);
  state.snake = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }];
  state.hazards = [];
  state.boosts = [];
  state.food = null;
  assert.deepEqual(randomFreeCell(state, () => 0.99), { x: 0, y: 1 });
  state.food = { x: 0, y: 1 };
  assert.equal(randomFreeCell(state, () => 0.5), null);
});
