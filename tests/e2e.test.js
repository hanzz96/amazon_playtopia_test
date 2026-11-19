import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadTranscript } from './helpers/transcript.js';

const root = fileURLToPath(new URL('..', import.meta.url));

// On macOS and Linux start.sh is executed directly, which also proves its executable bit and
// shebang. Windows cannot execute a shell script directly, so it goes through bash (Git Bash or WSL).
const [launcher, launcherArgs] =
  process.platform === 'win32' ? ['bash', ['start.sh']] : ['./start.sh', []];

function missingShell() {
  if (process.platform !== 'win32') return false;
  const probe = spawnSync('bash', ['-c', 'command -v node'], { encoding: 'utf8' });
  return probe.status === 0
    ? false
    : 'on Windows start.sh needs bash (Git Bash or WSL) with node on its PATH';
}

const skip = missingShell();

function run(input) {
  return spawnSync(launcher, launcherArgs, {
    cwd: root,
    input,
    encoding: 'utf8',
    timeout: 60_000,
  });
}

test('start.sh replays the example session exactly, with nothing but CLI output on stdout', { skip }, () => {
  const steps = loadTranscript('example-session.txt');
  const input = steps.map((step) => `${step.command}\n`).join('');
  const expected = steps.flatMap((step) => step.expected).map((line) => `${line}\n`).join('');

  const result = run(input);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, expected);
});

test('every start.sh run begins with no customers', { skip }, () => {
  const first = run('login Emma\ndeposit 100\nlogout\n');
  assert.equal(first.status, 0, first.stderr);
  assert.equal(
    first.stdout,
    'Hello, Emma!\nYour balance is $0\nYour balance is $100\nGoodbye, Emma!\n',
  );

  const second = run('login Emma\ntransfer Kevin 5\n');
  assert.equal(second.status, 0, second.stderr);
  assert.equal(
    second.stdout,
    'Hello, Emma!\nYour balance is $0\nCustomer Kevin not found\n',
  );
});

test('start.sh exits cleanly when stdin is closed immediately', { skip }, () => {
  const result = run('');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
});
