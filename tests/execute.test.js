import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Wallet } from '../src/domain/wallet.js';
import { executeLine } from '../src/cli/execute.js';

test('blank lines produce no output', () => {
  assert.deepEqual(executeLine(new Wallet(), '   '), []);
});

test('login greets the customer and shows the balance', () => {
  assert.deepEqual(executeLine(new Wallet(), 'login Emma'), [
    'Hello, Emma!',
    'Your balance is $0',
  ]);
});

test('deposit and withdraw print the new balance', () => {
  const wallet = new Wallet();
  executeLine(wallet, 'login Emma');
  assert.deepEqual(executeLine(wallet, 'deposit 100'), ['Your balance is $100']);
  assert.deepEqual(executeLine(wallet, 'withdraw 30'), ['Your balance is $70']);
});

test('decimal amounts are rejected without changing anything', () => {
  const wallet = new Wallet();
  executeLine(wallet, 'login Emma');
  executeLine(wallet, 'deposit 100');
  const message = ['Invalid amount. Use a positive whole number'];
  assert.deepEqual(executeLine(wallet, 'deposit 0.01'), message);
  assert.deepEqual(executeLine(wallet, 'withdraw 10.5'), message);
  assert.deepEqual(executeLine(wallet, 'transfer Emma 1.5'), message);
  assert.deepEqual(executeLine(wallet, 'logout'), ['Goodbye, Emma!']);
  assert.deepEqual(executeLine(wallet, 'login Emma'), ['Hello, Emma!', 'Your balance is $100']);
});

test('a multi-word login is a usage error and creates nobody', () => {
  const wallet = new Wallet();
  assert.deepEqual(executeLine(wallet, 'login Johan Andreas'), ['Usage: login [name]']);
  assert.deepEqual(wallet.names(), []);
});

test('logout says goodbye', () => {
  const wallet = new Wallet();
  executeLine(wallet, 'login Emma');
  assert.deepEqual(executeLine(wallet, 'logout'), ['Goodbye, Emma!']);
});

test('transfer prints "Transferred" only when money actually moved', () => {
  const wallet = new Wallet();
  executeLine(wallet, 'login Emma');
  executeLine(wallet, 'deposit 100');
  executeLine(wallet, 'logout');
  executeLine(wallet, 'login Kevin');

  // Kevin has nothing, so the whole transfer becomes a debt and no money moves.
  assert.deepEqual(executeLine(wallet, 'transfer Emma 40'), [
    'Your balance is $0',
    'Owed $40 to Emma',
  ]);
  executeLine(wallet, 'logout');

  // Emma's transfer only reduces what Kevin owes her.
  executeLine(wallet, 'login Emma');
  assert.deepEqual(executeLine(wallet, 'transfer Kevin 30'), [
    'Your balance is $100',
    'Owed $10 from Kevin',
  ]);
});

test('domain errors are printed as messages', () => {
  const wallet = new Wallet();
  assert.deepEqual(executeLine(wallet, 'deposit 5'), ['Please login first']);
  executeLine(wallet, 'login Emma');
  assert.deepEqual(executeLine(wallet, 'withdraw 5'), [
    'Insufficient balance. Your balance is $0',
  ]);
  assert.deepEqual(executeLine(wallet, 'transfer Nobody 5'), ['Customer Nobody not found']);
});

test('usage errors are printed as messages', () => {
  assert.deepEqual(executeLine(new Wallet(), 'deposit'), ['Usage: deposit [amount]']);
});

test('unexpected errors are not swallowed', () => {
  const broken = {
    login() {
      throw new TypeError('boom');
    },
  };
  assert.throws(() => executeLine(broken, 'login Emma'), TypeError);
});
