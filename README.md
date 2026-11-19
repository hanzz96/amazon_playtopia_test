# Retail Wallet CLI

A command line application that simulates customers using a retail wallet. Problem statement:
[`PROBLEM_RETAIL_WALLET.md`](PROBLEM_RETAIL_WALLET.md). Implementation plan:
[`PLAN_RETAIL_WALLET.md`](PLAN_RETAIL_WALLET.md).

## Run

Requires Node.js 18+ and npm.

```bash
./start.sh
```

`start.sh` installs dependencies (there are none), then starts the CLI. There is no build step: the
app is plain JavaScript (ESM). All data is kept in memory, so **every run starts with no
customers**.

Input can also be piped; the `$ ` prompt is only shown in an interactive terminal:

```bash
printf 'login Emma\ndeposit 100\nlogout\n' | ./start.sh
```

## Commands

| Command | Effect |
|---|---|
| `login [name]` | Logs in as this customer, creating the customer if they do not exist. The name is a single word. |
| `deposit [amount]` | Deposits to the logged in customer. Outstanding debts are paid first. |
| `withdraw [amount]` | Withdraws from the balance. Rejected if the balance is not enough. |
| `transfer [target] [amount]` | Transfers to another existing customer. |
| `logout` | Logs out of the current customer. |

Amounts are positive whole numbers (`100`, `7`). Decimals such as `12.5` or `0.01` are rejected with `Invalid amount. Use a positive whole number`.

## Example session

```
$ login Emma
Hello, Emma!
Your balance is $0
$ deposit 100
Your balance is $100
$ logout
Goodbye, Emma!
$ login Kevin
Hello, Kevin!
Your balance is $0
$ deposit 80
Your balance is $80
$ transfer Emma 50
Transferred $50 to Emma
Your balance is $30
$ transfer Emma 100
Transferred $30 to Emma
Your balance is $0
Owed $70 to Emma
$ deposit 30
Transferred $30 to Emma
Your balance is $0
Owed $40 to Emma
```

The full session from the problem statement is replayed by the tests
([`tests/fixtures/example-session.txt`](tests/fixtures/example-session.txt)).

## Business rules

- **Transfer** works in three steps: (1) if the target owes the sender, that debt is reduced first
  and no money moves; (2) then the sender's balance is used; (3) whatever is left becomes a debt
  from the sender to the target. `Transferred $X to Y` is only printed when money actually moved.
- **Deposit** pays outstanding debts first (oldest debt first), then adds the rest to the balance.
- **Money received by transfer** also settles the receiver's own debts first, automatically, exactly like a deposit (confirmed).
- **Withdraw** never creates a debt. Someone who owes money has a balance of zero, so they must
  deposit before they can withdraw.

Invariants (checked by a randomised test): balances are never negative; two customers never owe each
other at the same time; a customer who owes money has a zero balance; total balances equal deposits
minus withdrawals.

## Decisions the problem statement leaves open

| Topic | Decision |
|---|---|
| Registering | There is no register command; `login` creates the customer. No passwords. |
| Debts to several customers | Paid oldest first (FIFO), confirmed. Increasing an existing debt keeps its place. |
| `login` while logged in | Rejected; log out first. |
| Transfer to an unknown customer | Rejected; nobody is created by a transfer. |
| Transfer to yourself | Rejected. |
| Names | Exactly one word, case-sensitive. `login Johan Andreas` is a usage error and creates nobody. |
| Commands | Case-insensitive (`LOGIN Emma` works). |
| Money | Whole dollars only, printed as `$100`. Decimals are rejected before they reach the wallet. |
| Errors | Printed on stdout as a single line (for example `Please login first`). |

## Tests

```bash
npm test                 # node:test, no dependencies
npm run test:coverage    # with coverage report
```

## Layout

```
start.sh                  entry point required by the task
src/index.js              wires stdin/stdout to the REPL
src/cli/                  parser, output formatting, command execution, REPL loop
src/domain/               Wallet (all business rules), money helpers, errors
tests/                    unit, golden transcript, REPL and end-to-end (start.sh) tests
```
