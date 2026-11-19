import { formatMoney } from '../domain/money.js';

/** "Your balance" line followed by every debt the customer has or is owed. */
export function formatStatus({ balance, owes, owed }) {
  return [
    `Your balance is ${formatMoney(balance)}`,
    ...owes.map((debt) => `Owed ${formatMoney(debt.amount)} to ${debt.to}`),
    ...owed.map((debt) => `Owed ${formatMoney(debt.amount)} from ${debt.from}`),
  ];
}

export function formatLogin(snapshot) {
  return [`Hello, ${snapshot.name}!`, ...formatStatus(snapshot)];
}

export function formatDeposit(result) {
  return [
    ...result.payments.map((p) => `Transferred ${formatMoney(p.amount)} to ${p.to}`),
    ...formatStatus(result),
  ];
}

/** "Transferred" is printed only when money actually moved (not for pure debt netting). */
export function formatTransfer(result) {
  return [
    ...(result.transferred > 0
      ? [`Transferred ${formatMoney(result.transferred)} to ${result.to}`]
      : []),
    ...formatStatus(result),
  ];
}

export function formatLogout({ name }) {
  return [`Goodbye, ${name}!`];
}

export function formatError(err) {
  if (err.code === 'INSUFFICIENT_BALANCE') {
    return `${err.message}. Your balance is ${formatMoney(err.balance)}`;
  }
  return err.message;
}
