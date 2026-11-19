import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Wallet } from '../src/domain/wallet.js';
import { WalletError } from '../src/domain/errors.js';

function assertCode(fn, code) {
  assert.throws(
    fn,
    (err) => err instanceof WalletError && err.code === code,
    `expected WalletError ${code}`,
  );
}

// Registers customers without leaving anybody logged in.
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

// Emma has $100 and Kevin ($80) is left logged in, mirroring the start of the example session.
function emmaAndKevin() {
  const wallet = new Wallet();
  as(wallet, 'Emma', () => wallet.deposit(100));
  wallet.login('Kevin');
  wallet.deposit(80);
  return wallet;
}

// ---------------------------------------------------------------- login / logout

test('login creates a new customer with a zero balance', () => {
  const wallet = new Wallet();
  assert.deepEqual(wallet.login('Emma'), { name: 'Emma', balance: 0, owes: [], owed: [] });
});

test('login returns an existing customer with their saved balance', () => {
  const wallet = new Wallet();
  as(wallet, 'Emma', () => wallet.deposit(100));
  assert.equal(wallet.login('Emma').balance, 100);
});

test('login is rejected while a customer is logged in', () => {
  const wallet = new Wallet();
  wallet.login('Emma');
  assertCode(() => wallet.login('Kevin'), 'ALREADY_LOGGED_IN');
  assertCode(() => wallet.login('Emma'), 'ALREADY_LOGGED_IN');
});

test('a rejected login does not create the customer', () => {
  const wallet = new Wallet();
  wallet.login('Emma');
  assertCode(() => wallet.login('Kevin'), 'ALREADY_LOGGED_IN');
  wallet.logout();
  assertCode(() => wallet.snapshot('Kevin'), 'CUSTOMER_NOT_FOUND');
});

test('login trims surrounding whitespace', () => {
  const wallet = new Wallet();
  as(wallet, '  Johan ', () => wallet.deposit(5));
  const result = wallet.login('Johan');
  assert.equal(result.name, 'Johan');
  assert.equal(result.balance, 5);
});

test('login rejects empty names and names with more than one word', () => {
  const wallet = new Wallet();
  for (const bad of ['', '   ', 'Johan Andreas', 'Emma 100', 'Emma\tKevin', undefined, 42]) {
    assertCode(() => wallet.login(bad), 'INVALID_NAME');
  }
  assertCode(() => wallet.deposit(1), 'NOT_LOGGED_IN');
  assert.deepEqual(wallet.names(), []);
});

test('customer names are case-sensitive', () => {
  const wallet = new Wallet();
  as(wallet, 'Emma', () => wallet.deposit(100));
  assert.equal(wallet.login('emma').balance, 0);
});

test('logout returns the name and ends the session', () => {
  const wallet = new Wallet();
  wallet.login('Emma');
  assert.deepEqual(wallet.logout(), { name: 'Emma' });
  assertCode(() => wallet.deposit(1), 'NOT_LOGGED_IN');
});

test('logout without a session is rejected', () => {
  assertCode(() => new Wallet().logout(), 'NOT_LOGGED_IN');
});

test('deposit, withdraw and transfer require a session', () => {
  const wallet = new Wallet();
  register(wallet, 'Emma');
  assertCode(() => wallet.deposit(1), 'NOT_LOGGED_IN');
  assertCode(() => wallet.withdraw(1), 'NOT_LOGGED_IN');
  assertCode(() => wallet.transfer('Emma', 1), 'NOT_LOGGED_IN');
});

test('snapshot of an unknown customer is rejected and names() lists customers', () => {
  const wallet = new Wallet();
  register(wallet, 'Emma', 'Kevin');
  assertCode(() => wallet.snapshot('Nobody'), 'CUSTOMER_NOT_FOUND');
  assert.deepEqual(wallet.names(), ['Emma', 'Kevin']);
});

test('domain errors keep the WalletError name and expose the customer separately', () => {
  const wallet = new Wallet();
  wallet.login('Emma');
  assert.throws(
    () => wallet.login('Kevin'),
    (err) => err.name === 'WalletError' && err.customer === 'Emma',
  );
  assert.throws(
    () => wallet.snapshot('Nobody'),
    (err) => err.name === 'WalletError' && err.customer === 'Nobody',
  );
});

// ---------------------------------------------------------------- deposit

test('deposit adds to the balance', () => {
  const wallet = new Wallet();
  wallet.login('Emma');
  const result = wallet.deposit(100);
  assert.equal(result.balance, 100);
  assert.deepEqual(result.payments, []);
});

test('deposit rejects amounts that are not positive whole numbers', () => {
  const wallet = new Wallet();
  wallet.login('Emma');
  for (const bad of [0, -5, 1.5, NaN, '10', undefined]) {
    assertCode(() => wallet.deposit(bad), 'INVALID_AMOUNT');
  }
  assert.equal(wallet.snapshot('Emma').balance, 0);
});

// ---------------------------------------------------------------- withdraw

test('withdraw reduces the balance', () => {
  const wallet = new Wallet();
  wallet.login('Emma');
  wallet.deposit(100);
  assert.equal(wallet.withdraw(30).balance, 70);
});

test('withdraw may take the whole balance', () => {
  const wallet = new Wallet();
  wallet.login('Emma');
  wallet.deposit(100);
  assert.equal(wallet.withdraw(100).balance, 0);
});

test('withdraw above the balance is rejected and changes nothing', () => {
  const wallet = new Wallet();
  wallet.login('Emma');
  wallet.deposit(100);
  const before = wallet.snapshot('Emma');
  assertCode(() => wallet.withdraw(101), 'INSUFFICIENT_BALANCE');
  assert.deepEqual(wallet.snapshot('Emma'), before);
});

test('withdraw rejects invalid amounts', () => {
  const wallet = new Wallet();
  wallet.login('Emma');
  wallet.deposit(100);
  for (const bad of [0, -5, 1.5, NaN]) {
    assertCode(() => wallet.withdraw(bad), 'INVALID_AMOUNT');
  }
});

test('withdraw is impossible while the customer owes someone', () => {
  const wallet = new Wallet();
  register(wallet, 'Emma');
  wallet.login('Kevin');
  wallet.transfer('Emma', 40);
  assertCode(() => wallet.withdraw(1), 'INSUFFICIENT_BALANCE');
});

// ---------------------------------------------------------------- transfer

test('transfer moves money to the target', () => {
  const wallet = emmaAndKevin();
  const result = wallet.transfer('  Emma ', 50);
  assert.equal(result.to, 'Emma');
  assert.equal(result.transferred, 50);
  assert.equal(result.balance, 30);
  assert.deepEqual(result.owes, []);
  assert.equal(wallet.snapshot('Emma').balance, 150);
});

test('transfer above the balance sends what is available and records a debt', () => {
  const wallet = emmaAndKevin();
  wallet.transfer('Emma', 50);
  const result = wallet.transfer('Emma', 100);
  assert.equal(result.transferred, 30);
  assert.equal(result.balance, 0);
  assert.deepEqual(result.owes, [{ to: 'Emma', amount: 70 }]);
  assert.equal(wallet.snapshot('Emma').balance, 180);
});

test('transfer with a zero balance moves nothing and becomes a debt', () => {
  const wallet = new Wallet();
  register(wallet, 'Emma');
  wallet.login('Kevin');
  const result = wallet.transfer('Emma', 40);
  assert.equal(result.transferred, 0);
  assert.equal(result.balance, 0);
  assert.deepEqual(result.owes, [{ to: 'Emma', amount: 40 }]);
});

test('deposit pays debts before adding to the balance', () => {
  const wallet = emmaAndKevin();
  wallet.transfer('Emma', 50);
  wallet.transfer('Emma', 100); // Kevin now owes Emma $70
  const result = wallet.deposit(30);
  assert.deepEqual(result.payments, [{ to: 'Emma', amount: 30 }]);
  assert.equal(result.balance, 0);
  assert.deepEqual(result.owes, [{ to: 'Emma', amount: 40 }]);
  assert.equal(wallet.snapshot('Emma').balance, 210);
});

test('a deposit larger than the debts settles them and keeps the rest', () => {
  const wallet = new Wallet();
  register(wallet, 'Emma');
  wallet.login('Kevin');
  wallet.transfer('Emma', 40);
  const result = wallet.deposit(100);
  assert.deepEqual(result.payments, [{ to: 'Emma', amount: 40 }]);
  assert.equal(result.balance, 60);
  assert.deepEqual(result.owes, []);
});

test('transfer to someone who owes you reduces their debt without moving money', () => {
  const wallet = new Wallet();
  as(wallet, 'Emma', () => wallet.deposit(210));
  as(wallet, 'Kevin', () => wallet.transfer('Emma', 40)); // Kevin owes Emma $40
  wallet.login('Emma');
  const result = wallet.transfer('Kevin', 30);
  assert.equal(result.transferred, 0);
  assert.equal(result.balance, 210);
  assert.deepEqual(result.owed, [{ from: 'Kevin', amount: 10 }]);
  assert.deepEqual(wallet.snapshot('Kevin').owes, [{ to: 'Emma', amount: 10 }]);
});

test('transfer larger than the debt clears it and sends the remainder from the balance', () => {
  const wallet = new Wallet();
  as(wallet, 'Emma', () => wallet.deposit(100));
  as(wallet, 'Kevin', () => wallet.transfer('Emma', 10)); // Kevin owes Emma $10
  wallet.login('Emma');
  const result = wallet.transfer('Kevin', 50);
  assert.equal(result.transferred, 40);
  assert.equal(result.balance, 60);
  assert.deepEqual(result.owed, []);
  const kevin = wallet.snapshot('Kevin');
  assert.equal(kevin.balance, 40);
  assert.deepEqual(kevin.owes, []);
});

test('deposit settles debts in FIFO order', () => {
  const wallet = new Wallet();
  register(wallet, 'Emma', 'Carol');
  wallet.login('Kevin');
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

test('increasing an existing debt keeps its place in the queue', () => {
  const wallet = new Wallet();
  register(wallet, 'Emma', 'Carol');
  wallet.login('Kevin');
  wallet.transfer('Emma', 10);
  wallet.transfer('Carol', 10);
  wallet.transfer('Emma', 10); // Emma is now owed $20 and is still first in line
  const result = wallet.deposit(25);
  assert.deepEqual(result.payments, [
    { to: 'Emma', amount: 20 },
    { to: 'Carol', amount: 5 },
  ]);
});

test('an incoming transfer settles the recipient debts first', () => {
  const wallet = new Wallet();
  register(wallet, 'Emma', 'Kevin');
  as(wallet, 'Kevin', () => wallet.transfer('Emma', 40)); // Kevin owes Emma $40
  wallet.login('Carol');
  wallet.deposit(100);
  wallet.transfer('Kevin', 50);
  const kevin = wallet.snapshot('Kevin');
  assert.equal(kevin.balance, 10);
  assert.deepEqual(kevin.owes, []);
  assert.equal(wallet.snapshot('Emma').balance, 40);
  assert.equal(wallet.snapshot('Carol').balance, 50);
});

test('payments cascade through chained debts', () => {
  const wallet = new Wallet();
  register(wallet, 'Amy', 'Bob', 'Carol');
  as(wallet, 'Bob', () => wallet.transfer('Carol', 10)); // Bob owes Carol $10
  wallet.login('Amy');
  wallet.deposit(10);
  const result = wallet.transfer('Bob', 10);
  assert.equal(result.transferred, 10);
  assert.equal(result.balance, 0);
  const bob = wallet.snapshot('Bob');
  assert.equal(bob.balance, 0);
  assert.deepEqual(bob.owes, []);
  assert.equal(wallet.snapshot('Carol').balance, 10);
});

test('transfer errors leave every balance untouched', () => {
  const wallet = emmaAndKevin();
  const before = ['Emma', 'Kevin'].map((n) => wallet.snapshot(n));
  assertCode(() => wallet.transfer('Nobody', 10), 'CUSTOMER_NOT_FOUND');
  assertCode(() => wallet.transfer('Kevin', 10), 'SELF_TRANSFER');
  assertCode(() => wallet.transfer('Emma', 0), 'INVALID_AMOUNT');
  assertCode(() => wallet.transfer('Emma', 1.5), 'INVALID_AMOUNT');
  assert.deepEqual(['Emma', 'Kevin'].map((n) => wallet.snapshot(n)), before);
});

// ---------------------------------------------------------------- invariants

function makeRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function assertInvariants(wallet, names, expectedTotal) {
  let total = 0;
  for (const name of names) {
    const snap = wallet.snapshot(name);
    assert.ok(snap.balance >= 0, `${name} has a negative balance`);
    total += snap.balance;
    if (snap.owes.length > 0) {
      assert.equal(snap.balance, 0, `${name} owes money but still has a balance`);
    }
    for (const debt of snap.owes) {
      assert.ok(debt.amount > 0, 'debts are positive');
      const reverse = wallet.snapshot(debt.to).owes.find((d) => d.to === name);
      assert.equal(reverse, undefined, `${name} and ${debt.to} owe each other`);
    }
  }
  assert.equal(total, expectedTotal, 'total balances equal deposits minus withdrawals');
}

test('invariants hold under a long random sequence of operations', () => {
  const rng = makeRng(42);
  const names = ['Amy', 'Bob', 'Carol', 'Dave'];
  const wallet = new Wallet();
  register(wallet, ...names);
  let netDeposits = 0;

  for (let i = 0; i < 3000; i += 1) {
    const actor = names[Math.floor(rng() * names.length)];
    const amount = Math.floor(rng() * 5000) + 1;
    const roll = rng();
    wallet.login(actor);
    try {
      if (roll < 0.3) {
        wallet.deposit(amount);
        netDeposits += amount;
      } else if (roll < 0.4) {
        wallet.withdraw(amount);
        netDeposits -= amount;
      } else {
        wallet.transfer(names[Math.floor(rng() * names.length)], amount);
      }
    } catch (err) {
      if (!(err instanceof WalletError)) throw err;
    } finally {
      wallet.logout();
    }
    assertInvariants(wallet, names, netDeposits);
  }
});
