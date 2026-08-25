/**
 * PrReview — PRレビュー・トリアージエージェント。
 *
 * GitHub Webhook (pull_request: opened/reopened/synchronize) をトリガーに
 * channels/github.ts から dispatch される。対象repo/PR番号はwebhookが
 * 検証した initialData として渡され、モデルはそれを選べない
 * （trusted codeが固定する）。
 *
 * NOTE: エージェント関数はターンごとに再レンダリングされる「命令文を返す
 * 関数」であり、await を含む手続き的フローは書けない。実際の分岐・並列化は
 * すべてモデルが `task` ツール経由で行う（useSubagent の宣言はカタログの
 * 提示にすぎない）。
 *
 * CAUTION: local() サンドボックスはホストと隔離されていない
 * （docs/guide/sandboxes.md 参照）。フォークPRなど信頼できないコードを
 * 自動でcheckout/npm ci/npm testする本番運用では、E2B/Daytona等の
 * リモートサンドボックスに差し替えること。
 */
'use agent';

import { useInitialData, useModel, useSandbox, useSkill, useSubagent, useTool } from '@flue/runtime';
import { local } from '@flue/runtime/node';
import * as v from 'valibot';
import triage from '../skills/triage/SKILL.md';
import securityCheckSkill from '../skills/security-check/SKILL.md';
import styleCheckSkill from '../skills/style-check/SKILL.md';
import coverageCheckSkill from '../skills/coverage-check/SKILL.md';
import { getPullRequestDiff } from '../tools/github.ts';
import { postReviewComment } from '../channels/github.ts';

const initialData = v.object({
  owner: v.string(),
  repo: v.string(),
  prNumber: v.number(),
  headSha: v.string(),
  title: v.string(),
  openedBy: v.string(),
});

function SecurityChecker() {
  useSkill(securityCheckSkill);
  return 'サンドボックス内のPRブランチに対してセキュリティチェックを行い、結果をJSONで返せ。';
}

function StyleChecker() {
  useSkill(styleCheckSkill);
  return 'サンドボックス内のPRブランチに対してスタイルチェックを行い、結果をJSONで返せ。';
}

function CoverageChecker() {
  useSkill(coverageCheckSkill);
  return 'サンドボックス内のPRブランチに対してカバレッジチェックを行い、結果をJSONで返せ。';
}

export function PrReview() {
  useModel('anthropic/claude-sonnet-4-6');

  const data = useInitialData<v.InferOutput<typeof initialData>>();
  if (!data) throw new Error('このエージェントは channels/github.ts からのdispatchで生成される。');

  useSandbox(local({ cwd: `/tmp/pr-${data.owner}-${data.repo}-${data.prNumber}` }));

  useTool(getPullRequestDiff);
  useTool(postReviewComment({ owner: data.owner, repo: data.repo, prNumber: data.prNumber }));
  useSkill(triage);

  useSubagent({
    name: 'security-check',
    description: 'PRブランチのセキュリティリスクを確認する。',
    agent: SecurityChecker,
  });
  useSubagent({
    name: 'style-check',
    description: 'PRブランチのコードスタイルを確認する。',
    agent: StyleChecker,
  });
  useSubagent({
    name: 'coverage-check',
    description: 'PRブランチのテストカバレッジを確認する。',
    agent: CoverageChecker,
  });

  return `
    ${data.owner}/${data.repo} の PR #${data.prNumber}「${data.title}」
    （${data.openedBy} が作成、head: ${data.headSha}）をレビューせよ。手順:
    1. get_pull_request_diff ツールでdiffを取得する。
    2. \`triage\` スキルを活性化し、diffの内容からどのチェックを重点的に行うべきか判断する。
    3. \`gh pr checkout ${data.prNumber} && npm ci\` をサンドボックスの bash で実行する。
    4. security-check / style-check / coverage-check の3つのsubagentに並列で委譲する
       （task ツールを同一バッチで3回呼ぶこと）。
    5. 3つの結果を統合し、重大な問題があれば approve せず指摘事項を箇条書きにした
       日本語のレビューコメントを作成する。
    6. post_review_comment ツールでコメントを投稿する。
  `;
}

PrReview.initialData = initialData;
