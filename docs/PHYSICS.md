# Physics Specification

All numbers are in **game units**. Starting values are guesses; tune by feel in `src/config.js`.

## 1. Bodies
Each body has a gravitational parameter `mu` (this is G times mass, so we never need G) and a collision `radius`.

- **Static body:** fixed position.
- **Rail body:** position is a known function of galaxy time `t`. It is not pulled by the ship (the ship is a test particle).

## 2. Gravity (softened inverse-square)
For a ship at position `p` and each body at `b(t)`:

```
d   = b(t) - p
a_i = mu_i * d / ( |d|^2 + eps^2 )^(3/2)
a   = sum of a_i over all bodies (including the black hole, with its own mu)
```
`eps` (softening, start 8) prevents infinite force at tiny distances. Real Newtonian gravity is the same formula with `eps = 0`.

## 3. Integrator: leapfrog (kick-drift-kick)
Symplectic, so orbits do not slowly gain or lose energy the way simple Euler does.
```
v_half = v + a(x, t) * dt/2
x_new  = x + v_half * dt
v_new  = v_half + a(x_new, t + dt) * dt/2
```
Fixed `dt = 1/120` s of ship step (see time dilation below). Rail body positions at `t + dt` are analytic, so the second kick is exact.

## 4. Rail bodies (Keplerian binaries)
Two bodies orbit their common centre `c`, separated by distance `a`:
```
mu_total = mu1 + mu2
omega    = sqrt( mu_total / a^3 )          // Kepler's third law (real physics)
R1 = a * mu2 / mu_total                    // body 1 distance from centre
R2 = a * mu1 / mu_total                    // body 2 distance from centre
pos_i(t) = c + R_i * ( cos(omega*t + phi_i), sin(omega*t + phi_i) )
vel_i(t) = R_i * omega * ( -sin(omega*t + phi_i), cos(omega*t + phi_i) )
```
Use `phi_2 = phi_1 + pi` so they sit on opposite sides. Optional `dir = -1` reverses the spin.

The same formulas serve single bodies orbiting a hidden centre (set one `mu` to near zero or use a lone rail with its own `omega`).

## 5. Tether (game trick, labelled in the Reality Check)
Attach condition: ship within `tetherRange` of a body and the player presses. Rope length `L = |x - b|` at that instant (clamped to `[Lmin, Lmax]`).

After every integrator step while tethered to body `b`:
```
n      = (x - b(t)) / |x - b(t)|
x      = b(t) + n * L                       // keep rope length
v_rel  = v - vel_b(t)
v_rel  = v_rel - dot(v_rel, n) * n          // remove the stretching component
v      = vel_b(t) + v_rel
```
**Snap rule:** rope tension per unit mass is about `|v_rel|^2 / L`. If it exceeds `tetherMaxTension`, the rope snaps and the ship flies off along its current velocity. Show a flash (respecting safety toggles) and a snap sound.

**Release:** clear `tetherTo`. The ship keeps `v` and obeys gravity only.

## 6. Why static stars cannot speed you up (the Truth Mode proof)
Energy per unit mass in a static field: `E = 0.5*|v|^2 + Phi(x)` is conserved. A ship entering far away and leaving far away must leave with the **same speed**; the star only bends the path.

For a **moving** body with velocity `V`, switch to the body's frame: `v_rel = v - V`. In that frame the body is static, so `|v_rel|` before equals `|v_rel|` after, but the direction has rotated. Switching back to the galaxy frame (`v = v_rel + V`), the new speed can be larger or smaller. That difference is the gravity-assist gain.

**Truth Mode** (Lab, key `F`) redraws the same flyby in the body's frame (speed in equals speed out) and then in the galaxy frame (net change). Show both speeds as numbers.

## 7. Time dilation (exaggerated for gameplay)
Real: clocks run slower deeper in a gravity well, roughly `sqrt(1 - 2GM/(r c^2))`.
Game version, a factor `f` between `fMin` and 1:
```
phi = sum over bodies of ( mu_i / ( |d_i| + eps ) )
f   = clamp( sqrt( max(0, 1 - kappa * phi) ), fMin, 1 )
```
- Rail bodies, the black hole and the galaxy clock `t` advance by `dt`.
- The ship advances by `f * dt` (its own dynamics run slower near heavy masses) and `tau += f * dt`.
- Start `kappa` so `f` is about 0.6 at 120 units from a heavy star; `fMin = 0.35`.
- HUD shows both clocks and the difference ("The galaxy aged X s more than you").
- Reality Check: effect is exaggerated; real example: GPS clocks need a net correction of roughly 38 microseconds per day (gravity speeds them up, motion slows them down). Verify before quoting.

## 8. Black hole chaser
```
v_bh(t) = v0 + accel * t
x_bh(t) = x0 + v0*t + 0.5*accel*t^2
r_bh(t) = r0 + growth * t
```
Lose if `|ship - bh| < r_bh`. The black hole also pulls the ship with its own `mu`, which can be used as a slingshot at extreme risk.

## 9. Collisions
A ship that comes within a body's `radius` is destroyed. Bodies in the Chaos Twin use the same rule. Detect using the segment between old and new position to avoid tunnelling at high speed.

## 10. Prediction
```
predictPath(ship, t, world, cfg, steps):
  copy = clone(ship)
  points = []
  for i in 0..steps:
    copy = stepShip(copy, t_local, DT, world, cfg)   // same function as the game
    advance t_local by DT (galaxy time) as in the game
    store point every 4th step
    stop on collision
  return points
```
Predicts "if I release now" when tethered, or "if I keep drifting" when free. No tether re-attach is simulated.

## 11. Fuel Saved (real formula, illustrative inputs)
Tsiolkovsky rocket equation, solved for propellant mass:
```
deltaV_mps  = speedGain_units_per_s * velocityScale     // velocityScale e.g. 1000 m/s per unit
m_prop      = m_dry * ( exp( deltaV_mps / (Isp * g0) ) - 1 )
```
Defaults: `m_dry = 1000 kg`, `Isp = 450 s`, `g0 = 9.80665 m/s^2`. Display the formula and assumptions on screen.

## 12. Chaos Twin
Spawn a second ship at `x + 1e-6` with identical velocity and inputs. Track separation `d(t)`. Plot `log10(d)` over time. Estimate `lambda = (1/t) * ln( d(t) / d0 )`. Show the text "A one-millionth difference became X units."
Note: use `Float64` numbers (default in JS) and avoid any randomness.

## 13. Starting constants (config.js)
| Name | Start value | Notes |
|---|---|---|
| `DT` | 1/120 | fixed step |
| `eps` | 8 | softening |
| `mu` small / medium / heavy | 1.5e6 / 4e6 / 9e6 | circular speed at 150 units is about `sqrt(mu/150)`: 100 / 163 / 245 |
| `tetherRange` | 220 | attach distance |
| `Lmin`, `Lmax` | 60, 260 | rope length limits |
| `tetherMaxTension` | 900 | units per second squared; tune |
| `maxSpeed` | 1200 | clamp |
| `maxBodies` | 24 | clamp |
| `predictSteps` | 900 | 7.5 s of prediction |
| `kappa`, `fMin` | tune for f of 0.6 near heavy body, 0.35 | time dilation |
| BH `v0`, `accel`, `growth` | 40, 3, 1.5 | tune for a 60 to 90 s run |

## 14. Required unit tests (see TESTING.md)
1. Static star, circular orbit: radius stays within 1% over 10,000 steps.
2. Static field energy drift under 0.1% over 10,000 steps (no tether).
3. Static star flyby, far in to far out: speed change under 0.5%.
4. Moving binary flyby: galaxy-frame speed change is non-zero; body-frame speed change under 0.5%.
5. Tether keeps rope length within 1e-6 of `L`.
6. Snap triggers above `tetherMaxTension` and not below.
7. Prediction with no input matches a real simulation of the same length exactly.
8. NaN guard restores the previous safe state.
9. Seeded RNG gives identical sequences for identical seeds.
10. Level validator rejects `__proto__` keys, unknown keys and out-of-range values.
