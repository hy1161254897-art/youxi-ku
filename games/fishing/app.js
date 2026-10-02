(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const icons = {
    fish:'<path d="M3 12c5-8 12-8 16-2l4-4v12l-4-4C15 20 8 20 3 12Z"/><circle cx="8" cy="11" r="1"/><path d="M12 6l2-3 3 4M12 18l2 3 3-4"/>',
    waves:'<path d="M2 6c4-4 6 4 10 0s6 4 10 0M2 12c4-4 6 4 10 0s6 4 10 0M2 18c4-4 6 4 10 0s6 4 10 0"/>',
    book:'<path d="M12 5v16M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2Z"/>',
    chart:'<path d="M4 3v18h17M8 16v-5M13 16V7M18 16V4"/>',
    music:'<path d="M9 17V5l11-2v12M9 9l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2.5"/><ellipse cx="17" cy="16" rx="3" ry="2.5"/>',
    settings:'<path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h5l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3Z"/><circle cx="11.5" cy="12" r="3.5"/>',
    help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4.1 2c-1 .8-1.6 1-1.6 2.5M12 17h.01"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    pause:'<path d="M8 5v14M16 5v14" stroke-width="3"/>',
    play:'<path d="m8 4 12 8-12 8Z" fill="currentColor" stroke="none"/>',
    expand:'<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/>',
    coin:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="6"/><path d="m13.5 8-3 4h3l-3 4"/>',
    volume:'<path d="M10 4 5 8H2v8h3l5 4ZM14 8q4 4 0 8M17 5q7 7 0 14"/>',
    auto:'<path d="M19 8a8 8 0 0 0-14-2L2 9M2 4v5h5M5 16a8 8 0 0 0 14 2l3-3m0 5v-5h-5"/><path d="m10 8 5 4-5 4Z" fill="currentColor" stroke="none"/>',
    target:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>',
    snow:'<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3M3 10l4-1-1-4M18 19l-1-4 4-1M3 14l4 1-1 4M18 5l-1 4 4 1"/>',
    bolt:'<path d="m13 2-9 12h7l-1 8 10-13h-7Z" fill="currentColor" stroke="none"/>',
    wallet:'<path d="M20 7V4H5a2 2 0 0 0 0 4h16v12H5a2 2 0 0 1-2-2V6M21 12h-6v4h6"/><path d="M17 14h.01"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    sparkles:'<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5ZM20 2v4M18 4h4"/>',
    activity:'<path d="M2 12h5l3-8 4 16 3-8h5"/>',
    close:'<path d="m6 6 12 12M6 18 18 6"/>',
  };
  function paintIcons(root = document) { root.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[el.dataset.icon] || icons.fish}</svg>`; }); }
  paintIcons();
  const KEY = 'xiaohe-fishery-v1';
  const n = value => Math.max(0, Math.min(999999999999, Math.floor(Number(value) || 0)));
  const fmt = value => n(value).toLocaleString('zh-CN');
  const signed = value => `${value >= 0 ? '+' : '−'}${fmt(Math.abs(value))}`;
  let loaded = {};
  try { loaded = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (_) {}
  const prefs = Object.assign({music:true,sfx:true,musicVolume:.35,sfxVolume:.65,effects:!matchMedia('(prefers-reduced-motion: reduce)').matches,scene:'reef'}, loaded.prefs || {});
  const recent = Array.isArray(loaded.recent) ? loaded.recent.filter(x => x && typeof x.name === 'string').slice(0,6) : [];
  let bestCombo = n(loaded.bestCombo), totalRecharged = n(loaded.totalRecharged), toastTimer, catchTimer, lastSave = 0, manualPause = false, storageFailed = false;
  let lastEpicAt=0;
  let game, state, activeModal = '', lastDisplayed = {};
  const audio = new FishingAudio();
  audio.setMusic(!!prefs.music); audio.setSfx(!!prefs.sfx);
  audio.setMusicVolume(Math.max(0,Math.min(1,Number(prefs.musicVolume)||0))); audio.setSfxVolume(Math.max(0,Math.min(1,Number(prefs.sfxVolume)||0)));
  function toast(message) { $('toast').textContent = message; $('toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2900); }
  function save(force=false) {
    if (!game || (!force && Date.now()-lastSave<1000)) return;
    const s = game.getState();
    try { localStorage.setItem(KEY,JSON.stringify({version:1,balance:s.balance,power:s.power,chance:s.chance,stats:{totalCaught:s.totalCaught,totalEarned:s.totalEarned,totalSpent:s.totalSpent,catches:s.catches,elapsed:s.elapsed,bestCombo},bestCombo,totalRecharged,prefs,recent})); lastSave=Date.now(); }
    catch (_) { if (!storageFailed) { storageFailed=true; $('save-status').textContent='本次进度暂不能保存'; toast('浏览器未允许本地保存，本次游戏仍可正常游玩'); } }
  }
  function put(id, text) { if(lastDisplayed[id]!==text){$(id).textContent=text;lastDisplayed[id]=text;} }
  function render(s) {
    state=s; bestCombo=Math.max(bestCombo,n(s.combo),n(s.bestCombo));
    put('balance',fmt(s.balance)); put('haul',fmt(s.totalEarned)); put('caught-count',`${fmt(s.totalCaught)} 条`); put('best-combo',`${bestCombo} 连`); put('power-value',fmt(s.power));
    $('balance').classList.toggle('large-balance',s.balance>=1000000);$('balance').classList.toggle('huge-balance',s.balance>=1000000000);$('balance').title=fmt(s.balance)+' 游戏币';
    if($('fs-balance'))$('fs-balance').textContent=fmt(s.balance);
    $('power-down').disabled=s.power<=POWERS[0]; $('power-up').disabled=s.power>=POWERS[POWERS.length-1];
    if($('chance-select').value!==String(s.chance)) $('chance-select').value=String(s.chance);
    if($('fs-chance'))$('fs-chance').value=String(s.chance);
    $('auto-button').classList.toggle('enabled',!!s.auto); $('auto-button').setAttribute('aria-pressed',String(!!s.auto));
    $('lock-button').classList.toggle('enabled',!!s.lock); $('lock-button').setAttribute('aria-pressed',String(!!s.lock));
    put('auto-status',s.auto?'A · 已开启':'A · 未开启'); put('lock-status',s.lock?'L · 已锁定':'L · 未开启');
    for(const key of ['freeze','rage']) {
      const skill=s.skills?.[key]||{active:0,cooldown:0};
      const active=Number(skill.active)||0, cooldown=Math.ceil(skill.cooldown||0);
      put(`${key}-status`,active>0?`生效中 ${Math.ceil(active)}s`:cooldown>0?`冷却 ${cooldown}s`:`${key==='freeze'?'F':'R'} · 就绪`);
      $(`${key}-button`).disabled=!s.started||s.paused||cooldown>0||active>0;
      $(`${key}-button`).classList.toggle('enabled',active>0);
    }
    $('welcome').hidden=!!s.started;
    $('pause-overlay').hidden=!s.started||!s.paused||$('modal').open||document.hidden;
    $('pause-button').setAttribute('aria-label',manualPause?'继续游戏':'暂停游戏');
    const wave=Math.ceil(s.waveIn || 0), boss=Math.ceil(s.bossIn || 0);
    put('event-title',boss<wave?'海王巡游':'深海鱼潮'); put('event-timer',`${Math.min(wave,boss)} 秒后抵达`);
    put('combo-indicator',s.combo>=3?`${s.combo} 连捕`:'');
    const idx=Math.max(0,POWERS.indexOf(s.power));
    if(lastDisplayed.dots!==idx){$('power-dots').innerHTML=POWERS.map((_,i)=>`<i class="${i<=idx?'on':''}"></i>`).join('');lastDisplayed.dots=idx;}
    save();
  }
  const POWERS=[10,20,50,100,200,500,1000];
  function onEvent(e) {
    if(!game) return;
    if(e.type==='state') render(e.state||game.getState());
    if(e.type==='capture') {
      const entry={id:e.id||e.speciesId||e.species?.id,name:e.name,tier:e.tier,reward:e.reward,time:Date.now()};
      recent.unshift(entry);recent.splice(6);bestCombo=Math.max(bestCombo,n(e.combo));renderRecent();save(true);
      if(e.tier===3 && Date.now()-lastEpicAt>5000){lastEpicAt=Date.now();const el=$('big-catch');el.innerHTML=`<small>EPIC CATCH · 史诗捕获</small>${escapeHtml(e.name)}<b>＋${fmt(e.reward)}</b>`;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');clearTimeout(catchTimer);catchTimer=setTimeout(()=>el.classList.remove('show'),3600);}
    }
    if(e.type==='notice') toast(e.message);
    if(e.type==='wave') toast('鱼潮来啦！鱼群正在集结，准备满载而归');
    if(e.type==='boss') toast('海王降临！开启锁定，迎接传说级捕获');
    if(e.type==='empty') { toast('金币不足，点击「充值游戏币」即可免费补充'); if(!$('modal').open) openModal('wallet'); }
  }
  const fsTools=document.createElement('div');fsTools.className='fullscreen-tools';fsTools.innerHTML='<span class="fs-coins"><span data-icon="coin"></span><strong id="fs-balance">20,000</strong></span><button data-modal="wallet" class="fs-recharge">＋ 补给</button><select id="fs-chance" aria-label="捕捉概率"></select><button data-modal="settings" class="icon-button" aria-label="游戏设置" data-icon="settings"></button>';
  document.querySelector('.sea-tools').prepend(fsTools);$('fs-chance').innerHTML=$('chance-select').innerHTML;paintIcons(fsTools);
  game=new FishGame($('game-canvas'),{audio,onEvent,balance:loaded.balance===undefined?20000:n(loaded.balance),power:POWERS.includes(loaded.power)?loaded.power:10,chance:loaded.chance||'original',stats:loaded.stats||{}});
  game.setEffects(!!prefs.effects);
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function thumbnail(canvas, species, small=false) {
    if(!species) return;
    canvas.width=small?100:300;canvas.height=small?70:150;
    const c=canvas.getContext('2d');
    FishGame.drawFish(c,species,canvas.width/2,canvas.height/2,small?24:49,1,0);
  }
  function renderRecent() {
    if(!recent.length) return;
    $('catch-list').innerHTML=recent.map((r,i)=>`<div class="catch-row"><canvas data-recent="${i}" aria-hidden="true"></canvas><div>${escapeHtml(r.name)}<small>${['','普通鱼群','珍稀伙伴','史诗宝藏','传说海王'][r.tier]||'海底伙伴'}</small></div><b>+${fmt(r.reward)}</b></div>`).join('');
    $('catch-list').querySelectorAll('canvas').forEach(c=>{const r=recent[Number(c.dataset.recent)];thumbnail(c,FishGame.SPECIES.find(s=>s.id===r.id||s.name===r.name),true);});
  }
  function pauseSync(){ const paused=manualPause||$('modal').open||document.hidden;game.pause(paused);audio.setPaused(paused||!game.getState().started);render(game.getState()); }
  function start(){audio.unlock();game.start();manualPause=false;pauseSync();$('game-canvas').focus({preventScroll:true});}
  $('start-button').onclick=start;
  function togglePause(){if(!game.getState().started)return toast('点击「开始捕鱼」，开启海底之旅');manualPause=!manualPause;pauseSync();}
  $('pause-button').onclick=togglePause;$('resume-button').onclick=()=>{manualPause=false;pauseSync();};
  function powerStep(delta){const i=POWERS.indexOf(game.getState().power);game.setPower(POWERS[Math.max(0,Math.min(POWERS.length-1,i+delta))]);audio.click();render(game.getState());save(true);}
  $('power-down').onclick=()=>powerStep(-1);$('power-up').onclick=()=>powerStep(1);
  $('auto-button').onclick=()=>{if(!game.getState().started)start();game.setAuto(!game.getState().auto);audio.click();render(game.getState());};
  $('lock-button').onclick=()=>{game.setLock(!game.getState().lock);audio.click();render(game.getState());if(game.getState().lock)toast('锁定已开启：点击目标可切换，默认追踪高价值鱼');};
  $('freeze-button').onclick=()=>game.useSkill('freeze');$('rage-button').onclick=()=>game.useSkill('rage');
  function updateChance(){const v=game.getState().chance;$('chance-select').value=String(v);$('chance-note').textContent=v==='sure'?'命中即捕获 · 所有鱼种均为 100%。':v==='original'?'经典手感，让每次捕获都有惊喜。':`原概率 × ${Number(v)+1}，最高 100%。`;}
  $('chance-select').onchange=e=>{game.setChance(e.target.value);updateChance();audio.click();save(true);toast(e.target.value==='sure'?'必中模式已开启，命中目标即可捕获':'捕捉概率已更新，对新发射的炮弹生效');};
  $('fs-chance').onchange=e=>{$('chance-select').value=e.target.value;$('chance-select').dispatchEvent(new Event('change'));};
  function scene(id,announce=true){if(!['reef','night','sunset'].includes(id))id='reef';prefs.scene=id;$('ocean-stage').classList.remove('night','sunset');if(id!=='reef')$('ocean-stage').classList.add(id);$('scene-label').textContent={reef:'珊瑚秘境',night:'月光深海',sunset:'鎏金海湾'}[id];document.querySelectorAll('[data-scene]').forEach(b=>b.classList.toggle('selected',b.dataset.scene===id));game.setScene(id);if(announce){audio.click();toast(`已驶入${$('scene-label').textContent}`);save(true);}}
  document.querySelectorAll('[data-scene]').forEach(b=>b.onclick=()=>scene(b.dataset.scene));
  function musicUI(){$('music-toggle').classList.toggle('muted',!prefs.music);$('music-toggle').setAttribute('aria-label',prefs.music?'关闭背景音乐':'开启背景音乐');$('music-toggle').setAttribute('aria-pressed',String(!!prefs.music));}
  $('music-toggle').onclick=()=>{prefs.music=!prefs.music;audio.setMusic(prefs.music);audio.unlock();musicUI();save(true);toast(prefs.music?'背景音乐已开启':'背景音乐已关闭');};
  function immersive(value){
    $('game-shell').classList.toggle('immersive',value);document.body.classList.toggle('game-immersive',value);
    $('fullscreen-button').setAttribute('aria-label',value?'退出全屏游戏':'全屏游戏');
    game.handlers.blur();
    requestAnimationFrame(()=>game.resize());
  }
  $('fullscreen-button').onclick=async()=>{
    if($('game-shell').classList.contains('immersive'))return immersive(false);
    if(document.fullscreenElement){await document.exitFullscreen();return;}
    try{if(!$('game-shell').requestFullscreen)throw new Error('Fullscreen API unavailable');await $('game-shell').requestFullscreen();}
    catch(_){immersive(true);toast('已进入沉浸模式，再点右上角可退出；横屏视野更开阔');}
  };
  document.addEventListener('fullscreenchange',()=>{$('fullscreen-button').setAttribute('aria-label',document.fullscreenElement?'退出全屏游戏':'全屏游戏');game.handlers.blur();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('game-shell').classList.contains('immersive'))immersive(false);});
  if(matchMedia('(pointer: coarse)').matches)$('stage-tip').innerHTML='<span class="tiny-crosshair">⌖</span> 手指滑动瞄准 · 按住连发';
  function walletHTML(){return `<p class="modal-intro">给快乐加点油。所有游戏币均可免费添加，只用于本机娱乐。</p><div class="modal-balance"><span>当前游戏币</span><strong>${fmt(game.getState().balance)}</strong></div><form id="wallet-form"><label class="input-label" for="coin-amount">自定义充值数量</label><input class="coin-input" id="coin-amount" type="number" min="1" max="1000000000" step="1" inputmode="numeric" value="10000" required><div class="quick-values">${[10000,50000,100000,1000000].map(v=>`<button type="button" data-add="${v}">+${v>=10000?v/10000+'万':v}</button>`).join('')}</div><p class="input-error" id="coin-error" role="status"></p><button class="primary-button full-width" type="submit">免费充值，继续畅玩 <span>→</span></button></form><p class="fine-print">单次可添加 1–1,000,000,000 游戏币，不收取费用，无真实支付或提现。</p>`;}
  function atlasHTML(){const s=game.getState();return `<div class="atlas-header"><span>${FishGame.SPECIES.length} 种海洋伙伴，等你来发现</span><span>已捕获 ${FishGame.SPECIES.filter(f=>s.catches?.[f.id]>0).length} / ${FishGame.SPECIES.length}</span></div><div class="atlas-grid">${FishGame.SPECIES.map((f,i)=>`<div class="fish-card tier-${f.tier}"><canvas data-species="${i}" aria-label="${f.name}"></canvas><strong>${f.name}</strong><span class="tier-tag">${['','普通','珍稀','史诗','传说'][f.tier]}</span><p>炮值 × ${f.reward}</p><small>基础概率 ${Number((f.chance*100).toFixed(2))}%</small><small>累计捕获 ${fmt(s.catches?.[f.id]||0)} 条</small></div>`).join('')}</div><p class="fine-print">奖励 = 命中炮弹的炮值 × 鱼种倍率。概率加成不改变奖励倍率；炮值越高，单发消耗和奖励同步增加。图鉴数值为本作休闲规则。</p>`;}
  function statsHTML(){const s=game.getState(),net=s.totalEarned-s.totalSpent;const stats=[['累计捕获',`${fmt(s.totalCaught)} 条`],['最高连捕',`${bestCombo} 连`],['传说捕获',`${fmt(FishGame.SPECIES.filter(f=>f.tier===4).reduce((v,f)=>v+(s.catches?.[f.id]||0),0))} 条`],['捕获收入',fmt(s.totalEarned)],['发射消耗',fmt(s.totalSpent)],['捕鱼净收益',signed(net)]];const achievements=[['✧','初次出海','捕获第一条鱼',s.totalCaught>=1],['❖','满载而归','累计捕获 100 条鱼',s.totalCaught>=100],['✦','连捕高手','达到 10 连捕',bestCombo>=10],['♛','海王收藏家','捕获任意传说级鱼',FishGame.SPECIES.some(f=>f.tier===4&&s.catches?.[f.id]>0)]];return `<div class="stat-grid">${stats.map(([a,b],i)=>`<div class="stat-tile ${i===3?'gold':''}"><span>${a}</span><strong>${b}</strong></div>`).join('')}</div><p class="fine-print">净收益仅统计捕鱼收入与炮弹消耗；免费充值不计入收益。累计添加 ${fmt(totalRecharged)} 游戏币。游玩 ${Math.floor((s.elapsed||0)/60)} 分钟。</p><h3 class="modal-section-title">航海成就</h3>${achievements.map(([symbol,name,desc,done])=>`<div class="achievement ${done?'unlocked':''}"><span>${symbol}</span><div><strong>${name}${done?' · 已达成':''}</strong><small>${desc}</small></div></div>`).join('')}`;}
  function settingsHTML(){return `<div class="settings-row"><div>背景音乐<small>原创热带旋律 · 马林巴与海岛鼓点</small></div><button class="switch" id="setting-music" role="switch" aria-label="背景音乐" aria-checked="${!!prefs.music}"></button></div><label class="settings-row" for="music-volume"><span>音乐音量</span><input id="music-volume" type="range" min="0" max="100" value="${Math.round(prefs.musicVolume*100)}"></label><div class="settings-row"><div>操作音效<small>开炮、命中、金币与分级捕获庆祝</small></div><button class="switch" id="setting-sfx" role="switch" aria-label="操作音效" aria-checked="${!!prefs.sfx}"></button></div><label class="settings-row" for="sfx-volume"><span>音效音量</span><input id="sfx-volume" type="range" min="0" max="100" value="${Math.round(prefs.sfxVolume*100)}"></label><div class="settings-row"><div>增强视觉反馈<small>屏幕震动与更多庆祝粒子</small></div><button class="switch" id="setting-effects" role="switch" aria-label="增强视觉反馈" aria-checked="${!!prefs.effects}"></button></div><div class="settings-row"><span>试听捕获音效</span><button class="primary-button" id="sound-preview" style="padding:9px 14px;font-size:11px">传说级庆祝 ♫</button></div><p class="settings-footer">金币、设置、图鉴与战绩保存在当前浏览器。切换浏览器、访问地址或清除浏览器数据可能使用不同存档。打开弹窗或切换到后台时，捕鱼与计时都会暂停。</p>`;}
  function helpHTML(){return `<div class="help-grid"><div class="help-step"><b>01 / 瞄准</b><h3>指向鱼群，按住开炮</h3><p>移动鼠标或手指瞄准，点击发射，按住连续开火。也可按住空格，或开启自动开火。</p></div><div class="help-step"><b>02 / 捕获</b><h3>一炮撒网，惊喜成群</h3><p>炮弹命中后展开渔网，范围内每条鱼独立判定一次。成功捕获后，奖励金币飞回炮台。</p></div><div class="help-step"><b>03 / 技能</b><h3>把握你的高光时刻</h3><p>锁定自动追踪高价值目标，可点击切换目标；冰冻减缓鱼群移动，狂暴提高射速。技能免费使用，冷却后可再次释放。</p></div><div class="help-step"><b>04 / 奇遇</b><h3>鱼潮涌来，海王登场</h3><p>定时迎来鱼潮与传说海王。鱼越珍贵，奖励越高，捕获时的烟花、音效和庆祝也越盛大。</p></div></div><div class="rules-copy"><b>炮台与概率</b><br>炮值有 10 / 20 / 50 / 100 / 200 / 500 / 1,000 七档，每发扣除对应游戏币，捕获奖励按该炮值计算。每发炮弹使用发射时的炮值与概率设置。<br><br>“原版”使用图鉴内的基础捕捉概率；“提升 N 倍” = 基础概率 ×（1 + N），最高 100%；“必中”表示命中炮弹或渔网范围内的鱼必定捕获。只增加炮值不会增加成功率。<br><br>3.3 秒内连续捕获可延续连捕记录。所有金币均为本地娱乐积分，充值免费，不涉及真实交易。</div><div class="shortcut-list"><span><kbd>空格</kbd> 开炮</span><span><kbd>A</kbd> 自动</span><span><kbd>L</kbd> 锁定</span><span><kbd>F</kbd> 冰冻</span><span><kbd>R</kbd> 狂暴</span><span><kbd>P</kbd> 暂停</span><span><kbd>− / ＋</kbd> 炮值</span></div>`;}
  function openModal(type){activeModal=type;$('modal-title').textContent={wallet:'快乐补给站',atlas:'深海鱼类图鉴',stats:'我的航海战绩',settings:'渔场设置',help:'新手航海指南'}[type];$('modal-body').innerHTML={wallet:walletHTML,atlas:atlasHTML,stats:statsHTML,settings:settingsHTML,help:helpHTML}[type]();if(!$('modal').open)$('modal').showModal();pauseSync();
    if(type==='atlas')$('modal-body').querySelectorAll('canvas').forEach(c=>thumbnail(c,FishGame.SPECIES[Number(c.dataset.species)]));
    if(type==='wallet'){
      document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{$('coin-amount').value=b.dataset.add;$('coin-error').textContent='';audio.click();});
      $('wallet-form').onsubmit=e=>{e.preventDefault();const value=Number($('coin-amount').value);if(!Number.isSafeInteger(value)||value<1||value>1e9){$('coin-error').textContent='请输入 1 到 1,000,000,000 之间的整数';return;}if(game.getState().balance+value>999999999999){$('coin-error').textContent='余额已达上限，请消耗部分金币后再添加';return;}game.setBalance(game.getState().balance+value);totalRecharged+=value;audio.recharge();render(game.getState());save(true);$('modal').close();toast(`充值成功！＋${fmt(value)} 游戏币`);};
    }
    if(type==='settings'){
      for(const key of ['music','sfx','effects'])$(`setting-${key}`).onclick=()=>{prefs[key]=!prefs[key];$(`setting-${key}`).setAttribute('aria-checked',String(prefs[key]));if(key==='music'){audio.setMusic(prefs.music);musicUI();}else if(key==='sfx')audio.setSfx(prefs.sfx);else game.setEffects(prefs.effects);save(true);};
      $('music-volume').oninput=e=>{prefs.musicVolume=Number(e.target.value)/100;audio.setMusicVolume(prefs.musicVolume);save(true);};
      $('sfx-volume').oninput=e=>{prefs.sfxVolume=Number(e.target.value)/100;audio.setSfxVolume(prefs.sfxVolume);save(true);};
      $('sound-preview').onclick=async()=>{await audio.unlock();audio.capture(4,10);};
    }
  }
  document.querySelectorAll('[data-modal]').forEach(b=>b.onclick=()=>{audio.click();openModal(b.dataset.modal);});
  $('modal-close').onclick=()=>$('modal').close();$('modal').addEventListener('close',()=>{activeModal='';pauseSync();save(true);});
  $('modal').addEventListener('click',e=>{if(e.target===$('modal')){const r=$('modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('modal').close();}});
  $('home-nav').onclick=()=>{if($('modal').open)$('modal').close();$('game-shell').scrollIntoView({behavior:'smooth',block:'nearest'});};
  document.addEventListener('pointerdown',()=>audio.unlock(),{passive:true});
  document.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||$('modal').open||/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName))return;const key=e.key.toLowerCase();const actions={a:()=>$('auto-button').click(),l:()=>$('lock-button').click(),f:()=>$('freeze-button').click(),r:()=>$('rage-button').click(),p:togglePause,'-':()=>powerStep(-1),'=':()=>powerStep(1),'+':()=>powerStep(1)};if(actions[key]){e.preventDefault();audio.unlock();actions[key]();}});
  document.addEventListener('visibilitychange',()=>{pauseSync();save(true);});
  window.addEventListener('pagehide',()=>save(true));
  window.addEventListener('fish-assets-ready',()=>{renderRecent();if(activeModal==='atlas'&&$('modal').open)$('modal-body').querySelectorAll('canvas').forEach(c=>thumbnail(c,FishGame.SPECIES[Number(c.dataset.species)]));});
  scene(prefs.scene,false);musicUI();updateChance();renderRecent();render(game.getState());audio.setPaused(true);
})();


