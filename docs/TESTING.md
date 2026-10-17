# Testing and QA

## 1. Automated tests (Vitest)
Located in `tests/`. Run with `npm test`. The full list of required physics tests is in `PHYSICS.md` section 14.

| File | Covers |
|---|---|
| `physics.orbit.test.js` | circular orbit stability, energy drift, flybys |
| `physics.rail.test.js` | binary orbit period (Kepler), body velocity matches derivative of position |
| `physics.tether.test.js` | rope length, velocity projection, snap threshold |
| `physics.predict.test.js` | prediction equals real simulation for identical inputs |
| `physics.guard.test.js` | NaN and Infinity recovery, speed clamp |
| `rng.test.js` | same seed gives same sequence; different seeds differ |
| `level.test.js` | validator accepts good levels, rejects bad and malicious ones |
| `storage.test.js` | corrupted or oversize data is discarded |
| `energy.test.js` | rocket equation values; frame transform correctness |

Test rule: when a bug is found, write a failing test first, then fix.

## 2. Manual QA checklist (do before every demo)
**Gameplay**
- [ ] First tether works within 5 seconds of starting
- [ ] Prediction line matches the real path when released
- [ ] Restart takes under 1 second
- [ ] A level cannot be won without a moving body (confirm by trying)
- [ ] Black hole eventually catches an idle ship

**Lab**
- [ ] Sliders change the path live
- [ ] Truth Mode shows equal speeds in the body frame and a net change in the galaxy frame
- [ ] Static star gives about zero net change; moving body gives non-zero
- [ ] Fuel Saved updates and shows the formula
- [ ] Chaos Twin visibly diverges

**Safety and access**
- [ ] Warning screen appears on first load
- [ ] Reduced motion setting removes shake and heavy particles
- [ ] Flash off really means no flashes
- [ ] Volume is comfortable; no sound before first click
- [ ] Keyboard-only play works
- [ ] Touch play works on a phone

**Robustness**
- [ ] Resize the window mid-run
- [ ] Switch tabs and return (loop pauses, no jump)
- [ ] Open with `#seed=zzzzzzzzzzzzzzzzzzzz` (too long) and `#seed=<script>`; both ignored
- [ ] Import a garbage JSON ghost; rejected with a friendly message
- [ ] Disable storage in the browser; game still runs

## 3. Performance check
Open the browser performance panel, play 60 seconds with the lab open.
- [ ] Frame time under 16 ms most of the time, never over 25 ms
- [ ] No growing memory (take two heap snapshots, 1 minute apart)
- [ ] Phone: playable at 30 fps or better

## 4. Browser matrix
Latest Chrome, Firefox, Safari (desktop), plus Chrome on Android and Safari on iPhone. Note any gaps in README.

## 5. Demo rehearsal
- [ ] Run the full pitch from PITCH.md twice with a timer
- [ ] Load from the built `dist/` offline
- [ ] Record a backup video of a perfect run and a Truth Mode demo
