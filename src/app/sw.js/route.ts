import { readFile } from "node:fs/promises";
import { join } from "node:path";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (process.env.NODE_ENV !== "production")
    return new Response("", { status: 404 });
  const build = (
    await readFile(join(process.cwd(), ".next/BUILD_ID"), "utf8")
  ).trim();
  const code = `
const CACHE = ${JSON.stringify(`fitmin-shell-${build}`)};
const SHELL = '/offline';
const staticAsset = (url) => url.origin === self.location.origin &&
  (url.pathname.startsWith('/_next/static/') || /^\\/icon-(180|192|512)\\.png$/.test(url.pathname));
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  const response = await fetch(SHELL, { cache: 'reload', credentials: 'omit' });
  if (!response.ok || response.redirected) throw new Error('Offline shell unavailable');
  const html = await response.clone().text();
  if (!html.includes('id="fitmin-offline-shell"')) throw new Error('Unexpected offline shell');
  const assets = [...html.matchAll(/(?:src|href)="([^"<>]+)"/g)]
    .map(match => new URL(match[1].replaceAll('&amp;', '&'), self.location.origin))
    .filter(staticAsset).map(url => url.href);
  await cache.addAll([...new Set(assets)]);
  await cache.put(SHELL, response);
  await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key.startsWith('fitmin-shell-') && key !== CACHE) await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (staticAsset(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);
      return cached || fetch(request);
    })());
  } else if (request.mode === 'navigate' && (url.pathname === '/' || url.pathname === SHELL || /^\\/workout\\/[^/]+$/.test(url.pathname))) {
    event.respondWith(fetch(request).catch(async () => {
      const shell = await (await caches.open(CACHE)).match(SHELL);
      return shell || new Response('Offline-Start noch nicht vorbereitet. Bitte mit Verbindung öffnen.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }));
  }
  // Deliberately no caching of private HTML, APIs, RSC or authentication.
});
`;
  return new Response(code, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
      "Service-Worker-Allowed": "/",
    },
  });
}
