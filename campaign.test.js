import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, normalizeProgress, recordLevel } from './campaign.js';
import { Commute, lightState } from './game.js';

test('campaign starts with one unlocked level; corrupt progress is handled', () => {
  assert.deepEqual(normalizeProgress(null), { unlocked: 0, records: [null, null, null] });
  assert.equal(normalizeProgress({ unlocked: 2, records: [] }).unlocked, 0);
  assert.equal(normalizeProgress({ unlocked: 99 }).unlocked, 0);
});
test('passing a level unlocks the next and replay keeps the best score without farming', () => {
  let progress = recordLevel(normalizeProgress(null), 0, { score: 1000, time: 90, stars: 3 });
  assert.equal(progress.unlocked, 1);
  progress = recordLevel(progress, 0, { score: 800, time: 80, stars: 2 });
  assert.equal(progress.records[0].score, 1000);
  const skipped = recordLevel(progress, 2, { score: 1500, time: 90, stars: 3 });
  assert.equal(skipped.records[2], null);
  progress = recordLevel(progress, 1, { score: 1400, time: 95, stars: 3 });
  assert.equal(progress.unlocked, 2);
  assert.equal(normalizeProgress(JSON.parse(JSON.stringify(progress))).unlocked, 2);
});
test('three levels have distinct road and traffic mechanics', () => {
  const village = new Commute(1, 'levels', 0), city = new Commute(1, 'levels', 1), highway = new Commute(1, 'levels', 2);
  assert.equal(village.potholes.length, 6); assert.equal(village.pedestrians.length, 2); assert.equal(village.lanesAt(0), 2);
  assert.equal(city.lights.length, 3); assert.equal(city.lanesAt(0), 3); assert.ok(city.cars.length > village.cars.length);
  assert.equal(highway.lights.length, 0); assert.ok(highway.cars.some(c => c.desired < 15)); assert.ok(highway.cars.some(c => c.desired >= 20));
  assert.equal(highway.lanesAt(0), 3); assert.equal(highway.lanesAt(500), 4);
});
test('village speed is lower than original modes and first hazards are not on top of player', () => {
  const village = new Commute(1, 'levels'); village.cars = []; village.spawnIn = 999;
  for (let i = 0; i < 240; i++) village.update(1 / 60, { gas: true });
  assert.ok(village.player.speed <= village.level.maxSpeed * village.driver.stats.speed); assert.ok(village.player.pos < 40);
  assert.ok(village.potholes[0].pos >= 80); assert.equal(village.state, 'running');
});
test('potholes cost little health, are resolved once, and a successful dodge earns points', () => {
  const game = new Commute(1, 'levels'); game.cars = []; game.spawnIn = 999;
  game.player.pos = 82.8; game.player.speed = 6;
  game.update(.1); assert.equal(game.potholeHits, 1); assert.equal(game.player.health, 94); assert.equal(game.state, 'running');
  game.update(.1); assert.equal(game.potholeHits, 1);
  game.player.pos = 122.8; game.player.speed = 6; game.player.x = .5; game.player.targetX = .5;
  game.update(.1); assert.equal(game.avoided, 1); assert.ok(game.score() >= 2 * Math.floor(game.player.pos) + 25);
});
test('pedestrians cross visibly, waiting safely awards points, contact ends only current attempt', () => {
  const game = new Commute(1, 'levels'); game.cars = []; game.spawnIn = 999;
  game.player.pos = 140;
  game.update(1 / 60, { brake: true }); assert.equal(game.pedestrians[0].active, true);
  for (let i = 0; i < 500; i++) game.update(1 / 60, { brake: true });
  assert.equal(game.yielded, 1); assert.equal(game.state, 'running');
  const collision = new Commute(1, 'levels'); collision.cars = []; collision.spawnIn = 999;
  collision.player.pos = 180; collision.pedestrians[0].active = true; collision.pedestrians[0].x = .5;
  collision.update(1 / 60, { brake: true }); assert.equal(collision.state, 'lost'); assert.ok(collision.score() > 0);
});
test('beginner collision threshold is more forgiving without changing classic rules', () => {
  const gentle = new Commute(1, 'levels'), original = new Commute(1);
  for (const game of [gentle, original]) {
    game.player.pos = 40; game.player.speed = 9;
    game.cars = [{ id: 90, type: 'car', pos: 40, x: .5, width: .57, length: 4.3, speed: 0, lateral: 0 }];
    game.checkCollisions();
  }
  assert.equal(gentle.state, 'running'); assert.ok(gentle.player.health >= 80);
  assert.equal(original.state, 'lost'); assert.ok(original.score() > 0);
});
test('campaign never opens classic route choice at 800m', () => {
  const game = new Commute(1, 'levels', 2); game.player.pos = 801; game.cars = []; game.spawnIn = 999;
  game.update(1 / 60); assert.equal(game.state, 'running');
});
test('follow assistance reduces speed before a slow car without automating lane changes', () => {
  const game = new Commute(1, 'levels', 1); game.player.pos = 20; game.player.speed = 12;
  game.cars = [game.cars[0]];
  Object.assign(game.cars[0], { pos: 38, x: .5, targetX: .5, speed: 3, desired: 3 });
  game.spawnIn = 999;
  game.update(1 / 60, { gas: true }); assert.ok(game.player.speed < 12); assert.equal(game.player.targetX, .5);
});
test('all campaign levels are completable safely across multiple seeds', () => {
  for (const seed of [1, 42, 20261022]) for (let levelIndex = 0; levelIndex < LEVELS.length; levelIndex++) {
    const game = new Commute(seed, 'levels', levelIndex);
    for (let frame = 0; frame < 60 * 450 && game.state === 'running'; frame++) {
      const p = game.player, stoppingDistance = p.speed * p.speed / 14 + 5;
      const ahead = game.cars.filter(c => c.pos > p.pos && Math.abs(c.x - p.x) < .8).sort((a, b) => a.pos - b.pos)[0];
      let brake = Boolean(ahead && ahead.pos - p.pos - (ahead.length + p.length) / 2 < stoppingDistance + p.speed * .5);
      const hole = game.potholes.find(h => !h.resolved && h.pos > p.pos && h.pos - p.pos < 45);
      if (hole && Math.abs(hole.x - p.x) < .65) {
        const alternative = p.targetX === .5 ? 1.5 : .5;
        if (Math.abs(p.x - p.targetX) < .05 && game.gapSafe(p, alternative)) game.move(alternative > p.x ? 1 : -1);
        else if (Math.abs(p.x - p.targetX) < .05 && hole.pos - p.pos < stoppingDistance + 4) brake = true;
      }
      if (game.pedestrians.some(person => person.active && !person.done && person.pos > p.pos && person.pos - p.pos < 60)) brake = true;
      for (const light of game.lights) {
        const gap = light.pos - p.pos - p.length / 2;
        if (gap > 0 && gap < stoppingDistance + 4 && lightState(light, game.time).color !== 'green') brake = true;
      }
      if (game.works.some(work => p.pos < work.start && work.start - p.pos < 50 && Math.abs(p.x - work.lane - .5) < .6)) {
        if (game.gapSafe(p, p.targetX - 1)) game.move(-1); else brake = true;
      }
      game.update(1 / 60, { brake });
    }
    assert.equal(game.state, 'won', `${seed}/${levelIndex}: ${game.reason || 'stuck'} at ${game.player.pos}`);
    assert.equal(game.accidents, 0, `${seed}/${levelIndex}: collision`);
    assert.equal(game.violations, 0); assert.ok(game.score() > game.length * 2);
  }
});
