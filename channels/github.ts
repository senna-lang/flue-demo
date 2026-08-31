/**
 * GitHub Webhookの検証済み受け口。
 *
 * pull_request(opened / reopened / synchronize) を PrReview エージェントへ
 * dispatch する。deliveryId はアプリ側ログで重複排除する。
 * コメント投稿は tools/review-comment.ts。このモジュールは app.ts からのみ読む。
 */
import { createGitHubChannel } from '@flue/github';
import { dispatch } from '@flue/runtime';
import { PrReview } from '../agents/pr-review.ts';
import { claimDeliveryId } from '../domain/claim-delivery-id.ts';
import { shouldDispatchPullRequest } from '../domain/should-dispatch-pull-request.ts';
import { loadDeliveryIds, saveDeliveryIds } from './delivery-log.ts';

export const channel = createGitHubChannel({
  webhookSecret: process.env.GITHUB_WEBHOOK_SECRET ?? '',


  // Path: /channels/github/webhook
  async webhook({ delivery }) {
    if (delivery.name !== 'pull_request') return undefined;
    if (
      !shouldDispatchPullRequest({
        eventName: delivery.name,
        action: delivery.payload.action,
      })
    ) {
      return undefined;
    }

    const claim = claimDeliveryId(loadDeliveryIds(), delivery.deliveryId);
    if (!claim.accepted) return undefined;
    saveDeliveryIds(claim.recorded);

    const { repository, pull_request, installation } = delivery.payload;
    const prRef = {
      owner: repository.owner.login,
      repo: repository.name,
      issueNumber: pull_request.number,
    };

    await dispatch(PrReview, {
      id: channel.instanceId(prRef),
      // 初回のイベントで一度だけ記録され、以後のdispatchでは無視される。
      initialData: {
        owner: prRef.owner,
        repo: prRef.repo,
        prNumber: prRef.issueNumber,
        headSha: pull_request.head.sha,
        title: pull_request.title,
        openedBy: pull_request.user.login,
      },
      message: {
        kind: 'signal',
        type: `github.pull_request.${delivery.payload.action}`,
        body: pull_request.title,
        attributes: {
          deliveryId: delivery.deliveryId,
          ...(installation === undefined ? {} : { installationId: String(installation.id) }),
          owner: prRef.owner,
          repo: prRef.repo,
          prNumber: String(prRef.issueNumber),
          headSha: pull_request.head.sha,
        },
      },
    });
    return undefined;
  },
});

