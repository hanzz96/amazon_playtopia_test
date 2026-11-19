import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLine, UsageError } from '../src/cli/parser.js';
import { WalletError } from '../src/domain/errors.js';

test('each command is parsed, commands are case-insensitive, and blank lines are ignored', () => {
  assert.equal(parseLine('   '), null);
  assert.deepEqual(parseLine('login Emma'), { command: 'login', name: 'Emma' });
  assert.deepEqual(parseLine('LOGIN Emma'), { command: 'login', name: 'Emma' });
  assert.deepEqual(parseLine('deposit 100'), { command: 'deposit', amount: 100 });
  assert.deepEqual(parseLine('withdraw 5'), { command: 'withdraw', amount: 5 });
  assert.deepEqual(parseLine('transfer Emma 50'), {
    command: 'transfer',
    target: 'Emma',
    amount: 50,
  });
  assert.deepEqual(parseLine('logout'), { command: 'logout' });
});

test('wrong arguments and unknown commands are usage errors', () => {
  const cases = {
    login: 'Usage: login [name]',
    'login Johan Andreas': 'Usage: login [name]',
    deposit: 'Usage: deposit [amount]',
    'deposit 10 20': 'Usage: deposit [amount]',
    'withdraw 1 2': 'Usage: withdraw [amount]',
    'transfer Emma': 'Usage: transfer [target] [amount]',
    'transfer Johan Andreas 7': 'Usage: transfer [target] [amount]',
    'logout now': 'Usage: logout',
    dance: 'Unknown command: dance',
  };
  for (const [line, message] of Object.entries(cases)) {
    assert.throws(
      () => parseLine(line),
      (err) => err instanceof UsageError && err.message.startsWith(message),
      line,
    );
  }
});

test('amounts that are not positive whole numbers are rejected, including decimals', () => {
  const lines = [
    'deposit abc',
    'deposit 0',
    'withdraw -5',
    'deposit 0.01',
    'deposit 12.5',
    'deposit 10.0', // looks like a whole number but still has a decimal point
    'transfer Emma 7.25',
    'deposit 10000000001', // above the $10,000,000,000 limit
  ];
  for (const line of lines) {
    assert.throws(
      () => parseLine(line),
      (err) => err instanceof WalletError && err.code === 'INVALID_AMOUNT',
      line,
    );
  }
});
