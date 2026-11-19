import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAmount, formatMoney, MAX_AMOUNT } from '../src/domain/money.js';
import { WalletError } from '../src/domain/errors.js';

function assertInvalid(input) {
  assert.throws(
    () => parseAmount(input),
    (err) => err instanceof WalletError && err.code === 'INVALID_AMOUNT',
    `expected ${JSON.stringify(input)} to be rejected`,
  );
}

test('parseAmount accepts whole numbers', () => {
  assert.equal(parseAmount('100'), 100);
  assert.equal(parseAmount('1'), 1);
});

test('parseAmount rejects any decimal amount', () => {
  for (const bad of ['12.34', '12.3', '0.01', '0.05', '1.0', '10.00', '10.', '.5', '1,5']) {
    assertInvalid(bad);
  }
});

test('parseAmount rejects zero', () => {
  assertInvalid('0');
  assertInvalid('00');
});

test('parseAmount rejects negative numbers', () => {
  assertInvalid('-5');
  assertInvalid('+5');
});

test('parseAmount rejects non-numeric and malformed input', () => {
  for (const bad of ['abc', '', '1e3', '1,000', '5 5', 'NaN', 'Infinity', '0x10']) {
    assertInvalid(bad);
  }
});

test('parseAmount rejects missing or non-string input', () => {
  assertInvalid(undefined);
  assertInvalid(null);
  assertInvalid(10);
});

test('parseAmount accepts the maximum and rejects anything above it', () => {
  assert.equal(parseAmount(String(MAX_AMOUNT)), MAX_AMOUNT);
  assertInvalid(String(MAX_AMOUNT + 1));
  assertInvalid('99999999999999999999');
});

test('formatMoney prints whole dollars', () => {
  assert.equal(formatMoney(0), '$0');
  assert.equal(formatMoney(100), '$100');
  assert.equal(formatMoney(210), '$210');
});
