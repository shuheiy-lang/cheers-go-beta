(function(){
"use strict";
/* チアーズGO!（ベータ）
   - data/public.json … 鍵なしでも見られる全体の数字（名前・写真なし）
   - u/<id>.json     … 本人のページ（本人専用の鍵で暗号化）。鍵はリンクの # のうしろ
   - #demo           … 匿名のデモデータ（実在の人・写真は入っていない） */
let ALL = null;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt = n => Number(n || 0).toLocaleString("ja-JP");
const md = s => { const [, m, d] = s.split("-").map(Number); return m + "/" + d; };
const jpd = s => { const [y, m, d] = s.split("-").map(Number); return y + "年" + m + "月" + d + "日"; };
const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
const gmap = q => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
const KIND = {
  share:{label:"シェア", c:"var(--c-share)"}, photo:{label:"チアーズPHOTO", c:"var(--c-photo)"}, thread:{label:"スレッド", c:"var(--c-thread)"},
  comment:{label:"コメント", c:"var(--c-comment)"}, like:{label:"いいね", c:"var(--c-like)"}, intro:{label:"自己紹介", c:"var(--c-intro)"}
};
const ORDER = ["share","photo","thread","comment","like","intro"];
const ICON = {
  intro:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  share:'<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>',
  comment:'<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/></svg>',
  like:'<svg viewBox="0 0 24 24"><path d="M7 11v9H4v-9zM7 11l4-7c1.5 0 2.5 1 2.2 2.6L12.8 10H19a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 17.8 20H7"/></svg>',
  photo:'<svg viewBox="0 0 24 24"><g transform="rotate(-14 7.5 14)"><path d="M3.5 9.5h7v8a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2z"/><path d="M3.5 11.5H2.4a1.2 1.2 0 0 0-1.2 1.2v2.2a1.2 1.2 0 0 0 1.2 1.2h1.1"/><path d="M3.2 9.5c-.4-1.6.8-2.8 2.2-2.3.5-1.3 2.6-1.4 3.2-.2 1.3-.6 2.8.4 2.5 1.9"/></g><g transform="translate(24 0) scale(-1 1) rotate(-14 7.5 14)"><path d="M3.5 9.5h7v8a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2z"/><path d="M3.5 11.5H2.4a1.2 1.2 0 0 0-1.2 1.2v2.2a1.2 1.2 0 0 0 1.2 1.2h1.1"/><path d="M3.2 9.5c-.4-1.6.8-2.8 2.2-2.3.5-1.3 2.6-1.4 3.2-.2 1.3-.6 2.8.4 2.5 1.9"/></g><path d="M12 1.5v2.6M9 2.8l1 1.7M15 2.8l-1 1.7"/></svg>',
  thread:'<svg viewBox="0 0 24 24"><path d="M4 6h10M4 11h16M4 16h8"/><circle cx="18" cy="6" r="2"/></svg>',
  ext:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.6"/></svg>',
  check:'<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
};
const SPARK = '<svg viewBox="0 0 26 26" aria-hidden="true"><g stroke="var(--gold)" stroke-width="2.6" stroke-linecap="round"><path d="M5 20 L11 15"/><path d="M3 11 L10 11"/><path d="M8 3 L12 9"/></g></svg>';
const PHOTO_MILES = [[1,"はじめての乾杯"],[10,"乾杯10回"],[20,"カード1枚コンプリート"],[30,"乾杯30回"],[50,"世界に50人の仲間"],[100,"チアーズメイト100人"]];
function copyText(text, btn){
  const done = () => { const o = btn.textContent; btn.textContent = "コピーしました"; setTimeout(() => btn.textContent = o, 1600); };
  try { navigator.clipboard.writeText(text).then(done, () => fallback()); } catch (e) { fallback(); }
  function fallback(){
    const t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select();
    try { document.execCommand("copy"); done(); } catch (e) {} t.remove();
  }
}
function store(k, v){ try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
let IMGS = {}, AUD = {}, ME = null, PH = [], DEMO = false;
/* ---------- 小さなお知らせ（画面の下に数秒出る） ---------- */
function toast(t, ms){
  let el = document.getElementById("toast");
  if (!el){ el = document.createElement("div"); el.id = "toast"; el.className = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
  el.textContent = t; el.classList.add("on"); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("on"), ms || 2800);
}
/* ---------- 表示の設定：テーマ（自動・ライト・ダーク）とアクセントの色。選んだものは端末に覚える ---------- */
const ACCENTS = [["#2F86D6", "ブルー"], ["#0E8A7E", "ティール"], ["#1E8E5A", "グリーン"], ["#D23F78", "ピンク"], ["#6B55D9", "パープル"], ["#C9501F", "オレンジ"]];
function applyLook(){
  const t = store("cg-theme") || "auto", a = store("cg-accent") || "";
  if (t === "auto") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  if (a) document.documentElement.style.setProperty("--sky", a); else document.documentElement.style.removeProperty("--sky");
  document.querySelectorAll("[data-th]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.th === t)));
  document.querySelectorAll("[data-ac]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.ac === (a || ACCENTS[0][0]))));
}
(function initLook(){
  const p = document.getElementById("setPanel"), g = document.getElementById("gear");
  if (!p || !g) return;
  p.querySelector(".accents").innerHTML = ACCENTS.map(([c, n]) => `<button type="button" data-ac="${c}" style="--c:${c}" aria-label="${n}"><i></i><span>${n}</span></button>`).join("");
  g.addEventListener("click", () => { p.hidden = !p.hidden; g.setAttribute("aria-expanded", String(!p.hidden)); });
  p.querySelectorAll("[data-th]").forEach(b => b.addEventListener("click", () => { store("cg-theme", b.dataset.th === "auto" ? null : b.dataset.th); applyLook(); }));
  p.querySelectorAll("[data-ac]").forEach(b => b.addEventListener("click", () => { store("cg-accent", b.dataset.ac === ACCENTS[0][0] ? null : b.dataset.ac); applyLook(); }));
  applyLook();
})();
/* ---------- 世界地図 ---------- */
/* 地図：撮った国が少ないうちは、その国とまわりの国だけに寄せる（広がったら世界全体）。国の上に写真のピン */
const FULLV = {x: 0, y: 0, w: 900, h: 441};
function subpaths(d){
  const out = []; let cur = null, x = 0, y = 0, sx = 0, sy = 0, m;
  const re = /([MmLlHhVvZz])([^MmLlHhVvZz]*)/g;
  while ((m = re.exec(d))){
    const c = m[1], n = (m[2].match(/-?\d*\.?\d+(?:e-?\d+)?/g) || []).map(Number);
    if (c === "M" || c === "m"){
      for (let i = 0; i + 1 < n.length; i += 2){
        x = c === "m" ? x + n[i] : n[i]; y = c === "m" ? y + n[i + 1] : n[i + 1];
        if (i === 0){ cur = [[x, y]]; out.push(cur); sx = x; sy = y; } else cur.push([x, y]);
      }
    } else if (c === "L" || c === "l"){
      for (let i = 0; i + 1 < n.length; i += 2){ x = c === "l" ? x + n[i] : n[i]; y = c === "l" ? y + n[i + 1] : n[i + 1]; if (cur) cur.push([x, y]); }
    } else if (c === "H" || c === "h"){ for (const v of n){ x = c === "h" ? x + v : v; if (cur) cur.push([x, y]); } }
    else if (c === "V" || c === "v"){ for (const v of n){ y = c === "v" ? y + v : v; if (cur) cur.push([x, y]); } }
    else { x = sx; y = sy; }
  }
  return out;
}
const BOX = {};
function mainBox(iso){   // いちばん大きい陸地（本土）の範囲。飛び地や島で地図が広がりすぎないように
  if (BOX[iso]) return BOX[iso];
  const W = window.__WORLD; if (!W || !W.paths[iso]) return null;
  let best = null;
  for (const s of subpaths(W.paths[iso].path)){
    let a = 1e9, b = 1e9, c = -1e9, e = -1e9;
    for (const [x, y] of s){ a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); e = Math.max(e, y); }
    const area = (c - a) * (e - b);
    if (!best || area > best.area) best = {x: a, y: b, w: c - a, h: e - b, area};
  }
  return (BOX[iso] = best);
}
function viewFor(isos){
  const bs = isos.map(mainBox).filter(Boolean);
  if (!bs.length) return {v: FULLV, zoom: false};
  let x0 = Math.min(...bs.map(b => b.x)), y0 = Math.min(...bs.map(b => b.y));
  let x1 = Math.max(...bs.map(b => b.x + b.w)), y1 = Math.max(...bs.map(b => b.y + b.h));
  if (x1 - x0 > 900 * 0.5) return {v: FULLV, zoom: false};   // 世界中に広がったら全体
  const pad = Math.max(x1 - x0, y1 - y0) * 0.55 + 30;          // まわりの国が5つほど入る余白
  x0 -= pad; x1 += pad; y0 -= pad; y1 += pad;
  let w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const ar = 1.9;
  if (w / h < ar) w = h * ar; else h = w / ar;
  w = Math.max(w, 190); h = w / ar;
  if (w > 900 * 0.72) return {v: FULLV, zoom: false};
  const v = {x: Math.min(Math.max(cx - w / 2, 0), 900 - w), y: Math.min(Math.max(cy - h / 2, 0), 441 - h), w, h};
  return {v, zoom: true};
}
let MAPN = 0;
function worldMap(counts, label, photoOf){
  const W = window.__WORLD;
  const has = Object.keys(counts).sort((a, b) => counts[b].n - counts[a].n);
  const flag = iso => /^[A-Z]{2}$/.test(iso) ? String.fromCodePoint(...[...iso].map(c => 0x1F1A5 + c.charCodeAt(0))) : "";
  const chips = has.map(k => `<span class="chip">${flag(k)} ${esc(counts[k].name)} <b>${counts[k].n}</b></span>`).join("");
  const nPhotos = has.reduce((s, k) => s + counts[k].n, 0);
  const head = has.length ? `<div class="maphead"><span><b class="num">${has.length}</b>か国の仲間と</span><span><b class="num">${nPhotos}</b>回の乾杯</span></div>` : "";
  if (!W) return `<div class="mapbox">${head}<div class="ccs">${chips || '<span class="mapnote">まだ色のついた国はありません。1枚目の国がここに入ります。</span>'}</div></div>`;
  const id = "map" + (++MAPN);
  const {v, zoom} = viewFor(has);
  const narrow = window.innerWidth < 640;
  const r = v.w * (narrow ? 0.055 : 0.034);
  // ピンの位置（本土の中心）→ 重なったら少しずらす
  const pins = has.map(k => { const b = mainBox(k); return b ? {k, ox: b.x + b.w / 2, oy: b.y + b.h / 2, x: b.x + b.w / 2, y: b.y + b.h / 2} : null; }).filter(Boolean);
  for (let it = 0; it < 40; it++) for (let i = 0; i < pins.length; i++) for (let j = i + 1; j < pins.length; j++){
    const a = pins[i], b = pins[j]; let dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy) || 0.01, need = r * 3.2;
    if (d < need){ const push = (need - d) / 2; dx /= d; dy /= d; a.x -= dx * push; a.y -= dy * push; b.x += dx * push; b.y += dy * push; }
  }
  const pinSvg = pins.map((p, i) => {
    const c = counts[p.k], ph = photoOf && photoOf[p.k], im = ph && IMGS[ph.id], href = im ? (im.s || im.l) : "";
    const lead = Math.hypot(p.x - p.ox, p.y - p.oy) > r * 0.6 ? `<line x1="${p.ox.toFixed(1)}" y1="${p.oy.toFixed(1)}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" class="lead"/><circle cx="${p.ox.toFixed(1)}" cy="${p.oy.toFixed(1)}" r="${(r * 0.16).toFixed(2)}" class="dotp"/>` : "";
    const body = href
      ? `<clipPath id="${id}c${i}"><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r.toFixed(2)}"/></clipPath><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(r * 1.16).toFixed(2)}" class="ring"/><image href="${href}" x="${(p.x - r).toFixed(1)}" y="${(p.y - r).toFixed(1)}" width="${(2 * r).toFixed(1)}" height="${(2 * r).toFixed(1)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id}c${i})"/>`
      : `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(r * 0.9).toFixed(2)}" class="ring solid"/><text x="${p.x.toFixed(1)}" y="${(p.y + r * 0.32).toFixed(1)}" class="pn" style="font-size:${(r * 0.9).toFixed(1)}px">${c.n}</text>`;
    const badge = href ? `<circle cx="${(p.x + r * 0.82).toFixed(1)}" cy="${(p.y - r * 0.82).toFixed(1)}" r="${(r * 0.42).toFixed(2)}" class="bdg"/><text x="${(p.x + r * 0.82).toFixed(1)}" y="${(p.y - r * 0.82 + r * 0.17).toFixed(1)}" class="bn" style="font-size:${(r * 0.5).toFixed(1)}px">${c.n}</text>` : "";
    return `<g class="pin" style="--i:${i}"${ph ? ` data-ph="${ph.i}" role="button" tabindex="0" aria-label="${esc(c.name)}の写真を見る"` : ""}>${lead}<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(r * 1.5).toFixed(2)}" class="pulse"/>${body}${badge}<text x="${p.x.toFixed(1)}" y="${(p.y + r * 1.85).toFixed(1)}" class="pl" style="font-size:${(r * 0.62).toFixed(1)}px">${esc(c.name)}</text></g>`;
  }).join("");
  const paths = Object.entries(W.paths).map(([k, val]) => `<path class="land${counts[k] ? " on" : ""}" d="${val.path}"><title>${esc(counts[k] ? counts[k].name + " " + counts[k].n : val.name)}</title></path>`).join("");
  const vb = `${v.x.toFixed(1)} ${v.y.toFixed(1)} ${v.w.toFixed(1)} ${v.h.toFixed(1)}`;
  return `<div class="mapbox">${head}
    <svg id="${id}" class="wmap" viewBox="${vb}" data-vb="${vb}" data-zoom="${zoom ? 1 : 0}" role="img" aria-label="${esc(label)}"><rect x="0" y="0" width="900" height="441" class="sea"/>${paths}<g class="pins">${pinSvg}</g></svg>
    ${zoom ? `<button class="mapbtn" type="button" data-map="${id}" aria-pressed="false">世界全体で見る</button>` : ""}
    <div class="ccs">${chips || '<span class="mapnote">まだ色のついた国はありません。1枚目の乾杯の相手の国が、ここに色づきます。</span>'}</div></div>`;
}
function tweenVB(svg, from, to, ms){
  const t0 = performance.now(), ease = t => 1 - Math.pow(1 - t, 3);
  const step = now => { const t = Math.min(1, (now - t0) / ms), k = ease(t);
    svg.setAttribute("viewBox", ["x", "y", "w", "h"].map(p => (from[p] + (to[p] - from[p]) * k).toFixed(1)).join(" "));
    if (t < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
const vbOf = s => { const [x, y, w, h] = s.split(" ").map(Number); return {x, y, w, h}; };
function initMaps(root){
  root.querySelectorAll("svg.wmap[data-zoom='1']").forEach(svg => {
    const target = vbOf(svg.dataset.vb);
    if (!reduce && "IntersectionObserver" in window && !svg.dataset.done){
      const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)){ io.disconnect(); svg.dataset.done = "1"; tweenVB(svg, FULLV, target, 1600); } }, {threshold: .35});
      io.observe(svg);
    }
  });
  root.querySelectorAll(".mapbtn").forEach(b => b.addEventListener("click", () => {
    const svg = document.getElementById(b.dataset.map), wide = b.getAttribute("aria-pressed") !== "true";
    const from = vbOf(svg.getAttribute("viewBox")), to = wide ? FULLV : vbOf(svg.dataset.vb);
    if (reduce) svg.setAttribute("viewBox", `${to.x} ${to.y} ${to.w} ${to.h}`); else tweenVB(svg, from, to, 900);
    b.setAttribute("aria-pressed", String(wide)); b.textContent = wide ? "撮った国のまわりに寄る" : "世界全体で見る";
  }));
}
/* ================= みんなのページ：日本から世界へ、写真で大陸が埋まるキービジュアル ================= */
let TEAM = null, PUBLIC = null, FLY_PLAYED = false, FLY_TIMERS = [];
const SHOW = () => TEAM || PUBLIC;
const flagOf = iso => /^[A-Z]{2}$/.test(iso) ? String.fromCodePoint(...[...iso].map(c => 0x1F1A5 + c.charCodeAt(0))) : "";
const PLANE = '<path d="M-7 -1.1 L3 -1.1 Q7 -.7 7.6 0 Q7 .7 3 1.1 L-7 1.1Z" fill="#fff"/><path d="M-1 -.8 L-4 -6.2 L-2 -6.2 L2.6 -.8Z M-1 .8 L-4 6.2 L-2 6.2 L2.6 .8Z" fill="#fff"/><path d="M-6.4 -.8 L-8.2 -4 L-6.8 -4 L-4.4 -.8Z" fill="#FFC83D"/>';
/* ---------- ランキング（日・週・月／受講生にも見せる。名前はローマ字の呼び名、漢字の名前は運営と先生リンクだけ。自分の行は me） ---------- */
const BOARDS = [["practice", "英語の練習", "回"], ["streak", "連続学習", "日"], ["login", "連続ログイン", "日"], ["msg", "メッセージ", "件"], ["reply", "返信・コメント", "件"], ["pts", "チアーズポイント", "pt"]];
const RKT = [["day", "日"], ["week", "週"], ["month", "月"]];
let RK = {b: "pts", t: "month", m: 0};
function renderRank(){
  const R = ME.ranking, el = $("rankSec"); if (!el || !R) return;
  const P = R.periods || {month: R.months.map((k, i) => ({k, label: i ? "先月" : "今月"}))};   // 前の形（月だけ）のデータでも出す
  if (!P[RK.t]) RK.t = "month";
  const boards = BOARDS.filter(([k]) => R.boards[k] && Object.keys(R.boards[k]).some(pk => P[RK.t].some(x => x.k === pk)));
  if (!boards.some(([k]) => k === RK.b)) RK.b = "pts";
  const per = P[RK.t][RK.m] || P[RK.t][0], rows = ((R.boards[RK.b] || {})[per.k]) || [], unit = (BOARDS.find(x => x[0] === RK.b) || [])[2];
  const plabel = x => RK.t === "day" ? `${x.label}（${md(x.k)}）` : RK.t === "week" ? `${x.label}（${md(x.from)}〜）` : `${x.label}（${+x.k.slice(5)}月）`;
  const move = x => x.prev == null ? `<span class="mv new">NEW</span>` : x.prev > x.rank ? `<span class="mv up">▲${x.prev - x.rank}</span>` : x.prev < x.rank ? `<span class="mv dn">▼${x.rank - x.prev}</span>` : `<span class="mv eq">ー</span>`;
  const top3 = rows.filter(x => x.rank <= 3).slice(0, 3);
  const emptyNote = (RK.b === "practice" || RK.b === "streak") && R.empty_practice ? "英語の練習の記録は準備中です。AIと会話・音読チェック・2秒応答・筋トレの記録が中継にたまると、ここに出ます。"
    : RK.b === "login" && R.empty_login ? "ログインの記録は準備中です。中継の新しい版が動くと、アプリを開いた日がたまって、ここに出ます。" : !rows.length ? "まだ記録がありません。" : "";
  el.innerHTML = `<div class="sec-h"><h2>${SPARK}ランキング</h2><p>${R.full ? "受講生にも見えています（受講生の画面は、ローマ字の呼び名だけ）。" : "名前はローマ字の呼び名で出ています。"}数字は毎朝の更新の時点のものです。</p></div>
    <div class="kzrate" role="group" aria-label="期間" style="margin-bottom:8px">${RKT.map(([k, l]) => `<button type="button" data-rt="${k}" aria-pressed="${RK.t === k}">${l}</button>`).join("")}</div>
    <div class="chips rkb">${boards.map(([k, l]) => `<button type="button" data-rb="${k}" aria-pressed="${RK.b === k}">${l}</button>`).join("")}</div>
    <div class="kzrate" role="group" style="margin:8px 0">${P[RK.t].map((x, i) => `<button type="button" data-rm="${i}" aria-pressed="${RK.m === i}">${plabel(x)}</button>`).join("")}</div>
    ${RK.b === "streak" || RK.b === "login" ? `<p class="mapnote" style="margin:0 0 6px">その期間の最後の日に、何日続いていたか。${RK.b === "streak" ? "英語の練習（AI会話・音読・2秒応答・筋トレ）をした日" : "アプリを開いた日"}で数えます。</p>` : ""}
    ${emptyNote ? `<div class="note">${emptyNote}</div>` : `
    <div class="podium">${[1, 0, 2].map(i => top3[i] ? `<div class="pd p${top3[i].rank}"><span class="medal">${["🥇", "🥈", "🥉"][top3[i].rank - 1]}</span><b>${esc(top3[i].name)}</b>${top3[i].jp && top3[i].jp !== top3[i].name ? `<small>${esc(top3[i].jp)}</small>` : ""}<span class="num">${top3[i].v}${unit}</span></div>` : "").join("")}</div>
    <ol class="rklist">${[...rows.slice(0, 10), ...rows.slice(10).filter(x => x.me)].map(x => `<li${x.me ? ` class="me"` : ""}><span class="num rk">${x.rank}</span><b>${esc(x.name)}${x.me ? "（あなた）" : ""}</b>${x.jp && x.jp !== x.name ? `<small>${esc(x.jp)}</small>` : ""}<span class="num v">${x.v}${unit}</span>${move(x)}</li>`).join("")}</ol>`}`;
  el.querySelectorAll("[data-rt]").forEach(b => b.addEventListener("click", () => { RK.t = b.dataset.rt; RK.m = 0; renderRank(); }));
  el.querySelectorAll("[data-rb]").forEach(b => b.addEventListener("click", () => { RK.b = b.dataset.rb; renderRank(); }));
  el.querySelectorAll("[data-rm]").forEach(b => b.addEventListener("click", () => { RK.m = +b.dataset.rm; renderRank(); }));
}
/* ---------- みんなの部品（カード）：1つの部品＝1つの関数 ---------- */
function flyHtml(){
  // 日本から世界へ、写真で大陸が埋まるキービジュアル
  const TM = ALL.team || {photos: 0, members: 0, countries: []};
  const ccChips = TM.countries.map(c => `<span class="chip">${flagOf(c.iso)} ${esc(c.name)} <b>${c.n}</b></span>`).join("");
  return `<section class="fly" aria-label="メンバー全員のチアーズPHOTOの世界地図">
    <div class="fly-stage">
      <svg id="flyMap" viewBox="0 0 900 441" preserveAspectRatio="xMidYMid meet" role="img" aria-label="日本から世界の${TM.countries.length}か国へ、メンバーの写真${TM.photos}枚が広がる世界地図"></svg>
      <div class="fly-copy">
        <img class="fly-logo" src="icons/logo-w.png" alt="Cheers mate">
        <span class="fly-eye">メンバー全員のチアーズPHOTO</span>
        <h1>世界中に、<br><span>乾杯できる仲間</span>を。</h1>
      </div>
      <div class="fly-stats">
        <div><b class="num" data-to="${TM.photos}">${fmt(TM.photos)}</b><span>枚の写真</span></div>
        <div><b class="num" data-to="${TM.countries.length}">${TM.countries.length}</b><span>か国の仲間</span></div>
        <div><b class="num" data-to="${TM.members}">${TM.members}</b><span>人のメンバー</span></div>
      </div>
      <div class="fly-big" id="flyBig" aria-label="メンバーの写真"></div>
      <button class="fly-replay" type="button" id="flyReplay">もう一度見る</button>
      ${TEAM ? "" : `<p class="fly-lock">あなた専用のリンクで開くと、みんなの写真も加わります</p>`}
    </div>
    <div class="ccs fly-ccs">${ccChips}</div>
  </section>`;
}
function glassesHtml(){
  // 今月のチアーズPHOTOチャレンジ（ジョッキが1枚ずつ満ちる）
  const A = ALL, goal = A.photo.goal, n = A.photo.month;
  if (!goal) return "";
  const cells = [];
  for (let i = 0; i < goal; i++){
    cells.push(`<svg viewBox="0 0 40 52" class="${i < n ? "on" : ""}" style="--i:${i}" aria-hidden="true"><path class="beer" d="M9 16h20l-1.5 28h-17z"/><path class="foam" d="M8 16c0-5 4-8 8-6 2-4 9-4 11 0 4-1 6 3 4 6z"/><path class="cup" d="M8 14h22l-2 32H10zM30 20h4a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-5"/></svg>`);
  }
  return `<section><div class="glasses"><div class="gt"><b>${esc(A.month)} チアーズPHOTOチャレンジ</b><span class="big num">${n}<small>/${goal}枚</small></span></div>
      <div class="gl10" role="img" aria-label="${n}枚 / 目標${goal}枚">${cells.join("")}</div>
      <p class="mapnote">外国の方との乾杯写真を、メンバー全員で${goal}枚。${n >= goal ? "目標達成！おめでとうございます！" : `あと<b class="num">${goal - n}</b>枚。`}</p></div></section>`;
}
function teamAlbumSecHtml(){
  return SHOW() ? `<section>
    <div class="sec-h"><h2>${SPARK}みんなのアルバム</h2></div>
    <div class="tgrid" id="tgrid" style="grid-template-columns:repeat(${albumCols(SHOW().photos.length)},minmax(0,1fr))">${teamAlbum(SHOW().photos.length)}</div>
  </section>` : "";
}
function totalsHtml(){
  // 今月のみんなの貢献
  const A = ALL, T = A.totals_month || {};
  const tiles = [["チアーズPHOTO", T.photo, "枚"], ["コメント", T.comment, "回"], ["シェア", T.share, "回"], ["チアーズポイント", A.points_month, "pt"]]
    .map(t => `<div class="stat"><div class="k">${t[0]}</div><div class="v num">${fmt(t[1])}<small>${t[2]}</small></div></div>`).join("");
  return `<section>
    <div class="sec-h"><h2>${SPARK}${esc(A.month)}のみんなの貢献</h2></div>
    <div class="totals">${tiles}</div>
  </section>`;
}
function podiumsHtml(){
  // 今月の表彰台。名前はメンバーだけが読めるチームのデータ（TEAM.top）から。鍵なしで開いたときは順位と数字だけ
  const A = ALL, TOP = (TEAM && TEAM.top) || {photo: A.top_photo, points: A.top_points};
  const podium = (list, unit, empty) => {
    const by = r => list.filter(x => x.rank === r);
    const col = (r) => { const xs = by(r); return xs.length
      ? `<div class="pod r${r}"><div class="who">${xs.map(x => esc(x.name || "？？？")).join("・")}</div><div class="val">${fmt(xs[0].v)}${unit}</div><div class="blk">${r}</div></div>`
      : `<div class="pod r${r} none"><div class="who">—</div><div class="val">&nbsp;</div><div class="blk">${r}</div></div>`; };
    return list.length ? `<div class="podium">${col(2)}${col(1)}${col(3)}</div>` : `<p class="mapnote" style="margin-top:12px">${empty}</p>`;
  };
  return `<section>
    <div class="sec-h"><h2>${SPARK}${esc(A.month)}の表彰台</h2><p>月末に、いちばん乾杯した人・いちばん仲間を応援した人を表彰します。</p></div>
    <div class="podiums">
      <div class="panel pdm"><h3>チアーズPHOTO</h3><p class="sub">今月の乾杯の枚数</p>${podium(TOP.photo, "枚", "まだ誰もいません。最初の1枚を撮った人が1位です。")}</div>
      <div class="panel pdm"><h3>チアーズポイント</h3><p class="sub">今月の貢献ポイント</p>${podium(TOP.points, "pt", "まだ誰もいません。")}</div>
    </div>
  </section>`;
}
/* ---------- タイムライン：本人用のリンクで開いた受講生だけ（鍵なし・先生リンクには出さない）。デモは架空の動きだけ ---------- */
/* 名前はランキングと同じローマ字の呼び名だけ（漢字の名前は出さない）。写真はチームの写真（名前なし・日付と国だけ） */
const tlOn = () => !!ME && !ME.viewer && (!DEMO || !!ME.timeline);
function tlItems(){
  if (DEMO) return ME.timeline || [];
  const out = [], R = ME.ranking;
  if (R && R.periods && R.boards) (R.periods.day || []).forEach(p => {
    ((R.boards.practice || {})[p.k] || []).slice(0, 8).forEach(x => out.push({who: x.name, me: x.me, what: `英語の練習を${x.v}回`, ic: "🎙️", d: p.k}));
    ((R.boards.streak || {})[p.k] || []).filter(x => x.v >= 3).slice(0, 5).forEach(x => out.push({who: x.name, me: x.me, what: `${x.v}日連続で練習中`, ic: "🔥", d: p.k}));
  });
  ((TEAM || {}).photos || []).slice(0, 12).forEach(p => { const iso = (p.cc || [])[0], c = iso && (ALL.cc || {})[iso];
    out.push({who: "メンバー", what: c ? `${flagOf(iso)} ${c.name}の方と乾杯` : "外国の方と乾杯", ic: "🍻", d: p.d, img: p.big || p.img}); });
  return out.sort((a, b) => b.d.localeCompare(a.d)).slice(0, 30);
}
function timelineHtml(){
  const it = tlItems();
  return `<section class="tl"><div class="sec-h"><h2>${SPARK}タイムライン</h2><p>${DEMO ? "デモの架空の動きです。" : ""}仲間の最近の動き。受講生だけに見えます（名前はランキングと同じ呼び名だけ・写真に名前は出しません）。</p></div>
    ${it.length ? `<ul class="tlist">${it.map(x => `<li${x.me ? ' class="me"' : ""}><span class="tav" aria-hidden="true">${x.ic || "🍻"}</span><div><p><b>${esc(x.who)}${x.me ? "（あなた）" : ""}</b> が${esc(x.what)}</p><small class="num">${md(x.d)}</small>${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy">` : ""}</div></li>`).join("")}</ul>`
      : `<p class="mapnote">まだ動きがありません。練習や乾杯の記録がたまると、ここに出ます。</p>`}</section>`;
}

/* ---------- みんなのセグメント：タイムライン（受講生だけ）｜ランキング（表彰台・貢献）｜アルバム（世界地図・チャレンジ・みんなの写真） ---------- */
/* ポイントのため方はマイ＞ヘルプの1か所だけ（重ねない） */
const US_SEGS = {timeline: ["タイムライン", [timelineHtml]],
                 rank: ["ランキング", [() => ME && ME.ranking ? `<section class="rank" id="rankSec"></section>` : "", podiumsHtml, totalsHtml]],
                 album: ["アルバム", [flyHtml, glassesHtml, teamAlbumSecHtml]]};
let USSEG = null;                                                          // 本人が選んだセグメント（選ぶまでは、受講生＝タイムライン・鍵なし＝アルバム）
function renderUs(){
  const segs = Object.keys(US_SEGS).filter(k => k !== "timeline" || tlOn());
  const cur = segs.includes(USSEG) ? USSEG : tlOn() ? "timeline" : PERSONAL ? "rank" : "album";
  $("us").innerHTML = `<div class="segbar" id="usSeg" role="group" aria-label="みんなの切り替え">${segs.map(k => `<button type="button" data-us="${k}" aria-pressed="${cur === k}">${US_SEGS[k][0]}</button>`).join("")}</div>`
    + US_SEGS[cur][1].map(f => f()).join("\n");
  $("usSeg").querySelectorAll("[data-us]").forEach(b => b.addEventListener("click", () => { USSEG = b.dataset.us; renderUs(); window.scrollTo(0, 0); }));
  if ($("flyReplay")) $("flyReplay").addEventListener("click", () => playFly(true));
  if ($("rankSec")) renderRank();
  startBig();
  if ($("tmore")) $("tmore").addEventListener("click", e => { $("tgrid").innerHTML = teamAlbum(SHOW().photos.length); e.currentTarget.remove(); });
  FLY_PLAYED = false;
  // 「みんな」を見ているときに写真が届いたら、写真つきでもう一度
  if (!$("tabs").hidden && $("tab-us").getAttribute("aria-selected") === "true") playFly();
}
let BIG_T = null, BIG_I = 0;
function bigCard(p, i){ return `<figure class="pc" style="--i:${i};--r:${((i * 7) % 9) - 4}deg"><img src="${p.big || p.img}" alt=""><figcaption><span class="num">${md(p.d)}</span>${p.cc[0] ? `<span>${flagOf(p.cc[0])} ${esc((ALL.team.countries.find(c => c.iso === p.cc[0]) || {}).name || "")}</span>` : ""}</figcaption></figure>`; }
function startBig(){
  clearInterval(BIG_T);
  const box = $("flyBig"), S = SHOW(); if (!box || !S) return;
  const bigs = S.photos.filter(p => p.big), pool = bigs.length >= 5 ? bigs : bigs.concat(S.photos.filter(p => !p.big));
  if (!pool.length){ box.remove(); return; }
  const n = window.innerWidth < 640 ? 2 : 5, show = () => { box.innerHTML = Array.from({length: n}, (_, i) => bigCard(pool[(BIG_I + i) % pool.length], i)).join(""); BIG_I = (BIG_I + n) % pool.length; };
  BIG_I = 0; show();
  if (!reduce && pool.length > n) BIG_T = setInterval(show, 3200);
}
function albumCols(n){   // 80枚をPC5列（高さ＝幅×3.2）・スマホ2列（幅×20）で並べたときと同じ広さに収まる列の数
  const k = window.innerWidth < 640 ? 20 : 3.2;
  return Math.max(window.innerWidth < 640 ? 2 : 5, Math.ceil(Math.sqrt(n / k)));
}
function teamAlbum(k){
  return SHOW().photos.slice(0, k).map(p => `<div class="tt"><img src="${p.big || p.img}" alt="" loading="lazy"><span class="ov"><span class="dt num">${md(p.d)}</span>${p.cc[0] ? `<span class="pl">${flagOf(p.cc[0])}</span>` : ""}</span></div>`).join("");
}
function landPoints(svg, step){
  const paths = [...svg.querySelectorAll(".fl-land")].map(p => ({p, b: p.getBBox()}));
  const pts = [];
  for (let y = step / 2; y < 441; y += step) for (let x = step / 2; x < 900; x += step){
    const pt = new DOMPoint(x, y);
    for (const q of paths){ const b = q.b; if (x < b.x || x > b.x + b.width || y < b.y || y > b.y + b.height) continue;
      if (q.p.isPointInFill(pt)){ pts.push({x, y}); break; } }
  }
  return pts;
}
function playFly(force){
  const svg = $("flyMap"), W = window.__WORLD;
  if (!svg || !W || (FLY_PLAYED && !force)) return;
  FLY_PLAYED = true;
  FLY_TIMERS.forEach(clearTimeout); FLY_TIMERS = [];
  const later = (ms, f) => FLY_TIMERS.push(setTimeout(f, ms));
  const TM = ALL.team || {countries: []};
  const jp = mainBox("JP"), J = {x: jp.x + jp.w / 2, y: jp.y + jp.h / 2};
  const lit = new Set(TM.countries.map(c => c.iso));
  svg.classList.remove("go", "done");
  svg.setAttribute("viewBox", "0 0 900 441");
  svg.innerHTML = `<defs><clipPath id="tclip" clipPathUnits="objectBoundingBox"><rect width="1" height="1" rx=".24" ry=".24"/></clipPath>
      <radialGradient id="jpG"><stop offset="0" stop-color="#FFE27A" stop-opacity=".95"/><stop offset=".45" stop-color="#F2B705" stop-opacity=".45"/><stop offset="1" stop-color="#F2B705" stop-opacity="0"/></radialGradient>
      <linearGradient id="seaG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0D1D47"/><stop offset="1" stop-color="#16306A"/></linearGradient></defs>
    <rect x="-900" y="-441" width="2700" height="1323" fill="url(#seaG)"/>
    <g class="fl-lands">${Object.entries(W.paths).map(([k, v]) => `<path class="fl-land${k === "JP" ? " jp" : ""}" data-iso="${k}" d="${v.path}"/>`).join("")}</g>
    <g class="fl-tiles"></g><g class="fl-arcs"></g><g class="fl-planes"></g><g class="fl-labels"></g>
    <g class="fl-jp"><circle cx="${J.x}" cy="${J.y}" r="34" fill="url(#jpG)" class="jpglow"/><circle cx="${J.x}" cy="${J.y}" r="3.2" fill="#FFE27A"/>
      <g class="jplab"><rect x="${J.x - 31}" y="${J.y + 9}" width="62" height="13" rx="6.5" fill="#F2B705"/><text x="${J.x}" y="${J.y + 18.2}" text-anchor="middle" font-size="7.6" font-weight="900" fill="#1A2F66">JAPAN から出発</text></g></g>`;
  const step = window.innerWidth < 640 ? 24 : 20, size = step * .9;
  const pts = landPoints(svg, step);
  pts.forEach(p => p.dj = Math.hypot(p.x - J.x, p.y - J.y));
  pts.sort((a, b) => a.dj - b.dj);
  // 国が分かる写真は、その国の上に
  const photos = SHOW() ? SHOW().photos.slice() : [];
  const taken = new Set(), assign = new Map();
  const nearestFree = (x, y) => { let best = -1, bd = 1e9; pts.forEach((p, i) => { if (taken.has(i)) return; const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd){ bd = d; best = i; } }); return best; };
  const ctr = iso => { const b = mainBox(iso); return b ? {x: b.x + b.w / 2, y: b.y + b.h / 2} : null; };
  const rest = [];
  photos.forEach(ph => { const c = ph.cc[0] && ph.cc[0] !== "JP" && ctr(ph.cc[0]); if (c){ const i = nearestFree(c.x, c.y); if (i >= 0){ taken.add(i); assign.set(i, {ph, iso: ph.cc[0]}); return; } } rest.push(ph); });
  let k = 0; const pool = rest.length ? rest : photos;
  pts.forEach((p, i) => { if (taken.has(i)) return; assign.set(i, {ph: pool.length ? pool[k++ % pool.length] : null}); });
  // 飛ぶ順番：日本から近い国から
  const dests = TM.countries.map(c => ({iso: c.iso, name: c.name, n: c.n, c: ctr(c.iso)})).filter(x => x.c && x.iso !== "JP")
    .sort((a, b) => Math.hypot(a.c.x - J.x, a.c.y - J.y) - Math.hypot(b.c.x - J.x, b.c.y - J.y));
  const T0 = 300, ZOOM_AT = 1500, ZOOM_MS = 2000, ARC_AT = 1700, ARC_GAP = 150, ARC_MS = 1150, FILL_AT = 2900, FILL_MS = 4300;
  const arrive = {}; dests.forEach((d, i) => arrive[d.iso] = ARC_AT + i * ARC_GAP + ARC_MS);
  const N = pts.length, PAL = ["#F2B705", "#5AA8EF", "#F06C9B", "#34C98F", "#FFFFFF", "#9D91FF"];
  let tilesSvg = "";
  pts.forEach((p, i) => {
    const a = assign.get(i), jx = (Math.sin(i * 12.9898) * 43758.5453 % 1) * step * .12, jy = (Math.sin(i * 78.233) * 12345.678 % 1) * step * .12;
    const rot = ((i * 37) % 13) - 6;
    let delay;
    if (p.dj < 70) delay = T0 + i * 28;                                   // 日本のまわり：最初にポンポン
    else if (a && a.iso && arrive[a.iso]) delay = arrive[a.iso] + (i % 7) * 60;   // 着いた国の写真
    else delay = FILL_AT + (i / N) * FILL_MS;                              // 日本から外へ、大陸を埋める
    const x = p.x - size / 2 + jx, y = p.y - size / 2 + jy;
    const body = a && a.ph ? `<image href="${a.ph.img}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid slice" clip-path="url(#tclip)"/>`
                           : `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${size}" height="${size}" rx="${(size * .26).toFixed(1)}" fill="${PAL[i % PAL.length]}" opacity="${.55 + (i % 4) * .12}"/>`;
    tilesSvg += `<g transform="rotate(${rot} ${p.x.toFixed(1)} ${p.y.toFixed(1)})"><g class="tile" style="--d:${Math.round(Math.max(0, delay - 700))}ms;--tx:${(J.x - p.x).toFixed(1)}px;--ty:${(J.y - p.y).toFixed(1)}px">${body}</g></g>`;
  });
  svg.querySelector(".fl-tiles").innerHTML = tilesSvg;
  let arcs = "", planes = "", labels = "";
  dests.forEach((d, i) => {
    const dx = d.c.x - J.x, dy = d.c.y - J.y, dist = Math.hypot(dx, dy);
    const mx = (J.x + d.c.x) / 2 + dy * .25, my = (J.y + d.c.y) / 2 - Math.abs(dx) * .22 - dist * .08;
    const path = `M${J.x.toFixed(1)} ${J.y.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${d.c.x.toFixed(1)} ${d.c.y.toFixed(1)}`;
    const t = ARC_AT + i * ARC_GAP;
    arcs += `<path class="arc" d="${path}" pathLength="1" style="--d:${t}ms"/>`;
    planes += `<g class="plane" opacity="0" data-t="${t}">${PLANE}<animateMotion begin="indefinite" dur="${ARC_MS / 1000}s" fill="freeze" rotate="auto" path="${path}"/></g>`;
    const w = d.name.length * 7.6 + 22;
    labels += `<g class="flab" style="--d:${arrive[d.iso]}ms"><rect x="${(d.c.x - w / 2).toFixed(1)}" y="${(d.c.y - 21).toFixed(1)}" width="${w.toFixed(1)}" height="13" rx="6.5" fill="#fff"/><text x="${d.c.x.toFixed(1)}" y="${(d.c.y - 11.8).toFixed(1)}" text-anchor="middle" font-size="7.6" font-weight="900" fill="#1A2F66">${esc(d.name)} ${d.n}</text></g>`;
  });
  svg.querySelector(".fl-arcs").innerHTML = arcs;
  svg.querySelector(".fl-planes").innerHTML = planes;
  svg.querySelector(".fl-labels").innerHTML = labels;
  const litAt = iso => { const el = svg.querySelector(`.fl-land[data-iso="${iso}"]`); if (el) el.classList.add("lit"); };
  const nums = [...document.querySelectorAll(".fly-stats b[data-to]")];
  if (reduce){
    svg.classList.add("done"); lit.forEach(litAt); return;
  }
  // カメラ：日本に寄ったところから、世界全体へ
  const from = {x: J.x - 85, y: J.y - 44, w: 170, h: 83}, to = {x: 0, y: 0, w: 900, h: 441};
  svg.setAttribute("viewBox", `${from.x} ${from.y} ${from.w} ${from.h}`);
  void svg.getBoundingClientRect();
  svg.classList.add("go");
  later(ZOOM_AT, () => tweenVB(svg, from, to, ZOOM_MS));
  svg.querySelectorAll(".plane").forEach(g => later(+g.dataset.t, () => { g.setAttribute("opacity", "1"); const am = g.querySelector("animateMotion"); try { am.beginElement(); } catch (e) {} later(ARC_MS + 250, () => g.setAttribute("opacity", "0")); }));
  dests.forEach(d => later(arrive[d.iso], () => litAt(d.iso)));
  nums.forEach(b => { const to2 = +b.dataset.to; b.textContent = "0"; later(FILL_AT, () => { const t0 = performance.now(); const st = now => { const k2 = Math.min(1, (now - t0) / FILL_MS); b.textContent = fmt(Math.round(to2 * (1 - Math.pow(1 - k2, 3)))); if (k2 < 1) requestAnimationFrame(st); }; requestAnimationFrame(st); }); });
}

/* ---------- ルール ---------- */
function rulesHtml(){
  const R = ALL.rules, P = R.pts;
  const items = [
    ["photo", P.photo, "チアーズPHOTOを投稿", "外国の方との乾杯写真。スタンプも1つ増えます"],
    ["share", P.share, "学び・気づきの共有部屋にシェア", "講座・DM・ミートアップでの気づき"],
    ["thread", P.thread, "スレッドを立てる", "共有部屋やグループで話題をつくる"],
    ["comment", P.comment, "仲間の投稿にコメント", "仲間のスレッドへの返信・グループでの会話（1日10回まで）"],
    ["like", P.like, "仲間の投稿にいいね", "ベータ版ではまだ数えていません"],
    ["intro", P.intro, "自己紹介を投稿", "ベータ版ではまだ数えていません"]
  ];
  return `<div class="rules">${items.map(i => `<div class="rl"><span class="p">+${i[1]}</span><div><b>${i[2]}</b><span>${i[3]}</span></div></div>`).join("")}</div>
  <p class="mapnote" style="margin-top:12px">1週間の目標は <b class="num">${R.week_goal}pt</b>。今週のミッションは「コメント${R.mission.comment}回・シェア${R.mission.share}回・チアーズPHOTO${R.mission.photo}枚」です。</p>`;
}

/* ---------- 鍵 ---------- */
async function sha(s){ return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))); }
const hex = b => Array.from(b, x => x.toString(16).padStart(2, "0")).join("");
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function openFile(rel, key){
  const r = await fetch(rel, {cache: "no-cache"});
  if (!r.ok) throw new Error("notfound");
  const j = await r.json();
  if (!key) return j;                                   // デモ（暗号化なし）
  const plain = await crypto.subtle.decrypt({name: "AES-GCM", iv: unb64(j.n)}, key, unb64(j.c));
  const ds = new Blob([plain]).stream().pipeThrough(new DecompressionStream("deflate"));
  return JSON.parse(await new Response(ds).text());
}

/* ---------- わたし（ホーム） ---------- */
let LOADED = false, AFILTER = "all";
const SRC = {challenge: "チャレンジ", discord: "Discord", ambassador: "アンバサダー", demo: "デモ"};
const CHEERS = '<svg viewBox="0 0 32 32" aria-hidden="true"><g transform="rotate(-18 10 19)"><path d="M4 13.5h10.5v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill="#FFC83D" stroke="#1A2F66" stroke-width="2.2" stroke-linejoin="round"/><path d="M4 16.2H2.6a1.6 1.6 0 0 0-1.6 1.6v2.6a1.6 1.6 0 0 0 1.6 1.6H4" fill="none" stroke="#1A2F66" stroke-width="2.2"/><path d="M3 14.2c-.9-2.6 1.2-4.6 3.4-3.8.8-2 3.9-2.2 4.9-.3 2-.9 4.3.7 3.9 2.9.4.5.3 1-.1 1.2z" fill="#fff" stroke="#1A2F66" stroke-width="2" stroke-linejoin="round"/></g><g transform="translate(32 0) scale(-1 1)"><g transform="rotate(-18 10 19)"><path d="M4 13.5h10.5v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill="#FFC83D" stroke="#1A2F66" stroke-width="2.2" stroke-linejoin="round"/><path d="M4 16.2H2.6a1.6 1.6 0 0 0-1.6 1.6v2.6a1.6 1.6 0 0 0 1.6 1.6H4" fill="none" stroke="#1A2F66" stroke-width="2.2"/><path d="M3 14.2c-.9-2.6 1.2-4.6 3.4-3.8.8-2 3.9-2.2 4.9-.3 2-.9 4.3.7 3.9 2.9.4.5.3 1-.1 1.2z" fill="#fff" stroke="#1A2F66" stroke-width="2" stroke-linejoin="round"/></g></g><g stroke="#E39A00" stroke-width="2.2" stroke-linecap="round"><path d="M16 1.2v3.6M11.2 2.8l1.6 2.6M20.8 2.8l-1.6 2.6"/></g></svg>';
function pimg(p, big){
  const im = IMGS[p.id]; if (!im) return "";
  const u = big ? (im.l || im.s) : (im.s || im.l);
  return u ? `<img src="${u}" alt="" loading="lazy" style="object-position:${p.fx}% ${p.fy}%">` : "";
}
const ccOf = p => (p.cc && p.cc[0]) ? p.cc[0].name : "";
const placeOf = p => p.pin ? (p.pin.venue ? p.pin.city + "・" + p.pin.venue : p.pin.city) : "";
function weekStatus(d){
  const goal = ALL.rules.week_goal, pts = d.pts.week;
  const wd = (new Date(d.today + "T12:00:00").getDay() + 6) % 7;
  const exp = goal * (wd + 1) / 7;
  if (pts >= goal) return {k:"done", t:"今週の目標達成！"};
  if (wd === 0 && pts < exp) return {k:"start", t:"今週スタート"};
  const r = pts / exp;
  return r >= 1 ? {k:"good", t:"いいペース！"} : r >= .8 ? {k:"near", t:"あと少し"} : {k:"push", t:"ペースアップ"};
}
function howToReach(d){
  const P = ALL.rules.pts, M = d.mission;
  let need = ALL.rules.week_goal - d.pts.week; const parts = [];
  if (need <= 0) return "";
  if (M.photo.now < M.photo.goal){ parts.push("チアーズPHOTO1枚"); need -= P.photo; }
  if (need > 0 && M.share.now < M.share.goal){ parts.push("シェア1回"); need -= P.share; }
  if (need > 0) parts.push(`コメント${Math.ceil(need / P.comment)}回`);
  return parts.join("＋");
}
function gaugeSvg(d, st){
  const goal = ALL.rules.week_goal, v = Math.min(d.pts.week, goal);
  const R = 110, cx = 140, cy = 140, len = Math.PI * R, frac = v / goal;
  const wd = (new Date(d.today + "T12:00:00").getDay() + 6) % 7, ex = Math.min(1, (wd + 1) / 7);
  const ang = Math.PI * (1 - ex), tx = cx + R * Math.cos(ang), ty = cy - R * Math.sin(ang);
  const col = {good:"var(--good)", near:"var(--near)", push:"var(--push)", start:"var(--sky)", done:"var(--gold)"}[st.k];
  return `<svg class="gauge" viewBox="0 0 280 168" role="img" aria-label="今週のチアーズポイント ${d.pts.week} / ${goal}">
    <path d="M30 140 A110 110 0 0 1 250 140" fill="none" stroke="var(--line)" stroke-width="22" stroke-linecap="round"/>
    <path class="arc" d="M30 140 A110 110 0 0 1 250 140" fill="none" stroke="${col}" stroke-width="22" stroke-linecap="round" pathLength="${len.toFixed(1)}" stroke-dasharray="${(frac * len).toFixed(1)} ${len.toFixed(1)}" style="--len:${(frac * len).toFixed(1)}"/>
    ${st.k !== "done" ? `<circle cx="${tx.toFixed(1)}" cy="${ty.toFixed(1)}" r="7" fill="var(--paper)" stroke="var(--navy)" stroke-width="3"/><text x="${tx.toFixed(1)}" y="${(ty - 16).toFixed(1)}" text-anchor="middle" style="font-size:11px;font-weight:700">今日までの目安</text>` : ""}
    <text x="30" y="164" text-anchor="middle" style="font-size:12px">0</text><text x="250" y="164" text-anchor="middle" style="font-size:12px">${goal}</text>
  </svg>`;
}
function ringSvg(now, goal, color){
  const r = 20, len = 2 * Math.PI * r, f = Math.min(1, now / goal);
  return `<svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="${r}" fill="none" stroke="var(--line)" stroke-width="6"/>
    <circle class="rp" cx="26" cy="26" r="${r}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" transform="rotate(-90 26 26)" stroke-dasharray="${(f * len).toFixed(1)} ${len.toFixed(1)}" style="--len:${(f * len).toFixed(1)}"/>
    <text x="26" y="30.5" text-anchor="middle" style="font-family:var(--f-num);font-weight:800;font-size:13px;fill:var(--navy)">${now}</text></svg>`;
}
function wallHtml(d){
  const ps = d.photos.slice().reverse(), max = 16;
  if (!ps.length){
    let h = `<div class="ph nx big first"><span>あなたの1枚目が<br>ここにドーンと入ります</span></div>`;
    for (let k = 0; k < 15; k++) h += `<div class="ph em"></div>`;
    return h;
  }
  let h = ps.slice(0, max).map((p, j) => `<button class="ph${j === 0 ? " big" : ""}${j >= 10 ? " mx" : ""}${LOADED ? "" : " skel"}" type="button" data-ph="${p.i}" style="--i:${j}" aria-label="${jpd(p.d)}の写真を見る">${pimg(p, j === 0)}${j === 0 ? '<span class="newest">いちばん新しい1枚</span>' : ""}${p.chal ? `<span class="ch">${CHEERS}</span>` : ""}<span class="pt num">${md(p.d)}${placeOf(p) ? " · " + esc(placeOf(p)) : ccOf(p) ? " · " + esc(ccOf(p)) : ""}</span></button>`).join("");
  const n = Math.min(ps.length, max), cells = 9 + (n - 1);
  if (ps.length < max){
    h += `<div class="ph nx"><span>NEXT<br>${ps.length + 1}枚目</span></div>`;
    const target = Math.max(24, Math.ceil((cells + 1) / 6) * 6);
    for (let k = cells + 1; k < target; k++) h += `<div class="ph em"></div>`;
  }
  return h;
}
function photoCards(d){
  const total = d.photos.length;
  const nowCard = Math.min(5, Math.floor(total / 20) + 1);
  const show = nowCard === 1 ? [1, 2] : [nowCard - 1, nowCard];
  return show.map(c => {
    const start = (c - 1) * 20; let cells = "";
    for (let i = start; i < start + 20; i++){
      if (i < total){
        const p = d.photos[i];
        cells += `<div class="cell" data-cell="${i}"><button class="slot filled" type="button" data-ph="${i}" aria-label="${i + 1}枚目 ${jpd(p.d)}">${pimg(p) || `<span class="n">${i + 1}</span>`}<span class="badge num">${String(i + 1).padStart(2, "0")}</span></button><span class="d">${md(p.d)}</span></div>`;
      } else if (i === total){
        cells += `<div class="cell"><div class="slot next"><span class="n">NEXT</span></div><span class="d">${i + 1}枚目</span></div>`;
      } else {
        cells += `<div class="cell"><div class="slot empty"><span class="n">${i + 1}</span></div><span class="d"></span></div>`;
      }
    }
    const done = total >= c * 20, now = c === nowCard, later = c > nowCard;
    return `<div class="scard${now ? " now" : ""}${later ? " later" : ""}"><div class="scard-h"><span class="t">CHEERS PHOTO CARD</span><span class="no num">No.${c}<small>${start + 1}–${start + 20}</small></span></div>
      ${done ? `<div class="hanko"><div><b>COMPLETE</b><span class="num">${md(d.photos[c * 20 - 1].d)}</span></div></div>` : ""}
      <div class="grid20">${cells}</div><div class="scard-f"><span>${now ? "いま、このカードに押しています" : later ? "1枚目がうまったら、次はこのカード" : "コンプリート！"}</span><span class="num">${Math.max(0, Math.min(20, total - start))} / 20</span></div></div>`;
  }).join("");
}
function albumHtml(d){
  const ps = d.photos.filter(p => AFILTER === "all" || (AFILTER === "challenge" ? p.chal : p.src === AFILTER)).slice().reverse();
  if (!ps.length) return `<p class="mapnote">この種類の写真はまだありません。</p>`;
  const g = {}; ps.forEach(p => (g[p.d.slice(0, 7)] = g[p.d.slice(0, 7)] || []).push(p));
  return Object.entries(g).map(([ym, xs]) => { const [y, m] = ym.split("-").map(Number);
    return `<div class="mon"><h3>${y}年${m}月<span class="num">${xs.length}枚</span></h3><div class="mgrid">${xs.map(p => `<button class="tile${LOADED ? "" : " skel"}" type="button" data-ph="${p.i}" aria-label="${jpd(p.d)}の写真を見る">${pimg(p)}${p.chal ? `<span class="ch">${CHEERS}</span>` : ""}<span class="ov"><span class="dt num">${md(p.d)}</span>${ccOf(p) ? `<span class="pl">${esc(ccOf(p))}</span>` : ""}</span></button>`).join("")}</div></div>`; }).join("");
}
function myCountries(d){
  const ccP = {}; d.photos.forEach(p => (p.cc || []).forEach(c => { ccP[c.iso] = ccP[c.iso] || {name: c.name, n: 0}; ccP[c.iso].n++; }));
  return ccP;
}
/* ---------- 連続記録（ストリーク）：英語を練習した日・アプリを開いた日が何日続いているか ---------- */
/* 練習した日＝この端末の練習の記録＋中継に残った練習の日（d.study_days）＋同期で届いたほかの端末の日。開いた日＝この端末とほかの端末で開いた日 */
const openDays = () => { try { return JSON.parse(store("cg-open-days") || "[]"); } catch (e) { return []; } };
function markOpen(){
  const t = dayKey(Date.now()), l = openDays();
  if (l[l.length - 1] === t) return false;
  l.push(t); store("cg-open-days", JSON.stringify(l.slice(-400))); return true;
}
function runOf(set, today){
  const d = new Date(today + "T12:00:00"); if (!set.has(today)) d.setDate(d.getDate() - 1);
  let n = 0; while (set.has(dayKey(d))){ n++; d.setDate(d.getDate() - 1); } return n;
}
function bestRun(set){
  let best = 0, run = 0, prev = null;
  [...set].sort().forEach(k => { const t = new Date(k + "T12:00:00"); run = prev && Math.round((t - prev) / 864e5) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = t; });
  return best;
}
function streakHtml(d){
  const other = Object.values(syncDaysOther()), od = i => other.flatMap(x => Object.keys(x).filter(k => (x[k] || [])[i]));
  const today = dayKey(Date.now()), study = studySet(d), open = new Set([...openDays(), ...od(1)]);
  const sN = runOf(study, today), oN = runOf(open, today), done = study.has(today);
  const ws = weekStart(today), wk = [...Array(7)].map((_, i) => { const t = new Date(ws + "T12:00:00"); t.setDate(t.getDate() + i); return dayKey(t); });
  return `<section class="streak${done ? " on" : " pend"}" aria-label="連続記録">
    <div class="sk-main"><span class="sk-fire" aria-hidden="true">${done ? "🔥" : "🕯️"}</span><div><b class="num">${sN}</b><span>日連続で英語を練習</span></div></div>
    <div class="sk-week">${wk.map((k, i) => `<span class="${study.has(k) ? "on" : ""}${k === today ? " now" : ""}${k > today ? " fut" : ""}"><i>${study.has(k) ? "✓" : ""}</i>${"月火水木金土日"[i]}</span>`).join("")}</div>
    <div class="sk-sub"><span>ログイン <b class="num">${oN}</b>日連続</span><span>練習のベスト <b class="num">${bestRun(study)}</b>日</span>
      ${done ? `<span class="good">今日の練習 ✓</span>` : `<button type="button" class="more" data-tab="kz">${sN ? "今日の練習で連続をのばす →" : "今日から始める →"}</button>`}</div></section>`;
}

/* ---------- 今月の目標（ホームのいちばん上）：本人が決めた目標と、その進み具合 ---------- */
/* 目標の文（目標シートに書いたこと）・測るもの・数を本人が決める。この端末に月ごとに残す（cg-goal-YYYY-MM・u＝更新日時で端末のあいだで同期） */
// この端末の英語の練習（教材・筋トレ・2秒応答・AI会話・音読・単語集・会話の録音・英語日記）。1件 = {t, n}
function studyEvents(){
  const j = k => { try { return JSON.parse(store(k) || "[]"); } catch (e) { return []; } };
  return [...j("kz-log").map(x => ({t: x.t, n: 1})), ...j("kz-drill").map(x => ({t: x.t, n: x.reps || 1})), ...j("kz-react").map(x => ({t: x.t, n: 1})),
    ...j("kz-talks").map(x => ({t: x.t, n: 1})), ...j("kz-reads").map(x => ({t: x.t, n: 1})), ...j("kz-wdlog").map(x => ({t: x.t, n: 1})),
    ...j("kz-convs").map(x => ({t: x.t, n: 1})), ...j("kz-diary").map(x => ({t: x.t, n: 1}))].filter(x => x.t);
}
const GOAL_M = [["practice", "英語の練習", "回", "教材・筋トレ・2秒応答・AI会話・音読・単語集の復習（同期したほかの端末の分も入る）"], ["days", "練習した日", "日", "英語を練習した日の数（同期したほかの端末の分も入る）"],
  ["photo", "チアーズPHOTO", "枚", "今月の乾杯の写真"], ["pts", "チアーズポイント", "pt", "今月ふえたポイント"], ["words", "単語集に入れた", "こ", "今月、単語集に入れた単語・フレーズ"],
  ["manual", "自分で数える", "回", "＋1ボタンで自分で記録（面談・商談・DMなど何でも）"]];
let GOALEDIT = false;
const goalKey = ym => "cg-goal-" + ym;
const goalGet = ym => { try { return JSON.parse(store(goalKey(ym)) || "null"); } catch (e) { return null; } };
function goalNow(d, g, ym){
  const inM = t => dayKey(t).startsWith(ym);
  const other = Object.values(syncDaysOther()).flatMap(x => Object.entries(x)).filter(([k, v]) => k.startsWith(ym) && (v || [])[0] > 0);   // ほかの端末の日別の回数
  if (g.metric === "practice") return studyEvents().filter(x => inM(x.t)).reduce((s, x) => s + x.n, 0) + other.reduce((s, [, v]) => s + v[0], 0);
  if (g.metric === "days") return new Set([...studyEvents().filter(x => inM(x.t)).map(x => dayKey(x.t)), ...other.map(([k]) => k)]).size;
  if (g.metric === "photo") return d.photos.filter(p => p.d.startsWith(ym)).length;
  if (g.metric === "pts") return Object.entries(d.days || {}).filter(([k]) => k.startsWith(ym)).reduce((s, [, v]) => s + v, 0);
  if (g.metric === "words") return wdList().filter(x => inM(x.t)).length;
  return g.manual || 0;
}
function goalHtml(d){
  const ym = d.today.slice(0, 7), [y, m] = ym.split("-").map(Number), g = goalGet(ym);
  const pm = new Date(y, m - 2, 1), pym = pm.getFullYear() + "-" + String(pm.getMonth() + 1).padStart(2, "0"), pg = goalGet(pym);
  const prev = pg ? (() => { const n = goalNow(d, pg, pym), ok = n >= pg.target; return `<p class="gl-prev">先月（${pm.getMonth() + 1}月）の目標：${esc(pg.text || "")} … <b class="num">${n}/${pg.target}</b>${ok ? " 達成！" : ""}</p>`; })() : "";
  if (!g || GOALEDIT){
    const x = g || {text: "", metric: "practice", target: 20};
    return `<section class="goalcard edit" id="goal"><span class="gl-k">${m}月の目標</span>
      <h2>${g ? "今月の目標を書きかえる" : "今月の目標を決めましょう"}</h2>
      <label class="gl-f"><span>目標（目標シートに書いたことをそのままでもOK）</span><textarea id="glText" rows="2" maxlength="120" placeholder="例：外国の方と英語で5回乾杯して、自己紹介を2秒以内に言えるようになる">${esc(x.text)}</textarea></label>
      <div class="gl-row"><label class="gl-f"><span>なにで測る？</span><select id="glMetric" class="kzsel2">${GOAL_M.map(([k, l]) => `<option value="${k}" ${x.metric === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
        <label class="gl-f gl-n"><span>今月の数</span><input id="glTarget" type="number" min="1" max="9999" inputmode="numeric" value="${x.target}"></label></div>
      <p class="mapnote" id="glHint">${esc((GOAL_M.find(z => z[0] === x.metric) || GOAL_M[0])[3])}</p>
      <div class="acts"><button class="btn" type="button" id="glSave">この目標にする</button>${g ? `<button class="btn ghost" type="button" id="glCancel">やめる</button>` : ""}</div>${prev}</section>`;
  }
  const M = GOAL_M.find(z => z[0] === g.metric) || GOAL_M[0], now = goalNow(d, g, ym), pct = Math.min(100, Math.round(100 * now / g.target));
  const dim = new Date(y, m, 0).getDate(), day = +d.today.slice(8), pace = Math.round(100 * day / dim), left = Math.max(0, g.target - now);
  const st = now >= g.target ? {k: "done", t: "達成！"} : pct >= pace ? {k: "good", t: "いいペース！"} : pct >= pace * .8 ? {k: "near", t: "あと少し"} : {k: "push", t: "ペースアップ"};
  return `<section class="goalcard ${st.k}" id="goal"><div class="gl-h"><span class="gl-k">${m}月の目標</span><span class="st ${st.k}">${st.t}</span><button type="button" class="more" id="glEdit">書きかえる</button></div>
    <h2>${esc(g.text || M[1] + " " + g.target + M[2])}</h2>
    <div class="gl-v"><b class="num">${fmt(now)}</b><span class="num">/ ${fmt(g.target)}${M[2]}</span><small>${esc(M[1])}</small>
      ${g.metric === "manual" ? `<button class="btn sm2" type="button" id="glPlus">＋1</button><button class="btn ghost sm2" type="button" id="glMinus" aria-label="1へらす">−1</button>` : ""}</div>
    <div class="bar gl-bar"><i style="width:${pct}%"></i>${st.k !== "done" ? `<em style="left:${pace}%" title="今日までの目安"></em>` : ""}</div>
    <p class="mini">${st.k === "done" ? "今月の目標に届きました。おめでとうございます！" : `あと <b class="num">${fmt(left)}</b>${M[2]}・のこり${dim - day + 1}日（1日あたり ${Math.ceil(left / (dim - day + 1))}${M[2]}）`}</p>${prev}</section>`;
}
function bindGoal(){
  const ym = ME.today.slice(0, 7), again = () => renderMeKeep();
  if ($("glEdit")) $("glEdit").addEventListener("click", () => { GOALEDIT = true; again(); });
  if ($("glCancel")) $("glCancel").addEventListener("click", () => { GOALEDIT = false; again(); });
  if ($("glMetric")) $("glMetric").addEventListener("change", e => { $("glHint").textContent = (GOAL_M.find(z => z[0] === e.target.value) || GOAL_M[0])[3]; });
  if ($("glSave")) $("glSave").addEventListener("click", () => {
    const target = Math.max(1, Math.min(9999, Math.round(+$("glTarget").value || 0))), old = goalGet(ym) || {};
    if (!$("glText").value.trim() && !target) return;
    store(goalKey(ym), JSON.stringify({text: $("glText").value.trim(), metric: $("glMetric").value, target, manual: old.manual || 0, set: Date.now(), u: Date.now()}));
    GOALEDIT = false; syncDirty(); again();
  });
  const bump = k => { const g = goalGet(ym); if (!g) return; g.manual = Math.max(0, (g.manual || 0) + k); g.u = Date.now(); store(goalKey(ym), JSON.stringify(g)); syncDirty(); again(); };
  if ($("glPlus")) $("glPlus").addEventListener("click", () => bump(1));
  if ($("glMinus")) $("glMinus").addEventListener("click", () => bump(-1));
}
/* ---------- ホームの部品（カード）：1つの部品＝1つの関数。どこに置くかは README の「画面の置き場所」の表が正 ---------- */
function wallSecHtml(d){
  // 写真の壁（いちばん新しい1枚を大きく）と、乾杯の数・国・スポット
  const total = d.photos.length, nC = Object.keys(myCountries(d)).length, nPins = new Set(d.photos.filter(p => p.pin).map(p => p.pin.city)).size;
  return `<section class="wallsec"><div class="kv-count"><span><b class="num">${total}</b>枚の乾杯</span><span><b class="num">${nC}</b>か国の仲間</span><span><b class="num">${nPins}</b>か所の乾杯スポット</span></div>
    <div class="wall" id="wall">${wallHtml(d)}</div></section>`;
}
function stampHtml(d){
  // チアーズPHOTOカード（20枚で1枚・100枚までの道のり）
  const total = d.photos.length, nextMile = PHOTO_MILES.find(m => m[0] > total);
  const miles = PHOTO_MILES.map(m => { const on = total >= m[0];
    return `<div class="ml${on ? " on" : ""}"><div class="m num">${m[0]}</div><div class="nm">${m[1]}</div><div class="dt num">${on ? md(d.photos[m[0] - 1].d) : "あと" + (m[0] - total) + "枚"}</div></div>`; }).join("");
  return `<section id="stamp">
    <div class="sec-h"><h2>${SPARK}チアーズPHOTOカード</h2><p>人と写っている写真1枚ごとに、スタンプが1つ。20個でカード1枚、100個でゴールです。</p></div>
    <div class="cardzone">
      <div class="cz-top"><span class="cnt num">${total}<small>/100</small></span>${total ? `<button class="btn" type="button" id="play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/></svg><span>最初から押していく</span></button>` : ""}</div>
      <div class="cards" id="cards">${photoCards(d)}</div>
      <div class="road">
        <div class="road-h"><b>100枚までの道のり</b><span>${nextMile ? `次は「${nextMile[1]}」まで あと${nextMile[0] - total}枚` : "ゴール達成！"}</span></div>
        <div class="track"><div class="fill" style="width:${Math.min(100, total)}%"></div>${PHOTO_MILES.map(m => `<span class="tick${total >= m[0] ? " on" : ""}" style="left:${m[0]}%"></span>`).join("")}</div>
        <div class="miles">${miles}</div>
      </div>
    </div>
  </section>`;
}
function albumSecHtml(d){
  // わたしのアルバム（種類でしぼりこみ）
  const total = d.photos.length; if (!total) return "";
  const srcCount = k => d.photos.filter(p => k === "challenge" ? p.chal : p.src === k).length;
  const chips = [["all", "すべて", total], ["challenge", "チャレンジ", srcCount("challenge")], ["discord", "Discord", srcCount("discord")], ["ambassador", "アンバサダー", srcCount("ambassador")]]
    .filter(c => c[0] === "all" || c[2] > 0).map(c => `<button class="fchip" type="button" data-af="${c[0]}" aria-pressed="${AFILTER === c[0]}">${c[1]}<span class="num">${c[2]}</span></button>`).join("");
  return `<section id="album">
    <div class="sec-h"><h2>${SPARK}アルバム</h2><p>Discordに投稿した写真と、アンバサダーで提出した写真。タップすると大きく見られます。</p></div>
    <div class="fchips" role="group" aria-label="写真の種類">${chips}</div>
    <div id="albumGrid">${albumHtml(d)}</div>
  </section>`;
}
function weekPtsHtml(d){
  // 今週のチアーズポイント（ゲージとミッションの輪）
  const st = weekStatus(d), R = ALL.rules, M = d.mission, reach = howToReach(d);
  return `<section id="points">
    <div class="panel one ${st.k}">
      <div>${gaugeSvg(d, st)}</div>
      <div>
        <span class="one-k">これだけ見ればOK</span>
        <h3>今週のチアーズポイント</h3>
        <div class="vs"><b>${d.pts.week}</b><span>/ ${R.week_goal}pt</span></div>
        <span class="st ${st.k}">${st.t}</span>
        <p class="say">${st.k === "done" ? "今週の目標に届きました。この調子で仲間を応援しましょう！" : `今週あと <b class="num">${R.week_goal - d.pts.week}</b>pt。${reach ? esc(reach) + " で届きます。" : ""}`}<small>先週は ${d.pts.last_week}pt${d.pts.last_week >= R.week_goal ? "（目標達成）" : ""}。週は月曜はじまりです。</small></p>
        <div class="rings">
          <div class="ring${M.photo.now >= M.photo.goal ? " ok" : ""}">${ringSvg(M.photo.now, M.photo.goal, "var(--c-photo)")}<div><b>チアーズPHOTO</b><span>${M.photo.now} / ${M.photo.goal}枚</span></div></div>
          <div class="ring${M.comment.now >= M.comment.goal ? " ok" : ""}">${ringSvg(M.comment.now, M.comment.goal, "var(--c-comment)")}<div><b>コメント</b><span>${M.comment.now} / ${M.comment.goal}回</span></div></div>
          <div class="ring${M.share.now >= M.share.goal ? " ok" : ""}">${ringSvg(M.share.now, M.share.goal, "var(--c-share)")}<div><b>シェア</b><span>${M.share.now} / ${M.share.goal}回</span></div></div>
        </div>
      </div>
    </div>
  </section>`;
}
function weekChartSvg(d){
  // 週ごとのチアーズポイント（直近12週・種類で色分け）
  const W = d.weeks, R = ALL.rules, goal = R.week_goal;
  const mx = Math.max(goal * 1.25, ...W.map(w => w.p));
  const cw = 600, ch = 210, pl = 34, pb = 26, pt = 18, bw = (cw - pl - 6) / W.length;
  const y = v => pt + (ch - pt - pb) * (1 - v / mx);
  let bars = "";
  W.forEach((w, i) => {
    let acc = 0; const x = pl + i * bw + bw * .18, wdt = bw * .64;
    const raw = ORDER.map(k => [k, (w.c[k] || 0) * (R.pts[k] || 0)]); const rawSum = raw.reduce((s, r) => s + r[1], 0) || 1;
    raw.forEach(([k, v]) => { if (!v) return; const vv = v * w.p / rawSum; const y1 = y(acc), y2 = y(acc + vv);
      bars += `<rect class="b" style="--i:${i}" x="${x.toFixed(1)}" y="${y2.toFixed(1)}" width="${wdt.toFixed(1)}" height="${Math.max(0, y1 - y2).toFixed(1)}" fill="${KIND[k].c}"/>`; acc += vv; });
    if (w.p) bars += `<text x="${(x + wdt / 2).toFixed(1)}" y="${(y(w.p) - 5).toFixed(1)}" text-anchor="middle" style="font-weight:700;fill:var(--navy)">${w.p}</text>`;
    if (w.mission) bars += `<text x="${(x + wdt / 2).toFixed(1)}" y="${(y(w.p) - (w.p ? 18 : 5)).toFixed(1)}" text-anchor="middle" style="fill:var(--gold);font-size:13px">★</text>`;
    if (i % 2 === (W.length - 1) % 2) bars += `<text x="${(x + wdt / 2).toFixed(1)}" y="${ch - 8}" text-anchor="middle">${md(w.w)}</text>`;
  });
  const grid = [0, goal, Math.round(mx / 10) * 10].filter((v, i, a) => a.indexOf(v) === i && v <= mx).map(v => `<line class="gl" x1="${pl}" x2="${cw}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text x="${pl - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${v}</text>`).join("");
  const goalLine = `<line class="goal" x1="${pl}" x2="${cw}" y1="${y(goal).toFixed(1)}" y2="${y(goal).toFixed(1)}"/><text x="${cw}" y="${(y(goal) - 5).toFixed(1)}" text-anchor="end" style="font-weight:700;fill:var(--navy)">週の目標 ${goal}pt</text>`;
  return `<svg viewBox="0 0 ${cw} ${ch}" role="img" aria-label="直近12週のチアーズポイント"><g class="bars">${grid}${goalLine}${bars}</g></svg>`;
}
function heatHtml(d){
  // 活動カレンダー（12週×7日・その日のポイント）
  const ws = d.weeks.map(w => w.w); let heat = '<span></span>';
  ws.forEach((w, i) => { const dt = new Date(w + "T12:00:00"); heat += `<span class="ml2">${(i === 0 || dt.getDate() <= 7) ? (dt.getMonth() + 1) + "月" : ""}</span>`; });
  const DN = ["月", "", "水", "", "金", "", "日"];
  for (let r = 0; r < 7; r++){
    heat += `<span class="dl">${DN[r]}</span>`;
    ws.forEach(w => { const dt = new Date(w + "T12:00:00"); dt.setDate(dt.getDate() + r);
      const key = dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
      const v = d.days[key] || 0, fut = key > d.today;
      heat += `<i class="${fut ? "fut" : v >= 30 ? "h4" : v >= 15 ? "h3" : v >= 5 ? "h2" : v > 0 ? "h1" : ""}" title="${md(key)} ${v}pt"></i>`; });
  }
  return `<div class="heat" style="margin-top:10px">${heat}</div>
        <div class="heatlg">少ない <i style="background:var(--empty)"></i><i style="background:color-mix(in srgb,var(--sky) 30%,var(--empty))"></i><i style="background:color-mix(in srgb,var(--sky) 58%,var(--empty))"></i><i style="background:var(--sky)"></i><i style="background:var(--gold)"></i> 30pt以上</div>`;
}
function contribHtml(d){
  // Cheers mate への貢献：レベルの道・種類別の数・12週グラフ・活動カレンダー・最近ふえたポイント
  const L = d.level, R = ALL.rules, C = d.cnt.all, CM = d.cnt.month;
  const lvPct = L.next ? Math.round(100 * (d.pts.all - L.floor) / (L.next - L.floor)) : 100;
  const lvroad = R.levels.map(x => `<div class="lvs${x.lv < L.lv ? " done" : x.lv === L.lv ? " cur" : ""}"><div class="l">Lv${x.lv}</div><div class="n">${esc(x.name)}</div><div class="a num">${fmt(x.at)}pt〜</div></div>`).join("");
  const kinds = [["photo", "チアーズPHOTO", C.photo || 0, CM.photo || 0, "枚"], ["share", "シェア", C.share || 0, CM.share || 0, "回"], ["comment", "コメント", C.comment || 0, CM.comment || 0, "回"], ["thread", "スレッド", C.thread || 0, CM.thread || 0, "本"]]
    .map(k => `<div class="kd" style="--c:${KIND[k[0]].c}"><div class="k">${k[1]}</div><div class="v num">${fmt(k[2])}<small>${k[4]}</small></div><div class="s">今月 +${fmt(k[3])}</div></div>`).join("");
  const recent = d.recent.length ? `<ul class="recent">${d.recent.slice(0, 8).map(e => `<li style="--c:${KIND[e.k].c}"><span class="num">${md(e.d)}</span><i></i><span>${KIND[e.k].label}</span><b>+${e.p}</b></li>`).join("")}</ul>` : `<p class="mapnote">まだ記録がありません。今日やることから始めましょう。</p>`;
  return `<section>
    <div class="sec-h"><h2>${SPARK}Cheers mateへの貢献</h2><p>チアーズPHOTO・シェア・コメント。仲間を応援した分だけ、ポイントとレベルが上がります。</p></div>
    <div class="lvroad">${lvroad}</div>
    <div class="lvbar track"><div class="fill" style="width:${lvPct}%"></div></div>
    <div class="kinds">${kinds}</div>
    <div class="two">
      <div class="panel chart"><h3 style="font-size:15px;color:var(--navy)">週ごとのチアーズポイント（直近12週）</h3>${weekChartSvg(d)}
        <div class="legend">${ORDER.filter(k => k !== "like" && k !== "intro").map(k => `<span><i style="--c:${KIND[k].c}"></i>${KIND[k].label}</span>`).join("")}<span style="color:var(--gold)">★</span>ミッション達成の週</div></div>
      <div class="panel"><h3 style="font-size:15px;color:var(--navy)">活動カレンダー</h3>
        ${heatHtml(d)}
        <div class="facts">
          <div class="fact"><span>あなたの投稿についた仲間のコメント</span><b>${fmt(d.received)}</b></div>
          <div class="fact"><span>いちばん長く続いた連続日数</span><b>${d.best_streak}<small style="font-size:12px">日</small></b></div>
          <div class="fact"><span>コメントした仲間</span><b>${d.mates}<small style="font-size:12px">人</small></b></div>
        </div>
        <h4 style="margin-top:14px;font-size:13.5px;color:var(--navy)">最近ふえたポイント</h4>${recent}
      </div>
    </div>
  </section>`;
}
function badgeCount(d){ return {on: d.badges.filter(b => b.on).length, all: d.badges.length}; }
function firstsHtml(d){
  // はじめの一歩・バッジ
  const firsts = d.firsts.map(f => `<li class="fs${f.d ? " on" : ""}"><span class="cb">${ICON.check}</span><b>${esc(f.label)}</b><span>${f.d ? md(f.d) + " クリア" : "まだ"}</span></li>`).join("");
  const groups = {}; d.badges.forEach(b => (groups[b.g] = groups[b.g] || []).push(b));
  const UNIT = {"コメント": "回", "シェア": "回", "乾杯": "枚", "連続": "日", "仲間": "人", "国": "か国"};
  const GLABEL = {"連続": "連続で活動", "仲間": "コメントした仲間", "国": "図鑑の国"};
  const bgrid = Object.entries(groups).map(([g, bs]) => `<div class="brow"><span class="g">${esc(GLABEL[g] || g)}</span>${bs.map(b => `<div class="bd${b.on ? " on" : ""}"><span class="c">${b.n}</span><span class="t">${b.on ? b.n + UNIT[g] + "達成" : "あと" + (b.n - b.have) + UNIT[g]}</span></div>`).join("")}</div>`).join("");
  return `<section>
    <div class="sec-h"><h2>${SPARK}はじめの一歩</h2><p>クリアするとチェックが入ります。</p></div>
    <ul class="firsts">${firsts}</ul>
    <h3 style="margin-top:22px;color:var(--navy);font-size:17px">バッジ</h3>
    <div class="bgrid">${bgrid}</div>
  </section>`;
}
function rulesSecHtml(){
  return `<section>
    <div class="sec-h"><h2>${SPARK}ポイントのため方</h2></div>
    ${rulesHtml()}
  </section>`;
}
function howtoHtml(){
  // チアーズPHOTOの撮り方
  return `<section>
    <div class="sec-h"><h2>${SPARK}チアーズPHOTOの撮り方</h2></div>
    <div class="howto">
      <div class="hw"><div class="sn">1</div><b>外国の方がいる場所へ</b><p>「クエスト」のタブに、今週行く場所の候補があります。</p></div>
      <div class="hw"><div class="sn">2</div><b>自分から声をかける</b><p>下のひとことでOK。</p></div>
      <div class="hw"><div class="sn">3</div><b>乾杯して撮る</b><p>写真のあと、そのまま動画で「Cheers!」3秒。横向きで。</p></div>
      <div class="hw"><div class="sn">4</div><b>共有部屋に投稿</b><p>「誰と、どこで」に<b>街やお店の名前</b>まで書くと、乾杯マップのピンがそのお店に立ちます。</p></div>
    </div>
    <div class="phrase"><q>Cheers to new friends! Can we take a quick photo?</q><button class="btn ghost" type="button" data-copy="Cheers to new friends! Can we take a quick photo?">コピー</button></div>
  </section>`;
}
/* ---------- ホーム：5つのブロック（今日の1つ・ステータス・今月の目標・今日やること・次の講座）だけ ---------- */
/* 統計・説明・アルバム・バッジ・講座の一覧はマイへ（_part_my.js）。ホームにカードを足さない（README「ホームに足さないルール」） */
// 英語を練習した日（この端末の練習＋中継に残った日＋同期で届いたほかの端末の日）
function studySet(d){
  const other = Object.values(syncDaysOther()).flatMap(x => Object.keys(x).filter(k => (x[k] || [])[0]));
  return new Set([...studyEvents().map(x => dayKey(x.t)), ...(d.study_days || []), ...other]);
}
/* 今日の1つ：主役のボタンは1つだけ。選ぶ順番（上から先に当てはまったもの）：
   ①はじめの1週間ガイドのその日のステップ ②復習の期限が来た単語 ③続きの教材（今日まだ練習していないとき）
   ④会員サイト（UTAGE）の次のレッスン ⑤今週のひとりクエスト。ぜんぶ終わっていたら、練習をもう1回 */
function todayOne(d){
  const today = dayKey(Date.now()), studied = studySet(d).has(today);
  if (obOn(d)){
    const day = Math.min(obDay(), OB_DAYS), x = obSteps().find(y => y.day <= day && !y.done(d));
    if (x) return {k: "ob", t: x.t, s: `はじめの1週間ガイド ${x.day}日目・${x.s}`, go: x.go, tab: x.tab, url: x.url, fn: x.fn};
  }
  const due = wdList().filter(x => wdDue(x) && !wdDone(x));
  if (due.length) return {k: "words", t: `単語集の復習 ${due.length}こ`, s: "忘れる前に、1こ数秒で。覚えていたら次の復習まで間があきます",
    fn: () => { hush(); KZ = "words"; WDQ = {ids: due.map(x => x.id), i: 0, ok: 0, open: false}; showTab("kz"); window.scrollTo(0, 0); }};
  const m = kzLast();
  if (!studied && m) return {k: "kz", t: `「${m.title}」を1回練習しよう`, s: `${m.lines ? "リスニング" : "スピーキング"}・約${kzSec(m)}秒。1段落でも声に出せたらOK`, fn: () => openKz(m.id)};
  if (!studied) return {k: "study", t: "英語の練習を1回", s: "1分感情スピーチ・AIと会話のどれか1つでOK", tab: "talk"};
  const c = utNext();
  if (c) return {k: "utage", t: `会員サイト「${c.next.name}」を見る`, s: `${c.name}・${c.percent}%`, url: c.url};
  const qs = weekQuests(d), ws = weekStart(d.today), q = qs.find(y => store("quest-" + ws + "-" + y.id) !== "1");
  if (q) return {k: "quest", t: q.title, s: "今週のひとりクエスト。見つけて予定に入れるだけのものもあります", tab: "quest"};
  return m ? {k: "more", t: "今日の分はクリア！もう1回練習する", s: m.title, fn: () => openKz(m.id)} : {k: "more", t: "今日の分はクリア！", s: "練習のタブで、好きな練習をどうぞ", tab: "kz"};
}
function heroHtml(d){
  const x = todayOne(d), t = new Date(d.today + "T12:00:00");
  return `<section class="oneday" aria-label="今日の1つ"><span class="k">今日の1つ・${t.getMonth() + 1}/${t.getDate()}（${WD[t.getDay()]}）</span>
    <b>${esc(x.t)}</b>${x.s ? `<span class="s">${esc(x.s)}</span>` : ""}
    <button class="hero-go" type="button" id="heroGo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/></svg>はじめる</button></section>`;
}
function chipsHtml(d){
  const it = engItems(d), n = it.length, done = n - engLeft(it), run = runOf(studySet(d), dayKey(Date.now()));
  return `<div class="hchips">
    <button type="button" data-my="streak"><b class="num">🔥 ${run}</b><span>連続日数</span></button>
    <button type="button" data-hgo="#today"><b class="num">${done}/${n}</b><span>今日やること</span></button>
    <button type="button" data-my="points"><b class="num">${fmt(d.pts.week)}</b><span>今週pt</span></button></div>`;
}
function goalBarHtml(d){
  const ym = d.today.slice(0, 7), m = +ym.slice(5), g = goalGet(ym);
  if (!g) return `<button type="button" class="hgoal empty" data-my="goal"><span class="k">${m}月の目標</span><b>今月の目標を決める</b><em aria-hidden="true">›</em></button>`;
  const M = GOAL_M.find(z => z[0] === g.metric) || GOAL_M[0], now = goalNow(d, g, ym), pct = Math.min(100, Math.round(100 * now / g.target));
  return `<button type="button" class="hgoal" data-my="goal"><span class="k">${m}月の目標</span><b>${esc(g.text || M[1] + " " + g.target + M[2])}</b>
    <span class="hg-v num">${fmt(now)}/${fmt(g.target)}${M[2]}</span><i class="hg-bar"><i style="width:${pct}%"></i></i></button>`;
}
// 今日やること（1本）：今月の目標・英語の練習・単語集・Discord のミッション・クエスト・1週間ガイドを engItems から。
// 3件まで（まだのものから）。「すべて見る」で全部。Discord のミッションは押すとその場で開く（Discordで開く・書き方・チェック）
let TODAYALL = false, TODAYOPEN = null;
function todayHtml(d){
  const it = engItems(d); ENG = it;
  if (!it.length) return "";
  const order = it.map((x, i) => [x, i]).sort((a, b) => a[0].done - b[0].done), show = TODAYALL ? order : order.slice(0, 3), left = engLeft(it);
  const row = ([x, i]) => {
    const t = x.todo && d.todos.find(y => y.k === x.todo), open = t && TODAYOPEN === x.todo;
    return `<li class="${x.done ? "ok" : "due"}${open ? " open" : ""}"><button type="button" class="tdr" data-tdi="${i}" ${t ? `aria-expanded="${!!open}"` : ""}><i aria-hidden="true">${x.done ? "✓" : ""}</i><span><b>${esc(x.t)}</b>${x.s ? `<small>${esc(x.s)}</small>` : ""}</span><em aria-hidden="true">${t ? (open ? "▴" : "▾") : "›"}</em></button>
      ${open ? `<div class="tdx"><p>${esc(t.why)}</p><div class="acts"><a class="btn sm2" href="${esc(t.link)}" target="_blank" rel="noopener">${ICON.ext}${esc(t.btn)}</a>
        ${t.tpl ? `<button class="btn ghost sm2" type="button" data-copy="${esc(t.tpl)}">書き方をコピー</button>` : ""}
        <button class="btn ghost sm2" type="button" data-did="${t.k}" aria-pressed="${x.done}">${x.done ? "やった！（取り消す）" : "やったらチェック"}</button></div>
        ${t.tpl ? `<div class="tpl">${esc(t.tpl)}</div>` : ""}</div>` : ""}</li>`;
  };
  return `<section class="today${left ? "" : " clear"}" id="today" aria-label="今日やること"><div class="td-h"><h2>今日やること</h2><span class="num">${it.length - left}/${it.length}</span>
      ${it.length > 3 ? `<button type="button" class="more" id="tdAll" aria-expanded="${TODAYALL}">${TODAYALL ? "たたむ" : `すべて見る（${it.length}）`}</button>` : ""}</div>
    <ul class="tdl">${show.map(row).join("")}</ul></section>`;
}
function nextClassHtml(d){
  const up = (d.schedule || []).filter(e => sdt(e.end) >= new Date()); if (!up.length) return "";
  const n = up[0], s = sdt(n.start), e = sdt(n.end);
  return `<button type="button" class="hnext" data-my="sched"><i aria-hidden="true">📅</i><span>次の講座 <b class="num">${sday(s)} ${hm(s)}</b> ${esc(n.title)}</span><em>${untilText(s, e)}</em></button>`;
}
// ホームに並べる部品（上から順）。新しいカードはここに足さない（README「ホームに足さないルール」）
const HOME_CARDS = [heroHtml, chipsHtml, goalBarHtml, todayHtml, nextClassHtml];
function renderMe(d){
  ME = d; PH = d.photos;
  renderMy();                                   // 目標・ガイドなどはマイにあるので、いっしょに描き直す
  engRefresh();                                 // ホームを描く・ベルとタブの数字（paintHome）
}
// ホームだけ描き直す（数字が変わったとき・engRefresh から）
function paintHome(){
  if (!ME) return;
  const root = $("me");
  root.innerHTML = HOME_CARDS.map(f => f(ME)).join("\n");
  bindCards(root);
  $("heroGo").addEventListener("click", () => engGo(todayOne(ME)));
  root.querySelectorAll("[data-hgo]").forEach(b => b.addEventListener("click", () => { const el = document.querySelector(b.dataset.hgo); el && el.scrollIntoView({behavior: reduce ? "auto" : "smooth", block: "start"}); }));
  root.querySelectorAll("[data-tdi]").forEach(b => b.addEventListener("click", () => {
    const x = ENG[+b.dataset.tdi]; if (!x) return;
    if (x.todo){ TODAYOPEN = TODAYOPEN === x.todo ? null : x.todo; paintHome(); return; }
    engGo(x);
  }));
  if ($("tdAll")) $("tdAll").addEventListener("click", () => { TODAYALL = !TODAYALL; paintHome(); });
}
// ホームとマイの部品に共通のボタン（チェック・アルバムのしぼりこみ・PHOTOカード・目標・ガイド・マイの中の画面へ）
function bindCards(root){
  bindCommon(root);
  if (root.querySelector("#goal")) bindGoal();
  if (root.querySelector("#obCard")) bindOb();
  root.querySelectorAll("[data-my]").forEach(b => b.addEventListener("click", () => myGo(b.dataset.my)));
  root.querySelectorAll("[data-did]").forEach(b => b.addEventListener("click", () => {
    const k = "did-" + ME.today + "-" + b.dataset.did, on = store(k) === "1";
    store(k, on ? null : "1");
    engRefresh();                                                             // 今日やること・ステータス・ベルの数字をまとめて
  }));
  root.querySelectorAll("[data-af]").forEach(b => b.addEventListener("click", () => {
    AFILTER = b.dataset.af;
    root.querySelectorAll("[data-af]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    $("albumGrid").innerHTML = albumHtml(ME);
  }));
  const play = root.querySelector("#play");
  if (play) play.addEventListener("click", () => {
    const cells = root.querySelectorAll("#cards .cell[data-cell]");
    if (reduce) return;
    cells.forEach(c => c.style.visibility = "hidden");
    cells.forEach((c, i) => setTimeout(() => { c.style.visibility = ""; c.classList.remove("pop"); void c.offsetWidth; c.classList.add("pop"); }, 160 * (i + 1)));
  });
}
/* ---------- 講座スケジュール（次の講座・今月の講座・iPhoneのカレンダーに追加） ---------- */
const WD = "日月火水木金土";
const sdt = iso => new Date(iso);
const hm = t => String(t.getHours()).padStart(2, "0") + ":" + String(t.getMinutes()).padStart(2, "0");
const sday = t => `${t.getMonth() + 1}/${t.getDate()}（${WD[t.getDay()]}）`;
function untilText(s, e){
  const now = new Date();
  if (now >= s && now <= e) return "いま開催中";
  const d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()), d1 = new Date(s.getFullYear(), s.getMonth(), s.getDate());
  const days = Math.round((d1 - d0) / 864e5);
  if (days === 0){ const m = Math.round((s - now) / 6e4); return m < 60 ? `あと${m}分` : `今日 ${hm(s)}から`; }
  return days === 1 ? `明日 ${hm(s)}から` : `あと${days}日`;
}
function icsFor(ev){
  const z = t => t.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const s = sdt(ev.start), e = sdt(ev.end), esc2 = x => String(x || "").replace(/[\\,;]/g, m => "\\" + m).replace(/\n/g, "\\n");
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Cheers mate//Cheers GO//JA", "BEGIN:VEVENT", `UID:${z(s)}-${encodeURIComponent(ev.title).slice(0, 40)}@cheers-go`, `DTSTAMP:${z(new Date())}`,
    `DTSTART:${z(s)}`, `DTEND:${z(e)}`, `SUMMARY:${esc2(ev.title)}`, ev.url ? `URL:${ev.url}` : "", ev.url ? `DESCRIPTION:${esc2("参加リンク：" + ev.url)}` : "",
    "BEGIN:VALARM", "TRIGGER:-PT30M", "ACTION:DISPLAY", "DESCRIPTION:まもなく講座です", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].filter(Boolean).join("\r\n");
}
// Googleカレンダーに追加（予定の作成画面を開く。保存は本人が押す）
function gcal(ev){
  const z = t => t.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const q = new URLSearchParams({action: "TEMPLATE", text: ev.title, dates: z(sdt(ev.start)) + "/" + z(sdt(ev.end)), ctz: "Asia/Tokyo",
    details: (ev.url ? "参加リンク：" + ev.url + "\n" : "") + "チアーズメイトの講座", location: ev.url || ev.where || ""});
  return "https://calendar.google.com/calendar/render?" + q.toString();
}
function schedHtml(evs){
  const now = new Date(), up = evs.filter(e => sdt(e.end) >= now);
  if (!up.length) return "";
  const n = up[0], s = sdt(n.start), e = sdt(n.end), ym = now.getFullYear() * 12 + now.getMonth();
  const month = up.filter(x => { const t = sdt(x.start); return t.getFullYear() * 12 + t.getMonth() === ym; });
  return `<section class="sched"><div class="sec-h"><h2>${SPARK}講座スケジュール</h2></div>
    <div class="nextcls"><span class="k">次の講座</span><b>${esc(n.title)}</b><span class="when">${sday(s)} ${hm(s)}〜${hm(e)}</span><span class="cd num">${untilText(s, e)}</span>
      <div class="acts">${n.url ? `<a class="btn" href="${esc(n.url)}" target="_blank" rel="noopener">${ICON.ext}参加する</a>` : `<span class="mapnote" style="margin:0">参加リンクは後日ここに出ます</span>`}
        <a class="btn ghost" href="${esc(gcal(n))}" target="_blank" rel="noopener">📅 Googleカレンダーに追加</a></div></div>
    ${month.length > 1 || (month.length && month[0] !== n) ? `<h3 class="spot-h">今月の講座</h3><ul class="clslist">${month.map(x => { const t = sdt(x.start); return `<li><span class="num">${sday(t)}</span><b>${esc(x.title)}</b><span class="num">${hm(t)}〜${hm(sdt(x.end))}</span><a class="btn ghost sm2" href="${esc(gcal(x))}" target="_blank" rel="noopener" aria-label="Googleカレンダーに追加">📅</a></li>`; }).join("")}</ul>` : ""}
  </section>`;
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-ics]"); if (!b || !ME) return;
  const ev = (ME.schedule || []).filter(x => sdt(x.end) >= new Date())[+b.dataset.ics]; if (!ev) return;
  const a = document.createElement("a");
  a.href = "data:text/calendar;charset=utf-8," + encodeURIComponent(icsFor(ev)); a.download = "cheersmate-class.ics"; document.body.appendChild(a); a.click(); a.remove();
});
function bindCommon(root){
  root.querySelectorAll("[data-copy]").forEach(b => b.addEventListener("click", () => copyText(b.dataset.copy, b)));
  root.querySelectorAll("[data-kz]").forEach(b => b.addEventListener("click", () => openKz(b.dataset.kz)));
  root.querySelectorAll("[data-tab]").forEach(b => b.addEventListener("click", () => {
    if (b.hasAttribute("data-utgo")){ showTab("kz", "kz"); const u = $("utage"); if (u) setTimeout(() => u.scrollIntoView({behavior: reduce ? "auto" : "smooth", block: "start"}), 60); return; }   // 練習＞会員サイト講座
    showTab(b.dataset.tab); window.scrollTo({top: 0, behavior: reduce ? "auto" : "smooth"}); }));
  root.querySelectorAll("[data-kzv]").forEach(b => b.addEventListener("click", () => { hush(); KZ = b.dataset.kzv; WDQ = null; showTab("kz"); window.scrollTo(0, 0); }));
}

/* ================= オーダーメイド教材 ================= */
/* 本人が話したいことを、本人のレベルの正しい英語に。フォームに入れて「教材を作る」を押すと、中継（/api/kz-lesson）がその場で作り、この端末（kz-mine）に残す。
   お手本の音声がない教材は端末の読み上げ（speechSynthesis）で流す。練習：聞く（お手本の読み上げ）→ シャドーイング → スピード（155語/分）→ 2秒応答 → 表現 */
const KZ_GOAL_WPM = 155, KZ_REPLY_SEC = 2;
let KZ = null, KZSTEP = "read", KZRATE = +(store("kz-rate") || 1) || 1, KZ_SPEAK = 0;
const KZKIND = {speaking: "スピーキング", listening: "リスニング"};
const kzLog = () => { try { return JSON.parse(store("kz-log") || "[]"); } catch (e) { return []; } };
function kzSave(entry){ const l = kzLog(); l.push({...entry, t: Date.now()}); store("kz-log", JSON.stringify(l.slice(-300))); }
const kzBest = id => kzLog().filter(x => x.id === id && x.wpm).reduce((m, x) => Math.max(m, x.wpm), 0);
const kzSec = m => Math.round((m.words || 0) / KZ_GOAL_WPM * 60);
const kzList = () => [...kzMine(), ...((ME && ME.kyozai) || [])];     // 会話の録音から作った教材（この端末）を先に

/* ---------- 音声：Grok TTS で作ったお手本（AUD）。ない教材だけ端末の読み上げで代わりに ---------- */
let VOICE = null;
function pickVoice(){
  if (!("speechSynthesis" in window)) return null;
  const vs = speechSynthesis.getVoices().filter(v => /^en(-|_)/i.test(v.lang));
  const pref = ["Samantha", "Google US English", "Ava", "Allison", "Karen", "Daniel", "Microsoft Aria", "Microsoft Jenny"];
  VOICE = pref.map(n => vs.find(v => v.name.includes(n))).find(Boolean) || vs.find(v => /en-US/i.test(v.lang)) || vs[0] || null;
  return VOICE;
}
if ("speechSynthesis" in window){ pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function say(text, rate){
  return new Promise(res => {
    if (!("speechSynthesis" in window)) return res();
    const u = new SpeechSynthesisUtterance(text);
    if (VOICE || pickVoice()) u.voice = VOICE;
    u.lang = (VOICE && VOICE.lang) || "en-US"; u.rate = rate || KZRATE;
    u.onend = u.onerror = () => res();
    speechSynthesis.speak(u);
  });
}
const KA = new Audio(); KA.preload = "none"; KA.autoplay = false;
// 音は再生ボタンを押したときだけ。画面を離れた・アプリを閉じた・別の画面に切りかえたときは止める
document.addEventListener("visibilitychange", () => { if (document.hidden){ quiet(); drillStop(false); talkEnd(false); } });
window.addEventListener("pagehide", () => { quiet(); drillStop(false); talkEnd(false); });
function hush(){ KZ_SPEAK++; JUMP = 0; KA.pause(); if ("speechSynthesis" in window) speechSynthesis.cancel(); if (typeof pbHide === "function") pbHide(true); }
function quiet(){ hush(); if (typeof rxStop === "function") rxStop(); }       // 画面を離れるとき：音もマイクも止める
const wait = ms => new Promise(r => setTimeout(r, ms));
const waitRun = async (ms, run) => { const t = Date.now(); while (Date.now() - t < ms){ if (run !== KZ_SPEAK) return false; await wait(Math.min(80, ms)); } return run === KZ_SPEAK; };
const hasAud = h => !!(h && AUD[h]);
// 1本の音声を、from〜to 秒だけ再生する。onTime(秒) で再生中の位置を知らせる（-1 で終わり）
// o.seq：続けて流すうちの1本。再生バーの±15秒が、この1本からはみ出したら {jump: はみ出した秒数} で返す（前後の段落へまたぐ）
let JUMP = 0;                                   // 再生バーから頼まれた移動（秒）
function playAud(h, o = {}){
  const a = AUD[h];
  if (!a) return Promise.resolve(false);
  const run = KZ_SPEAK;
  PB.label = o.label || PB.label || "お手本の音声"; PB.seq = o.seqInfo || "";
  return new Promise(res => {
    if (KA.dataset.h !== h){ KA.src = a.src; KA.dataset.h = h; KA.load(); }      // 押したときだけ読みこむ（preload=none）
    KA.playbackRate = o.rate || KZRATE; KA.preservesPitch = KA.webkitPreservesPitch = true;
    let raf = 0, over = false;
    const done = v => { if (over) return; over = true; cancelAnimationFrame(raf); KA.onended = null; if (run === KZ_SPEAK) KA.pause(); o.onTime && o.onTime(-1); res(run === KZ_SPEAK ? v : false); };
    const tick = () => {
      if (run !== KZ_SPEAK) return done(false);
      if (JUMP){
        const d = JUMP; JUMP = 0;
        const dur = isFinite(KA.duration) ? KA.duration : a.dur, end = o.to != null ? o.to : dur, start = o.from || 0, tgt = KA.currentTime + d;
        if (o.seq && tgt >= end) return done({jump: tgt - end});
        if (o.seq && tgt < start) return done({jump: tgt - start});
        KA.currentTime = Math.max(start, Math.min(end - 0.05, tgt));
      }
      const t = KA.currentTime; o.onTime && o.onTime(t); pbTick();
      if (o.to != null && t >= o.to) return done(true);
      raf = requestAnimationFrame(tick);
    };
    KA.onended = () => done(true);
    const go = () => { try { KA.currentTime = o.from || 0; } catch (e) {} KA.play().then(() => { raf = requestAnimationFrame(tick); }).catch(() => done(false)); };
    if (KA.readyState >= 1) go(); else KA.addEventListener("loadedmetadata", go, {once: true});
  });
}
// 続けて流す（段落の通し再生・会話の通し再生など）。再生バーの±15秒で前後の段落へまたげる
// items: [{h, text, label, el}]、hooks: {start(i), time(i, t), gap(ミリ秒), after(i)}
async function playSeq(items, hooks = {}){
  const run = KZ_SPEAK; let i = 0, from = 0;
  while (i < items.length){
    if (run !== KZ_SPEAK) return false;
    const it = items[i];
    hooks.start && hooks.start(i);
    let r;
    if (hasAud(it.h)) r = await playAud(it.h, {from, seq: true, label: it.label || it.text, seqInfo: items.length > 1 ? `${i + 1} / ${items.length}` : "", onTime: t => hooks.time && hooks.time(i, t)});
    else { await say(it.text); r = true; }
    if (r === false || run !== KZ_SPEAK) return false;
    if (r && r.jump != null){
      if (r.jump >= 0){ i++; from = Math.min(r.jump, ((AUD[(items[i] || {}).h] || {}).dur || 0) - 0.1); if (from < 0) from = 0; }
      else { i = Math.max(0, i - 1); const d = (AUD[(items[i] || {}).h] || {}).dur || 0; from = Math.max(0, d + r.jump); }
      continue;
    }
    hooks.after && hooks.after(i);
    i++; from = 0;
    if (i < items.length && !(await waitRun(hooks.gap || 400, run))) return false;
  }
  return run === KZ_SPEAK;
}

/* ---------- 再生バー：英語の音声が流れたら、画面の下にすぐ出る（止める・±15秒・位置・速さ・閉じる） ---------- */
const PB = {el: null, label: "", seq: "", hideT: 0};
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const spLabel = r => (r % 1 ? String(r) : r.toFixed(1)) + "×";
const fmtT = t => !isFinite(t) || t < 0 ? "0:00" : Math.floor(t / 60) + ":" + String(Math.floor(t % 60)).padStart(2, "0");
function setRate(r){
  KZRATE = r; store("kz-rate", String(r)); KA.playbackRate = r;
  document.querySelectorAll("[data-rate]").forEach(y => y.setAttribute("aria-pressed", String(+y.dataset.rate === r)));
  document.querySelectorAll("select.kzspeed").forEach(sel => sel.value = String(r));
  pbTick();
}
function pbBuild(){
  if (PB.el) return PB.el;
  const el = document.createElement("div");
  el.className = "pbar"; el.id = "pbar"; el.hidden = true; el.setAttribute("role", "region"); el.setAttribute("aria-label", "音声の操作");
  el.innerHTML = `<div class="pb-top"><span class="pb-l" id="pbL"></span><span class="pb-s num" id="pbS"></span><button type="button" class="pb-x" id="pbX" aria-label="閉じる（止める）">×</button></div>
    <div class="pb-seek"><span class="num" id="pbT">0:00</span><input type="range" id="pbR" min="0" max="100" step="0.1" value="0" aria-label="再生の位置"><span class="num" id="pbD">0:00</span></div>
    <div class="pb-ctl"><button type="button" class="pb-b" id="pbB" aria-label="15秒戻る"><svg viewBox="0 0 24 24"><path d="M11 5 5 9.5 11 14V5z"/><path d="M12 7.5a6.5 6.5 0 1 1-5.6 9.8"/></svg><em>15</em></button>
      <button type="button" class="pb-p" id="pbP" aria-label="一時停止"><svg viewBox="0 0 24 24" id="pbI"></svg></button>
      <button type="button" class="pb-b" id="pbF" aria-label="15秒進む"><svg viewBox="0 0 24 24"><path d="M13 5l6 4.5L13 14V5z"/><path d="M12 7.5a6.5 6.5 0 1 0 5.6 9.8"/></svg><em>15</em></button>
      <select class="kzspeed pb-sp" id="pbV" aria-label="再生の速さ">${SPEEDS.map(r => `<option value="${r}">${spLabel(r)}</option>`).join("")}</select></div>`;
  document.body.appendChild(el);
  const $$ = id => el.querySelector("#" + id);
  $$("pbP").addEventListener("click", () => { if (KA.paused) KA.play().catch(() => {}); else KA.pause(); pbTick(); });
  $$("pbB").addEventListener("click", () => { JUMP -= 15; if (KA.paused) pbNudge(); });
  $$("pbF").addEventListener("click", () => { JUMP += 15; if (KA.paused) pbNudge(); });
  $$("pbX").addEventListener("click", () => { hush(); pbHide(true); });
  $$("pbV").addEventListener("change", e => setRate(+e.target.value));
  const r = $$("pbR");
  r.addEventListener("input", () => { if (isFinite(KA.duration)) { KA.currentTime = +r.value; pbTick(); } });
  if ("mediaSession" in navigator){                                   // iPhone のロック画面・コントロールセンターからも操作
    const ms = navigator.mediaSession;
    try {
      ms.setActionHandler("play", () => KA.play().catch(() => {}));
      ms.setActionHandler("pause", () => KA.pause());
      ms.setActionHandler("seekbackward", () => { JUMP -= 15; });
      ms.setActionHandler("seekforward", () => { JUMP += 15; });
      ms.setActionHandler("stop", () => { hush(); pbHide(true); });
    } catch (e) {}
  }
  return (PB.el = el);
}
function pbNudge(){ KA.play().then(() => setTimeout(() => KA.pause(), 60)).catch(() => {}); }   // 止めたまま±15秒：一瞬だけ進めて位置を反映
function pbShow(){ const el = pbBuild(); clearTimeout(PB.hideT); el.hidden = false; document.body.classList.add("pbon");
  if ("mediaSession" in navigator && window.MediaMetadata){ try { navigator.mediaSession.metadata = new MediaMetadata({title: PB.label.slice(0, 80), artist: "チアーズGO!", album: "オーダーメイド教材"}); } catch (e) {} } }
function pbHide(now){ if (!PB.el) return; clearTimeout(PB.hideT); const f = () => { PB.el.hidden = true; document.body.classList.remove("pbon"); }; if (now) f(); else PB.hideT = setTimeout(() => { if (KA.paused && KA.ended) f(); }, 4000); }
function pbTick(){
  if (!PB.el || PB.el.hidden) return;
  const el = PB.el, d = isFinite(KA.duration) ? KA.duration : 0, t = KA.currentTime || 0;
  el.querySelector("#pbL").textContent = PB.label;
  el.querySelector("#pbS").textContent = PB.seq;
  el.querySelector("#pbT").textContent = fmtT(t); el.querySelector("#pbD").textContent = fmtT(d);
  const r = el.querySelector("#pbR"); r.max = String(d || 1); if (document.activeElement !== r) r.value = String(t);
  el.querySelector("#pbI").innerHTML = KA.paused ? '<path d="M8 5v14l11-7z" fill="currentColor"/>' : '<rect x="6.5" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1" fill="currentColor"/>';
  el.querySelector("#pbP").setAttribute("aria-label", KA.paused ? "再生" : "一時停止");
  el.querySelector("#pbV").value = String(KA.playbackRate || KZRATE);
  if ("mediaSession" in navigator) try { navigator.mediaSession.playbackState = KA.paused ? "paused" : "playing"; } catch (e) {}
}
KA.addEventListener("play", () => { pbShow(); pbTick(); });
KA.addEventListener("pause", pbTick);
KA.addEventListener("ratechange", pbTick);
KA.addEventListener("ended", () => pbHide(false));
// 音声があればそれ、なければ端末の読み上げ
const speak = (text, h, o = {}) => hasAud(h) ? playAud(h, {label: text, ...o}) : say(text, o.rate);
// 単語に分けた英文（再生中の単語を光らせる）
const wordSpans = t => t.split(/\s+/).filter(Boolean).map((w, i) => `<span class="wd" data-k="${i}">${esc(w)}</span>`).join(" ");
function lightWords(box, h, t){
  const a = AUD[h], spans = box ? box.querySelectorAll(".wd") : [];
  spans.forEach(s => s.classList.remove("on"));
  if (!a || t < 0 || !spans.length || !a.w.length) return;
  let j = -1; for (let i = 0; i < a.w.length; i++){ if (a.w[i][0] <= t + 0.03) j = i; else break; }
  if (j < 0) return;
  const k = a.w.length === spans.length ? j : Math.round(j * (spans.length - 1) / Math.max(1, a.w.length - 1));
  for (let i = 0; i <= k && i < spans.length; i++) spans[i].classList.add(i === k ? "on" : "did");
}
// 段落の音声を、文ごとの区間に分ける（シャドーイング用）
function sentSegs(h, en){
  const a = AUD[h], sents = kzSents(en);
  if (!a || !a.w.length) return sents.map(s => ({s}));
  const segs = []; let cur = [];
  a.w.forEach((w, i) => { cur.push(w); if (/[.!?]["’”)]*$/.test(w[2]) || i === a.w.length - 1){ segs.push(cur); cur = []; } });
  return segs.map((g, i) => ({s: segs.length === sents.length ? sents[i] : g.map(x => x[2]).join(" "), from: Math.max(0, g[0][0] - 0.08), to: g[g.length - 1][1] + 0.12}));
}

const kzSents = t => (t.match(/[^.!?]+[.!?]+["’”)]*\s*|[^.!?]+$/g) || [t]).map(x => x.trim()).filter(Boolean);
const kzPara = m => m.paras || [];
const kzEn = m => kzPara(m).map(p => p.en).join(" ");
const orderHtml = t => (t.match(/[^。？！?!]+[。？！?!]*/g) || [t]).map(x => `<span class="os">${esc(x.trim().replace(/[／\s]+(?=[。、，？！?!,.])/g, "").replace(/^[／\s]+|[／\s]+$/g, "")).replace(/／/g, '<i class="sl">／</i>')}</span>`).join("");
const exHtml = t => esc(t).replace(/（例：(.+?)）/g, '<span class="ex">（例：<b>$1</b>）</span>');

/* ---------- 一覧 ---------- */
function kzCard(m){
  const best = kzBest(m.id), n = kzLog().filter(x => x.id === m.id).length;
  const badge = m.cheers ? `<span class="kb cheers">${flagOf(m.cheers)} 乾杯フレーズ</span>` : `<span class="kb ${m.kind}">${KZKIND[m.kind] || "スピーキング"}</span>`
    + (m.partner ? `<span class="kb lv">${flagOf(m.partner.acc)} ${esc(m.partner.label || "")}・${esc(m.partner.gender || "")}${m.partner.strength === "strong" ? "・なまり強め" : ""}</span>` : "");
  const g = (m.grammar || []).length;
  return `<li class="kzc${m.source === "リクエスト" || isMine(m) ? " req" : ""}">
    <div class="kzc-h">${badge}<span class="kb lv">${esc(m.level || "英検準2級")}</span>${m.source === "リクエスト" ? '<span class="kb mine">あなた専用</span>' : ""}${isMine(m) ? `<span class="kb mine">${m.source === "オーダーメイド" ? "✨ あなた専用" : "🎙 会話から"}・${esc(md(m.made || dayKey(Date.now())))}</span>` : ""}</div>
    <h3>${esc(m.title)}</h3><p>${esc(m.scene || "")}</p>
    <div class="kzc-f"><span class="num">${m.words}語・約${kzSec(m)}秒</span><span>${m.lines ? `会話${m.lines.length}行・設問${(m.questions || []).length}` : `${kzPara(m).length}段落・文法${g}`}</span>${best ? `<span class="num">ベスト ${best}語/分${best >= KZ_GOAL_WPM ? " ✓" : ""}</span>` : ""}${n ? `<span>練習 ${n}回</span>` : ""}</div>
    <button class="btn" type="button" data-kz="${esc(m.id)}">練習する</button></li>`;
}
let SAMPLES = null;
const loadSamples = () => SAMPLES ? Promise.resolve(SAMPLES) : fetch("data/samples.json", {cache: "no-cache"}).then(r => r.json()).then(x => {
  SAMPLES = x; [...x.levels.flatMap(l => [l.speak, l.listen]), ...x.partner_samples, ...x.voices].forEach(a => { if (a.src) AUD["s:" + a.src] = a; }); return x;
}).catch(() => (SAMPLES = {levels: [], partners: {}, partner_samples: [], voices: []}));
const sAud = a => a && "s:" + a.src;
const KZREQ = () => { try { return {kind: "スピーキング", level: "英検準2級", ...JSON.parse(store("kz-reqform") || "{}")}; } catch (e) { return {}; } };
const saveReq = r => store("kz-reqform", JSON.stringify(r));
const STRL = {clear: "きれいな発音", strong: "なまり強め"};
const KZSCENES = ["会議", "商談・お客様とのやりとり", "ミートアップ・雑談", "自己紹介", "乾杯・旅先", "面接", "その他"];
/* ---------- 練習のセグメント：教材｜会話｜単語集｜記録 ---------- */
const KZSEGS = [["kz", "教材"], ["talk", "会話"], ["words", "単語集"], ["records", "記録"]];
const kzSegOf = () => KZ === "words" ? "words" : KZ === "records" ? "records" : ["conv", "talk", "drill", "coach"].includes(KZ) ? "talk" : "kz";
function kzSegSet(seg){
  if (seg === kzSegOf() && !(seg === "kz" && KZ)) return;
  quiet(); drillStop(false); talkEnd(false); wdBarHide();
  KZ = {kz: null, talk: "conv", words: "words", records: "records", drill: "drill"}[seg] ?? null; WDQ = null;
}
$("kzSeg").addEventListener("click", e => { const b = e.target.closest("[data-ks]"); if (!b) return; kzSegSet(b.dataset.ks); renderKz(); window.scrollTo(0, 0); });
// 教材を1つ選んで、そのステップから（クイック練習のタイル）
function kzQuick(kind){
  const L = kzList(), m = kind === "listen" ? L.find(x => (x.lines || []).length) : L.find(x => (x.qa || []).length);
  if (!m){ toast(kind === "listen" ? "リスニングの教材ができると使えます。下の「教材を作る」からどうぞ" : "教材ができると使えます"); return; }
  KZ = m; KZSTEP = kind === "listen" ? "listen" : "reply"; hush(); renderKz(); window.scrollTo(0, 0);
}
// 続きから：最後に練習した教材（まだなら1本目）
function kzLast(){ const L = kzList(), l = kzLog(); for (let i = l.length - 1; i >= 0; i--){ const m = L.find(x => x.id === l[i].id); if (m) return m; } return L[0] || null; }
function kzGoalHtml(){
  const log = kzLog(), ws = ME ? weekStart(ME.today) : "";
  const week = log.filter(x => ws && new Date(x.t) >= new Date(ws + "T00:00:00")).length, best = log.reduce((m, x) => Math.max(m, x.wpm || 0), 0);
  return `<div class="kzgoal">
      <div><span class="k">話す速さの目標</span><b class="num">${KZ_GOAL_WPM}<small>語/分</small></b><span>あなたのベスト ${best ? `<b class="num">${best}</b>語/分` : "まだ"}</span></div>
      <div><span class="k">返事の速さの目標</span><b class="num">${KZ_REPLY_SEC}<small>秒以内</small></b><span>${(() => { const r = reactLog().filter(x => x.ms != null).slice(-10); return r.length ? `最近10回の平均 <b class="num">${(r.reduce((s, x) => s + x.ms, 0) / r.length / 1000).toFixed(1)}</b>秒` : "2秒応答ドリルで練習"; })()}</span></div>
      <div><span class="k">今週の練習</span><b class="num">${week}<small>回</small></b><span>1日1回、30秒から</span></div>
    </div>`;
}
function renderKz(){
  const box = $("kzwrap");
  segBar($("kzSeg"), KZSEGS, kzSegOf(), "data-ks");
  if (KZ === "conv"){ renderConv(); return; }
  if (KZ === "drill"){ renderDrill(); return; }
  if (KZ === "talk"){ renderTalk(); return; }
  if (prView()) return;                                             // 練習タブのタイル（会話を録音・英語日記）の画面
  if (KZ === "records"){ renderRecords(); return; }
  if (KZ === "words"){ renderWords(); return; }
  if (KZ === "kb"){ KZ = null; botOpen(); renderKz(); return; }     // 前の版の「MATCHA BOT」の画面は、右下の質問BOTに
  if (KZ === "coach"){ if (apiOn()) renderCoach(); else { KZ = "conv"; renderKz(); } return; }
  if (KZ){ renderPlayer(); return; }
  const list = kzList(), last = kzLast(), lastN = last ? kzLog().filter(x => x.id === last.id).length : 0;
  box.innerHTML = `${last ? `<button type="button" class="kzcont" data-kz="${esc(last.id)}"><span class="k">${lastN ? "続きから" : "まずはこの教材から"}</span><b>${esc(last.title)}</b><span>${lastN ? `練習 ${lastN}回・` : ""}${last.lines ? `会話${last.lines.length}行` : `${kzPara(last).length}段落`}・約${kzSec(last)}秒</span></button>` : ""}
    <h3 class="spot-h">クイック練習</h3>
    <div class="qtiles">
      <button type="button" class="qtile" data-kq="listen"><b>🎧 リスニング</b><span>教材の会話を聞く</span></button>
      <button type="button" class="qtile" data-kq="reply"><b>⚡ 2秒応答</b><span>質問にすぐ答える</span></button>
      <button type="button" class="qtile" data-ks2="talk"><b>🗣️ AIと会話</b><span>場面を選んで話す</span></button>
      <button type="button" class="qtile" data-ks2="drill"><b>😊 1分感情スピーチ</b><span>毎日の筋トレ</span></button>
      ${prTilesHtml()}
    </div>
    <div class="sec-h"><h2>${SPARK}オーダーメイド教材</h2><p>あなたが話したいことを、あなたのレベルの正しい英語に。英語の語順に並べた日本語を見ながら話すので、日本語から英語に組み立て直さずに口に出せます。</p></div>
    ${list.length ? `<ul class="kzlist">${list.map(kzCard).join("")}</ul>` : `<div class="note">まだ教材がありません。下の「教材を作る」に話したいことを入れると、その場であなた専用の教材ができます。</div>`}
    <section class="kzreq panel" id="kzreq"><h3>✨ 教材を作る</h3><div id="kzReqBody"><p class="mapnote">読み込んでいます…</p></div></section>
    ${utageHtml()}
    <details class="panel kzvoices" id="kzVoices"><summary>お手本の声を聴き比べる（ベータ）</summary><div id="kzVoiceList"></div></details>
    <p class="qnote">オーダーメイド教材は、あなたが書いた話したいことから AI がその場で作ります（ベータ版）。作った教材と練習の記録はこの端末に残ります。</p>`;
  bindCommon(box);
  box.querySelectorAll("[data-kq]").forEach(b => b.addEventListener("click", () => kzQuick(b.dataset.kq)));
  box.querySelectorAll("[data-ks2]").forEach(b => b.addEventListener("click", () => { kzSegSet("talk"); hush(); KZ = b.dataset.ks2; renderKz(); window.scrollTo(0, 0); }));
  loadSamples().then(() => { renderReqForm(); renderVoiceList(); });
}
// 会話のセグメント：AIと会話・1分感情スピーチ・2秒応答・AIコーチ・質問BOT
function renderConv(){
  const box = $("kzwrap"), dr = drillStats();
  box.innerHTML = `<div class="sec-h"><h2>${SPARK}会話の練習</h2><p>声に出す練習。1日1回、どれか1つでOKです。</p></div>
    <button type="button" class="drillcard" id="kzDrill"><span class="k">毎日の筋トレ・1分</span><b>感情スピーキング</b><span>語順の日本語を音読 → イメージ → 英語で話す</span>
      <span class="dc-n"><b class="num">${dr.today}</b><small>今日の回数</small></span><span class="dc-s">${dr.streak ? `${dr.streak}日連続` : "今日から始める"}</span></button>
    <button type="button" class="talkcard wdcard" data-kq="reply"><span class="k">2秒応答</span><b>質問に2秒以内で答える</b><span>教材の質問が読み上げられたら、すぐに声で答えます。返事の速さを記録します</span></button>
    ${talkEntry()}`;
  bindCommon(box);
  $("kzDrill").addEventListener("click", () => { hush(); KZ = "drill"; renderKz(); window.scrollTo(0, 0); });
  box.querySelectorAll("[data-kq]").forEach(b => b.addEventListener("click", () => kzQuick(b.dataset.kq)));
  bindTalkEntry(box);
}
function renderVoiceList(){
  const el = $("kzVoiceList"); if (!el) return;
  el.innerHTML = `<p class="mapnote">同じ英文を6つの声で読んでいます。気に入った声があれば運営に教えてください（教材の声にします）。</p>
    <ul class="vlist">${SAMPLES.voices.map((v, i) => `<li><button class="play" type="button" data-vs="${i}" aria-label="${esc(v.voice)}を聞く">▶</button><b>${esc(v.voice)}</b><span>${esc(v.gender)}・${esc(v.note)}</span></li>`).join("")}</ul>`;
  el.querySelectorAll("[data-vs]").forEach(b => b.addEventListener("click", () => { hush(); playAud(sAud(SAMPLES.voices[+b.dataset.vs]), {rate: 1}); }));
}
function renderReqForm(){
  const el = $("kzReqBody"); if (!el) return;
  const r = KZREQ(), S = SAMPLES, on = apiOn();
  el.innerHTML = `<p class="mapnote" style="margin-top:0">来週の会議、商談、ミートアップで話したいこと。日本語でOK、声で入力もできます。「教材を作る」を押すと、その場であなた専用の教材ができて、すぐ練習できます。</p>${on ? interviewHtml() : ""}
    <div class="rq"><span class="rq-h">1. 種類<small>${{スピーキング: "あなたが話す英語", リスニング: "相手が話す英語を聞き取ってまねする", 両方: "あなたが話す英語＋相手の質問にすぐ答える"}[r.kind] || ""}</small></span><div class="kzrate wide" role="group">${["スピーキング", "リスニング", "両方"].map(k => `<button type="button" data-rk="${k}" aria-pressed="${r.kind === k}">${k}</button>`).join("")}</div></div>
    <div class="rq"><span class="rq-h">2. レベル<small>音を聞いて「これくらい${r.kind === "リスニング" ? "聞けたら" : "話せたら"}嬉しい」を選ぶ</small></span>
      <ul class="lvpick">${S.levels.map((l, i) => `<li class="${r.level === l.eiken ? "on" : ""}"><button type="button" class="lvsel" data-lv="${esc(l.eiken)}"><b>${esc(l.tag)}</b><span>${esc(l.eiken)}・${esc(l.cefr)}</span></button>
        <div class="lvplay"><button type="button" class="btn ghost sm2" data-lvs="${i}">▶ 話す見本</button><button type="button" class="btn ghost sm2" data-lvl="${i}">▶ 聞く見本</button></div></li>`).join("")}</ul></div>
    <div class="rq"><span class="rq-h">3. 場面</span><select id="kzScene" class="kzsel2">${KZSCENES.map(x => `<option ${r.scene === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
    <div class="rq"><span class="rq-h">4. 話したいこと</span>
      <div class="kzta2"><textarea id="kzBody" rows="4" placeholder="例：来週のオンライン商談で、うちの抹茶の強み（有機・石臼挽き）と、最小ロット10kgから出せることを伝えたい">${esc(r.body || "")}</textarea>
        <button type="button" class="mic" id="kzMic" aria-label="声で入力"><svg viewBox="0 0 24 24"><path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg></button></div>
      <p class="mapnote" id="kzMicNote" hidden></p></div>
    ${on ? `<div class="acts"><button class="btn big" type="button" id="kzMake" ${KZMAKING ? "disabled" : ""}>${KZMAKING ? "教材を作っています…" : "✨ 教材を作る"}</button></div><p class="mapnote" id="kzMakeNote" aria-live="polite">${KZMAKING ? "教材を作っています…（20〜40秒）。この画面のままお待ちください。" : "1日10回まで作れます。"}</p>`
      : `<p class="mapnote">この機能はログインした会員版で使えます。</p>`}`;
  const set = (k, v) => { const x = KZREQ(); x[k] = v; x.body = $("kzBody").value; saveReq(x); renderReqForm(); };
  el.querySelectorAll("[data-rk]").forEach(b => b.addEventListener("click", () => set("kind", b.dataset.rk)));
  el.querySelectorAll("[data-lv]").forEach(b => b.addEventListener("click", () => set("level", b.dataset.lv)));
  el.querySelectorAll("[data-lvs]").forEach(b => b.addEventListener("click", () => { hush(); playAud(sAud(S.levels[+b.dataset.lvs].speak), {rate: 1}); }));
  el.querySelectorAll("[data-lvl]").forEach(b => b.addEventListener("click", () => { hush(); playAud(sAud(S.levels[+b.dataset.lvl].listen), {rate: 1}); }));
  $("kzScene").addEventListener("change", e => { const x = KZREQ(); x.scene = e.target.value; saveReq(x); });
  $("kzBody").addEventListener("input", e => { const x = KZREQ(); x.body = e.target.value; saveReq(x); });
  bindMic();
  if (on){ bindInterview(); $("kzMake").addEventListener("click", kzMake); }
}
// 「教材を作る」：中継がその場で作った教材を、会話の録音の教材と同じく この端末（kz-mine）に残して、すぐ開く
let KZMAKING = false;
async function kzMake(){
  const btn = $("kzMake"), note = $("kzMakeNote"), body = $("kzBody").value.trim(), x = KZREQ();
  if (KZMAKING || !btn) return;
  if (body.length < 5){ note.textContent = "話したいことを、もう少し書いてください（日本語でOK）。"; $("kzBody").focus(); return; }
  KZMAKING = true; btn.disabled = true; btn.textContent = "教材を作っています…"; note.textContent = "教材を作っています…（20〜40秒）。この画面のままお待ちください。";
  const scene = $("kzScene").value, level = x.level || "英検準2級";
  let r;
  try { r = await api("/api/kz-lesson", {kind: x.kind, level, scene, body}); }
  catch (e) { KZMAKING = false; if ($("kzMake")){ $("kzMake").disabled = false; $("kzMake").textContent = "✨ 教材を作る"; $("kzMakeNote").textContent = "教材を作れませんでした（" + e.message + "）。"; } else toast("教材を作れませんでした（" + e.message + "）"); return; }
  KZMAKING = false;
  if (r.empty){ if ($("kzMake")){ $("kzMake").disabled = false; $("kzMake").textContent = "✨ 教材を作る"; $("kzMakeNote").textContent = "この内容では教材を作れませんでした。英語で話したい場面や内容を書きかえて、もう一度どうぞ。"; } return; }
  const {left, ...lesson} = r;
  const m = {...lesson, id: "k" + Date.now().toString(36), source: "オーダーメイド", kind: x.kind === "リスニング" ? "listening" : "speaking", level, made: dayKey(Date.now()), mine: true};
  store("kz-mine", JSON.stringify([m, ...kzMine()].slice(0, 30)));
  const msg = "教材ができました" + (left != null ? `（今日あと${left}回作れます）` : "");
  if ($("kzMake")){ openKz(m.id); toast(msg); } else toast(msg + "。練習＞教材の一覧にあります");   // 待っているあいだに別の画面へ移ったときは、開かずに知らせる
}
// 声で入力（iPhoneのSafariは音声認識。使えないときはキーボードのマイクを案内）
let REC = null;
function bindMic(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition, btn = $("kzMic"), note = $("kzMicNote");
  const tell = t => { note.textContent = t; note.hidden = !t; };
  btn.addEventListener("click", () => {
    if (!SR){ tell("この画面では声の入力が使えません。キーボードのマイクのボタン（🎤）で話すと、そのまま文字になります。"); return; }
    if (REC){ REC.stop(); return; }
    const ta = $("kzBody"), base = ta.value ? ta.value.replace(/\s*$/, "") + "\n" : "";
    REC = new SR(); REC.lang = "ja-JP"; REC.interimResults = true; REC.continuous = true;
    let fin = "";
    REC.onresult = e => { let mid = ""; for (let i = e.resultIndex; i < e.results.length; i++){ const t = e.results[i][0].transcript; if (e.results[i].isFinal) fin += t; else mid += t; } ta.value = base + fin + mid; const x = KZREQ(); x.body = ta.value; saveReq(x); };
    REC.onerror = e => tell(/not-allowed|service-not-allowed/.test(e.error) ? "マイクか音声入力が許可されていません。iPhoneの「設定 → Siri」で音声入力をオンにするか、キーボードのマイク（🎤）を使ってください。" : "うまく聞き取れませんでした。もう一度どうぞ。");
    REC.onend = () => { REC = null; btn.classList.remove("on"); };
    try { REC.start(); btn.classList.add("on"); tell("聞いています…話し終わったら、もう一度マイクを押してください。"); } catch (e) { REC = null; tell("声の入力を始められませんでした。キーボードのマイク（🎤）を使ってください。"); }
  });
}
function openKz(id){
  KZ = kzList().find(m => m.id === id) || null; KZSTEP = KZ && KZ.lines ? "listen" : KZ && (KZ.wishes || []).length ? "wish" : "read"; hush();
  showTab("kz"); renderKz(); window.scrollTo(0, 0);
}

/* ---------- プレイヤー ---------- */
const STEPS = [["read", "語順で話す"], ["shadow", "シャドーイング"], ["speed", "スピード"], ["reply", "2秒応答"], ["gram", "文法"]];
const VIEWS = [["order", "語順日本語"], ["en", "英語"], ["ja", "日本語"]];
const RATES = SPEEDS.map(r => [r, r + "×"]);
let KZVIEW = "order", KZLOOP = false;
const kzA = m => m.audio || {};
function renderPlayer(){
  const m = KZ, box = $("kzwrap");
  hush();
  if (m.lines) return renderListen();
  const steps = [...((m.wishes || []).length ? [["wish", "言えたらよかった"]] : []), ...STEPS.filter(([k]) => k !== "reply" || (m.qa || []).length)];
  if (!steps.some(([k]) => k === KZSTEP)) KZSTEP = "read";
  const real = hasAud((kzA(m).paras || [])[0]);
  box.innerHTML = `<button class="more kzback" type="button" id="kzBack">← 教材の一覧へ</button>
    <div class="kzp-h">
      <div class="kzc-h">${m.cheers ? `<span class="kb cheers">${flagOf(m.cheers)} 乾杯フレーズ</span>` : `<span class="kb ${m.kind}">${KZKIND[m.kind] || ""}</span>`}<span class="kb lv">${esc(m.level || "")}</span>${real ? '<span class="kb voice">🎧 ネイティブ音声</span>' : ""}</div>
      <h2>${esc(m.title)}</h2><p>${esc(m.scene || "")}</p>
      <div class="kzc-f"><span class="num">${m.words}語</span><span class="num">155語/分なら ${kzSec(m)}秒</span></div>
    </div>
    <div class="kzsteps" role="tablist">${steps.map(([k, l], i) => `<button type="button" role="tab" data-step="${k}" aria-selected="${KZSTEP === k}"><span class="num">${i + 1}</span>${l}</button>`).join("")}</div>
    <div id="kzBody2"></div>${isMine(m) && !(m.wishes || []).length ? `<button type="button" class="more" id="kzDel">この教材を消す</button>` : ""}`;
  $("kzBack").addEventListener("click", () => { quiet(); KZ = null; renderKz(); });
  if ($("kzDel")) $("kzDel").addEventListener("click", () => { if (!confirm("この教材を消しますか？（この端末から消えます）")) return; kzMineDel(m.id); quiet(); KZ = null; renderKz(); });
  box.querySelectorAll("[data-step]").forEach(b => b.addEventListener("click", () => { quiet(); KZSTEP = b.dataset.step; renderPlayer(); }));
  const sel = box.querySelector('.kzsteps [aria-selected="true"]'), row = box.querySelector(".kzsteps");
  if (sel) row.scrollLeft = sel.offsetLeft - (row.clientWidth - sel.offsetWidth) / 2;
  ({wish: stepWish, read: stepRead, shadow: stepShadow, speed: stepSpeed, reply: stepReply, gram: stepGram})[KZSTEP]();
}
const noVoice = () => !("speechSynthesis" in window) && !hasAud((kzA(KZ).paras || [])[0]) ? `<p class="mapnote">この端末では読み上げが使えません。英文を見ながら声に出して練習してください。</p>` : "";
const rateBar = () => `<label class="kzsel">速さ<select class="kzspeed" aria-label="再生の速さ">${SPEEDS.map(r => `<option value="${r}" ${KZRATE === r ? "selected" : ""}>${spLabel(r)}</option>`).join("")}</select></label>`;
function bindRate(b, again){
  b.querySelectorAll("select.kzspeed").forEach(x => x.addEventListener("change", () => { setRate(+x.value); again && again(); }));
}
function stepRead(){
  const m = KZ, b = $("kzBody2"), A = kzA(m);
  const main = p => KZVIEW === "order" ? orderHtml(p.order) : KZVIEW === "en" ? wordSpans(p.en) : esc(p.ja);
  b.innerHTML = `<p class="mapnote" style="margin-top:0">「語順日本語」を見ながら、英語で言ってみます。言えたら「英語を見る」で答え合わせ。▶ でお手本を聞くと、読んでいる単語が光ります。英語の単語をタップすると、私の単語集に入れられます。</p>
    <div class="kzview" role="group" aria-label="表示">${VIEWS.map(([k, l]) => `<button type="button" data-view="${k}" aria-pressed="${KZVIEW === k}">${l}</button>`).join("")}</div>
    <div class="kzbar"><button class="btn" type="button" id="kzAll">▶ 通しで聞く</button>${rateBar()}
      <button type="button" class="kzloop" id="kzLoop" aria-pressed="${KZLOOP}" title="同じ段落をくり返す">🔁 くり返し</button></div>${noVoice()}
    <ol class="paras" id="kzParas">${kzPara(m).map((p, i) => `<li data-i="${i}"><div class="ph"><span class="pn num">${p.n}</span><button class="play" type="button" data-say="${i}" aria-label="お手本を聞く">▶</button></div>
      <p class="pmain ${KZVIEW}">${main(p)}</p>
      ${KZVIEW !== "en" ? `<button class="more peek" type="button" data-peek="${i}" aria-expanded="false">英語を見る</button><p class="pen" hidden>${wordSpans(p.en)}</p>` : `<p class="psub">${orderHtml(p.order)}</p>`}
      ${apiOn() ? `<button class="btn ghost sm2 rcbtn" type="button" data-rc="${i}">🎙 音読チェック</button><div class="rcout"></div>` : DEMO ? `<button class="btn ghost sm2 rcbtn" type="button" data-demo>🎙 音読チェック</button>` : ""}</li>`).join("")}</ol>`;
  bindRate(b);
  b.querySelectorAll("[data-rc]").forEach(x => x.addEventListener("click", () => readCheck(x, m, +x.dataset.rc)));
  $("kzLoop").addEventListener("click", e => { KZLOOP = !KZLOOP; e.currentTarget.setAttribute("aria-pressed", String(KZLOOP)); });
  b.querySelectorAll("[data-view]").forEach(x => x.addEventListener("click", () => { hush(); KZVIEW = x.dataset.view; stepRead(); }));
  b.querySelectorAll("[data-peek]").forEach(x => x.addEventListener("click", () => { const e = x.nextElementSibling, on = e.hidden; e.hidden = !on; x.setAttribute("aria-expanded", String(on)); x.textContent = on ? "英語をかくす" : "英語を見る"; }));
  const li = i => b.querySelector(`#kzParas li[data-i="${i}"]`);
  const mark = i => b.querySelectorAll("#kzParas li").forEach(x => x.classList.toggle("now", +x.dataset.i === i));
  // 段落を流す（1段落でも通しでも同じしくみ。再生バーの±15秒で前後の段落へまたげる）
  const paraItems = idx => idx.map(i => ({h: (A.paras || [])[i], text: kzPara(m)[i].en, label: `段落${kzPara(m)[i].n}`, i}));
  const playParas = async idx => {
    const items = paraItems(idx);
    const ok = await playSeq(items, {gap: 450,
      start: k => { const el = li(items[k].i); mark(items[k].i); el && el.scrollIntoView({behavior: reduce ? "auto" : "smooth", block: "nearest"}); },
      time: (k, t) => { const el = li(items[k].i); el && lightWords(el, items[k].h, t); }});
    b.querySelectorAll("#kzParas .wd").forEach(w => w.classList.remove("on", "did")); mark(-1); return ok;
  };
  b.querySelectorAll("[data-say]").forEach(x => x.addEventListener("click", async () => {
    hush(); const run = KZ_SPEAK, i = +x.dataset.say;
    do { if (!(await playParas([i])) || run !== KZ_SPEAK) return; kzDone({step: "read"}); if (KZLOOP && !(await waitRun(700, run))) return; } while (KZLOOP && run === KZ_SPEAK);
  }));
  $("kzAll").addEventListener("click", async () => {
    hush(); const run = KZ_SPEAK;
    do { if (!(await playParas(kzPara(m).map((_, i) => i)))) return; kzDone({step: "read"}); if (KZLOOP && !(await waitRun(700, run))) return; } while (KZLOOP && run === KZ_SPEAK);
  });
}
function stepShadow(){
  const m = KZ, b = $("kzBody2"), A = kzA(m);
  const items = kzPara(m).flatMap((p, i) => sentSegs((A.paras || [])[i], p.en).map(x => ({...x, n: p.n, h: (A.paras || [])[i]})));
  let gap = +(store("kz-gap") || 1.2);
  b.innerHTML = `<p class="mapnote" style="margin-top:0">お手本の1文を聞いたら、すぐに同じ速さ・同じ気持ちで声に出します。黄色のバーが「あなたの番」です。</p>${noVoice()}
    <div class="kzbar"><button class="btn" type="button" id="kzSh">▶ シャドーイングを始める</button><button class="btn ghost" type="button" id="kzShStop">止める</button>${rateBar()}</div>
    <div class="kzbar kzgap"><span>あなたの番の長さ</span><div class="kzrate" role="group">${[[1, "短め"], [1.2, "ふつう"], [1.6, "長め"]].map(([g, l]) => `<button type="button" data-gap="${g}" aria-pressed="${gap === g}">${l}</button>`).join("")}</div></div>
    <div class="shbox" id="shBox"><span class="pn num" id="shN">${items[0] ? items[0].n : ""}</span><p class="en" id="shEn">${wordSpans(items[0] ? items[0].s : "")}</p><div class="shbar"><i id="shBar"></i></div><p class="shst" id="shSt">準備ができたら「始める」</p><p class="shc num" id="shC">1 / ${items.length}</p></div>`;
  bindRate(b);
  b.querySelectorAll("[data-gap]").forEach(x => x.addEventListener("click", () => { gap = +x.dataset.gap; store("kz-gap", String(gap)); b.querySelectorAll("[data-gap]").forEach(y => y.setAttribute("aria-pressed", String(+y.dataset.gap === gap))); }));
  $("kzShStop").addEventListener("click", () => { hush(); $("shSt").textContent = "止めました"; });
  $("kzSh").addEventListener("click", async () => {
    hush(); const run = KZ_SPEAK;
    for (let i = 0; i < items.length; i++){
      if (run !== KZ_SPEAK) return;
      const c = items[i], bar = $("shBar");
      $("shEn").innerHTML = wordSpans(c.s); $("shN").textContent = c.n; $("shC").textContent = `${i + 1} / ${items.length}`;
      $("shSt").textContent = "お手本を聞く"; $("shBox").classList.remove("you"); bar.style.transition = "none"; bar.style.width = "0";
      const t0 = Date.now();
      const ok = c.from != null && hasAud(c.h) ? await playAud(c.h, {from: c.from, to: c.to, onTime: t => lightSeg($("shEn"), c, t)}) : await say(c.s);
      if (run !== KZ_SPEAK || ok === false && c.from != null) return;
      const heard = c.from != null ? (c.to - c.from) / KZRATE : (Date.now() - t0) / 1000;
      const sec = Math.max(1.4, heard * gap + 0.4);
      $("shSt").textContent = "あなたの番！"; $("shBox").classList.add("you"); void bar.offsetWidth;
      bar.style.transition = `width ${sec}s linear`; bar.style.width = "100%";
      if (!(await waitRun(sec * 1000 + 250, run))) return;
    }
    $("shBox").classList.remove("you");
    if (run === KZ_SPEAK){ $("shSt").textContent = "おつかれさま！通しでできました"; kzDone({step: "shadow"}); }
  });
}
// シャドーイングの1文の中で、いま読んでいる単語を光らせる
function lightSeg(box, c, t){
  const a = AUD[c.h], spans = box.querySelectorAll(".wd");
  spans.forEach(s => s.classList.remove("on", "did"));
  if (!a || t < 0) return;
  const ws = a.w.filter(w => w[0] >= c.from - 0.01 && w[1] <= c.to + 0.01);
  let j = -1; ws.forEach((w, i) => { if (w[0] <= t + 0.03) j = i; });
  if (j < 0 || !spans.length) return;
  const k = ws.length === spans.length ? j : Math.round(j * (spans.length - 1) / Math.max(1, ws.length - 1));
  for (let i = 0; i <= k && i < spans.length; i++) spans[i].classList.add(i === k ? "on" : "did");
}
function stepSpeed(){
  const m = KZ, b = $("kzBody2"), best = kzBest(m.id);
  b.innerHTML = `<p class="mapnote" style="margin-top:0">「スタート」を押して全文を声に出して読み、言い終わったら「ストップ」。1分あたりの語数を出します。</p>
    <div class="spbox"><div class="sptxt">${kzPara(m).map(p => `<p><span class="pn num">${p.n}</span>${esc(p.en)}</p>`).join("")}</div>
      <div class="spctl"><button class="btn big" type="button" id="spGo">スタート</button><span class="sptime num" id="spT">0.0秒</span><button class="btn ghost" type="button" id="spModel">お手本の速さを聞く</button></div>
      <div id="spRes">${best ? `<p class="mapnote">これまでのベスト <b class="num">${best}</b>語/分</p>` : ""}</div></div>`;
  let t0 = 0, iv = null;
  $("spModel").addEventListener("click", async () => { hush(); const A = kzA(m); setRate(1); await playSeq(kzPara(m).map((p, i) => ({h: (A.paras || [])[i], text: p.en, label: `お手本・段落${p.n}`})), {gap: 300}); });
  $("spGo").addEventListener("click", () => {
    if (!t0){ t0 = performance.now(); $("spGo").textContent = "ストップ"; $("spGo").classList.add("stop");
      iv = setInterval(() => $("spT").textContent = ((performance.now() - t0) / 1000).toFixed(1) + "秒", 100); return; }
    clearInterval(iv); const sec = (performance.now() - t0) / 1000; t0 = 0;
    $("spGo").textContent = "もう一度"; $("spGo").classList.remove("stop");
    const wpm = Math.round(m.words / sec * 60), pct = Math.min(100, Math.round(100 * wpm / KZ_GOAL_WPM));
    const msg = wpm >= KZ_GOAL_WPM ? "目標クリア！ネイティブの会話の速さです" : wpm >= 130 ? "あと少し！語順日本語の「／」ごとに息つぎを減らしてみましょう" : "まずは1段落ずつ、お手本と同じリズムで";
    $("spRes").innerHTML = `<div class="spmeter"><i style="width:${pct}%"></i><em style="left:100%"></em></div>
      <p class="spv"><b class="num">${wpm}</b><span>語/分</span><small>目標 ${KZ_GOAL_WPM}</small></p><p class="mapnote" style="margin-top:4px">${msg}（${sec.toFixed(1)}秒）</p>`;
    kzDone({step: "speed", wpm});
  });
}
/* ---------- 2秒応答：返事の速さ（反射速度）を計る ---------- */
const reactLog = () => { try { return JSON.parse(store("kz-react") || "[]"); } catch (e) { return []; } };
let RX = null;                                  // マイクで自動計測するときの入力（練習を離れたら止める）
function rxStop(){ if (RX){ try { RX.stream.getTracks().forEach(t => t.stop()); RX.ctx.close(); } catch (e) {} RX = null; } }
async function rxStart(){
  if (RX) return RX;
  const stream = await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: true, noiseSuppression: true}});
  const ctx = new (window.AudioContext || window.webkitAudioContext)(); await ctx.resume();
  const an = ctx.createAnalyser(); an.fftSize = 1024; ctx.createMediaStreamSource(stream).connect(an);
  return (RX = {stream, ctx, an});
}
const rxLevel = () => { const d = new Float32Array(RX.an.fftSize); RX.an.getFloatTimeDomainData(d); let s = 0; for (const v of d) s += v * v; return Math.sqrt(s / d.length); };
// 話しはじめるまでの時間（ミリ秒）。マイク：声の大きさで判定／タップ：ボタンを押した時。5秒で打ち切り（null）
function waitReaction(run, tapBtn){
  return new Promise(async res => {
    const t0 = performance.now(); let done = false, floor = 0, n = 0;
    const fin = v => { if (done) return; done = true; res(v); };
    tapBtn.addEventListener("click", () => fin(performance.now() - t0), {once: true});
    const loop = () => {
      if (done) return;
      if (run !== KZ_SPEAK) return fin(undefined);
      const el = performance.now() - t0;
      if (RX){
        const lv = rxLevel();
        if (el < 250){ floor += lv; n++; }                                  // 最初の0.25秒でまわりの音の大きさを測る
        else if (lv > Math.max(0.035, (floor / Math.max(1, n)) * 3.2)) return fin(el);
      }
      if (el > 5000) return fin(null);
      const s = Math.max(0, KZ_REPLY_SEC - el / 1000); const S = $("rpS"); if (S) S.textContent = el / 1000 < KZ_REPLY_SEC ? s.toFixed(1) : "+" + (el / 1000 - KZ_REPLY_SEC).toFixed(1);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}
function stepReply(){
  const m = KZ, b = $("kzBody2"), qs = m.qa || [];
  let i = 0, ok = 0, times = [];
  const useMic = store("kz-react-mic") === "1";
  b.innerHTML = `<p class="mapnote" style="margin-top:0">質問が読み上げられたら、${KZ_REPLY_SEC}秒以内に声で答えます。話しはじめるまでの時間（返事の速さ）を計って記録します。</p>${noVoice()}
    <label class="kzchk"><input type="checkbox" id="rpMic" ${useMic ? "checked" : ""}>マイクで自動計測（声を出したら止まる。録音はしません）</label>
    <div class="rpbox" id="rpBox"></div>`;
  $("rpMic").addEventListener("change", e => { store("kz-react-mic", e.target.checked ? "1" : null); if (!e.target.checked) rxStop(); });
  const show = async () => {
    if (i >= qs.length){
      rxStop();
      const got = times.filter(x => x != null), avg = got.length ? got.reduce((s, x) => s + x, 0) / got.length / 1000 : null;
      $("rpBox").innerHTML = `<p class="rpdone"><b class="num">${ok} / ${qs.length}</b> 問、言えました</p>
        <div class="rscore"><div><span>平均の返事の速さ</span><b class="num">${avg != null ? avg.toFixed(1) : "-"}</b><small>秒</small></div><div><span>2秒以内</span><b class="num">${times.filter(x => x != null && x <= KZ_REPLY_SEC * 1000).length}</b><small>/${qs.length}</small></div></div>
        ${reactTrend()}<div class="acts" style="justify-content:center"><button class="btn" type="button" id="rpAgain">もう一度</button></div>`;
      $("rpAgain").addEventListener("click", () => stepReply());
      kzDone({step: "reply", ok, n: qs.length, react: avg}); return;
    }
    const q = qs[i], run = ++KZ_SPEAK;
    $("rpBox").innerHTML = `<span class="num rpn">Q${i + 1} / ${qs.length}</span><p class="rpq">${esc(q.q)}</p><p class="rpqj">${esc(q.q_ja || "")}</p>
      <div class="rpring"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" class="bg"/><circle cx="40" cy="40" r="34" class="fg" id="rpFg"/></svg><b class="num" id="rpS">${KZ_REPLY_SEC}</b></div>
      <div class="acts" style="justify-content:center"><button class="btn big" type="button" id="rpTap" disabled>話しはじめた！</button></div>
      <p class="rpres" id="rpRes" hidden></p>
      <p class="rpa" id="rpA" hidden>例：<b>${esc(q.a)}</b></p>
      <div class="acts" id="rpBtns" hidden style="justify-content:center"><button class="btn" type="button" id="rpOk">言えた！</button><button class="btn ghost" type="button" id="rpNg">まだ</button><button class="btn ghost" type="button" id="rpRe">もう一回</button></div>`;
    const qa = (kzA(m).qa || [])[i] || [];
    await speak(q.q, qa[0], {rate: 1}); if (run !== KZ_SPEAK) return;
    await wait(120); if (run !== KZ_SPEAK) return;
    const fg = $("rpFg"); fg.style.transition = `stroke-dashoffset ${KZ_REPLY_SEC}s linear`; void fg.getBoundingClientRect(); fg.style.strokeDashoffset = "0";
    const tap = $("rpTap"); tap.disabled = false;
    const ms = await waitReaction(run, tap);
    if (ms === undefined) return;
    times.push(ms);
    const l = reactLog(); l.push({t: Date.now(), id: m.id, q: i, ms: ms == null ? null : Math.round(ms), mic: !!RX}); store("kz-react", JSON.stringify(l.slice(-2000)));
    if (typeof apiOn === "function" && apiOn()) api("/api/log", {kind: "react", ms: ms == null ? null : Math.round(ms), material: m.title}).catch(() => {});
    tap.hidden = true; fg.style.transition = "none";
    const r = $("rpRes"); r.hidden = false;
    r.innerHTML = ms == null ? `5秒たちました。まずは短く一言から！` : `<b class="num">${(ms / 1000).toFixed(1)}</b>秒で話しはじめました ${ms <= KZ_REPLY_SEC * 1000 ? '<span class="good">◎ 2秒以内</span>' : '<span>あと少し</span>'}`;
    $("rpA").hidden = false; $("rpBtns").hidden = false;
    $("rpOk").addEventListener("click", async () => { hush(); ok++; i++; show(); });
    $("rpNg").addEventListener("click", () => { hush(); i++; show(); });
    $("rpRe").addEventListener("click", () => { hush(); times.pop(); show(); });
    await wait(RX ? 1600 : 200);                                          // 自動計測のときは、答え終わるのを少し待ってからお手本
    if (run === KZ_SPEAK) speak(q.a, qa[1], {rate: 1});
  };
  if (!qs.length){ $("rpBox").innerHTML = `<p class="mapnote">この教材には質問がありません。</p>`; return; }
  $("rpBox").innerHTML = `<div class="acts" style="justify-content:center"><button class="btn big" type="button" id="rpGo">はじめる</button></div>${reactTrend()}`;
  $("rpGo").addEventListener("click", async () => {
    if ($("rpMic").checked){ try { await rxStart(); } catch (e) { $("rpMic").checked = false; store("kz-react-mic", null); } }
    show();
  });
}
// 返事の速さの推移（この2週間・1日ごとの中央値と、2秒以内の割合）
function reactStats(){
  const by = {};
  reactLog().forEach(x => { const k = dayKey(x.t); (by[k] = by[k] || []).push(x.ms); });
  const med = a => { const v = a.filter(x => x != null).sort((p, q) => p - q); return v.length ? v[Math.floor(v.length / 2)] : null; };
  return {by, med};
}
function reactTrend(){
  const {by, med} = reactStats(), days = [...Array(14)].map((_, i) => dayKey(Date.now() - (13 - i) * 864e5));
  const pts = days.map(d => by[d] ? med(by[d]) : null), any = pts.some(v => v != null);
  if (!any) return `<p class="mapnote" style="text-align:center">練習すると、ここに返事の速さの推移が出ます。</p>`;
  const W = 320, H = 110, max = Math.max(5000, ...pts.filter(v => v != null)), x = i => i * (W / 13), y = v => H - Math.min(v, max) / max * H;
  const path = pts.map((v, i) => v == null ? null : [x(i), y(v)]).filter(Boolean);
  const all = reactLog().filter(z => z.ms != null), within = all.length ? Math.round(100 * all.filter(z => z.ms <= 2000).length / all.length) : 0;
  return `<div class="panel rtrend"><div class="rt-h"><b>返事の速さの推移</b><span>これまで ${all.length}回・2秒以内 <b class="num">${within}</b>%</span></div>
    <svg class="dgraph line" viewBox="-6 -6 ${W + 12} ${H + 26}" role="img" aria-label="返事の速さの推移">
      <rect x="0" y="${y(2000)}" width="${W}" height="${H - y(2000)}" class="ok"></rect><line x1="0" x2="${W}" y1="${y(2000)}" y2="${y(2000)}" class="goal"></line>
      <text x="${W}" y="${y(2000) - 4}" text-anchor="end" class="dl">2秒</text>
      <polyline points="${path.map(p => p.join(",")).join(" ")}" class="ln"></polyline>
      ${path.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5"></circle>`).join("")}
      ${days.map((d, i) => `<text class="dl" x="${x(i)}" y="${H + 16}" text-anchor="middle">${+d.slice(8)}</text>`).join("")}</svg></div>`;
}
function stepGram(){
  const m = KZ, b = $("kzBody2");
  b.innerHTML = `<p class="mapnote" style="margin-top:0">この教材で使った文法です。（例：）の文は、あなたが同じ話をするときにそのまま使えます。</p>
    <ul class="gcards">${(m.grammar || []).map((g, i) => `<li class="gc"><span class="gcat">${esc(g.category)}</span>
      <div class="gsent"><button class="play" type="button" data-g="${i}" aria-label="この文を聞く">▶</button><q>${esc(g.sentence)}</q>${wdStar(g.sentence, `data-ws="g:${i}"`)}</div>
      <p class="gexp">${exHtml(g.explain)}</p>
      <p class="geff"><b>できるようになること</b>${esc(g.effect)}</p></li>`).join("")}</ul>`;
  b.querySelectorAll("[data-g]").forEach(x => x.addEventListener("click", () => { hush(); const i = +x.dataset.g; speak(m.grammar[i].sentence, (kzA(m).grammar || [])[i]); }));
}
function kzDone(info){
  kzSave({id: KZ.id, ...info});
  if (KZ.cheers && ME){ store("quest-" + weekStart(ME.today) + "-kz", "1"); RENDERED.quest = 0; }
}

/* ---------- リスニング教材：聞く → 設問 → スクリプト（ロールプレイ）→ 聞き取りのポイント ---------- */
const LSTEPS = [["listen", "聞く"], ["quiz", "設問"], ["script", "スクリプト"], ["phrase", "聞き取りのポイント"]];
let KZSUB = "none";
function renderListen(){
  const m = KZ, box = $("kzwrap"), A = kzA(m), pt = m.partner || {};
  if (!LSTEPS.some(([k]) => k === KZSTEP)) KZSTEP = "listen";
  const real = hasAud((A.lines || [])[0]);
  box.innerHTML = `<button class="more kzback" type="button" id="kzBack">← 教材の一覧へ</button>
    <div class="kzp-h"><div class="kzc-h"><span class="kb listening">リスニング</span><span class="kb lv">${esc(m.level || "")}</span>${real ? '<span class="kb voice">🎧 ネイティブ音声</span>' : ""}</div>
      <h2>${esc(m.title)}</h2><p>${esc(m.scene || "")}</p>
      <div class="partner"><span class="pf">${flagOf(pt.acc)}</span><div><b>話し手：${esc(pt.label || "")}の${esc(pt.gender || "")}</b><span>${pt.strength === "strong" ? "なまり強め" : "きれいな発音"}・${m.lines.length}行・${m.words}語</span></div></div></div>
    <div class="kzsteps" role="tablist">${LSTEPS.map(([k, l], i) => `<button type="button" role="tab" data-step="${k}" aria-selected="${KZSTEP === k}"><span class="num">${i + 1}</span>${l}</button>`).join("")}</div>
    <div id="kzBody2"></div>`;
  $("kzBack").addEventListener("click", () => { hush(); KZ = null; renderKz(); });
  box.querySelectorAll("[data-step]").forEach(b => b.addEventListener("click", () => { hush(); KZSTEP = b.dataset.step; renderListen(); }));
  ({listen: lsListen, quiz: lsQuiz, script: lsScript, phrase: lsPhrase})[KZSTEP]();
}
const lineHtml = (x, i, sub) => `<li class="ln ${x.sp}" data-i="${i}"><span class="who">${x.sp === "partner" ? "相手" : "あなた"}</span>
  <div class="lb">${sub !== "none" ? `<p class="en">${sub === "en" ? wordSpans(x.en) : esc(x.ja)}</p>` : `<p class="en dim">${"・".repeat(Math.min(14, Math.ceil(x.en.length / 6)))}</p>`}</div>
  <button class="play sm" type="button" data-ln="${i}" aria-label="この行を聞く">▶</button></li>`;
async function playLines(b, from, to, opts = {}){
  const m = KZ, A = kzA(m), run = KZ_SPEAK;
  if (!opts.role){                                          // ふつうの再生：続けて流す（±15秒で前後の行へまたげる）
    const idx = [...Array(to - from)].map((_, k) => from + k);
    const items = idx.map(i => ({h: (A.lines || [])[i], text: m.lines[i].en, label: (m.lines[i].sp === "partner" ? "相手：" : "あなた：") + m.lines[i].en, i}));
    const ok = await playSeq(items, {gap: 350,
      start: k => { const el = b.querySelector(`.ln[data-i="${items[k].i}"]`); b.querySelectorAll(".ln").forEach(l => l.classList.toggle("now", l === el)); el && el.scrollIntoView({behavior: reduce ? "auto" : "smooth", block: "nearest"}); },
      time: (k, t) => { const el = b.querySelector(`.ln[data-i="${items[k].i}"]`); el && lightWords(el, items[k].h, t); }});
    b.querySelectorAll(".ln").forEach(l => l.classList.remove("now"));
    return ok;
  }
  for (let i = from; i < to; i++){
    if (run !== KZ_SPEAK) return false;
    const x = m.lines[i], el = b.querySelector(`.ln[data-i="${i}"]`);
    b.querySelectorAll(".ln").forEach(l => l.classList.toggle("now", l === el));
    el && el.scrollIntoView({behavior: reduce ? "auto" : "smooth", block: "nearest"});
    if (opts.role && x.sp === "you"){                       // ロールプレイ：あなたの行は自分で言う
      el && el.classList.add("yourturn");
      const sec = Math.max(2, x.en.split(/\s+/).length / 130 * 60 * 1.4);
      if (!(await waitRun(sec * 1000, run))) return false;
      el && el.classList.remove("yourturn");
      if (opts.check) await speak(x.en, (A.lines || [])[i], {onTime: t => el && lightWords(el, (A.lines || [])[i], t)});
    } else {
      await speak(x.en, (A.lines || [])[i], {onTime: t => el && lightWords(el, (A.lines || [])[i], t)});
    }
    if (!(await waitRun(350, run))) return false;
  }
  b.querySelectorAll(".ln").forEach(l => l.classList.remove("now"));
  return run === KZ_SPEAK;
}
function lsListen(){
  const m = KZ, b = $("kzBody2");
  b.innerHTML = `<p class="mapnote" style="margin-top:0">まずは字幕なしで聞いて、何の話かをつかみます。分からなければ英語→日本語の字幕で確かめましょう。</p>
    <div class="kzview" role="group" aria-label="字幕">${[["none", "字幕なし"], ["en", "英語"], ["ja", "日本語"]].map(([k, l]) => `<button type="button" data-sub="${k}" aria-pressed="${KZSUB === k}">${l}</button>`).join("")}</div>
    <div class="kzbar"><button class="btn" type="button" id="lsAll">▶ 会話を通しで聞く</button>${rateBar()}</div>
    <ol class="lines">${m.lines.map((x, i) => lineHtml(x, i, KZSUB)).join("")}</ol>`;
  bindRate(b);
  b.querySelectorAll("[data-sub]").forEach(x => x.addEventListener("click", () => { hush(); KZSUB = x.dataset.sub; lsListen(); }));
  b.querySelectorAll("[data-ln]").forEach(x => x.addEventListener("click", () => { hush(); const i = +x.dataset.ln; playLines(b, i, i + 1); }));
  $("lsAll").addEventListener("click", async () => { hush(); if (await playLines(b, 0, m.lines.length)) kzDone({step: "listen"}); });
}
function lsQuiz(){
  const m = KZ, b = $("kzBody2"), qs = m.questions || [], ans = {};
  b.innerHTML = `<p class="mapnote" style="margin-top:0">会話を聞いて答えます。▶ で、答えの手がかりになる行をもう一度聞けます。</p>
    <ol class="quiz">${qs.map((q, i) => `<li data-q="${i}"><p class="qq"><span class="num">Q${i + 1}</span>${esc(q.q)}</p>
      <div class="qch">${q.choices.map((c, k) => `<button type="button" data-a="${k}">${esc(c)}</button>`).join("")}</div><div class="qr" hidden></div></li>`).join("")}</ol>
    <div id="qzScore"></div>`;
  b.querySelectorAll(".quiz li").forEach(li => li.querySelectorAll("[data-a]").forEach(btn => btn.addEventListener("click", () => {
    const i = +li.dataset.q, q = qs[i];
    if (i in ans) return;
    ans[i] = +btn.dataset.a === q.answer;
    li.querySelectorAll("[data-a]").forEach(x => { x.disabled = true; x.classList.toggle("right", +x.dataset.a === q.answer); x.classList.toggle("wrong", x === btn && !ans[i]); });
    const r = li.querySelector(".qr"); r.hidden = false;
    r.innerHTML = `<b>${ans[i] ? "正解！" : "おしい！"}</b>${esc(q.explain || "")}${Number.isInteger(q.line) && m.lines[q.line] ? `<button type="button" class="btn ghost sm2" data-ql="${q.line}">▶ 手がかりの行を聞く</button><span class="qline">${esc(m.lines[q.line].en)}</span>` : ""}`;
    const ql = r.querySelector("[data-ql]"); if (ql) ql.addEventListener("click", () => { hush(); const k = +ql.dataset.ql; speak(m.lines[k].en, (kzA(m).lines || [])[k]); });
    if (Object.keys(ans).length === qs.length){ const ok = Object.values(ans).filter(Boolean).length; $("qzScore").innerHTML = `<p class="rpdone"><b class="num">${ok} / ${qs.length}</b> 問 正解</p>`; kzDone({step: "quiz", ok, n: qs.length}); }
  })));
}
function lsScript(){
  const m = KZ, b = $("kzBody2");
  b.innerHTML = `<p class="mapnote" style="margin-top:0">英文を見ながら聞きます。「ロールプレイ」では、相手の行が流れたあと、<b>あなたの行</b>を自分で言います（言えたらお手本で答え合わせ）。☆ で行ごと、単語のタップで1語ずつ単語集に入れられます。</p>
    <div class="kzbar"><button class="btn" type="button" id="lsAll">▶ 通しで聞く</button><button class="btn" type="button" id="lsRole">🎭 ロールプレイ</button>${rateBar()}</div>
    <ol class="lines script">${m.lines.map((x, i) => `<li class="ln ${x.sp}" data-i="${i}"><span class="who">${x.sp === "partner" ? "相手" : "あなた"}</span>
      <div class="lb"><p class="en">${wordSpans(x.en)}</p><p class="ja">${esc(x.ja)}</p></div><button class="play sm" type="button" data-ln="${i}" aria-label="この行を聞く">▶</button>${wdStar(x.en, `data-ws="l:${i}"`)}</li>`).join("")}</ol>`;
  bindRate(b);
  b.querySelectorAll("[data-ln]").forEach(x => x.addEventListener("click", () => { hush(); const i = +x.dataset.ln; playLines(b, i, i + 1); }));
  $("lsAll").addEventListener("click", () => { hush(); playLines(b, 0, m.lines.length); });
  $("lsRole").addEventListener("click", async () => { hush(); if (await playLines(b, 0, m.lines.length, {role: true, check: true})) kzDone({step: "role"}); });
}
function lsPhrase(){
  const m = KZ, b = $("kzBody2"), A = kzA(m);
  b.innerHTML = `<ul class="gcards">${(m.phrases || []).map((p, i) => `<li class="gc"><div class="gsent"><button class="play" type="button" data-ph2="${i}" aria-label="聞く">▶</button><q>${esc(p.en)}</q>${wdStar(p.en, `data-ws="p:${i}"`)}</div>
    <p class="gexp"><b>${esc(p.ja)}</b><br>${esc(p.note || "")}</p></li>`).join("")}</ul>`;
  b.querySelectorAll("[data-ph2]").forEach(x => x.addEventListener("click", () => { hush(); const i = +x.dataset.ph2; speak(m.phrases[i].en, (A.phrases || [])[i]); }));
}

/* ---------- 毎日の筋トレ：1分間の感情スピーキング ---------- */
const drillLog = () => { try { return JSON.parse(store("kz-drill") || "[]"); } catch (e) { return []; } };
const dayKey = t => { const d = new Date(t); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
function drillStats(){
  const l = drillLog(), by = {};
  l.forEach(x => { const k = dayKey(x.t); (by[k] = by[k] || {reps: 0, sec: 0}); by[k].reps += x.reps; by[k].sec += x.sec; });
  const today = dayKey(Date.now());
  let streak = 0; for (let i = 0; ; i++){ const k = dayKey(Date.now() - i * 864e5); if (by[k] && by[k].reps) streak++; else if (i) break; else continue; }
  return {by, today: (by[today] || {}).reps || 0, streak, total: l.reduce((s, x) => s + x.reps, 0), min: Math.round(l.reduce((s, x) => s + x.sec, 0) / 60)};
}
function drillGraph(by){
  const days = [...Array(14)].map((_, i) => dayKey(Date.now() - (13 - i) * 864e5)), max = Math.max(5, ...days.map(d => (by[d] || {}).reps || 0));
  const W = 320, H = 120, bw = W / 14;
  return `<svg class="dgraph" viewBox="0 0 ${W} ${H + 18}" role="img" aria-label="この2週間の回数">
    ${days.map((d, i) => { const v = (by[d] || {}).reps || 0, h = Math.round(v / max * H); return `<rect x="${i * bw + 3}" y="${H - h}" width="${bw - 6}" height="${Math.max(h, v ? 2 : 0)}" rx="4" class="${i === 13 ? "td" : ""}"></rect>${v ? `<text x="${i * bw + bw / 2}" y="${H - h - 4}" text-anchor="middle">${v}</text>` : ""}<text class="dl" x="${i * bw + bw / 2}" y="${H + 14}" text-anchor="middle">${+d.slice(8)}</text>`; }).join("")}
    <line x1="0" x2="${W}" y1="${H}" y2="${H}" class="base"></line></svg>`;
}
let DR = null;
function drillSource(){
  const ps = kzList().filter(m => (m.paras || []).length).flatMap(m => m.paras.map((p, i) => ({m, p, h: (kzA(m).paras || [])[i]})));
  if (!ps.length) return null;
  const pick = +(store("kz-drill-pick") || 0), day = Math.floor(Date.now() / 864e5);
  return ps[(day + pick) % ps.length];
}
function renderDrill(){
  const box = $("kzwrap"), st = drillStats(), src = drillSource();
  box.innerHTML = `<button class="more kzback" type="button" id="kzBack">← 会話の練習へ</button>
    <div class="sec-h"><h2>${SPARK}1分間の感情スピーキング</h2><p>英語の語順の日本語を声に出して読む → 目を閉じて場面をイメージ → イメージどおりに英語で話す。1回できたら「できた」。1分で何回できるかの筋トレです。</p></div>
    <div class="dstats"><div><b class="num">${st.today}</b><span>今日の回数</span></div><div><b class="num">${st.streak}</b><span>連続日数</span></div><div><b class="num">${st.total}</b><span>これまでの回数</span></div><div><b class="num">${st.min}</b><span>合計（分）</span></div></div>
    ${src ? `<div class="drill" id="drBox">
      <div class="dr-h"><span class="kb lv">${esc(src.m.title)}・段落${src.p.n}</span><button type="button" class="more" id="drNext">別の段落にする</button></div>
      <div class="drsteps"><span data-ds="1" class="on">① 語順の日本語を音読</span><span data-ds="2">② イメージ</span><span data-ds="3">③ 英語で話す</span></div>
      <p class="drtext" id="drText">${orderHtml(src.p.order)}</p>
      <div class="drtimer"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" class="bg"/><circle cx="40" cy="40" r="34" class="fg" id="drRing"/></svg><b class="num" id="drSec">60</b></div>
      <div class="acts" style="justify-content:center"><button class="btn big" type="button" id="drGo">1分スタート</button><button class="btn big ghost" type="button" id="drOne" disabled>できた！ <span class="num" id="drN">0</span></button></div>
      <div class="acts" style="justify-content:center"><button class="btn ghost sm2" type="button" id="drModel">▶ お手本</button><button class="btn ghost sm2" type="button" id="drEn">英語を見る</button></div>
      <p class="pen" id="drEnT" hidden>${esc(src.p.en)}</p></div>`
      : `<div class="note">教材ができると、ここで毎日の筋トレができます。</div>`}
    <h3 class="spot-h">この2週間</h3><div class="panel" style="padding:12px 14px">${drillGraph(st.by)}</div>
    <p class="qnote">記録はこの端末にだけ残ります（ベータ版）。</p>`;
  $("kzBack").addEventListener("click", () => { hush(); drillStop(false); KZ = "conv"; renderKz(); });
  if (!src) return;
  $("drNext").addEventListener("click", () => { store("kz-drill-pick", String(+(store("kz-drill-pick") || 0) + 1)); drillStop(false); renderDrill(); });
  $("drModel").addEventListener("click", () => { hush(); speak(src.p.en, src.h); });
  $("drEn").addEventListener("click", e => { const t = $("drEnT"); t.hidden = !t.hidden; e.currentTarget.textContent = t.hidden ? "英語を見る" : "英語をかくす"; });
  const stepOn = k => box.querySelectorAll("[data-ds]").forEach(x => x.classList.toggle("on", +x.dataset.ds === k));
  $("drOne").addEventListener("click", () => {
    if (!DR) return;
    DR.reps++; $("drN").textContent = DR.reps;
    DR.cycle = 0; stepOn(1); $("drText").classList.remove("hide");
  });
  $("drGo").addEventListener("click", () => {
    if (DR){ drillStop(true); return; }
    DR = {t0: Date.now(), reps: 0, cycle: 0};
    $("drGo").textContent = "おわる"; $("drOne").disabled = false; $("drN").textContent = "0";
    const ring = $("drRing"), C = 213.6;
    DR.iv = setInterval(() => {
      const el = (Date.now() - DR.t0) / 1000, left = Math.max(0, 60 - el);
      $("drSec").textContent = Math.ceil(left); ring.style.strokeDashoffset = String(C * (1 - left / 60));
      // 1回の中の流れ：音読（〜6秒）→ イメージ（3秒・日本語をうすく）→ 英語で話す（日本語をかくす）
      DR.cycle += 0.2;
      if (DR.cycle < 6){ stepOn(1); $("drText").classList.remove("dim", "hide"); }
      else if (DR.cycle < 9){ stepOn(2); $("drText").classList.add("dim"); }
      else { stepOn(3); $("drText").classList.remove("dim"); $("drText").classList.add("hide"); }
      if (left <= 0) drillStop(true);
    }, 200);
  });
}
function drillStop(save){
  if (!DR) return;
  clearInterval(DR.iv);
  const sec = Math.min(60, Math.round((Date.now() - DR.t0) / 1000)), reps = DR.reps;
  DR = null;
  if (save && (reps || sec >= 10)){
    const l = drillLog(); l.push({t: Date.now(), reps, sec}); store("kz-drill", JSON.stringify(l.slice(-1000)));
    if (apiOn()) api("/api/log", {kind: "drill", reps, sec}).catch(() => {});
    if (KZ === "drill"){ renderDrill(); const b = $("drBox"); if (b) b.insertAdjacentHTML("afterbegin", `<p class="drdone">${reps}回できました！${reps >= 3 ? "いいペースです" : "あしたは1回ふやしてみましょう"}</p>`); }
  }
}

/* ================= 私の単語集：教材の単語・フレーズを保存して、復習する ================= */
/* 教材の英語の単語をタップ → 単語かその文を保存。文法の例文・聞き取りのポイント・スクリプトの行は ☆ で保存。
   記録はこの端末に残し、中継があれば端末のあいだで同期する（_part_sync.js）。復習は間をあけてくり返す（その日・1日・3日・7日・14日・30日） */
const WD_GAP = [0, 1, 3, 7, 14, 30];
const wdList = () => { try { return JSON.parse(store("kz-words") || "[]"); } catch (e) { return []; } };
const wdPut = l => { store("kz-words", JSON.stringify(l.slice(-2000))); syncDirty(); };
const wdKey = s => String(s || "").toLowerCase().replace(/[^a-z0-9' ]/g, "").replace(/\s+/g, " ").trim();
const wdHas = en => wdList().some(x => wdKey(x.en) === wdKey(en));
const wdDue = x => (x.due || 0) <= Date.now();
const wdDone = x => (x.box || 0) >= WD_GAP.length - 1;
function wdAdd(item){
  const en = String(item.en || "").trim(); if (!en) return false;
  const l = wdList();
  if (l.some(x => wdKey(x.en) === wdKey(en))){ toast("もう単語集に入っています"); return false; }
  l.push({id: "w" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), en, ja: item.ja || "", note: item.note || "", ctx: item.ctx || "",
    kind: /\s/.test(en) ? "phrase" : "word", from: item.from || null, h: item.h || "", t: Date.now(), u: Date.now(), box: 0, due: Date.now(), n: 0});
  wdPut(l); toast(`「${en.length > 28 ? en.slice(0, 28) + "…" : en}」を単語集に入れました`);
  wdLog("add");
  return true;
}
function wdEdit(id, f){ const l = wdList(), x = l.find(y => y.id === id); if (!x) return; f(x); x.u = Date.now(); wdPut(l); }   // u＝更新日時（同期でどちらを残すか）
// 学習した日（ストリーク用）：単語集の保存・復習も「学習」に数える
function wdLog(kind){ const l = (() => { try { return JSON.parse(store("kz-wdlog") || "[]"); } catch (e) { return []; } })(); l.push({t: Date.now(), k: kind}); store("kz-wdlog", JSON.stringify(l.slice(-3000))); }
const wdFrom = () => KZ && typeof KZ === "object" ? {id: KZ.id, title: KZ.title} : null;
const wdStar = (en, attrs) => `<button type="button" class="wdstar${wdHas(en) ? " on" : ""}" ${attrs} aria-label="単語集に入れる" title="単語集に入れる">${wdHas(en) ? "★" : "☆"}</button>`;

/* ---------- 教材の中で：英語の単語をタップすると、下にバーが出る（単語を入れる／この文を入れる） ---------- */
let WDBAR = null;
function wdBarHide(){ if (WDBAR) WDBAR.hidden = true; document.querySelectorAll(".wd.pick").forEach(s => s.classList.remove("pick")); }
function wdBarShow(span){
  const box = span.closest("p") || span.parentElement, spans = [...box.querySelectorAll(".wd")], k = spans.indexOf(span);
  const words = spans.map(s => s.textContent), word = words[k].replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, "");
  if (!word) return;
  // その単語を含む1文（「.」「!」「?」で区切る）
  let a = k, b = k;
  while (a > 0 && !/[.!?]["’”)]*$/.test(words[a - 1])) a--;
  while (b < words.length - 1 && !/[.!?]["’”)]*$/.test(words[b])) b++;
  const sent = words.slice(a, b + 1).join(" ");
  const m = KZ && typeof KZ === "object" ? KZ : null, li = span.closest("[data-i]"), i = li ? +li.dataset.i : -1;
  const line = m && m.lines && span.closest(".ln") ? m.lines[i] : null, para = m && m.paras && span.closest("#kzParas") ? m.paras[i] : null;
  const ja = line && sent === line.en.trim() ? line.ja : "";
  if (!WDBAR){
    WDBAR = document.createElement("div"); WDBAR.className = "wdbar"; WDBAR.setAttribute("role", "dialog"); WDBAR.setAttribute("aria-label", "単語集に入れる");
    document.body.appendChild(WDBAR);
  }
  document.querySelectorAll(".wd.pick").forEach(s => s.classList.remove("pick")); span.classList.add("pick");
  WDBAR.innerHTML = `<b class="wb-w">${esc(word)}</b><span class="wb-s">${esc(sent)}</span>
    <div class="acts"><button class="btn sm2" type="button" data-wb="word">＋ 単語を入れる</button><button class="btn ghost sm2" type="button" data-wb="sent">＋ この文を入れる</button><button type="button" class="pb-x" data-wb="x" aria-label="閉じる">×</button></div>`;
  WDBAR.hidden = false;
  WDBAR.querySelector('[data-wb="word"]').addEventListener("click", () => { wdAdd({en: word, ctx: sent, note: para ? "段落の日本語：" + para.ja : ja ? "文の意味：" + ja : "", from: wdFrom()}); wdBarHide(); });
  WDBAR.querySelector('[data-wb="sent"]').addEventListener("click", () => { wdAdd({en: sent, ja, note: !ja && para ? "段落の日本語：" + para.ja : "", from: wdFrom(), h: line && ja ? ((kzA(m).lines || [])[i] || "") : ""}); wdBarHide(); });
  WDBAR.querySelector('[data-wb="x"]').addEventListener("click", wdBarHide);
}
document.addEventListener("click", e => {
  const s = e.target.closest("#kzwrap .wd");
  if (s){ wdBarShow(s); return; }
  if (WDBAR && !WDBAR.hidden && !e.target.closest(".wdbar")) wdBarHide();
});
// ☆ ボタン（文法の例文・聞き取りのポイント・スクリプトの行）
document.addEventListener("click", e => {
  const b = e.target.closest("[data-ws]"); if (!b || !KZ || typeof KZ !== "object") return;
  const m = KZ, A = kzA(m), [kind, i] = b.dataset.ws.split(":"), k = +i;
  const it = kind === "g" ? {en: m.grammar[k].sentence, note: `${m.grammar[k].category}：${m.grammar[k].explain}`, h: (A.grammar || [])[k]}
    : kind === "p" ? {en: m.phrases[k].en, ja: m.phrases[k].ja, note: m.phrases[k].note || "", h: (A.phrases || [])[k]}
    : kind === "x" ? {en: m.wishes[k].better, note: `言いたかった場面：${m.wishes[k].situation}${m.wishes[k].you_said ? "（実際は：" + m.wishes[k].you_said + "）" : ""}`}
    : {en: m.lines[k].en, ja: m.lines[k].ja, h: (A.lines || [])[k]};
  if (wdHas(it.en)){ toast("もう単語集に入っています"); return; }
  if (wdAdd({...it, from: wdFrom()})){ b.classList.add("on"); b.textContent = "★"; }
});
window.addEventListener("pagehide", wdBarHide);

/* ---------- 復習リスト ---------- */
let WDF = "due", WDQ = null;
function renderWords(){
  const box = $("kzwrap"), l = wdList();
  if (WDQ) return renderWdCard();
  const due = l.filter(x => wdDue(x) && !wdDone(x)), done = l.filter(wdDone);
  const show = l.filter(x => WDF === "all" || (WDF === "due" ? wdDue(x) && !wdDone(x) : WDF === "done" ? wdDone(x) : x.kind === WDF)).slice().reverse();
  const F = [["due", "復習待ち", due.length], ["all", "すべて", l.length], ["word", "単語", l.filter(x => x.kind === "word").length], ["phrase", "フレーズ", l.filter(x => x.kind === "phrase").length], ["done", "覚えた", done.length]];
  box.innerHTML = `<div class="sec-h"><h2>${SPARK}私の単語集</h2><p>教材で保存した単語・フレーズです。「覚えた」を押すたびに、次の復習まで1日・3日・7日…と間があきます。</p></div>
    <div class="dstats"><div><b class="num">${l.length}</b><span>保存した数</span></div><div><b class="num">${due.length}</b><span>今日の復習</span></div><div><b class="num">${done.length}</b><span>覚えた</span></div><div><b class="num">${l.filter(x => new Date(x.t) >= new Date(Date.now() - 7 * 864e5)).length}</b><span>この7日で追加</span></div></div>
    ${l.length ? `<div class="acts" style="margin-bottom:12px"><button class="btn big" type="button" id="wdGo"${due.length ? "" : " disabled"}>${due.length ? `復習する（${due.length}こ）` : "今日の復習はおわり"}</button></div>` : ""}
    ${l.length ? `<div class="chips" role="group" aria-label="しぼりこみ">${F.map(([k, t, n]) => `<button type="button" data-wf="${k}" aria-pressed="${WDF === k}">${t} <span class="num">${n}</span></button>`).join("")}</div>` : ""}
    ${!l.length ? `<div class="note">まだ入っていません。教材の「語順で話す」で<b>英語</b>を表示して単語をタップするか、文法・スクリプト・聞き取りのポイントの ☆ を押すと、ここに入ります。</div>`
      : show.length ? `<ul class="wdlist">${show.map(x => `<li data-wid="${x.id}"><button class="play sm" type="button" data-wp="${x.id}" aria-label="聞く">▶</button>
        <div class="wd-b"><b>${esc(x.en)}</b>${x.ja ? `<span class="wd-ja">${esc(x.ja)}</span>` : ""}${x.note ? `<span class="wd-n">${esc(x.note)}</span>` : ""}${x.ctx && x.ctx !== x.en ? `<span class="wd-c">${esc(x.ctx)}</span>` : ""}
          <span class="wd-f">${x.from ? `<button type="button" class="more" data-kz="${esc(x.from.id)}">📘 ${esc(x.from.title)}</button>` : ""}<span class="num">${md(dayKey(x.t))} 追加</span>${wdDone(x) ? '<span class="good">覚えた</span>' : `<span>次の復習 ${wdDue(x) ? "今日" : md(dayKey(x.due))}</span>`}</span></div>
        <div class="wd-a"><button type="button" class="more" data-wm="${x.id}">意味を書く</button><button type="button" class="more del" data-wx="${x.id}">消す</button></div></li>`).join("")}</ul>`
      : `<p class="mapnote">この条件のものはありません。</p>`}
    <p class="qnote">${SYNC.on ? "単語集はこの端末に残し、同じリンクで開いたほかの端末とも同期します（ベータ版）。" : "単語集はこの端末にだけ残ります（ベータ版）。"}</p>`;
  bindCommon(box);
  if ($("wdGo")) $("wdGo").addEventListener("click", () => { WDQ = {ids: due.map(x => x.id), i: 0, ok: 0, open: false}; renderWords(); window.scrollTo(0, 0); });
  box.querySelectorAll("[data-wf]").forEach(b => b.addEventListener("click", () => { WDF = b.dataset.wf; renderWords(); }));
  box.querySelectorAll("[data-wp]").forEach(b => b.addEventListener("click", () => { const x = wdList().find(y => y.id === b.dataset.wp); if (x){ hush(); speak(x.en, x.h, {rate: 1}); } }));
  box.querySelectorAll("[data-wm]").forEach(b => b.addEventListener("click", () => {
    const x = wdList().find(y => y.id === b.dataset.wm); if (!x) return;
    const v = prompt(`「${x.en}」の意味やメモ`, x.ja || ""); if (v === null) return;
    wdEdit(x.id, y => { y.ja = v.trim(); }); renderWords();
  }));
  box.querySelectorAll("[data-wx]").forEach(b => b.addEventListener("click", () => {
    const x = wdList().find(y => y.id === b.dataset.wx); if (!x || !confirm(`「${x.en}」を単語集から消しますか？`)) return;
    const del = wdDel(); del[wdKey(x.en)] = Date.now(); store("kz-words-del", JSON.stringify(del));   // 消したことも同期する（ほかの端末からもどってこないように）
    wdPut(wdList().filter(y => y.id !== x.id)); renderWords();
  }));
}
// 復習カード：英語を見て意味を思い出す → 答えを見る → 覚えた／もう一度
function renderWdCard(){
  const box = $("kzwrap"), Q = WDQ, l = wdList(), x = l.find(y => y.id === Q.ids[Q.i]);
  if (!x){
    WDQ = null;
    box.innerHTML = `<button class="more kzback" type="button" id="kzBack">← 単語集へ</button>
      <div class="wdq done"><p class="rpdone"><b class="num">${Q.ok} / ${Q.ids.length}</b> こ 覚えていました</p><p class="mapnote">おつかれさま！「もう一度」にしたものは、あとでまた出ます。</p>
      <div class="acts" style="justify-content:center"><button class="btn" type="button" id="wdEnd">単語集にもどる</button></div></div>`;
    const back = () => { renderWords(); window.scrollTo(0, 0); };
    $("kzBack").addEventListener("click", back); $("wdEnd").addEventListener("click", back);
    wdLog("review");
    return;
  }
  box.innerHTML = `<button class="more kzback" type="button" id="kzBack">← 単語集へ（復習をやめる）</button>
    <div class="wdq"><span class="num rpn">${Q.i + 1} / ${Q.ids.length}</span>
      <p class="wdq-en">${esc(x.en)}</p><button class="play" type="button" id="wqPlay" aria-label="聞く">▶</button>
      ${Q.open ? `<div class="wdq-a">${x.ja ? `<b>${esc(x.ja)}</b>` : `<span class="mapnote">意味はまだ書いていません（一覧の「意味を書く」で入れられます）</span>`}${x.note ? `<p>${esc(x.note)}</p>` : ""}${x.ctx && x.ctx !== x.en ? `<p class="wd-c">${esc(x.ctx)}</p>` : ""}${x.from ? `<p class="wd-f">📘 ${esc(x.from.title)}</p>` : ""}</div>
        <div class="acts" style="justify-content:center"><button class="btn" type="button" id="wqOk">覚えた！</button><button class="btn ghost" type="button" id="wqNg">もう一度</button></div>`
      : `<p class="mapnote">意味を思い出して、声に出して言ってみましょう。</p><div class="acts" style="justify-content:center"><button class="btn big" type="button" id="wqOpen">答えを見る</button></div>`}</div>`;
  $("kzBack").addEventListener("click", () => { hush(); WDQ = null; renderWords(); });
  $("wqPlay").addEventListener("click", () => { hush(); speak(x.en, x.h, {rate: 1}); });
  if (!Q.open){ $("wqOpen").addEventListener("click", () => { Q.open = true; renderWdCard(); }); return; }
  const next = ok => {
    wdEdit(x.id, y => { y.n = (y.n || 0) + 1; y.box = ok ? Math.min(WD_GAP.length - 1, (y.box || 0) + 1) : 0; y.due = ok ? Date.now() + WD_GAP[y.box] * 864e5 - 36e5 : Date.now() + 10 * 6e4; y.last = Date.now(); });
    if (ok) Q.ok++; Q.i++; Q.open = false; hush(); renderWdCard();
  };
  $("wqOk").addEventListener("click", () => next(true));
  $("wqNg").addEventListener("click", () => next(false));
}
/* ================= AIと話す（Gemini Live）・音読チェック・AIに相談・練習の記録 ================= */
/* 中継（鍵をあずかるサーバー）があるときだけ使える。今は Mac mini の試作サーバー（localhost:8770）だけ。
   本番は CG_API に Cloudflare Workers のURLを入れる。音は必ずボタンを押してから鳴らす。録音はサーバーに残さない。 */
let CG_API = (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && location.port === "8770") ? "" : null;   // 中継のURL（公開版は public.json の relay）
let API_AUTH = null;                                                    // {u: 本人のページのID, k: リンクの鍵から作った合言葉}
const apiOn = () => CG_API !== null;
// 中継がないとき（デモ・鍵なし）は送らない。前は CG_API が null のまま "null/api/…" を GitHub Pages に POST して「エラー 405」になっていた
const noApiMsg = () => DEMO ? "デモ表示中なので、AIの機能は使えません（見た目だけ）。" + (store("cg-token") ? "上の「デモを終わる」で自分のページに戻ると使えます。" : "本人用のリンクで開くと使えます。") : "この機能は本人用のリンクで開いたときに使えます。";
const api = (path, body) => CG_API === null ? Promise.reject(new Error(noApiMsg())) : fetch(CG_API + path, {method: body ? "POST" : "GET",
  headers: {"Content-Type": "application/json", ...(API_AUTH ? {"x-cg-user": API_AUTH.u, "x-cg-key": API_AUTH.k} : {})}, ...(body ? {body: JSON.stringify(body)} : {})})
  .then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || ("エラー " + r.status)); return j; });
const PLACES = [["cafe", "カフェ"], ["bar", "バー"], ["meetup", "ミートアップ"], ["office", "オンライン会議"], ["airport", "空港"], ["hotel", "ホテル"], ["interview", "面接"],
  ["paris", "パリ・エッフェル塔の前"], ["beach", "海辺のカフェ"], ["nightmarket", "夜市"]];
// 自由に書いた場面は、いちばん近い背景を使う（その場で背景を作るのは中継ができてから）
function nearPlace(t, dflt){
  const R = [[/エッフェル|パリ|フランス|paris/i, "paris"], [/海|ビーチ|浜|beach/i, "beach"], [/夜市|屋台|市場|market/i, "nightmarket"], [/バー|飲み|居酒屋|パブ|bar|pub/i, "bar"],
    [/カフェ|喫茶|コーヒー|cafe|café/i, "cafe"], [/空港|飛行機|airport/i, "airport"], [/ホテル|hotel/i, "hotel"], [/面接|interview/i, "interview"], [/会議|オンライン|商談|オフィス|meeting/i, "office"], [/ミートアップ|イベント|交流|パーティ/i, "meetup"]];
  const hit = R.find(([re]) => re.test(t || "")); return hit ? hit[1] : dflt;
}
const talkLog = () => { try { return JSON.parse(store("kz-talks") || "[]"); } catch (e) { return []; } };
const TALKCFG = () => { try { return {mode: "chat", place: "cafe", acc: "US", gender: "女性", strength: "clear", theme: "", goal: "", place_text: "", ...JSON.parse(store("kz-talkcfg") || "{}")}; } catch (e) { return {}; } };
const MODES = [["chat", "会話", "外国の友だち・先生と自由に"], ["teacher", "先生モード", "自分の教材の内容を、会話の中で言えるように"], ["interview", "面接", "英語面接の練習"]];

/* ---------- 絵（背景と相手）：実在の写真は使わない。場面ごとのイラストを描く ---------- */
// 背景：AIで作った場面の絵（app/bg/*.webp）。ないときだけ下のイラストで代わりに
function sceneSvg(place){
  if (["cafe", "bar", "meetup", "office", "airport", "hotel", "interview", "paris", "beach", "nightmarket"].includes(place))
    return `<img class="scene" src="bg/${place}.webp" alt="" onerror="this.outerHTML=sceneDraw('${place}')">`;
  return sceneDraw(place);
}
window.sceneDraw = p => sceneDrawInner(p);
function sceneDrawInner(place){
  const P = {
    cafe: ["#F6E3C8", "#E7C9A0", `<rect x="0" y="210" width="400" height="90" fill="#9B6B43"/><rect x="0" y="200" width="400" height="14" fill="#7B5232"/>
      <g fill="#fff" opacity=".9"><rect x="40" y="60" width="90" height="70" rx="6"/><rect x="270" y="60" width="90" height="70" rx="6"/></g>
      <g fill="#C98B5A"><circle cx="70" cy="190" r="10"/><rect x="300" y="175" width="18" height="25" rx="4"/></g>
      <g stroke="#7B5232" stroke-width="3"><line x1="150" y1="20" x2="150" y2="70"/><line x1="250" y1="20" x2="250" y2="70"/></g>
      <g fill="#FFD27A"><circle cx="150" cy="78" r="10"/><circle cx="250" cy="78" r="10"/></g>`],
    bar: ["#2B2A4A", "#3E3463", `<rect x="0" y="215" width="400" height="85" fill="#4A2E2A"/><rect x="0" y="205" width="400" height="12" fill="#6B4236"/>
      <g fill="#F2B705" opacity=".85"><circle cx="60" cy="40" r="5"/><circle cx="120" cy="30" r="5"/><circle cx="200" cy="38" r="5"/><circle cx="280" cy="30" r="5"/><circle cx="340" cy="42" r="5"/></g>
      <g fill="#8FD3FE" opacity=".5"><rect x="30" y="90" width="14" height="40" rx="3"/><rect x="52" y="85" width="14" height="45" rx="3"/><rect x="330" y="88" width="14" height="42" rx="3"/><rect x="352" y="92" width="14" height="38" rx="3"/></g>`],
    meetup: ["#E8F1FB", "#CFE3F7", `<path d="M0 40 Q100 70 200 40 T400 40" stroke="#1A2F66" stroke-width="2" fill="none"/>
      <g>${[20, 60, 100, 140, 180, 220, 260, 300, 340, 380].map((x, i) => `<path d="M${x - 12} ${44 + (i % 2) * 4} l12 20 l12 -20z" fill="${["#F2B705", "#2F86D6", "#F06C9B", "#1BAF7A"][i % 4]}"/>`).join("")}</g>
      <g fill="#9DB7D8" opacity=".7"><circle cx="50" cy="190" r="22"/><rect x="28" y="210" width="44" height="90" rx="20"/><circle cx="350" cy="185" r="22"/><rect x="328" y="205" width="44" height="95" rx="20"/></g>`],
    office: ["#EAF0F6", "#D7E2EE", `<rect x="30" y="40" width="140" height="110" fill="#BFD8F2"/><g stroke="#fff" stroke-width="4"><line x1="100" y1="40" x2="100" y2="150"/><line x1="30" y1="95" x2="170" y2="95"/></g>
      <rect x="0" y="230" width="400" height="70" fill="#C8B8A2"/><rect x="250" y="70" width="120" height="80" rx="6" fill="#1A2F66"/><rect x="258" y="78" width="104" height="60" rx="3" fill="#8FC1F0"/>`],
    airport: ["#DCEEFB", "#BEDDF5", `<rect x="0" y="40" width="400" height="140" fill="#A9D2F2"/><g stroke="#fff" stroke-width="5"><line x1="100" y1="40" x2="100" y2="180"/><line x1="200" y1="40" x2="200" y2="180"/><line x1="300" y1="40" x2="300" y2="180"/></g>
      <path d="M230 100 l60 -8 l10 -12 l6 0 l-6 14 l30 -4 l4 6 l-34 8 l-10 14 l-6 0 l4 -14 l-58 8z" fill="#fff"/><rect x="0" y="230" width="400" height="70" fill="#8C9BAE"/>`],
    hotel: ["#F3EDE4", "#E5D8C5", `<rect x="0" y="210" width="400" height="90" fill="#6E4B35"/><rect x="0" y="200" width="400" height="14" fill="#B08D57"/>
      <rect x="150" y="50" width="100" height="40" rx="6" fill="#B08D57"/><text x="200" y="77" text-anchor="middle" font-size="16" font-weight="700" fill="#fff">HOTEL</text>
      <g fill="#E8C66E"><circle cx="60" cy="70" r="16"/><circle cx="340" cy="70" r="16"/></g>`],
    interview: ["#EEF1F5", "#DDE3EA", `<rect x="0" y="230" width="400" height="70" fill="#A7B4C2"/><rect x="40" y="50" width="70" height="90" fill="#C7D3E0"/><rect x="290" y="60" width="80" height="60" fill="#fff" stroke="#C7D3E0" stroke-width="4"/>
      <path d="M300 110 l15 -20 l12 12 l20 -26 l13 34z" fill="#9FC3A5"/>`],
  };
  const [a, b, art] = P[place] || P.cafe;
  return `<svg class="scene" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="400" height="300" fill="url(#sg)"/>${art}</svg>`;
}
function avatarSvg(p){
  // 国ごとに見た目を少し変える（髪の色・肌・服）。決まった型にしすぎないよう、組み合わせは名前から選ぶ
  const seed = [...(p.name || "x")].reduce((s, c) => s + c.charCodeAt(0), 0);
  const skins = ["#F4D3B5", "#E9B98F", "#D59C6E", "#B97A52", "#8D5A3B"], hairs = ["#3A2A1E", "#6B4226", "#A8743E", "#D6B370", "#1E1E1E"];
  const shirts = ["#2F86D6", "#1BAF7A", "#F06C9B", "#7C6CF0", "#F2B705", "#C9501F"];
  const skin = skins[(seed + {IN: 3, ES: 1, FR: 0, GB: 0, AU: 1, US: 2}[p.acc]) % skins.length], hair = hairs[(seed * 7) % hairs.length], shirt = shirts[seed % shirts.length];
  const f = p.gender === "女性";
  return `<svg class="avatar" viewBox="0 0 200 220" aria-label="${esc(p.name || "")}">
    <path d="M30 220 Q30 160 100 156 Q170 160 170 220z" fill="${shirt}"/><rect x="88" y="128" width="24" height="32" rx="8" fill="${skin}"/>
    ${f ? `<path d="M48 96 Q44 30 100 28 Q156 30 152 96 L156 150 Q130 160 128 120 L72 120 Q70 160 44 150z" fill="${hair}"/>` : `<path d="M54 84 Q52 34 100 32 Q148 34 146 84 Q140 58 100 56 Q60 58 54 84z" fill="${hair}"/>`}
    <ellipse cx="100" cy="92" rx="44" ry="50" fill="${skin}"/>
    ${f ? `<path d="M56 78 Q70 42 100 44 Q130 42 144 78 Q120 60 100 62 Q78 60 56 78z" fill="${hair}"/>` : `<path d="M58 72 Q70 40 100 40 Q132 40 142 72 Q124 58 100 58 Q76 58 58 72z" fill="${hair}"/>`}
    <g class="eyes"><ellipse cx="82" cy="90" rx="5" ry="6" fill="#2A2320"/><ellipse cx="118" cy="90" rx="5" ry="6" fill="#2A2320"/></g>
    <path d="M74 78 q8 -5 16 0 M110 78 q8 -5 16 0" stroke="#2A2320" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <ellipse cx="72" cy="108" rx="8" ry="4" fill="#F28C8C" opacity=".35"/><ellipse cx="128" cy="108" rx="8" ry="4" fill="#F28C8C" opacity=".35"/>
    <g class="mouth"><ellipse cx="100" cy="116" rx="12" ry="2.5" fill="#7A2E2E" id="tkMouth"/></g>
  </svg>`;
}

/* ---------- 入口：教材タブの一覧に「AIと話す」「練習の記録」を足す ---------- */
function talkEntry(){
  if (!apiOn() && DEMO) return `<div class="talkrow demo">
    <button type="button" class="talkcard" data-demo><span class="k">AIと会話</span><b>外国の方と1対1で話す</b><span>カフェ・バー・会議・面接…場面と相手を選んで、声で会話。終わったら添削。</span></button>
    <button type="button" class="talkcard kbc" id="kzKb"><span class="k">質問BOT（右下の「質問」）</span><b>抹茶ビジネス・講座の質問</b><span>情報ドキュメントと講座の記録の中だけから答えます</span></button>
    <button type="button" class="talkcard coach" data-demo><span class="k">AIコーチ</span><b>悩みを相談する</b><span>話す速さ・返事の速さ・音読・発音の悩みを、記録をもとに相談</span></button>
    <button type="button" class="talkcard rec" id="kzRec"><span class="k">練習の記録</span><b>成長を見る</b><span>会話・音読・筋トレの回数、返事の速さ、よく出る間違い</span></button></div>`;
  if (!apiOn()) return `<div class="talkcard off"><span class="k">AIと会話（準備中）</span><b>外国の方と1対1で話す練習</b><span>AIの相手と声で会話して、終わったら添削と次の課題が出ます。いまは運営のMacでだけ試せます。</span></div>`;
  const t = talkLog(), min = Math.round(t.reduce((s, x) => s + (x.seconds || 0), 0) / 60);
  return `<div class="talkrow"><button type="button" class="talkcard" id="kzTalk"><span class="k">AIと会話</span><b>外国の方と1対1で話す</b><span>カフェ・バー・会議・面接…場面と相手を選んで、声で会話。終わったら添削。</span><span class="tc-n num">${t.length}回・${min}分</span></button>
    <button type="button" class="talkcard rec" id="kzRec"><span class="k">練習の記録</span><b>成長を見る</b><span>会話・音読・筋トレの回数、返事の速さ、よく出る間違い</span></button>
    <button type="button" class="talkcard kbc" id="kzKb"><span class="k">質問BOT（右下の「質問」）</span><b>抹茶ビジネス・講座の質問</b><span>価格・MOQ・送料・サンプル・通関、講座で話していたこと…情報ドキュメントと講座の記録の中だけから答えます</span></button>
    <button type="button" class="talkcard coach" id="kzCoach"><span class="k">AIコーチ</span><b>悩みを相談する</b><span>話す速さ・返事の速さ・音読・発音の悩みを、記録をもとに相談</span></button></div>`;
}
function demoOnly(){ if (typeof toast === "function") toast("デモでは使えません。本人用のリンクで使えます"); else alert("デモでは使えません。本人用のリンクで使えます"); }
document.addEventListener("click", e => { if (e.target.closest("[data-demo]")){ e.preventDefault(); demoOnly(); } });
function bindTalkEntry(box){
  const a = box.querySelector("#kzTalk"), b = box.querySelector("#kzRec");
  if (a) a.addEventListener("click", () => { hush(); KZ = "talk"; renderKz(); window.scrollTo(0, 0); });
  if (b) b.addEventListener("click", () => { hush(); KZ = "records"; renderKz(); window.scrollTo(0, 0); });
  const c = box.querySelector("#kzCoach"); if (c) c.addEventListener("click", () => { hush(); KZ = "coach"; renderKz(); window.scrollTo(0, 0); });
  const k = box.querySelector("#kzKb"); if (k) k.addEventListener("click", () => { hush(); botOpen(); });
}

/* ---------- 会話の準備 ---------- */
function renderTalk(){
  const box = $("kzwrap"), c = TALKCFG();
  const themes = kzList().map(m => m.title);
  box.innerHTML = `<button class="more kzback" type="button" id="kzBack">← 会話の練習へ</button>
    <div class="sec-h"><h2>${SPARK}AIと会話</h2><p>場面と相手を選んで、声で会話します。相手は短く話すので、あなたがたくさん話せます。終わったら添削・言い直し・次の課題が出ます。</p></div>
    <div class="panel talkset">
      <div class="rq"><span class="rq-h">練習のしかた</span><div class="modes">${MODES.map(([k, l, d]) => `<button type="button" data-md="${k}" aria-pressed="${c.mode === k}"><b>${l}</b><span>${d}</span></button>`).join("")}</div>
        ${c.mode === "teacher" && !themes.length ? `<p class="mapnote warn">先生モードは教材を使います。教材ができてから選べます。</p>` : ""}</div>
      <div class="rq"><span class="rq-h">場面</span><div class="chips">${PLACES.map(([k, l]) => `<button type="button" data-pl="${k}" aria-pressed="${c.place === k}">${l}</button>`).join("")}</div>
        <input class="kzsel2" id="tkPlaceText" placeholder="自由に書く（例：友だちとカフェで、週末の旅行の話）" value="${esc(c.place_text || "")}"></div>
      <div class="rq"><span class="rq-h">相手</span><div class="chips">${Object.entries((SAMPLES || {}).partners || PV_FALLBACK).map(([k, p]) => `<button type="button" data-tacc="${k}" aria-pressed="${c.acc === k}">${flagOf(p.flag || k)} ${esc(p.label)}</button>`).join("")}</div>
        <div class="kzbar"><div class="kzrate" role="group">${["女性", "男性"].map(g => `<button type="button" data-tgd="${g}" aria-pressed="${c.gender === g}">${g}</button>`).join("")}</div>
        <div class="kzrate" role="group">${Object.entries(STRL).map(([k, l]) => `<button type="button" data-tst="${k}" aria-pressed="${c.strength === k}">${l}</button>`).join("")}</div></div></div>
      <div class="rq"><span class="rq-h">${c.mode === "teacher" ? "練習する教材" : "話したいテーマ（教材から選ぶか、自由に）"}</span><select class="kzsel2" id="tkTheme"><option value="">（教材を使わない）</option>${themes.map(t => `<option ${c.theme === t ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>
        <input class="kzsel2" id="tkGoal" placeholder="今日の目的（例：抹茶の強みを2つ伝えて、サンプルの話までする）" value="${esc(c.goal || "")}"></div>
      <label class="kzchk"><input type="checkbox" id="tkDuplex" ${store("kz-duplex") === "1" ? "checked" : ""}>イヤホンを使う（相手の話の途中でも話しかけられる）</label>
      <label class="kzchk"><input type="checkbox" id="tkAvatar" ${avOn() ? "checked" : ""}>顔を出す（アバター）<small>相手の顔が、声に合わせて口を動かします（試験中）</small></label>
      <div class="acts"><button class="btn big" type="button" id="tkGo">🎙 会話を始める</button></div>
      <p class="mapnote" id="tkNote">${apiOn() ? "マイクを使います。始めると相手から話しかけてきます。1回は最長10分。" : esc(noApiMsg())}</p>
    </div>`;
  $("kzBack").addEventListener("click", () => { talkEnd(false); KZ = "conv"; renderKz(); });
  const set = (k, v) => { const x = TALKCFG(); x[k] = v; x.place_text = $("tkPlaceText").value; x.goal = $("tkGoal").value; x.theme = $("tkTheme").value; store("kz-talkcfg", JSON.stringify(x)); renderTalk(); };
  box.querySelectorAll("[data-pl]").forEach(b => b.addEventListener("click", () => set("place", b.dataset.pl)));
  box.querySelectorAll("[data-md]").forEach(b => b.addEventListener("click", () => set("mode", b.dataset.md)));
  box.querySelectorAll("[data-tacc]").forEach(b => b.addEventListener("click", () => set("acc", b.dataset.tacc)));
  box.querySelectorAll("[data-tgd]").forEach(b => b.addEventListener("click", () => set("gender", b.dataset.tgd)));
  box.querySelectorAll("[data-tst]").forEach(b => b.addEventListener("click", () => set("strength", b.dataset.tst)));
  $("tkDuplex").addEventListener("change", e => store("kz-duplex", e.target.checked ? "1" : null));
  $("tkAvatar").addEventListener("change", e => store("kz-avatar", e.target.checked ? "1" : "0"));
  $("tkGo").addEventListener("click", () => {
    if (!apiOn()){ $("tkNote").textContent = noApiMsg(); return; }   // デモでは会話を始めない（中継につながない）
    const av = avOn() ? avPrep() : null;                            // 顔を出すときは、このタップの中で映像・音の部品を作って鳴らせる状態にする（iPhone はタップの中でないと音が出ない）
    const x = TALKCFG(); x.place_text = $("tkPlaceText").value.trim(); x.goal = $("tkGoal").value.trim(); x.theme = $("tkTheme").value; store("kz-talkcfg", JSON.stringify(x));
    let m = kzList().find(k => k.title === x.theme);
    if (x.mode === "teacher" && !m) m = kzList().find(k => (k.paras || []).length);
    if (x.mode === "teacher" && !m){ $("tkNote").textContent = "先生モードは教材を選んでください。"; avStop(av); return; }
    const theme = m ? `${m.title}：${(m.paras || []).map(p => p.en).join(" ").slice(0, 500) || (m.lines || []).map(l => l.en).join(" ").slice(0, 500)}` : "";
    const material = m ? {paras: (m.paras || []).map(p => p.en).concat((m.lines || []).filter(l => l.sp === "you").map(l => l.en)), qa: (m.qa || []).map(q => ({q: q.q, a: q.a}))} : null;
    talkStart({place: x.place, place_text: x.place_text, goal: x.goal, theme, material, level: (KZREQ().level || "英検準2級"),
               mode: x.mode === "teacher" ? "teacher" : (x.mode === "interview" || x.place === "interview") ? "interview" : "chat",
               partner: {acc: x.acc, gender: x.gender, strength: x.strength}}, av);
  });
}
const PV_FALLBACK = {US: {label: "アメリカ", flag: "US"}, GB: {label: "イギリス", flag: "GB"}, AU: {label: "オーストラリア", flag: "AU"}, IN: {label: "インド", flag: "IN"}, ES: {label: "スペイン", flag: "ES"}, FR: {label: "フランス", flag: "FR"}};

/* ---------- 会話（Gemini Live の WebSocket。マイク 16kHz → 相手の声 24kHz） ---------- */
let TK = null;
const b64 = buf => { let s = ""; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
const WORKLET = `class P extends AudioWorkletProcessor{constructor(){super();this.r=sampleRate/16000;this.a=0;this.s=0;this.c=0;this.b=[]}
process(i){const ch=i[0]&&i[0][0];if(!ch)return true;for(let k=0;k<ch.length;k++){this.s+=ch[k];this.c++;this.a+=1;if(this.a>=this.r){this.a-=this.r;this.b.push(this.s/this.c);this.s=0;this.c=0}}
if(this.b.length>=640){const o=new Int16Array(this.b.length);for(let k=0;k<this.b.length;k++){const v=Math.max(-1,Math.min(1,this.b[k]));o[k]=v<0?v*32768:v*32767}this.port.postMessage(o.buffer,[o.buffer]);this.b=[]}return true}}
registerProcessor("cg-mic",P);`;
async function talkStart(cfg, av){
  const box = $("kzwrap"); hush();
  $("tkGo").disabled = true; $("tkNote").textContent = "つないでいます…";
  let tok;
  try { tok = await api("/api/live-token", cfg); } catch (e) { $("tkNote").textContent = e.message; $("tkGo").disabled = false; avStop(av); return; }
  const p = tok.partner, place = cfg.place_text ? nearPlace(cfg.place_text, cfg.place) : cfg.place;
  TK = {cfg, p, tr: [], t0: 0, srcs: [], playHead: 0, speaking: false, duplex: store("kz-duplex") === "1", usage: {}, av};
  box.innerHTML = `<div class="talk">
    <div class="stage">${sceneSvg(place)}<div class="av">${avatarSvg(p)}</div>${av ? `<div class="avv" id="tkAvv"></div><div class="avnote" id="tkAvNote">顔を準備中…（先に声だけで始まります）</div>` : ""}
      <div class="tag">${flagOf(p.acc)} ${esc(p.name)}<small>${esc((PV_FALLBACK[p.acc] || {}).label || "")}・${p.strength === "strong" ? "なまり強め" : "きれいな発音"}</small></div>
      <div class="tkstate" id="tkState">つないでいます…</div><div class="tktime num" id="tkTime">0:00</div></div>
    <div class="cap" id="tkCap"></div>
    <div class="acts" style="justify-content:center"><button class="btn big stop" type="button" id="tkEnd">会話を終わる</button><label class="kzchk"><input type="checkbox" id="tkSub" checked>字幕</label></div>
    <p class="mapnote" style="text-align:center">相手が話し終わったら、あなたの番です。分からないときは "Sorry, could you say that again?" でOK。</p></div>`;
  $("tkEnd").addEventListener("click", () => talkEnd(true));
  $("tkSub").addEventListener("change", e => $("tkCap").classList.toggle("off", !e.target.checked));
  if (av){ $("tkAvv").append(av.video, av.audio); avStart(av, p.gender); }
  try {
    const ctx = TK.ctx = (av && av.ctx) || new (window.AudioContext || window.webkitAudioContext)();
    if (av) av.ctx = null;                                          // タップの中で作った AudioContext を会話の声に使う（閉じるのは talkEnd）
    await ctx.resume();
    TK.mic = await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1}});
    await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], {type: "application/javascript"})));
    const src = ctx.createMediaStreamSource(TK.mic), node = TK.node = new AudioWorkletNode(ctx, "cg-mic"), sink = ctx.createGain();
    sink.gain.value = 0; src.connect(node); node.connect(sink); sink.connect(ctx.destination);
    TK.an = ctx.createAnalyser(); TK.an.fftSize = 512; TK.an.connect(ctx.destination);
    const ws = TK.ws = new WebSocket("wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=" + encodeURIComponent(tok.token));
    ws.onopen = () => ws.send(JSON.stringify({setup: {model: tok.model}}));
    ws.onmessage = async ev => {
      const m = JSON.parse(typeof ev.data === "string" ? ev.data : await ev.data.text());
      if (m.setupComplete){
        TK.t0 = Date.now(); $("tkState").textContent = "相手が話しはじめます";
        TK.tick = setInterval(talkTick, 250);
        node.port.onmessage = e => {
          if (!TK || TK.ws.readyState !== 1) return;
          if (TK.av) avMic(TK.av, e.data);
          const silent = !TK.duplex && TK.speaking;                 // イヤホンなし：相手が話している間はマイクを送らない（相手の声を拾わないように）
          TK.ws.send(JSON.stringify({realtimeInput: {audio: {data: b64(silent ? new ArrayBuffer(e.data.byteLength) : e.data), mimeType: "audio/pcm;rate=16000"}}}));
        };
        const kick = () => { if (TK && TK.ws === ws && ws.readyState === 1) ws.send(JSON.stringify({realtimeInput: {text: "(The learner has joined. Please start.)"}})); };
        if (av) Promise.race([av.ready, new Promise(r => setTimeout(r, 4000))]).then(kick);   // 顔がすぐ出そうなら、最初のあいさつから口を合わせる（待つのは4秒まで）
        else kick();
      }
      const sc = m.serverContent;
      if (sc){
        (sc.modelTurn && sc.modelTurn.parts || []).forEach(pt => { if (pt.inlineData) talkPlay(pt.inlineData.data); });
        if (sc.inputTranscription && sc.inputTranscription.text) talkCap("you", sc.inputTranscription.text);
        if (sc.outputTranscription && sc.outputTranscription.text) talkCap("partner", sc.outputTranscription.text);
        if (sc.interrupted){ TK.srcs.forEach(s => { try { s.stop(); } catch (e) {} }); TK.srcs = []; TK.playHead = 0; if (TK.av) avClear(TK.av); }
        if (sc.turnComplete){ TK.lastTurn = null; if (TK.av) avTurnEnd(TK.av); }
      }
      if (m.usageMetadata) TK.usage = m.usageMetadata;
      if (m.goAway) talkEnd(true);
    };
    ws.onclose = () => { if (TK && !TK.ending) { $("tkState").textContent = "接続が切れました"; talkEnd(true); } };
    ws.onerror = () => { $("tkState").textContent = "接続できませんでした"; };
  } catch (e) {
    $("tkState").textContent = /Permission|NotAllowed/.test(e.name || e.message) ? "マイクが許可されていません（設定 → Safari → マイク）" : "始められませんでした：" + e.message;
    talkEnd(false);
  }
}
function talkPlay(data){
  if (TK.av && avRoute(TK.av, data)) return;                       // 顔が出ているときは Simli に送り、声は映像の音から出す（ここでは鳴らさない）
  const ctx = TK.ctx, raw = atob(data), n = raw.length / 2, f = new Float32Array(n);
  for (let i = 0; i < n; i++){ let v = raw.charCodeAt(2 * i) | (raw.charCodeAt(2 * i + 1) << 8); if (v >= 32768) v -= 65536; f[i] = v / 32768; }
  const buf = ctx.createBuffer(1, n, 24000); buf.copyToChannel(f, 0);
  const s = ctx.createBufferSource(); s.buffer = buf; s.connect(TK.an);
  const at = Math.max(ctx.currentTime + 0.04, TK.playHead); s.start(at); TK.playHead = at + buf.duration;
  TK.srcs.push(s); s.onended = () => { TK && (TK.srcs = TK.srcs.filter(x => x !== s)); };
}
/* ---------- 相手の顔（Simli のアバター・試験中）。「顔を出す」が ON のときだけ動く（OFF のときはライブラリも鍵も取りに行かない）
   Gemini の声（24kHz）→ 16kHz にして Simli に送る。顔が出ている間の声は Simli の映像の音（<audio>）から出す（二重に鳴らさない）。
   つながるまで・つながらないときは、今までどおり Gemini の声をそのまま鳴らす。計測用の数字は window.__cgAvatarStats に ---------- */
const AV_FORCE = (location.search.match(/[?&]avatar=([01])(?:&|$)/) || [])[1] || null;
const avOn = () => AV_FORCE ? AV_FORCE === "1" : store("kz-avatar") === "1";
const AV_LIB = "./vendor/simli-3.0.2.js", AV_WAIT = 8000, AV_CHUNK = 3000;   // 3000サンプル＝6000バイト（Simli がちょうどよい大きさ）
const avNow = () => Math.round(performance.now());
const avStats = () => (window.__cgAvatarStats = window.__cgAvatarStats || {sessions: [], turns: []});
function avSilentWav(){                                               // 0.1秒の無音（タップの中で <audio> を一度鳴らすため）
  const n = 800, b = new DataView(new ArrayBuffer(44 + n * 2)), w = (o, t) => [...t].forEach((c, i) => b.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); b.setUint32(4, 36 + n * 2, true); w(8, "WAVEfmt "); b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, 1, true);
  b.setUint32(24, 8000, true); b.setUint32(28, 16000, true); b.setUint16(32, 2, true); b.setUint16(34, 16, true); w(36, "data"); b.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([b.buffer], {type: "audio/wav"}));
}
function avPrep(){
  // 会話を始めるタップの中で呼ぶ：映像（playsinline・muted）と音の部品を作り、音は一度鳴らしておく。ライブラリの読み込みもここで始める
  const video = document.createElement("video"), audio = document.createElement("audio");
  video.muted = true; video.autoplay = true; video.playsInline = true; ["muted", "autoplay", "playsinline"].forEach(a => video.setAttribute(a, ""));
  audio.autoplay = true; audio.setAttribute("playsinline", "");
  audio.src = avSilentWav(); audio.play().catch(() => {});
  const ctx = new (window.AudioContext || window.webkitAudioContext)(); ctx.resume().catch(() => {});
  const A = {video, audio, ctx, lib: import(AV_LIB).catch(e => ({err: e})), live: false, dead: false, route: "direct", speaking: false,
    buf: new Int16Array(AV_CHUNK * 4), bl: 0, rsPos: 1, rsLast: 0, inTurn: false, voiceEnd: 0};
  A.ready = new Promise(r => { A.readyRes = r; });
  return A;
}
async function avStart(A, gender){
  const s = {t0: avNow(), gender}; avStats().sessions.push(s); A.s = s;
  A.timer = setTimeout(() => { if (!A.live) avFail(A, `${AV_WAIT / 1000}秒でつながらなかった`); }, AV_WAIT);
  try {
    const [mod, t] = await Promise.all([A.lib, api("/api/simli-token", {partner: {gender}})]);
    if (mod.err) throw mod.err;
    s.token = avNow();
    if (A.dead) return;
    const c = A.client = new mod.SimliClient(t.session_token, A.video, A.audio, null, mod.LogLevel.ERROR, "livekit");
    c.on("start", () => {                                           // 最初の映像のコマが出た
      if (A.dead) return;
      A.live = true; clearTimeout(A.timer); s.start = avNow();
      A.video.parentNode && A.video.parentNode.classList.add("on"); document.querySelector(".stage .av") && document.querySelector(".stage .av").classList.add("vid");
      avNote("");
      try { c.sendAudioData(new Uint8Array(6000)); } catch (e) {}  // 無音を少し送って動かしはじめる（Simli の推奨）
      A.readyRes();
    });
    c.on("speaking", () => { A.speaking = true; const tr = avTurnStat(A); if (tr && !tr.simliSpeaking) tr.simliSpeaking = avNow(); });
    c.on("silent", () => { A.speaking = false; const tr = avTurnStat(A); if (tr) tr.simliSilent = avNow(); });
    c.on("startup_error", m => avFail(A, "startup_error " + m));
    c.on("error", m => avFail(A, "error " + m));
    c.on("stop", () => avFail(A, "stop"));
    await c.start();
  } catch (e) { avFail(A, String(e && e.message || e).slice(0, 200)); }
}
function avNote(text, warn){
  const el = $("tkAvNote"); if (!el) return;
  el.textContent = text; el.hidden = !text; el.classList.toggle("warn", !!warn);
  if (warn) setTimeout(() => { if (el.textContent === text) el.hidden = true; }, 6000);
}
// 顔の表示をやめる（why があれば「声だけで続けます」と小さく出す）。会話はそのまま声だけで続く
function avFail(A, why){
  if (!A || A.dead) return;
  const was = A.live;
  A.dead = true; A.live = false; A.route = "direct"; A.speaking = false; A.bl = 0;
  clearTimeout(A.timer); clearTimeout(A.ft);
  if (A.s){ A.s.end = avNow(); if (why) A.s.fail = why; }
  if (A.client) Promise.resolve().then(() => A.client.stop()).catch(() => {});   // Simli の分数を止める
  const box = A.video.parentNode; if (box) box.classList.remove("on");
  const av = document.querySelector(".stage .av"); if (av) av.classList.remove("vid");
  if (why) avNote(was ? "顔の表示が切れました。声だけで続けます" : "顔は出せませんでした。声だけで続けます", true);
  if (A.readyRes) A.readyRes();
}
function avStop(A){
  if (!A) return;
  avFail(A, null);
  try { A.audio.pause(); A.audio.srcObject = null; } catch (e) {}
  try { A.ctx && A.ctx.close(); } catch (e) {}
  A.ctx = null;
}
// ページを離れる・アプリを閉じるときは Simli を止める（分数を使わない）。会話は声だけで続く
["pagehide", "visibilitychange"].forEach(ev => addEventListener(ev, () => { if ((ev === "pagehide" || document.hidden) && TK && TK.av) avFail(TK.av, null); }));
function avTurnStat(A){ const t = avStats().turns; return t.length ? t[t.length - 1] : null; }
function avMic(A, buf){                                               // 自分の声が最後に聞こえた時刻（話し終わり→相手の声までの計測用）
  const d = new Int16Array(buf); let e = 0; for (let i = 0; i < d.length; i += 4) e += d[i] * d[i];
  if (Math.sqrt(e / (d.length / 4)) > 600) A.voiceEnd = avNow();
}
// Gemini の声の1かたまり：顔が出ていれば Simli に送って true（ここでは鳴らさない）。相手の話の途中で顔が出たときは、その話が終わるまで今までどおり鳴らす
function avRoute(A, data){
  if (!A.inTurn){ A.inTurn = true; avStats().turns.push({userEnd: A.voiceEnd || null, firstAudio: avNow(), route: A.live ? "simli" : "direct"}); }
  if (!A.live) return false;
  if (A.route !== "simli"){ if (TK.playHead > TK.ctx.currentTime + 0.02) return false; A.route = "simli"; }
  const n = avResample(A, data);
  avFlush(A, false);
  const at = Math.max(TK.ctx.currentTime + 0.3, TK.playHead); TK.playHead = at + n / 24000;   // 相手が話している目安（イヤホンなしのときマイクを止めるのに使う）
  return true;
}
// 24kHz → 16kHz：1.5サンプルごとに直線でつなぐ。前のかたまりの最後の1サンプルと、はんぱの位置を次へ持ちこす（つなぎ目でプチッとしない）。A.buf にためて、入力のサンプル数を返す
function avResample(A, data){
  const raw = atob(data), n = raw.length >> 1, x = new Float32Array(n + 1);
  x[0] = A.rsLast;
  for (let i = 0; i < n; i++){ let v = raw.charCodeAt(2 * i) | (raw.charCodeAt(2 * i + 1) << 8); if (v >= 32768) v -= 65536; x[i + 1] = v; }
  let pos = A.rsPos, k = 0; const out = new Int16Array(Math.ceil((n + 1) / 1.5) + 1);
  for (; pos < n; pos += 1.5){ const i = pos | 0, f = pos - i, v = x[i] + (x[i + 1] - x[i]) * f; out[k++] = v > 32767 ? 32767 : v < -32768 ? -32768 : Math.round(v); }
  A.rsPos = pos - n; A.rsLast = x[n];
  if (A.bl + k > A.buf.length){ const nb = new Int16Array((A.bl + k) * 2); nb.set(A.buf.subarray(0, A.bl)); A.buf = nb; }
  A.buf.set(out.subarray(0, k), A.bl); A.bl += k;
  return n;
}
// 6000バイトずつ送る。はんぱは少し待って（80ms）続きが来なければそのまま送る（遅れがたまらないように）
function avFlush(A, all){
  clearTimeout(A.ft);
  let o = 0;
  while (A.bl - o >= AV_CHUNK || (all && A.bl > o)){
    const k = Math.min(AV_CHUNK, A.bl - o), pcm = A.buf.slice(o, o + k); o += k;
    try { A.client.sendAudioData(new Uint8Array(pcm.buffer)); } catch (e) { avFail(A, "send " + e); return; }
  }
  if (o){ A.buf.copyWithin(0, o, A.bl); A.bl -= o; }
  if (A.bl && !all) A.ft = setTimeout(() => avFlush(A, true), 80);
}
// 相手の話をさえぎった：Simli の中にたまった分も消す（SKIP）
function avClear(A){
  A.bl = 0; A.rsPos = 1; A.rsLast = 0; A.inTurn = false; clearTimeout(A.ft);
  const tr = avTurnStat(A); if (tr && !tr.interrupted) tr.interrupted = avNow();
  if (A.live){ try { A.client.ClearBuffer(); } catch (e) {} A.speaking = false; }
}
// 計測・試験用（本番でも害はない）：いまの会話の状態を見る・声の変換を試す・添削なしで会話を終える
window.__cgAvatarDbg = {state: () => TK && {speaking: TK.speaking, av: TK.av && {live: TK.av.live, dead: TK.av.dead, route: TK.av.route, speaking: TK.av.speaking}},
  resample: avResample, flush: avFlush, clear: avClear, end: () => talkEnd(false)};
function avTurnEnd(A){
  A.inTurn = false;
  if (A.live && A.bl) avFlush(A, true);
  const tr = avTurnStat(A); if (tr && !tr.turnComplete) tr.turnComplete = avNow();
}
function talkCap(who, text){
  const last = TK.tr[TK.tr.length - 1];
  if (last && last.who === who && TK.lastTurn === who) last.text += text; else TK.tr.push({who, text: text.replace(/^\s+/, "")});
  TK.lastTurn = who;
  const el = $("tkCap"); if (!el) return;
  el.innerHTML = TK.tr.slice(-6).map(x => `<p class="${x.who === "you" ? "you" : "pt"}"><b>${x.who === "you" ? "あなた" : esc(TK.p.name)}</b>${esc(x.text)}</p>`).join("");
  el.scrollTop = el.scrollHeight;
}
function talkTick(){
  if (!TK || !TK.ctx) return;
  const sec = (Date.now() - TK.t0) / 1000;
  $("tkTime").textContent = Math.floor(sec / 60) + ":" + String(Math.floor(sec % 60)).padStart(2, "0");
  TK.speaking = TK.playHead > TK.ctx.currentTime + 0.05 || !!(TK.av && TK.av.speaking);
  const d = new Uint8Array(TK.an.fftSize); TK.an.getByteTimeDomainData(d);
  let rms = 0; for (const v of d) rms += ((v - 128) / 128) ** 2; rms = Math.sqrt(rms / d.length);
  const mouth = document.getElementById("tkMouth"); if (mouth) mouth.setAttribute("ry", String(2.5 + Math.min(12, rms * 90)));
  $("tkState").textContent = TK.speaking ? `${TK.p.name} が話しています` : "あなたの番です";
  document.querySelector(".stage") && document.querySelector(".stage").classList.toggle("yours", !TK.speaking);
  if (sec > 600) talkEnd(true);                                    // 1回は最長10分
}
async function talkEnd(review){
  if (!TK || TK.ending) return;
  const T = TK; T.ending = true;
  clearInterval(T.tick);
  try { T.ws && T.ws.close(); } catch (e) {}
  try { T.mic && T.mic.getTracks().forEach(t => t.stop()); } catch (e) {}
  try { T.srcs.forEach(s => s.stop()); } catch (e) {}
  avStop(T.av);
  try { T.ctx && T.ctx.close(); } catch (e) {}
  TK = null;
  if (!review) return;
  const seconds = T.t0 ? Math.round((Date.now() - T.t0) / 1000) : 0;
  api("/api/usage", {session: T.p.name, prompt: T.usage.promptTokenCount, response: T.usage.responseTokenCount, seconds}).catch(() => {});
  const box = $("kzwrap");
  box.innerHTML = `<div class="sec-h"><h2>${SPARK}今日の振り返り</h2><p id="tkRevH">${esc(T.p.name)}さんとの会話（${Math.floor(seconds / 60)}分${seconds % 60}秒）。添削を作っています…</p></div><div id="tkRev"><p class="loading">先生が文字起こしを読んでいます…</p></div>`;
  let r;
  try { r = await api("/api/review", {transcript: T.tr, scene: T.cfg.place_text || T.cfg.place, mode: T.cfg.mode, level: T.cfg.level, theme: T.cfg.theme, partner: T.cfg.partner, seconds}); }
  catch (e) { $("tkRev").innerHTML = `<p class="note">添削を作れませんでした（${esc(e.message)}）。</p>`; return; }
  const l = talkLog(); l.push({t: Date.now(), seconds, words: r.words || 0, place: T.cfg.place, partner: T.cfg.partner, score: r.score, fixes: (r.fixes || []).length,
    types: r.mistake_types || [], can: r.can_do || []}); store("kz-talks", JSON.stringify(l.slice(-300)));
  $("tkRevH").textContent = `${T.p.name}さんとの会話（${Math.floor(seconds / 60)}分${seconds % 60}秒）`;
  $("tkRev").innerHTML = r.empty ? `<p class="note">あなたの声がほとんど聞き取れませんでした。マイクの許可と、周りの音を確かめて、もう一度どうぞ。</p>` : reviewHtml(r)
    + `<div class="acts"><button class="btn" type="button" id="tkAgain">もう一度話す</button><button class="btn ghost" type="button" id="tkBack2">会話の練習へ</button></div>
    <details class="panel" style="margin-top:12px"><summary>会話の文字起こし</summary><div class="cap full">${T.tr.map(x => `<p class="${x.who === "you" ? "you" : "pt"}"><b>${x.who === "you" ? "あなた" : esc(T.p.name)}</b>${esc(x.text)}</p>`).join("")}</div></details>`;
  const a = $("tkAgain"); if (a) a.addEventListener("click", () => { KZ = "talk"; renderKz(); });
  const b = $("tkBack2"); if (b) b.addEventListener("click", () => { KZ = "conv"; renderKz(); });
}
function reviewHtml(r){
  const sc = r.score || {};
  return `<div class="rev"><p class="rsum">${esc(r.summary || "")}</p>
    <div class="rscore">${[["fluency", "なめらかさ"], ["accuracy", "正確さ"], ["reaction", "反応の速さ"]].map(([k, l]) => `<div><span>${l}</span><b class="num">${sc[k] || "-"}</b><small>/5</small></div>`).join("")}<div><span>話した語数</span><b class="num">${r.words || 0}</b></div></div>
    ${(r.good || []).length ? `<h4>よかったところ</h4><ul class="rg">${r.good.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
    ${(r.fixes || []).length ? `<h4>言い直すと、もっと伝わる</h4><ul class="rf">${r.fixes.map(f => `<li><s>${esc(f.you_said)}</s><b>${esc(f.better)}</b><span>${esc(f.why)}</span></li>`).join("")}</ul>` : ""}
    ${(r.rephrase || []).length ? `<h4>こう言いたかったときは</h4><ul class="rf">${r.rephrase.map(f => `<li><span>${esc(f.situation)}</span><b>${esc(f.phrase)}</b></li>`).join("")}</ul>` : ""}
    ${(r.next || []).length ? `<h4>次回の課題</h4><ol class="rn">${r.next.map(x => `<li>${esc(x)}</li>`).join("")}</ol>` : ""}</div>`;
}

/* ---------- 音読チェック（教材の段落を読んで録音 → 添削。録音はサーバーに残さない） ---------- */
let RC = null;
async function readCheck(btn, m, i){
  const out = btn.closest("li").querySelector(".rcout");
  if (RC){ RC.rec.stop(); return; }
  hush();
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: true, noiseSuppression: true}}); }
  catch (e) { out.innerHTML = `<p class="mapnote warn">マイクが許可されていません。</p>`; return; }
  const mime = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || "";
  const rec = new MediaRecorder(stream, mime ? {mimeType: mime} : {}), parts = [], t0 = Date.now();
  RC = {rec};
  btn.textContent = "■ 読み終わったら押す"; btn.classList.add("on");
  out.innerHTML = `<p class="mapnote">録音中…英文を声に出して読んでください。</p>`;
  rec.ondataavailable = e => e.data.size && parts.push(e.data);
  rec.onstop = async () => {
    stream.getTracks().forEach(t => t.stop()); RC = null; btn.textContent = "🎙 音読チェック"; btn.classList.remove("on");
    const blob = new Blob(parts, {type: rec.mimeType || mime || "audio/mp4"}), seconds = (Date.now() - t0) / 1000;
    out.innerHTML = `<p class="mapnote">聞いています…</p>`;
    const audio = b64(await blob.arrayBuffer());
    try {
      const r = await api("/api/read-check", {audio, mime: blob.type, seconds, script: m.paras[i].en, material: m.title, para: m.paras[i].n});
      const sc = r.score || {};
      out.innerHTML = `<div class="rev sm"><div class="rscore">${[["accuracy", "正確さ"], ["pronunciation", "発音"], ["fluency", "なめらかさ"]].map(([k, l]) => `<div><span>${l}</span><b class="num">${sc[k] || "-"}</b><small>/5</small></div>`).join("")}<div><span>速さ</span><b class="num">${r.wpm || "-"}</b><small>語/分</small></div></div>
        ${(r.skipped || []).length ? `<p><b>読み飛ばし・読みちがい：</b>${r.skipped.map(esc).join("、")}</p>` : `<p><b>読み飛ばしなし！</b></p>`}
        ${(r.pronunciation || []).length ? `<ul class="rf">${r.pronunciation.map(x => `<li><b>${esc(x.word)}</b><span>${esc(x.tip)}</span></li>`).join("")}</ul>` : ""}
        <p>${esc(r.pauses || "")}</p><p class="rnext">次は：${esc(r.next || "")}</p></div>`;
      const l = (() => { try { return JSON.parse(store("kz-reads") || "[]"); } catch (e) { return []; } })(); l.push({t: Date.now(), wpm: r.wpm, score: sc, id: m.id}); store("kz-reads", JSON.stringify(l.slice(-300)));
    } catch (e) { out.innerHTML = `<p class="mapnote warn">チェックできませんでした（${esc(e.message)}）</p>`; }
  };
  rec.start();
}

/* ---------- AIに日本語で相談して、教材を作るフォームの「場面」「話したいこと」に入れる ---------- */
let IV = null;
function interviewHtml(){ if (!apiOn() && DEMO) return `<div class="iv"><button type="button" class="btn ghost" data-demo>💬 AIに日本語で相談して作る</button></div>`; return apiOn() ? `<div class="iv"><button type="button" class="btn ghost" id="kzIv">💬 AIに日本語で相談して作る</button><div id="kzIvBox"></div></div>` : ""; }
function bindInterview(){
  const b = $("kzIv"); if (!b) return;
  b.addEventListener("click", () => { IV = []; b.hidden = true; ivStep(); });
}
async function ivStep(){
  const box = $("kzIvBox");
  box.innerHTML = `<div class="ivlog">${IV.map(x => `<p class="${x.who}">${esc(x.text)}</p>`).join("")}<p class="ai loading">…</p></div>`;
  let r; try { r = await api("/api/interview", {history: IV}); } catch (e) { box.innerHTML += `<p class="mapnote warn">${esc(e.message)}</p>`; return; }
  IV.push({who: "ai", text: r.say || ""});
  if (r.done && r.request){
    const x = KZREQ(); const q = r.request;
    x.kind = /両方/.test(q.kind) ? "両方" : /リスニング/.test(q.kind) ? "リスニング" : "スピーキング"; x.body = q.body || x.body;
    if (q.scene) { if (KZSCENES.includes(q.scene)) x.scene = q.scene; else { x.scene = "その他"; x.body = `場面：${q.scene}\n${x.body || ""}`; } }   // 選べる場面にないときは「その他」にして、話したいことの頭に書く
    saveReq(x);
  }
  box.innerHTML = `<div class="ivlog">${IV.map(x => `<p class="${x.who}">${esc(x.text)}</p>`).join("")}</div>
    ${r.done ? `<p class="mapnote">下の「場面」と「話したいこと」に入れました。確かめて「✨ 教材を作る」を押してください。</p>` : `<div class="ivin"><input class="kzsel2" id="kzIvIn" placeholder="ここに答える（声の入力もOK）"><button class="btn" type="button" id="kzIvSend">送る</button></div>`}`;
  if (r.done){ renderReqForm(); return; }
  const send = () => { const v = $("kzIvIn").value.trim(); if (!v) return; IV.push({who: "you", text: v}); ivStep(); };
  $("kzIvSend").addEventListener("click", send);
  $("kzIvIn").addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing) send(); });
  $("kzIvIn").focus();
}

/* ---------- AIコーチ（話す速さ・返事の速さ・音読・発音の悩みを、記録をもとに相談） ---------- */
let CO = null;
function myStats(){
  const st = drillStats(), rx = reactLog().filter(x => x.ms != null), rd = (() => { try { return JSON.parse(store("kz-reads") || "[]"); } catch (e) { return []; } })(), t = talkLog();
  const last = a => a.slice(-20);
  const types = {}; [...t, ...convLog()].forEach(x => (x.types || []).forEach(k => types[k] = (types[k] || 0) + 1));
  const ins = dyIns();
  return {会話の録音から作った教材: convLog().length, 英語日記とフリートーク: dyList().length + "回",
    ...(ins ? {日記からわかった癖: [...(ins.pron_habits || []), ...(ins.grammar_habits || [])].map(x => x.label), 今のToDo: dyOpenTodo().map(x => x.task)} : {}), 筋トレ: {今日: st.today, 連続日数: st.streak, 合計回数: st.total},
    返事の速さ: rx.length ? {回数: rx.length, 最近20回の平均秒: +(last(rx).reduce((s, x) => s + x.ms, 0) / last(rx).length / 1000).toFixed(1), 二秒以内の割合: Math.round(100 * rx.filter(x => x.ms <= 2000).length / rx.length) + "%"} : "まだ計っていない",
    スピード練習のベスト語毎分: kzLog().reduce((m, x) => Math.max(m, x.wpm || 0), 0) || "まだ",
    音読チェック: rd.length ? {回数: rd.length, 最近の速さ: rd.slice(-5).map(x => x.wpm)} : "まだ",
    AIと会話: {回数: t.length, 分: Math.round(t.reduce((s, x) => s + (x.seconds || 0), 0) / 60), よく出る間違い: Object.entries(types).sort((a, b) => b[1] - a[1]).slice(0, 5).map(x => x[0])}};
}
function renderCoach(){
  const box = $("kzwrap");
  if (!CO) CO = [];
  box.innerHTML = `<button class="more kzback" type="button" id="kzBack">← 会話の練習へ</button>
    <div class="sec-h"><h2>${SPARK}AIコーチに相談</h2><p>話すのが遅い、返事がすぐ出ない、音読がつっかえる…なんでも日本語でどうぞ。あなたの練習の記録を見ながら答えます。</p></div>
    <div class="ivlog coachlog" id="coLog">${CO.length ? CO.map(x => `<p class="${x.who}">${esc(x.text)}</p>`).join("") : `<p class="ai">こんにちは！あなたの記録を見ています。いま一番気になっていることは何ですか？</p>`}</div>
    <div class="chips">${["返事がすぐに出てこない", "話すスピードを上げたい", "音読でつっかえる", "発音に自信がない", "毎日続かない"].map(q => `<button type="button" data-cq="${q}">${q}</button>`).join("")}</div>
    <div class="ivin" style="margin-top:8px"><input class="kzsel2" id="coIn" placeholder="ここに書く（キーボードのマイクで話してもOK）"><button class="btn" type="button" id="coSend">送る</button></div>`;
  $("kzBack").addEventListener("click", () => { KZ = "conv"; renderKz(); });
  const send = async v => {
    v = (v || "").trim(); if (!v) return;
    CO.push({who: "you", text: v}); renderCoach();
    const lg = $("coLog"); lg.insertAdjacentHTML("beforeend", `<p class="ai loading">…</p>`);
    try { const r = await api("/api/coach", {history: CO, stats: myStats()}); CO.push({who: "ai", text: r.say + (r.try ? "\n\n今日やること：" + r.try : "")}); }
    catch (e) { CO.push({who: "ai", text: "いまは答えられませんでした（" + e.message + "）"}); }
    renderCoach(); window.scrollTo(0, document.body.scrollHeight);
  };
  box.querySelectorAll("[data-cq]").forEach(b => b.addEventListener("click", () => send(b.dataset.cq)));
  $("coSend").addEventListener("click", () => send($("coIn").value));
  $("coIn").addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing) send($("coIn").value); });
}

/* ---------- 練習の記録（成長の見える化） ---------- */
async function renderRecords(){
  const box = $("kzwrap"), st = drillStats(), t = talkLog(), rd = (() => { try { return JSON.parse(store("kz-reads") || "[]"); } catch (e) { return []; } })();
  const types = {}; [...t, ...convLog()].forEach(x => (x.types || []).forEach(k => types[k] = (types[k] || 0) + 1));
  const can = [...new Set(t.flatMap(x => x.can || []))].slice(-12);
  const words = t.reduce((s, x) => s + (x.words || 0), 0), tmin = Math.round(t.reduce((s, x) => s + (x.seconds || 0), 0) / 60);
  const wpms = rd.filter(x => x.wpm).map(x => x.wpm);
  box.innerHTML = `<div class="sec-h"><h2>${SPARK}練習の記録</h2><p>練習するほど、ここに自動でたまります。提出はいりません。</p></div>
    ${kzGoalHtml()}
    <div class="dstats rec4"><div><b class="num">${t.length}</b><span>AIと会話（回）</span></div><div><b class="num">${tmin}</b><span>会話（分）</span></div><div><b class="num">${words}</b><span>話した語数</span></div><div><b class="num">${st.total}</b><span>筋トレ（回）</span></div>
      <div><b class="num">${rd.length}</b><span>音読チェック（回）</span></div><div><b class="num">${wpms.length ? Math.max(...wpms) : "-"}</b><span>音読の最速（語/分）</span></div><div><b class="num">${st.streak}</b><span>筋トレの連続日数</span></div><div><b class="num">${kzLog().length}</b><span>教材の練習（回）</span></div></div>
    <h3 class="spot-h">筋トレ（この2週間）</h3><div class="panel" style="padding:12px 14px">${drillGraph(st.by)}</div>
    <h3 class="spot-h">返事の速さ（2秒応答）</h3>${reactTrend()}
    <h3 class="spot-h">よく出る間違い</h3>${Object.keys(types).length ? `<ul class="chips static">${Object.entries(types).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => `<li>${esc(k)}<span class="num">${n}</span></li>`).join("")}</ul>` : `<p class="mapnote">AIと会話すると、ここにたまります。</p>`}
    <h3 class="spot-h">できるようになった表現</h3>${can.length ? `<ul class="cando">${can.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p class="mapnote">AIと会話すると、ここにたまります。</p>`}
    <p class="qnote">記録はこの端末にあります。${apiOn() ? "会話と音読の添削は、文字起こしと評価だけを運営のサーバーにも残しています（録音は残しません）。" : ""}</p>`;
}

/* ================= 会話を録音 → 「言えたらよかった」がすぐ教材に（ワンタップ録音） ================= */
/* 外国の方と話すときに1タップで録音 → 終わったら中継が録音を聞いて、言葉に詰まったところ・日本語になったところから
   「こう言えたらよかった」と、オーダーメイド教材と同じ形の教材（語順で話す・シャドーイング・スピード・2秒応答・文法）を作る。
   録音は中継で解析したら捨てる（保存しない）。できた教材はこの端末に残す（kz-mine）。中継の記録は受講生の発言と教材だけ */
const CR_MAX = 600;                                                     // 1回は最長10分（それ以上は自動で止める）
let CR = null, CRDONE = null;                                           // 録音中のもの／止めたあとの録音（教材にする前）
const kzMine = () => { try { return JSON.parse(store("kz-mine") || "[]"); } catch (e) { return []; } };
const convLog = () => { try { return JSON.parse(store("kz-convs") || "[]"); } catch (e) { return []; } };
const isMine = m => !!(m && m.mine);

/* ---------- 練習タブのタイル（ホームには出さない。README「練習タブのタイル」） ---------- */
/* 1つのタイル = {id, icon, t, s()（説明）, open()（KZ を決める）, view()（KZ が id のときの画面）, after()（描いたあとに）}。並べるのは prTilesHtml() だけ、押したときは下の1つの click で開く。
   練習＞教材の「クイック練習」の .qtiles の最後に ${prTilesHtml()} で並べる（prTilesRow() は2列で単独に並べるとき）。中継なし（デモ）は「デモでは使えません」 */
const PR_TILES = [];
const prTilesHtml = (cls = "qtile prt-tile") => apiOn() || DEMO ? PR_TILES.map(x => `<button type="button" class="${cls}" ${apiOn() ? `data-prt="${x.id}"` : "data-demo"}><b>${x.icon} ${esc(x.t)}</b><span>${x.s()}</span></button>`).join("") : "";
const prView = () => { const x = typeof KZ === "string" && PR_TILES.find(t => t.id === KZ); if (x) x.view(); return !!x; };   // renderKz の頭で1行
const prTilesRow = () => apiOn() || DEMO ? `<div class="prt-row">${prTilesHtml("prt-tile")}</div>` : "";
document.addEventListener("click", e => {
  const b = e.target.closest("[data-prt]"), x = b && PR_TILES.find(t => t.id === b.dataset.prt); if (!x) return;
  hush(); x.open(); showTab("kz"); window.scrollTo(0, 0); if (x.after) x.after();          // showTab が renderKz まで描く
});
// 会話を録音：押したらすぐ録音が始まる（マイクの許可は押した流れのまま求める）
PR_TILES.push({id: "rec", icon: "🎙", t: "会話を録音", open: () => { KZ = "rec"; CRDONE = null; }, after: () => crStart(), view: () => renderRec(),
  s: () => { const n = convLog().length; return `外国の方と話すときに1タップ。「言えたらよかった」がすぐ教材に${n ? `（<b class="num">${n}</b>回）` : ""}`; }});

/* ---------- 録音 ---------- */
async function crStart(){
  if (CR) return;
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1}}); }
  catch (e) {
    if (KZ !== "rec") return;
    crScreen(); $("crNote").textContent = /Permission|NotAllowed/.test(e.name || e.message) ? "マイクが許可されていません（設定 → Safari → マイク）" : "録音を始められませんでした：" + e.message; return;
  }
  if (KZ !== "rec"){ stream.getTracks().forEach(t => t.stop()); return; }       // 許可を待つあいだに画面を離れた
  const mime = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || "";
  let rec;
  try { rec = new MediaRecorder(stream, {...(mime ? {mimeType: mime} : {}), audioBitsPerSecond: 32000}); }
  catch (e) { rec = new MediaRecorder(stream, mime ? {mimeType: mime} : {}); }
  const ctx = new (window.AudioContext || window.webkitAudioContext)(); ctx.resume().catch(() => {});
  const an = ctx.createAnalyser(); an.fftSize = 512; ctx.createMediaStreamSource(stream).connect(an);
  CR = {rec, stream, ctx, an, parts: [], t0: Date.now(), mime};
  rec.ondataavailable = e => e.data.size && CR && CR.parts.push(e.data);
  rec.onstop = () => {
    const T = CR; if (!T) return;
    CR = null; clearInterval(T.iv);
    try { T.stream.getTracks().forEach(t => t.stop()); T.ctx.close(); } catch (e) {}
    try { T.wake && T.wake.release(); } catch (e) {}
    if (T.drop){ CRDONE = null; return; }
    const seconds = Math.round((Date.now() - T.t0) / 1000);
    CRDONE = {blob: new Blob(T.parts, {type: T.rec.mimeType || T.mime || "audio/mp4"}), seconds};
    if (KZ === "rec") crScreen();
  };
  rec.start(1000);
  try { if (navigator.wakeLock) CR.wake = await navigator.wakeLock.request("screen"); } catch (e) {}   // 録音中は画面を消さない
  CR.iv = setInterval(crTick, 200);
  crScreen();
}
function crStop(drop){ if (!CR) return; CR.drop = !!drop; try { CR.rec.stop(); } catch (e) {} }
function crTick(){
  if (!CR) return;
  const sec = (Date.now() - CR.t0) / 1000, t = $("crTime");
  if (t) t.textContent = fmtT(sec);
  const d = new Uint8Array(CR.an.fftSize); CR.an.getByteTimeDomainData(d);
  let rms = 0; for (const v of d) rms += ((v - 128) / 128) ** 2; rms = Math.sqrt(rms / d.length);
  const m = $("crLv"); if (m) m.style.transform = `scaleX(${Math.min(1, rms * 6).toFixed(2)})`;
  if (sec >= CR_MAX) crStop(false);
}
// 画面を消した・別のアプリにしたとき：録音はそこで止める（そこまでの分で教材を作れる）
document.addEventListener("visibilitychange", () => { if (document.hidden && CR) crStop(false); });
window.addEventListener("pagehide", () => { if (CR) crStop(false); });

/* ---------- 画面：録音中 → 止めたあと（言いたかったことのメモ）→ 教材 ---------- */
function renderRec(){ crScreen(); }
function crScreen(){
  const box = $("kzwrap");
  if (CR){
    box.innerHTML = `<div class="sec-h"><h2>${SPARK}会話を録音しています</h2><p>ふだんどおり話してください。終わったら「教材にする」。</p></div>
      <div class="crbox on"><span class="crdot" aria-hidden="true"></span><b class="num crtime" id="crTime">0:00</b><div class="crlv"><i id="crLv"></i></div>
        <div class="acts" style="justify-content:center"><button class="btn big stop" type="button" id="crEnd">■ 終わって教材にする</button></div>
        <button type="button" class="more" id="crDrop">やめる（録音を消す）</button></div>
      <p class="mapnote" id="crNote">相手の方に「英語の練習のために録音してもいい？」と聞いてからどうぞ（<i>Is it OK if I record this to practice my English?</i>）。録音は教材を作ったら消えます。最長10分。画面を消すと、そこで録音が止まります。</p>`;
    $("crEnd").addEventListener("click", () => crStop(false));
    $("crDrop").addEventListener("click", () => { crStop(true); KZ = null; renderKz(); });
    crTick(); return;
  }
  if (CRDONE){
    const s = CRDONE.seconds;
    box.innerHTML = `<button class="more kzback" type="button" id="kzBack">← 教材の一覧へ</button>
      <div class="sec-h"><h2>${SPARK}録音できました（${Math.floor(s / 60)}分${s % 60}秒）</h2><p>言いたかったけど言えなかったことがあれば、日本語で書いてください（なくてもOK。キーボードのマイク🎤で話してもOK）。</p></div>
      <div class="panel talkset"><textarea class="kzsel2" id="crWish" rows="3" placeholder="例：抹茶の産地の話をしたかったけど「石臼で挽く」が言えなかった。最後にまた会いたいと言いたかった"></textarea>
        <div class="acts"><button class="btn big" type="button" id="crMake">✨ 教材にする</button><button class="btn ghost" type="button" id="crDel">録音を消す</button></div>
        <p class="mapnote" id="crNote">${s < 5 ? "録音が短すぎるかもしれません。" : ""}教材ができるまで30秒ほどかかります。</p></div>`;
    $("kzBack").addEventListener("click", () => { CRDONE = null; KZ = null; renderKz(); });
    $("crDel").addEventListener("click", () => { CRDONE = null; KZ = null; renderKz(); });
    $("crMake").addEventListener("click", crMake);
    return;
  }
  box.innerHTML = `<button class="more kzback" type="button" id="kzBack">← 教材の一覧へ</button>
    <div class="sec-h"><h2>${SPARK}会話を録音</h2></div><p class="mapnote" id="crNote">マイクを準備しています…</p>
    <div class="acts"><button class="btn big" type="button" id="crGo">🎙 録音を始める</button></div>`;
  $("kzBack").addEventListener("click", () => { KZ = null; renderKz(); });
  $("crGo").addEventListener("click", crStart);
}
async function crMake(){
  const D = CRDONE; if (!D) return;
  const wish = $("crWish").value.trim(), btn = $("crMake");
  btn.disabled = true; $("crNote").textContent = "先生が録音を聞いています…（30秒ほど）";
  let r;
  try { r = await api("/api/conv-lesson", {audio: b64(await D.blob.arrayBuffer()), mime: D.blob.type, seconds: D.seconds, wish, level: KZREQ().level || "英検準2級"}); }
  catch (e) { $("crNote").textContent = "教材を作れませんでした（" + e.message + "）。もう一度「教材にする」を押してください。"; btn.disabled = false; return; }
  if (r.empty){ $("crNote").textContent = "あなたの声がほとんど聞き取れませんでした。スマホを2人のあいだに置いて、もう一度どうぞ。"; btn.disabled = false; return; }
  const m = {...r, id: "c" + Date.now().toString(36), source: "会話の録音", kind: "speaking", level: KZREQ().level || "英検準2級", made: dayKey(Date.now()), mine: true};
  store("kz-mine", JSON.stringify([m, ...kzMine()].slice(0, 30)));
  const l = convLog(); l.push({t: Date.now(), seconds: D.seconds, wishes: (r.wishes || []).length, types: r.mistake_types || [], id: m.id}); store("kz-convs", JSON.stringify(l.slice(-300)));
  CRDONE = null;
  openKz(m.id);
}
function kzMineDel(id){ store("kz-mine", JSON.stringify(kzMine().filter(m => m.id !== id))); }

/* ---------- 教材プレイヤーの「言えたらよかった」（会話から作った教材だけ） ---------- */
function stepWish(){
  const m = KZ, b = $("kzBody2"), ws = m.wishes || [];
  b.innerHTML = `${m.summary ? `<p class="rsum" style="margin-top:0">${esc(m.summary)}</p>` : ""}
    <p class="mapnote">会話の中で言いたかったことを、こう言えばよかった、という形にしました。▶ で聞いて、まねして言ってみましょう。☆ で単語集に入ります。</p>
    <ul class="rf wish">${ws.map((w, i) => `<li><span class="ws-s">${esc(w.situation)}</span>${w.you_said ? (/^（/.test(w.you_said) ? `<span>${esc(w.you_said)}</span>` : `<s>${esc(w.you_said)}</s>`) : ""}
      <div class="gsent"><button class="play" type="button" data-wsay="${i}" aria-label="聞く">▶</button><b>${esc(w.better)}</b>${wdStar(w.better, `data-ws="x:${i}"`)}</div>
      ${w.why ? `<span>${esc(w.why)}</span>` : ""}</li>`).join("")}</ul>
    ${(m.you_said || []).length ? `<details class="panel" style="margin-top:12px"><summary>あなたが言えた英語</summary><ul class="cando">${m.you_said.map(x => `<li>${esc(x)}</li>`).join("")}</ul></details>` : ""}
    <div class="acts"><button class="btn" type="button" id="wsNext">次へ：語順で話す →</button>${apiOn() ? `<button class="btn ghost" type="button" id="wsTalk">AIの先生とこの教材で話す</button>` : ""}</div>
    <button type="button" class="more" id="wsDel">この教材を消す</button>`;
  b.querySelectorAll("[data-wsay]").forEach(x => x.addEventListener("click", () => { hush(); say(ws[+x.dataset.wsay].better, 1); kzDone({step: "wish"}); }));
  $("wsNext").addEventListener("click", () => { hush(); KZSTEP = "read"; renderPlayer(); window.scrollTo(0, 0); });
  const t = $("wsTalk"); if (t) t.addEventListener("click", () => { const c = TALKCFG(); c.mode = "teacher"; c.theme = m.title; store("kz-talkcfg", JSON.stringify(c)); hush(); KZ = "talk"; renderKz(); window.scrollTo(0, 0); });
  $("wsDel").addEventListener("click", () => { if (!confirm("この教材を消しますか？（この端末から消えます）")) return; kzMineDel(m.id); hush(); KZ = null; renderKz(); });
}

/* ================= 英語日記・フリートーク：ためるほど、AIが発音の癖・ToDo・次に使う表現をまとめる ================= */
/* 毎日1つ、お題について英語で「書く」か「話す（1〜3分の録音）」→ 中継が1回ごとに添削（/api/diary）。
   3回分たまったら、1日（日本時間）1回だけ、記録全体から「発音の癖・言い方の癖・やること（ToDo）・次に使う表現」をまとめ直す（/api/diary-insight。
   今日のまとめがもうあれば呼ばない。中継も今日の分があれば AI を呼ばずにそれを返す）。
   記録はこの端末に（kz-diary・kz-insight・kz-todo）。録音は中継で解析したら捨てる */
const DY_MIN = 3, DY_MAX_SEC = 180;
const DY_TOPICS = [["今日いちばん楽しかったこと", "The best part of my day"], ["最近乾杯した人のこと", "Someone I said cheers with recently"], ["今週の仕事でがんばったこと", "What I worked hard on this week"],
  ["自分の商品・サービスのいいところ", "What I love about my product"], ["週末にしたいこと", "My plan for the weekend"], ["最近うれしかったこと", "Something that made me happy"],
  ["行ってみたい国とその理由", "A country I want to visit"], ["英語を勉強している理由", "Why I study English"], ["子どものころの思い出", "A memory from my childhood"], ["最近おどろいたこと", "Something that surprised me"]];
const dyList = () => { try { return JSON.parse(store("kz-diary") || "[]"); } catch (e) { return []; } };
const dyIns = () => { try { return JSON.parse(store("kz-insight") || "null"); } catch (e) { return null; } };
const dyTodoDone = () => { try { return JSON.parse(store("kz-todo") || "{}"); } catch (e) { return {}; } };
let DYMODE = store("kz-dymode") || "text", DYTOPIC = null, DYR = null, DYDONE = null, DYBUSY = false;
const dyTopicToday = () => DY_TOPICS[Math.floor(Date.now() / 864e5) % DY_TOPICS.length];
const dyJday = t => new Date(t + 9 * 36e5).toISOString().slice(0, 10);          // 日本時間の日付（まとめは1日1回）
const dyInsToday = () => { const I = dyIns(); return !!I && I.day === dyJday(Date.now()); };
const dyOpenTodo = () => { const I = dyIns(), done = dyTodoDone(); return I ? (I.todo || []).filter(x => !done[x.task]) : []; };

/* ---------- 入口：練習タブのタイル（_part_rec.js の PR_TILES。ToDo もタイルの説明に出す。ホームには出さない） ---------- */
PR_TILES.push({id: "diary", icon: "📝", t: "英語日記", open: () => { KZ = "diary"; }, view: () => { if (apiOn()) renderDiary(); else { KZ = null; renderKz(); } },
  s: () => { const n = dyList().length, open = dyOpenTodo();
    return n < DY_MIN ? `書くか話す。あと${DY_MIN - n}回で癖とToDoのまとめ` : open.length ? `今のToDo <b class="num">${open.length}</b>こ：${esc(open[0].task)}` : `${n}回・ToDoはぜんぶできました`; }});

/* ---------- 画面 ---------- */
function renderDiary(){
  const box = $("kzwrap"), l = dyList(), [tj, te] = DYTOPIC || dyTopicToday();
  box.innerHTML = `<button class="more kzback" type="button" id="kzBack">← 教材の一覧へ</button>
    <div class="sec-h"><h2>${SPARK}英語日記・フリートーク</h2><p>毎日1つ、お題について英語で書くか話すだけ。1回ごとに添削が出て、たまるほどAIがあなたの発音の癖・やること（ToDo）・次に使う表現をまとめます。</p></div>
    <div id="dyIns">${dyInsHtml()}</div>
    <div class="panel talkset">
      <div class="rq"><span class="rq-h">今日のお題</span><div class="chips">${[dyTopicToday(), ...DY_TOPICS.filter(t => t !== dyTopicToday()).slice(0, 3)].map(t => `<button type="button" data-dyt="${esc(t[0])}" aria-pressed="${t[0] === tj}">${esc(t[0])}</button>`).join("")}</div>
        <input class="kzsel2" id="dyTopic" placeholder="自由に書く（例：今日の商談のこと）" value="${DY_TOPICS.some(t => t[0] === tj) ? "" : esc(tj)}">${te ? `<p class="mapnote" style="margin-top:4px">英語にすると：<i>${esc(te)}</i></p>` : ""}</div>
      <div class="kzrate wide" role="group" aria-label="書くか話すか">${[["text", "✏️ 書く"], ["voice", "🎙 話す（1〜3分）"]].map(([k, v]) => `<button type="button" data-dym="${k}" aria-pressed="${DYMODE === k}">${v}</button>`).join("")}</div>
      <div id="dyIn"></div>
      <div id="dyOut"></div>
    </div>
    ${l.length ? `<details class="panel" style="margin-top:12px"><summary>これまでの日記・フリートーク（${l.length}回）</summary><ul class="dyhist">${l.slice().reverse().map((e, i) => `<li><span class="num">${md(dayKey(e.t))}</span><span class="kb lv">${e.kind === "voice" ? "話す" : "書く"}</span><b>${esc(e.topic)}</b>
      <details><summary>${esc((e.r || {}).summary || "")}</summary>${dyRevHtml(e.r || {}, e.kind === "voice", "h" + i)}</details></li>`).join("")}</ul></details>` : ""}
    <p class="qnote">記録はこの端末にあります。添削の文字起こしと結果は運営のサーバーにも残します（録音は残しません）。</p>`;
  $("kzBack").addEventListener("click", () => { dyStop(true); KZ = null; renderKz(); });
  box.querySelectorAll("[data-dyt]").forEach(b => b.addEventListener("click", () => { DYTOPIC = DY_TOPICS.find(t => t[0] === b.dataset.dyt); dyKeep(); renderDiary(); }));
  $("dyTopic").addEventListener("input", e => {                     // 書きかえても画面は描き直さない（そのまま「添削してもらう」を押せるように）
    const v = e.target.value.trim(); DYTOPIC = v ? [v, ""] : null;
    box.querySelectorAll("[data-dyt]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.dyt === dyTopicNow())));
  });
  box.querySelectorAll("[data-dym]").forEach(b => b.addEventListener("click", () => { if (DYR) return; DYMODE = b.dataset.dym; store("kz-dymode", DYMODE); dyKeep(); renderDiary(); }));
  dyInput(); bindDyIns(box);
  box.querySelectorAll("[data-dysay]").forEach(b => b.addEventListener("click", () => { hush(); say(b.dataset.dysay, 1); }));
  box.querySelectorAll("[data-dyadd]").forEach(b => b.addEventListener("click", () => { const [en, ja, note] = JSON.parse(b.dataset.dyadd); if (wdAdd({en, ja, note})){ b.classList.add("on"); b.textContent = "★"; } }));
}
const dyTopicNow = () => (DYTOPIC || dyTopicToday())[0];
function dyKeep(){ const t = $("dyText"); if (t) store("kz-dydraft", t.value || null); }
function dyInput(){
  const el = $("dyIn"); if (!el) return;
  if (DYMODE === "text"){
    el.innerHTML = `<textarea class="kzsel2" id="dyText" rows="6" placeholder="英語で書いてみましょう。3〜5文でOK。言えない言葉は日本語のままでOK（そこを英語にして返します）">${esc(store("kz-dydraft") || "")}</textarea>
      <div class="acts"><button class="btn big" type="button" id="dySend">添削してもらう</button></div><p class="mapnote" id="dyNote"></p>`;
    $("dyText").addEventListener("input", dyKeep);
    $("dySend").addEventListener("click", () => { const v = $("dyText").value.trim(); if (v.length < 10){ $("dyNote").textContent = "もう少し書いてみましょう（3文くらい）。"; return; } dySend({kind: "text", text: v}); });
    return;
  }
  if (DYR){
    el.innerHTML = `<div class="crbox on"><span class="crdot" aria-hidden="true"></span><b class="num crtime" id="dyTime">0:00</b><p class="mapnote">お題：${esc(dyTopicNow())}。思いつくまま英語で話してください（最長3分）。</p>
      <div class="acts" style="justify-content:center"><button class="btn big stop" type="button" id="dyEnd">■ 終わって送る</button></div><button type="button" class="more" id="dyDrop">やめる</button></div>`;
    $("dyEnd").addEventListener("click", () => dyStop(false));
    $("dyDrop").addEventListener("click", () => dyStop(true));
    return;
  }
  if (DYDONE){
    el.innerHTML = `<p class="mapnote">録音できました（${DYDONE.seconds}秒）。</p><div class="acts"><button class="btn big" type="button" id="dySendV">添削してもらう</button><button class="btn ghost" type="button" id="dyRe">録り直す</button></div><p class="mapnote" id="dyNote"></p>`;
    $("dySendV").addEventListener("click", async () => dySend({kind: "voice", audio: b64(await DYDONE.blob.arrayBuffer()), mime: DYDONE.blob.type, seconds: DYDONE.seconds}));
    $("dyRe").addEventListener("click", () => { DYDONE = null; dyInput(); });
    return;
  }
  el.innerHTML = `<div class="acts"><button class="btn big" type="button" id="dyGo">🎙 話しはじめる</button></div><p class="mapnote" id="dyNote">1人で話す練習です。うまく言えなくても止まらずに。発音もチェックします。</p>`;
  $("dyGo").addEventListener("click", dyStart);
}
async function dyStart(){
  if (DYR) return;
  hush();
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: true, noiseSuppression: true, channelCount: 1}}); }
  catch (e) { $("dyNote").textContent = /Permission|NotAllowed/.test(e.name || e.message) ? "マイクが許可されていません（設定 → Safari → マイク）" : "録音を始められませんでした：" + e.message; return; }
  const mime = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || "";
  let rec;
  try { rec = new MediaRecorder(stream, {...(mime ? {mimeType: mime} : {}), audioBitsPerSecond: 32000}); } catch (e) { rec = new MediaRecorder(stream, mime ? {mimeType: mime} : {}); }
  DYR = {rec, stream, parts: [], t0: Date.now(), mime};
  rec.ondataavailable = e => e.data.size && DYR && DYR.parts.push(e.data);
  rec.onstop = () => {
    const T = DYR; if (!T) return;
    DYR = null; clearInterval(T.iv); T.stream.getTracks().forEach(t => t.stop());
    const seconds = Math.round((Date.now() - T.t0) / 1000);
    DYDONE = T.drop ? null : {blob: new Blob(T.parts, {type: T.rec.mimeType || T.mime || "audio/mp4"}), seconds};
    if (KZ !== "diary") return;
    dyInput();
    if (DYDONE && T.send) $("dySendV").click();
  };
  rec.start(1000);
  DYR.iv = setInterval(() => { if (!DYR) return; const s = (Date.now() - DYR.t0) / 1000, t = $("dyTime"); if (t) t.textContent = fmtT(s); if (s >= DY_MAX_SEC) dyStop(false); }, 250);
  dyInput();
}
function dyStop(drop){ if (!DYR) return; DYR.drop = !!drop; DYR.send = !drop && !document.hidden; try { DYR.rec.stop(); } catch (e) {} }
document.addEventListener("visibilitychange", () => { if (document.hidden && DYR) dyStop(false); });     // 画面を離れたら止める（送るのは戻ってから）
window.addEventListener("pagehide", () => { if (DYR) dyStop(false); });

/* ---------- 送る → 添削 → （3回以上なら）まとめ直す ---------- */
async function dySend(body){
  if (DYBUSY) return; DYBUSY = true;
  const note = $("dyNote"), topic = dyTopicNow(), level = KZREQ().level || "英検準2級";
  document.querySelectorAll("#dySend, #dySendV").forEach(b => b.disabled = true);
  if (note) note.textContent = body.kind === "voice" ? "先生が聞いています…（20秒ほど）" : "先生が読んでいます…";
  let r;
  try { r = await api("/api/diary", {...body, topic, level}); }
  catch (e) { DYBUSY = false; if (note) note.textContent = "添削できませんでした（" + e.message + "）。もう一度どうぞ。"; document.querySelectorAll("#dySend, #dySendV").forEach(b => b.disabled = false); return; }
  DYBUSY = false;
  if (r.empty){ if (note) note.textContent = body.kind === "voice" ? "英語がほとんど聞き取れませんでした。もう少し大きな声で、もう一度どうぞ。" : "英語がほとんどありませんでした。1文からでOKです。"; document.querySelectorAll("#dySend, #dySendV").forEach(b => b.disabled = false); return; }
  const l = dyList(); l.push({t: Date.now(), kind: body.kind, topic, seconds: body.seconds || null, r}); store("kz-diary", JSON.stringify(l.slice(-200)));
  if (body.kind === "text") store("kz-dydraft", null); else DYDONE = null;
  if (KZ !== "diary") return;
  renderDiary();
  $("dyOut").innerHTML = `<h4 class="dyok">添削（${body.kind === "voice" ? "話す" : "書く"}・${esc(topic)}）</h4>${dyRevHtml(r, body.kind === "voice", "now")}`;
  bindDyAdds($("dyOut"));
  $("dyOut").scrollIntoView({behavior: reduce ? "auto" : "smooth", block: "start"});
  if (l.length >= DY_MIN && !dyInsToday()) dyInsight();               // まとめは1日1回（今日の分があれば次は明日）
}
function dyRevHtml(r, voice, key){
  const sc = r.score || {};
  return `<div class="rev sm">${r.summary ? `<p class="rsum">${esc(r.summary)}</p>` : ""}
    <div class="rscore">${[["accuracy", "正確さ"], ["fluency", "なめらかさ"], ...(voice ? [["pronunciation", "発音"]] : [])].map(([k, lab]) => `<div><span>${lab}</span><b class="num">${sc[k] || "-"}</b><small>/5</small></div>`).join("")}</div>
    ${r.text ? `<details><summary>${voice ? "聞き取った英語" : "あなたの日記"}</summary><p class="dytext">${esc(r.text)}</p></details>` : ""}
    ${(r.fixes || []).length ? `<h4>言い直すと、もっと伝わる</h4><ul class="rf">${r.fixes.map(f => `<li><s>${esc(f.you_said)}</s><b>${esc(f.better)}</b><span>${esc(f.why)}</span></li>`).join("")}</ul>` : ""}
    ${(r.pron || []).length ? `<h4>発音</h4><ul class="rf">${r.pron.map(p => `<li><div class="gsent"><button class="play" type="button" data-dysay="${esc(p.word)}" aria-label="お手本を聞く">▶</button><b>${esc(p.word)}</b>${p.heard ? `<small class="dyheard">（${esc(p.heard)} に聞こえた）</small>` : ""}</div><span>${esc(p.tip)}</span></li>`).join("")}</ul>` : ""}
    ${r.corrected ? `<h4>全体を自然な英語に</h4><div class="gsent"><button class="play" type="button" data-dysay="${esc(r.corrected)}" aria-label="聞く">▶</button><p class="dytext">${esc(r.corrected)}</p></div>` : ""}
    ${(r.expressions || []).length ? `<h4>次に使える表現</h4><ul class="rf">${r.expressions.map(x => `<li><div class="gsent"><button class="play" type="button" data-dysay="${esc(x.en)}" aria-label="聞く">▶</button><b>${esc(x.en)}</b>${dyStar(x.en, x.ja, "")}</div><span>${esc(x.ja)}</span></li>`).join("")}</ul>` : ""}</div>`;
}
const dyStar = (en, ja, note) => `<button type="button" class="wdstar${wdHas(en) ? " on" : ""}" data-dyadd="${esc(JSON.stringify([en, ja || "", note || ""]))}" aria-label="単語集に入れる">${wdHas(en) ? "★" : "☆"}</button>`;
function bindDyAdds(root){
  root.querySelectorAll("[data-dysay]").forEach(b => b.addEventListener("click", () => { hush(); say(b.dataset.dysay, 1); }));
  root.querySelectorAll("[data-dyadd]").forEach(b => b.addEventListener("click", () => { const [en, ja, note] = JSON.parse(b.dataset.dyadd); if (wdAdd({en, ja, note})){ b.classList.add("on"); b.textContent = "★"; } }));
}

/* ---------- まとめ（発音の癖・言い方の癖・ToDo・次に使う表現） ---------- */
async function dyInsight(){
  const el = $("dyIns"), l = dyList();
  if (l.length < DY_MIN || dyInsToday()) return;
  if (el) el.insertAdjacentHTML("afterbegin", `<p class="loading" id="dyInsL">これまでの${l.length}回分から、あなたの癖とToDoをまとめ直しています…</p>`);
  const extra = {}; [...talkLog(), ...convLog()].forEach(x => (x.types || []).forEach(k => extra[k] = (extra[k] || 0) + 1));
  const entries = l.slice(-30).reverse().map(e => ({d: dayKey(e.t), kind: e.kind, topic: e.topic, fixes: (e.r || {}).fixes || [], pron: (e.r || {}).pron || [],
    types: (e.r || {}).mistake_types || [], pron_types: (e.r || {}).pron_types || []}));
  let r;
  try { r = await api("/api/diary-insight", {entries, extra, level: KZREQ().level || "英検準2級"}); }
  catch (e) { const x = $("dyInsL"); if (x) x.outerHTML = `<p class="mapnote warn">まとめを作れませんでした（${esc(e.message)}）。「もう一度まとめる」でどうぞ。</p>`; return; }
  store("kz-insight", JSON.stringify({...r, t: Date.now(), n: r.n || l.length, day: r.day || dyJday(Date.now())}));
  if (KZ === "diary" && $("dyIns")){ $("dyIns").innerHTML = dyInsHtml(); bindDyIns($("dyIns")); }
}
function dyInsHtml(){
  const I = dyIns(), n = dyList().length;
  if (!I) return n >= DY_MIN ? `<div class="panel dyins"><p class="mapnote">まだまとめていません。</p><div class="acts"><button class="btn" type="button" id="dyInsGo">まとめてもらう</button></div></div>`
    : `<div class="panel dyins"><div class="dyprog">${[...Array(DY_MIN)].map((_, i) => `<i class="${i < n ? "on" : ""}"></i>`).join("")}</div><p class="mapnote">あと<b class="num">${DY_MIN - n}</b>回たまると、AIがあなたの発音の癖・やること（ToDo）・次に使う表現をまとめます。</p></div>`;
  const done = dyTodoDone(), hab = (h, lab) => (h || []).length ? `<h4>${lab}</h4><ul class="rf">${h.map(x => `<li><b>${esc(x.label)}${x.count ? `<small class="num">（${x.count}回）</small>` : ""}</b>${(x.examples || []).length ? `<s class="ex">${x.examples.map(esc).join("　")}</s>` : ""}<span>${esc(x.tip)}</span></li>`).join("")}</ul>` : "";
  return `<div class="panel dyins"><div class="rt-h"><b>あなたの今のまとめ</b><span>${I.n}回分から・${md(dayKey(I.t))}</span></div>
    ${I.summary ? `<p class="rsum">${esc(I.summary)}</p>` : ""}
    ${(I.todo || []).length ? `<h4>ToDo（やること）</h4><ul class="dytodo">${I.todo.map((x, i) => `<li class="${done[x.task] ? "did" : ""}"><label><input type="checkbox" data-todo="${i}" ${done[x.task] ? "checked" : ""}><span><b>${esc(x.task)}</b><small>${esc([x.why, x.practice].filter(Boolean).join("・"))}</small></span></label></li>`).join("")}</ul>` : ""}
    ${hab(I.pron_habits, "発音の癖")}${hab(I.grammar_habits, "言い方の癖")}
    ${(I.next_expressions || []).length ? `<h4>次に使う表現</h4><ul class="rf">${I.next_expressions.map(x => `<li><div class="gsent"><button class="play" type="button" data-dysay="${esc(x.en)}" aria-label="聞く">▶</button><b>${esc(x.en)}</b>${dyStar(x.en, x.ja, x.because)}</div><span>${esc(x.ja)}${x.because ? "・" + esc(x.because) : ""}</span></li>`).join("")}</ul>` : ""}
    <div class="acts">${(I.next_expressions || []).length && apiOn() ? `<button class="btn" type="button" id="dyTalk">AIと会話で、この表現を使う</button>` : ""}${dyInsToday() ? "" : `<button class="btn ghost" type="button" id="dyInsGo">もう一度まとめる</button>`}</div>
    ${dyInsToday() ? `<p class="mapnote">まとめは1日1回です。明日、それまでの記録からまとめ直します。</p>` : ""}</div>`;
}
function bindDyIns(root){
  const g = root.querySelector("#dyInsGo"); if (g) g.addEventListener("click", () => { g.disabled = true; dyInsight(); });
  root.querySelectorAll("[data-todo]").forEach(c => c.addEventListener("change", () => {
    const I = dyIns(), x = I.todo[+c.dataset.todo], d = dyTodoDone();
    if (c.checked) d[x.task] = Date.now(); else delete d[x.task];
    store("kz-todo", JSON.stringify(d)); c.closest("li").classList.toggle("did", c.checked);
    if (c.checked) wdLog("todo");                                     // ToDo をやった日も「学習した日」に数える
  }));
  const t = root.querySelector("#dyTalk"); if (t) t.addEventListener("click", () => {
    const I = dyIns(), c = TALKCFG(); c.mode = "chat"; c.goal = "次の表現を使ってみる：" + I.next_expressions.slice(0, 3).map(x => x.en).join(" / "); store("kz-talkcfg", JSON.stringify(c));
    hush(); KZ = "talk"; renderKz(); window.scrollTo(0, 0);
  });
  if (root.id === "dyIns") bindDyAdds(root);
}
/* ================= 端末のあいだで同期：私の単語集・今月の目標・連続記録 ================= */
/* 中継の /api/sync に、この端末の分を送ると、サーバーにある分とまとめたものが返ってくる（本人の確認は合言葉＝ほかの API と同じ）。
   まとめ方：単語集は同じ英語ごとに更新日時（u）の新しい方・消したものは「消した日時」が新しければ消す／目標は月ごとに新しい方／
   連続記録は端末ごとの日別の回数（練習の回数・開いた日）の大きい方。電波がないときは端末の保存のまま使い、つながったら送る */
const SYNC = {on: false, rev: 0, busy: false, t: null, last: 0, sent: store("cg-sync-sent") || ""};
// 送る回数を減らす（中継の D1 の書き込みを抑える）：変えてから10秒まとめる・前に送った中身と同じなら送らない・送るのは60秒に1回まで。
// ほかの端末の分を受け取るだけのときは中身なし（{}）で送る＝サーバーは書き込まない。それも10分に1回まで
const SYNC_WAIT = 10e3, SYNC_MIN = 60e3, SYNC_PULL = 600e3;
const syncSig = t => { let h = 5381; for (let i = 0; i < t.length; i++) h = (h * 33 + t.charCodeAt(i)) | 0; return t.length + ":" + (h >>> 0).toString(36); };   // 前に送った中身の印（中身そのものは保存しない）
const syncBody = () => ({words: {items: wdList(), del: wdDel()}, goals: goalsLocal(), days: {[syncDev()]: myDays()}});
const syncDev = () => { let v = store("cg-dev"); if (!v){ v = "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); store("cg-dev", v); } return v; };
const wdDel = () => { try { return JSON.parse(store("kz-words-del") || "{}"); } catch (e) { return {}; } };
// ほかの端末の日別の記録（{端末: {"YYYY-MM-DD": [練習の回数, 開いた=1]}}）。この端末の分は手元の記録を使う
const syncDaysOther = () => { try { const a = JSON.parse(store("cg-sync-days") || "{}"); delete a[syncDev()]; return a; } catch (e) { return {}; } };
function myDays(){
  const out = {};
  studyEvents().forEach(x => { const k = dayKey(x.t); out[k] = out[k] || [0, 0]; out[k][0] += x.n; });
  openDays().forEach(k => { out[k] = out[k] || [0, 0]; out[k][1] = 1; });
  return out;
}
function goalsLocal(){
  const g = {};
  try { for (let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); if (/^cg-goal-\d{4}-\d{2}$/.test(k)) g[k.slice(8)] = JSON.parse(localStorage.getItem(k)); } } catch (e) {}
  return g;
}
// 手元で変えたら呼ぶ（数秒まとめてから送る）
function syncDirty(){ SYNC.rev++; if (!SYNC.on) return; clearTimeout(SYNC.t);
  const wait = Math.max(SYNC_WAIT, SYNC_MIN - (Date.now() - SYNC.last));
  SYNC.t = setTimeout(() => { SYNC.t = null; syncNow(); }, wait); }
async function syncNow(force){
  if (!SYNC.on || SYNC.busy) return;
  if (navigator.onLine === false) return;
  const body = syncBody(), sig = syncSig(JSON.stringify(body)), changed = sig !== SYNC.sent;
  if (!changed && !force && Date.now() - SYNC.last < SYNC_PULL) return;   // 変わっていない・少し前に受け取った
  SYNC.busy = true; const rev = SYNC.rev;
  try {
    const r = await api("/api/sync", changed ? body : {});
    SYNC.last = Date.now();
    if (changed){ SYNC.sent = sig; store("cg-sync-sent", sig); }
    if (SYNC.rev !== rev){ SYNC.busy = false; return syncDirty(); }   // 送っているあいだに手元で変えた → 間をあけてもう一度   // 送っているあいだに手元で変えた → もう一度送る（サーバーでまとめ直す）
    const before = JSON.stringify([wdList(), goalsLocal(), syncDaysOther()]);
    if (r.words){ store("kz-words", JSON.stringify(r.words.items || [])); store("kz-words-del", JSON.stringify(r.words.del || {})); }
    Object.entries(r.goals || {}).forEach(([ym, g]) => { if (/^\d{4}-\d{2}$/.test(ym) && g) store("cg-goal-" + ym, JSON.stringify(g)); });
    if (r.days) store("cg-sync-days", JSON.stringify(r.days));
    if (JSON.stringify([wdList(), goalsLocal(), syncDaysOther()]) !== before) syncRedraw();
  } catch (e) {
    // つながらない・中継が古い版：端末の保存のまま。次に開いたとき・電波が戻ったときにまた送る
  }
  SYNC.busy = false;
}
// ほかの端末の分が届いたら、見ている画面だけ描き直す（入力中・復習の途中は描き直さない）
function syncRedraw(){
  const typing = document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
  if (ME && (!$("pane-me").hidden || !$("pane-my").hidden) && !GOALEDIT && !typing){ const y = window.scrollY; renderMe(ME); window.scrollTo(0, y); }
  if (KZ === "words" && !WDQ && !$("pane-kz").hidden) renderWords();
}
function syncStart(d){
  if (DEMO || d.viewer || !apiOn() || !API_AUTH) return;
  SYNC.on = true;
  syncNow(true);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden){ if (SYNC.t){ clearTimeout(SYNC.t); SYNC.t = null; syncNow(); } }   // 閉じる前に、まだ送っていない分を
    else syncNow();   // 変わっていなければ10分に1回だけ受け取る
  });
  window.addEventListener("online", () => syncNow());
}
/* ================= UTAGE の受講状況（会員サイトのコースの進み具合） ================= */
/* 置き場所は 練習＞教材 のいちばん下「会員サイト講座」。次に見るレッスンは「今日の1つ」の候補（utNext）。
   中継の /api/utage/progress（本人の分だけ・読むだけ）。運営が会員サイトの受講生とつないだ人だけに出る。デモは架空のコース
   つながらない・まだつないでいないときは、案内文だけ。前回の分は端末にとっておき、開いたらすぐ出す */
const UT = {show: false, data: null, err: false, last: 0};
const utKey = () => "cg-utage-" + (API_AUTH ? API_AUTH.u : "");
const utDate = s => { const t = new Date(String(s).replace(" ", "T")); return isNaN(t) ? "" : (t.getMonth() + 1) + "/" + t.getDate(); };
function utageHtml(){
  if (!UT.show) return "";
  const head = `<div class="sec-h"><h2>${SPARK}会員サイト講座<i class="utb">UTAGE</i></h2><p>会員サイトの講座の進み具合。動画は「会員サイトで見る」から開けます。${DEMO ? "（デモは架空のコースです）" : ""}</p></div>`;
  const note = t => `<section class="utage" id="utage">${head}<p class="mapnote">${t}</p></section>`;
  const D = UT.data;
  if (!D) return note(UT.err ? "いまは会員サイトの受講状況を読み込めません。時間をおいて開き直してください。" : "読み込んでいます…");
  if (!D.linked) return note("会員サイトの受講状況は、運営があなたの会員サイトのアカウントとつないだあとに、ここに出ます。");
  if (D.off || !(D.courses || []).length) return note(D.off ? "会員サイトの受講状況は、準備ができたらここに出ます。" : "会員サイトで受けられるコースが、まだありません。");
  const card = c => {
    const steps = c.steps.map(s => { const n = s.lessons.filter(l => l.done).length;
      return `<div class="ut-s"><h4>${esc(s.name)}<span class="num">${n} / ${s.lessons.length}</span></h4><ul>${s.lessons.map(l =>
        `<li class="${l.done ? "on" : ""}"><i>${l.done ? "✓" : ""}</i><span>${esc(l.name)}</span>${l.done && l.at ? `<small class="num">${utDate(l.at)}</small>` : ""}</li>`).join("")}</ul></div>`; }).join("");
    return `<div class="ut-c${c.percent >= 100 ? " done" : ""}">
      <div class="ut-h"><b>${esc(c.name)}</b><span class="num">${c.percent}%</span></div>
      <div class="ut-bar"><i style="width:${Math.min(100, c.percent)}%"></i></div>
      <p class="mini"><b class="num">${c.done}</b> / ${c.total} レッスン完了</p>
      ${c.next ? `<div class="ut-next"><span class="k">次に見るレッスン</span><b>${esc(c.next.name)}</b>${c.next.step ? `<small>${esc(c.next.step)}</small>` : ""}</div>`
        : `<p class="mini good">このコースは最後まで見終わりました！</p>`}
      ${c.url ? `<div class="acts"><a class="btn" href="${esc(c.url)}" target="_blank" rel="noopener">${ICON.ext}会員サイトで見る</a></div>` : ""}
      ${steps ? `<details class="ut-steps"><summary>STEPごとの一覧</summary>${steps}</details>` : ""}</div>`;
  };
  // 1行の行（未開始・連絡事項のたたんだグループの中）
  const row = c => `<li>${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">` : "<span>"}<b>${esc(c.name)}</b><span class="num">${c.done} / ${c.total}・${c.percent}%</span>${c.url ? "</a>" : "</span>"}</li>`;
  const group = (t, l) => l.length ? `<details class="ut-g"><summary>${t}（${l.length}）</summary><ul>${l.map(row).join("")}</ul></details>` : "";
  // 始めたコース（0%より上）だけ大きなカード。0% と「連絡事項」はたたんだグループに1行ずつ
  const isNote = c => /連絡事項/.test(c.name || "");
  const started = D.courses.filter(c => !isNote(c) && c.percent > 0), notyet = D.courses.filter(c => !isNote(c) && !(c.percent > 0)), notes = D.courses.filter(isNote);
  const first = !started.length && utNext();                  // まだどれも始めていないときは「次に見るレッスン」1枚を先頭に
  const cs = (first ? card(first) : "") + started.map(card).join("");
  const rest = notyet.filter(c => c !== first);
  return `<section class="utage" id="utage">${head}${cs ? `<div class="ut-list">${cs}</div>` : ""}${group("未開始のコース", rest)}${group("連絡事項", notes)}${UT.err ? `<p class="mapnote">いまは新しい分を読み込めないので、前回の表示です。</p>` : ""}</section>`;
}
function utagePaint(){ const el = $("utage"); if (el) el.outerHTML = utageHtml(); if (ME) paintHome(); }   // 次のレッスンは「今日の1つ」の候補
// 会員サイトの次に見るレッスン（始めたコースを優先・なければいちばん上のまだ終わっていないコース。連絡事項は除く）
function utNext(){ const D = UT.data; return D && D.linked && !D.off ? (D.courses || []).filter(c => c.next && !/連絡事項/.test(c.name || "")).sort((x, y) => (y.percent > 0) - (x.percent > 0))[0] || null : null; }
async function utageLoad(){
  if (!UT.show || navigator.onLine === false) return;
  UT.last = Date.now();
  try {
    UT.data = await api("/api/utage/progress"); UT.err = false;
    store(utKey(), JSON.stringify(UT.data));
  } catch (e) {
    UT.err = true;                                             // 中継が古い版・UTAGE が混んでいる：前回の分があればそれを出す
  }
  utagePaint();
}
// renderMe の前に呼ぶ（カードの場所を作ってから読み込む）
function utageStart(d){
  if (DEMO){ UT.show = true; UT.data = UT_DEMO; return; }
  if (d.viewer || !apiOn() || !API_AUTH) return;
  UT.show = true;
  try { UT.data = JSON.parse(store(utKey()) || "null"); } catch (e) {}
  utageLoad();
  document.addEventListener("visibilitychange", () => { if (!document.hidden && Date.now() - UT.last > 600e3) utageLoad(); });   // 中継の控えと同じ10分
}
// デモの架空のコース（実在の会員サイト・リンクは入れない）
const UT_DEMO = {linked: true, courses: [{name: "デモ：貿易英語の基本", percent: 40, done: 4, total: 10, url: "", next: {name: "L5 見積書の作り方", step: "STEP2 価格交渉"},
  steps: [{name: "STEP1 はじめの一歩", lessons: [{name: "L1 自己紹介メール", done: true}, {name: "L2 会社の紹介", done: true}, {name: "L3 商品の説明", done: true}]},
          {name: "STEP2 価格交渉", lessons: [{name: "L4 値段を聞く", done: true}, {name: "L5 見積書の作り方", done: false}, {name: "L6 値引きのお願い", done: false}, {name: "L7 支払い条件", done: false}]},
          {name: "STEP3 出荷", lessons: [{name: "L8 インボイス", done: false}, {name: "L9 送料と通関", done: false}, {name: "L10 お礼のメール", done: false}]}]}]};

/* ================= 右下の質問BOT（どの画面からでも） ================= */
/* OGJ MATCHA ナレッジBOT（/api/kb）をそのまま使い、course: true で講座の記録（名前を消した文字起こし・DM事例など）も根拠に足す。
   本人用のリンクで開いたときだけ使える（中継の合言葉が要る）。デモでは見た目だけ。会話はこの画面を閉じるまで残る */
let KB = [], BOT = null, BOTBUSY = false;
const BOTQ = ["OシリーズのMOQは？", "サンプルを送る流れは？", "DMの返信率を上げるコツは？", "インボイスの書き方は？", "英語が伸びる人の習慣は？"];
function botBuild(){
  if (BOT) return BOT;
  const fab = document.createElement("button");
  fab.type = "button"; fab.className = "botfab"; fab.id = "botFab"; fab.hidden = true; fab.setAttribute("aria-label", "質問BOTを開く"); fab.setAttribute("aria-expanded", "false");
  fab.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H10l-5 4v-4H4z"/><path d="M9.6 9.2a2.4 2.4 0 1 1 3.4 2.2c-.6.3-1 .8-1 1.4v.3"/><circle cx="12" cy="14.9" r=".4"/></svg><span>質問</span>`;
  const box = document.createElement("section");
  box.className = "botbox"; box.id = "botBox"; box.hidden = true; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "質問BOT");
  box.innerHTML = `<div class="bot-h"><div><b>質問BOT</b><span>抹茶ビジネスの資料と、これまでの講座の中から答えます</span></div><button type="button" class="pb-x" id="botX" aria-label="閉じる">×</button></div>
    <div class="ivlog kblog bot-log" id="botLog"></div>
    <div class="chips bot-q" id="botQ"></div>
    <div class="ivin bot-in"><input class="kzsel2" id="botIn" placeholder="質問を書く（キーボードのマイクで話してもOK）" enterkeyhint="send"><button class="btn" type="button" id="botSend">聞く</button></div>
    <p class="qnote bot-note">講座の記録では、受講生・講師の名前を「受講生A」などに置きかえています。最新の価格などは価格表でも確かめてください。</p>`;
  document.body.append(fab, box);
  fab.addEventListener("click", () => box.hidden ? botOpen() : botClose());
  box.querySelector("#botX").addEventListener("click", botClose);
  box.querySelector("#botSend").addEventListener("click", () => kbAsk(box.querySelector("#botIn").value));
  box.querySelector("#botIn").addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing) kbAsk(e.target.value); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !box.hidden) botClose(); });
  return (BOT = {fab, box});
}
// 本人のページが開けたら出す（デモでも出す。デモは「本人用リンクで使えます」）
function botShow(){ const b = botBuild(); b.fab.hidden = !(ME || DEMO); }
function botOpen(){
  const b = botBuild(); botShow(); if (b.fab.hidden) return;
  b.box.hidden = false; b.fab.setAttribute("aria-expanded", "true"); document.body.classList.add("boton");
  botRender();
  if (apiOn() && !DEMO) setTimeout(() => b.box.querySelector("#botIn").focus({preventScroll: true}), 50);
}
function botClose(){ if (!BOT) return; BOT.box.hidden = true; BOT.fab.setAttribute("aria-expanded", "false"); document.body.classList.remove("boton"); BOT.fab.focus({preventScroll: true}); }
function botRender(){
  const b = botBuild(), on = apiOn() && !DEMO;
  const msg = x => x.who === "you" ? `<p class="you">${esc(x.text)}</p>`
    : `<div class="kbans${x.found === false ? " nf" : ""}"><p>${esc(x.text)}</p>${(x.sources || []).length ? `<div class="kbsrc">${x.sources.map(t => `<span>📄 ${esc(t)}</span>`).join("")}</div>` : ""}</div>`;
  const hello = on ? "こんにちは！価格・MOQ・送料・サンプル・通関などの抹茶ビジネスのことや、講座で話していた内容（DMのコツ・英語の伸ばし方など）を質問してください。"
    : DEMO ? "デモでは使えません。本人用のリンクで開くと、ここで質問できます。" : "質問BOTは準備中です（運営のサーバーにつながると使えます）。";
  b.box.querySelector("#botLog").innerHTML = (KB.length ? KB.map(msg).join("") : `<div class="kbans"><p>${hello}</p></div>`) + (BOTBUSY ? `<div class="kbans"><p class="loading">資料と講座の記録を読んでいます…</p></div>` : "");
  const qs = b.box.querySelector("#botQ");
  qs.innerHTML = on && !KB.length ? BOTQ.map(q => `<button type="button" data-bq="${esc(q)}">${esc(q)}</button>`).join("") : "";
  qs.querySelectorAll("[data-bq]").forEach(x => x.addEventListener("click", () => kbAsk(x.dataset.bq)));
  b.box.querySelectorAll("#botIn, #botSend").forEach(x => x.disabled = !on || BOTBUSY);
  const log = b.box.querySelector("#botLog"); log.scrollTop = log.scrollHeight;
}
async function kbAsk(q){
  q = (q || "").trim(); if (!q || BOTBUSY) return;
  if (!apiOn() || DEMO){ demoOnly(); return; }
  const inp = BOT && BOT.box.querySelector("#botIn"); if (inp) inp.value = "";
  KB.push({who: "you", text: q}); BOTBUSY = true; botRender();
  try { const r = await api("/api/kb", {q, course: true, history: KB.slice(-9, -1).map(x => ({who: x.who, text: x.text}))}); KB.push({who: "bot", text: r.answer || "", found: r.found, sources: r.sources || []}); }
  catch (e) { KB.push({who: "bot", text: "いまは答えられませんでした（" + e.message + "）", found: false}); }
  BOTBUSY = false; botRender();
}

/* ================= 今日やること（1本）：リマインド・バッジの数字・通知 ================= */
/* やることの出どころはここの engItems だけ。①ホームの「今日やること」と「今日の1つ」（_part_me.js）②ヘッダーのベル・ホームのタブの数字・ステータスの x/y ③アプリのアイコンの数字
   ④決めた時刻のリマインド（アプリの中のお知らせ＋許可があれば端末の通知）⑤中継からの Web Push（アプリを閉じていても届く。中継側は雛形・未デプロイ）
   使える環境（2026-10 時点）：
   - アイコンの数字（Badging API: navigator.setAppBadge）… PC の Chrome/Edge でインストールしたアプリ、macOS Safari 17+ の「Dockに追加」したアプリ、
     iPhone/iPad は iOS/iPadOS 16.4+ で「ホーム画面に追加」したアプリだけ（しかも通知を許可したときだけ）。Safari のタブ・Firefox では出ない（エラーにせず何もしない）
   - 端末の通知（Notification・Web Push）… iPhone/iPad は 16.4+ の「ホーム画面に追加」したアプリだけ。Safari のタブでは使えない。
     許可の確認はボタンを押したときにしか出せない（自動では聞かない）。Android の Chrome、PC の Chrome/Edge/Firefox/Safari 16+ は使える
   - アプリを閉じている間に届くのは Web Push だけ。④の時刻のリマインドはアプリを開いている間だけ動く（iPhone は裏に回るとタイマーが止まる）
   - 「今日やること」のチェック・単語集・この端末の練習は端末の中だけにあるので、サーバーからの通知は「今日の練習の記録が中継にない人」にだけ送る（docs/push-design.md） */
let ENG = [];
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () => (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
function engItems(d){
  if (!d || d.viewer) return [];                       // 先生リンク（見る人）には出さない
  const today = dayKey(Date.now()), out = [];
  const ym = d.today.slice(0, 7);
  if (!goalGet(ym)) out.push({k: "goal", t: "今月の目標を決める", s: "目標シートに書いたことを、そのまま書けばOK", go: "#goal", done: false});
  const study = new Set([...studyEvents().map(x => dayKey(x.t)), ...(d.study_days || [])]), run = runOf(study, today), did = study.has(today);
  out.push({k: "study", t: "英語の練習（1回でOK）", s: did ? "今日の練習 ✓" : run ? `いま${run}日連続。今日やると${run + 1}日に` : "教材・筋トレ・2秒応答・AI会話・音読のどれか1つ", tab: "kz", done: did});
  const wl = wdList();
  if (wl.length){ const n = wl.filter(x => wdDue(x) && !wdDone(x)).length;
    out.push({k: "words", t: n ? `単語集の復習 ${n}こ` : "単語集の復習", s: n ? "1・3・7・14・30日の間隔で、忘れる前に" : "今日の分はおわり", kzv: "words", done: !n}); }
  (d.todos || []).forEach(t => out.push({k: "todo-" + t.k, t: t.title, s: `+${t.pts}pt・Discordで`, go: "#today", todo: t.k, done: store("did-" + d.today + "-" + t.k) === "1"}));
  const qs = weekQuests(d), ws = weekStart(d.today), qn = qs.filter(q => store("quest-" + ws + "-" + q.id) === "1").length;
  out.push({k: "quest", t: "今週のひとりクエストを1つ", s: qn ? `今週 ${qn} / ${qs.length} クリア` : "1人でできる小さな冒険（週の中でいつでも）", tab: "quest", done: qn > 0});
  return [...out, ...obItems(d)];                     // はじめの1週間ガイドの、今日までの分でまだのもの（_part_ob.js）
}
const engLeft = it => it.filter(x => !x.done).length;
function engInner(it){
  const left = engLeft(it);
  return `<div class="eng-h"><b>${left ? `今日やること のこり<span class="num eng-n">${left}</span>` : "今日やることは、ぜんぶ完了！"}</b><span>${left ? "赤いものが、まだの項目です。押すとその場所が開きます" : "おつかれさまでした。明日もこの調子で"}</span></div>
    <ul class="englist">${it.map((x, i) => `<li class="${x.done ? "ok" : "due"}"><button type="button" data-eng="${i}"><i aria-hidden="true">${x.done ? "✓" : "!"}</i><span><b>${esc(x.t)}</b>${x.s ? `<small>${esc(x.s)}</small>` : ""}</span><em>${x.done ? "完了" : "まだ"}</em></button></li>`).join("")}</ul>`;
}
function engGo(x){
  if (!x) return;
  engPanel(false);
  if (x.fn){ x.fn(); return; }
  if (x.kzv){ hush(); KZ = x.kzv; WDQ = null; showTab("kz"); window.scrollTo(0, 0); return; }
  if (x.tab){ showTab(x.tab); window.scrollTo(0, 0); return; }
  if (x.url){ window.open(x.url, "_blank", "noopener"); return; }
  const my = {"#goal": "goal", "#obCard": "guide"}[x.go];                      // 目標・ガイドはマイの中
  if (my){ myGo(my); return; }
  if (x.todo){ TODAYOPEN = x.todo; TODAYALL = true; }                         // Discord のやることは、ホームの一覧でひらいて見せる
  showTab("me");
  const el = x.go && document.querySelector(x.go);
  if (el) setTimeout(() => el.scrollIntoView({behavior: reduce ? "auto" : "smooth", block: "start"}), 30);
}
document.addEventListener("click", e => { const b = e.target.closest("[data-eng]"); if (b) engGo(ENG[+b.dataset.eng]); });

/* 数字（ベル・ホームのタブ・練習のタブの点・アプリのアイコン）とホームを、いまの状態に合わせる（どれも engItems から） */
function engRefresh(){
  if (!ME) return;
  const it = engItems(ME), n = engLeft(it); ENG = it;
  const bell = $("bell");
  if (bell){ bell.hidden = !!ME.viewer; $("bellN").hidden = !n; $("bellN").textContent = n > 99 ? "99+" : n;
    bell.setAttribute("aria-label", n ? `今日やること のこり${n}こ` : "今日やることは、ぜんぶ完了"); }
  const tb = (id, v, dot) => { const t = $(id); if (!t) return; let i = t.querySelector(".tbdg");
    if (!v){ if (i) i.remove(); return; } if (!i){ i = document.createElement("i"); i.className = "tbdg"; i.setAttribute("aria-hidden", "true"); t.appendChild(i); }
    i.textContent = dot ? "" : v; i.classList.toggle("dot", !!dot); };
  tb("tab-me", n);
  tb("tab-kz", it.some(x => (x.k === "study" || x.k === "words") && !x.done) ? 1 : 0, true);
  paintHome();
  if ($("bellPanel") && !$("bellPanel").hidden) engPanel(true);
  appBadge(n);
  // その日はじめて開いたときに1回だけ、画面の下でお知らせ
  const today = dayKey(Date.now());
  if (n && !ME.viewer && store("cg-nudge") !== today){ store("cg-nudge", today); setTimeout(() => toast(`今日やることが ${n}こ のこっています（右上のベルからも見られます）`, 4200), 900); }
}
function appBadge(n){
  // 対応していない環境（Safari のタブ・Firefox など）では何もしない。iPhone は通知を許可したホーム画面のアプリだけ数字が出る
  try { if (n && navigator.setAppBadge) navigator.setAppBadge(n).catch(() => {}); else if (!n && navigator.clearAppBadge) navigator.clearAppBadge().catch(() => {}); } catch (e) {}
}
function engPanel(open){
  const p = $("bellPanel"), b = $("bell"); if (!p || !b) return;
  if (open === undefined) open = p.hidden;
  if (open){ $("setPanel").hidden = true; $("gear").setAttribute("aria-expanded", "false");
    p.innerHTML = engInner(ENG) + `<div class="acts"><button type="button" class="btn ghost sm2" id="bellSet">リマインド・通知の設定</button></div>`;
    p.querySelector("#bellSet").addEventListener("click", () => { engPanel(false); $("setPanel").hidden = false; $("gear").setAttribute("aria-expanded", "true"); remRender(); });
  }
  p.hidden = !open; b.setAttribute("aria-expanded", String(open));
}

/* ---------- リマインド（決めた時刻に、まだの項目があれば知らせる） ---------- */
const REM_DEF = {on: true, at: "20:00"};
const remCfg = () => { try { return {...REM_DEF, ...JSON.parse(store("cg-remind") || "{}")}; } catch (e) { return {...REM_DEF}; } };
const REM_TIMES = ["07:00", "08:00", "12:00", "18:00", "19:00", "20:00", "21:00", "22:00"];
function remTick(){
  if (!ME || ME.viewer || document.hidden) return;
  const c = remCfg(), now = new Date(), today = dayKey(now);
  if (!c.on || store("cg-remind-last") === today) return;
  const [h, m] = c.at.split(":").map(Number);
  if (now.getHours() * 60 + now.getMinutes() < h * 60 + m) return;
  const left = engItems(ME).filter(x => !x.done); if (!left.length) return;
  store("cg-remind-last", today);
  const body = left.length === 1 ? `「${left[0].t}」がまだです` : `まだの項目が${left.length}こ：${left.slice(0, 2).map(x => x.t).join("・")}${left.length > 2 ? " など" : ""}`;
  toast("⏰ " + body, 5000);
  notifyLocal("チアーズGO! リマインド", body);
}
async function notifyLocal(title, body){
  // iPhone のホーム画面のアプリは new Notification() が使えないので、service worker から出す
  if (!("Notification" in window) || Notification.permission !== "granted") return false;
  try {
    const reg = "serviceWorker" in navigator && await navigator.serviceWorker.getRegistration();
    if (reg){ await reg.showNotification(title, {body, icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: "cg-remind", data: {url: "./?tab=me"}}); return true; }
    new Notification(title, {body, icon: "icons/icon-192.png"}); return true;
  } catch (e) { return false; }
}
function notifEnv(){
  const pushTxt = store("cg-push") === "1" ? "アプリを閉じていても、決めた時刻に練習がまだなら届きます。" : pushReady() ? "" : "アプリを閉じている間の通知は、運営のサーバーの準備ができてから使えます（いまはアプリを開いている間だけ）。";
  if (!("Notification" in window))
    return isIOS() && !isStandalone() ? "iPhone・iPad では、Safari の共有ボタン →「ホーム画面に追加」で入れたアプリから開くと、端末の通知とアイコンの数字が使えます（iOS 16.4 以上）。いまはアプリの中のお知らせとベルの数字だけです。"
      : "このブラウザは端末の通知に対応していません。アプリの中のお知らせ（画面の下）とベルの数字で知らせます。";
  if (Notification.permission === "denied") return "通知が止められています。端末の設定（iPhone は 設定 → 通知 → チアーズGO!）から許可すると使えます。";
  if (Notification.permission === "granted") return "端末の通知：オン。" + pushTxt;
  return "「端末の通知を許可する」を押すと、決めた時刻に端末の通知でも知らせます。" + (isIOS() ? "（iPhone はホーム画面のアプリのときだけ・iOS 16.4 以上）" : "");
}
function remRender(){
  const box = $("spRemind"); if (!box) return;
  if (!ME || ME.viewer){ box.hidden = true; return; }
  const c = remCfg(), canAsk = "Notification" in window && Notification.permission === "default";
  box.hidden = false;
  box.innerHTML = `<b>リマインド・通知</b>
    <label class="rm-on"><input type="checkbox" id="rmOn" ${c.on ? "checked" : ""}> 今日やることが残っていたら知らせる</label>
    <label class="rm-at">時刻 <select id="rmAt" class="kzspeed">${REM_TIMES.map(t => `<option ${t === c.at ? "selected" : ""}>${t}</option>`).join("")}</select></label>
    <div class="acts">${canAsk ? `<button type="button" class="btn sm2" id="rmPerm">端末の通知を許可する</button>` : ""}<button type="button" class="btn ghost sm2" id="rmTest">テストで知らせる</button></div>
    <p class="mapnote" style="margin:0">${esc(notifEnv())}</p>`;
  const save = () => { store("cg-remind", JSON.stringify({on: $("rmOn").checked, at: $("rmAt").value})); store("cg-remind-last", null);
    if (store("cg-push") === "1") ($("rmOn").checked ? pushSubscribe() : pushOff()).then(remRender); };
  $("rmOn").addEventListener("change", save); $("rmAt").addEventListener("change", save);
  if ($("rmPerm")) $("rmPerm").addEventListener("click", async () => {
    let p = "default"; try { p = await Notification.requestPermission(); } catch (e) {}
    if (p === "granted"){ await pushSubscribe(); engRefresh(); toast("通知をオンにしました"); }
    remRender();
  });
  $("rmTest").addEventListener("click", async () => {
    const left = engItems(ME).filter(x => !x.done), body = left.length ? `まだの項目が${left.length}こあります（テスト）` : "今日の項目はぜんぶ完了です（テスト）";
    const ok = await notifyLocal("チアーズGO! リマインド", body);
    toast(ok ? "端末の通知を出しました" : "⏰ " + body, 3600);
  });
}

/* ---------- Web Push（アプリを閉じていても届く通知）。中継の /api/push/subscribe に登録先を渡す ---------- */
/* 公開鍵（VAPID）は public.json の push.vapid（build_site が secrets/publish.json の vapid_public から入れる）。秘密鍵は中継の secret だけに置く */
const b64u = s => { const t = s.replace(/-/g, "+").replace(/_/g, "/"); return Uint8Array.from(atob(t + "=".repeat((4 - t.length % 4) % 4)), c => c.charCodeAt(0)); };
const pushReady = () => !!(ALL && ALL.push && ALL.push.vapid) && apiOn() && !DEMO && "PushManager" in window && "serviceWorker" in navigator;
async function pushSubscribe(){
  if (!pushReady() || !("Notification" in window) || Notification.permission !== "granted") return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: b64u(ALL.push.vapid)});
    const c = remCfg();
    await api("/api/push/subscribe", {sub: sub.toJSON(), at: c.at});
    store("cg-push", "1"); return true;
  } catch (e) { console.warn("push", e); return false; }
}
async function pushOff(){
  try {
    const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription();
    if (sub){ await api("/api/push/unsubscribe", {endpoint: sub.endpoint}).catch(() => {}); await sub.unsubscribe(); }
  } catch (e) {}
  store("cg-push", null); return true;
}

(function engInit(){
  const b = $("bell"); if (!b) return;
  b.addEventListener("click", () => engPanel());
  $("gear").addEventListener("click", () => { engPanel(false); remRender(); obSetRender(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") engPanel(false); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && ME){ engRefresh(); remTick(); } });
  setInterval(remTick, 60e3);
})();

/* ================= はじめの1週間ガイド（登録後のオンボーディング） ================= */
/* 本人用のリンクではじめて開いた日を1日目に、7日間、1日1〜2個の小さなステップを出す（会議メモ 項目32「入会してからの流れをスムーズに」）。
   ステップはホームの「今日やること」に混ぜ、その日のステップは「今日の1つ」にいちばん先に選ばれる。全体の表はマイ＞はじめの1週間ガイド
   - はじめて開いたときだけ「ようこそ」の案内（5枚）を出す
   - ステップの「できた」は、できるものは記録から自動で判定（目標・練習・単語集・2秒応答/AI会話・クエスト）。判定できないもの（ホーム画面に追加・シェア）は本人が押す
   - その日までのステップでまだのものは「今日やること」（_part_engage.js）にも赤で出る
   - 記録はこの端末だけ（cg-ob-*）。先生リンク（見る人）には出さない。デモは3日目として見せる（端末には残さない）
   - 前から使っている人は、はじめて開いた日（cg-open-days のいちばん古い日）から数えるので、14日を過ぎていれば出ない。歯車の「はじめの1週間ガイド」でもう一度出せる */
const OB_DAYS = 7;
const obKey = k => "cg-ob-" + k + (DEMO ? "-demo" : "");
let OB_BIP = null;                                    // Android/PC の Chrome の「インストール」の合図（あれば、ボタンからそのまま出せる）
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); OB_BIP = e; });
const a2hsHow = () => isIOS() ? "Safari の共有ボタン（□に↑）→「ホーム画面に追加」。次からはアイコンで開けて、通知も使えます（iOS 16.4 以上）"
  : "ブラウザのメニュー（︙）→「ホーム画面に追加」または「アプリをインストール」。次からはアイコンで開けます";
const obSteps = () => [
  {day: 1, k: "home", t: "ホーム画面に追加する", s: a2hsHow(), btn: OB_BIP ? "インストール" : "やり方を見る", fn: obInstall, manual: true, done: () => isStandalone() || store(obKey("home")) === "1"},
  {day: 1, k: "goal", t: "今月の目標を決める", s: "目標シートに書いたことを、そのまま書けばOK", btn: "目標を書く", go: "#goal", done: d => !!goalGet(d.today.slice(0, 7))},
  {day: 2, k: "kz", t: "教材で1回練習する", s: "「語順で話す」を1段落、声に出すだけでOK。連続記録が始まります", btn: "教材を開く", tab: "kz", done: d => studyEvents().length > 0 || (d.study_days || []).length > 0},
  {day: 3, k: "word", t: "単語集に1つ入れる", s: "教材の英文で、覚えたい単語をタップ →「単語集に入れる」。1・3・7日後に復習が出ます", btn: "教材を開く", tab: "kz", done: () => wdList().length > 0},
  {day: 4, k: "react", t: "2秒応答かAI会話を1回やってみる", s: "質問に2秒以内に答える練習。答えの速さが記録されます", btn: "教材を開く", tab: "kz", done: () => reactLog().length > 0 || talkLog().length > 0},
  {day: 5, k: "quest", t: "ひとりクエストを1つクリア", s: "外国の方に会いに行く小さな冒険。見つけて予定に入れるだけのものもあります", btn: "クエストを見る", tab: "quest",
    done: () => { try { return Object.keys(localStorage).some(k => k.startsWith("quest-") && localStorage.getItem(k) === "1"); } catch (e) { return false; } }},
  {day: 6, k: "share", t: "共有部屋で自己紹介・気づきをシェア", s: "Discord の「学び・気づきの共有部屋」に一言。+" + ALL.rules.pts.share + "pt。仲間からコメントが届きます", btn: "共有部屋を開く",
    url: (ALL.links || {}).manabi, manual: true, done: d => ((d.cnt.all || {}).share || 0) > 0 || store(obKey("share")) === "1"},
  {day: 7, k: "remind", t: "リマインドの時刻を決める", s: "まだの項目があったら、決めた時刻に知らせます（右上の歯車 →「リマインド・通知」）", btn: "設定を開く", fn: obRemind, done: () => !!store("cg-remind")}
];
function obInstall(){
  if (OB_BIP){ OB_BIP.prompt(); OB_BIP.userChoice.then(r => { if (r.outcome === "accepted"){ store(obKey("home"), "1"); renderMeKeep(); } }).catch(() => {}); OB_BIP = null; return; }
  toast(a2hsHow(), 6500);
}
function obRemind(){ $("setPanel").hidden = false; $("gear").setAttribute("aria-expanded", "true"); remRender(); obSetRender(); window.scrollTo({top: 0, behavior: reduce ? "auto" : "smooth"}); }
function obStart(){
  const today = dayKey(Date.now());
  if (DEMO){ const t = new Date(today + "T12:00:00"); t.setDate(t.getDate() - 2); return dayKey(t); }
  let s = store("cg-ob-start");
  if (!s){ s = openDays()[0] || today; store("cg-ob-start", s); }
  return s;
}
const obDay = () => Math.floor((new Date(dayKey(Date.now()) + "T12:00:00") - new Date(obStart() + "T12:00:00")) / 864e5) + 1;
function obOn(d){
  if (!d || d.viewer || store(obKey("hide")) === "1") return false;
  return obDay() <= OB_DAYS * 2 || store(obKey("show")) === "1";   // 1週間がすぎても、まだのものがあれば2週目まで出す
}
// 「今日やること」に入れる分：今日までのステップでまだのもの（目標・練習は今日やることに元からあるので入れない）
function obItems(d){
  if (!obOn(d)) return [];
  const day = Math.min(obDay(), OB_DAYS);
  return obSteps().filter(x => x.day <= day && x.k !== "goal" && x.k !== "kz" && !x.done(d)).map(x => ({k: "ob-" + x.k, t: "ガイド：" + x.t, s: x.day + "日目のステップ", tab: x.tab, url: x.url, go: x.go || "#obCard", fn: x.fn, done: false}));
}
function obHtml(d){
  if (!obOn(d)) return "";
  const st = obSteps(), day = obDay(), cur = Math.min(day, OB_DAYS), nd = st.filter(x => x.done(d)).length, all = nd === st.length;
  const dayDone = n => st.filter(x => x.day === n).every(x => x.done(d));
  return `<section class="obcard${all ? " clear" : ""}" id="obCard" aria-label="はじめの1週間ガイド">
    <div class="ob-h"><span class="gl-k">はじめの1週間ガイド</span><b>${all ? "ぜんぶクリア！" : day > OB_DAYS ? "のこりのステップ" : `${cur}日目`}</b><span class="num ob-n">${nd} / ${st.length}</span></div>
    <div class="ob-days" aria-hidden="true">${[...Array(OB_DAYS)].map((_, i) => `<i class="${dayDone(i + 1) ? "on" : ""}${i + 1 === cur ? " now" : ""}${i + 1 > cur ? " fut" : ""}">${dayDone(i + 1) ? "✓" : i + 1}</i>`).join("")}</div>
    <p class="mini">${all ? "1週間のステップを、ぜんぶやりきりました。ここからは「今日やること」を毎日0にしていきましょう。" : "1日1〜2個の小さなステップです。先の日の分を先にやってもOK。"}</p>
    <ol class="oblist">${st.map((x, i) => { const ok = x.done(d), cls = ok ? "ok" : x.day <= cur ? "due" : "later";
      return `<li class="${cls}"><span class="ob-d">${x.day}日目</span><div><b>${esc(x.t)}</b><small>${esc(x.s)}</small>
        ${ok ? "" : `<div class="acts">${x.url ? `<a class="btn sm2" href="${esc(x.url)}" target="_blank" rel="noopener">${ICON.ext}${esc(x.btn)}</a>` : `<button type="button" class="btn sm2" data-obgo="${i}">${esc(x.btn)}</button>`}${x.manual ? `<button type="button" class="btn ghost sm2" data-obdone="${x.k}">できた</button>` : ""}</div>`}</div>
        <em>${ok ? "✓" : x.day <= cur ? "まだ" : "これから"}</em></li>`; }).join("")}</ol>
    <div class="acts"><button type="button" class="more" id="obHide">${all ? "ガイドを閉じる" : "ガイドを閉じる（歯車からまた出せます）"}</button></div></section>`;
}
function renderMeKeep(){ if (!ME) return; const y = window.scrollY; renderMe(ME); window.scrollTo(0, y); }
function bindOb(){
  const c = $("obCard"); if (!c) return;
  const st = obSteps();
  c.querySelectorAll("[data-obgo]").forEach(b => b.addEventListener("click", () => engGo(st[+b.dataset.obgo])));
  c.querySelectorAll("[data-obdone]").forEach(b => b.addEventListener("click", () => { store(obKey(b.dataset.obdone), "1"); toast("ナイス！ステップをクリアしました"); renderMeKeep(); }));
  $("obHide").addEventListener("click", () => { store(obKey("hide"), "1"); store(obKey("show"), null); renderMeKeep(); toast("ガイドを閉じました。歯車の「はじめの1週間ガイド」から、また出せます"); });
}
// 歯車の中：ガイドをもう一度出す
function obSetRender(){
  const box = $("spGuide"); if (!box) return;
  if (!ME || ME.viewer){ box.hidden = true; return; }
  box.hidden = false;
  box.innerHTML = `<b>はじめの1週間ガイド</b><div class="acts"><button type="button" class="btn ghost sm2" id="obAgain">ガイドを開く</button><button type="button" class="btn ghost sm2" id="obTour">「ようこそ」の案内を見る</button></div>`;
  $("obAgain").addEventListener("click", () => { store(obKey("hide"), null); store(obKey("show"), "1"); $("setPanel").hidden = true; $("gear").setAttribute("aria-expanded", "false"); renderMeKeep(); myGo("guide"); });
  $("obTour").addEventListener("click", () => { $("setPanel").hidden = true; $("gear").setAttribute("aria-expanded", "false"); obWelcome(true); });
}

/* ---------- はじめて開いたときの「ようこそ」（5枚） ---------- */
const OB_TOUR = [
  ["🍻", "ようこそ、チアーズGO!へ", "英語の練習・乾杯の記録・仲間とのつながりが、このアプリ1つにまとまっています。リンクで1回開けば、次からはこの端末でそのまま開けます。"],
  ["🏠", "ホーム：今日の1つ", "ホームを開いたら、まず「今日の1つ」の「はじめる」を押すだけ。その下の「今日やること」で、まだのものは赤。右上のベルの数字も「まだの数」です。"],
  ["🎙️", "練習：あなた専用の練習", "オーダーメイド教材・会話（AI会話・2秒応答・1分スピーチ）・単語集・記録。1日1回でOK。続けた日数が「連続記録」になります。"],
  ["🌏", "冒険：マップ・図鑑・クエスト", "外国の方に会いに行く「ひとりクエスト」。乾杯したらチアーズPHOTOに投稿すると、マップにピン、図鑑に国が入ります。"],
  ["🗓️", "最初の1週間は、ガイドどおりに", "1日1〜2個の小さなステップが「今日の1つ」に出ます。全体はマイの「はじめの1週間ガイド」。分からないことは、右下の「質問」から聞けます。"]
];
function obWelcome(force){
  if (!ME || ME.viewer) return;
  if (!force && (store(obKey("welcome")) === "1" || !obOn(ME))) return;
  let dlg = $("obDlg");
  if (!dlg){ dlg = document.createElement("dialog"); dlg.id = "obDlg"; dlg.className = "obdlg"; dlg.setAttribute("aria-label", "チアーズGO! のはじめかた"); document.body.appendChild(dlg);
    dlg.addEventListener("close", () => store(obKey("welcome"), "1")); }
  let i = 0;
  const draw = () => {
    const [ic, h, p] = OB_TOUR[i], last = i === OB_TOUR.length - 1;
    dlg.innerHTML = `<div class="ob-w"><span class="ob-ic" aria-hidden="true">${ic}</span><h2>${esc(h)}</h2><p>${esc(p)}</p>
      <div class="ob-dots" aria-hidden="true">${OB_TOUR.map((_, k) => `<i class="${k === i ? "on" : ""}"></i>`).join("")}</div>
      <div class="acts">${i ? `<button type="button" class="btn ghost" data-ow="-1">もどる</button>` : `<button type="button" class="btn ghost" data-ow="x">スキップ</button>`}
        <button type="button" class="btn" data-ow="${last ? "x" : "1"}">${last ? "はじめる" : "次へ"}</button></div></div>`;
    dlg.querySelectorAll("[data-ow]").forEach(b => b.addEventListener("click", () => { const v = b.dataset.ow; if (v === "x"){ dlg.close(); return; } i += +v; draw(); }));
    const nx = dlg.querySelector('[data-ow="1"], [data-ow="x"].btn:not(.ghost)'); if (nx) nx.focus();
  };
  draw();
  if (!dlg.open) dlg.showModal();
}

/* ================= マイ：自分を振り返る（プロフィール・記録・説明・設定） ================= */
/* 毎日目に入らなくていいもの（統計・説明・アルバム・バッジ・講座の一覧・設定）はここに置く。
   中の画面は MYV（null＝マイのトップ）。部品は _part_me.js の関数をそのまま使う */
let MYV = null;
function openSettings(){
  engPanel(false); $("setPanel").hidden = false; $("gear").setAttribute("aria-expanded", "true"); remRender(); obSetRender();
  window.scrollTo({top: 0, behavior: reduce ? "auto" : "smooth"});
}
function profileHtml(d){
  const L = d.level, last = d.photos[d.photos.length - 1], im = last && IMGS[last.id], bc = badgeCount(d);
  return `<section class="myprof"><span class="myav">${im && (im.s || im.l) ? `<img src="${im.s || im.l}" alt="">` : esc((d.display || d.name || "?").slice(0, 1))}</span>
    <div><b>${esc(d.display || d.name)}${d.demo ? '<i class="demo">デモ</i>' : ""}</b><span>Lv${L.lv} ${esc(L.name)}・総 <b class="num">${fmt(d.pts.all)}</b>pt・バッジ <b class="num">${bc.on}</b></span></div></section>`;
}
const myTile = (k, ic, t, sub, cls) => `<button type="button" class="mytile${cls ? " " + cls : ""}" data-my="${k}"><b><i aria-hidden="true">${ic}</i>${t}</b><span>${sub}</span></button>`;
const myRow = (k, ic, t, sub) => `<li><button type="button" data-my="${k}"><i aria-hidden="true">${ic}</i><b>${t}</b>${sub ? `<span class="num">${sub}</span>` : ""}<em aria-hidden="true">›</em></button></li>`;
// マイの中の画面：[見出し, 中身]
const MY_VIEWS = {
  goal: ["今月の目標", d => goalHtml(d)],
  streak: ["連続記録・活動カレンダー", d => streakHtml(d) + `<section><div class="sec-h"><h2>${SPARK}活動カレンダー</h2><p>1日にためたチアーズポイントの多さ（直近12週）。</p></div><div class="panel">${heatHtml(d)}</div></section>`],
  points: ["ポイント推移・貢献", d => weekPtsHtml(d) + contribHtml(d)],
  badges: ["はじめの一歩・バッジ", d => firstsHtml(d)],
  album: ["アルバム・PHOTOカード", d => wallSecHtml(d) + stampHtml(d) + albumSecHtml(d)],
  sched: ["講座スケジュール・予約", d => (schedHtml(d.schedule || []) || `<p class="mapnote">これからの講座は、まだ入っていません。</p>`)
    + `<section class="soonbox"><b>📝 予約<i class="new">準備中</i></b><p>面談・講座の予約を、ここからできるようにします。いまは講座の参加リンクと、会員サイトの講座からどうぞ。</p>
      <div class="acts"><button type="button" class="btn ghost sm2" data-tab="kz" data-utgo>会員サイト講座を見る</button></div></section>`],
  story: ["わたしの歩み", d => storyHtml(d)],
  guide: ["はじめの1週間ガイド", d => obHtml(d) || `<div class="note">はじめの1週間ガイドは閉じています。<div class="acts" style="margin-top:8px"><button type="button" class="btn ghost sm2" id="obShow">ガイドをもう一度出す</button></div></div>`],
  help: ["ポイントのため方・撮り方", () => rulesSecHtml() + howtoHtml()]
};
function renderMy(){
  const box = $("my"); if (!box) return;
  if (!ME){ box.innerHTML = `<p class="loading">あなたのページを読み込んでいます…</p>`; return; }
  const d = ME;
  if (MYV && MY_VIEWS[MYV]){
    const [t, f] = MY_VIEWS[MYV];
    box.innerHTML = `<button class="more kzback" type="button" id="myBack">← マイ</button><h2 class="my-h">${esc(t)}</h2>${f(d)}`;
    $("myBack").addEventListener("click", () => { MYV = null; renderMy(); window.scrollTo(0, 0); });
    if ($("obShow")) $("obShow").addEventListener("click", () => { store(obKey("hide"), null); store(obKey("show"), "1"); renderMeKeep(); });
    bindCards(box);
    return;
  }
  MYV = null;
  const ym = d.today.slice(0, 7), g = goalGet(ym), run = runOf(studySet(d), dayKey(Date.now())), bc = badgeCount(d);
  const obN = (() => { const st = obSteps(); return `${st.filter(x => x.done(d)).length}/${st.length}`; })();
  box.innerHTML = `${profileHtml(d)}
    <div class="mytiles">
      ${myTile("goal", "🎯", "今月の目標", g ? `${fmt(goalNow(d, g, ym))}/${fmt(g.target)}` : "まだ決めていません")}
      ${myTile("streak", "🔥", "連続記録", `${run}日・カレンダー`)}
      ${myTile("points", "📈", "ポイント推移", `今週 ${fmt(d.pts.week)}pt・12週・貢献`)}
      ${myTile("badges", "🏅", "バッジ", `${bc.on}/${bc.all}・はじめの一歩`)}
      ${myTile("album", "🖼️", "アルバム", `${d.photos.length}枚・PHOTOカード`)}
      ${myTile("story", "📖", `わたしの歩み<i class="new">NEW</i>`, "ビフォーアフター（準備中）")}
    </div>
    <ul class="mylist">
      ${myRow("sched", "📅", "講座スケジュール・予約")}
      ${d.viewer ? "" : myRow("guide", "🔰", "はじめの1週間ガイド", obN)}
      ${myRow("help", "❓", "ポイントのため方・撮り方")}
      ${myRow("bot", "🍵", "MATCHA（貿易ツール）", "質問BOT")}
      ${myRow("settings", "🔔", "リマインド・通知／表示設定")}
    </ul>`;
  bindCards(box);
}
// わたしの歩み（準備中）：入会してからのビフォーアフターを1ページに。いまは記録からわかることだけ
function storyHtml(d){
  const ps = d.photos, first = ps[0], days = [...studySet(d)].sort(), nC = Object.keys(myCountries(d)).length;
  const facts = [first ? ["はじめての乾杯", jpd(first.d)] : null, days.length ? ["はじめての英語の練習（記録のある日）", jpd(days[0])] : null,
    ["乾杯した国", nC + "か国"], ["チアーズPHOTO", ps.length + "枚"], ["チアーズポイント", fmt(d.pts.all) + "pt"]].filter(Boolean);
  return `<section class="soonbox"><b>📖 わたしの歩み<i class="new">準備中</i></b><p>入会したときの目標と、いまのあなた（ビフォーアフター）を1ページにまとめて、仲間にも見せられるようにします。いまは記録からわかることだけ出しています。</p></section>
    <ul class="facts story">${facts.map(([k, v]) => `<li><span>${esc(k)}</span><b>${esc(v)}</b></li>`).join("")}</ul>`;
}
function myGo(k){
  if (k === "settings"){ openSettings(); return; }
  if (k === "bot"){ botOpen(); return; }
  MYV = MY_VIEWS[k] ? k : null;
  if ($("pane-my").hidden) showTab("my"); else renderMy();
  window.scrollTo(0, 0);
}

/* ================= 乾杯マップ（Leaflet＋OpenStreetMap） ================= */
let LMAP = null, LAYERS = {}, MAPMODE = "me";
function pinQuery(p){ return p.venue ? `${p.venue} ${p.city}` : p.city; }
function spread(points){
  // 同じ場所のピンは、ひまわりの種のように少しずつずらす（重なって見えなくならないように）
  const by = {};
  points.forEach(p => { const k = p.lat.toFixed(3) + "," + p.lon.toFixed(3); (by[k] = by[k] || []).push(p); });
  Object.values(by).forEach(g => g.forEach((p, i) => {
    if (!i) { p.y = p.lat; p.x = p.lon; return; }
    const a = i * 2.39996, r = 0.0045 * Math.sqrt(i) * (p.level === "country" ? 18 : 1);
    p.y = p.lat + r * Math.sin(a); p.x = p.lon + r * Math.cos(a) / Math.cos(p.lat * Math.PI / 180);
  }));
  return points;
}
function myPins(){
  if (!ME) return [];
  return ME.photos.filter(p => p.pin).map(p => ({...p.pin, d: p.d, cc: (p.cc || []).map(c => c.iso), img: (IMGS[p.id] || {}).s, ph: p.i, mine: true}));
}
function teamPins(){
  if (TEAM && TEAM.pins) return TEAM.pins.map(p => ({...p, team: true}));
  return (ALL.spots || []).map(s => ({...s, team: true, agg: true}));
}
function markerFor(p){
  const lvl = p.level || "city";
  const body = p.img ? `<img src="${p.img}" alt="">` : `<span>${p.agg ? p.n : flagOf((p.cc || [])[0]) || "🍻"}</span>`;
  return L.marker([p.y, p.x], {icon: L.divIcon({className: "", html: `<div class="lp ${lvl}${p.team ? " team" : ""}">${body}</div>`, iconSize: [44, 44], iconAnchor: [22, 22], popupAnchor: [0, -20]}), riseOnHover: true});
}
function popupFor(p){
  const flags = (p.cc || []).map(iso => `<span class="chip">${flagOf(iso)} ${esc((ALL.cc[iso] || {}).name || iso)}</span>`).join("");
  const where = p.level === "country" ? `${esc(p.city)}<small>（国まで分かった乾杯）</small>` : esc(p.venue ? p.city + "・" + p.venue : p.city);
  return `<div class="lpop">${p.img ? `<img src="${p.img}" alt="">` : ""}
    <b>${ICON.pin}${where}</b>
    ${p.agg ? `<span class="mapnote" style="margin:0">メンバーの乾杯 ${p.n}回</span>` : `<span class="num">${p.d ? jpd(p.d) : ""}</span>`}
    ${flags ? `<div class="ccs" style="margin-top:2px">${flags}</div>` : ""}
    <div class="acts"><a class="btn gm" href="${gmap(pinQuery(p))}" target="_blank" rel="noopener">${ICON.ext}Googleマップで開く</a>${p.mine ? `<button class="btn ghost" type="button" data-ph="${p.ph}">写真を見る</button>` : ""}</div></div>`;
}
function renderMap(){
  const mine = myPins(), team = teamPins();
  if (!ME && MAPMODE === "me") MAPMODE = "team";
  const cities = {};
  (MAPMODE === "me" ? mine : team).forEach(p => { const k = p.city + (p.venue ? "・" + p.venue : ""); const c = cities[k] = cities[k] || {p, n: 0, cc: new Set()}; c.n += p.agg ? p.n : 1; (p.cc || []).forEach(x => c.cc.add(x)); });
  const list = Object.values(cities).sort((a, b) => b.n - a.n);
  const nCity = new Set(mine.filter(p => p.level !== "country").map(p => p.city)).size;
  $("mapwrap").innerHTML = `
    <div class="sec-h"><h2>${SPARK}乾杯マップ</h2><p>写真に書いた「誰と、どこで」から、乾杯した街とお店にピンを立てます。街が書いていない写真は、相手の国にピンが立ちます。</p></div>
    <div class="mtoggle" role="group" aria-label="表示するピン">
      ${ME ? `<button type="button" data-mm="me" aria-pressed="${MAPMODE === "me"}">わたしの乾杯<span class="num">${mine.length}</span></button>` : ""}
      <button type="button" data-mm="team" aria-pressed="${MAPMODE === "team"}">みんなの乾杯<span class="num">${team.reduce((s, p) => s + (p.agg ? p.n : 1), 0)}</span></button>
    </div>
    <div class="lmapbox"><div id="lmap" role="region" aria-label="乾杯マップ"></div><button type="button" class="mapall" id="mapAll">世界全体で見る</button></div>
    ${ME && MAPMODE === "me" ? `<p class="mapnote">わたしの乾杯スポット <b class="num">${nCity}</b>街。${mine.some(p => p.level === "country") ? "点線のピンは国までしか分からなかった乾杯です。次の投稿では、街やお店の名前まで書いてみましょう。" : ""}</p>` : ""}
    <h3 class="spot-h">${MAPMODE === "me" ? "わたしの乾杯スポット" : "みんなの乾杯スポット"}</h3>
    ${list.length ? `<ul class="spots">${list.map(c => `<li><button type="button" class="sp" data-ll="${c.p.lat},${c.p.lon}"><b>${esc(c.p.venue ? c.p.city + "・" + c.p.venue : c.p.city)}</b><span>${[...c.cc].slice(0, 4).map(flagOf).join(" ")}</span><span class="num">${c.n}回</span></button><a class="btn gm" href="${gmap(pinQuery(c.p))}" target="_blank" rel="noopener" aria-label="${esc(c.p.city)}をGoogleマップで開く">${ICON.pin}地図</a></li>`).join("")}</ul>`
      : `<p class="mapnote">まだピンがありません。チアーズPHOTOの「誰と、どこで」に街の名前を書くと、ここにピンが立ちます。</p>`}`;
  $("mapwrap").querySelectorAll("[data-mm]").forEach(b => b.addEventListener("click", () => { MAPMODE = b.dataset.mm; LMAP && LMAP.remove(); LMAP = null; renderMap(); }));
  $("mapwrap").querySelectorAll(".sp").forEach(b => b.addEventListener("click", () => { const [a, o] = b.dataset.ll.split(",").map(Number); LMAP && LMAP.flyTo([a, o], 13, {duration: reduce ? 0 : 1.2}); $("lmap").scrollIntoView({behavior: reduce ? "auto" : "smooth", block: "center"}); }));
  if (!window.L){ $("lmap").innerHTML = `<p class="mapnote" style="padding:20px">地図を読み込めませんでした。通信をたしかめて、もう一度開いてください。</p>`; return; }
  LMAP = L.map("lmap", {zoomControl: true, scrollWheelZoom: false, worldCopyJump: true}).setView([35.68, 139.76], 4);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(LMAP);
  const pts = spread((MAPMODE === "me" ? mine : team).map(p => ({...p})));
  const ms = pts.map(p => markerFor(p).bindPopup(popupFor(p), {maxWidth: 260, minWidth: 220}).addTo(LMAP));
  // 最初は、いちばん乾杯が多い国のまわりに寄せる（世界中に散っていても、自分の街が見えるように）
  const isoN = {}; pts.forEach(p => isoN[p.iso] = (isoN[p.iso] || 0) + (p.agg ? p.n : 1));
  const topIso = Object.keys(isoN).sort((a, b) => isoN[b] - isoN[a])[0];
  const near = ms.filter((m, i) => pts[i].iso === topIso && pts[i].level !== "country");
  const all = ms.length ? L.featureGroup(ms).getBounds().pad(0.2) : null;
  if (near.length) LMAP.fitBounds(L.featureGroup(near).getBounds().pad(0.35), {maxZoom: 12});
  else if (all) LMAP.fitBounds(all, {maxZoom: 12});
  $("mapAll").addEventListener("click", () => { if (all) LMAP.flyToBounds(all, {duration: reduce ? 0 : 1.2}); else LMAP.setView([20, 140], 2); });
  LMAP.on("popupopen", e => { const el = e.popup.getElement(); el.querySelectorAll("[data-ph]").forEach(b => b.addEventListener("click", () => openDlg(+b.dataset.ph))); });
}

/* ================= 乾杯図鑑 ================= */
function dexStats(ccP){
  let got = 0, total = 0;
  ALL.dex.forEach(([, cs]) => cs.forEach(([iso]) => { total++; if (ccP[iso]) got++; }));
  return {got, total};
}
function renderDex(){
  const ccP = ME ? myCountries(ME) : {};
  const team = {}; ((ALL.team || {}).countries || []).forEach(c => team[c.iso] = c);
  const inDex = new Set(); let no = 0;
  const {got, total} = dexStats(ccP);
  const regs = ALL.dex.map(([rg, cs]) => {
    const cells = cs.map(([iso, name]) => { no++; inDex.add(iso); const me = ccP[iso];
      if (me) return `<div class="dx got"><span class="no">No.${String(no).padStart(3, "0")}</span><span class="fl">${flagOf(iso)}</span><span class="nm">${esc(name)}</span><span class="sb">乾杯 ${me.n}回</span></div>`;
      const t = team[iso];
      return `<div class="dx lock${t ? " hint" : ""}"><span class="no">No.${String(no).padStart(3, "0")}</span><span class="fl">${flagOf(iso)}</span><span class="nm">${t ? esc(name) : "？？？"}</span><span class="sb">${t ? "仲間が乾杯ずみ" : "未発見"}</span></div>`; }).join("");
    const n = cs.filter(([iso]) => ccP[iso]).length;
    return `<div class="dexreg"><div class="dexreg-h"><h3>${rg}</h3><span class="num">${n} / ${cs.length}</span>${n === cs.length ? '<span class="comp">COMPLETE</span>' : ""}</div><div class="track"><div class="fill" style="width:${Math.round(100 * n / cs.length)}%"></div></div><div class="dexgrid" style="margin-top:10px">${cells}</div></div>`;
  }).join("");
  const rare = Object.keys(ccP).filter(k => !inDex.has(k) && k !== "JP");
  const rareHtml = rare.length ? `<div class="dexreg"><div class="dexreg-h"><h3>レア国</h3><span class="num">${rare.length}か国</span></div><div class="dexgrid">${rare.map(k => `<div class="dx rare"><span class="no">RARE</span><span class="fl">${flagOf(k)}</span><span class="nm">${esc(ccP[k].name)}</span><span class="sb">乾杯 ${ccP[k].n}回</span></div>`).join("")}</div></div>` : "";
  const city = (ME && ME.home_city) || "";
  const next = ((ALL.team || {}).countries || []).filter(c => !ccP[c.iso] && c.iso !== "JP").slice(0, 3);
  const nextHtml = next.length ? `<h3 style="margin-top:26px;color:var(--navy);font-size:17px">次に狙う国</h3><p class="mapnote" style="margin-top:0">仲間はもう乾杯しているけれど、あなたの図鑑にはまだない国です。</p>
    <div class="nextc">${next.map(c => `<div class="nc"><div class="t"><span class="fl">${flagOf(c.iso)}</span>${esc(c.name)}</div><p>仲間が${c.n}回乾杯した国。${esc(c.name)}料理のお店なら、${esc(c.name)}の人に会えるかも。</p><a class="btn gm" href="${gmap(c.name + "料理 " + city)}" target="_blank" rel="noopener">${ICON.ext}${city ? esc(city) + "で" : "近くの"}お店を探す</a></div>`).join("")}</div>` : "";
  const pct = Math.round(100 * got / total);
  $("dexwrap").innerHTML = `<div class="sec-h"><h2>${SPARK}乾杯図鑑</h2><p>乾杯した相手の国が、図鑑に1か国ずつ入ります。地域をぜんぶ集めるとCOMPLETE。</p></div>
    ${ME ? "" : `<div class="note" style="margin-bottom:14px">あなた専用のリンクで開くと、あなたの図鑑になります。いまは仲間が乾杯した国のヒントだけ出ています。</div>`}
    <div class="dexhead"><span><b class="num">${got}</b>/ ${total}か国 発見</span><span>レア <b class="num" style="font-size:22px">${rare.length}</b></span><div class="track dexbar"><div class="fill" style="width:${pct}%"></div></div></div>
    ${ME ? `<div class="panel" style="padding:12px 14px">${worldMap(ccP, "図鑑の国の世界地図", null)}</div>` : ""}
    ${regs}${rareHtml}${nextHtml}`;
  initMaps($("dexwrap"));
  bindCommon($("dexwrap"));
}

/* ================= ひとりクエスト ================= */
const QUESTS = [
  {id:"cafe", title:"外国の方が多いカフェで、1時間作業する", why:"まずは同じ空間にいるだけでOK。目が合ったら笑顔で会釈。", q:"international cafe", say:"Hi! Is this seat free?"},
  {id:"lx", title:"言語交換イベントを1つ見つけて、予定に入れる", why:"参加するのは来週でもOK。見つけて予定に入れたらクリア。", q:"language exchange", say:"Hi, is this your first time here too?"},
  {id:"pub", title:"外国の方が集まるバー・パブをのぞく", why:"カウンターに座ると、話しかけるきっかけが自然に生まれます。", q:"international bar pub", say:"Cheers! Where are you from?"},
  {id:"beer", title:"世界のビールが飲める店で、店員さんにおすすめを聞く", why:"英語で一言聞けたらクリア。そのまま乾杯できたら最高です。", q:"world beer bar", say:"What do you recommend tonight?"},
  {id:"food", title:"外国料理のお店で、その国の人に一言話しかける", why:"お店の人の国が、そのまま図鑑の次の1か国になるかも。", q:"ethnic restaurant", say:"This is so good! Is this from your hometown?"},
  {id:"info", title:"観光地で、困っている旅行者に声をかける", why:"「写真撮りましょうか？」の一言は、乾杯への近道です。", q:"tourist information center", say:"Would you like me to take a photo for you?"},
  {id:"meet", title:"英語で話せるミートアップを探して申し込む", why:"申し込んだらクリア。当日はチアーズPHOTOのチャンス。", q:"english meetup", say:"Nice to meet you! What brings you here?"},
  {id:"cowork", title:"コワーキングで、海外から来た人と名刺交換する", why:"グローバルフリーランスの仲間は、こういう場所にいます。", q:"coworking space", say:"What kind of work do you do?"}
];
function weekStart(today){ const t = new Date(today + "T12:00:00"); t.setDate(t.getDate() - (t.getDay() + 6) % 7); return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0"); }
function weekQuests(d){
  const ws = weekStart(d.today), n = Math.round(new Date(ws + "T12:00:00").getTime() / 6048e5);
  const qs = [0, 1, 2].map(k => QUESTS[(n * 3 + k * 3) % QUESTS.length]).filter((q, i, a) => a.indexOf(q) === i);
  // 図鑑クエスト：仲間は乾杯したのに、自分の図鑑にない国
  const ccP = d.photos ? myCountries(d) : {};
  const t = ((ALL.team || {}).countries || []).filter(c => !ccP[c.iso] && c.iso !== "JP")[n % 3] || null;
  if (t) qs.push({id: "dex-" + t.iso, title: `${t.name}料理のお店で、${t.name}の人に話しかける`, why: `図鑑に${t.name}が入ったらクリア。仲間はもう${t.n}回乾杯しています。`, q: t.name + "料理", say: "Hi! Are you from " + (t.en || t.name) + "? Cheers!", dex: t.iso});
  // 教材クエスト：乾杯フレーズ教材を1回練習する（教材があるときだけ）
  const kz = (d.kyozai || []).find(m => m.cheers) || (d.kyozai || [])[0];
  if (kz) qs.push({id: "kz", title: `教材「${kz.title}」で1回練習する`, why: "語順日本語を見ながら1段落でも声に出せたらクリア。本番の一言がすっと出るようになります。",
    say: ((kz.paras || [])[0] || {en: ""}).en.split(/(?<=[.!?])\s/)[0], kz: kz.id});
  return qs;
}
function renderQuest(){
  const d = ME || {today: ALL.today};
  const ws = weekStart(d.today), qs = weekQuests(d), city = (ME && ME.home_city) || "";
  const did = qs.map(q => store("quest-" + ws + "-" + q.id) === "1");
  const nd = did.filter(Boolean).length;
  $("questwrap").innerHTML = `<div class="sec-h"><h2>${SPARK}今週のひとりクエスト</h2><p>1人でできる「外国の方に会いに行く」小さな冒険。毎週月曜に入れかわります。</p></div>
    <div class="qhead"><div class="qs">${qs.map((q, i) => `<i class="${did[i] ? "on" : ""}">${did[i] ? "✓" : i + 1}</i>`).join("")}</div>
      <div><b>${nd >= qs.length ? "今週のクエスト、ぜんぶクリア！" : `今週のクエスト ${nd} / ${qs.length}`}</b><br><span>${md(ws)}からの1週間。${city ? `Googleマップは「${esc(city)}」のまわりで探します。` : "Googleマップは、いまいる場所のまわりで探します。"}</span></div></div>
    <ul class="quests">${qs.map((q, i) => `<li class="qc${did[i] ? " did" : ""}${q.dex ? " qdex" : ""}${q.kz ? " qkz" : ""}" data-q="${q.id}"><span class="qk">${q.dex ? "図鑑クエスト " + flagOf(q.dex) : q.kz ? "教材クエスト" : "QUEST " + (i + 1)}</span><h3>${esc(q.title)}</h3><p>${esc(q.why)}</p>
      <div class="phrase"><q>${esc(q.say)}</q><button class="btn ghost" type="button" data-copy="${esc(q.say)}">コピー</button></div>
      <div class="acts">${q.kz ? `<button class="btn" type="button" data-kz="${esc(q.kz)}">教材を開く</button>` : `<a class="btn gm" href="${gmap(q.q + (city ? " " + city : ""))}" target="_blank" rel="noopener">${ICON.pin}Googleマップで探す</a>`}
        <button class="btn ghost" type="button" data-quest="${q.id}" aria-pressed="${did[i]}">${did[i] ? "クリア！（取り消す）" : "できたらチェック"}</button></div></li>`).join("")}</ul>
    <p class="qnote">クエストの途中で乾杯できたら、チアーズPHOTOに投稿すると +${ALL.rules.pts.photo}pt。「誰と、どこで」にお店の名前を書くと、乾杯マップにそのお店のピンが立ちます。クエストのチェックはこの端末にだけ記録されます。</p>`;
  bindCommon($("questwrap"));
  $("questwrap").querySelectorAll("[data-quest]").forEach(b => b.addEventListener("click", () => {
    const k = "quest-" + ws + "-" + b.dataset.quest, on = store(k) === "1";
    store(k, on ? null : "1"); renderQuest(); if (ME) renderMe(ME);
  }));
}

/* ================= 写真の詳細 ================= */
let cur = 0;
function openDlg(i){
  const p = PH[i]; if (!p) return; cur = i;
  const im = IMGS[p.id];
  $("dImg").src = im ? (im.l || im.s) : ""; $("dImg").alt = jpd(p.d) + "の写真";
  $("dNo").textContent = "No." + String(i + 1).padStart(3, "0") + "・" + (p.chal ? "チアーズPHOTOチャレンジ" : SRC[p.src] || "");
  $("dDate").textContent = jpd(p.d);
  $("dCc").innerHTML = (p.cc || []).map(c => `<span class="chip">${flagOf(c.iso)} ${esc(c.name)}</span>`).join("");
  $("dDl").innerHTML = (p.pin ? `<div><dt>乾杯した場所</dt><dd>${esc(placeOf(p))}${p.pin.level === "country" ? "（国まで）" : ""} <a class="btn gm sm" href="${gmap(pinQuery(p.pin))}" target="_blank" rel="noopener">${ICON.pin}Googleマップ</a></dd></div>` : "")
    + (p.where ? `<div><dt>誰と、どこで？</dt><dd>${esc(p.where)}</dd></div>` : "") + (p.note ? `<div><dt>よかったこと、気づいたこと</dt><dd>${esc(p.note)}</dd></div>` : "") + (p.cap ? `<div><dt>ひとこと</dt><dd>${esc(p.cap)}</dd></div>` : "");
  $("dPrev").disabled = i === 0; $("dNext").disabled = i === PH.length - 1;
  const dlg = $("dlg"); if (!dlg.open) dlg.showModal();
}
$("dlgX").addEventListener("click", () => $("dlg").close());
$("dlg").addEventListener("click", e => { if (e.target === $("dlg")) $("dlg").close(); });
$("dPrev").addEventListener("click", () => openDlg(cur - 1));
$("dNext").addEventListener("click", () => openDlg(cur + 1));
document.addEventListener("click", e => { const b = e.target.closest("#me [data-ph], #my [data-ph], #dexwrap [data-ph]"); if (b) openDlg(+b.dataset.ph); });

/* ================= タブ（下の5つ）とセグメント ================= */
/* ホーム（me）・練習（kz）・冒険（go：マップ／図鑑／クエスト）・みんな（us）・マイ（my）。
   前の場所の名前（?tab=map・#dex・端末に覚えた cg-tab など）は、新しい場所に読みかえる（前のリンクを壊さない） */
const TABS = ["me", "kz", "go", "us", "my"];
const RENDERED = {};
let PERSONAL = false, GOSEG = store("cg-goseg") || "map";
const ALIAS = {home: ["me"], learn: ["kz"], practice: ["kz"], adventure: ["go"], map: ["go", "map"], dex: ["go", "dex"], quest: ["go", "quest"],
  words: ["kz", "words"], talk: ["kz", "talk"], conv: ["kz", "talk"], drill: ["kz", "drill"], records: ["kz", "records"], mypage: ["my"]};
const routeOf = k => TABS.includes(k) ? [k] : ALIAS[k] || null;
const GOSEGS = [["map", "マップ"], ["dex", "図鑑"], ["quest", "クエスト"]];
function segBar(el, segs, cur, attr){
  el.innerHTML = segs.map(([k, l]) => `<button type="button" ${attr}="${k}" aria-pressed="${cur === k}">${l}</button>`).join("");
}
function goShow(seg){
  if (seg) GOSEG = seg;
  if (!GOSEGS.some(([k]) => k === GOSEG) || (!PERSONAL && GOSEG !== "map")) GOSEG = "map";   // 鍵なしで開いたときはマップだけ
  segBar($("goSeg"), PERSONAL ? GOSEGS : GOSEGS.slice(0, 1), GOSEG, "data-gs");
  $("goSeg").hidden = !PERSONAL;
  GOSEGS.forEach(([k]) => $(k + "wrap").hidden = k !== GOSEG);
  if (GOSEG === "map"){ if (!LMAP) renderMap(); else setTimeout(() => LMAP.invalidateSize(), 50); }
  if (GOSEG === "dex" && !RENDERED.dex){ renderDex(); RENDERED.dex = 1; }
  if (GOSEG === "quest" && !RENDERED.quest){ renderQuest(); RENDERED.quest = 1; }
  store("cg-goseg", GOSEG);
}
$("goSeg").addEventListener("click", e => { const b = e.target.closest("[data-gs]"); if (b){ goShow(b.dataset.gs); window.scrollTo(0, 0); } });
function showTab(k, seg){
  const r = routeOf(k) || ["us"]; k = r[0]; seg = seg || r[1];
  if (!$("tab-" + k) || $("tab-" + k).hidden) k = PERSONAL ? "me" : r[0] === "go" ? "go" : "us";
  if (k !== "kz"){ quiet(); drillStop(false); talkEnd(false); wdBarHide(); }          // 練習のタブを離れたら音を止める（音はボタンを押したときだけ鳴らす）
  TABS.forEach(x => { const on = x === k, b = $("tab-" + x); if (b) b.setAttribute("aria-selected", String(on)); $("pane-" + x).hidden = !on; });
  if (k === "go") goShow(seg);
  if (k === "kz"){ if (seg) kzSegSet(seg); renderKz(); }
  if (k === "us") playFly();
  if (k === "my") renderMy();
  if (ME) engRefresh();                                                     // ベル・タブの数字（練習したあとに戻ってきたときも合わせる）
  store("cg-tab", k);
}
TABS.forEach(k => { const b = $("tab-" + k); if (b) b.addEventListener("click", () => { if (k === "my") MYV = null; showTab(k); window.scrollTo(0, 0); }); });   // マイのタブを押したらマイのトップへ
// #map・#dex などの場所のリンク（鍵の # とは別）：読み込みなおさずに、その場所を開く
const hashRoute = () => { const h = (location.hash || "").replace(/^#/, ""); return routeOf(h) ? h : null; };

/* ================= 起動 ================= */
function tokenFromUrl(){ const t = (location.hash || "").replace(/^#/, ""); return /^[A-Za-z0-9]{24}$/.test(t) ? t : null; }
async function boot(){
  ALL = await (await fetch("data/public.json", {cache: "no-cache"})).json();
  const a = new Date(ALL.asof);
  $("asof").textContent = `${a.getMonth() + 1}/${a.getDate()} ${String(a.getHours()).padStart(2, "0")}:${String(a.getMinutes()).padStart(2, "0")} 更新`;
  DEMO = location.hash === "#demo";
  let tok = tokenFromUrl();
  if (tok) store("cg-token", tok); else if (!DEMO) tok = store("cg-token");
  const personal = PERSONAL = DEMO || !!tok;
  ["me", "kz", "my"].forEach(k => $("tab-" + k).hidden = !personal);
  $("demoBar").hidden = !DEMO;
  $("gate").hidden = personal;
  renderUs();
  const want = hashRoute() || new URLSearchParams(location.search).get("tab");
  if (hashRoute()) history.replaceState(null, "", location.pathname + location.search);   // 場所の # は消す（鍵の # と取りちがえないように）
  if (!personal){ const q = want || store("cg-tab"); showTab(q && (routeOf(q) || [])[0] === "go" ? "go" : "us"); return; }
  try {
    let d, key = null;
    if (DEMO){
      d = await openFile("demo/me.json", null);
      IMGS = d.imgs || {};
      AUD = d.aud || {};
      TEAM = await openFile("demo/team.json", null);
    } else {
      const id = hex(await sha("cheers-go-id:" + tok)).slice(0, 24);
      API_AUTH = {u: id, k: hex(await sha("cheers-go-api:" + tok))};
      if (ALL.relay && CG_API === null) CG_API = ALL.relay;
      key = await crypto.subtle.importKey("raw", await sha("cheers-go-key:" + tok), "AES-GCM", false, ["decrypt"]);
      d = await openFile("u/" + id + ".json", key);
    }
    if (d.viewer){ $("demoBar").innerHTML = `${esc(d.viewer)}として表示中：${esc(d.display || d.name)}さんのページです（ベータ）`; $("demoBar").hidden = false; }
    LOADED = DEMO || !(d.photo_files || []).length;
    if (markOpen() && !DEMO && !d.viewer && apiOn()) api("/api/log", {kind: "open"}).catch(() => {});   // ログインの連続日数（ランキング用）。見る人（先生）の分は数えない
    utageStart(d);                                                    // 会員サイト（UTAGE）の受講状況：カードの場所を作ってから読み込む（中継があるときだけ）
    renderMe(d);
    syncStart(d);                                                     // 単語集・目標・連続記録を、ほかの端末とまとめる（中継があるときだけ）
    botShow();
    obWelcome();                                                                 // はじめて開いたときだけ「ようこそ」
    const last = want || store("cg-tab");
    showTab(last && routeOf(last) ? last : "me");
    if (!DEMO){
      // 教材の音声（Grok TTS で作ったお手本）：写真と並行して読み込む。届く前に再生したら端末の読み上げで代わりに
      Promise.all((d.audio_files || []).map(f => openFile(f, key).then(x => Object.assign(AUD, x)).catch(() => {})))
        .then(() => { if (KZ && !$("pane-kz").hidden && KA.paused) renderPlayer(); });
      await Promise.all((d.photo_files || []).map(f => openFile(f, key).then(x => Object.assign(IMGS, x)).catch(() => {})));
      if (!LOADED){ LOADED = true; const y = window.scrollY; renderMe(d); window.scrollTo(0, y); }
      if (d.team){
        try { const tkey = await crypto.subtle.importKey("raw", unb64(d.team.k), "AES-GCM", false, ["decrypt"]); TEAM = await openFile(d.team.f, tkey); } catch (e) {}
      }
    }
    renderUs(); RENDERED.dex = RENDERED.quest = 0;
    if (LMAP){ LMAP.remove(); LMAP = null; }
    const now = TABS.find(k => !$("pane-" + k).hidden) || "me"; showTab(now);
  } catch (e) {
    console.error(e);
    store("cg-token", null);
    $("me").innerHTML = `<div class="msg"><b>このリンクでは、あなたのページを開けませんでした。</b><p style="color:var(--ink2);margin-top:6px">運営から届いたリンクを、最後まで（# のうしろも含めて）そのまま開いてください。それでも開けないときは、運営に一言ください。</p></div>`;
    showTab("me");
  }
}
$("logout").addEventListener("click", e => { e.preventDefault(); store("cg-token", null); store("cg-tab", null); location.href = location.pathname; });
window.addEventListener("hashchange", () => {
  const h = hashRoute();
  if (h && PERSONAL){ history.replaceState(null, "", location.pathname + location.search); showTab(h); window.scrollTo(0, 0); return; }
  location.reload();
});
if ("serviceWorker" in navigator && location.protocol !== "file:"){
  // 新しい版が届いたら知らせる（ホーム画面のアプリでも、古い版のまま残らないように）
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register("sw.js").then(reg => { reg.update().catch(() => {}); document.addEventListener("visibilitychange", () => { if (!document.hidden) reg.update().catch(() => {}); }); }).catch(() => {});
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!had || document.getElementById("upd")) return;
    const b = document.createElement("div"); b.id = "upd"; b.className = "updbar";
    b.innerHTML = `新しい版になりました <button type="button" class="btn sm2">読み込む</button>`;
    b.querySelector("button").addEventListener("click", () => location.reload());
    document.body.appendChild(b);
  });
}
boot();
})();
