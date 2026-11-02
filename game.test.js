import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Commute, seededRandom, lightState, collisionSeverity, dateSeed } from './game.js';

test('random seed reproduces initial traffic and signals', () => {
  const a = new Commute(123), b = new Commute(123);
  assert.deepEqual(a.cars, b.cars); assert.deepEqual(a.lights, b.lights);
  const random = seededRandom(1); for (let i = 0; i < 100; i++) { const x = random(); assert.ok(x >= 0 && x < 1); }
});
test('daily seed uses local calendar date', () => assert.equal(dateSeed(new Date(2026, 9, 21)), 20261021));
test('light phases and countdown wrap correctly', () => {
  const light = { offset: 0, cycle: 30, green: 15 };
  assert.equal(lightState(light, 0).color, 'green'); assert.equal(lightState(light, 16).color, 'yellow');
  assert.equal(lightState(light, 20).color, 'red'); assert.equal(lightState(light, 30).color, 'green');
});
test('brake stops and release resumes cruise', () => {
  const game = new Commute(1); game.cars = []; game.spawnIn = 999;
  for (let i = 0; i < 120; i++) game.update(1 / 60, { gas: true });
  assert.ok(game.player.speed > 5);
  for (let i = 0; i < 120; i++) game.update(1 / 60, { brake: true });
  assert.equal(game.player.speed, 0);
  game.update(1 / 60); assert.ok(game.player.speed > 0);
});
test('lane change is continuous and cannot target outside road', () => {
  const game = new Commute(1); game.move(-1); assert.equal(game.player.targetX, .5);
  game.move(1); game.update(1 / 60, { brake: true }); assert.ok(game.player.x > .5 && game.player.x < 1.5);
});
test('minor collision continues and major collision ends run', () => {
  const small = new Commute(1), big = new Commute(1);
  for (const game of [small, big]) { game.cars = [{ id: 99, pos: 0, x: .5, length: 4.3, width: .57, speed: 0, lateral: 0, type: 'car' }]; game.player.speed = game === small ? 2 : 15; game.checkCollisions(); }
  assert.equal(small.state, 'running'); assert.ok(small.player.health < 100); assert.equal(small.accidents, 1);
  small.checkCollisions(); assert.equal(small.accidents, 1);
  assert.equal(big.state, 'lost'); assert.ok(collisionSeverity(10) > collisionSeverity(2));
});
test('same-direction high-speed light scrape is not automatically a major crash', () => {
  assert.ok(collisionSeverity(1, 1) < 8);
});
test('route choice pauses simulation and shortcut changes topology', () => {
  const game = new Commute(1); game.player.pos = 801; game.update(1 / 60); assert.equal(game.state, 'choice');
  const t = game.time; game.update(1); assert.equal(game.time, t);
  game.chooseRoute('shortcut'); assert.equal(game.state, 'running'); assert.equal(game.length, 2380); assert.equal(game.lanesAt(1000), 2);
});
test('red light crossing invalidates clean result but does not stop play', () => {
  const game = new Commute(1); game.cars = []; game.spawnIn = 999;
  game.lights = [{ pos: 10, cycle: 100, green: 1, offset: 10 }]; game.player.pos = 7.8; game.player.speed = 10;
  game.update(.1); assert.equal(game.violations, 1); assert.equal(game.state, 'running');
});
test('NPCs stop before red light and queue without overlapping', () => {
  const game = new Commute(9); game.player.x = 1.5; game.player.targetX = 1.5;
  game.lights = [{ pos: 55, cycle: 1000, green: 1, offset: 20 }]; game.spawnIn = 999;
  game.cars = game.cars.slice(0, 2);
  game.cars.forEach((c, i) => { c.x = .5; c.targetX = .5; c.pos = 25 - i * 15; c.type = 'car'; c.decision = 999; });
  for (let i = 0; i < 600; i++) game.update(1 / 60, { brake: true });
  assert.ok(game.cars[0].pos + game.cars[0].length / 2 < 55);
  assert.ok(game.cars[0].speed < .5); assert.ok(game.cars[0].pos - game.cars[1].pos > 4);
});
test('paused game does not move or accrue time', () => {
  const game = new Commute(1); game.state = 'paused'; game.update(5, { gas: true }); assert.equal(game.time, 0); assert.equal(game.player.pos, 0);
});

test('a conservative driver can complete both route branches without forced collisions', () => {
  for (const seed of [20261021, 1, 2, 42, 999]) for (const route of ['main', 'shortcut']) {
    const game = new Commute(seed);
    for (let frame = 0; frame < 60 * 900 && !['won', 'lost'].includes(game.state); frame++) {
      if (game.state === 'choice') game.chooseRoute(route);
      const p = game.player;
      const stopDistance = p.speed * p.speed / 14 + 4;
      const ahead = game.cars.filter(c => c.pos > p.pos && Math.abs(c.x - p.x) < .8).sort((a, b) => a.pos - b.pos)[0];
      let brake = ahead && ahead.pos - p.pos - (ahead.length + p.length) / 2 < stopDistance + p.speed * .5;
      for (const light of game.lights) {
        const gap = light.pos - p.pos - p.length / 2;
        if (gap > 0 && gap < stopDistance + 4 && lightState(light, game.time).color !== 'green') brake = true;
      }
      if (game.bumps.some(b => b > p.pos && b - p.pos < stopDistance && p.speed > 5.5)) brake = true;
      game.update(1 / 60, { brake: Boolean(brake) });
    }
    assert.equal(game.state, 'won', `${seed}/${route}: ${game.reason || 'traffic stuck'} at ${game.player.pos.toFixed(0)}m`);
    assert.equal(game.accidents, 0, `${seed}/${route} forced collision`);
    assert.equal(game.violations, 0);
  }
});
