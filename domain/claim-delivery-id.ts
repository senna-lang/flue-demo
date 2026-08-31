/**
 * GitHub Webhook の deliveryId を冪等に記録する。
 *
 * 空文字はイベント自体は受け付けるが記録しない。
 * 既知の id は拒否する。新規は末尾に追加し、cap を超えたら先頭から捨てる。
 */
export const DEFAULT_DELIVERY_LOG_CAP = 1000;

export type ClaimDeliveryResult = {
  accepted: boolean;
  recorded: string[];
};

export function claimDeliveryId(
  recorded: readonly string[],
  deliveryId: string,
  cap: number = DEFAULT_DELIVERY_LOG_CAP,
): ClaimDeliveryResult {
  if (deliveryId === '') {
    return { accepted: true, recorded: [...recorded] };
  }

  if (recorded.includes(deliveryId)) {
    return { accepted: false, recorded: [...recorded] };
  }

  const next = [...recorded, deliveryId];
  if (next.length > cap) {
    return { accepted: true, recorded: next.slice(next.length - cap) };
  }

  return { accepted: true, recorded: next };
}
