import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { runRepl } from '../src/cli/repl.js';

async function run(input, options = {}) {
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  let output = '';
  stdout.on('data', (chunk) => {
    output += chunk;
  });
  const finished = runRepl({ input: stdin, output: stdout, ...options });
  stdin.end(input);
  await finished;
  return output;
}

test('piped input prints only command output, with no prompt', async () => {
  const output = await run('login Emma\ndeposit 100\nlogout\n');
  assert.equal(
    output,
    'Hello, Emma!\nYour balance is $0\nYour balance is $100\nGoodbye, Emma!\n',
  );
});

test('the last command is executed even without a trailing newline', async () => {
  assert.equal(await run('login Emma'), 'Hello, Emma!\nYour balance is $0\n');
});

test('empty input ends cleanly with no output', async () => {
  assert.equal(await run(''), '');
});

test('blank lines are skipped', async () => {
  assert.equal(await run('\n\nlogin Emma\n\n'), 'Hello, Emma!\nYour balance is $0\n');
});

test('interactive mode shows the "$ " prompt', async () => {
  const raw = await run('login Emma\n', { interactive: true });
  // readline's terminal mode wraps the prompt in cursor-control escape codes; ignore them.
  const output = raw.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '');
  assert.ok(output.startsWith('$ '), `output was ${JSON.stringify(output)}`);
  assert.ok(output.includes('Hello, Emma!'));
});
