/**
 * GitHub Webhookの検証済み受け口。
 *
 * pull_request(opened / reopened / synchronize) を PrReview エージェントへ
 * dispatch する。コメント投稿はOctokitのtoolとして提供し、モデルは本文だけ
 * 選び、対象repo/PR番号はtrusted codeが固定する。
 */
import { createGitHubChannel } from '@flue/github';
import { defineTool, dispatch } from '@flue/runtime';
import { Octokit } from '@octokit/rest';
import * as v from 'valibot';
import { PrReview } from '../agents/pr-review.ts';

export const client = new Octokit({ auth: process.env.GITHUB_TOKEN });

export const channel = createGitHubChannel({
  webhookSecret: process.env.GITHUB_WEBHOOK_SECRET!,

  // Path: /channels/github/webhook
  async webhook({ delivery }) {
    if (delivery.name !== 'pull_request') return undefined;
    if (!['opened', 'reopened', 'synchronize'].includes(delivery.payload.action)) return undefined;

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
        },
      },
    });
    return undefined;
  },
});

export function postReviewComment(ref: { owner: string; repo: string; prNumber: number }) {
  return defineTool({
    name: 'post_review_comment',
    description: 'このエージェントに紐づくPRにレビューコメントを投稿する。',
    input: v.object({ body: v.pipe(v.string(), v.minLength(1)) }),
    async run({ data }) {
      const result = await client.rest.issues.createComment({
        owner: ref.owner,
        repo: ref.repo,
        issue_number: ref.prNumber,
        body: data.body,
      });
      return { output: { commentId: result.data.id } };
    },
  });
}
