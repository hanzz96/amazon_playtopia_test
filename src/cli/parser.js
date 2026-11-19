import { parseAmount } from '../domain/money.js';

/** Raised when a line is not a valid command invocation (unknown command, wrong arguments). */
export class UsageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UsageError';
  }
}

const COMMANDS = ['login', 'deposit', 'withdraw', 'transfer', 'logout'];

/**
 * Parses one input line.
 *  - `login` takes exactly one word as the name;
 *  - `transfer` takes exactly a target word and an amount.
 * Amounts are validated here: only positive whole numbers are accepted, decimals are rejected.
 * @param {string} line
 * @returns {null | { command: 'login', name: string }
 *   | { command: 'deposit' | 'withdraw', amount: number }
 *   | { command: 'transfer', target: string, amount: number }
 *   | { command: 'logout' }}
 */
export function parseLine(line) {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return null;
  }

  const command = tokens[0].toLowerCase();
  const args = tokens.slice(1);

  switch (command) {
    case 'login':
      if (args.length !== 1) throw new UsageError('Usage: login [name]');
      return { command, name: args[0] };

    case 'deposit':
    case 'withdraw':
      if (args.length !== 1) throw new UsageError(`Usage: ${command} [amount]`);
      return { command, amount: parseAmount(args[0]) };

    case 'transfer':
      if (args.length !== 2) throw new UsageError('Usage: transfer [target] [amount]');
      return { command, target: args[0], amount: parseAmount(args[1]) };

    case 'logout':
      if (args.length !== 0) throw new UsageError('Usage: logout');
      return { command };

    default:
      throw new UsageError(
        `Unknown command: ${tokens[0]}. Available commands: ${COMMANDS.join(', ')}`,
      );
  }
}
