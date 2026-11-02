import { lightState } from './game.js';
import { PALETTE as P, VEHICLE_COLORS, TINTS } from './palette.js';
import { getDriver } from './drivers.js';
const W = 420, H = 620, LANE = 78, SCALE = 11, PLAYER_Y = 474;
const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const FONT = '"PingFang SC","Microsoft YaHei",system-ui,sans-serif';
const shade = (hex, amount) => '#' + hex.slice(1).match(/../g).map(part => Math.max(0, Math.min(255, parseInt(part, 16) + amount)).toString(16).padStart(2, '0')).join('');
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.driver = 'clover';
    this.layout = { width: W, height: H, lane: LANE, playerY: PLAYER_Y };
    this.resize();
    if (globalThis.ResizeObserver) { this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(canvas); }
  }
  resize() {
    const ratio = Math.min(globalThis.devicePixelRatio || 1, 2);
    const bounds = this.canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const aspect = bounds.width / bounds.height;
    const height = Math.max(H, 360 / aspect), width = height * aspect;
    const pixelsW = Math.round(bounds.width * ratio), pixelsH = Math.round(bounds.height * ratio);
    if (this.canvas.width === pixelsW && this.canvas.height === pixelsH && this.layout.width === width) return;
    this.layout = { width, height, lane: width > 850 ? 102 : width > 600 ? 90 : LANE, playerY: height * PLAYER_Y / H };
    this.canvas.width = pixelsW; this.canvas.height = pixelsH;
    this.ctx.setTransform(pixelsW / width, 0, 0, pixelsH / height, 0, 0);
  }
  box(x, y, w, h, radius, color, stroke = null, lw = 1) {
    const c = this.ctx; c.beginPath();
    if (radius) c.roundRect(x, y, w, h, Math.min(radius, Math.abs(w) / 2, Math.abs(h) / 2)); else c.rect(x, y, w, h);
    c.fillStyle = color; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
  }
  oval(x, y, rx, ry, color, stroke = null, lw = 1) {
    const c = this.ctx; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = color; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
  }
  dot(x, y, r, color, stroke = null, lw = 1) { this.oval(x, y, r, r, color, stroke, lw); }
  text(text, x, y, size = 10, color = P.ink, align = 'center') {
    const c = this.ctx; c.fillStyle = color; c.font = `800 ${size}px ${FONT}`; c.textAlign = align; c.fillText(text, x, y);
  }
  gradient(x, y, w, h, color, top = 25, bottom = -25) {
    const g = this.ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, shade(color, top)); g.addColorStop(.45, color); g.addColorStop(1, shade(color, bottom)); return g;
  }
  toyBox(x, y, w, h, radius, color, depth = 4) {
    this.box(x + 2, y + depth + 3, w, h, radius, P.shadow);
    this.box(x, y + depth, w, h, radius, shade(color, -28));
    this.box(x, y, w, h, radius, this.gradient(x, y, w, h, color), shade(color, -12), .7);
    this.box(x + 3, y + 2, Math.max(2, w - 6), 2.5, 2, P.white + '70');
  }
  tree(x, y, variant = 0) {
    const r = 17 + variant * 3;
    this.oval(x + 8, y + 21, r + 3, 8, P.shadow);
    this.box(x - 3, y - 3, 7, 23, 3, P.walnut);
    this.dot(x, y - 4, r, shade(P.jade, -15));
    this.dot(x - 8, y - 10, r * .78, P.jade);
    this.dot(x + 8, y - 12, r * .8, P.jade);
    this.dot(x - 2, y - 18, r * .78, this.gradient(x - r, y - 30, r * 2, r * 2, P.jade, 55, -4));
    this.oval(x - 7, y - 24, 5, 3, P.white + '45');
    if (variant) { this.dot(x + 10, y - 10, 3.5, P.yellow); this.dot(x - 9, y - 4, 3, P.ochre); }
  }
  flower(x, y, color) {
    this.box(x - 1, y, 2, 7, 1, P.grassDark);
    for (let i = 0; i < 5; i++) this.dot(x + Math.cos(i * 1.256) * 2.8, y + Math.sin(i * 1.256) * 2.8, 2.4, color);
    this.dot(x, y, 1.8, P.yellow);
  }
  cityBlock(x, y, w, h, fill, variant, side) {
    this.toyBox(x, y, w, h, 8, fill, 7);
    this.toyBox(x - 4, y - 13, w + 8, 19, 7, [P.blue, P.ochre, P.jade, P.red][variant % 4], 4);
    const wx = side > 0 ? x + 9 : x + w - 27;
    for (let j = 0; j < 3; j++) {
      this.box(wx - 2, y + 14 + j * 22, 21, 18, 5, P.paper);
      this.box(wx + 1, y + 16 + j * 22, 15, 12, 3, this.gradient(wx, y + j * 22, 18, 20, P.glass, 25, -25));
      this.box(wx + 7, y + 16 + j * 22, 2, 12, 0, P.paper);
    }
    this.box(x - 3, y + h - 17, w + 6, 17, 6, P.paper);
    for (let j = 0; j < w; j += 14) this.box(x + j, y + h - 17, 7, 16, 3, variant % 2 ? P.blue : P.ochre);
  }
  villageHouse(x, y, w, h, fill, roof, variant) {
    this.toyBox(x, y, w, h, 8, fill, 6);
    this.toyBox(x - 5, y - 15, w + 10, 24, 8, roof, 5);
    for (let j = 6; j < w; j += 11) this.box(x + j, y - 11, 2, 14, 1, P.white + '25');
    this.box(x + 10, y + h - 25, 15, 26, 5, shade(P.walnut, 22));
    this.dot(x + 21, y + h - 12, 1.5, P.yellow);
    this.box(x + w - 27, y + 16, 17, 16, 5, P.white);
    this.box(x + w - 24, y + 19, 11, 10, 3, P.glassDark);
    this.box(x + w - 19, y + 19, 1.5, 10, 0, P.white);
    if (variant % 2) this.toyBox(x + 9, y - 23, 11, 13, 3, fill, 2);
  }
  palm(x, y, size = 1, angle = 0, shadow = false) {
    const c = this.ctx; c.save(); c.translate(x, y); c.rotate(angle); c.scale(size, size);
    if (!shadow) {
      this.oval(15, 18, 40, 12, P.shadow);
      c.beginPath(); c.moveTo(-6, 25); c.quadraticCurveTo(-3, 0, 4, -29); c.strokeStyle = P.walnut; c.lineWidth = 9; c.lineCap = 'round'; c.stroke();
      c.beginPath(); c.moveTo(-8, 23); c.quadraticCurveTo(-5, 0, 2, -27); c.strokeStyle = P.ochre; c.lineWidth = 3; c.stroke();
    }
    c.translate(4, -29);
    const directions = [-2.9, -2.05, -1.15, -.35, .45, 1.3, 2.2];
    for (let i = 0; i < directions.length; i++) {
      const a = directions[i], length = i % 2 ? 56 : 65;
      c.save(); c.rotate(a); c.beginPath(); c.moveTo(0, 0);
      c.bezierCurveTo(16, -18, length - 5, -18, length, 3);
      c.bezierCurveTo(length - 18, -3, 16, 13, 0, 0);
      c.fillStyle = shadow ? P.canopyShadow : this.gradient(0, -12, length, 22, i % 2 ? P.palmDark : P.palmLight, 14, -13); c.fill();
      if (!shadow) { c.beginPath(); c.moveTo(3, 0); c.quadraticCurveTo(length * .6, -9, length - 5, 1); c.lineWidth = 1; c.strokeStyle = P.white + '28'; c.stroke(); }
      c.restore();
    }
    if (!shadow) { this.dot(0, 0, 6, P.palmDark); this.dot(-3, 3, 3.5, P.walnut); this.dot(4, 2, 3, P.walnut); }
    c.restore();
  }
  parasol(x, y, color) {
    const c = this.ctx;
    this.oval(x + 13, y + 28, 29, 12, P.shadow);
    this.box(x - 2, y, 4, 31, 2, P.walnut);
    for (let i = 0; i < 8; i++) {
      c.beginPath(); c.moveTo(x, y); c.arc(x, y, 25, i * Math.PI / 4, (i + 1) * Math.PI / 4); c.closePath();
      c.fillStyle = i % 2 ? P.paper : color; c.fill();
    }
    this.dot(x, y, 3, P.paper);
  }
  coast(game, screenY, leftAt, rightAt) {
    const c = this.ctx, { width, height } = this.layout, pos = game.player.pos;
    const shore = y => Math.max(55, leftAt(y) - 170) + Math.sin(y * .008 + pos * .008) * 17;
    c.beginPath(); c.moveTo(0, 0);
    for (let y = 0; y <= height + 8; y += 8) c.lineTo(leftAt(y) - 55, y);
    c.lineTo(0, height + 8); c.closePath(); c.fillStyle = P.sand; c.fill();
    c.beginPath(); c.moveTo(0, 0);
    for (let y = 0; y <= height + 8; y += 8) c.lineTo(shore(y), y);
    c.lineTo(0, height + 8); c.closePath();
    const sea = c.createLinearGradient(0, 0, leftAt(height / 2), 0);
    sea.addColorStop(0, P.seaDeep); sea.addColorStop(.65, P.sea); sea.addColorStop(1, P.seaShallow); c.fillStyle = sea; c.fill();
    for (const [offset, color, lineWidth] of [[0, P.white + 'b0', 5], [-11, P.seaShallow + 'aa', 8], [8, P.white + '55', 2]]) {
      c.beginPath(); for (let y = 0; y <= height + 8; y += 5) { const x = shore(y) + offset + Math.sin(y * .04 + game.time * .4) * 2; if (!y) c.moveTo(x, y); else c.lineTo(x, y); }
      c.strokeStyle = color; c.lineWidth = lineWidth; c.stroke();
    }
    const drift = (pos * 1.8) % 66;
    for (let y = -66 + drift; y < height; y += 66) {
      const end = shore(y) - 24;
      c.beginPath(); for (let x = 0; x < end; x += 12) { const wy = y + Math.sin(x * .025 + y * .02) * 4; if (!x) c.moveTo(x, wy); else c.lineTo(x, wy); }
      c.strokeStyle = P.white + '35'; c.lineWidth = 2; c.stroke();
    }
    // 椰林中的沙地小径，与主路保持距离。
    c.beginPath(); for (let y = -5; y < height + 8; y += 8) { const x = rightAt(y) + 155 + Math.sin(y * .01 + pos * .02) * 15; if (y === -5) c.moveTo(x, y); else c.lineTo(x, y); }
    c.strokeStyle = P.sand + 'b0'; c.lineWidth = 21; c.lineCap = 'round'; c.stroke(); c.lineCap = 'butt';
    const start = Math.floor((pos - 30) / 18);
    for (let i = start; i < start + Math.ceil(height / 150) + 4; i++) {
      const y = screenY(i * 18), left = leftAt(y), right = rightAt(y), variant = ((i % 4) + 4) % 4;
      if (y < -140 || y > height + 140) continue;
      const beachX = shore(y) + 59;
      if (variant % 2 === 0) {
        this.parasol(beachX, y - 18, variant ? P.blue : P.ochre);
        this.toyBox(beachX + 28, y + 23, 17, 34, 4, P.paper, 2);
        for (let j = 0; j < 3; j++) this.box(beachX + 30, y + 26 + j * 9, 13, 3, 1, variant ? P.blue : P.pink);
      } else {
        this.palm(left - 135, y + 35, .9, -.18);
        this.oval(beachX - 9, y + 20, 10, 5, P.ochre + '65');
      }
      for (let column = 0; right + 210 + column * 145 < width + 80; column++) {
        const x = right + 212 + column * 145 + Math.sin(i * 2 + column) * 24;
        const py = y + (column % 2) * 53;
        this.oval(x - 13, py + 13, 64, 30, P.grassLight + '65');
        this.palm(x + 20, py + 29, 1.15, .8, true);
        this.palm(x, py, 1.05 + variant * .05, column % 2 ? .15 : -.16);
        this.flower(x - 45, py + 57, P.paper);
      }
      if (variant === 1) { this.toyBox(right + 185, y + 65, 33, 20, 4, P.paper, 3); this.box(right + 192, y + 64, 4, 23, 1, P.blue); }
    }
  }
  foreground(game) {
    const { width, height } = this.layout;
    const sway = reducedMotion ? 0 : Math.sin(game.time * .45) * .025;
    // 近景叶片只落在画面边缘；道路与车辆始终保持可读。
    this.palm(-27, height * .25, 2.45, .55 + sway);
    this.palm(width + 35, height * .43, 2.65, -.7 - sway);
    this.palm(width - 28, height + 80, 2.6, -.15 + sway);
    this.palm(-65, height + 25, 2.25, .35);
  }
  roadWidthPx(game, pos, scale, y) { return game.roadWidthAt(pos + (this.layout.playerY - y) / scale) * this.layout.lane; }
  roadLeftPx(game, pos, scale, y) { return (this.layout.width - this.roadWidthPx(game, pos, scale, y)) / 2; }
  roadRightPx(game, pos, scale, y) { return (this.layout.width + this.roadWidthPx(game, pos, scale, y)) / 2; }
  render(game, preview = false) {
    const { width: W, height: H, lane: LANE, playerY: PLAYER_Y } = this.layout;
    const c = this.ctx, p = game.player, pos = p.pos, theme = game.level?.theme;
    const scale = theme === 'highway' ? 7.6 : SCALE;
    const screenY = s => PLAYER_Y - (s - pos) * scale;
    const leftAt = y => this.roadLeftPx(game, pos, scale, y), rightAt = y => this.roadRightPx(game, pos, scale, y);
    const leftOf = s => (W - game.roadWidthAt(s) * LANE) / 2;
    const strokeRoad = (offset, color, width) => {
      c.beginPath(); for (let y = -4; y <= H + 4; y += 4) { const x = offset(y); if (y === -4) c.moveTo(x, y); else c.lineTo(x, y); }
      c.strokeStyle = color; c.lineWidth = width; c.stroke();
    };
    const roadShape = (offset, color) => {
      c.beginPath(); c.moveTo(leftAt(-4) - offset, -4);
      for (let y = -4; y <= H + 4; y += 4) c.lineTo(leftAt(y) - offset, y);
      for (let y = H + 4; y >= -4; y -= 4) c.lineTo(rightAt(y) + offset, y);
      c.closePath(); c.fillStyle = color; c.fill();
    };
    c.clearRect(0, 0, W, H); c.save();
    if (!reducedMotion && game.jolt) c.translate(Math.sin(game.time * 70) * game.jolt * 2, Math.cos(game.time * 50) * game.jolt * 2);
    c.fillStyle = this.gradient(0, 0, W, H, P.grass, 15, -5); c.fillRect(0, 0, W, H);
    if (W > 600) this.coast(game, screenY, leftAt, rightAt);
    // 所有摆件绑定世界坐标，滚动时不漂移；不改变道路与碰撞坐标。
    const first = Math.floor((pos - 25) / 15);
    for (let i = first; i < first + 8; i++) {
      const s = i * 15, y = screenY(s), variant = ((i % 4) + 4) % 4;
      const left = leftOf(s), right = left + game.roadWidthAt(s) * LANE;
      this.oval(left - 50, y + 32, 50, 24, P.grassLight + '65');
      this.oval(right + 50, y - 3, 40, 22, P.grassDark + '30');
      for (let j = 0; j < 3; j++) { this.flower(left - 24 - j * 24, y + 35 + j * 11, j % 2 ? P.paper : P.pink); this.flower(right + 24 + j * 23, y + 60 - j * 15, j % 2 ? P.paper : P.yellow); }
      if (theme === 'highway') {
        this.tree(right + 48, y - 18, variant % 2); this.tree(left - 47, y + 30, variant % 2);
        if (variant === 1) { this.toyBox(right + 27, y + 46, 32, 27, 7, P.blue); this.text('出口', right + 43, y + 63, 9, P.white); }
      } else if (theme === 'village' || preview) {
        this.villageHouse(left - 98, y - 66, 65, 64, P.paper, variant % 2 ? P.blue : P.ochre, variant);
        this.villageHouse(right + 33, y - 90, 76, 68, TINTS[variant], variant % 2 ? P.red : P.ochre, variant);
        for (let j = 0; j < 5; j++) this.toyBox(right + 36 + j * 13, y + 10, 7, 21, 3, P.paper, 2);
        this.tree(left - 27, y + 47, variant % 2); this.tree(right + 26, y + 56, variant % 2);
      } else {
        this.cityBlock(left - 101, y - 86, 66, 91, TINTS[variant], variant, -1);
        this.cityBlock(right + 34, y - 74, 83, 93, TINTS[(variant + 1) % 4], variant + 2, 1);
        this.tree(left - 26, y + 52, variant % 2); this.tree(right + 26, y + 55, variant % 2);
      }
    }
    roadShape(14, P.shadow); roadShape(11, P.curb); roadShape(0, P.asphalt);
    strokeRoad(y => leftAt(y) - 11, P.white + 'b0', 2); strokeRoad(y => rightAt(y) + 11, P.white + 'b0', 2);
    strokeRoad(y => leftAt(y) + 5, P.paper + 'b0', 2); strokeRoad(y => rightAt(y) - 5, P.paper + 'b0', 2);
    for (let s = Math.floor((pos - 25) / 3) * 3; s < pos + 85; s += 3) {
      const y = screenY(s); if (y < -40 || y > H + 40) continue;
      const color = Math.round(s / 3) % 2 ? P.paper : shade(P.red, 12);
      this.box(leftAt(y) - 9, y, 7, 18, 2, color); this.box(rightAt(y) + 2, y, 7, 18, 2, color);
    }
    for (let s = Math.floor((pos - 25) / 7) * 7; s < pos + 85; s += 7) {
      const y = screenY(s), count = game.roadWidthAt(s), left = leftOf(s);
      for (let lane = 1; lane < count - .05; lane++) this.box(left + lane * LANE - 2, y - 22, 4, 22, 2, P.paper + 'd9');
    }
    if (theme === 'highway') {
      strokeRoad(y => leftAt(y) - 23, shade(P.glassDark, -5), 7); strokeRoad(y => rightAt(y) + 23, shade(P.glassDark, -5), 7);
      strokeRoad(y => leftAt(y) - 24, P.silver, 3); strokeRoad(y => rightAt(y) + 22, P.silver, 3);
    } else for (let s = Math.floor((pos - 25) / 22) * 22; s < pos + 75; s += 22) {
      const y = screenY(s), pole = leftAt(y) - 18;
      this.box(pole - 3, y - 31, 5, 36, 2, P.glassDark);
      this.box(pole, y - 33, 21, 5, 2, P.glassDark);
      this.toyBox(pole + 10, y - 36, 17, 9, 4, P.paper, 2);
      this.box(pole + 13, y - 33, 11, 3, 2, P.yellow);
    }
    for (const segment of game.segments.slice(1)) {
      if (segment.lanes >= game.lanesAt(segment.start - 100)) continue;
      const y = screenY(segment.start - 45); if (y < -100 || y > H + 100) continue;
      const left = leftAt(y);
      for (let lane = segment.lanes; lane < game.lanesAt(segment.start - 100); lane++) {
        const x = left + (lane + .5) * LANE;
        c.save(); c.translate(x, y); c.rotate(-.45); c.strokeStyle = P.paper; c.lineWidth = 5; c.lineCap = 'round';
        c.beginPath(); c.moveTo(0, 22); c.lineTo(0, -13); c.lineTo(-9, -4); c.moveTo(0, -13); c.lineTo(9, -4); c.stroke(); c.restore();
      }
      this.toyBox(left - 40, y - 29, 32, 36, 8, P.paper, 3);
      this.text('收窄', left - 24, y - 12, 9, P.red); this.text(`${segment.lanes}道`, left - 24, y + 2, 9);
    }
    for (const bump of game.bumps) {
      const y = screenY(bump); if (y < -10 || y > H + 10) continue;
      const left = leftOf(bump), width = game.lanesAt(bump) * LANE - 8;
      this.box(left + 4, y + 3, width, 11, 4, P.shadow);
      this.box(left + 4, y, width, 11, 4, P.yellow);
      for (let x = left + 10; x < left + width - 4; x += 17) this.box(x, y + 1, 7, 9, 2, P.ink);
      this.text('慢', left + 24, y + 33, 15, P.paper);
    }
    for (const hole of game.potholes) {
      const x = leftOf(hole.pos) + hole.x * LANE, y = screenY(hole.pos); if (y < -20 || y > H + 20) continue;
      this.oval(x, y + 2, hole.width * LANE / 2 + 3, 12, shade(P.asphalt, 22));
      this.oval(x, y, hole.width * LANE / 2, 10, P.ink, P.ochre, 2);
      this.oval(x + 3, y + 3, 10, 3, P.glassDark); this.text('坑', x, y + 3, 8, P.yellow);
    }
    for (const light of game.lights) {
      const y = screenY(light.pos), left = leftOf(light.pos), width = game.lanesAt(light.pos) * LANE; if (y < -70 || y > H + 70) continue;
      this.box(left + 4, y - 29, width - 8, 32, 2, shade(P.asphalt, -8));
      for (let x = left + 8; x < left + width - 9; x += 18) this.box(x, y - 25, 10, 24, 2, P.paper);
      this.box(left + 4, y + 8, width - 8, 3, 1, P.paper);
      const state = lightState(light, game.time), lamp = { green: P.jade, yellow: P.yellow, red: P.red }[state.color];
      this.box(left + width + 9, y - 53, 5, 52, 2, P.ink);
      this.toyBox(left + width - 56, y - 58, 58, 25, 8, P.ink, 3);
      this.dot(left + width - 44, y - 46, 7, lamp); this.dot(left + width - 46, y - 48, 2, P.white + '80');
      this.text(`${Math.ceil(state.remaining)}s`, left + width - 19, y - 42, 11, P.white);
    }
    for (const work of game.works) {
      const top = screenY(work.end), bottom = screenY(work.start), x = leftOf(work.start) + work.lane * LANE; if (top > H || bottom < 0) continue;
      this.box(x + 8, top, LANE - 16, bottom - top, 8, P.ochre + '90');
      for (let s = work.start; s <= work.end; s += 4) {
        const y = screenY(s); if (y < -30 || y > H + 30) continue;
        this.oval(x + 9, y + 10, 10, 4, P.shadow); this.box(x, y + 5, 17, 5, 2, P.ochre);
        c.beginPath(); c.moveTo(x + 8, y - 11); c.lineTo(x + 2, y + 7); c.lineTo(x + 14, y + 7); c.closePath(); c.fillStyle = P.ochre; c.fill();
        this.box(x + 5, y - 1, 7, 4, 1, P.white);
      }
      this.toyBox(x + 13, bottom - 25, 53, 20, 5, P.yellow, 3); this.text('施工占道', x + 39, bottom - 12, 9);
    }
    if (pos > game.length - 90) {
      const y = screenY(game.length), left = leftOf(game.length), width = game.lanesAt(game.length) * LANE;
      this.box(left - 2, y - 56, 7, 58, 3, P.blue); this.box(left + width - 5, y - 56, 7, 58, 3, P.blue);
      this.toyBox(left - 7, y - 65, width + 14, 37, 9, P.yellow, 5);
      this.text(game.level ? `${game.level.name} · 到站啦！` : '打卡成功 · OFFICE', W / 2, y - 42, 15);
      for (let i = 0; i < Math.ceil(width / 12); i++) for (let row = 0; row < 2; row++) this.box(left + i * 12, y + row * 8, Math.min(12, width - i * 12), 8, 0, (i + row) % 2 ? P.ink : P.paper);
    }
    for (const car of [...game.cars].sort((a, b) => b.pos - a.pos)) {
      const y = screenY(car.pos); if (y < -70 || y > H + 70) continue;
      this.drawCar({ ...car, color: VEHICLE_COLORS[car.type] || car.color }, leftOf(car.pos) + car.x * LANE, y, game.time, scale);
    }
    for (const person of game.pedestrians) {
      if (person.done) continue;
      const left = leftOf(person.pos), x = left + person.x * LANE, y = screenY(person.pos); if (y < -25 || y > H + 25) continue;
      if (!person.active) { this.toyBox(left + game.lanesAt(person.pos) * LANE + 8, y - 29, 33, 19, 6, P.yellow, 2); this.text('行人', left + game.lanesAt(person.pos) * LANE + 24, y - 16, 9); }
      this.oval(x + 3, y + 13, 10, 4, P.shadow); this.box(x - 7, y + 7, 6, 9, 3, P.ink); this.box(x + 1, y + 7, 6, 9, 3, P.ink);
      this.toyBox(x - 8, y - 2, 16, 13, 6, P.blue, 2); this.dot(x, y - 8, 10, P.skin); this.oval(x, y - 14, 10, 5, P.hair);
      this.dot(x - 3, y - 7, 1, P.ink); this.dot(x + 3, y - 7, 1, P.ink);
    }
    this.drawCar({ ...p, color: getDriver(this.driver).color, type: 'player', brake: game.inputBrake }, leftOf(p.pos) + p.x * LANE, PLAYER_Y, game.time, scale);
    if (game.reaction && game.reaction.expiresAt > game.time) this.drawReaction(game.reaction, leftOf(p.pos) + p.x * LANE, PLAYER_Y, game.time);
    if (W > 600) this.foreground(game);
    c.restore();
  }
  // 情绪标记浮在车手上方，不改变驾驶模型或遮挡道路警告。
  drawReaction(reaction, x, y, time) {
    const c = this.ctx, angry = reaction.mood === 'angry';
    const offset = reducedMotion ? 0 : Math.sin(time * (angry ? 18 : 4)) * (angry ? 1.8 : 1);
    c.save(); c.translate(x + offset, y - 47);
    if (angry) {
      this.dot(0, 0, 13, P.red, P.paper, 1.5);
      c.beginPath(); c.moveTo(-7,-8); c.lineTo(-7,-3); c.lineTo(-2,-3); c.moveTo(7,-8); c.lineTo(7,-3); c.lineTo(2,-3); c.moveTo(-7,8); c.lineTo(-7,3); c.lineTo(-2,3); c.moveTo(7,8); c.lineTo(7,3); c.lineTo(2,3);
      c.strokeStyle = P.paper; c.lineWidth = 2; c.stroke();
      this.oval(0, 42, 25, 21, P.red + '18');
    } else {
      const color = reaction.mood === 'ai' ? P.glass : reaction.mood === 'brooding' ? P.paper : P.yellow;
      this.box(-18,-12,36,24,10,color,P.ink,1);
      this.text(reaction.mood === 'brooding' ? '…' : reaction.mood === 'ai' ? '01' : reaction.mood === 'calm' ? '～' : reaction.mood === 'power' ? '↑' : '✓',0,5,16,P.ink);
    }
    c.restore();
  }
  // 镜头跟在车后，车头朝屏幕上方：局内只画后脑勺，不画五官。
  driverBackHead(id, x, y, size = 1) {
    const c = this.ctx; c.save(); c.translate(x, y); c.scale(size, size);
    const cat = id === 'wulong', robot = id === 'sebastian';
    this.oval(1, 3, 15, 13, P.shadow);
    if (cat) {
      // 耳背与后脑勺都是灰毛；不露内耳、眼睛或鼻口。
      for (const side of [-1, 1]) {
        c.beginPath(); c.moveTo(side * 5, -8); c.lineTo(side * 13, -17); c.quadraticCurveTo(side * 16, -9, side * 14, 1); c.closePath();
        c.fillStyle = this.gradient(-15, -17, 30, 24, P.cat, 24, -14); c.fill();
      }
      this.oval(0, 0, 16, 13, this.gradient(-16, -13, 32, 26, P.cat, 25, -14));
      c.strokeStyle = shade(P.cat, -18); c.lineWidth = .8;
      for (const side of [-1, 1]) { c.beginPath(); c.moveTo(side * 11, -2); c.quadraticCurveTo(side * 15, 5, side * 7, 10); c.stroke(); }
      this.oval(-5, -6, 6, 3, P.white + '20');
    } else if (robot) {
      this.box(-17, -5, 5, 13, 3, P.glassDark); this.box(12, -5, 5, 13, 3, P.glassDark);
      this.oval(0, 0, 14, 14, this.gradient(-14, -14, 28, 28, P.silver, 28, -18));
      this.box(-9, -8, 18, 17, 7, shade(P.silver, -6), shade(P.silver, -25), .7);
      this.oval(-5, -8, 6, 2.5, P.white + '80');
      this.box(-7, 6, 14, 4, 2, shade(P.silver, -16), shade(P.silver, -30), .6);
    } else {
      const hair = id === 'cjyyza' ? shade(P.hair, -18) : P.hair;
      this.oval(0, 0, 15, 14, this.gradient(-15, -14, 30, 28, hair, 15, -18));
      if (id === 'clover') {
        // 帽沿在后脑下缘，露出一小段齐肩棕发。
        this.box(-14, 4, 28, 12, 5, this.gradient(-14, 4, 28, 12, P.hair, 8, -18));
        this.oval(0, -4, 15.5, 12, this.gradient(-16, -16, 32, 24, P.navy, 22, -14));
        this.box(-16, 0, 32, 7, 4, P.navy);
        for (let j = -11; j <= 12; j += 5) this.box(j, 1, 1, 5, 1, P.white + '22');
        for (const j of [-9, -4, 5, 10]) this.box(j, 8, 1, 5, 1, P.white + '12');
        c.beginPath(); c.moveTo(-4, -14); c.quadraticCurveTo(-7, -8, -6, -2); c.strokeStyle = P.white + '25'; c.lineWidth = 1; c.stroke();
      } else {
        for (let j = -2; j <= 2; j++) {
          c.beginPath(); c.moveTo(j * 5 - 6, -8); c.quadraticCurveTo(j * 6 - 7, -21 + Math.abs(j) * 2, j * 6 + 4, -15); c.quadraticCurveTo(j * 6 + 9, -13, j * 5 + 5, -5); c.fillStyle = hair; c.fill();
        }
        for (const j of [-9, -3, 4, 10]) {
          c.beginPath(); c.moveTo(j, 5); c.quadraticCurveTo(j - 2, 11, j + 1, 16); c.lineTo(j + 4, 8); c.fillStyle = hair; c.fill();
        }
        c.beginPath(); c.moveTo(-8, -5); c.quadraticCurveTo(-3, -11, 7, -7); c.strokeStyle = P.white + '18'; c.lineWidth = 1.2; c.stroke();
      }
    }
    c.restore();
  }
  drawPlayerRide(car, w, l) {
    const c = this.ctx, driver = getDriver(this.driver), color = driver.color;
    if (driver.kind === 'hovercraft') {
      c.save(); c.shadowColor = P.tealEyes; c.shadowBlur = 11;
      this.oval(0, l / 2, w * .3, 4, P.tealEyes); c.restore();
      for (const side of [-1, 1]) {
        this.toyBox(side * (w / 2 - 2) - 4, 1, 8, l * .38, 4, color, 2);
        this.oval(side * (w / 2 - 2), l * .4, 3, 5, P.tealEyes);
      }
      this.oval(0, 3, w * .51, l * .46, shade(color, -25));
      this.oval(0, 0, w * .51, l * .45, this.gradient(-w / 2, -l / 2, w, l, color, 25, -20));
      this.oval(0, -l * .24, w * .34, 7, P.glass, P.paper, 1);
      this.oval(0, 3, w * .31, 11, shade(color, -35));
      this.oval(0, -9, 9, 4, P.ink, P.silver, 1);
      this.driverBackHead(this.driver, 0, 0, .95);
      this.oval(-w * .27, -l * .15, 2, 7, P.white + '55');
    } else {
      const trike = driver.kind === 'tricycle';
      this.box(-3.5, -l / 2, 7, 13, 3, P.ink);
      this.box(-1, -l / 2 + 2, 2, 8, 1, P.silver);
      if (trike) {
        this.box(-w / 2 + 4, l / 2 - 10, w - 8, 3, 1, P.silver);
        for (const side of [-1, 1]) { this.box(side * (w / 2 - 4) - 4, l / 2 - 13, 8, 14, 4, P.ink); this.box(side * (w / 2 - 4) - 1, l / 2 - 10, 2, 7, 1, color); }
        this.oval(0, 7, w * .38, 8, color);
      } else {
        this.box(-3.5, l / 2 - 12, 7, 13, 3, P.ink);
        this.box(-1, l / 2 - 10, 2, 8, 1, P.silver);
        this.box(-7, l / 2 - 8, 14, 3, 1, P.silver);
        this.box(-11, l / 2 - 8, 5, 4, 2, P.ink); this.box(6, l / 2 - 8, 5, 4, 2, P.ink);
      }
      this.box(-2, -l / 2 + 6, 4, l - 11, 2, color);
      this.box(-12, -l / 2 + 9, 24, 3, 2, trike ? color : P.silver);
      this.box(-14, -l / 2 + 8, 6, 5, 2, trike ? color : P.ink); this.box(8, -l / 2 + 8, 6, 5, 2, trike ? color : P.ink);
      this.toyBox(-9, 2, 18, 11, 5, trike ? P.paper : P.ink, 1);
      if (!trike) {
        // 折叠车保留外露的绿色车架和前后轮，避免被 Q 版头部完全遮住。
        c.beginPath(); c.moveTo(-8, 8); c.lineTo(0, l / 2 - 3); c.lineTo(8, 8); c.strokeStyle = color; c.lineWidth = 3; c.lineJoin = 'round'; c.stroke();
        this.box(-5, l / 2 - 8, 10, 3, 1, color);
      }
      this.dot(-10, -l / 2 + 9, 3, trike ? P.cat : P.skin); this.dot(10, -l / 2 + 9, 3, trike ? P.cat : P.skin);
      if (trike) { this.dot(10, -l / 2 + 3, 3, P.yellow); this.box(12, -l / 2 + 3, 3, 1.5, 1, P.ochre); }
      this.driverBackHead(this.driver, 0, -2, trike ? 1 : .65);
    }
    if (car.brake) { c.save(); c.shadowColor = P.red; c.shadowBlur = 6; this.box(-4, l / 2 - 1, 8, 3, 1, P.red); c.restore(); }
  }
  drawCar(car, x, y, time, scale = SCALE) {
    const c = this.ctx, width = car.width * this.layout.lane * .85, length = car.length * scale;
    c.save(); c.translate(x, y); c.rotate((car.lateral || 0) * -.055);
    const w = width, l = length, player = car.type === 'player';
    this.oval(4, l * .2, w * .65, l * .52, P.shadow);
    if (player && getDriver(this.driver).kind !== 'car') { this.drawPlayerRide(car, w, l); c.restore(); return; }
    if (car.type === 'motorcycle') {
      this.box(-3.5, -l / 2, 7, l, 3, P.ink); this.toyBox(-7, -l / 2 + 5, 14, l - 10, 5, car.color, 3);
      this.box(-12, -4, 24, 3, 2, P.glassDark); this.dot(0, -4, 8, P.yellow, P.paper, 2); this.box(-4, l / 2 - 4, 8, 3, 1, car.brake ? P.red : P.ochre); c.restore(); return;
    }
    for (const side of [-1, 1]) for (const ax of [-1, 1]) {
      this.box(side * (w / 2 - .5) - 4, ax * l * .28 - 5, 8, 13, 3, P.ink);
      this.box(side * (w / 2 - .5) - 2, ax * l * .28 - 3, 2, 8, 1, shade(P.ink, 25));
    }
    this.toyBox(-w / 2, -l / 2, w, l - 1, player ? 12 : 9, car.color, 4);
    if (car.type === 'sweeper') {
      this.toyBox(-w / 2 + 4, -l / 2 + 6, w - 8, 17, 5, P.glassDark, 2);
      this.toyBox(-w / 2 + 5, 0, w - 10, l / 2 - 4, 5, P.paper, 2);
      for (let j = 0; j < 3; j++) this.box(-w / 2 + 10, 4 + j * 5, w - 20, 2, 1, P.ochre);
      for (const side of [-1, 1]) this.dot(side * (w / 2 + 1), l / 2 - 7, 8, P.glassDark, P.silver, 2);
      this.box(-8, -l / 2 + 1, 16, 4, 2, P.yellow);
    } else if (car.type === 'tricycle') {
      this.toyBox(-w / 2 + 3, -l / 2 + 4, w - 6, 10, 5, P.glassDark, 2);
      this.box(-w / 2 + 4, 0, w - 8, l / 2 - 3, 4, shade(car.color, -25)); this.toyBox(-w / 2 + 7, 3, w - 14, l / 2 - 10, 3, P.ochre, 2);
    } else if (player) {
      this.box(-5, -l / 2 + 3, 10, 9, 3, P.paper);
      this.box(-w / 2 + 4, -8, w - 8, 23, 9, shade(P.red, -38));
      this.toyBox(-w / 2 + 6, 4, w - 12, 16, 6, P.ink, 1);
      // 方向盘和双手在身体前方（上方），头部与靠背在后方。
      this.oval(0, -13, 10, 4, P.ink, P.silver, 1.5);
      const hands = this.driver === 'wulong' ? P.cat : this.driver === 'sebastian' ? P.silver : P.skin;
      this.dot(-10, -11, 3, hands); this.dot(10, -11, 3, hands);
      this.driverBackHead(this.driver, 0, 1, Math.min(w / 30, 1.13));
      this.toyBox(-w / 2 - 2, l / 2 - 7, w + 4, 8, 4, P.red, 2);
    } else {
      this.box(-w / 2 + 5, -l / 2 + 10, w - 10, 14, 5, this.gradient(-w / 2, -l / 2, w, 22, P.glassDark, 45, -10));
      this.toyBox(-w / 2 + 6, -l / 2 + 22, w - 12, l * .26, 5, shade(car.color, 15), 2);
      this.box(-w / 2 + 7, l / 2 - 13, w - 14, 8, 3, P.glassDark);
      this.box(-w / 2 + 8, -l / 2 + 11, w * .35, 2, 1, P.white + '70');
      if (car.type === 'taxi') this.toyBox(-8, -2, 16, 6, 3, P.yellow, 1);
      if (car.type === 'suv') { this.box(-w / 2 + 4, -3, 2, 14, 1, P.silver); this.box(w / 2 - 6, -3, 2, 14, 1, P.silver); }
    }
    this.box(-w / 2 + 4, -l / 2 + 4, 7, 4, 2, P.paper); this.box(w / 2 - 11, -l / 2 + 4, 7, 4, 2, P.paper);
    if (car.brake) { c.shadowColor = P.red; c.shadowBlur = 8; }
    this.box(-w / 2 + 4, l / 2 - 3, 8, 3.5, 2, car.brake ? P.red : P.ochre);
    this.box(w / 2 - 12, l / 2 - 3, 8, 3.5, 2, car.brake ? P.red : P.ochre); c.shadowBlur = 0;
    if (car.signal && Math.floor(time * 3) % 2 === 0) {
      const sx = car.signal < 0 ? -w / 2 - 2 : w / 2 - 3; this.box(sx, -l / 2 + 8, 5, 5, 2, P.yellow); this.box(sx, l / 2 - 8, 5, 5, 2, P.yellow);
    }
    c.restore();
  }
}
