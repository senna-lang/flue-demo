/**
 * claimDeliveryId の公開APIを検証する。
 * 入力配列の同一性や内部構造ではなく、accepted と recorded の内容を見る。
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { claimDeliveryId } from './claim-delivery-id.ts';

function ids(count: number, start = 0): string[] {
  return Array.from({ length: count }, (_, index) => `id-${start + index}`);
}

describe('claimDeliveryId', () => {
  it('appends a new deliveryId to an empty log', () => {
    assert.deepEqual(claimDeliveryId([], 'd1'), {
      accepted: true,
      recorded: ['d1'],
    });
  });

  it('appends a new deliveryId after existing ones', () => {
    assert.deepEqual(claimDeliveryId(['a', 'b'], 'c'), {
      accepted: true,
      recorded: ['a', 'b', 'c'],
    });
  });

  it('rejects a duplicate and leaves the list unchanged', () => {
    assert.deepEqual(claimDeliveryId(['a', 'b'], 'a'), {
      accepted: false,
      recorded: ['a', 'b'],
    });
  });

  it('rejects a duplicate of the most recently recorded id', () => {
    assert.deepEqual(claimDeliveryId(['a', 'b'], 'b'), {
      accepted: false,
      recorded: ['a', 'b'],
    });
  });

  it('treats delivery ids as case-sensitive', () => {
    assert.deepEqual(claimDeliveryId(['Abc'], 'abc'), {
      accepted: true,
      recorded: ['Abc', 'abc'],
    });
  });

  it('accepts an empty deliveryId without recording it', () => {
    assert.deepEqual(claimDeliveryId([], ''), {
      accepted: true,
      recorded: [],
    });
  });

  it('accepts an empty deliveryId against a non-empty log without recording it', () => {
    assert.deepEqual(claimDeliveryId(['a'], ''), {
      accepted: true,
      recorded: ['a'],
    });
  });

  it('does not treat empty id as a duplicate of a previously ignored empty id', () => {
    const first = claimDeliveryId([], '');
    const second = claimDeliveryId(first.recorded, '');
    assert.deepEqual(second, { accepted: true, recorded: [] });
  });

  it('appends when the log has 999 entries and omitted cap', () => {
    const recorded = ids(999);
    const result = claimDeliveryId(recorded, 'new');
    assert.equal(result.accepted, true);
    assert.equal(result.recorded.length, 1000);
    assert.equal(result.recorded[0], 'id-0');
    assert.equal(result.recorded[999], 'new');
  });

  it('evicts the oldest when the log is already at 1000 and a new id arrives', () => {
    const recorded = ids(1000);
    const result = claimDeliveryId(recorded, 'id-1000');
    assert.equal(result.accepted, true);
    assert.equal(result.recorded.length, 1000);
    assert.equal(result.recorded[0], 'id-1');
    assert.equal(result.recorded[999], 'id-1000');
  });

  it('does not evict on a duplicate when the log is at cap', () => {
    const recorded = ids(1000);
    const result = claimDeliveryId(recorded, 'id-0');
    assert.equal(result.accepted, false);
    assert.equal(result.recorded[0], 'id-0');
    assert.equal(result.recorded.length, 1000);
    assert.deepEqual(result.recorded, recorded);
  });

  it('does not evict on a duplicate of a mid-list id at cap', () => {
    const recorded = ids(1000);
    const result = claimDeliveryId(recorded, 'id-500');
    assert.equal(result.accepted, false);
    assert.deepEqual(result.recorded, recorded);
  });

  it('explicit cap 1000 matches omitted cap', () => {
    const recorded = ids(1000);
    assert.deepEqual(
      claimDeliveryId(recorded, 'id-1000', 1000),
      claimDeliveryId(recorded, 'id-1000'),
    );
  });

  it('accepts empty id at cap without evicting', () => {
    const recorded = ids(1000);
    const result = claimDeliveryId(recorded, '');
    assert.equal(result.accepted, true);
    assert.equal(result.recorded.length, 1000);
    assert.deepEqual(result.recorded, recorded);
  });

  it('evicts oldest when cap is 1 and a second id is claimed', () => {
    assert.deepEqual(claimDeliveryId(['only'], 'next', 1), {
      accepted: true,
      recorded: ['next'],
    });
  });

  it('keeps a single new id when cap is 1 and log is empty', () => {
    assert.deepEqual(claimDeliveryId([], 'only', 1), {
      accepted: true,
      recorded: ['only'],
    });
  });

  it('evicts two oldest when list is already over a smaller cap', () => {
    assert.deepEqual(claimDeliveryId(['a', 'b', 'c'], 'd', 2), {
      accepted: true,
      recorded: ['c', 'd'],
    });
  });

  it('does not shrink an over-cap list on duplicate', () => {
    assert.deepEqual(claimDeliveryId(['a', 'b', 'c'], 'b', 2), {
      accepted: false,
      recorded: ['a', 'b', 'c'],
    });
  });

  it('does not shrink an over-cap list on empty id', () => {
    assert.deepEqual(claimDeliveryId(['a', 'b', 'c'], '', 2), {
      accepted: true,
      recorded: ['a', 'b', 'c'],
    });
  });

  it('records a whitespace-only id as a real id', () => {
    assert.deepEqual(claimDeliveryId([], ' '), {
      accepted: true,
      recorded: [' '],
    });
  });

  it('records a second whitespace-only id that differs', () => {
    assert.deepEqual(claimDeliveryId([' '], '\t'), {
      accepted: true,
      recorded: [' ', '\t'],
    });
  });

  it('rejects a duplicate whitespace id', () => {
    assert.deepEqual(claimDeliveryId([' '], ' '), {
      accepted: false,
      recorded: [' '],
    });
  });

  it('records a very long deliveryId', () => {
    const deliveryId = 'x'.repeat(4096);
    assert.deepEqual(claimDeliveryId([], deliveryId), {
      accepted: true,
      recorded: [deliveryId],
    });
  });

  it('does not record empty string even if it is already present in the log', () => {
    assert.deepEqual(claimDeliveryId([''], ''), {
      accepted: true,
      recorded: [''],
    });
  });

  it('still rejects a non-empty duplicate when an empty string is also in the log', () => {
    assert.deepEqual(claimDeliveryId(['', 'd1'], 'd1'), {
      accepted: false,
      recorded: ['', 'd1'],
    });
  });

  it('appends a non-empty id when the log illegally already contains empty string', () => {
    assert.deepEqual(claimDeliveryId([''], 'd1'), {
      accepted: true,
      recorded: ['', 'd1'],
    });
  });

  it('cap 0 accepts a new id then evicts it immediately', () => {
    assert.deepEqual(claimDeliveryId([], 'd1', 0), {
      accepted: true,
      recorded: [],
    });
  });

  it('cap 0 still rejects a duplicate already in an illegal log', () => {
    assert.deepEqual(claimDeliveryId(['d1'], 'd1', 0), {
      accepted: false,
      recorded: ['d1'],
    });
  });

  it('does not mutate the input recorded array', () => {
    const recorded = ['a'];
    claimDeliveryId(recorded, 'b');
    assert.deepEqual(recorded, ['a']);
  });
});
