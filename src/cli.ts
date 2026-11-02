#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

const help = `Usage: sling-tension-calc --load <kg> --angle <degrees> [options]

Compute static per-leg sling tension. Angle is measured from horizontal.

  --load <kg>       Total load, positive (required)
  --angle <deg>     Angle from horizontal, greater than 0 and at most 90 (required)
  --legs <n>        Sling legs, integer 1–4 (default: 2)
  --load-legs <k>   Legs carrying load, integer 1–n (default: n)
  --wll <kg>        Positive working load limit per leg
  --json           Print machine-readable JSON
  --help           Show this help

Assumes static load and equal sharing; no dynamic or shock factor.
For 3/4-leg slings, riggers often assume only 2 legs carry the load.
`;

export function main(args: string[]): void {
  const values = new Map<string, number>();
  const flags = new Set<string>();
  const numeric = new Set(['--load', '--angle', '--legs', '--load-legs', '--wll']);
  for (let i = 0; i < args.length; i++) {
    const option = args[i];
    if (values.has(option) || flags.has(option)) throw new Error(`Duplicate option: ${option}`);
    if (option === '--help' || option === '--json') {
      flags.add(option);
    } else if (numeric.has(option)) {
      const raw = args[++i];
      if (raw === undefined || raw.trim() === '' || raw.startsWith('--')) {
        throw new Error(`Missing value for ${option}`);
      }
      const value = Number(raw);
      if (!Number.isFinite(value)) throw new Error(`${option} must be a finite number`);
      values.set(option, value);
    } else {
      throw new Error(`Unknown option: ${option}`);
    }
  }
  if (flags.has('--help')) {
    process.stdout.write(help);
    return;
  }
  const load = values.get('--load');
  const angle = values.get('--angle');
  const legs = values.get('--legs') ?? 2;
  const loadLegs = values.get('--load-legs') ?? legs;
  const wll = values.get('--wll');
  if (load === undefined || load <= 0) throw new Error('--load is required and must be greater than 0');
  if (angle === undefined || angle <= 0 || angle > 90) throw new Error('--angle is required and must be greater than 0 and at most 90');
  if (!Number.isInteger(legs) || legs < 1 || legs > 4) throw new Error('--legs must be an integer from 1 to 4');
  if (!Number.isInteger(loadLegs) || loadLegs < 1 || loadLegs > legs) throw new Error('--load-legs must be an integer from 1 to --legs');
  if (wll !== undefined && wll <= 0) throw new Error('--wll must be greater than 0');

  const sine = Math.sin(angle * (Math.PI / 180));
  const angleFactor = 1 / sine;
  const tensionKgf = load / (loadLegs * sine);
  const tensionKn = tensionKgf * (9.80665 / 1000);
  const totalVerticalKg = tensionKgf * (loadLegs * sine);
  const utilizationPercent = wll === undefined ? undefined : tensionKgf / wll * 100;
  if (![angleFactor, tensionKgf, tensionKn, totalVerticalKg, utilizationPercent ?? 0].every(Number.isFinite)) {
    throw new Error('Inputs exceed the supported numerical range');
  }
  // Allow only rounding noise at the exact rated limit (e.g. sin(30°)).
  const status = utilizationPercent === undefined ? undefined : utilizationPercent <= 100 + 100 * Number.EPSILON * 4 ? 'OK' : 'OVERLOAD';
  const warnings: string[] = [];
  if (angle < 30) warnings.push('angle below 30° not recommended');
  if (status === 'OVERLOAD') warnings.push('OVERLOAD: per-leg tension exceeds working load limit');
  for (const warning of warnings) process.stderr.write(`Warning: ${warning}\n`);
  if (flags.has('--json')) {
    console.log(JSON.stringify({ loadKg: load, legs, loadLegs, angleDeg: angle, angleFactor, tensionKgf, tensionKn, totalVerticalKg, ...(wll === undefined ? {} : { wllKg: wll, utilizationPercent, status }), warnings }, null, 2));
  } else {
    const rows: [string, string][] = [
      ['Load', `${load} kg`], ['Sling legs', String(legs)], ['Load-bearing legs', String(loadLegs)],
      ['Angle from horizontal', `${angle}°`], ['Angle factor', angleFactor.toFixed(4)],
      ['Tension per leg', `${tensionKgf.toFixed(2)} kgf`], ['Tension per leg', `${tensionKn.toFixed(3)} kN`],
      ['Total vertical check', `${totalVerticalKg.toFixed(2)} kg`],
    ];
    if (wll !== undefined) rows.push(['WLL per leg', `${wll} kg`], ['Utilization', `${utilizationPercent!.toFixed(1)} %`], ['Status', status!]);
    console.log(rows.map(([label, value]) => `${label.padEnd(24)} | ${value}`).join('\n'));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
try {
  main(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}

}
