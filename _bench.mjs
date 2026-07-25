import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport:{width:1280,height:950} });
for (const p of ['**://*.googleapis.com/**','**://*.firebaseio.com/**','**://*.firebaseapp.com/**','**://*.gstatic.com/**']) await ctx.route(p, r=>r.abort());
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page); await cdp.send('Performance.enable');
await page.goto('http://localhost:4173/index.html?c='+encodeURIComponent(JSON.stringify({evento:'boda',pax:150,ninos:20})), { waitUntil:'domcontentloaded' });
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
await page.waitForTimeout(3000);
const script = async () => (await cdp.send('Performance.getMetrics')).metrics.find(m=>m.name==='ScriptDuration').value;
async function bench(nombre, accion, vueltas=7) {
  const r = [];
  for (let i=0;i<vueltas;i++) { const a = await script(); await accion(); await page.waitForTimeout(500); r.push(((await script())-a)*1000); }
  r.sort((x,y)=>x-y);
  console.log(`  ${nombre}: ${Math.round(r[Math.floor(r.length/2)])} ms de JS (mediana de ${vueltas})`);
}
const buscador = page.locator('.search-input-main');
await bench('buscador · teclear "copas de vino"', async () => { await buscador.fill(''); for (const c of 'copas de vino') await buscador.press(c===' '?'Space':c); });
await buscador.fill('');
const pax = page.locator('input[type=number]').first();
await bench('pax · 12 valores', async () => { for (let i=0;i<12;i++) await pax.fill(String(100+i)); });
// Verificar que la app SÍ reacciona (control de que la medida es real)
await pax.fill('40'); await page.waitForTimeout(700);
const q40 = await page.locator('.item-qty-input').first().inputValue();
await pax.fill('400'); await page.waitForTimeout(700);
const q400 = await page.locator('.item-qty-input').first().inputValue();
console.log(`  (control: pax 40 → ${q40}, pax 400 → ${q400} · ${q40!==q400?'la app reacciona ✅':'❌ NO reacciona'})`);
await b.close();
