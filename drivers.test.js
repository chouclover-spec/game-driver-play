import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Commute } from './game.js';
import { DRIVERS } from './drivers.js';
const emptyRoad = (id, mode = 'random', level = 0) => {
  const game = new Commute(417, mode, level, id);
  for (const field of ['cars', 'lights', 'bumps', 'works', 'potholes', 'pedestrians']) game[field] = [];
  game.spawnIn = 1e9;
  return game;
};
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test('selected driver controls real acceleration and top speed', () => {
  const speeds = new Set();
  for (const driver of DRIVERS) {
    const game = emptyRoad(driver.id);
    for (let i = 0; i < 60; i++) game.update(1 / 60, { gas: true });
    close(game.player.speed, 2.8 * driver.stats.acceleration);
    for (let i = 0; i < 720; i++) game.update(1 / 60, { gas: true });
    close(game.player.speed, 20 * driver.stats.speed);
    speeds.add(game.player.speed);
  }
  assert.equal(speeds.size, 4);
});

test('selected driver controls real braking and continuous steering', () => {
  for (const driver of DRIVERS) {
    const game = emptyRoad(driver.id);
    game.player.speed = 15;
    game.move(1);
    for (let i = 0; i < 12; i++) game.update(1 / 60, { brake: true });
    close(game.player.speed, 15 - 7 * driver.stats.braking * .2);
    close(game.player.x, .5 + 1.5 * driver.stats.handling * .2);
    for (let i = 0; i < 240; i++) game.update(1 / 60, { brake: true });
    assert.equal(game.player.speed, 0);
    assert.equal(game.player.x, 1.5);
  }
});

test('campaign uses road speed limits with the selected vehicle', () => {
  for (const driver of DRIVERS) for (let level = 0; level < 3; level++) {
    const game = emptyRoad(driver.id, 'levels', level);
    for (let i = 0; i < 900; i++) game.update(1 / 60, { gas: true });
    close(game.player.speed, game.level.maxSpeed * driver.stats.speed);
    assert.equal(game.state, 'running');
  }
});

test('unknown driver falls back to Clover without changing existing saves or default controls', () => {
  const original = emptyRoad('clover'), unknown = emptyRoad('missing-driver');
  for (let i = 0; i < 60; i++) { original.update(1 / 60, { gas: true }); unknown.update(1 / 60, { gas: true }); }
  assert.deepEqual(unknown.player, original.player);
  assert.equal(original.player.width, .57);
  assert.equal(original.player.length, 4.3);
});
