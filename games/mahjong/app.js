(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const KEY = 'qingzhu-mahjong-v1';
  const SUITS = ['万', '筒', '条'];
  const NAMES = ['我', '张燕子', '贺老五', '贺小满'];
  const DIFFICULTIES = {easy: '简单', normal: '一般', hard: '困难'};
  const DESCRIPTIONS = {easy: '悠闲练手，熟悉牌型与出牌节奏', normal: '攻守兼备，来一场轻松的较量', hard: '计算进张与防守，挑战进阶牌技'};
  const paths = {
    music: '<path d="M9 18V5l12-2v13M9 9l12-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="18" cy="16" rx="3" ry="3"/>',
    mute: '<path d="M9 18V5l12-2v10M9 9l12-2M3 3l18 18"/><ellipse cx="6" cy="18" rx="3" ry="3"/>',
    settings: '<path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/>',
    wallet: '<path d="M20 8V5H6a3 3 0 0 0 0 6h15v9H6a3 3 0 0 1-3-3V8M21 11h-5v5h5"/><path d="M17 13.5h1"/>',
    activity: '<path d="M8 3h8v4H8zM8 5H5v16h14V5h-3M8 12h8M8 16h5"/>',
    leaf: '<path d="M20 3C8 3 2 7 5 15c8 5 15-1 15-12ZM3 21 14 10"/>',
    arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
    restart: '<path d="M3 10a9 9 0 1 1 1 8M3 4v6h6"/>',
    hint: '<path d="M9 18h6M10 21h4M8 15c-5-5-2-12 4-12s9 7 4 12l-1 1H9Z"/>'
  };
  const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.leaf}</svg>`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const money = (value, decimals = false) => `￥${Number(value || 0).toLocaleString('zh-CN', {minimumFractionDigits: decimals ? 2 : 0, maximumFractionDigits: 2})}`;
  const signed = value => `${value > 0 ? '+' : value < 0 ? '−' : ''}${money(Math.abs(value))}`;
  const today = () => new Date().toLocaleDateString('sv-SE');
  const defaults = () => ({version:1,wallet:10000,profit:0,rounds:0,wins:0,day:today(),todayRounds:0,history:[],settings:{difficulty:'normal',base:10,music:true,effects:true,volume:.35,speed:1000,paceVersion:2,largeFont:true},active:null});
  let data = defaults(), storageAvailable = true;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && saved.version === 1) {
      for (const k of ['wallet','profit','rounds','wins','todayRounds']) if (Number.isFinite(saved[k]) && Math.abs(saved[k]) <= 1e12) data[k] = saved[k];
      if (Array.isArray(saved.history)) data.history = saved.history.filter(h => h && Number.isFinite(h.delta) && typeof h.date === 'string').slice(0,30);
      const s = saved.settings || {};
      if (DIFFICULTIES[s.difficulty]) data.settings.difficulty = s.difficulty;
      if ([10,20,50,100].includes(s.base)) data.settings.base = s.base;
      // Apply the new one-second pace once, then preserve later speed choices.
      if (s.paceVersion === 2 && [500,1000,1600].includes(s.speed)) data.settings.speed = s.speed;
      for (const k of ['music','effects','largeFont']) if (typeof s[k] === 'boolean') data.settings[k] = s[k];
      if (Number.isFinite(s.volume)) data.settings.volume = Math.max(0,Math.min(1,s.volume));
      if (saved.day === today()) data.day = saved.day; else data.todayRounds = 0;
      if (saved.active && saved.active.snapshot) data.active = saved.active;
    }
  } catch (_) { storageAvailable = false; }
  const audio = new MahjongAudio();
  audio.setMusic(data.settings.music); audio.setVolume(data.settings.volume); audio.setEffects(data.settings.effects);
  let game = null, selected = null, recommended = null, timer = null, settled = false, appliedDelta = 0, lastLogLength = 0, autoplay = false, toastTimer;
  const demo = [0,1,2,4,4,9,10,11,13,15,18,19,20,25];

  function save() {
    if (game && !settled && game.state.phase !== 'ended') {
      data.active = {snapshot:game.snapshot(), appliedDelta};
    } else data.active = null;
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) {
      if (storageAvailable) toast('浏览器无法保存数据，本次仍可正常游玩');
      storageAvailable = false;
    }
  }
  function toast(message) {
    $('toast').textContent = message; $('toast').classList.add('visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('visible'),3200);
  }
  function avatar(index) {
    if (index > 0) return MahjongAvatars.html(index);
    const head = '<svg viewBox="0 0 64 64" aria-hidden="true">';
    return head + '<rect width="64" height="64" fill="#dedfc0"/><ellipse cx="32" cy="67" rx="27" ry="25" fill="#768e6c"/><ellipse cx="32" cy="30" rx="20" ry="23" fill="#e8c9a2"/><path d="M11 30q-6-29 23-27 27 2 18 30l-5-14q-20 6-25-2z" fill="#3a5543"/><circle cx="24" cy="31" r="2" fill="#506042"/><circle cx="40" cy="31" r="2" fill="#506042"/><path d="M27 42q5 4 10 0" fill="none" stroke="#a57754" stroke-width="2" stroke-linecap="round"/></svg>';
  }
  function tileHTML(tile, classes = '', attrs = '') {
    return `<span class="tile mini ${classes}" title="${MahjongTiles.name(tile)}" ${attrs}>${MahjongTiles.html(tile,{small:true})}</span>`;
  }
  function meldHTML(melds) {
    return (melds || []).map(m => `<div class="meld-group" title="${m.type === 'peng' ? '碰' : '杠'} ${MahjongTiles.name(m.tile)}">${Array.from({length:m.type === 'peng' ? 3 : 4}, () => tileHTML(m.tile)).join('')}</div>`).join('');
  }
  function renderOpponent(i) {
    const p = game ? game.state.players[i] : {hand:Array(13).fill(0),melds:[],missing:null,won:false,delta:0};
    const turn = game && game.state.turn === i && !p.won && game.state.phase === 'playing';
    const missing = Number.isInteger(p.missing) && p.missing >= 0 ? `<span class="missing-badge">缺${SUITS[p.missing]}</span>` : '';
    const subtitle = p.won ? '<span class="missing-badge win-badge">已胡牌</span>' : missing;
    const revealedHand = p.won && p.winInfo && !p.winInfo.selfDraw ? p.hand.concat(p.winInfo.tile) : p.hand;
    const backs = (p.won || game?.state.phase === 'ended') ? revealedHand.map((t,j) => tileHTML(t,p.won && !p.winInfo?.selfDraw && j===revealedHand.length-1 ? 'winning-tile' : '')).join('') : p.hand.map(() => `<span class="tile-back">${MahjongTiles.html(0,{back:true})}</span>`).join('');
    $('player-'+i).innerHTML = `<div class="player-card ${turn ? 'is-turn' : ''}" title="${NAMES[i]}"><div class="avatar">${avatar(i)}</div><div><div class="player-name">${NAMES[i]} <span style="font-size:10px;color:#a9c39d">AI</span></div><div class="player-info">${subtitle}${p.delta ? `<span>${signed(p.delta)}</span>` : ''}</div></div></div><div class="opponent-backs ${p.won ? 'revealed' : ''}">${backs}</div><div class="melds">${meldHTML(p.melds)}</div>`;
  }
  function humanActions() { return game ? game.getActions() : []; }
  function renderHand() {
    const p = game ? game.state.players[0] : {hand:demo,missing:null,melds:[],won:false,delta:0};
    const state = game?.state;
    const actions = humanActions();
    const discards = actions.filter(a => a.type === 'discard').map(a => a.tile);
    const hand = p.hand.slice().sort((a,b) => a-b);
    const claimedWin = p.won && p.winInfo && !p.winInfo.selfDraw;
    if (claimedWin) hand.push(p.winInfo.tile);
    const drawn = claimedWin ? p.winInfo.tile : state?.phase === 'playing' && state.turn === 0 && state.drawnTile != null && hand.length % 3 === 2 ? state.drawnTile : null;
    if (drawn != null && hand.includes(drawn)) { hand.splice(hand.lastIndexOf(drawn),1); hand.push(drawn); }
    $('human-profile').innerHTML = `<div class="avatar">${avatar(0)}</div><div><div class="player-name">茶馆牌友<span class="you-tag">您</span></div><div class="player-info">${p.won ? '<span class="missing-badge win-badge">已胡牌</span>' : Number.isInteger(p.missing) && p.missing >= 0 ? `<span class="missing-badge">缺${SUITS[p.missing]}</span>` : '<span>慢慢打，不着急</span>'}${p.delta ? `<span>${signed(p.delta)}</span>` : ''}</div></div>`;
    $('melds-0').innerHTML = meldHTML(p.melds);
    $('human-hand').innerHTML = hand.map((t,i) => {
      const active = selected && selected.tile === t && selected.index === i;
      const canClick = game && state.phase === 'playing' && state.turn === 0 && !p.won;
      return `<button class="tile ${t === recommended ? 'recommended' : ''} ${active ? 'selected' : ''} ${MahjongTiles.suit(t) === p.missing ? 'que' : ''} ${i === hand.length-1 && drawn != null ? 'drawn' : ''} ${claimedWin && i===hand.length-1 ? 'winning-tile' : ''}" data-tile="${t}" data-index="${i}" aria-label="${MahjongTiles.name(t)}${MahjongTiles.suit(t) === p.missing ? '，定缺花色' : ''}" aria-pressed="${!!active}" ${canClick ? '' : 'disabled'}>${MahjongTiles.html(t)}</button>`;
    }).join('');
    $('hint-button').disabled = !discards.length;
    const response = state?.phase === 'response';
    let hint = '茶已备好，等你入座', guide = '点击选牌，再点一次出牌';
    if (game) {
      if (state.phase === 'dingque') hint = '先选一门花色，作为本局定缺';
      else if (state.phase === 'ended') { hint = '本局结束，再来一局吧'; guide = '输赢随意，开心就好'; }
      else if (p.won) { hint = '您已胡牌，坐看风云'; guide = '其他牌友继续血战到底'; }
      else if (response && actions.length) { hint = `有牌可${actions.some(a=>a.type==='hu') ? '胡' : '碰杠'}，请选择操作`; guide = '点击「过」继续牌局'; }
      else if (state.turn === 0 && state.phase === 'playing') {
        hint = p.hand.some(t => MahjongTiles.suit(t) === p.missing) ? `轮到您出牌 · 请先打出${SUITS[p.missing]}子` : '轮到您了，选一张牌打出';
        if (selected) guide = `已选 ${MahjongTiles.name(selected.tile)} · 再点此牌或「出牌」`;
      } else hint = `${NAMES[state.turn]}正在思考…`;
    }
    $('turn-hint').textContent = hint; $('hand-guide').textContent = guide;
    const labels = {hu:'胡牌',peng:'碰',gang:'杠',angang:'暗杠',bugang:'补杠',pass:'过'};
    let buttons = actions.filter(a => !['discard','dingque'].includes(a.type)).map(a => `<button class="action-button ${a.type === 'hu' ? 'hu' : ''}" data-action="${a.type}" ${a.tile != null ? `data-value="${a.tile}"` : ''}>${labels[a.type] || a.type}${['angang','bugang'].includes(a.type) ? ` ${MahjongTiles.name(a.tile)}` : ''}</button>`).join('');
    if (discards.length) buttons += `<button class="action-button main" data-action="discard" ${selected && discards.includes(selected.tile) ? '' : 'disabled'}>出牌</button>`;
    if (game?.state.players[0].won && state.phase !== 'ended') buttons += '<button class="action-button" id="fast-forward">快速看完</button>';
    $('action-buttons').innerHTML = buttons;
  }
  function renderBoard() {
    [1,2,3].forEach(renderOpponent);
    renderHand();
    const state = game?.state;
    for (let i=0;i<4;i++) {
      const ds = state?.players[i].discards || [];
      $('discards-'+i).innerHTML = ds.map((t,j) => tileHTML(t, state.lastDiscard?.player === i && j === ds.length-1 && state.lastDiscard.tile === t ? 'last' : '')).join('');
      // Compact phone piles scroll independently, keeping the newest discard visible.
      $('discards-'+i).scrollTop = $('discards-'+i).scrollHeight;
    }
    $('compass').innerHTML = `<div class="compass-content">${game ? `<div class="wall-count">${state.wall.length}</div><div class="compass-label">余牌</div>` : '<div class="compass-title">小贺</div><div class="compass-label">茶馆</div>'}</div>`;
    $('table-meta').innerHTML = `底分 ${money(game ? game.options?.base || game.base || data.settings.base : data.settings.base)} <span class="meta-divider">/</span> ${game ? DIFFICULTIES[game.options?.difficulty || game.difficulty || data.settings.difficulty] + '场' : '一人三机'}`;
    renderOverlay();
    if (game) {
      const logs = state.log.slice(-3).reverse();
      $('activity-list').innerHTML = logs.map(l => `<div class="activity-entry">${esc(typeof l === 'string' ? l : l.text)}</div>`).join('');
      $('round-counter').textContent = state.phase === 'ended' ? '已结束' : `第 ${data.rounds + 1} 局`;
    }
  }
  function renderOverlay() {
    const overlay = $('table-overlay'); overlay.classList.remove('result-overlay');
    if (!game) {
      overlay.innerHTML = `<div class="welcome-panel"><div class="welcome-overline">竹影摇风 · 好牌相逢</div><h2>入座，开一局好牌</h2><p>三位牌友已就位<br>慢享一场地道的四川麻将</p><button class="primary-button" id="start-game">开始对局 ${icon('arrow')}</button><div class="welcome-features"><span>108 张经典川麻</span><span>定缺 · 血战到底</span><span>轻松单机</span></div></div>`;
    } else if (game.state.phase === 'dingque') {
      const counts = [0,1,2].map(s => game.state.players[0].hand.filter(t=>MahjongTiles.suit(t)===s).length);
      const min = Math.min(...counts);
      overlay.innerHTML = `<div class="welcome-panel"><div class="welcome-overline">开局第一步</div><h2>选一门，定缺</h2><p>缺哪门，就先打完哪门的牌</p><div class="dingque-options">${SUITS.map((s,i)=>`<button class="dingque-option" data-missing="${i}">${counts[i]===min ? '<span class="recommended-tag">推荐</span>' : ''}<strong>${s}</strong>缺${s}<small>手中 ${counts[i]} 张</small></button>`).join('')}</div></div>`;
    } else if (game.state.phase === 'ended') {
      overlay.classList.add('result-overlay');
      const delta = game.state.players[0].delta;
      overlay.innerHTML = `<div class="welcome-panel"><div class="welcome-overline">${game.state.winners.length >= 3 ? '血战落幕' : '牌墙摸尽'}</div><h2>${delta>0 ? '好手气，收获满满' : delta<0 ? '胜负寻常，下局再来' : '一局尽兴，且饮清茶'}</h2><p style="font-size:23px;color:#e9d09d;margin:13px 0">${signed(delta)}</p><button class="primary-button" id="start-game">再来一局 ${icon('arrow')}</button><button class="subtle-button" id="show-result" style="display:block;margin:12px auto 0">查看本局结算</button></div>`;
    } else overlay.innerHTML = '';
  }
  function renderWallet() {
    const formatted = money(data.wallet,true).split('.');
    $('balance').innerHTML = `${formatted[0]}<span>.${formatted[1]}</span>`;
    $('balance').classList.toggle('compact', Math.abs(data.wallet) >= 1000000);
    $('stat-rounds').innerHTML = `${data.todayRounds} <small>局</small>`;
    $('stat-profit').textContent = signed(data.profit);
    $('stat-profit').className = data.profit < 0 ? 'negative' : '';
    $('wallet-change').textContent = game ? `本局${game.state.phase === 'ended' ? '净收益' : '实时变动'} ${signed(game.state.players[0].delta)}` : '从一局好牌，开始今日好心情';
  }
  function renderSettings() {
    document.querySelectorAll('[data-difficulty]').forEach(b => {b.classList.toggle('selected',b.dataset.difficulty===data.settings.difficulty);b.setAttribute('aria-pressed',String(b.dataset.difficulty===data.settings.difficulty));});
    $('difficulty-description').textContent = DESCRIPTIONS[data.settings.difficulty];
    $('base-select').value = data.settings.base;
    $('music-toggle').innerHTML = icon(data.settings.music ? 'music' : 'mute');
    $('music-toggle').setAttribute('aria-label',data.settings.music ? '关闭背景音乐' : '开启背景音乐');
    $('music-toggle').title = data.settings.music ? '背景音乐已开 · 点击关闭' : '背景音乐已关 · 点击开启';
    document.body.classList.toggle('large-font',data.settings.largeFont);
  }
  function sync() {
    if (game) {
      const delta = game.state.players[0].delta;
      data.wallet += delta-appliedDelta; appliedDelta = delta;
      if (game.state.log.length > lastLogLength) {
        const recent = game.state.log.slice(lastLogLength).map(l => typeof l === 'string' ? l : l.text).join(' ');
        const action = /胡牌|自摸|抢杠胡/.test(recent) ? 'hu' : /杠/.test(recent) ? 'gang' : /碰/.test(recent) ? 'peng' : /打出/.test(recent) ? 'tile' : '';
        if (action) {
          audio.play(action);
          if (['hu','gang','peng'].includes(action)) announce({hu:'胡',gang:'杠',peng:'碰'}[action]);
        }
        lastLogLength = game.state.log.length;
      }
      if (game.state.phase === 'ended' && !settled) finishRound(false);
    }
    renderBoard(); renderWallet(); save(); schedule();
  }
  function announce(text) {
    $('announcement').classList.remove('show'); $('announcement').textContent=text;
    void $('announcement').offsetWidth; $('announcement').classList.add('show');
  }
  function finishRound(early) {
    if (!game || settled) return;
    settled=true;
    const p = game.state.players[0], delta=p.delta;
    data.rounds++; data.profit+=delta; if(p.won) data.wins++;
    if(data.day !== today()) {data.day=today();data.todayRounds=0;}
    data.todayRounds++;
    data.history.unshift({date:new Date().toLocaleString('zh-CN'),delta,won:p.won,early:!!early,difficulty:game.difficulty || game.options?.difficulty || data.settings.difficulty,base:game.base || game.options?.base || data.settings.base});
    data.history=data.history.slice(0,30); data.active=null;
    if(!early) {
      audio.play(delta>0 ? 'win':'lose');
      setTimeout(()=>{if(game?.state.phase==='ended' && !$('modal').open) showModal('result');},900);
    }
  }
  function startGame() {
    closeModal(); clearTimeout(timer);
    if(game && !settled) finishRound(true);
    game=new MahjongEngine({difficulty:data.settings.difficulty,base:data.settings.base});
    game.start(); selected=null;recommended=null;settled=false;appliedDelta=0;lastLogLength=0;autoplay=false;
    audio.unlock(); audio.play('shuffle'); sync();
  }
  function schedule() {
    clearTimeout(timer); timer=null;
    if (!game || game.state.phase==='ended' || $('modal').open || document.hidden) return;
    if (game.needsHuman() && !autoplay) return;
    timer=setTimeout(()=>{
      if(!game || $('modal').open || document.hidden) return;
      if (game.needsHuman()) {
        const actions=humanActions();
        if(game.state.phase==='dingque') {
          const cs=[0,1,2].map(s=>game.state.players[0].hand.filter(t=>MahjongTiles.suit(t)===s).length);
          game.act('dingque',cs.indexOf(Math.min(...cs)));
        } else {
          const action=actions.find(a=>a.type==='hu') || actions.find(a=>['angang','gang','bugang'].includes(a.type)) || actions.find(a=>a.type==='peng') || actions.find(a=>a.type==='pass');
          if(action) game.act(action.type,action.tile); else game.act('discard',game.hint());
        }
      } else game.step();
      selected=null; recommended=null; sync();
    }, game.state.players[0].won && autoplay ? 60 : data.settings.speed);
  }
  function perform(type,value) {
    if(!game) return;
    if(type==='discard') value=selected?.tile;
    const ok=game.act(type,value);
    if(!ok) {toast('请按当前提示操作；有定缺牌时需优先打出');return;}
    audio.unlock(); selected=null;recommended=null;sync();
  }
  function showHint() {
    if(!game || !humanActions().some(a=>a.type==='discard')) return;
    recommended=game.hint();
    if(recommended==null) return;
    renderHand();
    toast(`建议打出「${MahjongTiles.name(recommended)}」${MahjongTiles.suit(recommended)===game.state.players[0].missing ? '，优先清空定缺' : '，保留更好的组合'}`);
  }
  function closeModal() {if($('modal').open) $('modal').close();schedule();}
  function showModal(name) {
    clearTimeout(timer);audio.play('click');
    const modal=$('modal'), body=$('modal-body');
    const titles={wallet:'管理虚拟余额',settings:'舒适地，玩一局',rules:'四川麻将 · 玩法说明',history:'我的牌局战绩',result:'本局结算',restart:'准备重新开局？'};
    $('modal-title').textContent=titles[name] || '';
    if(name==='wallet') {
      body.innerHTML=`<p class="modal-description">当前余额 ${money(data.wallet,true)}。自定义或重置只调整虚拟余额，历史战绩会保留。</p><label class="modal-label" for="wallet-input">设定新的虚拟余额（￥）</label><input class="money-input" id="wallet-input" type="number" min="0" max="1000000000" step="0.01" value="${Math.max(0,data.wallet)}"><div class="quick-amounts"><button data-amount="1000">￥1,000</button><button data-amount="10000">￥10,000</button><button data-amount="100000">￥100,000</button></div><div class="form-error" id="wallet-error" role="alert"></div><p class="rules-note">所有金额仅为本机娱乐积分，无充值、提现功能。</p><div class="modal-actions"><button class="secondary-button" id="reset-wallet">重置为 ￥10,000</button><button class="primary-button" id="save-wallet">保存余额</button></div>`;
    } else if(name==='settings') {
      body.innerHTML=`<p class="modal-description">选一个舒服的节奏，慢享好牌。设置会自动保存。</p><label class="setting-row"><div>背景音乐<span>轻柔国风 · 循环播放</span></div><input id="setting-music" type="checkbox" ${data.settings.music?'checked':''}></label><label class="setting-row"><div>音乐音量<span id="volume-label">${Math.round(data.settings.volume*100)}%</span></div><input id="setting-volume" aria-label="音乐音量" type="range" min="0" max="100" value="${Math.round(data.settings.volume*100)}"></label><label class="setting-row"><div>操作音效<span>出牌、碰杠与胡牌提示音</span></div><input id="setting-effects" type="checkbox" ${data.settings.effects?'checked':''}></label><label class="setting-row"><div>加大字号<span>更清晰的牌面和操作提示</span></div><input id="setting-large" type="checkbox" ${data.settings.largeFont?'checked':''}></label><label class="setting-row"><div>对局速度<span>轮到您时，不限思考时间</span></div><select id="setting-speed"><option value="1600">悠闲 · 1.6 秒/人</option><option value="1000">标准 · 1 秒/人</option><option value="500">轻快 · 0.5 秒/人</option></select></label><div class="modal-actions"><button class="primary-button" data-close>设置好了</button></div>`;
      $('setting-speed').value=data.settings.speed;
      body.querySelector('.modal-actions').insertAdjacentHTML('beforebegin',`<label class="setting-row"><div>人机难度<span>下一局生效</span></div><select id="setting-difficulty"><option value="easy">简单</option><option value="normal">一般</option><option value="hard">困难</option></select></label><label class="setting-row"><div>每局底分<span>虚拟积分 · 下一局生效</span></div><select id="setting-base"><option value="10">￥10</option><option value="20">￥20</option><option value="50">￥50</option><option value="100">￥100</option></select></label>`);
      $('setting-difficulty').value=data.settings.difficulty;
      $('setting-base').value=data.settings.base;
      body.insertAdjacentHTML('beforeend','<div class="settings-links"><button data-modal="rules">玩法说明 ↗</button><button data-modal="history">牌局战绩 ↗</button><button data-modal="wallet">管理余额 ↗</button></div>');
    } else if(name==='rules') {
      body.innerHTML=`<p class="modal-description">本茶馆采用「定缺 · 血战到底」休闲规则，一位玩家与三位人机对局，不换三张。</p><div class="rules-grid"><div class="rule-block"><h3>① 先定缺，再出牌</h3><p>仅使用万、筒、条，共 108 张。选定一门缺门；手中仍有缺门时，必须先打出缺门牌。</p></div><div class="rule-block"><h3>② 可碰杠，不可吃</h3><p>碰：两张相同牌接他人弃牌。支持明杠、暗杠、补杠与抢杠胡；不能碰杠缺门。</p></div><div class="rule-block"><h3>③ 缺一门，才能胡</h3><p>清空定缺牌后，组成四组顺子或刻子加一对将，也可七对。一炮多响时，所有可胡玩家均可胡。</p></div><div class="rule-block"><h3>④ 一家胡，继续打</h3><p>胡牌者退出当局，剩余玩家继续。三家胡牌或牌墙摸完时结算。自摸由尚未胡牌的各家支付。</p></div></div><h3 class="rules-section-title">番数与结算</h3><table class="scoring-table"><tr><td>平胡</td><td>0 番 · 底分 × 1</td></tr><tr><td>对对胡 / 金钩钓</td><td>各加 1 番</td></tr><tr><td>七对 / 清一色</td><td>各加 2 番</td></tr><tr><td>每一根 / 自摸 / 杠上花 / 抢杠胡</td><td>各加 1 番</td></tr><tr><td>番数可叠加，上限 5 番</td><td>最高底分 × 32</td></tr><tr><td>明杠</td><td>放杠者付底分 × 2</td></tr><tr><td>暗杠 / 补杠</td><td>未胡各家付底分 × 2 / × 1</td></tr></table><p class="rules-note">点炮者承担该次所有胡牌金额。一根指手牌与副露中共有四张相同牌。流局查花猪（每家赔非花猪底分 × 16）、查大叫（未听赔已听最高可胡分），花猪或未听者退还已收杠分。地方玩法存在差异，本作以此处规则为准。</p><h3 class="rules-section-title">方便操作</h3><p class="modal-description">点击选牌，再点一次或按空格出牌；H 键查看出牌建议，左右方向键选牌。人机仅依据自己的手牌和公开牌面决策。关闭弹窗后牌局继续。</p><div class="modal-actions"><button class="primary-button" data-close>明白了，开打</button></div>`;
    } else if(name==='history') {
      body.innerHTML=`<div class="history-total"><div><strong>${data.rounds}</strong><span>完成对局</span></div><div><strong>${data.rounds?Math.round(data.wins/data.rounds*100):0}%</strong><span>胡牌率</span></div><div><strong style="font-size:20px">${signed(data.profit)}</strong><span>累计净收益</span></div></div>${data.history.length?data.history.map(h=>`<div class="history-item"><span>${h.early?'提前结束':h.won?'成功胡牌':'本局结束'} · ${esc(DIFFICULTIES[h.difficulty] || '一般')}<small>${esc(h.date)} · 底分 ${money(h.base || 10)}</small></span><strong class="${h.delta>=0?'positive':'negative'}">${signed(h.delta)}</strong></div>`).join(''):'<p class="modal-description" style="text-align:center;padding:20px">还没有牌局记录，去开一局好牌吧。</p>'}<p class="rules-note">保留最近 30 局；余额调整不计入净收益。提前结束会保留已发生的得失。</p>`;
    } else if(name==='result' && game) {
      const delta=game.state.players[0].delta;
      body.innerHTML=`<div class="result-amount ${delta>=0?'positive':'negative'}">${signed(delta)}</div><div class="result-subtitle">虚拟余额已更新 · ${money(data.wallet,true)}</div>${game.state.players.map((p,i)=>`<div class="result-player"><span>${NAMES[i]}${i===0?'（您）':''}<small>${p.won?esc(p.winInfo?.label || p.winInfo?.score?.label || '成功胡牌'):'未胡牌'}${p.winInfo?.fan!=null?' · '+p.winInfo.fan+' 番':''}</small></span><strong class="${p.delta>=0?'positive':'negative'}">${signed(p.delta)}</strong></div>`).join('')}<p class="rules-note">${esc(game.state.result?.reason || '本局完成')}。得失包含胡牌、杠牌及流局查叫等结算；四家得失合计为 ￥0。</p><div class="modal-actions"><button class="secondary-button" data-close>看看牌桌</button><button class="primary-button" id="next-round">再来一局</button></div>`;
    } else if(name==='restart') {
      body.innerHTML=`<p class="modal-description">当前牌局将提前结束，已发生的胡牌和杠牌得失会保留，并记录在战绩中。新一局使用当前选择的难度与底分。</p><div class="modal-actions"><button class="secondary-button" data-close>继续这局</button><button class="primary-button" id="confirm-restart">重新开局</button></div>`;
    }
    if(!modal.open) modal.showModal();
  }
  function setBalance(value) {
    if(!Number.isFinite(value) || value<0 || value>1e9) { $('wallet-error').textContent='请输入 0 至 1,000,000,000 之间的有效金额。';return; }
    data.wallet=Math.round(value*100)/100;save();renderWallet();closeModal();toast(`虚拟余额已设为 ${money(data.wallet,true)}`);
  }
  document.addEventListener('click',event=>{
    const target=event.target.closest('button');if(!target)return;
    if(target.dataset.modal) {showModal(target.dataset.modal);return;}
    if(target.hasAttribute('data-close')) {closeModal();return;}
    if(target.dataset.difficulty) {data.settings.difficulty=target.dataset.difficulty;renderSettings();save();if(game && game.state.phase!=='ended')toast('新难度将在下一局生效');else renderBoard();return;}
    if(target.dataset.missing!=null) {perform('dingque',Number(target.dataset.missing));return;}
    if(target.dataset.tile!=null) {
      const tile=Number(target.dataset.tile),index=Number(target.dataset.index);
      if(!humanActions().some(a=>a.type==='discard'&&a.tile===tile)){toast('请先打出定缺花色的牌');return;}
      if(selected?.tile===tile && selected.index===index) perform('discard');
      else {selected={tile,index};audio.play('click');renderHand();}
      return;
    }
    if(target.dataset.action) {perform(target.dataset.action,target.dataset.value!=null?Number(target.dataset.value):undefined);return;}
    if(target.dataset.amount) {$('wallet-input').value=target.dataset.amount;return;}
    switch(target.id) {
      case 'start-game':case 'next-round':case 'confirm-restart':startGame();break;
      case 'home-nav':document.querySelector('.play-area').scrollIntoView({behavior:'smooth',block:'center'});break;
      case 'music-toggle':data.settings.music=!data.settings.music;audio.unlock();audio.setMusic(data.settings.music);renderSettings();save();toast(data.settings.music?'背景音乐已开启':'背景音乐已关闭');break;
      case 'modal-close':closeModal();break;
      case 'hint-button':showHint();break;
      case 'restart-button':if(game && game.state.phase!=='ended')showModal('restart');else startGame();break;
      case 'save-wallet':if($('wallet-input').value.trim()===''){$('wallet-error').textContent='请先填写金额。';break;}setBalance(Number($('wallet-input').value));break;
      case 'reset-wallet':setBalance(10000);break;
      case 'show-result':showModal('result');break;
      case 'fast-forward':autoplay=true;toast('加快剩余牌局，结束后展示结算');schedule();break;
    }
  });
  document.addEventListener('change',event=>{
    const t=event.target;
    switch(t.id) {
      case 'base-select':case 'setting-base':data.settings.base=Number(t.value);renderSettings();if(!game || game.state.phase==='ended')renderBoard();else toast('新底分将在下一局生效');break;
      case 'setting-difficulty':data.settings.difficulty=t.value;renderSettings();if(!game || game.state.phase==='ended')renderBoard();else toast('新难度将在下一局生效');break;
      case 'setting-music':data.settings.music=t.checked;audio.unlock();audio.setMusic(t.checked);renderSettings();break;
      case 'setting-effects':data.settings.effects=t.checked;audio.setEffects(t.checked);break;
      case 'setting-large':data.settings.largeFont=t.checked;renderSettings();break;
      case 'setting-speed':data.settings.speed=Number(t.value);break;
      default:return;
    }
    save();
  });
  document.addEventListener('input',event=>{
    if(event.target.id==='setting-volume'){data.settings.volume=Number(event.target.value)/100;audio.setVolume(data.settings.volume);$('volume-label').textContent=event.target.value+'%';save();}
  });
  document.addEventListener('keydown',event=>{
    if($('modal').open || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName || ''))return;
    if(event.key.toLowerCase()==='h'){event.preventDefault();showHint();}
    const focused = document.activeElement;
    if (focused?.closest('button,a,[role="button"]') && !focused.closest('#human-hand')) return;
    if((event.code==='Space'||event.key==='Enter')&&selected){event.preventDefault();perform('discard');}
    if(['ArrowLeft','ArrowRight'].includes(event.key) && game && humanActions().some(a=>a.type==='discard')){
      event.preventDefault();const tiles=[...$('human-hand').querySelectorAll('button')].filter(b=>humanActions().some(a=>a.type==='discard'&&a.tile===Number(b.dataset.tile)));
      const old=tiles.findIndex(b=>Number(b.dataset.index)===selected?.index);
      const next=(old+(event.key==='ArrowRight'?1:-1)+tiles.length)%tiles.length;
      if(tiles[next]){selected={tile:Number(tiles[next].dataset.tile),index:Number(tiles[next].dataset.index)};renderHand();}
    }
  });
  $('modal').addEventListener('close',schedule);
  $('modal').addEventListener('click',e=>{if(e.target===$('modal')){const b=$('modal').getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)closeModal();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimeout(timer);else schedule();});
  document.addEventListener('pointerdown',()=>audio.unlock(),{once:true});
  $('wallet-icon').innerHTML=icon('wallet');$('settings-icon').innerHTML=icon('settings');$('activity-icon').innerHTML=icon('activity');
  document.querySelector('[data-modal="settings"]').innerHTML=icon('settings');$('restart-button').innerHTML=icon('restart');
  $('footer-tip').innerHTML=icon('leaf')+' 定缺优先 · 不可吃牌 · 三家胡牌后结束';
  if(data.active){
    try{game=MahjongEngine.restore(data.active.snapshot);appliedDelta=Number.isFinite(data.active.appliedDelta)?data.active.appliedDelta:game.state.players[0].delta;lastLogLength=game.state.log.length;toast('已恢复上次牌局，欢迎回到小贺茶馆');}
    catch(_){data.active=null;game=null;toast('上次牌局无法恢复，余额与战绩已保留');}
  }
  renderSettings();sync();
})();
