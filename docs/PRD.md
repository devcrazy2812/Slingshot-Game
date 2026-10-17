# Product Requirements Document: Slingshot: Event Horizon

## 1. One-liner
A game that teaches orbital mechanics through play. You pilot a ship with no engines and use gravity as a free engine to outrun a collapsing galaxy, then switch to Lab Mode to see the real physics behind every move.

## 2. Problem
- Deep-space travel is limited by fuel. Every kilogram of propellant must be carried, and carrying it costs more propellant (the rocket equation).
- Gravity assists let a spacecraft borrow energy from a moving planet for free. Most people have never seen *why* it works, and many believe a static star can speed you up (it cannot).
- Gravitational time dilation is real (GPS satellites must correct for it) but feels like science fiction to most students.
- Result: students memorise formulas without intuition.

## 3. Solution
Three layers in one product:
1. **Run Mode (game):** tap bodies to tether, swing, release, survive.
2. **Lab Mode (simulation):** sliders, frame flip, energy graphs, chaos twin.
3. **Mission Mode (story):** short real-history missions (Voyager, Cassini) with fact cards.

## 4. Hackathon framing
| Judge question | Our answer |
|---|---|
| Which track? | Both. Games (Run Mode) and Science Micro-Simulation (Lab Mode). |
| What is the problem? | Fuel limits space travel; gravity assists are misunderstood. |
| Prevention | Do not waste energy: use gravity instead of burning fuel. |
| Precaution | The prediction line lets you plan before committing, as real mission designers do. |
| Cure | Escape the collapsing galaxy; fix wrong intuitions in the Truth Mode reveal. |
| Impact | A live "Fuel Saved" meter shows kilograms of propellant not burned. Usable in classrooms. |

## 5. Target users
- Primary: students aged 14 to 22 and hackathon judges (5-second understanding, 5-minute depth).
- Secondary: teachers who want a free, offline, install-free demo.

## 6. Goals and non-goals
**Goals**
- Playable within 5 seconds of opening the page, no sign-up, no install.
- A first-time player understands "tap star, swing, release" within 30 seconds.
- Runs at 60 fps on a mid-range laptop and acceptably on a phone.
- Every science claim is either real or clearly labelled as a game trick.
- Works offline after first load, collects no personal data.

**Non-goals**
- No multiplayer, accounts, backend, ads, or in-app purchases.
- No 3D engine. Canvas 2D only (WebGL lensing is optional stretch).
- No claim of photorealistic accuracy.

## 7. Core loop (Run Mode)
1. Ship drifts through a star field. A black hole approaches from behind and accelerates.
2. Aim at a body in range. The prediction line shows where you will go if you release now.
3. Tap or hold to tether. You swing on a rope around the body.
4. Release at the right moment to be flung forward faster.
5. Chain bodies to reach the exit gate before the black hole catches you. Score: distance, speed gained, and "Fuel Saved".

## 8. Features (MoSCoW with IDs and acceptance criteria)

### Must have (MVP)
| ID | Feature | Acceptance criteria |
|---|---|---|
| F1 | Gravity engine | Leapfrog integrator; energy drift under 0.1% over 10,000 steps in a static field; unit tested. |
| F2 | Tether and release | Rope constrains distance, preserves tangential velocity; snaps above tension limit. |
| F3 | Prediction line | Uses the same `stepShip` as the game; matches actual path within 2 px over 3 seconds when no input occurs. |
| F4 | Level with moving bodies | Binary pulsars on Keplerian rails; at least one level winnable only by using a moving body. |
| F5 | Black hole chaser | Accelerating hazard; lose on contact; win at exit gate; restart in under 1 second. |
| F6 | HUD | Speed, distance to exit, distance of black hole, tether status. |
| F7 | Spacetime fabric grid | Rubber-sheet grid warps around masses at 60 fps. |
| F8 | Lab Mode basics | Sliders: star mass, ship speed, release angle. Live path and energy graph. |
| F9 | Truth Mode (frame flip) | One button re-draws the same flyby in the planet's frame, showing speed in equals speed out, then back in the galaxy frame showing the net gain. |
| F10 | Safety and accessibility | Reduced-motion, flash and shake toggles, keyboard and touch input, 3-flash rule. |

### Should have (wow)
| ID | Feature | Acceptance criteria |
|---|---|---|
| F11 | Time dilation | Two clocks (ship time and galaxy time). Ship slows near heavy masses; prediction line accounts for it. |
| F12 | Fuel Saved meter | Converts speed gained to kilograms of propellant with the rocket equation; shows the formula. |
| F13 | Sonification | Pitch follows speed, rumble follows black hole distance; all synthesised in code. |
| F14 | Juice | Particles, trails, screen shake, slow-motion on near-miss "photon graze". |
| F15 | Daily Galaxy | Seed from the UTC date; shareable link `#seed=...` validated by regex. |

### Could have (stretch, mind-bending)
| ID | Feature | Acceptance criteria |
|---|---|---|
| F16 | Chaos Twin | A second ship offset by one millionth of a unit diverges visibly; log-scale separation chart; shows the butterfly effect. |
| F17 | Echo Ghost | Replay your best run as a translucent ghost; export or import as validated JSON. |
| F18 | Mission Patch | Export a PNG patch of your trajectory with stats and seed. |
| F19 | Mission Mode | "Voyager Grand Tour" and "Cassini Inner-System Run" with fact cards (verify facts before shipping). |
| F20 | Gravitational lensing | Optional WebGL shader over the black hole, with 2D fallback. |
| F21 | Blind-friendly mode | Audio-only cues for distance and direction of the next body. |

## 9. Mind-bending twists (what makes judges remember us)
1. **Static stars cannot speed you up.** Only moving bodies can. We prove it live with Truth Mode instead of just saying it.
2. **Two clocks.** You age less than the galaxy near heavy masses. The black hole runs on galaxy time, so lingering costs you.
3. **The rope can snap.** Fast, tight swings exceed a tension limit, so risk and reward are real.
4. **Listen to gravity.** The soundtrack is the physics: speed becomes pitch, danger becomes bass.
5. **Chaos Twin.** Two ships a millionth apart end up in different galaxies. It is a three-body-style lesson in 10 seconds.
6. **Fuel Saved.** Every swing converts to kilograms of propellant not burned, tying the game to the real-world problem.
7. **Daily Galaxy.** One shared seed per day creates a reason to come back and compare runs.
8. **Mission Patch.** Players get a shareable souvenir, which doubles as free marketing.

## 10. Science honesty (real versus game trick)
| Element | Status |
|---|---|
| Inverse-square gravity | Real (softened to avoid infinities) |
| Binary orbit period from Kepler's third law | Real |
| Gravity assist needs a moving body | Real |
| Tether rope | Game trick (no real spacecraft does this) |
| Bodies on fixed rails, unaffected by the ship | Simplification (ship is a test particle) |
| Time dilation strength | Exaggerated for gameplay (real effect is tiny near ordinary stars) |
| Rocket equation and Fuel Saved | Real formula; mass, specific impulse and speed scale are illustrative and shown on screen |

## 11. Success metrics
- 60 fps on a mid-range laptop; no frame over 25 ms during a normal run.
- 100% of physics unit tests pass.
- A stranger plays a full run in under 2 minutes without help (test with at least 3 people).
- Zero console errors on a fresh load.
- Lighthouse accessibility score of 90 or higher.

## 12. Risks and mitigations
| Risk | Mitigation |
|---|---|
| Scope creep | MoSCoW tiers; MVP cut line in TASKS.md; feature flags in config. |
| Physics feels bad | Tune constants only in config; use a "feel" milestone with playtests. |
| AI agent writes unsafe or bloated code | AGENTS.md rules, security.md, review after every milestone. |
| Demo fails on stage | Deploy a static build, keep a recorded backup video, work offline. |
| Inaccurate science claims | Verify every statistic against NASA or ISRO sources before presenting. |
| Photosensitivity | Flash limiter, toggles, warning screen, reduced-motion default respect. |

## 13. Timeline assumption
About 24 working hours of effort. Adjust by dropping from the bottom of the Could-have list first.

## 14. Open questions (decide early, record in DECISIONS.md)
- Deadline and demo format (live, video, both)?
- Team size, and who presents?
- Mobile-first or laptop-first for the demo?
