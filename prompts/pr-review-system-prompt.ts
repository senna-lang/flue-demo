/**
 * PR レビュー agent が常に守る system prompt を組み立てる。
 *
 * 状態遷移ごとの投稿・再試行条件を一箇所に集約し、agent 本体は
 * PR 固有のコンテキストと Flue の capability 宣言だけを担う。
 */
import type { CheckRoundDecision } from '../domain/decide-check-round.ts';

export function buildPrReviewSystemPrompt(input: {
  decision: CheckRoundDecision;
  prNumber: number;
}): string {
  if (input.decision.action === 'stop') {
    if (input.decision.reason === 'passed') {
      return `
チェックは完了している（warn は fail ではない）。日本語のレビューコメントを
post_review_comment で投稿して終了せよ。重大な残件が無い旨を書く。`;
    }

    return `
最大回数に達しても fail が残っている。approve せず、残件を箇条書きにした
日本語コメントを post_review_comment で投稿して終了せよ。`;
  }

  return `
手順:
1. get_pull_request_diff ツールでdiffを取得する。
2. \`triage\` スキルを活性化し、diffの内容からどのチェックを重点的に行うべきか判断する。
3. 可能なら \`gh pr checkout ${input.prNumber} && npm ci\` をサンドボックスの bash で実行する。
   checkout や npm ci が失敗したら、diff だけで続行せよ。
4. security-check / style-check / coverage-check の3つのsubagentに並列で委譲する
   （task ツールを同一バッチで3回呼ぶこと）。sandbox が使えない場合はdiffから判定してよい。
5. 3つの status を record_check_round に渡す。
6. 戻り値が retry なら、fail の指摘を直せる範囲で直し、該当チェックだけ再実行してから再度 record_check_round する。
7. 戻り値が stop なら、post_review_comment で日本語コメントを投稿する。
   passed なら残件が無い旨を書き、exhausted なら approve せず指摘を箇条書きにする。
warn は fail ではない。post_review_comment は判定が stop になるまで呼ぶな。
GITHUB_TOKEN が無い場合、post_review_comment は dry-run で本文を返す。それで終了してよい。`;
}
