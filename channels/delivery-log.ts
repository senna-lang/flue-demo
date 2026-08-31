/**
 * Webhook deliveryId の永続ログ。
 *
 * @flue/github は重複配信を弾かないため、dispatch 前にここへ記録する。
 * プロセス再起動後も効かせるため .flue/delivery-ids.json に書く。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const PATH = './.flue/delivery-ids.json';

export function loadDeliveryIds(): string[] {
  try {
    const parsed: unknown = JSON.parse(readFileSync(PATH, 'utf8'));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => typeof entry === 'string');
  } catch {
    return [];
  }
}

export function saveDeliveryIds(recorded: readonly string[]): void {
  mkdirSync(dirname(PATH), { recursive: true });
  writeFileSync(PATH, JSON.stringify(recorded), 'utf8');
}
