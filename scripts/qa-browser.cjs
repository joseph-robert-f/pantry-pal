// Browser QA for every route and interaction (#17, GH #4).
//
//   npm run build && npm run start          # in one terminal
//   node scripts/qa-browser.cjs http://localhost:3000 /tmp/qa-shots
//
// Needs Playwright (`npm i -D playwright && npx playwright install chromium`),
// or set PW_CHROMIUM_PATH to an existing Chromium. Runs a desktop and an
// iPhone 13 pass; prints findings (console errors, hydration warnings, failed
// requests, horizontal overflow, tap targets < 24px, missing h1, failed
// interactions) and saves a full-page screenshot per route. The add-item check
// uses Jev when the server has TYPESAFE_API_KEY, else the keyword rules.

const { chromium, devices } = require('playwright');
const [,, BASE, OUT] = process.argv;
const ROUTES = ['/', '/plan', '/recipe/sheet_pan_chicken_sweet_potato', '/recipe/ground_beef_stir_fry', '/list', '/paywall', '/paywall/accepted', '/coach', '/discover', '/recipe/does_not_exist'];
const VIEWPORTS = {
  desktop: { viewport: { width: 1280, height: 900 } },
  iphone: { ...devices['iPhone 13'], browserName: undefined, defaultBrowserType: undefined },
};
require('node:fs').mkdirSync(OUT, { recursive: true });
const findings = [];
const note = (vp, where, what) => findings.push(`[${vp}] ${where}: ${what}`);
const check = (vp, where, cond, what) => { if (!cond) note(vp, where, 'FAIL ' + what); return cond; };

function watch(page, vp, label) {
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type())) {
      const t = m.text();
      if (/favicon/.test(t)) return;
      note(vp, label(), `console.${m.type()}: ${t.slice(0, 300)}`);
    }
  });
  page.on('pageerror', (e) => note(vp, label(), `pageerror: ${e.message.slice(0, 300)}`));
  page.on('response', (r) => {
    if (r.status() >= 400 && !/favicon/.test(r.url())) note(vp, label(), `HTTP ${r.status()} ${r.url()}`);
  });
}

async function layoutChecks(page, vp, route) {
  const r = await page.evaluate(() => {
    const doc = document.documentElement;
    const overflowX = doc.scrollWidth - doc.clientWidth;
    const small = [];
    for (const el of document.querySelectorAll('button, a, input')) {
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      if (b.height < 24 || b.width < 24) small.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}" ${Math.round(b.width)}x${Math.round(b.height)}`);
    }
    const h1 = [...document.querySelectorAll('h1')].map((h) => h.textContent.trim());
    return { overflowX, small, h1, title: document.title, lang: doc.lang };
  });
  if (r.overflowX > 0) note(vp, route, `horizontal overflow ${r.overflowX}px`);
  if (r.small.length) note(vp, route, `tap targets < 24px: ${r.small.join('; ')}`);
  if (r.h1.length !== 1) note(vp, route, `h1 count ${r.h1.length}: ${JSON.stringify(r.h1)}`);
  return r;
}

(async () => {
  const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
  for (const [vp, opts] of Object.entries(VIEWPORTS)) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    let where = 'start';
    watch(page, vp, () => where);

    // 1. Route sweep (onboarded, so / redirects).
    await ctx.addInitScript(() => { try { localStorage.setItem('pp_onboarded', 'true'); } catch {} });
    for (const route of ROUTES) {
      where = route;
      await page.goto(BASE + route, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      const r = await layoutChecks(page, vp, route);
      await page.screenshot({ path: `${OUT}/${vp}${route.replace(/\//g, '_') || '_root'}.png`, fullPage: true });
      if (route === '/') check(vp, route, page.url().endsWith('/plan'), `onboarded user redirects to /plan (at ${page.url()})`);
      if (route === '/recipe/does_not_exist') check(vp, route, (await page.content()).includes("Something didn"), 'unknown recipe shows error state');
      console.log(`[${vp}] ${route} ok (title "${r.title}", lang "${r.lang}")`);
    }
    await ctx.close();

    // 2. Interaction pass in a fresh context (not onboarded).
    const ctx2 = await browser.newContext(opts);
    const p = await ctx2.newPage();
    watch(p, vp, () => where);
    where = 'onboarding';
    await p.goto(BASE + '/', { waitUntil: 'networkidle' });
    check(vp, where, await p.getByText('How does a normal training week look?').isVisible(), 'onboarding question visible');
    const lift4 = p.getByRole('button', { name: 'Lift 4x' });
    check(vp, where, (await lift4.getAttribute('aria-pressed')) === 'true', 'Lift 4x preselected');
    const cardio = p.getByRole('button', { name: '+ cardio' });
    await cardio.click();
    check(vp, where, (await cardio.getAttribute('aria-pressed')) === 'true', 'pill toggles on');
    await p.getByRole('button', { name: 'Continue' }).click();
    await p.waitForURL('**/plan');
    check(vp, where, (await p.evaluate(() => localStorage.getItem('pp_onboarded'))) === 'true', 'pp_onboarded flag set');

    where = 'plan';
    const chips = p.locator('main button').filter({ hasText: /^[MTWFS]$/ });
    check(vp, where, (await chips.count()) === 6, `6 day chips (got ${await chips.count()})`);
    await chips.nth(3).click();
    const pressed = await chips.nth(3).getAttribute('aria-pressed');
    check(vp, where, pressed === 'true', `day chip selects (aria-pressed=${pressed})`);
    const coachBefore = await p.locator('main').innerText();
    if (vp === 'desktop') {
      await p.getByRole('button', { name: 'Week 1' }).click();
      const after = await p.locator('main').innerText();
      check(vp, where, after !== coachBefore && after.includes('Energy was dragging'), 'Week 1 toggle changes coach context');
      await p.getByRole('button', { name: 'Week 3' }).click();
      check(vp, where, (await p.locator('main').innerText()).includes('trending up'), 'Week 3 toggle changes coach context');
    } else {
      check(vp, where, !(await p.getByRole('button', { name: 'Week 1' }).isVisible()), 'demo controls hidden on mobile');
    }
    await p.locator('main button').filter({ hasText: /Sheet-pan chicken/ }).first().click();
    await p.waitForURL('**/recipe/**');

    where = 'recipe';
    const more = p.getByRole('button', { name: /\+ \d+ more/ });
    const liBefore = await p.locator('main ul li').count();
    await more.click();
    check(vp, where, (await p.locator('main ul li').count()) > liBefore, 'ingredients expand');
    await p.getByRole('button', { name: 'Start cooking' }).click();
    const status = p.getByRole('status');
    const toastLayer = p.locator('[aria-hidden="true"]', { hasText: 'Locked in. Have at it.' });
    const opacity = () => toastLayer.evaluate((el) => getComputedStyle(el).opacity);
    check(vp, where, (await status.textContent()) === 'Locked in. Have at it.', 'cook toast announced (live region text)');
    await p.waitForTimeout(400);
    check(vp, where, (await opacity()) === '1', 'cook toast visible');
    await p.waitForTimeout(2000);
    check(vp, where, (await status.textContent()) === '', 'live region clears after ~2s');
    check(vp, where, (await opacity()) === '0', 'cook toast faded out');
    await p.getByRole('button', { name: /Better fit for a hard day/ }).click();
    await p.waitForURL('**/paywall');
    await p.goBack(); await p.waitForURL('**/recipe/**');
    await p.getByRole('button', { name: 'Swap meal' }).click();
    await p.waitForURL('**/paywall');

    where = 'paywall';
    const monthly = p.getByRole('button', { name: /Monthly/ });
    const annual = p.getByRole('button', { name: /Annual/ });
    check(vp, where, (await annual.getAttribute('aria-pressed')) === 'true', 'annual preselected');
    await monthly.click();
    check(vp, where, (await monthly.getAttribute('aria-pressed')) === 'true' && (await annual.getAttribute('aria-pressed')) === 'false', 'price toggle switches');
    await p.getByRole('button', { name: 'Start 7-day trial' }).click();
    await p.waitForURL('**/paywall/accepted');
    check(vp, where, await p.getByText("Glad to have you").isVisible(), 'accepted state shows');

    where = 'list';
    await p.goto(BASE + '/list', { waitUntil: 'networkidle' });
    check(vp, where, (await p.locator('main').innerText()).includes('+ bagels, bananas'), 'diff banner text');
    const spinach = p.getByRole('button', { name: /spinach/ });
    await spinach.click();
    check(vp, where, (await spinach.getAttribute('aria-pressed')) === 'true', 'item checks');
    await spinach.click();
    check(vp, where, (await spinach.getAttribute('aria-pressed')) === 'false', 'item unchecks');
    await p.getByPlaceholder('Add something else…').fill('chx thighs bnls');
    await p.getByPlaceholder('Add something else…').press('Enter');
    await p.waitForFunction(() => document.querySelector('#add-item').value === '', null, { timeout: 8000 });
    const protein = p.locator('section', { has: p.locator('h2', { hasText: 'PROTEIN' }) });
    check(vp, where, (await protein.innerText()).includes('chx thighs bnls'), 'typed item lands in PROTEIN via Enter');
    const staplesBtn = p.getByRole('button', { name: /Check you have \(\d+\)/ });
    check(vp, where, (await staplesBtn.getAttribute('aria-expanded')) === 'false', 'staples collapsed by default');
    await staplesBtn.click();
    check(vp, where, (await staplesBtn.getAttribute('aria-expanded')) === 'true', 'staples expand');
    await p.locator('section', { has: staplesBtn }).getByRole('button', { name: 'olive oil' }).click();
    const pantry = p.locator('section', { has: p.locator('h2', { hasText: 'PANTRY' }) });
    check(vp, where, (await pantry.innerText()).includes('olive oil'), 'picked staple lands in PANTRY');
    check(vp, where, /Check you have \(8\)/i.test(await staplesBtn.innerText()) /* h2 is CSS-uppercased */, 'staple count drops to 8');
    // This sandbox blocks instacart.com, so check the link, not the load.
    const insta = p.getByRole('link', { name: 'Shop with Instacart' });
    check(vp, where, (await insta.getAttribute('href')) === 'https://www.instacart.com' && (await insta.getAttribute('target')) === '_blank' && /noopener/.test(await insta.getAttribute('rel')), 'Instacart link opens a new tab safely');

    where = 'tabs';
    for (const [name, path] of [['Coach', '/coach'], ['Discover', '/discover'], ['List', '/list'], ['Plan', '/plan']]) {
      await p.getByRole('link', { name }).click();
      await p.waitForURL('**' + path);
      check(vp, where, (await p.getByRole('link', { name }).getAttribute('aria-current')) === 'page', `${name} tab active`);
    }
    await ctx2.close();
  }
  await browser.close();
  console.log(`\n=== ${findings.length} findings ===`);
  for (const f of findings) console.log(f);
  process.exitCode = findings.length ? 1 : 0;
})().catch((e) => { console.error('QA SCRIPT ERROR', e); process.exit(1); });
