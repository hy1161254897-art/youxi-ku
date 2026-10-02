'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { FishGame, SPECIES, probability, normalizeChance, normalizePower, clampBalance, calculateShot, segmentCircleHit, MAX_BALANCE } = require('./engine.js');

function makeGame(options = {}) {
  const listeners = new Map();
  const canvas = {
    width: 1200, height: 720, getContext: () => ({}),
    getBoundingClientRect: () => ({ width: 1200, height: 720, left: 0, top: 0 }),
    addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name)
  };
  const events = [], game = new FishGame(canvas, { ...options, onEvent: e => events.push(e) });
  return { game, events, listeners };
}

test('capture probability: original, boost addition, saturation and guaranteed mode', () => {
  assert.equal(probability(.05, 'original'), .05);
  assert.equal(probability(.05, '1'), .1);
  assert.equal(probability(.05, '10'), .55);
  assert.equal(probability(.65, '10'), 1);
  assert.equal(probability(0, 'sure'), 1);
  assert.equal(probability(-1, 'original'), 0);
  assert.equal(probability(NaN, 'original'), 0);
  assert.equal(probability(.25, 'unexpected'), .25);
});

test('currency and power normalize non-finite, negative and extreme input', () => {
  assert.equal(normalizePower(Infinity), 10);
  assert.equal(normalizePower(-30), 1);
  assert.equal(normalizePower(100000), 1000);
  assert.equal(normalizePower('19.9'), 19);
  assert.equal(clampBalance(-1), 0);
  assert.equal(clampBalance(NaN), 0);
  assert.equal(clampBalance(Number.MAX_SAFE_INTEGER), MAX_BALANCE);
  assert.equal(normalizeChance('11'), 'original');
  assert.equal(normalizeChance(4), '4');
});

test('shot accounting never spends funds a player does not have', () => {
  assert.deepEqual(calculateShot(9, 10), { ok: false, balance: 9, cost: 10 });
  assert.deepEqual(calculateShot(10, 10), { ok: true, balance: 0, cost: 10 });
  assert.deepEqual(calculateShot(20000, 500), { ok: true, balance: 19500, cost: 500 });
});

test('continuous collision detects pass-through, tangent, overlap and misses', () => {
  assert.equal(segmentCircleHit(0, 0, 100, 0, 50, 0, 10), .4);
  assert.equal(segmentCircleHit(0, 10, 100, 10, 50, 0, 10), .5);
  assert.equal(segmentCircleHit(50, 0, 100, 0, 50, 0, 10), 0);
  assert.equal(segmentCircleHit(0, 11, 100, 11, 50, 0, 10), null);
  assert.equal(segmentCircleHit(0, 0, 1, 0, 50, 0, 10), null);
  assert.equal(segmentCircleHit(0, 0, 0, 0, 50, 0, 10), null);
});

test('shots are charged once, rate-limited, and snapshot power and probability', () => {
  const { game } = makeGame({ balance: 100, power: 10, chance: 'sure' });
  assert.equal(game.shoot(), false);
  game.start(); assert.equal(game.shoot(), true);
  assert.equal(game.state.balance, 90); assert.equal(game.state.totalSpent, 10);
  assert.equal(game.shoot(), false); assert.equal(game.bullets.length, 1);
  game.setPower(100); game.setChance('original');
  assert.equal(game.bullets[0].power, 10); assert.equal(game.bullets[0].chance, 'sure');
  game.pause(true); game.shotTimer = 0; assert.equal(game.shoot(), false);
  game.destroy();
});

test('guaranteed splash captures every affected fish once and awards original shot bet', () => {
  const { game } = makeGame({ balance: 100, power: 10, chance: 'sure' });
  game.start(); game.fish = [];
  const a = game.spawnFish(SPECIES[0], true, { x: 400, y: 300 });
  game.spawnFish(SPECIES[1], true, { x: 420, y: 300 });
  game.spawnFish(SPECIES[3], true, { x: 900, y: 300 });
  assert.equal(game.shoot(), true);
  const shot = game.bullets[0]; game.setPower(500); game.setChance('original');
  game.burst(shot, 400, 300, a);
  assert.equal(game.state.totalCaught, 2); assert.equal(game.state.totalEarned, 60);
  assert.equal(game.state.balance, 150);
  game.burst(shot, 400, 300, a);
  assert.equal(game.state.totalCaught, 2); assert.equal(game.state.balance, 150);
  assert.equal(game.state.catches.minnow, 1); assert.equal(game.state.catches.clownfish, 1);
  game.destroy();
});

test('empty balance disables automatic fire and emits one actionable event', () => {
  const { game, events } = makeGame({ balance: 2, power: 10 });
  game.start(); game.setAuto(true);
  assert.equal(game.shoot(), false); assert.equal(game.state.auto, false);
  game.shoot(); assert.equal(events.filter(e => e.type === 'empty').length, 1);
  assert.equal(game.state.balance, 2); assert.equal(game.state.totalSpent, 0);
  game.destroy();
});

test('skills consume cooldown once; pause freezes timers and shots', () => {
  const { game } = makeGame();
  assert.equal(game.useSkill('freeze'), false);
  game.start(); assert.equal(game.useSkill('freeze'), true);
  assert.equal(game.useSkill('freeze'), false); assert.equal(game.useSkill('unknown'), false);
  game.update(1); assert.equal(game.state.skills.freeze.active, 6);
  game.pause(true); game.update(10); assert.equal(game.state.skills.freeze.active, 6);
  assert.equal(game.state.elapsed, 1);
  game.destroy();
});

test('state snapshots are detached and persisted statistics remain valid', () => {
  const { game } = makeGame({ stats: { totalCaught: 7, totalEarned: 90, elapsed: 95, bestCombo: 12, catches: { minnow: 3, dragonfish: -5 } } });
  const state = game.getState(); state.catches.minnow = 500; state.skills.freeze.cooldown = 400;
  assert.equal(game.state.catches.minnow, 3); assert.equal(game.state.catches.dragonfish, 0);
  assert.equal(game.state.skills.freeze.cooldown, 0); assert.equal(game.state.totalCaught, 7);
  assert.equal(game.state.elapsed, 95); assert.equal(game.state.bestCombo, 12);
  game.destroy();
});

test('portrait resize retains isotropic fish scale and maps pointer coordinates correctly', () => {
  const { game, listeners } = makeGame();
  game.canvas.getBoundingClientRect = () => ({ width: 400, height: 500, left: 0, top: 0 });
  game.resize();
  assert.equal(game.height, 1500);
  assert.equal(game.canvas.width / 1200, game.canvas.height / game.height);
  listeners.get('pointermove')({ clientX: 200, clientY: 250 });
  assert.equal(game.aim.x, 600); assert.equal(game.aim.y, 750);
  game.destroy();
});

test('touch controls retain the first finger and stop firing when capture is lost', () => {
  const { game, listeners } = makeGame();
  game.start();
  const point = (pointerId, clientX = 400) => ({ pointerId, clientX, clientY: 300, button: 0, preventDefault() {} });
  listeners.get('pointerdown')(point(1));
  assert.equal(game.pointerDown, true);
  listeners.get('pointerdown')(point(2, 800));
  listeners.get('pointermove')(point(2, 800));
  listeners.get('pointerup')(point(2));
  assert.equal(game.aim.x, 400);
  assert.equal(game.pointerDown, true);
  listeners.get('lostpointercapture')(point(1));
  assert.equal(game.pointerDown, false);
  assert.equal(game.activePointerId, null);
  const spent = game.state.totalSpent;
  game.update(.2);
  assert.equal(game.state.totalSpent, spent);
  listeners.get('pointerdown')(point(3));
  listeners.get('pointercancel')(point(3));
  assert.equal(game.pointerDown, false);
  game.destroy();
});

test('orientation resize releases held input, rescales swim lanes, and ignores hidden canvas size', () => {
  const { game, listeners } = makeGame();
  game.start();
  const fish = game.fish[0], beforeY = fish.y, beforeLane = fish.locomotion.laneY;
  listeners.get('pointerdown')({ pointerId: 8, clientX: 200, clientY: 200, button: 0, preventDefault() {} });
  game.canvas.getBoundingClientRect = () => ({ width: 390, height: 540, left: 0, top: 0 });
  game.resize();
  const ratio = game.height / 720;
  assert.equal(fish.y, beforeY * ratio);
  assert.equal(fish.locomotion.laneY, beforeLane * ratio);
  assert.equal(game.pointerDown, false);
  assert.equal(game.activePointerId, null);
  const height = game.height;
  game.canvas.getBoundingClientRect = () => ({ width: 0, height: 0, left: 0, top: 0 });
  game.resize();
  assert.equal(game.height, height);
  game.destroy();
});

test('continuous auto-fire simulation remains bounded and currency stays nonnegative', () => {
  const { game } = makeGame({ balance: 100000, power: 10, chance: 'sure' });
  game.start(); game.setAuto(true); game.setLock(true);
  for (let i = 0; i < 6000; i++) game.update(1 / 60);
  assert.ok(game.state.totalCaught > 0);
  assert.ok(game.state.totalSpent > 0);
  assert.ok(game.state.balance >= 0);
  assert.equal(game.state.balance, 100000 - game.state.totalSpent + game.state.totalEarned);
  assert.ok(game.fish.length <= 54); assert.ok(game.particles.length <= 720);
  assert.ok(game.bullets.length < 40);
  assert.ok(game.state.bossIn > 0 && game.state.bossIn <= 75);
  game.destroy();
});

test('wave and boss fish use visible spawn rows on compact and portrait canvases', () => {
  for (const height of [280, 420, 1296]) {
    const { game } = makeGame();
    game.canvas.getBoundingClientRect = () => ({ width: 1200, height, left: 0, top: 0 });
    game.resize(); game.fish = []; game.start();
    game.startWave(); game.startBoss();
    assert.equal(game.fish.length, 16);
    for (const fish of game.fish) {
      assert.ok(fish.y > 0 && fish.y < height - 95, `${fish.species.id} must spawn above cannon in height ${height}`);
    }
    const boss = game.fish.find(f => f.boss);
    for (let i = 0; i < 500; i++) game.update(1 / 30);
    assert.ok(boss.x > 0 && boss.x < 1200, `boss should enter viewport in height ${height}`);
    assert.ok(boss.y > 0 && boss.y < height - 85);
    game.destroy();
  }
});

test('empty-wallet pause callback halts pending bullets within the same update', () => {
  const { game } = makeGame({ balance: 10, chance: 'sure' });
  game.start(); game.fish = [];
  game.shoot(); const shot = game.bullets[0];
  game.shotTimer = 0; game.setAuto(true);
  game.onEvent = event => { if (event.type === 'empty') game.pause(true); };
  const x = shot.x, y = shot.y;
  game.update(1 / 60);
  assert.equal(game.state.paused, true); assert.equal(shot.x, x); assert.equal(shot.y, y);
  game.destroy();
});

test('every fish species is unique, drawable and has bounded original probability', () => {
  assert.equal(SPECIES.length, 17); assert.equal(new Set(SPECIES.map(s => s.id)).size, SPECIES.length);
  for (const s of SPECIES) { assert.ok(s.chance > 0 && s.chance <= 1); assert.ok(s.reward > 0); assert.equal(s.colors.length, 3); assert.ok(s.shape); }
});

test('swimming stays smooth, forward and within the water at different viewport heights', () => {
  const { game } = makeGame();
  for (const height of [280, 720, 1296]) {
    game.height = height; game.fish = [];
    for (const species of SPECIES) {
      for (const direction of [-1, 1]) {
        const fish = game.spawnFish(species, true, { vx: direction * species.speed, vy: 0 });
        const bounds = game.fishYBounds(species);
        let curved = false;
        for (let frame = 0; frame < 1200; frame++) {
          const x = fish.x, y = fish.y, angle = fish.heading, vx = fish.vx;
          game.updateFishMotion(fish, 1 / 60, false);
          assert.ok((fish.x - x) * direction > 0, `${species.id} always moves forward`);
          assert.ok(fish.y >= bounds.top && fish.y <= bounds.bottom, `${species.id} remains in its water bounds`);
          assert.ok(Math.abs(fish.heading - angle) < .015, `${species.id} turns without snapping`);
          assert.ok(Math.abs(fish.vx - vx) < species.speed * .12, `${species.id} accelerates smoothly`);
          assert.ok(Math.abs(fish.vx - (fish.x - x) * 60) < 1e-7);
          assert.ok(Math.abs(fish.vy - (fish.y - y) * 60) < 1e-7);
          assert.ok(fish.swim.cadence <= 2 && fish.swim.cadence > 0);
          assert.ok(Math.abs(fish.locomotion.tilt) < Math.PI / 9, 'fish stay upright on curved paths');
          curved ||= Math.abs(fish.y - y) > .0001;
        }
        assert.ok(curved, `${species.id} follows a curved swimming lane`);
      }
    }
  }
  game.destroy();
});

test('freeze slows the swim stroke and actual velocity together; pause stops both', () => {
  const { game } = makeGame(); game.start(); game.fish = [];
  const fish = game.spawnFish(SPECIES[0], true, { x: 500, y: 300, vx: 70, vy: 0 });
  const frozen = JSON.parse(JSON.stringify(fish));
  const startPhase = fish.swim.phase;
  game.updateFishMotion(fish, 1 / 60, false);
  game.updateFishMotion(frozen, 1 / 60, true);
  assert.ok(Math.abs((frozen.swim.phase - startPhase) / (fish.swim.phase - startPhase) - .12) < 1e-8);
  assert.ok(frozen.swim.speed / fish.swim.speed > .115 && frozen.swim.speed / fish.swim.speed < .125);
  assert.ok(Math.abs(frozen.vx - (frozen.x - 500) * 60) < 1e-8, 'freeze velocity includes the slowdown exactly once');
  game.pause(true);
  const before = { x: fish.x, y: fish.y, phase: fish.swim.phase, age: fish.age };
  game.update(2);
  assert.deepEqual({ x: fish.x, y: fish.y, phase: fish.swim.phase, age: fish.age }, before);
  game.destroy();
});

test('individual strokes vary and slow large animals use longer propulsion cycles', () => {
  const { game } = makeGame(); game.fish = [];
  const small = Array.from({ length: 12 }, () => game.spawnFish(SPECIES[0], true));
  assert.equal(new Set(small.map(f => f.swim.phase)).size, small.length);
  assert.ok(new Set(small.map(f => f.locomotion.laneY)).size > 1);
  const whale = game.spawnFish(SPECIES.find(s => s.id === 'whale'), true);
  const ray = game.spawnFish(SPECIES.find(s => s.id === 'ray'), true);
  assert.ok(whale.swim.cadence < 1 && ray.swim.cadence < 1);
  assert.ok(small.every(f => f.swim.cadence > 1.5));
  const lobster = game.spawnFish(SPECIES.find(s => s.id === 'lobster'), true);
  const crab = game.spawnFish(SPECIES.find(s => s.id === 'crab'), true);
  assert.ok(lobster.swim.cadence > .85 && lobster.swim.cadence < 1.03);
  assert.ok(crab.swim.cadence > .96 && crab.swim.cadence < 1.14, 'double-phase leg strokes stay unhurried');
  game.destroy();
});

test('wave overrides retain their stroke phase and faster forward cruising speed', () => {
  const { game } = makeGame(); game.fish = [];
  game.startWave();
  for (let i = 0; i < game.fish.length; i++) {
    const fish = game.fish[i], initialX = fish.x;
    assert.equal(fish.swim.phase, i * .3);
    assert.equal(fish.locomotion.cruise, 110);
    game.updateFishMotion(fish, 1, false);
    assert.ok(Math.abs(fish.x - initialX) > 90 && Math.abs(fish.x - initialX) < 125);
  }
  game.destroy();
});
