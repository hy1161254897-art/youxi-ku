(function () {
  'use strict';

  // Editable, self-contained portraits; all paints stay inside the offline game.
  const portraits = {
    1: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="张燕子，温柔端庄的老板娘">
      <title>张燕子 · 温柔端庄的老板娘</title>
      <defs>
        <linearGradient id="yan-bg" x2="1" y2="1"><stop stop-color="#eee8cf"/><stop offset="1" stop-color="#b2c5ac"/></linearGradient>
        <linearGradient id="yan-skin" x1="0" x2="1" y2="1"><stop stop-color="#ffe4c9"/><stop offset=".65" stop-color="#efc2a4"/><stop offset="1" stop-color="#dca388"/></linearGradient>
        <linearGradient id="yan-hair" x2=".8" y2="1"><stop stop-color="#514239"/><stop offset=".6" stop-color="#302e2b"/><stop offset="1" stop-color="#1f2927"/></linearGradient>
        <linearGradient id="yan-jacket" x2="1" y2="1"><stop stop-color="#547c6c"/><stop offset="1" stop-color="#294e45"/></linearGradient>
      </defs>
      <path fill="url(#yan-bg)" d="M0 0h128v128H0z"/>
      <circle cx="64" cy="50" r="45" fill="#faf3dc" opacity=".47"/>
      <g fill="none" stroke="#839f86" stroke-width="1.6" opacity=".38"><path d="M11 109Q25 78 17 49M16 69q13-14 14-24M19 87Q7 75 8 65"/><path d="M111 117q-10-29 5-55M110 85q-12-10-11-18"/></g>
      <path fill="#2b3731" d="M36 67q-13 0-15 11-2 12 12 15 17 3 20-10z"/>
      <path fill="url(#yan-jacket)" d="M14 128l4-17q4-16 23-21l21-5 23 5q25 5 29 24l3 14z"/>
      <path fill="#efc5a8" d="M51 76h25l3 19-15 16-17-15z"/>
      <path fill="#ca977d" opacity=".48" d="M53 79l24 1v9q-13 10-25-2z"/>
      <path fill="#f2e7cb" d="M47 91l17 13 16-13-5 25H54z"/>
      <path fill="#779588" d="M44 90l21 15-9 11-14-19z"/>
      <path fill="#426a5c" d="M83 90l-19 14-10 24h18l15-31z"/>
      <path d="M64 105l-10 23" fill="none" stroke="#a9ba99" stroke-width="1.2"/>
      <circle cx="61" cy="115" r="2" fill="#decda0"/><circle cx="57" cy="125" r="2" fill="#decda0"/>
      <path fill="url(#yan-hair)" d="M34 53q-7-28 10-36 23-14 43 1 17 13 7 41l-9 19-43 1z"/>
      <ellipse cx="37" cy="59" rx="5.5" ry="8" fill="#e7b295"/><ellipse cx="90" cy="59" rx="5" ry="8" fill="#e7b295"/>
      <path fill="url(#yan-skin)" d="M39 40q12-4 25-16 5 14 23 18l-1 25q-2 13-13 21-9 6-17 0-15-9-17-25z"/>
      <path fill="url(#yan-hair)" d="M37 53l-3-17 12-13 24-6q22 6 21 32l-6-10q-15-1-21-14-8 17-24 19z"/>
      <path d="M40 34q8-16 22-15M72 20q12 5 16 16" fill="none" stroke="#867060" stroke-width="2" stroke-linecap="round" opacity=".52"/>
      <path d="M28 75l13-8" stroke="#ceb780" stroke-width="2.2" stroke-linecap="round"/><circle cx="27" cy="76" r="2.7" fill="#e6d5a7"/>
      <path d="M45 49q6-3 12 0M70 49q6-3 12 0" fill="none" stroke="#5b443a" stroke-width="2.1" stroke-linecap="round"/>
      <path d="M45 57q5-4 11 0M71 57q5-4 10 0" fill="none" stroke="#3b3731" stroke-width="1.9" stroke-linecap="round"/>
      <ellipse cx="51" cy="57" rx="1.9" ry="2.2" fill="#3c3530"/><ellipse cx="76" cy="57" rx="1.9" ry="2.2" fill="#3c3530"/>
      <path d="M63 57l-2 10q3 2 6 0" fill="none" stroke="#bc8871" stroke-width="1.4" stroke-linecap="round"/>
      <ellipse cx="46" cy="67" rx="5.5" ry="2.8" fill="#dd998c" opacity=".35"/><ellipse cx="80" cy="67" rx="5.5" ry="2.8" fill="#dd998c" opacity=".35"/>
      <path d="M55 75q8 6 16 0-8 2-16 0" fill="#ae6261"/><path d="M59 80q5 2 9-1" fill="none" stroke="#ffddc4" stroke-width="1.7" stroke-linecap="round"/>
      <circle cx="37" cy="69" r="3.1" fill="#ead7a9"/><circle cx="37" cy="68.5" r="2" fill="#fff5db"/><circle cx="89" cy="69" r="3.1" fill="#ead7a9"/><circle cx="89" cy="68.5" r="2" fill="#fff5db"/>
      <path d="M30 111l-3 17M97 110l4 18" stroke="#9bb09b" stroke-width="1.4" opacity=".4"/>
    </svg>`,
    2: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="贺老五，大大咧咧、开朗豪爽的老板">
      <title>贺老五 · 开朗豪爽的老板</title>
      <defs>
        <linearGradient id="wu-bg" x2="1" y2="1"><stop stop-color="#eaddba"/><stop offset="1" stop-color="#c3a573"/></linearGradient>
        <linearGradient id="wu-skin" x2=".85" y2="1"><stop stop-color="#f8d8b4"/><stop offset=".65" stop-color="#e9b18b"/><stop offset="1" stop-color="#cd8c6c"/></linearGradient>
        <linearGradient id="wu-hair" x2=".9" y2="1"><stop stop-color="#55443b"/><stop offset="1" stop-color="#282d28"/></linearGradient>
        <linearGradient id="wu-jacket" x2="1" y2="1"><stop stop-color="#aa8050"/><stop offset="1" stop-color="#765537"/></linearGradient>
      </defs>
      <path fill="url(#wu-bg)" d="M0 0h128v128H0z"/>
      <circle cx="62" cy="48" r="44" fill="#fff1ce" opacity=".37"/>
      <path d="M8 96h20V60H8m96 39h17V48h-17M11 68h14m82-10h11" fill="none" stroke="#94784f" stroke-width="2" opacity=".2"/>
      <path fill="url(#wu-jacket)" d="M7 128l2-18q2-14 27-20l22-6 20 1 22 8q20 6 21 24l1 11z"/>
      <path fill="url(#wu-skin)" d="M47 75h34v17l8 6-22 29-27-27 9-8z"/>
      <path fill="#bc8063" opacity=".5" d="M47 79h35v11q-18 10-35-1z"/>
      <path fill="#f0e3c6" d="M38 90l14 9 13 20 15-21 8-7 5 37H33z"/>
      <path fill="#6f533c" d="M38 91l14 8 5 19-15-12-11 7zM90 91L78 99l-8 22 17-13 9 6z"/>
      <path fill="#bd9662" d="M31 93l-4 35h17l-3-20-9 1 6-17zM94 93l8 35H84l3-20 8 1-6-17z"/>
      <path d="M63 119v9" stroke="#baa68a" stroke-width="1.8"/><circle cx="68" cy="125" r="1.6" fill="#8c7859"/>
      <ellipse cx="34" cy="59" rx="7" ry="9" fill="#dc9c78"/><ellipse cx="95" cy="59" rx="7" ry="9" fill="#dc9c78"/>
      <path fill="url(#wu-skin)" d="M35 40q2-18 28-18 25 0 31 21l-1 28q-2 15-16 22-13 6-27-3-14-8-15-22z"/>
      <path fill="url(#wu-hair)" d="M34 51q-9-33 19-37 18-6 33 5 15 9 9 36l-5-11-2-12q-7 5-17 4l-20-3-11 8-2 14z"/>
      <path d="M45 27l7-5M58 25l8-6M74 26l7-2" stroke="#8e7560" stroke-width="2.3" stroke-linecap="round" opacity=".48"/>
      <path d="M41 48q8-6 17-1M71 47q9-4 17 2" fill="none" stroke="#4c382e" stroke-width="3.4" stroke-linecap="round"/>
      <path d="M42 57q7-8 14 0M73 57q7-7 13 1" fill="none" stroke="#42382f" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M39 58l-3 2M89 59l3 2" stroke="#b97e60" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M63 55l-4 12q5 3 10 0" fill="none" stroke="#b5795b" stroke-width="1.8" stroke-linecap="round"/>
      <ellipse cx="43" cy="68" rx="6.5" ry="3.7" fill="#cd8269" opacity=".33"/><ellipse cx="85" cy="69" rx="6.5" ry="3.7" fill="#cd8269" opacity=".33"/>
      <path fill="#763f31" d="M48 72q16 7 32 0-3 17-16 17-12 0-16-17"/>
      <path fill="#fff0d6" d="M49 73q16 6 30 0l-3 6q-12 4-24-1z"/>
      <path fill="#bd6d61" d="M55 85q8-7 17 0-8 5-17 0"/>
      <path d="M45 70l-2 7M83 71l2 7" stroke="#be8464" stroke-width="1.7" stroke-linecap="round"/>
      <path d="M17 115l-1 13M110 114l2 14" stroke="#d0ae7b" stroke-width="1.6" opacity=".6"/>
    </svg>`,
    3: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="贺小满，阳光帅气的大学生，不戴眼镜">
      <title>贺小满 · 阳光帅气的大学生（不戴眼镜）</title>
      <defs>
        <linearGradient id="man-bg" x2="1" y2="1"><stop stop-color="#e7eed6"/><stop offset="1" stop-color="#a5c7b3"/></linearGradient>
        <linearGradient id="man-skin" x2=".85" y2="1"><stop stop-color="#ffe7cc"/><stop offset=".65" stop-color="#f2c9a9"/><stop offset="1" stop-color="#dda789"/></linearGradient>
        <linearGradient id="man-hair" x2="1" y2="1"><stop stop-color="#42483f"/><stop offset=".55" stop-color="#263733"/><stop offset="1" stop-color="#152927"/></linearGradient>
        <linearGradient id="man-jacket" x2="1" y2="1"><stop stop-color="#79a493"/><stop offset="1" stop-color="#426e64"/></linearGradient>
      </defs>
      <path fill="url(#man-bg)" d="M0 0h128v128H0z"/>
      <circle cx="88" cy="27" r="32" fill="#fff4cd" opacity=".62"/>
      <circle cx="60" cy="55" r="43" fill="#f6f4dc" opacity=".28"/>
      <g fill="none" stroke="#6b9a7d" stroke-width="1.8" opacity=".3"><path d="M6 108q14-20 10-45M15 84q8-9 10-20M14 91Q3 85 3 75M116 99q-6-20 3-34"/><path d="M112 82q-9-6-10-17"/></g>
      <path fill="url(#man-jacket)" d="M9 128l4-17q3-12 24-18l17-4h22l20 5q19 6 21 24l2 10z"/>
      <path fill="url(#man-skin)" d="M52 76h24l2 18q-14 19-29 0z"/>
      <path fill="#d49c7d" opacity=".43" d="M53 80h23v9q-11 7-24-2z"/>
      <path fill="#fff8e7" d="M45 94q19 20 36 0l6 34H40z"/>
      <path d="M46 95q18 19 34 0" fill="none" stroke="#dddcca" stroke-width="3"/>
      <path fill="#315f54" d="M44 91l9 13-3 24H31l5-33zM83 91l-9 13 4 24h20l-6-33z"/>
      <path fill="#8bb09b" d="M45 89l9 15-8 9-9-19zM81 89l-8 15 8 9 9-18z"/>
      <path d="M47 113l-1 15M80 113l2 15" stroke="#c2cfb6" stroke-width="1.5" opacity=".85"/>
      <path d="M21 106l-3 22M104 108l5 20" stroke="#b7cbb3" stroke-width="1.5" opacity=".45"/>
      <path d="M88 118h12" stroke="#c6d6bc" stroke-width="1.7" stroke-linecap="round"/><circle cx="44" cy="120" r="1.6" fill="#d3dcc0"/>
      <ellipse cx="37" cy="55" rx="5.5" ry="8" fill="#e9b698"/><ellipse cx="90" cy="54" rx="5" ry="8" fill="#e3ae8d"/>
      <path d="M36 53l2 6M90 52l-1 6" stroke="#c99075" stroke-width="1.3" stroke-linecap="round"/>
      <path fill="url(#man-skin)" d="M39 33q11-15 27-14 23 2 23 24l-4 25q-3 12-16 21-6 3-12-1-14-9-17-24z"/>
      <path fill="url(#man-hair)" d="M35 52q-5-14-1-23l-4-3 10-5-3-6 12 1q13-12 28-7l-3 4q20 0 21 21 1 13-6 21l-2-18-5-10q-8 8-20 9l5-9q-10 13-25 15l-3 14z"/>
      <path fill="#536055" opacity=".45" d="M42 25q10-12 24-12-11 6-16 14zM75 17q12 3 14 16l-7-9z"/>
      <path d="M42 34q15-4 26-16M49 19q6-5 12-6M80 19q7 5 9 13" fill="none" stroke="#859180" stroke-width="1.5" stroke-linecap="round" opacity=".45"/>
      <path d="M44 46q7-4 15-1M71 45q7-3 12 0" fill="none" stroke="#354039" stroke-width="2.4" stroke-linecap="round"/>
      <path fill="#ffefda" d="M44 54q7-7 14-1-7 6-14 1M71 53q7-6 13-1-6 6-13 1"/>
      <path d="M44 54q7-6 14-1M71 53q7-5 13-1" fill="none" stroke="#3b4034" stroke-width="1.7" stroke-linecap="round"/>
      <ellipse cx="52" cy="54" rx="2.5" ry="2.7" fill="#30443a"/><ellipse cx="77" cy="52.9" rx="2.4" ry="2.7" fill="#30443a"/>
      <circle cx="52.6" cy="53" r=".9" fill="#fff9e7"/><circle cx="77.6" cy="52" r=".9" fill="#fff9e7"/>
      <path d="M64 54l-2 11q3 2 6-1" fill="none" stroke="#c38f72" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M44 64l6 1M79 63l5-1" stroke="#dd9e86" stroke-width="3.5" stroke-linecap="round" opacity=".3"/>
      <path fill="#a85d4b" d="M52 72q12 5 25-2-3 11-13 12-9 0-12-10"/>
      <path fill="#fff9e7" d="M53 73q12 3 23-2l-3 5q-9 4-17 0z"/>
      <path d="M60 84q6 2 11-2" fill="none" stroke="#ffe1c6" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M50 72l-1 2M79 70l1 2" stroke="#cf977d" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`
  };

  window.MahjongAvatars = Object.freeze({
    html(index) { return portraits[index] || ''; }
  });
}());
