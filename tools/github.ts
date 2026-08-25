/**
 * GitHub CLI (`gh`) をラップしたツール定義。
 *
 * defineTool() で定義し、エージェント側で useTool(...) してマウントする。
 * `gh` はサンドボックス（ここでは local()）内で認証済みである前提。
 * コメント投稿は channels/github.ts の Octokit ベースの
 * postReviewComment(ref) を使う（trusted codeが投稿先repo/PRを固定するため）。
 */
import { defineTool } from '@flue/runtime';
import * as v from 'valibot';

export const getPullRequestDiff = defineTool({
  name: 'get_pull_request_diff',
  description: '指定したPR番号のdiffを取得する。',
  input: v.object({ prNumber: v.number() }),
  async run({ data }) {
    const { execSync } = await import('node:child_process');
    const diff = execSync(`gh pr diff ${data.prNumber}`, { encoding: 'utf-8' });
    return { output: diff };
  },
});
