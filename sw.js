const REVALIDATED_DESTINATIONS = new Set([
  "document",
  "script",
  "style",
  "manifest"
]);

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  if (!REVALIDATED_DESTINATIONS.has(event.request.destination)) return;

  // 保存済みレスポンスがあれば条件付きで更新確認し、変更時だけ本文を取得する。
  event.respondWith(
    fetch(event.request, { cache: "no-cache" })
      .catch(() => fetch(event.request, { cache: "force-cache" }))
  );
});
