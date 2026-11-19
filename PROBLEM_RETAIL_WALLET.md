# Retail Wallet

## Problem Statement

You are asked to develop a Command Line Interface (CLI) to simulate customer interactions with a retail wallet system.

The application must run on Node.js. JavaScript or TypeScript may be used. The submission must include an executable `start.sh` file located at the root. When executed, this file should install any required dependencies, build the application if necessary, and start the CLI as demonstrated below.

The execution environment provides Node.js and npm, with the `node` and `npm` executables available in the `PATH`. Internet access is available to download dependencies using `npm install` or `npm ci`. No other language runtimes are provided.

Each time `start.sh` is executed, it must create a new environment without reusing any data from previous runs. For instance, if `start.sh` is executed, and new users are created via the CLI, then the process is stopped and `start.sh` is executed again, the application should start fresh with no users registered.

## Commands

* `login [name]` - Logs in as this customer and creates the customer if they do not exist

* `deposit [amount]` - Deposits this amount to the logged in customer

* `withdraw [amount]` - Withdraws this amount from the logged in customer

* `transfer [target] [amount]` - Transfers this amount from the logged in customer to the target customer

* `logout` - Logs out of the current customer

## Example Session

Your console output should contain at least the following output depending on the scenario and commands. But feel free 

to add extra output as you see fit.

```bash

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

$ logout

Goodbye, Kevin!

$ login Emma

Hello, Emma!

Your balance is $210

Owed $40 from Kevin

$ transfer Kevin 30

Your balance is $210

Owed $10 from Kevin

$ logout

Goodbye, Emma!

$ login Kevin

Hello, Kevin!

Your balance is $0

Owed $10 to Emma

$ deposit 100

Transferred $10 to Emma

Your balance is $90

$ logout

Goodbye, Kevin!

```
