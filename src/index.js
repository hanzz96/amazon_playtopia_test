import { runRepl } from './cli/repl.js';

await runRepl({
  input: process.stdin,
  output: process.stdout,
  interactive: Boolean(process.stdin.isTTY && process.stdout.isTTY),
});
