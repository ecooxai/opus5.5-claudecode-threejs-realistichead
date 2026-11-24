#!/usr/bin/env node
// Headless capture. Usage: node scripts/shot.mjs <url> <outPrefix> [views=front,threequarter,left,right,back]
// Env: BACKEND=webgpu|webgl (optional, appended as &backend=)
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function loadPuppeteer() {
  const tries = [path.join(root, 'package.json'), path.join(execSync('npm root -g').toString().trim(), 'x')];
  for (const t of tries) { try { return createRequire(t).resolve('puppeteer-core'); } catch {} }
  console.log('installing puppeteer-core...');
  execSync('npm i -D puppeteer-core', { cwd: root, stdio: 'inherit' });
  return createRequire(path.join(root, 'package.json')).resolve('puppeteer-core');
}
const puppeteer = (await import(loadPuppeteer())).default;

const [url, outPrefix, viewsArg] = process.argv.slice(2);
if (!url || !outPrefix) { console.log('usage: node scripts/shot.mjs <url> <outPrefix> [views]'); process.exit(1); }
const views = (viewsArg || 'front,threequarter,left,right,back').split(',');

// Default: WebGL2 = NVIDIA GL (hardware) via ANGLE; WebGPU = SwiftShader (CPU, slow but screenshots correctly).
// '--use-vulkan --disable-vulkan-surface' gives a hardware NVIDIA WebGPU adapter, but its canvas screenshots black.
// Override with env CHROME_FLAGS="..." (space separated).
const gpuFlags = process.env.CHROME_FLAGS ? process.env.CHROME_FLAGS.split(/\s+/) :
  ['--enable-features=Vulkan', '--use-angle=gl-egl'];
const args = ['--headless=new', '--no-sandbox', '--enable-unsafe-webgpu', '--ignore-gpu-blocklist', ...gpuFlags, '--window-size=900,1200'];
const browser = await puppeteer.launch({
  executablePath: execSync('which chromium').toString().trim(), headless: false, args,
  env: { ...process.env, __EGL_VENDOR_LIBRARY_FILENAMES: '/usr/share/glvnd/egl_vendor.d/10_nvidia.json' },
});
const cut = (s) => (s.length > 300 ? s.slice(0, 300) + '…' : s);
let failed = 0;
for (const view of views) {
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 1200 });
  page.on('console', (m) => { if (m.type() === 'error') console.log(`[${view}] console.error: ${cut(m.text())}`); });
  page.on('pageerror', (e) => console.log(`[${view}] pageerror: ${cut(String(e.message || e))}`));
  const u = new URL(url);
  u.searchParams.set('view', view); u.searchParams.set('hideui', '1');
  if (process.env.BACKEND) u.searchParams.set('backend', process.env.BACKEND);
  const t0 = Date.now();
  try {
    await page.goto(u.href, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction('window.__ready === true', { timeout: 60000, polling: 100 });
  } catch (e) { console.log(`[${view}] not ready: ${cut(e.message)}`); failed++; }
  await new Promise((r) => setTimeout(r, 500));
  const backend = await page.evaluate(() => window.__backend).catch(() => undefined);
  const file = `${outPrefix}_${view}.png`;
  const canvas = await page.$('#c');
  if (canvas) await canvas.screenshot({ path: file }); else await page.screenshot({ path: file });
  console.log(`[${view}] backend=${backend} ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${file}`);
  await page.close();
}
await browser.close();
process.exit(failed ? 2 : 0);
