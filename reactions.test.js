import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ReactionDirector } from './reactions.js';
import { Commute, CAR_TYPES } from './game.js';

test('outcomes express each requested personality', () => {
  const clover = new ReactionDirector('clover', () => 0), wulong = new ReactionDirector('wulong', () => 0);
  assert.equal(clover.result(true).mood, 'cool'); assert.equal(clover.result(false).mood, 'angry');
  assert.equal(wulong.result(true).mood, 'calm'); assert.equal(wulong.result(false).mood, 'calm');
  const cj = new ReactionDirector('cjyyza', () => 0), ai = new ReactionDirector('sebastian', () => 0);
  assert.equal(cj.result(true).mood, 'power'); assert.match(cj.result(false).title, /传送器/);
  assert.equal(cj.pick('cutIn').quote, '……'); assert.ok(cj.pick('cutIn').thought);
  assert.equal(ai.result(true).mood, 'ai'); assert.match(ai.result(false).title, /失败/);
});

test('road reactions deduplicate incidents, respect cooldown, and avoid repeating the same line', () => {
  const director = new ReactionDirector('clover', () => 0);
  const ped = { type: 'pedestrian', key: 'ped:1', at: 0 };
  const first = director.update(0, [ped]); assert.equal(first.type, 'pedestrian');
  assert.equal(director.update(1, [ped]), null);
  assert.equal(director.update(6, [ped]), null);
  const next = director.update(7, [{ ...ped, key: 'ped:2', at: 7 }]);
  assert.equal(next.mood, 'angry'); assert.notEqual(first.quote, next.quote);
  director.update(8, [{ type: 'pothole', key: 'old-hole', at: 8 }]);
  assert.notEqual(director.update(40)?.type, 'pothole');
  assert.equal(director.update(40), null, '同一个游戏时刻不会连续发言');
});

test('nearby pedestrian and unsignalled lane change generate semantic incidents once', () => {
  const game = new Commute(31, 'levels', 0); game.cars = []; game.spawnIn = 999; game.potholes = []; game.player.pos = 150;
  game.update(1 / 60, { brake: true }); game.update(1 / 60, { brake: true });
  assert.equal(game.incidents.filter(event => event.type === 'pedestrian').length, 1);
  assert.ok(game.events.some(event => event.message.includes('前方有人过路')));
  const traffic = new Commute(31, 'levels', 1); traffic.random = () => 0; traffic.lights = []; traffic.works = [];
  const car = { ...CAR_TYPES.suv, type: 'suv', id: 91, pos: 25, x: 1.5, targetX: 1.5, desired: 18, speed: 12, decision: 0, personality: 0, wait: 0, stoppedUntil: 0, lateral: 0 };
  traffic.cars = [car]; traffic.updateCar(car, [{ ...car }], 1 / 60);
  assert.equal(car.pendingX, .5); assert.equal(car.signal, 0);
  assert.equal(traffic.incidents.filter(event => event.type === 'cutIn').length, 1);
});

test('a stopped taxi near the player generates one sudden-stop incident', () => {
  const game = new Commute(8, 'levels', 1); game.lights = []; game.works = [];
  const car = { ...CAR_TYPES.taxi, type: 'taxi', id: 17, pos: 25, x: .5, targetX: .5, desired: 15, speed: 0, decision: 100, personality: 0, wait: 0, stoppedUntil: 5, taxiStop: true, lateral: 0 };
  game.cars = [car]; game.updateCar(car, [{ ...car }], 1 / 60); game.updateCar(car, [{ ...car }], 1 / 60);
  assert.equal(game.incidents.filter(event => event.type === 'suddenStop').length, 1);
});

test('critical incidents take priority over low-priority remarks', () => {
  const director = new ReactionDirector('sebastian', () => .5);
  const reaction = director.update(0, [{ type: 'redLight', key: 'red:1', at: 0 }, { type: 'pedestrian', key: 'ped:1', at: 0 }]);
  assert.equal(reaction.type, 'pedestrian');
  assert.equal(director.update(1), null);
  assert.equal(director.update(6).type, 'redLight');
});

test('cosmetic randomness does not change traffic, movement, scoring or the traffic random stream', () => {
  const a = new Commute(81, 'levels', 0), b = new Commute(81, 'levels', 0);
  const director = new ReactionDirector('clover', () => .37);
  for (let i = 0; i < 1000; i++) {
    a.update(1 / 60); b.update(1 / 60);
    director.update(a.time, a.incidents.splice(0));
    if (i % 77 === 0) director.result(i % 2 === 0);
  }
  assert.deepEqual(a.player, b.player); assert.deepEqual(a.cars, b.cars); assert.deepEqual(a.lights, b.lights);
  assert.equal(a.score(), b.score()); assert.equal(a.random(), b.random());
});
