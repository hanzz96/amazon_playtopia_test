import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Wallet } from '../src/domain/wallet.js';
import { WalletError } from '../src/domain/errors.js';

function assertCode(fn, code) {
  assert.throws(fn, (err) => err instanceof WalletError && err.code === code, `expected ${code}`);
}

// Creates the customers without leaving anybody logged in.
function register(wallet, ...names) {
  for (const name of names) {
    wallet.login(name);
    wallet.logout();
  }
}

// Runs fn while logged in as `name`, then logs out again.
function as(wallet, name, fn) {
  wallet.login(name);
  try {
    return fn();
  } finally {
    wallet.logout();
  }
}

// The start of the example session: Emma has $100, and Kevin has $80 and is left logged in.
function emmaAndKevin() {
  const wallet = new Wallet();
  as(wallet, 'Emma', () => wallet.deposit(100));
  wallet.login('Kevin');
  wallet.deposit(80);
  return wallet;
}

// ------------------------------------------------------------------ login

test('login creates a customer with a zero balance and keeps the balance for later logins', () => {
  const wallet = new Wallet();
  assert.deepEqual(wallet.login('Emma'), { name: 'Emma', balance: 0, owes: [], owed: [] });
  wallet.deposit(100);
  wallet.logout();
  assert.equal(wallet.login('Emma').balance, 100);
});

test('login accepts a single word only, and only when nobody is logged in', () => {
  const wallet = new Wallet();
  for (const bad of ['', '   ', 'Johan Andreas']) {
    assertCode(() => wallet.login(bad), 'INVALID_NAME');
  }
  assert.deepEqual(wallet.names(), []);

  wallet.login('Emma');
  assertCode(() => wallet.login('Kevin'), 'ALREADY_LOGGED_IN');
});

test('deposit, withdraw, transfer and logout need a login', () => {
  const wallet = new Wallet();
  assertCode(() => wallet.deposit(1), 'NOT_LOGGED_IN');
  assertCode(() => wallet.withdraw(1), 'NOT_LOGGED_IN');
  assertCode(() => wallet.transfer('Emma', 1), 'NOT_LOGGED_IN');
  assertCode(() => wallet.logout(), 'NOT_LOGGED_IN');
});

// ------------------------------------------------------- deposit and withdraw

test('deposit adds to the balance and withdraw takes from it', () => {
  const wallet = new Wallet();
  wallet.login('Emma');
  assert.equal(wallet.deposit(100).balance, 100);
  assert.equal(wallet.withdraw(30).balance, 70);
});

test('withdraw of more than the balance is rejected and changes nothing', () => {
  const wallet = new Wallet();
  wallet.login('Emma');
  wallet.deposit(100);
  assertCode(() => wallet.withdraw(101), 'INSUFFICIENT_BALANCE');
  assert.equal(wallet.snapshot('Emma').balance, 100);
});

test('amounts must be positive whole numbers, otherwise nothing changes', () => {
  const wallet = emmaAndKevin();
  for (const bad of [0, -5, 1.5, NaN]) {
    assertCode(() => wallet.deposit(bad), 'INVALID_AMOUNT');
    assertCode(() => wallet.withdraw(bad), 'INVALID_AMOUNT');
    assertCode(() => wallet.transfer('Emma', bad), 'INVALID_AMOUNT');
  }
  assert.equal(wallet.snapshot('Kevin').balance, 80);
});

// ------------------------------------------------------------------ transfer

test('transfer within the balance moves the money', () => {
  const wallet = emmaAndKevin();
  const result = wallet.transfer('Emma', 50);
  assert.equal(result.transferred, 50);
  assert.equal(result.balance, 30);
  assert.equal(wallet.snapshot('Emma').balance, 150);
});

test('transfer of more than the balance sends what it can and the rest becomes a debt', () => {
  const wallet = emmaAndKevin();
  wallet.transfer('Emma', 50);
  const result = wallet.transfer('Emma', 100);
  assert.equal(result.transferred, 30);
  assert.equal(result.balance, 0);
  assert.deepEqual(result.owes, [{ to: 'Emma', amount: 70 }]);
  assert.equal(wallet.snapshot('Emma').balance, 180);
});

test('transfer to someone who owes the sender reduces that debt first, without moving money', () => {
  const wallet = emmaAndKevin();
  wallet.transfer('Emma', 120); // Kevin sends his $80 and now owes Emma $40
  wallet.logout();
  wallet.login('Emma');

  const netted = wallet.transfer('Kevin', 30);
  assert.equal(netted.transferred, 0);
  assert.equal(netted.balance, 180);
  assert.deepEqual(netted.owed, [{ from: 'Kevin', amount: 10 }]);

  // The remaining $40 is more than the $10 debt, so $10 is netted and $40 is really sent.
  const rest = wallet.transfer('Kevin', 50);
  assert.equal(rest.transferred, 40);
  assert.equal(rest.balance, 140);
  assert.equal(wallet.snapshot('Kevin').balance, 40);
  assert.deepEqual(wallet.snapshot('Kevin').owes, []);
});

test('transfer to an unknown customer or to yourself is rejected and changes nothing', () => {
  const wallet = emmaAndKevin();
  assertCode(() => wallet.transfer('Nobody', 10), 'CUSTOMER_NOT_FOUND');
  assertCode(() => wallet.transfer('Kevin', 10), 'SELF_TRANSFER');
  assert.equal(wallet.snapshot('Kevin').balance, 80);
});

// ---------------------------------------------------------------- debts

test('a deposit pays the debt first and only the rest becomes balance', () => {
  const wallet = emmaAndKevin();
  wallet.transfer('Emma', 110); // Kevin sends his $80 and owes Emma $30
  const result = wallet.deposit(100);
  assert.deepEqual(result.payments, [{ to: 'Emma', amount: 30 }]);
  assert.equal(result.balance, 70);
  assert.deepEqual(result.owes, []);
});

test('several debts are paid oldest first (FIFO)', () => {
  const wallet = new Wallet();
  register(wallet, 'Emma', 'Carol');
  wallet.login('Kevin'); // Kevin has $0
  wallet.transfer('Emma', 40);
  wallet.transfer('Carol', 30);

  const result = wallet.deposit(50);
  assert.deepEqual(result.payments, [
    { to: 'Emma', amount: 40 },
    { to: 'Carol', amount: 10 },
  ]);
  assert.equal(result.balance, 0);
  assert.deepEqual(result.owes, [{ to: 'Carol', amount: 20 }]);
});

test('money received by transfer pays the receiver\'s own debts first', () => {
  const wallet = new Wallet();
  register(wallet, 'Carol');
  as(wallet, 'Bob', () => wallet.transfer('Carol', 10)); // Bob has $0, so he owes Carol $10
  as(wallet, 'Amy', () => wallet.deposit(50));

  wallet.login('Amy');
  wallet.transfer('Bob', 30);
  wallet.logout();

  assert.deepEqual(wallet.snapshot('Bob'), { name: 'Bob', balance: 20, owes: [], owed: [] });
  assert.equal(wallet.snapshot('Carol').balance, 10);
});

// ------------------------------------------------------------- invariants

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

test('after any sequence of operations the money adds up and nobody is negative', () => {
  const names = ['Amy', 'Bob', 'Carol', 'Dave'];
  const random = seededRandom(42);
  const wallet = new Wallet();
  register(wallet, ...names);
  let depositedMinusWithdrawn = 0;

  for (let i = 0; i < 1000; i += 1) {
    const amount = Math.floor(random() * 500) + 1;
    const roll = random();
    wallet.login(names[Math.floor(random() * names.length)]);
    try {
      if (roll < 0.3) {
        wallet.deposit(amount);
        depositedMinusWithdrawn += amount;
      } else if (roll < 0.4) {
        wallet.withdraw(amount);
        depositedMinusWithdrawn -= amount;
      } else {
        wallet.transfer(names[Math.floor(random() * names.length)], amount);
      }
    } catch (err) {
      if (!(err instanceof WalletError)) throw err;
    } finally {
      wallet.logout();
    }

    let total = 0;
    for (const name of names) {
      const { balance, owes } = wallet.snapshot(name);
      assert.ok(balance >= 0, `${name} has a negative balance`);
      if (owes.length > 0) assert.equal(balance, 0, `${name} owes money but has a balance`);
      for (const debt of owes) {
        const reverse = wallet.snapshot(debt.to).owes.find((d) => d.to === name);
        assert.equal(reverse, undefined, `${name} and ${debt.to} owe each other`);
      }
      total += balance;
    }
    assert.equal(total, depositedMinusWithdrawn, 'total balances equal deposits minus withdrawals');
  }
});
