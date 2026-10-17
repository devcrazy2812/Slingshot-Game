# Design: Look, Sound, Feel, Access

## 1. Visual identity
**Theme:** "Cold-start cosmos": deep indigo space, warm gold stars, one violet-white black hole. Calm but dangerous.

| Role | Hex | Use |
|---|---|---|
| Void | `#070914` | background |
| Fabric | `#2a3270` | spacetime grid lines (low alpha) |
| Star gold | `#ffd36b` | normal stars |
| Pulsar cyan | `#5ff2ff` | moving binary bodies |
| Heavy magenta | `#ff5fb2` | heavy masses |
| Ship white | `#f4f7ff` | ship and tether |
| Danger violet | `#9b6bff` | black hole ring |
| Warning amber | `#ffb347` | snap warning, low-time alerts |

Colour-blind safety: bodies also differ by shape cue. Stars are solid discs, pulsars have two rotating tick marks, heavy bodies have a double ring. Do not use red versus green as the only signal.

## 2. Signature visual: the spacetime fabric
A grid (about 48 by 27 points) that sags toward masses like a rubber sheet. Displacement for each grid point is the sum of `k * mu_i / (distance + c)` capped to a maximum. Moving pulsars make the grid ripple as they orbit, a friendly nod to gravitational waves. Draw one stroke per row and column. This is the "wow" that explains gravity without words.

## 3. Screens
1. **Warning screen** (flashing lights, adjustable effects). One button.
2. **Menu:** Run, Lab, Missions, Daily Galaxy, Settings, Help. Large buttons, keyboard focus visible.
3. **Run HUD:** top-left speed; top-centre two clocks (SHIP and GALAXY); top-right distance to exit; bottom-centre tether state and rope tension bar; left edge vertical bar showing black hole distance.
4. **Lab panel:** right side. Sliders (star mass, ship speed, release angle), toggles (Truth Mode, Chaos Twin, Time Dilation), live energy graph, "Reality Check" accordion, Fuel Saved card with the formula.
5. **Result card:** distance, best speed gain, Fuel Saved, proper time versus galaxy time, "Copy seed", "Save Mission Patch".

## 4. Onboarding in 15 seconds (no wall of text)
Three highlight beats, each dismissible and skippable:
1. "Hold to tether to the glowing star."
2. "Release when the dotted line points forward."
3. "Stay ahead of the black hole."
After the first successful slingshot, show one line: "Nice. You borrowed that speed from gravity."

## 5. Juice (all behind settings toggles)
| Effect | Trigger | Notes |
|---|---|---|
| Ship trail | always | fading polyline, colour shifts with speed |
| Tether spark | attach | tiny particle burst, 12 particles |
| Release whoosh | release with speed gain | trail brightens for 0.4 s |
| Photon graze | pass within 1.5x a body radius without hitting | 0.3 s slow-motion, small chime, "+Graze" text |
| Snap | rope breaks | soft amber flash, short shake |
| Death | hit body or black hole | ship stretches ("spaghettify") into a line, then fades |
| Win | reach exit gate | gate opens, warp lines, gentle chord |
Particles are pooled (800). Flashes obey the safety rules in security.md.

## 6. Sound (all synthesised)
| Sound | Method |
|---|---|
| Speed hum | sine oscillator, pitch rises with speed (about 110 to 440 Hz), very quiet |
| Black hole rumble | low sine (about 40 Hz) plus slow LFO, volume rises as the hole gets closer |
| Tether pluck | short triangle wave with fast decay |
| Release whoosh | band-pass filtered noise sweeping upward |
| Snap | click plus noise burst |
| Graze chime | two short sine notes a fifth apart |
| Win | soft major chord |
Master gain at most 0.3. Provide a mute key (M). Sonification can be turned off.

## 7. Accessibility checklist
- Keyboard-only play works end to end.
- All buttons have visible focus and text labels.
- Text contrast at least 4.5:1; HUD font at least 16 px, scalable in settings.
- `prefers-reduced-motion` respected.
- No flashing above 3 per second.
- Pause on lost focus.
- Blind-friendly stretch mode: audio beacon pitch and stereo pan point to the next body.

## 8. Voice and copy
Short, calm, slightly poetic, never preachy. Examples:
- Start: "No engines. Only gravity."
- Near miss: "That was close."
- Death: "Swallowed by the dark."
- Win: "You outran the end of the world."
- Truth Mode: "Same speed in, same speed out, until the star moves."
- Help: one paragraph on gravity assists, one on time dilation, one privacy line.

## 9. Mission Patch (PNG export)
Canvas, 1080 by 1080: dark circle badge, your trajectory as a glowing line, stats text (distance, Fuel Saved, seed, date), game name. Created with `canvas.toBlob`; no network.
