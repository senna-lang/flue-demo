# flue-pr-review

Pull Request をレビューする Flue エージェントのデモ。PRレビューのpromptなど全て簡易的なもの。

## ディレクトリ構成

```text
agents/      Flue エージェント本体。PR レビューの状態と capability を宣言する。
channels/    GitHub Webhook を検証し、レビュー agent へ dispatch する。
domain/      チェック継続・Webhook フィルタ・配信重複排除の純粋なドメインロジック。
prompts/     agent に渡す system prompt と、その契約テスト。
skills/      triage / security / style / coverage のレビュー基準。
tools/       PR diff 取得、コメント投稿、GitHub 認証の adapter。
fixtures/    ローカル実行用の PR 初期データ。

app.ts       Hono のルーティング入口。
db.ts        Flue のローカル SQLite 永続化設定。
flue.config.ts
             Flue の Node.js target 設定。
```
