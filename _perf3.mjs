import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport:{width:1280,height:950} });
for (const p of ['**://*.googleapis.com/**','**://*.firebaseio.com/**','**://*.firebaseapp.com/**','**://*.gstatic.com/**']) await ctx.route(p, r=>r.abort());
const page = await ctx.newPage();
await page.goto('http://localhost:4173/index.html?c='+encodeURIComponent(JSON.stringify({evento:'boda',pax:150,ninos:20})), { waitUntil:'domcontentloaded' });
await page.waitForTimeout(3000);
// Trabajo síncrono de React por pulsación (sin esperar a frames)
const bench = async (sel, valores, vueltas=5) => {
  const r = [];
  for (let v=0; v<vueltas; v++) r.push(await page.evaluate(({sel, valores}) => {
    const el = document.querySelector(sel);
    const t0 = performance.now();
    for (const val of valores) { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); }
    return performance.now() - t0;
  }, {sel, valores}));
  r.sort((a,b)=>a-b);
  return Math.round(r[Math.floor(r.length/2)]);
};
const pax = Array.from({length:20},(_,i)=>String(100+i));
const txt = 'copas de vino tinto'.split('').map((_,i,a)=>a.slice(0,i+1).join(''));
console.log(`pax · 20 cambios:      ${await bench('input[type=number]', pax)} ms`);
console.log(`buscador · 19 teclas:  ${await bench('.search-input-main', txt)} ms`);
await page.evaluate(()=>{ const s=document.querySelector('.search-input-main'); s.value=''; s.dispatchEvent(new Event('input',{bubbles:true})); });
await b.close();
