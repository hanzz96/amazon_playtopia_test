import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLine, UsageError } from '../src/cli/parser.js';
import { WalletError } from '../src/domain/errors.js';

function assertUsage(line, usage) {
  assert.throws(
    () => parseLine(line),
    (err) => err instanceof UsageError && err.message.startsWith(usage),
    `expected "${line}" to fail with ${usage}`,
  );
}

test('blank lines parse to nothing', () => {
  assert.equal(parseLine(''), null);
  assert.equal(parseLine('   \t '), null);
});

test('login takes exactly one word as the name', () => {
  assert.deepEqual(parseLine('login Emma'), { command: 'login', name: 'Emma' });
  assert.deepEqual(parseLine('  login   Emma  '), { command: 'login', name: 'Emma' });
});

test('login without a name, or with several words, shows its usage', () => {
  assertUsage('login', 'Usage: login [name]');
  assertUsage('login Johan Andreas', 'Usage: login [name]');
  assertUsage('login Emma 100', 'Usage: login [name]');
});

test('commands are case-insensitive', () => {
  assert.deepEqual(parseLine('LOGIN Emma'), { command: 'login', name: 'Emma' });
  assert.deepEqual(parseLine('Deposit 5'), { command: 'deposit', amount: 5 });
});

test('deposit and withdraw parse a whole-number amount', () => {
  assert.deepEqual(parseLine('deposit 100'), { command: 'deposit', amount: 100 });
  assert.deepEqual(parseLine('withdraw 12'), { command: 'withdraw', amount: 12 });
});

test('deposit and withdraw need exactly one argument', () => {
  assertUsage('deposit', 'Usage: deposit [amount]');
  assertUsage('deposit 10 20', 'Usage: deposit [amount]');
  assertUsage('withdraw', 'Usage: withdraw [amount]');
  assertUsage('withdraw 1 2', 'Usage: withdraw [amount]');
});

test('an invalid amount is reported as a domain error', () => {
  const lines = [
    'deposit abc',
    'deposit 0',
    'withdraw -5',
    'deposit 0.01',
    'deposit 12.5',
    'withdraw 10.00',
    'transfer Emma 7.25',
  ];
  for (const line of lines) {
    assert.throws(
      () => parseLine(line),
      (err) => err instanceof WalletError && err.code === 'INVALID_AMOUNT',
      line,
    );
  }
});

test('transfer takes one target word and a whole-number amount', () => {
  assert.deepEqual(parseLine('transfer Emma 50'), {
    command: 'transfer',
    target: 'Emma',
    amount: 50,
  });
});

test('transfer needs exactly a target and an amount', () => {
  assertUsage('transfer', 'Usage: transfer [target] [amount]');
  assertUsage('transfer Emma', 'Usage: transfer [target] [amount]');
  assertUsage('transfer Johan Andreas 7', 'Usage: transfer [target] [amount]');
});

test('logout takes no arguments', () => {
  assert.deepEqual(parseLine('logout'), { command: 'logout' });
  assertUsage('logout now', 'Usage: logout');
});

test('unknown commands list the available ones', () => {
  assertUsage(
    'dance',
    'Unknown command: dance. Available commands: login, deposit, withdraw, transfer, logout',
  );
});
