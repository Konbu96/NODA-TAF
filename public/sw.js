// サービスワーカー：電波がなくても開けるようにする・通知を受け取って出す。
// 本番（Vercel）でだけ登録する（src/components/AppSetup.tsx）。

const CACHE = "noda-taf-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  // 古いキャッシュを消してから、すぐ使い始める
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const save = (req, res) => {
  if (res.ok) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
  }
  return res;
};

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Firebase などほかのサイトや、サーバーの処理（/api）はそのまま
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  // 画像・プログラムなど変わらないもの：先にキャッシュを見る
  if (url.pathname.startsWith("/_next/static/") || /\.(png|jpg|svg|ico|webmanifest|woff2?)$/.test(url.pathname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => save(req, res))));
    return;
  }

  // 画面：電波があれば新しいものを取り、なければ前に開いたものを出す
  e.respondWith(
    fetch(req)
      .then((res) => save(req, res))
      .catch(() =>
        caches.match(req).then((hit) => hit || (req.mode === "navigate" ? caches.match("/") : Response.error())),
      ),
  );
});

// ---------- 通知 ----------

self.addEventListener("push", (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch {
    d = { body: e.data ? e.data.text() : "" };
  }
  e.waitUntil(
    self.registration.showNotification(d.title || "野田陸上部", {
      body: d.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: d.tag,
      // 同じ種類の通知を上書きするときも、もう一度音・バナーで知らせる
      renotify: !!d.tag,
      data: { url: d.url || "/" },
    }),
  );
});

// 通知を押したら、アプリを開いて（開いていればその画面に切りかえて）その画面を出す
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) {
          if ("navigate" in w) w.navigate(url);
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
