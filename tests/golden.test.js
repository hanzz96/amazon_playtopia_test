import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Wallet } from '../src/domain/wallet.js';
import { executeLine } from '../src/cli/execute.js';
import { loadTranscript } from './helpers/transcript.js';

// The first transcript is the example session from PROBLEM_RETAIL_WALLET.md; the second covers
// multiple creditors, rejected decimals and multi-word names, and error messages.
for (const file of ['example-session.txt', 'extended-session.txt']) {
  test(`transcript ${file} matches line by line`, () => {
    const wallet = new Wallet();
    for (const [index, step] of loadTranscript(file).entries()) {
      assert.deepEqual(
        executeLine(wallet, step.command),
        step.expected,
        `step ${index + 1}: $ ${step.command}`,
      );
    }
  });
}
