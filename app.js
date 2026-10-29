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
const SHOW_PRESET_LESSONS = false;   // tools/build_site.py の SHOW_PRESET_LESSONS が入る（docs/kz-only.md）
// 役割（owner/staff/teacher。D1の roles 表・/api/ping の role を端末に覚える＝cg-role）。先生リンク（ME.viewer＝人のページを見ているだけ）では特権扱いにしない（docs/interview.md）
const myRole = () => store("cg-role") || "member";
const isPrivRole = () => !(ME && ME.viewer) && ["owner", "staff", "teacher"].includes(myRole());
const kzMineCap = () => isPrivRole() ? 100 : 30;   // オーダーメイド教材（kz-mine）の保存件数。特権ロールは何度もインタビューを受けて増えるので広めに
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
/* ---------- タイムライン：本人用のリンクで開いた受講生だけ（鍵なし・先生リンクには出さない）。中身は app/_part_sns.js（投稿・🍻・＋記録） ---------- */
/* 名前は呼び名だけ（漢字の名前は出さない）。写真はチームの写真（名前なし・日付と国だけ）をタイムラインに混ぜる */
const tlOn = () => !!ME && !ME.viewer && (!DEMO || !!ME.sns);
// タイムラインに混ぜる乾杯の写真（チームの写真の新しい12枚。名前なし・日付と国）
function tlItems(){
  return ((TEAM || {}).photos || []).slice(0, 12).map(p => { const iso = (p.cc || [])[0], c = iso && (ALL.cc || {})[iso];
    return {who: "メンバー", what: c ? `${flagOf(iso)} ${c.name}の方と乾杯` : "外国の方と乾杯", ic: "🍻", d: p.d, img: p.big || p.img}; });
}
function timelineHtml(){ return `<section class="tl sns" id="snsTl"></section>`; }

/* ---------- みんなのセグメント：タイムライン（受講生だけ）｜ランキング（表彰台・貢献）｜アルバム（世界地図・チャレンジ・みんなの写真） ---------- */
/* ポイントのため方はマイ＞ヘルプの1か所だけ（重ねない） */
const US_SEGS = {timeline: ["タイムライン", [toastBannerHtml, timelineHtml]],
                 ch: ["チャンネル", [() => `<section class="ch-seg" id="chTl"></section>`]],
                 rank: ["ランキング", [() => ME && ME.ranking ? `<section class="rank" id="rankSec"></section>` : "", leagueBoxHtml, bossBoxHtml, podiumsHtml, totalsHtml]],
                 album: ["アルバム", [flyHtml, glassesHtml, teamAlbumSecHtml]]};
let USSEG = null;                                                          // 本人が選んだセグメント（選ぶまでは、受講生＝タイムライン・先生リンク＝チャンネル・鍵なし＝アルバム）
function renderUs(){
  const segs = Object.keys(US_SEGS).filter(k => (k !== "timeline" || tlOn()) && (k !== "ch" || chOn()));
  const cur = segs.includes(USSEG) ? USSEG : tlOn() ? "timeline" : chOn() ? "ch" : PERSONAL ? "rank" : "album";
  $("us").innerHTML = `${hrEntryHtml()}<div class="segbar" id="usSeg" role="group" aria-label="みんなの切り替え">${segs.map(k => `<button type="button" data-us="${k}" aria-pressed="${cur === k}">${US_SEGS[k][0]}</button>`).join("")}</div>`
    + US_SEGS[cur][1].map(f => f()).join("\n");
  $("usSeg").querySelectorAll("[data-us]").forEach(b => b.addEventListener("click", () => { USSEG = b.dataset.us; renderUs(); window.scrollTo(0, 0); }));
  if ($("flyReplay")) $("flyReplay").addEventListener("click", () => playFly(true));
  if ($("rankSec")) renderRank();
  if ($("snsTl")) snsMount();                                                // タイムライン（_part_sns.js）：中継の投稿を読んで描く
  if ($("chTl")) chMount();                                                  // チャンネル（_part_ch.js）：中継の一覧・メッセージを読んで描く
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
/* 連続記録は streakOf(d) の1か所で数える（ホームのチップ・マイ・連続記録の画面・今日やること・みんなの今日のまとめ・シェアカードが同じ数字を使う）。
   おやすみ乾杯チケット（🎟）：週（月〜日）のチアーズポイントが週の目標（ALL.rules.week_goal）に届いたら1枚。届いた日から使える・持てるのは2枚まで。
   練習しなかった日があると自動で1枚使って、連続がつながる（使った日は日数に入れないが、切らない）。連続が0日のときは使わない。今日はまだ判定しない（夜に練習できる）。
   もらえるのは rules.ticket.grant_from の週から・使うのは use_from の日から（それより前の連続はこれまでと同じ数え方）。
   出どころは練習した日（studySet：この端末＋中継の記録＋同期したほかの端末）と、本人のページの日ごとのポイント（d.days・毎朝のビルド）だけ＝どの端末でも同じ答え（新しく保存するものはない） */
const TICKET_DEF = {grant_from: "2026-10-12", use_from: "2026-10-19", max: 2};   // tools/build_site.py の RULES["ticket"] と同じ（public.json の rules.ticket があればそちら）
const dayAdd = (k, n) => { const t = new Date(k + "T12:00:00"); t.setDate(t.getDate() + n); return dayKey(t); };
const weekGoal = () => (ALL && ALL.rules && ALL.rules.week_goal) || 30;
const ticketRule = d => ({...TICKET_DEF, ...((ALL && ALL.rules && ALL.rules.ticket) || {}), ...((d && d.ticket) || {})});   // d.ticket はデモだけ（見た目の確認用に前からもらえる）
function streakOf(d){
  const today = dayKey(Date.now()), study = studySet(d), R = ticketRule(d), goal = weekGoal(), pts = (d && d.days) || {};
  const grant = {};                                                        // 週の目標に届いた日（その週の1枚目をもらう日）
  for (let w = weekStart(R.grant_from); w <= today; w = dayAdd(w, 7)){
    let s = 0;
    for (let i = 0; i < 7; i++){ const k = dayAdd(w, i); if (k > today) break; s += +pts[k] || 0; if (s >= goal){ grant[k] = 1; break; } }
  }
  const first = [...study].sort()[0], used = new Set();
  let k = first && first < R.grant_from ? first : R.grant_from, run = 0, best = 0, t = 0;
  for (let i = 0; k <= today && i < 3000; i++, k = dayAdd(k, 1)){
    if (grant[k] && t < R.max) t++;
    if (study.has(k)){ run++; best = Math.max(best, run); }
    else if (k === today) {}                                               // 今日はまだ（切らない・チケットも使わない）
    else if (k >= R.use_from && run > 0 && t > 0){ t--; used.add(k); }      // 🎟 を1枚使って、つなぐ
    else run = 0;
  }
  const ws = weekStart(today), wk = [...Array(7)].map((_, i) => dayAdd(ws, i)).filter(x => x <= today).reduce((s, x) => s + (+pts[x] || 0), 0);
  return {run, best, tickets: t, max: R.max, used, study, done: study.has(today), week: wk, goal, got: !!Object.keys(grant).find(x => x >= ws), from: R.use_from};
}
function streakHtml(d){
  const other = Object.values(syncDaysOther()), od = i => other.flatMap(x => Object.keys(x).filter(k => (x[k] || [])[i]));
  const today = dayKey(Date.now()), S = streakOf(d), study = S.study, open = new Set([...openDays(), ...od(1)]);
  const sN = S.run, oN = runOf(open, today), done = S.done;
  const ws = weekStart(today), wk = [...Array(7)].map((_, i) => dayAdd(ws, i));
  const tk = `<span class="sk-tk num" aria-label="おやすみ乾杯チケット ${S.tickets}枚">${"🎟".repeat(S.tickets)}${S.tickets ? "" : "🎟"}<b>×${S.tickets}</b></span>`;
  const next = S.got ? "今週の1枚はもらいました" : S.tickets >= S.max ? `いま${S.max}枚（持てるのは${S.max}枚まで）` : `今週あと <b class="num">${Math.max(0, S.goal - S.week)}</b>pt で1枚`;
  return `<section class="streak${done ? " on" : " pend"}" aria-label="連続記録">
    <div class="sk-main"><span class="sk-fire" aria-hidden="true">${done ? "🔥" : "🕯️"}</span><div><b class="num">${sN}</b><span>日連続で英語を練習</span></div></div>
    <div class="sk-week">${wk.map((k, i) => `<span class="${study.has(k) ? "on" : S.used.has(k) ? "tk" : ""}${k === today ? " now" : ""}${k > today ? " fut" : ""}"><i>${study.has(k) ? "✓" : S.used.has(k) ? "🎟" : ""}</i>${"月火水木金土日"[i]}</span>`).join("")}</div>
    <div class="sk-sub"><span>ログイン <b class="num">${oN}</b>日連続</span><span>練習のベスト <b class="num">${S.best}</b>日</span>
      ${done ? `<span class="good">今日の練習 ✓</span>` : `<button type="button" class="more" data-tab="kz">${sN ? "今日の練習で連続をのばす →" : "今日から始める →"}</button>`}</div>
    <div class="sk-ticket">${tk}<p><b>おやすみ乾杯チケット</b>：週のチアーズポイントが${S.goal}ptに届くと1枚（${S.max}枚まで）。練習できなかった日に自動で1枚使って、連続をつなぎます（🎟の日）。<small>${next}</small></p></div></section>`;
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
  const ws = d.weeks.map(w => w.w), used = streakOf(d).used; let heat = '<span></span>';   // 🎟＝おやすみ乾杯チケットで連続をつないだ日
  ws.forEach((w, i) => { const dt = new Date(w + "T12:00:00"); heat += `<span class="ml2">${(i === 0 || dt.getDate() <= 7) ? (dt.getMonth() + 1) + "月" : ""}</span>`; });
  const DN = ["月", "", "水", "", "金", "", "日"];
  for (let r = 0; r < 7; r++){
    heat += `<span class="dl">${DN[r]}</span>`;
    ws.forEach(w => { const dt = new Date(w + "T12:00:00"); dt.setDate(dt.getDate() + r);
      const key = dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
      const v = d.days[key] || 0, fut = key > d.today;
      heat += `<i class="${fut ? "fut" : v >= 30 ? "h4" : v >= 15 ? "h3" : v >= 5 ? "h2" : v > 0 ? "h1" : ""}${used.has(key) ? " tk" : ""}" title="${md(key)} ${v}pt${used.has(key) ? "・おやすみ乾杯チケット" : ""}">${used.has(key) ? "🎟" : ""}</i>`; });
  }
  return `<div class="heat" style="margin-top:10px">${heat}</div>
        <div class="heatlg">少ない <i style="background:var(--empty)"></i><i style="background:color-mix(in srgb,var(--sky) 30%,var(--empty))"></i><i style="background:color-mix(in srgb,var(--sky) 58%,var(--empty))"></i><i style="background:var(--sky)"></i><i style="background:var(--gold)"></i> 30pt以上${used.size ? "　🎟 チケットでつないだ日" : ""}</div>`;
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
  const rc = rcPending(d); if (rc) return rc;                            // 今月のチアーズ・まとめ：毎月1日に1回だけ（app/_part_recap.js）
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
    ${whyCardHtml()}
    <button class="hero-go" type="button" id="heroGo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/></svg>はじめる</button></section>`;
}
function chipsHtml(d){
  const it = engItems(d), n = it.length, done = n - engLeft(it);
  return `<div class="hchips">
    <button type="button" data-my="streak">${ringsChipHtml(d)}</button>
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
// 自分の教材を作る（kz-lesson・1日10回）への入口。プリセット／コース教材を出さなくした分、ホームから1タップで作れるように（docs/kz-only.md）。先生リンクには出さない
// オーダーメイド教材（kz-mine）がまだ1本もないときは、このカードの代わりに「はじめてのインタビュー」をホームのいちばん上（itvHomeTopHtml）に出す（2026-10-19 社長指示）。1本でもできたらこのカードに戻る
function matCardHtml(d){
  if (d.viewer || itvHomeTop(d)) return "";
  return `<button type="button" class="hnext hmat" data-matmk="1"><i aria-hidden="true">✨</i><span><b>自分の教材を作る</b>　話したいことを、あなたのレベルの正しい英語に</span><em>1タップ</em></button>`;
}
// ヘッダーの直下・いちばん上に出す条件（2026-10-19）。member は教材0本のあいだだけ。特権ロール（owner/staff/teacher）は
// 「何度でもインタビューを受けられる」ので教材があっても出続ける（入会時点の教材インタビューをいつでもやり直せるように）
const itvHomeTop = d => !d.viewer && apiOn() && (!kzMine().length || isPrivRole());
function itvHomeTopHtml(d){
  if (!itvHomeTop(d)) return "";
  const again = isPrivRole() && kzMine().length > 0;   // 教材があるのに出ている＝特権ロールのやり直し。「入会時の体験モード」と小さく添える
  return `<button type="button" class="hnext hmat hitv" data-itvgo="1"><i aria-hidden="true">🎙️</i><span><b>オーダーメイド教材作成インタビューを受ける</b>${again ? `<small class="hitv-badge">入会時の体験モード</small>` : ""}　8〜12分、日本語で話すだけであなた専用の教材が3本できます</span><em>はじめる</em></button>`;
}
// ホームに並べる部品（上から順）。新しいカードはここに足さない（README「ホームに足さないルール」）。matCardHtml は2026-10-19 社長指示の例外（docs/kz-only.md）
// chHomeLineHtml（みんなの新着・1行だけ＝約40〜50px）も例外（2026-10-19 しゅーちゃん承認・フェーズ2の設計どおり・docs/channels.md）
// hrHomeLineHtml（ひろばの次の会・1行だけ＝約44px。会がないときは何も出さない）も例外（2026-10-19 しゅーちゃん承認・docs/hiroba.md）
// itvHomeTopHtml（はじめてのインタビュー・教材0本のあいだだけヘッダー直下のトップに。matCardHtml の代わりに出る＝足すのではなく移すだけなので高さは増えない）も例外（2026-10-19 社長指示）
const HOME_CARDS = [itvHomeTopHtml, cdHomeHtml, heroHtml, mrHomeHtml, chipsHtml, goalBarHtml, todayHtml, matCardHtml, chHomeLineHtml, hrHomeLineHtml, nextClassHtml];
function renderMe(d){
  if (!SHOW_PRESET_LESSONS && d) d.kyozai = [];  // プリセット教材は出さない（データは残す・docs/kz-only.md）
  ME = d; PH = d.photos;
  if ($("tBadge")) $("tBadge").hidden = !d.teacher;   // 🎓 先生アカウント（先生自身のページだけ・docs/teacher-account.md）
  whyCheck(d);                                  // わたしメモの『なぜ』カード：heroHtml が描かれる前に判定（app/_part_whycard.js）
  renderMy();                                   // 目標・ガイドなどはマイにあるので、いっしょに描き直す
  engRefresh();                                 // ホームを描く・ベルとタブの数字（paintHome）
  tvCheckStreak(d);                             // 先生の声のごほうび：7/30/100日連続を初めて超えたとき（app/_part_teachervoice.js）
  chestCheckToday(d);                           // ごほうび宝箱：「今日の1つ」を完了した日に1日1回（app/_part_chest.js）
  ringsCheck(d);                                 // 今日の3つのリング：聞く/話す/書くのどれかが今日初めて閉じたら、チップに小さなアニメ（app/_part_rings.js）
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
  root.querySelectorAll("[data-matmk]").forEach(b => b.addEventListener("click", kzFocusMake));
  root.querySelectorAll("[data-itvgo]").forEach(b => b.addEventListener("click", itvOpenScreen));
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

/* ================= 今日の3つのリング（機能3・N=3・docs/gamify-1029.md） =================
   聞く・話す・書く のリングを、既存の学習記録（この端末の kz-*・中継は呼ばない）から今日ぶんだけ計算する。
   聞く/話す/書く にぴたり対応する記録は無いため、近い種類を割り当てた簡略版：
     聞く＝2秒応答（kz-react・音を聞いてすぐ反応する練習）
     話す＝AIと会話・音読チェック・1分感情スピーキング・外国の方との録音会話（kz-talks/kz-reads/kz-drill/kz-convs）
     書く＝英語日記を「書く」モードで（kz-diary・kind!=="voice"）・単語集に入れる（kz-wdlog）
   Home のストリークチップ（🔥連続日数）を、この3つのリングの小さな表示に置き換える（Homeの高さは変えない）。
   タップは引き続き data-my="streak" のまま（マイ＞連続記録の画面の先頭に、大きい版のリングを出す）。 */
const RING_GOAL = {listen: 1, speak: 1, write: 1};   // 1日1回でそのリングが閉じる（仮の数字。Shuheyが決めるべき点）
const RING_DEFS = [["listen", "聞く", "var(--c-comment)"], ["speak", "話す", "var(--c-share)"], ["write", "書く", "var(--c-photo)"]];
function ringsCounts(){
  const today = dayKey(Date.now());
  const j = k => { try { return JSON.parse(store(k) || "[]"); } catch (e) { return []; } };
  const onDay = l => l.filter(x => x && x.t && dayKey(x.t) === today).length;
  return {
    listen: onDay(j("kz-react")),
    speak: onDay(j("kz-talks")) + onDay(j("kz-reads")) + onDay(j("kz-drill")) + onDay(j("kz-convs")),
    write: onDay(j("kz-diary").filter(x => x && x.kind !== "voice")) + onDay(j("kz-wdlog"))
  };
}
function ringsOf(){
  const c = ringsCounts();
  return RING_DEFS.map(([k, label, color]) => ({k, label, color, now: c[k], goal: RING_GOAL[k], closed: c[k] >= RING_GOAL[k]}));
}
// renderMe(d) から呼ぶ：今日、聞く/話す/書くのどれかが初めて閉じたら、チップに小さなアニメを出す（cg-rings-closed に今日ぶんの閉じたリングを覚えておく。日が変わればリセット）
let RINGS_POP = [];
function ringsCheck(d){
  if (!d || d.viewer){ RINGS_POP = []; return; }
  const R = ringsOf(), today = dayKey(Date.now());
  let prev; try { prev = JSON.parse(store("cg-rings-closed") || "null"); } catch (e) { prev = null; }
  const prevK = (prev && prev.day === today) ? prev.k : [];
  const closedNow = R.filter(r => r.closed).map(r => r.k);
  RINGS_POP = closedNow.filter(k => !prevK.includes(k));
  if (closedNow.length !== prevK.length) store("cg-rings-closed", JSON.stringify({day: today, k: closedNow}));
}
function ringsMiniSvg(R){
  const rs = [15, 10.4, 5.8];
  return `<svg viewBox="0 0 36 36" aria-hidden="true" class="rg-mini">${R.map((r, i) => {
    const rad = rs[i], len = 2 * Math.PI * rad, f = Math.min(1, r.now / r.goal);
    return `<circle cx="18" cy="18" r="${rad}" fill="none" stroke="var(--line)" stroke-width="3.1"/>
      <circle cx="18" cy="18" r="${rad}" fill="none" stroke="${r.color}" stroke-width="3.1" stroke-linecap="round" transform="rotate(-90 18 18)" stroke-dasharray="${(f * len).toFixed(1)} ${len.toFixed(1)}"/>`;
  }).join("")}</svg>`;
}
// Home のチップに出す小さい版。🔥連続日数（streakOf(d).run）はリングと並べて残す（チップの高さは変えない）
function ringsChipHtml(d){
  const R = ringsOf(), n = R.filter(r => r.closed).length, run = streakOf(d).run;
  return `<b class="rg-chip${RINGS_POP.length ? " rg-pop" : ""}">${ringsMiniSvg(R)}${run ? `<small class="rg-streak">🔥${run}</small>` : ""}</b><span>今日のリング ${n}/3</span>`;
}
// マイ＞連続記録の画面の先頭に出す大きい版（既存の ringSvg(now,goal,color)・今週のミッションの輪と同じ見た目を再利用）
function ringsDetailHtml(){
  const R = ringsOf();
  return `<section class="rings" aria-label="今日の3つのリング・聞く話す書く">${R.map(r => `<div class="ring${r.closed ? " ok" : ""}">${ringSvg(r.now, r.goal, r.color)}<div><b>${r.label}</b><span>${r.now} / ${r.goal}</span></div></div>`).join("")}</section>`;
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

/* ---------- 場面の画像（段落ごと。/api/kz-image が1回だけ作って kz-mine の m.pics に残す。docs/scene-images.md） ---------- */
const kzImgUrl = id => CG_API + "/api/kz-img/" + id;
const KZPICWAIT = new Set();
const kzPicsDone = m => (m.paras || []).slice(0, 4).every(p => m.pics && m.pics[p.n]);
function kzNeedPics(m){
  if (!m || !(m.paras || []).length || KZPICWAIT.has(m.id)) return false;
  if (m.picTried && Date.now() - m.picTried < 864e5) return false;
  return !kzPicsDone(m);
}
async function kzEnsurePics(m){
  if (!apiOn() || (ME && ME.viewer) || !kzNeedPics(m)) return;
  KZPICWAIT.add(m.id);
  const paras = (m.paras || []).slice(0, 4).map(p => ({n: p.n, img: p.img || "", en: p.en}));
  let r = null;
  try { r = await api("/api/kz-image", {paras}); } catch (e) {}
  KZPICWAIT.delete(m.id);
  const list = kzMine(), i = list.findIndex(x => x.id === m.id);
  if (i < 0) return;                                        // 消された後なら何もしない
  const cur = list[i], pics = {...(cur.pics || {})};
  ((r && r.pics) || []).forEach(x => { if (x && x.n && x.id) pics[x.n] = x.id; });
  const done = paras.every(p => pics[p.n]);
  list[i] = {...cur, pics, picTried: done ? null : Date.now()};
  store("kz-mine", JSON.stringify(list));
  if (KZ && KZ.id === m.id){ KZ = list[i]; if (KZSTEP === "read") stepRead(); }
  if (KZ === "drill" && !DR){ const s = drillSource(); if (s && s.m.id === m.id) renderDrill(); }
}

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
document.addEventListener("visibilitychange", () => { if (document.hidden){ quiet(); drillStop(false); talkEnd(false); } });   // はじめてのインタビューは即アボートしない（_part_interview.js が3秒の猶予つきで別に見張る。iPhone のマイク許可シートで一瞬 hidden になることがあるため）
window.addEventListener("pagehide", () => { quiet(); drillStop(false); talkEnd(false); itvAbort(); });
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
  const g = (m.grammar || []).length, thumb = m.pics && kzPara(m)[0] && m.pics[kzPara(m)[0].n];
  return `<li class="kzc${m.source === "リクエスト" || isMine(m) ? " req" : ""}">
    ${thumb ? `<img class="kzc-thumb" src="${esc(kzImgUrl(thumb))}" alt="" loading="lazy" onerror="this.remove()">` : ""}
    <div class="kzc-h">${badge}<span class="kb lv">${esc(m.level || "英検準2級")}</span>${m.source === "リクエスト" ? '<span class="kb mine">あなた専用</span>' : ""}${isMine(m) ? `<span class="kb mine">${m.source === "オーダーメイド" ? "✨ あなた専用" : "🎙 会話から"}・${esc(md(m.made || dayKey(Date.now())))}</span>` : ""}${m.badge ? `<span class="kb mine">${esc(m.badge)}</span>` : ""}</div>
    <h3>${esc(m.title)}</h3><p>${esc(m.scene || "")}</p>
    <div class="kzc-f"><span class="num">${m.words}語・約${kzSec(m)}秒</span><span>${m.lines ? `会話${m.lines.length}行・設問${(m.questions || []).length}` : `${kzPara(m).length}段落・文法${g}`}</span>${best ? `<span class="num">ベスト ${best}語/分${best >= KZ_GOAL_WPM ? " ✓" : ""}</span>` : ""}${n ? `<span>練習 ${n}回</span>` : ""}</div>
    ${isMine(m) ? mastHtml(m) : ""}
    <div class="kzc-acts"><button class="btn" type="button" data-kz="${esc(m.id)}">練習する</button>${isMine(m) ? `<button class="btn ghost sm2" type="button" data-kzmdel="${esc(m.id)}" aria-label="この教材を消す">🗑</button>` : ""}</div></li>`;
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
  quiet(); drillStop(false); talkEnd(false); itvAbort(); wdBarHide();
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
  if (KZ === "month"){ renderMonth(); return; }
  if (KZ === "recap"){ renderRecap(); return; }
  if (KZ === "itv"){ renderItvIntro(); return; }
  if (prView()) return;                                             // 練習タブのタイル（会話を録音・英語日記）の画面
  if (KZ === "records"){ renderRecords(); return; }
  if (KZ === "words"){ renderWords(); return; }
  if (KZ === "kb"){ KZ = null; botOpen(); renderKz(); return; }     // 前の版の「MATCHA BOT」の画面は、右下の質問BOTに
  if (KZ === "coach"){ if (apiOn()) renderCoach(); else { KZ = "conv"; renderKz(); } return; }
  if (KZ){ renderPlayer(); return; }
  const list = kzList(), last = kzLast(), lastN = last ? kzLog().filter(x => x.id === last.id).length : 0, viewer = !!(ME && ME.viewer);
  box.innerHTML = `${last ? `<button type="button" class="kzcont" data-kz="${esc(last.id)}"><span class="k">${lastN ? "続きから" : "まずはこの教材から"}</span><b>${esc(last.title)}</b><span>${lastN ? `練習 ${lastN}回・` : ""}${last.lines ? `会話${last.lines.length}行` : `${kzPara(last).length}段落`}・約${kzSec(last)}秒</span></button>` : ""}
    <h3 class="spot-h">クイック練習</h3>
    <div class="qtiles">
      <button type="button" class="qtile" data-kq="listen"><b>🎧 リスニング</b><span>教材の会話を聞く</span></button>
      <button type="button" class="qtile" data-kq="reply"><b>⚡ 2秒応答</b><span>質問にすぐ答える</span></button>
      <button type="button" class="qtile" data-ks2="talk"><b>🗣️ AIと会話</b><span>自分の教材で話す</span></button>
      <button type="button" class="qtile" data-ks2="drill"><b>😊 1分感情スピーチ</b><span>毎日の筋トレ</span></button>
      ${prTilesHtml()}
    </div>
    ${viewer ? "" : `<section class="kzreq panel" id="kzreq"><h3>✨ 教材を作る</h3><div id="kzReqBody"><p class="mapnote">読み込んでいます…</p></div></section>`}
    <div class="sec-h"><h2>${SPARK}オーダーメイド教材</h2><p>あなたが話したいことを、あなたのレベルの正しい英語に。英語の語順に並べた日本語を見ながら話すので、日本語から英語に組み立て直さずに口に出せます。</p></div>
    ${mastDueHtml(list.filter(isMine))}
    ${list.length ? `<ul class="kzlist">${list.map(kzCard).join("")}</ul>`
      : viewer ? `<div class="note">まだ教材がありません。</div>`
      : `<div class="note">まだ教材がありません。上の「✨ 教材を作る」に話したいことを入れると、その場であなた専用の教材ができます。<div class="acts"><button type="button" class="btn ghost sm2" id="kzEmptyCta">✨ 教材を作る</button></div></div>`}
    ${utageHtml()}
    <details class="panel kzvoices" id="kzVoices"><summary>お手本の声を聴き比べる（ベータ）</summary><div id="kzVoiceList"></div></details>
    <p class="qnote">オーダーメイド教材は、あなたが書いた話したいことから AI がその場で作ります（ベータ版）。作った教材と練習の記録はこの端末に残ります。</p>`;
  bindCommon(box); mastBind(box);
  if (!MAST && apiOn() && !DEMO) mastLoad().then(x => { if (x && !KZ && $("kzwrap") === box) renderKz(); });
  box.querySelectorAll("[data-kq]").forEach(b => b.addEventListener("click", () => kzQuick(b.dataset.kq)));
  box.querySelectorAll("[data-ks2]").forEach(b => b.addEventListener("click", () => { kzSegSet("talk"); hush(); KZ = b.dataset.ks2; renderKz(); window.scrollTo(0, 0); }));
  if ($("kzEmptyCta")) $("kzEmptyCta").addEventListener("click", kzFocusMake);
  box.querySelectorAll("[data-kzmdel]").forEach(b => b.addEventListener("click", () => { if (!confirm("この教材を消しますか？（この端末から消えます）")) return; kzMineDel(b.dataset.kzmdel); renderKz(); }));
  loadSamples().then(() => { if (!viewer) renderReqForm(); renderVoiceList(); });
}
// 「自分の教材を作る」の入口へ1タップで（ホームのカード・空っぽのときのCTAから）：練習＞教材を開いて、フォームまでスクロール・フォーカス
function kzFocusMake(){
  hush(); showTab("kz", "kz"); window.scrollTo(0, 0);
  loadSamples().then(() => setTimeout(() => {
    const ta = $("kzBody"); if (!ta) return;
    ta.scrollIntoView({behavior: reduce ? "auto" : "smooth", block: "start"}); ta.focus({preventScroll: true});
  }, 30));
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
  el.innerHTML = `${itvEntryHtml()}<p class="mapnote" style="margin-top:0">来週の会議、商談、ミートアップで話したいこと。日本語でOK、声で入力もできます。「教材を作る」を押すと、その場であなた専用の教材ができて、すぐ練習できます。</p>${on ? interviewHtml() : ""}
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
  itvBindEntry(el);
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
  try { r = await api("/api/kz-lesson", {kind: x.kind, level, scene, body, profile: itvProfilePack()}); }
  catch (e) { KZMAKING = false; if ($("kzMake")){ $("kzMake").disabled = false; $("kzMake").textContent = "✨ 教材を作る"; $("kzMakeNote").textContent = "教材を作れませんでした（" + e.message + "）。"; } else toast("教材を作れませんでした（" + e.message + "）"); return; }
  KZMAKING = false;
  if (r.empty){ if ($("kzMake")){ $("kzMake").disabled = false; $("kzMake").textContent = "✨ 教材を作る"; $("kzMakeNote").textContent = "この内容では教材を作れませんでした。英語で話したい場面や内容を書きかえて、もう一度どうぞ。"; } return; }
  const {left, ...lesson} = r;
  const m = {...lesson, id: "k" + Date.now().toString(36), source: "オーダーメイド", kind: x.kind === "リスニング" ? "listening" : "speaking", level, made: dayKey(Date.now()), mine: true};
  store("kz-mine", JSON.stringify([m, ...kzMine()].slice(0, kzMineCap())));
  kzEnsurePics(m);
  const msg = "教材ができました" + (left != null ? `（今日あと${left}回作れます）` : "");
  if ($("kzMake") && KZ === "talk"){ talkWith(m.id); toast(msg + "。この教材でAI会話を始められます"); }   // AI会話の「✨ 新しい教材を作って始める」から：できた教材を選んだ状態で会話の準備へ
  else if ($("kzMake")){ openKz(m.id); toast(msg); } else toast(msg + "。練習＞教材の一覧にあります");   // 待っているあいだに別の画面へ移ったときは、開かずに知らせる
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
  if (KZ && isMine(KZ)) kzEnsurePics(KZ);
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
      ${isMine(m) ? `<button type="button" class="btn ghost sm2 kzp-talk" id="kzTalkThis">🗣️ この教材でAI会話</button>` : ""}
    </div>
    <div class="kzsteps" role="tablist">${steps.map(([k, l], i) => `<button type="button" role="tab" data-step="${k}" aria-selected="${KZSTEP === k}"><span class="num">${i + 1}</span>${l}</button>`).join("")}</div>
    <div id="kzBody2"></div>${isMine(m) && !(m.wishes || []).length ? `<button type="button" class="more" id="kzDel">この教材を消す</button>` : ""}`;
  $("kzBack").addEventListener("click", () => { quiet(); KZ = null; renderKz(); });
  if ($("kzTalkThis")) $("kzTalkThis").addEventListener("click", () => talkWith(m.id));
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
    <ol class="paras" id="kzParas">${kzPara(m).map((p, i) => `<li data-i="${i}">
      ${m.pics && m.pics[p.n] ? `<img class="ppic" src="${esc(kzImgUrl(m.pics[p.n]))}" alt="" loading="lazy" onerror="this.remove()">` : ""}
      <div class="ph"><span class="pn num">${p.n}</span><button class="play" type="button" data-say="${i}" aria-label="お手本を聞く">▶</button></div>
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
    if (ms != null){ pbCheckAndShow(r, "react_fast", ms); pbCheckAndShow(r, "week_minutes", pbWeekMinutes()); }
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
  if (src && isMine(src.m)) kzEnsurePics(src.m);
  const pic = src && src.m.pics && src.m.pics[src.p.n];
  box.innerHTML = `<button class="more kzback" type="button" id="kzBack">← 会話の練習へ</button>
    <div class="sec-h"><h2>${SPARK}1分間の感情スピーキング</h2><p>英語の語順の日本語を声に出して読む → 目を閉じて場面をイメージ → イメージどおりに英語で話す。1回できたら「できた」。1分で何回できるかの筋トレです。</p></div>
    <div class="dstats"><div><b class="num">${st.today}</b><span>今日の回数</span></div><div><b class="num">${st.streak}</b><span>連続日数</span></div><div><b class="num">${st.total}</b><span>これまでの回数</span></div><div><b class="num">${st.min}</b><span>合計（分）</span></div></div>
    ${src ? `<div class="drill" id="drBox">
      <div class="dr-h"><span class="kb lv">${esc(src.m.title)}・段落${src.p.n}</span><button type="button" class="more" id="drNext">別の段落にする</button></div>
      <div class="drsteps"><span data-ds="1" class="on">① 語順の日本語を音読</span><span data-ds="2">② イメージ</span><span data-ds="3">③ 英語で話す</span></div>
      ${pic ? `<img class="drpic" id="drPic" src="${esc(kzImgUrl(pic))}" alt="場面のイメージ" loading="lazy" onerror="this.remove()">` : ""}
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
  const stepOn = k => { box.querySelectorAll("[data-ds]").forEach(x => x.classList.toggle("on", +x.dataset.ds === k)); const p2 = $("drPic"); if (p2) p2.classList.toggle("imagine", k === 2); };
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
    if (KZ === "drill"){ renderDrill(); const b = $("drBox"); if (b){ b.insertAdjacentHTML("afterbegin", `<p class="drdone">${reps}回できました！${reps >= 3 ? "いいペースです" : "あしたは1回ふやしてみましょう"}</p>${snsAfterHtml()}`);
      pbCheckAndShow(b, "drill_reps", reps); pbCheckAndShow(b, "week_minutes", pbWeekMinutes()); } }
  }
}

/* ================= 先生の声のごほうび =================
   マイルストーン（7/30/100日連続・はじめてのAI会話・自己ベスト更新）を達成した瞬間、
   Yusuke先生または高台先生の応援メッセージ（10〜15秒を想定）を画面いっぱいではない小さなシートで再生する。
   実録音はまだ無いので、音声は app/teacher_voice.json（git に入れてある・個人情報なし）の
   milestones.<id> = {teacher, title, text, src, dur} をマニフェストとして1か所にまとめる（data/samples.json と同じ思想）。
   src が null、または用意したファイルがまだ無いとき（読み込み失敗）は、テキストの吹き出し＋端末の読み上げ
   （speechSynthesis。AIのAPIは一切呼ばない＝Grok/Gemini TTS不使用）で代わりにする。
   録音ができたら app/teacher_voice/<ファイル名> に置き、この manifest の src をそのパスに書き換えるだけでよい（コード変更なし）。
   連続日数・はじめてのAI会話は一度だけ（cg-tv-seen に記録）。自己ベスト更新はそのたびに鳴らす（pbCelebrate と同じ頻度）。 */
let TV_MANIFEST = null;
const loadTeacherVoice = () => TV_MANIFEST ? Promise.resolve(TV_MANIFEST)
  : fetch("teacher_voice.json", {cache: "no-cache"}).then(r => r.ok ? r.json() : Promise.reject(0))
    .then(x => (TV_MANIFEST = x && typeof x === "object" ? x : {milestones: {}, teachers: {}}))
    .catch(() => (TV_MANIFEST = {milestones: {}, teachers: {}}));
const tvSeen = () => { try { const v = JSON.parse(store("cg-tv-seen") || "{}"); return v && typeof v === "object" ? v : {}; } catch (e) { return {}; } };
const tvMarkSeen = id => { const s = tvSeen(); s[id] = Date.now(); store("cg-tv-seen", JSON.stringify(s)); };
const tvTeacherName = (man, id) => (man && man.teachers && man.teachers[id] && man.teachers[id].name) || {yusuke: "Yusuke先生", takadai: "高台先生"}[id] || "先生";
// 端末の読み上げ（音声ファイルがまだ無いときの代わり）。AIのAPIは呼ばない。毎回そのとき読める声を選び直す（onvoiceschanged を待たない）
function tvSpeak(text){
  if (!text || !("speechSynthesis" in window)) return false;
  const vs = speechSynthesis.getVoices().filter(v => /^ja(-|_)/i.test(v.lang));
  const voice = vs.find(v => /Kyoko|O-Ren|Otoya|日本語/i.test(v.name)) || vs[0] || null;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ja-JP"; if (voice) u.voice = voice; u.rate = 0.98;
  try { speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { return false; }
  return true;
}
// 画面に出す（同時に2つは出さない）。音声があれば<audio controls>、無ければ「🔊 聞く」ボタン（読み上げ）。本文は必ず出す
function tvRender(id, def, man){
  document.querySelectorAll(".tv-overlay").forEach(x => x.remove());
  const wrap = document.createElement("div");
  wrap.className = "tv-overlay"; wrap.setAttribute("role", "dialog"); wrap.setAttribute("aria-label", "先生の声のごほうび");
  const hasAudio = !!(def && def.src);
  const canSpeak = "speechSynthesis" in window;
  wrap.innerHTML = `<div class="tv-card${reduce ? "" : " in"}">
    <div class="tv-h"><span class="tv-ic" aria-hidden="true">🎁</span><b>先生の声のごほうび</b><button type="button" class="tv-x" aria-label="閉じる">×</button></div>
    <p class="tv-from">${esc(tvTeacherName(man, def.teacher))}より${def.title ? `・${esc(def.title)}` : ""}</p>
    <p class="tv-text">${esc(def.text || "")}</p>
    ${hasAudio ? `<audio class="tv-audio" controls preload="none" src="${esc(def.src)}"></audio>` : canSpeak ? `<button type="button" class="btn tv-play">🔊 聞く</button>` : ""}
  </div>`;
  document.body.appendChild(wrap);
  wrap.querySelector(".tv-x").addEventListener("click", () => wrap.remove());
  const audioEl = wrap.querySelector(".tv-audio");
  if (audioEl) audioEl.addEventListener("error", () => { audioEl.hidden = true; if ("speechSynthesis" in window){ const b = document.createElement("button"); b.type = "button"; b.className = "btn tv-play"; b.textContent = "🔊 聞く"; b.addEventListener("click", () => tvSpeak(def.text || "")); audioEl.insertAdjacentElement("afterend", b); } });
  const pb = wrap.querySelector(".tv-play");
  if (pb) pb.addEventListener("click", () => tvSpeak(def.text || ""));
  setTimeout(() => { if (wrap.isConnected) wrap.remove(); }, 25000);   // 見落としても25秒で自然に閉じる
}
// マイルストーン達成を知らせる。id：streak_7 / streak_30 / streak_100 / first_talk / pb_update
async function tvFire(id){
  if (id !== "pb_update" && tvSeen()[id]) return;    // 連続日数・はじめてのAI会話は一度だけ。自己ベストは毎回
  const man = await loadTeacherVoice();
  const def = man && man.milestones && man.milestones[id];
  if (!def) return;
  tvMarkSeen(id);
  tvRender(id, def, man);
}
// renderMe(d) から呼ぶ：7/30/100日連続を初めて超えたとき（d.viewer＝先生リンクで見ている人には出さない）。
// 一気に複数を超えたとき（他端末から同期した直後など）は、いちばん上の1つだけ鳴らす（重ねて出さない）
function tvCheckStreak(d){
  if (!d || d.viewer) return;
  const run = streakOf(d).run, seen = tvSeen();
  const hit = [[100, "streak_100"], [30, "streak_30"], [7, "streak_7"]].find(([n, id]) => run >= n && !seen[id]);
  if (hit) tvFire(hit[1]);
}

/* ================= ごほうび宝箱（機能3・N=3・docs/gamify-1027.md） =================
   「今日の1つ」を完了した日（studySet(d) に今日が入った最初のタイミング）に、1日1回だけ小さな宝箱を開く。
   中身はランダムで：先生の一言（teacher）／貿易や英語のTip（tip）／まれに今週のAI会話＋3分（ai_time）。
   先生の一言・Tip の本文は端末内のコンテンツリスト（app/chest.json・git管理・個人情報なし）から出すだけで、中継は呼ばない。
   「今週のAI会話＋3分」だけは実際に時間を増やす必要があるので、中継（POST /api/chest/open）が公平に抽選し usage に積む。
   中継がない・デモ・失敗のときは端末だけで teacher/tip のどちらかを決める（まれ報酬は、実際に増やせないので出さない）。
   文言はぜんぶプレースホルダー（chest.json の draft:true・text先頭「DRAFT: Shuheyの確認待ち」）。 */
let CHEST_MANIFEST = null;
const loadChest = () => CHEST_MANIFEST ? Promise.resolve(CHEST_MANIFEST)
  : fetch("chest.json", {cache: "no-cache"}).then(r => r.ok ? r.json() : Promise.reject(0))
    .then(x => (CHEST_MANIFEST = x && typeof x === "object" ? x : {teacher_lines: [], tips: [], weights: {}}))
    .catch(() => (CHEST_MANIFEST = {teacher_lines: [], tips: [], weights: {}}));
const chestOpenedDay = () => store("cg-chest-day") || "";
const chestMarkOpenedDay = day => store("cg-chest-day", day);
// 画面に出す（同時に2つは出さない）。25秒で自然に閉じる（teacher voice の tvRender と同じ考え方）
function chestRender(reward, item, min){
  document.querySelectorAll(".ct-overlay").forEach(x => x.remove());
  const wrap = document.createElement("div");
  wrap.className = "ct-overlay"; wrap.setAttribute("role", "dialog"); wrap.setAttribute("aria-label", "ごほうび宝箱");
  const head = reward === "ai_time" ? "まれなごほうび！" : reward === "teacher" ? "先生の一言" : "今日のTip";
  const aiTimeMin = min || 3;
  const body = reward === "ai_time"
    ? (item && item.text ? esc(item.text).replace("{min}", aiTimeMin) : `今週のAI会話が ＋${aiTimeMin}分 増えました！`)
    : esc((item && item.text) || "");
  const from = reward === "teacher" && item && item.teacher ? `<p class="ct-from">${esc(item.teacher)}より</p>` : "";
  wrap.innerHTML = `<div class="ct-card${reduce ? "" : " in"}">
    <div class="ct-h"><span class="ct-ic" aria-hidden="true">🎁</span><b>宝箱が開きました！</b><button type="button" class="ct-x" aria-label="閉じる">×</button></div>
    <p class="ct-kind">${esc(head)}</p>${from}
    <p class="ct-text">${body}</p>
  </div>`;
  document.body.appendChild(wrap);
  wrap.querySelector(".ct-x").addEventListener("click", () => wrap.remove());
  setTimeout(() => { if (wrap.isConnected) wrap.remove(); }, 25000);
}
// 端末だけで teacher/tip を抽選（中継なし・デモ・失敗時のフォールバック。まれ報酬は実際に時間を増やせないので出さない）
function chestLocalPick(man){
  const w = man.weights || {}, wT = +w.teacher || 60, wP = +w.tip || 35;
  const reward = Math.random() * (wT + wP) < wT ? "teacher" : "tip";
  const list = reward === "teacher" ? (man.teacher_lines || []) : (man.tips || []);
  return {reward, item: list.length ? list[Math.floor(Math.random() * list.length)] : null, min: 0};
}
// 本体：中継があれば公平な抽選＋（まれなら）実際の時間クレジットを頼み、無ければ端末だけで決める
async function chestOpen(){
  const man = await loadChest();
  let reward = null, idx = 0, min = 0;
  if (apiOn() && API_AUTH){
    try { const r = await api("/api/chest/open", {}); reward = r.reward; idx = r.idx || 0; min = r.min || 0; } catch (e) { reward = null; }
  }
  let item = null;
  if (reward === "teacher") item = (man.teacher_lines || [])[idx] || null;
  else if (reward === "tip") item = (man.tips || [])[idx] || null;
  else if (reward === "ai_time") item = man.ai_time || null;
  else { const p = chestLocalPick(man); reward = p.reward; item = p.item; }
  chestRender(reward, item, min);
}
// renderMe(d) から呼ぶ：「今日の1つ」に相当する studySet(d) に今日が初めて入った日だけ、1日1回開く。先生リンクには出さない
function chestCheckToday(d){
  if (!d || d.viewer) return;
  const day = dayKey(Date.now());
  if (chestOpenedDay() === day) return;
  if (!studySet(d).has(day)) return;
  chestMarkOpenedDay(day);
  chestOpen();
}

/* ================= ごほうびショップ（機能1・N=1・docs/gamify-1029.md） =================
   週ポイント（マイ＞ポイント推移に出ている d.pts.week）で、AI会話+5分／先生の声の一言／アイコン枠と交換する。マイのタイル内（ホームには置かない）。
   アイテム一覧・費用・週の交換回数の上限は中継（GET /api/shop・tools/talk_plan.json の shop → relay/prompts.json の talk_plan.shop）。
   1人1アイテム1回/週は shop_redeems（D1・主キー uid,week,item）で中継側が冪等に守る。交換履歴もこの表が兼ねる。
   先生の一言の本文は app/chest.json の teacher_lines をそのまま再利用（中継は idx だけ公平に抽選して返す・本文は持たない・chestRender をそのまま使う）。
   中継は「週ポイントが足りているか」は検証しない（d.pts.weekはbuild_site.pyが共有部屋の投稿等から静的に出す値で、中継のD1からは見えないため）。
   実際の天井は weekly_limit（週に買える回数）だけ（下の「Shuheyが決めるべき点」はdocs/gamify-1029.mdに記載）。 */
const SHOP_UI = {data: null, busy: false, err: ""};
const shopReady = () => apiOn() && !!API_AUTH && !DEMO && ME && !ME.viewer;
function shopRedraw(){ const el = $("shopSec"); if (!el) return; el.outerHTML = shopBoxHtml(); const ns = $("shopSec"); if (ns) shopBind(ns); }
function shopLoad(force){
  if (!shopReady() || SHOP_UI.busy || (!force && SHOP_UI.data)) return Promise.resolve();
  SHOP_UI.busy = true;
  return api("/api/shop").then(r => { SHOP_UI.data = r; SHOP_UI.err = ""; })
    .catch(e => { SHOP_UI.err = e.message || "読み込めませんでした"; })
    .finally(() => { SHOP_UI.busy = false; shopRedraw(); });
}
function shopBoxHtml(){
  if (DEMO) return `<section class="sp-wrap" id="shopSec"><p class="mapnote">デモ表示中はごほうびショップを開けません。本人用のリンクで開くと使えます。</p></section>`;
  if (!ME || ME.viewer) return `<section class="sp-wrap" id="shopSec"><p class="mapnote">この機能は本人用のリンクで開いたときに使えます。</p></section>`;
  if (!apiOn() || !API_AUTH) return `<section class="sp-wrap" id="shopSec"><p class="mapnote">${esc(noApiMsg())}</p></section>`;
  if (!SHOP_UI.data && !SHOP_UI.err) shopLoad();
  const D = SHOP_UI.data;
  if (!D) return `<section class="sp-wrap" id="shopSec"><p class="mapnote">${esc(SHOP_UI.err || "読み込んでいます…")}</p></section>`;
  const pts = (ME.pts && ME.pts.week) || 0, limitLeft = Math.max(0, (+D.weekly_limit || 0) - (+D.used_this_week || 0));
  const row = it => {
    const boughtWeek = (D.redeemed_this_week || []).includes(it.id), owned = it.kind === "frame" && (D.owns_frame || []).includes(it.id);
    const can = !owned && !boughtWeek && limitLeft > 0;
    return `<li class="sp-item${owned || boughtWeek ? " got" : ""}"><span class="sp-ic" aria-hidden="true">${esc(it.icon || "🎁")}</span>
      <div class="sp-b"><b>${esc(it.label)}</b><span class="num">${fmt(it.cost)}pt</span></div>
      ${owned ? `<span class="sp-got">✅ 持っています</span>` : boughtWeek ? `<span class="sp-got">✅ 今週交換済み</span>`
        : `<button type="button" class="btn ghost sm2" data-spbuy="${esc(it.id)}"${can ? "" : " disabled"}>交換する</button>`}</li>`;
  };
  const hist = (D.history || []).slice(0, 5).map(h => { const it = (D.items || []).find(x => x.id === h.item);
    return `<li><span>${esc((it && it.label) || h.item)}</span><small>${jpd(String(h.t).slice(0, 10))}</small></li>`; }).join("");
  return `<section class="sp-wrap" id="shopSec" aria-label="ごほうびショップ">
    <p class="sp-lead">今週のポイント <b class="num">${fmt(pts)}</b>pt を使って交換できます。週に${D.weekly_limit}回まで（今週あと${limitLeft}回）。</p>
    <ul class="sp-list">${(D.items || []).map(row).join("")}</ul>
    ${hist ? `<div class="sp-hist"><b>交換履歴</b><ul>${hist}</ul></div>` : ""}</section>`;
}
function shopHtml(){ return `<p class="sp-intro">今週がんばった分で、AI会話の時間を増やしたり、先生の一言やアイコン枠と交換できます。</p>${shopBoxHtml()}`; }
async function shopBuy(id){
  const D = SHOP_UI.data; if (!D) return;
  const it = (D.items || []).find(x => x.id === id); if (!it) return;
  if (!confirm(`${it.label}（${it.cost}pt）と交換しますか？`)) return;
  try {
    const r = await api("/api/shop/redeem", {item: id});
    if (r.error){ toast(r.error); return; }
    if (it.kind === "teacher"){ const man = await loadChest(); chestRender("teacher", (man.teacher_lines || [])[r.idx || 0] || null, 0); }
    else toast(it.kind === "ai_time" ? `今週のAI会話が ＋${it.min || 0}分 増えました！` : "アイコン枠と交換しました。");
    await shopLoad(true);
  } catch (e) { toast(e.message); }
}
function shopBind(box){ box.querySelectorAll("[data-spbuy]").forEach(b => b.addEventListener("click", () => shopBuy(b.dataset.spbuy))); }

/* ================= 集中の乾杯グラス（機能4・N=4・docs/gamify-1029.md） =================
   アプリ外の学習（参考書・オンライン英会話など）に向けて、10/15/25分のタイマーを置く。
   タイマーが鳴るまでアプリを開いたまま（document.hidden にならない）でいると「乾杯」でき、その分数が
   学習の記録（app/_part_sns.js の sns-manual・SNS_MANUAL に kind "focus" を追加）へ届き、今日のまとめ（studyMinutes()）
   にそのまま合流する（新しい保存先・新しい合計の仕組みは増やしていない）。
   端末内のみで動作：中継（relay・D1）は呼ばない。他のタブ・アプリに切り替えると document.hidden になるが、
   FOCUS_GRACE_SEC 秒以内に戻れば継続。超えたらその場でグラスがこぼれる（やり直し・v2変更）。 */
const FOCUS_MIN = [10, 15, 25];
const FOCUS_GRACE_SEC = 5;                                               // アプリを離れてからこぼれるまでの猶予秒数
const FOCUS_UI = {view: "pick", min: FOCUS_MIN[0], total: 0, left: 0, timer: null, grace: null, caught: false};
const fgTime = sec => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
function focusRedraw(){ const el = $("focusSec"); if (!el) return; el.outerHTML = focusBoxHtml(); const ns = $("focusSec"); if (ns) focusBind(ns); }
function focusStart(){
  FOCUS_UI.total = FOCUS_UI.min * 60; FOCUS_UI.left = FOCUS_UI.total; FOCUS_UI.view = "run"; FOCUS_UI.caught = false;
  clearInterval(FOCUS_UI.timer); FOCUS_UI.timer = setInterval(focusTick, 1000);
  clearTimeout(FOCUS_UI.grace); FOCUS_UI.grace = null;
  focusRedraw();
}
function focusTick(){
  if (document.hidden){ focusAwayStart(); return; }                      // 保険（visibilitychange を取り逃したとき用）
  FOCUS_UI.left--;
  if (FOCUS_UI.left <= 0){ clearInterval(FOCUS_UI.timer); FOCUS_UI.timer = null; focusComplete(); return; }
  focusRedraw();
}
function focusAwayStart(){
  if (!FOCUS_UI.timer || FOCUS_UI.grace) return;                         // 計測中でない・すでに猶予中なら何もしない
  FOCUS_UI.grace = setTimeout(focusSpill, FOCUS_GRACE_SEC * 1000);
}
function focusAwayEnd(){
  if (!FOCUS_UI.grace) return;                                           // 猶予中に戻ってきた（＝間に合った）
  clearTimeout(FOCUS_UI.grace); FOCUS_UI.grace = null;
  if (!FOCUS_UI.timer) return;
  FOCUS_UI.caught = true; focusRedraw();
  setTimeout(() => { FOCUS_UI.caught = false; }, 2000);
}
function focusSpill(){
  FOCUS_UI.grace = null;
  if (!FOCUS_UI.timer) return;
  clearInterval(FOCUS_UI.timer); FOCUS_UI.timer = null; FOCUS_UI.view = "spill"; focusRedraw();
}
document.addEventListener("visibilitychange", () => { if (document.hidden) focusAwayStart(); else focusAwayEnd(); });
function focusComplete(){
  const l = snsManual(), cut = dayKey(Date.now() - 60 * 864e5);
  l.push({id: "m" + Date.now().toString(36), day: snsToday(), k: "focus", m: FOCUS_UI.min, title: ""});
  store("sns-manual", JSON.stringify(l.filter(x => x.day >= cut).slice(-300)));
  FOCUS_UI.view = "done"; focusRedraw(); toast(`🥂 ${FOCUS_UI.min}分の集中、今日の記録に加わりました！`);
}
function focusReset(){ FOCUS_UI.view = "pick"; focusRedraw(); }
function focusBoxHtml(){
  if (FOCUS_UI.view === "run"){
    const pct = Math.max(0, Math.min(100, Math.round(FOCUS_UI.left / FOCUS_UI.total * 100)));
    const caughtHtml = FOCUS_UI.caught ? `<p class="fg-caught">✅ 間に合った</p>` : "";
    return `<section class="fg-wrap" id="focusSec"><div class="fg-run">
      <div class="fg-glass" aria-hidden="true"><span class="fg-liquid" style="height:${pct}%"></span></div>
      <p class="fg-time num">${fgTime(FOCUS_UI.left)}</p>
      ${caughtHtml}
      <p class="fg-hint">アプリを開いたまま待ちます。他のアプリ・タブに切り替えても${FOCUS_GRACE_SEC}秒以内に戻ればそのまま、超えるとこぼれます。</p>
      <button type="button" class="btn ghost sm2" id="fgCancel">やめる</button></div></section>`;
  }
  if (FOCUS_UI.view === "spill"){
    return `<section class="fg-wrap" id="focusSec"><div class="fg-run">
      <div class="fg-glass tip" aria-hidden="true"><span class="fg-liquid" style="height:0%"></span></div>
      <p class="fg-msg">🫗 グラスがこぼれました（アプリを離れたので、やり直しです）。</p>
      <button type="button" class="btn ghost sm2" id="fgRetry">もう一度</button></div></section>`;
  }
  if (FOCUS_UI.view === "done"){
    return `<section class="fg-wrap" id="focusSec"><div class="fg-run">
      <div class="fg-glass full" aria-hidden="true"><span class="fg-liquid" style="height:100%"></span></div>
      <p class="fg-msg">🥂 乾杯！ ${FOCUS_UI.min}分の集中が今日の記録に加わりました。</p>
      <button type="button" class="btn ghost sm2" id="fgAgain">もう一度</button></div></section>`;
  }
  return `<section class="fg-wrap" id="focusSec"><div class="fg-pick">
    <div class="chips fg-mins" role="group" aria-label="時間">${FOCUS_MIN.map(m => `<button type="button" data-fgm="${m}" aria-pressed="${FOCUS_UI.min === m}">${m}分</button>`).join("")}</div>
    <button type="button" class="btn" id="fgStart">🥂 はじめる</button></div></section>`;
}
function focusHtml(){ return `<p class="fg-intro">参考書・オンライン英会話などアプリ外の学習に集中する時間を測ります。鳴るまでアプリを開いたままにすると、乾杯グラスが満ちて今日の記録に分数が加わります。</p>${focusBoxHtml()}`; }
function focusBind(box){
  box.querySelectorAll("[data-fgm]").forEach(b => b.addEventListener("click", () => { FOCUS_UI.min = +b.dataset.fgm; focusRedraw(); }));
  if ($("fgStart")) $("fgStart").addEventListener("click", focusStart);
  if ($("fgCancel")) $("fgCancel").addEventListener("click", () => { clearInterval(FOCUS_UI.timer); FOCUS_UI.timer = null; clearTimeout(FOCUS_UI.grace); FOCUS_UI.grace = null; focusReset(); });
  if ($("fgRetry")) $("fgRetry").addEventListener("click", focusReset);
  if ($("fgAgain")) $("fgAgain").addEventListener("click", focusReset);
}

/* ================= ながら耳トレ（機能5・N=5・docs/gamify-1029.md） =================
   2つのモードがある（LISTEN_UI.mode）。
   ① own：各会員のオーダーメイド教材（kz-mine。端末のみに残る・サーバーに保存しない。app/_part_kz.js・app/_part_rec.js）の段落から、
     リスニング／シャドーイングを交互に再生する音声のみレッスン。お手本の音声（AUD。録音ずみの教材にだけ付く）があればそれを再生、
     なければ端末の読み上げ（speechSynthesis）で代わりに読む（既存の speak() と同じ判定＝hasAud）。
   ② common（v3で追加）：全会員向けの固定5レッスン（貿易の英語フレーズ4本＋旅行雑談1本。app/common_listen.json・
     tools/common_listen_gen.py がこのMacの `say` で作った本物の音声＝app/common_listen/<id>.m4a）。
     オーダーメイド教材が1本もない会員でも使える。1本の<audio>を再生し、timeupdateで区切り（segments）のキャプションを進める。
   マイのタイル内（ホームには置かない）。教材が1本もなくてもタイルは出す（控えめな「教材を作る」案内は選ぶ画面に残す）。
   画面ロックでも再生を続けられるよう、KZの再生系（KA・hush）とは別の専用<audio>（LISTEN_AUDIO）を使い、Media Session API を設定する。
   speechSynthesis で読む教材（お手本の録音がまだない教材＝いまのほぼ全員のown）は、画面をロックしたりタブを離れたりすると、
   既存の全画面共通の visibilitychange ハンドラ（_part_kz.js）が speechSynthesis.cancel() を呼ぶため、読み上げが途中で止まることがある
   （Web Speech API はバックグラウンド再生を保証しないブラウザの仕様。listenSay のタイムアウト保険で次のセグメントへは進めるが、止まった間は実際には読まれない。
   common は実録音の<audio>なのでこの制約を受けない。docs/gamify-1029.md 参照）。
   完走を申告した日に1日1回だけ、中継（POST /api/listen {done:1}）が今週のAI会話へ LISTEN_MIN 分を合流
   （own・commonどちらで完走しても同じ。1日1回・冪等。GET /api/shop・/api/speak と同じ「見るだけ・無ければそのとき読み込む」lazy方式）。 */
const listenReady = () => apiOn() && !!API_AUTH && !DEMO && ME && !ME.viewer;
// オーダーメイド教材（この端末・kz-mine）のうち、段落（paras）があるものだけを素材にする（会話の録音から作った教材も含む）
const listenMaterials = () => kzMine().filter(m => isMine(m) && (m.paras || []).length);
// マイのタイル：教材があるかどうかに関わらず出す（共通レッスンが常に使えるため）。本数はあれば添える
function listenTileHtml(){
  const n = listenMaterials().length;
  return myTile("listen", "🎧", `ながら耳トレ<i class="new">NEW</i>`, n ? `あなたの教材${n}本＋共通レッスン・音声のみ` : `共通レッスン・音声のみ`);
}
const LISTEN_UI = {view: "pick", today: null, err: "", mode: "own", queue: [], idx: 0, cl: null, clSeg: 0, run: 0, finishing: false};
const LISTEN_AUDIO = new Audio(); LISTEN_AUDIO.preload = "none";   // KZの共有 <audio>（KA）とは別物。画面ロック時の全体 hush() の対象外にするため
// 共通レッスン（全会員向け・固定5本）のマニフェスト。teacher_voice.json と同じ「見るだけ・無ければそのとき読み込む」lazy方式
let CL_MANIFEST = null;
const loadCommonListen = () => CL_MANIFEST ? Promise.resolve(CL_MANIFEST)
  : fetch("common_listen.json", {cache: "no-cache"}).then(r => r.ok ? r.json() : Promise.reject(0))
    .then(x => (CL_MANIFEST = x && typeof x === "object" ? x : {lessons: []}))
    .catch(() => (CL_MANIFEST = {lessons: []}));
const clList = () => (CL_MANIFEST && CL_MANIFEST.lessons) || [];
function listenRedraw(){ const el = $("lsSec"); if (!el) return; el.outerHTML = listenBoxHtml(); const ns = $("lsSec"); if (ns) listenBind(ns); }
function listenLoad(force){
  if (!listenReady() || (!force && LISTEN_UI.today)) return Promise.resolve();
  return api("/api/listen").then(r => { LISTEN_UI.today = r; LISTEN_UI.err = ""; })
    .catch(e => { LISTEN_UI.err = e.message || "読み込めませんでした"; })
    .finally(listenRedraw);
}
// 教材（新しい順）の段落（最大4）を、1教材ずつ「リスニング→シャドーイング」の順に並べる
function listenBuildQueue(){
  const q = [];
  listenMaterials().forEach(m => (m.paras || []).slice(0, 4).forEach((p, i) => {
    const h = (kzA(m).paras || [])[i];
    q.push({type: "listen", m, p, h}); q.push({type: "shadow", m, p, h});
  }));
  return q;
}
function listenMediaSession(title, album){
  if (!("mediaSession" in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({title: title || "ながら耳トレ", artist: "Cheers英語", album: album || "オーダーメイド教材"});
  navigator.mediaSession.setActionHandler("play", () => { if (LISTEN_AUDIO.paused && LISTEN_AUDIO.src) LISTEN_AUDIO.play().catch(() => {}); navigator.mediaSession.playbackState = "playing"; });
  navigator.mediaSession.setActionHandler("pause", () => { LISTEN_AUDIO.pause(); navigator.mediaSession.playbackState = "paused"; });
  navigator.mediaSession.setActionHandler("stop", () => listenStop());
  navigator.mediaSession.playbackState = "playing";
}
// お手本の録音（AUD[h]）を専用 <audio> で再生（own用）
function listenPlayAud(h){
  return new Promise(res => {
    const a = AUD[h]; if (!a){ res(false); return; }
    const done = v => { LISTEN_AUDIO.onended = LISTEN_AUDIO.onerror = null; res(v); };
    LISTEN_AUDIO.onended = () => done(true); LISTEN_AUDIO.onerror = () => done(false);
    LISTEN_AUDIO.src = a.src; LISTEN_AUDIO.playbackRate = 1;
    LISTEN_AUDIO.play().catch(() => done(false));
  });
}
// お手本がない教材は端末の読み上げ。タイムアウト保険つき（画面ロック等で onend/onerror が来ないまま止まるのを防ぐ）
function listenSay(text){
  return new Promise(res => {
    if (!("speechSynthesis" in window)){ res(false); return; }
    const u = new SpeechSynthesisUtterance(text);
    const v = VOICE || (typeof pickVoice === "function" && pickVoice());
    if (v) u.voice = v;
    u.lang = (v && v.lang) || "en-US";
    let done = false;
    const fin = ok => { if (done) return; done = true; clearTimeout(t); res(ok); };
    u.onend = () => fin(true); u.onerror = () => fin(false);
    const words = (text.match(/[A-Za-z0-9']+/g) || []).length;
    const t = setTimeout(() => fin(false), Math.max(3000, Math.round(words / 120 * 60 * 1000) + 3000));
    speechSynthesis.speak(u);
  });
}
const listenPlayItem = it => hasAud(it.h) ? listenPlayAud(it.h) : listenSay(it.p.en);
async function listenRun(){
  const run = LISTEN_UI.run, q = LISTEN_UI.queue;
  while (LISTEN_UI.idx < q.length){
    if (run !== LISTEN_UI.run) return;
    listenRedraw();
    const it = q[LISTEN_UI.idx];
    await listenPlayItem(it);
    if (run !== LISTEN_UI.run) return;
    if (it.type === "shadow"){                                           // 「あなたの番」：聞いた文を声に出すぶんの間をおく
      const words = (it.p.en.match(/[A-Za-z0-9']+/g) || []).length;
      const ms = Math.max(1600, Math.round(words / KZ_GOAL_WPM * 60 * 1000) + 600);
      await new Promise(r => setTimeout(r, ms));
      if (run !== LISTEN_UI.run) return;
    }
    LISTEN_UI.idx++;
  }
  listenFinish();
}
async function listenStart(){
  LISTEN_UI.mode = "own"; LISTEN_UI.cl = null; LISTEN_UI.queue = listenBuildQueue();
  if (!LISTEN_UI.queue.length) return;
  LISTEN_UI.idx = 0; LISTEN_UI.finishing = false; LISTEN_UI.view = "run"; LISTEN_UI.run++;
  LISTEN_AUDIO.ontimeupdate = null;
  listenMediaSession();
  listenRedraw();
  listenRun();
}
// 共通レッスン（固定5本のうち1本）：1本の<audio>を再生し、timeupdateで現在の区切り（segments）を進める
async function listenStartCommon(id){
  const lesson = clList().find(l => l.id === id);
  if (!lesson || !lesson.segments || !lesson.segments.length) return;
  LISTEN_UI.mode = "common"; LISTEN_UI.cl = lesson; LISTEN_UI.clSeg = 0;
  LISTEN_UI.finishing = false; LISTEN_UI.view = "run"; LISTEN_UI.run++;
  listenMediaSession(lesson.title, "共通レッスン・ながら耳トレ");
  listenRedraw();
  LISTEN_AUDIO.onended = LISTEN_AUDIO.onerror = null;
  LISTEN_AUDIO.ontimeupdate = () => {
    const segs = lesson.segments; let i = LISTEN_UI.clSeg;
    while (i + 1 < segs.length && segs[i + 1].t <= LISTEN_AUDIO.currentTime) i++;
    if (i !== LISTEN_UI.clSeg){ LISTEN_UI.clSeg = i; listenRedraw(); }
  };
  LISTEN_AUDIO.onended = () => listenFinish();
  LISTEN_AUDIO.onerror = () => { toast("再生できませんでした"); listenStop(); };
  LISTEN_AUDIO.src = lesson.src; LISTEN_AUDIO.playbackRate = 1;
  try { await LISTEN_AUDIO.play(); } catch (e) { toast("再生できませんでした"); listenStop(); }
}
async function listenFinish(){
  if (LISTEN_UI.finishing) return; LISTEN_UI.finishing = true; LISTEN_UI.run++;
  LISTEN_AUDIO.pause(); LISTEN_AUDIO.ontimeupdate = null; LISTEN_AUDIO.onended = null; LISTEN_AUDIO.onerror = null;
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "none";
  let min = 10, already = (LISTEN_UI.today || {}).done;
  try { const r = await api("/api/listen", {done: 1}); min = r.min || min; already = r.already; } catch (e) {}
  LISTEN_UI.today = {done: true, min}; LISTEN_UI.view = "done"; listenRedraw();
  toast(already ? "🎧 お疲れさまでした！（今日の分はすでに完了していました）" : `🎧 お疲れさまでした！今週のAI会話が ＋${min}分 増えました！`);
}
function listenStop(){
  LISTEN_UI.run++;
  LISTEN_AUDIO.pause(); LISTEN_AUDIO.ontimeupdate = null; LISTEN_AUDIO.onended = null; LISTEN_AUDIO.onerror = null;
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "none";
  LISTEN_UI.view = "pick"; listenRedraw();
}
function listenPct(){
  if (LISTEN_UI.mode === "common"){
    const segs = (LISTEN_UI.cl && LISTEN_UI.cl.segments) || [];
    return segs.length ? Math.round(LISTEN_UI.clSeg / (segs.length - 1 || 1) * 100) : 0;
  }
  const total = LISTEN_UI.queue.length;
  return total ? Math.round(LISTEN_UI.idx / total * 100) : 0;
}
function listenPosLabel(){
  if (LISTEN_UI.mode === "common"){
    const segs = (LISTEN_UI.cl && LISTEN_UI.cl.segments) || [];
    return `${Math.min(LISTEN_UI.clSeg + 1, segs.length)} / ${segs.length}`;
  }
  return `${LISTEN_UI.idx + 1} / ${LISTEN_UI.queue.length}`;
}
const LS_ICON = {listen: ["👂", "リスニング"], shadow: ["🗣", "シャドーイング"], intro: ["▶", "はじめに"], outro: ["🏁", "おわりに"]};
function listenSegHtml(){
  if (LISTEN_UI.mode === "common"){
    const segs = (LISTEN_UI.cl && LISTEN_UI.cl.segments) || [], it = segs[LISTEN_UI.clSeg];
    if (!it) return "";
    const [ic, label] = LS_ICON[it.type] || LS_ICON.listen;
    return `<p class="ls-seg"><i aria-hidden="true">${ic}</i><b>${esc(label)}</b></p>${it.en ? `<p class="ls-cap">${esc(it.en)}</p>` : ""}${it.ja ? `<p class="ls-cap ls-ja">${esc(it.ja)}</p>` : ""}<p class="ls-mat">${esc((LISTEN_UI.cl || {}).title || "")}</p>`;
  }
  const it = LISTEN_UI.queue[LISTEN_UI.idx];
  if (!it) return "";
  const [ic, label] = LS_ICON[it.type] || LS_ICON.listen;
  return `<p class="ls-seg"><i aria-hidden="true">${ic}</i><b>${esc(label)}</b></p><p class="ls-cap">${esc(it.p.en)}</p><p class="ls-mat">${esc(it.m.title || "")}</p>`;
}
function listenPickHtml(){
  const mats = listenMaterials(), lessons = clList(), doneToday = !!(LISTEN_UI.today || {}).done;
  const note = mats.length
    ? `あなたのオーダーメイド教材（${mats.length}本）か、下の共通レッスンから選べます。お手本の録音がある教材はその音声、まだない教材は端末の読み上げで聞けます。`
    : `オーダーメイド教材はまだありませんが、下の共通レッスンでながら耳トレができます。`;
  return `<div class="ls-pick">
    <p class="ls-note">${esc(note)}</p>
    ${doneToday ? `<p class="mapnote">今日の分はもう完了しています。良ければ練習としてもう一度再生できます。</p>` : ""}
    ${mats.length ? `<button type="button" class="btn" id="lsStart">🎧 あなたの教材をはじめる</button>` : ""}
    <ul class="mylist ls-common">
      ${lessons.length ? lessons.map(l => `<li><button type="button" data-cl="${esc(l.id)}"><i aria-hidden="true">🎧</i><b>${esc(l.title)}</b><span>約${Math.max(1, Math.round((l.dur || 600) / 60))}分</span><em aria-hidden="true">›</em></button></li>`).join("")
        : `<li><span class="ls-note">共通レッスンを読み込み中です…</span></li>`}
    </ul>
    ${mats.length ? "" : `<p class="ls-note">練習＞教材で話したいことを入れると、あなた専用の教材も作れます。</p><button type="button" class="btn ghost sm2" id="lsMake">✨ 教材を作る</button>`}
  </div>`;
}
function listenBoxHtml(){
  if (DEMO) return `<section class="ls-wrap" id="lsSec"><p class="mapnote">デモ表示中はながら耳トレを開けません。本人用のリンクで開くと使えます。</p></section>`;
  if (!ME || ME.viewer) return `<section class="ls-wrap" id="lsSec"><p class="mapnote">この機能は本人用のリンクで開いたときに使えます。</p></section>`;
  if (!apiOn() || !API_AUTH) return `<section class="ls-wrap" id="lsSec"><p class="mapnote">${esc(noApiMsg())}</p></section>`;
  if (!LISTEN_UI.today && !LISTEN_UI.err) listenLoad();
  if (!CL_MANIFEST) loadCommonListen().then(listenRedraw);
  if (LISTEN_UI.view === "run"){
    return `<section class="ls-wrap" id="lsSec"><div class="ls-run">
      <div class="ls-bar"><span style="width:${listenPct()}%"></span></div>
      ${listenSegHtml()}
      <p class="ls-time num">${listenPosLabel()}</p>
      <p class="ls-hint">画面をロックしても、音はこのまま流れ続けます（お手本の録音・共通レッスンの音声がまだない教材は端末の読み上げになるため、画面ロック中に途中で止まることがあります）。</p>
      <button type="button" class="btn ghost sm2" id="lsStop">やめる</button></div></section>`;
  }
  if (LISTEN_UI.view === "done"){
    const min = (LISTEN_UI.today || {}).min || 10;
    return `<section class="ls-wrap" id="lsSec"><div class="ls-run">
      <p class="ls-msg">🎧 今日の「ながら耳トレ」が完了しました（＋${min}分・今週のAI会話に合流）。</p>
      <button type="button" class="btn ghost sm2" id="lsAgain">もう一度再生する</button></div></section>`;
  }
  return `<section class="ls-wrap" id="lsSec">${listenPickHtml()}</section>`;
}
function listenHtml(){ return `<p class="ls-intro">あなたのオーダーメイド教材や、全員が使える共通レッスン（貿易の英語フレーズ・旅行雑談）を、聞いて・声に出してをくり返す音声だけのレッスンです。画面をロックしたまま、ながら聴きで練習できます。</p>${listenBoxHtml()}`; }
function listenBind(){
  if ($("lsStart")) $("lsStart").addEventListener("click", listenStart);
  if ($("lsAgain")) $("lsAgain").addEventListener("click", () => (LISTEN_UI.mode === "common" && LISTEN_UI.cl) ? listenStartCommon(LISTEN_UI.cl.id) : listenStart());
  if ($("lsStop")) $("lsStop").addEventListener("click", listenStop);
  if ($("lsMake")) $("lsMake").addEventListener("click", kzFocusMake);
  document.querySelectorAll("[data-cl]").forEach(b => b.addEventListener("click", () => listenStartCommon(b.dataset.cl)));
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
          <span class="wd-f">${x.from ? (kzList().some(m => m.id === x.from.id) ? `<button type="button" class="more" data-kz="${esc(x.from.id)}">📘 ${esc(x.from.title)}</button>` : `<span class="wd-src">📘 ${esc(x.from.title)}</span>`) : ""}<span class="num">${md(dayKey(x.t))} 追加</span>${wdDone(x) ? '<span class="good">覚えた</span>' : `<span>次の復習 ${wdDue(x) ? "今日" : md(dayKey(x.due))}</span>`}</span></div>
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
// 役割（owner/staff/teacher）を /api/ping から取って端末に覚える（cg-role）。中継がない・先生リンク（見る人）・デモでは呼ばず member のまま（2026-10-19・docs/interview.md）
function roleRefresh(d){
  if (DEMO || (d && d.viewer) || !apiOn() || !API_AUTH) return Promise.resolve();
  return api("/api/ping").then(r => {
    const role = ["owner", "staff", "teacher"].includes(r.role) ? r.role : "member";
    if (role !== myRole()){ store("cg-role", role); if (ME === d) paintHome(); }
  }).catch(() => {});
}
const PLACES = [["cafe", "カフェ"], ["bar", "バー"], ["meetup", "ミートアップ"], ["office", "オンライン会議"], ["airport", "空港"], ["hotel", "ホテル"], ["interview", "面接"],
  ["paris", "パリ・エッフェル塔の前"], ["beach", "海辺のカフェ"], ["nightmarket", "夜市"]];
// 自由に書いた場面は、いちばん近い背景を使う（その場で背景を作るのは中継ができてから）
function nearPlace(t, dflt){
  const R = [[/エッフェル|パリ|フランス|paris/i, "paris"], [/海|ビーチ|浜|beach/i, "beach"], [/夜市|屋台|市場|market/i, "nightmarket"], [/バー|飲み|居酒屋|パブ|bar|pub/i, "bar"],
    [/カフェ|喫茶|コーヒー|cafe|café/i, "cafe"], [/空港|飛行機|airport/i, "airport"], [/ホテル|hotel/i, "hotel"], [/面接|interview/i, "interview"], [/会議|オンライン|商談|オフィス|meeting/i, "office"], [/ミートアップ|イベント|交流|パーティ/i, "meetup"]];
  const hit = R.find(([re]) => re.test(t || "")); return hit ? hit[1] : dflt;
}
const talkLog = () => { try { return JSON.parse(store("kz-talks") || "[]"); } catch (e) { return []; } };
// AI会話は、いつもオーダーメイド教材（kz-mine）を1つ選んでから（2026-10-19 社長指示。教材なしで場面・話題だけを選ぶ会話はなし）。
// 前の版で保存した topic・place・place_text・theme は読んでも使わない（古い設定が残っていても落ちない）
let TKPLAN = null, PR = null, MAST = null;                                        // 週の持ち時間（talk-left）・録音中のフレーズ練習
const TALKCFG = () => { try { return {mode: "training", acc: "US", gender: "女性", strength: "clear", goal: "", lesson: "", ...JSON.parse(store("kz-talkcfg") || "{}")}; } catch (e) { return {mode: "training", acc: "US", gender: "女性", strength: "clear", goal: "", lesson: ""}; } };
const MODES = [["training", "トレーニング（おすすめ）", "録音でフレーズ練習 → AIとロールプレイ → ふりかえり"], ["chat", "フリー会話", "外国の友だち・先生と自由に"], ["teacher", "先生モード", "自分の教材の内容を、会話の中で言えるように"], ["interview", "面接", "英語面接の練習"]];

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
    <button type="button" class="talkcard" data-demo><span class="k">AIと会話</span><b>外国の方と1対1で話す</b><span>自分のオーダーメイド教材で、外国の方と声で会話。教材はその場で作れます。終わったら添削。</span></button>
    <button type="button" class="talkcard kbc" id="kzKb"><span class="k">質問BOT（右下の「質問」）</span><b>抹茶ビジネス・講座の質問</b><span>情報ドキュメントと講座の記録の中だけから答えます</span></button>
    <button type="button" class="talkcard coach" data-demo><span class="k">AIコーチ</span><b>悩みを相談する</b><span>話す速さ・返事の速さ・音読・発音の悩みを、記録をもとに相談</span></button>
    <button type="button" class="talkcard rec" id="kzRec"><span class="k">練習の記録</span><b>成長を見る</b><span>会話・音読・筋トレの回数、返事の速さ、よく出る間違い</span></button></div>`;
  if (!apiOn()) return `<div class="talkcard off"><span class="k">AIと会話（準備中）</span><b>外国の方と1対1で話す練習</b><span>AIの相手と声で会話して、終わったら添削と次の課題が出ます。いまは運営のMacでだけ試せます。</span></div>`;
  const t = talkLog(), min = Math.round(t.reduce((s, x) => s + (x.seconds || 0), 0) / 60);
  return `<div class="talkrow">${itvEntryHtml()}<button type="button" class="talkcard" id="kzTalk"><span class="k">AIと会話</span><b>外国の方と1対1で話す</b><span>自分のオーダーメイド教材で、外国の方と声で会話。教材がなければその場で作って始められます。終わったら添削。</span><span class="tc-n num">${t.length}回・${min}分</span></button>
    <button type="button" class="talkcard rec" id="kzRec"><span class="k">練習の記録</span><b>成長を見る</b><span>会話・音読・筋トレの回数、返事の速さ、よく出る間違い</span></button>
    <button type="button" class="talkcard kbc" id="kzKb"><span class="k">質問BOT（右下の「質問」）</span><b>抹茶ビジネス・講座の質問</b><span>価格・MOQ・送料・サンプル・通関、講座で話していたこと…情報ドキュメントと講座の記録の中だけから答えます</span></button>
    <button type="button" class="talkcard coach" id="kzCoach"><span class="k">AIコーチ</span><b>悩みを相談する</b><span>話す速さ・返事の速さ・音読・発音の悩みを、記録をもとに相談</span></button></div>`;
}
function demoOnly(){ if (typeof toast === "function") toast("デモでは使えません。本人用のリンクで使えます"); else alert("デモでは使えません。本人用のリンクで使えます"); }
document.addEventListener("click", e => { if (e.target.closest("[data-demo]")){ e.preventDefault(); demoOnly(); } });
function bindTalkEntry(box){
  itvBindEntry(box);
  const a = box.querySelector("#kzTalk"), b = box.querySelector("#kzRec");
  if (a) a.addEventListener("click", () => { hush(); KZ = "talk"; renderKz(); window.scrollTo(0, 0); });
  if (b) b.addEventListener("click", () => { hush(); KZ = "records"; renderKz(); window.scrollTo(0, 0); });
  const c = box.querySelector("#kzCoach"); if (c) c.addEventListener("click", () => { hush(); KZ = "coach"; renderKz(); window.scrollTo(0, 0); });
  const k = box.querySelector("#kzKb"); if (k) k.addEventListener("click", () => { hush(); botOpen(); });
}

/* ---------- 自分の教材でAI会話（オーダーメイド教材・会話の録音から作った教材＝この端末の kz-mine） ----------
   話題で「自分の教材」を選ぶと、その教材の題・場面・目標フレーズ・単語・本文・質問を短くして（talkPack）中継の /api/live-token に lesson で渡す。
   中継はそれを Gemini Live の system instruction に入れる（相手の人物・声はそのまま）。振り返りは目標フレーズを使えたかを出す（talkTargetsHtml）。
   保存は kz-talkcfg（topic・lesson）だけ。D1 の書き込みも1日の回数（20回）の数え方も今までと同じ */
const talkMine = () => kzMine().filter(m => (m.paras || []).length || (m.lines || []).length)
  .map((m, i) => [m, i]).sort((a, b) => String(b[0].made || "").localeCompare(String(a[0].made || "")) || a[1] - b[1]).map(x => x[0]);   // 新しい順（kz-mine は作った順に先頭へ入る）
const tkCut = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const tkNorm = t => String(t || "").toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
const TK_STOP = new Set("the a an and or but to of in on at for is are was were be been it its this that these those with you your we our us i me my he she his her they them their do does did not no yes so as by from can could will would just have has had about there here what when where which who how very really also than then into out up".split(" "));
function talkPhrases(m){
  const out = [], seen = new Set();
  const add = t => { t = tkCut(t, 120); const k = tkNorm(t); if (k && /[a-z]/.test(k) && !seen.has(k)){ seen.add(k); out.push(t); } };
  (m.phrases || []).forEach(p => add(p && p.en));
  (m.wishes || []).forEach(w => add(w && w.better));
  (m.grammar || []).forEach(g => add(g && g.sentence));
  if (!out.length) (m.paras || []).flatMap(p => kzSents(p.en || "")).slice(0, 3).forEach(add);
  return out.slice(0, 6);
}
function talkVocab(m){
  const txt = [...(m.paras || []).map(p => p.en), ...(m.lines || []).map(l => l.en), ...(m.grammar || []).map(g => g.sentence)].join(" ");
  const seen = new Set(), out = [];
  (txt.match(/[A-Za-z][A-Za-z'-]{5,}/g) || []).forEach(w => { const k = w.toLowerCase(); if (!TK_STOP.has(k) && !seen.has(k)){ seen.add(k); out.push(k); } });
  return out.slice(0, 8);
}
// 中継に渡す教材（トークンを食いすぎないように：本文は合わせて1,400字まで・全体でおよそ600トークン）
function talkPack(m){
  const lines = (m.paras || []).map(p => p.en).concat((m.lines || []).map(l => (l.sp === "partner" ? "Partner: " : "You: ") + l.en));
  let left = 1400; const script = [];
  for (const x of lines){ const t = tkCut(x, 400); if (!t) continue; if (t.length > left) break; script.push(t); left -= t.length; if (script.length >= 8) break; }
  return {id: String(m.id || ""), title: tkCut(m.title, 40), scene: tkCut(m.scene, 200), summary: tkCut(m.summary, 200), dialogue: !!(m.lines || []).length,
          phrases: talkPhrases(m), vocab: talkVocab(m), script, pic: m.pics ? String(Object.values(m.pics)[0] || "") : "", emotion: tkCut(m.emotion || (m.paras && m.paras[0] && m.paras[0].en) || "", 200), qa: (m.qa || []).slice(0, 4).map(q => ({q: tkCut(q.q, 160), a: tkCut(q.a, 160)})).filter(q => q.q)};
}
// 「この教材でAI会話」（教材の画面から）：自分の教材を選んだ状態で AI会話の準備の画面を開く
function talkWith(id, mode){
  const x = TALKCFG(); x.lesson = id; if (mode) x.mode = mode; store("kz-talkcfg", JSON.stringify(x));
  TKMAKE = false; quiet(); KZ = "talk"; renderKz(); window.scrollTo(0, 0);
}
// 相手が会話の中でときどき呼ぶ呼び名（みんなの呼び名・ローマ字。漢字の本名は使わない）。なければ空（相手が名前を聞く）
const talkNick = () => { try { const n = tkCut(typeof snsNick === "function" ? snsNick() : (ME && ME.nick) || "", 20); return n === "メンバー" ? "" : n; } catch (e) { return ""; } };
function talkMineHtml(c, mine){
  if (!mine.length) return "";
  return `<ul class="tkl-list" role="radiogroup" aria-label="自分の教材">${mine.map(m => `<li><button type="button" role="radio" data-tkl="${esc(m.id)}" aria-checked="${c.lesson === m.id}">
      <span class="tkl-k">${m.source === "オーダーメイド" ? "✨" : "🎙"} ${esc(md(m.made || dayKey(Date.now())))}</span><b>${esc(m.title)}</b>${m.scene ? `<span class="tkl-s">${esc(m.scene)}</span>` : ""}</button></li>`).join("")}</ul>
    ${(() => { const m = mine.find(k => k.id === c.lesson); const ph = m ? talkPhrases(m) : []; if (ph.length && c.mode === "training") return tkPracHtml(m, ph); return ph.length ? `<div class="tkl-ph"><span class="rq-h">この会話で使ってみる表現</span><ul>${ph.map(p => `<li>${esc(p)}</li>`).join("")}</ul></div>` : ""; })()}`;
}

/* ---------- 会話の準備：教材を選ぶ（または、その場で作る）→ 相手 → 始める ----------
   画面は「1. 話す教材」（自分の教材の一覧・新しい順）と「✨ 新しい教材を作って始める」（練習＞教材と同じ作るフォームをこの場で開く。
   できたら、その教材を選んだ状態でこの画面にもどる＝kzMake → talkWith）。教材が0本のときは作るフォームだけ。教材を選ぶまで「会話を始める」は押せない。
   先生リンク（ME.viewer）は教材を作れないので、その案内だけ */
let TKMAKE = false;                                                   // 「新しい教材を作って始める」を開いている
function renderTalk(){
  const box = $("kzwrap"), c = TALKCFG(), mine = talkMine(), viewer = !!(ME && ME.viewer);
  if (!mine.some(m => m.id === c.lesson)) c.lesson = "";            // 消した教材・前の版の設定は選んでいないことに
  if (store("kz-tr-offer") !== "1"){ store("kz-tr-offer", "1"); if (c.mode === "chat"){ c.mode = "training"; const x = TALKCFG(); x.mode = "training"; store("kz-talkcfg", JSON.stringify(x)); } }   // トレーニングができた日（2026-10-20）に一度だけ、ふだんの「会話」からおすすめに切りかえる（あとは本人の選んだまま）
  const own = mine.find(m => m.id === c.lesson) || null, making = !viewer && (TKMAKE || !mine.length);
  const head = `<button class="more kzback" type="button" id="kzBack">← 会話の練習へ</button>
    <div class="sec-h"><h2>${SPARK}AIと会話</h2><p>自分のオーダーメイド教材を1つ選んで、その場面で外国の方と声で会話します。相手は短く話して質問してくれるので、あなたがたくさん話せます。終わったら添削・使えた表現・言い直しが出ます。</p></div>`;
  if (viewer && !mine.length){
    box.innerHTML = head + `<div class="panel note tk-viewer"><b>先生リンクでは、AI会話は使えません</b><p>AI会話は、受講生が作ったオーダーメイド教材を選んで始めます。先生リンクでは教材を作れないため、ここからは始められません。受講生ご本人のリンクで使えます。</p></div>`;
    $("kzBack").addEventListener("click", () => { KZ = "conv"; renderKz(); });
    return;
  }
  const makeHtml = making ? `<section class="kzreq panel tkmake" id="tkMake"><h3>✨ 新しい教材を作って始める</h3>
      <p class="tk-make-lead">${mine.length ? "" : "AI会話は、あなた専用の教材で話します。まず1本作りましょう。"}できた教材を選んだ状態で、そのままAI会話に進みます。</p>
      <div id="kzReqBody"><p class="mapnote">読み込んでいます…</p></div>
      ${mine.length ? `<button type="button" class="more" id="tkMakeClose">作らずに、一覧から選ぶ</button>` : ""}</section>` : "";
  box.innerHTML = head + `<div class="panel talkset">
      <div class="rq"><span class="rq-h">1. 話す教材${mine.length ? `<small>${mine.length}本・新しい順</small>` : ""}</span>
        ${viewer ? `<p class="mapnote">先生リンクでは教材を作れません。この端末にある教材から選べます。</p>` : making ? "" : `<button class="btn big tkmake-go" type="button" id="tkMakeGo">✨ 新しい教材を作って始める</button>`}
        ${makeHtml}
        ${mine.length ? `<div id="tkMine">${talkMineHtml(c, mine)}</div>` : ""}</div>
      ${mine.length ? `<div class="rq"><span class="rq-h">2. 練習のしかた</span><div class="modes">${MODES.map(([k, l, d]) => `<button type="button" data-md="${k}" aria-pressed="${c.mode === k}"><b>${l}</b><span>${d}</span></button>`).join("")}</div></div>
      <div class="rq"><span class="rq-h">3. 相手</span><div class="chips">${Object.entries((SAMPLES || {}).partners || PV_FALLBACK).map(([k, p]) => `<button type="button" data-tacc="${k}" aria-pressed="${c.acc === k}">${flagOf(p.flag || k)} ${esc(p.label)}</button>`).join("")}</div>
        <div class="kzbar"><div class="kzrate" role="group">${["女性", "男性"].map(g => `<button type="button" data-tgd="${g}" aria-pressed="${c.gender === g}">${g}</button>`).join("")}</div>
        <div class="kzrate" role="group">${Object.entries(STRL).map(([k, l]) => `<button type="button" data-tst="${k}" aria-pressed="${c.strength === k}">${l}</button>`).join("")}</div></div>
        <input class="kzsel2" id="tkGoal" placeholder="今日の目的（なくてもOK。例：抹茶の強みを2つ伝えて、サンプルの話までする）" value="${esc(c.goal || "")}"></div>
      <label class="kzchk"><input type="checkbox" id="tkDuplex" ${store("kz-duplex") === "1" ? "checked" : ""}>イヤホンを使う（相手の話の途中でも話しかけられる）</label>
      <label class="kzchk"><input type="checkbox" id="tkAvatar" ${avOn() ? "checked" : ""}>顔を出す（アバター）<small>相手の顔が、声に合わせて口を動かします（試験中）</small></label>
      <div id="tkFace">${avFaceHtml()}</div>
      <div class="acts"><button class="btn big" type="button" id="tkGo" ${own ? "" : "disabled"}>🎙 ${own ? "この教材で会話を始める" : "教材を選ぶと始められます"}</button></div>
      <p class="mapnote" id="tkNote">${!own ? "上の一覧から、話す教材を1つ選んでください。" : apiOn() ? `「${esc(own.title)}」の場面で話します。マイクを使います。始めると相手から話しかけてきます。1回は最長${TK_CAP}分・週の持ち時間から使います。` : esc(noApiMsg())}</p><div class="tk-pool" id="tkPool" hidden></div>`
      : `<p class="mapnote">教材ができると、ここで相手（国・声）を選んで会話を始められます。</p>`}
    </div>`;
  $("kzBack").addEventListener("click", () => { talkEnd(false); TKMAKE = false; KZ = "conv"; renderKz(); });
  const keep = x => { if ($("tkGoal")) x.goal = $("tkGoal").value; return x; };
  const set = (k, v) => { const x = keep(TALKCFG()); x[k] = v; store("kz-talkcfg", JSON.stringify(x)); renderTalk(); };
  box.querySelectorAll("[data-md]").forEach(b => b.addEventListener("click", () => set("mode", b.dataset.md)));
  box.querySelectorAll("[data-tacc]").forEach(b => b.addEventListener("click", () => set("acc", b.dataset.tacc)));
  box.querySelectorAll("[data-tgd]").forEach(b => b.addEventListener("click", () => set("gender", b.dataset.tgd)));
  box.querySelectorAll("[data-tst]").forEach(b => b.addEventListener("click", () => set("strength", b.dataset.tst)));
  box.querySelectorAll("[data-tkl]").forEach(b => b.addEventListener("click", () => { TKMAKE = false; set("lesson", b.dataset.tkl); }));
  if ($("tkMakeGo")) $("tkMakeGo").addEventListener("click", () => { TKMAKE = true; renderTalk();
    setTimeout(() => { const t = $("tkMake"); if (t) t.scrollIntoView({behavior: reduce ? "auto" : "smooth", block: "start"}); }, 30); });
  if ($("tkMakeClose")) $("tkMakeClose").addEventListener("click", () => { TKMAKE = false; renderTalk(); });
  if (making) loadSamples().then(() => { if (KZ === "talk" && $("kzReqBody")){ renderReqForm(); } });
  if (!$("tkGo")) return;
  if (!MAST && apiOn() && !DEMO) mastLoad().then(x => { const l = TALKCFG().lesson; if (x && x[l] && x[l].review_open && KZ === "talk" && !TK) renderTalk(); });
  if (apiOn() && !DEMO) api("/api/talk-left", null).then(d => { TKPLAN = d; tkPoolShow(d); if (d.busy_nudge !== false) tkBusyNudge(); }).catch(() => {});
  $("tkDuplex").addEventListener("change", e => store("kz-duplex", e.target.checked ? "1" : null));
  $("tkAvatar").addEventListener("change", e => { store("kz-avatar", e.target.checked ? "1" : "0"); avFaceRender(); });
  avFaceBind();
  $("tkGo").addEventListener("click", async () => {
    const x = keep(TALKCFG()); x.goal = (x.goal || "").trim(); store("kz-talkcfg", JSON.stringify(x));
    const m = talkMine().find(k => k.id === x.lesson) || null;
    if (!m){ $("tkNote").textContent = "話す教材を1つ選んでください。"; return; }   // 教材なしでは送らない（中継も教材なしの会話は受けつけない）
    if (!apiOn()){ $("tkNote").textContent = noApiMsg(); return; }   // デモでは会話を始めない（中継につながない）
    const av = avOn() ? avPrep() : null;                            // 顔を出すときは、このタップの中で映像・音の部品を作って鳴らせる状態にする（iPhone はタップの中でないと音が出ない）
    const launch = av => {
    if (av) av.face = avFaceCur();                                  // 選んだ顔（🎲 ランダムで引いた顔）。なければ標準の顔（Kate・Mark）
    const ctx0 = av ? null : itvPrepCtx();                          // 顔なしのときも、このタップの中で AudioContext を作って鳴らせる状態にする（iPhone 対策。はじめてのインタビューと同じ）
    const theme = `${m.title}：${(m.paras || []).map(p => p.en).join(" ").slice(0, 500) || (m.lines || []).map(l => l.en).join(" ").slice(0, 500)}`;
    const material = {paras: (m.paras || []).map(p => p.en).concat((m.lines || []).filter(l => l.sp === "you").map(l => l.en)), qa: (m.qa || []).map(q => ({q: q.q, a: q.a}))};
    talkStart({place: nearPlace((m.scene || "") + " " + (m.title || ""), "cafe"), place_text: tkCut(m.scene, 200), goal: x.goal, theme, material, lesson: talkPack(m), nick: talkNick(),
               level: m.level || KZREQ().level || "英検準2級", mode: x.mode === "teacher" ? "teacher" : x.mode === "interview" ? "interview" : x.mode === "training" ? "training" : "chat",
               partner: {acc: x.acc, gender: av && av.face ? avFaceGender(av.face) : x.gender, strength: x.strength}}, av, ctx0);   // 顔があるときは声を顔の性別に合わせる
    if (av && av.face) AVF_PICK = null;                             // 次の会話では、また引きなおす（🎲 ランダム）
    };
    if (!av) return launch(null);
    if (x.mode === "training") return launch(av);                   // トレーニングは顔がロールプレイからなので、目印はそのときに見る（tkFaceStep）
    // 顔の使用中の目印（Simli は同時に1つまで）：始める前に見る。使用中なら「声だけで始める／空くまで待つ」
    $("tkGo").disabled = true;
    const st = await api("/api/face-lock", {op: "status", sid: av.sid}).catch(() => ({}));
    $("tkGo").disabled = false;
    if (st.busy) return avBusyAsk(av, launch);
    launch(av);
  });
}
// 顔が使用中のとき：準備の画面に「声だけで始める／空くまで待つ」。待つと4秒ごとに確かめて、空いたら顔ありで始める（タップの中で作った映像・音の部品はそのまま使う）
function avBusyAsk(av, launch){
  const old = $("tkBusy"); if (old) old.remove();
  const acts = $("tkGo").closest(".acts");
  acts.insertAdjacentHTML("afterend", `<div class="avbusy" id="tkBusy" role="status"><p id="tkBusyMsg">いま他の人が顔ありで話してるよ。</p>
    <div class="acts"><button class="btn" type="button" id="tkBusyVoice">声だけで始める</button><button class="btn ghost" type="button" id="tkBusyWait">空くまで待つ</button></div></div>`);
  acts.hidden = true;
  let timer = null;
  const done = () => { clearTimeout(timer); const b = $("tkBusy"); if (b) b.remove(); acts.hidden = false; };
  $("tkBusyVoice").addEventListener("click", () => { done(); avStop(av); launch(null); });
  $("tkBusyWait").addEventListener("click", () => {
    if ($("tkBusyWait").dataset.on){ done(); avStop(av); return; }      // 待っているあいだは「やめる」
    $("tkBusyWait").dataset.on = "1"; $("tkBusyWait").textContent = "やめる";
    $("tkBusyMsg").innerHTML = `空くのを待っています（数秒ごとに確かめます）<span class="avdots" aria-hidden="true"><i></i><i></i><i></i></span>`;
    const tick = async () => {
      if (!$("tkBusy")){ avStop(av); return; }                          // 画面を離れた
      const st = await api("/api/face-lock", {op: "status", sid: av.sid}).catch(() => ({}));
      if (!$("tkBusy")){ avStop(av); return; }
      if (!st.busy){ done(); launch(av); return; }
      timer = setTimeout(tick, 4000);
    };
    timer = setTimeout(tick, 1500);
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
async function talkStart(cfg, av, ctx0){
  const box = $("kzwrap"); hush();
  const go = $("tkGo") || $("tkRetry"), note = t => { const n = $("tkNote"); if (n) n.textContent = t; };   // 準備の画面からでも、振り返りの「同じ内容でもう一回」からでも始められる
  if (go) go.disabled = true; note("つないでいます…");
  let tok;
  try { tok = await api("/api/live-token", {...cfg, profile: itvProfilePack()}); } catch (e) { note(e.message); if (go) go.disabled = false; avStop(av); try { ctx0 && ctx0.close(); } catch (e2) {} return; }
  const p = tok.partner, place = cfg.place_text ? nearPlace(cfg.place_text, cfg.place) : cfg.lesson ? nearPlace(cfg.lesson.scene + " " + cfg.lesson.title, cfg.place) : cfg.place;
  TK = {cfg, p, tr: [], t0: 0, srcs: [], playHead: 0, speaking: false, duplex: store("kz-duplex") === "1", usage: {}, U: tkUsageNew(), cap: Math.max(1, +tok.max_min || TK_CAP), step: -1, warned: false, av};
  if (av) av.owner = TK;                                          // avRoute が参照する再生位置・ctx の持ち主（会話＝TK／インタビュー＝ITV）
  box.innerHTML = `<div class="talk">
    <div class="stage${av ? " avwait" : ""}">${sceneSvg(place)}<div class="av">${avatarSvg(p)}</div>${av ? `<div class="avv" id="tkAvv"></div><div class="avnote wait" id="tkAvNote" role="status">相手がいま準備してるよ。ちょっと待ってね！<span class="avdots" aria-hidden="true"><i></i><i></i><i></i></span></div>` : ""}
      <div class="tag">${flagOf(p.acc)} ${esc(p.name)}${cfg.retry ? `<small class="num">${cfg.retry.round}回目</small>` : ""}<small>${esc((PV_FALLBACK[p.acc] || {}).label || "")}・${p.strength === "strong" ? "なまり強め" : "きれいな発音"}</small></div>
      <div class="tkstate" id="tkState">つないでいます…</div><div class="tktime num" id="tkTime">0:00</div></div>
    ${cfg.mode === "training" ? tkStepsHtml() : ""}${cfg.lesson && cfg.lesson.pic ? `<img class="tk-scimg" src="${esc(kzImgUrl(cfg.lesson.pic))}" alt="場面のイメージ" loading="lazy" onerror="this.remove()">` : ""}
    <div class="cap" id="tkCap"></div>
    <div class="acts" style="justify-content:center"><button class="btn big stop" type="button" id="tkEnd">会話を終わる</button><label class="kzchk"><input type="checkbox" id="tkSub" checked>字幕</label></div>
    <p class="mapnote" style="text-align:center">相手が話し終わったら、あなたの番です。分からないときは "Sorry, could you say that again?" でOK。</p></div>`;
  $("tkEnd").addEventListener("click", () => talkEnd(true));
  $("tkSub").addEventListener("change", e => $("tkCap").classList.toggle("off", !e.target.checked));
  if (av && cfg.mode === "training" && tok.face_roleplay_only !== false){   // 標準パック：顔（Simli）はロールプレイのあいだだけ。ほかの段は声だけ（Simli の分数を半分ほどに）
    $("tkAvv").append(av.video, av.audio); av.deferred = true; av.gender = p.gender;
    const st = box.querySelector(".stage"); if (st) st.classList.remove("avwait");
    const nt = $("tkAvNote"); if (nt){ nt.classList.remove("wait"); nt.textContent = "ロールプレイになったら、相手の顔が出ます"; setTimeout(() => { if (nt.textContent.startsWith("ロールプレイになったら")) nt.hidden = true; }, 5000); }
  }
  else if (av){ $("tkAvv").append(av.video, av.audio); avStart(av, p.gender); }
  else if (f2On()) f2Mount(box.querySelector(".stage .av"), p.gender);   // 試作：端末の中だけで口・まばたきを動かす顔（Simli を使わない・設定で ON のときだけ）
  try {
    const ctx = TK.ctx = (av && av.ctx) || ctx0 || new (window.AudioContext || window.webkitAudioContext)();
    if (av) av.ctx = null;                                          // タップの中で作った AudioContext を会話の声に使う（閉じるのは talkEnd）
    await ctx.resume();                                             // マイクが開くと iPhone は音声セッションを play-and-record に切りかえ、ctx が中断されることがある
    ctx.onstatechange = () => { if (TK && TK.ctx === ctx && ctx.state !== "running") ctx.resume().catch(() => {}); };
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
        if (av && !av.deferred) Promise.race([av.ready, new Promise(r => setTimeout(r, av.face ? 15000 : 4000))]).then(kick);   // 顔が出てから最初のあいさつ（口を合わせる）。待つのは標準の顔で4秒・自分で作った顔で15秒まで（最初のコマまで8〜13秒かかる）。顔がだめなら（ready）すぐ声だけで始める
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
      if (m.usageMetadata){ TK.usage = m.usageMetadata; tkUsageAdd(TK.U, m.usageMetadata); }
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
const AV_LIB = "./vendor/simli-3.0.2.js", AV_WAIT = 8000, AV_CHUNK = 3000;
const AV_WAIT_FACE = 16000;   // 自分で作った顔（Simli の legacy の顔）は最初のコマまで 8〜13秒かかることがある（標準の顔は約5秒）。待つあいだも声の会話は始まる（あいさつが待つのは4秒まで）。だめなら標準の顔で8秒、それもだめなら声だけ   // 3000サンプル＝6000バイト（Simli がちょうどよい大きさ）
const avNow = () => Math.round(performance.now());
const avStats = () => (window.__cgAvatarStats = window.__cgAvatarStats || {sessions: [], turns: []});
/* ---------- 相手の顔を選ぶ（🎲 ランダム・2026-10-19 社長指示）。顔の一覧は app/faces/avatar_faces.json（build_site.py が下の AV_FACES に入れる）
   顔は Simli で作った架空の人の笑顔（f51〜f80＝20〜30代が中心。f01〜f50 は「もっと見る（いろんな年代）」のときだけ）。
   毎回の会話で絞りこんだ中から1つ引く（準備の画面で先に見せる・「もう一回引く」）。絞りこみ（地域・性別・もっと見る）はこの端末に（kz-avface）。
   声は顔の性別に合わせる（女性＝Aoede・男性＝Achird）。中継は avatar_faces.json の faceId だけを受けつける。顔がつながらなければ標準の顔（Kate・Mark）→ 8秒で声だけ ---------- */
const AV_FACES = [{"id":"f51","f":"70748f0c-cf7c-4839-b830-2f64cdb51b3e","g":"female","r":"white","a":"20s","t":"faces/f51.webp","m":1},{"id":"f52","f":"ad18b98e-d730-441c-a547-380fdd1e4be9","g":"female","r":"white","a":"30s","t":"faces/f52.webp","m":1},{"id":"f53","f":"5d181545-d9c1-406c-9c33-d30be4463a56","g":"female","r":"white","a":"20s","t":"faces/f53.webp","m":1},{"id":"f54","f":"77236406-ce66-4624-a7eb-23f0d494ec28","g":"female","r":"latin","a":"20s","t":"faces/f54.webp","m":1},{"id":"f55","f":"ae2d5367-d7f0-4ac6-b7d6-3d02cd2259ac","g":"female","r":"white","a":"30s","t":"faces/f55.webp","m":1},{"id":"f56","f":"dcc4f2e4-3ec6-4101-9e72-c561c07b6a24","g":"female","r":"black","a":"20s","t":"faces/f56.webp","m":1},{"id":"f57","f":"3ec14cbc-3a3e-451a-917c-0c4083eb6e18","g":"female","r":"eastasian","a":"20s","t":"faces/f57.webp","m":1},{"id":"f58","f":"41b02c14-dc14-429f-bd43-c4036ed7b3ba","g":"female","r":"white","a":"20s","t":"faces/f58.webp","m":1},{"id":"f59","f":"a47b5600-8cba-4c80-9df0-25ce580376a9","g":"female","r":"middleeastern","a":"30s","t":"faces/f59.webp","m":1},{"id":"f60","f":"c90fe88e-bcb0-4882-9eda-19a6d62e302c","g":"female","r":"mixed","a":"20s","t":"faces/f60.webp","m":1},{"id":"f61","f":"612d23da-69c9-40b2-93e4-92e1f21a6662","g":"female","r":"southasian","a":"20s","t":"faces/f61.webp","m":1},{"id":"f62","f":"c86380d3-01de-42a2-8cf7-e24841f08f22","g":"female","r":"latin","a":"30s","t":"faces/f62.webp","m":1},{"id":"f66","f":"d291d5f5-e89d-45a3-9689-19eeae4fdc8b","g":"male","r":"white","a":"20s","t":"faces/f66.webp","m":1},{"id":"f67","f":"33dc035e-ceb7-417a-99da-65225caead64","g":"male","r":"black","a":"30s","t":"faces/f67.webp","m":1},{"id":"f68","f":"427e976b-4a84-4b26-afbd-820ed15f3380","g":"male","r":"eastasian","a":"20s","t":"faces/f68.webp","m":1},{"id":"f70","f":"2d3f2ffc-994d-42a8-acc2-9faf6e825634","g":"male","r":"southasian","a":"20s","t":"faces/f70.webp","m":1},{"id":"f71","f":"ed407679-aa6b-428d-a76e-b560c2c3fcae","g":"male","r":"middleeastern","a":"30s","t":"faces/f71.webp","m":1},{"id":"f72","f":"ab6ae215-ec9c-4088-a916-3fc7e5954de9","g":"male","r":"southeastasian","a":"20s","t":"faces/f72.webp","m":1}];                                   // {id, f: Simli faceId, g: female|male, r: 地域, a: 年代, t: 小さい写真, m: 1＝ふだんの顔（f51〜f80）}
const AVF_RACE = [["all", "すべて"], ["eastasian", "東アジア"], ["white", "欧米"], ["latin", "ラテン"], ["black", "アフリカ系"], ["middleeastern", "中東"], ["southasian", "南アジア"], ["southeastasian", "東南アジア"], ["pacificislander", "太平洋"], ["mixed", "ミックス"]];
const AVF_GEN = [["female", "女性"], ["male", "男性"], ["any", "どちらでも"]];
const AVF_CFG = () => { try { return {race: "all", gender: "any", more: false, ...JSON.parse(store("kz-avface") || "{}")}; } catch (e) { return {race: "all", gender: "any", more: false}; } };
const avFaceGender = f => f && f.g === "male" ? "男性" : "女性";
const avFacePool = (c = AVF_CFG()) => AV_FACES.filter(f => (c.more || f.m) && (c.race === "all" || f.r === c.race) && (c.gender === "any" || f.g === c.gender));
let AVF_PICK = null;                                                 // いま引いている顔（この画面のあいだだけ。会話を始めたら次は引きなおす）
function avFaceDraw(){
  const pool = avFacePool();
  if (!pool.length) return (AVF_PICK = null);
  const rest = pool.length > 1 && AVF_PICK ? pool.filter(f => f.id !== AVF_PICK.id) : pool;   // もう一回引く：同じ顔は続けない
  return (AVF_PICK = rest[Math.floor(Math.random() * rest.length)]);
}
const avFaceCur = () => { const pool = avFacePool(); return AVF_PICK && pool.some(f => f.id === AVF_PICK.id) ? AVF_PICK : avFaceDraw(); };
function avFaceHtml(){
  if (!avOn() || !AV_FACES.length) return "";
  const c = AVF_CFG(), f = avFaceCur(), hasMore = AV_FACES.some(x => !x.m);
  const races = AVF_RACE.filter(([k]) => k === "all" || AV_FACES.some(x => (c.more || x.m) && x.r === k));
  const lab = k => (AVF_RACE.find(r => r[0] === k) || [k, k])[1];
  return `<div class="avf" role="group" aria-label="相手の顔">
    <div class="avf-pick">${f ? `<img class="avf-img" src="${esc(f.t)}" alt="" width="64" height="64" decoding="async">` : `<span class="avf-img avf-none">🙂</span>`}
      <div class="avf-txt"><b>🎲 ランダム</b><span>${f ? `${esc(lab(f.r))}・${esc(String(f.a).replace("s", "代"))}・${avFaceGender(f)}（声も${avFaceGender(f)}）` : "この条件の顔がありません（標準の顔で話します）"}</span></div>
      <button type="button" class="btn ghost avf-re" id="tkFaceRe" ${f && avFacePool().length > 1 ? "" : "disabled"}>もう一回引く</button></div>
    <div class="chips avf-chips" role="group" aria-label="地域">${races.map(([k, l]) => `<button type="button" data-avr="${k}" aria-pressed="${c.race === k}">${l}</button>`).join("")}</div>
    <div class="chips avf-chips" role="group" aria-label="性別">${AVF_GEN.map(([k, l]) => `<button type="button" data-avg="${k}" aria-pressed="${c.gender === k}">${l}</button>`).join("")}</div>
    ${hasMore ? `<label class="kzchk avf-more"><input type="checkbox" id="tkFaceMore" ${c.more ? "checked" : ""}>もっと見る（いろんな年代）</label>` : ""}
  </div>`;
}
function avFaceRender(){ const el = $("tkFace"); if (el){ el.innerHTML = avFaceHtml(); avFaceBind(); } }
function avFaceBind(){
  const el = $("tkFace"); if (!el) return;
  const set = (k, v) => { const c = AVF_CFG(); c[k] = v; store("kz-avface", JSON.stringify(c)); avFaceRender(); };
  el.querySelectorAll("[data-avr]").forEach(b => b.addEventListener("click", () => set("race", b.dataset.avr)));
  el.querySelectorAll("[data-avg]").forEach(b => b.addEventListener("click", () => set("gender", b.dataset.avg)));
  const m = $("tkFaceMore"); if (m) m.addEventListener("change", e => set("more", e.target.checked));
  const r = $("tkFaceRe"); if (r) r.addEventListener("click", () => { avFaceDraw(); avFaceRender(); });
  document.querySelectorAll("[data-tgd]").forEach(b => { if (b.dataset.avf) return; b.dataset.avf = "1";   // 「相手」の女性／男性を押したら、顔もその性別から引く（声と顔をそろえる）。相手の画面が描きなおす前に（capture）
    b.addEventListener("click", () => { if (!avOn() || !AV_FACES.length) return; const c = AVF_CFG(); c.gender = b.dataset.tgd === "男性" ? "male" : "female"; store("kz-avface", JSON.stringify(c)); }, true); });
}
function avSilentWav(){                                               // 0.1秒の無音（タップの中で <audio> を一度鳴らすため）
  const n = 800, b = new DataView(new ArrayBuffer(44 + n * 2)), w = (o, t) => [...t].forEach((c, i) => b.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); b.setUint32(4, 36 + n * 2, true); w(8, "WAVEfmt "); b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, 1, true);
  b.setUint32(24, 8000, true); b.setUint32(28, 16000, true); b.setUint16(32, 2, true); b.setUint16(34, 16, true); w(36, "data"); b.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([b.buffer], {type: "audio/wav"}));
}
const avSidNew = () => { try { return crypto.randomUUID().replace(/-/g, ""); } catch (e) { return Array.from({length: 32}, () => Math.floor(Math.random() * 16).toString(16)).join(""); } };
// 顔の使用中の目印を外す（終わり・顔がだめ・ページを閉じる）。sendBeacon はページを閉じても届く（ヘッダーなし・本文の sid だけ）
function avRelease(A){
  if (!A || !A.sid || A.released) return;
  A.released = true; clearInterval(A.hb);
  if (CG_API === null || !A.held) return;
  const body = JSON.stringify({sid: A.sid});
  try { if (navigator.sendBeacon && navigator.sendBeacon(CG_API + "/api/face-release", body)) return; } catch (e) {}
  fetch(CG_API + "/api/face-release", {method: "POST", body, keepalive: true}).catch(() => {});
}
const AV_BUSY = /RATE LIMIT|いま他の人が顔あり/i;                // Simli に断られた（同時に1つまで）・目印が使用中：標準の顔で頼み直さない（同じく断られる）
function avPrep(){
  // 会話を始めるタップの中で呼ぶ：映像（playsinline・muted）と音の部品を作り、音は一度鳴らしておく。ライブラリの読み込みもここで始める
  const video = document.createElement("video"), audio = document.createElement("audio");
  video.muted = true; video.autoplay = true; video.playsInline = true; ["muted", "autoplay", "playsinline"].forEach(a => video.setAttribute(a, ""));
  audio.autoplay = true; audio.setAttribute("playsinline", "");
  audio.src = avSilentWav(); audio.play().catch(() => {});
  const ctx = new (window.AudioContext || window.webkitAudioContext)(); ctx.resume().catch(() => {});
  const A = {video, audio, ctx, lib: import(AV_LIB).catch(e => ({err: e})), live: false, dead: false, route: "direct", speaking: false, sid: avSidNew(),
    buf: new Int16Array(AV_CHUNK * 4), bl: 0, rsPos: 1, rsLast: 0, inTurn: false, voiceEnd: 0};
  A.ready = new Promise(r => { A.readyRes = r; });
  return A;
}
async function avStart(A, gender, std){
  const face = std ? null : A.face || null;                         // std＝自分で作った顔がだめだったので標準の顔（Kate・Mark）で頼み直す
  const s = {t0: avNow(), gender, face: face ? face.id : "std"}; avStats().sessions.push(s); A.s = s;
  const bad = why => { if (AV_BUSY.test(why)) return false; if (face && !A.live && !A.dead && !A.retried){ A.retried = true; avDrop(A, why); avStart(A, gender, true); return true; } return false; };
  const wait = face ? AV_WAIT_FACE : AV_WAIT;
  A.timer = setTimeout(() => { if (!A.live && !bad(`${wait / 1000}秒でつながらなかった`)) avFail(A, `${wait / 1000}秒でつながらなかった`); }, wait);
  try {
    const [mod, t] = await Promise.all([A.lib, api("/api/simli-token", {partner: {gender}, sid: A.sid, ...(face ? {faceId: face.f} : {})}).catch(e => { if (face) return {err: e}; throw e; })]);
    if (mod.err) throw mod.err;
    if (t.err){ if (!bad("token " + t.err.message)) avFail(A, String(t.err.message).slice(0, 200)); return; }
    if (!A.held && !A.dead){ A.held = true; A.hb = setInterval(() => { if (!A.dead) api("/api/face-lock", {op: "renew", sid: A.sid}).catch(() => {}); }, 15000); }   // 顔があるあいだ目印を延ばす（TTL 45秒）
    s.token = avNow(); s.faceId = t.faceId; s.custom = !!t.custom;
    if (A.dead || A.s !== s) return;
    const c = A.client = new mod.SimliClient(t.session_token, A.video, A.audio, null, mod.LogLevel.ERROR, "livekit");
    const mine = () => A.client === c && A.s === s;                 // 頼み直したあと、前のセッションの知らせは無視する
    c.on("start", () => {                                           // 最初の映像のコマが出た
      if (A.dead || !mine()) return;
      A.live = true; clearTimeout(A.timer); s.start = avNow();
      A.video.parentNode && A.video.parentNode.classList.add("on"); document.querySelector(".stage .av") && document.querySelector(".stage .av").classList.add("vid");
      avNote("");
      try { c.sendAudioData(new Uint8Array(6000)); } catch (e) {}  // 無音を少し送って動かしはじめる（Simli の推奨）
      A.readyRes();
    });
    c.on("speaking", () => { A.speaking = true; const tr = avTurnStat(A); if (tr && !tr.simliSpeaking) tr.simliSpeaking = avNow(); });
    c.on("silent", () => { A.speaking = false; const tr = avTurnStat(A); if (tr) tr.simliSilent = avNow(); });
    c.on("startup_error", m => { if (mine() && !bad("startup_error " + m)) avFail(A, "startup_error " + m); });
    c.on("error", m => { if (mine() && !bad("error " + m)) avFail(A, "error " + m); });
    c.on("stop", () => { if (mine() && !bad("stop")) avFail(A, "stop"); });
    await c.start();
  } catch (e) { if (A.s === s && !bad(String(e && e.message || e).slice(0, 200))) avFail(A, String(e && e.message || e).slice(0, 200)); }
}
// 自分で作った顔がつながらなかった：そのセッションだけ止める（会話・<video>・<audio> はそのまま。次に標準の顔で頼み直す）
function avDrop(A, why){
  clearTimeout(A.timer);
  if (A.s){ A.s.end = avNow(); A.s.fail = why; }
  const c = A.client; A.client = null;
  if (c) Promise.resolve().then(() => c.stop()).catch(() => {});
}
function avNote(text, warn){
  const st = document.querySelector(".stage"); if (st) st.classList.remove("avwait");   // 顔が出た・だめだった：準備中の表示（点・ふわっと）をやめる
  const el = document.querySelector(".avnote"); if (!el) return;   // AI会話は #tkAvNote・インタビューは #itvAvNote（どちらも .avnote は1画面に1つだけ）
  el.classList.remove("wait");
  el.textContent = text; el.hidden = !text; el.classList.toggle("warn", !!warn);
  if (warn) setTimeout(() => { if (el.textContent === text) el.hidden = true; }, 6000);
}
// 顔の表示をやめる（why があれば「声だけで続けます」と小さく出す）。会話はそのまま声だけで続く
function avFail(A, why){
  if (!A || A.dead) return;
  const was = A.live;
  const st = document.querySelector(".stage"); if (st) st.classList.remove("avwait");
  A.dead = true; A.live = false; A.route = "direct"; A.speaking = false; A.bl = 0;
  clearTimeout(A.timer); clearTimeout(A.ft);
  if (A.s){ A.s.end = avNow(); if (why) A.s.fail = why; }
  if (A.client) Promise.resolve().then(() => A.client.stop()).catch(() => {});   // Simli の分数を止める
  const box = A.video.parentNode; if (box) box.classList.remove("on");
  const av = document.querySelector(".stage .av"); if (av) av.classList.remove("vid");
  avRelease(A);
  if (why) avNote(/RATE LIMIT/i.test(why) ? "顔はいま混んでいます。声だけで続けます" : /いま他の人が顔あり/.test(why) ? "いま他の人が顔ありで話してるよ。声だけで続けます" : was ? "顔の表示が切れました。声だけで続けます" : "顔は出せませんでした。声だけで続けます", true);
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
  const O = A.owner;                                              // 再生位置・ctx の持ち主（会話＝TK／インタビュー＝ITV。avStart の前に owner を立てておく）
  if (A.route !== "simli"){ if (O.playHead > O.ctx.currentTime + 0.02) return false; A.route = "simli"; }
  const n = avResample(A, data);
  avFlush(A, false);
  const at = Math.max(O.ctx.currentTime + 0.3, O.playHead); O.playHead = at + n / 24000;   // 相手が話している目安（イヤホンなしのときマイクを止めるのに使う）
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
  const rem = Math.max(0, TK.cap * 60 - sec);                       // この回の残り（1回の上限と、週の残りの小さいほう＝中継が決めた max_min）
  $("tkTime").textContent = "残り " + Math.floor(rem / 60) + ":" + String(Math.floor(rem % 60)).padStart(2, "0");
  TK.speaking = TK.playHead > TK.ctx.currentTime + 0.05 || !!(TK.av && TK.av.speaking);
  const d = new Uint8Array(TK.an.fftSize); TK.an.getByteTimeDomainData(d);
  let rms = 0; for (const v of d) rms += ((v - 128) / 128) ** 2; rms = Math.sqrt(rms / d.length);
  const mouth = document.getElementById("tkMouth"); if (mouth) mouth.setAttribute("ry", String(2.5 + Math.min(12, rms * 90)));
  if (F2) f2Level(TK.speaking ? rms : 0);
  if (TK.cfg.mode === "training") tkStepTick(sec);
  if (!TK.warned && sec > TK.cap * 60 - 60){ TK.warned = true; toast(`あと1分で終わります（1回${TK.cap}分まで）`, 3000); }
  $("tkState").textContent = TK.speaking ? `${TK.p.name} が話しています` : "あなたの番です";
  document.querySelector(".stage") && document.querySelector(".stage").classList.toggle("yours", !TK.speaking);
  if (sec > TK.cap * 60) talkEnd(true);                            // 1回の上限（中継が決める：ふつう10分・今日の残りが少ないときはその分）
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
  if (!review){ f2Unmount(); if (T.t0) api("/api/usage", {seconds: Math.round((Date.now() - T.t0) / 1000), mode: T.cfg.mode, u: T.U || tkUsageNew()}).catch(() => {}); return; }
  const seconds = T.t0 ? Math.round((Date.now() - T.t0) / 1000) : 0;
  f2Unmount();
  const U = T.U || tkUsageNew();
  api("/api/usage", {session: T.p.name, prompt: U.prompt, response: U.response, seconds, mode: T.cfg.mode, u: U}).catch(() => {});
  const box = $("kzwrap");
  const R = T.cfg.retry, rnd = R ? R.round : 1, share = talkShare(T.tr);
  box.innerHTML = `<div class="sec-h"><h2>${SPARK}今日の振り返り${R ? `<small class="num">（${rnd}回目）</small>` : ""}</h2><p id="tkRevH">${esc(T.p.name)}さんとの会話（${Math.floor(seconds / 60)}分${seconds % 60}秒）。添削を作っています…</p></div><div id="tkRev"><p class="loading">先生が文字起こしを読んでいます…</p></div>`;
  let r;
  const L = T.cfg.lesson;
  try { r = await api("/api/review", {transcript: T.tr, scene: T.cfg.place_text || T.cfg.place, mode: T.cfg.mode, level: T.cfg.level, theme: T.cfg.theme, partner: T.cfg.partner, seconds,
                                      ...(L ? {lesson: {id: L.id, title: L.title, phrases: L.phrases}} : {}), ...(R && R.phrases.length ? {retry: {round: R.round, phrases: R.phrases}} : {})}); }
  catch (e) { $("tkRev").innerHTML = `<p class="note">添削を作れませんでした（${esc(e.message)}）。</p>`; return; }
  cdStamp();
  const tg = L ? talkTargets(r, L, T.tr) : null, pr = R && R.phrases.length ? talkTargets({targets: r.practiced}, {phrases: R.phrases}, T.tr) : null;
  const next = talkNextRetry(r, pr, R);
  const l = talkLog(); l.push({t: Date.now(), seconds, words: r.words || 0, place: T.cfg.place, partner: T.cfg.partner, score: r.score, fixes: (r.fixes || []).length,
    types: r.mistake_types || [], can: r.can_do || [], ...(T.cfg.mode === "training" ? {training: 1, good: r.good || [], improve: r.improve || ""} : {}), ...(share ? {share: share.pct} : {}), ...(L ? {lesson: L.id, used: tg.filter(x => x.used).length, of: tg.length} : {}), ...(R ? {round: rnd, fixed: pr ? pr.filter(x => x.used).length : 0, tried: pr ? pr.length : 0} : {})});
  if (!r.empty && l.length === 1) tvFire("first_talk");   // 先生の声のごほうび：はじめてのAI会話（会話ログ 0→1。app/_part_teachervoice.js）
  store("kz-talks", JSON.stringify(l.slice(-300)));
  $("tkRevH").textContent = `${T.p.name}さんとの会話（${Math.floor(seconds / 60)}分${seconds % 60}秒）`;
  $("tkRev").innerHTML = r.empty ? `<p class="note">あなたの声がほとんど聞き取れませんでした。マイクの許可と、周りの音を確かめて、もう一度どうぞ。</p>` : talkShareHtml(share) + (pr ? talkRetryHtml(pr, R) : "") + (T.cfg.mode === "training" ? tkSummaryHtml(r, tg, seconds) : "") + (tg ? talkTargetsHtml(tg, L) : "") + reviewHtml(T.cfg.mode === "training" && (r.good || []).length ? {...r, good: []} : r) + snsAfterHtml()
    + `<div class="panel tkr-next"><p>${next.phrases.length ? `次の${rnd + 1}回目は、言い直した表現（${next.phrases.length}つ）を相手が使わせてくれます。自然に言えるまで、同じ場面をくり返しましょう。` : "同じ場面で、もう一度話してみましょう。"}</p>
      <button class="btn big" type="button" id="tkRetry">🔁 同じ内容でもう一回（${rnd + 1}回目）</button><p class="mapnote" id="tkNote">今週の持ち時間から使います。</p></div>
    <div class="acts"><button class="btn" type="button" id="tkAgain">教材・相手を変えて話す</button><button class="btn ghost" type="button" id="tkBack2">会話の練習へ</button></div>
    <details class="panel" style="margin-top:12px"><summary>会話の文字起こし</summary><div class="cap full">${T.tr.map(x => `<p class="${x.who === "you" ? "you" : "pt"}"><b>${x.who === "you" ? "あなた" : esc(T.p.name)}</b>${esc(x.text)}</p>`).join("")}</div></details>`;
  if (!r.empty){ pbCheckAndShow($("tkRev"), "talk_long", seconds); pbCheckAndShow($("tkRev"), "week_minutes", pbWeekMinutes()); }
  const a = $("tkAgain"); if (a) a.addEventListener("click", () => { KZ = "talk"; renderKz(); });
  if (apiOn() && !DEMO){ const pe = document.createElement("div"); pe.className = "tk-pool"; pe.hidden = true; const nx = box.querySelector(".tkr-next"); if (nx) nx.prepend(pe); api("/api/talk-left", null).then(d => tkPoolShow(d, pe)).catch(() => {}); }
  const o = $("tkOpenL"); if (o) o.addEventListener("click", () => openKz(o.dataset.id));
  const rb = $("tkRetry"); if (rb) rb.addEventListener("click", () => {
    if (!apiOn()){ $("tkNote").textContent = noApiMsg(); return; }
    const av = avOn() ? avPrep() : null;                            // 顔を出すときは、このタップの中で用意する（iPhone）
    if (av && T.av && T.av.face && avFaceGender(T.av.face) === ((T.cfg.partner || {}).gender || "女性")) av.face = T.av.face;   // 同じ相手（同じ顔・同じ声）でもう一回
    const ctx0 = av ? null : itvPrepCtx();                          // 顔なしのときも、このタップの中で AudioContext を作っておく（iPhone 対策）
    const {retry, ...base} = T.cfg;
    talkStart({...base, retry: {round: rnd + 1, phrases: next.phrases, mistakes: next.mistakes, hist: next.hist}}, av, ctx0);
  });
  const b = $("tkBack2"); if (b) b.addEventListener("click", () => { KZ = "conv"; renderKz(); });
}
/* ---------- トレーニング（教材から：ウォームアップ → フレーズ練習 → ロールプレイ → ふりかえり・docs/talk-training.md） ---------- */
const TK_CAP = 10;                                                  // 表示用の目安（本当の数字は tools/talk_plan.json → 中継が返す）
// 週の持ち時間（標準パック・docs/talk-standard.md）：準備の画面とふりかえりに「今週の残り」を出す。運営・先生は上限なし
function tkPoolShow(d, el = $("tkPool")){
  if (!el || !d) return;
  el.hidden = false;
  if (d.exempt){ el.innerHTML = `<b>運営・先生は上限なし</b><span>1回は最長${esc(String(d.session_min || TK_CAP))}分（使った分は記録します）</span>`; return; }
  const wk = +d.week_min || 0, left = Math.max(0, +d.left_min || 0), pct = wk ? Math.round(100 * left / wk) : 0;
  const base = +d.base_week_min || wk, ew = +d.earned_week_min || 0, sw = +d.streak_week_min || 0, qw = +d.quest_week_min || 0, sd = +d.streak_days || 7, run = Math.min(sd, +d.streak_run || 0);
  const stk = d.streak_bonus_min ? `<p class="tk-streak">${sw ? `🔥 ${sd}日連続！今週は ＋${sw}分` : `🔥 連続 <b class="num">${run}</b>/${sd}日 ・ ${sd}日続けると今週 ＋${esc(String(d.streak_bonus_min))}分`}</p>` : "";
  const rs = d.resets_at ? new Date(d.resets_at) : null, rsT = rs ? `${rs.getMonth() + 1}/${rs.getDate()}（月）` : "月曜";
  el.innerHTML = `<div class="tk-pool-h"><span>今週のAI会話</span><b class="num">のこり ${left}分</b><small>／${wk}分${ew || sw || qw ? `（${[ew ? `練習で＋${ew}分` : "", sw ? `連続のごほうび＋${sw}分` : "", qw ? `ふたりクエスト＋${qw}分` : ""].filter(Boolean).join("・")}）` : ""}</small></div>
    <div class="tk-pool-bar" role="img" aria-label="今週の残り ${left}分（${wk}分のうち）"><i style="width:${pct}%"></i></div>
    <p class="mapnote">${left < 1 ? `今週の分は使いきりました。${rsT}にまた${base}分になります。録音のフレーズ練習で教材を1つ終えると＋${esc(String(d.earn_per_lesson_min || 5))}分。` : `使わなかった日の分は、その週のうちなら持ちこせます。${rsT}に${base}分に戻ります。1回は最長${esc(String(d.session_min || TK_CAP))}分。`}</p>${stk}`;
}
// 標準パック マイルストーン2：フレーズ練習は始める前に録音で（安いモデルで採点・/api/read-check）。生のAIはロールプレイとふりかえりだけ
const TK_STEPS = [["ロールプレイ", ""], ["ふりかえり", "Move to step 2: feedback now. Step out of the role-play: two good points, one thing to practice next time, then goodbye."]];
const tkStepAt = (sec, cap) => sec / 60 < cap * (+((TKPLAN && TKPLAN.live_rp_end_pct) || 85) / 100) ? 0 : 1;
const tkStepsHtml = () => `<ol class="tk-steps" id="tkSteps" aria-label="トレーニングの流れ"><li class="done"><i class="num">✓</i>録音で練習</li>${TK_STEPS.map(([l], i) => `<li data-st="${i}"${i ? "" : ` aria-current="step"`}><i class="num">${i + 2}</i>${l}</li>`).join("")}</ol>`;
const tkMonth = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 7);
function tkPrac(id){ try { const a = JSON.parse(store("kz-prac") || "{}"), x = a[id]; return x && x.m === tkMonth() ? x : {m: tkMonth(), ok: [], earned: 0}; } catch (e) { return {m: tkMonth(), ok: [], earned: 0}; } }
function tkPracSave(id, x){ let a = {}; try { a = JSON.parse(store("kz-prac") || "{}"); } catch (e) {} a[id] = x; store("kz-prac", JSON.stringify(a)); }
function tkPracHtml(m, ph){
  const ms = MAST && MAST[m.id];
  if (ms && ms.review_open) return tkRevHtml(m, ph, ms);
  const x = tkPrac(m.id), n = Math.min(ph.length, 6), got = x.ok.filter(i => i < n).length;
  return `<div class="tkl-ph tk-prac" data-lesson="${esc(m.id)}" data-n="${n}"><span class="rq-h">ステップ1：録音でフレーズ練習（声のAIは使いません）</span>
    <p class="mapnote">1つずつ 🎙 を押して声に出して読み、もう一度押すと採点します。ぜんぶ合格すると今週のAI会話が <b>＋${esc(String((TKPLAN && TKPLAN.earn_per_lesson_min) || 5))}分</b>（月${esc(String((TKPLAN && TKPLAN.earn_month_cap_min) || 40))}分まで・同じ教材は月1回）。</p>
    <ul class="tk-prl">${ph.slice(0, n).map((p, i) => `<li data-pi="${i}" class="${x.ok.includes(i) ? "ok" : ""}"><span class="tk-pp">${esc(p)}</span><button type="button" class="btn ghost sm" data-prac="${i}">${x.ok.includes(i) ? "✓ もう一度" : "🎙 録音"}</button><div class="tk-pout"></div></li>`).join("")}</ul>
    <p class="tk-prs" id="tkPrs"><b class="num">${got}/${n}</b> 合格${x.earned ? `・この教材は今月 ＋${esc(String(x.earned))}分 もらいました` : got >= n ? "" : "・とばしてロールプレイを始めることもできます"}</p></div>`;
}
async function tkPracRec(btn){
  const li = btn.closest("li"), box = btn.closest(".tk-prac"), out = li.querySelector(".tk-pout"), pi = +btn.dataset.prac, lesson = box.dataset.lesson, n = +box.dataset.n;
  if (PR){ if (PR.btn === btn) PR.rec.stop(); return; }
  if (DEMO && !apiOn()){ out.innerHTML = `<p class="mapnote">見本では録音できません。</p>`; return; }
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: true, noiseSuppression: true}}); }
  catch (e) { out.innerHTML = `<p class="mapnote warn">マイクが許可されていません。</p>`; return; }
  const mime = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || "";
  const rec = new MediaRecorder(stream, mime ? {mimeType: mime} : {}), parts = [], t0 = Date.now();
  PR = {rec, btn}; btn.textContent = "■ 読み終わった"; btn.classList.add("on"); out.innerHTML = `<p class="mapnote">録音中…</p>`; pbReset(out);
  rec.ondataavailable = e => e.data.size && parts.push(e.data);
  rec.onstop = async () => {
    stream.getTracks().forEach(t => t.stop()); PR = null; btn.classList.remove("on"); btn.textContent = "🎙 録音";
    const blob = new Blob(parts, {type: rec.mimeType || mime || "audio/mp4"}), seconds = (Date.now() - t0) / 1000;
    out.innerHTML = `<p class="mapnote">採点しています…</p>`;
    try {
      const r = await api("/api/read-check", {audio: b64(await blob.arrayBuffer()), mime: blob.type, seconds, script: li.dataset.en || li.querySelector(".tk-pp").textContent, material: box.dataset.review ? "復習" : "フレーズ練習", para: pi + 1, lesson, pi, ...(box.dataset.review ? {review: 1, n} : {})});
      cdStamp();
      if (r.wpm){ pbCheckAndShow(out, "read_wpm", r.wpm); pbCheckAndShow(out, "week_minutes", pbWeekMinutes()); }
      if (box.dataset.review){ tkRevResult(r, li, btn, out, lesson, n, pi); vcOffer(out, {key: `${lesson}:${pi}`, phrase: li.dataset.en || li.querySelector(".tk-pp").textContent, blob, score: r.score}); return; }
      setTimeout(() => vcOffer(out, {key: `${lesson}:${pi}`, phrase: li.querySelector(".tk-pp").textContent, blob, score: r.score}), 0);
      const sc = r.score || {}, x = tkPrac(lesson);
      if (r.pass && !x.ok.includes(pi)) x.ok.push(pi);
      tkPracSave(lesson, x); li.classList.toggle("ok", x.ok.includes(pi)); btn.textContent = x.ok.includes(pi) ? "✓ もう一度" : "🎙 もう一度";
      out.innerHTML = `<p class="tk-pres ${r.pass ? "pass" : ""}">${r.pass ? "◎ 合格！" : "△ もう少し"} <span class="num">正確さ${sc.accuracy || "-"}・発音${sc.pronunciation || "-"}・なめらかさ${sc.fluency || "-"}</span>${r.next ? `<br><small>${esc(r.next)}</small>` : ""}</p>`;
      const got = x.ok.filter(i => i < n).length, prs = $("tkPrs");
      if (prs) prs.innerHTML = `<b class="num">${got}/${n}</b> 合格`;
      if (got >= n && !x.earned){
        const d = await api("/api/practice-done", {lesson, n}).catch(e => ({error: e.message}));
        if (d.done){ x.earned = d.earned_min || 0; x.done = 1; tkPracSave(lesson, x);
          if (prs) prs.innerHTML = `<b class="num">${got}/${n}</b> 合格・${d.earned_min ? `🎉 今週のAI会話が ＋${esc(String(d.earned_min))}分 ふえました` : d.already ? "この教材は今月もう ＋分 をもらっています" : "今月の ＋分 は上限に達しています"}`;
          if (d.plan){ TKPLAN = {...(TKPLAN || {}), ...d.plan}; tkPoolShow(d.plan); }
        }
      }
    } catch (e) { out.innerHTML = `<p class="mapnote warn">採点できませんでした（${esc(e.message)}）</p>`; }
  };
  rec.start();
}
document.addEventListener("click", e => { const b = e.target.closest && e.target.closest("[data-prac]"); if (b) tkPracRec(b); });
function tkStepTick(sec){
  const st = tkStepAt(sec, TK.cap); if (st === TK.step) return;
  const first = TK.step < 0; TK.step = st;
  document.querySelectorAll("#tkSteps li").forEach(li => { const i = +li.dataset.st; li.classList.toggle("done", i < st); if (i === st) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current"); });
  if (!first && st > 0 && TK_STEPS[st][1] && TK.ws && TK.ws.readyState === 1) TK.ws.send(JSON.stringify({realtimeInput: {text: "(" + TK_STEPS[st][1] + ")"}}));   // 相手への合図（声には出さない約束）
  tkFaceStep(st);
}
// 顔はロールプレイ（3段め）のあいだだけ：入るときに目印（同時に1つ）を見てから Simli を始め、ふりかえりに入ったら止める（目印も外す）。使用中なら声だけのまま
async function tkFaceStep(st){
  const A = TK && TK.av; if (!A) return;
  if (st === 0 && A.deferred){
    A.deferred = false;
    const lk = await api("/api/face-lock", {op: "status", sid: A.sid}).catch(() => ({}));
    if (!TK || TK.av !== A || A.dead) return;
    if (lk.busy){ avFail(A, "いま他の人が顔ありで話しています"); return; }
    avNote("相手の顔を出しています…"); avStart(A, A.gender);
  } else if (st === 1 && !A.deferred && !A.dead){
    avFail(A, null); avNote("ふりかえりは声だけで続けます", true);
  }
}
function tkSummaryHtml(r, tg, seconds){
  const good = (r.good || []).slice(0, 3), imp = r.improve || "", used = tg ? tg.filter(x => x.used).length : 0;
  if (!good.length && !imp) return "";
  return `<div class="panel tk-sum"><div class="tk-sum-h"><b>🏋️ トレーニングのまとめ</b><span class="num">${Math.floor(seconds / 60)}分${seconds % 60}秒${tg ? `・フレーズ ${used}/${tg.length}` : ""}</span></div>
    <ul class="tk-good">${good.map(g => `<li><i>◎</i>${esc(g)}</li>`).join("")}</ul>${imp ? `<p class="tk-imp"><i>△</i>${esc(imp)}</p>` : ""}<p class="mapnote">学習の記録に残しました。</p></div>`;
}
// 費用の計測：Gemini の usageMetadata（1回の返事ごと）を足していく（名前は入れない・中継の live_usage に1行）
const tkUsageNew = () => ({turns: 0, prompt: 0, response: 0, prompt_audio: 0, prompt_text: 0, resp_audio: 0, resp_text: 0, thoughts: 0, max_prompt: 0});
function tkUsageAdd(U, m){
  const md = (arr, k) => ((arr || []).find(d => d && d.modality === k) || {}).tokenCount || 0;
  U.turns++; U.prompt += m.promptTokenCount || 0; U.response += m.responseTokenCount || 0; U.thoughts += m.thoughtsTokenCount || 0;
  U.prompt_audio += md(m.promptTokensDetails, "AUDIO"); U.prompt_text += md(m.promptTokensDetails, "TEXT");
  U.resp_audio += md(m.responseTokensDetails, "AUDIO"); U.resp_text += md(m.responseTokensDetails, "TEXT");
  U.max_prompt = Math.max(U.max_prompt, m.promptTokenCount || 0);
}
/* ---------- 試作：端末の中だけで動く顔（Simli を使わない・1分あたりの費用ゼロ）。設定で ON のときだけ（kz-face2d=1 または ?face2d=1。ふだんは OFF）
   同じ笑顔の写真（app/faces）を canvas に描き、相手の声の大きさで口の下を下げて口の中を描く・2.5〜6秒ごとにまばたき ---------- */
const F2_FORCE = (location.search.match(/[?&]face2d=([01])(?:&|$)/) || [])[1] || null;
const f2On = () => F2_FORCE ? F2_FORCE === "1" : store("kz-face2d") === "1";
const F2_PT = {mx: 0.505, my: 0.528, mw: 0.12, ey: 0.385, ex1: 0.43, ex2: 0.57, ew: 0.07};   // 顔の写真はそろえて撮ってあるので、口・目の位置は共通の目安（顔ごとに avatar_faces.json の pt で上書きできる）
let F2 = null;
function f2Mount(host, gender){
  if (!host) return; f2Unmount();
  const pool = AV_FACES.filter(f => f.m && (gender === "男性" ? f.g === "male" : f.g === "female")), f = pool[Math.floor(Math.random() * pool.length)] || AV_FACES[0];
  if (!f) return;
  const c = document.createElement("canvas"); c.className = "f2"; c.width = c.height = 512; host.innerHTML = ""; host.append(c);
  const img = new Image(); img.decoding = "async"; img.onerror = () => { if (img.src.indexOf("/big/") >= 0) img.src = f.t; }; img.src = "./faces/big/" + f.id + ".webp";   // 同じ写真の大きい版（512px）。なければ小さい写真
  F2 = {c, img, pt: {...F2_PT, ...(f.pt || {})}, lv: 0, open: 0, blinkAt: performance.now() + 2500, blink: 0, raf: 0};
  img.onload = () => { if (F2 && F2.img === img) f2Loop(); };
}
function f2Level(rms){ if (F2) F2.lv = Math.min(1, rms * 9); }
function f2Unmount(){ if (F2){ cancelAnimationFrame(F2.raf); F2 = null; } }
function f2Draw(F, now){
  const {c, img, pt} = F, g = c.getContext("2d"), W = c.width, H = c.height;
  F.open += (F.lv - F.open) * (F.lv > F.open ? 0.55 : 0.25);         // 開くのは速く・閉じるのはゆっくり
  g.drawImage(img, 0, 0, W, H);
  const o = F.open;                                                  // 口の開き（0〜1）
  if (o > 0.03){
    const mx = pt.mx * W, my = pt.my * H, mw = pt.mw * W, k = img.naturalHeight / H;
    const y0 = my + H * 0.007, R = mw * 0.62, s0 = H * 0.016 * o;     // 歯の下で分けて、下くちびるだけを少し下げる（あごは動かさない）
    const gr = g.createRadialGradient(mx, y0, 1, mx, y0, mw * 0.45); gr.addColorStop(0, "rgba(45,12,16,0.97)"); gr.addColorStop(1, "rgba(90,30,35,0.9)");
    g.save(); g.beginPath(); g.ellipse(mx, y0 + s0 * 0.35, mw * (0.3 + 0.08 * o), s0 * 0.75 + 0.6, 0, 0, Math.PI * 2); g.fillStyle = gr; g.fill(); g.restore();   // 口の中
    for (let x = Math.floor(mx - R); x < mx + R; x++){                // 下くちびる〜あごの上：まん中ほど大きく下げ、下に行くほど元にもどす（段差が出ない）
      const s = s0 * Math.max(0, 1 - ((x - mx) / R) ** 2); if (s < 0.2) continue;
      const hh = H * 0.05;
      g.drawImage(img, x * k, y0 * k, k, hh * k, x, y0 + s, 1, hh - s);
    }
  }
  if (now > F.blinkAt){ F.blink = now; F.blinkAt = now + 2500 + Math.random() * 3500; }
  const b = (now - F.blink) / 160;                                  // まばたき（0.16秒で閉じて開く）
  if (b >= 0 && b < 2){
    const k = b < 1 ? b : 2 - b, ew = pt.ew * W;
    for (const ex of [pt.ex1, pt.ex2]){
      const x = ex * W, y = pt.ey * H, px = g.getImageData(Math.round(x), Math.round(y - ew * 0.9), 1, 1).data;   // まぶたの色は目の少し上の肌から
      g.save(); g.beginPath(); g.ellipse(x, y - ew * 0.35 + ew * 0.35 * k, ew * 0.62, ew * 0.42 * k + 0.5, 0, 0, Math.PI * 2); g.fillStyle = `rgb(${px[0]},${px[1]},${px[2]})`; g.fill(); g.restore();
    }
  }
}
function f2Loop(){ if (!F2) return; const F = F2; f2Draw(F, performance.now()); F.raf = requestAnimationFrame(f2Loop); }
// あなたが話した割合：文字起こしの語数で数える（あなた÷(あなた＋相手)）。目安は70%。語数が少なすぎるときは出さない
function talkShare(tr){
  const wc = who => (tr || []).filter(x => x.who === who).reduce((s, x) => s + (String(x.text || "").match(/[A-Za-z0-9][A-Za-z0-9'’-]*/g) || []).length, 0);
  const you = wc("you"), pt = wc("partner"); if (you + pt < 10) return null;
  return {pct: Math.round(100 * you / (you + pt)), you, pt};
}
function talkShareHtml(sh){
  if (!sh) return "";
  const msg = sh.pct >= 70 ? "すばらしい！あなたがたくさん話せました" : sh.pct >= 50 ? "いい調子。目標の70%まで、あと少し" : "次は答えに1文つけ足して、話す割合を増やしましょう";
  return `<div class="panel tk-share"><div class="tk-share-h"><span>あなたが話した割合</span><b class="num">${sh.pct}%</b><small>目標 70%</small></div>
    <div class="tk-share-bar" role="img" aria-label="あなた ${sh.pct}%・相手 ${100 - sh.pct}%"><i style="width:${sh.pct}%"></i></div>
    <p class="mapnote">${msg}（話した語数：あなた <span class="num">${sh.you}</span>語・相手 <span class="num">${sh.pt}</span>語）</p></div>`;
}
// 目標フレーズを使えたか：中継の振り返り（r.targets）と、この端末での照らし合わせ（文字起こしの中に、ほぼ同じ語の並びがあるか）の両方を見る
function talkHit(phrase, said){
  const p = tkNorm(phrase).replace(/'/g, ""), ws = p.split(" ").filter(Boolean); if (!ws.length) return "";
  for (const u of said){
    const s = tkNorm(u).replace(/'/g, "");
    if (s.includes(p)) return u;
    const key = ws.filter(w => !TK_STOP.has(w)), have = new Set(s.split(" "));
    if (key.length >= 2 && key.filter(w => have.has(w)).length / key.length >= 0.8) return u;
  }
  return "";
}
function talkTargets(r, L, tr){
  const said = (tr || []).filter(x => x.who === "you").map(x => x.text || ""), got = Array.isArray(r.targets) ? r.targets : [];
  return (L.phrases || []).map((ph, i) => {
    const g = got.find(t => t && tkNorm(t.phrase) === tkNorm(ph)) || (got[i] && !tkNorm(got[i].phrase) ? got[i] : {}), hit = talkHit(ph, said);
    return {phrase: ph, used: g.used === true || !!hit, you_said: tkCut(g.you_said || hit, 200), tip: tkCut(g.tip, 200)};
  });
}
// 次の回に渡すもの：今回の添削の言い直し（fixes の better・rephrase の phrase）を先に、前の回からの表現でまだ言えなかったものを後に（合わせて6つまで）
function talkNextRetry(r, pr, R){
  const seen = new Set(), phrases = [], add = t => { t = tkCut(t, 160); const k = tkNorm(t); if (k && /[a-z]/.test(k) && !seen.has(k)){ seen.add(k); phrases.push(t); } };
  (r.fixes || []).forEach(f => add(f && f.better));
  (r.rephrase || []).forEach(f => add(f && f.phrase));
  (pr || []).filter(x => !x.used).forEach(x => add(x.phrase));
  const mistakes = (r.fixes || []).map(f => tkCut(f && f.you_said, 160)).filter(Boolean).slice(0, 6);
  const hist = [...((R && R.hist) || []), ...(pr ? [{round: R.round, used: pr.filter(x => x.used).length, of: pr.length}] : [])].slice(-8);
  return {phrases: phrases.slice(0, 6), mistakes, hist};
}
function talkRetryHtml(pr, R){
  const n = pr.filter(x => x.used).length, h = [...(R.hist || []), {round: R.round, used: n, of: pr.length}];
  return `<div class="panel tkl-rev tkr"><h4>${R.round}回目：前回の言い直し　<span class="num">${n}</span>／<span class="num">${pr.length}</span>個 言えました</h4>
    ${h.length > 1 ? `<p class="tkr-h">${h.map(x => `<span>${x.round}回目 <b class="num">${x.used}/${x.of}</b></span>`).join("→")}</p>` : ""}
    <ul>${pr.map(x => `<li class="${x.used ? "ok" : ""}"><span class="tkl-mk">${x.used ? "✓" : "・"}</span><div><b>${esc(x.phrase)}</b>${x.used && x.you_said ? `<span>あなた：${esc(x.you_said)}</span>` : ""}${x.tip ? `<span>${esc(x.tip)}</span>` : (!x.used ? "<span>次の回でもう一度ねらいましょう</span>" : "")}</div></li>`).join("")}</ul></div>`;
}
function talkTargetsHtml(tg, L){
  const n = tg.filter(x => x.used).length;
  return `<div class="panel tkl-rev"><h4>教材「${esc(L.title)}」の表現　<span class="num">${n}</span>／<span class="num">${tg.length}</span>個 使えました</h4>
    <ul>${tg.map(x => `<li class="${x.used ? "ok" : ""}"><span class="tkl-mk">${x.used ? "✓" : "・"}</span><div><b>${esc(x.phrase)}</b>${x.used && x.you_said ? `<span>あなた：${esc(x.you_said)}</span>` : ""}${x.tip ? `<span>${esc(x.tip)}</span>` : (!x.used ? "<span>次の会話で使ってみましょう</span>" : "")}</div></li>`).join("")}</ul>
    ${L.id && kzMine().some(m => m.id === L.id) ? `<button type="button" class="btn ghost sm2" id="tkOpenL" data-id="${esc(L.id)}">この教材で練習する</button>` : ""}</div>`;
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
  out.innerHTML = `<p class="mapnote">録音中…英文を声に出して読んでください。</p>`; pbReset(out);
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
      vcOffer(out, {key: `${m.id}:p${i}`, phrase: m.paras[i].en, blob, score: sc});
      const l = (() => { try { return JSON.parse(store("kz-reads") || "[]"); } catch (e) { return []; } })(); l.push({t: Date.now(), wpm: r.wpm, score: sc, id: m.id}); store("kz-reads", JSON.stringify(l.slice(-300)));
      if (r.wpm){ pbCheckAndShow(out, "read_wpm", r.wpm); pbCheckAndShow(out, "week_minutes", pbWeekMinutes()); }
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
// Simli の SDK は、つながらないとき文字列 "CONNECTION TIMED OUT" を投げっぱなしにする → 顔をあきらめて声だけで続ける（会話は止めない）
window.addEventListener("unhandledrejection", e => { if (e.reason === "CONNECTION TIMED OUT"){ e.preventDefault(); const A = TK && TK.av; if (A && !A.dead) avFail(A, "相手の顔がつながりませんでした。声だけで続けます"); } });

// マイルストーン3：顔（Simli）が使用中のときは、始める前に「いまは声だけがおすすめ」（顔は同時に1人だけ）。押せば声だけにする
async function tkBusyNudge(){
  if (!avOn() || !$("tkGo") || $("tkBusy")) return;
  const st = await api("/api/face-lock", {op: "status"}).catch(() => ({}));
  if (!st.busy || !$("tkGo") || $("tkBusy") || !avOn()) return;
  const p = document.createElement("div"); p.id = "tkBusy"; p.className = "tk-busy"; p.setAttribute("role", "status");
  p.innerHTML = `<p>いま他の人が顔ありで話しています。<b>声だけがおすすめ</b>です（声だけならすぐ始められて、待ち時間なし）。顔は空いている時間（朝・昼）がねらい目です。</p><button type="button" class="btn ghost sm" id="tkBusyVoice">声だけにする</button>`;
  $("tkGo").before(p);
  $("tkBusyVoice").addEventListener("click", () => { store("kz-avatar", "0"); const a = $("tkAvatar"); if (a) a.checked = false; avFaceRender(); p.remove(); });
}

/* ---------- 教材の習熟：①録音で全部合格 ②ロールプレイ ③10〜14日後に復習（ヒントなし・少し速く）④本番で使えた！→ 👑（docs/gamify-1020.md） ---------- */
const MAST_ST = [["🎙", "録音"], ["🎭", "ロールプレイ"], ["🔁", "復習"], ["🍻", "本番"]];
function mastLoad(force){
  if (!apiOn() || DEMO) return Promise.resolve(MAST);
  if (MAST && !force) return Promise.resolve(MAST);
  return api("/api/mastery", null).then(d => { MAST = d.lessons || {}; return MAST; }).catch(() => MAST);
}
function mastHtml(m){
  const x = MAST && MAST[m.id]; if (!x && !MAST) return "";
  const s = x ? x.s : [0, 0, 0, 0], n = s.filter(Boolean).length;
  return `<div class="mast${x && x.legend ? " legend" : ""}" aria-label="習熟 ${n}/4">${MAST_ST.map(([ic, l], i) => `<span class="ms${s[i] ? " on" : ""}" title="${l}"><i>${s[i] ? ic : i + 1}</i>${l}</span>`).join("")}${x && x.legend ? `<b class="crown">👑 Legend</b>` : ""}</div>
    ${x && x.review_open ? `<button type="button" class="btn ghost sm2 mast-rv" data-kzrev="${esc(m.id)}">🔁 ${x.review_late ? "復習の時期です" : "そろそろ復習"}（ヒントなし・少し速く）</button>` : ""}
    ${x && x.s[2] && !x.s[3] ? `<button type="button" class="btn ghost sm2 mast-used" data-kzused="${esc(m.id)}">🍻 本番で使えた！</button>` : ""}`;
}
function mastDueHtml(list){
  const due = (MAST ? list.filter(m => MAST[m.id] && MAST[m.id].review_open) : []);
  if (!due.length) return "";
  return `<div class="panel mast-due" role="status"><b>🔁 そろそろ復習</b><span>${due.length}本の教材が、復習の時期（10〜14日）です。ヒントなしで少し速く言えたら3つめをクリア。</span>
    <div class="acts">${due.slice(0, 3).map(m => `<button type="button" class="btn sm2" data-kzrev="${esc(m.id)}">${esc(m.title)}</button>`).join("")}</div></div>`;
}
function mastBind(box){
  box.querySelectorAll("[data-kzrev]").forEach(b => b.addEventListener("click", () => talkWith(b.dataset.kzrev, "training")));
  box.querySelectorAll("[data-kzused]").forEach(b => b.addEventListener("click", () => mastUsed(b.dataset.kzused, b)));
}
function phraseJa(m, en){
  const k = tkNorm(en), hit = [...(m.phrases || []).map(p => [p.en, p.ja]), ...(m.wishes || []).map(w => [w.better, w.ja || w.want]), ...(m.grammar || []).map(g => [g.sentence, g.ja])].find(([e]) => tkNorm(e || "") === k);
  return hit && hit[1] ? String(hit[1]) : "";
}
function tkRevHtml(m, ph, ms){
  const n = Math.min(ph.length, 6), ok = ms.rv || [];
  return `<div class="tkl-ph tk-prac tk-rev" data-lesson="${esc(m.id)}" data-n="${n}" data-review="1"><span class="rq-h">🔁 復習（3つめ）：ヒントなし・最初より少し速く</span>
    <p class="mapnote">英文は出しません。日本語（なければ頭文字）を見て、英語で言ってみましょう。最初に合格したときより少し速く（約${Math.round(((TKPLAN && TKPLAN.speed_ratio) || 1.05) * 100 - 100)}%）言えたら合格です。</p>
    <ul class="tk-prl">${ph.slice(0, n).map((p, i) => `<li data-pi="${i}" data-en="${esc(p)}" class="${ok.includes(i) ? "ok" : ""}"><span class="tk-pp">${phraseJa(m, p) ? `${esc(phraseJa(m, p))}<small class="tk-hid">（英文はかくしています）</small>` : `<span class="num">${esc(p.replace(/[A-Za-z]+/g, w => w[0] + "_".repeat(w.length - 1)))}</span><small class="tk-hid">（頭文字だけ。英文はかくしています）</small>`}</span><button type="button" class="btn ghost sm" data-prac="${i}">${ok.includes(i) ? "✓ もう一度" : "🎙 言ってみる"}</button><div class="tk-pout"></div></li>`).join("")}</ul>
    <p class="tk-prs" id="tkPrs"><b class="num">${ok.filter(i => i < n).length}/${n}</b> 合格</p></div>`;
}
function tkRevResult(r, li, btn, out, lesson, n, pi){
  const sc = r.score || {};
  li.classList.toggle("ok", !!r.pass || li.classList.contains("ok")); btn.textContent = r.pass ? "✓ もう一度" : "🎙 もう一度";
  out.innerHTML = `<p class="tk-pres ${r.pass ? "pass" : ""}">${r.pass ? "◎ 合格！" : r.review_closed ? "まだ復習の時期ではありません" : "△ もう少し"} <span class="num">正確さ${sc.accuracy || "-"}・速さ ${r.wpm || "-"}語/分${r.need_wpm ? `（目標 ${r.need_wpm}）` : ""}</span><br><small>英文：${esc(li.dataset.en)}</small></p>`;
  if (MAST && MAST[lesson] && r.pass){ const rv = MAST[lesson].rv || (MAST[lesson].rv = []); if (!rv.includes(pi)) rv.push(pi); }
  const got = document.querySelectorAll(".tk-rev li.ok").length, prs = $("tkPrs"); if (prs) prs.innerHTML = `<b class="num">${got}/${n}</b> 合格`;
  if (r.stage_done === 3){ if (MAST && MAST[lesson]){ MAST[lesson].s[2] = 1; MAST[lesson].review_open = false; } if (prs) prs.innerHTML = `<b class="num">${n}/${n}</b> 🎉 3つめ（復習）クリア！本番で使えたら 🍻 を押すと 👑`; }
}
async function mastUsed(id, btn){
  const ph = (ME && ME.photos || []).slice(-30).reverse();
  const d = document.createElement("dialog"); d.className = "mast-dlg";
  d.innerHTML = `<form method="dialog"><h3>🍻 本番で使えた！</h3><p>この教材の英語を、本当の場面で使えましたか？押すと 👑 Legend になります。</p>
    ${ph.length ? `<label>乾杯の写真とつなげる（なくてもOK）<select id="mastPh"><option value="">つなげない</option>${ph.map(p => `<option value="${esc(String(p.id))}">${esc(p.d || "")} ${(p.cc || []).map(c => flagOf(c.iso)).join("")}</option>`).join("")}</select></label>` : ""}
    <div class="acts"><button class="btn" value="ok">使えた！👑</button><button class="btn ghost" value="cancel">やめる</button></div></form>`;
  document.body.append(d); d.showModal();
  d.addEventListener("close", async () => {
    const v = d.returnValue, photo = (d.querySelector("#mastPh") || {}).value || ""; d.remove(); if (v !== "ok") return;
    try { if (apiOn() && !DEMO) await api("/api/mastery/used", {lesson: id, photo}); if (MAST && MAST[id]){ MAST[id].s[3] = 1; MAST[id].legend = true; MAST[id].photo = photo || null; }
      if (typeof toast === "function") toast("👑 Legend！おめでとう"); renderKz(); } catch (e) { alert("記録できませんでした（" + e.message + "）"); }
  });
}

/* ---------- チアーズデー（月1回・3時間。tools/cheers_day.json がビルドで入る・docs/gamify-1020.md） ---------- */
const CDAY_CFG = {"rule":"月1回 土曜 20:00-23:00（日本時間）","points_multiplier":2,"events":[{"id":"2026-11","date":"2026-11-07","start":"20:00","end":"23:00","theme":"リスボンのテラスカフェ","place":"cafe","scene":"リスボンのテラスカフェ","body":"リスボンのテラスカフェで、店員さんに注文したり、となりの席の旅行者と乾杯して、どこから来たか・おすすめの場所を話したい","stamp":{"id":"cd-2026-11","icon":"🇵🇹","name":"チアーズデー 11月・リスボン"}},{"id":"2026-12","date":"2026-12-26","start":"20:00","end":"23:00","theme":"ロンドンのクリスマスパブ","place":"pub","scene":"ロンドンのクリスマスパブ","body":"ロンドンのパブで、飲み物を注文して、地元の人と乾杯して年末の過ごし方を話したい","stamp":{"id":"cd-2026-12","icon":"🇬🇧","name":"チアーズデー 12月・ロンドン"}}]};
let CD = {stamps: [], loaded: false}, CD_NOW = 0;                       // CD_NOW はテストだけ（時刻を動かす）
const cdT = () => CD_NOW || Date.now();
const cdWinC = ev => ({s: Date.parse(`${ev.date}T${ev.start}:00+09:00`), e: Date.parse(`${ev.date}T${ev.end}:00+09:00`)});
function cdNow(){
  const now = cdT(), evs = ((CDAY_CFG && CDAY_CFG.events) || []).filter(ev => cdWinC(ev).e > now).sort((a, b) => cdWinC(a).s - cdWinC(b).s);
  const ev = evs[0]; if (!ev) return null; const w = cdWinC(ev); return {ev, live: now >= w.s && now < w.e, s: w.s, e: w.e};
}
function cdLoad(){
  if (CD.loaded || !apiOn() || DEMO) return; CD.loaded = true;
  api("/api/cheers-day", null).then(d => { CD = {...CD, ...d, loaded: true}; if (typeof paintHome === "function" && $("me") && !$("me").hidden) paintHome(); }).catch(() => {});
}
const cdMD = ms => { const j = new Date(ms + 9 * 3600e3); return `${j.getUTCMonth() + 1}/${j.getUTCDate()}（${"日月火水木金土"[j.getUTCDay()]}）`; };
const cdHM = ms => new Date(ms + 9 * 3600e3).toISOString().slice(11, 16);
function cdHomeHtml(){
  cdLoad();
  const c = cdNow(); if (!c) return "";
  const ev = c.ev, got = (CD.stamps || []).includes(ev.id), mult = (CDAY_CFG && CDAY_CFG.points_multiplier) || 2, days = Math.round((Date.parse(ev.date) - Date.parse(new Date(cdT() + 9 * 3600e3).toISOString().slice(0, 10))) / 864e5);
  if (!c.live && days > 14) return "";
  return `<section class="panel cd-card${c.live ? " live" : ""}" id="cdCard"><div class="cd-h"><span class="cd-k">${c.live ? "🍻 開催中" : days ? `あと${days}日` : "今日"}</span><b>チアーズデー</b><span class="num">${cdMD(c.s)} ${cdHM(c.s)}〜${cdHM(c.e)}</span></div>
    <p class="cd-theme">今月のテーマ：<b>${esc(ev.theme)}</b></p>
    <ul class="cd-perks"><li>✨ テーマの教材をワンタップ</li><li>⚡ ポイント${mult}倍</li><li>🗺 ひろばにロールプレイ卓</li><li>${esc((ev.stamp || {}).icon || "🎟")} 限定スタンプ${got ? "（GET！）" : ""}</li></ul>
    ${c.live ? `<div class="acts"><button type="button" class="btn" data-cdmake>✨ テーマの教材を作ってロールプレイ</button><button type="button" class="btn ghost" data-cdhr>🗺 ひろばのロールプレイ卓へ</button></div><p class="mapnote">教材づくり・AI会話は、ふだんと同じ回数・持ち時間から使います。</p>`
      : `<p class="mapnote">日本時間。${cdHM(c.s)}になったら、ここから始められます。</p>`}</section>`;
}
async function cdMake(btn){
  const c = cdNow(); if (!c || !c.live) return;
  if (DEMO || !apiOn()){ toast("デモでは教材を作れません（本人用のリンクで使えます）"); return; }
  btn.disabled = true; btn.textContent = "教材を作っています…（20〜40秒）";
  try {
    const level = (KZREQ() || {}).level || "英検準2級";
    const r = await api("/api/kz-lesson", {kind: "スピーキング", level, scene: String(c.ev.scene || c.ev.theme).slice(0, 100), body: c.ev.body || c.ev.theme, profile: itvProfilePack()});
    if (r.empty) throw new Error("この内容では作れませんでした");
    const {left, ...lesson} = r;
    const m = {...lesson, id: "k" + Date.now().toString(36), source: "オーダーメイド", kind: "speaking", level, made: dayKey(Date.now()), mine: true, badge: "🍻 チアーズデー"};
    store("kz-mine", JSON.stringify([m, ...kzMine()].slice(0, kzMineCap()))); kzEnsurePics(m);
    cdStamp(); showTab("kz"); talkWith(m.id, "training"); toast("テーマの教材ができました。ロールプレイを始めましょう");
  } catch (e) { btn.disabled = false; btn.textContent = "✨ テーマの教材を作ってロールプレイ"; toast("教材を作れませんでした（" + e.message + "）"); }
}
function cdStamp(){
  const c = cdNow(); if (!c || !c.live || (CD.stamps || []).includes(c.ev.id)) return;
  if (DEMO || !apiOn()){ CD.stamps = [...(CD.stamps || []), c.ev.id]; return; }
  api("/api/cheers-day/stamp", {}).then(d => { if (d.ok){ CD.stamps = [...(CD.stamps || []), c.ev.id]; toast(`${(c.ev.stamp || {}).icon || "🎟"} チアーズデーの限定スタンプをGET！`); } }).catch(() => {});
}
function cdStampsHtml(){
  const evs = ((CDAY_CFG && CDAY_CFG.events) || []).filter(ev => ev.stamp); if (!evs.length) return "";
  const got = CD.stamps || [];
  return `<section class="panel cd-stamps"><h3>🍻 チアーズデーの限定スタンプ</h3><div class="cd-sgrid">${evs.map(ev => { const g = got.includes(ev.id); return `<div class="cd-s${g ? " got" : ""}"><i>${g ? esc(ev.stamp.icon) : "？"}</i><small>${esc(ev.stamp.name)}</small><span class="num">${esc(ev.date.slice(5).replace("-", "/"))}</span></div>`; }).join("")}</div>
    <p class="mapnote">チアーズデーの時間（${esc(CDAY_CFG.rule || "月1回")}・日本時間）に練習するともらえます。</p></section>`;
}
function cdHrPreset(P){
  const c = cdNow(); if (!c || !c.live || !P || HR.cdP === c.ev.id) return;
  HR.cdP = c.ev.id; P.act = "rp"; P.size = "group"; P.now = true;        // 開催中は「英語ロールプレイ・3〜4人・今すぐ」を最初から選んだ状態で
}
function cdHrBanner(){
  const c = cdNow(); if (!c || !c.live) return "";
  return `<section class="hr-card cd-hr"><b>🍻 チアーズデー開催中（〜${cdHM(c.e)}）</b><p>テーマ「${esc(c.ev.theme)}」のロールプレイ卓が開いています。「英語ロールプレイ・3〜4人・今すぐ」を選んでおきました。</p></section>`;
}
document.addEventListener("click", e => {
  const t = e.target.closest && e.target.closest("[data-cdmake],[data-cdhr]"); if (!t) return;
  if (t.hasAttribute("data-cdmake")) cdMake(t); else { cdStamp(); showTab("hr", "find"); }
});

/* ---------- 声のビフォー・アフター：録音は「残す」を押したときだけ、この端末（IndexedDB）に。中継・どこにも送らない ---------- */
let VCDB = null;
function vcDB(){
  if (VCDB) return VCDB;
  VCDB = new Promise((res, rej) => { if (!window.indexedDB) return rej(new Error("この端末では保存できません"));
    const q = indexedDB.open("cg-voice", 1); q.onupgradeneeded = () => { const st = q.result.createObjectStore("rec", {keyPath: "id", autoIncrement: true}); st.createIndex("key", "key"); };
    q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
  return VCDB;
}
const vcTx = async (mode, f) => { const db = await vcDB(); return new Promise((res, rej) => { const tx = db.transaction("rec", mode), st = tx.objectStore("rec"), r = f(st); tx.oncomplete = () => res(r && r.result); tx.onerror = () => rej(tx.error); }); };
const vcSave = x => vcTx("readwrite", st => st.add({key: String(x.key).slice(0, 80), phrase: String(x.phrase || "").slice(0, 300), t: x.t || Date.now(), blob: x.blob, score: x.score || null}));
const vcAll = () => vcTx("readonly", st => st.getAll()).then(r => r || []).catch(() => []);
const vcDelKey = key => vcAll().then(all => vcTx("readwrite", st => { all.filter(x => x.key === key).forEach(x => st.delete(x.id)); }));
function vcOffer(out, x){
  if (!out || !x.blob || !window.indexedDB) return;
  const b = document.createElement("button"); b.type = "button"; b.className = "btn ghost sm vc-keep"; b.textContent = "💾 残す（この端末だけ）";
  b.title = "月末のふりかえりで、前の声と聞きくらべられます。録音はどこにも送りません";
  b.addEventListener("click", async () => { b.disabled = true; try { await vcSave(x); b.textContent = "✓ この端末に残しました"; } catch (e) { b.disabled = false; toast("残せませんでした（" + e.message + "）"); } });
  out.append(b);
}

/* ---------- 月末のふりかえり（練習した分・習熟した教材・乾杯の国・録音チェックの点の流れ・声のビフォー・アフター） ---------- */
let MRD = null, MR_M = "";
const mrMonth = () => { const j = new Date(Date.now() + 9 * 3600e3); if (j.getUTCDate() <= 7) j.setUTCDate(0); return j.toISOString().slice(0, 7); };
function mrHomeHtml(){
  const d = new Date(Date.now() + 9 * 3600e3).getUTCDate(); if (d > 7 && d < 25) return "";
  const m = mrMonth();
  return `<button type="button" class="panel mr-home" data-mr="${m}"><b>🗓 ${+m.slice(5)}月のふりかえり</b><span>練習した分・習熟した教材・乾杯の国・点の流れ、声のビフォー・アフター</span><i>›</i></button>`;
}
document.addEventListener("click", e => { const b = e.target.closest && e.target.closest("[data-mr]"); if (!b) return; MR_M = b.dataset.mr; showTab("kz"); KZ = "month"; renderKz(); window.scrollTo(0, 0); });
async function renderMonth(){
  const box = $("kzwrap"), m = MR_M || mrMonth(), mm = +m.slice(5);
  box.innerHTML = `<button class="more kzback" type="button" id="kzBack">← 練習へ</button><div class="sec-h"><h2>${SPARK}${mm}月のふりかえり</h2><p>この1か月の英語を、数字と声でふりかえります。</p></div><div id="mrBody"><p class="loading">集めています…</p></div>`;
  $("kzBack").addEventListener("click", () => { KZ = null; renderKz(); });
  let d = MRD;
  if (!d && apiOn() && !DEMO){ try { d = await api("/api/month-review?m=" + m, null); } catch (e) { d = null; } await mastLoad(); }
  if (!d){                                                               // 中継がない（デモ）：この端末の記録から
    const reads = (() => { try { return JSON.parse(store("kz-reads") || "[]"); } catch (e) { return []; } })().filter(x => dayKey(x.t).startsWith(m));
    const by = {}; reads.forEach(x => { const k = dayKey(x.t), s = x.score || {}; const z = by[k] || (by[k] = [0, 0, 0, 0]); z[0] += +s.accuracy || 0; z[1] += +s.pronunciation || 0; z[2] += +s.fluency || 0; z[3]++; });
    const days = [...Array(31)].map((_, i) => `${m}-${String(i + 1).padStart(2, "0")}`), mins = days.map(k => typeof studyMinutes === "function" ? studyMinutes(k) : 0);
    d = {month: m, minutes: mins.reduce((a, b) => a + b, 0), days: mins.filter(Boolean).length, scores: Object.keys(by).sort().map(k => ({d: k, accuracy: by[k][0] / by[k][3], pronunciation: by[k][1] / by[k][3], fluency: by[k][2] / by[k][3], n: by[k][3]})), mastery: null};
  }
  const ms = d.mastery || (MAST ? {stage1: Object.values(MAST).filter(x => x.s[0]).length, stage3: Object.values(MAST).filter(x => x.s[2]).length, legend: Object.values(MAST).filter(x => x.s[3]).length} : {stage1: 0, stage3: 0, legend: 0});
  const cc = new Set(); ((ME && ME.photos) || []).filter(p => String(p.d || "").startsWith(m)).forEach(p => (p.cc || []).forEach(c => cc.add(c.iso)));
  const recs = await vcAll(), groups = {}; recs.forEach(x => (groups[x.key] = groups[x.key] || []).push(x));
  const pairs = Object.values(groups).map(g => g.sort((a, b) => a.t - b.t)).filter(g => g.length >= 2).map(g => [g[0], g[g.length - 1]]).sort((a, b) => b[1].t - a[1].t).slice(0, 6);
  MRD_LAST = {d, ms, cc: [...cc], m};
  $("mrBody").innerHTML = `<div class="mr-stats">
      <div><b class="num">${d.minutes}</b><small>分 練習した</small><span>${d.days}日</span></div>
      <div><b class="num">${ms.stage3 || 0}</b><small>本 習熟（復習まで）</small><span>👑 ${ms.legend || 0}・🎙 ${ms.stage1 || 0}</span></div>
      <div><b class="num">${cc.size}</b><small>か国と乾杯</small><span>${[...cc].slice(0, 8).map(flagOf).join("")}</span></div></div>
    <section class="panel mr-graph"><h3>録音チェックの点の流れ</h3>${mrGraph(d.scores || [], m)}</section>
    <section class="panel mr-ba"><h3>🎧 声のビフォー・アフター</h3>
      ${pairs.length ? `<ul class="mr-pairs">${pairs.map(([a, b]) => `<li><p class="mr-ph">${esc(a.phrase)}</p><div class="mr-two"><div><small>ビフォー ${esc(md(dayKey(a.t)))}</small><audio controls preload="none" data-vcid="${a.id}"></audio>${mrSc(a.score)}</div><div><small>アフター ${esc(md(dayKey(b.t)))}</small><audio controls preload="none" data-vcid="${b.id}"></audio>${mrSc(b.score)}</div></div><button type="button" class="hr-link" data-vcdel="${esc(a.key)}">このフレーズの録音を消す</button></li>`).join("")}</ul>`
        : `<p class="mapnote">同じフレーズを2回以上「💾 残す」と、ここで聞きくらべられます（録音チェックのあとに出るボタン）。</p>`}
      <p class="mapnote">録音は「残す」を押したときだけ、この端末の中に入ります。中継・運営・どこにも送りません。</p></section>
    <section class="panel mr-share"><h3>シェアする</h3><div class="sns-cvbox"><canvas id="mrCv" class="sns-cv" width="1080" height="1350" aria-label="ふりかえりのシェアカード"></canvas></div>
      <p class="sns-hint">本名・顔・お店・アプリのリンクや鍵、声は入れません。画像はこの端末で作ります。</p>
      <div class="sns-share"><button type="button" data-mrgo="sheet"><b>📤</b>Instagram など<small>共有シート</small></button><button type="button" data-mrgo="x"><b>𝕏</b>X<small>投稿画面へ</small></button><button type="button" data-mrgo="save"><b>⬇</b>保存<small>画像</small></button></div></section>`;
  const byId = Object.fromEntries(recs.map(x => [x.id, x]));
  $("mrBody").querySelectorAll("audio[data-vcid]").forEach(a => { const x = byId[+a.dataset.vcid]; if (x && x.blob) a.src = URL.createObjectURL(x.blob); });
  $("mrBody").querySelectorAll("[data-vcdel]").forEach(b => b.addEventListener("click", async () => { if (!confirm("このフレーズの録音を、この端末から消しますか？")) return; await vcDelKey(b.dataset.vcdel); renderMonth(); }));
  $("mrBody").querySelectorAll("[data-mrgo]").forEach(b => b.addEventListener("click", () => mrShareGo(b.dataset.mrgo)));
  await mrDraw();
}
let MRD_LAST = null;
const mrSc = s => s ? `<span class="num mr-sc">${["accuracy", "pronunciation", "fluency"].map(k => s[k] || "-").join("・")}</span>` : "";
function mrGraph(sc, m){
  if (!sc.length) return `<p class="mapnote">この月は、まだ録音チェックがありません。</p>`;
  const W = 320, H = 150, P = 26, last = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5), 0)).getUTCDate();
  const X = d => P + (W - P * 2) * (+d.slice(8) - 1) / Math.max(1, last - 1), Y = v => H - P - (H - P * 2) * (v - 1) / 4;
  const line = (k, c) => `<polyline fill="none" stroke="${c}" stroke-width="2.5" stroke-linejoin="round" points="${sc.map(x => `${X(x.d).toFixed(1)},${Y(x[k]).toFixed(1)}`).join(" ")}"/>${sc.map(x => `<circle cx="${X(x.d).toFixed(1)}" cy="${Y(x[k]).toFixed(1)}" r="3" fill="${c}"/>`).join("")}`;
  const avg = k => (sc.reduce((a, x) => a + x[k], 0) / sc.length).toFixed(1), first = sc[0], lastS = sc[sc.length - 1], tot = x => (x.accuracy + x.pronunciation + x.fluency) / 3;
  return `<svg class="mr-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="録音チェックの点（1〜5）の流れ">${[1, 2, 3, 4, 5].map(v => `<line x1="${P}" x2="${W - P}" y1="${Y(v)}" y2="${Y(v)}" stroke="#e6e8ee"/><text x="6" y="${Y(v) + 4}" font-size="10" fill="#999">${v}</text>`).join("")}
    ${line("accuracy", "#2f80ed")}${line("pronunciation", "#f2994a")}${line("fluency", "#27ae60")}<text x="${P}" y="${H - 6}" font-size="10" fill="#999">${+m.slice(5)}/1</text><text x="${W - P}" y="${H - 6}" font-size="10" fill="#999" text-anchor="end">${+m.slice(5)}/${last}</text></svg>
    <p class="mr-leg"><i style="background:#2f80ed"></i>正確さ ${avg("accuracy")}　<i style="background:#f2994a"></i>発音 ${avg("pronunciation")}　<i style="background:#27ae60"></i>なめらかさ ${avg("fluency")}</p>
    ${sc.length >= 2 ? `<p class="mapnote">月のはじめ ${tot(first).toFixed(1)} → 月の終わり ${tot(lastS).toFixed(1)}（3つの平均・5点満点）</p>` : ""}`;
}
async function mrDraw(){
  const cv = $("mrCv"); if (!cv || !MRD_LAST) return; const g = cv.getContext("2d"), W = cv.width, H = cv.height, P = 80, {d, ms, cc, m} = MRD_LAST;
  const F = (w, s) => `${w} ${s}px "Zen Kaku Gothic New", "Hiragino Sans", sans-serif`, text = (t, x, y, f, c, al) => { g.font = f; g.fillStyle = c; g.textAlign = al || "left"; g.fillText(t, x, y); return g.measureText(t).width; };
  const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, "#1A2F66"); gr.addColorStop(1, "#2D6BE0"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const nick = typeof snsNick === "function" ? snsNick() : "";
  text(`${nick ? nick + " の" : ""}${+m.slice(5)}月の英語`, P, 190, F(700, 52), "#fff");
  const box = (x, y, w, h, big, unit, sub) => { g.fillStyle = "#fff"; g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, 36) : g.rect(x, y, w, h); g.fill(); text(big, x + w / 2, y + 140, F(900, 110), "#1A2F66", "center"); text(unit, x + w / 2, y + 205, F(700, 38), "#1A2F66", "center"); if (sub) text(sub, x + w / 2, y + 255, F(600, 30), "#5b6b94", "center"); };
  const bw = (W - P * 2 - 40) / 2;
  box(P, 260, bw, 290, String(d.minutes), "分 練習", `${d.days}日`); box(P + bw + 40, 260, bw, 290, String(ms.stage3 || 0), "本 習熟", `👑 ${ms.legend || 0}`);
  box(P, 590, W - P * 2, 220, String(cc.length), "か国と乾杯", cc.slice(0, 10).map(flagOf).join(" "));
  const sc = d.scores || [];
  if (sc.length){ const gx = P, gy = 880, gw = W - P * 2, gh = 250, last = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5), 0)).getUTCDate();
    g.strokeStyle = "rgba(255,255,255,.25)"; g.lineWidth = 2; for (let v = 1; v <= 5; v++){ const y = gy + gh - gh * (v - 1) / 4; g.beginPath(); g.moveTo(gx, y); g.lineTo(gx + gw, y); g.stroke(); }
    [["accuracy", "#9cc3ff"], ["pronunciation", "#FFD23F"], ["fluency", "#8ff0b5"]].forEach(([k, c]) => { g.strokeStyle = c; g.lineWidth = 7; g.beginPath(); sc.forEach((x, i) => { const px = gx + gw * (+x.d.slice(8) - 1) / Math.max(1, last - 1), py = gy + gh - gh * (x[k] - 1) / 4; i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.stroke(); });
    text("録音チェックの点の流れ（正確さ・発音・なめらかさ）", P, gy + gh + 56, F(600, 30), "rgba(255,255,255,.85)"); }
  text("#チアーズGO #英語学習", P, H - 70, F(700, 40), "#fff");
  const logo = typeof snsLogo === "function" ? await snsLogo().catch(() => null) : null;
  if (logo){ const lh = 64, lw = logo.width * lh / logo.height; g.drawImage(logo, W - P - lw, H - 70 - lh + 12, lw, lh); } else text("Cheers mate", W - P, H - 70, F(700, 40), "#fff", "right");
}
async function mrShareGo(kind){
  const cv = $("mrCv"); if (!cv || !MRD_LAST) return; const {d, ms, cc, m} = MRD_LAST;
  const t = `${+m.slice(5)}月の英語 ${d.minutes}分・習熟${ms.stage3 || 0}本・${cc.length}か国と乾杯 #チアーズGO #英語学習`;
  if (kind === "x"){ window.open("https://x.com/intent/post?text=" + encodeURIComponent(t), "_blank", "noopener"); return; }
  const blob = await new Promise(res => cv.toBlob(b => res(b), "image/png")), file = new File([blob], `cheersgo-${m}.png`, {type: "image/png"});
  if (kind === "sheet" && navigator.canShare && navigator.canShare({files: [file]})){ try { await navigator.share({files: [file], text: t}); } catch (e) { if (e && e.name !== "AbortError") toast("共有できませんでした"); } return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/* ================= 自己ベスト（PR）：この端末だけで記録する（localStorage の cg-pb。中継には送らない） =================
   2秒応答の速さ・AI会話の長さ・英語日記の語数・週の練習時間・音読チェックの速さ・1分感情スピーチの回数。
   練習が終わった画面で pbCheckAndShow(要素, kind, 値) を呼ぶ→ 自己ベストを更新できていれば、その要素の下に🏅バナーと紙ふぶき。
   一覧は マイ＞自己ベスト一覧（app/_part_my.js の MY_VIEWS.pb → pbListHtml） */
const PB_DEFS = [
  {kind: "react_fast", ic: "⚡", label: "2秒応答の速さ", better: "low", fmt: v => (v / 1000).toFixed(1) + "秒"},
  {kind: "talk_long", ic: "🗣️", label: "AI会話の長さ", better: "high", fmt: v => Math.floor(v / 60) + ":" + String(Math.round(v) % 60).padStart(2, "0")},
  {kind: "diary_words", ic: "📝", label: "英語日記の語数", better: "high", fmt: v => Math.round(v) + "語"},
  {kind: "week_minutes", ic: "📅", label: "週の練習時間", better: "high", fmt: v => Math.round(v) + "分/週"},
  {kind: "read_wpm", ic: "📖", label: "音読チェックの速さ", better: "high", fmt: v => Math.round(v) + "語/分"},
  {kind: "drill_reps", ic: "😊", label: "1分感情スピーチの回数", better: "high", fmt: v => Math.round(v) + "回"},
];
const pbAll = () => { try { const v = JSON.parse(store("cg-pb") || "{}"); return v && typeof v === "object" ? v : {}; } catch (e) { return {}; } };
// kind の自己ベストを確かめて、更新できていれば保存する（はじめての値はただ記録するだけ・お祝いはしない）。保存できたら、ほかの端末へ同期（_part_sync.js の syncDirty。中継がないときは何もしない）
function pbCheck(kind, value, ctx){
  if (value == null || !isFinite(value) || value <= 0) return {improved: false, prev: null, value};
  const def = PB_DEFS.find(d => d.kind === kind);
  if (!def) return {improved: false, prev: null, value};
  const all = pbAll(), cur = all[kind];
  const better = !cur || (def.better === "low" ? value < cur.v : value > cur.v);
  if (better){ all[kind] = {v: value, t: Date.now(), prev: cur ? cur.v : null}; store("cg-pb", JSON.stringify(all)); syncDirty(); }
  return {improved: !!cur && better, prev: cur ? cur.v : null, value};
}
// 自己ベストの端末間同期（relay/worker.js の mergeSync("pb") と同じ「良い方を残す」。ここは合成するだけでお祝いはしない＝pbCelebrate は呼ばない
const pbBetter = (better, x, y) => !x ? false : !y ? true : x.v !== y.v ? (better === "low" ? x.v < y.v : x.v > y.v) : x.t < y.t;
function pbMerge(server){
  if (!server || typeof server !== "object") return false;
  const local = pbAll(); let changed = false;
  for (const def of PB_DEFS){
    const s = server[def.kind];
    if (!s || typeof s !== "object" || !isFinite(+s.v) || +s.v <= 0 || !isFinite(+s.t) || +s.t <= 0) continue;
    const rec = {v: +s.v, t: +s.t, prev: s.prev == null ? null : (isFinite(+s.prev) && +s.prev > 0 ? +s.prev : null)};
    if (pbBetter(def.better, rec, local[def.kind])){ local[def.kind] = rec; changed = true; }
  }
  if (changed) store("cg-pb", JSON.stringify(local));
  return changed;
}
// 今週（月曜はじまり）の練習の合計分。studyMinutes（app/_part_sns.js）・weekStart（app/_part_go.js）と同じ数え方
function pbWeekMinutes(){
  const ws = weekStart(dayKey(Date.now())); let sum = 0;
  for (let i = 0; i < 7; i++){ const d = new Date(ws + "T12:00:00"); d.setDate(d.getDate() + i); sum += studyMinutes(dayKey(d.getTime())); }
  return Math.round(sum);
}
// 結果の画面の要素（afterEl）のすぐ下に🏅バナー。同じ画面で2つ目以降（例：2秒応答→週の時間）は同じ箱に積む
function pbCelebrate(afterEl, res, def){
  if (!afterEl || !res || !res.improved || !def) return;
  let mount = afterEl.nextElementSibling;
  if (!mount || !mount.classList || !mount.classList.contains("pb-mount")){
    mount = document.createElement("div"); mount.className = "pb-mount"; afterEl.insertAdjacentElement("afterend", mount);
  }
  mount.insertAdjacentHTML("beforeend", `<div class="pb-banner" role="status"><span class="pb-ic" aria-hidden="true">🏅</span><div><b>自己ベスト更新！</b><span>${esc(def.label)} ${esc(def.fmt(res.prev))} → ${esc(def.fmt(res.value))}</span></div></div>`);
  pbConfetti();
  tvFire("pb_update");                          // 先生の声のごほうび（app/_part_teachervoice.js）
}
function pbCheckAndShow(afterEl, kind, value){
  const def = PB_DEFS.find(d => d.kind === kind);
  if (!def) return;
  pbCelebrate(afterEl, pbCheck(kind, value), def);
}
// 同じ要素（教材の同じフレーズなど）で録音をやり直すとき：前の試行の🏅バナーを残さない
function pbReset(afterEl){
  const m = afterEl && afterEl.nextElementSibling;
  if (m && m.classList && m.classList.contains("pb-mount")) m.remove();
}
// 紙ふぶき（CSS/DOMだけ・約30個・2.5秒で消える）。prefers-reduced-motion のときは出さない
function pbConfetti(){
  if (reduce) return;
  const wrap = document.createElement("div"); wrap.className = "pb-confetti"; wrap.setAttribute("aria-hidden", "true");
  const colors = ["#FFD23F", "#2F86D6", "#1BAF7A", "#F06C9B", "#7C6CF0", "#C9501F"];
  for (let i = 0; i < 30; i++){
    const p = document.createElement("i");
    p.style.left = Math.round(Math.random() * 100) + "%";
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = (Math.random() * 0.4).toFixed(2) + "s";
    p.style.animationDuration = (1.5 + Math.random() * 0.9).toFixed(2) + "s";
    p.style.setProperty("--r", Math.round(Math.random() * 360) + "deg");
    wrap.appendChild(p);
  }
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 2500);
}
// マイ＞自己ベスト一覧の中身（app/_part_my.js の MY_VIEWS.pb から呼ぶ）
function pbListHtml(){
  const all = pbAll();
  const rows = PB_DEFS.map(def => {
    const r = all[def.kind];
    return `<li class="pb-row${r ? "" : " empty"}"><span class="pb-ic" aria-hidden="true">${def.ic}</span><div class="pb-row-b"><b>${esc(def.label)}</b>
      ${r ? `<span class="pb-best">${esc(def.fmt(r.v))}<small>${esc(md(dayKey(r.t)))}</small></span>${r.prev != null ? `<span class="pb-prev">前回 ${esc(def.fmt(r.prev))}</span>` : ""}`
        : `<span class="pb-none">まだ記録がありません</span>`}</div></li>`;
  });
  const n = Object.keys(all).length;
  return `<ul class="pb-list">${rows.join("")}</ul><p class="qnote">${n ? "自己ベストを更新すると🏅が出ます。" : "会話・音読・日記・筋トレの練習をすると、ここに自己ベストがたまっていきます。"}記録はこの端末にだけ残ります。</p>`;
}

/* ================= はじめてのインタビュー（Gemini Live・日本語ナビゲーター） ================= */
/* 入口はホーム1枚のカード（matCardHtml・教材が0本のとき）だけ（2026-10-19：同意後の初回起動の<dialog>案内は、みんな／チャンネルなど他のタブの上にも出てしまうため廃止）。
   マイ「わたしメモ」・AI会話（会話の練習）／教材作成の入口にも、同じ役目の小さなボタン（itvEntryHtml）が出る。
   声の会話は中継の /api/interview-token（相手は固定の日本語ナビゲーター。声は AI会話と同じ Aoede／Achird＝P.nav_voice）。
   一時停止はマイクを無音にして経過時間を止めるだけ（ws はつないだまま。相手の12分の鍵はそのまま減る）。終わったら文字起こしを /api/profile-build に送って
   「わたしメモ」を作り、この端末（cg-profile）＋中継（/api/sync の k=profile）に残す。直後に教材を3本、onboarding:true で1日10回の制限から外して作る。
   保存・削除は本人のページのIDに紐づく（ほかの人には見えない）。録音そのものは保存しない（文字起こしと要約だけ）。 */
const ITV_MAX_SEC = 13 * 60;                              // 中継の鍵は12分で切れる（P.max_min）。少し余裕を見て安全に終わる
let ITV = null;

/* ---------- わたしメモ（この端末の保存・AIへ渡す短い形） ---------- */
const itvProfileRaw = () => { try { return JSON.parse(store("cg-profile") || "null"); } catch (e) { return null; } };
const itvHasProfile = () => { const p = itvProfileRaw(); return !!(p && (((p.scenes || []).length) || p.goals || p.style || (p.catchphrases || []).length)); };
function itvProfilePack(){                                // /api/kz-lesson・/api/live-token に渡す短い形（トークンを食いすぎないように切る）
  const p = itvProfileRaw(); if (!p) return null;
  const cut = (v, n) => String(v ?? "").slice(0, n);
  return {scenes: (p.scenes || []).slice(0, 6).map(x => cut(x, 80)), goals: cut(p.goals, 300), level: cut(p.level, 200), style: cut(p.style, 200),
    catchphrases: (p.catchphrases || []).slice(0, 8).map(x => ({ja: cut(x.ja, 60), en: cut(x.en, 100)})),
    interests: (p.interests || []).slice(0, 8).map(x => cut(x, 60)), avoid: (p.avoid || []).slice(0, 6).map(x => cut(x, 60))};
}
function itvProfileSet(p){ const v = {...p, u: Date.now()}; store("cg-profile", JSON.stringify(v)); if (typeof syncDirty === "function") syncDirty(); return v; }
// もう一度インタビューを受けたとき（itvFinish）だけ：前のわたしメモを history に積んでから新しいものを保存する（最新10件・日付=u）。
// 手で編集して保存する（itvMyBind の「保存」）ときは history を増やさない＝「今の版を直す」であって「新しい版」ではないため
const ITV_HIST_MAX = 10;
function itvProfileSetVersioned(p){
  const prev = itvProfileRaw(), {history, ...snap} = prev || {};
  return itvProfileSet({...p, history: prev ? [snap, ...(history || [])].slice(0, ITV_HIST_MAX) : []});
}
function itvProfileDelete(){ store("cg-profile", null); if (typeof syncDirty === "function") syncDirty(); }
// ほかの端末から同期で届いたら（_part_sync.js）、わたしメモの画面を開いていれば描き直す
function itvOnSync(){ if (MYV === "profile" && !$("pane-my").hidden) renderMy(); }

// 会話の練習（conv）・教材作成フォームに出す小さな入口。プロフィール未作成のときだけ（特権ロールは、わたしメモがあっても出し続ける＝何度でも受けられる）
function itvEntryHtml(cls){
  if ((itvHasProfile() && !isPrivRole()) || !apiOn()) return "";
  return `<button type="button" class="${cls || "talkcard itv"}" id="kzItv"><span class="k">🎙 はじめてのインタビュー</span><b>あなたに合わせた練習に</b><span>日本語で8〜12分。終わったら話題・レベルに合わせた教材が3本できます</span></button>`;
}
function itvBindEntry(box){ const b = box.querySelector("#kzItv"); if (b) b.addEventListener("click", itvOpenScreen); }
function itvOpenScreen(){ hush(); KZ = "itv"; showTab("kz"); window.scrollTo(0, 0); }

/* ---------- 画面：練習タブの中の「はじめてのインタビュー」screen（KZ === "itv"） ---------- */
const ITV_AV_KEY = "kz-itv-avatar";                          // ナビゲーターの顔（Simli）。AI会話の kz-avatar とは別の端末設定・既定ON（明示的に"0"のときだけ顔なし）
const itvAvOn = () => store(ITV_AV_KEY) !== "0";
function renderItvIntro(err){
  const box = $("kzwrap");
  box.innerHTML = `<button class="more kzback" type="button" id="kzBack">← 練習へ</button>
    <div class="sec-h"><h2>${SPARK}はじめてのインタビュー</h2><p>日本語のナビゲーターが、仕事・趣味・旅行・目標などを聞きます（8〜12分）。終わったら、あなた専用の教材が3本できます。一時停止・再開・途中で終わることもできます。</p></div>
    <div class="panel">
      <p class="mapnote">話した内容の文字起こしと要約は、あなたの練習をあなたに合わせるために保存され、運営（コーチ）が見ることがあります。音声そのものは保存しません。マイ＞わたしメモから、いつでも消せます。</p>
      ${err ? `<p class="mapnote warn">${esc(err)}</p>` : ""}
      <label class="kzchk"><input type="checkbox" id="itvNoFace" ${itvAvOn() ? "" : "checked"}>顔なしにする<small>ナビゲーターの顔（試験中）を出さず、声だけにします</small></label>
      <div class="acts"><button class="btn big" type="button" id="itvStartBtn" ${apiOn() ? "" : "disabled"}>🎙 インタビューを始める</button></div>
      <p class="mapnote" id="itvNote">${apiOn() ? "マイクを使います。始めるとナビゲーターから話しかけます。" : esc(noApiMsg())}</p>
    </div>`;
  $("kzBack").addEventListener("click", () => { KZ = "conv"; renderKz(); });
  $("itvNoFace").addEventListener("change", e => store(ITV_AV_KEY, e.target.checked ? "0" : "1"));
  $("itvStartBtn").addEventListener("click", () => {
    if (!apiOn()){ $("itvNote").textContent = noApiMsg(); return; }
    const av = itvAvOn() ? avPrep() : null;                  // 顔を出すときは、このタップの中で映像・音の部品を作る（AI会話の avPrep と同じ・iPhone 対策）
    itvStart(av ? null : itvPrepCtx(), av);
  });
}
function itvPrepCtx(){                                     // タップの中で呼ぶ：AudioContext を作って resume・無音を1つ鳴らして解放（iPhone Safari／ホーム画面PWA は await のあとに作ると音が出ないことがある）
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  ctx.resume().catch(() => {});
  try { const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, 22050); s.connect(ctx.destination); s.start(0); } catch (e) {}
  return ctx;
}
function itvGumMsg(e){                                       // マイクのエラーを日本語で（iPhone Safari 向け）
  const name = (e && e.name) || "";
  if (name === "NotAllowedError" || /Permission/i.test((e && e.message) || "")) return "マイクが許可されていません（設定 → Safari → マイク）";
  if (name === "NotFoundError") return "マイクが見つかりません";
  if (name === "NotReadableError") return "他のアプリがマイクを使っています";
  return "始められませんでした：" + ((e && e.message) || e);
}
function itvResumeBtn(show){                                  // AudioContext が中断されて自力で再開できないとき（iPhone）、タップで再開するボタンを出す
  const wrap = $("itvResumeWrap"); if (!wrap) return;
  if (show){ if (!$("itvResumeBtn")){ wrap.innerHTML = `<div class="acts" style="justify-content:center"><button class="btn big" type="button" id="itvResumeBtn">タップして続ける</button></div>`;
    $("itvResumeBtn").addEventListener("click", () => { if (ITV && ITV.ctx) ITV.ctx.resume().catch(() => {}); }); } }
  else wrap.innerHTML = "";
}
async function itvStart(ctx0, av){
  const box = $("kzwrap");
  ITV = {tr: [], t0: 0, pauseMs: 0, paused: false, srcs: [], playHead: 0, speaking: false, ending: false, av};
  if (av) av.owner = ITV;                                       // avRoute が参照する再生位置・ctx の持ち主（AI会話は talkStart 側で TK を立てる）
  box.innerHTML = `<div class="talk"><div class="stage itv-stage">
      ${av ? `<div class="av"><span class="itv-ic" aria-hidden="true">🎙️</span></div><div class="avv" id="itvAvv"></div><div class="avnote" id="itvAvNote">顔を準備中…（先に声だけで始まります）</div>`
           : `<span class="itv-ic" aria-hidden="true">🎙️</span>`}
      <div class="tkstate" id="itvState">つないでいます…</div><div class="tktime num" id="itvTime">0:00</div></div>
    <div class="cap" id="itvCap"></div>
    <div id="itvResumeWrap"></div>
    <div class="acts" style="justify-content:center"><button class="btn ghost" type="button" id="itvPause">一時停止</button><button class="btn big stop" type="button" id="itvEndBtn">インタビューを終える</button></div>
    <p class="mapnote">ゆっくり、思いつくままでOKです。わからない質問は「もう一度言ってください」で大丈夫です。</p></div>`;
  $("itvEndBtn").addEventListener("click", itvEnd);
  $("itvPause").addEventListener("click", itvPauseToggle);
  if (av){ $("itvAvv").append(av.video, av.audio); }
  // タップの中で、鍵を待つのと並行してマイクも頼む（iPhone はタップの中で始めないと音・マイクの許可が出ないことがある）
  const micP = navigator.mediaDevices.getUserMedia({audio: {echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1}})
    .then(s => ({ok: true, s})).catch(e => ({ok: false, e}));
  let tok;
  try { tok = await api("/api/interview-token", {}); }
  catch (e) {
    ITV = null; try { ctx0 && ctx0.close(); } catch (e2) {} try { avStop(av); } catch (e2) {}
    micP.then(r => { if (r.ok) try { r.s.getTracks().forEach(t => t.stop()); } catch (e2) {} });
    renderItvIntro(e.message); return;
  }
  const micR = await micP;
  if (!micR.ok){ ITV = null; try { ctx0 && ctx0.close(); } catch (e2) {} try { avStop(av); } catch (e2) {} renderItvIntro(itvGumMsg(micR.e)); return; }
  ITV.mic = micR.s;
  try {
    const ctx = ITV.ctx = (av && av.ctx) || ctx0 || new (window.AudioContext || window.webkitAudioContext)();
    if (av) av.ctx = null;                                      // タップの中で作った AudioContext を声に使う（閉じるのは itvAbort。AI会話の avPrep／talkStart と同じ）
    await ctx.resume();                                        // マイクが開くと iPhone は音声セッションを play-and-record に切りかえ、ctx が中断されることがある（下の onstatechange で再開）
    ctx.onstatechange = () => {
      if (!ITV || ITV.ctx !== ctx) return;
      if (ctx.state === "running"){ itvResumeBtn(false); return; }
      ctx.resume().catch(() => {});
      setTimeout(() => { if (ITV && ITV.ctx === ctx && ctx.state !== "running") itvResumeBtn(true); }, 400);   // 自力で再開できないときだけ、タップで再開するボタン
    };
    if (av) avStart(av, "female");                              // ナビゲーターの顔：女性・感情プリセットなし（AI会話の avStart と同じ関数・標準の顔）
    await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], {type: "application/javascript"})));
    const src = ctx.createMediaStreamSource(ITV.mic), node = ITV.node = new AudioWorkletNode(ctx, "cg-mic"), sink = ctx.createGain();
    sink.gain.value = 0; src.connect(node); node.connect(sink); sink.connect(ctx.destination);
    ITV.an = ctx.createAnalyser(); ITV.an.fftSize = 512; ITV.an.connect(ctx.destination);
    const ws = ITV.ws = new WebSocket("wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=" + encodeURIComponent(tok.token));
    ws.onopen = () => ws.send(JSON.stringify({setup: {model: tok.model}}));
    ws.onmessage = async ev => {
      const m = JSON.parse(typeof ev.data === "string" ? ev.data : await ev.data.text());
      if (m.setupComplete){
        ITV.t0 = Date.now(); const st = $("itvState"); if (st) st.textContent = "ナビが話しはじめます";
        ITV.tick = setInterval(itvTick, 250);
        node.port.onmessage = e => {
          if (!ITV || ITV.ws.readyState !== 1) return;
          if (ITV.av) avMic(ITV.av, e.data);
          const silent = ITV.paused || ITV.speaking;                  // 一時停止中・相手が話している間は無音を送る（割り込まないように）
          ITV.ws.send(JSON.stringify({realtimeInput: {audio: {data: b64(silent ? new ArrayBuffer(e.data.byteLength) : e.data), mimeType: "audio/pcm;rate=16000"}}}));
        };
        if (ws.readyState === 1) ws.send(JSON.stringify({realtimeInput: {text: "(The learner has joined. Please start.)"}}));
      }
      const sc = m.serverContent;
      if (sc){
        (sc.modelTurn && sc.modelTurn.parts || []).forEach(pt => { if (pt.inlineData) itvPlay(pt.inlineData.data); });
        if (sc.inputTranscription && sc.inputTranscription.text) itvCap("you", sc.inputTranscription.text);
        if (sc.outputTranscription && sc.outputTranscription.text) itvCap("nav", sc.outputTranscription.text);
        if (sc.interrupted){ ITV.srcs.forEach(s => { try { s.stop(); } catch (e) {} }); ITV.srcs = []; ITV.playHead = 0; if (ITV.av) avClear(ITV.av); }
        if (sc.turnComplete){ ITV.lastTurn = null; if (ITV.av) avTurnEnd(ITV.av); }
      }
      if (m.goAway) itvEnd();
    };
    ws.onclose = ev2 => {
      if (!ITV) return;
      ITV.closeCode = ev2 && ev2.code; ITV.closeReason = ev2 && ev2.reason;
      console.warn("はじめてのインタビュー：接続が切れました", ITV.closeCode, ITV.closeReason);
      if (!ITV.ending) itvEnd();
    };
    ws.onerror = () => { const st = $("itvState"); if (st) st.textContent = "接続できませんでした"; };
  } catch (e) {
    itvAbort(); renderItvIntro(itvGumMsg(e));
  }
}
function itvPlay(data){
  if (ITV.av && avRoute(ITV.av, data)) return;                 // 顔が出ているときは Simli に送り、声は映像の音から出す（二重に鳴らさない）
  const ctx = ITV.ctx, raw = atob(data), n = raw.length / 2, f = new Float32Array(n);
  for (let i = 0; i < n; i++){ let v = raw.charCodeAt(2 * i) | (raw.charCodeAt(2 * i + 1) << 8); if (v >= 32768) v -= 65536; f[i] = v / 32768; }
  const buf = ctx.createBuffer(1, n, 24000); buf.copyToChannel(f, 0);
  const s = ctx.createBufferSource(); s.buffer = buf; s.connect(ITV.an);
  const at = Math.max(ctx.currentTime + 0.04, ITV.playHead); s.start(at); ITV.playHead = at + buf.duration;
  ITV.srcs.push(s); s.onended = () => { ITV && (ITV.srcs = ITV.srcs.filter(x => x !== s)); };
}
function itvCap(who, text){
  const last = ITV.tr[ITV.tr.length - 1];
  if (last && last.who === who && ITV.lastTurn === who) last.text += text; else ITV.tr.push({who, text: text.replace(/^\s+/, "")});
  ITV.lastTurn = who;
  const el = $("itvCap"); if (!el) return;
  el.innerHTML = ITV.tr.slice(-6).map(x => `<p class="${x.who === "you" ? "you" : "pt"}"><b>${x.who === "you" ? "あなた" : "ナビ"}</b>${esc(x.text)}</p>`).join("");
  el.scrollTop = el.scrollHeight;
}
function itvPauseToggle(){
  if (!ITV) return;
  if (ITV.paused){ ITV.pauseMs += Date.now() - ITV.pausedAt; ITV.paused = false; } else { ITV.paused = true; ITV.pausedAt = Date.now(); }
  const b = $("itvPause"); if (b) b.textContent = ITV.paused ? "再開" : "一時停止";
}
function itvTick(){
  if (!ITV || !ITV.ctx) return;
  const now = ITV.paused ? ITV.pausedAt : Date.now(), sec = Math.max(0, (now - ITV.t0 - ITV.pauseMs) / 1000);
  const el = $("itvTime"); if (el) el.textContent = Math.floor(sec / 60) + ":" + String(Math.floor(sec % 60)).padStart(2, "0");
  const ctx = ITV.ctx;
  if (ctx.state === "running"){
    if (ITV._lastCur === undefined || ctx.currentTime !== ITV._lastCur){ ITV._lastCur = ctx.currentTime; ITV._lastCurAt = Date.now(); }
    if (ITV.playHead > ctx.currentTime + 30 || Date.now() - (ITV._lastCurAt || Date.now()) > 2000) ITV.playHead = ctx.currentTime;   // 止まった時計を元に戻す（マイクが無言を送り続けないように）
    ITV.speaking = ITV.playHead > ctx.currentTime + 0.05 || !!(ITV.av && ITV.av.speaking);
  } else ITV.speaking = false;                                // ctx が中断されている間は「ナビが話している」扱いにしない（マイクが無言を送り続けて止まるのを防ぐ）
  const st = $("itvState"); if (st) st.textContent = ITV.paused ? "一時停止中" : ITV.speaking ? "ナビが話しています" : "あなたの番です";
  if (sec > ITV_MAX_SEC) itvEnd();
}
function itvAbort(){                                        // 画面を離れる・タブを切りかえるときの無言の後片付け（わたしメモは作らない）
  if (!ITV) return;
  const T = ITV; if (T.ending) return; T.ending = true;
  clearInterval(T.tick);
  try { T.ws && T.ws.close(); } catch (e) {}
  try { T.mic && T.mic.getTracks().forEach(t => t.stop()); } catch (e) {}
  try { T.srcs.forEach(s => s.stop()); } catch (e) {}
  try { avStop(T.av); } catch (e) {}
  try { T.ctx && T.ctx.close(); } catch (e) {}
  ITV = null;
}
// ページを離れる・アプリを閉じるときは Simli だけすぐ止める（分数を使わない。会話は声だけで続く）。セッションそのものを畳むのは pagehide か、隠れたままが3秒続いたとき（下）
["pagehide", "visibilitychange"].forEach(ev => addEventListener(ev, () => { if ((ev === "pagehide" || document.hidden) && ITV && ITV.av) avFail(ITV.av, null); }));
let itvHideTimer = null;
document.addEventListener("visibilitychange", () => {
  if (document.hidden){ clearTimeout(itvHideTimer); itvHideTimer = setTimeout(() => { if (document.hidden && ITV) itvAbort(); }, 3000); }   // iPhone はマイクの許可シートでも visibilitychange が一瞬入ることがあるので、すぐには畳まない
  else clearTimeout(itvHideTimer);
});
async function itvEnd(){                                    // 「インタビューを終える」・自動終了：文字起こしからわたしメモを作る
  if (!ITV) return;
  const T = ITV, seconds = T.t0 ? Math.max(0, Math.round((Date.now() - T.t0 - T.pauseMs) / 1000)) : 0, tr = T.tr;
  const closeInfo = T.closeCode ? {code: T.closeCode, reason: T.closeReason} : null;
  itvAbort();
  await itvFinish(tr, seconds, closeInfo);
}
async function itvFinish(tr, seconds, closeInfo){
  const box = $("kzwrap");
  box.innerHTML = `<div class="sec-h"><h2>${SPARK}わたしメモを作っています…</h2><p>インタビューの内容から、あなた専用の練習を作っています（30〜60秒）。</p></div><p class="loading">少しお待ちください…</p>`;
  const said = tr.filter(x => x.who === "you").map(x => x.text || "").join(" ").trim();
  const retryStart = () => { const av = itvAvOn() ? avPrep() : null; itvStart(av ? null : itvPrepCtx(), av); };
  if (said.length < 40){
    if (closeInfo && closeInfo.code && tr.length <= 4){       // 最初の数ターンのうちに、話がほとんどないまま接続が切れた（通信の調子が悪かった可能性が高い）
      box.innerHTML = `<div class="sec-h"><h2>接続が切れました（${esc(String(closeInfo.code))}）</h2></div><p class="mapnote">通信の調子が悪かったようです。もう一度お試しください。</p>
        <div class="acts"><button class="btn" type="button" id="itvRetry">もう一度</button><button class="btn ghost" type="button" id="itvBack2">練習へ</button></div>`;
    } else {
      box.innerHTML = `<div class="sec-h"><h2>うまく聞き取れませんでした</h2></div><p class="mapnote">もう少し長くお話しいただけると、わたしメモが作れます。もう一度どうぞ。</p>
        <div class="acts"><button class="btn" type="button" id="itvRetry">もう一度インタビュー</button><button class="btn ghost" type="button" id="itvBack2">練習へ</button></div>`;
    }
    $("itvRetry").addEventListener("click", retryStart);
    $("itvBack2").addEventListener("click", () => { KZ = "conv"; renderKz(); });
    return;
  }
  let prof;
  try { prof = await api("/api/profile-build", {transcript: tr.slice(-200)}); }
  catch (e) {
    box.innerHTML = `<p class="mapnote warn">わたしメモを作れませんでした（${esc(e.message)}）。</p><div class="acts"><button class="btn" type="button" id="itvRetry2">もう一度</button><button class="btn ghost" type="button" id="itvBack3">練習へ</button></div>`;
    $("itvRetry2").addEventListener("click", retryStart);
    $("itvBack3").addEventListener("click", () => { KZ = "conv"; renderKz(); });
    return;
  }
  itvProfileSetVersioned(prof);
  box.innerHTML = `<div class="sec-h"><h2>${SPARK}わたしメモができました</h2><p>${Math.floor(seconds / 60)}分${seconds % 60}秒のインタビュー。あなた専用の教材を3本作っています…</p></div>${itvSummaryHtml(prof)}<p class="loading" id="itvMk3">教材を作っています…（1/3）</p>`;
  const {n, firstId} = await itvMakeThree(prof);
  const note = $("itvMk3");
  if (note) note.outerHTML = `<p class="mapnote">${n > 0 ? `${n}本の教材ができました。` : "教材は作れませんでしたが、わたしメモは保存されています。"}練習＞教材の一覧から見られます。</p>
    <div class="acts"><button class="btn big" type="button" id="itvDoneGo">教材を見る</button>${firstId && apiOn() ? `<button class="btn ghost" type="button" id="itvDoneTalk">この教材でAI会話</button>` : ""}</div>`;
  const go = $("itvDoneGo"); if (go) go.addEventListener("click", () => { KZ = null; renderKz(); });
  const tk = $("itvDoneTalk"); if (tk) tk.addEventListener("click", () => talkWith(firstId));
}
function itvSummaryHtml(p){
  const li = a => (a || []).length ? `<ul class="facts">${a.map(x => `<li>${esc(typeof x === "string" ? x : (x && (x.en || x.ja) ? `${x.en || ""}${x.en && x.ja ? "（" + x.ja + "）" : x.ja || ""}` : ""))}</li>`).join("")}</ul>` : "";
  return `<div class="panel itv-sum">
    ${(p.scenes || []).length ? `<h4>よく使う場面</h4>${li(p.scenes)}` : ""}
    ${p.goals ? `<h4>目標</h4><p>${esc(p.goals)}</p>` : ""}
    ${p.style ? `<h4>話し方</h4><p>${esc(p.style)}</p>` : ""}
    ${(p.catchphrases || []).length ? `<h4>好きな言い方</h4>${li(p.catchphrases)}` : ""}
    ${(p.interests || []).length ? `<h4>興味・関心</h4><p>${esc(p.interests.join("、"))}</p>` : ""}
  </div>`;
}
const ITV_LEVELS = ["英検3級", "英検準2級", "英検2級", "英検準1級"];   // 教材作成フォーム（renderReqForm・app/_part_kz.js）の4段階と同じラベル
function itvLevelOf(level){                                // わたしメモの「いまのレベル・不安」（自由記述）を教材フォームと同じラベルへ寄せる。当たらなければ英検準2級
  const s = String(level || "");
  if (ITV_LEVELS.includes(s)) return s;
  if (/初心者|まったく話せ|ほとんど話せ|単語(だけ|しか)|全然話せ/.test(s)) return "英検3級";
  if (/流暢|ネイティブ|ペラペラ|不自由なく|問題なく話せ|自然に話せる|仕事で普段/.test(s)) return "英検準1級";
  if (/ビジネス|商談|交渉|会議で発言|議論できる/.test(s)) return "英検2級";
  return "英検準2級";
}
function itvSceneList(prof){                                // 3本の場面を重複なく・足りなければ興味／目標／口癖から補って作る
  const seen = new Set(), out = [];
  const add = s => { const t = String(s || "").trim(); if (t && !seen.has(t)){ seen.add(t); out.push(t); } };
  (prof.scenes || []).forEach(add);
  (prof.interests || []).forEach(s => add(`${s}について話す場面`));
  if (prof.goals) add(prof.goals);
  (prof.catchphrases || []).forEach(c => add(c && (c.ja || c.en) ? `「${c.ja || c.en}」を使う場面` : ""));
  if (!out.length) add("日常会話");
  while (out.length < 3) out.push(out[out.length - 1]);
  return out.slice(0, 3);
}
async function itvMakeThree(prof){
  const scenes = itvSceneList(prof), level = itvLevelOf(prof.level);
  const badge = isPrivRole() ? `体験 ${md(dayKey(Date.now()))}` : null;   // 特権ロールのやり直しだけ、できた3本に日付バッジをつける（members unchanged）
  let n = 0, firstId = null;
  for (let i = 0; i < 3; i++){
    const note = $("itvMk3"); if (note) note.textContent = `教材を作っています…（${i + 1}/3）`;
    const scene = scenes[i], body = `${scene}について、自然に話せるようになりたい。${prof.goals || ""}`.trim().slice(0, 600);
    try {
      const r = await api("/api/kz-lesson", {kind: "スピーキング", level, scene: scene.slice(0, 100), body, profile: itvProfilePack(), onboarding: true});
      if (!r.empty && !r.error){
        const {left, ...lesson} = r;
        const m = {...lesson, id: "k" + Date.now().toString(36) + i, source: "オーダーメイド", kind: "speaking", level, made: dayKey(Date.now()), mine: true, ...(badge ? {badge} : {})};
        store("kz-mine", JSON.stringify([m, ...kzMine()].slice(0, kzMineCap())));
        kzEnsurePics(m);
        if (!firstId) firstId = m.id;
        n++;
      }
    } catch (e) {}
  }
  return {n, firstId};
}

/* ---------- マイ＞わたしメモ：表示・編集・もう一度インタビュー・文字起こしを消す ---------- */
function itvMyHtml(){
  const p = itvProfileRaw();
  if (!p) return `<p class="mapnote">まだ「はじめてのインタビュー」を受けていません。受けると、AI会話・教材作成がこの内容に合わせて作られます。</p>
    <div class="acts"><button type="button" class="btn big" id="itvMyStart" ${apiOn() ? "" : "disabled"}>🎙 インタビューを受ける</button></div>
    <p class="mapnote">${apiOn() ? "" : esc(noApiMsg())}</p>`;
  const join = a => (a || []).join("\n"), joinCp = a => (a || []).map(x => `${x.ja || ""} / ${x.en || ""}`).join("\n");
  return `<p class="mapnote">インタビューの内容から作った短い要約です。編集して「保存」で反映されます（AI会話・教材作成に使われます）。話した内容の文字起こしは運営が見ることがありますが、下の「文字起こしを消す」でいつでも消せます（この要約は残ります）。</p>
    <div class="panel itv-edit">
      <label class="gl-f"><span>よく使う場面（1行に1つ）</span><textarea id="itvFScenes" rows="3">${esc(join(p.scenes))}</textarea></label>
      <label class="gl-f"><span>目標</span><textarea id="itvFGoals" rows="2">${esc(p.goals || "")}</textarea></label>
      <label class="gl-f"><span>いまのレベル・不安</span><textarea id="itvFLevel" rows="2">${esc(p.level || "")}</textarea></label>
      <label class="gl-f"><span>話し方・性格</span><textarea id="itvFStyle" rows="2">${esc(p.style || "")}</textarea></label>
      <label class="gl-f"><span>好きな言い方・口癖（1行に1つ・「日本語 / 英語」）</span><textarea id="itvFCp" rows="3">${esc(joinCp(p.catchphrases))}</textarea></label>
      <label class="gl-f"><span>興味・関心（1行に1つ）</span><textarea id="itvFInt" rows="2">${esc(join(p.interests))}</textarea></label>
      <label class="gl-f"><span>避けたい話題（1行に1つ）</span><textarea id="itvFAvoid" rows="2">${esc(join(p.avoid))}</textarea></label>
      <div class="acts"><button type="button" class="btn" id="itvSave">保存</button></div>
    </div>
    <div class="acts">
      <button type="button" class="btn ghost" id="itvMyStart" ${apiOn() ? "" : "disabled"}>🎙 もう一度インタビューを受ける</button>
      <button type="button" class="btn ghost" id="itvMyDel">文字起こしを消す</button>
    </div>
    ${(p.history || []).length ? `<details class="panel itv-hist"><summary>過去のわたしメモ（${(p.history || []).length}件）</summary>
      <ul class="itv-hlist">${p.history.map(h => `<li><b>${esc(md(dayKey(h.u || 0)))}</b>${itvSummaryHtml(h)}</li>`).join("")}</ul>
    </details>` : ""}`;
}
function itvMyBind(){
  const go = $("itvMyStart"); if (go) go.addEventListener("click", () => {
    if (!apiOn()){ toast(noApiMsg()); return; }
    const av = itvAvOn() ? avPrep() : null; itvOpenScreen(); itvStart(av ? null : itvPrepCtx(), av);
  });
  const save = $("itvSave");
  if (save) save.addEventListener("click", () => {
    const lines = id => $(id).value.split("\n").map(s => s.trim()).filter(Boolean);
    const p = itvProfileRaw() || {};
    itvProfileSet({...p, scenes: lines("itvFScenes").slice(0, 6), goals: $("itvFGoals").value.trim().slice(0, 300), level: $("itvFLevel").value.trim().slice(0, 200),
      style: $("itvFStyle").value.trim().slice(0, 200), catchphrases: lines("itvFCp").map(l => { const [ja, en] = l.split("/"); return {ja: (ja || "").trim().slice(0, 60), en: (en || "").trim().slice(0, 100)}; }).filter(x => x.ja || x.en).slice(0, 8),
      interests: lines("itvFInt").slice(0, 8), avoid: lines("itvFAvoid").slice(0, 6)});
    toast("わたしメモを保存しました"); renderMy();
  });
  const del = $("itvMyDel");
  if (del) del.addEventListener("click", async () => {
    if (!confirm("インタビューの文字起こしを消しますか？（この要約は残ります）")) return;
    try { if (apiOn()) await api("/api/interview-delete", {}); toast("文字起こしを消しました"); } catch (e) { toast("消せませんでした（" + e.message + "）"); }
  });
}

/* ---------- テスト用：音声を使わず、文字起こしからわたしメモ・教材を作る ---------- */
// 使い方（console から）：__cgInterviewStub() または __cgInterviewStub([{who:"you", text:"…"}, …])
// URL に ?itvstub=1 をつけて開くと、起動時に自動で走る（本人用のリンクだけ。テスト・スクリーンショット用）
const ITV_STUB_TRANSCRIPT = [
  {who: "nav", text: "こんにちは。今日はあなたのことを聞かせてください。お仕事で英語を使うことはありますか？"},
  {who: "you", text: "はい、海外のお客さんとオンライン会議をすることがあります。来月、シンガポールのチームと商談があります。"},
  {who: "nav", text: "それは楽しみですね。趣味はありますか？"},
  {who: "you", text: "旅行が好きで、去年はベトナムに行きました。来年はヨーロッパに行きたいです。"},
  {who: "nav", text: "英語を学ぶ目標は何ですか？"},
  {who: "you", text: "商談で自分の意見をはっきり言えるようになりたいです。今はゆっくりなら話せますが、とっさに言葉が出ません。少し不安です。"},
  {who: "nav", text: "よく使う言い方や口癖はありますか？"},
  {who: "you", text: "「正直なところ」とか「なんというか」とよく言います。関西弁も少し出ます。"},
  {who: "nav", text: "避けたい話題はありますか？"},
  {who: "you", text: "政治の話は避けたいです。"}
];
window.__cgInterviewStub = async tr => {
  if (!apiOn()){ toast(noApiMsg()); return; }
  KZ = "itv"; if ($("pane-kz") && $("pane-kz").hidden) showTab("kz"); else renderKz();
  await itvFinish(Array.isArray(tr) && tr.length ? tr : ITV_STUB_TRANSCRIPT, 540);
};
function itvAutoStub(){
  if (!ME || ME.viewer) return;
  if (new URLSearchParams(location.search).get("itvstub") === "1") window.__cgInterviewStub();
}
/* わたしメモの『なぜ』カード（N=5・2026-10-27）
   はじめてのインタビュー（わたしメモ・app/_part_interview.js の itvProfileRaw）で本人が話した目標（p.goals）を、
   本人の言葉のまま、Home「今日の1つ」（_part_me.js の heroHtml）の中に一度だけ添える。新しいHomeカードは作らない。
   出す場面は2つだけ：①ストリークが途切れそうな夜（今日まだ練習していない・連続日数がまだ生きている・夜）
   ②しばらく間があいた人が戻ってきたとき（最後に練習した日から WHY_RETURN_GAP 日以上）。どちらもやさしく・責めない文言。
   中継は呼ばない（読むのはこの端末の cg-profile・cg-whycard-seen だけ。D1・relay の変更なし）。 */
const WHY_NIGHT_HOUR = 21;    // この時刻（端末のローカル時刻）以降を「夜」とみなす
const WHY_RETURN_GAP = 7;     // 最後に練習した日からこの日数以上あいていたら「離脱から戻ってきた」とみなす
let WHY_PENDING = null;       // このページを開いている間だけ覚える（一度出したら、このセッション中は出し続けてよい）

// 最後に練習した日（今日より前）から今日までの日数が WHY_RETURN_GAP 以上あいているか。練習したことが一度もない人は対象外（新規は「離脱」ではない）
function whyReturning(d){
  const today = dayKey(Date.now());
  const days = [...studySet(d)].filter(k => k < today).sort();
  if (!days.length) return false;
  const last = new Date(days[days.length - 1] + "T00:00:00"), now = new Date(today + "T00:00:00");
  return Math.round((now - last) / 86400000) >= WHY_RETURN_GAP;
}
// 出す条件を判定する（まだ出したことがなく・わたしメモに目標があり・夜にストリークが途切れそうor久しぶりに戻ってきたとき）
function whyCardCheck(d){
  if (!d || d.viewer || store("cg-whycard-seen")) return null;
  const p = itvProfileRaw(), goal = p && (p.goals || "").trim();
  if (!goal) return null;
  const S = streakOf(d), night = new Date().getHours() >= WHY_NIGHT_HOUR;
  const nightBreak = night && !S.done && S.run > 0;
  const back = whyReturning(d);
  if (!nightBreak && !back) return null;
  return {goal, back};
}
// renderMe(d) から、ホームを描く前に呼ぶ。一度出すと決めたらすぐ cg-whycard-seen を立てる（以後は二度と出さない）
function whyCheck(d){
  if (WHY_PENDING) return;
  const w = whyCardCheck(d);
  if (w){ WHY_PENDING = w; store("cg-whycard-seen", "1"); }
}
// heroHtml（今日の1つ）に差しこむ1行。新しいセクションではなく、既存のカードの中に添えるだけ
function whyCardHtml(){
  if (!WHY_PENDING) return "";
  const lead = WHY_PENDING.back ? "おかえりなさい。あなたは、こう言っていましたね" : "今日はここまででも、大丈夫。あなたは、こう言っていましたね";
  return `<div class="why"><span class="why-lead">${esc(lead)}</span><span class="why-goal">「${esc(WHY_PENDING.goal)}」</span></div>`;
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
  store("kz-mine", JSON.stringify([m, ...kzMine()].slice(0, kzMineCap())));
  kzEnsurePics(m);
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
  const t = $("wsTalk"); if (t) t.addEventListener("click", () => talkWith(m.id, "teacher"));
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
  $("dyOut").innerHTML = `<h4 class="dyok">添削（${body.kind === "voice" ? "話す" : "書く"}・${esc(topic)}）</h4>${dyRevHtml(r, body.kind === "voice", "now")}${snsAfterHtml()}`;
  const words = ((r.text || "").match(/[A-Za-z']+/g) || []).length;             // 英語の語数（中継の records 保存と同じ数え方）
  if (words){ pbCheckAndShow($("dyOut"), "diary_words", words); pbCheckAndShow($("dyOut"), "week_minutes", pbWeekMinutes()); }
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

/* ================= みんな＞タイムライン（SNS フェーズ1）：学習の記録・今日のまとめ・🍻乾杯・通報・シェアカード ================= */
/* 出どころ（README「みんな（SNS）」・docs/relay-design.md）
   - 学習の記録（自動）＝ studyDay()：この端末の練習の記録（kz-talks・kz-reads・kz-react・kz-drill・kz-log・kz-convs・kz-diary・kz-wdlog・kz-mine）と、
     中継の records（/api/records・ほかの端末の分も入る）を種類ごとに大きい方。合計の分数は studyMinutes() の1か所
   - 手入力（＋記録）＝ この端末の sns-manual（アプリの外の学習）。ひとことは sns-note-<日>
   - 投稿・🍻・通報・ブロック・呼び名は中継（/api/feed・/api/post・/api/cheer・/api/report・/api/block・/api/profile）。投稿は本人が押したときだけ（1人1日1つを上書き）
   - デモ（#demo）は me.json の sns（架空の呼び名の投稿）。🍻・投稿は端末の中（この画面のあいだ）だけで、どこにも送らない
   名前は呼び名（ニックネーム）だけ・投稿の時刻は出さない（日付だけ）・お店は出さない。CSS は sns- で始まる名前だけ */
const SNS_AUTO = [["talk", "🎙️", "AI会話", "回"], ["read", "📖", "音読チェック", "回"], ["react", "⚡", "2秒応答", "問"], ["drill", "😊", "1分スピーチ", "回"], ["player", "🎧", "教材", "回"],
  ["kz", "✨", "教材づくり", "本"], ["conv", "🎙", "会話の録音", "回"], ["diary", "📝", "英語日記", "本"], ["words", "🃏", "単語の復習", "語"]];
const SNS_MANUAL = [["book", "📚", "参考書"], ["video", "🎬", "動画・映画"], ["online", "🗣", "オンライン英会話"], ["meet", "🍻", "外国の方と会話"], ["podcast", "🎧", "ポッドキャスト"], ["focus", "🥂", "集中の乾杯グラス"], ["other", "✏️", "その他"]];
const SNS_ICONS = ["🙂", "🦊", "🐼", "🐯", "🐨", "🐶", "🐱", "🐰", "🐻", "🐸", "🐧", "🦁", "🐵", "🐙", "🦄", "🐳", "🌸", "🌻", "⭐", "🍀", "⚽", "🎸", "☕", "🍺"];   // 中継の SNS_ICONS と同じ
const SNS_REASONS = [["spam", "宣伝・スパム"], ["rude", "いやな言葉・攻撃"], ["private", "本名・顔・お店などが出ている"], ["other", "そのほか"]];
const SNS_CONSENT = "投稿・🍻・コメントはチアーズメイトの会員と運営に見えます。本名・顔・お店の名前は出しません。";   // 提案書 4-6 の文
const SNS = {items: [], next: null, loaded: false, busy: false, err: "", consent: null, prof: null, filter: "all", open: null, rep: null, mk: "book", mm: 30, vis: null, icon: null, blocked: null, demo: false};
let SNSV = null;                                                         // タイムラインの中の画面：null＝一覧・log＝学習を記録・share＝シェアカード・prof＝呼び名・公開範囲
let SNS_REC = null, SNS_REC_T = 0, SNS_CARD = 1350;
const snsJ = k => { try { const v = JSON.parse(store(k) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
const snsReady = () => apiOn() && !!API_AUTH && !DEMO;
const snsToday = () => dayKey(Date.now());
const snsDayLabel = d => d === snsToday() ? "今日" : d === dayKey(Date.now() - 864e5) ? "昨日" : md(d);
const snsMin = m => m >= 60 ? `${Math.floor(m / 60)}時間${m % 60 ? (m % 60) + "分" : ""}` : `${m}分`;
const snsAutoOf = k => SNS_AUTO.find(x => x[0] === k) || [k, "・", k, "回"];
const snsManOf = k => SNS_MANUAL.find(x => x[0] === k) || SNS_MANUAL[5];
const snsNick = () => (SNS.prof && SNS.prof.nick) || snsNickDefault();
const snsIcon = () => (SNS.prof && SNS.prof.icon) || "🙂";
// 呼び名の初期値：本人のページの nick（build_site がランキングと同じローマ字の呼び名から作る）→ ランキングの自分の行 → 「メンバー」。漢字の名前は使わない
function snsNickDefault(){
  if (ME && ME.nick) return ME.nick;
  if (ME && ME.sns && ME.sns.nick) return ME.sns.nick;
  const R = ME && ME.ranking, row = R && Object.values(R.boards || {}).flatMap(b => Object.values(b)).flat().find(x => x.me);
  return row && /^[\x20-\x7e]{1,20}$/.test(row.name) ? row.name : "メンバー";
}

/* ---------- 学習の記録（自動）：その日の種類べつの分数・回数（ここだけで数える） ---------- */
// 分数があるのは測った秒数（AI会話・筋トレ・会話の録音・フリートーク）と、教材の練習（教材の長さ＝155語/分での秒数を1回ぶんの目安にする）だけ。
// 音読・2秒応答・単語の復習・教材づくり・日記（文章）は回数だけ（時間を測っていないので作らない）
function studyDay(day){
  const on = x => x && x.t && dayKey(x.t) === day, out = {};
  const add = (k, n, sec) => { const o = out[k] = out[k] || {n: 0, sec: 0}; o.n += n; o.sec += +sec || 0; };
  snsJ("kz-talks").filter(on).forEach(x => add("talk", 1, x.seconds));
  snsJ("kz-reads").filter(on).forEach(() => add("read", 1, 0));
  snsJ("kz-react").filter(on).forEach(() => add("react", 1, 0));
  snsJ("kz-drill").filter(on).forEach(x => add("drill", 1, x.sec));
  const L = kzList();
  snsJ("kz-log").filter(on).forEach(x => { const m = L.find(y => y.id === x.id); add("player", 1, m && ["read", "shadow", "speed", "listen", "role"].includes(x.step) ? kzSec(m) : 0); });
  kzMine().filter(m => m.source === "オーダーメイド" && m.made === day).forEach(() => add("kz", 1, 0));
  snsJ("kz-convs").filter(on).forEach(x => add("conv", 1, x.seconds));
  snsJ("kz-diary").filter(on).forEach(x => add("diary", 1, x.seconds));
  snsJ("kz-wdlog").filter(on).forEach(() => add("words", 1, 0));
  if (SNS_REC){                                                          // 中継の records：同じ練習がこの端末にもあるので、種類ごとに大きい方（ほかの端末で練習した分も入る）
    const srv = {}, K = {talk: "talk", read: "read", react: "react", drill: "drill", kz: "kz", conv: "conv", diary: "diary"};
    SNS_REC.filter(r => r && r.t && K[r.kind] && dayKey(r.t) === day).forEach(r => { const o = srv[K[r.kind]] = srv[K[r.kind]] || {n: 0, sec: 0}; o.n++; o.sec += +(r.seconds || r.sec) || 0; });
    Object.entries(srv).forEach(([k, v]) => { const o = out[k] = out[k] || {n: 0, sec: 0}; o.n = Math.max(o.n, v.n); o.sec = Math.max(o.sec, v.sec); });
  }
  if (DEMO && !Object.keys(out).length && day === snsToday() && ME && ME.sns) (ME.sns.auto || []).forEach(x => add(x.k, x.n, x.m * 60));   // デモの架空の記録
  return SNS_AUTO.filter(([k]) => out[k]).map(([k, ic, l, u]) => ({k, ic, l, u, n: out[k].n, m: Math.round(out[k].sec / 60)}));
}
const snsManual = () => snsJ("sns-manual");
const snsManualDay = day => snsManual().filter(x => x.day === day);
function snsSummary(day){
  const items = studyDay(day), manual = snsManualDay(day).map(x => ({k: x.k, m: x.m, title: x.title || ""}));
  return {day, items, manual, total: Math.min(1440, items.reduce((s, x) => s + x.m, 0) + manual.reduce((s, x) => s + x.m, 0)),
    streak: ME ? streakOf(ME).run : 0, note: store("sns-note-" + day) || ""};
}
// 学習時間（分）：自動の記録＋手入力。今日のまとめ・シェアカード・練習のあとの1行が同じ数字を使う
const studyMinutes = day => snsSummary(day || snsToday()).total;
const studyToday = () => snsSummary(snsToday());
// 中継の records（今日の分を数えるため）。5分に1回まで読む
function snsLoadRec(){
  if (!snsReady() || Date.now() - SNS_REC_T < 300e3) return Promise.resolve();
  SNS_REC_T = Date.now();
  return api("/api/records").then(r => { SNS_REC = r.records || []; }).catch(() => {});
}
const snsChip = x => x.m ? `${x.l} ${snsMin(x.m)}` : `${x.l} ${x.n}${x.u}`;
const snsMineToday = () => SNS.items.find(p => p.mine && p.day === snsToday());
// 練習が終わった画面の1行（本人用リンクの受講生だけ）。押すと「学習を記録」
function snsAfterHtml(){
  if (!ME || !tlOn()) return "";
  return `<p class="sns-after">🍻 今日のまとめに入りました（合計 <b class="num">${snsMin(studyMinutes())}</b>）<button type="button" class="btn sm2" data-snslog>${snsMineToday() ? "更新する" : "投稿する"}</button></p>`;
}
document.addEventListener("click", e => { const b = e.target.closest("[data-snslog]"); if (b){ e.preventDefault(); snsOpen("log"); } });
function snsOpen(v){
  USSEG = "timeline"; SNSV = v || null;
  if ($("pane-us").hidden) showTab("us");
  renderUs(); window.scrollTo(0, 0);
}

/* ---------- タイムライン（中継の投稿＋チームの乾杯写真） ---------- */
function snsDemoInit(){
  if (SNS.demo) return;
  SNS.demo = true;
  SNS.items = ((ME.sns || {}).feed || []).map(x => ({...x}));
  SNS.prof = SNS.prof || {nick: snsNickDefault(), icon: (ME.sns || {}).icon || "🙂", vis: "members"};
}
async function snsLoad(more){
  if (SNS.busy) return;
  if (DEMO){ snsDemoInit(); SNS.loaded = true; snsPaint(); return; }
  if (!snsReady()){ SNS.loaded = true; snsPaint(); return; }
  SNS.busy = true; SNS.err = "";
  if (more) snsPaint();
  try {
    const r = await api("/api/feed" + (more && SNS.next ? "?before=" + SNS.next : ""));
    SNS.consent = r.consent ? "yes" : "no";
    if (r.profile) SNS.prof = r.profile;
    SNS.items = more ? SNS.items.concat(r.items || []) : (r.items || []);
    SNS.next = r.next || null;
  } catch (e) { SNS.err = /not found|404|JSON/.test(e.message) ? "タイムラインは準備中です（運営のサーバーの更新待ち）" : e.message; }   // 中継が古い版のときの英語の文は出さない
  SNS.busy = false; SNS.loaded = true; snsPaint();
}
function snsMount(){
  if (!SNS.loaded) snsLoad(); else snsPaint();
  if (SNSV === "log") snsLoadRec().then(() => { if (SNSV === "log") snsPaint(); });
}
function snsConsentHtml(){
  const icon = SNS.icon || snsIcon();
  return `<section class="sns-consent"><h3>🍻 みんなのタイムラインをはじめる</h3><p class="sns-ctext">${esc(SNS_CONSENT)}</p>
    <ul class="sns-rules"><li>投稿するのは、あなたが「投稿」を押したときだけです（自動では投稿しません）</li><li>名前は呼び名だけ。投稿に時刻は出さず、日付だけです</li><li>投稿ごとに「自分だけ／チアーズメイト内」を選べます。自分の投稿はいつでも消せます</li></ul>
    <label class="sns-fld"><span>呼び名（20字まで・あとで変えられます）</span><input id="snsNick" maxlength="20" value="${esc(snsNick())}" autocomplete="off"></label>
    <span class="sns-lbl">アイコン</span><div class="sns-icons" role="group" aria-label="アイコン">${SNS_ICONS.map(x => `<button type="button" data-si="${x}" aria-pressed="${x === icon}">${x}</button>`).join("")}</div>
    <div class="acts"><button class="btn" type="button" data-sconsent="members">はじめる</button><button class="btn ghost" type="button" data-sconsent="self">自分だけで使う</button></div>
    <p class="mapnote">「自分だけで使う」：学習の記録・今日のまとめ・シェアカードは使えます。投稿は「自分だけ」になり、ほかの人には見えません（あとで変えられます）。</p></section>`;
}
function snsCardHtml(p){
  const b = p.body || {}, open = SNS.open === p.id;
  const chips = [...(b.items || []).map(x => { const a = snsAutoOf(x.k); return `<span class="sns-chip">${a[1]} ${esc(snsChip({...x, l: a[2], u: a[3]}))}</span>`; }),
    ...(b.manual || []).map(x => { const a = snsManOf(x.k); return `<span class="sns-chip man">${a[1]} ${esc(a[2])} ${snsMin(x.m)}${x.title ? `<small>${esc(x.title)}</small>` : ""}</span>`; })].join("");
  const menu = !open ? "" : p.mine
    ? `<div class="sns-menu">${p.day === snsToday() ? `<button type="button" class="btn ghost sm2" data-snslog>記録を直す・公開範囲</button><button type="button" class="btn ghost sm2" data-sshare>シェアカードを作る</button>` : ""}<button type="button" class="btn ghost sm2 sns-danger" data-sdel="${p.id}">この投稿を消す</button></div>`
    : SNS.rep === p.id ? `<div class="sns-menu"><b>通報の理由</b>${SNS_REASONS.map(([k, l]) => `<button type="button" class="btn ghost sm2" data-srep="${k}" data-pid="${p.id}">${l}</button>`).join("")}<button type="button" class="more" data-srepx>やめる</button></div>`
    : `<div class="sns-menu"><button type="button" class="btn ghost sm2" data-srep1="${p.id}">通報する</button><button type="button" class="btn ghost sm2" data-sblock="${p.id}">この人をブロック</button></div>`;
  return `<li class="sns-card${p.mine ? " me" : ""}"><div class="sns-h"><span class="sns-av" aria-hidden="true">${esc(p.icon || "🙂")}</span>
      <div><b>${esc(p.nick || "メンバー")}${p.mine ? "（あなた）" : ""}</b>${b.streak ? `<span class="sns-fire num">🔥 ${b.streak}日</span>` : ""}<small>${snsDayLabel(p.day)}・今日のまとめ${p.mine && p.vis === "self" ? "・🔒 自分だけ" : ""}</small></div>
      <button type="button" class="sns-dots" data-sopen="${p.id}" aria-expanded="${open}" aria-label="メニュー">…</button></div>
    <div class="sns-chips"><span class="sns-chip tot">⏱ <b class="num">${snsMin(b.total || 0)}</b></span>${chips}</div>
    ${b.note ? `<p class="sns-note">${esc(b.note)}</p>` : ""}
    ${p.mine && p.hidden ? `<p class="sns-warn">2人から通報があったため、ほかの人には見えていません。運営が確認します。</p>` : ""}
    <div class="sns-foot">${p.mine ? `<span class="sns-cheer own">🍻 乾杯 <b class="num">${p.n || 0}</b></span>${(p.by || []).length ? `<small class="sns-by">${p.by.slice(0, 8).map(x => esc(x.icon + " " + x.nick)).join("・")}${p.by.length > 8 ? ` ほか${p.by.length - 8}人` : ""}</small>` : ""}`
      : `<button type="button" class="sns-cheer" data-scheer="${p.id}" aria-pressed="${!!p.me}" aria-label="乾杯する">🍻 乾杯 <b class="num">${p.n || 0}</b></button>`}</div>${menu}</li>`;
}
function snsPhotoHtml(x){
  return `<li class="sns-card ph"><div class="sns-h"><span class="sns-av" aria-hidden="true">🍻</span><div><b>メンバー</b><small>${snsDayLabel(x.d)}・乾杯の写真</small></div></div>
    <p class="sns-what">${esc(x.what)}</p>${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy">` : ""}</li>`;
}
function snsListHtml(){
  const S = studyToday(), mt = snsMineToday(), F = SNS.filter;
  const posts = F === "photo" ? [] : SNS.items, oldest = SNS.next && posts.length ? posts[posts.length - 1].day : "";
  const photos = F === "log" ? [] : tlItems().filter(x => !oldest || x.d >= oldest);
  const list = [...posts.map(p => ({day: p.day, h: () => snsCardHtml(p)})), ...photos.map(x => ({day: x.d, h: () => snsPhotoHtml(x)}))].sort((a, b) => b.day.localeCompare(a.day));
  const off = !DEMO && !snsReady();
  return `<div class="sns-comp"><span class="sns-av" aria-hidden="true">${esc(snsIcon())}</span><button type="button" class="sns-ph" data-snslog>今日の学習を記録する…</button><button type="button" class="btn sns-plus" data-snslog>＋記録</button></div>
    ${S.total || S.items.length || mt ? `<button type="button" class="sns-todayline" data-snslog>🍻 今日のまとめ：合計 <b class="num">${snsMin(S.total)}</b>${mt ? "・投稿ずみ（押すと更新）" : "・まだ投稿していません"}</button>` : ""}
    <div class="chips sns-filter" role="group" aria-label="絞りこみ">${[["all", "みんな"], ["log", "学習の記録"], ["photo", "乾杯の写真"]].map(([k, l]) => `<button type="button" data-sf="${k}" aria-pressed="${F === k}">${l}</button>`).join("")}
      ${off ? "" : `<button type="button" class="sns-set" data-sprof aria-label="呼び名・公開範囲">⚙︎ 呼び名・公開範囲</button>`}</div>
    ${off ? `<p class="mapnote">投稿と🍻は、中継（運営のサーバー）につながると使えます。学習の記録とシェアカードは、いまも使えます。</p>` : ""}
    ${SNS.err ? `<p class="note">${/準備中/.test(SNS.err) ? esc(SNS.err) + "。" : `タイムラインを読めませんでした（${esc(SNS.err)}）。`}<button type="button" class="more" data-sreload>もう一度</button></p>` : ""}
    ${list.length ? `<ul class="sns-list">${list.map(x => x.h()).join("")}</ul>` : SNS.err ? "" : `<p class="mapnote">${SNS.loaded ? "まだ投稿がありません。今日のまとめを最初に投稿してみましょう。" : "読み込んでいます…"}</p>`}
    ${SNS.next && F !== "photo" ? `<div class="acts sns-morebox"><button type="button" class="btn ghost" id="snsMore"${SNS.busy ? " disabled" : ""}>${SNS.busy ? "読み込んでいます…" : "もっと見る"}</button></div>` : ""}`;
}

/* ---------- 学習を記録（自動の記録・アプリの外の学習・ひとこと・公開範囲・今日のまとめを投稿） ---------- */
function snsLogHtml(){
  const day = snsToday(), S = snsSummary(day), mt = snsMineToday(), vis = SNS.vis || (mt && mt.vis) || (SNS.prof && SNS.prof.vis) || "members";
  const titles = [...new Set(snsManual().map(x => x.title).filter(Boolean).reverse())].slice(0, 10);
  const mins = []; for (let m = 5; m <= 300; m += 5) mins.push(m);
  const canPost = DEMO || snsReady();
  return `<button class="more kzback" type="button" data-sback>← タイムライン</button><h2 class="my-h">学習を記録</h2>
    <section class="sns-box"><h3>今日の自動の記録<small>（アプリでやった分は入力いらず）</small></h3>
      ${S.items.length ? `<ul class="sns-rows">${S.items.map(x => `<li><span>${x.ic} ${esc(x.l)}</span><b class="num">${x.m ? snsMin(x.m) + "・" : ""}${x.n}${x.u}</b></li>`).join("")}</ul>`
        : `<p class="mapnote">まだ今日の練習の記録がありません。練習のタブで練習すると、ここに自動で入ります。</p>`}
      <p class="sns-hint">教材の分数は、教材の長さを1回ぶんの目安にしています。音読・2秒応答・単語の復習は回数だけ数えます。</p></section>
    <section class="sns-box"><h3>アプリの外でやったこと<small>（手で足す）</small></h3>
      <div class="chips sns-kinds" role="group" aria-label="種類">${SNS_MANUAL.map(([k, ic, l]) => `<button type="button" data-smk="${k}" aria-pressed="${SNS.mk === k}">${ic} ${l}</button>`).join("")}</div>
      <div class="sns-two"><label class="sns-fld"><span>時間</span><select id="snsMm" class="kzsel2">${mins.map(m => `<option value="${m}" ${m === SNS.mm ? "selected" : ""}>${snsMin(m)}</option>`).join("")}</select></label>
        <label class="sns-fld"><span>教材名（任意）</span><input id="snsTitle" maxlength="40" list="snsTitles" placeholder="例：金のフレーズ" autocomplete="off"><datalist id="snsTitles">${titles.map(t => `<option value="${esc(t)}">`).join("")}</datalist></label></div>
      <div class="acts"><button type="button" class="btn" id="snsAdd">＋ 足す</button></div>
      ${S.manual.length ? `<ul class="sns-rows man">${snsManualDay(day).map(x => { const a = snsManOf(x.k); return `<li><span>${a[1]} ${esc(a[2])}${x.title ? `<small>${esc(x.title)}</small>` : ""}</span><b class="num">${snsMin(x.m)}</b><button type="button" class="sns-x" data-smx="${esc(x.id)}" aria-label="消す">×</button></li>`; }).join("")}</ul>` : ""}</section>
    <section class="sns-box"><h3>ひとこと<small>（任意・140字）</small></h3><textarea id="snsNote" class="sns-ta" rows="2" maxlength="140" placeholder="例：空港の場面、やっと聞き取れた！">${esc(S.note)}</textarea><p class="sns-hint num" id="snsNoteN">${[...S.note].length}/140</p></section>
    <section class="sns-box"><h3>公開範囲</h3><div class="kzrate sns-vis" role="group" aria-label="公開範囲">${[["self", "自分だけ"], ["members", "チアーズメイト内"]].map(([k, l]) => `<button type="button" data-svis="${k}" aria-pressed="${vis === k}">${l}</button>`).join("")}</div></section>
    <button type="button" class="sns-post" id="snsPost"${canPost ? "" : " disabled"}>🍻 ${mt ? "今日のまとめを更新" : "今日のまとめを投稿"}（合計 ${snsMin(S.total)}）</button>
    <p class="sns-hint">投稿は1日1つ。同じ日にもう一度押すと、同じ投稿が新しくなります。投稿しない日も、記録はこの端末に残ります。${canPost ? "" : "投稿は中継につながると使えます。"}</p>
    <div class="acts"><button type="button" class="btn ghost" data-sshare>📤 シェアカードを作る</button></div>`;
}
async function snsPost(){
  const day = snsToday(), btn = $("snsPost");
  if (btn) btn.disabled = true;
  await snsLoadRec();
  const S = snsSummary(day), mt = snsMineToday(), vis = SNS.vis || (mt && mt.vis) || (SNS.prof && SNS.prof.vis) || "members";
  const body = {items: S.items.map(({k, m, n}) => ({k, m, n})), manual: S.manual, streak: S.streak, note: S.note};
  if (!S.total && !S.items.length && !S.manual.length && !S.note){ toast("まだ今日の記録がありません。練習するか、＋記録で足してください"); if (btn) btn.disabled = false; return; }
  if (DEMO){                                                             // デモ：この画面の中だけ（どこにも送らない）
    const p = {id: (mt && mt.id) || "demo-mine", day, kind: "daily", body: {...body, total: S.total}, nick: snsNick(), icon: snsIcon(), n: mt ? mt.n : 0, me: false, mine: true, vis, hidden: false, by: mt ? mt.by : []};
    SNS.items = [p, ...SNS.items.filter(x => x !== mt)];
    SNSV = null; SNS.filter = "all"; snsPaint(); toast("デモなので、どこにも送っていません（この画面の中だけ）"); return;
  }
  if (SNS.consent !== "yes"){ SNSV = null; snsPaint(); toast("はじめに、タイムラインの案内を読んで「はじめる」を押してください"); return; }
  try { await api("/api/post", {day, vis, body}); }
  catch (e) { toast("投稿できませんでした（" + e.message + "）", 4200); if ($("snsPost")) $("snsPost").disabled = false; return; }
  SNSV = null; SNS.filter = "all"; SNS.vis = null;
  await snsLoad(); toast(mt ? "今日のまとめを更新しました" : "今日のまとめを投稿しました 🍻");
}

/* ---------- 呼び名・アイコン・公開範囲・ブロックした人 ---------- */
function snsProfHtml(){
  const icon = SNS.icon || snsIcon(), vis = (SNS.prof && SNS.prof.vis) || "members", bl = SNS.blocked;
  return `<button class="more kzback" type="button" data-sback>← タイムライン</button><h2 class="my-h">呼び名・公開範囲</h2>
    <section class="sns-box"><label class="sns-fld"><span>呼び名（20字まで。受講生どうしでは呼び名だけが出ます）</span><input id="snsNick" maxlength="20" value="${esc(snsNick())}" autocomplete="off"></label>
      <span class="sns-lbl">アイコン</span><div class="sns-icons" role="group" aria-label="アイコン">${SNS_ICONS.map(x => `<button type="button" data-si="${x}" aria-pressed="${x === icon}">${x}</button>`).join("")}</div></section>
    <section class="sns-box"><h3>投稿の公開範囲（はじめの値）</h3><div class="kzrate sns-vis" role="group">${[["self", "自分だけ"], ["members", "チアーズメイト内"]].map(([k, l]) => `<button type="button" data-spvis="${k}" aria-pressed="${vis === k}">${l}</button>`).join("")}</div>
      <p class="sns-hint">投稿ごとにも変えられます。</p></section>
    <div class="acts"><button type="button" class="btn" id="snsProfSave">保存する</button></div>
    <section class="sns-box"><h3>ブロックした人</h3>${bl == null ? `<p class="mapnote">読み込んでいます…</p>` : bl.length ? `<ul class="sns-rows">${bl.map(b => `<li><span>${esc(b.icon)} ${esc(b.nick)}</span><button type="button" class="btn ghost sm2" data-sunb="${esc(b.ah)}">解除</button></li>`).join("")}</ul>` : `<p class="mapnote">いません。</p>`}
      <p class="sns-hint">ブロックした人の投稿は、あなたのタイムラインに出ません。</p></section>`;
}
async function snsProfLoad(){
  if (DEMO || !snsReady()){ SNS.blocked = SNS.blocked || []; snsPaint(); return; }
  try { const r = await api("/api/profile"); SNS.blocked = r.blocked || []; if (r.consent) SNS.prof = {nick: r.nick, icon: r.icon, vis: r.vis}; }
  catch (e) { SNS.blocked = []; toast("読み込めませんでした（" + e.message + "）"); }
  if (SNSV === "prof") snsPaint();
}
async function snsProfSave(extra){
  const nick = $("snsNick") ? $("snsNick").value.trim() : snsNick();
  if (!nick){ toast("呼び名を入れてください"); return false; }
  const body = {nick, icon: SNS.icon || snsIcon(), ...extra};
  if (DEMO || !snsReady()){ SNS.prof = {nick: nick.slice(0, 20), icon: body.icon, vis: body.consent || body.vis || (SNS.prof || {}).vis || "members"}; if (body.consent) SNS.consent = "yes"; return true; }
  try { const r = await api("/api/profile", body); SNS.prof = {nick: r.nick, icon: r.icon, vis: r.vis}; if (r.consent) SNS.consent = "yes"; return true; }
  catch (e) { toast("保存できませんでした（" + e.message + "）", 4200); return false; }
}

/* ---------- シェアカード（端末の canvas で作る。本名・顔写真・お店・リンク・鍵・URL は入れない） ---------- */
const snsShareText = S => `今日の英語 ${snsMin(S.total)}${S.streak ? `🔥${S.streak}日連続` : ""} #チアーズGO #英語学習`;
function snsShareHtml(){
  return `<button class="more kzback" type="button" data-sback>← タイムライン</button><h2 class="my-h">シェアする</h2>
    <div class="kzrate sns-size" role="group" aria-label="大きさ">${[[1350, "フィード 4:5"], [1920, "ストーリーズ 9:16"]].map(([h, l]) => `<button type="button" data-ssz="${h}" aria-pressed="${SNS_CARD === h}">${l}</button>`).join("")}</div>
    <div class="sns-cvbox"><canvas id="snsCv" class="sns-cv" width="1080" height="${SNS_CARD}" aria-label="シェアカード"></canvas></div>
    <p class="sns-hint">本名・顔・お店・アプリのリンクや鍵は入れません。画像はこの端末で作り、どこにも保存しません。</p>
    <div class="sns-share"><button type="button" data-sgo="sheet"><b>📤</b>Instagram など<small>共有シート</small></button><button type="button" data-sgo="x"><b>𝕏</b>X<small>投稿画面へ</small></button>
      <button type="button" data-sgo="threads"><b>@</b>Threads<small>投稿画面へ</small></button><button type="button" data-sgo="save"><b>⬇</b>保存<small>画像</small></button></div>`;
}
let SNS_LOGO = null;
const snsLogo = () => SNS_LOGO || (SNS_LOGO = new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = "icons/logo-w.png"; setTimeout(() => res(null), 3000); }));
async function snsDrawCard(cv){
  const S = studyToday(), W = cv.width, H = cv.height, g = cv.getContext("2d"), tall = H > 1500, texts = [];
  const F = (w, px) => `${w} ${px}px "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", system-ui, sans-serif`;
  const text = (t, x, y, font, color, align) => { g.font = font; g.fillStyle = color; g.textAlign = align || "left"; g.fillText(t, x, y); texts.push(String(t)); return g.measureText(t).width; };
  const rr = (x, y, w, h, r, fill) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); g.fillStyle = fill; g.fill(); };
  const bg = g.createLinearGradient(0, 0, W * .4, H);
  bg.addColorStop(0, "#1A2F66"); bg.addColorStop(.62, "#2F6FD6"); bg.addColorStop(1, "#7A93B8");
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const d = new Date(), P = 72;
  let y = tall ? 200 : 140;
  text("チアーズGO！", P, y, F(900, 64), "#fff");
  text(`${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`, W - P, y, F(600, 40), "rgba(255,255,255,.85)", "right");
  y += tall ? 170 : 120;
  text(`${snsNick()} の今日の英語`, P, y, F(700, 44), "#fff");
  y += tall ? 250 : 220;
  const h = Math.floor(S.total / 60), m = S.total % 60;
  let x = P;
  const big = (n, u) => { x += text(String(n), x, y, F(900, 210), "#fff") + 6; x += text(u, x, y, F(900, 76), "#fff") + 18; };
  if (h) big(h, "時間");
  if (m || !h) big(m, "分");
  y += 50;
  const chips = [...S.items.map(it => ({t: `${it.ic} ${snsChip(it)}`, v: it.m * 100 + it.n})), ...S.manual.map(it => { const a = snsManOf(it.k); return {t: `${a[1]} ${a[2]} ${snsMin(it.m)}`, v: it.m * 100}; })]
    .sort((a, b) => b.v - a.v).slice(0, tall ? 6 : 4);
  x = P; let cy = y;
  g.font = F(700, 38);
  chips.forEach(c => { const w = g.measureText(c.t).width + 52; if (x + w > W - P){ x = P; cy += 84; } rr(x, cy, w, 68, 20, "rgba(255,255,255,.18)"); text(c.t, x + 26, cy + 47, F(700, 38), "#fff"); x += w + 16; });
  y = cy + (chips.length ? 120 : 30) + (tall ? 60 : 0);
  const nC = ME ? Object.keys(myCountries(ME)).length : 0, boxes = [["🔥", S.streak, "日連続"], ["🌏", nC, "か国と乾杯"]].filter(b => b[1] > 0);   // 0 のものは載せない
  const bw = (W - P * 2 - 30 * (boxes.length - 1)) / boxes.length, bh = 210;
  boxes.forEach((b, i) => { const bx = P + i * (bw + 30); rr(bx, y, bw, bh, 36, "#fff");
    text(`${b[0]}${b[1]}`, bx + bw / 2, y + 120, F(900, 92), "#1A2F66", "center"); text(b[2], bx + bw / 2, y + 180, F(700, 36), "#1A2F66", "center"); });
  if (boxes.length) y += bh + (tall ? 140 : 70);
  const days = [...Array(7)].map((_, i) => dayKey(Date.now() - (6 - i) * 864e5)), vals = days.map(k => studyMinutes(k)), mx = Math.max(10, ...vals);
  const gh = Math.min(tall ? 360 : 240, H - 230 - y), gw = (W - P * 2) / 7;       // 下のハッシュタグに重ならない高さだけ使う
  if (gh >= 60){
    vals.forEach((v, i) => { const bh2 = Math.max(6, Math.round(v / mx * gh)); g.fillStyle = i === 6 ? "#FFD23F" : "rgba(214,226,255,.75)"; g.fillRect(P + i * gw + 4, y + gh - bh2, gw - 8, bh2); });
    text("この7日間", P, y + gh + 46, F(600, 32), "rgba(255,255,255,.85)");
  }
  text("#チアーズGO #英語学習", P, H - 80, F(700, 40), "#fff");
  const logo = await snsLogo();
  if (logo){ const lh = 64, lw = logo.width * lh / logo.height; g.drawImage(logo, W - P - lw, H - 80 - lh + 12, lw, lh); texts.push("[logo]"); }
  else text("Cheers mate", W - P, H - 80, F(700, 40), "#fff", "right");
  window.__snsCardTexts = texts;                                          // 試験用：カードに描いた文字（URL・鍵・本名が入っていないかを確かめる）
  return S;
}
const snsBlob = cv => new Promise(res => cv.toBlob(b => res(b), "image/png"));
async function snsShareGo(kind){
  const cv = $("snsCv"); if (!cv) return;
  const S = studyToday(), t = snsShareText(S);
  if (kind === "x"){ window.open("https://x.com/intent/post?text=" + encodeURIComponent(t), "_blank", "noopener"); return; }
  if (kind === "threads"){ window.open("https://www.threads.net/intent/post?text=" + encodeURIComponent(t), "_blank", "noopener"); return; }
  const blob = await snsBlob(cv), file = new File([blob], `cheersgo-${snsToday()}.png`, {type: "image/png"});
  if (kind === "sheet" && navigator.canShare && navigator.canShare({files: [file]})){
    try { await navigator.share({files: [file], text: t}); } catch (e) { if (e && e.name !== "AbortError") toast("共有できませんでした"); }
    return;
  }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast(kind === "sheet" ? "この端末は共有シートで画像を渡せないので、画像を保存しました。SNSのアプリから選んでください" : "画像を保存しました");
}

/* ---------- 描く・押したとき ---------- */
function snsPaint(){
  const el = $("snsTl"); if (!el) return;
  const consentNeeded = !SNSV && (DEMO ? SNS.consent !== "yes" : snsReady() && SNS.consent === "no");
  el.innerHTML = SNSV === "log" ? snsLogHtml() : SNSV === "share" ? snsShareHtml() : SNSV === "prof" ? snsProfHtml()
    : `<div class="sec-h"><h2>${SPARK}タイムライン</h2><p>${DEMO ? "デモの架空の投稿です（🍻・投稿はこの画面の中だけ）。" : ""}仲間の今日のまとめと乾杯の写真。受講生だけに見えます（名前は呼び名だけ・時刻は出しません・写真に名前は出しません）。</p></div>`
      + (consentNeeded ? snsConsentHtml() : snsListHtml());
  snsBind(el);
  if (SNSV === "share") snsDrawCard($("snsCv"));
}
function snsBind(el){
  const on = (sel, f) => el.querySelectorAll(sel).forEach(b => b.addEventListener("click", e => f(b, e)));
  on("[data-sback]", () => { SNSV = null; SNS.vis = null; if (SNS.loaded) snsPaint(); else snsLoad(); window.scrollTo(0, 0); });
  on("[data-sf]", b => { SNS.filter = b.dataset.sf; snsPaint(); });
  on("[data-sreload]", () => snsLoad());
  on("[data-sprof]", () => { SNSV = "prof"; SNS.icon = null; SNS.blocked = null; snsPaint(); window.scrollTo(0, 0); snsProfLoad(); });
  on("[data-sshare]", () => { SNSV = "share"; snsPaint(); window.scrollTo(0, 0); });
  on("[data-si]", b => { SNS.icon = b.dataset.si; el.querySelectorAll("[data-si]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); });
  on("[data-sconsent]", async b => {
    b.disabled = true;
    if (await snsProfSave({consent: b.dataset.sconsent})){ SNS.consent = "yes"; toast(b.dataset.sconsent === "self" ? "自分だけで使います（投稿はほかの人に見えません）" : "タイムラインをはじめました 🍻"); if (DEMO) snsPaint(); else snsLoad(); }
    else b.disabled = false;
  });
  on("[data-sopen]", b => { const id = isNaN(+b.dataset.sopen) ? b.dataset.sopen : +b.dataset.sopen; SNS.open = SNS.open === id ? null : id; SNS.rep = null; snsPaint(); });
  on("[data-srep1]", b => { SNS.rep = isNaN(+b.dataset.srep1) ? b.dataset.srep1 : +b.dataset.srep1; snsPaint(); });
  on("[data-srepx]", () => { SNS.rep = null; snsPaint(); });
  on("[data-srep]", async b => {
    const id = isNaN(+b.dataset.pid) ? b.dataset.pid : +b.dataset.pid;
    if (!DEMO){ try { await api("/api/report", {id, reason: b.dataset.srep}); } catch (e) { toast("通報できませんでした（" + e.message + "）"); return; } }
    SNS.items = SNS.items.filter(p => p.id !== id); SNS.open = SNS.rep = null; snsPaint();
    toast(DEMO ? "デモなので送っていません（通報すると、この投稿はあなたに表示されなくなります）" : "通報しました。この投稿はあなたに表示しません。運営が確認します");
  });
  on("[data-sblock]", async b => {
    const id = isNaN(+b.dataset.sblock) ? b.dataset.sblock : +b.dataset.sblock, p = SNS.items.find(x => x.id === id);
    if (!p || !confirm(`${p.nick} さんをブロックしますか？（この人の投稿があなたに見えなくなります。相手には知らせません）`)) return;
    if (DEMO){ SNS.items = SNS.items.filter(x => x.nick !== p.nick); SNS.open = null; snsPaint(); toast("デモなので送っていません"); return; }
    try { await api("/api/block", {id}); } catch (e) { toast("ブロックできませんでした（" + e.message + "）"); return; }
    SNS.open = null; toast("ブロックしました（呼び名・公開範囲から解除できます）"); snsLoad();
  });
  on("[data-sdel]", async b => {
    const id = isNaN(+b.dataset.sdel) ? b.dataset.sdel : +b.dataset.sdel;
    if (!confirm("この投稿を消しますか？（🍻も消えます。学習の記録はこの端末に残ります）")) return;
    if (!DEMO){ try { await api("/api/post/delete", {id}); } catch (e) { toast("消せませんでした（" + e.message + "）"); return; } }
    SNS.items = SNS.items.filter(p => p.id !== id); SNS.open = null; snsPaint(); toast("投稿を消しました");
  });
  on("[data-scheer]", async b => {
    const id = isNaN(+b.dataset.scheer) ? b.dataset.scheer : +b.dataset.scheer, p = SNS.items.find(x => x.id === id); if (!p || b.disabled) return;
    const was = !!p.me; p.me = !was; p.n = Math.max(0, (p.n || 0) + (was ? -1 : 1));   // 先に見た目を変える（つながらなかったら戻す）
    b.setAttribute("aria-pressed", String(p.me)); b.querySelector("b").textContent = p.n;
    if (p.me && !reduce){ b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop"); }
    if (DEMO) return;
    b.disabled = true;
    try { const r = await api("/api/cheer", {id}); p.me = !!r.on; p.n = r.n; }
    catch (e) { p.me = was; p.n = Math.max(0, p.n + (was ? 1 : -1)); toast("🍻できませんでした（" + e.message + "）"); }
    b.disabled = false; b.setAttribute("aria-pressed", String(p.me)); b.querySelector("b").textContent = p.n;
  });
  // 学習を記録
  on("[data-smk]", b => { SNS.mk = b.dataset.smk; el.querySelectorAll("[data-smk]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); });
  if ($("snsMm")) $("snsMm").addEventListener("change", e => { SNS.mm = +e.target.value; });
  if ($("snsAdd")) $("snsAdd").addEventListener("click", () => {
    const l = snsManual(), cut = dayKey(Date.now() - 60 * 864e5);
    l.push({id: "m" + Date.now().toString(36), day: snsToday(), k: SNS.mk, m: SNS.mm, title: $("snsTitle").value.trim().slice(0, 40)});
    store("sns-manual", JSON.stringify(l.filter(x => x.day >= cut).slice(-300)));
    if (snsReady()) api("/api/learn-event", {kind: "study_log", k: SNS.mk, m: SNS.mm}).catch(() => {});   // 投稿しない日もあるので、足したときに送る（学習ナレッジ。docs/knowledge-inventory.md）
    toast(`${snsManOf(SNS.mk)[2]} ${snsMin(SNS.mm)}を今日の記録に足しました`); snsPaint();
  });
  on("[data-smx]", b => { store("sns-manual", JSON.stringify(snsManual().filter(x => x.id !== b.dataset.smx))); snsPaint(); });
  if ($("snsNote")) $("snsNote").addEventListener("input", e => { const v = [...e.target.value].slice(0, 140).join(""); store("sns-note-" + snsToday(), v || null); $("snsNoteN").textContent = [...v].length + "/140"; });
  on("[data-svis]", b => { SNS.vis = b.dataset.svis; el.querySelectorAll("[data-svis]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); });
  if ($("snsPost")) $("snsPost").addEventListener("click", snsPost);
  // 呼び名・公開範囲
  on("[data-spvis]", b => { SNS.pvis = b.dataset.spvis; el.querySelectorAll("[data-spvis]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); });
  if ($("snsProfSave")) $("snsProfSave").addEventListener("click", async () => { if (await snsProfSave(SNS.pvis ? {vis: SNS.pvis} : {})){ SNS.pvis = null; if (!DEMO) SNS.loaded = false; toast("保存しました"); snsPaint(); } });
  on("[data-sunb]", async b => {
    if (!DEMO && snsReady()){ try { await api("/api/profile", {unblock: b.dataset.sunb}); } catch (e) { toast("解除できませんでした（" + e.message + "）"); return; } }
    SNS.blocked = (SNS.blocked || []).filter(x => x.ah !== b.dataset.sunb); snsPaint(); SNS.loaded = false; toast("ブロックを解除しました");
  });
  // シェアカード
  on("[data-ssz]", b => { SNS_CARD = +b.dataset.ssz; snsPaint(); });
  on("[data-sgo]", b => snsShareGo(b.dataset.sgo));
  // もっと見る（下までスクロールしたら自動で）
  const more = $("snsMore");
  if (more){
    more.addEventListener("click", () => snsLoad(true));
    if ("IntersectionObserver" in window){ const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting) && !SNS.busy){ io.disconnect(); snsLoad(true); } }); io.observe(more); }
  }
}

/* ================= みんな＞チャンネル（フェーズ2）：Discord/Slack 型のチャンネル＋スレッド ================= */
/* 出どころ（README「みんな＞チャンネル」・docs/relay-design.md・docs/channels.md）
   - 一覧・メッセージ・スレッド・既読・ミュート・ピン・検索・メンバー・@メンション・リアクション・通報・編集/削除・運営の管理は中継の /api/ch/*（relay/worker.js の ch()・chAdmin()）。
     試作は tools/live_server.py の Ch クラスが同じことをする
   - 同意（profiles の行・consent_at）はタイムラインと共通。呼び名・アイコンも共通（app/_part_sns.js の SNS_ICONS・snsProfSave）
   - デモ（#demo）は me.json の ch（架空の呼び名のチャンネル・メッセージ・スレッド）。端末の中だけで動き、どこにも送らない
   - テスト（tools/test_ch_ui.mjs）だけ、URL の ?as= で x-cg-user を切りかえられる（試作サーバーの uid() が許すだけ。本番の中継は x-cg-key も見るので、ここは効かない）
   名前は呼び名だけ・時刻は出さず日付と「今日の何分前」だけ。CSS は ch- で始まる名前だけ */
const CH_REACTS = ["🍻", "👍", "😂", "🙏", "👀", "🎉"];
const CH_REASONS = SNS_REASONS;
const CH_GROUP_LABEL = {cohort: "同期グループ", shuffle: "シャッフルクラス", group: "グループ"};
const CH = {
  loaded: false, busy: false, pending: false, err: "", consent: null, role: "member", channels: [], prefs: null,
  mentionN: 0, replyN: 0, newsN: 0, unreadN: 0, demo: false,
  view: null,                      // null＝一覧／"channel"／"thread"／"admin"
  curCh: null, msgs: [], msgsNext: null, msgsU: "",
  thread: null,                    // {root, replies, u}
  open: null, rep: null,           // 開いている「…」メニュー・通報の理由選び
  search: null, searchQ: "",
  members: null, mentionPick: null, mentionQuery: "", composeAlso: false,
  admin: null, adminTab: "channels", adminForm: null, adminMembers: null,
  composeMembers: null, composeMembersCh: undefined,
};
let CH_POLL_T = null, CH_MSG_T = null;
const CH_AS = new URLSearchParams(location.search).get("as");
// 本人用リンクが無いとき（?as= がある試作サーバーだけ）に x-cg-user を切りかえる。本番の中継は x-cg-key も見るので、ここは効かない
function chFetch(path, body){
  if (API_AUTH || !CH_AS) return api(path, body);
  return fetch(CG_API + path, {method: body ? "POST" : "GET", headers: {"Content-Type": "application/json", "x-cg-user": CH_AS}, ...(body ? {body: JSON.stringify(body)} : {})})
    .then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || ("エラー " + r.status)); return j; });
}
const chOn = () => !!ME;                                            // 先生リンク（viewer）でも使える。鍵なしには出さない
const chReady = () => apiOn() && !DEMO && (!!API_AUTH || !!CH_AS);
const chDayLabel = d => d === snsToday() ? "今日" : d === dayKey(Date.now() - 864e5) ? "昨日" : md(d);
const chWhen = m => m.day !== snsToday() ? chDayLabel(m.day) : m.minsAgo == null ? "" : m.minsAgo < 1 ? "たった今" : m.minsAgo < 60 ? `${m.minsAgo}分前` : `${Math.floor(m.minsAgo / 60)}時間前`;
const chRoleBadge = role => role === "owner" ? `<span class="ch-role own">オーナー</span>` : role === "staff" ? `<span class="ch-role staff">運営</span>` : role === "teacher" ? `<span class="ch-role tch">先生🎓</span>` : "";
const CH_URL_RE = /https?:\/\/[^\s<>"'）】」』]+/g;
function chLinkify(raw){
  let out = "", last = 0, m; CH_URL_RE.lastIndex = 0;
  while ((m = CH_URL_RE.exec(raw))){
    out += esc(raw.slice(last, m.index));
    const u = m[0].replace(/[.,!?、。]+$/, ""), tail = m[0].slice(u.length);
    out += `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a>${esc(tail)}`;
    last = m.index + m[0].length;
  }
  out += esc(raw.slice(last));
  return out;
}
// @呼び名 を太字の色つきに（自分あては背景色）。body は esc 済みの文字列
function chMentionize(bodyEsc){
  const my = esc(snsNick());
  return bodyEsc.replace(/@([^\s<]{1,20})/g, (m, n) => n === my ? `<mark class="ch-me">@${n}</mark>` : `<b class="ch-at">@${n}</b>`);
}
function chBodyHtml(body){ return chMentionize(chLinkify(body)).replace(/\n/g, "<br>"); }

/* ---------- デモ（me.json の ch。端末の中だけ） ---------- */
function chDemoInit(){
  if (CH.demo) return; CH.demo = true;
  const d = (ME && ME.ch) || {channels: [], msgs: {}};
  CH.channels = (d.channels || []).map(c => ({...c}));
  CH._msgs = JSON.parse(JSON.stringify(d.msgs || {}));
  CH.role = "member"; CH.consent = "yes"; CH.prefs = {remind: 1, mention: 1, reply: 1, news: 1};
  chSumBadges();
}
function chSumBadges(){
  CH.mentionN = CH.channels.reduce((s, c) => s + (c.mention || 0), 0);
  CH.newsN = CH.channels.filter(c => c.sec === "運営から" && !c.muted).reduce((s, c) => s + (c.unread || 0), 0);
  CH.unreadN = CH.channels.filter(c => !c.muted).reduce((s, c) => s + (c.unread || 0), 0);
}

/* ---------- 読み込み（一覧・ポーリング） ---------- */
async function chLoad(){
  if (!chOn()) return;
  if (DEMO){ chDemoInit(); CH.loaded = true; chPaint(); chBadgeApply(); return; }
  if (!chReady()){ CH.loaded = true; chPaint(); return; }
  if (CH.busy){ CH.pending = true; return; }   // 読み込み中にもう一度呼ばれたら、終わり次第もう一度（取りこぼさない）
  CH.busy = true; CH.err = "";
  try {
    const r = await chFetch("/api/ch/list");
    CH.consent = r.consent ? "yes" : "no";
    if (r.consent){ CH.channels = r.channels; CH.role = r.role; CH.mentionN = r.mentionN; CH.replyN = r.replyN; CH.newsN = r.newsN; CH.unreadN = r.unreadN; CH.prefs = r.prefs; }
  } catch (e){ CH.err = /not found|404|JSON/.test(e.message) ? "チャンネルは準備中です（運営のサーバーの更新待ち）" : e.message; }
  CH.busy = false; CH.loaded = true; chPaint(); chBadgeApply();
  if (CH.pending){ CH.pending = false; chLoad(); }
}
async function chPoll(){
  if (!chOn() || DEMO || !chReady() || CH.consent !== "yes") return;
  try {
    const r = await chFetch("/api/ch/poll");
    if (r.consent){ CH.mentionN = r.mentionN; CH.newsN = r.newsN; CH.replyN = r.replyN; CH.unreadN = r.unreadN; chBadgeApply(); if ($("chTl") && !CH.view) chPaint(); }
  } catch (e) {}
}
function chBadgeApply(){
  const n = CH.mentionN + CH.replyN + CH.newsN, t = $("tab-us"); if (!t) return;
  let i = t.querySelector(".tbdg");
  if (!n){ if (i) i.remove(); return; }
  if (!i){ i = document.createElement("i"); i.className = "tbdg"; i.setAttribute("aria-hidden", "true"); t.appendChild(i); }
  i.textContent = n > 99 ? "99+" : n;
}
function chBellLine(){
  if (!chOn() || (!CH.mentionN && !CH.replyN)) return "";
  return `<p class="ch-bellline">👥 @メンション <b class="num">${CH.mentionN}</b>・返信 <b class="num">${CH.replyN}</b></p>`;
}
function chHomeLineHtml(){
  if (!chOn()) return "";
  if (!CH.loaded && !DEMO) chLoad();
  if (DEMO && !CH.demo) chDemoInit();
  const withLast = CH.channels.filter(c => c.last && !c.muted).sort((a, b) => (b.last.day + b.unread).localeCompare(a.last.day + a.unread));
  const top = withLast.find(c => c.unread > 0) || withLast[0];
  if (!top) return "";
  return `<button type="button" class="ch-homeline" data-chhome>💬 <b>#${esc(top.name)}</b> ${esc(top.last.nick)}：${esc(top.last.body)}${top.unread ? `<span class="ch-homeu num">未読${top.unread}</span>` : ""}</button>`;
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-chhome]"); if (!b) return;
  USSEG = "ch"; if ($("pane-us").hidden) showTab("us"); else renderUs();
  window.scrollTo(0, 0);
});
// 通知を押したとき（開いているアプリには sw.js から postMessage・新しく開いたときは ?ch=&th= から）そのチャンネル／スレッドを開く
function chOpenFromParams(params){
  const ch = params.get("ch"); if (!ch || !chOn()) return;
  USSEG = "ch"; if ($("pane-us") && $("pane-us").hidden) showTab("us"); else renderUs();
  const th = params.get("th");
  setTimeout(() => { chOpenChannel(ch).then(() => { if (th) chOpenThread(+th); }); }, 60);
}
function chOpenFromUrl(url){ try { chOpenFromParams(new URL(url, location.href).searchParams); } catch (e) {} }
if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", e => { if (e.data && e.data.type === "cg-open") chOpenFromUrl(e.data.url); });

/* ---------- チャンネルを開く・もっと見る・ポーリング（since） ---------- */
function chMsgsOf(chid){ return DEMO ? (CH._msgs[chid] || []).map(m => ({...m})) : CH.msgs; }
async function chOpenChannel(chid){
  CH.view = "channel"; CH.curCh = CH.channels.find(c => c.id === chid) || {id: chid, name: chid, icon: "💬"};
  CH.msgs = []; CH.msgsNext = null; CH.msgsU = ""; CH.open = null; CH.rep = null; CH.search = null; CH.mentionPick = null;
  chPaint(); window.scrollTo(0, 0);
  if (DEMO){ chDemoInit(); CH.msgs = chMsgsOf(chid); CH.msgsU = chMaxU(CH.msgs); chPaint(); return; }
  if (!chReady()) return;
  CH.busy = true; chPaint();
  try {
    const r = await chFetch("/api/ch/msgs?ch=" + encodeURIComponent(chid));
    CH.curCh = r.channel; CH.msgs = r.messages; CH.msgsNext = r.next; CH.msgsU = chMaxU(CH.msgs);
    chMarkRead(chid);
  } catch (e) { CH.err = e.message; }
  CH.busy = false; chPaint();
  window.scrollTo(0, document.documentElement.scrollHeight);                  // 新しいのが下（Discord と同じ）。開いたら最新のところへ
}
const chMaxU = list => list.reduce((m, x) => x.u > m ? x.u : m, "");
function chMergeMsgs(list, updates, gone){
  const byId = new Map(list.map(x => [x.id, x]));
  for (const u of updates) byId.set(u.id, u);
  for (const g of gone || []) byId.delete(g);                                  // 消えた・かくれた（中継の gone）
  return [...byId.values()].sort((a, b) => a.id - b.id);
}
async function chMarkRead(chid){
  if (DEMO || !chReady()) return;
  const list = CH.msgs.filter(x => x.ch === chid || !x.ch);
  const lastId = list.length ? Math.max(...list.map(x => x.id)) : 0;
  if (lastId) chFetch("/api/ch/read", {ch: chid, last_id: lastId}).then(() => { const c = CH.channels.find(x => x.id === chid); if (c) c.unread = c.mention = 0; chBadgeApply(); }).catch(() => {});
}
async function chMoreMsgs(){
  if (!CH.msgsNext || CH.busy) return;
  CH.busy = true; chPaint();
  try {
    const r = await chFetch(`/api/ch/msgs?ch=${encodeURIComponent(CH.curCh.id)}&before=${CH.msgsNext}`);
    CH.msgs = chMergeMsgs(CH.msgs, r.messages); CH.msgsNext = r.next;
  } catch (e) {}
  CH.busy = false; chPaint();
}
async function chOpenThread(id){
  const seed = CH.msgs.find(x => x.id === id) || (CH.thread && CH.thread.root.id === id ? CH.thread.root : null);
  CH.view = "thread"; CH.thread = {root: seed || {id}, replies: [], u: ""}; CH.open = null; CH.rep = null; CH.mentionPick = null; CH.composeAlso = false;
  chPaint(); window.scrollTo(0, 0);
  if (DEMO){
    const d = (ME.ch && ME.ch.threads && ME.ch.threads[id]) || {root: seed, replies: []};
    CH.thread = {root: d.root || seed, replies: (d.replies || []).map(x => ({...x})), u: ""};
    chPaint(); return;
  }
  if (!chReady()) return;
  CH.busy = true; chPaint();
  try {
    const r = await chFetch("/api/ch/thread?id=" + id);
    CH.thread = {root: r.root, replies: r.replies, u: chMaxU([r.root, ...r.replies])};
  } catch (e) { CH.err = e.message; }
  CH.busy = false; chPaint();
}
function chBackFromThread(){
  CH.view = "channel"; CH.thread = null; chPaint();
  if (window.innerWidth < 900) window.scrollTo(0, 0);
}
async function chTick(){
  if (document.hidden || !ME || $("pane-us").hidden || DEMO || !chReady()) return;
  if (CH.view === "channel" && CH.curCh){
    try {
      const r = await chFetch(`/api/ch/msgs?ch=${encodeURIComponent(CH.curCh.id)}&since=${encodeURIComponent(CH.msgsU)}`);
      if (r.messages.length || (r.gone || []).length){ CH.msgs = chMergeMsgs(CH.msgs, r.messages, r.gone); CH.msgsU = chMaxU([...CH.msgs, {u: CH.msgsU}]); chPaint(); }
    } catch (e) {}
  } else if (CH.view === "thread" && CH.thread && CH.thread.root && CH.thread.root.id){
    try {
      const r = await chFetch(`/api/ch/thread?id=${CH.thread.root.id}&since=${encodeURIComponent(CH.thread.u)}`);
      if (r.root.id === CH.thread.root.id) CH.thread.root = r.root;
      if (r.replies.length || (r.gone || []).length){ CH.thread.replies = chMergeMsgs(CH.thread.replies, r.replies, r.gone); CH.thread.u = chMaxU([CH.thread.root, ...CH.thread.replies, {u: CH.thread.u}]); chPaint(); }
    } catch (e) {}
  }
}
function chPollStart(){
  clearInterval(CH_POLL_T); clearInterval(CH_MSG_T);
  CH_POLL_T = setInterval(chPoll, 45e3);
  CH_MSG_T = setInterval(chTick, 9e3);
  document.addEventListener("visibilitychange", () => { if (!document.hidden){ chPoll(); chTick(); } });
}

/* ---------- 一覧（セクションごと・未読太字・@は赤・ミュート） ---------- */
function chListHtml(){
  if (CH.consent === "no") return chConsentHtml();
  if (!CH.consent) return `<p class="loading">読み込んでいます…</p>`;
  const secs = [...new Set(CH.channels.map(c => c.sec))];
  const row = c => { const bold = c.unread > 0 && !c.muted; return `<button type="button" class="ch-row${c.muted ? " muted" : ""}" data-chopen="${esc(c.id)}">
      <span class="ch-ic" aria-hidden="true">${esc(c.icon || "💬")}</span>
      <span class="ch-rowmain"><span class="ch-name${bold ? " unread" : ""}">${c.group ? `<i class="ch-lock" aria-hidden="true">🔒</i>` : ""}#${esc(c.name)}</span>${c.pins ? `<small class="ch-pinn">📌${c.pins}</small>` : ""}
        ${typeof c.members === "number" ? `<small class="ch-gmem">メンバー${c.members}人</small>` : ""}
        ${c.last ? `<small class="ch-prev">${esc(c.last.nick)}：${esc(c.last.body)}</small>` : ""}</span>
      ${c.mention ? `<span class="ch-mn num">@${c.mention}</span>` : bold ? `<span class="ch-un num">${c.unread > 99 ? "99+" : c.unread}</span>` : ""}
      ${c.muted ? `<i class="ch-mute" aria-label="ミュート中">🔈×</i>` : ""}</button>`; };
  const canPush = typeof pushReady === "function" && pushReady() && store("cg-push") !== "1";
  return `<div class="ch-tools"><button type="button" class="btn ghost sm2" data-chsearch>🔍 検索</button>${chAnnounceLocal() ? `<button type="button" class="btn ghost sm2" data-chadmin>⚙ チャンネルの管理</button>` : ""}</div>
    ${canPush ? `<button type="button" class="btn ghost ch-pushbtn" data-chpush>🔔 通知を受け取る（@メンション・返信・お知らせ）</button>` : ""}
    ${CH.err ? `<p class="note">チャンネルを読めませんでした（${esc(CH.err)}）。<button type="button" class="more" data-chreload>もう一度</button></p>` : ""}
    ${secs.map(s => `<div class="sec">${esc(s)}</div><div class="ch-list">${CH.channels.filter(c => c.sec === s).map(row).join("")}</div>`).join("")}`;
}
function chConsentHtml(){
  return `<section class="sns-consent"><h3>👥 みんな＞チャンネルをはじめる</h3><p class="sns-ctext">${esc(SNS_CONSENT)}</p>
    <ul class="sns-rules"><li>チャンネル・スレッドでのやりとりは、チアーズメイトの会員と運営に見えます</li><li>名前は呼び名だけ。時刻は出さず、日付だけです</li><li>「…」から通報・ブロックができます</li></ul>
    <div class="acts"><button class="btn" type="button" data-cconsent="members">はじめる</button></div></section>`;
}

/* ---------- メッセージ1件（チャンネル・スレッドの両方で使う） ---------- */
function chMsgHtml(m, opts){
  opts = opts || {};
  const openMenu = CH.open === m.id, reporting = CH.rep === m.id;
  const canMod = chStaffLocal(), canPin = chAnnounceLocal();
  if (m.deleted) return `<li class="ch-msg del" data-chm="${m.id}"><div class="ch-h"><span class="ch-av" aria-hidden="true">${esc(m.icon)}</span><b>${esc(m.nick)}</b>${chRoleBadge(m.role)}<small>${esc(chWhen(m))}</small></div><p class="ch-deleted">このメッセージは削除されました</p></li>`;
  const menu = !openMenu ? "" : reporting
    ? `<div class="ch-menu"><b>通報の理由</b>${SNS_REASONS.map(([k, l]) => `<button type="button" class="btn ghost sm2" data-chrep="${k}" data-mid="${m.id}">${l}</button>`).join("")}<button type="button" class="more" data-chrepx>やめる</button></div>`
    : `<div class="ch-menu">
        <button type="button" class="btn ghost sm2" data-chreply="${m.id}">返信する</button>
        ${m.mine ? `<button type="button" class="btn ghost sm2" data-chedit="${m.id}">編集</button><button type="button" class="btn ghost sm2 sns-danger" data-chdel="${m.id}">削除</button>`
          : `<button type="button" class="btn ghost sm2" data-chrep1="${m.id}">通報する</button><button type="button" class="btn ghost sm2" data-chblk="${m.id}">この人をブロック</button>`}
        ${canPin ? `<button type="button" class="btn ghost sm2" data-chpin="${m.id}" data-pinon="${m.pinned ? 0 : 1}">${m.pinned ? "ピンを外す" : "ピン留め"}</button>` : ""}
        ${canMod && !m.mine ? `<button type="button" class="btn ghost sm2" data-chhide="${m.id}" data-hideon="${m.hidden ? 0 : 1}">${m.hidden ? "戻す" : "かくす"}</button><button type="button" class="btn ghost sm2 sns-danger" data-chrm="${m.id}">運営が消す</button>` : ""}
      </div>`;
  // 押されたリアクションだけ並べ、＋で6つから選ぶ（Discord と同じ。0件の絵文字を全部出すと読みにくい）
  const used = CH_REACTS.map(e => [e, (m.reacts || []).find(x => x.emo === e && x.n > 0)]).filter(([, r]) => r);
  const reacts = used.map(([e, r]) => `<button type="button" class="ch-react${r.me ? " on" : ""}" data-chrx="${m.id}" data-emo="${e}"${r.by && r.by.length ? ` title="${esc(r.by.join("・"))}"` : ""}>${e}<b class="num">${r.n}</b></button>`).join("")
    + (CH.rx === m.id ? `<span class="ch-rxpick">${CH_REACTS.map(e => `<button type="button" class="ch-react" data-chrx="${m.id}" data-emo="${e}" aria-label="${e}を押す">${e}</button>`).join("")}</span>`
      : `<button type="button" class="ch-react ch-rxadd" data-chrxadd="${m.id}" aria-label="リアクションを足す">☺︎＋</button>`);
  const thread = !opts.inThread && m.reply_n ? `<button type="button" class="ch-thread" data-chthread="${m.id}">💬 返信 ${m.reply_n}件${m.repliers && m.repliers.length ? `<span class="ch-repav">${m.repliers.slice(0, 3).map(r => esc(r.icon)).join("")}</span>` : ""}${m.last_reply ? `<small>最後の返信 ${esc(chDayLabel(m.last_reply))}</small>` : ""}</button>` : "";
  return `<li class="ch-msg${m.mine ? " me" : ""}${m.also ? " also" : ""}" data-chm="${m.id}">
    <div class="ch-h"><span class="ch-av" aria-hidden="true">${esc(m.icon)}</span><b>${esc(m.nick)}</b>${chRoleBadge(m.role)}<small>${esc(chWhen(m))}${m.edited ? "・（編集済み）" : ""}${m.pinned ? "・📌" : ""}</small>
      <button type="button" class="ch-dots" data-chdots="${m.id}" aria-expanded="${openMenu}" aria-label="メニュー">…</button></div>
    ${m.also ? `<p class="ch-alsonote">↪ スレッドへの返信もここに</p>` : ""}
    ${m.hidden ? `<p class="sns-warn">通報があったため、ほかの人には見えていません。運営が確認します。</p>` : ""}
    <p class="ch-body">${chBodyHtml(m.body || "")}</p>
    <div class="ch-reacts">${reacts}</div>
    ${thread}${menu}</li>`;
}
const chStaffLocal = () => CH.role === "owner" || CH.role === "staff";
const chAnnounceLocal = () => chStaffLocal() || CH.role === "teacher";

/* ---------- チャンネルを開いた画面：ピン・メッセージ・入力欄 ---------- */
function chPinsHtml(){
  const pinned = CH.msgs.filter(x => x.pinned && !x.parent);
  if (!pinned.length) return "";
  return `<div class="ch-pins"><b>📌 ピン ${pinned.length}件</b>${pinned.slice(0, 3).map(p => `<button type="button" class="ch-pinrow" data-chthread="${p.id}">${esc(p.nick)}：${esc((p.body || "").slice(0, 40))}</button>`).join("")}</div>`;
}
function chDaySplit(list){
  const out = []; let last = null;
  for (const m of list){ if (m.day !== last){ out.push({day: m.day}); last = m.day; } out.push(m); }
  return out;
}
function chChannelHtml(noCompose){
  const c = CH.curCh, root = m => !m.parent;
  const list = chDaySplit(CH.msgs.filter(root));
  return `<div class="ch-top"><button type="button" class="more" data-chback>‹ みんな</button><b>#${esc(c.icon ? c.icon + " " : "")}${esc(c.name)}</b>${c.topic ? `<small>${esc(c.topic)}</small>` : ""}
      <button type="button" class="ch-mutebtn" data-chmute aria-pressed="${!!chCurMuted()}">${chCurMuted() ? "🔈×" : "🔔"}</button></div>
    ${chPinsHtml()}
    ${CH.msgsNext ? `<div class="acts"><button type="button" class="btn ghost sm2" id="chMore"${CH.busy ? " disabled" : ""}>${CH.busy ? "読み込んでいます…" : "もっと前を読む"}</button></div>` : ""}
    <ul class="ch-msgs">${list.map(x => "id" in x ? chMsgHtml(x) : `<li class="ch-day">${esc(chDayLabel(x.day))}</li>`).join("")}</ul>
    ${noCompose ? "" : chComposeHtml(c.id, null)}`;
}
function chCurMuted(){ const c = CH.channels.find(x => x.id === (CH.curCh || {}).id); return c ? c.muted : false; }
function chComposeHtml(chid, parentId){
  const c = CH.channels.find(x => x.id === chid) || CH.curCh || {};
  if (c.post === "staff" && !chAnnounceLocal()) return `<p class="mapnote ch-locked">このチャンネルは運営・先生だけが書けます。</p>`;
  const canAll = chAnnounceLocal() && c.post === "staff";
  return `<div class="ch-compose"><div class="ch-mentionbox" id="chMentionBox" hidden></div>
    <div class="ch-comprow"><textarea id="chInput" class="ch-ta" rows="1" maxlength="2000" placeholder="${parentId ? "スレッドに返信…" : `#${esc(c.name || "")} へ送る…`}" aria-label="メッセージ（Enterで改行・${navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}+Enterで送信）"></textarea>
    <button type="button" class="ch-send" id="chSend" data-chsend="${chid}"${parentId ? ` data-chparent="${parentId}"` : ""}>送る</button></div>
    ${parentId ? `<label class="ch-also"><input type="checkbox" id="chAlso" ${CH.composeAlso ? "checked" : ""}> チャンネルにも送る</label>` : ""}
    ${canAll ? `<div class="ch-compacts"><button type="button" class="btn ghost sm2" data-chmention="all">@みんな</button></div>` : ""}</div>`;
}

/* ---------- スレッド（Slack 型：全画面／900px以上は右に横並び） ---------- */
function chThreadHtml(){
  const t = CH.thread, root = t.root, list = chDaySplit(t.replies);
  return `<div class="ch-threadwrap"><div class="ch-threadtop"><button type="button" class="more" data-chback>‹ #${esc((CH.curCh || {}).name || "")}</button><b>スレッド</b></div>
    <ul class="ch-msgs ch-root">${chMsgHtml(root, {inThread: true})}</ul>
    <p class="ch-replycount">返信 ${root.reply_n || 0}件</p>
    <ul class="ch-msgs ch-replies">${list.map(x => "id" in x ? chMsgHtml(x, {inThread: true}) : `<li class="ch-day">${esc(chDayLabel(x.day))}</li>`).join("")}</ul>
    ${chComposeHtml((CH.curCh || {}).id, root.id)}</div>`;
}

/* ---------- 検索 ---------- */
function chSearchHtml(){
  const q = CH.searchQ, res = CH.search || [];
  return `<div class="ch-top"><button type="button" class="more" data-chback2>‹ みんな</button><b>検索</b></div>
    <div class="ch-searchbox"><input id="chSearchQ" value="${esc(q)}" placeholder="ことばで探す" autocomplete="off"><button type="button" class="btn sm2" id="chSearchGo">検索</button></div>
    ${CH.search === null ? "" : res.length ? `<ul class="ch-msgs">${res.map(m => `<li class="ch-searchrow" data-chthread="${m.parent || m.id}"><span class="ch-ic">${esc(m.icon)}</span><div><b>${esc(m.nick)}</b><small>${esc(chDayLabel(m.day))}</small><p>${esc((m.body || "").slice(0, 80))}</p></div></li>`).join("")}</ul>` : `<p class="mapnote">見つかりませんでした。</p>`}`;
}

/* ---------- 運営・先生の管理（チャンネルの作成・変更・並び・アーカイブ／通報の一覧／運営にする・外す） ---------- */
function chAdminHtml(){
  const a = CH.admin || {reports: [], channels: []}, tab = CH.adminTab;
  const tabs = [["channels", "チャンネル"], ["reports", `通報${a.reports.length ? `（${a.reports.length}）` : ""}`], ["roles", "運営にする・外す"]];
  const body = tab === "channels" ? chAdminChannelsHtml(a) : tab === "reports" ? chAdminReportsHtml(a) : chAdminRolesHtml();
  return `<div class="ch-top"><button type="button" class="more" data-chback2>‹ みんな</button><b>チャンネルの管理</b></div>
    <div class="chips">${tabs.map(([k, l]) => `<button type="button" data-chatab="${k}" aria-pressed="${tab === k}">${l}</button>`).join("")}</div>${body}`;
}
function chAdminChannelsHtml(a){
  if (CH.adminMembers) return chAdminMembersHtml();
  const groups = a.groups || {};
  const row = c => `<li class="ch-adminrow${c.archived ? " archived" : ""}"><span class="ch-ic">${esc(c.icon)}</span><b>#${esc(c.name)}</b><small>${esc(c.sec || "")}・${c.post === "staff" ? "運営/先生だけ書ける" : "全員書ける"}${groups[c.id] ? `・🔒${esc(CH_GROUP_LABEL[groups[c.id]] || "グループ")}` : ""}${c.archived ? "・アーカイブ済み" : ""}</small>
    <div class="acts"><button type="button" class="more" data-chaedit="${esc(c.id)}">編集</button>${groups[c.id] ? `<button type="button" class="more" data-chamembers="${esc(c.id)}">メンバー</button>` : ""}<button type="button" class="more" data-chaarchive="${esc(c.id)}" data-on="${c.archived ? 0 : 1}">${c.archived ? "戻す" : "アーカイブ"}</button></div></li>`;
  const f = CH.adminForm, isNew = !f || !f.id, group = f && f.group;
  return `<section class="ch-box"><h3>${f && f.id ? "チャンネルを編集" : "チャンネルを作る"}</h3>
    <label class="sns-fld"><span>名前（20字まで）</span><input id="chaName" maxlength="20" value="${esc((f && f.name) || "")}"></label>
    <label class="sns-fld"><span>絵文字アイコン</span><input id="chaIcon" maxlength="8" value="${esc((f && f.icon) || "💬")}"></label>
    <label class="sns-fld"><span>説明（60字まで）</span><input id="chaTopic" maxlength="60" value="${esc((f && f.topic) || "")}"></label>
    ${isNew ? `<div class="sns-fld"><span>チャンネルの種類</span><div class="chips">${[["", "ふつう"], ["cohort", "同期グループ"], ["shuffle", "シャッフルクラス"], ["group", "グループ"]]
        .map(([k, l]) => `<button type="button" data-chagroup="${k}" aria-pressed="${(group || "") === k}">${l}</button>`).join("")}</div></div>`
      : (group ? `<p class="mapnote">🔒${esc(CH_GROUP_LABEL[group] || "グループ")}（作ったあとは種類を変えられません）</p>` : "")}
    ${group ? "" : `<label class="sns-fld"><span>セクション</span><input id="chaSec" maxlength="20" value="${esc((f && f.sec) || "みんなの部屋")}"></label>
    <div class="chips"><button type="button" data-chapost="all" aria-pressed="${!f || f.post !== "staff"}">全員書ける</button><button type="button" data-chapost="staff" aria-pressed="${!!(f && f.post === "staff")}">運営と先生だけ</button></div>`}
    <div class="acts"><button type="button" class="btn" id="chaSave">${f && f.id ? "保存する" : "作る"}</button>${f && f.id ? `<button type="button" class="more" id="chaCancel">やめる</button>` : ""}</div></section>
  <ul class="ch-rows">${a.channels.map(row).join("")}</ul>`;
}
// グループのメンバー編集：人を名前で探してチェック→保存で追加・外すの差分を送る
function chAdminMembersHtml(){
  const st = CH.adminMembers, people = (CH.admin && CH.admin.people) || [], q = st.q.toLowerCase();
  const rows = people.filter(p => !q || (p.nick || "").toLowerCase().includes(q) || (p.label || "").toLowerCase().includes(q));
  return `<div class="ch-top"><button type="button" class="more" data-chamemberback>‹ チャンネル</button><b>メンバー（${st.sel.size}人）</b></div>
    <input id="chamQ" value="${esc(st.q)}" placeholder="名前で探す" autocomplete="off">
    <ul class="ch-rows ch-ammemlist">${rows.map(p => `<li class="ch-adminrow"><label class="ch-amrow"><input type="checkbox" data-chamid="${esc(p.id)}" ${st.sel.has(p.id) ? "checked" : ""}>
      <b>${esc(p.label || p.nick || "")}</b>${p.nick && p.label ? `<small>（${esc(p.nick)}）</small>` : ""}${chRoleBadge(p.role)}</label></li>`).join("") || `<li class="mapnote">見つかりません</li>`}</ul>
    <div class="acts"><button type="button" class="btn" id="chamSave">保存する</button></div>`;
}
function chAdminReportsHtml(a){
  if (!a.reports.length) return `<p class="mapnote">通報されたメッセージはありません。</p>`;
  return `<ul class="ch-rows">${a.reports.map(r => `<li class="ch-adminrow"><b>${esc(r.nick || "メンバー")}</b><small>${esc(r.ch)}・通報${r.reports}件（${esc(r.reasons || "")}）${r.hidden ? "・かくれています" : ""}</small>
    <p>${esc((r.body || "").slice(0, 100))}</p>
    <div class="acts">${r.hidden ? `<button type="button" class="more" data-chashow="${r.id}">戻す</button>` : `<button type="button" class="more" data-chahide="${r.id}">かくす</button>`}<button type="button" class="more sns-danger" data-charemove="${r.id}">消す</button></div></li>`).join("")}</ul>`;
}
function chAdminRolesHtml(){
  const ms = CH.members || [];
  return `<p class="mapnote">運営にすると、通報の確認・チャンネルの管理・他人のメッセージのモデレーションができます。</p>
    <ul class="ch-rows">${ms.filter(m => m.role !== "owner" && m.role !== "teacher").map(m => `<li class="ch-adminrow"><span class="ch-ic">${esc(m.icon)}</span><b>${esc(m.nick)}</b>${chRoleBadge(m.role)}
      <div class="acts">${m.role === "staff" ? `<button type="button" class="more" data-charole="${m.id}" data-role="member">外す</button>` : `<button type="button" class="more" data-charole="${m.id}" data-role="staff">運営にする</button>`}</div></li>`).join("")}</ul>`;
}

/* ---------- 押したときの動き ---------- */
async function chConsent(){
  if (DEMO){ CH.consent = "yes"; chPaint(); return; }
  try { await chFetch("/api/profile", {consent: "members", nick: snsNick(), icon: snsIcon()}); CH.consent = "yes"; chLoad(); }
  catch (e) { toast("はじめられませんでした（" + e.message + "）", 4200); }
}
async function chSend(chid, parentId){
  const ta = $("chInput"); if (!ta) return;
  const body = ta.value; if (!body.trim()) return;
  const also = parentId && $("chAlso") ? $("chAlso").checked : false;
  const mentions = (CH.mentionPick || []).map(x => x.id);
  ta.disabled = true;
  if (DEMO){
    const m = {id: "demo" + Date.now(), ch: chid, parent: parentId || null, day: snsToday(), minsAgo: 0, nick: snsNick(), icon: snsIcon(), role: "member", mine: true,
      body, edited: false, deleted: false, hidden: false, also: !!also, reply_n: 0, last_reply: null, repliers: [], reacts: [], pinned: false};
    if (parentId){ CH.thread.replies.push(m); const r = CH.thread.root; r.reply_n = (r.reply_n || 0) + 1; }
    else CH.msgs.push(m);
    ta.value = ""; CH.mentionPick = null; ta.disabled = false; chPaint(); window.scrollTo(0, document.documentElement.scrollHeight);
    toast("デモなので、どこにも送っていません（この画面の中だけ）"); return;
  }
  try {
    const r = await chFetch("/api/ch/post", {ch: chid, body, parent: parentId || undefined, also, mentions});
    if (parentId){ CH.thread.replies.push(r.message); CH.thread.root.reply_n = (CH.thread.root.reply_n || 0) + 1; CH.thread.u = chMaxU([CH.thread.root, ...CH.thread.replies]); }
    else { CH.msgs.push(r.message); CH.msgsU = chMaxU(CH.msgs); }
    ta.value = ""; CH.mentionPick = null;
  } catch (e) { toast("送れませんでした（" + e.message + "）", 4200); }
  ta.disabled = false; chPaint(); window.scrollTo(0, document.documentElement.scrollHeight);
  const ta2 = $("chInput"); if (ta2) ta2.focus({preventScroll: true});
}
async function chReact(id, emo){
  const list = CH.view === "thread" ? [CH.thread.root, ...CH.thread.replies] : CH.msgs;
  const m = list.find(x => x.id === id); if (!m) return;
  const was = (m.reacts || []).find(x => x.emo === emo);
  m.reacts = (m.reacts || []).filter(x => x.emo !== emo);
  if (!was) m.reacts.push({emo, n: 1, me: true});
  else if (!was.me) m.reacts.push({...was, n: was.n + 1, me: true});          // ほかの人が押していて自分はまだ → 足す
  else if (was.n > 1) m.reacts.push({...was, n: was.n - 1, me: false});      // 自分の分を取り消す
  CH.rx = null; chPaint();
  if (DEMO){ toast("デモなので送っていません"); return; }
  try { const r = await chFetch("/api/ch/react", {id, emo}); m.reacts = r.reacts.map(x => ({...x, me: x.emo === emo ? r.on : (m.reacts.find(y => y.emo === x.emo) || {}).me})); }
  catch (e) { toast("できませんでした（" + e.message + "）"); }
  chPaint();
}
async function chDelete(id){
  if (!confirm("このメッセージを消しますか？")) return;
  if (!DEMO){ try { await chFetch("/api/ch/delete", {id}); } catch (e) { toast("消せませんでした（" + e.message + "）"); return; } }
  // 返信は一覧から外して親の数を減らす。親は返信が残っていれば「削除されました」、なければ外す（中継と同じ見え方）
  const isReply = !!(CH.thread && CH.thread.replies.some(x => x.id === id));
  if (isReply){
    CH.thread.replies = CH.thread.replies.filter(x => x.id !== id);
    const r = CH.thread.root; r.reply_n = Math.max((r.reply_n || 1) - 1, 0);
    CH.msgs = CH.msgs.map(m => m.id === r.id ? {...m, reply_n: r.reply_n} : m).filter(m => m.id !== id);
  } else {
    const keep = m => !(m.id === id && !(m.reply_n > 0));
    CH.msgs = CH.msgs.filter(keep).map(m => m.id === id ? {...m, deleted: true, body: null} : m);
    if (CH.thread && CH.thread.root.id === id){ if (CH.thread.root.reply_n > 0) CH.thread.root = {...CH.thread.root, deleted: true, body: null}; else { CH.view = "channel"; CH.thread = null; } }
  }
  CH.open = null; chPaint(); toast("消しました");
}
async function chEdit(id){
  const list = CH.view === "thread" ? [CH.thread.root, ...CH.thread.replies] : CH.msgs;
  const m = list.find(x => x.id === id); if (!m) return;
  const next = prompt("本文を直す（2000字まで）", m.body); if (next == null || !next.trim()) return;
  if (!DEMO){ try { await chFetch("/api/ch/edit", {id, body: next}); } catch (e) { toast("直せませんでした（" + e.message + "）"); return; } }
  m.body = next; m.edited = true; chPaint();
}
async function chReport(id, reason){
  if (!DEMO){ try { await chFetch("/api/ch/report", {id, reason}); } catch (e) { toast("通報できませんでした（" + e.message + "）"); return; } }
  CH.open = CH.rep = null; chPaint(); toast(DEMO ? "デモなので送っていません" : "通報しました。運営が確認します");
}
async function chBlock(id){
  const list = CH.view === "thread" ? [CH.thread.root, ...CH.thread.replies] : CH.msgs;
  const m = list.find(x => x.id === id); if (!m) return;
  if (!confirm(`${m.nick} さんをブロックしますか？（この人のメッセージが見えなくなります。相手には知らせません）`)) return;
  if (DEMO){ toast("デモなので送っていません"); CH.open = null; chPaint(); return; }
  try { await chFetch("/api/block", {id}); CH.open = null; toast("ブロックしました"); chOpenChannel(CH.curCh.id); } catch (e) { toast("できませんでした（" + e.message + "）"); }
}
async function chMute(){
  const c = CH.channels.find(x => x.id === CH.curCh.id); if (!c) return;
  c.muted = !c.muted; chSumBadges(); chPaint(); chBadgeApply();
  if (!DEMO) chFetch("/api/ch/mute", {ch: c.id, on: c.muted}).catch(() => {});
}
async function chPin(id, on){
  const m = CH.msgs.find(x => x.id === id); if (m) m.pinned = !!on;
  CH.open = null; chPaint();
  if (!DEMO) chFetch("/api/ch/pin", {id, on}).catch(() => {});
}
async function chModerate(id, action){
  const list = CH.view === "thread" ? [CH.thread.root, ...CH.thread.replies] : CH.msgs;
  if (!DEMO){ try { await chFetch("/api/ch/admin", {target: "message", action, id}); } catch (e) { toast(e.message); return; } }
  if (action === "hide" || action === "show") list.forEach(m => { if (m.id === id) m.hidden = action === "hide"; });
  if (action === "remove"){ CH.msgs = CH.msgs.filter(m => m.id !== id); if (CH.thread) CH.thread.replies = CH.thread.replies.filter(m => m.id !== id); }
  CH.open = null; chPaint();
}
async function chPushOn(){
  if (typeof pushSubscribe !== "function") return;
  let p = "default"; try { p = Notification.permission === "granted" ? "granted" : await Notification.requestPermission(); } catch (e) {}
  if (p !== "granted"){ toast("通知が許可されませんでした"); return; }
  const ok = await pushSubscribe();
  toast(ok ? "通知をオンにしました" : "通知を設定できませんでした");
  chPaint();
}
async function chMentionLoad(){
  if (CH.members) return;
  if (DEMO){ CH.members = ((ME.ch || {}).members || []).map(x => ({...x})); return; }
  try { const r = await chFetch("/api/ch/members"); CH.members = r.members; CH.canAll = r.all; } catch (e) { CH.members = []; }
}
// 投稿欄の @ 候補はいま開いているチャンネルを渡す（グループなら、メンバー＋運営・先生だけが返る）。運営の「運営にする・外す」タブの全員一覧（chMentionLoad・CH.members）とは別のキャッシュ
async function chComposeMembersLoad(chid){
  if (CH.composeMembers && CH.composeMembersCh === chid) return;
  if (DEMO){ CH.composeMembers = ((ME.ch || {}).members || []).map(x => ({...x})); CH.composeMembersCh = chid; return; }
  try { const r = await chFetch("/api/ch/members" + (chid ? "?ch=" + encodeURIComponent(chid) : "")); CH.composeMembers = r.members; CH.composeMembersCh = chid; }
  catch (e) { CH.composeMembers = []; CH.composeMembersCh = chid; }
}
function chMentionBoxHtml(){
  const q = CH.mentionQuery.toLowerCase();
  const cands = (CH.composeMembers || []).filter(m => m.nick.toLowerCase().includes(q)).slice(0, 6);
  if (!cands.length) return "";
  return cands.map(m => `<button type="button" class="ch-mcand" data-chpickm="${m.id}" data-nick="${esc(m.nick)}">${esc(m.icon)} ${esc(m.nick)}</button>`).join("");
}

/* ---------- 検索の実行 ---------- */
async function chDoSearch(){
  const q = ($("chSearchQ") || {}).value || ""; CH.searchQ = q;
  if (!q.trim()){ CH.search = []; chPaint(); return; }
  if (DEMO){ const all = Object.values((ME.ch || {}).msgs || {}).flat(); CH.search = all.filter(m => (m.body || "").includes(q)); chPaint(); return; }
  try { const r = await chFetch("/api/ch/search?q=" + encodeURIComponent(q)); CH.search = r.messages; } catch (e) { CH.search = []; }
  chPaint();
}

/* ---------- 運営の管理の動き ---------- */
async function chAdminLoad(){
  if (DEMO){ CH.admin = {reports: [], channels: CH.channels, groups: {}, people: []}; return; }
  try { CH.admin = await chFetch("/api/ch/admin"); } catch (e) { CH.admin = {reports: [], channels: CH.channels, groups: {}, people: []}; }
}
async function chAdminMembersOpen(chid){
  if (DEMO){ CH.adminMembers = {ch: chid, orig: new Set(), sel: new Set(), q: ""}; return; }
  try { const r = await chFetch("/api/ch/admin?members=" + encodeURIComponent(chid)); CH.adminMembers = {ch: chid, orig: new Set(r.members || []), sel: new Set(r.members || []), q: ""}; }
  catch (e) { CH.adminMembers = {ch: chid, orig: new Set(), sel: new Set(), q: ""}; }
}
async function chAdminMembersSave(){
  const st = CH.adminMembers; if (!st) return;
  const add = [...st.sel].filter(id => !st.orig.has(id)), remove = [...st.orig].filter(id => !st.sel.has(id));
  if (DEMO){ toast("デモなので送っていません"); CH.adminMembers = null; chPaint(); return; }
  try {
    if (add.length) await chFetch("/api/ch/admin", {target: "member", action: "add", ch: st.ch, ids: add});
    if (remove.length) await chFetch("/api/ch/admin", {target: "member", action: "remove", ch: st.ch, ids: remove});
    toast("保存しました"); CH.adminMembers = null; await chAdminLoad(); await chLoad(); chPaint();
  } catch (e) { toast(e.message, 4200); }
}
async function chAdminSave(){
  const f = {name: $("chaName").value, icon: $("chaIcon").value, topic: $("chaTopic").value, post: CH.adminForm && CH.adminForm.post};
  if ($("chaSec")) f.sec = $("chaSec").value;
  if (DEMO){ toast("デモなので送っていません"); CH.adminForm = null; chPaint(); return; }
  try {
    if (CH.adminForm && CH.adminForm.id) await chFetch("/api/ch/admin", {target: "channel", action: "update", id: CH.adminForm.id, ...f});
    else await chFetch("/api/ch/admin", {target: "channel", action: "create", ...f, group: (CH.adminForm && CH.adminForm.group) || undefined});
    toast("保存しました"); CH.adminForm = null; await chAdminLoad(); await chLoad(); chPaint();
  } catch (e) { toast(e.message, 4200); }
}

/* ---------- 描く・押したとき ---------- */
function chPaint(){
  const el = $("chTl"); if (!el) return;
  // 10秒ごとの新着で描き直しても、書きかけの文・カーソル・@の選択を消さない
  const key = () => CH.view + ":" + ((CH.curCh || {}).id || "") + ":" + (((CH.thread || {}).root || {}).id || "");
  const ta0 = $("chInput"), draft = ta0 && !ta0.disabled ? {k: key(), v: ta0.value, a: ta0.selectionStart, b: ta0.selectionEnd, f: document.activeElement === ta0} : null;
  el.innerHTML = CH.view === "channel" ? chChannelHtml() : CH.view === "thread" ? (CH.curCh && matchMedia("(min-width:900px)").matches ? `<div class="ch-under">${chChannelHtml(true)}</div>` : "") + chThreadHtml() : CH.view === "search" ? chSearchHtml() : CH.view === "admin" ? chAdminHtml()
    : `<div class="sec-h"><h2>${SPARK}チャンネル</h2><p>${DEMO ? "デモの架空のチャンネルです。" : ""}お知らせ・雑談・質問・スレッドで、仲間とやりとりできます。</p></div>` + chListHtml();
  chBind(el);
  const ta1 = $("chInput");
  if (draft && ta1 && draft.k === key() && draft.v){ ta1.value = draft.v; if (draft.f){ ta1.focus({preventScroll: true}); try { ta1.setSelectionRange(draft.a, draft.b); } catch (e) {} } }
  document.body.classList.toggle("ch-chat", CH.view === "channel" || CH.view === "thread");   // 入力欄の上に質問ボタンを重ねない
}
function chMount(){ chPollStart(); if (!CH.loaded || !CH.view) chLoad(); else chPaint(); }   // 一覧に戻ったときは毎回読みなおす（未読・メンションの数を最新に）
function chBind(el){
  const on = (sel, f) => el.querySelectorAll(sel).forEach(b => b.addEventListener("click", e => f(b, e)));
  on("[data-chopen]", b => chOpenChannel(b.dataset.chopen));
  on("[data-chdots]", b => { const id = +b.dataset.chdots; CH.open = CH.open === id ? null : id; CH.rep = null; chPaint(); });
  on("[data-chback]", () => { if (CH.view === "thread") chBackFromThread(); else { CH.view = null; chLoad(); } });   // 一覧に戻るときは読みなおす（未読・メンションを最新に）
  on("[data-chback2]", () => { CH.view = CH.curCh ? "channel" : null; if (!CH.view) chLoad(); else chPaint(); });
  on("[data-chreload]", () => chLoad());
  on("[data-cconsent]", () => chConsent());
  on("[data-chthread]", b => chOpenThread(+b.dataset.chthread));
  on("[data-chreply]", b => { chOpenThread(+b.dataset.chreply); });
  on("[data-chedit]", b => chEdit(+b.dataset.chedit));
  on("[data-chdel]", b => chDelete(+b.dataset.chdel));
  on("[data-chrep1]", b => { CH.rep = +b.dataset.chrep1; chPaint(); });
  on("[data-chrepx]", () => { CH.rep = null; chPaint(); });
  on("[data-chrep]", b => chReport(+b.dataset.mid, b.dataset.chrep));
  on("[data-chblk]", b => chBlock(+b.dataset.chblk));
  on("[data-chpin]", b => chPin(+b.dataset.chpin, +b.dataset.pinon));
  on("[data-chhide]", b => chModerate(+b.dataset.chhide, +b.dataset.hideon ? "hide" : "show"));
  on("[data-chrm]", b => { if (confirm("このメッセージを運営として消しますか？")) chModerate(+b.dataset.chrm, "remove"); });
  on("[data-chrx]", b => chReact(+b.dataset.chrx, b.dataset.emo));
  on("[data-chrxadd]", b => { CH.rx = +b.dataset.chrxadd; chPaint(); });
  on("[data-chmute]", () => chMute());
  on("[data-chsend]", b => chSend(b.dataset.chsend, b.dataset.chparent ? +b.dataset.chparent : null));
  on("#chMore", () => chMoreMsgs());
  on("[data-chsearch]", () => { CH.view = "search"; CH.search = null; CH.searchQ = ""; chPaint(); });
  on("#chSearchGo", () => chDoSearch());
  on("[data-chadmin]", async () => { CH.view = "admin"; CH.adminTab = "channels"; CH.adminForm = null; chPaint(); await chAdminLoad(); await chMentionLoad(); chPaint(); });
  on("[data-chatab]", async b => { CH.adminTab = b.dataset.chatab; if (b.dataset.chatab === "roles") await chMentionLoad(); chPaint(); });
  on("[data-chaedit]", b => { const c = (CH.admin.channels || []).find(x => x.id === b.dataset.chaedit), grp = (CH.admin.groups || {})[b.dataset.chaedit];
    CH.adminForm = {...c, group: grp || null}; chPaint(); window.scrollTo(0, 0); });
  on("#chaCancel", () => { CH.adminForm = null; chPaint(); });
  on("[data-chapost]", b => { CH.adminForm = {...(CH.adminForm || {}), post: b.dataset.chapost}; chPaint(); });
  on("[data-chagroup]", b => { CH.adminForm = {...(CH.adminForm || {}), group: b.dataset.chagroup || null}; chPaint(); });
  on("#chaSave", () => chAdminSave());
  on("[data-chamembers]", async b => { await chAdminMembersOpen(b.dataset.chamembers); chPaint(); });
  on("[data-chamemberback]", () => { CH.adminMembers = null; chPaint(); });
  on("#chamSave", () => chAdminMembersSave());
  if ($("chamQ")) $("chamQ").addEventListener("input", e => { CH.adminMembers.q = e.target.value; chPaint(); const i = $("chamQ"); if (i){ i.focus(); i.setSelectionRange(i.value.length, i.value.length); } });
  el.querySelectorAll("[data-chamid]").forEach(cb => cb.addEventListener("change", e => { const id2 = e.target.dataset.chamid; if (e.target.checked) CH.adminMembers.sel.add(id2); else CH.adminMembers.sel.delete(id2); }));
  on("[data-chaarchive]", async b => { if (!DEMO) await chFetch("/api/ch/admin", {target: "channel", action: "archive", id: b.dataset.chaarchive, on: !!+b.dataset.on}); await chAdminLoad(); await chLoad(); chPaint(); });
  on("[data-chahide]", async b => { if (!DEMO) await chFetch("/api/ch/admin", {target: "message", action: "hide", id: +b.dataset.chahide}); await chAdminLoad(); chPaint(); });
  on("[data-chashow]", async b => { if (!DEMO) await chFetch("/api/ch/admin", {target: "message", action: "show", id: +b.dataset.chashow}); await chAdminLoad(); chPaint(); });
  on("[data-charemove]", async b => { if (confirm("このメッセージを消しますか？")){ if (!DEMO) await chFetch("/api/ch/admin", {target: "message", action: "remove", id: +b.dataset.charemove}); await chAdminLoad(); chPaint(); } });
  on("[data-charole]", async b => { if (!DEMO) await chFetch("/api/ch/admin", {target: "role", action: "role", uid: b.dataset.charole, role: b.dataset.role}); await chMentionLoad(); CH.members = null; await chMentionLoad(); chPaint(); });
  on("[data-chpush]", () => chPushOn());
  on("[data-chmention]", b => { CH.mentionPick = [...(CH.mentionPick || []), {id: "all", nick: "みんな"}]; const ta = $("chInput"); if (ta) ta.value += "@みんな "; });
  // @ の候補（.ch-mcand）は input のたびに innerHTML で差し替えるので、chBind のときの直接の addEventListener では効かない。el（スレ・チャンネルの入れ物）に1つだけ、委任で受ける
  el.addEventListener("click", e => {
    const b = e.target.closest("[data-chpickm]"); if (!b) return;
    CH.mentionPick = [...(CH.mentionPick || []), {id: b.dataset.chpickm, nick: b.dataset.nick}];
    const ta = $("chInput"); if (ta){ ta.value = ta.value.replace(/@[^\s@]*$/, "@" + b.dataset.nick + " "); ta.focus(); }
    if ($("chMentionBox")) $("chMentionBox").hidden = true;
  });
  const ta = $("chInput");
  if (ta){
    ta.addEventListener("keydown", e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") $("chSend").click(); });
    ta.addEventListener("input", async () => {
      const m = ta.value.slice(0, ta.selectionStart).match(/@([^\s@]*)$/);
      if (!m){ if ($("chMentionBox")) $("chMentionBox").hidden = true; return; }
      CH.mentionQuery = m[1]; await chComposeMembersLoad((CH.curCh || {}).id);
      const box = $("chMentionBox"); if (!box) return;
      box.innerHTML = chMentionBoxHtml(); box.hidden = !box.innerHTML;
    });
  }
  if ($("chAlso")) $("chAlso").addEventListener("change", e => { CH.composeAlso = e.target.checked; });
}

/* ---------- 設定（歯車）の「チャンネルの通知」：@メンション・返信・お知らせ の3つのオン/オフ ---------- */
function chPrefsRender(){
  const box = $("spChPrefs"); if (!box) return;
  if (!chOn() || (!DEMO && !chReady())){ box.hidden = true; return; }
  if (!CH.prefs){ box.hidden = true; if (!CH.loaded) chLoad(); return; }
  const p = CH.prefs;
  box.hidden = false;
  box.innerHTML = `<b>チャンネルの通知</b>
    <label class="rm-on"><input type="checkbox" id="cpMention" ${p.mention ? "checked" : ""}> @メンションされたとき</label>
    <label class="rm-on"><input type="checkbox" id="cpReply" ${p.reply ? "checked" : ""}> 自分のスレッドに返信があったとき</label>
    <label class="rm-on"><input type="checkbox" id="cpNews" ${p.news ? "checked" : ""}> お知らせが届いたとき</label>`;
  const save = async () => {
    const next = {mention: $("cpMention").checked, reply: $("cpReply").checked, news: $("cpNews").checked};
    CH.prefs = {...CH.prefs, ...next};
    if (!DEMO) try { await chFetch("/api/ch/prefs", next); } catch (e) { toast("保存できませんでした（" + e.message + "）"); }
  };
  ["cpMention", "cpReply", "cpNews"].forEach(id => $(id).addEventListener("change", save));
}

/* ================= 乾杯バディ：招待リンクで1〜2人とペア（3人まで）になり、全員が練習した日だけのびる「ふたりの連続」 ================= */
/* 出どころ（README「乾杯バディ」・docs/relay-design.md）
   - 判定は中継（GET /api/buddy）：records の練習（AI会話・音読・2秒応答・筋トレ）と、同期した端末の練習の日別の回数（/api/sync の days）から日本時間の日ごとに数える
   - 招待は中継が作る10文字のコード（推測できない・7日で切れる・1回使ったら終わり）。リンクはアプリの URL ＋ ?buddy=コード（本人用リンクの鍵は入れない）
   - バディに見えるのは呼び名・アイコン・今日練習したか・ふたりの連続だけ。呼び名はみんな（SNS）の呼び名、なければ本人のページの初期の呼び名
   - 置き場所はマイ（この部品）と連続記録の画面。ホームには出さない。デモ（#demo）は me.json の buddy（架空のバディ）で、どこにも送らない
   CSS は bd- で始まる名前だけ
   おみやげフレーズカード（機能6・N=6・docs/gamify-1029.md）：この乾杯バディのrelayを追加だけで拡張（GET /api/buddy の card・cards_in、POST /api/buddy/card/send・/open）。新しいファイルは作らず、ここに足している。CSS は om- で始まる名前だけ新規
   v2（feat/gamify-1029-v2-omiyage）：固定カタログ（app/omiyage.json）は廃止し、機能5（app/_part_listen.js の listenMaterials()）と同じ方法で、会員自身のオーダーメイド教材（kz-mine）からフレーズ本文（英文・和訳・教材名）を出す。教材が1本もない会員にはカードを出さない。中継へ渡すのは「送る」操作のときの本文だけ（受け取る側は自分の教材を持っていないため） */
const BUDDY = {data: null, t: 0, busy: false, err: "", demo: false};
const bdReady = () => apiOn() && !!API_AUTH && !DEMO && ME && !ME.viewer;
const bdLink = code => location.origin + location.pathname + "?buddy=" + encodeURIComponent(code);   // 本人用リンクの # のうしろ（鍵）は入れない
const bdPending = () => store("cg-buddy-in") || "";
// 起動のとき：URL の ?buddy=コード を端末に控えて、アドレスから消す（あとで本人のページを開いたときに「バディになる」を出す）
function bdCatch(){
  const q = new URLSearchParams(location.search), c = q.get("buddy");
  if (c == null) return;
  const code = String(c).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (/^[A-Z0-9]{10}$/.test(code)) store("cg-buddy-in", code);
  q.delete("buddy");
  history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "") + location.hash);
}
function bdLoad(force){
  if (DEMO){ if (!BUDDY.demo){ BUDDY.demo = true; BUDDY.data = JSON.parse(JSON.stringify((ME && ME.buddy) || {buddies: [], streak: 0, invite: null, max: 2})); } return Promise.resolve(); }
  if (!bdReady() || BUDDY.busy || (!force && Date.now() - BUDDY.t < 120e3)) return Promise.resolve();
  BUDDY.busy = true; BUDDY.t = Date.now();
  return api("/api/buddy").then(r => { BUDDY.data = r; BUDDY.err = ""; })
    .catch(e => { BUDDY.err = /not found|404|JSON/.test(e.message) ? "乾杯バディは準備中です（運営のサーバーの更新待ち）" : e.message; })
    .finally(() => { BUDDY.busy = false; bdRedraw(); });
}
function bdRedraw(){
  if (!ME || $("pane-my").hidden) return;
  if (MYV === null || MYV === "buddy" || MYV === "streak"){ const y = window.scrollY; renderMy(); window.scrollTo(0, y); }
}
const bdWho = n => n >= 2 ? `${n + 1}人` : "ふたり";
// ふたりクエスト（docs/gamify-1021.md）：GET /api/buddy の quest（週がわりのお題・全員のグループで進める）
const DQ_UNIT = {days_together: "日", lessons: "個"};
function duoQuestHtml(q){
  if (!q) return "";
  const unit = DQ_UNIT[q.kind] || "分", pct = q.target ? Math.min(100, Math.round(100 * q.total / q.target)) : 0;
  const bar = q.kind === "days_together" ? `<i class="me" style="width:${pct}%"></i>`
    : (() => { let left = 0; return q.parts.map(p => { const w = q.target ? Math.max(0, Math.min(100 - left, Math.round(100 * p.v / q.target))) : 0;
      const html = `<i class="${p.me ? "me" : "bud"}" style="width:${w}%;left:${left}%"></i>`; left += w; return html; }).join(""); })();
  const legend = q.parts.map(p => `<li><span class="dq-dot ${p.me ? "me" : "bud"}" aria-hidden="true"></span>${p.me ? "あなた" : `${esc(p.icon)} ${esc(p.nick)}`}<b>${p.v}${unit}</b></li>`).join("");
  const days = Math.max(0, Math.round((new Date(q.ends + "T00:00:00") - new Date(dayKey(Date.now()) + "T00:00:00")) / 864e5));
  return `<div class="dq-box"><div class="dq-h"><b>🎯 今週のふたりクエスト</b></div>
    <p class="dq-label">${esc(q.label)}</p>
    <div class="dq-bar" role="img" aria-label="進み ${q.total}/${q.target}${unit}">${bar}</div>
    <ul class="dq-legend">${legend}</ul>
    ${q.done ? `<p class="dq-done">🎟 達成！ふたりとも今週のAI会話 ＋${q.reward_min}分</p>` : `<p class="dq-note">月曜0:00にリセット・あと${days}日</p>`}</div>`;
}
// おみやげフレーズカード v2：地元/国の固定カタログ（app/omiyage.json）は廃止。会員自身のオーダーメイド教材（kz-mine）から、
// 機能5の listenMaterials()（app/_part_listen.js）と同じ抽出方法でフレーズ本文（英文・和訳・教材名）を取り出す。本文は端末内だけで組み立て、
// 中継へ渡すのは「送る」操作のときの本文だけ（受け取る側は送った人の教材を持っていないため、idx だけでは開けない）
const OM_DEMO_POOL = [   // デモ（#demo）専用の見本フレーズ（実在の教材ではない・架空）。本人用のリンクでは実際の kz-mine の教材から出す
  {en: "Could I get this one, please?", ja: "これをください。", mat: "カフェでの注文（見本）"},
  {en: "Is this seat taken?", ja: "この席、空いていますか？", mat: "カフェでの注文（見本）"},
  {en: "Could you take me to this address?", ja: "この住所まで行ってもらえますか？", mat: "道をたずねる（見本）"},
  {en: "What do you recommend here?", ja: "ここのおすすめは何ですか？", mat: "道をたずねる（見本）"}];
// あなたのオーダーメイド教材（isMine・paras があるものだけ＝listenMaterials()と同じ条件）の段落を、フレーズカードの候補として並べたもの
function omPhrasePool(){
  return listenMaterials().flatMap(m => (m.paras || []).slice(0, 4).filter(p => p && p.en).map(p => ({en: p.en, ja: p.ja || "", mat: m.title || ""})));
}
// 今日のカード本文を、card.idx（中継が1日1回決める数）で候補の中から選ぶ。教材が1本もなければ常に null（カードを出さない）
function omMyCard(card){
  if (!card || card.idx == null) return null;
  const pool = DEMO ? OM_DEMO_POOL : omPhrasePool();
  return pool.length ? pool[((card.idx % pool.length) + pool.length) % pool.length] : null;
}
// 今日のおみやげ（まだ送っていなければ送る相手のボタン）＋もらったおみやげ（開くボタン）。buddyCardHtml の末尾に足すだけ
function omCardBoxHtml(D, bs){
  const card = D && D.card, inboxN = (D && D.cards_in && D.cards_in.length) || 0;
  const mine = omMyCard(card);
  if (!mine && !inboxN) return "";
  const give = !mine ? "" : card.sent ? `<p class="om-lead">✉️ 今日のおみやげは送りました</p>`
    : `<p class="om-lead">🎁 今日のおみやげが届きました</p>
      <p class="om-en">“${esc(mine.en)}”${mine.ja ? `<br><small>${esc(mine.ja)}</small>` : ""}</p>
      ${bs.length ? `<div class="acts">${bs.map((b, i) => `<button type="button" class="btn ghost sm2" data-bd="card-send:${i}">${esc(b.icon)} ${esc(b.nick)}に送る</button>`).join("")}</div>`
        : `<p class="mapnote">乾杯バディができたら送れます。</p>`}`;
  const inbox = !inboxN ? "" : `<p class="om-in">📬 もらったおみやげが${inboxN}枚<button type="button" class="btn sm2" data-bd="card-open:${D.cards_in[0].id}">開く</button></p>`;
  return give || inbox ? `<div class="om-box">${give}${inbox}</div>` : "";
}
// 受け取った側が開いたとき：フレーズ本文（送った相手の教材から・本文は送信時に中継へ渡ったもの）・（ブラウザの読み上げで）再生・増えた分。25秒で自然に閉じる（宝箱の ct-overlay/ct-card と同じ構造を再利用）
function omCardRender(c, min, already){
  c = c || {en: "", ja: "", mat: ""};
  document.querySelectorAll(".ct-overlay.om").forEach(x => x.remove());
  const wrap = document.createElement("div");
  wrap.className = "ct-overlay om"; wrap.setAttribute("role", "dialog"); wrap.setAttribute("aria-label", "おみやげフレーズカード");
  wrap.innerHTML = `<div class="ct-card${reduce ? "" : " in"}">
    <div class="ct-h"><span class="ct-ic" aria-hidden="true">🎁</span><b>おみやげフレーズカード</b><button type="button" class="ct-x" aria-label="閉じる">×</button></div>
    <p class="ct-kind">${esc(c.mat || "")}</p>
    <p class="ct-text">“${esc(c.en || "")}”${c.ja ? `<br><small>${esc(c.ja)}</small>` : ""}</p>
    <div class="acts"><button type="button" class="btn sm2" data-om-play="1">🔊 フレーズを再生</button></div>
    ${!already && min > 0 ? `<p class="om-got">今週のAI会話が ＋${min}分 増えました！</p>` : ""}
  </div>`;
  document.body.appendChild(wrap);
  wrap.querySelector(".ct-x").addEventListener("click", () => wrap.remove());
  wrap.querySelector("[data-om-play]").addEventListener("click", () => omSpeak(c.en));
  setTimeout(() => { if (wrap.isConnected) wrap.remove(); }, 25000);
}
function omSpeak(text){                                                    // 端末の読み上げだけ（どこにも送らない）。使えない端末では何もしない
  if (!text || typeof speechSynthesis === "undefined") return;
  try { const u = new SpeechSynthesisUtterance(text); u.lang = "en-US"; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {}
}
async function cardAct(k, D, demoMsg){
  const call = async (p, b) => { try { return await api(p, b); } catch (e) { toast(e.message, 4200); return null; } };
  if (k.startsWith("card-send:")){
    const slot = +k.slice(10), mine = omMyCard(D.card);
    if (DEMO){ if (BUDDY.data) BUDDY.data.card = {...(BUDDY.data.card || {}), sent: true}; demoMsg(); bdRedraw(); return; }
    if (!bdReady() || !D.card || D.card.idx == null || D.card.sent || !mine) return;
    if (await call("/api/buddy/card/send", {slot, en: mine.en, ja: mine.ja, mat: mine.mat})){ toast("おみやげを送りました 🎁"); await bdLoad(true); }
    return;
  }
  if (k.startsWith("card-open:")){
    const id = +k.slice(10), row = (D.cards_in || []).find(c => c.id === id);
    if (DEMO){
      omCardRender(row, 0, true);
      if (BUDDY.data) BUDDY.data.cards_in = (BUDDY.data.cards_in || []).filter(c => c.id !== id);
      demoMsg(); bdRedraw(); return;
    }
    if (!bdReady()) return;
    const r = await call("/api/buddy/card/open", {id});
    if (r){ omCardRender(row, r.min || 0, !!r.already); await bdLoad(true); }
  }
}
// 小さなカード（マイのトップ・連続記録の画面）
function buddyCardHtml(d, inView){                                         // inView：マイ＞乾杯バディの中（同じ画面へのボタンは出さない）
  if (!d || d.viewer) return "";
  if (!BUDDY.data && !BUDDY.err) bdLoad();
  const D = BUDDY.data, bs = (D && D.buddies) || [], pend = bdPending();
  const head = `<div class="bd-h"><h3>🍻 乾杯バディ</h3>${inView ? "" : `<button type="button" class="more" data-my="buddy">${bs.length ? "招待・解除 ›" : "くわしく ›"}</button>`}</div>`;
  if (!D) return `<section class="bd-card" aria-label="乾杯バディ">${head}<p class="mapnote">${esc(BUDDY.err || (DEMO || bdReady() ? "読み込んでいます…" : "乾杯バディは、本人用のリンクで開いたときに使えます。"))}</p></section>`;
  if (!bs.length) return `<section class="bd-card" aria-label="乾杯バディ">${head}
    <p class="bd-lead">仲間と1〜2人でペアになると、全員が練習した日だけ「${bdWho(1)}の連続」がのびます。</p>
    ${inView ? "" : pend ? `<p class="bd-in">招待コードを受けとっています。<button type="button" class="btn sm2" data-my="buddy">バディになる</button></p>` : `<div class="acts"><button type="button" class="btn sm2" data-my="buddy">バディを招待する</button></div>`}${omCardBoxHtml(D, bs)}</section>`;
  return `<section class="bd-card on" aria-label="乾杯バディ">${head}
    <div class="bd-run"><b class="num">${D.streak}</b><span>日<br>${bdWho(bs.length)}の連続</span></div>
    <ul class="bd-list">${bs.map(b => `<li><span class="bd-av" aria-hidden="true">${esc(b.icon)}</span><b>${esc(b.nick)}</b><em class="${b.today ? "ok" : ""}">${b.today ? "今日 ✓ 練習した" : "今日 まだ"}</em></li>`).join("")}
      <li class="me"><span class="bd-av" aria-hidden="true">${esc(typeof snsIcon === "function" ? snsIcon() : "🙂")}</span><b>あなた</b><em class="${D.me_today ? "ok" : ""}">${D.me_today ? "今日 ✓ 練習した" : "今日 まだ"}</em></li></ul>
    <p class="bd-note">${D.me_today && bs.every(b => b.today) ? `今日は全員そろいました 🍻` : `全員が練習した日だけのびます。${D.me_today ? "バディを待っています" : "あなたの1回で近づきます"}`}</p>${duoQuestHtml(D.quest)}${omCardBoxHtml(D, bs)}</section>`;
}
// マイ＞乾杯バディ（招待のリンク・コードを入れる・解除）
function buddyViewHtml(d){
  if (!BUDDY.data && !BUDDY.err) bdLoad(true);
  const D = BUDDY.data, bs = (D && D.buddies) || [], inv = D && D.invite, pend = bdPending(), can = DEMO || bdReady(), full = bs.length >= ((D && D.max) || 2);
  return `${pend && can ? `<section class="bd-in-box"><b>🍻 乾杯バディの招待を受けとりました</b><p>コード <b class="num">${esc(pend)}</b>。バディになると、相手にあなたの呼び名・アイコン・今日練習したかが見えます（時刻・練習の中身・本名は見えません）。</p>
      <div class="acts"><button type="button" class="btn" data-bd="accept">バディになる</button><button type="button" class="btn ghost" data-bd="dismiss">やめる</button></div></section>` : ""}
    ${buddyCardHtml(d, true)}
    <section class="bd-box"><h3>バディを招待する<small>（あと${Math.max(0, ((D && D.max) || 2) - bs.length)}人まで）</small></h3>
      ${!can ? `<p class="mapnote">本人用のリンクで開いたときに使えます。</p>` : full ? `<p class="mapnote">バディは${(D && D.max) || 2}人までです。新しく招待するには、下で解除してください。</p>`
        : inv ? `<p class="bd-code"><span>招待コード</span><b class="num">${esc(inv.code)}</b><small>${esc(md(inv.exp))}まで・1回使えます</small></p>
          <div class="acts"><button type="button" class="btn" data-bd="share">リンクを送る</button><button type="button" class="btn ghost" data-bd="copy">リンクをコピー</button><button type="button" class="more" data-bd="cancel">とりけす</button></div>
          <p class="sns-hint">リンクはアプリの入口と招待コードだけです（あなたのリンクの鍵は入っていません）。受けとった人は、自分のリンクで開いたアプリでバディになります。</p>`
        : `<p class="sns-hint">招待のリンクを作って、LINE などで仲間に送ります（7日で切れます・1回使えます）。</p><div class="acts"><button type="button" class="btn" data-bd="invite">招待のリンクを作る</button></div>`}</section>
    <section class="bd-box"><h3>招待コードを入れる</h3><p class="sns-hint">リンクが開けなかったときは、届いた10文字のコードをここに入れてください。</p>
      <div class="bd-join"><input id="bdCode" maxlength="14" autocomplete="off" autocapitalize="characters" placeholder="例：ABCD2EFGH3" aria-label="招待コード"${can ? "" : " disabled"}><button type="button" class="btn sm2" data-bd="join"${can ? "" : " disabled"}>バディになる</button></div></section>
    ${bs.length ? `<section class="bd-box"><h3>バディをやめる</h3><p class="sns-hint">解除すると、${bdWho(bs.length)}の連続は0からになります。相手には「バディがいない」と表示されます。</p><div class="acts"><button type="button" class="btn ghost sns-danger" data-bd="leave">解除する</button></div></section>` : ""}
    <p class="mapnote">ふたりの連続は、運営のサーバーにある練習の記録（AI会話・音読チェック・2秒応答・筋トレ）と、端末のあいだで同期した練習の日から、日本時間の日ごとに数えます。数えるのは、いまのバディがそろった日からです。おやすみ乾杯チケットは、ふたりの連続には使いません。</p>`;
}
async function bdAct(k){
  const D = BUDDY.data || {}, demoMsg = () => toast("デモなので、どこにも送っていません（見た目だけ）");
  if (k.startsWith("card-send:") || k.startsWith("card-open:")) return cardAct(k, D, demoMsg);
  const body = () => ({nick: typeof snsNick === "function" ? snsNick() : (ME.nick || "メンバー"), icon: typeof snsIcon === "function" ? snsIcon() : "🙂"});
  const call = async (p, b, ok) => { try { const r = await api(p, b); if (ok) toast(ok); return r; } catch (e) { toast(e.message, 4200); return null; } };
  if (k === "dismiss"){ store("cg-buddy-in", null); bdRedraw(); return; }
  if (k === "copy" || k === "share"){
    if (!D.invite) return;
    const url = bdLink(D.invite.code), text = "チアーズGO！で乾杯バディになりませんか？ ふたりとも練習した日だけ「ふたりの連続」がのびます。自分のリンクで開いたアプリで、このリンクを開いてください。";
    if (k === "share" && navigator.share){ try { await navigator.share({text, url}); } catch (e) {} return; }
    try { await navigator.clipboard.writeText(text + "\n" + url); toast("リンクをコピーしました"); } catch (e) { toast("コピーできませんでした。招待コードを伝えてください"); }
    return;
  }
  if (DEMO){
    if (k === "invite") BUDDY.data.invite = {code: "DEMO2CODE9", exp: dayAdd(dayKey(Date.now()), 7)};
    if (k === "cancel") BUDDY.data.invite = null;
    if (k === "leave") BUDDY.data = {...BUDDY.data, buddies: [], streak: 0};
    if (k === "accept") store("cg-buddy-in", null);
    demoMsg(); bdRedraw(); return;
  }
  if (!bdReady()) return;
  if (k === "invite") await call("/api/buddy/invite", body());
  if (k === "cancel") await call("/api/buddy/invite", {cancel: true});
  if (k === "accept" || k === "join"){
    const code = k === "accept" ? bdPending() : (($("bdCode") || {}).value || "");
    if (!code.trim()){ toast("招待コードを入れてください"); return; }
    if (await call("/api/buddy/join", {code, ...body()}, "バディになりました 🍻")) store("cg-buddy-in", null);
    else if (k === "accept") store("cg-buddy-in", null);              // 使えないコードは控えから消す（理由は上の知らせ）
  }
  if (k === "leave"){
    if (!confirm("乾杯バディを解除しますか？（ふたりの連続は0からになります）")) return;
    await call("/api/buddy/leave", {}, "バディを解除しました");
  }
  await bdLoad(true);
}
document.addEventListener("click", e => { const b = e.target.closest("[data-bd]"); if (b && !b.disabled){ e.preventDefault(); bdAct(b.dataset.bd); } });

/* ================= ゆるめの週リーグ：ペースが近い15〜20人のグループで、週ポイント（練習した分）を競う。降格なし・上位だけ次のリーグへ昇格 ================= */
/* 出どころ（docs/gamify-1027.md「1」）
   - グループ割当・週の集計は中継（GET /api/league）。初めて開いたときに tier=1 のいちばん空いているグループへ自動で入る
   - 見えるのは呼び名・アイコン・週ポイント（練習した分）だけ。本名・メール・練習の中身は出さない
   - 置き場所はみんな＞ランキング（本人用のリンクのときだけ。鍵なし・先生リンクには出さない）
   CSS は lg- で始まる名前だけ（ほかは bd-/rklist/mv/mapnote を再利用） */
const LEAGUE = {data: null, t: 0, busy: false, err: "", demo: false};
const lgReady = () => apiOn() && !!API_AUTH && !DEMO && ME && !ME.viewer;
function lgLoad(force){
  if (DEMO){ if (!LEAGUE.demo){ LEAGUE.demo = true; LEAGUE.data = JSON.parse(JSON.stringify((ME && ME.league) || null)); } return Promise.resolve(); }
  if (!lgReady() || LEAGUE.busy || (!force && Date.now() - LEAGUE.t < 120e3)) return Promise.resolve();
  LEAGUE.busy = true; LEAGUE.t = Date.now();
  return api("/api/league").then(r => { LEAGUE.data = r; LEAGUE.err = ""; })
    .catch(e => { LEAGUE.err = /not found|404|JSON/.test(e.message) ? "週リーグは準備中です（運営のサーバーの更新待ち）" : e.message; })
    .finally(() => { LEAGUE.busy = false; lgRedraw(); });
}
function lgRedraw(){ const el = $("lgSec"); if (el) el.outerHTML = leagueBoxHtml(); }
function leagueBoxHtml(){
  if (!ME || ME.viewer) return "";
  if (!DEMO && !lgReady()) return "";
  if (!LEAGUE.data && !LEAGUE.err) lgLoad();
  const D = LEAGUE.data;
  if (!D) return `<section class="lg-card" id="lgSec" aria-label="週リーグ"><div class="bd-h"><h3>🏁 週リーグ</h3></div><p class="mapnote">${esc(LEAGUE.err || "読み込んでいます…")}</p></section>`;
  const rows = [...D.board].sort((a, b) => b.pts - a.pts);
  const days = Math.max(0, Math.round((new Date(D.ends + "T00:00:00") - new Date(dayKey(Date.now()) + "T00:00:00")) / 864e5));
  const li = (r, i) => `<li${r.me ? ` class="me"` : ""}><span class="num rk">${i + 1}</span><b>${r.me ? "あなた" : `${esc(r.icon)} ${esc(r.nick)}`}</b><small></small><span class="num v">${r.pts}<small>分</small></span>${i < D.promote_top ? `<span class="mv up">▲昇格</span>` : `<span class="mv eq">ー</span>`}</li>`;
  const prevNote = D.last_week ? (D.last_week.promoted
    ? `<p class="lg-note lg-up">先週、上位${D.promote_top}人に入って次のリーグへ昇格しました🎉</p>`
    : `<p class="lg-note">先週は${D.last_week.rank}位（${D.last_week.pts}分）でした。降格はありません。</p>`) : "";
  return `<section class="lg-card" id="lgSec" aria-label="週リーグ">
    <div class="bd-h"><h3>🏁 第${D.tier}リーグ・週リーグ</h3><small>あと${days}日でリセット</small></div>
    <p class="lg-lead">近いペースの仲間${D.size}人と、今週の練習した分を競います。上位${D.promote_top}人は次のリーグへ昇格。降格はありません。</p>
    ${prevNote}
    <ol class="rklist">${rows.map((r, i) => li(r, i)).join("")}</ol></section>`;
}

/* ================= みんなでボス討伐：全会員の週の練習した分の合計でボスのHPが減る。協力型・ランキングなし。倒したら全員にバッジとポイント ================= */
/* 出どころ（docs/gamify-1027.md「2」）
   - 今週のボス・HP・合計は中継（GET /api/boss）。初めて開いた瞬間にその週のボスがなければサーバー側で作る
   - 見えるのは全会員のHP合計・あなたの今週の分・倒したかどうかだけ。他の会員の個別の数字は出さない（ランキングなし）
   - 置き場所はみんな＞ランキング（本人用のリンクのときだけ。鍵なし・先生リンクには出さない）
   CSS は bs- で始まる名前だけ新規 */
const BOSS = {data: null, t: 0, busy: false, err: "", demo: false};
const bsReady = () => apiOn() && !!API_AUTH && !DEMO && ME && !ME.viewer;
function bsLoad(force){
  if (DEMO){ if (!BOSS.demo){ BOSS.demo = true; BOSS.data = JSON.parse(JSON.stringify((ME && ME.boss) || null)); } return Promise.resolve(); }
  if (!bsReady() || BOSS.busy || (!force && Date.now() - BOSS.t < 120e3)) return Promise.resolve();
  BOSS.busy = true; BOSS.t = Date.now();
  return api("/api/boss").then(r => { BOSS.data = r; BOSS.err = ""; })
    .catch(e => { BOSS.err = /not found|404|JSON/.test(e.message) ? "ボス討伐は準備中です（運営のサーバーの更新待ち）" : e.message; })
    .finally(() => { BOSS.busy = false; bsRedraw(); });
}
function bsRedraw(){ const el = $("bsSec"); if (el) el.outerHTML = bossBoxHtml(); }
function bossBoxHtml(){
  if (!ME || ME.viewer) return "";
  if (!DEMO && !bsReady()) return "";
  if (!BOSS.data && !BOSS.err) bsLoad();
  const D = BOSS.data;
  if (!D) return `<section class="bs-card" id="bsSec" aria-label="みんなでボス討伐"><div class="bd-h"><h3>⚔️ 今週のボス</h3></div><p class="mapnote">${esc(BOSS.err || "読み込んでいます…")}</p></section>`;
  const pct = Math.max(0, Math.min(100, D.pct));
  const note = D.defeated
    ? `<p class="bs-note bs-win">${esc(D.icon)} ${esc(D.name)}を倒しました！${D.got_badge ? "🏅バッジ獲得" : "🏅バッジ獲得ずみ"}（＋${D.reward_pts}pt）</p>`
    : `<p class="bs-lead">全会員の今週の練習した分を合わせて、HPを削ります。あなたの今週の分：<b>${D.me_min}分</b></p>`;
  return `<section class="bs-card" id="bsSec" aria-label="みんなでボス討伐">
    <div class="bd-h"><h3>⚔️ 今週のボス：${esc(D.icon)} ${esc(D.name)}</h3></div>
    <div class="bs-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
    <p class="bs-hp">HP ${Math.max(0, D.hp - D.total)} / ${D.hp}（みんなで${D.total}分）</p>
    ${note}</section>`;
}

/* ================= 2分だけスピーク：オプトインした人だけ、1日1回ランダムな時刻に「英語で30秒話そう」と通知 ================= */
/* 出どころ（docs/gamify-1027.md「4」）
   - 既定OFF。マイ＞設定のスイッチでオン（端末の通知を許可 → 既存のWeb Push登録 POST /api/push/subscribe → POST /api/speak {on:1}）
   - 通知は中継（GET /api/speak を見る定期実行）が、オプトインした人だけに1日1回ランダムな時刻（JST）で送る。本番は talk_plan.speak.enabled=false のあいだ送られない
   - 通知を押すと ?speak=1 で開く（sw.js → openWindow）。2分以内に録音して止めれば POST /api/speak {done:1} → ⚡＋今週のAI会話にbonus_min分。逃しても何も失わない
   - 録音した音声はどこにも送らない（この端末の中だけ・止めたらすぐ捨てる） */
const spkOptedLocal = () => store("cg-speak-opt") === "1";
function spkSetRender(){
  const box = $("spSpeak"); if (!box) return;
  if (!ME || ME.viewer || DEMO || !apiOn()){ box.hidden = true; return; }
  box.hidden = false;
  const on = spkOptedLocal();
  box.innerHTML = `<b>2分だけスピーク⚡</b>
    <label class="rm-on"><input type="checkbox" id="spkOn" ${on ? "checked" : ""}> 1日1回ランダムな時刻に「30秒話そう」と通知する</label>
    <p class="mapnote" style="margin:0">2分以内に録音すればOK。逃しても何も失いません（オプトイン・既定OFF）。</p>`;
  $("spkOn").addEventListener("change", spkToggle);
}
async function spkToggle(){
  const b = $("spkOn"), on = b.checked;
  if (DEMO){ toast("デモでは使えません"); b.checked = !on; return; }
  if (on){
    if ("Notification" in window && Notification.permission === "default"){ try { await Notification.requestPermission(); } catch (e) {} }
    if (!("Notification" in window) || Notification.permission !== "granted"){ toast("端末の通知を許可してください"); b.checked = false; return; }
    await pushSubscribe();
  }
  store("cg-speak-opt", on ? "1" : null);
  try { await api("/api/speak", {on: on ? 1 : 0}); } catch (e) {}
  toast(on ? "オンにしました" : "オフにしました");
}
// 通知を押して開かれたとき（アプリが開いていなかった場合は ?speak=1・開いていれば sw.js の cg-open からも同じURLで来る）
function spkOpenFromParams(params){
  if (params.get("speak") !== "1" || DEMO || !ME || ME.viewer || !apiOn()) return;
  setTimeout(() => spkSheet(), 60);
}
async function spkSheet(){
  let st; try { st = await api("/api/speak"); } catch (e) { return; }
  if (!st || !st.enabled || !st.opted || !st.today || !st.today.sent || st.today.done) return;   // もう応えた・無効・オプトイン外・まだ送られていない
  const deadline = Date.parse(st.today.sent) + (+st.response_window_sec || 120) * 1000;
  if (Date.now() > deadline) return;
  if ($("spkOverlay")) return;
  const ov = document.createElement("div"); ov.className = "tv-overlay"; ov.id = "spkOverlay";
  ov.innerHTML = `<div class="tv-card"><button type="button" class="more" id="spkClose" style="float:right">×</button>
    <h3 style="margin:0 0 6px">⚡ 2分だけスピーク</h3>
    <p class="mapnote" id="spkMsg">英語で30秒だけ話してみましょう。トピックは自由です。マイクを押して話し、終わったら止めてください。</p>
    <div class="acts" style="justify-content:center"><button class="btn big" type="button" id="spkGo">🎙 話す</button></div>
    <b class="num" id="spkTime" style="display:block;text-align:center;margin-top:8px"></b></div>`;
  document.body.appendChild(ov);
  $("spkClose").addEventListener("click", () => ov.remove());
  $("spkGo").addEventListener("click", () => spkRecord(deadline, ov));
  const iv = setInterval(() => {
    if (!document.body.contains(ov)){ clearInterval(iv); return; }
    const left = Math.max(0, Math.round((deadline - Date.now()) / 1000)), t = $("spkTime");
    if (t) t.textContent = left ? `残り${left}秒` : "";
    if (left <= 0){ clearInterval(iv); const g = $("spkGo"); if (g && !g.disabled && g.textContent.includes("話す")){ $("spkMsg").textContent = "2分が過ぎました。また次の機会に（なにも失いません）"; g.disabled = true; } }
  }, 1000);
}
async function spkRecord(deadline, ov){
  if (Date.now() > deadline){ $("spkMsg").textContent = "2分が過ぎました。また次の機会に（なにも失いません）"; return; }
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: true, noiseSuppression: true}}); }
  catch (e) { $("spkMsg").textContent = "マイクを許可してください"; return; }
  const mime = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || "";
  let rec; try { rec = new MediaRecorder(stream, mime ? {mimeType: mime} : {}); } catch (e) { stream.getTracks().forEach(t => t.stop()); $("spkMsg").textContent = "録音を始められませんでした"; return; }
  const t0 = Date.now(), go = $("spkGo");
  go.textContent = "■ 止める"; go.onclick = () => rec.stop();
  rec.onstop = async () => {
    stream.getTracks().forEach(t => t.stop());                         // 録音はここで捨てる（保存・送信しない）
    const sec = Math.round((Date.now() - t0) / 1000);
    if (!document.body.contains(ov)) return;
    if (sec < 5){ $("spkMsg").textContent = "もう少し話してみましょう"; go.textContent = "🎙 話す"; go.onclick = () => spkRecord(deadline, ov); return; }
    let r; try { r = await api("/api/speak", {done: 1}); } catch (e) { r = null; }
    go.remove();
    $("spkMsg").innerHTML = r && r.ok ? `⚡ できました！今週のAI会話に＋${r.bonus_min}分` : "2分が過ぎてしまったようです（なにも失いません）";
    if (r && r.ok) setTimeout(() => { if (document.body.contains(ov)) ov.remove(); }, 3500);
  };
  rec.start();
}
// アプリを開いたまま通知を押したとき（sw.js の notificationclick → postMessage）も同じ入口から開く
if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", e => {
  if (e.data && e.data.type === "cg-open"){ try { spkOpenFromParams(new URL(e.data.url, location.href).searchParams); } catch (err) {} }
});

/* ================= 乾杯アワー：平日21-22時(JST)はポイント2倍。その時間だけ「いま◯人が練習中」をタイムラインに表示 ================= */
/* 出どころ（docs/gamify-1029.md「2」）
   - アクティブか・いま練習中の人数・今日のポイント2倍ぶんは中継（GET /api/toast）。アクティブな窓のあいだだけ見える（それ以外は中継を呼ばない）
   - 置き場所はみんな＞タイムライン（本人用のリンクのときだけ。鍵なし・先生リンクには出さない）
   - 任意のWeb Pushリマインダー（既定OFF）はマイ＞設定のスイッチ（端末の通知を許可 → 既存のWeb Push登録 → POST /api/toast {opt:1}）
   CSS は th- で始まる名前だけ新規（bd-h・mapnote は既存を再利用） */
const TOAST = {data: null, t: 0, busy: false, demo: false};
const thOn = () => !!ME && !ME.viewer;
const thReady = () => apiOn() && !!API_AUTH && !DEMO && thOn();
function thLoad(force){
  if (DEMO){ if (!TOAST.demo){ TOAST.demo = true; TOAST.data = JSON.parse(JSON.stringify((ME && ME.toast) || null)); thRedraw(); } return Promise.resolve(); }
  if (!thReady() || TOAST.busy || (!force && Date.now() - TOAST.t < 60e3)) return Promise.resolve();
  TOAST.busy = true; TOAST.t = Date.now();
  return api("/api/toast").then(r => { TOAST.data = r; }).catch(() => { TOAST.data = null; }).finally(() => { TOAST.busy = false; thRedraw(); });
}
function thRedraw(){ const el = $("thBanner"); if (el) el.outerHTML = toastBannerHtml(); }
// その時間だけ出す（読み込み中・時間外はカードを出さず、空の控え枠だけ残す）
function toastBannerHtml(){
  if (!thOn()) return "";
  if (!DEMO && !thReady()) return "";
  if (!TOAST.data){ thLoad(); return `<section id="thBanner" hidden></section>`; }
  const D = TOAST.data;
  if (!D.active) return `<section id="thBanner" hidden></section>`;
  return `<section class="th-card" id="thBanner" aria-label="乾杯アワー">
    <div class="bd-h"><h3>🍻 乾杯アワー（${esc(D.start)}〜${esc(D.end)}）</h3></div>
    <p class="th-lead">いまポイント${D.multiplier}倍！いま<b>${D.n}人</b>が練習中です。</p>
    ${D.me_bonus_min > 0 ? `<p class="mapnote" style="margin:4px 0 0">今日はすでに＋${D.me_bonus_min}分もらっています。</p>` : ""}
  </section>`;
}
/* ---------- マイ＞設定：任意のWeb Pushリマインダー（既定OFF） ---------- */
const thOptedLocal = () => store("cg-toast-opt") === "1";
function thSetRender(){
  const box = $("spToast"); if (!box) return;
  if (!ME || ME.viewer || DEMO || !apiOn()){ box.hidden = true; return; }
  box.hidden = false;
  const on = thOptedLocal();
  box.innerHTML = `<b>乾杯アワーのリマインダー🍻</b>
    <label class="rm-on"><input type="checkbox" id="thOn" ${on ? "checked" : ""}> 平日21時になったら通知する（ポイント2倍の時間です）</label>
    <p class="mapnote" style="margin:0">任意です（既定OFF）。オフにしてもポイント2倍の時間そのものは変わりません。</p>`;
  $("thOn").addEventListener("change", thToggle);
}
async function thToggle(){
  const b = $("thOn"), on = b.checked;
  if (DEMO){ toast("デモでは使えません"); b.checked = !on; return; }
  if (on){
    if ("Notification" in window && Notification.permission === "default"){ try { await Notification.requestPermission(); } catch (e) {} }
    if (!("Notification" in window) || Notification.permission !== "granted"){ toast("端末の通知を許可してください"); b.checked = false; return; }
    await pushSubscribe();
  }
  store("cg-toast-opt", on ? "1" : null);
  try { await api("/api/toast", {opt: on ? 1 : 0}); } catch (e) {}
  toast(on ? "オンにしました" : "オフにしました");
}

/* ================= 今月のチアーズ・まとめ（先月の振り返り・スワイプカード） =================
   毎月1日、ホーム「今日の1つ」に「○月のまとめを見る」を1回だけ出す（見た＝開いたら cg-recap-seen に記録。来月また出る）。
   タップすると5〜6枚のスワイプ画面：①練習した分 ②最長の連続日数 ③乾杯した国数 ④自己ベストを更新した数 ⑤バディの連続日数 ⑥シェアカード。
   数字はぜんぶ既存の記録（studySet・ME.photos・cg-pb・GET /api/buddy・GET /api/month-review）から計算するだけ＝新しく保存するものはない。
   先生リンク（d.viewer）には出さない。シェアカードは月末のふりかえり（app/_part_talk.js の mrDraw）と同じやり方（本名・顔・お店・鍵・URL は入れない）。
   CSS は rc- で始まる名前だけ（シェア周りは sns-* を共用）。テスト：tools/test_recap_ui.mjs */
let RC_M = "", RCD = null, RC_I = 0;
// 先月（日本時間）。今日の値を渡せる（テスト用。省略すれば Date.now()）
function rcPrevMonth(now){
  const j = new Date((now == null ? Date.now() : now) + 9 * 3600e3); j.setUTCDate(0); return j.toISOString().slice(0, 7);
}
const rcSeen = () => { try { const v = JSON.parse(store("cg-recap-seen") || "{}"); return v && typeof v === "object" ? v : {}; } catch (e) { return {}; } };
const rcMarkSeen = m => { const s = rcSeen(); s[m] = Date.now(); store("cg-recap-seen", JSON.stringify(s)); };
const rcMonthDays = (set, m) => [...set].filter(k => k.startsWith(m)).sort();
// その月の中でいちばん長く続いた連続日数（dayKey の並び＝カレンダー日の連続。studySet と同じ「練習した日」の集合から）
function rcLongestStreak(set, m){
  const days = rcMonthDays(set, m); if (!days.length) return 0;
  let best = 1, run = 1;
  for (let i = 1; i < days.length; i++){
    const a = new Date(days[i - 1] + "T12:00:00"), b = new Date(days[i] + "T12:00:00");
    run = (b - a === 864e5) ? run + 1 : 1; best = Math.max(best, run);
  }
  return best;
}
// 自己ベスト（cg-pb）の、最後に更新した日がその月に入っている種目の数（何回更新したかまでは分からない＝現在値の日付だけで数える近似値）
function rcPbCount(m){ return PB_DEFS.filter(def => { const r = pbAll()[def.kind]; return r && dayKey(r.t).startsWith(m); }).length; }
function rcHasData(d, m){
  if (!d) return false;
  if (rcMonthDays(studySet(d), m).length) return true;
  if ((d.photos || []).some(p => String(p.d || "").startsWith(m) && (p.cc || []).length)) return true;
  return rcPbCount(m) > 0;
}
// 今日の1つ：毎月1日・まだ見ていない・先月に何か記録があるときだけ（d.viewer＝先生リンクには出さない）
function rcPending(d, now){
  if (!d || d.viewer) return null;
  if (new Date((now == null ? Date.now() : now) + 9 * 3600e3).getUTCDate() !== 1) return null;
  const m = rcPrevMonth(now);
  if (rcSeen()[m] || !rcHasData(d, m)) return null;
  return {k: "recap", t: `${+m.slice(5)}月のまとめを見る`, s: "練習した分・最長の連続・乾杯した国・自己ベスト・バディの連続", fn: () => rcOpen(m)};
}
function rcOpen(m){ rcMarkSeen(m); hush(); RC_M = m; RC_I = 0; RCD = null; showTab("kz"); KZ = "recap"; renderKz(); window.scrollTo(0, 0); }
document.addEventListener("click", e => { const b = e.target.closest && e.target.closest("[data-rc]"); if (!b) return; rcOpen(b.dataset.rc); });

async function renderRecap(){
  const box = $("kzwrap"), m = RC_M || rcPrevMonth(), mm = +m.slice(5);
  box.innerHTML = `<button class="more kzback" type="button" id="kzBack">← 練習へ</button><div class="sec-h"><h2>🗓 ${mm}月のまとめ</h2><p>先月の英語を、カードでふりかえります。← スワイプで次へ →</p></div><div id="rcBody"><p class="loading">集めています…</p></div>`;
  $("kzBack").addEventListener("click", () => { KZ = null; renderKz(); });
  if (!RCD || RCD.m !== m) RCD = await rcCollect(m);
  rcRenderCards(RCD);
}
async function rcCollect(m){
  let base = null;
  if (apiOn() && !DEMO){ try { base = await api("/api/month-review?m=" + m, null); } catch (e) { base = null; } }
  if (!base){
    const days = rcMonthDays(studySet(ME), m);
    base = {minutes: days.reduce((s, k) => s + (typeof studyMinutes === "function" ? studyMinutes(k) : 0), 0), days: days.length};
  }
  const cc = new Set(); ((ME && ME.photos) || []).filter(p => String(p.d || "").startsWith(m)).forEach(p => (p.cc || []).forEach(c => cc.add(c.iso)));
  let buddy = null;
  if (DEMO) buddy = (ME && ME.buddy) || null;
  else if (bdReady()){ await bdLoad(true); buddy = BUDDY.data; }
  return {m, minutes: Math.round(base.minutes || 0), days: base.days || 0, cc: [...cc], longest: rcLongestStreak(studySet(ME), m), pbN: rcPbCount(m), buddy};
}
function rcStatCard(icon, num, unit, label, note){
  return `<div class="panel rc-stat"><span class="rc-ic" aria-hidden="true">${icon}</span><b class="num">${fmt(num)}${unit ? `<small>${esc(unit)}</small>` : ""}</b><span class="rc-label">${esc(label)}</span><p class="mapnote">${esc(note)}</p></div>`;
}
function rcShareCard(){
  return `<div class="panel rc-share"><h3>シェアする</h3><div class="sns-cvbox"><canvas id="rcCv" class="sns-cv" width="1080" height="1350" aria-label="先月のまとめのシェアカード"></canvas></div>
    <p class="sns-hint">本名・顔・お店・アプリのリンクや鍵は入れません。画像はこの端末で作ります。</p>
    <div class="sns-share"><button type="button" data-rcgo="sheet"><b>📤</b>Instagram など<small>共有シート</small></button><button type="button" data-rcgo="x"><b>𝕏</b>X<small>投稿画面へ</small></button><button type="button" data-rcgo="save"><b>⬇</b>保存<small>画像</small></button></div></div>`;
}
function rcRenderCards(d){
  const bd = d.buddy, bn = bd ? (bd.streak || 0) : 0, hasBuddy = bd && (bd.streak || (bd.buddies || []).length);
  const cards = [
    rcStatCard("⏱️", d.minutes, "分", "練習した", d.days ? `${d.days}日 練習しました` : "来月は、1日からはじめましょう"),
    rcStatCard("🔥", d.longest, "日", "最長の連続", d.longest ? "いちばん長く続いた連続日数です" : "来月は、連続をのばしてみましょう"),
    rcStatCard("🌍", d.cc.length, "か国", "乾杯した国", d.cc.length ? d.cc.slice(0, 10).map(flagOf).join(" ") : "来月は、新しい国と乾杯してみましょう"),
    rcStatCard("🏅", d.pbN, "種目", "自己ベスト更新", d.pbN ? "先月、自己ベストを更新した種目の数です" : "自己ベストはこの端末（マイ）に記録されています"),
    hasBuddy ? rcStatCard("🤝", bn, "日", "バディの連続", "仲間と一緒に練習できた連続日数です") : rcStatCard("🤝", 0, "", "乾杯バディ", "まだバディがいません。マイ＞乾杯バディから招待できます"),
    rcShareCard(),
  ];
  const box = $("rcBody");
  box.innerHTML = `<div class="rc-wrap"><div class="rc-track" id="rcTrack">${cards.map((c, i) => `<div class="rc-card" data-rci="${i}">${c}</div>`).join("")}</div></div>
    <div class="rc-dots" role="tablist" aria-label="カードの位置">${cards.map((_, i) => `<button type="button" role="tab" aria-selected="${i === 0}" data-rcdot="${i}" aria-label="カード${i + 1}"></button>`).join("")}</div>
    <div class="rc-nav"><button type="button" class="btn ghost sm" id="rcPrev" disabled>← 前へ</button><button type="button" class="btn ghost sm" id="rcNext">次へ →</button></div>`;
  const track = $("rcTrack");
  const rcSync = () => {
    box.querySelectorAll("[data-rcdot]").forEach((b, i) => b.setAttribute("aria-selected", String(i === RC_I)));
    $("rcPrev").disabled = RC_I === 0; $("rcNext").disabled = RC_I === cards.length - 1;
  };
  const goTo = i => { RC_I = Math.max(0, Math.min(cards.length - 1, i)); track.scrollTo({left: RC_I * track.clientWidth, behavior: reduce ? "auto" : "smooth"}); rcSync(); };
  box.querySelectorAll("[data-rcdot]").forEach(b => b.addEventListener("click", () => goTo(+b.dataset.rcdot)));
  $("rcPrev").addEventListener("click", () => goTo(RC_I - 1));
  $("rcNext").addEventListener("click", () => goTo(RC_I + 1));
  let st; track.addEventListener("scroll", () => { clearTimeout(st); st = setTimeout(() => { RC_I = Math.round(track.scrollLeft / Math.max(1, track.clientWidth)); rcSync(); }, 80); });
  box.querySelectorAll("[data-rcgo]").forEach(b => b.addEventListener("click", () => rcShareGo(b.dataset.rcgo)));
  rcSync();
  rcDraw(d);
}
async function rcDraw(d){
  const cv = $("rcCv"); if (!cv) return; const g = cv.getContext("2d"), W = cv.width, H = cv.height, P = 80;
  const F = (w, s) => `${w} ${s}px "Zen Kaku Gothic New", "Hiragino Sans", sans-serif`;
  const text = (t, x, y, f, c, al) => { g.font = f; g.fillStyle = c; g.textAlign = al || "left"; g.fillText(t, x, y); };
  const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, "#1A2F66"); gr.addColorStop(1, "#2D6BE0"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const nick = typeof snsNick === "function" ? snsNick() : "";
  text(`${nick ? nick + " の" : ""}${+d.m.slice(5)}月のまとめ`, P, 170, F(700, 50), "#fff");
  const box = (x, y, w, h, big, unit, sub) => { g.fillStyle = "#fff"; g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, 32) : g.rect(x, y, w, h); g.fill();
    text(String(big), x + w / 2, y + h * 0.42, F(900, 72), "#1A2F66", "center"); text(unit, x + w / 2, y + h * 0.42 + 42, F(700, 28), "#1A2F66", "center");
    if (sub) text(sub, x + w / 2, y + h - 22, F(600, 24), "#5b6b94", "center"); };
  const bw = (W - P * 2 - 30) / 2, bh = 220, y0 = 230, bn = d.buddy ? (d.buddy.streak || 0) : 0;
  box(P, y0, bw, bh, d.minutes, "分 練習", `${d.days}日`);
  box(P + bw + 30, y0, bw, bh, d.longest, "日 最長連続", "");
  box(P, y0 + bh + 24, bw, bh, d.cc.length, "か国と乾杯", d.cc.slice(0, 8).map(flagOf).join(" "));
  box(P + bw + 30, y0 + bh + 24, bw, bh, d.pbN, "種目 自己ベスト", "");
  box(P, y0 + (bh + 24) * 2, W - P * 2, bh, bn, "日 バディの連続", bn ? "" : "ひとりでも立派な記録です");
  text("#チアーズGO #英語学習", P, H - 70, F(700, 36), "#fff");
  const logo = typeof snsLogo === "function" ? await snsLogo().catch(() => null) : null;
  if (logo){ const lh = 60, lw = logo.width * lh / logo.height; g.drawImage(logo, W - P - lw, H - 70 - lh + 10, lw, lh); } else text("Cheers mate", W - P, H - 70, F(700, 36), "#fff", "right");
}
async function rcShareGo(kind){
  const cv = $("rcCv"); if (!cv || !RCD) return;
  const t = `${+RCD.m.slice(5)}月のまとめ ${RCD.minutes}分・最長${RCD.longest}日・${RCD.cc.length}か国と乾杯 #チアーズGO #英語学習`;
  if (kind === "x"){ window.open("https://x.com/intent/post?text=" + encodeURIComponent(t), "_blank", "noopener"); return; }
  const blob = await new Promise(res => cv.toBlob(b => res(b), "image/png")), file = new File([blob], `cheersgo-recap-${RCD.m}.png`, {type: "image/png"});
  if (kind === "sheet" && navigator.canShare && navigator.canShare({files: [file]})){ try { await navigator.share({files: [file], text: t}); } catch (e) { if (e && e.name !== "AbortError") toast("共有できませんでした"); } return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
/* ================= 端末のあいだで同期：私の単語集・今月の目標・連続記録・自己ベスト ================= */
/* 中継の /api/sync に、この端末の分を送ると、サーバーにある分とまとめたものが返ってくる（本人の確認は合言葉＝ほかの API と同じ）。
   まとめ方：単語集は同じ英語ごとに更新日時（u）の新しい方・消したものは「消した日時」が新しければ消す／目標は月ごとに新しい方／
   連続記録は端末ごとの日別の回数（練習の回数・開いた日）の大きい方／自己ベスト（pb）は種類ごとに良い方（app/_part_talk.js の pbMerge）。
   電波がないときは端末の保存のまま使い、つながったら送る */
const SYNC = {on: false, rev: 0, busy: false, t: null, last: 0, sent: store("cg-sync-sent") || ""};
// 送る回数を減らす（中継の D1 の書き込みを抑える）：変えてから10秒まとめる・前に送った中身と同じなら送らない・送るのは60秒に1回まで。
// ほかの端末の分を受け取るだけのときは中身なし（{}）で送る＝サーバーは書き込まない。それも10分に1回まで
const SYNC_WAIT = 10e3, SYNC_MIN = 60e3, SYNC_PULL = 600e3;
const syncSig = t => { let h = 5381; for (let i = 0; i < t.length; i++) h = (h * 33 + t.charCodeAt(i)) | 0; return t.length + ":" + (h >>> 0).toString(36); };   // 前に送った中身の印（中身そのものは保存しない）
const syncBody = () => ({words: {items: wdList(), del: wdDel()}, goals: goalsLocal(), days: {[syncDev()]: myDays()}, profile: itvProfileRaw(), pb: pbAll()});
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
    const before = JSON.stringify([wdList(), goalsLocal(), syncDaysOther(), itvProfileRaw(), pbAll()]);
    if (r.words){ store("kz-words", JSON.stringify(r.words.items || [])); store("kz-words-del", JSON.stringify(r.words.del || {})); }
    Object.entries(r.goals || {}).forEach(([ym, g]) => { if (/^\d{4}-\d{2}$/.test(ym) && g) store("cg-goal-" + ym, JSON.stringify(g)); });
    if (r.days) store("cg-sync-days", JSON.stringify(r.days));
    if (r.profile) store("cg-profile", JSON.stringify(r.profile));
    pbMerge(r.pb);   // 自己ベスト：良い方だけ取り込む（手元の記録は下げない・お祝いはしない）
    if (JSON.stringify([wdList(), goalsLocal(), syncDaysOther(), itvProfileRaw(), pbAll()]) !== before) syncRedraw();
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
  itvOnSync();
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
  const tp = tpLineHtml();
  const head = `<div class="sec-h"><h2>${SPARK}会員サイト講座<i class="utb">UTAGE</i></h2><p>会員サイトの講座の進み具合。動画は「会員サイトで見る」から開けます。${DEMO ? "（デモは架空のコースです）" : ""}</p></div>`;
  const note = t => `<section class="utage" id="utage">${tp}${head}<p class="mapnote">${t}</p></section>`;
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
  return `<section class="utage" id="utage">${tp}${head}${cs ? `<div class="ut-list">${cs}</div>` : ""}${group("未開始のコース", rest)}${group("連絡事項", notes)}${UT.err ? `<p class="mapnote">いまは新しい分を読み込めないので、前回の表示です。</p>` : ""}</section>`;
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
  if (DEMO){ UT.show = true; UT.data = UT_DEMO; TP.done = TP_DEMO.slice(); loadTradePath().then(utagePaint); return; }
  if (d.viewer || !apiOn() || !API_AUTH) return;
  UT.show = true;
  try { UT.data = JSON.parse(store(utKey()) || "null"); } catch (e) {}
  utageLoad();
  tpLoadLocal(); tpLoad(); loadTradePath().then(utagePaint);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && Date.now() - UT.last > 600e3) utageLoad(); });   // 中継の控えと同じ10分
}
// デモの架空のコース（実在の会員サイト・リンクは入れない）
const UT_DEMO = {linked: true, courses: [{name: "デモ：貿易英語の基本", percent: 40, done: 4, total: 10, url: "", next: {name: "L5 見積書の作り方", step: "STEP2 価格交渉"},
  steps: [{name: "STEP1 はじめの一歩", lessons: [{name: "L1 自己紹介メール", done: true}, {name: "L2 会社の紹介", done: true}, {name: "L3 商品の説明", done: true}]},
          {name: "STEP2 価格交渉", lessons: [{name: "L4 値段を聞く", done: true}, {name: "L5 見積書の作り方", done: false}, {name: "L6 値引きのお願い", done: false}, {name: "L7 支払い条件", done: false}]},
          {name: "STEP3 出荷", lessons: [{name: "L8 インボイス", done: false}, {name: "L9 送料と通関", done: false}, {name: "L10 お礼のメール", done: false}]}]}]};

/* ================= 貿易の道しるべ（マイルストーンライン。docs/gamify-1022.md「3」） =================
   置き場所はこのウィジェット（UTAGE講座進捗）の最上部。ステップはカリキュラムの7つだけ
   （リサーチ→商品選択→セールス戦略→販売ページ→集客→Zoom商談→貿易実務。app/trade_path.json の milestones）。
   金額のマイルストーン（例：月売上○万円）は、このmanifestにデータを1件足すだけで同じ線に差し込める設計
   （見た目は id・icon・title・desc の4項目だけを使う汎用レンダリングなので、kind が増えてもコード変更は不要）。
   現在ステップ（まだ自己申告していない最初のステップ）だけ1タップで開く。中の「達成した！」は自己申告で、
   relay D1 の trade_claims に追記するだけ（status='pending'）。先生のレビュー画面はこの範囲では作らない。 */
const TP = {done: []};
let TP_MANIFEST = null;
const TP_DEMO = ["research", "product"];                              // デモ：2つだけ達成ずみ（架空）
const tpKey = () => "cg-trade-" + (API_AUTH ? API_AUTH.u : "");
const loadTradePath = () => TP_MANIFEST ? Promise.resolve(TP_MANIFEST)
  : fetch("trade_path.json", {cache: "no-cache"}).then(r => r.ok ? r.json() : Promise.reject(0))
    .then(x => (TP_MANIFEST = x && Array.isArray(x.milestones) ? x : {milestones: []}))
    .catch(() => (TP_MANIFEST = {milestones: []}));
function tpLoadLocal(){ try { const v = JSON.parse(store(tpKey()) || "[]"); TP.done = Array.isArray(v) ? v : []; } catch (e) { TP.done = []; } }
async function tpLoad(){
  try {
    const r = await api("/api/trade/claims");
    TP.done = Array.isArray(r.steps) ? r.steps : [];
    store(tpKey(), JSON.stringify(TP.done));
  } catch (e) {}                                                      // 読めないときは前回の控えのまま
  utagePaint();
}
function tpLineHtml(){
  const ms = (TP_MANIFEST && TP_MANIFEST.milestones) || [];
  if (!ms.length) return "";
  const curIdx = ms.findIndex(m => !TP.done.includes(m.id));
  const node = (m, i) => {
    const done = TP.done.includes(m.id), cur = i === curIdx;
    return `<li class="tp-n ${done ? "done" : cur ? "cur" : "next"}"${cur ? ` data-tp="${esc(m.id)}"` : ""}>
      <i class="tp-dot">${done ? "✓" : esc(m.icon || "")}</i><span class="tp-t">${esc(m.title)}</span></li>`;
  };
  return `<section class="tp-path" id="tp-path">
    <div class="sec-h"><h2>🧭${esc(TP_MANIFEST.title || "貿易の道しるべ")}</h2><p>7つのステップを順番に。できたら現在のステップをタップして「達成した！」。</p></div>
    <ul class="tp-line">${ms.map(node).join("")}</ul></section>`;
}
// 現在ステップ（1タップで開く。達成済み・まだ先のステップは開かない）だけに data-tp。クリックはページ全体で1つだけ受ける（utagePaint の差し替えでも効く）
document.addEventListener("click", e => { const b = e.target.closest("#tp-path [data-tp]"); if (b) tpOpen(b.dataset.tp); });
function tpOpen(id){
  const ms = (TP_MANIFEST && TP_MANIFEST.milestones) || []; const m = ms.find(x => x.id === id); if (!m) return;
  document.querySelectorAll(".tp-overlay").forEach(x => x.remove());
  const wrap = document.createElement("div");
  wrap.className = "tp-overlay"; wrap.setAttribute("role", "dialog"); wrap.setAttribute("aria-label", "貿易の道しるべ");
  wrap.innerHTML = `<div class="tp-card${reduce ? "" : " in"}">
    <div class="tp-h"><span class="tp-ic" aria-hidden="true">${esc(m.icon || "🧭")}</span><b>${esc(m.title)}</b><button type="button" class="tp-x" aria-label="閉じる">×</button></div>
    <p class="tp-desc">${esc(m.desc || "")}</p>
    <button type="button" class="btn tp-go">達成した！</button>
    <p class="tp-note">押すと自己申告として記録されます（確認は運営が行います）。</p>
  </div>`;
  document.body.appendChild(wrap);
  wrap.querySelector(".tp-x").addEventListener("click", () => wrap.remove());
  wrap.querySelector(".tp-go").addEventListener("click", e => tpClaim(id, e.target));
}
async function tpClaim(id, btn){
  if (DEMO){
    if (!TP.done.includes(id)) TP.done.push(id);
    btn.outerHTML = `<p class="tp-ok">✓ 達成した！（デモなので送っていません）</p>`;
    utagePaint();
    return;
  }
  btn.disabled = true; btn.textContent = "送っています…";
  try {
    await api("/api/trade/claim", {step: id});
    if (!TP.done.includes(id)) TP.done.push(id);
    store(tpKey(), JSON.stringify(TP.done));
    btn.outerHTML = `<p class="tp-ok">✓ 達成した！を送りました</p>`;
    utagePaint();
  } catch (e) {
    btn.disabled = false; btn.textContent = "達成した！";
    const note = btn.closest(".tp-card").querySelector(".tp-note");
    if (note) note.textContent = e.message || "いまは送れません。時間をおいて開き直してください。";
  }
}
/* ================= ひろば（マッチング・2Dマップ・声）。docs/hiroba.md ================= */
/* タブ「ひろば」：［マップ｜さがす｜予定｜オフ会］。中継は relay/worker.js の /api/hr/*（マッチング）・/api/pk/*（パスキー）・/api/hr/ws（2Dマップ・Durable Object）・/api/hr/rtc/*（声・Cloudflare Realtime）。
   名前は呼び名とアイコンだけ。位置・声は保存しない。デモ（#demo）は架空の人で、どこにも送らない。CSS は hr- で始まる名前だけ */
const HR_MAP_ON = true;                                                   // 2Dマップ（フェーズ2）。false のあいだはタブを出さず、みんなの1行から さがす・予定 だけ
const HR_ACT_L = [["rp", "🎭", "英語ロールプレイ", "空港・ホテル・商談"], ["moku", "💻", "もくもく作業", "だまって一緒にがんばる"], ["free", "☕", "英語で雑談", "15〜30分"],
  ["trade", "🍵", "貿易の相談会", "先生🎓つき"], ["pron", "🗣️", "発音チェックしあい", "2人〜"], ["off", "🍻", "オフ会に行きたい", "街を選ぶ"]];
const HR_ACT = Object.fromEntries(HR_ACT_L.map(a => [a[0], a]));
const HR_LV = [["beg", "はじめて"], ["daily", "日常会話"], ["biz", "ビジネス"]];
const HR_SZ = [["pair", "1対1"], ["group", "3〜4人"], ["any", "どちらでも"]];
const HR_SLOT = 1800e3;
const HR = {seg: store("hr-seg") || "map", st: null, loading: false, pick: {act: "rp", size: "group", level: "daily", lang: "en", slots: new Set(), now: false}, when: "today", view: null,
  ws: null, me: null, peers: {}, wsWant: false, retry: 0, demo: null, v: null, lastErr: ""};
const hrOn = () => PERSONAL && !(ME && ME.viewer);
const hrSlotNow = () => Math.floor(Date.now() / HR_SLOT);
const hrJ = ms => { const d = new Date(ms + 9 * 3600e3); return {md: `${d.getUTCMonth() + 1}/${d.getUTCDate()}`, wd: "日月火水木金土"[d.getUTCDay()], hm: d.toISOString().slice(11, 16), h: d.getUTCHours(), day: d.toISOString().slice(0, 10)}; };
const hrWhen = (a, b) => { const x = hrJ(a), y = hrJ(b); return `${x.md}（${x.wd}）${x.hm}〜${y.hm}`; };
const hrApi = (p, body) => api(p, body);
const hrSegs = () => [...(HR_MAP_ON ? [["map", "マップ"]] : []), ["find", "さがす"], ["plan", "予定"], ["off", "オフ会"]];

/* ---------- デモ（架空の人だけ・端末の中だけ） ---------- */
function hrDemoState(){
  if (HR.demo) return HR.demo;
  const s0 = (hrSlotNow() + 6) * HR_SLOT, heat = {rp: {}};
  for (let k = 0; k < 7; k++){ const day = Math.floor((Date.now() + 9 * 3600e3) / 864e5) + k + 1; heat.rp[(day * 864e5 - 9 * 3600e3) / HR_SLOT + 40] = 3; heat.rp[(day * 864e5 - 9 * 3600e3) / HR_SLOT + 41] = 4; }
  HR.demo = {me: {a: "demo-me", pk: false, pkFresh: false, limit: null, staff: false}, now: hrSlotNow(), reqs: [], heat,
    events: [{id: 1, title: "東京オフ会（例）", city: "東京", venue: "渋谷駅の近くのお店", start: new Date(Date.now() + 18 * 864e5).toISOString(), cap: 12, host: "運営"}],
    matches: [{id: "demo1", act: "rp", size: "group", lang: "en", level: "daily", start: s0, end: s0 + 45 * 60e3, tbl: "rpA", table: "ロールプレイ卓 A", topic: "空港チェックイン（役：客・係員・観察）", status: "set", my: "in", ics: "",
      members: [{a: "demo-me", nick: snsNick(), icon: snsIcon(), me: true, st: "in"}, {a: "d-aki", nick: "Aki", icon: "🦊", st: "in"}, {a: "d-ken", nick: "Ken", icon: "🐼", st: "in"}]}]};
  return HR.demo;
}
async function hrLoad(force){
  if (!hrOn()) return null;
  if (DEMO){ HR.st = hrDemoState(); return HR.st; }
  if (!apiOn()) return null;
  if (HR.loading && !force) return HR.st;
  HR.loading = true;
  const key = st => st ? JSON.stringify([st.matches, st.reqs, st.events, st.me]) : "", was = key(HR.st), had = !!HR.st;
  try { HR.st = await hrApi("/api/hr/state"); HR.stAt = Date.now(); HR.lastErr = ""; hrSaveNext(); }
  catch (e) { HR.lastErr = e.message; }
  finally { HR.loading = false; }
  if (had && key(HR.st) !== was && !force && !$("pane-hr")?.hidden && (HR.seg === "plan" || HR.seg === "off") && !document.querySelector(".hr-sheet")) renderHr();   // 裏で読みなおして変わったら、予定・オフ会を描きなおす
  return HR.st;
}
function hrSaveNext(){                                                      // ホームの1行用に、次の会だけ端末に控える（呼び名・人数・時刻だけ）
  const n = ((HR.st || {}).matches || []).filter(m => m.status === "set" && m.my !== "left" && m.end > Date.now()).sort((a, b) => a.start - b.start)[0];
  store("hr-next", n ? JSON.stringify({id: n.id, act: n.act, start: n.start, end: n.end, n: n.members.length}) : null);
  const el = document.getElementById("hrHome"); if (el) el.outerHTML = hrHomeLineHtml();
}
/* ---------- ホームの1行（次の会があるときだけ・約44px。ないときは何も出さない） ---------- */
function hrHomeLineHtml(){
  if (!hrOn()) return "";
  let n = null; try { n = JSON.parse(store("hr-next") || "null"); } catch (e) {}
  // デモのホームには出さない（ホームの高さ 1,266px の確認はデモで測るため。デモの会はひろば＞予定に出る）
  if (!n || n.end < Date.now() || n.start - Date.now() > 7 * 864e5) return `<span id="hrHome" hidden></span>`;
  const a = HR_ACT[n.act] || ["", "🤝", "ひろば"];
  return `<button type="button" class="hr-homeline" id="hrHome" data-hrm="${esc(n.id)}">🤝 <b>ひろば</b> ${esc(a[2])}（${n.n}人）${esc(hrWhen(n.start, n.end))}</button>`;
}
/* みんなの上の入口（マップがまだのあいだ＝フェーズ1） */
function hrEntryHtml(){
  if (!hrOn() || HR_MAP_ON) return "";
  return `<button type="button" class="hr-entry" data-hrgo="find">🤝 <b>相手をさがす</b><small>ロールプレイ・もくもく・雑談の相手と時間を合わせる</small><span>›</span></button>`;
}

/* ---------- 画面 ---------- */
function renderHr(seg){
  const el = $("hrwrap"); if (!el) return;
  const q = new URLSearchParams(location.search);
  if (q.get("m") && !HR.view){ HR.view = q.get("m"); seg = "plan"; history.replaceState(null, "", location.pathname + keyHash()); }
  if (seg) HR.seg = seg;
  if (!hrSegs().some(([k]) => k === HR.seg)) HR.seg = hrSegs()[0][0];
  store("hr-seg", HR.seg);
  segBar($("hrSeg"), hrSegs().map(([k, l]) => [k, k === "plan" && hrPlanBadge() ? `${l}<i class="hr-badge num">${hrPlanBadge()}</i>` : l]), HR.seg, "data-hs");
  if (!hrOn()){ el.innerHTML = `<div class="msg"><b>ひろばは、本人用のリンクで開いたときに使えます。</b></div>`; return; }
  if (!DEMO && !apiOn()){ el.innerHTML = `<div class="msg"><b>ひろばは準備中です。</b><p class="mapnote">中継につながると使えます。</p></div>`; return; }
  if (HR.seg !== "map") hrMapStop();
  if (!HR.st && !HR.loading){ el.innerHTML = `<p class="loading">ひろばを読み込んでいます…</p>`; hrLoad().then(() => renderHr()); return; }
  if (!HR.st){ el.innerHTML = `<p class="loading">ひろばを読み込んでいます…</p>`; return; }
  if (HR.seg === "map") return hrMapRender(el);
  if (HR.seg === "find") el.innerHTML = hrFindHtml();
  if (HR.seg === "plan") el.innerHTML = HR.view ? hrMatchedHtml(HR.view) : hrPlanHtml();
  if (HR.seg === "off") el.innerHTML = hrOffHtml();
  hrFresh();
}
/* 予定・オフ会を開いたとき、3秒より古ければ読みなおす。さがしている希望があるあいだは20秒ごと（通知が来ない端末でも成立に気づける） */
function hrFresh(){
  clearTimeout(HR.freshT);
  if (DEMO || !hrOn() || !apiOn() || $("pane-hr")?.hidden) return;
  const pend = ((HR.st || {}).reqs || []).length > 0, old = Date.now() - (HR.stAt || 0);
  const go = async now1 => {
    if ($("pane-hr")?.hidden) return;
    if (HR.loading){ HR.freshT = setTimeout(() => go(now1), 600); return; }     // 読み込み中なら少し待ってもう一度
    if (!now1 && document.hidden) return hrFresh();
    const k = () => JSON.stringify([(HR.st || {}).matches, (HR.st || {}).reqs, (HR.st || {}).events, (HR.st || {}).me]);
    const was = k();
    await hrLoad(true);
    const now = k();
    if (now !== was && (HR.seg === "plan" || HR.seg === "off") && !document.querySelector(".hr-sheet")) renderHr(); else hrFresh();
  };
  if ((HR.seg === "plan" || HR.seg === "off") && old > 3e3) HR.freshT = setTimeout(() => go(true), 50);
  else if (pend && HR.seg !== "map") HR.freshT = setTimeout(go, 20e3);
}
const hrPlanBadge = () => ((HR.st || {}).matches || []).filter(m => m.status === "set" && m.my === "in" && m.start > Date.now()).length;

/* さがす（pick.png）：① なにをする ② だれと ③ レベル・ことば ④ いつ（今すぐ／今日／1週間）→ 送る */
function hrTodaySlots(){ const now = hrSlotNow(), j = hrJ(Date.now()), end = Math.floor((Date.parse(j.day + "T24:00:00+09:00")) / HR_SLOT); const out = []; for (let s = now + 1; s < end; s++) out.push(s); return out; }
function hrFindHtml(){
  cdHrPreset(HR.pick);
  const P = HR.pick, st = HR.st, heat = (st.heat || {})[P.act] || {};
  const tiles = HR_ACT_L.map(([k, ic, n, d]) => `<button type="button" class="hr-tile" data-hract="${k}" aria-pressed="${P.act === k}"><b>${ic} ${n}</b><small>${d}</small></button>`).join("");
  const chip = (attr, k, l, on, extra = "") => `<button type="button" class="hr-chip" ${attr}="${k}" aria-pressed="${on}">${l}${extra}</button>`;
  if (P.act === "off") return `<section class="hr-card"><h3>① なにをする？</h3><div class="hr-tiles">${tiles}</div></section>
    <section class="hr-card"><p>オフ会は、運営・先生が開くものに参加できます。<button type="button" class="btn sm2" data-hrgo="off">オフ会を見る</button></p></section>`;
  const pkNote = !st.me.pkFresh ? `<span class="hr-lock">🔒</span>` : "";
  const today = hrTodaySlots();
  const slotsN = P.slots.size + (P.now ? 1 : 0);
  let when;
  if (HR.when === "today") when = today.length ? `<div class="hr-today">${today.map(s => { const h = heat[s] || 0; return `<button type="button" class="hr-slot${h ? " hot" : ""}" data-hrslot="${s}" aria-pressed="${P.slots.has(s)}">${hrJ(s * HR_SLOT).hm}${h ? `<i>${h}</i>` : ""}</button>`; }).join("")}</div>` : `<p class="mapnote">今日のコマは終わりました。「1週間」から選んでください。</p>`;
  else {
    const day0 = Math.floor((Date.now() + 9 * 3600e3) / 864e5), hours = [7, 8, 12, 13, 18, 19, 20, 21, 22, 23];
    const days = [...Array(7)].map((_, k) => day0 + k + 1);
    const head = days.map(d => { const j = hrJ(d * 864e5 - 9 * 3600e3); return `<th>${j.wd}<br><b class="num">${j.md.split("/")[1]}</b></th>`; }).join("");
    const rows = hours.map(h => `<tr><th>${h}時</th>${days.map(d => { const s = (d * 864e5 - 9 * 3600e3) / HR_SLOT + h * 2, on = P.slots.has(s) && P.slots.has(s + 1), hot = (heat[s] || 0) + (heat[s + 1] || 0);
      return `<td><button type="button" class="hr-cell${hot ? " hot" : ""}" data-hrcell="${s}" aria-pressed="${on}" aria-label="${hrJ(s * HR_SLOT).md} ${h}時">${hot ? `<i>${hot}</i>` : ""}</button></td>`; }).join("")}</tr>`).join("");
    when = `<table class="hr-week"><thead><tr><th></th>${head}</tr></thead><tbody>${rows}</tbody></table><p class="hr-legend"><i class="b"></i>わたしの空き　<i class="y"></i>同じ希望の人がいる時間（数字は人数）。1マス＝1時間（30分×2）</p>`;
  }
  return `${cdHrBanner()}<section class="hr-card"><h3>① なにをする？</h3><div class="hr-tiles">${tiles}</div></section>
  <section class="hr-card"><h3>② だれと？</h3><div class="hr-chips">${HR_SZ.map(([k, l]) => chip("data-hrsz", k, l, P.size === k, k === "pair" ? pkNote : "")).join("")}</div>
    ${P.size !== "group" && !st.me.pkFresh ? `<p class="hr-note">1対1は、パスキー（顔認証）を済ませた人だけです。${P.size === "pair" ? "送るときに確認します。" : "まだなので、3〜4人の会でさがします。"}<button type="button" class="hr-link" data-hrpk>パスキーを設定する</button></p>` : ""}
    ${st.me.limit ? `<p class="hr-note warn">最近、参加を押さずに終わった会が2回ありました。${esc(hrJ(Date.parse(st.me.limit)).md)} までは3〜4人の会だけ選べます。</p>` : ""}
  <h3>③ レベル・ことば</h3><div class="hr-chips">${HR_LV.map(([k, l]) => chip("data-hrlv", k, l, P.level === k)).join("")}<span class="hr-sep"></span>${chip("data-hrlang", "en", "英語", P.lang === "en")}${chip("data-hrlang", "ja", "日本語OK", P.lang === "ja")}</div></section>
  <section class="hr-card"><h3>④ いつ空いてる？</h3>
    <label class="hr-now"><input type="checkbox" data-hrnow ${P.now ? "checked" : ""}><span><b>⚡ 今すぐ（15分以内）でもOK</b><small>いまさがしている人とすぐつなぐ</small></span></label>
    <div class="hr-chips hr-whenseg">${chip("data-hrwhen", "today", "今日", HR.when === "today")}${chip("data-hrwhen", "week", "1週間", HR.when === "week")}</div>${when}</section>
  <button type="button" class="btn hr-send" data-hrsend ${slotsN ? "" : "disabled"}>この内容で送る（${slotsN}コマ）</button>
  <p class="hr-foot">成立したら通知でお知らせします（ホーム画面に追加した iPhone は iOS 16.4 以上）。日時は日本時間。</p>`;
}
/* 予定：成立した会・さがしている希望（取り消し） */
function hrPlanHtml(){
  const st = HR.st, ms = (st.matches || []).filter(m => m.my !== "left").sort((a, b) => a.start - b.start);
  const up = ms.filter(m => m.end > Date.now() && m.status === "set"), past = ms.filter(m => !(m.end > Date.now() && m.status === "set")).slice(-5).reverse();
  const row = m => { const a = HR_ACT[m.act] || ["", "🤝", "ひろば"]; return `<li><button type="button" class="hr-mrow" data-hrm="${esc(m.id)}"><span class="hr-mic">${a[1]}</span><span><b>${esc(a[2])}（${m.members.length}人）</b><small>${esc(hrWhen(m.start, m.end))}・${esc(m.table)}</small></span>
    <em class="hr-stt ${m.status}">${m.status === "cancelled" ? "中止" : m.status === "done" ? (m.my === "came" ? "参加した" : "終了") : m.start - Date.now() < 10 * 60e3 ? "入れます" : "成立"}</em></button></li>`; };
  const reqs = (st.reqs || []).map(r => { const a = HR_ACT[r.act] || ["", "🤝", r.act]; const s = r.slots || [];
    return `<li class="hr-req"><span class="hr-mic">${a[1]}</span><span><b>${esc(a[2])}・${esc((HR_SZ.find(x => x[0] === r.size) || ["", ""])[1])}</b><small>さがしています・${s.length}コマ（${s.length ? esc(hrJ(s[0] * HR_SLOT).md + " " + hrJ(s[0] * HR_SLOT).hm) + "〜" : ""}）</small></span><button type="button" class="hr-link" data-hrcancel="${r.id}">取り消す</button></li>`; }).join("");
  return `${up.length ? `<section class="hr-card"><h3>これからの会</h3><ul class="hr-list">${up.map(row).join("")}</ul></section>` : ""}
    <section class="hr-card"><h3>さがしている希望</h3>${reqs ? `<ul class="hr-list">${reqs}</ul>` : `<p class="mapnote">いまはありません。</p>`}<button type="button" class="btn ghost sm2" data-hrgo="find">＋ 相手をさがす</button></section>
    ${past.length ? `<section class="hr-card"><h3>これまで</h3><ul class="hr-list">${past.map(row).join("")}</ul></section>` : ""}
    ${!up.length && !reqs ? `<p class="hr-foot">「さがす」でやりたいことと時間を送ると、条件が合った人と会が成立します。</p>` : ""}`;
}
/* 成立しました（matched.png） */
function hrMatchedHtml(id){
  const m = ((HR.st || {}).matches || []).find(x => x.id === id);
  if (!m) return `<div class="msg"><b>その会は見つかりませんでした。</b><p><button type="button" class="hr-link" data-hrback>予定にもどる</button></p></div>`;
  const a = HR_ACT[m.act] || ["", "🤝", "ひろば"], lv = (HR_LV.find(x => x[0] === m.level) || ["", ""])[1];
  const canJoin = m.status === "set" && m.my !== "left" && Date.now() >= m.start - 10 * 60e3 && Date.now() < m.end;
  const mem = m.members.map(x => `<span class="hr-mem"><i>${esc(x.icon)}</i><b>${x.me ? "わたし" : esc(x.nick)}</b>${x.me ? "" : `<button type="button" class="hr-more" data-hrmore="${esc(x.a)}" aria-label="${esc(x.nick)}さんの通報・ブロック">…</button>`}</span>`).join("");
  const status = m.status === "cancelled" ? `<p class="hr-note warn">この会は中止になりました。希望はもう一度さがしています。</p>` : m.status === "done" ? `<p class="hr-note">この会は終わりました。</p>` : m.my === "left" ? `<p class="hr-note">行けなくなったと送りました。</p>` : "";
  return `<button type="button" class="hr-link hr-back" data-hrback>‹ 予定</button>
  <section class="hr-hero"><div class="hr-pop" aria-hidden="true">🎉</div><h2>${m.status === "set" ? "成立しました" : esc(a[2])}</h2><p>${esc(a[2])}・${m.members.length}人${lv ? "・" + esc(lv) : ""}${m.lang === "ja" ? "・日本語OK" : ""}</p><div class="hr-mems">${mem}</div></section>
  ${status}
  <section class="hr-card hr-info"><dl><dt>日時</dt><dd>${esc(hrWhen(m.start, m.end))}（日本時間）</dd><dt>場所</dt><dd>ひろば ＞ ${esc(a[1])} ${esc(m.table)}</dd>${m.topic ? `<dt>お題</dt><dd>${esc(m.topic)}</dd>` : ""}<dt>通知</dt><dd>前日21時・10分前・開始時にお知らせ</dd></dl></section>
  ${m.status === "set" && m.my !== "left" ? `<button type="button" class="btn hr-join" data-hrjoin="${esc(m.id)}" ${canJoin ? "" : "disabled"}>▶ 参加する（卓へ移動して話す）</button>
  ${canJoin ? "" : `<p class="hr-foot">「参加する」は開始10分前から押せます。</p>`}
  ${m.ics ? `<a class="btn ghost hr-ics" href="${esc(m.ics)}" target="_blank" rel="noopener" data-hrics>📅 カレンダーに入れる（.ics）</a>` : `<button type="button" class="btn ghost hr-ics" data-hrdemoics>📅 カレンダーに入れる（.ics）</button>`}
  <button type="button" class="hr-link hr-leave" data-hrleave="${esc(m.id)}">行けなくなった（1時間前までなら気にせずOK）</button>` : ""}
  <p class="hr-foot">通話は録音しません。運営が見るのは通報されたものだけです。</p>`;
}
/* オフ会（運営・先生が出すものだけ。参加の受付はまだ＝お知らせチャンネルで） */
function hrOffHtml(){
  const ev = (HR.st.events || []);
  const list = ev.length ? `<ul class="hr-list">${ev.map(e => { const j = hrJ(Date.parse(e.start)); return `<li class="hr-ev"><span class="hr-mic">🍻</span><span><b>${esc(e.title)}</b><small>${esc(j.md)}（${j.wd}）${esc(j.hm)}・${esc(e.city)}${e.venue ? "・" + esc(e.venue) : ""}・定員${e.cap}人・主催 ${esc(e.host || "運営")}</small>${e.note ? `<small>${esc(e.note)}</small>` : ""}</span>${HR.st.me.staff ? `<button type="button" class="hr-link" data-hrevdel="${e.id}">しまう</button>` : ""}</li>`; }).join("")}</ul>` : `<p class="mapnote">いまはオフ会の予定はありません。</p>`;
  const form = HR.st.me.staff || HR.st.me.role === "teacher" ? `<details class="hr-card hr-evform"><summary>＋ オフ会を出す（運営・先生）</summary>
    <label>タイトル<input id="hrEvT" maxlength="60" placeholder="東京オフ会"></label><label>街<input id="hrEvC" maxlength="30" placeholder="東京"></label><label>場所（駅・エリア・公開のお店）<input id="hrEvV" maxlength="60"></label>
    <label>日時<input id="hrEvS" type="datetime-local"></label><label>定員<input id="hrEvN" type="number" min="2" max="200" value="12"></label><button type="button" class="btn sm2" data-hrevadd>出す</button></details>` : "";
  return `<section class="hr-card"><h3>オフ会（リアルのイベント）</h3><p class="mapnote">運営・先生が開くものだけです。場所は駅・エリアと公開のお店。参加は各オフ会のお知らせから。</p>${list}</section>${form}`;
}

/* ---------- 操作 ---------- */
function hrToggleSlot(s, on){ const P = HR.pick; if (on === undefined) on = !P.slots.has(s); if (on) P.slots.add(s); else P.slots.delete(s); }
async function hrSend(){
  const P = HR.pick, st = HR.st;
  if (P.size === "pair" && !st.me.pkFresh){ const ok = await hrPasskeyFlow("1対1の相手をさがす前に、パスキー（顔認証）で本人の確認をします。"); if (!ok) return; }
  const body = {act: P.act, size: P.size, level: P.level, lang: P.lang, slots: [...P.slots], now: P.now};
  if (DEMO){
    hrDemoState().reqs.unshift({id: Date.now(), act: P.act, size: P.size, level: P.level, lang: P.lang, slots: [...P.slots].sort(), status: "open"});
    toast("送りました（デモなので、どこにも送っていません）"); P.slots.clear(); P.now = false; renderHr("plan"); return;
  }
  try {
    const r = await hrApi("/api/hr/request", body);
    P.slots.clear(); P.now = false;
    await hrLoad(true);
    if (r.status === "matched"){ HR.view = r.mid; renderHr("plan"); toast("🎉 成立しました！"); }
    else { renderHr("plan"); toast(r.note || "送りました。成立したら通知でお知らせします", 4200); }
  } catch (e) {
    if (/パスキー/.test(e.message)){ const ok = await hrPasskeyFlow("1対1は、パスキー（顔認証）を済ませた人だけです。"); if (ok) return hrSend(); return; }
    toast(e.message, 4500);
  }
}
/* パスキー（WebAuthn）。顔のデータは端末の外に出ない（中継に届くのは公開鍵と署名だけ） */
const hrB64e = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const hrB64d = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), c => c.charCodeAt(0));
async function hrPasskey(){
  if (!window.PublicKeyCredential || !navigator.credentials) throw new Error("この端末・ブラウザではパスキーが使えません（iPhone は iOS 16 以上）");
  const o = await hrApi("/api/pk/options", {});
  if ((o.creds || []).length){
    const a = await navigator.credentials.get({publicKey: {challenge: hrB64d(o.chal), rpId: location.hostname, allowCredentials: o.creds.map(id => ({type: "public-key", id: hrB64d(id)})), userVerification: "required", timeout: 60000}});
    return hrApi("/api/pk/verify", {id: hrB64e(a.rawId), cd: hrB64e(a.response.clientDataJSON), ad: hrB64e(a.response.authenticatorData), sig: hrB64e(a.response.signature)});
  }
  const c = await navigator.credentials.create({publicKey: {challenge: hrB64d(o.chal), rp: {name: "チアーズGO！", id: location.hostname}, user: {id: hrB64d(o.uh), name: o.name, displayName: o.name},
    pubKeyCredParams: [{type: "public-key", alg: -7}, {type: "public-key", alg: -257}], authenticatorSelection: {residentKey: "preferred", userVerification: "required"}, attestation: "none", timeout: 60000}});
  const r = c.response;
  if (!r.getPublicKey || !r.getAuthenticatorData) throw new Error("この端末ではパスキーの登録ができません（新しい iOS・ブラウザでどうぞ）");
  return hrApi("/api/pk/register", {id: hrB64e(c.rawId), cd: hrB64e(r.clientDataJSON), ad: hrB64e(r.getAuthenticatorData()), pub: hrB64e(r.getPublicKey()), alg: r.getPublicKeyAlgorithm()});
}
function hrPasskeyFlow(lead){
  return new Promise(res => {
    const d = document.createElement("div"); d.className = "hr-sheet"; d.setAttribute("role", "dialog"); d.setAttribute("aria-label", "パスキー");
    const has = HR.st && HR.st.me.pk;
    d.innerHTML = `<div class="hr-sheet-in"><h3>🔒 パスキー（顔認証）</h3><p>${esc(lead || "")}</p><p class="mapnote">iPhone の Face ID・指紋・パスコードで確認します。顔のデータは端末の外に出ません（チアーズGO！に届くのは「本人が確認した」という署名だけ）。1回済ませると30日間そのまま使えます。</p>
      <button type="button" class="btn" data-pkgo>${has ? "顔認証で確認する" : "パスキーを作る"}</button><button type="button" class="btn ghost" data-pkno>あとで</button><p class="hr-note" data-pkerr hidden></p></div>`;
    document.body.appendChild(d);
    const done = v => { d.remove(); res(v); };
    d.querySelector("[data-pkno]").onclick = () => done(false);
    d.querySelector("[data-pkgo]").onclick = async () => {
      if (DEMO){ hrDemoState().me.pk = hrDemoState().me.pkFresh = true; toast("デモなので、パスキーは作っていません（済んだことにします）"); done(true); return; }
      try { await hrPasskey(); await hrLoad(true); toast("パスキーで確認しました"); done(true); }
      catch (e) { const er = d.querySelector("[data-pkerr]"); er.hidden = false; er.textContent = e.name === "NotAllowedError" ? "取り消されました。もう一度どうぞ。" : (e.message || String(e)); }
    };
  });
}
function hrMoreMenu(m, a){
  const x = m.members.find(y => y.a === a); if (!x) return;
  const d = document.createElement("div"); d.className = "hr-sheet"; d.setAttribute("role", "dialog");
  d.innerHTML = `<div class="hr-sheet-in"><h3>${esc(x.icon)} ${esc(x.nick)} さん</h3>
    <label>通報の理由<select data-hrrs><option value="rude">失礼・こわい</option><option value="spam">宣伝・勧誘</option><option value="private">連絡先などを聞かれた</option><option value="other">その他</option></select></label>
    <input data-hrrn maxlength="200" placeholder="ひとこと（なくてもOK）"><button type="button" class="btn" data-hrrep>通報する（運営だけが見ます）</button>
    <button type="button" class="btn ghost" data-hrblk>ブロックする（同じ卓・マッチングで組まれなくなります。相手には知らせません）</button><button type="button" class="hr-link" data-hrx>閉じる</button></div>`;
  document.body.appendChild(d);
  d.querySelector("[data-hrx]").onclick = () => d.remove();
  d.querySelector("[data-hrrep]").onclick = async () => { if (DEMO){ toast("デモなので送っていません"); d.remove(); return; }
    try { await hrApi("/api/hr/report", {mid: m.id, a, reason: d.querySelector("[data-hrrs]").value, note: d.querySelector("[data-hrrn]").value}); toast("通報しました。運営が確認します"); d.remove(); } catch (e) { toast(e.message); } };
  d.querySelector("[data-hrblk]").onclick = async () => { if (DEMO){ toast("デモなので送っていません"); d.remove(); return; }
    if (!confirm(`${x.nick} さんをブロックしますか？`)) return;
    try { const r = await hrApi("/api/hr/block", {mid: m.id, a}); d.remove(); await hrLoad(true); HR.view = null; renderHr("plan"); toast(r.left ? `ブロックしました。同じ予定（${r.left}件）からは記録なしで抜けました` : "ブロックしました"); } catch (e) { toast(e.message); } };
}
async function hrJoin(id){
  const m = HR.st.matches.find(x => x.id === id); if (!m) return;
  if (DEMO){ toast("デモ：卓へ移動します"); HR.view = null; renderHr("map"); setTimeout(() => hrGoTable(m.tbl), 400); return; }
  try { const r = await hrApi("/api/hr/join", {mid: id}); m.my = "came"; HR.view = null;
    if (HR_MAP_ON){ renderHr("map"); HR.pendingTable = r.tbl; } else toast(`${r.table} へどうぞ（マップは準備中です）`); }
  catch (e) { toast(e.message, 4000); }
}
document.addEventListener("click", async e => {
  const t = e.target;
  const hs = t.closest("[data-hs]"); if (hs && hs.closest("#hrSeg")){ HR.view = null; HR.stAt = 0; renderHr(hs.dataset.hs); window.scrollTo(0, 0); return; }
  const go = t.closest("[data-hrgo]"); if (go){ HR.view = null; if ($("pane-hr").hidden) showTab("hr", go.dataset.hrgo); else renderHr(go.dataset.hrgo); window.scrollTo(0, 0); return; }
  const hm = t.closest("[data-hrm]"); if (hm){ HR.view = hm.dataset.hrm; if ($("pane-hr").hidden) showTab("hr", "plan"); else renderHr("plan"); window.scrollTo(0, 0); return; }
  if (!t.closest("#pane-hr") && !t.closest(".hr-sheet")) return;
  const a = t.closest("[data-hract]"); if (a){ HR.pick.act = a.dataset.hract; renderHr(); return; }
  const sz = t.closest("[data-hrsz]"); if (sz){ HR.pick.size = sz.dataset.hrsz; renderHr(); return; }
  const lv = t.closest("[data-hrlv]"); if (lv){ HR.pick.level = HR.pick.level === lv.dataset.hrlv ? "" : lv.dataset.hrlv; renderHr(); return; }
  const lg = t.closest("[data-hrlang]"); if (lg){ HR.pick.lang = lg.dataset.hrlang; renderHr(); return; }
  const wh = t.closest("[data-hrwhen]"); if (wh){ HR.when = wh.dataset.hrwhen; renderHr(); return; }
  const sl = t.closest("[data-hrslot]"); if (sl){ hrToggleSlot(+sl.dataset.hrslot); renderHr(); return; }
  const ce = t.closest("[data-hrcell]"); if (ce){ const s = +ce.dataset.hrcell, on = !(HR.pick.slots.has(s) && HR.pick.slots.has(s + 1)); hrToggleSlot(s, on); hrToggleSlot(s + 1, on); renderHr(); return; }
  if (t.closest("[data-hrnow]")){ HR.pick.now = t.closest("[data-hrnow]").checked; renderHr(); return; }
  if (t.closest("[data-hrsend]")){ const b = t.closest("[data-hrsend]"); b.disabled = true; await hrSend(); return; }
  if (t.closest("[data-hrpk]")){ await hrPasskeyFlow("1対1の会に入れるようにします。"); renderHr(); return; }
  if (t.closest("[data-hrback]")){ HR.view = null; renderHr("plan"); return; }
  const cn = t.closest("[data-hrcancel]"); if (cn){ if (DEMO){ const S = hrDemoState(); S.reqs = S.reqs.filter(r => String(r.id) !== cn.dataset.hrcancel); renderHr(); toast("取り消しました"); return; }
    try { await hrApi("/api/hr/cancel", {id: +cn.dataset.hrcancel}); await hrLoad(true); renderHr(); toast("取り消しました"); } catch (e2) { toast(e2.message); } return; }
  const lv2 = t.closest("[data-hrleave]"); if (lv2){ const m = HR.st.matches.find(x => x.id === lv2.dataset.hrleave); if (!m) return;
    const late = Date.now() > m.start - 3600e3;
    if (!confirm(late ? "開始1時間を切っています。行けなくなったと送りますか？（ほかの人に知らせます）" : "行けなくなったと送りますか？（ほかの人に知らせます）")) return;
    if (DEMO){ m.my = "left"; renderHr(); toast("送りました（デモ）"); return; }
    try { await hrApi("/api/hr/leave", {mid: m.id}); await hrLoad(true); renderHr(); toast("送りました。ほかの人に知らせました"); } catch (e2) { toast(e2.message); } return; }
  const jn = t.closest("[data-hrjoin]"); if (jn){ await hrJoin(jn.dataset.hrjoin); return; }
  const mo = t.closest("[data-hrmore]"); if (mo){ const m = HR.st.matches.find(x => x.id === HR.view); if (m) hrMoreMenu(m, mo.dataset.hrmore); return; }
  if (t.closest("[data-hrdemoics]")){ toast("デモなので .ics は作りません（本人用のリンクではカレンダーに入れられます）"); return; }
  if (t.closest("[data-hrevadd]")){ try { await hrApi("/api/hr/event", {title: $("hrEvT").value, city: $("hrEvC").value, venue: $("hrEvV").value, start: $("hrEvS").value ? new Date($("hrEvS").value).toISOString() : "", cap: $("hrEvN").value}); await hrLoad(true); renderHr("off"); toast("オフ会を出しました"); } catch (e2) { toast(e2.message); } return; }
  const ed = t.closest("[data-hrevdel]"); if (ed){ if (!confirm("このオフ会をしまいますか？")) return; try { await hrApi("/api/hr/event", {del: +ed.dataset.hrevdel}); await hrLoad(true); renderHr("off"); } catch (e2) { toast(e2.message); } return; }
});

/* ================= 2Dマップ（office.png）。位置は 0〜100 × 0〜130 の座標。部屋の係（Durable Object）と WebSocket で配る ================= */
const HR_AREAS = [
  {id: "rp", x: 2, y: 2, w: 55, h: 42, c: "rp", t: "🎭 英語ロールプレイ卓", s: "卓に入ると、卓の人と声がつながる"},
  {id: "moku", x: 59, y: 2, w: 39, h: 42, c: "moku", t: "💻 もくもく作業", s: "無言・マイクなし・いるだけ"},
  {id: "lounge", x: 2, y: 47, w: 96, h: 38, c: "lg", t: "☕ 雑談ラウンジ", s: "卓に入ると、その卓の人と話せる"},
  {id: "trade", x: 2, y: 88, w: 47, h: 38, c: "tr", t: "🍵 貿易の相談", s: "先生🎓の相談会の卓"},
  {id: "gate", x: 51, y: 88, w: 47, h: 38, c: "gt", t: "🚪 入口・掲示板", s: ""}];
const HR_TBL = {rpA: [16, 24, "A"], rpB: [42, 24, "B"], rpC: [29, 37, "C"], lgA: [20, 68, "A"], lgB: [50, 68, "B"], lgC: [80, 68, "C"], trade: [25, 110, "相談"]};
const HR_TR = 7.5;
const hrTableName = tb => tb === "moku" ? "もくもく席" : tb && tb.startsWith("rp") ? "ロールプレイ卓 " + HR_TBL[tb][2] : tb && tb.startsWith("lg") ? "ラウンジ卓 " + HR_TBL[tb][2] : tb === "trade" ? "相談の卓" : "";
function hrMapRender(el){
  const ev = (HR.st.events || [])[0];
  el.innerHTML = `<div class="hr-maphead"><span class="hr-online">👀 <b class="num" id="hrN">${Object.keys(HR.peers).length + (HR.me ? 1 : 0)}</b>人</span><span class="hr-conn" id="hrConn">${DEMO ? "デモ（架空の人）" : HR.ws && HR.ws.readyState === 1 ? "つながっています" : "つないでいます…"}</span></div>
  <div class="hr-map" id="hrMap" role="application" aria-label="ひろばのマップ。タップしたところへ移動します">
    ${HR_AREAS.map(a => `<div class="hr-area ${a.c}" style="left:${a.x}%;top:${a.y / 1.3}%;width:${a.w}%;height:${a.h / 1.3}%"><b>${a.t}</b>${a.s ? `<small>${a.s}</small>` : ""}${a.id === "gate" ? `<small>${ev ? "次のオフ会：" + esc(ev.city) + " " + esc(hrJ(Date.parse(ev.start)).md) : "オフ会の予定はまだありません"}</small>` : ""}</div>`).join("")}
    ${Object.entries(HR_TBL).map(([k, [x, y, l]]) => `<div class="hr-table ${k.slice(0, 2)}" data-tb="${k}" style="left:${x}%;top:${y / 1.3}%"><span>${esc(l)}</span></div>`).join("")}
    ${[[66, 18], [84, 18], [66, 34], [84, 34]].map(([x, y]) => `<div class="hr-desk" style="left:${x}%;top:${y / 1.3}%"></div>`).join("")}
    <div id="hrAvs"></div></div>
  <p class="hr-legend"><span>🟢 話し中</span><span>🔇 ミュート</span><span>半透明＝離席</span><span>🚶 移動中</span></p>
  <div id="hrNotice"></div><div class="hr-bar" id="hrBar"></div>`;
  hrDrawAll(); hrBarDraw();
  if (DEMO) hrDemoMap(); else hrMapStart();
}
function hrAvHtml(p, me){
  return `<div class="hr-av${me ? " me" : ""}${p.st === "away" ? " away" : ""}${p.spk ? " spk" : ""}" data-a="${esc(p.a)}" style="left:${p.x}%;top:${p.y / 1.3}%"><i>${esc(p.i)}</i>${p.tb && p.tb !== "moku" && !p.mic ? `<em class="mute">🔇</em>` : ""}${p.st === "move" ? `<em class="walk">🚶</em>` : ""}<b>${me ? "わたし" : esc(p.n)}${p.st === "away" ? " 離席" : ""}</b></div>`;
}
function hrDrawAll(){
  const box = $("hrAvs"); if (!box) return;
  box.innerHTML = Object.values(HR.peers).map(p => hrAvHtml(p, false)).join("") + (HR.me ? hrAvHtml(HR.me, true) : "");
  const n = $("hrN"); if (n) n.textContent = Object.keys(HR.peers).length + (HR.me ? 1 : 0);
}
function hrDrawOne(p, me){
  const box = $("hrAvs"); if (!box) return;
  const old = box.querySelector(`[data-a="${CSS.escape(p.a)}"]`), tmp = document.createElement("div"); tmp.innerHTML = hrAvHtml(p, me);
  const nu = tmp.firstChild;
  if (old){ old.className = nu.className; old.innerHTML = nu.innerHTML; old.style.left = nu.style.left; old.style.top = nu.style.top; } else box.appendChild(nu);
  const n = $("hrN"); if (n) n.textContent = Object.keys(HR.peers).length + (HR.me ? 1 : 0);
}
function hrTableAt(x, y){
  for (const [k, [tx, ty]] of Object.entries(HR_TBL)) if (Math.hypot(x - tx, (y - ty) / 1.3) < HR_TR + 2) return k;
  const mk = HR_AREAS[1]; if (x >= mk.x && x <= mk.x + mk.w && y >= mk.y + 8 && y <= mk.y + mk.h) return "moku";
  return null;
}
function hrSeatOf(tb, x, y){                                                  // 卓のまわりの空いている席（ほかの人と重ならないように）
  if (!HR_TBL[tb]) return [x, y];
  const [tx, ty] = HR_TBL[tb], taken = Object.values(HR.peers).filter(p => p.tb === tb).map(p => [p.x, p.y]);
  for (let k = 0; k < 6; k++){ const ang = -Math.PI / 2 + k * Math.PI / 3, sx = +(tx + Math.cos(ang) * 9).toFixed(1), sy = +(ty + Math.sin(ang) * 11).toFixed(1);
    if (!taken.some(([ax, ay]) => Math.hypot(ax - sx, ay - sy) < 4)) return [sx, sy]; }
  return [tx, ty + 12];
}
function hrMoveTo(x, y, tb){
  if (!HR.me) return;
  if (tb === undefined) tb = hrTableAt(x, y);
  if (tb && tb !== "moku") [x, y] = hrSeatOf(tb, x, y);
  const was = HR.me.tb;
  Object.assign(HR.me, {x, y, tb, st: "move"}); hrDrawOne(HR.me, true);
  hrSend1({type: "move", x, y, tb});
  hrSend1({type: "st", st: "move"});
  clearTimeout(HR.moveT); HR.moveT = setTimeout(() => { if (!HR.me) return; HR.me.st = document.hidden ? "away" : "in"; hrDrawOne(HR.me, true); hrSend1({type: "st", st: HR.me.st}); }, 700);
  if (was !== tb) hrTableChanged(was, tb);
  hrBarDraw();
}
function hrGoTable(tb){ if (!HR.me){ HR.pendingTable = tb; return; } const [x, y] = HR_TBL[tb] || [80, 22]; hrMoveTo(x, y, tb); }
function hrSend1(o){ if (DEMO) return hrDemoEcho(o); if (HR.ws && HR.ws.readyState === 1) HR.ws.send(JSON.stringify(o)); }
function hrBarDraw(){
  const b = $("hrBar"); if (!b) return;
  const tb = HR.me && HR.me.tb, V = HR.v;
  if (!tb){ b.innerHTML = `<p class="hr-hint">行きたいところをタップすると移動します。卓に入ると、卓の人と声がつながります。</p><div class="hr-btns"><button type="button" data-hremo="👋">👋 手をふる</button><button type="button" data-hrexit>🚪 出る</button></div>`; return; }
  const moku = tb === "moku";
  b.innerHTML = `<p class="hr-at"><b>${esc(hrTableName(tb))}</b>${moku ? "（無言・マイクなし）" : V && V.on ? `・<span class="ok">声つながっています（${Object.keys(V.remote || {}).length}人）</span>` : V && V.busy ? "・声をつないでいます…" : ""}</p>
    <div class="hr-btns">${moku ? "" : `<button type="button" data-hrmic aria-pressed="${!!(V && V.on && !V.muted)}">${V && V.on ? (V.muted ? "🔇 ミュート中" : "🎤 マイク ON") : "🎤 声をつなぐ"}</button>`}<button type="button" data-hremo="👋">👋</button><button type="button" data-hremo="👏">👏</button><button type="button" class="hr-out" data-hrleavet>卓を出る</button></div>`;
}
async function hrMapStart(){
  HR.wsWant = true;
  if ((HR.ws && HR.ws.readyState <= 1) || HR.wsStarting) { hrDrawAll(); return; }   // 2回呼ばれても1本だけつなぐ
  HR.wsStarting = true;
  try {
    const tk = await hrApi("/api/hr/ticket", {}).finally(() => { HR.wsStarting = false; });
    if (!HR.wsWant || (HR.ws && HR.ws.readyState <= 1)) return;
    HR.voiceReady = !!tk.voice;
    if (!tk.ws){ const c = $("hrConn"); if (c) c.textContent = "マップは準備中です"; return; }
    const ws = HR.ws = new WebSocket(CG_API.replace(/^http/, "ws") + "/api/hr/ws?t=" + encodeURIComponent(tk.t));
    ws.onopen = () => { HR.retry = 0; const c = $("hrConn"); if (c) c.textContent = "つながっています"; clearInterval(HR.pingT); HR.pingT = setInterval(() => hrSend1({type: "ping"}), 40e3); };
    ws.onmessage = ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } hrOnMsg(m); };
    ws.onclose = ev => { if (HR.ws && HR.ws !== ws) return;             // 古い線が閉じただけ（いまの線はそのまま）
      clearInterval(HR.pingT); HR.ws = null; const c = $("hrConn"); if (c) c.textContent = ev.code === 4000 ? "別の画面でひろばに入りました" : "つなぎなおしています…";
      if (HR.v) hrVoiceStop(); HR.me = null; HR.peers = {}; hrDrawAll();
      if (HR.wsWant && ev.code !== 4000 && HR.retry < 6){ HR.retry++; setTimeout(() => { if (HR.wsWant && !$("pane-hr").hidden && HR.seg === "map") hrMapStart(); }, 1500 * HR.retry); } };
  } catch (e) { const c = $("hrConn"); if (c) c.textContent = "つなげませんでした：" + e.message; }
}
function hrMapStop(){
  HR.wsWant = false; clearInterval(HR.pingT); clearInterval(HR.demoT);
  if (HR.v) hrVoiceStop();
  if (HR.ws){ try { HR.ws.close(1000); } catch (e) {} HR.ws = null; }
  HR.me = null; HR.peers = {};
}
function hrOnMsg(m){
  if (m.type === "hello"){ HR.me = m.me; HR.peers = {}; (m.peers || []).forEach(p => HR.peers[p.a] = p); hrDrawAll(); hrBarDraw(); if (HR.pendingTable){ const t = HR.pendingTable; HR.pendingTable = null; setTimeout(() => hrGoTable(t), 300); } return; }
  if (m.type === "up"){ const p = m.p; if (HR.me && p.a === HR.me.a){ HR.me.tr = p.tr; return; }
    const before = HR.peers[p.a]; HR.peers[p.a] = p; hrDrawOne(p, false); hrVoicePeer(before, p); return; }
  if (m.type === "leave"){ const p = HR.peers[m.a]; delete HR.peers[m.a]; const el = document.querySelector(`#hrAvs [data-a="${CSS.escape(m.a)}"]`); if (el) el.remove(); if (p) hrVoicePeer(p, null); hrDrawAll(); return; }
  if (m.type === "deny"){ toast(m.why === "full" ? "その卓は満席です（6人まで）" : "その卓には入れません"); if (HR.me){ HR.me.tb = null; hrTableChanged(m.tb, null); hrDrawOne(HR.me, true); hrBarDraw(); } return; }
  if (m.type === "emote"){ const el = document.querySelector(`#hrAvs [data-a="${CSS.escape(m.a)}"]`); if (el){ const s = document.createElement("span"); s.className = "hr-emo"; s.textContent = m.e; el.appendChild(s); setTimeout(() => s.remove(), 1800); } }
}
/* デモ：架空の人が少し歩く（端末の中だけ） */
function hrDemoMap(){
  const P = [["d1", "Aki", "🦊", 10, 30, "rpA", "in", true, true], ["d2", "Ken", "🐼", 23, 30, "rpA", "in", true, false], ["d3", "Mia", "🐨", 16, 41, "rpA", "in", false, false],
    ["d4", "Yu", "🐱", 66, 24, "moku", "in"], ["d5", "Nao", "🐰", 66, 40, "moku", "away"], ["d6", "Taro", "🐻", 84, 40, "moku", "in"], ["d7", "Rina", "🐯", 44, 64, "lgB", "in", true, false], ["d8", "Sho", "🐸", 56, 63, "lgB", "in", true, true],
    ["d9", "Emi", "🦉", 86, 60, null, "in"], ["d10", "Kai", "🐧", 10, 78, null, "move"], ["d11", "先生🎓", "🧑‍🏫", 25, 101, "trade", "in", true, false]];
  HR.peers = {}; P.forEach(([a, n, i, x, y, tb, st, mic, spk]) => HR.peers[a] = {a, n, i, x, y, tb, st, mic: !!mic, spk: !!spk});
  HR.me = {a: "demo-me", n: snsNick(), i: snsIcon(), x: 75, y: 112, tb: null, st: "in", mic: false, spk: false};
  hrDrawAll(); hrBarDraw();
  if (HR.pendingTable){ const t = HR.pendingTable; HR.pendingTable = null; setTimeout(() => hrGoTable(t), 300); }
  clearInterval(HR.demoT); HR.demoT = setInterval(() => { if (!$("hrAvs")) return clearInterval(HR.demoT); const k = HR.peers.d10; k.x = 8 + Math.random() * 30; k.y = 74 + Math.random() * 8; const s = HR.peers.d8; s.spk = !s.spk; const a = HR.peers.d1; a.spk = !s.spk; [k, s, a].forEach(p => hrDrawOne(p, false)); }, 2200);
}
function hrDemoEcho(o){ if (o.type === "emote"){ hrOnMsg({type: "emote", a: "demo-me", e: o.e}); } }
document.addEventListener("click", e => {
  const t = e.target; if (!t.closest("#pane-hr")) return;
  const map = t.closest("#hrMap");
  if (map && !t.closest(".hr-av")){ const r = map.getBoundingClientRect(); const x = +((e.clientX - r.left) / r.width * 100).toFixed(1), y = +((e.clientY - r.top) / r.height * 130).toFixed(1); hrMoveTo(Math.max(2, Math.min(98, x)), Math.max(2, Math.min(127, y))); return; }
  const em = t.closest("[data-hremo]"); if (em){ hrSend1({type: "emote", e: em.dataset.hremo}); return; }
  if (t.closest("[data-hrleavet]")){ hrMoveTo(75, 112, null); return; }
  if (t.closest("[data-hrexit]")){ hrMapStop(); showTab("me"); return; }
  if (t.closest("[data-hrmic]")){ hrMicButton(); return; }
  if (t.closest("[data-hrrecon]")){ hrVoiceStop(); hrVoiceStart(); return; }
});
document.addEventListener("visibilitychange", () => {
  if (!HR.me) return;
  if (document.hidden){ HR.me.st = "away"; hrSend1({type: "st", st: "away"}); }
  else { HR.me.st = "in"; hrSend1({type: "st", st: "in"}); if (HR.v && HR.v.on) hrVoiceCheck(); if (!HR.ws && HR.wsWant && !DEMO) hrMapStart(); }
  hrDrawOne(HR.me, true);
});

/* ================= 声（Cloudflare Realtime：SFU＋TURN）。卓に入ると、卓の人の声だけ受けとる。録音しない ================= */
const hrIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
function hrNotice(html){ const n = $("hrNotice"); if (n) n.innerHTML = html ? `<div class="hr-notice">${html}</div>` : ""; }
function hrTableChanged(was, tb){
  if (HR.v) hrVoiceStop();
  hrNotice("");
  if (tb && tb !== "moku" && HR.voiceAuto) hrVoiceStart();
}
async function hrMicButton(){
  if (DEMO){ toast("デモなので声はつなぎません（本人用のリンクで、卓の人と話せます）"); return; }
  const V = HR.v;
  if (!V || !V.on){ HR.voiceAuto = true; return hrVoiceStart(); }
  V.muted = !V.muted; if (V.track) V.track.enabled = !V.muted;
  hrSend1({type: "mic", on: !V.muted}); if (HR.me){ HR.me.mic = !V.muted; hrDrawOne(HR.me, true); }
  hrBarDraw();
}
async function hrVoiceStart(){
  if (!HR.me || !HR.me.tb || HR.me.tb === "moku" || (HR.v && (HR.v.on || HR.v.busy))) return;
  if (!HR.voiceReady){ hrNotice("🎤 声の通話は準備中です（運営が Cloudflare Realtime の設定をしたら使えます）。いまは卓に座って、いる・離席が見えるだけです。"); HR.voiceAuto = false; return; }
  const tb = HR.me.tb, V = HR.v = {busy: true, on: false, muted: false, remote: {}, midA: {}, q: Promise.resolve(), tb};
  hrBarDraw();
  try {
    const s = await hrApi("/api/hr/rtc/session", {});
    Object.assign(V, {sid: s.sessionId, tag: s.tag});
    V.pc = new RTCPeerConnection({iceServers: s.iceServers, bundlePolicy: "max-bundle"});
    V.stream = await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: true, noiseSuppression: true, autoGainControl: true}});
    if (HR.v !== V){ V.stream.getTracks().forEach(t => t.stop()); return; }
    V.track = V.stream.getAudioTracks()[0];
    const tr = V.pc.addTransceiver(V.track, {direction: "sendonly"});
    V.pc.ontrack = ev => { const mid = ev.transceiver && ev.transceiver.mid, a = V.midA[mid]; if (!a) return;
      let au = V.remote[a] && V.remote[a].el; if (!au){ au = document.createElement("audio"); au.autoplay = true; au.setAttribute("playsinline", ""); document.body.appendChild(au); }
      au.srcObject = new MediaStream([ev.track]); au.play().catch(() => {}); V.remote[a] = {...(V.remote[a] || {}), el: au, mid}; hrBarDraw(); };
    V.pc.onconnectionstatechange = () => { if (["failed", "disconnected"].includes(V.pc.connectionState)) hrNotice(`声が切れました。<button type="button" class="btn sm2" data-hrrecon>もう一度つなぐ</button>`); };
    await V.pc.setLocalDescription(await V.pc.createOffer());
    const r = await hrApi("/api/hr/rtc/push", {sessionId: V.sid, tag: V.tag, sdp: V.pc.localDescription.sdp, mid: tr.mid});
    await V.pc.setRemoteDescription({type: "answer", sdp: r.sdp});
    V.on = true; V.busy = false;
    hrSend1({type: "track", s: V.sid}); hrSend1({type: "mic", on: true}); if (HR.me){ HR.me.mic = true; hrDrawOne(HR.me, true); }
    hrSpeakMeter(V);
    try { V.lock = await navigator.wakeLock.request("screen"); } catch (e) {}
    if (hrIOS()) hrNotice("📱 iPhone では、画面を消す・ほかのアプリに切りかえると声が止まります（アプリを開いたまま、イヤホン推奨）。戻ったら「もう一度つなぐ」を押してください。");
    hrBarDraw();
    hrVoicePullAll();
  } catch (e) {
    hrVoiceStop();
    hrNotice(e.name === "NotAllowedError" ? "マイクが許可されていません。設定でマイクを許可してから、もう一度「声をつなぐ」を押してください。" : "声をつなげませんでした：" + esc(e.message || e));
  }
  hrBarDraw();
}
function hrVoiceQ(fn){ const V = HR.v; if (!V) return; V.q = V.q.then(fn).catch(e => console.warn("ひろばの声", e)); return V.q; }
function hrVoicePullAll(){ const V = HR.v; if (!V || !V.on) return; const want = Object.values(HR.peers).filter(p => p.tb === V.tb && p.tr && !V.remote[p.a]); if (want.length) hrVoiceQ(() => hrVoicePull(want)); }
async function hrVoicePull(peers){
  const V = HR.v; if (!V || !V.on) return;
  peers = peers.filter(p => !V.remote[p.a]); if (!peers.length) return;
  peers.forEach(p => V.remote[p.a] = {pending: true});
  const r = await hrApi("/api/hr/rtc/pull", {sessionId: V.sid, tag: V.tag, tracks: peers.map(p => ({a: p.a, s: p.tr.s, n: p.tr.n}))});
  (r.tracks || []).forEach(t => { if (!t.error){ V.midA[t.mid] = t.a; V.remote[t.a] = {...(V.remote[t.a] || {}), mid: t.mid}; } else delete V.remote[t.a]; });
  if (r.renego && r.sdp){ await V.pc.setRemoteDescription({type: "offer", sdp: r.sdp}); await V.pc.setLocalDescription(await V.pc.createAnswer()); await hrApi("/api/hr/rtc/renego", {sessionId: V.sid, tag: V.tag, sdp: V.pc.localDescription.sdp}); }
  hrBarDraw();
}
function hrVoicePeer(before, p){
  const V = HR.v; if (!V || !V.on) return;
  const a = (p || before).a, had = V.remote[a];
  if (p && p.tb === V.tb && p.tr && !had) return hrVoiceQ(() => hrVoicePull([p]));
  if (had && (!p || p.tb !== V.tb || !p.tr)){
    if (had.el){ had.el.srcObject = null; had.el.remove(); }
    delete V.remote[a];
    if (had.mid) hrVoiceQ(() => hrApi("/api/hr/rtc/close", {sessionId: V.sid, tag: V.tag, mids: [had.mid]}).then(() => {
      const tr = V.pc.getTransceivers().find(t => t.mid === had.mid); if (tr) try { tr.stop(); } catch (e) {} }));
    hrBarDraw();
  }
}
function hrSpeakMeter(V){
  try {
    const ac = V.ac = new (window.AudioContext || window.webkitAudioContext)(), an = ac.createAnalyser(); an.fftSize = 512;
    ac.createMediaStreamSource(V.stream).connect(an);
    const buf = new Uint8Array(an.fftSize); let on = false, last = 0;
    V.meterT = setInterval(() => { an.getByteTimeDomainData(buf); let s = 0; for (const b of buf) s += (b - 128) * (b - 128); const rms = Math.sqrt(s / buf.length);
      const now = !V.muted && rms > 6; if (now !== on && Date.now() - last > 350){ on = now; last = Date.now(); hrSend1({type: "spk", on}); if (HR.me){ HR.me.spk = on; hrDrawOne(HR.me, true); } } }, 150);
  } catch (e) {}
}
function hrVoiceCheck(){ const V = HR.v; if (!V) return; if (!V.track || V.track.readyState === "ended" || (V.pc && ["failed", "disconnected", "closed"].includes(V.pc.connectionState)) || (V.ac && V.ac.state === "suspended"))
  hrNotice(`声が止まっていました（iPhone は画面を消すと止まります）。<button type="button" class="btn sm2" data-hrrecon>もう一度つなぐ</button>`); }
function hrVoiceStop(){
  const V = HR.v; HR.v = null; if (!V) return;
  clearInterval(V.meterT); try { V.ac && V.ac.close(); } catch (e) {}
  Object.values(V.remote || {}).forEach(r => { if (r.el){ r.el.srcObject = null; r.el.remove(); } });
  try { V.stream && V.stream.getTracks().forEach(t => t.stop()); } catch (e) {}
  try { V.pc && V.pc.close(); } catch (e) {}
  try { V.lock && V.lock.release(); } catch (e) {}
  if (HR.me){ HR.me.mic = false; HR.me.spk = false; hrSend1({type: "mic", on: false}); hrDrawOne(HR.me, true); }
  hrBarDraw();
}

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
  const S = streakOf(d), run = S.run, did = S.done;   // 連続は streakOf の1か所（チケットでつないだ日も入る）
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
  if (typeof chBadgeApply === "function") chBadgeApply();   // みんなのタブの数字（@メンション・返信・お知らせの未読。_part_ch.js）
  paintHome();
  if ($("bellPanel") && !$("bellPanel").hidden) engPanel(true);
  appBadge(n);
  // その日はじめて開いたときに1回だけ、タブバーのすぐ上に小さく（カードに重ねない）。✕で閉じるとその日はもう出ない
  const today = dayKey(Date.now());
  if (n && !ME.viewer && store("cg-nudge") !== today){ store("cg-nudge", today); setTimeout(() => nudgeShow(n), 900); }
}
function nudgeShow(n){
  let el = $("nudge");
  if (!el){
    el = document.createElement("div"); el.id = "nudge"; el.className = "nudge"; el.setAttribute("role", "status");
    el.innerHTML = `<span class="nd-t">今日やること のこり<b></b>こ</span><span class="nd-s">右上のベルからも見られます</span><button type="button" class="pb-x" aria-label="閉じる">✕</button>`;
    el.querySelector(".pb-x").addEventListener("click", () => nudgeHide());
    document.body.appendChild(el);
  }
  el.querySelector("b").textContent = n;
  el.classList.add("on"); clearTimeout(el._t); el._t = setTimeout(nudgeHide, 6000);
}
function nudgeHide(){ const el = $("nudge"); if (el) el.classList.remove("on"); }
function appBadge(n){
  // 対応していない環境（Safari のタブ・Firefox など）では何もしない。iPhone は通知を許可したホーム画面のアプリだけ数字が出る
  try { if (n && navigator.setAppBadge) navigator.setAppBadge(n).catch(() => {}); else if (!n && navigator.clearAppBadge) navigator.clearAppBadge().catch(() => {}); } catch (e) {}
}
function engPanel(open){
  const p = $("bellPanel"), b = $("bell"); if (!p || !b) return;
  if (open === undefined) open = p.hidden;
  if (open){ $("setPanel").hidden = true; $("gear").setAttribute("aria-expanded", "false");
    p.innerHTML = engInner(ENG) + (typeof chBellLine === "function" ? chBellLine() : "") + `<div class="acts"><button type="button" class="btn ghost sm2" id="bellSet">リマインド・通知の設定</button></div>`;
    p.querySelector("#bellSet").addEventListener("click", () => { engPanel(false); $("setPanel").hidden = false; $("gear").setAttribute("aria-expanded", "true"); remRender(); if (typeof spkSetRender === "function") spkSetRender(); if (typeof thSetRender === "function") thSetRender(); if (typeof chPrefsRender === "function") chPrefsRender(); });
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
  $("gear").addEventListener("click", () => { engPanel(false); remRender(); obSetRender(); if (typeof spkSetRender === "function") spkSetRender(); if (typeof thSetRender === "function") thSetRender(); if (typeof chPrefsRender === "function") chPrefsRender(); });
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
function obRemind(){ $("setPanel").hidden = false; $("gear").setAttribute("aria-expanded", "true"); remRender(); obSetRender(); if (typeof spkSetRender === "function") spkSetRender(); if (typeof chPrefsRender === "function") chPrefsRender(); window.scrollTo({top: 0, behavior: reduce ? "auto" : "smooth"}); }
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
// UTAGE の会員サイト（ログインのページ）。public.json の links.utage（build_site.py の LINKS）が正。古い public.json のときはこの URL
const utageUrl = () => ((typeof ALL !== "undefined" && ALL && ALL.links) || {}).utage || "https://member.cheersmate11.com/members/9JcHM2Gb6jwp/login";
function openSettings(){
  engPanel(false); $("setPanel").hidden = false; $("gear").setAttribute("aria-expanded", "true"); remRender(); obSetRender(); if (typeof spkSetRender === "function") spkSetRender(); if (typeof thSetRender === "function") thSetRender(); if (typeof chPrefsRender === "function") chPrefsRender();
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
  streak: ["連続記録・活動カレンダー", d => ringsDetailHtml() + streakHtml(d) + buddyCardHtml(d) + `<section><div class="sec-h"><h2>${SPARK}活動カレンダー</h2><p>1日にためたチアーズポイントの多さ（直近12週）。</p></div><div class="panel">${heatHtml(d)}</div></section>`],
  points: ["ポイント推移・貢献", d => weekPtsHtml(d) + contribHtml(d)],
  badges: ["はじめの一歩・バッジ", d => firstsHtml(d)],
  buddy: ["乾杯バディ", d => buddyViewHtml(d)],
  album: ["アルバム・PHOTOカード", d => wallSecHtml(d) + stampHtml(d) + albumSecHtml(d)],
  sched: ["講座スケジュール・予約", d => (schedHtml(d.schedule || []) || `<p class="mapnote">これからの講座は、まだ入っていません。</p>`)
    + `<section class="soonbox"><b>📝 予約<i class="new">準備中</i></b><p>面談・講座の予約を、ここからできるようにします。いまは講座の参加リンクと、会員サイトの講座からどうぞ。</p>
      <div class="acts"><button type="button" class="btn ghost sm2" data-tab="kz" data-utgo>会員サイト講座を見る</button></div></section>`],
  story: ["わたしの歩み", d => storyHtml(d)],
  pb: ["自己ベスト一覧", () => pbListHtml()],
  shop: ["ごほうびショップ", () => shopHtml()],
  focus: ["集中の乾杯グラス", () => focusHtml()],
  listen: ["ながら耳トレ", () => listenHtml()],
  guide: ["はじめの1週間ガイド", d => obHtml(d) || `<div class="note">はじめの1週間ガイドは閉じています。<div class="acts" style="margin-top:8px"><button type="button" class="btn ghost sm2" id="obShow">ガイドをもう一度出す</button></div></div>`],
  profile: ["わたしメモ", () => itvMyHtml()],
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
    if (MYV === "profile") itvMyBind();
    if (MYV === "shop") shopBind(box);
    if (MYV === "focus") focusBind(box);
    if (MYV === "listen") listenBind(box);
    bindCards(box);
    return;
  }
  MYV = null;
  const ym = d.today.slice(0, 7), g = goalGet(ym), S = streakOf(d), bc = badgeCount(d);
  const obN = (() => { const st = obSteps(); return `${st.filter(x => x.done(d)).length}/${st.length}`; })();
  box.innerHTML = `${profileHtml(d)}
    <div class="mytiles">
      ${myTile("goal", "🎯", "今月の目標", g ? `${fmt(goalNow(d, g, ym))}/${fmt(g.target)}` : "まだ決めていません")}
      ${myTile("streak", "🔥", "連続記録", `${S.run}日${S.tickets ? "・🎟×" + S.tickets : ""}・カレンダー`)}
      ${myTile("points", "📈", "ポイント推移", `今週 ${fmt(d.pts.week)}pt・12週・貢献`)}
      ${myTile("badges", "🏅", "バッジ", `${bc.on}/${bc.all}・はじめの一歩`)}
      ${myTile("album", "🖼️", "アルバム", `${d.photos.length}枚・PHOTOカード`)}
      ${myTile("story", "📖", `わたしの歩み<i class="new">NEW</i>`, "ビフォーアフター（準備中）")}
      ${myTile("pb", "🏅", "自己ベスト", `${Object.keys(pbAll()).length}種目`)}
      ${d.viewer ? "" : myTile("shop", "🛍️", `ごほうびショップ<i class="new">NEW</i>`, "週ポイントで交換")}
      ${d.viewer ? "" : myTile("focus", "🥂", `集中の乾杯グラス<i class="new">NEW</i>`, "10/15/25分タイマー")}
      ${d.viewer ? "" : listenTileHtml()}
    </div>
    ${buddyCardHtml(d)}
    <ul class="mylist">
      ${d.sees ? myRow("seesgo", "👀", `${esc(d.sees.name)}さんのページを見る（先生として）`) : ""}
      ${myRow("sched", "📅", "講座スケジュール・予約")}
      ${d.viewer ? "" : myRow("profile", "📝", "わたしメモ", itvHasProfile() ? "作成済み" : "未作成")}
      ${d.viewer ? "" : myRow("guide", "🔰", "はじめの1週間ガイド", obN)}
      ${myRow("help", "❓", "ポイントのため方・撮り方")}
      ${myRow("bot", "🍵", "MATCHA（貿易ツール）", "質問BOT")}
      ${myRow("utage", "🎓", "会員サイト（UTAGE）", "開く ↗")}
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
  if (k === "utage"){ window.open(utageUrl(), "_blank", "noopener"); return; }
  if (k === "seesgo"){ store("cg-view", "sees"); location.reload(); return; }
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
  return L.marker([p.y, p.x], {icon: L.divIcon({className: "", html: `<div class="lp ${lvl}${p.team ? " team" : ""}" data-city="${esc(p.city)}">${body}</div>`, iconSize: [44, 44], iconAnchor: [22, 22], popupAnchor: [0, -20]}), riseOnHover: true});
}
function popupFor(p){
  const flags = (p.cc || []).map(iso => `<span class="chip">${flagOf(iso)} ${esc((ALL.cc[iso] || {}).name || iso)}</span>`).join("");
  const where = p.level === "country" ? `${esc(p.city)}<small>（国まで分かった乾杯）</small>` : esc(p.venue ? p.city + "・" + p.venue : p.city);
  const legend = p.level !== "country" && (ME && ME.legends || {})[p.city];
  return `<div class="lpop">${p.img ? `<img src="${p.img}" alt="">` : ""}
    <b>${ICON.pin}${where}</b>
    ${legend ? `<div class="lpop-legend">この街のレジェンド：${legend.icon} ${esc(legend.nick)} 👑 🍻${legend.n}回</div>` : ""}
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
    ${list.length ? `<ul class="spots">${list.map(c => { const legend = c.p.level !== "country" && (ME && ME.legends || {})[c.p.city];
      return `<li><button type="button" class="sp" data-ll="${c.p.lat},${c.p.lon}"><b>${esc(c.p.venue ? c.p.city + "・" + c.p.venue : c.p.city)}${legend ? ` <span class="crown">👑</span>` : ""}</b><span>${[...c.cc].slice(0, 4).map(flagOf).join(" ")}</span><span class="num">${c.n}回</span></button><a class="btn gm" href="${gmap(pinQuery(c.p))}" target="_blank" rel="noopener" aria-label="${esc(c.p.city)}をGoogleマップで開く">${ICON.pin}地図</a></li>`; }).join("")}</ul>`
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
    ${cdStampsHtml()}${regs}${rareHtml}${nextHtml}`;
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
const TABS = ["me", "kz", "go", "hr", "us", "my"];
const RENDERED = {};
let PERSONAL = false, GOSEG = store("cg-goseg") || "map";
const ALIAS = {home: ["me"], learn: ["kz"], practice: ["kz"], adventure: ["go"], map: ["go", "map"], dex: ["go", "dex"], quest: ["go", "quest"],
  words: ["kz", "words"], talk: ["kz", "talk"], conv: ["kz", "talk"], drill: ["kz", "drill"], records: ["kz", "records"], mypage: ["my"], hiroba: ["hr"], plaza: ["hr", "map"], match: ["hr", "find"]};
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
  if (!$("tab-" + k) || ($("tab-" + k).hidden && !(k === "hr" && hrOn()))) k = PERSONAL ? "me" : r[0] === "go" ? "go" : "us";   // ひろばはマップの前（HR_MAP_ON=false）でもタブなしで開ける
  if (k !== "kz"){ quiet(); drillStop(false); talkEnd(false); itvAbort(); wdBarHide(); }
  if (k !== "hr") hrMapStop();                                              // ひろばを離れたら、マップの接続と声を切る   // 練習のタブを離れたら音を止める（音はボタンを押したときだけ鳴らす）
  TABS.forEach(x => { const on = x === k, b = $("tab-" + x); if (b) b.setAttribute("aria-selected", String(on)); $("pane-" + x).hidden = !on; });
  if (k === "go") goShow(seg);
  if (k === "kz"){ if (seg) kzSegSet(seg); renderKz(); }
  if (k === "hr") renderHr(seg);
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
// アドレスの # には本人の鍵を残しておく（場所の # を消すときも鍵に戻す）。iPhone で「ホーム画面に追加」したときに、今のアドレスが使われても鍵つきになるように
const keyHash = () => DEMO ? "#demo" : PERSONAL && store("cg-token") ? "#" + store("cg-token") : "";
// 貼りつけたリンク（または24文字）から鍵を取り出す
const tokenFromText = s => { s = String(s || "").trim(); const m = s.match(/#([A-Za-z0-9]{24})(?![A-Za-z0-9])/) || s.match(/^([A-Za-z0-9]{24})$/); return m ? m[1] : null; };
function gateSetup(){
  const sa = typeof isStandalone === "function" && isStandalone();
  if (sa){                                                                   // ホーム画面のアプリを鍵なしで開いたとき：デモではなく、リンクをもう一度開いてもらう
    $("gateT").textContent = "あなた専用のリンクをもう一度開いてください";
    $("gateP").textContent = "ホーム画面のアプリは Safari とは別に保存されるので、あなたのリンクを1回ここで開く必要があります。運営から届いたあなたのリンクをコピーして、下に貼りつけて「開く」を押してください（次からはそのまま開けます）。";
    $("gateDemo").hidden = true;
  }
  $("relink").addEventListener("submit", e => {
    e.preventDefault();
    const t = tokenFromText($("relinkIn").value);
    if (!t){ $("relinkErr").hidden = false; return; }
    store("cg-token", t); history.replaceState(null, "", location.pathname + location.search + "#" + t); location.reload();
  });
}
async function boot(){
  bdCatch();                                                                 // 乾杯バディの招待リンク（?buddy=コード）を控えて、アドレスから消す
  ALL = await (await fetch("data/public.json", {cache: "no-cache"})).json();
  const a = new Date(ALL.asof);
  $("asof").textContent = `${a.getMonth() + 1}/${a.getDate()} ${String(a.getHours()).padStart(2, "0")}:${String(a.getMinutes()).padStart(2, "0")} 更新`;
  DEMO = location.hash === "#demo";
  let tok = tokenFromUrl();
  if (tok) store("cg-token", tok); else if (!DEMO) tok = store("cg-token");
  const personal = PERSONAL = DEMO || !!tok;
  ["me", "kz", "my"].forEach(k => $("tab-" + k).hidden = !personal);
  $("tab-hr").hidden = !(personal && HR_MAP_ON);
  $("demoBar").hidden = !DEMO;
  $("gate").hidden = personal;
  if (!personal) gateSetup();
  renderUs();
  const want = hashRoute() || new URLSearchParams(location.search).get("tab");
  if (hashRoute() || (tok && !DEMO && location.hash !== "#" + tok)) history.replaceState(null, "", location.pathname + location.search + keyHash());   // 場所の # は鍵の # に戻す（取りちがえないように・ホーム画面に追加しても鍵つきになるように）
  if (!personal && bdPending()) setTimeout(() => toast("乾杯バディの招待を受けとりました。運営から届いたあなたのリンクで開くと、バディになれます", 6000), 600);
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
      if (d.sees && store("cg-view") === "sees"){                    // 先生自身のページから、生徒のページ（旧：見る人のコピー）に切りかえる
        try {
          const seesTok = tok + ":sees";
          const key2 = await crypto.subtle.importKey("raw", await sha("cheers-go-key:" + seesTok), "AES-GCM", false, ["decrypt"]);
          d = await openFile("u/" + hex(await sha("cheers-go-id:" + seesTok)).slice(0, 24) + ".json", key2);
          key = key2;                                                // 写真・音声はこのあと同じ key で読む
        } catch (e) { store("cg-view", null); }                      // 読めなかったら先生自身のページのまま（フラグだけ消す）
      }
    }
    if (d.viewer) $("tab-hr").hidden = true;                          // 先生リンク（見る人）にはひろばを出さない
    if (d.viewer){
      const back = store("cg-view") === "sees" ? ` <button type="button" id="cgBackOwn">自分のページに戻る</button>` : "";
      $("demoBar").innerHTML = `${esc(d.viewer)}として表示中：${esc(d.display || d.name)}さんのページ（ベータ）${back}`;
      $("demoBar").hidden = false;
      if ($("cgBackOwn")) $("cgBackOwn").addEventListener("click", () => { store("cg-view", null); location.reload(); });
    }
    LOADED = DEMO || !(d.photo_files || []).length;
    if (markOpen() && !DEMO && !d.viewer && apiOn()) api("/api/log", {kind: "open"}).catch(() => {});   // ログインの連続日数（ランキング用）。見る人（先生）の分は数えない
    roleRefresh(d);                                                   // 役割（owner/staff/teacher）を取って端末に覚える。届いたらホームを描き直す（はじめてのインタビュー・2026-10-19）
    utageStart(d);                                                    // 会員サイト（UTAGE）の受講状況：カードの場所を作ってから読み込む（中継があるときだけ）
    renderMe(d);
    syncStart(d);                                                     // 単語集・目標・連続記録を、ほかの端末とまとめる（中継があるときだけ）
    if (!d.viewer && !DEMO && apiOn()) setTimeout(() => hrLoad(), 1500);  // ひろば：次の会（ホームの1行）と予定の数字。少し遅らせて読む
    chLoad(); chPollStart();                                          // チャンネルの未読・メンション・ホームの新着1行（先生リンクも使える・「みんな」を開いていなくても数字をそろえる）
    botShow();
    obWelcome();                                                                 // はじめて開いたときだけ「ようこそ」
    itvAutoStub();                                                               // ?itvstub=1 のときはテスト用に自動でインタビューの結果を作る
    const bdIn = bdPending() && !DEMO && !d.viewer;                   // 乾杯バディの招待を受けとっていたら、マイ＞乾杯バディを開く（「バディになる」は本人が押す）
    if (bdIn) MYV = "buddy";
    const last = bdIn ? "my" : want || store("cg-tab");
    showTab(last && routeOf(last) ? last : "me");
    if (!DEMO){
      // 教材の音声（Grok TTS で作ったお手本）：写真と並行して読み込む。届く前に再生したら端末の読み上げで代わりに
      Promise.all((d.audio_files || []).map(f => openFile(f, key).then(x => Object.assign(AUD, x)).catch(() => {})))
        .then(() => { if (typeof KZ === "object" && KZ && !$("pane-kz").hidden && KA.paused) renderPlayer(); });   // KZ が "talk" などの画面名のときは教材プレイヤーを描かない（文字列で renderPlayer を呼ぶと落ちていた）
      await Promise.all((d.photo_files || []).map(f => openFile(f, key).then(x => Object.assign(IMGS, x)).catch(() => {})));
      if (!LOADED){ LOADED = true; const y = window.scrollY; renderMe(d); window.scrollTo(0, y); }
      if (d.team){
        try { const tkey = await crypto.subtle.importKey("raw", unb64(d.team.k), "AES-GCM", false, ["decrypt"]); TEAM = await openFile(d.team.f, tkey); } catch (e) {}
      }
    }
    renderUs(); RENDERED.dex = RENDERED.quest = 0;
    if (LMAP){ LMAP.remove(); LMAP = null; }
    const now = TABS.find(k => !$("pane-" + k).hidden) || "me"; showTab(now);
    chOpenFromParams(new URLSearchParams(location.search));           // 通知から ?ch=&th= で開かれたとき（アプリがまだ開いていなかった場合）
    if (typeof spkOpenFromParams === "function") spkOpenFromParams(new URLSearchParams(location.search));   // 2分だけスピークの通知から ?speak=1 で開かれたとき
  } catch (e) {
    console.error(e);
    if (e && e.name === "OperationError") store("cg-token", null);           // 鍵がちがう（復号できない）ときだけ消す。電波が弱いだけで消すと、ホーム画面のアプリが鍵なしになる
    $("me").innerHTML = `<div class="msg"><b>このリンクでは、あなたのページを開けませんでした。</b><p style="color:var(--ink2);margin-top:6px">運営から届いたリンクを、最後まで（# のうしろも含めて）そのまま開いてください。電波が弱いときは、少し待ってから<a href="javascript:location.reload()">読み込みなおし</a>てください。それでも開けないときは、運営に一言ください。</p></div>`;
    showTab("me");
  }
}
$("logout").addEventListener("click", e => { e.preventDefault(); store("cg-token", null); store("cg-tab", null); location.href = location.pathname; });
window.addEventListener("hashchange", () => {
  const h = hashRoute();
  if (h && PERSONAL){ history.replaceState(null, "", location.pathname + location.search + keyHash()); showTab(h); window.scrollTo(0, 0); return; }
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
