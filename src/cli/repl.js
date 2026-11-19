import readline from 'node:readline';
import { Wallet } from '../domain/wallet.js';
import { executeLine } from './execute.js';

/**
 * Reads commands line by line until the input ends.
 * The "$ " prompt is shown only in interactive mode (a real terminal); with piped input nothing
 * but command output is written, so the output can be compared exactly.
 * @param {{ input: NodeJS.ReadableStream, output: NodeJS.WritableStream,
 *           interactive?: boolean, wallet?: Wallet }} options
 * @returns {Promise<void>} resolves when the input is closed
 */
export function runRepl({ input, output, interactive = false, wallet = new Wallet() }) {
  const rl = readline.createInterface({
    input,
    output: interactive ? output : undefined,
    terminal: interactive,
    prompt: '$ ',
  });

  return new Promise((resolve) => {
    rl.on('line', (line) => {
      const lines = executeLine(wallet, line);
      if (lines.length > 0) {
        output.write(`${lines.join('\n')}\n`);
      }
      if (interactive) {
        rl.prompt();
      }
    });

    rl.on('close', () => {
      if (interactive) {
        output.write('\n');
      }
      resolve();
    });

    if (interactive) {
      rl.prompt();
    }
  });
}
