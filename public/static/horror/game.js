/* 暗闇の屋敷 - ピコパーク風 協力ホラーアクション
 * 2〜4人が同じキーボード（またはゲームパッド）で協力し、鍵を見つけて全員で扉から脱出する。
 * 依存ライブラリなし。Canvas 2D + Web Audio API のみ。
 */
(() => {
'use strict';

// ---------------------------------------------------------------- 定数
const T = 32, COLS = 30, ROWS = 17, W = COLS * T, H = ROWS * T;
const EPS = 0.01; // 端のピクセルを含めるための微小値（座標が小数でも正しく判定する）
const STEP = 1 / 60;
const GRAVITY = 0.6, JUMP_V = -10.2, MAX_SPEED = 3.4, ACCEL = 0.55, FRICTION = 0.72, AIR_FRICTION = 0.985, MAX_FALL = 12;
const PW = 28, PH = 28;
const COLORS = ['#e25d5d', '#5d8fe2', '#6fcf7c', '#e6c65d'];
const CONTROLS = [
  { left: 'KeyA', right: 'KeyD', jump: 'KeyW', label: 'A / D　W' },
  { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', label: '← / →　↑' },
  { left: 'KeyJ', right: 'KeyL', jump: 'KeyI', label: 'J / L　I' },
  { left: 'KeyF', right: 'KeyH', jump: 'KeyT', label: 'F / H　T' },
];
const FONT_UI = '"Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", "Meiryo", sans-serif';
const FONT_TITLE = '"Hiragino Mincho ProN", "Noto Serif JP", "Yu Mincho", "MS PMincho", serif';

// ---------------------------------------------------------------- レベル
// 記号:  # 壁  . 空間  1-4 開始位置  K 鍵  D 扉(2マス高)  S スイッチ  G 格子(全スイッチ押下で開く)
//        ^ 針  = 片方向の足場  E 亡霊の出現位置  C 蝋燭(光が強くなる)  L 壁の灯り
const LEVELS = [
  {
    name: '第一夜　はじまりの廊下',
    hint: '仲間の頭に乗って鍵を取れ。鍵で扉を開け、全員で扉に入れ',
    dark: 0.93, lightning: true, ghostSpeed: 0, ghostDelay: 0,
    map: [
      '##############################',
      '#............................#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#.L......................K...#',
      '#......................#######',
      '#......................#######',
      '#.D....1.2.3.4.........#######',
      '##############################',
    ],
  },
  {
    name: '第二夜　見張りの部屋',
    hint: '誰かがスイッチを踏んでいる間だけ格子が開く',
    dark: 0.95, lightning: false, ghostSpeed: 0, ghostDelay: 0,
    map: [
      '##############################',
      '#..................G.........#',
      '#..................G.........#',
      '#..................G.........#',
      '#..................G.........#',
      '#..................G.........#',
      '#..................G.........#',
      '#..................G.........#',
      '#..................G.........#',
      '#..................G.........#',
      '#..................G.........#',
      '#..................G.........#',
      '#.L................G.......L.#',
      '#..................G.........#',
      '#..................G.........#',
      '#.D....1.2.3.4.S...G.......K.#',
      '##############################',
    ],
  },
  {
    name: '第三夜　囁くもの',
    hint: '……何かがいる。光を向けている間、アレは動けない',
    dark: 0.96, lightning: true, ghostSpeed: 1.0, ghostDelay: 3,
    map: [
      '##############################',
      '#............................#',
      '#............................#',
      '#..........................E.#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#..............K.............#',
      '#.............###............#',
      '#.D.1.2.3.4...###............#',
      '##############################',
    ],
  },
  {
    name: '第四夜　地下聖堂',
    hint: 'スイッチを踏む者、鍵を取る者、見張る者。役割を決めろ',
    dark: 0.96, lightning: false, ghostSpeed: 1.1, ghostDelay: 4,
    map: [
      '##############################',
      '#......G.....................#',
      '#......G..................E..#',
      '#......G.....................#',
      '#......G.....................#',
      '#......G.....................#',
      '#......G.....................#',
      '#......G.....................#',
      '#......G.....................#',
      '#......G.....................#',
      '#......G.....................#',
      '#......G.....................#',
      '#......G.....................#',
      '#K.....G.....................#',
      '###....G.....................#',
      '#......G.1.2.3.4...S.....D...#',
      '##############################',
    ],
  },
  {
    name: '第五夜　針の間',
    hint: '針に触れれば終わりだ。蝋燭を拾えば光が強くなる',
    dark: 0.96, lightning: true, ghostSpeed: 1.0, ghostDelay: 5,
    map: [
      '##############################',
      '#............................#',
      '#E...........................#',
      '#.......................K....#',
      '#......................=====.#',
      '#............................#',
      '#................=====.......#',
      '#............................#',
      '#......................=====.#',
      '#............................#',
      '#................=====.......#',
      '#............................#',
      '#......................=====.#',
      '#............................#',
      '#.................====.......#',
      '#.1.2.3.4..^^..C...^^....D...#',
      '##############################',
    ],
  },
  {
    name: '最後の夜　二つの影',
    hint: '高台のスイッチが格子を開く。二体の影が来る。生きて帰れ',
    dark: 0.97, lightning: true, ghostSpeed: 1.15, ghostDelay: 4,
    map: [
      '##############################',
      '#..............G.............#',
      '#E.............G............E#',
      '#..............G.............#',
      '#..............G.............#',
      '#..............G.............#',
      '#..............G.............#',
      '#..............G.............#',
      '#..............G.............#',
      '#..............G.............#',
      '#..............G.............#',
      '#..............G.............#',
      '#..........S...G.............#',
      '#.........###..G.............#',
      '#.........###..G.............#',
      '#D1.2.3.4.###..G.....^^...K..#',
      '##############################',
    ],
  },
];
LEVELS.forEach((L, i) => {
  if (L.map.length !== ROWS) console.error(`level ${i}: rows=${L.map.length}`);
  L.map.forEach((r, y) => { if (r.length !== COLS) console.error(`level ${i} row ${y}: len=${r.length}`); });
});

// ---------------------------------------------------------------- キャンバス
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const darkCv = document.createElement('canvas');
darkCv.width = W; darkCv.height = H;
const dctx = darkCv.getContext('2d');

function fit() {
  const help = document.getElementById('help');
  const hh = (help && !document.body.classList.contains('touch')) ? help.offsetHeight + 16 : 0;
  const s = Math.min(window.innerWidth / W, (window.innerHeight - hh) / H);
  canvas.style.width = Math.floor(W * s) + 'px';
  canvas.style.height = Math.floor(H * s) + 'px';
}
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', () => setTimeout(fit, 100));
if (window.visualViewport) window.visualViewport.addEventListener('resize', fit);

// 画面上の座標 → ゲーム座標
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
}

// ---------------------------------------------------------------- 音
const Sfx = (() => {
  let ac = null, master, droneGain, whisperGain, muted = false;
  function unlock() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ac.destination);
    // 低い唸り
    droneGain = ac.createGain(); droneGain.gain.value = 0; droneGain.connect(master);
    const o1 = ac.createOscillator(); o1.type = 'sine'; o1.frequency.value = 46;
    const o2 = ac.createOscillator(); o2.type = 'sine'; o2.frequency.value = 46.7;
    const o3 = ac.createOscillator(); o3.type = 'sawtooth'; o3.frequency.value = 92;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160;
    const g3 = ac.createGain(); g3.gain.value = 0.12;
    o1.connect(droneGain); o2.connect(droneGain); o3.connect(lp); lp.connect(g3); g3.connect(droneGain);
    const lfo = ac.createOscillator(); lfo.frequency.value = 0.07;
    const lfoG = ac.createGain(); lfoG.gain.value = 60; lfo.connect(lfoG); lfoG.connect(lp.frequency);
    o1.start(); o2.start(); o3.start(); lfo.start();
    // 囁き（帯域ノイズ）
    const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 2;
    whisperGain = ac.createGain(); whisperGain.gain.value = 0;
    src.connect(bp); bp.connect(whisperGain); whisperGain.connect(master);
    const wl = ac.createOscillator(); wl.frequency.value = 2.7;
    const wlg = ac.createGain(); wlg.gain.value = 450; wl.connect(wlg); wlg.connect(bp.frequency); wl.start();
    src.start();
  }
  function tone(freq, dur, type, vol, slide) {
    if (!ac) return;
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.linearRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, lowpass) {
    if (!ac) return;
    const b = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = ac.createBufferSource(); s.buffer = b;
    const g = ac.createGain(), t = ac.currentTime;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    let node = s;
    if (lowpass) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lowpass; s.connect(f); node = f; }
    node.connect(g); g.connect(master); s.start(t);
  }
  return {
    unlock,
    toggleMute() { muted = !muted; if (ac) master.gain.setTargetAtTime(muted ? 0 : 0.8, ac.currentTime, 0.05); return muted; },
    isMuted() { return muted; },
    setDrone(v) { if (ac) droneGain.gain.setTargetAtTime(v, ac.currentTime, 0.6); },
    setWhisper(v) { if (ac) whisperGain.gain.setTargetAtTime(v, ac.currentTime, 0.15); },
    jump() { tone(180, 0.09, 'square', 0.035, 90); },
    land() { noise(0.05, 0.08, 600); },
    key() { tone(880, 0.35, 'sine', 0.12); setTimeout(() => tone(1318, 0.5, 'sine', 0.1), 130); },
    unlockDoor() { tone(65, 0.6, 'triangle', 0.35, -30); noise(0.25, 0.2, 400); },
    heart() { tone(52, 0.13, 'sine', 0.55, -18); setTimeout(() => tone(48, 0.16, 'sine', 0.45, -18), 150); },
    death() { noise(1.3, 0.5); tone(180, 1.3, 'sawtooth', 0.25, -160); },
    clear() { [261.6, 311.1, 392, 466.2, 523.3].forEach((f, i) => setTimeout(() => tone(f, 1.6, 'sine', 0.1), i * 140)); },
    freeze() { noise(0.18, 0.12, 2000); tone(1200, 0.18, 'sine', 0.04, -600); },
    switchOn() { tone(120, 0.15, 'square', 0.08, -40); },
    thunder() { noise(1.8, 0.35, 300); },
    candle() { tone(660, 0.25, 'triangle', 0.08); },
  };
})();

// ---------------------------------------------------------------- タッチ操作（スマホ・タブレット）
const Touch = (() => {
  const state = [0, 1, 2, 3].map(() => ({ left: false, right: false, jump: false }));
  const root = document.getElementById('touch');
  const padsEl = document.getElementById('touch-pads');
  let on = false, built = 0;
  const api = { state, get on() { return on; }, tap: null, build, show, enable };

  function enable() {
    if (on || !root) return;
    on = true;
    document.body.classList.add('touch');
    fit();
    wireTop();
  }
  // 各プレイヤーのボタン群。左右の端・中段に置き、床にある扉や鍵を隠さない
  function build(n) {
    if (!on || !padsEl || built === n) return;
    built = n;
    padsEl.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const pad = document.createElement('div');
      pad.className = `pad ${i % 2 ? 'right' : 'left'} row${Math.floor(i / 2)}`;
      pad.style.setProperty('--pc', COLORS[i]);
      pad.innerHTML = `<div class="tag">${i + 1}P</div><div class="btn jump" data-a="jump">▲</div><div class="btn" data-a="left">◀</div><div class="btn" data-a="right">▶</div>`;
      padsEl.appendChild(pad);
      wirePad(pad, i);
    }
  }
  function wirePad(pad, i) {
    const btns = Array.from(pad.querySelectorAll('.btn'));
    const active = new Map(); // pointerId -> { a: 押している操作, dir: ▲へ滑らせた時に保持する方向 }
    const hit = (x, y) => {
      for (const b of btns) { const r = b.getBoundingClientRect(); if (x >= r.left - 6 && x <= r.right + 6 && y >= r.top - 6 && y <= r.bottom + 6) return b.dataset.a; }
      return null;
    };
    const apply = () => {
      const st = state[i]; st.left = st.right = st.jump = false;
      for (const v of active.values()) { if (v.a) st[v.a] = true; if (v.dir) st[v.dir] = true; }
      for (const b of btns) b.classList.toggle('on', st[b.dataset.a]);
    };
    // 親指1本で斜めに飛べるように、◀/▶ から ▲ へ指を滑らせたらその方向を押し続けたことにする
    const set = (e, a) => {
      const prev = active.get(e.pointerId) || { a: null, dir: null };
      let dir = null;
      if (a === 'jump') dir = (prev.a === 'left' || prev.a === 'right') ? prev.a : prev.dir;
      active.set(e.pointerId, { a, dir }); apply();
    };
    pad.addEventListener('pointerdown', (e) => { e.preventDefault(); Sfx.unlock(); try { pad.setPointerCapture(e.pointerId); } catch (_) {} set(e, hit(e.clientX, e.clientY)); });
    pad.addEventListener('pointermove', (e) => { if (active.has(e.pointerId)) set(e, hit(e.clientX, e.clientY)); });
    const end = (e) => { if (active.has(e.pointerId)) { active.delete(e.pointerId); apply(); } };
    pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end); pad.addEventListener('lostpointercapture', end);
    pad.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  function wireTop() {
    const q = (id) => document.getElementById(id);
    const press = (el, fn) => { if (!el) return; el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); Sfx.unlock(); fn(); }); el.addEventListener('contextmenu', (e) => e.preventDefault()); };
    press(q('tb-pause'), () => { if (G.scene === 'play') G.paused = !G.paused; });
    press(q('tb-restart'), () => { if (G.scene === 'play') { G.deaths++; loadLevel(G.levelIndex); } });
    press(q('tb-mute'), () => { const m = Sfx.toggleMute(); q('tb-mute').textContent = m ? '×' : '♪'; });
    press(q('tb-full'), () => {
      const el = document.documentElement;
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (document.fullscreenElement || document.webkitFullscreenElement) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      if (req) Promise.resolve(req.call(el)).then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (_) {} }).catch(() => {});
    });
  }
  function show(visible) {
    if (!root) return;
    root.classList.toggle('hidden', !on || !visible);
    const pb = document.getElementById('tb-pause');
    if (pb) pb.textContent = G.paused ? '▶' : 'Ⅱ';
  }
  // 荒いポインタ（指）が主な端末では最初から表示。マウス端末でも実際に触れられたら切り替える
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) enable();
  window.addEventListener('touchstart', () => enable(), { once: true, passive: true });
  return api;
})();

fit();

// 画面タップ（タイトルの人数変更・開始、クリア画面の進行）
canvas.addEventListener('pointerdown', (e) => {
  Sfx.unlock();
  if (e.pointerType === 'mouse' && !Touch.on) return;
  e.preventDefault();
  Touch.tap = canvasPoint(e);
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
// 埋め込み表示（iframe）でもキー入力が届くように、クリックでキャンバスにフォーカスを与える
canvas.tabIndex = 0;
canvas.addEventListener('pointerdown', () => { try { canvas.focus({ preventScroll: true }); } catch (_) { canvas.focus(); } });
window.addEventListener('load', () => { try { canvas.focus({ preventScroll: true }); } catch (_) {} });

// ---------------------------------------------------------------- 入力
const keys = {}, pressed = {};
window.addEventListener('keydown', (e) => {
  if (!keys[e.code]) pressed[e.code] = true;
  keys[e.code] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  Sfx.unlock();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

function padInput(i) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = pads && pads[i];
  if (!gp) return null;
  const ax = gp.axes[0] || 0;
  const b = (n) => !!(gp.buttons[n] && gp.buttons[n].pressed);
  return { left: ax < -0.5 || b(14), right: ax > 0.5 || b(15), jump: b(0) || b(1) || b(2) || b(3) };
}
function playerInput(i) {
  const c = CONTROLS[i];
  const inp = { left: !!keys[c.left], right: !!keys[c.right], jump: !!keys[c.jump] };
  const gp = padInput(i);
  if (gp) { inp.left = inp.left || gp.left; inp.right = inp.right || gp.right; inp.jump = inp.jump || gp.jump; }
  const ts = Touch.state[i];
  if (ts) { inp.left = inp.left || ts.left; inp.right = inp.right || ts.right; inp.jump = inp.jump || ts.jump; }
  return inp;
}
function anyPadPressed(n) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of pads || []) if (gp && gp.buttons[n] && gp.buttons[n].pressed) return true;
  return false;
}

// ---------------------------------------------------------------- 状態
const G = {
  scene: 'title', numPlayers: 2, levelIndex: 0, level: null, grid: [],
  players: [], ghosts: [], switches: [], candles: [], lanterns: [], key: null, door: null,
  gatesOpen: false, unlocked: false, time: 0, deaths: 0, msg: null, msgT: 0,
  flash: 0, nextLightning: 0, deathT: 0, deathText: '', clearT: 0, introT: 0, paused: false,
  ghostTimer: 0, heartT: 0, ghostNear: 0, endingT: 0, totalTime: 0, titleT: 0, padLatch: false,
};

function makePlayer(i, x, y) {
  return {
    i, x, y, w: PW, h: PH, vx: 0, vy: 0, facing: (i % 2) ? -1 : 1, grounded: false, wasGrounded: false,
    standingOn: null, dxApplied: 0, exited: false, exitT: 0, light: 1, hasKey: false,
    jumpWasDown: false, coyote: 0, squash: 0, color: COLORS[i], blink: Math.random() * 4, walk: 0,
  };
}
function makeGhost(x, y) {
  return { x, y, sx: x, sy: y, t: Math.random() * 10, frozen: false, wasFrozen: false, dist: 1e9, phase: Math.random() * 6 };
}

function loadLevel(i) {
  const L = LEVELS[i];
  G.level = L; G.levelIndex = i;
  G.grid = L.map.map((r) => r.split(''));
  G.players = []; G.ghosts = []; G.switches = []; G.candles = []; G.lanterns = []; G.key = null; G.door = null;
  const spawns = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const c = G.grid[y][x];
    if (c >= '1' && c <= '4') { spawns[+c - 1] = { x, y }; G.grid[y][x] = '.'; }
    else if (c === 'K') { G.key = { x: x * T + T / 2, y: y * T + T / 2, holder: null, taken: false, t: 0 }; G.grid[y][x] = '.'; }
    else if (c === 'D') { G.door = { tx: x, ty: y }; G.grid[y][x] = '.'; }
    else if (c === 'S') { G.switches.push({ tx: x, ty: y, pressed: false }); G.grid[y][x] = '.'; }
    else if (c === 'E') { G.ghosts.push(makeGhost(x * T + T / 2, y * T + T / 2)); G.grid[y][x] = '.'; }
    else if (c === 'C') { G.candles.push({ tx: x, ty: y, taken: false }); G.grid[y][x] = '.'; }
    else if (c === 'L') { G.lanterns.push({ x: x * T + T / 2, y: y * T + T / 2 }); G.grid[y][x] = '.'; }
  }
  const sp = spawns.filter(Boolean);
  for (let p = 0; p < G.numPlayers; p++) {
    const s = sp[Math.min(p, sp.length - 1)];
    G.players.push(makePlayer(p, s.x * T + (T - PW) / 2, (s.y + 1) * T - PH));
  }
  G.gatesOpen = false; G.unlocked = false; G.time = 0; G.msg = null; G.msgT = 0; G.flash = 0;
  G.nextLightning = 4 + Math.random() * 6; G.ghostTimer = L.ghostDelay || 0; G.introT = 2.6; G.heartT = 0; G.ghostNear = 0;
  G.scene = 'play'; G.paused = false;
  Touch.build(G.numPlayers);
  Sfx.setDrone(0.25 + i * 0.03);
  Sfx.setWhisper(0);
}

function startGame() {
  G.deaths = 0; G.totalTime = 0;
  loadLevel(0);
}
function showMsg(text, dur) { G.msg = text; G.msgT = dur; }

// ---------------------------------------------------------------- 当たり判定
const cell = (tx, ty) => (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) ? '#' : G.grid[ty][tx];
const solid = (tx, ty) => { const c = cell(tx, ty); return c === '#' || (c === 'G' && !G.gatesOpen); };
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const center = (p) => ({ x: p.x + p.w / 2, y: p.y + p.h / 2 });
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function moveX(p, dx) {
  if (dx === 0) return false;
  p.x += dx;
  const y0 = Math.floor(p.y / T), y1 = Math.floor((p.y + p.h - EPS) / T);
  if (dx > 0) {
    const tx = Math.floor((p.x + p.w - EPS) / T);
    for (let ty = y0; ty <= y1; ty++) if (solid(tx, ty)) { p.x = tx * T - p.w; p.vx = 0; return true; }
  } else {
    const tx = Math.floor(p.x / T);
    for (let ty = y0; ty <= y1; ty++) if (solid(tx, ty)) { p.x = (tx + 1) * T; p.vx = 0; return true; }
  }
  return false;
}
function moveY(p, dy) {
  const prevBottom = p.y + p.h;
  p.y += dy;
  const x0 = Math.floor(p.x / T), x1 = Math.floor((p.x + p.w - EPS) / T);
  if (dy > 0) {
    const ty = Math.floor((p.y + p.h - EPS) / T);
    for (let tx = x0; tx <= x1; tx++) {
      const c = cell(tx, ty);
      if (solid(tx, ty) || (c === '=' && prevBottom <= ty * T + 0.5)) {
        p.y = ty * T - p.h; p.vy = 0; p.grounded = true; return;
      }
    }
  } else if (dy < 0) {
    const ty = Math.floor(p.y / T);
    for (let tx = x0; tx <= x1; tx++) if (solid(tx, ty)) { p.y = (ty + 1) * T; p.vy = 0; return; }
  }
}
function headBlocked(p) {
  const ty = Math.floor(p.y / T), x0 = Math.floor(p.x / T), x1 = Math.floor((p.x + p.w - EPS) / T);
  for (let tx = x0; tx <= x1; tx++) if (solid(tx, ty)) return true;
  return false;
}
function resolvePlayersX(p, dx) {
  for (const o of G.players) {
    if (o === p || o.exited || !overlap(p, o)) continue;
    const vOverlap = Math.min(p.y + p.h, o.y + o.h) - Math.max(p.y, o.y);
    if (vOverlap < 6) continue;
    if (dx > 0) { moveX(o, (p.x + p.w) - o.x); p.x = o.x - p.w; }
    else if (dx < 0) { moveX(o, p.x - (o.x + o.w)); p.x = o.x + o.w; }
    else if (p.x + p.w / 2 < o.x + o.w / 2) p.x = o.x - p.w; else p.x = o.x + o.w;
  }
}
function resolvePlayersY(p) {
  for (const o of G.players) {
    if (o === p || o.exited || !overlap(p, o)) continue;
    const hOverlap = Math.min(p.x + p.w, o.x + o.w) - Math.max(p.x, o.x);
    if (hOverlap < 4) continue;
    const pc = p.y + p.h / 2, oc = o.y + o.h / 2;
    if (pc <= oc) {
      // p が o の上に乗る
      p.y = o.y - p.h;
      p.vy = Math.min(p.vy > 0 ? 0 : p.vy, o.vy);
      p.grounded = true; p.standingOn = o;
      if (headBlocked(p)) { p.y = (Math.floor(p.y / T) + 1) * T; o.y = p.y + p.h; o.vy = Math.max(o.vy, 0); }
    } else {
      // p が下から o を持ち上げる
      o.y = p.y - o.h;
      o.vy = Math.min(o.vy, p.vy);
      o.grounded = true; o.standingOn = p;
      if (headBlocked(o)) { o.y = (Math.floor(o.y / T) + 1) * T; p.y = o.y + o.h; p.vy = 0; }
    }
  }
}

// 懐中電灯の円錐の中か（足元の小さな灯りは亡霊を止められない。背後は無防備）
function inLight(p, x, y) {
  const c = center(p);
  const dx = x - c.x, dy = y - c.y, d = Math.hypot(dx, dy);
  if (Math.sign(dx) !== p.facing) return false;
  const len = 230 * p.light, ax = Math.abs(dx);
  return d < len && Math.abs(dy) < ax * 0.42 + 18;
}

// ---------------------------------------------------------------- 更新
function update() {
  G.titleT += STEP;
  const tap = Touch.tap; Touch.tap = null;
  if (G.scene === 'title') return updateTitle(tap);
  if (G.scene === 'ending') { G.endingT += STEP; if (G.endingT > 2 && (pressed.Enter || pressed.Space || anyPadPressed(9) || tap)) { G.scene = 'title'; Sfx.setDrone(0.12); Sfx.setWhisper(0); } return; }
  if (pressed.KeyM) { Sfx.toggleMute(); }
  if (G.scene === 'dead') {
    G.deathT -= STEP;
    if (G.deathT <= 0) loadLevel(G.levelIndex);
    return;
  }
  if (G.scene === 'clear') {
    G.clearT += STEP;
    if (G.clearT > 1.2 && (pressed.Enter || pressed.Space || anyPadPressed(0) || tap || G.clearT > 4)) {
      if (G.levelIndex + 1 < LEVELS.length) loadLevel(G.levelIndex + 1);
      else { G.scene = 'ending'; G.endingT = 0; Sfx.setDrone(0.05); Sfx.setWhisper(0); }
    }
    return;
  }
  // play
  if (pressed.Escape || pressed.KeyP || anyPadPressedLatched(9)) G.paused = !G.paused;
  if (pressed.KeyR) { G.deaths++; loadLevel(G.levelIndex); return; }
  if (G.paused) { if (tap) G.paused = false; return; }

  G.time += STEP; G.totalTime += STEP;
  if (G.introT > 0) G.introT -= STEP;
  if (G.msgT > 0) { G.msgT -= STEP; if (G.msgT <= 0) G.msg = null; }
  if (G.key) G.key.t += STEP;

  // 雷
  if (G.level.lightning) {
    G.nextLightning -= STEP;
    if (G.nextLightning <= 0) { G.flash = 1; G.nextLightning = 7 + Math.random() * 9; setTimeout(() => Sfx.thunder(), 250 + Math.random() * 500); }
  }
  if (G.flash > 0) G.flash = Math.max(0, G.flash - (G.flash > 0.5 ? 0.08 : 0.03) + (Math.random() < 0.08 && G.flash > 0.2 ? 0.25 : 0));

  // スイッチ → 格子
  const active = G.players.filter((p) => !p.exited);
  for (const s of G.switches) {
    const rect = { x: s.tx * T + 2, y: s.ty * T + 20, w: T - 4, h: 12 };
    const was = s.pressed;
    s.pressed = active.some((p) => overlap(p, rect));
    if (s.pressed && !was) Sfx.switchOn();
  }
  const open = G.switches.length > 0 && G.switches.every((s) => s.pressed);
  if (open !== G.gatesOpen) { G.gatesOpen = open; if (open) showMsg('格子が開いた', 2); else showMsg('格子が閉じた', 1.5); }

  // プレイヤー（下にいる者から処理）
  const order = active.slice().sort((a, b) => (b.y - a.y));
  for (const p of order) updatePlayer(p);

  // 拾う・扉
  for (const p of active) {
    const c = center(p);
    if (G.key && !G.key.taken && Math.hypot(c.x - G.key.x, c.y - G.key.y) < 26) {
      G.key.taken = true; G.key.holder = p; p.hasKey = true; Sfx.key(); showMsg('鍵を手に入れた。扉へ向かえ', 3);
    }
    for (const cd of G.candles) {
      if (!cd.taken && overlap(p, { x: cd.tx * T + 8, y: cd.ty * T + 4, w: 16, h: 28 })) { cd.taken = true; p.light = Math.min(2, p.light + 0.5); Sfx.candle(); showMsg('蝋燭を手にした。光が強くなった', 2.5); }
    }
    const d = G.door;
    const doorRect = { x: d.tx * T + 4, y: (d.ty - 1) * T, w: T - 8, h: T * 2 };
    if (overlap(p, doorRect)) {
      if (!G.unlocked && p.hasKey) { G.unlocked = true; p.hasKey = false; Sfx.unlockDoor(); showMsg('扉が開いた。全員で入れ！', 3); }
      else if (G.unlocked && p.grounded) { p.exited = true; p.exitT = 0; }
    }
    // 針
    const foot = { x: p.x + 4, y: p.y + p.h - 12, w: p.w - 8, h: 12 };
    const x0 = Math.floor(foot.x / T), x1 = Math.floor((foot.x + foot.w - EPS) / T), y0 = Math.floor(foot.y / T), y1 = Math.floor((foot.y + foot.h - EPS) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (cell(tx, ty) === '^' && overlap(foot, { x: tx * T + 4, y: ty * T + 12, w: T - 8, h: T - 12 })) return die('針に貫かれた……');
    }
  }
  for (const p of G.players) if (p.exited) p.exitT += STEP;
  if (active.length && active.every((p) => p.exited)) { G.scene = 'clear'; G.clearT = 0; Sfx.clear(); Sfx.setWhisper(0); return; }

  // 亡霊
  updateGhosts(active);
}

function anyPadPressedLatched(n) {
  const now = anyPadPressed(n);
  const r = now && !G.padLatch; G.padLatch = now; return r;
}

function updatePlayer(p) {
  if (p.exited) return;
  const startX = p.x;
  const prevStanding = p.standingOn;
  p.wasGrounded = p.grounded;
  p.grounded = false; p.standingOn = null;
  if (prevStanding && !prevStanding.exited && prevStanding.dxApplied) moveX(p, prevStanding.dxApplied);

  const inp = playerInput(p.i);
  const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  if (dir !== 0) { p.vx += dir * ACCEL; p.facing = dir; p.walk += Math.abs(p.vx) * 0.08; }
  else p.vx *= p.wasGrounded ? FRICTION : AIR_FRICTION; // 空中では慣性を保つ（走ってからジャンプすれば斜めに飛べる）
  p.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, p.vx));
  if (Math.abs(p.vx) < 0.05) p.vx = 0;
  moveX(p, p.vx);
  resolvePlayersX(p, p.vx);

  // ジャンプ
  if (inp.jump && !p.jumpWasDown && p.coyote > 0) { p.vy = JUMP_V; p.coyote = 0; p.squash = -0.25; Sfx.jump(); }
  if (!inp.jump && p.vy < -3.5) p.vy = -3.5;
  p.jumpWasDown = inp.jump;

  p.vy = Math.min(MAX_FALL, p.vy + GRAVITY);
  const fallV = p.vy;
  moveY(p, p.vy);
  resolvePlayersY(p);
  if (p.grounded && !p.wasGrounded && fallV > 4) { p.squash = 0.3; Sfx.land(); }
  p.coyote = p.grounded ? 6 : Math.max(0, p.coyote - 1);
  p.squash *= 0.8;
  p.blink -= STEP; if (p.blink < -0.15) p.blink = 2 + Math.random() * 4;
  // 画面外保護
  if (p.y > H + 100) return die('闇に落ちた……');
  p.dxApplied = p.x - startX;
}

function updateGhosts(active) {
  let nearest = 1e9;
  if (G.ghostTimer > 0) { G.ghostTimer -= STEP; if (G.ghostTimer <= 0 && G.ghosts.length) showMsg('……何かが近づいてくる', 2.5); }
  for (const g of G.ghosts) {
    g.t += STEP;
    if (!active.length) break;
    let target = null, best = 1e9;
    for (const p of active) { const d = dist(g, center(p)); if (d < best) { best = d; target = p; } }
    g.dist = best; nearest = Math.min(nearest, best);
    g.frozen = active.some((p) => inLight(p, g.x, g.y));
    if (g.frozen && !g.wasFrozen) Sfx.freeze();
    g.wasFrozen = g.frozen;
    if (G.ghostTimer > 0) continue;
    if (!g.frozen) {
      const c = center(target);
      const dx = c.x - g.x, dy = c.y - g.y, d = Math.hypot(dx, dy) || 1;
      const sp = G.level.ghostSpeed * (best < 90 ? 1.35 : 1);
      g.x += (dx / d) * sp;
      g.y += (dy / d) * sp + Math.sin(g.t * 3 + g.phase) * 0.35;
      if (dist(g, center(target)) < 21) return die('捕まった……');
    }
  }
  // 心音・囁き
  if (G.ghosts.length && G.ghostTimer <= 0 && nearest < 340) {
    const k = 1 - nearest / 340;
    G.ghostNear = k;
    G.heartT -= STEP;
    if (G.heartT <= 0) { Sfx.heart(); G.heartT = 1.25 - k * 0.9; }
    Sfx.setWhisper(0.02 + k * 0.16);
  } else { G.ghostNear = Math.max(0, G.ghostNear - STEP); Sfx.setWhisper(0); }
}

function die(text) {
  if (G.scene !== 'play') return;
  G.scene = 'dead'; G.deathT = 1.8; G.deathText = text; G.deaths++;
  Sfx.death(); Sfx.setWhisper(0);
}

function updateTitle(tap) {
  let dec = pressed.ArrowLeft || pressed.KeyA || pressed.Digit2, inc = pressed.ArrowRight || pressed.KeyD || pressed.Digit3 || pressed.Digit4;
  let start = pressed.Enter || pressed.Space || pressed.KeyW || pressed.ArrowUp || anyPadPressedLatched(0);
  if (tap) {
    // 「◀ プレイ人数 ▶」の行をタップで人数変更。それ以外の場所をタップで開始
    if (tap.y > 200 && tap.y < 340) { if (tap.x < W / 2 - 40) dec = true; else if (tap.x > W / 2 + 40) inc = true; }
    else if (tap.y >= 340) start = true;
  }
  if (dec) G.numPlayers = pressed.Digit2 ? 2 : Math.max(2, G.numPlayers - 1);
  if (inc) G.numPlayers = pressed.Digit3 ? 3 : pressed.Digit4 ? 4 : Math.min(4, G.numPlayers + 1);
  if (pressed.KeyM) Sfx.toggleMute();
  if (start) { Sfx.unlock(); startGame(); }
}

// ---------------------------------------------------------------- 描画
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967295; };

function rrect(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function drawBackground() {
  ctx.fillStyle = '#17121f'; ctx.fillRect(0, 0, W, H);
  // 壁紙の縞
  ctx.fillStyle = 'rgba(70,52,88,0.35)';
  for (let x = 0; x < W; x += 48) ctx.fillRect(x, 0, 20, H);
  // 汚れ
  for (let i = 0; i < 40; i++) {
    const rx = hash(i, 7) * W, ry = hash(i, 11) * H, rr = 20 + hash(i, 13) * 60;
    const gd = ctx.createRadialGradient(rx, ry, 0, rx, ry, rr);
    gd.addColorStop(0, 'rgba(20,10,15,0.5)'); gd.addColorStop(1, 'rgba(20,10,15,0)');
    ctx.fillStyle = gd; ctx.fillRect(rx - rr, ry - rr, rr * 2, rr * 2);
  }
}

function drawWall(tx, ty) {
  const x = tx * T, y = ty * T, h = hash(tx, ty);
  ctx.fillStyle = `rgb(${66 + h * 14},${57 + h * 12},${78 + h * 14})`;
  ctx.fillRect(x, y, T, T);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(x, y + 15, T, 2);
  const off = (ty % 2) * 16;
  ctx.fillRect(x + off, y, 2, 15); ctx.fillRect(x + ((off + 16) % 32), y + 17, 2, 15);
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.fillRect(x, y, T, 1); ctx.fillRect(x, y + 17, T, 1);
  if (h > 0.85) { ctx.fillStyle = 'rgba(80,20,25,0.35)'; ctx.fillRect(x + 6, y + 4, 8, 12); }
}

function drawTiles() {
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    const c = G.grid[ty][tx], x = tx * T, y = ty * T;
    if (c === '#') drawWall(tx, ty);
    else if (c === '=') {
      ctx.fillStyle = '#3a2a1e'; ctx.fillRect(x, y, T, 8);
      ctx.fillStyle = '#5a4130'; ctx.fillRect(x, y, T, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x + 4, y + 8, 3, 6); ctx.fillRect(x + T - 7, y + 8, 3, 6);
    } else if (c === '^') {
      ctx.fillStyle = '#1a1620'; ctx.fillRect(x, y + 20, T, 12);
      for (let k = 0; k < 4; k++) {
        ctx.beginPath(); ctx.moveTo(x + k * 8, y + 32); ctx.lineTo(x + k * 8 + 4, y + 8); ctx.lineTo(x + k * 8 + 8, y + 32); ctx.closePath();
        ctx.fillStyle = k % 2 ? '#8b8896' : '#b3aebe'; ctx.fill();
        ctx.fillStyle = 'rgba(120,20,25,0.6)'; ctx.fillRect(x + k * 8 + 3, y + 8, 2, 8);
      }
    } else if (c === 'G') {
      const open = G.gatesOpen;
      const below = cell(tx, ty + 1) === 'G', above = cell(tx, ty - 1) === 'G';
      ctx.fillStyle = '#1e1a24'; ctx.fillRect(x + 2, y, 2, T); ctx.fillRect(x + 28, y, 2, T);
      if (!open) {
        ctx.fillStyle = '#6a6470';
        for (let k = 0; k < 3; k++) ctx.fillRect(x + 7 + k * 8, y, 3, T);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        for (let k = 0; k < 3; k++) ctx.fillRect(x + 9 + k * 8, y, 1, T);
        if (!above || !below) { ctx.fillStyle = '#4a4450'; ctx.fillRect(x + 4, above ? y + 26 : y + 2, 24, 4); }
      } else {
        ctx.fillStyle = 'rgba(106,100,112,0.25)';
        for (let k = 0; k < 3; k++) ctx.fillRect(x + 7 + k * 8, y, 3, T);
        ctx.strokeStyle = 'rgba(160,150,170,0.25)'; ctx.setLineDash([3, 6]); ctx.beginPath();
        for (let k = 0; k < 3; k++) { ctx.moveTo(x + 8.5 + k * 8, y); ctx.lineTo(x + 8.5 + k * 8, y + T); }
        ctx.stroke(); ctx.setLineDash([]);
      }
    }
  }
  // スイッチ
  for (const s of G.switches) {
    const x = s.tx * T, y = s.ty * T;
    ctx.fillStyle = '#2b2733'; ctx.fillRect(x + 2, y + 26, T - 4, 6);
    ctx.fillStyle = s.pressed ? '#7a2a2a' : '#8a3a3a';
    ctx.fillRect(x + 5, y + (s.pressed ? 24 : 20), T - 10, s.pressed ? 4 : 8);
    ctx.fillStyle = s.pressed ? 'rgba(255,120,120,0.9)' : 'rgba(255,80,80,0.5)';
    ctx.fillRect(x + 13, y + (s.pressed ? 25 : 21), 6, 2);
  }
  // 灯り
  for (const l of G.lanterns) {
    ctx.fillStyle = '#3a3220'; ctx.fillRect(l.x - 6, l.y - 12, 12, 20);
    ctx.fillStyle = '#1a160c'; ctx.fillRect(l.x - 2, l.y - 16, 4, 5);
    const f = 0.8 + Math.sin(G.titleT * 9 + l.x) * 0.15;
    ctx.fillStyle = `rgba(255,190,90,${f})`; ctx.fillRect(l.x - 3, l.y - 8, 6, 12);
  }
  // 蝋燭
  for (const cd of G.candles) {
    if (cd.taken) continue;
    const x = cd.tx * T, y = cd.ty * T;
    ctx.fillStyle = '#d9d2c0'; ctx.fillRect(x + 13, y + 14, 6, 18);
    const f = 0.7 + Math.sin(G.titleT * 12 + x) * 0.2;
    ctx.fillStyle = `rgba(255,170,60,${f})`; ctx.beginPath(); ctx.ellipse(x + 16, y + 10, 3, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,200,0.9)'; ctx.beginPath(); ctx.ellipse(x + 16, y + 11, 1.4, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  }
  drawDoor();
  if (G.key && !G.key.taken) drawKey(G.key.x, G.key.y + Math.sin(G.key.t * 3) * 3, 1);
}

function drawDoor() {
  const d = G.door, x = d.tx * T, y = (d.ty - 1) * T;
  ctx.fillStyle = '#1a1420'; ctx.fillRect(x - 3, y - 4, T + 6, T * 2 + 4);
  if (G.unlocked) {
    const gd = ctx.createLinearGradient(x, y, x, y + T * 2);
    gd.addColorStop(0, '#3a0a10'); gd.addColorStop(1, '#8a1a1a');
    ctx.fillStyle = gd;
    ctx.beginPath(); ctx.moveTo(x + 2, y + T * 2); ctx.lineTo(x + 2, y + 14); ctx.arc(x + T / 2, y + 14, T / 2 - 2, Math.PI, 0); ctx.lineTo(x + T - 2, y + T * 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,60,60,0.25)';
    ctx.fillRect(x + 6, y + 20, T - 12, T * 2 - 20);
  } else {
    ctx.fillStyle = '#2e2018';
    ctx.beginPath(); ctx.moveTo(x + 2, y + T * 2); ctx.lineTo(x + 2, y + 14); ctx.arc(x + T / 2, y + 14, T / 2 - 2, Math.PI, 0); ctx.lineTo(x + T - 2, y + T * 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x + 15, y + 6, 2, T * 2 - 6);
    ctx.fillStyle = '#c9a34a'; ctx.beginPath(); ctx.arc(x + 22, y + 38, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x + 22, y + 38, 1.3, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x + 21.3, y + 38, 1.4, 4);
  }
}

function drawKey(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = '#e0b84a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(-6, 0, 5, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(11, 0); ctx.moveTo(7, 0); ctx.lineTo(7, 4); ctx.moveTo(11, 0); ctx.lineTo(11, 4); ctx.stroke();
  ctx.restore();
}

function drawPlayer(p) {
  if (p.exited && p.exitT > 0.6) return;
  const alpha = p.exited ? Math.max(0, 1 - p.exitT / 0.6) : 1;
  const sx = 1 - p.squash * 0.5, sy = 1 + p.squash;
  const cx = p.x + p.w / 2, by = p.y + p.h;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.translate(cx, by); ctx.scale(sx, sy);
  // 体
  ctx.fillStyle = p.color; rrect(-p.w / 2, -p.h, p.w, p.h, 6); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; rrect(-p.w / 2, -p.h, p.w, p.h, 6); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(-p.w / 2 + 3, -p.h + 3, p.w - 6, 4);
  // 目（怯えた目）
  const ex = p.facing * 4, blink = p.blink < 0;
  for (const side of [-1, 1]) {
    const ox = side * 6 + ex;
    ctx.fillStyle = '#f4f2ee';
    if (blink) ctx.fillRect(ox - 4, -p.h + 12, 8, 2);
    else { ctx.beginPath(); ctx.ellipse(ox, -p.h + 12, 4.5, 5.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(ox + p.facing * 1.5, -p.h + 13, 2.2, 0, Math.PI * 2); ctx.fill(); }
  }
  // 口
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (G.ghostNear > 0.4) ctx.ellipse(ex * 0.5, -p.h + 22, 3, 2.5 + G.ghostNear * 2, 0, 0, Math.PI * 2);
  else { ctx.moveTo(ex * 0.5 - 3, -p.h + 22); ctx.lineTo(ex * 0.5 + 3, -p.h + 22); }
  ctx.stroke();
  // 懐中電灯
  ctx.fillStyle = '#2a2a30'; ctx.fillRect(p.facing > 0 ? 6 : -14, -p.h + 16, 8, 5);
  ctx.fillStyle = '#fff3c0'; ctx.fillRect(p.facing > 0 ? 13 : -15, -p.h + 16, 2, 5);
  ctx.restore();
  // 名前
  ctx.globalAlpha = alpha * 0.8;
  ctx.fillStyle = p.color; ctx.font = `bold 10px ${FONT_UI}`; ctx.textAlign = 'center';
  ctx.fillText(`${p.i + 1}P`, cx, p.y - (p.hasKey ? 22 : 6));
  ctx.globalAlpha = 1;
  if (p.hasKey) drawKey(cx, p.y - 12 + Math.sin(G.time * 4) * 2, 0.9);
}

function ghostPath(g, scale) {
  const t = g.t, sway = g.frozen ? 0 : Math.sin(t * 2.2 + g.phase) * 3;
  ctx.beginPath();
  ctx.moveTo(g.x - 14 * scale + sway, g.y - 4 * scale);
  ctx.arc(g.x + sway, g.y - 4 * scale, 14 * scale, Math.PI, 0);
  ctx.lineTo(g.x + 14 * scale + sway, g.y + 22 * scale);
  for (let k = 0; k < 5; k++) {
    const px = g.x + 14 * scale + sway - (k + 0.5) * 5.6 * scale;
    const py = g.y + 22 * scale + (g.frozen ? 0 : Math.sin(t * 7 + k * 1.7) * 4 * scale) + (k % 2 ? 6 * scale : 0);
    ctx.lineTo(px, py);
  }
  ctx.lineTo(g.x - 14 * scale + sway, g.y + 22 * scale);
  ctx.closePath();
  return sway;
}
function drawGhost(g, silhouette) {
  ctx.save();
  if (silhouette) {
    ctx.globalAlpha = 0.28 + G.ghostNear * 0.15;
    ctx.fillStyle = '#c9cbe0'; ghostPath(g, 1); ctx.fill();
    ctx.restore(); return;
  }
  const near = Math.max(0, 1 - g.dist / 200);
  const gd = ctx.createRadialGradient(g.x, g.y, 4, g.x, g.y, 40);
  gd.addColorStop(0, 'rgba(200,205,235,0.25)'); gd.addColorStop(1, 'rgba(200,205,235,0)');
  ctx.fillStyle = gd; ctx.fillRect(g.x - 40, g.y - 40, 80, 80);
  const sway = ghostPath(g, 1);
  ctx.fillStyle = g.frozen ? 'rgba(235,238,250,0.95)' : 'rgba(215,220,240,0.85)'; ctx.fill();
  // 目
  ctx.fillStyle = g.frozen ? '#a01020' : '#0a0a12';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    if (g.frozen) ctx.arc(g.x + s * 5 + sway, g.y - 5, 3.2, 0, Math.PI * 2);
    else ctx.ellipse(g.x + s * 5 + sway, g.y - 5, 3, 4.5 + near * 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath(); ctx.ellipse(g.x + sway, g.y + 5, 2.5 + near * 3, 4 + near * 5, 0, 0, Math.PI * 2); ctx.fill();
  if (g.frozen) { ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ghostPath(g, 1); ctx.stroke(); }
  ctx.restore();
}

function cutLight(x, y, r, a) {
  const gd = dctx.createRadialGradient(x, y, 0, x, y, r);
  gd.addColorStop(0, `rgba(255,255,255,${a})`); gd.addColorStop(0.55, `rgba(255,255,255,${a * 0.55})`); gd.addColorStop(1, 'rgba(255,255,255,0)');
  dctx.fillStyle = gd; dctx.beginPath(); dctx.arc(x, y, r, 0, Math.PI * 2); dctx.fill();
}
function drawDarkness() {
  const L = G.level;
  const alpha = Math.max(0.15, L.dark * (1 - G.flash * 0.95));
  dctx.globalCompositeOperation = 'source-over';
  dctx.clearRect(0, 0, W, H);
  dctx.fillStyle = `rgba(2,1,6,${alpha})`; dctx.fillRect(0, 0, W, H);
  dctx.globalCompositeOperation = 'destination-out';
  for (const p of G.players) {
    if (p.exited) continue;
    const c = center(p);
    cutLight(c.x, c.y, 62 * p.light, 0.95);
    const len = 230 * p.light, half = len * 0.42 + 18;
    const flick = 0.97 + Math.sin(G.time * 23 + p.i) * 0.03 + (Math.random() < 0.02 ? -0.3 : 0);
    const gd = dctx.createLinearGradient(c.x, c.y, c.x + p.facing * len, c.y);
    gd.addColorStop(0, `rgba(255,255,255,${flick})`); gd.addColorStop(0.55, `rgba(255,255,255,${flick * 0.75})`); gd.addColorStop(1, 'rgba(255,255,255,0)');
    dctx.fillStyle = gd;
    dctx.beginPath(); dctx.moveTo(c.x, c.y - 6); dctx.lineTo(c.x + p.facing * len, c.y - half); dctx.lineTo(c.x + p.facing * len, c.y + half); dctx.lineTo(c.x, c.y + 6); dctx.closePath(); dctx.fill();
  }
  for (const l of G.lanterns) cutLight(l.x, l.y - 4, 95 + Math.sin(G.titleT * 9 + l.x) * 6, 0.85);
  for (const cd of G.candles) if (!cd.taken) cutLight(cd.tx * T + 16, cd.ty * T + 10, 45 + Math.sin(G.titleT * 12) * 4, 0.7);
  if (G.key && !G.key.taken) cutLight(G.key.x, G.key.y, 34, 0.5);
  const d = G.door;
  cutLight(d.tx * T + T / 2, d.ty * T, G.unlocked ? 90 : 36, G.unlocked ? 0.8 : 0.35);
  for (const g of G.ghosts) cutLight(g.x, g.y + 6, 26, 0.25);
  for (const s of G.switches) cutLight(s.tx * T + T / 2, s.ty * T + 24, 24, 0.35);
  ctx.drawImage(darkCv, 0, 0);
}

// 懐中電灯の暖色の照り返し
function drawWarmLight() {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const p of G.players) {
    if (p.exited) continue;
    const c = center(p), len = 230 * p.light, half = len * 0.42 + 18;
    const gd = ctx.createLinearGradient(c.x, c.y, c.x + p.facing * len, c.y);
    gd.addColorStop(0, 'rgba(255,200,130,0.10)'); gd.addColorStop(1, 'rgba(255,200,130,0)');
    ctx.fillStyle = gd;
    ctx.beginPath(); ctx.moveTo(c.x, c.y - 6); ctx.lineTo(c.x + p.facing * len, c.y - half); ctx.lineTo(c.x + p.facing * len, c.y + half); ctx.lineTo(c.x, c.y + 6); ctx.closePath(); ctx.fill();
    const rg = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 62 * p.light);
    rg.addColorStop(0, 'rgba(255,200,130,0.08)'); rg.addColorStop(1, 'rgba(255,200,130,0)');
    ctx.fillStyle = rg; ctx.fillRect(c.x - 70 * p.light, c.y - 70 * p.light, 140 * p.light, 140 * p.light);
  }
  for (const l of G.lanterns) {
    const rg = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, 95);
    rg.addColorStop(0, 'rgba(255,170,80,0.12)'); rg.addColorStop(1, 'rgba(255,170,80,0)');
    ctx.fillStyle = rg; ctx.fillRect(l.x - 95, l.y - 95, 190, 190);
  }
  ctx.restore();
}

function drawVignette() {
  const gd = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
  gd.addColorStop(0, 'rgba(0,0,0,0)'); gd.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = gd; ctx.fillRect(0, 0, W, H);
  if (G.ghostNear > 0) {
    const pulse = (Math.sin(G.time * (6 + G.ghostNear * 8)) * 0.5 + 0.5) * G.ghostNear;
    const rg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8);
    rg.addColorStop(0, 'rgba(120,0,10,0)'); rg.addColorStop(1, `rgba(120,0,10,${0.25 * pulse + 0.1 * G.ghostNear})`);
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  }
  if (G.flash > 0) { ctx.fillStyle = `rgba(200,210,255,${G.flash * 0.35})`; ctx.fillRect(0, 0, W, H); }
}

function drawHUD() {
  ctx.textBaseline = 'alphabetic';
  ctx.font = `13px ${FONT_UI}`; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(190,180,200,0.85)';
  ctx.fillText(G.level.name, 14, 22);
  ctx.textAlign = 'right';
  ctx.fillText(`${G.numPlayers}人　死亡 ${G.deaths}${Sfx.isMuted() ? '　🔇' : ''}`, W - 14, 22);
  const remaining = G.players.filter((p) => !p.exited).length;
  if (G.unlocked && remaining) { ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,120,120,0.9)'; ctx.fillText(`扉へ　あと ${remaining} 人`, W / 2, H - 11); }
  if (G.msg) {
    ctx.textAlign = 'center'; ctx.font = `bold 18px ${FONT_UI}`;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(W / 2 - 240, 38, 480, 34);
    ctx.fillStyle = '#efe6d8'; ctx.fillText(G.msg, W / 2, 62);
  } else if (G.time < 14) {
    ctx.textAlign = 'center'; ctx.font = `14px ${FONT_UI}`; ctx.fillStyle = 'rgba(190,180,200,0.75)';
    ctx.fillText(G.level.hint, W / 2, 62);
  }
  if (G.introT > 0) {
    const a = Math.min(1, G.introT / 0.6) * Math.min(1, (2.6 - G.introT) / 0.4 + 0.2);
    ctx.fillStyle = `rgba(0,0,0,${0.55 * a})`; ctx.fillRect(0, H / 2 - 50, W, 100);
    ctx.fillStyle = `rgba(230,220,235,${a})`; ctx.font = `32px ${FONT_TITLE}`; ctx.textAlign = 'center';
    ctx.fillText(G.level.name, W / 2, H / 2 + 12);
  }
  if (G.paused) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e8e0ea'; ctx.font = `28px ${FONT_TITLE}`; ctx.textAlign = 'center';
    ctx.fillText('— 一時停止 —', W / 2, H / 2);
    ctx.font = `14px ${FONT_UI}`; ctx.fillStyle = 'rgba(190,180,200,0.8)';
    ctx.fillText(Touch.on ? '画面をタップで再開' : 'Esc / P で再開　R でやり直し', W / 2, H / 2 + 36);
  }
}

function drawDead() {
  const k = 1 - G.deathT / 1.8;
  // 砂嵐
  for (let i = 0; i < 260; i++) {
    const g = Math.random() * 90;
    ctx.fillStyle = `rgba(${g + 60},${g},${g},${0.5 + Math.random() * 0.4})`;
    ctx.fillRect(Math.random() * W, Math.random() * H, 8 + Math.random() * 60, 1 + Math.random() * 3);
  }
  ctx.fillStyle = `rgba(20,0,4,${Math.min(0.85, k * 1.2)})`; ctx.fillRect(0, 0, W, H);
  if (k > 0.25) {
    ctx.fillStyle = `rgba(200,40,50,${Math.min(1, (k - 0.25) * 3)})`; ctx.font = `40px ${FONT_TITLE}`; ctx.textAlign = 'center';
    ctx.fillText(G.deathText, W / 2 + (Math.random() - 0.5) * 4, H / 2 + (Math.random() - 0.5) * 4);
    ctx.fillStyle = 'rgba(190,180,200,0.8)'; ctx.font = `14px ${FONT_UI}`;
    ctx.fillText('一人でも欠ければ、全員で夜をやり直す', W / 2, H / 2 + 40);
  }
}

function drawClear() {
  const k = Math.min(1, G.clearT / 0.8);
  ctx.fillStyle = `rgba(0,0,0,${0.7 * k})`; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = `rgba(230,220,235,${k})`; ctx.font = `40px ${FONT_TITLE}`; ctx.textAlign = 'center';
  ctx.fillText(G.levelIndex + 1 < LEVELS.length ? '全員、生き延びた' : '屋敷から脱出した', W / 2, H / 2 - 10);
  if (G.clearT > 1.2) {
    ctx.fillStyle = 'rgba(190,180,200,0.85)'; ctx.font = `15px ${FONT_UI}`;
    ctx.fillText((Touch.on ? 'タップ' : 'Enter') + (G.levelIndex + 1 < LEVELS.length ? ' で次の夜へ' : ' で結末へ'), W / 2, H / 2 + 34);
  }
}

function drawEnding() {
  ctx.fillStyle = '#030206'; ctx.fillRect(0, 0, W, H);
  const k = Math.min(1, G.endingT / 2.5);
  ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(230,220,235,${k})`; ctx.font = `44px ${FONT_TITLE}`;
  ctx.fillText('夜が明けた', W / 2, H / 2 - 60);
  ctx.font = `17px ${FONT_UI}`; ctx.fillStyle = `rgba(190,180,200,${k})`;
  ctx.fillText(`${G.numPlayers}人は屋敷を出た。振り返ると、窓に白い顔が並んでいた。`, W / 2, H / 2 - 10);
  const m = Math.floor(G.totalTime / 60), s = Math.floor(G.totalTime % 60);
  ctx.fillText(`死亡回数 ${G.deaths}　　脱出時間 ${m}分${String(s).padStart(2, '0')}秒`, W / 2, H / 2 + 30);
  for (let i = 0; i < G.numPlayers; i++) {
    const px = W / 2 - (G.numPlayers - 1) * 22 + i * 44;
    drawPlayer({ ...makePlayer(i, px - PW / 2, H / 2 + 60), facing: i % 2 ? -1 : 1, blink: 1 });
  }
  if (G.endingT > 2) { ctx.fillStyle = 'rgba(190,180,200,0.7)'; ctx.font = `14px ${FONT_UI}`; ctx.fillText((Touch.on ? 'タップ' : 'Enter') + ' でタイトルへ', W / 2, H - 40); }
}

function drawTitle() {
  ctx.fillStyle = '#050408'; ctx.fillRect(0, 0, W, H);
  // 遠くの屋敷のシルエット
  ctx.fillStyle = '#0d0a12';
  ctx.fillRect(W / 2 - 200, H / 2 - 20, 400, 300);
  ctx.beginPath(); ctx.moveTo(W / 2 - 220, H / 2 - 20); ctx.lineTo(W / 2 - 110, H / 2 - 110); ctx.lineTo(W / 2, H / 2 - 20); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(W / 2, H / 2 - 20); ctx.lineTo(W / 2 + 110, H / 2 - 130); ctx.lineTo(W / 2 + 220, H / 2 - 20); ctx.closePath(); ctx.fill();
  // 窓の灯り
  for (let i = 0; i < 6; i++) {
    const on = Math.sin(G.titleT * 1.3 + i * 2.1) > 0.7 || i === 2;
    ctx.fillStyle = on ? `rgba(255,170,90,${0.25 + Math.sin(G.titleT * 10 + i) * 0.08})` : '#07060a';
    ctx.fillRect(W / 2 - 150 + i * 56, H / 2 + 30, 22, 30);
  }
  // 霧
  const fog = ctx.createLinearGradient(0, H * 0.55, 0, H);
  fog.addColorStop(0, 'rgba(20,16,26,0)'); fog.addColorStop(1, 'rgba(30,24,40,0.8)');
  ctx.fillStyle = fog; ctx.fillRect(0, 0, W, H);
  // タイトル
  const flick = Math.random() < 0.04 ? 0.5 : 1;
  ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(210,200,220,${0.95 * flick})`; ctx.font = `64px ${FONT_TITLE}`;
  ctx.fillText('暗闇の屋敷', W / 2, 130);
  ctx.fillStyle = 'rgba(150,140,165,0.8)'; ctx.font = `16px ${FONT_UI}`;
  ctx.fillText('— 協力ホラーアクション —　鍵を見つけ、全員で扉から出ろ', W / 2, 165);
  // 人数選択
  ctx.fillStyle = '#e8e0ea'; ctx.font = `bold 24px ${FONT_UI}`;
  ctx.fillText(`◀　プレイ人数　${G.numPlayers} 人　▶`, W / 2, 250);
  for (let i = 0; i < 4; i++) {
    const px = W / 2 - 3 * 26 + i * 52;
    const p = makePlayer(i, px - PW / 2, 300); p.facing = i % 2 ? -1 : 1; p.blink = 1;
    ctx.globalAlpha = i < G.numPlayers ? 1 : 0.18;
    drawPlayer(p);
    ctx.globalAlpha = 1;
  }
  ctx.font = `13px ${FONT_UI}`; ctx.fillStyle = 'rgba(190,180,200,0.85)';
  if (Touch.on) {
    ctx.fillText('画面の左右に出るボタンで操作（1P・3P は左、2P・4P は右）。スマホは横向き推奨', W / 2, 360);
    ctx.fillText('◀ ▶ を押したまま指を ▲ へ滑らせると、進みながらジャンプできる', W / 2, 380);
  } else for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i < G.numPlayers ? COLORS[i] : 'rgba(120,110,130,0.5)';
    ctx.fillText(`${i + 1}P  ${CONTROLS[i].label}`, W / 2 - 300 + i * 200, 360);
  }
  ctx.fillStyle = 'rgba(190,180,200,0.7)'; ctx.font = `13px ${FONT_UI}`;
  ctx.fillText('仲間の頭に乗れる。光を向けている間だけ「アレ」は止まる。誰か一人でも欠けたら、全員でやり直し。', W / 2, Touch.on ? 410 : 400);
  if (Math.floor(G.titleT * 1.5) % 2 === 0) {
    ctx.fillStyle = '#efe6d8'; ctx.font = `bold 18px ${FONT_UI}`;
    const focused = document.hasFocus ? document.hasFocus() : true;
    ctx.fillText(Touch.on ? '画面をタップではじめる' : (focused ? 'Enter / Space ではじめる' : '画面をクリックしてから Enter / Space ではじめる'), W / 2, 460);
  }
  ctx.fillStyle = 'rgba(120,110,130,0.6)'; ctx.font = `11px ${FONT_UI}`;
  ctx.fillText(Touch.on ? '◀ ▶ をタップで人数変更　音量にご注意ください' : '← → で人数変更　M で音の切替　音量にご注意ください', W / 2, 500);
}

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  Touch.show(G.scene === 'play' || G.scene === 'dead' || G.scene === 'clear');
  if (G.scene === 'title') return drawTitle();
  if (G.scene === 'ending') return drawEnding();
  // シーン
  if (G.ghostNear > 0.5 && G.scene === 'play') {
    const s = (G.ghostNear - 0.5) * 3;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  drawBackground();
  drawTiles();
  for (const p of G.players) drawPlayer(p);
  for (const g of G.ghosts) drawGhost(g, false);
  drawDarkness();
  drawWarmLight();
  for (const g of G.ghosts) drawGhost(g, true);
  drawVignette();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawHUD();
  if (G.scene === 'dead') drawDead();
  if (G.scene === 'clear') drawClear();
}

// ---------------------------------------------------------------- ループ
let last = performance.now(), acc = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now; acc += dt;
  let n = 0;
  while (acc >= STEP && n < 4) { update(); for (const k in pressed) pressed[k] = false; acc -= STEP; n++; }
  if (n === 4) acc = 0;
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// デバッグ用フック（ブラウザのコンソールから状態を確認できる）
window.__horror = { G, LEVELS, loadLevel, startGame };
})();
