# Prompts for Antigravity CLI

Copy one block at a time. Each prompt is written so you do not need coding knowledge. After every milestone: play the game for a minute, then say **continue**.

## How to work (vibe-coding rules)
1. One milestone per prompt. Never ask for "the whole game".
2. Always run the game after each step. If something looks wrong, describe what you see in plain words.
3. Commit after every working milestone so you can always go back.
4. If the agent asks to install a package or run a risky command, say **no** and ask it to write the code itself.
5. If you do not understand something, use the "Explain it to me" prompt below.

---

## 0. Kickoff prompt (paste first)
```
Read AGENTS.md and every file it references in docs/. Then do three things and stop:
1. Summarise the project in 5 plain-English sentences so I know you understood it.
2. List the 5 biggest risks you see and how the docs handle them.
3. Tell me exactly what you will do for Milestone M0, and wait for me to say "go".
I am a beginner. Use simple words and short steps.
```

## M0 Scaffold
```
Go. Do Milestone M0 from docs/TASKS.md. Create the Vite vanilla-JS project in this folder using exact pinned versions of vite and vitest only. Create the folder structure from docs/architecture.md, src/config.js, .gitignore, an MIT LICENSE, and the CSP meta tag from docs/security.md. Before installing, tell me the exact package names and versions you will use and confirm they exist on npmjs.com and were published at least 14 days ago. Finish with the report format from AGENTS.md.
```

## M1 Physics core
```
Continue. Do Milestone M1 using docs/PHYSICS.md exactly. Implement vec, bodies, gravity, integrator (leapfrog, no tether yet) and energy in src/physics/ as pure functions. Write tests 1, 2, 3 and 9 from PHYSICS.md section 14. Explain in plain words what a leapfrog integrator is and why we use it. Show me the test results.
```

## M2 Loop and rendering
```
Continue. Do Milestone M2. Build the fixed-timestep loop from docs/architecture.md section 5, a camera, pre-rendered glow sprites (do not use shadowBlur every frame), a ship, a few static stars and a fading trail. The ship should drift and curve around stars. Tell me how to open it and what I should see.
```

## M3 Tether and controls
```
Continue. Do Milestone M3. Add input intents for mouse, keyboard and touch. Add tether attach, the rope constraint, release, and the snap rule from docs/PHYSICS.md section 5. Write tests 5 and 6. I should be able to hold the mouse near a star, swing, and let go to be flung.
```

## M4 Prediction line and fabric grid
```
Continue. Do Milestone M4. Build predictPath so it calls the SAME stepShip as the game (no copy of the physics). Draw a dotted fading line. Add the warped spacetime grid described in docs/DESIGN.md section 2. Write test 7. Confirm the grid stays at 60 fps.
```

## M5 Level and black hole
```
Continue. Do Milestone M5. Load levels from JSON with a strict validator (test 10). Add Keplerian binary pulsars on rails, the black hole chaser, a win gate, a lose state, restart in under a second, and a simple HUD. Design the first level so it can only be won by using a moving pulsar. Write test 4.
```

## M6 Lab Mode and Truth Mode
```
Continue. Do Milestone M6. Add Lab Mode: sliders for star mass, ship speed and release angle; a live energy graph; the Truth Mode frame flip from docs/PHYSICS.md section 6 (key F); the Fuel Saved card using the rocket equation from section 11, with the formula visible; and a Reality Check panel listing every game trick from docs/PRD.md section 10. Use textContent, never innerHTML.
```

## M7 Time dilation
```
Continue. Do Milestone M7 using docs/PHYSICS.md section 7. Put it behind a feature flag in config.js. The ship should run slower near heavy masses while the galaxy clock and the black hole run at normal speed. Show both clocks in the HUD. Make sure the prediction line uses the same dilation.
```

## M8 Sonification
```
Continue. Do Milestone M8 using docs/DESIGN.md section 6. Build the Web Audio engine: created only after the first click, master gain capped at 0.3, mute key M. Pitch follows speed, rumble follows black hole distance, plus tether, release, snap, graze and win sounds. No audio files.
```

## M9 Juice and safety
```
Continue. Do Milestone M9. Add pooled particles, screen shake, photon-graze slow motion, spaghettify death, the warning screen, and Settings for flash, shake, particles, volume and reduced motion (respect prefers-reduced-motion by default). Prove the 3-flashes-per-second rule holds and tell me how you checked.
```

## M10 Daily Galaxy, ghost, patch
```
Continue. Do Milestone M10. Seed the galaxy from the UTC date. Support #seed=... with the regex from docs/security.md section 4. Save the best run as a ghost, with export and import that follow the validation rules. Add the Mission Patch PNG export from docs/DESIGN.md section 9. Test with garbage inputs and show me the results.
```

## M11 Mission Mode and Chaos Twin
```
Continue. Do Milestone M11. Add the Chaos Twin (docs/PHYSICS.md section 12) with a log-scale separation chart. Add two short missions with fact cards. Mark each fact card with a "verify source" note in a comment and list the claims in docs/DECISIONS.md so I can check them against NASA or ISRO pages before presenting.
```

## M12 Final pass
```
Continue. Do Milestone M12. Run the /verify workflow, then go through the checklist in docs/security.md section 8 and docs/TESTING.md and tell me honestly which boxes you could not tick. Prepare the build for Netlify or GitHub Pages. Then write a short "How it works" section in README.md.
```

---

## Helper prompts

**Explain it to me**
```
Explain what you just built as if I have never coded. Use one everyday analogy. Then list the three files that matter most and what each one does, in one sentence each.
```

**It is broken**
```
Something is wrong. Here is what I did: [steps]. Here is what I expected: [expected]. Here is what happened: [actual, plus any red text from the browser console]. First explain the likely cause in plain words, then write a failing test if it is a physics bug, then fix it.
```

**Tune the feel**
```
The game feels [too floaty / too hard / too slow / too twitchy]. Only change numbers in src/config.js. Make three small adjustments, tell me what each one changes, and let me choose.
```

**Security review**
```
Act as a security reviewer. Search src/ for eval, new Function, innerHTML, document.write, fetch, XMLHttpRequest, WebSocket, and any use of external URLs. Review input handling for #seed, ghost import and localStorage against docs/security.md. Report problems in plain English with the exact file and line, and propose fixes. Do not change code until I approve.
```

**Performance review**
```
Find anything allocating objects inside the per-frame loop, any draw calls that could be batched, and any effect using shadowBlur per frame. Report first, then fix the biggest three.
```

**Demo prep**
```
Create a /docs/DEMO_SCRIPT.md that walks through a 3-minute demo using the exact buttons and keys in the current build, including a backup plan if audio or the projector fails.
```

**Anti-patterns to reject**
- "Let me add a quick library for this." (Answer: no, write it ourselves.)
- "I rewrote the whole project to be cleaner." (Answer: revert; one milestone only.)
- "I disabled the CSP to make it work." (Answer: fix the code, not the policy.)
- "Tests are failing but the game works." (Answer: fix the tests or the physics first.)
