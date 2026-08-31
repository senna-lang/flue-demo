/**
 * GitHub Webhook を PrReview へ dispatch するかを決める。
 *
 * pull_request かつ opened / reopened / synchronize のみ許可する。
 * 大文字小文字や前後空白は正規化しない。
 */
const DISPATCH_ACTIONS: Record<string, true> = {
  opened: true,
  reopened: true,
  synchronize: true,
};

export function shouldDispatchPullRequest(input: {
  eventName: string;
  action: string;
}): boolean {
  return input.eventName === 'pull_request' && DISPATCH_ACTIONS[input.action] === true;
}
