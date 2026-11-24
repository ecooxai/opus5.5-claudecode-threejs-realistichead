# Status (2026-11-24)
Goal: AAA-quality realistic 3D head matching ref/womanhead.png — target 98/100.
Current: iteration 6, self-score 65/100. Branch `opus5.5-claudecode-realistichead`.
| iter | min | score | change |
|---|---|---|---|
| 1 | 3 | 35 | first build: sculpted head, strand hair, accessories |
| 2 | 6 | 48 | darker hair, shorter neck, bigger eyes |
| 3 | 9 | 55 | face-framing locks fixed, temples, nose, lighting |
| 4 | 12 | 58 | back hair flows into bun |
| 5 | 16 | 62 | temple coverage, slimmer jaw, chin |
| 6 | 19 | 65 | face-framing locks re-routed (removed grey bars at eye level) |
Test times: each headless capture of 4–5 views took 32–53s (peak CPU 94%); build <1s; video render about 95s.
Live: https://ecooxai.github.io/opus5.5-claudecode-threejs-realistichead/
