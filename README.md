# Retail Wallet CLI

## Required runtime version

- **Node.js 20 or newer**, with the `npm` that ships with it.
- **macOS or Linux:** any POSIX `sh` runs `start.sh`; bash is not required.
- **Windows:** run `start.sh` from Git Bash or WSL (with Node installed there), or use `npm start`,
  which needs no shell.
- No third-party packages and no build step (plain JavaScript, ESM).

## Setup and run instructions

```bash
./start.sh
```

`start.sh` installs dependencies (there are none today) and starts the CLI. If the file is not
executable on your machine, run `chmod +x start.sh` once. Every run starts with no customers,
because all data is kept in memory.

Type these commands at the `$ ` prompt, and press Ctrl+D to exit:

- `login [name]`
- `deposit [amount]`
- `withdraw [amount]`
- `transfer [target] [amount]`
- `logout`

## Instructions to run tests

```bash
npm test                 # 17 tests, no dependencies
npm run test:coverage    # with coverage report
```

## Key decisions and assumptions

**Confirmed** means the answer came from the requirement owner. **Assumed** is my own choice.

| Topic | Decision | Status |
|---|---|---|
| Paying several debts | Oldest debt first (FIFO). Increasing an existing debt keeps its place in the queue. | Confirmed |
| Incoming transfer to a customer who owes money | Settles that customer's debts first, automatically, like a deposit. | Confirmed |
| Names | Exactly one word, case-sensitive. `login Johan Andreas` is a usage error and creates nobody. | Confirmed |
| Decimals | Not supported. Amounts must be positive whole numbers; `deposit 0.01` is rejected. | Confirmed |
| Transfer | Three steps: (1) reduce any debt the target owes the sender, with no money moving; (2) use the sender's balance; (3) the rest becomes a debt from the sender to the target. | Assumed |
| Withdraw | Never creates a debt; rejected if the balance is not enough. | Assumed |
| Maximum amount | One operation accepts at most $10,000,000,000 (10000000000). The total balance is not capped. | Assumed |
| Registering | There is no register command; `login` creates the customer. No passwords. | Assumed |
| `login` while logged in | Rejected; log out first. | Assumed |
| Transfer to an unknown customer or to yourself | Rejected; nobody is created by a transfer. | Assumed |
| Commands | Case-insensitive (`LOGIN Emma` works). | Assumed |
| Errors | Printed on stdout as one line, and nothing changes. The wording is my own. | Assumed |

## Known limitations or unfinished work

- **No persistence by design.** Closing the app loses everything. There is no transaction history,
  and only one customer can be logged in at a time.
- **Amount limit.** Above $10,000,000,000 per operation, the amount is rejected as invalid, with the
  same message as any other invalid amount.
- **Balance overflow, in theory.** The sum of all balances could exceed JavaScript's safe integer
  range after roughly 900,000 deposits at the maximum amount. There is no guard.
- **Test scope.** The 17 tests cover the business rules and the command parser. The exact output
  text, `start.sh` itself (including a fresh start on every run) and the problem statement's example
  session were checked by hand and have no automated test. `npm run test:coverage` shows about 99%,
  but it only counts files the tests load; counting all of `src/cli` too, line coverage is about 82%.
