# Build Plan: Milestones M0 to M12

Rule: one milestone at a time. After each: `npm test`, `npm run build`, play it, commit, report, wait for "continue".

Estimates assume a beginner using an AI agent; total about 24 hours. **MVP = M0 to M6 + minimal M9 + M12.**

| ID | Milestone | Est. | Tier |
|---|---|---|---|
| M0 | Scaffold, guardrails, CSP | 0.5 h | MVP |
| M1 | Physics core and tests | 2 h | MVP |
| M2 | Loop and rendering basics | 1.5 h | MVP |
| M3 | Tether, controls, snap | 1.5 h | MVP |
| M4 | Prediction line and fabric grid | 1.5 h | MVP |
| M5 | Level, black hole, win and lose, HUD | 2 h | MVP |
| M6 | Lab Mode, Truth Mode, Fuel Saved | 3 h | MVP |
| M7 | Time dilation and two clocks | 1.5 h | Wow |
| M8 | Sonification | 1.5 h | Wow |
| M9 | Juice, safety toggles, accessibility | 2 h | MVP (minimal) / Wow |
| M10 | Daily Galaxy, ghost, Mission Patch | 2 h | Wow |
| M11 | Mission Mode and Chaos Twin | 2 h | Stretch |
| M12 | Polish, security pass, deploy, pitch assets | 2 h | MVP |

## M0 Scaffold, guardrails, CSP
Create the Vite project with exact-pinned `vite` and `vitest`, folders from architecture.md, `config.js`, `.gitignore`, `LICENSE` (MIT), and the CSP meta tag. Scripts: `dev`, `build`, `preview`, `test`.
**Done when:** a blank canvas fills the window, `npm test` runs (one trivial test), `npm run build` works, no inline scripts.

## M1 Physics core and tests
Implement `vec`, `bodies`, `gravity`, `integrator` (leapfrog, no tether yet), `energy`, and tests 1 to 3 and 9 from PHYSICS.md.
**Done when:** all those tests pass; energy drift under 0.1%.

## M2 Loop and rendering basics
Fixed-timestep loop, camera, glow sprites, ship, static stars, pooled trail. Ship drifts and curves around stars.
**Done when:** 60 fps with 10 bodies; resizing the window keeps the scene correct.

## M3 Tether, controls, snap
Input intents (mouse, keyboard, touch). Tether attach, rope constraint, release, snap rule. Tests 5 and 6.
**Done when:** you can swing around a star and release; snap works; tests pass.

## M4 Prediction line and fabric grid
`predictPath` using the same `stepShip`; dotted fading line. Warped spacetime grid. Test 7.
**Done when:** predicted path matches the real path (test), grid warps at 60 fps.

## M5 Level, black hole, win and lose, HUD
Level JSON loader and validator (test 10). Rail binaries (Kepler). Black hole chaser. Win gate. HUD basics. Restart in under a second. Test 4.
**Done when:** a full run is winnable and losable; a level needs a moving body to win.

## M6 Lab Mode, Truth Mode, Fuel Saved
Lab scene with sliders, energy graph, Truth Mode frame flip, Fuel Saved card, Reality Check panel.
**Done when:** static star shows about zero gain; moving body shows gain; formula displayed.

## M7 Time dilation and two clocks
Implement `f` factor, ship dynamics at `f*dt`, two-clock HUD, prediction aware of `f`. Feature flag in config.
**Done when:** ship visibly slows near heavy bodies and the galaxy clock pulls ahead.

## M8 Sonification
Web Audio engine with gain cap and gesture unlock. Speed hum, black hole rumble, event sounds. Mute key.
**Done when:** no sound before a click; pitch tracks speed; volume comfortable.

## M9 Juice, safety toggles, accessibility
Particles, shake, photon graze slow-motion, spaghettify death, warning screen, settings (flash, shake, particles, volume), reduced-motion, focus styles.
**Done when:** every toggle works and the 3-flash rule holds. (Minimal version for MVP: warning screen, flash and shake toggles, reduced-motion.)

## M10 Daily Galaxy, ghost, Mission Patch
Seed from the UTC date; `#seed=` link with validation; best-run ghost with validated import and export; Mission Patch PNG.
**Done when:** same seed gives the same galaxy; bad inputs are rejected safely.

## M11 Mission Mode and Chaos Twin
Two short missions with fact cards (verify facts first). Chaos Twin with separation chart.
**Done when:** twin diverges visibly and the cards show sources to check.

## M12 Polish, security pass, deploy, pitch assets
Run the security checklist, QA checklist and performance check. Deploy to Netlify or GitHub Pages. Record backup video. Write final README screenshots and a one-page summary.
**Done when:** every box in security.md section 8 and TESTING.md is ticked.
