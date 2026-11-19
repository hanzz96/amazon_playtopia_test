import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadTranscript } from './helpers/transcript.js';

const root = fileURLToPath(new URL('..', import.meta.url));

function run(command, args, input) {
  return spawnSync(command, args, { cwd: root, input, encoding: 'utf8', timeout: 60_000 });
}

test('start.sh replays the example session exactly, with nothing but CLI output on stdout', () => {
  const steps = loadTranscript('example-session.txt');
  const input = steps.map((step) => `${step.command}\n`).join('');
  const expected = steps.flatMap((step) => step.expected).map((line) => `${line}\n`).join('');

  const result = run('./start.sh', [], input);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, expected);
});

test('every start.sh run begins with no customers', () => {
  const first = run('./start.sh', [], 'login Emma\ndeposit 100\nlogout\n');
  assert.equal(first.status, 0, first.stderr);
  assert.equal(
    first.stdout,
    'Hello, Emma!\nYour balance is $0\nYour balance is $100\nGoodbye, Emma!\n',
  );

  const second = run('./start.sh', [], 'login Emma\ntransfer Kevin 5\n');
  assert.equal(second.status, 0, second.stderr);
  assert.equal(
    second.stdout,
    'Hello, Emma!\nYour balance is $0\nCustomer Kevin not found\n',
  );
});

test('start.sh exits cleanly when stdin is closed immediately', () => {
  const result = run('./start.sh', [], '');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
});
