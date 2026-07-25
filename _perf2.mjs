import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport:{width:1280,height:950} });
for (const p of ['**://*.googleapis.com/**','**://*.firebaseio.com/**','**://*.firebaseapp.com/**','**://*.gstatic.com/**']) await ctx.route(p, r=>r.abort());
const page = await ctx.newPage();
await page.goto('http://localhost:4173/index.html?c='+encodeURIComponent(JSON.stringify({evento:'boda',pax:150,ninos:20})), { waitUntil:'domcontentloaded' });
await page.waitForTimeout(3000);
// Latencia por tecla: tiempo que tarda el navegador en devolver el control tras el input
const medirLatencia = async (sel, texto, vueltas) => {
  const muestras = [];
  for (let v = 0; v < vueltas; v++) {
    const ms = await page.evaluate(async ({sel, texto}) => {
      const el = document.querySelector(sel);
      const t = [];
      for (const c of texto) {
        const t0 = performance.now();
        el.value = (el.value || '') + c;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        t.push(performance.now() - t0);
      }
      el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true }));
      return t;
    }, {sel, texto});
    muestras.push(...ms);
  }
  muestras.sort((a,b)=>a-b);
  return { mediana: Math.round(muestras[Math.floor(muestras.length/2)]), p90: Math.round(muestras[Math.floor(muestras.length*0.9)]) };
};
console.log('buscador  ', JSON.stringify(await medirLatencia('.search-input-main', 'copas de vino', 4)), 'ms por tecla');
console.log('pax       ', JSON.stringify(await medirLatencia('input[type=number]', '123456', 4)), 'ms por tecla');
await b.close();
