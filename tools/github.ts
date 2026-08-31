/**
 * GitHub CLI (`gh`) をラップしたツール定義。
 *
 * owner/repo は trusted code が固定する。コメント投稿は
 * channels/github.ts の Octokit ベースの postReviewComment(ref) を使う。
 */
import { execFileSync } from 'node:child_process';
import { defineTool } from '@flue/runtime';
import * as v from 'valibot';
import { githubCliEnv } from './github-auth.ts';

export function getPullRequestDiff(ref: { owner: string; repo: string; prNumber: number }) {
  return defineTool({
    name: 'get_pull_request_diff',
    description: 'このエージェントに紐づくPRのdiffを取得する。',
    input: v.object({}),
    async run() {
      const diff = execFileSync(
        'gh',
        ['pr', 'diff', String(ref.prNumber), '--repo', `${ref.owner}/${ref.repo}`],
        { encoding: 'utf-8', env: githubCliEnv() },
      );
      return { output: diff };
    },
  });
}
