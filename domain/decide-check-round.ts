/**
 * チェックラウンドを続けるか止めるかを決める純関数。
 *
 * lastRound が無いときは初回 run。fail が無くなったら passed。
 * fail が残り、かつ completedRounds < maxRounds なら retry。
 * warn は fail ではない。
 */
export const MAX_CHECK_ROUNDS = 3;

export type CheckStatus = 'pass' | 'warn' | 'fail';

export type CheckRound = {
  security: CheckStatus;
  style: CheckStatus;
  coverage: CheckStatus;
};

export type CheckRoundDecision =
  | { action: 'run'; remaining: number }
  | { action: 'retry'; remaining: number }
  | { action: 'stop'; reason: 'passed' | 'exhausted' };

export function decideCheckRound(input: {
  completedRounds: number;
  maxRounds: number;
  lastRound: CheckRound | null;
}): CheckRoundDecision {
  if (input.lastRound === null) {
    return { action: 'run', remaining: input.maxRounds };
  }

  const hasFail = Object.values(input.lastRound).includes('fail');
  if (!hasFail) {
    return { action: 'stop', reason: 'passed' };
  }

  if (input.completedRounds < input.maxRounds) {
    return { action: 'retry', remaining: input.maxRounds - input.completedRounds };
  }

  return { action: 'stop', reason: 'exhausted' };
}
