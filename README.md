# sling-tension-calc

A TypeScript CLI for static per-leg tension in a multi-leg lifting sling. Requires Node.js 18+ and npm; no runtime dependencies.

```sh
npm install
npm run build
node dist/cli.js --load 1000 --legs 2 --angle 60
node dist/cli.js --load 1000 --legs 4 --load-legs 2 --angle 60 --wll 500 --json
npm test
```

The package bin is `sling-tension-calc` and points to `dist/cli.js`. Build before installing or linking the package as a command.

| Option | Meaning |
| --- | --- |
| `--load <kg>` | Required positive total load |
| `--angle <deg>` | Required angle from horizontal, 0 < angle ≤ 90 |
| `--legs <n>` | Integer 1–4, default 2 |
| `--load-legs <k>` | Integer 1–n carrying the load, default n |
| `--wll <kg>` | Optional positive rated working load limit per leg |
| `--json` | JSON output instead of a table |
| `--help` | Usage information |

At 1000 kg, 2 legs, and 60°, the angle factor is 1.1547 and each leg carries 577.35 kgf (5.662 kN). At 30° each leg carries 1000.00 kgf; at 90° each carries 500.00 kgf. Four legs at 60° carry 288.68 kgf each by default, or 577.35 kgf when `--load-legs 2` is selected.

With a 500 kg WLL at the two-leg 60° example, utilization is 115.5% and status is OVERLOAD. With a 1000 kg WLL it is 57.7% and OK. Overload and angles below 30° produce stderr warnings and exit 0. Invalid input produces a stderr error and exit 1.

## Calculation and assumptions

For angle θ from horizontal and k load-bearing legs:

- Angle factor = 1 / sin(θ).
- Tension per leg in kgf = load / (k × sin(θ)).
- Tension in kN = kgf × 9.80665 / 1000.
- Total vertical check in kg = k × tension × sin(θ), equal to the input load.
- Utilization = tension / WLL × 100%; OK at or below 100%, otherwise OVERLOAD.

JSON uses unrounded numbers: `loadKg`, `legs`, `loadLegs`, `angleDeg`, `angleFactor`, `tensionKgf`, `tensionKn`, `totalVerticalKg`, and `warnings`. With WLL it also includes `wllKg`, `utilizationPercent`, and `status`.

This model assumes a static load, equal sharing among the selected load-bearing legs, and no dynamic/shock factor. For 3/4-leg slings riggers often assume only two legs carry the load; select that explicitly with `--load-legs 2`. It does not model unequal geometry, center-of-gravity offsets, or hardware derating.

Licensed under MIT.
