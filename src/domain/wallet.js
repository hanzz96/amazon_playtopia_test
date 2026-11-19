import {
  alreadyLoggedIn,
  customerNotFound,
  insufficientBalance,
  invalidName,
  notLoggedIn,
  selfTransfer,
} from './errors.js';
import { assertAmount } from './money.js';

/**
 * Normalises and validates a customer name: it must be one non-empty word, so anything that still
 * contains whitespace after trimming is rejected.
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeName(raw) {
  const name = typeof raw === 'string' ? raw.trim() : '';
  if (name === '' || /\s/.test(name)) {
    throw invalidName();
  }
  return name;
}

/**
 * @typedef {{ name: string, balance: number, owes: {to: string, amount: number}[],
 *             owed: {from: string, amount: number}[] }} Snapshot
 */

/**
 * In-memory wallet. Invariants kept after every operation:
 *  - balances are never negative;
 *  - two customers never owe each other at the same time;
 *  - a customer who owes money has a balance of zero;
 *  - the sum of all balances equals deposits minus withdrawals.
 */
export class Wallet {
  /** @type {Map<string, number>} customer -> balance in whole dollars */
  #balances = new Map();

  /** @type {Map<string, Map<string, number>>} debtor -> (creditor -> amount); insertion order is FIFO */
  #debts = new Map();

  /** @type {string | null} */
  #current = null;

  /** @returns {Snapshot} */
  login(rawName) {
    if (this.#current !== null) {
      throw alreadyLoggedIn(this.#current);
    }
    const name = normalizeName(rawName);
    if (!this.#balances.has(name)) {
      this.#balances.set(name, 0);
    }
    this.#current = name;
    return this.snapshot(name);
  }

  logout() {
    const name = this.#requireSession();
    this.#current = null;
    return { name };
  }

  /** @returns {string[]} every registered customer, in registration order */
  names() {
    return [...this.#balances.keys()];
  }

  /** @returns {Snapshot} */
  snapshot(name) {
    if (!this.#balances.has(name)) {
      throw customerNotFound(name);
    }
    const owes = [...(this.#debts.get(name) ?? [])].map(([to, amount]) => ({ to, amount }));
    const owed = [];
    for (const [debtor, creditors] of this.#debts) {
      const amount = creditors.get(name);
      if (amount !== undefined) {
        owed.push({ from: debtor, amount });
      }
    }
    return { name, balance: this.#balances.get(name), owes, owed };
  }

  /**
   * Deposits an amount. Outstanding debts are paid first (oldest first); the rest becomes balance.
   * @param {number} amount
   */
  deposit(amount) {
    const me = this.#requireSession();
    assertAmount(amount);
    const payments = this.#credit(me, amount);
    return { ...this.snapshot(me), payments };
  }

  /**
   * Withdraws an amount from the balance. Never creates a debt.
   * @param {number} amount
   * @returns {Snapshot}
   */
  withdraw(amount) {
    const me = this.#requireSession();
    assertAmount(amount);
    const balance = this.#balances.get(me);
    if (amount > balance) {
      throw insufficientBalance(balance);
    }
    this.#balances.set(me, balance - amount);
    return this.snapshot(me);
  }

  /**
   * Transfers an amount to another customer:
   *  1. a debt the target owes the sender is reduced first (no money moves);
   *  2. then the sender's balance is used;
   *  3. whatever is left becomes a debt from the sender to the target.
   * @param {string} rawTarget
   * @param {number} amount
   */
  transfer(rawTarget, amount) {
    const me = this.#requireSession();
    assertAmount(amount);
    const target = typeof rawTarget === 'string' ? rawTarget.trim() : '';
    if (!this.#balances.has(target)) {
      throw customerNotFound(target);
    }
    if (target === me) {
      throw selfTransfer();
    }

    let remaining = amount;

    const theirDebt = this.#debts.get(target)?.get(me) ?? 0;
    const netted = Math.min(theirDebt, remaining);
    if (netted > 0) {
      this.#reduceDebt(target, me, netted);
      remaining -= netted;
    }

    const sent = Math.min(this.#balances.get(me), remaining);
    this.#balances.set(me, this.#balances.get(me) - sent);
    remaining -= sent;

    if (remaining > 0) {
      this.#addDebt(me, target, remaining);
    }

    // Deliver last so that a payment cascading back to the sender also settles the new debt.
    if (sent > 0) {
      this.#credit(target, sent);
    }

    return { ...this.snapshot(me), to: target, transferred: sent };
  }

  #requireSession() {
    if (this.#current === null) {
      throw notLoggedIn();
    }
    return this.#current;
  }

  /**
   * Gives `amount` to `name`: debts are paid first, in FIFO order, and each payment is itself
   * a credit to the creditor (so it may settle the creditor's own debts). The remainder becomes
   * balance. Every step strictly lowers total debt, so the recursion always terminates.
   * @returns {{to: string, amount: number}[]} the payments made by `name` (not the cascaded ones)
   */
  #credit(name, amount) {
    let remaining = amount;
    const payments = [];
    const debts = this.#debts.get(name);

    if (debts) {
      for (const creditor of [...debts.keys()]) {
        if (remaining === 0) break;
        const owed = debts.get(creditor);
        if (owed === undefined) continue; // already settled by a cascaded payment
        const pay = Math.min(owed, remaining);
        this.#reduceDebt(name, creditor, pay);
        remaining -= pay;
        payments.push({ to: creditor, amount: pay });
        this.#credit(creditor, pay);
      }
    }

    if (remaining > 0) {
      this.#balances.set(name, this.#balances.get(name) + remaining);
    }
    return payments;
  }

  #addDebt(debtor, creditor, amount) {
    let debts = this.#debts.get(debtor);
    if (!debts) {
      debts = new Map();
      this.#debts.set(debtor, debts);
    }
    // Updating an existing key keeps its place in the queue.
    debts.set(creditor, (debts.get(creditor) ?? 0) + amount);
  }

  #reduceDebt(debtor, creditor, amount) {
    const debts = this.#debts.get(debtor);
    const left = debts.get(creditor) - amount;
    if (left === 0) {
      debts.delete(creditor);
    } else {
      debts.set(creditor, left);
    }
  }
}
