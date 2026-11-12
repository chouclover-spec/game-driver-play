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
    close(game.player.speed, 15 - 7 * driver.stats.braking * (driver.id === 'clover' ? 1.25 : 1) * .2);
    close(game.player.x, .5 + 1.5 * driver.stats.handling * (driver.id === 'cjyyza' ? 1.2 : 1) * .2);
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

test('Wulong mitigates light impacts but cannot shield a fatal collision', () => {
 const impact=(id,speed)=>{const g=emptyRoad(id);g.player.speed=speed;g.cars=[{id:99,type:'car',x:.5,pos:0,speed:0,lateral:0,length:4.3,width:.57}];g.checkCollisions();return g;};
 const a=impact('clover',2),b=impact('wulong',2); assert.equal(100-b.player.health,(100-a.player.health)/2);assert.ok(b.skillUntil>b.time);assert.equal(b.state,'running');
 const fatal=impact('wulong',12);assert.equal(fatal.state,'lost');assert.ok(fatal.failure.tip);assert.equal(fatal.failure.x,.5);
});
test('traits activate only in their situations and expire without traffic RNG',()=>{
 const c=emptyRoad('clover');c.player.speed=12;c.update(.1,{brake:true});assert.ok(c.skillUntil>c.time);for(let i=0;i<10;i++)c.update(.1,{});assert.ok(c.skillUntil<c.time);
 const j=emptyRoad('cjyyza');j.move(1);j.update(.1,{});assert.ok(j.skillUntil>j.time);
 const s=emptyRoad('sebastian');s.player.speed=10;s.cars=[{id:3,type:'car',pos:35,x:.5,targetX:.5,speed:2,desired:2,length:4.3,width:.57,decision:99,personality:.5,wait:0,stoppedUntil:0,lateral:0}];s.update(.01,{});assert.ok(s.skillUntil>s.time);assert.equal(s.state,'running');
});
