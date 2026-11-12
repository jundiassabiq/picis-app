import fs from 'node:fs';
import path from 'node:path';

const CDP = 'http://127.0.0.1:9333';
const APP = 'http://127.0.0.1:5173';
const OUT = path.resolve(process.cwd(), '.shots');

fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connect() {
  const list = await (await fetch(`${CDP}/json/list`)).json();
  const page = list.find((target) => target.type === 'page');
  if (!page) throw new Error('no page target');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
      return;
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      errors.push(msg.params.exceptionDetails?.exception?.description ?? 'exception');
    }
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      errors.push(msg.params.entry.text);
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const messageId = ++id;
      pending.set(messageId, { resolve, reject });
      ws.send(JSON.stringify({ id: messageId, method, params }));
    });
  return { send, errors, ws };
}

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` :: ${detail}` : ''}`);
}

const SET_INPUT = `
  window.__set = (el, value) => {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  window.__clickText = (text, scope) => {
    const root = scope ? document.querySelector(scope) : document;
    const all = [...root.querySelectorAll('button, a, label')];
    const el =
      all.find((n) => n.textContent.trim() === text) ??
      all.find((n) => n.textContent.trim().includes(text));
    if (!el) return false;
    el.click();
    return true;
  };
  window.__byLabel = (label) => document.querySelector('[aria-label="' + label + '"]');
  true;
`;

async function main() {
  const { send, errors } = await connect();
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');

  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description ?? 'eval failed');
    }
    return res.result.value;
  };

  const view = (width, height, mobile = width < 600) =>
    send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 2,
      mobile,
    });

  const go = async (pathname) => {
    await send('Page.navigate', { url: `${APP}${pathname}` });
    await sleep(1100);
    await evaluate(SET_INPUT);
  };

  const shot = async (name, full = false) => {
    const { data } = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: full,
    });
    fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(data, 'base64'));
  };

  const overflow = () =>
    evaluate(
      `JSON.stringify({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth })`,
    );

  /* --- 1. login page ---------------------------------------------------- */
  await view(390, 844);
  await go('/login');
  await shot('01-login-mobile');
  const loginTitle = await evaluate(`document.querySelector('h1')?.textContent ?? ''`);
  check('login page renders', loginTitle.includes('Masuk ke duitku'), loginTitle);

  /* --- 2. demo login ---------------------------------------------------- */
  const clickedDemo = await evaluate(`__clickText('Masuk dengan akun demo')`);
  await sleep(1200);
  const afterLogin = await evaluate(`location.pathname + '|' + (document.querySelector('h1')?.textContent ?? '')`);
  check('demo login lands on dashboard', clickedDemo && afterLogin.includes('/dashboard'), afterLogin);
  await shot('02-dashboard-mobile', true);

  const mobileOverflow = JSON.parse(await overflow());
  check(
    'no horizontal overflow at 390px',
    mobileOverflow.scroll <= mobileOverflow.inner,
    `${mobileOverflow.scroll} vs ${mobileOverflow.inner}`,
  );

  await view(360, 780);
  await sleep(500);
  const narrowOverflow = JSON.parse(await overflow());
  check(
    'no horizontal overflow at 360px',
    narrowOverflow.scroll <= narrowOverflow.inner,
    `${narrowOverflow.scroll} vs ${narrowOverflow.inner}`,
  );

  /* --- 3. desktop ------------------------------------------------------- */
  await view(1280, 1000, false);
  await sleep(600);
  await shot('03-dashboard-desktop');

  /* --- 4. transactions -------------------------------------------------- */
  await view(390, 844);
  await go('/transactions');
  await shot('04-transactions-mobile', true);
  const rowCount = await evaluate(`document.querySelectorAll('.tx-row').length`);
  check('transaction rows render', rowCount > 0, `${rowCount} rows`);

  const filtered = await evaluate(`
    (() => {
      const chip = [...document.querySelectorAll('.chip-row .chip')].find((n) => n.textContent.trim() === 'Pengeluaran');
      chip?.click();
      return true;
    })()
  `);
  await sleep(600);
  const urlAfterFilter = await evaluate(`location.search`);
  check('type filter updates URL', filtered && urlAfterFilter.includes('type=expense'), urlAfterFilter);

  /* --- 5. budgets ------------------------------------------------------- */
  await go('/budgets');
  await shot('05-budgets-mobile', true);
  const budgetCount = await evaluate(`document.querySelectorAll('.budget-card').length`);
  check('budget cards render', budgetCount > 0, `${budgetCount} cards`);

  /* --- 6. wallets ------------------------------------------------------- */
  await go('/wallets');
  await shot('06-wallets-mobile', true);
  const walletCount = await evaluate(`document.querySelectorAll('.wallet-card').length`);
  check('wallet cards render', walletCount >= 3, `${walletCount} cards`);

  /* --- 7. categories ---------------------------------------------------- */
  await go('/categories');
  await shot('07-categories-mobile', true);
  const catCount = await evaluate(`document.querySelectorAll('.cat-row').length`);
  check('category rows render', catCount > 0, `${catCount} rows`);

  /* --- 8. scan sample QR ------------------------------------------------ */
  await go('/scan');
  await shot('08-scan-idle', true);
  await evaluate(`__clickText('Coba contoh QR struk')`);
  await sleep(1500);
  const scanResult = await evaluate(
    `document.body.innerText.includes('QR terbaca') ? document.body.innerText.match(/Rp[\\d.]+/)?.[0] : 'no result'`,
  );
  check('sample QR decodes to an amount', scanResult === 'Rp87.500', String(scanResult));
  await shot('09-scan-result', true);

  /* --- 9. settings ------------------------------------------------------ */
  await go('/settings');
  await shot('10-settings-mobile', true);

  /* --- 10. dark mode ---------------------------------------------------- */
  await evaluate(`__clickText('Gelap')`);
  await sleep(700);
  const theme = await evaluate(`document.documentElement.dataset.theme`);
  check('theme switches to dark', theme === 'dark', theme);
  await go('/dashboard');
  await shot('11-dashboard-dark', true);
  await view(1280, 1000, false);
  await sleep(500);
  await shot('12-dashboard-dark-desktop');
  await evaluate(`__clickText('Terang')`);
  await sleep(400);

  /* --- 11. add transaction --------------------------------------------- */
  await view(390, 844);
  await go('/dashboard');
  await evaluate(`__byLabel('Catat transaksi baru')?.click()`);
  await sleep(700);
  await shot('13-add-sheet');
  const sheetOpen = await evaluate(`Boolean(document.querySelector('[role="dialog"]'))`);
  check('add sheet opens', sheetOpen);

  const focusClass = await evaluate(`document.activeElement?.className ?? ''`);
  check('sheet focuses the amount field', focusClass.includes('input--num'), focusClass);

  await send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Escape',
    code: 'Escape',
    windowsVirtualKeyCode: 27,
  });
  await sleep(350);
  const closedByEscape = await evaluate(
    `Boolean(document.querySelector('[role="dialog"]')) === false`,
  );
  check('Escape closes the sheet', closedByEscape);

  await evaluate(`__byLabel('Catat transaksi baru')?.click()`);
  await sleep(600);

  await evaluate(`
    (() => {
      const input = document.querySelector('.input--num');
      if (!input) return false;
      __set(input, 'Rp45.000');
      const chip = [...document.querySelectorAll('.sheet .chip')].find((n) => n.textContent.includes('Makan'));
      chip?.click();
      return true;
    })()
  `);
  await sleep(400);
  await evaluate(`__clickText('Simpan', '.sheet__foot')`);
  await sleep(900);
  const toastText = await evaluate(
    `[...document.querySelectorAll('.toast')].map((n) => n.textContent).join(' | ')`,
  );
  check('transaction save shows toast', toastText.includes('Transaksi disimpan'), toastText);
  const sheetClosed = await evaluate(`Boolean(document.querySelector('[role="dialog"]')) === false`);
  check('sheet closes after save', sheetClosed);

  /* --- 12. delete + undo ------------------------------------------------ */
  await go('/transactions');
  await evaluate(`
    (() => {
      const btn = document.querySelector('.menu-btn');
      btn?.click();
      return true;
    })()
  `);
  await sleep(400);
  const menuShown = await evaluate(`Boolean(document.querySelector('.menu[role="menu"]'))`);
  check('row menu opens', menuShown);
  await evaluate(`__clickText('Hapus', '.menu')`);
  await sleep(500);
  const confirmShown = await evaluate(`document.querySelector('[role="dialog"]')?.textContent.includes('Hapus transaksi ini')`);
  check('delete asks for confirmation', Boolean(confirmShown));
  await evaluate(`__clickText('Hapus', '.sheet__foot')`);
  await sleep(700);
  const undoToast = await evaluate(`document.querySelector('.toast')?.textContent ?? ''`);
  check('delete offers undo', undoToast.includes('Urungkan'), undoToast);
  await evaluate(`__clickText('Urungkan', '.toast')`);
  await sleep(600);
  const restored = await evaluate(`document.querySelector('.toast')?.textContent ?? ''`);
  check('undo restores transaction', restored.includes('dikembalikan'), restored);

  /* --- 13. edit transaction -------------------------------------------- */
  await evaluate(`document.querySelector('.menu-btn')?.click()`);
  await sleep(300);
  await evaluate(`__clickText('Ubah', '.menu')`);
  await sleep(600);
  const editTitle = await evaluate(`document.querySelector('[role="dialog"] h2')?.textContent ?? ''`);
  check('edit sheet prefilled', editTitle.includes('Ubah transaksi'), editTitle);
  await evaluate(`__clickText('Simpan perubahan', '.sheet__foot')`);
  await sleep(700);
  const editToast = await evaluate(
    `[...document.querySelectorAll('.toast')].map((n) => n.textContent).join(' | ')`,
  );
  check('edit saves', editToast.includes('Transaksi diperbarui'), editToast);

  /* --- 14. budgets: add + copy ----------------------------------------- */
  await go('/budgets');
  await evaluate(`__clickText('Tambah anggaran')`);
  await sleep(600);
  const budgetSheet = await evaluate(`document.querySelector('[role="dialog"]')?.textContent ?? ''`);
  check('budget sheet opens', budgetSheet.includes('Batas bulanan'), budgetSheet.slice(0, 40));
  await evaluate(`__clickText('Batal', '.sheet__foot')`);
  await sleep(300);
  await evaluate(`__clickText('Salin dari bulan lalu')`);
  await sleep(600);
  const copySheet = await evaluate(`document.querySelector('[role="dialog"]')?.textContent ?? ''`);
  check('copy budget preview opens', copySheet.includes('Salinan') || copySheet.includes('disalin') || copySheet.includes('Salin'), copySheet.slice(0, 60));
  await evaluate(`__clickText('Batal', '.sheet__foot')`);
  await sleep(300);

  /* --- 15. wallet transfer validation ---------------------------------- */
  await go('/wallets');
  await evaluate(`__clickText('Transfer')`);
  await sleep(600);
  const transferSheet = await evaluate(`document.querySelector('[role="dialog"]')?.textContent ?? ''`);
  check('transfer sheet opens', transferSheet.includes('Transfer antar dompet') || transferSheet.includes('Jumlah'));
  await evaluate(`
    (() => {
      const input = document.querySelector('.sheet .input--num');
      if (!input) return false;
      __set(input, 'Rp9.999.999');
      const btn = [...document.querySelectorAll('.sheet__foot .btn')].find((n) => n.textContent.trim() === 'Transfer');
      btn?.click();
      return true;
    })()
  `);
  await sleep(600);
  const transferError = await evaluate(`document.querySelector('.sheet .alert')?.textContent ?? ''`);
  check('transfer rejects insufficient balance', transferError.includes('tidak cukup'), transferError);
  await evaluate(`__clickText('Batal', '.sheet__foot')`);

  /* --- 16. budget-level toast on overspend ----------------------------- */
  await go('/dashboard');
  await evaluate(`__byLabel('Catat transaksi baru')?.click()`);
  await sleep(600);
  await evaluate(`
    (() => {
      const input = document.querySelector('.input--num');
      __set(input, 'Rp900.000');
      const chip = [...document.querySelectorAll('.sheet .chip')].find((n) => n.textContent.includes('Hiburan'));
      chip?.click();
      return true;
    })()
  `);
  await evaluate(`__clickText('Simpan', '.sheet__foot')`);
  await sleep(900);
  const warnToast = await evaluate(`document.querySelectorAll('.toast').length`);
  check('spend triggers budget warning toast', warnToast > 0, `${warnToast} toasts`);
  await shot('14-budget-warning');

  /* --- 17. storage failure banner -------------------------------------- */
  await go('/dashboard');
  await evaluate(`
    (() => {
      localStorage.setItem = function () { throw new Error('quota exceeded'); };
      return true;
    })()
  `);
  await evaluate(`__byLabel('Catat transaksi baru')?.click()`);
  await sleep(600);
  await evaluate(`
    (() => {
      const input = document.querySelector('.input--num');
      __set(input, 'Rp15.000');
      const chip = [...document.querySelectorAll('.sheet .chip')].find((n) => n.textContent.includes('Makan'));
      chip?.click();
      return true;
    })()
  `);
  await evaluate(`__clickText('Simpan', '.sheet__foot')`);
  await sleep(900);
  const storageBanner = await evaluate(`document.querySelector('.app__alert')?.textContent ?? ''`);
  check(
    'storage failure surfaces a banner',
    storageBanner.includes('Penyimpanan browser penuh'),
    storageBanner.slice(0, 50),
  );

  /* --- 18. 404 + protected redirect ------------------------------------ */
  await send('Page.navigate', { url: `${APP}/halaman-ngawur` });
  await sleep(900);
  const notFound = await evaluate(`document.querySelector('h1')?.textContent ?? ''`);
  check('unknown route shows 404 page', notFound.includes('tidak ketemu'), notFound);

  /* --- 19. logout guard ------------------------------------------------ */
  await evaluate(`localStorage.removeItem('duitku.v1')`);
  await send('Page.navigate', { url: `${APP}/budgets` });
  await sleep(1000);
  const guarded = await evaluate(`location.pathname`);
  check('protected route redirects when signed out', guarded === '/login', guarded);

  await shot('15-login-after-logout');

  check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log('FAILURES:');
    failed.forEach((f) => console.log(` - ${f.name} :: ${f.detail}`));
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
