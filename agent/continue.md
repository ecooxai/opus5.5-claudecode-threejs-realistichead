# Continue prompt (next agent)
Read task.md (the full rules: web-first three.js WebGPU, no external assets, 900x1200 default canvas, iteration+score badge,
4-view checks, showcase/video outputs in ./dist, AGENTS.md/agent docs upkeep). Branch: opus5.5-claudecode-realistichead.
Current score: 62/100; target: 98. Biggest gaps, in priority order:
1. Face realism: real skin shading (SSS-like wrap or TSL node material), pores normal map, a better jaw/cheek profile, ears, a teeth/mouth interior mesh.
2. Hair: grey horizontal ribbon artifacts at eye level on both sides (probably the scalp-cap edge or lock roots), chunky ribbons that should be thinner and denser with alpha/hashed edges, hairline baby hairs.
3. The hand at the chin from the photo is missing (procedural hand mesh).
4. Lighting: soft, high-key outdoor look, AO, maybe bloom/DOF post via three/tsl.
5. Verify on real WebGPU in a headed browser; headless WebGPU on the MX110 screenshots black.
