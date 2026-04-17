const CACHE_VERSION = "v1";
const PRODUCTS_SHELL_CACHE = `turma-do-printy-produtos-shell-${CACHE_VERSION}`;
const PRODUCTS_SHELL_ASSETS = [
  "/produtos.html",
  "/styles.css",
  "/site.js",
  "/header.js",
  "/api.js",
  "/content-admin.js"
];

function isProductsNavigation(request, url) {
  if (request.mode !== "navigate" || url.origin !== self.location.origin) {
    return false;
  }

  return url.pathname === "/produtos" || url.pathname === "/produtos.html";
}

function isProductsShellAsset(request, url) {
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return false;
  }

  return PRODUCTS_SHELL_ASSETS.includes(url.pathname);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PRODUCTS_SHELL_CACHE)
      .then((cache) => cache.addAll(PRODUCTS_SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => name.startsWith("turma-do-printy-produtos-shell-") && name !== PRODUCTS_SHELL_CACHE)
        .map((name) => caches.delete(name))
    );

    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (isProductsNavigation(request, url)) {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(request);
        const cache = await caches.open(PRODUCTS_SHELL_CACHE);
        cache.put("/produtos.html", networkResponse.clone());
        return networkResponse;
      } catch {
        const cache = await caches.open(PRODUCTS_SHELL_CACHE);
        const cachedResponse = await cache.match("/produtos.html");
        if (cachedResponse) {
          return cachedResponse;
        }

        return new Response("Sem conexao e sem cache da pagina de produtos.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
      }
    })());
    return;
  }

  if (isProductsShellAsset(request, url)) {
    event.respondWith((async () => {
      const cache = await caches.open(PRODUCTS_SHELL_CACHE);
      const cachedResponse = await cache.match(request);

      if (cachedResponse) {
        event.waitUntil((async () => {
          try {
            const networkResponse = await fetch(request);
            await cache.put(request, networkResponse.clone());
          } catch {
            // Mantem resposta em cache quando offline.
          }
        })());

        return cachedResponse;
      }

      const networkResponse = await fetch(request);
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    })());
  }
});
