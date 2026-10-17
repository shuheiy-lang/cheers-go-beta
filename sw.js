/* チアーズGO! のオフライン用（ホーム画面から開いたとき、電波が弱くても前回の画面が出るように） */
const V = "cheers-go-202610180130";
const SHELL = ["./", "index.html", "base.css?v=202610180130", "go.css?v=202610180130", "app.js?v=202610180130", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/logo-c.png", "icons/logo-w.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("cheers-go-") && k !== V && k !== "cheers-go-tiles").map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // 地図のタイル：一度見たところは端末に残す
  if (/(^|\.)tile\.openstreetmap\.org$/.test(u.hostname)){
    e.respondWith(caches.open("cheers-go-tiles").then(async c => (await c.match(e.request)) || fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; })));
    return;
  }
  // データ（public.json・暗号化された本人のファイル）：まず通信、だめなら前回の分
  if (u.origin === location.origin && (u.pathname.includes("/data/") || u.pathname.includes("/u/") || u.pathname.includes("/demo/"))){
    e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
    return;
  }
  // ページそのもの：まず通信して最新の版を取る（電波がないときだけ前回の分）
  if (e.request.mode === "navigate"){
    e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(V).then(c => c.put("./", cp)); return r; }).catch(() => caches.match("./").then(r => r || caches.match("index.html"))));
    return;
  }
  // 画面のもと・ライブラリ：端末にあればそれを使う
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
    if (res.ok && (u.origin === location.origin || /cdnjs|jsdelivr|fonts\.(googleapis|gstatic)/.test(u.hostname))){ const cp = res.clone(); caches.open(V).then(c => c.put(e.request, cp)); }
    return res;
  })));
});
// 通知（Web Push）。中継の雛形は本文なし（暗号化した本文を送らない）で届くので、文面はここで決める。本文つき（JSON）なら title/body/url/badge を使う
// iPhone/iPad は iOS 16.4+ の「ホーム画面に追加」したアプリだけ届く。届いたら必ず通知を出す（userVisibleOnly。出さないと端末に止められる）
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = {body: e.data ? e.data.text() : ""}; }
  e.waitUntil(Promise.all([
    self.registration.showNotification(d.title || "チアーズGO! リマインド", {body: d.body || "今日の英語の練習がまだです。1回だけでも、連続記録をのばしましょう。",
      icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: "cg-remind", data: {url: d.url || "./?tab=me"}}),
    self.navigator && self.navigator.setAppBadge ? self.navigator.setAppBadge(d.badge || 1).catch(() => {}) : null
  ]));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL((e.notification.data || {}).url || "./", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({type: "window", includeUncontrolled: true}).then(ws => {
    const w = ws.find(x => x.url.startsWith(self.registration.scope));
    return w ? w.focus() : self.clients.openWindow(url);              // 開いていればその画面へ（本人の鍵は端末に残っているので ./ で開ける）
  }));
});
