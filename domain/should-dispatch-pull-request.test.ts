/**
 * shouldDispatchPullRequest の公開APIを検証する。
 * 実装詳細ではなく、eventName と action から dispatch 可否が決まることだけを見る。
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { shouldDispatchPullRequest } from './should-dispatch-pull-request.ts';

describe('shouldDispatchPullRequest', () => {
  it('dispatches pull_request opened', () => {
    assert.equal(
      shouldDispatchPullRequest({ eventName: 'pull_request', action: 'opened' }),
      true,
    );
  });

  it('dispatches pull_request reopened', () => {
    assert.equal(
      shouldDispatchPullRequest({ eventName: 'pull_request', action: 'reopened' }),
      true,
    );
  });

  it('dispatches pull_request synchronize', () => {
    assert.equal(
      shouldDispatchPullRequest({ eventName: 'pull_request', action: 'synchronize' }),
      true,
    );
  });

  it('ignores pull_request edited', () => {
    assert.equal(
      shouldDispatchPullRequest({ eventName: 'pull_request', action: 'edited' }),
      false,
    );
  });

  it('ignores pull_request closed', () => {
    assert.equal(
      shouldDispatchPullRequest({ eventName: 'pull_request', action: 'closed' }),
      false,
    );
  });

  it('ignores pull_request ready_for_review', () => {
    assert.equal(
      shouldDispatchPullRequest({ eventName: 'pull_request', action: 'ready_for_review' }),
      false,
    );
  });

  it('ignores pull_request_review opened', () => {
    assert.equal(
      shouldDispatchPullRequest({ eventName: 'pull_request_review', action: 'opened' }),
      false,
    );
  });

  it('ignores issues opened', () => {
    assert.equal(
      shouldDispatchPullRequest({ eventName: 'issues', action: 'opened' }),
      false,
    );
  });

  it('ignores push with empty action', () => {
    assert.equal(shouldDispatchPullRequest({ eventName: 'push', action: '' }), false);
  });

  it('rejects empty eventName with opened', () => {
    assert.equal(shouldDispatchPullRequest({ eventName: '', action: 'opened' }), false);
  });

  it('rejects pull_request with empty action', () => {
    assert.equal(shouldDispatchPullRequest({ eventName: 'pull_request', action: '' }), false);
  });

  it('rejects both fields empty', () => {
    assert.equal(shouldDispatchPullRequest({ eventName: '', action: '' }), false);
  });

  it('rejects whitespace eventName', () => {
    assert.equal(
      shouldDispatchPullRequest({ eventName: ' pull_request ', action: 'opened' }),
      false,
    );
  });

  it('rejects whitespace action', () => {
    assert.equal(
      shouldDispatchPullRequest({ eventName: 'pull_request', action: ' opened ' }),
      false,
    );
  });

  it('rejects uppercase eventName PULL_REQUEST', () => {
    assert.equal(
      shouldDispatchPullRequest({ eventName: 'PULL_REQUEST', action: 'opened' }),
      false,
    );
  });

  it('rejects capitalized action Opened', () => {
    assert.equal(
      shouldDispatchPullRequest({ eventName: 'pull_request', action: 'Opened' }),
      false,
    );
  });

  it('rejects unknown action string', () => {
    assert.equal(
      shouldDispatchPullRequest({
        eventName: 'pull_request',
        action: 'synchronize_and_opened',
      }),
      false,
    );
  });

  it('ignores extra payload fields when event and action match', () => {
    assert.equal(
      shouldDispatchPullRequest({
        eventName: 'pull_request',
        action: 'synchronize',
        deliveryId: 'abc',
        payload: { action: 'closed' },
      } as { eventName: string; action: string }),
      true,
    );
  });

  it('does not consult nested payload.action when top-level action is closed', () => {
    assert.equal(
      shouldDispatchPullRequest({
        eventName: 'pull_request',
        action: 'closed',
        payload: { action: 'opened' },
      } as { eventName: string; action: string }),
      false,
    );
  });
});
