// Probe WebGPU/WebGL availability in headless chromium. Usage: node scripts/probe-gpu.mjs [extra flags...]
import puppeteer from 'puppeteer-core';
import { execSync } from 'node:child_process';
process.env.__EGL_VENDOR_LIBRARY_FILENAMES = '/usr/share/glvnd/egl_vendor.d/10_nvidia.json';
const extra = process.argv.slice(2);
const args = extra.length ? ['--headless=new', '--no-sandbox', ...extra] :
  ['--headless=new', '--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--enable-features=Vulkan', '--use-angle=gl-egl', '--no-sandbox'];
const browser = await puppeteer.launch({ executablePath: execSync('which chromium').toString().trim(), headless: false, args, env: process.env });
const page = await browser.newPage();
await page.goto(process.env.PROBE_URL || 'http://localhost:8799/');
const r = await page.evaluate(async () => {
  const out = {};
  try {
    const a = navigator.gpu && await navigator.gpu.requestAdapter();
    out.webgpu = a ? (a.info ? `${a.info.vendor} ${a.info.architecture} ${a.info.description}` : 'adapter') : (navigator.gpu ? 'null adapter' : 'no navigator.gpu');
  } catch (e) { out.webgpu = 'error ' + e.message; }
  const gl = document.createElement('canvas').getContext('webgl2');
  const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
  out.webgl2 = gl ? (ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'no debug ext') : 'none';
  return out;
});
console.log(JSON.stringify({ args: args.slice(2).join(' '), ...r }));
await browser.close();
