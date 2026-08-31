/**
 * PRレビューコメント投稿。
 *
 * owner/repo/PR は trusted code が固定する。GITHUB_TOKEN が無いときは
 * GitHub へ送らず dry-run で本文を返す（CLIデモ用）。
 */
import { defineTool } from '@flue/runtime';
import { Octokit } from '@octokit/rest';
import * as v from 'valibot';
import { resolveGithubToken } from './github-auth.ts';

export function postReviewComment(ref: { owner: string; repo: string; prNumber: number }) {
  return defineTool({
    name: 'post_review_comment',
    description: 'このエージェントに紐づくPRにレビューコメントを投稿する。',
    input: v.object({ body: v.pipe(v.string(), v.minLength(1)) }),
    async run({ data }) {
      const token = resolveGithubToken();
      if (!token) {
        return {
          output: {
            dryRun: true,
            commentId: null,
            body: data.body,
          },
        };
      }
      const client = new Octokit({ auth: token });
      const result = await client.rest.issues.createComment({
        owner: ref.owner,
        repo: ref.repo,
        issue_number: ref.prNumber,
        body: data.body,
      });
      return { output: { dryRun: false, commentId: result.data.id, body: data.body } };
    },
  });
}
