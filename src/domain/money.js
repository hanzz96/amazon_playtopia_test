import { invalidAmount } from './errors.js';

// Amounts are whole dollars only: no decimal point, no sign, no exponent, no separators.
const AMOUNT_PATTERN = /^\d+$/;

/** Largest amount accepted in one operation: $10,000,000,000. */
export const MAX_AMOUNT = 10_000_000_000;

/**
 * Parses user input such as "100" into a whole number. Anything else, including decimals such as
 * "12.5" or "0.01", is rejected.
 * @param {unknown} text
 * @returns {number}
 */
export function parseAmount(text) {
  if (typeof text !== 'string' || !AMOUNT_PATTERN.test(text)) {
    throw invalidAmount();
  }
  const amount = Number(text);
  assertAmount(amount);
  return amount;
}

/**
 * Guards domain methods: amounts must already be positive, safe whole numbers.
 * @param {unknown} value
 */
export function assertAmount(value) {
  if (!Number.isSafeInteger(value) || value <= 0 || value > MAX_AMOUNT) {
    throw invalidAmount();
  }
}

/**
 * Formats a whole amount as "$100".
 * @param {number} amount
 * @returns {string}
 */
export function formatMoney(amount) {
  return `$${amount}`;
}
