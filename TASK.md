# sling-tension-calc

Build a small TypeScript Node CLI (Node 18+, no runtime deps; devDeps typescript + @types/node only; tests with node:test) that computes per-leg tension of a multi-leg lifting sling.

Inputs: --load <kg> (required, >0), --legs n (integer 1-4, default 2), --angle <deg from horizontal> (required, 0 < angle <= 90), --wll <kg> (optional, rated working load limit per leg), --load-legs k (optional integer 1..n: number of legs assumed to carry the load, default = legs; for 3/4-leg slings riggers often assume 2), --json, --help.
Formulas (g = 9.80665):
- Angle factor = 1 / sin(angle).
- Tension per leg (kgf) = load / (k · sin(angle)); also print in kN = kgf · g / 1000.
- Total vertical check = k · tension · sin(angle) = load.
- With --wll: utilization % = tension / wll · 100; status OK if ≤ 100 else OVERLOAD (print warning to stderr, exit 0).
- angle < 30 → warning to stderr "angle below 30° not recommended", still exit 0.
- Validate finite numbers / integers; errors to stderr with exit 1 (angle ≤0 or >90, legs outside 1-4, load-legs > legs, load ≤0).
- Table output by default, README with examples and stated simplifications (static load, equal sharing, no dynamic/shock factor), MIT LICENSE (author shanguoao2026-web), .gitignore with node_modules/ dist/ *.log .npm-cache/.
- package.json "bin" must point to the built CLI. npm test must build and pass. No secrets, no personal info.

Check values (must be in tests):
- load 1000, legs 2, angle 60 → factor 1.1547, tension 577.35 kgf, 5.662 kN.
- angle 30 → 1000.00 kgf; angle 90 → 500.00 kgf.
- legs 4, load-legs 2, angle 60 → 577.35 kgf; legs 4 default k → 288.68 kgf.
- load 1000 legs 2 angle 60 wll 500 → 115.5 % OVERLOAD (exit 0); wll 1000 → 57.7 % OK.
- angle 0, angle 95, legs 5, load-legs 3 with legs 2 → exit 1.
