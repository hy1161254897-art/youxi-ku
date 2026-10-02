/* Traditional Sichuan / Chongqing SVG faces; no remote fonts or images. */
(function () {
  'use strict';

  const CHINESE = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const SUITS = ['万', '筒', '条'];
  const RED = '#b42d40';
  const BLUE = '#192929'; // Traditional dark ink, rather than saturated blue.
  const GREEN = '#194f3c';
  const PAPER = '#f6f8f5';

  function name(tile) {
    return Number.isInteger(tile) && tile >= 0 && tile < 27
      ? CHINESE[tile % 9] + SUITS[Math.floor(tile / 9)]
      : '暗牌';
  }

  function suit(tile) {
    return Number.isInteger(tile) && tile >= 0 && tile < 27 ? Math.floor(tile / 9) : -1;
  }

  function characters(n) {
    return `<g text-anchor="middle" font-family="KaiTi, STKaiti, Kaiti SC, BiauKai, Noto Serif CJK SC, serif" font-weight="900">
      <text x="30" y="27" font-size="31" fill="${BLUE}" stroke="${BLUE}" stroke-width=".35">${CHINESE[n - 1]}</text>
      <text x="30" y="70" font-size="47" fill="${RED}" stroke="${RED}" stroke-width=".3">萬</text>
    </g>`;
  }

  function dot(x, y, r, color) {
    return `<g transform="translate(${x} ${y})" fill="none" stroke="${color}">
      <circle r="${r}" stroke-width="1.9"/>
      <circle r="${r * .72}" stroke-width="1.3"/>
      <circle r="${r * .43}" stroke-width="1.3"/>
      <circle r="${r * .14}" fill="${color}" stroke-width=".5"/>
    </g>`;
  }

  function dots(n) {
    if (n === 1) {
      return `<g transform="translate(30 40)">
        <circle r="23" fill="none" stroke="${BLUE}" stroke-width="2.1"/>
        <circle r="20.3" fill="none" stroke="${GREEN}" stroke-width="1.2"/>
        <g fill="${GREEN}" stroke="${GREEN}" stroke-width=".8">${Array.from({length:12},(_,i) => `<path transform="rotate(${i*30})" d="M-1.9-12.7C-5.2-15.3-4.1-19.1-1.1-18.6C1.3-22.2 5.2-19.2 3.2-15.9L1.8-12.7"/>`).join('')}</g>
        <circle r="12.4" fill="${PAPER}" stroke="${GREEN}" stroke-width="1.5"/>
        <circle r="9.3" fill="none" stroke="${RED}" stroke-width="2"/>
        <path d="M0-7.2 2.2-3.5 6.8-4.2 4.4 0 6.8 4.2 2.2 3.5 0 7.2-2.2 3.5-6.8 4.2-4.4 0-6.8-4.2-2.2-3.5Z" fill="${RED}"/>
        <circle r="2.4" fill="${PAPER}"/>
      </g>`;
    }
    const layouts = {
      2: [[30,20,BLUE],[30,60,GREEN]],
      3: [[16,17,BLUE],[30,40,RED],[44,63,GREEN]],
      4: [[17,21,GREEN],[43,21,GREEN],[17,59,GREEN],[43,59,GREEN]],
      5: [[16,17,GREEN],[44,17,GREEN],[30,40,RED],[16,63,GREEN],[44,63,GREEN]],
      6: [[17,17,GREEN],[43,17,GREEN],[17,40,RED],[43,40,RED],[17,63,RED],[43,63,RED]],
      7: [[13,13,GREEN],[30,18,GREEN],[47,23,GREEN],[19,44,RED],[41,44,RED],[19,64,RED],[41,64,RED]],
      8: [[18,12,BLUE],[42,12,BLUE],[18,31,BLUE],[42,31,BLUE],[18,50,BLUE],[42,50,BLUE],[18,69,BLUE],[42,69,BLUE]],
      9: [[13,16,BLUE],[30,16,BLUE],[47,16,BLUE],[13,40,RED],[30,40,RED],[47,40,RED],[13,64,GREEN],[30,64,GREEN],[47,64,GREEN]]
    };
    const radius = {2:14,3:10.4,4:11.2,5:10.2,6:10.2,7:8,8:8.5,9:7.5}[n];
    return layouts[n].map(([x, y, color]) => dot(x, y, radius, color)).join('');
  }

  function bambooRod(x, y, h, color = GREEN, angle = 0) {
    return `<g transform="translate(${x} ${y}) rotate(${angle}) scale(1 ${h/28})" stroke="${color}" stroke-linecap="round" stroke-linejoin="round">
      <path d="M-3-12Q0-15 3-12L3-6Q5-3 3 0Q5 3 3 6L3 12Q0 15-3 12L-3 6Q-5 3-3 0Q-5-3-3-6Z" fill="none" stroke-width="2.2"/>
      <path d="M0-10V-5M0-2V2M0 5V10" fill="none" stroke-width="1.3"/>
    </g>`;
  }

  function bird() {
    return `<g fill="none" stroke="${GREEN}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 14 16 9 24 11Q30 7 37 12L44 8 40 17Q42 24 37 29L37 35M21 16Q17 23 22 29L22 36"/>
      <path d="M23 14Q30 11 37 16L37 24Q30 31 23 25Z" fill="${PAPER}"/>
      <path d="M24 31Q19 34 21 44L28 65 26 42M29 32 29 45 36 72 33 43M34 31 35 44 43 68 39 40 37 34"/>
      <path d="M20 32Q13 24 12 32Q10 38 18 39M40 30Q47 25 46 33Q48 40 41 39M21 40Q12 37 8 43L15 46M40 40 47 42 52 38M13 49Q27 43 49 45"/>
      <path d="M17 33 16 36M43 31 43 35M25 35 26 39M33 35 34 39"/>
      <circle cx="27" cy="19.5" r="1.1" fill="${GREEN}" stroke="none"/><circle cx="34" cy="19.5" r="1.1" fill="${GREEN}" stroke="none"/>
      <path d="m29 23 2-1 2 1-2 4Z" fill="${RED}" stroke="${RED}" stroke-width=".7"/>
    </g>`;
  }

  function bamboo(n) {
    if (n === 1) return bird();
    if (n === 8) {
      const d = 'M11 12V32L17 32 30 19 43 32H49V12M11 68V48H17L30 61 43 48H49V68';
      return `<path d="${d}" fill="none" stroke="${GREEN}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${PAPER}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    const rows = {
      2: [[30, 21], [30, 58]],
      3: [[30, 19], [17, 57], [43, 57]],
      4: [[18, 21], [42, 21], [18, 58], [42, 58]],
      5: [[15, 19], [45, 19], [30, 39], [15, 60], [45, 60]],
      6: [[14, 21], [30, 21], [46, 21], [14, 58], [30, 58], [46, 58]],
      7: [[30, 14], [14, 36], [30, 36], [46, 36], [14, 62], [30, 62], [46, 62]],
      9: [[14, 15], [30, 15], [46, 15], [14, 39], [30, 39], [46, 39], [14, 63], [30, 63], [46, 63]]
    };
    return rows[n].map(([x, y, angle], index) => {
      const red = n === 5 && index === 2 || n === 7 && index === 0 || n === 9 && index % 3 === 1;
      return bambooRod(x, y, n >= 7 ? 19 : 27, red ? RED : GREEN, angle || 0);
    }).join('');
  }

  function back() {
    return `<rect x="4" y="4" width="52" height="72" rx="5" fill="#155e52"/>
      <rect x="7" y="7" width="46" height="66" rx="3" fill="none" stroke="#69a58a" stroke-width="1"/>
      <path d="M30 12 L49 40 L30 68 L11 40 Z M30 21 L43 40 L30 59 L17 40 Z" fill="none" stroke="#88ad88" stroke-width="1.2"/>
      <path d="M12 12 L48 68 M48 12 L12 68 M8 29 L52 51 M8 51 L52 29" stroke="#82ae91" stroke-opacity=".25" stroke-width="1"/>
      <path d="M30 29 L38 40 L30 51 L22 40 Z" fill="#d0ba75"/>
      <path d="M30 34 L34 40 L30 46 L26 40 Z" fill="#236958"/>
      <g fill="#c8b36f"><circle cx="12" cy="12" r="1.2"/><circle cx="48" cy="12" r="1.2"/><circle cx="12" cy="68" r="1.2"/><circle cx="48" cy="68" r="1.2"/></g>`;
  }

  function html(tile, options = {}) {
    const hidden = options.back || suit(tile) < 0;
    const family = suit(tile);
    const n = tile % 9 + 1;
    const artwork = hidden ? back() : family === 0 ? characters(n) : family === 1 ? dots(n) : bamboo(n);
    return `<svg class="tile-art${options.small ? ' tile-art-small' : ''}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80" width="60" height="80" role="img" aria-label="${hidden ? '暗牌' : name(tile)}" focusable="false" style="display:block;width:100%;height:100%;pointer-events:none">${artwork}</svg>`;
  }

  window.MahjongTiles = Object.freeze({ html, name, suit });
})();
