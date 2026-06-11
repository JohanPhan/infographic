const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const FPS = 24, W = 1280, H = 720;
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('file:///home/user/infographic/explainer.html', { waitUntil: 'load' });
  const total = await page.evaluate(() => window.VIDEO_TOTAL);
  const frames = Math.round(total * FPS);
  const t0 = Date.now();
  for (let f = 0; f < frames; f++) {
    await page.evaluate(tt => window.renderVideo(tt), f / FPS);
    await page.screenshot({ path: `/tmp/framesD/f_${String(f).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 });
    if (f % 240 === 0) console.log(`frame ${f}/${frames} t=${(f / FPS).toFixed(1)} el=${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  console.log('DONE', frames, 'total', total.toFixed(2), 'errors', errs.length ? errs.join('|') : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
