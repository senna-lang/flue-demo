/**
 * decideCheckRound の公開APIを検証する。
 * warn は fail ではない。remaining は run / retry のみ見る。
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decideCheckRound } from './decide-check-round.ts';

const pass = { security: 'pass', style: 'pass', coverage: 'pass' } as const;
const failOne = { security: 'fail', style: 'pass', coverage: 'pass' } as const;

describe('decideCheckRound', () => {
  it('runs when lastRound is null and completedRounds is 0', () => {
    assert.deepEqual(
      decideCheckRound({ completedRounds: 0, maxRounds: 3, lastRound: null }),
      { action: 'run', remaining: 3 },
    );
  });

  it('run remaining equals maxRounds not maxRounds-completedRounds', () => {
    const decision = decideCheckRound({
      completedRounds: 2,
      maxRounds: 3,
      lastRound: null,
    });
    assert.deepEqual(decision, { action: 'run', remaining: 3 });
  });

  it('stops as passed when all three are pass', () => {
    assert.deepEqual(
      decideCheckRound({ completedRounds: 1, maxRounds: 3, lastRound: pass }),
      { action: 'stop', reason: 'passed' },
    );
  });

  it('stops as passed when all three are warn', () => {
    assert.deepEqual(
      decideCheckRound({
        completedRounds: 1,
        maxRounds: 3,
        lastRound: { security: 'warn', style: 'warn', coverage: 'warn' },
      }),
      { action: 'stop', reason: 'passed' },
    );
  });

  it('treats a single warn among passes as passed', () => {
    assert.deepEqual(
      decideCheckRound({
        completedRounds: 1,
        maxRounds: 3,
        lastRound: { security: 'pass', style: 'warn', coverage: 'pass' },
      }),
      { action: 'stop', reason: 'passed' },
    );
  });

  it('treats mixed pass and warn on every axis as passed', () => {
    assert.deepEqual(
      decideCheckRound({
        completedRounds: 2,
        maxRounds: 3,
        lastRound: { security: 'warn', style: 'pass', coverage: 'warn' },
      }),
      { action: 'stop', reason: 'passed' },
    );
  });

  it('stops as passed even when completedRounds already equals maxRounds', () => {
    assert.deepEqual(
      decideCheckRound({
        completedRounds: 3,
        maxRounds: 3,
        lastRound: { security: 'pass', style: 'warn', coverage: 'pass' },
      }),
      { action: 'stop', reason: 'passed' },
    );
  });

  it('stops as passed even when completedRounds exceeds maxRounds', () => {
    assert.deepEqual(
      decideCheckRound({ completedRounds: 4, maxRounds: 3, lastRound: pass }),
      { action: 'stop', reason: 'passed' },
    );
  });

  it('retries when security failed after round 1', () => {
    assert.deepEqual(
      decideCheckRound({ completedRounds: 1, maxRounds: 3, lastRound: failOne }),
      { action: 'retry', remaining: 2 },
    );
  });

  it('retries when style failed after round 1', () => {
    assert.deepEqual(
      decideCheckRound({
        completedRounds: 1,
        maxRounds: 3,
        lastRound: { security: 'pass', style: 'fail', coverage: 'pass' },
      }),
      { action: 'retry', remaining: 2 },
    );
  });

  it('retries when coverage failed after round 1', () => {
    assert.deepEqual(
      decideCheckRound({
        completedRounds: 1,
        maxRounds: 3,
        lastRound: { security: 'pass', style: 'pass', coverage: 'fail' },
      }),
      { action: 'retry', remaining: 2 },
    );
  });

  it('retries when two axes failed after round 1', () => {
    assert.deepEqual(
      decideCheckRound({
        completedRounds: 1,
        maxRounds: 3,
        lastRound: { security: 'fail', style: 'fail', coverage: 'pass' },
      }),
      { action: 'retry', remaining: 2 },
    );
  });

  it('retries when all three failed after round 1', () => {
    assert.deepEqual(
      decideCheckRound({
        completedRounds: 1,
        maxRounds: 3,
        lastRound: { security: 'fail', style: 'fail', coverage: 'fail' },
      }),
      { action: 'retry', remaining: 2 },
    );
  });

  it('retries with remaining 1 after round 2 fail', () => {
    assert.deepEqual(
      decideCheckRound({
        completedRounds: 2,
        maxRounds: 3,
        lastRound: { security: 'fail', style: 'warn', coverage: 'pass' },
      }),
      { action: 'retry', remaining: 1 },
    );
  });

  it('fail wins over warn and pass on retry path', () => {
    assert.deepEqual(
      decideCheckRound({
        completedRounds: 1,
        maxRounds: 3,
        lastRound: { security: 'warn', style: 'fail', coverage: 'pass' },
      }),
      { action: 'retry', remaining: 2 },
    );
  });

  it('stops exhausted when a fail arrives at completedRounds === maxRounds', () => {
    assert.deepEqual(
      decideCheckRound({ completedRounds: 3, maxRounds: 3, lastRound: failOne }),
      { action: 'stop', reason: 'exhausted' },
    );
  });

  it('stops exhausted when all fail at the last round', () => {
    assert.deepEqual(
      decideCheckRound({
        completedRounds: 3,
        maxRounds: 3,
        lastRound: { security: 'fail', style: 'fail', coverage: 'fail' },
      }),
      { action: 'stop', reason: 'exhausted' },
    );
  });

  it('stops exhausted when completedRounds is already past maxRounds and lastRound failed', () => {
    assert.deepEqual(
      decideCheckRound({
        completedRounds: 4,
        maxRounds: 3,
        lastRound: { security: 'pass', style: 'pass', coverage: 'fail' },
      }),
      { action: 'stop', reason: 'exhausted' },
    );
  });

  it('does not retry when remaining would be 0', () => {
    const decision = decideCheckRound({
      completedRounds: 3,
      maxRounds: 3,
      lastRound: failOne,
    });
    assert.notEqual(decision.action, 'retry');
    assert.deepEqual(decision, { action: 'stop', reason: 'exhausted' });
  });

  it('run remaining follows the given maxRounds of 1', () => {
    assert.deepEqual(
      decideCheckRound({ completedRounds: 0, maxRounds: 1, lastRound: null }),
      { action: 'run', remaining: 1 },
    );
  });

  it('exhausts immediately when maxRounds is 1 and first result failed', () => {
    assert.deepEqual(
      decideCheckRound({ completedRounds: 1, maxRounds: 1, lastRound: failOne }),
      { action: 'stop', reason: 'exhausted' },
    );
  });

  it('retries when completedRounds is 0 but lastRound already failed', () => {
    assert.deepEqual(
      decideCheckRound({ completedRounds: 0, maxRounds: 3, lastRound: failOne }),
      { action: 'retry', remaining: 3 },
    );
  });

  it('stops as passed when completedRounds is 0 but lastRound has no fail', () => {
    assert.deepEqual(
      decideCheckRound({ completedRounds: 0, maxRounds: 3, lastRound: pass }),
      { action: 'stop', reason: 'passed' },
    );
  });

  it('runs when lastRound is null even if completedRounds is already 3', () => {
    assert.deepEqual(
      decideCheckRound({ completedRounds: 3, maxRounds: 3, lastRound: null }),
      { action: 'run', remaining: 3 },
    );
  });

  it('runs with remaining 0 when maxRounds is 0 and lastRound is null', () => {
    assert.deepEqual(
      decideCheckRound({ completedRounds: 0, maxRounds: 0, lastRound: null }),
      { action: 'run', remaining: 0 },
    );
  });

  it('exhausts when maxRounds is 0, completedRounds is 0, and lastRound failed', () => {
    assert.deepEqual(
      decideCheckRound({ completedRounds: 0, maxRounds: 0, lastRound: failOne }),
      { action: 'stop', reason: 'exhausted' },
    );
  });

  it('retries when maxRounds is 0, completedRounds is negative, and lastRound failed', () => {
    assert.deepEqual(
      decideCheckRound({ completedRounds: -1, maxRounds: 0, lastRound: failOne }),
      { action: 'retry', remaining: 1 },
    );
  });
});
