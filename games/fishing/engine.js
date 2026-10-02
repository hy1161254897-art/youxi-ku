(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FishGame = api.FishGame;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const WIDTH = 1200;
  const HEIGHT = 720;
  const MAX_BALANCE = 999999999999;
  const TAU = Math.PI * 2;
  const SPECIES = Object.freeze([
    { id: 'minnow', name: '翡翠小鱼', tier: 1, reward: 2, chance: 0.65, colors: ['#c6ffe1', '#49dc9e', '#057965'], shape: 'minnow', size: 28, speed: 79, weight: 10 },
    { id: 'clownfish', name: '珊瑚小丑鱼', tier: 1, reward: 4, chance: 0.45, colors: ['#ffec98', '#ff9d35', '#d94b25'], shape: 'clown', size: 36, speed: 62, weight: 20 },
    { id: 'tang', name: '蓝宝石倒吊', tier: 1, reward: 6, chance: 0.34, colors: ['#96edff', '#358af6', '#243bac'], shape: 'tang', size: 39, speed: 73, weight: 17 },
    { id: 'butterfly', name: '月光蝴蝶鱼', tier: 2, reward: 8, chance: 0.27, colors: ['#fffbd0', '#ffe36a', '#e39626'], shape: 'butterfly', size: 42, speed: 61, weight: 14 },
    { id: 'puffer', name: '星斑河豚', tier: 2, reward: 12, chance: 0.20, colors: ['#ffeed1', '#dfaa5e', '#916344'], shape: 'puffer', size: 42, speed: 43, weight: 4 },
    { id: 'lionfish', name: '绯红狮子鱼', tier: 2, reward: 18, chance: 0.15, colors: ['#ffd9cf', '#f56f73', '#92397c'], shape: 'lion', size: 49, speed: 46, weight: 3 },
    { id: 'turtle', name: '琉璃海龟', tier: 3, reward: 25, chance: 0.11, colors: ['#d0ffb9', '#50b987', '#126864'], shape: 'turtle', size: 52, speed: 38, weight: 7 },
    { id: 'ray', name: '星海魔鬼鱼', tier: 3, reward: 35, chance: 0.08, colors: ['#caeaff', '#758deb', '#51428e'], shape: 'ray', size: 85, speed: 44, weight: 5 },
    { id: 'swordfish', name: '极光剑鱼', tier: 3, reward: 50, chance: 0.055, colors: ['#d0ffff', '#39cde6', '#1a608b'], shape: 'sword', size: 67, speed: 91, weight: 4 },
    { id: 'angler', name: '幽光灯笼鱼', tier: 3, reward: 65, chance: 0.043, colors: ['#edd2ff', '#aa6bdf', '#55368b'], shape: 'angler', size: 52, speed: 36, weight: 3 },
    { id: 'goldshark', name: '黄金鲨王', tier: 4, reward: 100, chance: 0.025, colors: ['#fff7cb', '#edc35c', '#986133'], shape: 'shark', size: 98, speed: 48, weight: 1.5 },
    { id: 'dragonfish', name: '深海龙皇', tier: 4, reward: 200, chance: 0.012, colors: ['#fff3c1', '#ffb85b', '#b94869'], shape: 'dragon', size: 122, speed: 34, weight: 0 },
    { id: 'whale', name: '苍穹帝王鲸', tier: 4, reward: 150, chance: 0.018, colors: ['#e5f6ff', '#4e8ccb', '#263964'], shape: 'shark', size: 128, speed: 30, weight: 3 },
    { id: 'lobster', name: '赤金龙虾', tier: 3, reward: 30, chance: 0.09, colors: ['#ffe7ac', '#ff6542', '#a82939'], shape: 'lion', size: 79, speed: 41, weight: 9 },
    { id: 'octopus', name: '紫晶章鱼王', tier: 3, reward: 45, chance: 0.065, colors: ['#f6d3ff', '#b063e5', '#572b86'], shape: 'angler', size: 90, speed: 34, weight: 9 },
    { id: 'seahorse', name: '翡翠海马', tier: 2, reward: 15, chance: 0.18, colors: ['#edffd3', '#55d6a6', '#1d7564'], shape: 'minnow', size: 61, speed: 46, weight: 12 },
    { id: 'crab', name: '鎏金帝王蟹', tier: 2, reward: 20, chance: 0.13, colors: ['#fff3c9', '#e9a94b', '#9f3844'], shape: 'puffer', size: 72, speed: 45, weight: 12 }
  ].map(Object.freeze));

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  // Cadence matches the articulated sprite rigs; propulsion and the visible
  // stroke share one phase, while individuals choose their own relaxed lanes.
  const SWIM_PROFILES = Object.freeze({
    whale: { cadence: .7, pulse: .13, steering: .17, response: 1.7 },
    ray: { cadence: .76, pulse: .16, steering: .24, response: 2 },
    goldshark: { cadence: 1, pulse: .12, steering: .22, response: 2.6 },
    dragonfish: { cadence: .88, pulse: .15, steering: .22, response: 2 },
    octopus: { cadence: .66, pulse: .48, steering: .25, response: 4.2 },
    lobster: { cadence: .95, pulse: .16, steering: .2, response: 3.3 },
    crab: { cadence: 1.05, pulse: .17, steering: .16, response: 3.8 },
    seahorse: { cadence: 1.15, pulse: .17, steering: .17, response: 2.6 },
    turtle: { cadence: .68, pulse: .2, steering: .2, response: 2 },
    clownfish: { cadence: 1.7, pulse: .12, steering: .28, response: 3.4 },
    tang: { cadence: 1.65, pulse: .12, steering: .28, response: 3.4 },
    butterfly: { cadence: 1.45, pulse: .12, steering: .28, response: 3.4 },
    fish: { cadence: 1.7, pulse: .12, steering: .28, response: 3.4 }
  });
  function finiteNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  function normalizePower(value) { return clamp(Math.floor(finiteNumber(value, 10)), 1, 1000); }
  function clampBalance(value) { return clamp(Math.floor(finiteNumber(value, 0)), 0, MAX_BALANCE); }
  function normalizeChance(value) {
    const mode = String(value);
    return mode === 'sure' || /^(?:[1-9]|10)$/.test(mode) ? mode : 'original';
  }
  function probability(base, mode) {
    const p = clamp(finiteNumber(base, 0), 0, 1);
    const normalized = normalizeChance(mode);
    if (normalized === 'sure') return 1;
    return normalized === 'original' ? p : Math.min(1, p * (1 + Number(normalized)));
  }
  function calculateShot(balance, power) {
    const funds = clampBalance(balance);
    const cost = normalizePower(power);
    return { ok: funds >= cost, balance: funds >= cost ? funds - cost : funds, cost };
  }
  // Earliest continuous collision, so fast projectiles cannot tunnel through a fish.
  function segmentCircleHit(ax, ay, bx, by, cx, cy, radius) {
    const dx = bx - ax, dy = by - ay, fx = ax - cx, fy = ay - cy;
    const r = Math.max(0, radius), c = fx * fx + fy * fy - r * r;
    if (c <= 0) return 0;
    const a = dx * dx + dy * dy;
    if (a < 1e-12) return null;
    const b = 2 * (fx * dx + fy * dy), d = b * b - 4 * a * c;
    if (d < 0) return null;
    const t = (-b - Math.sqrt(d)) / (2 * a);
    return t >= 0 && t <= 1 ? t : null;
  }

  function ellipse(ctx, x, y, rx, ry, color, rotation = 0) {
    ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rotation, 0, TAU);
    if (color) { ctx.fillStyle = color; ctx.fill(); }
  }
  function path(ctx, points, fill, stroke, width = 1) {
    ctx.beginPath();
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p[0], p[1]);
      else if (p.length === 6) ctx.bezierCurveTo(...p);
      else if (p.length === 4) ctx.quadraticCurveTo(...p);
      else ctx.lineTo(p[0], p[1]);
    });
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
  }
  function gradient(ctx, x1, y1, x2, y2, colors) {
    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    colors.forEach((c, i) => g.addColorStop(i / (colors.length - 1), c));
    return g;
  }
  function fishEye(ctx, x, y, radius = 0.07, accent = '#d5fffa') {
    ellipse(ctx, x, y, radius * 1.22, radius * 1.22, '#092a3c');
    ellipse(ctx, x + radius * .13, y, radius, radius, accent);
    ellipse(ctx, x + radius * .38, y, radius * .65, radius * .77, '#082437');
    ellipse(ctx, x + radius * .28, y - radius * .32, radius * .23, radius * .23, '#fff');
  }

  /** Original vector fish; drawFish takes body half-length as size in logical pixels. */
  function drawFish(ctx, species, x, y, size, time = 0, angle = 0, motion = null) {
    if (!species || !ctx) return;
    if (typeof window !== 'undefined' && window.FishSprites && window.FishSprites.draw(ctx, species, x, y, size, time, angle, motion)) return;
    const c = species.colors, shape = species.shape;
    const wag = Math.sin(time * 7) * .12, flutter = Math.sin(time * 9) * .08;
    const faceLeft = Math.cos(angle) < 0;
    ctx.save(); ctx.translate(x, y);
    // Keeping the back on top avoids upside-down eyes on left-moving fish.
    ctx.rotate(faceLeft ? angle - Math.PI : angle);
    ctx.scale(faceLeft ? -size : size, size);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const body = gradient(ctx, 0, -.5, 0, .48, [c[0], c[1], c[2]]);
    const fin = gradient(ctx, -.4, -.7, .4, .65, [c[0], c[1], c[2]]);
    const line = 'rgba(12,40,67,.35)';

    if (shape === 'turtle') {
      for (const side of [-1, 1]) {
        path(ctx, [[-.08, .32 * side], [-.22, (.87 + flutter) * side, .46, (.87 - flutter) * side, .52, .55 * side], [.2, .18 * side]], fin, line, .025);
        path(ctx, [[-.6, .2 * side], [-.95, .6 * side, -.9, .72 * side, -.57, .54 * side], [-.32, .3 * side]], fin, line, .02);
      }
      path(ctx, [[-.71, -.12], [-1.02, 0], [-.72, .12]], c[2]);
      ellipse(ctx, .8, 0, .31, .22, fin);
      ellipse(ctx, .9, -.09, .041, .04, '#0c3542');
      ellipse(ctx, .9, .09, .041, .04, '#0c3542');
      ellipse(ctx, -.08, 0, .78, .52, '#cfeb9a');
      ellipse(ctx, -.08, 0, .72, .47, body);
      path(ctx, [[-.4, -.23], [-.02, -.31], [.32, -.18], [.36, .17], [-.02, .3], [-.4, .21]], 'rgba(9,81,69,.28)', '#addc89', .035);
      for (const sign of [-1, 1]) {
        path(ctx, [[-.42, .21 * sign], [-.62, .35 * sign], [-.73, .18 * sign]], null, '#addc89', .025);
        path(ctx, [[-.03, .3 * sign], [-.04, .46 * sign]], null, '#addc89', .025);
        path(ctx, [[.33, .18 * sign], [.57, .27 * sign]], null, '#addc89', .025);
      }
      ellipse(ctx, -.2, -.2, .42, .09, 'rgba(255,255,220,.14)', -.25);
    } else if (shape === 'ray') {
      ctx.beginPath(); ctx.moveTo(-.4, 0); ctx.bezierCurveTo(-1.1, wag, -1.35, -.26, -1.7, -.1 + wag); ctx.strokeStyle = c[1]; ctx.lineWidth = .055; ctx.stroke();
      path(ctx, [[.85, 0], [.4, -.26, .24, -.77, -.17, -1.02 - flutter], [-.02, -.45, -.67, -.3, -.82, 0], [-.61, .27, -.02, .43, -.17, 1.02 + flutter], [.24, .77, .4, .26, .85, 0]], body, 'rgba(182,224,255,.7)', .025);
      path(ctx, [[.65, 0], [.26, -.29, -.1, -.32, -.6, 0], [-.1, .32, .26, .29, .65, 0]], 'rgba(206,235,255,.19)');
      for (let j = 0; j < 13; j++) {
        const px = Math.sin(j * 12.7) * .39, py = Math.cos(j * 8.8) * .43;
        ellipse(ctx, px, py, .018, .022, '#e2f9ff');
      }
      fishEye(ctx, .48, -.13, .045); fishEye(ctx, .48, .13, .045);
    } else if (shape === 'shark' || shape === 'sword' || shape === 'dragon') {
      const dragon = shape === 'dragon', sword = shape === 'sword';
      path(ctx, [[-.73, -.12], [-1.07, -.56 + wag], [-1.02, -.05 + wag], [-1.16, .42 + wag], [-.68, .12]], fin, line, .018);
      path(ctx, [[-.3, -.2], [-.28, -.71, .08, -.72, .13, -.2]], fin, line, .018);
      path(ctx, [[-.05, .18], [-.25, .72 + flutter, .18, .54, .4, .2]], fin, line, .02);
      path(ctx, [[-.55, -.12], [-.25, -.31, .19, -.42, .64, -.21], [.99, -.1, 1.04, .05, .82, .14], [.47, .36, -.28, .27, -.77, .11], [-.88, .06, -.88, -.07, -.55, -.12]], body, line, .02);
      path(ctx, [[-.67, .1], [-.24, .13, .3, .15, .84, .06], [.59, .3, -.18, .3, -.67, .1]], 'rgba(255,249,214,.62)');
      if (sword) path(ctx, [[.75, -.13], [1.57, -.11], [.88, .02]], gradient(ctx, .7, -.1, 1.5, 0, [c[0], c[1]]), line, .015);
      if (dragon) {
        for (let i = 0; i < 8; i++) {
          const px = -.64 + i * .17;
          path(ctx, [[px, -.22], [px - .1, -.58 - Math.sin(i + time * 3) * .09], [px + .16, -.29]], fin, 'rgba(255,238,165,.7)', .015);
        }
        for (let row = 0; row < 3; row++) for (let i = 0; i < 7; i++) {
          ctx.beginPath(); ctx.arc(-.55 + i * .16 + row % 2 * .07, -.14 + row * .115, .09, -.6, 1.1); ctx.strokeStyle = 'rgba(255,241,182,.5)'; ctx.lineWidth = .015; ctx.stroke();
        }
        path(ctx, [[.6, -.22], [.76, -.61], [.8, -.28]], c[0], c[2], .016);
        ctx.beginPath(); ctx.moveTo(.84, .04); ctx.bezierCurveTo(1.32, -.21, 1.41, -.42 + wag, 1.17, -.43 + wag); ctx.strokeStyle = '#ffe4a5'; ctx.lineWidth = .023; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(.81, .12); ctx.bezierCurveTo(1.08, .46, 1.31, .44 + wag, 1.35, .23); ctx.stroke();
      } else {
        for (let i = 0; i < 3; i++) {
          ctx.beginPath(); ctx.moveTo(.29 - i * .07, -.13); ctx.quadraticCurveTo(.22 - i * .07, -.02, .28 - i * .07, .12); ctx.strokeStyle = c[2]; ctx.lineWidth = .017; ctx.stroke();
        }
      }
      fishEye(ctx, .63, -.1, dragon ? .055 : .046, dragon ? '#ffeb86' : '#e6faff');
      ctx.beginPath(); ctx.moveTo(.91, .045); ctx.quadraticCurveTo(.76, .11, .6, .065); ctx.strokeStyle = c[2]; ctx.lineWidth = .022; ctx.stroke();
      if (shape === 'shark') {
        for (let i = 0; i < 4; i++) path(ctx, [[.64 + i * .05, .076], [.665 + i * .05, .12], [.69 + i * .05, .075]], '#fff3bd');
      }
      ellipse(ctx, -.1, -.19, .42, .035, 'rgba(255,255,255,.3)', -.05);
    } else {
      const round = shape === 'puffer' || shape === 'angler';
      const height = shape === 'butterfly' ? .66 : round ? .62 : .45;
      path(ctx, [[-.65, -.08], [-1.04, -.43 + wag], [-.94, wag], [-1.04, .43 + wag], [-.62, .1]], fin, line, .022);
      if (shape === 'lion') {
        for (let i = 0; i < 10; i++) {
          const a = -.6 - i * .28;
          const sx = Math.cos(a) * .67, sy = Math.sin(a) * .44;
          path(ctx, [[sx, sy], [Math.cos(a) * 1.03, Math.sin(a) * (1.02 + flutter)], [sx - .12, sy + .05]], fin, '#ffe0c9', .012);
        }
        for (let i = 0; i < 6; i++) path(ctx, [[-.18, .1], [-.67 + i * .2, .98 + Math.sin(i + time * 5) * .05], [.2, .24]], 'rgba(246,129,163,.48)', '#ffcbbe', .014);
      } else {
        path(ctx, [[-.48, -.23], [-.15, -.81 + flutter, .4, -.69, .47, -.24]], fin, line, .018);
        path(ctx, [[-.3, .28], [-.12, .69 - flutter, .36, .58, .45, .26]], fin, line, .018);
      }
      if (shape === 'puffer') {
        for (let i = 0; i < 20; i++) {
          const a = i / 20 * TAU;
          path(ctx, [[Math.cos(a) * .72, Math.sin(a) * .58], [Math.cos(a + .035) * .91, Math.sin(a + .035) * .79], [Math.cos(a + .1) * .72, Math.sin(a + .1) * .58]], c[0], c[2], .015);
        }
      }
      ellipse(ctx, 0, 0, .8, height, body);
      ctx.save(); ellipse(ctx, 0, 0, .8, height); ctx.clip();
      if (shape === 'clown') {
        for (const px of [-.47, .09, .55]) {
          path(ctx, [[px - .12, -.75], [px + .03, -.22, px - .13, .31, px + .06, .75], [px + .23, .75], [px + .01, .2, px + .18, -.2, px + .04, -.75]], '#fff3ce', '#763c40', .034);
        }
      } else if (shape === 'tang') {
        path(ctx, [[-.73, -.05], [-.15, -.52, .17, -.39, .63, -.23], [.29, -.16, .1, .01, -.33, .32], [-.63, .38]], '#253774');
        path(ctx, [[-.57, .03], [-.03, -.29, .14, -.25, .4, -.24], [.04, -.03, -.16, .19, -.45, .24]], '#359cf4');
      } else if (shape === 'butterfly') {
        path(ctx, [[.31, -.7], [.26, .64], [.47, .7], [.55, -.68]], '#354b61');
        for (let i = 0; i < 7; i++) {
          ctx.beginPath(); ctx.moveTo(-.72 + i * .13, -.7); ctx.lineTo(-.3 + i * .13, .68); ctx.strokeStyle = 'rgba(227,149,47,.38)'; ctx.lineWidth = .025; ctx.stroke();
        }
      } else if (shape === 'lion') {
        for (let i = 0; i < 7; i++) path(ctx, [[-.76 + i * .23, -.6], [-.58 + i * .23, .7], [-.48 + i * .23, .65], [-.67 + i * .23, -.6]], '#ffe4cc');
      } else if (shape === 'puffer' || shape === 'angler') {
        ellipse(ctx, .08, .31, .68, .31, 'rgba(255,247,202,.55)');
        for (let i = 0; i < 18; i++) {
          const px = Math.sin(i * 18.21) * .63, py = Math.cos(i * 3.91) * .4;
          ellipse(ctx, px, py, .027, .026, shape === 'puffer' ? '#946b3c' : '#e8baff');
        }
      } else {
        path(ctx, [[-.7, -.03], [.55, -.08], [.65, .04], [-.69, .1]], 'rgba(228,255,221,.45)');
      }
      ellipse(ctx, -.12, -height * .53, .49, .1, 'rgba(255,255,255,.23)', -.15);
      ctx.restore();
      path(ctx, [[.07, .03], [-.15, .28 + flutter, .05, .44 + flutter, .34, .18]], 'rgba(255,236,185,.55)', 'rgba(97,90,69,.27)', .016);
      fishEye(ctx, .49, -.12, round ? .10 : .082, '#fff8e1');
      ctx.beginPath(); ctx.moveTo(.78, .07); ctx.quadraticCurveTo(.69, .11, .67, .07); ctx.strokeStyle = c[2]; ctx.lineWidth = .024; ctx.stroke();
      if (shape === 'angler') {
        ctx.beginPath(); ctx.moveTo(.15, -.51); ctx.bezierCurveTo(.21, -1.02, .84, -1.1, .9, -.68 + flutter); ctx.strokeStyle = '#dcb1ff'; ctx.lineWidth = .026; ctx.stroke();
        const light = ctx.createRadialGradient(.9, -.65 + flutter, 0, .9, -.65 + flutter, .28);
        light.addColorStop(0, '#effffe'); light.addColorStop(.3, '#a8ffeb'); light.addColorStop(1, '#7befdd00');
        ellipse(ctx, .9, -.65 + flutter, .28, .28, light);
      }
    }
    ctx.restore();
  }

  class FishGame {
    constructor(canvas, options = {}) {
      if (!canvas || typeof canvas.getContext !== 'function') throw new TypeError('需要有效的 Canvas 画布');
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: true });
      if (!this.ctx) throw new Error('浏览器不支持 Canvas 2D');
      this.onEvent = typeof options.onEvent === 'function' ? options.onEvent : () => {};
      this.audio = options.audio || {};
      const stats = options.stats || {};
      this.state = {
        balance: clampBalance(options.balance == null ? 20000 : options.balance),
        power: normalizePower(options.power == null ? 10 : options.power),
        chance: normalizeChance(options.chance || 'original'),
        started: false, paused: false, auto: false, lock: false, combo: 0, bestCombo: clampBalance(stats.bestCombo || 0),
        totalCaught: clampBalance(stats.totalCaught || 0), totalEarned: clampBalance(stats.totalEarned || 0),
        totalSpent: clampBalance(stats.totalSpent || 0), catches: {}, elapsed: clampBalance(stats.elapsed || 0), waveIn: 45, bossIn: 75,
        skills: { freeze: { active: 0, cooldown: 0 }, rage: { active: 0, cooldown: 0 } }
      };
      for (const species of SPECIES) this.state.catches[species.id] = clampBalance(stats.catches && stats.catches[species.id] || 0);
      this.effects = true;
      this.scene = 'coral';
      this.height = HEIGHT;
      this.fish = []; this.bullets = []; this.nets = []; this.particles = []; this.rings = []; this.floats = [];
      this.aim = { x: WIDTH * .52, y: HEIGHT * .36 };
      this.cannonAngle = -Math.PI / 2;
      this.pointerDown = false; this.keyboardDown = false; this.activePointerId = null; this.targetId = null;
      this.recoil = 0; this.flash = 0; this.shake = 0; this.comboTimer = 0;
      this.shotTimer = 0; this.spawnTimer = 0; this.stateTimer = 0; this.emptyTimer = 0;
      this.waveActive = 0; this.banner = null; this.clock = 0; this.lastTime = null;
      this.nextId = 1; this.destroyed = false;
      this.resize();
      this.ambient = Array.from({ length: 35 }, () => ({ x: rand(0, WIDTH), y: rand(0, this.height), r: rand(.7, 2.5), speed: rand(5, 18), phase: rand(0, TAU) }));
      const showcase = [10, 12, 13, 14, 7, 15, 16];
      for (let i = 0; i < 22; i++) this.spawnFish(i < showcase.length ? SPECIES[showcase[i]] : this.pickSpecies(), true);
      this.bindInput(); this.resize();
      if (typeof ResizeObserver !== 'undefined') { this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(canvas); }
      this.loop = time => {
        if (this.destroyed) return;
        const dt = this.lastTime == null ? 1 / 60 : clamp((time - this.lastTime) / 1000, 0, .04);
        this.lastTime = time; this.update(dt); this.render();
        this.frame = requestAnimationFrame(this.loop);
      };
      if (typeof requestAnimationFrame === 'function') this.frame = requestAnimationFrame(this.loop);
      this.emitState();
    }

    bindInput() {
      this.handlers = {
        pointermove: event => {
          if (this.activePointerId != null && event.pointerId !== this.activePointerId) return;
          const rect = this.canvas.getBoundingClientRect();
          this.aim.x = clamp((event.clientX - rect.left) / Math.max(1, rect.width) * WIDTH, 0, WIDTH);
          this.aim.y = clamp((event.clientY - rect.top) / Math.max(1, rect.height) * this.height, 0, this.height - 85);
        },
        pointerdown: event => {
          if (event.button != null && event.button !== 0) return;
          if (this.activePointerId != null) return;
          if (!this.canPlay()) return;
          event.preventDefault(); this.handlers.pointermove(event); this.pointerDown = true; this.activePointerId = event.pointerId ?? null;
          if (this.canvas.setPointerCapture) try { this.canvas.setPointerCapture(event.pointerId); } catch (_) { /* Removed touch target. */ }
          if (this.state.lock) this.selectTarget(this.aim.x, this.aim.y);
          if (this.shotTimer <= 0) this.shoot();
        },
        pointerup: event => {
          if (this.activePointerId != null && event.pointerId !== this.activePointerId) return;
          this.pointerDown = false; this.activePointerId = null;
        },
        pointercancel: event => this.handlers.pointerup(event),
        lostpointercapture: event => this.handlers.pointerup(event),
        keydown: event => {
          if (event.code !== 'Space' || this.inputBlocked(event.target) || !this.canPlay()) return;
          event.preventDefault(); this.keyboardDown = true;
          if (this.shotTimer <= 0) this.shoot();
        },
        keyup: event => { if (event.code === 'Space') this.keyboardDown = false; },
        blur: () => { this.pointerDown = false; this.keyboardDown = false; this.activePointerId = null; },
        visibilitychange: () => { if (typeof document !== 'undefined' && document.hidden) this.handlers.blur(); }
      };
      ['pointermove', 'pointerdown', 'pointerup', 'pointercancel', 'lostpointercapture'].forEach(name => this.canvas.addEventListener(name, this.handlers[name]));
      if (typeof window !== 'undefined') ['keydown', 'keyup', 'blur', 'pointerup', 'pointercancel'].forEach(name => window.addEventListener(name, this.handlers[name]));
      if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.handlers.visibilitychange);
    }

    inputBlocked(target) {
      if (typeof document === 'undefined') return false;
      const el = target || document.activeElement;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(el.tagName || ''))) return true;
      return !!document.querySelector('dialog[open], [role="dialog"][aria-hidden="false"], .modal.is-open, .modal.open');
    }
    canPlay() { return this.state.started && !this.state.paused && !this.destroyed && !(typeof document !== 'undefined' && document.hidden) && !this.dialogOpen(); }
    dialogOpen() { return typeof document !== 'undefined' && !!document.querySelector('dialog[open], [role="dialog"][aria-hidden="false"], .modal.is-open, .modal.open'); }
    resize() {
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      this.dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
      const w = Math.max(1, Math.round(rect.width * this.dpr)), h = Math.max(1, Math.round(rect.height * this.dpr));
      if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
      // Adapt the ocean's logical height instead of stretching the fish on phones.
      const oldHeight = this.height;
      this.height = WIDTH * h / w;
      if (oldHeight && Math.abs(oldHeight - this.height) > .1) {
        const ratio = this.height / oldHeight;
        if (Math.abs(ratio - 1) > .2 && this.handlers) this.handlers.blur();
        this.aim.y *= ratio;
        for (const fish of this.fish) { fish.y *= ratio; fish.baseY *= ratio; if (fish.locomotion) fish.locomotion.laneY *= ratio; }
        for (const bullet of this.bullets) { bullet.y *= ratio; bullet.oldY *= ratio; for (const p of bullet.trail) p.y *= ratio; }
        for (const list of [this.nets, this.rings, this.particles, this.floats, this.ambient || []]) for (const item of list) item.y *= ratio;
      }
    }
    emit(event) { try { this.onEvent(event); } catch (error) { if (typeof console !== 'undefined') console.error(error); } }
    sound(name, ...args) { if (typeof this.audio[name] === 'function') this.audio[name](...args); }
    emitState() { this.emit({ type: 'state', state: this.getState() }); }
    getState() {
      return { ...this.state, catches: { ...this.state.catches }, skills: { freeze: { ...this.state.skills.freeze }, rage: { ...this.state.skills.rage } }, fishCount: this.fish.length, waveActive: this.waveActive > 0, effects: this.effects, scene: this.scene };
    }
    start() { if (this.destroyed) return; this.state.started = true; this.state.paused = false; this.lastTime = null; this.emitState(); }
    pause(value = true) { this.state.paused = !!value; this.pointerDown = false; this.keyboardDown = false; this.activePointerId = null; this.lastTime = null; this.emitState(); }
    setPower(value) { this.state.power = normalizePower(value); this.emitState(); return this.state.power; }
    setChance(value) { this.state.chance = normalizeChance(value); this.emitState(); return this.state.chance; }
    setBalance(value) { this.state.balance = clampBalance(value); this.emptyTimer = 0; this.emitState(); return this.state.balance; }
    setAuto(value) { this.state.auto = !!value; this.emitState(); return this.state.auto; }
    setLock(value) { this.state.lock = !!value; if (!value) this.targetId = null; this.emitState(); return this.state.lock; }
    setEffects(value) { this.effects = !!value; if (!value) { this.shake = 0; this.particles.length = Math.min(150, this.particles.length); } this.emitState(); }
    setScene(id) { this.scene = String(id || 'coral'); this.emitState(); }
    useSkill(name) {
      if (!this.canPlay() || !Object.prototype.hasOwnProperty.call(this.state.skills, name)) return false;
      const skill = this.state.skills[name];
      if (skill.cooldown > 0) { this.emit({ type: 'notice', message: `技能冷却中，还需 ${Math.ceil(skill.cooldown)} 秒` }); return false; }
      const freeze = name === 'freeze'; skill.active = freeze ? 7 : 9; skill.cooldown = freeze ? 32 : 40;
      this.rings.push({ x: WIDTH / 2, y: this.height / 2, r: 10, max: Math.max(850, this.height), age: 0, life: .85, color: freeze ? '#a9efff' : '#ffd76d', width: 6 });
      this.sound('skill', name); this.emit({ type: 'skill', name }); this.emitState();
      return true;
    }
    pickSpecies() {
      const total = SPECIES.reduce((sum, s) => sum + s.weight, 0); let roll = Math.random() * total;
      for (const s of SPECIES) { roll -= s.weight; if (roll <= 0) return s; }
      return SPECIES[0];
    }
    fishYBounds(species) {
      const top = Math.min(this.height * .38, Math.max(74, species.size * .8 + 18));
      const bottom = Math.max(top + 10, this.height - Math.max(130, species.size * .65 + 70));
      return { top, bottom };
    }
    spawnFish(species = this.pickSpecies(), inside = false, custom = null) {
      if (this.fish.length >= 54) return null;
      const direction = Math.random() < .5 ? 1 : -1;
      const bounds = this.fishYBounds(species);
      const baseY = rand(bounds.top, bounds.bottom), speed = species.speed * rand(.8, 1.22);
      const fish = {
        id: this.nextId++, species, x: inside ? rand(90, WIDTH - 90) : direction > 0 ? -species.size * 2 : WIDTH + species.size * 2,
        y: baseY, baseY, vx: speed * direction, vy: rand(-5, 5), size: species.size * rand(.91, 1.1),
        phase: rand(0, TAU), age: rand(0, 4), flash: 0, dead: false, boss: species.id === 'dragonfish'
      };
      if (custom) Object.assign(fish, custom);
      const profile = SWIM_PROFILES[species.id] || SWIM_PROFILES.fish;
      const cruise = Math.max(1, Math.abs(fish.vx));
      fish.locomotion = {
        direction: fish.vx < 0 ? -1 : 1, cruise, velocity: cruise,
        tilt: clamp(Math.atan2(fish.vy, cruise), -profile.steering, profile.steering),
        laneY: clamp(fish.y + rand(-50, 50), bounds.top, bounds.bottom),
        laneTimer: rand(2, 5), cadence: profile.cadence * rand(.92, 1.08)
      };
      fish.swim = { phase: fish.phase, effort: .6, turn: 0, speed: cruise, cadence: fish.locomotion.cadence };
      fish.heading = fish.locomotion.direction > 0 ? fish.locomotion.tilt : Math.PI - fish.locomotion.tilt;
      this.fish.push(fish); return fish;
    }
    updateFishMotion(fish, dt, frozen) {
      const profile = SWIM_PROFILES[fish.species.id] || SWIM_PROFILES.fish;
      const move = fish.locomotion, swim = fish.swim, bounds = this.fishYBounds(fish.species);
      const timeScale = frozen ? .12 : 1;
      // Substeps also make large manual updates follow the same curved path as
      // normal frames, instead of overshooting and snapping against an edge.
      let remaining = Math.max(0, dt * timeScale);
      const oldX = fish.x, oldY = fish.y;
      while (remaining > 1e-7) {
        const step = Math.min(remaining, 1 / 30); remaining -= step;
        fish.age += step;
        move.laneTimer -= step;
        if (move.laneTimer <= 0) {
          const span = bounds.bottom - bounds.top, margin = Math.min(22, span * .12);
          move.laneY = clamp(fish.y + rand(-85, 85), bounds.top + margin, bounds.bottom - margin);
          move.laneTimer = rand(3.8, 7.5);
        }
        move.laneY = clamp(move.laneY, bounds.top, bounds.bottom);
        const cadence = Math.min(2, move.cadence * clamp(move.velocity / move.cruise, .85, 1.15));
        swim.phase += step * TAU * cadence;
        swim.cadence = cadence;
        // A short mantle contraction drives the octopus forward, followed by a
        // longer glide. Other species accelerate gently with each fin/tail beat.
        const stroke = Math.sin(swim.phase);
        const thrust = fish.species.id === 'octopus' ? Math.pow(Math.max(0, stroke), 3) * 2.5 - .55 : stroke;
        const desiredSpeed = move.cruise * (1 + profile.pulse * thrust);
        move.velocity = lerp(move.velocity, desiredSpeed, 1 - Math.exp(-profile.response * step));
        const wantedTilt = clamp((move.laneY - fish.y) * .008, -profile.steering, profile.steering);
        const oldTilt = move.tilt;
        move.tilt = lerp(move.tilt, wantedTilt, 1 - Math.exp(-1.4 * step));
        const turn = clamp((move.tilt - oldTilt) / step * move.direction * 3, -1, 1);
        swim.turn = lerp(swim.turn, turn, 1 - Math.exp(-3 * step));
        swim.effort = lerp(swim.effort, .55 + clamp(thrust, -1, 1) * .24, 1 - Math.exp(-5 * step));
        fish.x += move.direction * move.velocity * Math.cos(move.tilt) * step;
        fish.y = clamp(fish.y + move.velocity * Math.sin(move.tilt) * step, bounds.top, bounds.bottom);
      }
      fish.baseY = fish.y;
      fish.heading = move.direction > 0 ? move.tilt : Math.PI - move.tilt;
      // These are measured world velocities (already slowed by freeze) used by
      // target prediction, rather than a nominal cruising speed.
      if (dt > 0) { fish.vx = (fish.x - oldX) / dt; fish.vy = (fish.y - oldY) / dt; }
      swim.speed = Math.hypot(fish.vx, fish.vy);
    }
    selectTarget(x, y) {
      let best = null, distance = Infinity;
      for (const fish of this.fish) {
        if (fish.dead || fish.x < 0 || fish.x > WIDTH) continue;
        const d = (fish.x - x) ** 2 + (fish.y - y) ** 2;
        if (d < distance) { distance = d; best = fish; }
      }
      this.targetId = best ? best.id : null;
      return best;
    }
    getTarget() {
      let target = this.fish.find(f => f.id === this.targetId && !f.dead && f.x > -20 && f.x < WIDTH + 20);
      if (!target && this.state.lock) {
        target = this.fish.filter(f => !f.dead && f.x > 20 && f.x < WIDTH - 20)
          .sort((a, b) => b.species.reward - a.species.reward || Math.abs(a.x - WIDTH / 2) - Math.abs(b.x - WIDTH / 2))[0] || null;
        this.targetId = target ? target.id : null;
      }
      if (!target && this.state.auto) target = this.selectTarget(this.aim.x, this.aim.y);
      return target;
    }
    shoot() {
      if (!this.canPlay() || this.shotTimer > 0) return false;
      const shot = calculateShot(this.state.balance, this.state.power);
      if (!shot.ok) {
        this.pointerDown = false; this.keyboardDown = false;
        if (this.state.auto) this.state.auto = false;
        if (this.emptyTimer <= 0) { this.emit({ type: 'empty', message: '游戏币不足，去补给站添加一些吧' }); this.emptyTimer = 3; this.emitState(); }
        return false;
      }
      const rage = this.state.skills.rage.active > 0;
      let target = null;
      if (this.state.lock || this.state.auto) target = this.getTarget();
      const targetX = target ? target.x + target.vx * .27 : this.aim.x;
      const targetY = target ? target.y + target.vy * .27 : this.aim.y;
      const angle = clamp(Math.atan2(Math.min(targetY, this.height - 115) - (this.height - 58), targetX - WIDTH / 2), -Math.PI + .14, -.14);
      this.cannonAngle = angle;
      const x = WIDTH / 2 + Math.cos(angle) * 64, y = this.height - 58 + Math.sin(angle) * 64;
      this.state.balance = shot.balance; this.state.totalSpent = clampBalance(this.state.totalSpent + shot.cost);
      this.bullets.push({ id: this.nextId++, x, y, oldX: x, oldY: y, vx: Math.cos(angle) * 850, vy: Math.sin(angle) * 850, age: 0, power: shot.cost, chance: this.state.chance, rage, bounces: 0, hit: new Set(), trail: [] });
      this.recoil = 1; this.flash = 1; this.shotTimer = rage ? .085 : .16;
      if (this.effects) this.shake = Math.max(this.shake, rage ? 3 : 1.8);
      this.rings.push({ x: x + Math.cos(angle) * 9, y: y + Math.sin(angle) * 9, r: 8, max: 39, age: 0, life: .22, color: rage || shot.cost >= 200 ? '#ffdc88' : '#9dfff0', width: 3, kind: 'muzzle', angle });
      this.spawnParticles(x, y, rage ? 9 : 7, rage || shot.cost >= 200 ? '#ffe998' : '#c0ffec', 155, .28, 'spark', angle);
      this.sound('shot', shot.cost); this.emit({ type: 'shot', power: shot.cost, balance: this.state.balance });
      return true;
    }

    burst(bullet, x, y, directFish = null) {
      const radius = (bullet.rage ? 108 : 80) + Math.log2(Math.max(1, bullet.power / 10)) * 3;
      const color = bullet.rage || bullet.power >= 200 ? '#ffe29a' : '#87fff0';
      this.nets.push({ x, y, radius, age: 0, life: .86, color, rotate: rand(0, TAU), charged: bullet.rage || bullet.power >= 200 });
      this.rings.push({ x, y, r: 7, max: radius * 1.28, age: 0, life: .48, color: '#fff2bd', width: 5 });
      this.rings.push({ x, y, r: 13, max: radius * 1.5, age: -.07, life: .62, color, width: 2 });
      this.spawnParticles(x, y, bullet.rage ? 18 : 12, color, 235, .48, 'spark');
      this.spawnParticles(x, y, 5, '#fff7bf', 150, .55, 'star');
      if (this.effects) this.shake = Math.max(this.shake, bullet.rage ? 3.4 : 2.2);
      if (this.rings.length > 120) this.rings.splice(0, this.rings.length - 120);
      let bestTier = 1, touched = false;
      for (const fish of this.fish) {
        if (fish.dead || bullet.hit.has(fish.id)) continue;
        if (fish !== directFish && Math.hypot(fish.x - x, fish.y - y) > radius + fish.size * .35) continue;
        bullet.hit.add(fish.id); touched = true; bestTier = Math.max(bestTier, fish.species.tier); fish.flash = .19;
        if (Math.random() < probability(fish.species.chance, bullet.chance)) this.capture(fish, bullet);
        else this.spawnParticles(fish.x, fish.y, 4, '#b7f8ff', 75, .35, 'spark');
      }
      if (touched) this.sound('hit', bestTier);
    }

    capture(fish, bullet) {
      if (fish.dead) return;
      fish.dead = true;
      const species = fish.species, tier = species.tier;
      const reward = bullet.power * species.reward;
      this.state.balance = clampBalance(this.state.balance + reward);
      this.state.totalCaught = clampBalance(this.state.totalCaught + 1);
      this.state.totalEarned = clampBalance(this.state.totalEarned + reward);
      this.state.catches[species.id] = clampBalance(this.state.catches[species.id] + 1);
      this.state.combo = this.comboTimer > 0 ? this.state.combo + 1 : 1; this.comboTimer = 3.3;
      this.state.bestCombo = Math.max(this.state.bestCombo, this.state.combo);
      const color = tier === 4 ? '#ffd77d' : tier === 3 ? '#d7baff' : tier === 2 ? '#a3f7ff' : '#b5ffcc';
      this.spawnParticles(fish.x, fish.y, [0, 15, 26, 43, 80][tier], color, [0, 110, 155, 205, 280][tier], tier >= 3 ? 1.15 : .65, 'spark');
      this.spawnParticles(fish.x, fish.y, [0, 4, 7, 12, 27][tier], '#ffda76', 170 + tier * 18, 1.1 + tier * .1, 'coin');
      this.rings.push({ x: fish.x, y: fish.y, r: 6, max: 50 + tier * 27, age: 0, life: .55 + tier * .06, color, width: tier + .6 });
      if (tier >= 3) this.rings.push({ x: fish.x, y: fish.y, r: 2, max: 75 + tier * 30, age: -.12, life: .65, color: '#fffce3', width: 1.5 });
      if (this.effects) this.shake = Math.max(this.shake, tier >= 4 ? 13 : tier >= 3 ? 5 : 2.5);
      this.floats.push({ x: fish.x, y: fish.y - 15, text: `+${reward.toLocaleString('en-US')}`, sub: tier >= 3 ? species.name : '', color, age: 0, life: tier >= 3 ? 2 : 1.25, scale: tier >= 4 ? 1.8 : tier >= 3 ? 1.4 : 1 });
      if (tier >= 4) {
        this.rings.push({ x: fish.x, y: fish.y, r: 24, max: fish.boss ? 280 : 215, age: 0, life: fish.boss ? 2.9 : 2.3, color: '#ffdc83', width: 3, kind: 'royal' });
        this.rings.push({ x: fish.x, y: fish.y, r: 10, max: fish.boss ? 360 : 265, age: -.28, life: 1.4, color: '#fff4c2', width: 3 });
        this.banner = { text: `${species.name} · ${fish.boss ? '传奇捕获' : '大获丰收'}`, sub: `+ ${reward.toLocaleString('en-US')}  游戏币`, age: 0, life: fish.boss ? 4.1 : 3.5, color };
        for (let i = 0; i < 3; i++) {
          const fx = clamp(fish.x + rand(-220, 220), 100, WIDTH - 100), fy = clamp(fish.y + rand(-100, 100), 100, this.height - 180);
          this.spawnParticles(fx, fy, 32, i % 2 ? '#fff4bd' : '#fca8df', 220, 1.65, 'star');
        }
      }
      this.sound('capture', tier, this.state.combo);
      this.emit({ type: 'capture', id: species.id, speciesId: species.id, name: species.name, tier, reward, power: bullet.power, combo: this.state.combo, balance: this.state.balance, boss: fish.boss });
    }

    spawnParticles(x, y, count, color, speed, life, type = 'spark', direction = null) {
      if (!this.effects) count = Math.min(count, type === 'coin' ? 3 : 5);
      const max = this.effects ? 720 : 160;
      for (let i = 0; i < count && this.particles.length < max; i++) {
        const a = direction == null ? rand(0, TAU) : direction + rand(-.65, .65), v = speed * rand(.25, 1);
        this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (type === 'coin' ? 80 : 0), life: life * rand(.65, 1.2), age: 0, color, size: type === 'coin' ? rand(4, 7) : rand(1.7, 4.2), type, spin: rand(0, TAU) });
      }
    }
    startWave() {
      this.waveActive = 12; this.state.waveIn = 45;
      const species = SPECIES[Math.floor(rand(0, 6))], direction = Math.random() < .5 ? 1 : -1;
      const bounds = this.fishYBounds(species), middle = (bounds.top + bounds.bottom) / 2;
      const amplitude = Math.max(5, (bounds.bottom - bounds.top) * .4);
      for (let i = 0; i < 15; i++) {
        const y = middle + Math.sin(i * .65) * amplitude;
        this.spawnFish(species, false, { x: direction > 0 ? -90 - i * 60 : WIDTH + 90 + i * 60, y, baseY: y, vx: direction * 110, phase: i * .3 });
      }
      this.banner = { text: '鱼潮来袭', sub: '成群鱼儿游过，准备撒网！', age: 0, life: 2.6, color: '#b0ffff' };
      this.sound('wave'); this.emit({ type: 'wave' });
    }
    startBoss() {
      this.state.bossIn = 75;
      if (this.fish.some(f => f.boss && !f.dead)) return;
      const bounds = this.fishYBounds(SPECIES[11]), y = lerp(bounds.top, bounds.bottom, .38);
      this.spawnFish(SPECIES[11], false, { baseY: y, y });
      this.banner = { text: '深海龙皇降临', sub: '传说中的海底宝藏 · 200 倍奖励', age: 0, life: 3.4, color: '#ffe2a0' };
      this.sound('boss'); this.emit({ type: 'boss' });
    }

    update(dt) {
      const playing = this.canPlay(), attract = !this.state.started;
      if (!playing && !attract) return;
      this.clock += dt;
      this.shake *= Math.exp(-12 * dt); this.recoil *= Math.exp(-17 * dt); this.flash *= Math.exp(-20 * dt);
      this.shotTimer = Math.max(0, this.shotTimer - dt); this.emptyTimer = Math.max(0, this.emptyTimer - dt);
      const freeze = this.state.skills.freeze.active > 0;
      const target = this.state.lock || this.state.auto ? this.getTarget() : null;
      const tx = target ? target.x : this.aim.x, ty = target ? target.y : this.aim.y;
      const desired = clamp(Math.atan2(Math.min(ty, this.height - 115) - (this.height - 58), tx - WIDTH / 2), -Math.PI + .14, -.14);
      this.cannonAngle = lerp(this.cannonAngle, desired, Math.min(1, dt * 18));
      for (const fish of this.fish) {
        this.updateFishMotion(fish, dt, freeze);
        fish.flash = Math.max(0, fish.flash - dt);
      }
      this.fish = this.fish.filter(f => !f.dead && (f.vx > 0 ? f.x < WIDTH + f.size * 2.5 : f.x > -f.size * 2.5));
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.fish.length < (attract ? 25 : 34)) {
        const visible = this.fish.filter(f => f.x > 0 && f.x < WIDTH).length;
        const refill = playing && visible < 12;
        const count = refill ? Math.min(3, 34 - this.fish.length) : 1;
        for (let i = 0; i < count; i++) {
          const incoming = this.spawnFish();
          if (refill && incoming) incoming.x = incoming.vx > 0 ? -incoming.size * .65 : WIDTH + incoming.size * .65;
        }
        this.spawnTimer = refill ? .28 : rand(.55, 1.15);
      }
      for (const a of this.ambient) { a.y -= dt * a.speed; if (a.y < -10) { a.y = this.height + 10; a.x = rand(0, WIDTH); } }

      if (playing) {
        this.state.elapsed += dt; this.state.waveIn -= dt; this.state.bossIn -= dt;
        this.waveActive = Math.max(0, this.waveActive - dt);
        if (this.state.waveIn <= 0) this.startWave();
        if (this.state.bossIn <= 0) this.startBoss();
        for (const skill of Object.values(this.state.skills)) { skill.active = Math.max(0, skill.active - dt); skill.cooldown = Math.max(0, skill.cooldown - dt); }
        if (this.comboTimer > 0) { this.comboTimer -= dt; if (this.comboTimer <= 0) this.state.combo = 0; }
        if (this.pointerDown || this.keyboardDown || this.state.auto) this.shoot();
        // An empty-wallet callback may synchronously open a modal and pause us.
        if (!this.canPlay()) return;
        for (const bullet of this.bullets) {
          bullet.age += dt; bullet.oldX = bullet.x; bullet.oldY = bullet.y;
          bullet.trail.push({ x: bullet.x, y: bullet.y }); if (bullet.trail.length > 5) bullet.trail.shift();
          bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt;
          let first = null, hitT = 2;
          for (const fish of this.fish) {
            if (fish.dead) continue;
            const hitScale = fish.species.id === 'crab' || fish.species.id === 'octopus' ? .7 : fish.species.shape === 'ray' ? .65 : fish.species.id === 'whale' || fish.boss ? .6 : .54;
            const t = segmentCircleHit(bullet.oldX, bullet.oldY, bullet.x, bullet.y, fish.x, fish.y, fish.size * hitScale + 5);
            if (t != null && t < hitT) { hitT = t; first = fish; }
          }
          if (first) { this.burst(bullet, lerp(bullet.oldX, bullet.x, hitT), lerp(bullet.oldY, bullet.y, hitT), first); bullet.dead = true; }
          else if (bullet.x < 5 || bullet.x > WIDTH - 5) { bullet.vx *= -1; bullet.x = clamp(bullet.x, 5, WIDTH - 5); bullet.bounces++; }
          else if (bullet.y < 6) { bullet.vy *= -1; bullet.y = 6; bullet.bounces++; }
          if (!bullet.dead && (bullet.age > 3 || bullet.y > this.height + 20 || bullet.bounces > 2)) { bullet.dead = true; if (bullet.y < this.height - 80) this.burst(bullet, bullet.x, bullet.y); }
        }
        this.bullets = this.bullets.filter(b => !b.dead);
        this.fish = this.fish.filter(f => !f.dead);
      }
      for (const p of this.particles) {
        p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.type === 'coin') {
          if (p.age > p.life * .3) {
            const pull = Math.min(1, dt * 9);
            p.vx = lerp(p.vx, (WIDTH / 2 - p.x) * 7, pull);
            p.vy = lerp(p.vy, (this.height - 45 - p.y) * 7, pull);
            if (Math.hypot(WIDTH / 2 - p.x, this.height - 45 - p.y) < 15) p.age = p.life;
          } else p.vy += 270 * dt;
        }
        else { p.vx *= Math.exp(-2.3 * dt); p.vy *= Math.exp(-2.3 * dt); }
        p.spin += dt * 8;
      }
      this.particles = this.particles.filter(p => p.age < p.life);
      for (const list of [this.nets, this.rings, this.floats]) { for (const item of list) item.age += dt; }
      this.nets = this.nets.filter(n => n.age < n.life); this.rings = this.rings.filter(r => r.age < r.life); this.floats = this.floats.filter(f => f.age < f.life);
      if (this.banner) { this.banner.age += dt; if (this.banner.age > this.banner.life) this.banner = null; }
      this.stateTimer += dt;
      if (this.stateTimer >= .16) { this.stateTimer = 0; this.emitState(); }
    }

    render() {
      const ctx = this.ctx;
      ctx.setTransform(this.canvas.width / WIDTH, 0, 0, this.canvas.height / this.height, 0, 0);
      ctx.clearRect(0, 0, WIDTH, this.height);
      ctx.save();
      if (this.effects && this.shake > .15) ctx.translate(rand(-this.shake, this.shake), rand(-this.shake, this.shake));
      this.drawWater(ctx);
      for (const fish of this.fish) this.renderFish(ctx, fish);
      this.drawTarget(ctx);
      this.drawProjectiles(ctx);
      this.drawNets(ctx);
      this.drawParticles(ctx);
      this.drawCannon(ctx);
      this.drawFloats(ctx);
      this.drawBanner(ctx);
      this.drawSkillOverlays(ctx);
      ctx.restore();
    }

    drawWater(ctx) {
      const deep = this.scene === 'deep' || this.scene === 'abyss' || this.scene === 'night';
      const ambient = ctx.createLinearGradient(0, 0, 0, this.height);
      ambient.addColorStop(0, deep ? 'rgba(17,48,83,.13)' : 'rgba(56,201,210,.06)');
      ambient.addColorStop(.75, 'rgba(0,25,45,0)'); ambient.addColorStop(1, 'rgba(3,18,31,.34)');
      ctx.fillStyle = ambient; ctx.fillRect(0, 0, WIDTH, this.height);
      if (this.effects) {
        ctx.save(); ctx.globalCompositeOperation = 'screen';
        for (let i = 0; i < 5; i++) {
          const sway = Math.sin(this.clock * .13 + i) * 30, x = 70 + i * 263;
          const g = ctx.createLinearGradient(x, 0, x + 130, 600);
          g.addColorStop(0, 'rgba(118,238,243,.075)'); g.addColorStop(1, 'rgba(118,238,243,0)');
          path(ctx, [[x + sway, 0], [x + 38 + sway, 0], [x + 250, this.height], [x - 130, this.height]], g);
        }
        ctx.restore();
      }
      for (const a of this.ambient) {
        const x = a.x + Math.sin(this.clock * .7 + a.phase) * 8;
        ctx.globalAlpha = .24 + Math.sin(this.clock + a.phase) * .11;
        ellipse(ctx, x, a.y, a.r, a.r, null); ctx.strokeStyle = '#b2f4ec'; ctx.lineWidth = .7; ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // A few caustic contours add life without obscuring the illustrated seabed.
      if (this.effects) {
        ctx.strokeStyle = 'rgba(160,243,223,.05)'; ctx.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          for (let x = 0; x <= WIDTH; x += 22) {
            const y = 110 + i * 90 + Math.sin(x * .009 + this.clock * .35 + i) * 25;
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
    }
    renderFish(ctx, fish) {
      const s = fish.species;
      const angle = fish.heading;
      if (s.tier >= 3) {
        const glow = ctx.createRadialGradient(fish.x, fish.y, fish.size * .18, fish.x, fish.y, fish.size * 1.8);
        glow.addColorStop(0, s.tier === 4 ? 'rgba(255,210,83,.14)' : 'rgba(111,160,251,.08)'); glow.addColorStop(1, 'rgba(170,224,247,0)');
        ellipse(ctx, fish.x, fish.y, fish.size * 1.8, fish.size * 1.35, glow);
      }
      ctx.save();
      ctx.shadowColor = 'rgba(0,17,31,.32)'; ctx.shadowBlur = 9; ctx.shadowOffsetY = 7;
      drawFish(ctx, s, fish.x, fish.y, fish.size, fish.age + fish.phase, angle, fish.swim);
      ctx.restore();
      if (fish.flash > 0) {
        ctx.save(); ctx.globalAlpha = fish.flash / .19 * .65; ctx.globalCompositeOperation = 'screen';
        drawFish(ctx, s, fish.x, fish.y, fish.size * 1.012, fish.age + fish.phase, angle, fish.swim); ctx.restore();
      }
      if (this.state.skills.freeze.active > 0) {
        ellipse(ctx, fish.x, fish.y, fish.size * 1.04, fish.size * .72, 'rgba(167,234,255,.10)');
        ctx.strokeStyle = 'rgba(170,240,255,.38)'; ctx.lineWidth = 1; ctx.stroke();
      }
      if (s.tier === 4) {
        const bx = fish.x, by = fish.y - fish.size * .66;
        ctx.save(); ctx.font = '600 11px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center';
        ctx.shadowColor = '#051b29'; ctx.shadowBlur = 5;
        ctx.fillStyle = '#ffdf91'; ctx.fillText(`${s.name}  ×${s.reward}`, bx, by);
        ctx.strokeStyle = 'rgba(255,221,145,.38)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(bx - 43, by + 7); ctx.lineTo(bx + 43, by + 7); ctx.stroke(); ctx.restore();
      }
    }
    drawTarget(ctx) {
      if (!this.state.started) return;
      const target = this.state.lock ? this.fish.find(f => f.id === this.targetId) : null;
      const x = target ? target.x : this.aim.x, y = target ? target.y : this.aim.y;
      const r = target ? target.size + 14 : 15;
      ctx.save(); ctx.strokeStyle = target ? 'rgba(255,228,132,.88)' : 'rgba(164,248,237,.48)'; ctx.lineWidth = 1.3;
      ctx.translate(x, y); ctx.rotate(this.clock * .35);
      for (let i = 0; i < 4; i++) {
        const a = i / 4 * TAU;
        ctx.beginPath(); ctx.arc(0, 0, r, a + .12, a + .68); ctx.stroke();
      }
      if (!target) { ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.moveTo(0, -5); ctx.lineTo(0, 5); ctx.stroke(); }
      ctx.restore();
      if (target) {
        ctx.save(); ctx.setLineDash([3, 12]); ctx.lineDashOffset = -this.clock * 20;
        ctx.strokeStyle = 'rgba(255,217,125,.13)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(WIDTH / 2, this.height - 100); ctx.lineTo(x, y); ctx.stroke(); ctx.restore();
      }
    }
    drawProjectiles(ctx) {
      for (const bullet of this.bullets) {
        const charge = clamp(Math.log2(Math.max(1, bullet.power / 10)) / 6.65, 0, 1);
        const hot = bullet.rage || bullet.power >= 200;
        const radius = 13.5 + charge * 7 + (bullet.rage ? 1.5 : 0);
        const color = hot ? '#ffd476' : '#61ffe0';
        const angle = Math.atan2(bullet.vy, bullet.vx);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        // Discrete turbulent embers read as hot exhaust, rather than a laser line.
        if (this.effects) for (let i = 0; i < bullet.trail.length; i++) {
          const p = bullet.trail[i], t = (i + 1) / (bullet.trail.length + 1);
          ctx.globalAlpha = t * .2;
          ellipse(ctx, p.x, p.y, radius * (.3 + t * .35), radius * (.2 + t * .28), color);
        }
        ctx.restore();
        ctx.save(); ctx.translate(bullet.x, bullet.y); ctx.rotate(angle);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const flicker = Math.sin(bullet.age * 75 + bullet.id) * 4;
        const flame = ctx.createLinearGradient(-radius * 4.3, 0, -radius * .6, 0);
        flame.addColorStop(0, hot ? 'rgba(255,94,31,0)' : 'rgba(18,137,213,0)');
        flame.addColorStop(.48, hot ? 'rgba(255,139,37,.35)' : 'rgba(25,211,221,.35)');
        flame.addColorStop(1, hot ? '#fff0a1' : '#b9fff2');
        path(ctx, [[-radius * .55, -radius * .64], [-radius * 1.6, -radius * .8, -radius * 2.3, -.2 * radius, -radius * 4.5 - flicker, 0], [-radius * 2, .22 * radius, -radius * 1.65, radius * .72, -radius * .55, radius * .64]], flame);
        if (this.effects) {
          const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 2.9);
          glow.addColorStop(0, hot ? 'rgba(255,234,128,.4)' : 'rgba(141,255,227,.4)');
          glow.addColorStop(.4, hot ? 'rgba(255,161,56,.12)' : 'rgba(61,226,225,.12)'); glow.addColorStop(1, 'rgba(37,172,213,0)');
          ellipse(ctx, 0, 0, radius * 2.9, radius * 2.9, glow);
        }
        ctx.restore();
        // A shaded, substantial gold shell surrounds a spherical charged core.
        const metal = ctx.createRadialGradient(-radius * .35, -radius * .52, radius * .05, radius * .2, radius * .25, radius * 1.35);
        metal.addColorStop(0, '#fff8d3'); metal.addColorStop(.28, '#f6d88c'); metal.addColorStop(.57, '#bc8433'); metal.addColorStop(.82, '#684221'); metal.addColorStop(1, '#293c39');
        ellipse(ctx, 0, 0, radius * 1.12, radius, metal);
        ctx.lineWidth = 1.5; ctx.strokeStyle = '#ffdf97'; ctx.stroke();
        const core = ctx.createRadialGradient(radius * .24, -radius * .3, 0, 0, 0, radius * .85);
        core.addColorStop(0, '#ffffff'); core.addColorStop(.21, hot ? '#fff4a5' : '#d3fff1');
        core.addColorStop(.58, hot ? '#ed9b28' : '#36d7bc'); core.addColorStop(1, hot ? '#873b11' : '#086a76');
        ellipse(ctx, radius * .09, 0, radius * .79, radius * .78, core);
        ctx.save(); ctx.rotate(bullet.age * 5 + bullet.id);
        for (let i = 0; i < 2; i++) {
          ctx.beginPath(); ctx.ellipse(0, 0, radius * 1.1, radius * .3, i * Math.PI / 2, 0, TAU);
          ctx.strokeStyle = i ? '#805622' : '#fff0b9'; ctx.lineWidth = i ? 3.2 : 2.2; ctx.stroke();
        }
        for (let i = 0; i < 4; i++) {
          const a = i / 4 * TAU;
          ellipse(ctx, Math.cos(a) * radius * .96, Math.sin(a) * radius * .84, 2, 2, '#fff1b0');
        }
        ctx.restore();
        ellipse(ctx, radius * .34, -radius * .36, radius * .24, radius * .12, 'rgba(255,255,245,.85)', -.6);
        ctx.restore();
      }
    }
    drawNets(ctx) {
      for (const net of this.nets) {
        const p = net.age / net.life;
        ctx.save(); ctx.translate(net.x, net.y);
        // The blast occurs first; the catching lattice unfolds from its shockwave.
        if (net.age < .3) {
          const blast = Math.max(0, 1 - net.age / .3), br = 22 + (1 - blast) * net.radius;
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = blast;
          const fire = ctx.createRadialGradient(0, 0, 1, 0, 0, br);
          fire.addColorStop(0, '#fffef1'); fire.addColorStop(.14, '#fff0bd');
          fire.addColorStop(.38, net.charged ? 'rgba(255,195,56,.68)' : 'rgba(128,255,222,.65)');
          fire.addColorStop(1, net.charged ? 'rgba(255,126,25,0)' : 'rgba(50,195,219,0)');
          ellipse(ctx, 0, 0, br, br, fire);
          if (this.effects) {
            for (let i = 0; i < 8; i++) {
              const a = i / 8 * TAU + net.rotate;
              ctx.beginPath();
              for (let j = 0; j < 5; j++) {
                const d = br * (.3 + j * .2), skew = Math.sin(i * 8.4 + j * 2.7 + Math.floor(net.age * 45)) * .13;
                const px = Math.cos(a + skew) * d, py = Math.sin(a + skew) * d;
                if (!j) ctx.moveTo(px, py); else ctx.lineTo(px, py);
              }
              ctx.strokeStyle = i % 2 ? '#fff7d3' : net.color; ctx.lineWidth = 1.8; ctx.stroke();
            }
          }
          ctx.restore();
        }
        const opening = clamp((net.age - .055) / .29, 0, 1);
        const radius = net.radius * (.15 + .85 * (1 - (1 - opening) ** 3));
        const fade = Math.min(1, opening * 3, (1 - p) * 2);
        ctx.rotate(net.rotate + p * .18);
        ctx.globalAlpha = fade * .8; ctx.strokeStyle = net.color; ctx.lineWidth = 1.4;
        const points = 16;
        for (let ring = 1; ring <= 5; ring++) {
          ctx.beginPath();
          for (let i = 0; i <= points; i++) { const a = i / points * TAU, r = radius * ring / 5; if (!i) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
          ctx.stroke();
        }
        for (let i = 0; i < points; i++) {
          const a = i / points * TAU; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius); ctx.stroke();
          if (i % 2 === 0) {
            const nx = Math.cos(a) * radius, ny = Math.sin(a) * radius;
            ctx.save(); ctx.translate(nx, ny); ctx.rotate(a + Math.PI / 4);
            path(ctx, [[-4, -4], [4, -4], [4, 4], [-4, 4]], '#ffe7a4', '#a87b36', .7);
            ellipse(ctx, 0, 0, 1.6, 1.6, '#ecfff1'); ctx.restore();
          }
        }
        ctx.strokeStyle = '#ffe4a0'; ctx.lineWidth = 1.9;
        ctx.beginPath(); ctx.arc(0, 0, radius * 1.04, 0, TAU); ctx.stroke();
        ctx.globalAlpha *= .48; ctx.lineWidth = .8;
        ctx.beginPath(); ctx.arc(0, 0, radius * 1.1, 0, TAU); ctx.stroke();
        ctx.restore();
      }
      for (const ring of this.rings) {
        if (ring.age < 0) continue;
        const p = ring.age / ring.life;
        const radius = lerp(ring.r, ring.max, 1 - (1 - p) ** 2);
        ctx.save(); ctx.translate(ring.x, ring.y); ctx.globalAlpha = (1 - p) ** 2;
        if (ring.kind === 'muzzle') { ctx.rotate(ring.angle + Math.PI / 2); ctx.scale(1, .55); }
        if (ring.kind === 'royal') {
          ctx.globalAlpha = Math.min(1, ring.age * 4, (1 - p) * 2.4);
          ctx.rotate(ring.age * .3);
          if (this.effects) {
            const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.25);
            glow.addColorStop(0, 'rgba(255,241,175,.42)'); glow.addColorStop(.45, 'rgba(255,183,54,.18)'); glow.addColorStop(1, 'rgba(255,159,40,0)');
            ellipse(ctx, 0, 0, radius * 1.25, radius * 1.25, glow);
            for (let i = 0; i < 20; i++) {
              const a = i / 20 * TAU;
              path(ctx, [[Math.cos(a) * radius * .2, Math.sin(a) * radius * .2], [Math.cos(a - .035) * radius, Math.sin(a - .035) * radius], [Math.cos(a + .035) * radius, Math.sin(a + .035) * radius]], 'rgba(255,219,113,.17)');
            }
          }
          ctx.strokeStyle = '#f4ca75'; ctx.lineWidth = 2;
          for (let i = 0; i < 12; i++) {
            const a = i / 12 * TAU;
            ctx.beginPath(); ctx.arc(0, 0, radius * .75, a + .05, a + .36); ctx.stroke();
            const px = Math.cos(a) * radius * .87, py = Math.sin(a) * radius * .87;
            ctx.save(); ctx.translate(px, py); ctx.rotate(a + Math.PI / 4); ctx.fillStyle = '#fff0b1'; ctx.fillRect(-3, -3, 6, 6); ctx.restore();
          }
        }
        ctx.strokeStyle = ring.color; ctx.lineWidth = ring.width * (1 - p * .6);
        ellipse(ctx, 0, 0, radius, radius); ctx.stroke(); ctx.restore();
      }
    }
    drawParticles(ctx) {
      for (const p of this.particles) {
        const progress = p.age / p.life;
        ctx.save(); ctx.globalAlpha = Math.min(1, (1 - progress) * 3); ctx.translate(p.x, p.y);
        if (p.type === 'coin') {
          ctx.rotate(p.spin * .12); const rx = Math.max(1.1, Math.abs(Math.cos(p.spin)) * p.size);
          ellipse(ctx, 0, 0, rx, p.size, '#b97921'); ellipse(ctx, -.5, -.8, Math.max(.6, rx - 1), p.size - 1, '#ffe48b');
          ctx.strokeStyle = '#c89430'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-rx * .35, -.5); ctx.lineTo(rx * .35, -.5); ctx.stroke();
        } else if (p.type === 'star') {
          ctx.rotate(p.spin); ctx.fillStyle = p.color; ctx.beginPath();
          for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, r = i % 2 ? p.size * .35 : p.size * 1.7; if (!i) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
          ctx.closePath(); ctx.fill();
        } else {
          ctx.rotate(Math.atan2(p.vy, p.vx)); ellipse(ctx, 0, 0, p.size * (1.8 - progress), p.size * .5, p.color);
        }
        ctx.restore();
      }
    }
    drawCannon(ctx) {
      const x = WIDTH / 2, y = this.height - 58, rage = this.state.skills.rage.active > 0;
      const hot = rage || this.state.power >= 200;
      const energy = hot ? '#ffdc85' : '#89ffe0';
      ctx.save(); ctx.translate(x, y);
      const aura = ctx.createRadialGradient(0, 0, 20, 0, 0, 110);
      aura.addColorStop(0, hot ? 'rgba(255,184,51,.32)' : 'rgba(84,241,207,.25)'); aura.addColorStop(1, 'rgba(52,180,181,0)');
      ellipse(ctx, 0, 0, 110, 76, aura);
      ellipse(ctx, 0, 39, 80, 19, 'rgba(0,14,25,.55)');
      path(ctx, [[-71, 24], [-52, -5], [52, -5], [71, 24], [58, 48], [-58, 48]], gradient(ctx, 0, -5, 0, 48, ['#4f7771', '#1b454b', '#102831']), '#7da38b', 2);
      path(ctx, [[-69, 23], [-53, 41], [53, 41], [69, 23]], null, '#dbb975', 3);
      path(ctx, [[-57, 1], [-72, 20], [-58, 34], [-41, 15]], gradient(ctx, -71, 0, -43, 28, ['#fff0b2', '#b3874e', '#344e4b']), '#ccae71', 1);
      path(ctx, [[57, 1], [72, 20], [58, 34], [41, 15]], gradient(ctx, 42, 0, 70, 28, ['#e7c47a', '#947042', '#254646']), '#ccae71', 1);
      path(ctx, [[-51, 21], [-36, 9], [36, 9], [51, 21], [41, 34], [-41, 34]], '#143942', '#b3a56a', 1.7);
      for (const side of [-1, 1]) {
        ellipse(ctx, side * 49, 28, 6, 6, '#bca66c'); ellipse(ctx, side * 49, 28, 2, 2, '#2b4e50');
        for (let i = 0; i < 3; i++) {
          ctx.strokeStyle = '#e2ca89'; ctx.lineWidth = 1.3; ctx.beginPath();
          ctx.moveTo(side * (53 + i * 4), 7 + i * 3); ctx.lineTo(side * (48 + i * 4), 16 + i * 3); ctx.stroke();
        }
      }
      ctx.save(); ctx.rotate(this.cannonAngle + Math.PI / 2); ctx.translate(0, this.recoil * 12);
      // Twin pressure chambers feed a heavy gilded cannon with a broad shell bore.
      for (const side of [-1, 1]) {
        path(ctx, [[side * 18, -7], [side * 35, -15], [side * 34, -48], [side * 23, -62], [side * 17, -52]], gradient(ctx, side * 17, 0, side * 35, 0, ['#665535', '#f8de9a', '#9b804e', '#264c4a']), '#203633', 1.5);
        ctx.fillStyle = '#123c3c'; ctx.fillRect(side < 0 ? -31 : 25, -44, 6, 24);
        for (let i = 0; i < 4; i++) {
          ctx.globalAlpha = .7 + Math.sin(this.clock * 5 - i) * .25;
          ctx.fillStyle = energy; ctx.fillRect(side < 0 ? -30 : 26, -42 + i * 5.5, 4, 3.4);
        }
        ctx.globalAlpha = 1;
      }
      path(ctx, [[-24, 3], [-22, -58], [-18, -74], [18, -74], [22, -58], [24, 3]], gradient(ctx, -25, 0, 25, 0, ['#3e5b4f', '#c7984c', '#ffefb3', '#d8b776', '#385750']), '#293e36', 2);
      path(ctx, [[-9, -12], [-8, -60], [8, -60], [9, -12]], gradient(ctx, -9, 0, 9, 0, ['#103e46', hot ? '#dbad5b' : '#51c6b8', '#123d48']), '#cfb773', 1);
      for (const by of [-61, -22]) {
        path(ctx, [[-26, by - 4], [26, by - 4], [26, by + 5], [-26, by + 5]], gradient(ctx, -26, 0, 26, 0, ['#92723c', '#ffe8a3', '#a98448']), '#455540', 1);
      }
      for (const side of [-1, 1]) {
        ctx.strokeStyle = '#fff1bc'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(side * 17, -51); ctx.lineTo(side * 18, -32); ctx.stroke();
        ellipse(ctx, side * 19, -62, 2, 2, '#fff2b0');
      }
      ellipse(ctx, 0, -73, 25, 10, gradient(ctx, -25, -79, 25, -64, ['#ffebb0', '#ab8042', '#584a2a']));
      ellipse(ctx, 0, -75, 20, 7.5, '#092e37'); ellipse(ctx, 0, -76, 15, 4.8, '#24535a');
      ctx.globalAlpha = .65 + this.flash * .35;
      ellipse(ctx, 0, -77, 12, 3.2, energy); ctx.globalAlpha = 1;
      if (this.flash > .04) {
        ctx.save(); ctx.globalAlpha = this.flash; ctx.globalCompositeOperation = 'lighter';
        const muzzle = ctx.createRadialGradient(0, -87, 0, 0, -87, 68);
        muzzle.addColorStop(0, '#ffffff'); muzzle.addColorStop(.13, '#fff4b4');
        muzzle.addColorStop(.37, hot ? 'rgba(255,213,100,.76)' : 'rgba(137,255,213,.7)'); muzzle.addColorStop(1, 'rgba(92,242,206,0)');
        ellipse(ctx, 0, -87, 62, 68, muzzle);
        path(ctx, [[-17, -76], [-18, -105], [-30, -119], [-8, -113], [0, -143], [8, -113], [29, -119], [18, -101], [17, -76]], '#fff6c9');
        ellipse(ctx, 0, -88, 20, 21, '#ffffff'); ctx.restore();
      }
      ctx.restore();
      ellipse(ctx, 0, 4, 39, 31, gradient(ctx, -29, -23, 29, 36, ['#fff0b4', '#bc9457', '#465b50']));
      ellipse(ctx, 0, 4, 31, 26, '#14333d');
      const crystal = ctx.createRadialGradient(-8, -6, 0, 0, 5, 26);
      crystal.addColorStop(0, hot ? '#fff4c3' : '#b9ffe0'); crystal.addColorStop(.4, hot ? '#d9a857' : '#35ac92'); crystal.addColorStop(1, '#123a45');
      ellipse(ctx, 0, 4, 25, 21, crystal);
      ctx.strokeStyle = '#f0d99a'; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.arc(0, 4, 32, Math.PI * 1.13, Math.PI * 1.87); ctx.stroke();
      path(ctx, [[0, -6], [9, 4], [0, 15], [-9, 4]], '#ffe9a7', '#a57d3b', 1);
      path(ctx, [[0, -2], [4.5, 4], [0, 10], [-4.5, 4]], energy);
      ellipse(ctx, -8, -6, 8, 3, 'rgba(255,255,235,.58)', -.45);
      ctx.restore();
    }
    drawFloats(ctx) {
      for (const f of this.floats) {
        const p = f.age / f.life, pop = 1 + Math.sin(Math.min(1, f.age * 5) * Math.PI) * .24;
        ctx.save(); ctx.translate(f.x, f.y - Math.min(1, p * 1.4) * 52); ctx.scale(pop * f.scale, pop * f.scale);
        ctx.globalAlpha = Math.min(1, (1 - p) * 3); ctx.textAlign = 'center';
        ctx.shadowColor = '#092736'; ctx.shadowBlur = 8;
        ctx.font = '800 24px "Microsoft YaHei", system-ui, sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = '#284545'; ctx.strokeText(f.text, 0, 0); ctx.fillStyle = f.color; ctx.fillText(f.text, 0, 0);
        if (f.sub) { ctx.font = '500 10px "Microsoft YaHei", sans-serif'; ctx.fillStyle = '#fff2cd'; ctx.fillText(f.sub, 0, 18); }
        ctx.restore();
      }
    }
    drawBanner(ctx) {
      if (!this.banner) return;
      const b = this.banner, alpha = Math.min(1, b.age * 4, (b.life - b.age) * 2.5);
      ctx.save(); ctx.globalAlpha = Math.max(0, alpha); ctx.translate(WIDTH / 2, 135 - (1 - alpha) * 15);
      const g = ctx.createLinearGradient(-330, 0, 330, 0); g.addColorStop(0, 'rgba(5,27,41,0)'); g.addColorStop(.3, 'rgba(5,27,41,.86)'); g.addColorStop(.7, 'rgba(5,27,41,.86)'); g.addColorStop(1, 'rgba(5,27,41,0)');
      ctx.fillStyle = g; ctx.fillRect(-330, -40, 660, 94);
      ctx.textAlign = 'center'; ctx.shadowColor = b.color; ctx.shadowBlur = 15; ctx.fillStyle = b.color;
      ctx.font = '800 29px "Microsoft YaHei", system-ui, sans-serif'; ctx.fillText(b.text, 0, 0);
      ctx.shadowBlur = 0; ctx.font = '500 14px "Microsoft YaHei", sans-serif'; ctx.fillStyle = '#fff0d0'; ctx.fillText(b.sub, 0, 30);
      ctx.strokeStyle = b.color; ctx.globalAlpha *= .4; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-220, -31); ctx.lineTo(220, -31); ctx.moveTo(-220, 49); ctx.lineTo(220, 49); ctx.stroke();
      ctx.restore();
    }
    drawSkillOverlays(ctx) {
      const freeze = this.state.skills.freeze.active, rage = this.state.skills.rage.active;
      if (freeze > 0 || rage > 0) {
        const g = ctx.createRadialGradient(WIDTH / 2, this.height / 2, 240, WIDTH / 2, this.height / 2, Math.max(730, this.height * .75));
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, freeze > 0 ? 'rgba(113,215,255,.22)' : 'rgba(255,181,65,.17)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, WIDTH, this.height);
      }
    }
    destroy() {
      this.destroyed = true;
      if (typeof cancelAnimationFrame === 'function' && this.frame != null) cancelAnimationFrame(this.frame);
      if (this.observer) this.observer.disconnect();
      ['pointermove', 'pointerdown', 'pointerup', 'pointercancel', 'lostpointercapture'].forEach(name => this.canvas.removeEventListener(name, this.handlers[name]));
      if (typeof window !== 'undefined') ['keydown', 'keyup', 'blur', 'pointerup', 'pointercancel'].forEach(name => window.removeEventListener(name, this.handlers[name]));
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.handlers.visibilitychange);
      this.fish.length = this.bullets.length = this.particles.length = 0;
    }
  }
  FishGame.SPECIES = SPECIES;
  FishGame.drawFish = drawFish;
  FishGame.probability = probability;
  FishGame.MAX_BALANCE = MAX_BALANCE;
  return { FishGame, SPECIES, probability, normalizeChance, normalizePower, clampBalance, calculateShot, segmentCircleHit, drawFish, WIDTH, HEIGHT, MAX_BALANCE };
});
