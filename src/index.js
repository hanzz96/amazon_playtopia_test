import { runRepl } from './cli/repl.js';

// Everything lives in memory (see Wallet), so each run starts with no customers.
await runRepl({
  input: process.stdin,
  output: process.stdout,
  interactive: Boolean(process.stdin.isTTY && process.stdout.isTTY),
});
