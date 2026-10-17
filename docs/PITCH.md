# Pitch and Demo Plan

**Fact-check rule:** every number or historical claim you say aloud must be verified on NASA, ESA or ISRO pages first. Do not quote statistics you have not checked. Items marked (verify) are well-known but must be confirmed.

## One-liner
"Slingshot is a game that teaches orbital mechanics through play. Fly with no engines, outrun a black hole, then open the Lab and see the physics behind every move."

## 90-second script
1. **Hook (10 s):** "Rockets spend most of their mass on fuel. Space agencies get around this with a trick: borrowing speed from planets. Voyager 2 did it at Jupiter, Saturn, Uranus and Neptune (verify)."
2. **Problem (10 s):** "Most people think a star speeds you up. It does not. Only a moving body can."
3. **Live demo, Run Mode (30 s):** Hand the judge the controls. "Hold to tether, release to fling." Let them survive 20 seconds.
4. **Wow, Truth Mode (20 s):** Open Lab. Fly past a static star: speed in equals speed out. Fly past a moving pulsar: speed gained. Press F to flip frames. "Same physics, different viewpoint."
5. **Impact (10 s):** Point to the Fuel Saved card. "That swing saved this many kilograms of propellant. This is the real reason missions use gravity assists."
6. **Close (10 s):** "Free, offline, no data collected. A classroom tool that feels like a game."

## Demo flow (3 minutes)
- 0:00 Warning screen, show safety toggles (this signals responsibility)
- 0:15 Menu, start Run
- 0:30 Judge plays; you narrate the prediction line
- 1:15 Show the clocks: "Near heavy mass, my ship ages slower than the galaxy. GPS satellites need a similar correction (verify)."
- 1:45 Lab: Truth Mode, Fuel Saved
- 2:30 Chaos Twin: "A one-millionth difference, two different futures."
- 2:50 Mission Patch export, Daily Galaxy seed

## Prevent, Precaution, Cure, Impact slide
| Stage | In the game | In the real world |
|---|---|---|
| Prevention | Do not waste energy; use gravity | Gravity assists cut propellant needs |
| Precaution | Prediction line before you commit | Mission designers simulate trajectories first |
| Cure | Escape the black hole; Truth Mode fixes a misconception | Corrects a common learning gap |
| Impact | Fuel Saved meter, classroom use | Intuition for space-mission design |

## Likely judge questions
| Question | Strong answer |
|---|---|
| Is this physically accurate? | "The gravity, binary periods and rocket equation are real. The tether, rail bodies and time-dilation strength are game tricks, and the Reality Check panel lists each one." |
| Why not 3D? | "Canvas 2D runs on any laptop or phone, loads instantly and is easier to make correct. The lesson does not need a third axis." |
| How did you use AI? | "AI-assisted build with a spec pack: PRD, architecture, physics and security docs, plus milestone prompts. Physics is pure and unit-tested so we can trust it." |
| What about security? | "No backend, no accounts, no external requests, strict CSP, validated inputs, two dev dependencies. We also have a checklist for working safely with the AI agent." |
| Is it safe for people sensitive to flashing? | "There is a warning screen, flash and shake toggles, reduced-motion support, and we cap flashes below three per second." |
| What next? | "Real mission data from public sources, a teacher mode with worksheets, a level editor, and translations." |
| How does it make money or scale? | "It is free and offline-first, intended for classrooms. Scaling means more missions and languages, not servers." |

## Slide outline (5 slides)
1. Title, one-liner, a striking screenshot
2. Problem and misconception
3. Solution: Run, Lab, Missions (three screenshots)
4. Prevent, Precaution, Cure, Impact table
5. Tech, safety and roadmap (stack, tests, CSP, accessibility)

## Backup plan
- Recorded video of a perfect run and the Truth Mode demo
- Local `dist/` folder and a USB copy
- Phone with the live link
- Printed Mission Patch as a leave-behind
