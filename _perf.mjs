import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport:{width:1280,height:950} });
for (const p of ['**://*.googleapis.com/**','**://*.firebaseio.com/**','**://*.firebaseapp.com/**','**://*.gstatic.com/**']) await ctx.route(p, r=>r.abort());
const page = await ctx.newPage();
const pedidos = [];
page.on('response', r => { const u = r.url(); if (/\.(js|css)$/.test(u)) pedidos.push(u.split('/').pop()); });
await page.goto('http://localhost:4173/index.html?c='+encodeURIComponent(JSON.stringify({evento:'boda',pax:150,ninos:20})), { waitUntil:'domcontentloaded' });
await page.waitForTimeout(3000);
console.log('recursos cargados al arranque:', JSON.stringify(pedidos));

// Coste de teclear en un input: cada pulsación fuerza un render completo
const medir = async (etiqueta, accion) => {
  const t = await page.evaluate(() => performance.now());
  await accion();
  const dt = await page.evaluate((t0) => performance.now() - t0, t);
  console.log(`  ${etiqueta}: ${Math.round(dt)} ms`);
  return dt;
};
const inputPax = page.locator('input[type=number]').first();
await medir('escribir 10 dígitos en Pax', async () => {
  for (const d of '1234567890') { await inputPax.fill(d); }
});
await medir('escribir 12 letras en el buscador', async () => {
  const s = page.locator('.search-input-main');
  for (const c of 'copas de vino') await s.press(c === ' ' ? 'Space' : c);
});
// Cuántas veces se reconstruye la checklist: se instrumenta contando renders del DOM
const longTasks = await page.evaluate(() => new Promise(res => {
  const tareas = [];
  const obs = new PerformanceObserver(l => l.getEntries().forEach(e => tareas.push(Math.round(e.duration))));
  try { obs.observe({ entryTypes: ['longtask'] }); } catch(e) { return res('no soportado'); }
  const inp = document.querySelector('input[type=number]');
  let i = 0;
  const tick = () => { if (i++ > 25) { obs.disconnect(); return res(tareas); }
    inp.value = String(100 + i); inp.dispatchEvent(new Event('input', { bubbles: true })); setTimeout(tick, 40); };
  tick();
}));
console.log('  tareas largas (>50ms) al teclear 25 veces:', JSON.stringify(longTasks));
await b.close();
