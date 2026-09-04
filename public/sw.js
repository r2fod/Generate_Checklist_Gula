// ─── SERVICE WORKER: QUE LA APP ABRA SIN COBERTURA ─────────────────────────────
// El caso real: el equipo llega a un mas sin cobertura, abre la app y le sale la
// pantalla de "sin conexión" del navegador. Los eventos están guardados en el móvil,
// pero sin poder cargar la app no se llega a ellos. Con esto, la app se guarda entera
// la primera vez y a partir de ahí abre siempre, con o sin señal.
//
// Reglas de caché, distintas según lo que se pida:
//
//   · version.json → SOLO red, nunca caché. Es el fichero que sirve para detectar que
//     hay una versión nueva: si se cacheara, dejaría de detectarla. Sin conexión falla
//     y la app se lo calla, que es lo que queremos.
//   · index.html → primero la red y, si no hay, la copia guardada. Así con cobertura
//     siempre se coge el HTML nuevo (que es justo lo que apunta al bundle nuevo) y sin
//     cobertura se abre igual.
//   · /assets/... → primero la caché. Llevan hash en el nombre, así que el contenido de
//     un fichero concreto NUNCA cambia: si está guardado, es válido para siempre.
//   · todo lo demás (Firebase, Google...) → se deja pasar sin tocarlo.
//
// Este fichero vive en la RAÍZ y cubre las TRES apps: la checklist (/checklist/), el
// formulario (/formulario/) y el calendario (/calendario/). Para el navegador son tres
// apps distintas —cada una en su carpeta, con su manifiesto y su ámbito, por eso se
// instalan por separado— pero comparten dominio y assets, así que con una sola caché
// basta. Lo único que cambia entre ellas es a qué documento se vuelve cuando no hay red,
// y eso se decide mirando la dirección (ver suIndice).
// ─── AVISOS (PUSH): EL RECORDATORIO NO ESPERA A QUE ALGUIEN ABRA LA APP ───────
// El Worker (D1b) empuja un recordatorio al que le llega el día; el navegador lo
// descifra solo (cifrado Web Push) y aquí solo se muestra. El payload es
// { titulo, cuerpo, url } —lo decide el Worker, no el teléfono—. Al tocarlo se
// vuelve a la app (o a la ventana abierta, si la hay), como debe ser en un aviso
// de "hoy toca X", que la respuesta es abrir y mirarlo.
self.addEventListener("push", (e) => {
  let datos = null;
  try { datos = e.data ? e.data.json() : null; } catch (err) { datos = null; }
  const titulo = (datos && datos.titulo) || "Gula";
  const cuerpo = (datos && datos.cuerpo) || "";
  const url = (datos && datos.url) || "./";
  e.waitUntil(
    self.registration.showNotification(titulo, {
      body: cuerpo,
      icon: "./icono-192.png",
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      for (const v of ventanas) {
        if ("focus" in v) { v.focus(); if ("navigate" in v) v.navigate(url); return; }
      }
      return self.clients.openWindow(url);
    }),
  );
});

// Subir este número cada vez que cambie el CONTENIDO de un fichero que no lleva hash en
// el nombre (los iconos, los manifest.webmanifest, favicon.svg...) aunque el propio
// sw.js no toque esos ficheros. El navegador solo relee este fichero (y por tanto solo
// vuelve a pedir ESENCIALES) cuando estos BYTES cambian; si no, sigue sirviendo de la
// caché vieja el `icono-192.png` de siempre aunque el servidor ya tenga otro con el
// mismo nombre — pasó de verdad: se cambiaron los tres iconos (#173) sin tocar este
// número, y quien ya tenía la app instalada (o solo visitada una vez) se quedó viendo
// el icono antiguo por mucho que borrara el acceso directo y lo reinstalara, porque el
// acceso directo no toca la caché del origen — solo se limpia bajando este número.
const VERSION = "gula-v6";
const CACHE = `${VERSION}`;

// Lo que hay que guardar sí o sí para poder abrir sin cobertura. Los .js y .css llevan
// hash en el nombre, así que la lista la genera la compilación en precache.json (ver
// vite.config.js): el service worker se registra cuando la página ya ha cargado, así que
// esas peticiones ya han pasado sin él y no se guardarían solas.
const ESENCIALES = [
  "./", "./index.html", "./manifest.webmanifest", "./favicon.svg",
  "./icono-192.png", "./icono-512.png", "./icono-maskable-512.png",
  // Cada app con su documento y su manifiesto: si solo se guardara uno, sin cobertura
  // se abriría la app equivocada, que es justo lo que no queremos.
  "./checklist/", "./checklist/index.html", "./checklist/manifest.webmanifest",
  "./formulario/", "./formulario/index.html", "./formulario/manifest.webmanifest",
  "./calendario/", "./calendario/index.html", "./calendario/manifest.webmanifest",
];

// De qué app es esta dirección. Se usa para no cruzar las dos sin cobertura: el
// respaldo del formulario es el documento del formulario, no el de la checklist.
// La raíz es solo el desvío, y su documento también se guarda: sin él, quien abra un
// enlace viejo sin cobertura no llegaría a ninguna de las dos.
function suIndice(url) {
  if (url.pathname.includes("/formulario/")) return "./formulario/index.html";
  if (url.pathname.includes("/checklist/")) return "./checklist/index.html";
  if (url.pathname.includes("/calendario/")) return "./calendario/index.html";
  return "./index.html";
}

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    let deLaCompilacion = [];
    try {
      const r = await fetch("./precache.json", { cache: "no-store" });
      if (r.ok) deLaCompilacion = (await r.json()).ficheros || [];
    } catch (err) { /* si no está, se guarda al menos el esqueleto */ }
    // Uno a uno y sin abortar por un fallo suelto: que falte un icono no debe impedir
    // que la app quede disponible sin cobertura
    await Promise.allSettled(
      [...ESENCIALES, ...deLaCompilacion].map((u) => c.add(new Request(u, { cache: "reload" }))),
    );
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const guardar = async (req, res) => {
  if (res && res.ok && res.type === "basic") {
    const c = await caches.open(CACHE);
    c.put(req, res.clone()).catch(() => {});
  }
  return res;
};

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Firebase y compañía: sin tocar

  // El fichero de versión, siempre de la red
  if (url.pathname.endsWith("/version.json")) {
    e.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  // El documento: red primero, caché de respaldo
  if (request.mode === "navigate" || url.pathname.endsWith("/index.html") || url.pathname.endsWith("/")) {
    e.respondWith(
      fetch(request)
        .then((res) => guardar(request, res))
        .catch(async () => (await caches.match(request)) || (await caches.match(suIndice(url))) || Response.error()),
    );
    return;
  }

  // Lo demás del propio dominio: caché primero (los assets llevan hash y no cambian)
  e.respondWith(
    caches.match(request).then((guardado) => guardado || fetch(request).then((res) => guardar(request, res))),
  );
});
