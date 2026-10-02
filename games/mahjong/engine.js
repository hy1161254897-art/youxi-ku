/*
 * 贺义四川麻将 · original, dependency-free rules engine.
 * 108 tiles, three suits, 定缺 / 碰 / 杠 / 血战到底, no 吃 or 换三张.
 * Base score × 2^fan, capped at 5 fan (32×): 平胡 0, 对对胡 +1,
 * 七对 +2, 清一色 +2, 金钩钓 +1, each 根 +1, 自摸 +1,
 * 杠上花 +1, 抢杠胡 +1. A 根 means four copies across your hand/melds.
 * 自摸: each other un-won player pays. 点炮/抢杠: discarder pays each winner.
 * 明杠: discarder pays 2×. 暗杠: each other un-won player pays 2×.
 * 补杠: each other un-won player pays 1×. 抢杠胡 cancels the 补杠.
 * Exhausted wall: 花猪 pays every non-花猪 player 16×; among remaining
 * un-won non-花猪 players, non-ready pays ready their highest possible score.
 * Un-won non-ready / 花猪 players refund all received kong payments (退税).
 * These explicit house rules intentionally omit other regional fan variations.
 * All money is integer virtual currency; no payment/network/storage features.
 */
(function (root, factory) {
  const Engine = factory();
  if (typeof module === 'object' && module.exports) module.exports = Engine;
  if (root) root.MahjongEngine = Engine;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SUITS = ['万', '筒', '条'];
  const NAMES = ['我', '张燕子', '贺老五', '贺小满'];
  const sort = (hand) => hand.sort((a, b) => a - b);
  const suit = (tile) => Math.floor(tile / 9);
  const tileName = (tile) => Number.isInteger(tile) && tile >= 0 && tile < 27
    ? `${tile % 9 + 1}${SUITS[suit(tile)]}` : '';
  const countsOf = (hand) => {
    const counts = Array(27).fill(0);
    for (const t of hand) {
      if (!Number.isInteger(t) || t < 0 || t > 26) return null;
      counts[t]++;
    }
    return counts;
  };

  function meldable(counts, memo) {
    let first = 0;
    while (first < 27 && counts[first] === 0) first++;
    if (first === 27) return true;
    const key = counts.join('');
    if (memo.has(key)) return memo.get(key);
    if (counts[first] >= 3) {
      counts[first] -= 3;
      const ok = meldable(counts, memo);
      counts[first] += 3;
      if (ok) { memo.set(key, true); return true; }
    }
    if (first % 9 < 7 && counts[first + 1] && counts[first + 2]) {
      counts[first]--; counts[first + 1]--; counts[first + 2]--;
      const ok = meldable(counts, memo);
      counts[first]++; counts[first + 1]++; counts[first + 2]++;
      if (ok) { memo.set(key, true); return true; }
    }
    memo.set(key, false);
    return false;
  }

  function isWinning(hand, melds = [], missing = -1) {
    if (hand.length !== 14 - 3 * melds.length || melds.length > 4) return false;
    if (hand.some(t => suit(t) === missing) || melds.some(m => suit(m.tile) === missing)) return false;
    const counts = countsOf(hand);
    if (!counts || counts.some(n => n > 4)) return false;
    const physical = counts.slice();
    for (const m of melds) {
      if (!Number.isInteger(m.tile) || m.tile < 0 || m.tile > 26) return false;
      physical[m.tile] += m.type === 'peng' ? 3 : 4;
    }
    if (physical.some(n => n > 4)) return false;
    if (!melds.length && counts.every(n => n % 2 === 0)) return true;
    const memo = new Map();
    for (let i = 0; i < 27; i++) if (counts[i] >= 2) {
      counts[i] -= 2;
      const ok = meldable(counts, memo);
      counts[i] += 2;
      if (ok) return true;
    }
    return false;
  }

  function winningTiles(hand, melds = [], missing = -1) {
    if (hand.length !== 13 - 3 * melds.length || hand.some(t => suit(t) === missing)) return [];
    const counts = countsOf(hand);
    if (!counts) return [];
    for (const m of melds) counts[m.tile] += m.type === 'peng' ? 3 : 4;
    const tiles = [];
    for (let t = 0; t < 27; t++) {
      if (suit(t) !== missing && counts[t] < 4 && isWinning(hand.concat(t), melds, missing)) tiles.push(t);
    }
    return tiles;
  }

  function scoreHand(hand, melds = [], options = {}) {
    const counts = countsOf(hand);
    const all = hand.concat(melds.flatMap(m => Array(m.type === 'peng' ? 3 : 4).fill(m.tile)));
    const tags = [];
    let fan = 0;
    const pairs = !melds.length && hand.length === 14 && counts && counts.every(n => n % 2 === 0);
    if (pairs) { tags.push('七对'); fan += 2; }
    else if (counts && counts.filter(n => n % 3 === 2).length === 1 && counts.every(n => n % 3 === 0 || n % 3 === 2)) {
      tags.push('对对胡'); fan++;
    }
    if (new Set(all.map(suit)).size === 1) { tags.push('清一色'); fan += 2; }
    if (melds.length === 4) { tags.push('金钩钓'); fan++; }
    const fullCounts = countsOf(all);
    const roots = fullCounts ? fullCounts.filter(n => n === 4).length : 0;
    if (roots) { tags.push(`${roots}根`); fan += roots; }
    if (!tags.length) tags.push('平胡');
    if (options.selfDraw) { tags.push('自摸'); fan++; }
    if (options.afterGang) { tags.push('杠上花'); fan++; }
    if (options.robGang) { tags.push('抢杠胡'); fan++; }
    const uncappedFan = fan;
    fan = Math.min(5, fan);
    return { tags, label: tags.join(' · '), fan, uncappedFan, multiplier: 2 ** fan,
      capped: uncappedFan > 5, unitAmount: (options.base || 10) * 2 ** fan };
  }

  // Standard 4-meld-and-pair shanten with an independent seven-pairs route.
  // It uses only the supplied player's tiles; callers never provide a wall or opponent hand.
  function shanten(hand, open = 0, cache) {
    const counts = countsOf(hand);
    if (!counts) return 8;
    const cacheKey = `${open}:${counts.join('')}`;
    if (cache && cache.has(cacheKey)) return cache.get(cacheKey);
    let best = 8;
    const seen = new Set();
    function walk(meld, partial, pair) {
      let i = 0;
      while (i < 27 && !counts[i]) i++;
      if (i === 27) {
        best = Math.min(best, 8 - 2 * (meld + open) - Math.min(partial, 4 - meld - open) - pair);
        return;
      }
      const key = `${meld}${partial}${pair}:${counts.join('')}`;
      if (seen.has(key)) return;
      seen.add(key);
      if (meld + open < 4) {
        if (counts[i] >= 3) {
          counts[i] -= 3; walk(meld + 1, partial, pair); counts[i] += 3;
        }
        if (i % 9 < 7 && counts[i + 1] && counts[i + 2]) {
          counts[i]--; counts[i + 1]--; counts[i + 2]--;
          walk(meld + 1, partial, pair);
          counts[i]++; counts[i + 1]++; counts[i + 2]++;
        }
      }
      if (counts[i] >= 2) {
        counts[i] -= 2;
        if (!pair) walk(meld, partial, 1);
        if (partial < 4) walk(meld, partial + 1, pair);
        counts[i] += 2;
      }
      if (partial < 4 && i % 9 < 8 && counts[i + 1]) {
        counts[i]--; counts[i + 1]--; walk(meld, partial + 1, pair); counts[i]++; counts[i + 1]++;
      }
      if (partial < 4 && i % 9 < 7 && counts[i + 2]) {
        counts[i]--; counts[i + 2]--; walk(meld, partial + 1, pair); counts[i]++; counts[i + 2]++;
      }
      counts[i]--; walk(meld, partial, pair); counts[i]++;
    }
    walk(0, 0, 0);
    if (!open) {
      // Sichuan 龙七对 counts a concealed quad as two pairs.
      const pairCount = counts.reduce((sum, n) => sum + Math.floor(n / 2), 0);
      best = Math.min(best, 6 - pairCount);
    }
    if (cache) {
      if (cache.size > 16000) cache.clear();
      cache.set(cacheKey, best);
    }
    return best;
  }

  class MahjongEngine {
    constructor(options = {}) {
      this.difficulty = ['easy', 'normal', 'hard'].includes(options.difficulty) ? options.difficulty : 'normal';
      this.base = Math.max(1, Math.min(10000, Math.round(Number(options.base) || 10)));
      this.rng = typeof options.rng === 'function' ? options.rng : Math.random;
      this._cache = new Map();
      this.state = null;
      this._response = null;
      this._kongTransfers = [];
    }

    start() {
      const wall = Array.from({ length: 108 }, (_, i) => Math.floor(i / 4));
      for (let i = wall.length - 1; i > 0; i--) {
        const j = Math.floor(this._random() * (i + 1));
        [wall[i], wall[j]] = [wall[j], wall[i]];
      }
      const players = NAMES.map((name, id) => ({ id, name, hand: [], melds: [], discards: [], missing: -1, won: false, delta: 0, winInfo: null }));
      for (let round = 0; round < 13; round++) for (const p of players) p.hand.push(wall.pop());
      const dealerTile = wall.pop();
      players[0].hand.push(dealerTile);
      players.forEach(p => sort(p.hand));
      for (let i = 1; i < 4; i++) players[i].missing = this._chooseMissing(players[i]);
      this.state = { phase: 'dingque', turn: 0, players, wall, lastDiscard: null, response: null,
        drawnTile: dealerTile, afterGang: false, log: [], winners: [], result: null, serial: 0 };
      this._response = null;
      this._kongTransfers = [];
      this._cache.clear();
      this._log('新的一局开始，请选择定缺花色。', 'system');
      return this.state;
    }

    _random() {
      const n = Number(this.rng());
      return Number.isFinite(n) ? Math.max(0, Math.min(0.9999999999, n)) : 0.5;
    }

    _log(text, type = 'info') {
      this.state.log.push({ text, type });
      if (this.state.log.length > 160) this.state.log.shift();
      this.state.serial++;
    }

    _chooseMissing(player) {
      const counts = [0, 0, 0];
      player.hand.forEach(t => counts[suit(t)]++);
      let best = 0;
      for (let i = 1; i < 3; i++) if (counts[i] < counts[best]) best = i;
      return best;
    }

    _hasMissing(player) {
      return player.hand.some(t => suit(t) === player.missing) || player.melds.some(m => suit(m.tile) === player.missing);
    }

    _active() { return this.state.players.filter(p => !p.won); }

    _legalDiscards(id) {
      const p = this.state.players[id];
      const forced = p.hand.filter(t => suit(t) === p.missing);
      return [...new Set(forced.length ? forced : p.hand)];
    }

    _turnActions(id) {
      const s = this.state, p = s.players[id];
      if (p.won || s.phase !== 'playing' || s.turn !== id) return [];
      const actions = this._legalDiscards(id).map(tile => ({ type: 'discard', tile }));
      if (this._hasMissing(p)) return actions;
      // A completed hand after declining a ron and claiming peng is not a self-draw.
      if (s.drawnTile !== null && isWinning(p.hand, p.melds, p.missing)) actions.unshift({ type: 'hu', tile: s.drawnTile });
      // A kong requires a replacement tile; don't offer one after the last wall tile.
      if (s.wall.length) {
        const counts = countsOf(p.hand);
        for (let t = 0; t < 27; t++) if (counts[t] === 4) actions.push({ type: 'angang', tile: t });
        for (const meld of p.melds) if (meld.type === 'peng' && counts[meld.tile]) actions.push({ type: 'bugang', tile: meld.tile });
      }
      return actions;
    }

    getActions() {
      const s = this.state;
      if (!s || s.phase === 'ended' || s.players[0].won) return [];
      if (s.phase === 'dingque') return [0, 1, 2].map(suit => ({ type: 'dingque', suit }));
      if (s.phase === 'playing') return this._turnActions(0);
      if (s.phase === 'response' && this._response && !this._response.decisions.has(0)) {
        const entry = this._response.responders.find(r => r.player === 0);
        if (entry) return entry.types.map(type => ({ type, tile: this._response.tile })).concat({ type: 'pass' });
      }
      return [];
    }

    needsHuman() { return this.getActions().length > 0; }

    act(type, payload) {
      const s = this.state;
      if (!s || s.phase === 'ended') return false;
      const tile = typeof payload === 'object' && payload !== null ? payload.tile : payload;
      if (s.phase === 'dingque') {
        const missing = typeof payload === 'object' && payload !== null ? payload.suit : payload;
        if (type !== 'dingque' || ![0, 1, 2].includes(missing)) return false;
        s.players[0].missing = missing;
        s.phase = 'playing';
        this._log(`你选择了缺${SUITS[missing]}，请优先打出${SUITS[missing]}子。`, 'system');
        return true;
      }
      const available = this.getActions();
      const action = available.find(a => a.type === type && (!['discard', 'angang', 'bugang'].includes(type) || a.tile === tile));
      if (!action) return false;
      if (s.phase === 'response') {
        this._response.decisions.set(0, type);
        this._resolveResponse();
      } else this._executeTurn(0, type, action.tile);
      return true;
    }

    step() {
      const s = this.state;
      if (!s || s.phase === 'ended' || s.phase === 'dingque' || this.needsHuman()) return false;
      if (s.phase === 'response') { this._resolveResponse(); return true; }
      const id = s.turn;
      if (s.players[id].won) { this._nextTurn(id); return true; }
      const actions = this._turnActions(id);
      const hu = actions.find(a => a.type === 'hu');
      if (hu) { this._executeTurn(id, 'hu', hu.tile); return true; }
      const kong = actions.find(a => a.type === 'angang' || a.type === 'bugang');
      if (kong && (this.difficulty !== 'easy' || this._random() > 0.2)) {
        this._executeTurn(id, kong.type, kong.tile); return true;
      }
      const tile = this._aiDiscard(id, this.difficulty);
      if (tile === undefined) { this._end('牌局结束'); return false; }
      this._executeTurn(id, 'discard', tile);
      return true;
    }

    hint() {
      if (!this.state || this.state.phase !== 'playing' || this.state.turn !== 0 || this.state.players[0].won) return null;
      return this._aiDiscard(0, 'hard');
    }

    snapshot() {
      const pendingResponse = this._response ? { ...this._response, decisions: [...this._response.decisions] } : null;
      return JSON.parse(JSON.stringify({ version: 1, difficulty: this.difficulty, base: this.base,
        state: this.state, pendingResponse, kongTransfers: this._kongTransfers }));
    }

    static restore(snapshot, options = {}) {
      const data = JSON.parse(JSON.stringify(snapshot));
      if (!data || data.version !== 1 || !data.state) throw new Error('不支持的存档版本');
      const s = data.state;
      if (!['dingque', 'playing', 'response', 'ended'].includes(s.phase) ||
          !Number.isInteger(s.turn) || s.turn < 0 || s.turn > 3 ||
          !Array.isArray(s.players) || s.players.length !== 4 ||
          !Array.isArray(s.wall) || !Array.isArray(s.log) || !Array.isArray(s.winners)) throw new Error('存档结构错误');
      const physical = s.wall.slice();
      let delta = 0;
      for (let id = 0; id < 4; id++) {
        const p = s.players[id];
        if (p.id !== id || !Array.isArray(p.hand) || !Array.isArray(p.discards) || !Array.isArray(p.melds) ||
            !Number.isInteger(p.delta) || ![-1, 0, 1, 2].includes(p.missing) || p.melds.length > 4) throw new Error('玩家存档错误');
        physical.push(...p.hand, ...p.discards);
        delta += p.delta;
        for (const m of p.melds) {
          if (!['peng', 'gang', 'angang', 'bugang'].includes(m.type)) throw new Error('副露存档错误');
          physical.push(...Array(m.type === 'peng' ? 3 : 4).fill(m.tile));
        }
      }
      const counts = countsOf(physical);
      if (!counts || physical.length !== 108 || counts.some(n => n !== 4) || delta !== 0) throw new Error('存档牌数或结算错误');
      // Saved rounds retain their hands and scores while adopting the new cast.
      const oldNames = new Map(s.players.map((p, id) => [p.name, NAMES[id]]));
      for (const p of s.players) p.name = NAMES[p.id];
      const replaceName = (text) => String(text).replace(/青竹|阿福|小满|老陈/g, old => oldNames.get(old) || old);
      s.log = s.log.map(entry => typeof entry === 'string' ? replaceName(entry) : {...entry, text: replaceName(entry.text)});
      const engine = new MahjongEngine({ difficulty: data.difficulty, base: data.base, rng: options.rng });
      engine.state = s;
      engine._kongTransfers = Array.isArray(data.kongTransfers) ? data.kongTransfers : [];
      if (s.phase === 'response') {
        const r = data.pendingResponse;
        if (!r || !['discard', 'bugang'].includes(r.kind) || !Number.isInteger(r.from) || r.from < 0 || r.from > 3 ||
            !Number.isInteger(r.tile) || r.tile < 0 || r.tile > 26 || !Array.isArray(r.responders) || !Array.isArray(r.decisions)) throw new Error('响应存档错误');
        engine._response = { ...r, decisions: new Map(r.decisions) };
      }
      return engine;
    }

    _executeTurn(id, type, tile) {
      const s = this.state, p = s.players[id];
      if (type === 'hu') {
        this._win(id, null, s.drawnTile, { selfDraw: true, afterGang: s.afterGang });
        if (!this._checkEnd()) this._nextTurn(id);
      } else if (type === 'discard') {
        p.hand.splice(p.hand.indexOf(tile), 1);
        p.discards.push(tile);
        s.lastDiscard = { player: id, tile };
        s.drawnTile = null;
        s.afterGang = false;
        this._log(`${p.name}打出${tileName(tile)}`, 'discard');
        this._beginResponse(id, tile, 'discard');
      } else if (type === 'angang') {
        for (let n = 0; n < 4; n++) p.hand.splice(p.hand.indexOf(tile), 1);
        p.melds.push({ type: 'angang', tile, from: id });
        this._log(`${p.name}暗杠${tileName(tile)}`, 'gang');
        for (const other of this._active()) if (other.id !== id) this._transfer(other.id, id, this.base * 2, 'gang');
        this._draw(id, true);
      } else if (type === 'bugang') {
        this._log(`${p.name}准备补杠${tileName(tile)}`, 'gang');
        this._beginResponse(id, tile, 'bugang');
      }
    }

    _beginResponse(from, tile, kind) {
      const s = this.state;
      const responders = [];
      for (let offset = 1; offset < 4; offset++) {
        const id = (from + offset) % 4, p = s.players[id];
        if (p.won || this._hasMissing(p) || suit(tile) === p.missing) continue;
        const types = [];
        if (isWinning(p.hand.concat(tile), p.melds, p.missing)) types.push('hu');
        if (kind === 'discard') {
          const n = p.hand.filter(t => t === tile).length;
          if (n >= 3 && s.wall.length) types.push('gang');
          if (n >= 2) types.push('peng');
        }
        if (types.length) responders.push({ player: id, types });
      }
      if (!responders.length) {
        if (kind === 'bugang') this._finishBuGang(from, tile);
        else this._nextTurn(from);
        return;
      }
      this._response = { from, tile, kind, responders, decisions: new Map() };
      s.response = { from, tile, kind };
      s.phase = 'response';
    }

    _resolveResponse() {
      const r = this._response;
      if (!r) return;
      for (const entry of r.responders) {
        if (entry.player === 0 && !r.decisions.has(0)) return;
        if (!r.decisions.has(entry.player)) r.decisions.set(entry.player, this._aiResponse(entry));
      }
      const winners = r.responders.filter(entry => r.decisions.get(entry.player) === 'hu').map(entry => entry.player);
      this._response = null;
      this.state.response = null;
      if (winners.length) {
        if (r.kind === 'bugang') {
          const p = this.state.players[r.from];
          p.hand.splice(p.hand.indexOf(r.tile), 1);
          p.discards.push(r.tile);
          this.state.lastDiscard = { player: r.from, tile: r.tile };
        }
        for (const id of winners) this._win(id, r.from, r.tile, { robGang: r.kind === 'bugang' });
        if (!this._checkEnd()) this._nextTurn(r.from);
        return;
      }
      if (r.kind === 'bugang') { this._finishBuGang(r.from, r.tile); return; }
      const claimant = r.responders.find(entry => ['gang', 'peng'].includes(r.decisions.get(entry.player)));
      if (claimant) this._claim(claimant.player, r.decisions.get(claimant.player), r.from, r.tile);
      else this._nextTurn(r.from);
    }

    _aiResponse(entry) {
      if (entry.types.includes('hu')) return 'hu';
      if (entry.types.includes('gang') && this._random() < (this.difficulty === 'easy' ? 0.8 : 0.96)) return 'gang';
      if (!entry.types.includes('peng')) return 'pass';
      if (this.difficulty === 'easy') return this._random() < 0.62 ? 'peng' : 'pass';
      const p = this.state.players[entry.player], tile = this._response.tile;
      const before = shanten(p.hand, p.melds.length, this._cache);
      const hand = p.hand.slice();
      hand.splice(hand.indexOf(tile), 1); hand.splice(hand.indexOf(tile), 1);
      let after = 8;
      for (const discard of new Set(hand)) {
        const left = hand.slice(); left.splice(left.indexOf(discard), 1);
        after = Math.min(after, shanten(left, p.melds.length + 1, this._cache));
      }
      if (after < before) return 'peng';
      if (after === before && this._random() < (this.difficulty === 'hard' ? 0.25 : 0.52)) return 'peng';
      return 'pass';
    }

    _claim(id, type, from, tile) {
      const s = this.state, p = s.players[id], source = s.players[from];
      const count = type === 'gang' ? 3 : 2;
      for (let n = 0; n < count; n++) p.hand.splice(p.hand.indexOf(tile), 1);
      const last = source.discards.lastIndexOf(tile);
      if (last !== -1) source.discards.splice(last, 1);
      p.melds.push({ type, tile, from });
      s.lastDiscard = null;
      s.turn = id;
      s.phase = 'playing';
      s.drawnTile = null;
      s.afterGang = false;
      this._log(`${p.name}${type === 'gang' ? '杠' : '碰'}了${source.name}的${tileName(tile)}`, type);
      if (type === 'gang') {
        this._transfer(from, id, this.base * 2, 'gang');
        this._draw(id, true);
      }
    }

    _finishBuGang(id, tile) {
      const p = this.state.players[id];
      p.hand.splice(p.hand.indexOf(tile), 1);
      const meld = p.melds.find(m => m.type === 'peng' && m.tile === tile);
      meld.type = 'bugang';
      this._log(`${p.name}补杠${tileName(tile)}`, 'gang');
      for (const other of this._active()) if (other.id !== id) this._transfer(other.id, id, this.base, 'gang');
      this._draw(id, true);
    }

    _nextTurn(from) {
      if (this._checkEnd()) return;
      let next = (from + 1) % 4;
      while (this.state.players[next].won) next = (next + 1) % 4;
      this._draw(next, false);
    }

    _draw(id, afterGang) {
      const s = this.state;
      if (!s.wall.length) { this._end('牌墙摸完，流局查叫', true); return; }
      const tile = s.wall.pop();
      s.players[id].hand.push(tile);
      sort(s.players[id].hand);
      s.turn = id;
      s.phase = 'playing';
      s.drawnTile = tile;
      s.afterGang = afterGang;
      s.serial++;
    }

    _transfer(from, to, amount, reason) {
      if (!Number.isInteger(amount) || amount <= 0 || from === to) return;
      this.state.players[from].delta -= amount;
      this.state.players[to].delta += amount;
      if (reason === 'gang') this._kongTransfers.push({ from, to, amount });
    }

    _win(id, from, tile, options = {}) {
      const s = this.state, p = s.players[id];
      const hand = options.selfDraw ? p.hand : p.hand.concat(tile);
      const info = scoreHand(hand, p.melds, { ...options, base: this.base });
      let amount = 0;
      if (options.selfDraw) {
        for (const other of this._active()) if (other.id !== id) {
          this._transfer(other.id, id, info.unitAmount, 'hu');
          amount += info.unitAmount;
        }
      } else {
        this._transfer(from, id, info.unitAmount, 'hu');
        amount = info.unitAmount;
      }
      p.won = true;
      p.winInfo = { ...info, tile, from, selfDraw: Boolean(options.selfDraw), amount, order: s.winners.length + 1 };
      s.winners.push(id);
      this._log(`${p.name}${options.selfDraw ? '自摸' : '胡牌'}！${info.label}，赢得￥${amount}`, 'hu');
    }

    _checkEnd() {
      if (this.state.phase === 'ended') return true;
      if (this._active().length <= 1) { this._end('三家已胡，血战结束'); return true; }
      return false;
    }

    _readyInfo(player) {
      const waits = winningTiles(player.hand, player.melds, player.missing);
      let maxAmount = 0;
      for (const t of waits) maxAmount = Math.max(maxAmount, scoreHand(player.hand.concat(t), player.melds, { base: this.base }).unitAmount);
      return { waits, maxAmount, ready: waits.length > 0 };
    }

    _settleDraw() {
      const s = this.state;
      const records = s.players.map(p => ({ id: p.id, won: p.won, flower: !p.won && this._hasMissing(p), ...this._readyInfo(p) }));
      const refunds = [];
      for (const transfer of this._kongTransfers) {
        const receiver = records[transfer.to];
        if (!receiver.won && (!receiver.ready || receiver.flower)) {
          this._transfer(transfer.to, transfer.from, transfer.amount, 'refund');
          refunds.push(transfer);
        }
      }
      if (refunds.length) this._log('流局退税：未听牌或花猪玩家退还所收杠钱。', 'settlement');
      for (const flower of records.filter(r => r.flower)) {
        const others = records.filter(r => !r.flower);
        for (const other of others) this._transfer(flower.id, other.id, this.base * 16, 'flower');
        if (others.length) this._log(`${s.players[flower.id].name}未打完定缺（花猪），赔付￥${this.base * 16 * others.length}`, 'settlement');
      }
      const pending = records.filter(r => !r.won && !r.flower);
      for (const loser of pending.filter(r => !r.ready)) {
        for (const ready of pending.filter(r => r.ready)) {
          this._transfer(loser.id, ready.id, ready.maxAmount, 'ready');
          this._log(`查大叫：${s.players[loser.id].name}向${s.players[ready.id].name}赔付￥${ready.maxAmount}`, 'settlement');
        }
      }
      return { records, refunds };
    }

    _end(reason, isDraw = false) {
      const s = this.state;
      if (s.phase === 'ended') return;
      const drawSettlement = isDraw ? this._settleDraw() : null;
      s.phase = 'ended';
      s.response = null;
      this._response = null;
      s.result = { reason, isDraw, winners: s.winners.slice(), deltas: s.players.map(p => p.delta), drawSettlement };
      this._log(reason, 'system');
    }

    _visibleCounts(id) {
      const counts = countsOf(this.state.players[id].hand);
      for (const p of this.state.players) {
        for (const tile of p.discards) counts[tile]++;
        for (const meld of p.melds) counts[meld.tile] += meld.type === 'peng' ? 3 : 4;
      }
      return counts;
    }

    _shape(hand) {
      const counts = countsOf(hand);
      let score = 0;
      for (let t = 0; t < 27; t++) if (counts[t]) {
        if (counts[t] >= 2) score += 1.4;
        if (counts[t] >= 3) score += 2.4;
        if (t % 9 < 8) score += Math.min(counts[t], counts[t + 1]) * 0.85;
        if (t % 9 < 7) score += Math.min(counts[t], counts[t + 2]) * 0.35;
      }
      return score;
    }

    _danger(tile, id, visible) {
      let danger = 0;
      for (const p of this.state.players) {
        if (p.id === id || p.won || p.missing === suit(tile)) continue;
        const pressure = Math.min(1.8, 0.25 + p.discards.length * 0.035 + p.melds.length * 0.2);
        const discardedSame = p.discards.includes(tile);
        let risk = (4 - visible[tile]) * 0.25 + (tile % 9 > 0 && tile % 9 < 8 ? 0.3 : 0.05);
        if (discardedSame) risk *= 0.45;
        if (p.discards.slice(-3).includes(tile)) risk *= 0.6;
        danger += Math.max(0, risk) * pressure;
      }
      return danger;
    }

    _aiDiscard(id, difficulty) {
      const p = this.state.players[id], candidates = this._legalDiscards(id);
      if (!candidates.length) return undefined;
      if (difficulty === 'easy' && this._random() < 0.62) return candidates[Math.floor(this._random() * candidates.length)];
      if (candidates.length === 1) return candidates[0];
      const forced = p.hand.some(t => suit(t) === p.missing);
      const visible = this._visibleCounts(id);
      const ratings = candidates.map(tile => {
        const left = p.hand.slice(); left.splice(left.indexOf(tile), 1);
        const useful = left.filter(t => suit(t) !== p.missing);
        const distance = shanten(useful, p.melds.length, this._cache);
        const shape = this._shape(useful);
        return { tile, left, useful, distance, score: -distance * 100 + shape };
      });
      const bestDistance = Math.min(...ratings.map(r => r.distance));
      if (difficulty === 'hard' && !forced) {
        for (const r of ratings) {
          if (r.distance > bestDistance) continue;
          let improvements = 0;
          for (let t = 0; t < 27; t++) {
            if (suit(t) === p.missing || visible[t] >= 4) continue;
            const next = shanten(r.left.concat(t), p.melds.length, this._cache);
            if (next < r.distance) improvements += 4 - visible[t];
          }
          r.score += improvements * 1.8;
          r.score -= this._danger(r.tile, id, visible) * (this.state.wall.length < 20 ? 4 : 1.5);
        }
      }
      // Stable tie-breaker makes Hint useful and avoids consuming RNG on every UI redraw.
      ratings.sort((a, b) => b.score - a.score || a.tile - b.tile);
      return ratings[0].tile;
    }
  }

  MahjongEngine.isWinning = isWinning;
  MahjongEngine.winningTiles = winningTiles;
  MahjongEngine.scoreHand = scoreHand;
  MahjongEngine.shanten = shanten;
  MahjongEngine.tileName = tileName;
  MahjongEngine.SUITS = SUITS.slice();
  return MahjongEngine;
});
