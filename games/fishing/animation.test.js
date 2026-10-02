'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ids, frequencies, deform } = require('./animation-rigs.js');
const TAU = Math.PI * 2;

// Landmarks measured from the actual atlases, independently of the skinning
// implementation. Each pair is [rigid head/shell, active tail/fin/arm].
const anatomy = {
  whale: [[.78, .39], [.22, .30]],
  goldshark: [[.80, .43], [.20, .42]],
  lobster: [[.54, .39], [.72, .72]],
  octopus: [[.52, .32], [.22, .71]],
  ray: [[.70, .55], [.55, .15]],
  seahorse: [[.57, .30], [.54, .73]],
  crab: [[.52, .52], [.27, .76]],
  dragonfish: [[.78, .48], [.28, .42]],
  clownfish: [[.69, .50], [.25, .50]],
  tang: [[.73, .50], [.28, .50]],
  butterfly: [[.71, .53], [.27, .51]],
  turtle: [[.51, .48], [.47, .75]],
};

function trajectory(id, point, samples = 64) {
  return Array.from({ length: samples }, (_, i) => deform(id, ...point, i * TAU / samples));
}

function amplitude(points) {
  const average = points.reduce((sum, point) => [sum[0] + point[0] / points.length, sum[1] + point[1] / points.length], [0, 0]);
  return Math.sqrt(points.reduce((sum, point) => sum + (point[0] - average[0]) ** 2 + (point[1] - average[1]) ** 2, 0) / points.length);
}

function signedArea(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

test('all twelve illustrated creatures have an independent, finite swim cadence', () => {
  assert.deepEqual([...ids].sort(), Object.keys(anatomy).sort());
  for (const id of ids) {
    assert.ok(Number.isFinite(frequencies[id]) && frequencies[id] > 0 && frequencies[id] < 4, id);
  }
  assert.ok(frequencies.whale < frequencies.clownfish, 'the large whale strokes more slowly than the small reef fish');
});

test('deformation remains finite and inside the padded sprite envelope over the full swim cycle', () => {
  for (const id of ids) {
    for (let frame = 0; frame < 48; frame++) {
      for (let y = 0; y <= 20; y++) {
        for (let x = 0; x <= 28; x++) {
          const u = x / 28, v = y / 20;
          const point = deform(id, u, v, frame * TAU / 48);
          assert.ok(Array.isArray(point) && point.length === 2 && point.every(Number.isFinite), `${id}: invalid vertex`);
          assert.ok(Math.hypot(point[0] - u, point[1] - v) < .17, `${id}: extreme displacement at ${u},${v}`);
          assert.ok(point.every(value => value >= -.14 && value <= 1.14), `${id}: leaves the renderer's 14% safety padding`);
        }
      }
    }
  }
});

test('both production and fallback meshes stay unfolded throughout the swim cycle', () => {
  for (const [columns, rows] of [[28, 20], [24, 16], [14, 10]]) {
    for (const id of ids) {
      for (let frame = 0; frame < 48; frame++) {
        const phase = frame * TAU / 48;
        const vertices = Array.from({ length: rows + 1 }, (_, y) => Array.from({ length: columns + 1 }, (_, x) => deform(id, x / columns, y / rows, phase)));
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < columns; x++) {
            const a = vertices[y][x], b = vertices[y][x + 1], c = vertices[y + 1][x], d = vertices[y + 1][x + 1];
            const label = `${id}, ${columns}×${rows}, frame ${frame}, cell ${x},${y}`;
            // A positive signed area preserves winding and prevents triangles
            // turning inside out, which otherwise creates visible flashing.
            assert.ok(signedArea(a, b, c) > 1e-8, `folded upper triangle: ${label}`);
            assert.ok(signedArea(b, d, c) > 1e-8, `folded lower triangle: ${label}`);
            assert.ok(Math.hypot(b[0] - a[0], b[1] - a[1]) < 4 / columns, `horizontal skin tear: ${label}`);
            assert.ok(Math.hypot(c[0] - a[0], c[1] - a[1]) < 4 / rows, `vertical skin tear: ${label}`);
          }
        }
      }
    }
  }
});

test('animation loops seamlessly and does not snap at the wrap boundary', () => {
  for (const id of ids) {
    const points = [...anatomy[id], [.2, .2], [.5, .5], [.8, .8]];
    for (const point of points) {
      for (const phase of [-1.3, 0, .4, 3.2, 7]) {
        const a = deform(id, ...point, phase), b = deform(id, ...point, phase + TAU);
        assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-10, `${id}: cycle does not repeat`);
      }
      const before = deform(id, ...point, TAU - 1e-5), after = deform(id, ...point, 1e-5);
      assert.ok(Math.hypot(before[0] - after[0], before[1] - after[1]) < 1e-4, `${id}: loop boundary snaps`);
    }
  }
});

test('visible limbs move while faces and plated torsos stay stable', () => {
  for (const id of ids) {
    const [anchor, limb] = anatomy[id];
    const headAmplitude = amplitude(trajectory(id, anchor));
    const limbAmplitude = amplitude(trajectory(id, limb));
    assert.ok(limbAmplitude > .002, `${id}: limb animation is not visible`);
    assert.ok(headAmplitude < .008, `${id}: face or rigid shell is wobbling`);
    assert.ok(headAmplitude < limbAmplitude * .35, `${id}: motion behaves like a uniformly moving sticker`);
  }
});

test('paired limbs retain their own stroke timing rather than translating together', () => {
  const pairs = {
    octopus: [[.29, .69], [.79, .75]],
    crab: [[.29, .74], [.76, .76]],
    turtle: [[.45, .79], [.81, .69]],
    lobster: [[.57, .71], [.84, .62]],
    ray: [[.54, .24], [.35, .74]],
  };
  for (const [id, [a, b]] of Object.entries(pairs)) {
    const first = trajectory(id, a), second = trajectory(id, b);
    assert.ok(amplitude(first) > .005 && amplitude(second) > .005, `${id}: a paired limb is frozen`);
    const relativeMotion = first.map((point, index) => [point[0] - second[index][0], point[1] - second[index][1]]);
    assert.ok(amplitude(relativeMotion) > .008, `${id}: both limbs have identical motion`);
  }
});

test('unrecognized species preserve their original coordinates', () => {
  for (const point of [[0, 0], [.37, .65], [1, 1]]) {
    assert.deepEqual(deform('unrecognized-creature', ...point, 1.2), point);
  }
});
