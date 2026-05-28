const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const FPS = 24, DUR = 240, W = 1280, H = 720;
  const total = Math.ceil(DUR * FPS);
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport:{width:W,height:H}, deviceScaleFactor:1 })).newPage();
  const errs=[];
  page.on('pageerror', e=>errs.push(e.message));
  await page.goto('http://localhost:8099/index.html', {waitUntil:'networkidle'});
  await page.evaluate(()=>window.renderAt(0));
  const t0=Date.now();
  for (let f=0; f<total; f++){
    const t = f / FPS;
    await page.evaluate(tt=>window.renderAt(tt), t);
    await page.screenshot({ path:`/tmp/frames/f_${String(f).padStart(5,'0')}.jpg`, type:'jpeg', quality:92 });
    if (f % 240 === 0) {
      const el=(Date.now()-t0)/1000;
      console.log(`frame ${f}/${total}  t=${t.toFixed(1)}s  elapsed=${el.toFixed(0)}s`);
    }
  }
  console.log('DONE frames:', total, 'errors:', errs.length? errs.join('|'):'none');
  await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1)});
