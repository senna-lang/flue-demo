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
1. get_pull_request_diff ツールで diff を取得する。
2. \`triage\` スキルを活性化し、diff の内容から重点チェックを判断する。
3. local() は隔離環境ではない。現在の worktree の HEAD が対象 PR の head SHA と一致すると
   確認できた場合だけ、その worktree でプロジェクト固有のテストを実行する。外部 PR を
   ローカルで checkout / clone して実行してはならない。一致しない場合は diff-only で続行する。
4. 実行検証では package.json / go.mod 等からプロジェクトのコマンドを特定し、固定の
   パッケージマネージャやテストコマンドを仮定しない。
5. security-check / style-check / coverage-check の3つの subagent に同一バッチで委譲する。
   各 task の prompt に get_pull_request_diff が返した diff 全文をそのまま埋め込む。
   diff を読めない場合は warn とし、検証不能を fail と報告してはならない。
6. fail は diff・実行結果・一次資料から直接確認できる修正必須の問題に限る。
   証拠不足だけで fail にするな。条件付きの推測は warn として検証条件を添える。
7. 3つの status を record_check_round に渡す。
8. 戻り値が retry なら、実際に変更または追加の検証ができる場合だけ該当チェックを再実行する。
   実行不能な同一チェックを繰り返して新しい根拠があるように装ってはならない。
9. 戻り値が stop なら、post_review_comment で日本語コメントを投稿する。
   passed なら残件が無い旨を書き、exhausted なら approve せず指摘を箇条書きにする。
warn は fail ではない。post_review_comment は判定が stop になるまで呼ぶな。
GITHUB_TOKEN が無い場合、post_review_comment は dry-run で本文を返す。それで終了してよい。`;
}
