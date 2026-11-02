import { test } from 'node:test';
import assert from 'node:assert/strict';
import { main } from '../dist/cli.js';

const run = (...args) => {
  const result = { status: 0, stdout: '', stderr: '' };
  const stdout = process.stdout.write;
  const stderr = process.stderr.write;
  process.stdout.write = (chunk) => { result.stdout += chunk; return true; };
  process.stderr.write = (chunk) => { result.stderr += chunk; return true; };
  try { main(args.map(String)); }
  catch (error) { result.status = 1; result.stderr += `Error: ${error.message}\n`; }
  finally { process.stdout.write = stdout; process.stderr.write = stderr; }
  return result;
};
const calculate = (...args) => {
  const result = run('--load', 1000, '--angle', 60, ...args, '--json');
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
};
test('specified tension and angle factor checks', () => {
  const result = calculate();
  assert.equal(result.angleFactor.toFixed(4), '1.1547');
  assert.equal(result.tensionKgf.toFixed(2), '577.35');
  assert.equal(result.tensionKn.toFixed(3), '5.662');
  assert.ok(Math.abs(result.totalVerticalKg - 1000) < 1e-9);
  for (const [angle, expected] of [[30, '1000.00'], [90, '500.00']]) {
    const output = run('--load', 1000, '--angle', angle, '--json');
    assert.equal(output.status, 0);
    assert.equal(JSON.parse(output.stdout).tensionKgf.toFixed(2), expected);
  }
  assert.equal(calculate('--legs', 4, '--load-legs', 2).tensionKgf.toFixed(2), '577.35');
  assert.equal(calculate('--legs', 4).tensionKgf.toFixed(2), '288.68');
});
test('WLL utilization, warnings, and successful overload exit', () => {
  for (const [wll, percent, status] of [[500, '115.5', 'OVERLOAD'], [1000, '57.7', 'OK']]) {
    const output = run('--load', 1000, '--legs', 2, '--angle', 60, '--wll', wll, '--json');
    assert.equal(output.status, 0);
    const result = JSON.parse(output.stdout);
    assert.equal(result.utilizationPercent.toFixed(1), percent);
    assert.equal(result.status, status);
    assert.equal(output.stderr.includes('OVERLOAD'), status === 'OVERLOAD');
  }
  const boundary = run('--load', 1000, '--angle', 30, '--wll', 1000, '--json');
  assert.equal(JSON.parse(boundary.stdout).status, 'OK');
  assert.equal(boundary.stderr, '');
  const low = run('--load', 1000, '--angle', 20, '--json');
  assert.equal(low.status, 0);
  assert.match(low.stderr, /angle below 30° not recommended/);
  assert.equal(JSON.parse(low.stdout).warnings.length, 1);
});
test('invalid inputs fail with stderr and no stdout', () => {
  const invalid = [
    ['--angle', 0], ['--angle', 95], ['--legs', 5], ['--legs', 2, '--load-legs', 3],
    ['--legs', 1.5], ['--legs', 0], ['--load-legs', 0], ['--load-legs', 1.5],
    ['--load', 0], ['--load', -1], ['--wll', 0], ['--wll', -1],
    ['--load', 'NaN'], ['--angle', 'Infinity'], ['--legs', 'Infinity'], ['--wll', 'NaN'],
  ];
  for (const args of invalid) {
    // Replace defaults so validation, rather than duplicate detection, is exercised.
    const defaults = new Map([['--load', 1000], ['--angle', 60]]);
    for (let i = 0; i < args.length; i += 2) defaults.set(args[i], args[i + 1]);
    const output = run(...[...defaults].flat());
    assert.equal(output.status, 1, args.join(' '));
    assert.match(output.stderr, /Error:/);
    assert.equal(output.stdout, '');
  }
  for (const args of [[], ['--load', 10], ['--angle', 60], ['--unknown'], ['--load'], ['--load', ''], ['--json', '--json']]) {
    assert.equal(run(...args).status, 1);
  }
});
test('help and default table', () => {
  assert.match(run('--help').stdout, /Usage:/);
  assert.equal(run('--help').status, 0);
  const table = run('--load', 1000, '--angle', 60, '--wll', 500);
  assert.equal(table.status, 0);
  for (const value of ['1.1547', '577.35 kgf', '5.662 kN', '1000.00 kg', '115.5 %', 'OVERLOAD']) assert.ok(table.stdout.includes(value));
});
