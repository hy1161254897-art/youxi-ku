'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const Engine = require('./engine.js');

function rng(seed = 42) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

function assertInvariant(e) {
  const s = e.state, counts = Array(27).fill(0);
  const add = t => { assert(Number.isInteger(t) && t >= 0 && t < 27, `bad tile ${t}`); counts[t]++; };
  s.wall.forEach(add);
  for (const p of s.players) {
    p.hand.forEach(add); p.discards.forEach(add);
    p.melds.forEach(m => { for (let n = 0; n < (m.type === 'peng' ? 3 : 4); n++) add(m.tile); });
    assert(Number.isInteger(p.delta));
    if (!p.won && s.phase !== 'ended') {
      const expected = 13 - 3 * p.melds.length + ((s.phase === 'playing' || s.phase === 'dingque' || (s.response && s.response.kind === 'bugang')) && s.turn === p.id ? 1 : 0);
      assert.equal(p.hand.length, expected, `player ${p.id} hand at ${s.phase}, turn ${s.turn}`);
    }
  }
  assert.deepEqual(counts, Array(27).fill(4), 'physical tile conservation');
  assert.equal(s.players.reduce((a, p) => a + p.delta, 0), 0, 'zero sum settlement');
  assert.equal(new Set(s.winners).size, s.winners.length);
}

function rig({ hands = {}, melds = {}, missing = [2, 2, 2, 2], turn = 0, wallTail = [] } = {}) {
  const e = new Engine({ rng: rng(8), base: 10, difficulty: 'normal' });
  e.start();
  const counts = Array(27).fill(4);
  const take = t => { counts[t]--; assert(counts[t] >= 0, `rig has too many ${t}`); };
  for (const hand of Object.values(hands)) hand.forEach(take);
  for (const list of Object.values(melds)) list.forEach(m => Array(m.type === 'peng' ? 3 : 4).fill(m.tile).forEach(take));
  wallTail.forEach(take);
  for (let id = 0; id < 4; id++) {
    const p = e.state.players[id];
    p.melds = melds[id] || [];
    p.hand = hands[id] ? hands[id].slice() : [];
    if (!hands[id]) {
      const needed = 13 - 3 * p.melds.length + (turn === id ? 1 : 0);
      for (let t = 26; t >= 0 && p.hand.length < needed; t--) while (counts[t] && p.hand.length < needed) {
        p.hand.push(t); take(t);
      }
    }
    p.hand.sort((a, b) => a - b);
    p.discards = [];
    p.missing = missing[id];
  }
  e.state.wall = counts.flatMap((n, t) => Array(n).fill(t)).concat(wallTail);
  e.state.phase = 'playing'; e.state.turn = turn; e.state.drawnTile = e.state.players[turn].hand.at(-1);
  assertInvariant(e);
  return e;
}

const standard = [0, 1, 2, 3, 4, 5, 9, 10, 11, 12, 12, 12, 17, 17];
const pairs = [0, 0, 1, 1, 3, 3, 4, 4, 9, 9, 10, 10, 12, 12];

test('ordinary, open, seven-pair and dragon-seven-pair wins obey missing suit and tile limits', () => {
  assert(Engine.isWinning(standard, [], 2));
  assert(!Engine.isWinning(standard, [], 0));
  assert(Engine.isWinning(pairs, [], 2));
  assert(Engine.isWinning([0, 0, 0, 0, 1, 1, 2, 2, 9, 9, 10, 10, 11, 11], [], 2));
  assert(!Engine.isWinning(standard.slice(1), [], 2));
  assert(Engine.isWinning([0, 1, 2, 3, 4, 5, 9, 10, 11, 17, 17], [{ type: 'peng', tile: 12 }], 2));
  assert(!Engine.isWinning([0, 0], Array(4).fill({ type: 'peng', tile: 0 }), 2));
  assert.deepEqual(Engine.winningTiles(standard.slice(0, -1), [], 2), [17]);
  assert.equal(Engine.shanten(standard), -1);
  assert.equal(Engine.shanten(standard.slice(0, -1)), 0);
  assert.equal(Engine.shanten([0, 0, 0, 0, 1, 1, 2, 2, 9, 9, 10, 10, 11]), 0);
});

test('scoring documents compound fans and caps at 32×', () => {
  assert.equal(Engine.scoreHand(standard).multiplier, 1);
  assert.equal(Engine.scoreHand(standard, [], { selfDraw: true, base: 25 }).unitAmount, 50);
  assert.equal(Engine.scoreHand(pairs).multiplier, 4);
  const info = Engine.scoreHand([0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3], [], { selfDraw: true, afterGang: true });
  assert.equal(info.multiplier, 32); assert(info.capped); assert(info.tags.includes('七对')); assert(info.tags.includes('3根'));
});

test('start and illegal inputs preserve state; missing tiles must be discarded first', () => {
  const e = new Engine({ rng: rng(9) }); e.start(); assertInvariant(e);
  const before = JSON.stringify(e.snapshot());
  assert.equal(e.act('discard', e.state.players[0].hand[0]), false);
  assert.equal(e.act('dingque', 7), false);
  assert.equal(JSON.stringify(e.snapshot()), before);
  const missing = Math.floor(e.state.players[0].hand[0] / 9);
  assert(e.act('dingque', missing));
  assert(e.getActions().every(a => a.type === 'discard' && Math.floor(a.tile / 9) === missing));
  assert.equal(e.act('discard', 99), false); assertInvariant(e);
});

test('self draw pays only players still in blood battle and advances to an active player', () => {
  const e = rig({ hands: { 0: standard } });
  e.state.players[2].won = true; e.state.winners = [2];
  assert(e.act('hu'));
  assert.equal(e.state.players[0].delta, 40);
  assert.equal(e.state.players[1].delta, -20);
  assert.equal(e.state.players[2].delta, 0);
  assert.equal(e.state.players[3].delta, -20);
  assert.equal(e.state.turn, 1); assertInvariant(e);
});

test('one discard can pay multiple winners and winning references do not duplicate physical tiles', () => {
  const wait1 = [0, 1, 2, 3, 4, 5, 9, 10, 11, 12, 12, 12, 17];
  const wait2 = [0, 1, 2, 3, 4, 5, 9, 10, 11, 13, 13, 13, 17];
  const e = rig({ hands: { 0: [17, 18, 18, 18, 19, 19, 19, 20, 20, 20, 21, 21, 21, 22], 1: wait1, 2: wait2 }, missing: [0, 2, 2, 2] });
  assert(e.act('discard', 17)); assert.equal(e.state.phase, 'response'); assert(e.step());
  assert.deepEqual(e.state.winners, [1, 2]);
  assert.equal(e.state.players[0].delta, -20); assert.equal(e.state.players[1].delta, 10); assert.equal(e.state.players[2].delta, 10);
  assertInvariant(e);
});

test('human response stops automation; peng consumes the discard and requires a legal discard', () => {
  const e = rig({ turn: 1, hands: { 0: [0, 0, 1, 2, 4, 5, 7, 9, 10, 12, 13, 15, 17], 1: [0, 3, 3, 3, 6, 6, 6, 11, 11, 11, 16, 16, 16, 18] }, missing: [2, 1, 2, 2] });
  e._executeTurn(1, 'discard', 0);
  assert(e.needsHuman()); assert(e.getActions().some(a => a.type === 'peng'));
  const snapshot = JSON.stringify(e.snapshot()); assert.equal(e.step(), false); assert.equal(JSON.stringify(e.snapshot()), snapshot);
  assert(e.act('peng')); assert.equal(e.state.turn, 0); assert.equal(e.state.phase, 'playing');
  assert.equal(e.state.players[0].melds[0].type, 'peng');
  assert.equal(e.state.players[1].discards.length, 0); assertInvariant(e);
});

test('declining ron to peng cannot be relabeled as a self draw', () => {
  const e = rig({ turn: 1, hands: { 0: [0, 0, 1, 2, 3, 4, 5, 6, 9, 10, 11, 17, 17], 1: [0, 3, 3, 3, 6, 6, 6, 11, 11, 11, 16, 16, 16, 18] }, missing: [2, 1, 2, 2] });
  e._executeTurn(1, 'discard', 0);
  assert(e.getActions().some(a => a.type === 'hu'));
  assert(e.act('peng')); assert.equal(e.state.drawnTile, null);
  assert(!e.getActions().some(a => a.type === 'hu')); assert.equal(e.act('hu'), false); assertInvariant(e);
});

test('暗杠, 明杠 and 补杠 move four physical tiles and draw a replacement with correct money', () => {
  let e = rig({ hands: { 0: [0, 0, 0, 0, 1, 2, 3, 4, 5, 9, 10, 11, 16, 17] }, wallTail: [15] });
  assert(e.act('angang', 0)); assert.equal(e.state.players[0].delta, 60); assert.equal(e.state.drawnTile, 15); assert(e.state.afterGang); assertInvariant(e);
  e = rig({ turn: 1, hands: { 0: [0, 0, 0, 1, 2, 4, 5, 7, 9, 10, 12, 13, 17], 1: [0, 3, 3, 3, 6, 6, 6, 11, 11, 11, 16, 16, 16, 18] }, missing: [2, 1, 2, 2], wallTail: [15] });
  e._executeTurn(1, 'discard', 0); assert(e.act('gang'));
  assert.equal(e.state.players[0].delta, 20); assert.equal(e.state.players[1].delta, -20); assert.equal(e.state.drawnTile, 15); assertInvariant(e);
  e = rig({ hands: { 0: [0, 1, 2, 4, 5, 7, 9, 10, 12, 13, 17] }, melds: { 0: [{ type: 'peng', tile: 0, from: 1 }] }, wallTail: [15] });
  assert(e.act('bugang', 0)); if (e.state.phase === 'response') e.step();
  assert.equal(e.state.players[0].melds[0].type, 'bugang'); assert.equal(e.state.players[0].delta, 30); assert.equal(e.state.drawnTile, 15); assertInvariant(e);
});

test('抢杠胡 cancels kong, keeps the original peng and pays the winning player', () => {
  const e = rig({ hands: { 0: [17, 0, 2, 4, 6, 8, 9, 11, 13, 15, 16], 1: [0, 1, 2, 3, 4, 5, 9, 10, 11, 12, 12, 15, 16] }, melds: { 0: [{ type: 'peng', tile: 17, from: 2 }] } });
  assert(e.act('bugang', 17)); assert.equal(e.state.response.kind, 'bugang'); assert(e.step());
  assert.equal(e.state.players[0].melds[0].type, 'peng'); assert(e.state.players[1].won);
  assert.equal(e.state.players[1].delta, 20); assert.equal(e.state.players[0].delta, -20);
  assert(e.state.players[1].winInfo.tags.includes('抢杠胡')); assertInvariant(e);
});

test('snapshot round-trips a pending human response and rejects corrupted counts', () => {
  const e = rig({ turn: 1, hands: { 0: [0, 0, 1, 2, 4, 5, 7, 9, 10, 12, 13, 15, 17], 1: [0, 3, 3, 3, 6, 6, 6, 11, 11, 11, 16, 16, 16, 18] }, missing: [2, 1, 2, 2] });
  e._executeTurn(1, 'discard', 0);
  const restored = Engine.restore(e.snapshot(), { rng: rng(2) });
  assert.deepEqual(restored.getActions(), e.getActions()); assert.deepEqual(restored.state, e.state);
  assert(restored.act('peng')); assertInvariant(restored);
  const bad = e.snapshot(); bad.state.wall.pop(); assert.throws(() => Engine.restore(bad), /牌数/);
});

test('last-wall turn cannot kong; exhaustion settles safely without drawing undefined', () => {
  const e = rig({ hands: { 0: [0, 0, 0, 0, 1, 2, 3, 4, 5, 9, 10, 11, 16, 17] } });
  e.state.players[3].discards.push(...e.state.wall.splice(0));
  assert(!e.getActions().some(a => ['gang', 'angang', 'bugang'].includes(a.type)));
  assert(e.act('discard', 17));
  while (e.state.phase === 'response' && !e.needsHuman()) e.step();
  assert.equal(e.state.phase, 'ended'); assert(e.state.result.isDraw); assertInvariant(e);
});

test('draw settlement combines 花猪, 查大叫 and 退税 with exact zero-sum transfers', () => {
  const e = rig({ hands: { 0: standard.slice(0, -1).concat(18), 1: [0, 0, 2, 2, 4, 4, 6, 7, 9, 11, 13, 15, 17] } });
  const p = e.state.players[0]; p.hand.splice(p.hand.indexOf(18), 1); p.discards.push(18);
  e.state.players[3].discards.push(...e.state.wall.splice(0));
  e._transfer(1, 2, 20, 'gang');
  e._end('测试流局', true);
  assert.deepEqual(e.state.players.map(p => p.delta), [330, 310, -320, -320]);
  assert.equal(e.state.result.drawSettlement.refunds.length, 1);
  assert(e.state.result.drawSettlement.records[0].ready);
  assert(!e.state.result.drawSettlement.records[1].ready); assertInvariant(e);
});

test('hard AI and Hint depend on public information, not opponent hands or wall order', () => {
  const e = rig({ hands: { 0: [0, 0, 1, 2, 3, 4, 5, 7, 9, 10, 12, 13, 16, 17] } });
  const first = e.hint();
  [e.state.players[1].hand, e.state.players[2].hand] = [e.state.players[2].hand, e.state.players[1].hand];
  e.state.wall.reverse();
  assert.equal(e.hint(), first); assertInvariant(e);
});

test('full deterministic games terminate, preserve 108 tiles and zero-sum money at every step', () => {
  for (const difficulty of ['easy', 'normal', 'hard']) for (let seed = 1; seed <= 4; seed++) {
    const e = new Engine({ difficulty, rng: rng(seed * 73), base: 7 }); e.start();
    e.act('dingque', e._chooseMissing(e.state.players[0]));
    let steps = 0;
    while (e.state.phase !== 'ended' && steps++ < 600) {
      assertInvariant(e);
      if (e.needsHuman()) {
        const actions = e.getActions();
        const selected = actions.find(a => a.type === 'hu') || actions.find(a => ['angang', 'bugang', 'gang'].includes(a.type));
        if (selected) assert(e.act(selected.type, selected.tile));
        else if (e.state.phase === 'response') assert(e.act('pass'));
        else assert(e.act('discard', e._aiDiscard(0, difficulty)));
      } else assert(e.step());
    }
    assert(steps < 600, `did not terminate ${difficulty}/${seed}`);
    assertInvariant(e); assert.equal(e.state.phase, 'ended');
    assert.deepEqual(e.state.result.deltas, e.state.players.map(p => p.delta));
    assert.deepEqual(Engine.restore(e.snapshot()).state, e.state);
  }
});
