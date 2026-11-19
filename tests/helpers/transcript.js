import { readFileSync } from 'node:fs';

const fixturesDir = new URL('../fixtures/', import.meta.url);

/**
 * Loads a recorded CLI session. Lines starting with "$ " are commands; the lines that follow
 * are the output expected for that command. Blank lines are ignored.
 * @param {string} file
 * @returns {{ command: string, expected: string[] }[]}
 */
export function loadTranscript(file) {
  const steps = [];
  for (const raw of readFileSync(new URL(file, fixturesDir), 'utf8').split('\n')) {
    const line = raw.trimEnd();
    if (line === '') continue;
    if (line.startsWith('$ ')) {
      steps.push({ command: line.slice(2), expected: [] });
    } else {
      steps.at(-1).expected.push(line);
    }
  }
  return steps;
}
