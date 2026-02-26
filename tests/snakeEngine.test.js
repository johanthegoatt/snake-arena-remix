import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialState,
  setDirection,
  stepSnake,
  effectiveTickMs,
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
