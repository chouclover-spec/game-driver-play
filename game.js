import { LEVELS } from './campaign.js';
import { getDriver } from './drivers.js';
export const CAR_TYPES = {
  car: { name: '小车', speed: 13, length: 4.3, width: .57, color: '#ddd8c7' },
  sweeper: { name: '清扫车', speed: 5.2, length: 5.3, width: .7, color: '#d4b457' },
  tricycle: { name: '三轮车', speed: 3.8, length: 3.1, width: .48, color: '#a4aeb7' },
  taxi: { name: '网约车', speed: 15, length: 4.4, width: .57, color: '#e8ebdf' },
  motorcycle: { name: '摩托', speed: 17, length: 2.3, width: .23, color: '#bd795d' },
  suv: { name: '黑色SUV', speed: 18, length: 4.9, width: .66, color: '#2c3438' },
};
export const STAGES = ['小区出口', '城市主路', '路线选择', '施工路段', '公司门口'];
export function seededRandom(seed) {
  let value = seed >>> 0;
  return () => { value += 0x6D2B79F5; let t = value; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function dateSeed(date = new Date()) {
  return Number(`${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`);
}
export function lightState(light, time) {
  const phase = (time + light.offset) % light.cycle;
  return phase < light.green ? { color: 'green', remaining: light.green - phase } : phase < light.green + 3 ? { color: 'yellow', remaining: light.green + 3 - phase } : { color: 'red', remaining: light.cycle - phase };
}
export function collisionSeverity(longitudinal, lateral = 0) { return Math.hypot(longitudinal, lateral * 3.6); }
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const approach = (v, target, amount) => v < target ? Math.min(target, v + amount) : Math.max(target, v - amount);

export class Commute {
  constructor(seed, mode = 'random', levelIndex = 0, driverId = 'clover') {
    this.seed = seed; this.mode = mode; this.random = seededRandom(seed);
    this.driver = getDriver(driverId);
    this.levelIndex = clamp(Math.floor(levelIndex) || 0, 0, LEVELS.length - 1);
    this.level = mode === 'levels' ? LEVELS[this.levelIndex] : null;
    this.potholes = []; this.pedestrians = []; this.potholeHits = 0; this.avoided = 0; this.yielded = 0; this.lastAssist = -10;
    this.time = 0; this.length = 2600; this.state = 'running'; this.branch = null;
    this.incidents = []; this.seenIncidents = new Set();
    this.player = { pos: 0, x: .5, targetX: .5, speed: 0, length: this.driver.length, width: this.driver.width, health: 100, lateral: 0 };
    this.cars = []; this.events = []; this.accidents = 0; this.violations = 0; this.hardBrakes = 0;
    this.spawnIn = 0; this.nextId = 1; this.contacts = new Set(); this.slowUntil = 0; this.jolt = 0; this.lastHardBrake = -10;
    this.segments = [{ start: 0, lanes: 2 }, { start: 350, lanes: 3 }, { start: 900, lanes: 4 }, { start: 1700, lanes: 2 }, { start: 2150, lanes: 3 }];
    this.lights = [260, 640, 1130, 1510, 2020, 2440].map(pos => ({ pos, cycle: 28 + Math.floor(this.random() * 9), green: 16 + Math.floor(this.random() * 4), offset: Math.floor(this.random() * 25) }));
    this.bumps = [105, 180, 2280];
    this.works = [{ start: 1770, end: 1880, lane: 1 }];
    this.seenBumps = new Set(); this.crossedLights = new Set();
    if (this.level) this.configureLevel();
    this.emit(this.level ? this.level.tip : '上车，系好安全带。松开刹车会自动前进。');
    this.spawnTraffic(true);
  }
  configureLevel() {
    this.length = this.level.length; this.spawnIn = this.level.spawnDelay;
    this.lights = []; this.bumps = []; this.works = [];
    if (this.level.theme === 'village') {
      this.segments = [{ start: 0, lanes: 2 }];
      this.potholes = [85, 125, 230, 275, 400, 435].map((pos, i) => ({ pos, x: i % 2 + .5, width: .55, resolved: false }));
      this.pedestrians = [180, 340].map((pos, i) => ({ pos, x: i % 2 ? -.2 : 2.2, direction: i % 2 ? 1 : -1, width: .24, length: .8, active: false, done: false, waited: false }));
    } else if (this.level.theme === 'city') {
      this.segments = [{ start: 0, lanes: 3 }];
      this.lights = [165, 340, 510].map((pos, i) => ({ pos, cycle: 25, green: 15, offset: i * 7 }));
      this.works = [{ start: 400, end: 445, lane: 2 }];
    } else {
      this.segments = [{ start: 0, lanes: 3 }, { start: 480, lanes: 4 }];
    }
  }
  emit(message, kind = 'note') { this.events.push({ message, kind }); }
  notice(type, key) {
    const id = `${type}:${key}`;
    if (this.seenIncidents.has(id)) return;
    this.seenIncidents.add(id); this.incidents.push({ type, key: id, at: this.time });
  }
  score() {
    const distance = Math.floor(clamp(this.player.pos, 0, this.length) * 2);
    const rewards = this.avoided * 25 + this.yielded * 80;
    const completion = this.state === 'won' ? 300 + Math.max(0, Math.round(this.player.health)) * 2 + (!this.accidents && !this.violations && !this.potholeHits ? 200 : 0) : 0;
    return distance + rewards + completion;
  }
  stars() { return !this.accidents && !this.violations && !this.potholeHits ? 3 : this.player.health >= 60 && !this.violations ? 2 : 1; }
  stage() { return this.level ? this.levelIndex : this.player.pos < 350 ? 0 : this.player.pos < 900 ? 1 : this.player.pos < 1700 ? 2 : this.player.pos < 2150 ? 3 : 4; }
  lanesAt(pos) { let count = this.segments[0].lanes; for (const segment of this.segments) if (pos >= segment.start) count = segment.lanes; return count; }
  roadWidthAt(pos) {
    let count = this.segments[0].lanes;
    for (let i = 1; i < this.segments.length; i++) {
      const segment = this.segments[i];
      if (pos >= segment.start) count = segment.lanes;
      else if (pos > segment.start - 75) return count + (segment.lanes - count) * (pos - segment.start + 75) / 75;
      else break;
    }
    return count;
  }
  chooseRoute(route) {
    if (this.state !== 'choice') return;
    this.branch = route;
    if (route === 'shortcut') {
      this.length = 2380; this.segments[2].lanes = 2;
      this.bumps.push(970, 1070, 1220); this.lights[2].pos = 1320;
      this.emit('导航：距离确实短了，减速带也确实多了。');
    } else { this.emit('走主干道。车道多，不代表每条都快。'); }
    this.cars = this.cars.filter(car => car.x < this.lanesAt(car.pos));
    this.state = 'running';
  }
  move(direction) {
    if (this.state !== 'running') return;
    const p = this.player;
    if (Math.abs(p.x - p.targetX) > .08) return;
    const next = p.targetX + direction;
    if (next < .5 || next > this.lanesAt(p.pos + 10) - .5) { this.emit('已经是道路边缘了。'); return; }
    if (this.cars.some(c => Math.abs(c.x - next) < .6 && Math.abs(c.pos - p.pos) < 12)) this.emit('旁边有车。变道前留一点空间。', 'warning');
    p.targetX = next;
  }
  horn() {
    if (this.state !== 'running') return;
    let reminded = false;
    for (const car of this.cars) {
      if (car.pos > this.player.pos && car.pos - this.player.pos < 30 && Math.abs(car.x - this.player.x) < .6 && car.wait > 0) { car.wait = 0; reminded = true; }
    }
    this.emit(reminded ? '前车：哦，绿了。' : '叭。前面没空，喇叭也变不出一条路。');
  }
  gapSafe(car, x) {
    const candidates = [...this.cars, this.player];
    return candidates.every(other => {
      if (other === car || Math.abs(other.x - x) > .65) return true;
      const gap = other.pos - car.pos;
      return gap > Math.max(11, car.speed * 1.1) || gap < -Math.max(10, other.speed * 1.1);
    });
  }
  spawnTraffic(initial = false) {
    const base = this.player.pos;
    const count = initial ? this.level?.initialCars ?? 6 : 1;
    for (let i = 0; i < count; i++) {
      const pos = base + (initial ? (this.level ? 62 : 36) + i * (this.level ? 23 : 25) : 125 + this.random() * 35);
      if (pos > this.length + 20) continue;
      const lanes = this.lanesAt(pos);
      const types = this.level?.types ?? (base < 250 ? ['car', 'tricycle', 'car'] : this.branch === 'shortcut' && base > 900 && base < 1500 ? ['tricycle', 'taxi', 'car', 'motorcycle'] : ['car', 'car', 'taxi', 'sweeper', 'motorcycle', 'suv', 'tricycle']);
      const type = types[Math.floor(this.random() * types.length)];
      const def = CAR_TYPES[type];
      const lane = type === 'sweeper' ? lanes - 1 : Math.floor(this.random() * lanes);
      const x = lane + .5;
      if (this.cars.some(c => Math.abs(c.pos - pos) < 22 && Math.abs(c.x - x) < .7)) continue;
      if (this.works.some(w => pos > w.start - 15 && pos < w.end && lane === w.lane)) continue;
      const desired = this.level?.theme === 'highway' ? (i % 2 === 0 && initial ? 11 + this.random() * 3 : 20 + this.random() * 7) : this.level?.theme === 'village' ? Math.min(def.speed, 5 + this.random() * 2) : this.level ? Math.min(def.speed, 8 + this.random() * 3) : def.speed * (.86 + this.random() * .3);
      this.cars.push({ ...def, type, pos, x, targetX: x, speed: this.level ? desired * .85 : def.speed * .65, desired, id: this.nextId++, brake: false, signal: 0, signalTime: 0, decision: 2 + this.random() * 4, personality: this.random(), wait: 0, wasStopped: false, waitHandled: false, stoppedUntil: 0, lateral: 0, taxiStop: false, mergeWarned: false });
    }
  }
  update(dt, input = {}) {
    if (this.state !== 'running') return;
    this.time += dt; this.jolt = Math.max(0, this.jolt - dt * 2);
    const p = this.player, previousPos = p.pos;
    if (!this.level && !this.branch && p.pos >= 800) { this.state = 'choice'; return; }
    const stats = this.driver.stats;
    let target = input.brake ? 0 : (input.gas ? this.level?.maxSpeed ?? 20 : this.level?.cruise ?? 10.5) * stats.speed;
    let assist = false;
    if (this.level && !input.brake) {
      const ahead = this.cars.filter(c => c.pos > p.pos && Math.abs(c.x - p.x) < .65).sort((a, b) => a.pos - b.pos)[0];
      if (ahead) {
        const gap = ahead.pos - p.pos - (ahead.length + p.length) / 2;
        if (gap < 5 + p.speed * 1.2 && p.speed > ahead.speed) {
          target = Math.min(target, Math.max(0, ahead.speed + (gap - 5) * .35)); assist = true;
          if (this.time - this.lastAssist > 6) { this.lastAssist = this.time; this.emit('新手辅助：前车太近，帮你收油减速。'); }
        }
      }
    }
    const oldSpeed = p.speed;
    p.speed = approach(p.speed, this.time < this.slowUntil ? 0 : target, dt * (assist ? 7 : input.brake ? 7 * stats.braking : p.speed > target ? 2 : (this.level ? 2 : 2.8) * stats.acceleration));
    if (input.brake && oldSpeed > 14 && this.time - this.lastHardBrake > 3) { this.hardBrakes++; this.lastHardBrake = this.time; }
    const oldX = p.x;
    p.x = approach(p.x, p.targetX, dt * 1.5 * stats.handling); p.lateral = (p.x - oldX) / dt;
    p.pos += p.speed * dt;
    const available = this.lanesAt(p.pos);
    if (p.x > available - .35) {
      p.targetX = available - .5; p.x = available - .4; p.health -= 12; this.accidents++; this.slowUntil = this.time + .4; this.jolt = 1;
      this.emit('车道收窄，擦到护栏了。提前看地面箭头。', 'warning');
    }
    for (const light of this.lights) {
      if (input.brake && p.speed < 1 && light.pos > p.pos && light.pos - p.pos < 45 && lightState(light, this.time).color === 'red') this.notice('redLight', light.pos);
      if (previousPos + p.length / 2 < light.pos && p.pos + p.length / 2 >= light.pos && !this.crossedLights.has(light.pos)) {
        this.crossedLights.add(light.pos);
        if (lightState(light, this.time).color === 'red') { this.violations++; this.emit('闯红灯。本局继续，但不进入安全到达榜。', 'warning'); }
      }
    }
    for (const pos of this.bumps) {
      if (previousPos < pos && p.pos >= pos && !this.seenBumps.has(pos)) {
        this.seenBumps.add(pos); this.jolt = .5;
        if (p.speed > 8.3) { p.health -= 5; p.speed *= .72; this.jolt = 1; this.emit('减速带不会因为你赶时间就变平。', 'bump'); }
      }
    }
    for (const work of this.works) {
      if (p.pos + 2 > work.start && previousPos + 2 <= work.start && Math.abs(p.x - work.lane - .5) < .6) {
        this.hitObstacle(p.speed, '撞上施工围挡。提前汇入空闲车道。'); p.pos = work.start - 3; p.targetX = .5;
      }
    }
    this.updateVillage(dt, previousPos);
    const snapshot = this.cars.map(c => ({ ...c }));
    for (const car of this.cars) this.updateCar(car, snapshot, dt);
    this.checkCollisions();
    this.cars = this.cars.filter(c => c.pos > p.pos - 65 && c.pos < p.pos + 240);
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) { this.spawnTraffic(); this.spawnIn = this.level ? this.level.spawnDelay + this.random() * 2 : 1.8 + this.random() * 2.3; }
    if (p.health <= 0 && this.state === 'running') { this.state = 'lost'; this.reason = '车损耗尽。小碰撞也需要留心。'; }
    if (p.pos >= this.length && this.state === 'running') { this.state = 'won'; this.emit(this.level ? `${this.level.name}通过！这一关的努力都算分。` : '到了。人和车都还在，今天就是胜利。'); }
  }
  updateVillage(dt, previousPos) {
    const p = this.player;
    for (const hole of this.potholes) {
      if (!hole.resolved && hole.pos > p.pos && hole.pos - p.pos < 45) this.notice('pothole', hole.pos);
      if (hole.resolved || p.pos + p.length / 2 < hole.pos) continue;
      hole.resolved = true;
      if (Math.abs(p.x - hole.x) < (p.width + hole.width) / 2) {
        this.potholeHits++; p.health -= p.speed < 3 ? 2 : 6; p.speed *= .7; this.jolt = .5;
        this.emit('压到坑了，少量车损。下一个提前绕开。', 'bump');
      } else { this.avoided++; this.emit('避开坑洼 +25分。路不好，技术还行。'); }
    }
    for (const person of this.pedestrians) {
      if (person.done) continue;
      if (!person.active && p.pos > person.pos + p.length) { person.done = true; continue; }
      const distance = person.pos - p.pos;
      if (!person.active && distance > 0 && distance < 42 && !this.cars.some(car => Math.abs(car.pos - person.pos) < 9)) {
        person.active = true; this.emit('前方有人过路，松油门，必要时停车。', 'warning'); this.notice('pedestrian', person.pos);
      }
      if (!person.active) continue;
      if (distance > 0 && distance < 45 && p.speed < 1) person.waited = true;
      person.x += person.direction * dt * .34;
      if (person.x < -.3 || person.x > this.lanesAt(person.pos) + .3) {
        person.done = true;
        if (person.waited && p.pos < person.pos) { this.yielded++; this.emit('礼让行人 +80分。谢谢你等这几秒。'); }
        continue;
      }
      if (person.x > 0 && person.x < this.lanesAt(person.pos) && Math.abs(p.pos - person.pos) < (p.length + person.length) / 2 && Math.abs(p.x - person.x) < (p.width + person.width) / 2) {
        this.accidents++; this.state = 'lost'; this.reason = '没有让过路行人先通过。已保留行驶得分，只需重试村路。';
      }
    }
  }
  updateCar(car, snapshot, dt) {
    let desired = car.desired;
    const def = CAR_TYPES[car.type];
    if (car.type === 'taxi') desired *= .78 + .24 * Math.sin(this.time * .4 + car.personality * 10);
    car.decision -= dt;
    const localLanes = this.lanesAt(car.pos + 40);
    const works = this.works.find(w => car.pos < w.end && car.pos > w.start - 90 && Math.abs(car.x - w.lane - .5) < .6);
    const mustMerge = car.targetX > localLanes - .5 || Boolean(works);
    const ahead = [...snapshot, this.player].filter(c => c.id !== car.id && Math.abs(c.x - car.x) < (c.width + car.width) / 2 + .12 && c.pos > car.pos).sort((a, b) => a.pos - b.pos)[0];
    if (car.decision <= 0 || mustMerge) {
      car.decision = 3 + this.random() * 5;
      if (Math.abs(car.x - car.targetX) < .05 && (mustMerge || (ahead && ahead.speed < car.desired - 2) || (car.type === 'suv' && this.random() < .3) || (car.type === 'motorcycle' && this.random() < .55))) {
        const options = [car.targetX - 1, car.targetX + 1].filter(x => x >= .5 && x <= localLanes - .5 && !this.works.some(w => car.pos > w.start - 30 && car.pos < w.end && Math.abs(x - w.lane - .5) < .5));
        for (const x of options) {
          if (this.gapSafe(car, x)) {
            car.pendingX = x; car.signal = car.type === 'suv' ? 0 : Math.sign(x - car.x); car.signalTime = car.type === 'suv' ? .45 : .85;
            if (Math.abs(car.pos - this.player.pos) < 40 && Math.abs(x - this.player.x) < .65 && (car.type === 'suv' || Math.abs(car.pos - this.player.pos) < 15)) this.notice('cutIn', `${car.id}:${x}`);
            if (car.type === 'suv' && Math.abs(car.pos - this.player.pos) < 45 && !car.mergeWarned) { car.mergeWarned = true; this.emit('黑色SUV靠近车道线了，留点空间。', 'warning'); }
            break;
          }
        }
      }
    }
    if (car.pendingX !== undefined) {
      car.signalTime -= dt;
      if (car.signalTime <= 0) { if (this.gapSafe(car, car.pendingX)) car.targetX = car.pendingX; car.pendingX = undefined; }
    }
    if (car.targetX > this.lanesAt(car.pos) - .5) desired = 0;
    if (mustMerge && Math.abs(car.x - car.targetX) < .1) {
      const boundary = works ? works.start : this.segments.find(s => s.start > car.pos && s.lanes < Math.floor(car.x) + 1)?.start;
      if (boundary) desired = Math.min(desired, Math.sqrt(2 * 4 * Math.max(0, boundary - car.pos - car.length / 2 - 3)));
    }
    if (ahead) {
      const gap = ahead.pos - car.pos - (ahead.length + car.length) / 2;
      desired = Math.min(desired, Math.max(0, ahead.speed + (gap - 3 - car.speed * .9) * .7));
      if (gap < 2) desired = 0;
    }
    let redStop = false;
    for (const light of this.lights) {
      const gap = light.pos - car.pos - car.length / 2;
      const state = lightState(light, this.time).color;
      if (gap >= -.15 && gap < 90 && (state === 'red' || state === 'yellow' && gap > car.speed * car.speed / 8 + 3)) {
        desired = Math.min(desired, Math.sqrt(2 * 4 * Math.max(0, gap - 2))); redStop = true;
      }
    }
    for (const bump of this.bumps) if (bump > car.pos && bump - car.pos < 20) desired = Math.min(desired, 6);
    for (const person of this.pedestrians) {
      const gap = person.pos - car.pos - car.length / 2;
      if (person.active && !person.done && gap >= 0 && gap < 60) desired = Math.min(desired, Math.sqrt(2 * 4 * Math.max(0, gap - 4)));
    }
    if (car.type === 'taxi' && !car.taxiStop && car.pos > (this.level ? 280 : 1000) && car.personality > .55 && car.x > this.lanesAt(car.pos) - 1) {
      car.taxiStop = true; car.stoppedUntil = this.time + 5; this.emit('网约车向路边靠了。别贴太近。', 'warning');
    }
    if (car.stoppedUntil > this.time) desired = 0;
    if (car.stoppedUntil > this.time && car.pos > this.player.pos && car.pos - this.player.pos < 40 && Math.abs(car.x - this.player.x) < .75) this.notice('suddenStop', car.id);
    if (car.speed < .3 && redStop) { car.wasStopped = true; car.waitHandled = false; }
    if (car.wasStopped && !redStop && !car.waitHandled) { car.wait = .5 + car.personality * 1.3; car.waitHandled = true; }
    if (car.wait > 0) { desired = 0; car.wait -= dt; }
    if (car.speed > 2) car.wasStopped = false;
    const previousSpeed = car.speed;
    car.speed = approach(car.speed, desired, dt * (desired < car.speed ? 5 : 2)); car.brake = car.speed < previousSpeed - .01 || car.speed < .5;
    const oldX = car.x;
    const changeSpeed = car.type === 'suv' ? 1 : car.type === 'motorcycle' ? 1.4 : .85;
    // An unsignalled SUV first drifts toward the boundary, giving a visual clue.
    const visualTarget = car.type === 'suv' && car.pendingX !== undefined ? car.targetX + Math.sign(car.pendingX - car.targetX) * .16 : car.targetX;
    car.x = approach(car.x, visualTarget, dt * changeSpeed); car.lateral = (car.x - oldX) / dt;
    if (Math.abs(car.x - car.targetX) < .01 && car.pendingX === undefined) car.signal = 0;
    car.pos += car.speed * dt;
    // Prevent NPCs tunnelling into the queue or through a red stop line.
    if (ahead && Math.abs(ahead.x - car.x) < .6) car.pos = Math.min(car.pos, ahead.pos - (ahead.length + car.length) / 2 - .7);
    if (redStop) for (const light of this.lights) if (light.pos > car.pos - 1 && lightState(light, this.time).color === 'red') car.pos = Math.min(car.pos, light.pos - car.length / 2 - 1);
    car.length = def.length;
  }
  hitObstacle(speed, reason) {
    this.notice('collision', `obstacle:${this.player.pos}`);
    this.accidents++; this.jolt = 1;
    if (speed >= (this.level ? 12 : 8)) { this.state = 'lost'; this.reason = reason; return; }
    this.player.health -= Math.max(8, speed * 3); this.player.speed = 0; this.slowUntil = this.time + .8;
    this.emit('低速碰到围挡。车还能开，先离开封闭车道。', 'collision');
  }
  checkCollisions() {
    const p = this.player, touching = new Set();
    for (const car of this.cars) {
      if (Math.abs(car.pos - p.pos) > (car.length + p.length) / 2 || Math.abs(car.x - p.x) > (car.width + p.width) / 2) continue;
      touching.add(car.id);
      if (this.contacts.has(car.id)) continue;
      const severity = collisionSeverity(p.speed - car.speed, p.lateral - car.lateral);
      this.notice('collision', car.id);
      this.accidents++; this.jolt = 1;
      if (severity >= (this.level ? 12 : 8)) { this.state = 'lost'; this.reason = `与${CAR_TYPES[car.type].name}发生严重碰撞。速度差太大，刹车需要更早。`; }
      else {
        p.health -= Math.max(this.level ? 4 : 7, Math.round(severity * (this.level ? 2 : 4))); this.slowUntil = this.time + .55; p.speed = Math.min(p.speed, car.speed);
        this.emit(this.level ? `轻碰${CAR_TYPES[car.type].name}，少量车损，继续闯关。` : `和${CAR_TYPES[car.type].name}轻微碰撞。车还能开，榜单资格没了。`, 'collision');
      }
    }
    this.contacts = touching;
  }
  warning() {
    const p = this.player;
    const person = this.pedestrians.find(person => !person.done && person.pos > p.pos && person.pos - p.pos < 80);
    if (person) return `${Math.round(person.pos - p.pos)}m · ${person.active ? '行人过路，请停车礼让' : '人车混行，注意行人'}`;
    const hole = this.potholes.find(hole => !hole.resolved && hole.pos > p.pos && hole.pos - p.pos < 65);
    if (hole) return `${Math.round(hole.pos - p.pos)}m · ${Math.floor(hole.x) + 1}道有坑，绕开或慢行`;
    const light = this.lights.find(l => l.pos > p.pos + 2 && l.pos - p.pos < 90);
    if (light) { const s = lightState(light, this.time); return `${Math.round(light.pos - p.pos)}m · ${s.color === 'red' ? '红灯，准备停车' : s.color === 'yellow' ? '黄灯，别抢' : '绿灯'} ${Math.ceil(s.remaining)}s`; }
    const narrow = this.segments.find((s, i) => i > 0 && s.start > p.pos && s.start - p.pos < 130 && s.lanes < this.segments[i - 1].lanes);
    if (narrow) return `${Math.round(narrow.start - p.pos)}m · 收窄为${narrow.lanes}车道`;
    const work = this.works.find(w => w.start > p.pos && w.start - p.pos < 120);
    if (work) return `${Math.round(work.start - p.pos)}m · 右侧施工`;
    const bump = this.bumps.find(b => b > p.pos && b - p.pos < 55);
    if (bump) return `${Math.round(bump - p.pos)}m · 减速带`;
    return this.player.pos > this.length - 60 ? this.level ? '终点在前方，稳稳过关' : '公司就在前面' : this.level?.theme === 'highway' ? '判断速度差，提前超车' : '观察前车，保持车距';
  }
}
