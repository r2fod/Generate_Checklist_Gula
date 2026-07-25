import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const problemas=[], errores=[], fallos=[];
const ok=(c,m)=>{console.log(`  ${c?'✅':'❌'} ${m}`); if(!c) fallos.push(m);};
const estado = { evento:'boda', pax:150, ninos:20, nombreEvento:'Boda de prueba', fechaEvento:'2026-09-12',
  horaInicio:'09:30', ubicacion:'Finca Los Olivos', barraCoctel:true, horasCoctel:2, barraCopas:true, horasCopas:5,
  logisticaEquipo:[{nombre:'Raúl',inicio:'08:00',fin:'20:00'}], tarifaLogistica:12, plusFurgoneta:30,
  recogidas:[{concepto:'Sillas',fecha:'2026-09-13'}], compras:[{concepto:'Hielo',cantidad:'20'}] };
for (const w of [320,360,390,414,768,1024,1280,1920]) {
  const ctx = await b.newContext({ viewport:{width:w,height:900}, isMobile:w<768, hasTouch:w<768 });
  for (const p of ['**://*.googleapis.com/**','**://*.firebaseio.com/**','**://*.firebaseapp.com/**','**://*.gstatic.com/**']) await ctx.route(p, r=>r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', e=>errores.push(`${w}px ${e.message}`));
  page.on('console', m=>{ if(m.type()==='error'&&!/firestore|net::|Failed to load/i.test(m.text())) errores.push(`${w}px ${m.text().slice(0,110)}`); });
  await page.goto('http://localhost:4173/index.html?c='+encodeURIComponent(JSON.stringify(estado)), { waitUntil:'domcontentloaded' });
  await page.waitForTimeout(2300);
  const ov = async t => { const n=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth); if(n>0) problemas.push({t,w,n}); return n; };
  const r=[['config',await ov('config')]];
  await page.locator('button',{hasText:'Vista previa'}).first().click(); await page.waitForTimeout(900); r.push(['previa',await ov('previa')]);
  await page.locator('.preview-overlay').first().click({position:{x:3,y:3}}).catch(()=>{}); await page.waitForTimeout(600);
  await page.locator('button',{hasText:'Modo carga'}).first().click(); await page.waitForTimeout(1100);
  for (const t of ['Salida','Vuelta','Resumen']) { await page.locator('.carga-modo-toggle button').filter({hasText:t}).first().click(); await page.waitForTimeout(700); r.push([t.toLowerCase(),await ov('carga·'+t)]); }
  console.log(`  ${String(w).padStart(4)}px  ` + r.map(([n,o])=>`${n}:${o}`).join(' '));
  await ctx.close();
}
const ctx = await b.newContext({ viewport:{width:1280,height:950} });
for (const p of ['**://*.googleapis.com/**','**://*.firebaseio.com/**','**://*.firebaseapp.com/**','**://*.gstatic.com/**']) await ctx.route(p, r=>r.abort());
const page = await ctx.newPage();
page.on('pageerror', e=>errores.push('PAGEERROR '+e.message));
console.log('\n── Funcional ──');
for (const ev of ['boda','comunion','cumpleanos','corporativo','produccion']) {
  await page.goto('http://localhost:4173/index.html?c='+encodeURIComponent(JSON.stringify({evento:ev,pax:100})), { waitUntil:'domcontentloaded' });
  await page.waitForTimeout(2000);
  const items = await page.locator('.item-row').count();
  const iconos = await page.locator('.item-icon').count();
  const mal = await page.locator('.item-qty-input').evaluateAll(is=>is.filter(i=>/NaN|undefined/.test(i.value)).length);
  ok(items>20 && iconos===items && mal===0, `${ev}: ${items} items, ${iconos} iconos, ${mal} cantidades rotas`);
}
// El icono correcto sigue saliendo tras cachear
await page.goto('http://localhost:4173/index.html?c='+encodeURIComponent(JSON.stringify({evento:'boda',pax:100})), { waitUntil:'domcontentloaded' });
await page.waitForTimeout(2000);
const colores = await page.locator('.item-row').evaluateAll(rs => {
  const out = {};
  rs.forEach(r => { const n = r.querySelector('.item-label-text')?.textContent.trim(); const c = r.querySelector('.item-icon')?.style.color; if (n && c) out[n] = c; });
  return { vino: out['Copas de vino'], hielo: out['Hielo'], regletas: out['Regletas'], distintos: new Set(Object.values(out)).size };
});
ok(colores.distintos > 8, `iconos con ${colores.distintos} colores distintos (vino:${colores.vino} hielo:${colores.hielo} regletas:${colores.regletas})`);
console.log('\nDESBORDAMIENTOS:', problemas.length?JSON.stringify(problemas):'ninguno');
console.log('ERRORES JS:', errores.length?[...new Set(errores)].join('\n'):'ninguno');
console.log('FALLOS:', fallos.length?fallos.join(' | '):'ninguno');
await b.close();
