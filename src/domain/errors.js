/**
 * Domain error carrying a stable `code` so callers (CLI, tests) never have to match on text.
 */
export class WalletError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   * @param {Record<string, unknown>} [details] extra fields; must not reuse `name`, `code` or `message`
   */
  constructor(code, message, details = {}) {
    super(message);
    Object.assign(this, details);
    this.name = 'WalletError';
    this.code = code;
  }
}

export const notLoggedIn = () => new WalletError('NOT_LOGGED_IN', 'Please login first');

export const alreadyLoggedIn = (name) =>
  new WalletError('ALREADY_LOGGED_IN', `Already logged in as ${name}. Please logout first`, {
    customer: name,
  });

export const invalidName = () =>
  new WalletError(
    'INVALID_NAME',
    'Invalid name. Use a single word without spaces',
  );

export const invalidAmount = () =>
  new WalletError(
    'INVALID_AMOUNT',
    'Invalid amount. Use a positive whole number',
  );

export const insufficientBalance = (balance) =>
  new WalletError('INSUFFICIENT_BALANCE', 'Insufficient balance', { balance });

export const customerNotFound = (name) =>
  new WalletError('CUSTOMER_NOT_FOUND', `Customer ${name} not found`, { customer: name });

export const selfTransfer = () =>
  new WalletError('SELF_TRANSFER', 'You cannot transfer to yourself');
