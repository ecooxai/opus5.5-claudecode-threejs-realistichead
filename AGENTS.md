# AGENTS.md — Realistic Head (Claude Opus 5.5 · Claude Code · three.js WebGPU)

Procedural, asset-free 3D bust matching `ref/womanhead.png` (cat-ear pearl headband, brown updo with
face-framing locks, white sailor blouse with teal collar, pearl necklace). Built from scratch in code.

## Layout
- `src/` app: `main.js` (renderer/scene/UI), `head.js` (sculpted head, skin/iris canvas textures, brows, lashes, neck),
  `hair.js` (ribbon strand hair + scalp cap), `accessories.js` (headband, necklace, outfit), `util.js`, `meta.js` (iteration/score badge).
- `scripts/` `build.sh` (src+three → dist), `serve.mjs`, `shot.mjs` (headless puppeteer captures, `?view=`), `monitor.sh`,
  `showcase.sh`, `video.sh`, `probe-gpu.mjs`.
- `dist/` deployable site + showcase PNGs + videos. `shots/` dev captures. `agent/` continue/status notes.

## Workflow
`scripts/build.sh && PORT=8765 node scripts/serve.mjs dist & node scripts/shot.mjs "http://localhost:8765/index.html?backend=webgl" shots/iN`
- Headless WebGL2 runs on the NVIDIA GPU; headless WebGPU screenshots come out black (hardware) or use SwiftShader (CPU). Use `backend=webgl` for dev captures.
- In a browser, WebGPU is the default; if it isn't available the app asks the user to switch to WebGL (it never switches on its own).
- Head coordinates: chin y=-1, crown y=1, face toward +z. Torso pieces are lifted by `NECK_LIFT` in main.js.
