import { WalletError } from '../domain/errors.js';
import {
  formatDeposit,
  formatError,
  formatLogin,
  formatLogout,
  formatStatus,
  formatTransfer,
} from './format.js';
import { parseLine, UsageError } from './parser.js';

/**
 * Runs one input line against the wallet and returns the lines to print.
 * Expected failures (bad usage, rejected operations) become a message; anything else is a bug
 * and is rethrown.
 * @param {import('../domain/wallet.js').Wallet} wallet
 * @param {string} line
 * @returns {string[]}
 */
export function executeLine(wallet, line) {
  try {
    const parsed = parseLine(line);
    if (parsed === null) {
      return [];
    }
    switch (parsed.command) {
      case 'login':
        return formatLogin(wallet.login(parsed.name));
      case 'deposit':
        return formatDeposit(wallet.deposit(parsed.amount));
      case 'withdraw':
        return formatStatus(wallet.withdraw(parsed.amount));
      case 'transfer':
        return formatTransfer(wallet.transfer(parsed.target, parsed.amount));
      case 'logout':
        return formatLogout(wallet.logout());
      default:
        throw new Error(`Unhandled command: ${parsed.command}`);
    }
  } catch (err) {
    if (err instanceof WalletError || err instanceof UsageError) {
      return [formatError(err)];
    }
    throw err;
  }
}
