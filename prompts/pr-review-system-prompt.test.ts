/**
 * PR レビュー用 system prompt の公開契約を検証する。
 *
 * 証拠不足を fail と誤認せず、検証済みの diff を全 subagent に渡す。
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildPrReviewSystemPrompt } from './pr-review-system-prompt.ts';

describe('buildPrReviewSystemPrompt', () => {
  it('requires direct evidence before reporting a fail', () => {
    const prompt = buildPrReviewSystemPrompt({
      decision: { action: 'run', remaining: 3 },
      prNumber: 42,
    });

    assert.match(prompt, /証拠不足だけで fail にするな/);
    assert.match(prompt, /条件付きの推測は warn/);
  });

  it('requires every checker to receive the exact diff', () => {
    const prompt = buildPrReviewSystemPrompt({
      decision: { action: 'run', remaining: 3 },
      prNumber: 42,
    });

    assert.match(prompt, /diff 全文をそのまま埋め込む/);
    assert.match(prompt, /diff を読めない場合は warn/);
  });

  it('runs project commands only in a worktree verified at the PR head', () => {
    const prompt = buildPrReviewSystemPrompt({
      decision: { action: 'run', remaining: 3 },
      prNumber: 42,
    });

    assert.match(prompt, /HEAD が対象 PR の head SHA と一致/);
    assert.doesNotMatch(prompt, /npm ci/);
    assert.doesNotMatch(prompt, /gh pr checkout/);
  });

  it('posts a no-blocker comment after a passed decision', () => {
    const prompt = buildPrReviewSystemPrompt({
      decision: { action: 'stop', reason: 'passed' },
      prNumber: 42,
    });

    assert.match(prompt, /日本語のレビューコメントを\s+post_review_comment で投稿して終了せよ/);
    assert.match(prompt, /重大な残件が無い旨を書く/);
  });

  it('does not approve an exhausted failed review', () => {
    const prompt = buildPrReviewSystemPrompt({
      decision: { action: 'stop', reason: 'exhausted' },
      prNumber: 42,
    });

    assert.match(prompt, /approve せず/);
    assert.match(prompt, /残件を箇条書き/);
  });
});
