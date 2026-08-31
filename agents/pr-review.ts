'use agent';

import {
  type DeliveredMessage,
  useAgentStart,
  useDelivery,
  useInitialData,
  useInstruction,
  useModel,
  usePersistentState,
  useSandbox,
  useSkill,
  useSubagent,
  useTool,
} from '@flue/runtime';
import { local } from '@flue/runtime/node';
import * as v from 'valibot';
import triage from '../skills/triage/SKILL.md';
import securityCheckSkill from '../skills/security-check/SKILL.md';
import styleCheckSkill from '../skills/style-check/SKILL.md';
import coverageCheckSkill from '../skills/coverage-check/SKILL.md';
import { getPullRequestDiff } from '../tools/github.ts';
import { postReviewComment } from '../tools/review-comment.ts';
import { buildPrReviewSystemPrompt } from '../prompts/pr-review-system-prompt.ts';
import {
  type CheckRound,
  decideCheckRound,
  MAX_CHECK_ROUNDS,
} from '../domain/decide-check-round.ts';

const initialData = v.object({
  owner: v.string(),
  repo: v.string(),
  prNumber: v.number(),
  headSha: v.string(),
  title: v.string(),
  openedBy: v.string(),
});

const checkStatus = v.picklist(['pass', 'warn', 'fail']);

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

function signalAttribute(delivery: DeliveredMessage, key: string): string | undefined {
  if (delivery.kind !== 'signal') return undefined;
  const value = delivery.attributes?.[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function PrReview() {
  useModel('deepseek/deepseek-v4-flash');

  const data = useInitialData<v.InferOutput<typeof initialData>>();
  if (!data) throw new Error('このエージェントは channels/github.ts からのdispatchで生成される。');

  const [completedRounds, setCompletedRounds] = usePersistentState('completedRounds', 0);
  const [lastRound, setLastRound] = usePersistentState<CheckRound | null>('lastRound', null);
  const [reviewedHeadSha, setReviewedHeadSha] = usePersistentState<string | null>(
    'reviewedHeadSha',
    null,
  );

  const delivery = useDelivery();
  const incomingHeadSha = signalAttribute(delivery, 'headSha') ?? data.headSha;
  const headChanged = reviewedHeadSha !== null && incomingHeadSha !== reviewedHeadSha;
  const decision = decideCheckRound({
    completedRounds: headChanged ? 0 : completedRounds,
    maxRounds: MAX_CHECK_ROUNDS,
    lastRound: headChanged ? null : lastRound,
  });

  useAgentStart(() => {
    if (headChanged) {
      setCompletedRounds(0);
      setLastRound(null);
    }
    if (incomingHeadSha !== reviewedHeadSha) {
      setReviewedHeadSha(incomingHeadSha);
    }
  });

  useSandbox(local({ cwd: `/tmp/pr-${data.owner}-${data.repo}-${data.prNumber}` }));

  useTool(getPullRequestDiff({ owner: data.owner, repo: data.repo, prNumber: data.prNumber }));
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

  useTool({
    name: 'record_check_round',
    description:
      '3チェックの結果を記録する。fail が残っていて回数が残っていれば retry、そうでなければ stop を返す。',
    input: v.object({
      security: checkStatus,
      style: checkStatus,
      coverage: checkStatus,
    }),
    async run({ data: round }) {
      setLastRound(round);
      let nextCompleted = 0;
      setCompletedRounds((previous) => {
        nextCompleted = previous + 1;
        return nextCompleted;
      });
      return {
        output: decideCheckRound({
          completedRounds: nextCompleted,
          maxRounds: MAX_CHECK_ROUNDS,
          lastRound: round,
        }),
      };
    },
  });
  useInstruction(buildPrReviewSystemPrompt({ decision, prNumber: data.prNumber }));


  const lastRoundSummary = lastRound
    ? `security=${lastRound.security}, style=${lastRound.style}, coverage=${lastRound.coverage}`
    : '未実施';
  const remaining =
    decision.action === 'run' || decision.action === 'retry' ? String(decision.remaining) : '0';

  return `
    ${data.owner}/${data.repo} の PR #${data.prNumber}「${data.title}」
    （${data.openedBy} が作成、head: ${incomingHeadSha}）をレビューせよ。
    チェック進捗: ${headChanged ? 0 : completedRounds}/${MAX_CHECK_ROUNDS} 完了。前回: ${lastRoundSummary}。
    判定: ${decision.action}${decision.action === 'stop' ? `/${decision.reason}` : ''}（残り ${remaining} 回）。
  `;
}

PrReview.initialData = initialData;
