import fs from 'node:fs';
import path from 'node:path';

const CDP = 'http://127.0.0.1:9333';
const APP = 'http://127.0.0.1:5173';
const OUT = path.resolve(process.cwd(), '.shots-light');
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const list = await (await fetch(`${CDP}/json/list`)).json();
const page = list.find((target) => target.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));

let id = 0;
const pending = new Map();
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  }
});

const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const messageId = ++id;
    pending.set(messageId, { resolve, reject });
    ws.send(JSON.stringify({ id: messageId, method, params }));
  });

const evaluate = async (expression) => {
  const res = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description ?? 'eval failed');
  return res.result.value;
};

await send('Page.enable');
await send('Runtime.enable');

const view = (width, height, mobile = width < 600) =>
  send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile });

const go = async (pathname) => {
  await send('Page.navigate', { url: `${APP}${pathname}` });
  await sleep(1100);
};

const shot = async (name, full = false) => {
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full });
  fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(data, 'base64'));
};

/* fresh session */
await view(390, 844);
await go('/login');
await evaluate(`localStorage.clear()`);
await go('/login');
await shot('01-login-mobile');

await evaluate(`
  (() => {
    const btn = [...document.querySelectorAll('button')].find((n) => n.textContent.includes('Masuk dengan akun demo'));
    btn?.click();
    return true;
  })()
`);
await sleep(1400);

for (let i = 0; i < 4; i += 1) {
  const theme = await evaluate(`document.documentElement.dataset.theme`);
  if (theme === 'light') break;
  await evaluate(`document.querySelector('[aria-label^="Tema"]')?.click()`);
  await sleep(350);
}
console.log('theme now', await evaluate(`document.documentElement.dataset.theme`));

await go('/dashboard');
await shot('02-dashboard-mobile', true);

await view(360, 780);
await sleep(400);
await shot('02b-dashboard-360', true);
const narrow = await evaluate(
  `JSON.stringify({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth })`,
);
console.log('360 overflow', narrow);
await view(390, 844);

await view(1280, 1000, false);
await sleep(600);
await shot('03-dashboard-desktop');

await view(390, 844);
for (const [name, route] of [
  ['04-transactions', '/transactions'],
  ['05-budgets', '/budgets'],
  ['06-wallets', '/wallets'],
  ['07-categories', '/categories'],
  ['08-scan', '/scan'],
  ['09-settings', '/settings'],
]) {
  await go(route);
  await shot(name, true);
}

await go('/dashboard');
await evaluate(`document.querySelector('[aria-label="Catat transaksi baru"]')?.click()`);
await sleep(700);
await shot('10-add-sheet');

await evaluate(`document.querySelector('[aria-label="Tutup"]')?.click()`);
await sleep(400);

/* empty state: a brand new account */
await evaluate(`localStorage.clear()`);
await go('/login');
await go('/register');
await shot('11-register-mobile', true);
await evaluate(`
  (() => {
    const inputs = document.querySelectorAll('.auth__card input');
    const set = (el, v) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    set(inputs[0], 'Dewi Larasati');
    set(inputs[1], 'dewi@contoh.id');
    set(inputs[2], 'rahasia123');
    set(inputs[3], 'rahasia123');
    return true;
  })()
`);
await sleep(300);
await evaluate(`
  [...document.querySelectorAll('button')].find((n) => n.textContent.trim() === 'Buat akun')?.click()
`);
await sleep(1200);
const path1 = await evaluate('location.pathname');
console.log('after register', path1);

for (let i = 0; i < 4; i += 1) {
  const theme = await evaluate(`document.documentElement.dataset.theme`);
  if (theme === 'light') break;
  await evaluate(`document.querySelector('[aria-label^="Tema"]')?.click()`);
  await sleep(350);
}

await shot('12-dashboard-empty', true);

await evaluate(`localStorage.clear()`);
await view(1280, 1000, false);
await sleep(300);
await go('/login');
await shot('13-login-desktop');

console.log('done');
process.exit(0);
