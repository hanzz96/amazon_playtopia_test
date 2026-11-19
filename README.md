# Retail Wallet CLI

A command line application that simulates customers using a retail wallet. Problem statement:
[`PROBLEM_RETAIL_WALLET.md`](PROBLEM_RETAIL_WALLET.md). Implementation plan:
[`PLAN_RETAIL_WALLET.md`](PLAN_RETAIL_WALLET.md).

## Requirements

- **Node.js 20 or newer**, with the `npm` that ships with it.
  The test suite passes on Node 20.17, 22.23, 24.11 and 26.5. Node 18 was not available to test
  with, so it is not claimed.
- A POSIX shell (`bash`) to run `start.sh`. Developed and tested on macOS.
- No third-party packages, and no build step: the app is plain JavaScript (ESM).

## Setup and run

```bash
./start.sh
```

`start.sh` installs dependencies (there are none today), then starts the CLI. If the file is not
executable on your machine, run `chmod +x start.sh` once. Type commands at the `$ ` prompt and press
Ctrl+D to exit.

All data is kept in memory, so **every run of `start.sh` starts with no customers** and nothing is
reused from a previous run.

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

Amounts are positive whole numbers (`100`, `7`). Decimals such as `12.5` or `0.01` are rejected with
`Invalid amount. Use a positive whole number`.

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
- **Deposit** pays outstanding debts first, oldest debt first (FIFO), then adds the rest to the
  balance.
- **Money received by transfer** also settles the receiver's own debts first, automatically, exactly
  like a deposit.
- **Withdraw** never creates a debt. Someone who owes money has a balance of zero, so they must
  deposit before they can withdraw.

Invariants (checked by a randomised test): balances are never negative; two customers never owe each
other at the same time; a customer who owes money has a zero balance; total balances equal deposits
minus withdrawals.

## Tests

```bash
npm test                 # node:test, no dependencies (71 tests)
npm run test:coverage    # with coverage report
```

The suite has unit tests, a randomised invariant test, golden transcripts of whole sessions,
REPL tests, and an end-to-end test that runs `./start.sh` twice to prove each run starts empty.
Line coverage is about 99.8%.

## Key decisions and assumptions

The problem statement leaves these open. **Confirmed** means the answer came from the requirement
owner. **Assumed** means it is my choice and still waiting for confirmation.

| Topic | Decision | Status |
|---|---|---|
| Debts to several customers | Paid oldest first (FIFO). Increasing an existing debt keeps its place in the queue. | Confirmed |
| Incoming transfer to a customer who owes money | Settles that customer's debts first, automatically, like a deposit. | Confirmed |
| Names | Exactly one word, case-sensitive. `login Johan Andreas` is a usage error and creates nobody. | Confirmed |
| Decimals | Not supported. Amounts must be positive whole numbers; money is stored as whole dollars. | Confirmed |
| Registering | There is no register command; `login` creates the customer. No passwords. | Assumed |
| `login` while logged in | Rejected; log out first. | Assumed |
| Transfer to an unknown customer | Rejected; nobody is created by a transfer. | Assumed |
| Transfer to yourself | Rejected. | Assumed |
| Commands | Case-insensitive (`LOGIN Emma` works). | Assumed |
| Prompt | `$ ` is printed only when stdin and stdout are a terminal, so piped output stays clean. | Assumed |
| Errors | Printed on stdout as a single line, and nothing changes (for example `Please login first`). The wording is my own. | Assumed |

## Known limitations and unfinished work

- **No persistence by design.** Closing the app loses all customers, balances and debts. There is
  also no transaction history, no passwords, and only one customer can be logged in at a time.
- **Amount limit.** One operation accepts at most 10,000,000,000. Above that it is rejected as an
  invalid amount.
- **Output pipes.** If stdout is closed early (for example `./start.sh | head -1`), the process
  does not handle the resulting `EPIPE` error.
- **Balance overflow, in theory.** The sum of all balances could exceed JavaScript's safe integer
  range after roughly 900,000 deposits at the maximum amount. There is no guard for this.
- **Unconfirmed assumptions.** The rows marked "Assumed" above may change once they are confirmed.
- **Verification gaps.** Not tested on Node 18 or on Linux/Windows. The project has no lint or
  typecheck script. After the single-word and no-decimal changes, the code was not reviewed a second
  time.

## Layout

```
start.sh                  entry point required by the task
src/index.js              wires stdin/stdout to the REPL
src/cli/                  parser, output formatting, command execution, REPL loop
src/domain/               Wallet (all business rules), money helpers, errors
tests/                    unit, golden transcript, REPL and end-to-end (start.sh) tests
```
