# flue-pr-review

Flueの機能網羅を目的にした最小構成のPRレビュー・トリアージエージェント。

## カバーしているFlueの機能

| 機能 | 使っている場所 |
|---|---|
| `useModel` | `agents/pr-review.ts` — レビューを行うモデルの指定 |
| `useSkill` + Markdownスキル | `skills/*/SKILL.md` — トリアージ方針・各チェック基準の知識付与 |
| `useSandbox` (local) | `agents/pr-review.ts` — PRブランチのチェックアウト・テスト実行環境 |
| `useTool` / `defineTool` | `tools/github.ts` — GitHub CLIラッパー（diff取得） |
| `useSubagent` + `task` | `agents/pr-review.ts` — security / style / coverage の3つの委譲先を宣言 |
| `useInitialData` | `agents/pr-review.ts` — webhookが検証したPR情報を受け取る |
| channel (`@flue/github`) | `channels/github.ts` — 署名検証済みのGitHub Webhook受け口 |
| durability | Flueランタイムのデフォルト挙動（`db.ts` で永続化先を指定） |
| ルーティング | `app.ts` で `/agents/pr-review` と `/channels/github` を明示的にマウント |

## 運用形態：PR openedをトリガーに自動起動する

このエージェントは実運用ではPRイベント駆動で動く。`channels/github.ts` が
GitHub Webhookの署名を検証し、`pull_request`（`opened` / `reopened` /
`synchronize`）イベントを `PrReview` エージェントへ `dispatch()` する。
モデルは投稿するコメント本文だけを選び、対象のowner/repo/PR番号は
webhookが検証した `initialData` としてtrusted codeが固定する
（`agents/pr-review.ts` の `useInitialData()`）。

```
GitHub (PR opened) → POST /channels/github/webhook
                       → channel が署名検証・delivery.payload.action を判定
                       → dispatch(PrReview, { id, initialData, message })
                       → PrReview がサンドボックスでcheckout →
                         security/style/coverageの3subagentへ並列委譲 →
                         Octokitでレビューコメント投稿
```

### セットアップ

```bash
npm install
npm run dev   # vite dev でローカルサーバ起動
```

環境変数（`.env`）:

```bash
ANTHROPIC_API_KEY="sk-ant-..."
GITHUB_TOKEN="..."            # Octokitのコメント投稿用
GITHUB_WEBHOOK_SECRET="..."   # GitHub側のWebhook設定と同じ値
```

GitHubリポジトリの Settings → Webhooks で以下を設定する:

- Payload URL: `https://<host>/channels/github/webhook`
- Content type: `application/json`
- Secret: `GITHUB_WEBHOOK_SECRET` と同じ値
- Events: **Pull requests** を購読

ローカルで試す場合は `ngrok http 5173` 等でトンネルを張り、そのURLをWebhookに設定する。

```bash
# webhookを使わずサーバなしで単体実行する場合（initialDataを手動で与える必要があり、
# 現状のCLI直実行フローとは相性が悪い。動作確認はHTTP経由を推奨）
npm run run -- --id local-test --message "review this PR"
```

### 本番運用に向けた注意点（このデモでは未対応）

- **サンドボックスの隔離** — `useSandbox(local(...))` はホストと隔離されていない
  （[Sandboxes](https://flueframework.com/docs/guide/sandboxes/) に "Do not use it as
  an isolation boundary for untrusted requests" と明記）。フォークPRの任意コードを
  自動でcheckout・`npm ci`・テスト実行する構成では、E2B/Daytona等のリモートサンドボックスに
  差し替えるべき。
- **Webhookの重複配信** — `@flue/github` のチャンネルは `deliveryId` を自前でdedupeしない
  （ドキュメントに明記）。冪等性が必要なら `delivery.deliveryId` をアプリ側のストレージで
  記録してからdispatchする。
- **`@flue/github` が固定依存する `hono@4.12.32`** には既知の中程度脆弱性（CORS ReDoS等）が
  あり、`npm audit` で検出される（本体側では修正版が未提供）。このデモではCORSミドルウェアや
  `memo()` を使っていないため実害は低いが、本番導入前に upstream の修正状況を確認すること。

## 設計上のポイント（実装時に確定させた仕様）

このスキャフォールドは当初、一次資料（GitHubリポジトリのAGENTS.md、Cloudflare Blog等）から類推して組んでいたが、
`npm pack @flue/runtime` で取得した実際のパッケージ同梱ドキュメント（`docs/guide/*`, `docs/reference/*`）を
一次資料として参照し、以下の点を確定・修正した。

1. **エージェント関数はレンダー関数であり、手続き的なフローは書けない**
   `'use agent'` を付けたエクスポート関数はターンごとに再レンダリングされ、
   返り値がそのままシステムプロンプトになる（[Agents](https://flueframework.com/docs/guide/building-agents/)）。
   そのため `await getPullRequestDiff(...)` → `await sandbox.shell(...)` → `await Promise.all([...])`
   のような命令的な処理は書けず、`PrReview` の本体は「何を委譲すべきか」を指示する文字列を返すだけになる。
   実際の分岐・並列実行はすべてモデルが判断して行う。

2. **subagent委譲は `useSubagent` + フレームワーク組み込みの `task` ツール**
   ([Subagents](https://flueframework.com/docs/guide/subagents/))。
   `useSkill` はsubagent委譲のプリミティブではない —
   モデルが会話の中で `activate_skill` ツールを呼んで自律的に活性化する「知識」の仕組みであり、
   `input` を渡して戻り値を直接受け取る関数呼び出しではない。
   委譲先（delegate）は非exportの関数として定義し、`useSubagent({ name, description, agent })` で宣言する。
   委譲先の内部で `useSandbox()` / `useModel()` を呼ぶとthrowする（親の環境・モデルを継承するため）。

3. **`useTool` は `defineTool({ name, description, input, run })` のオブジェクト形式**
   ([Tools](https://flueframework.com/docs/guide/tools/))。
   `useTool('name', fn)` という2引数形式は誤りだった。`input` はValibotスキーマ、
   `run` は `{ output?, terminate? }` という結果エンベロープを返す。

4. **モデル指定はスラッシュ区切り** — `anthropic/claude-sonnet-4-6`（コロン区切りは誤り）。

5. **`app.ts` は `new Hono()` + `createAgentRouter(...)` + `export default app`**
   ([Routing](https://flueframework.com/docs/guide/routing/))。
   `createAgentRouter` は `@flue/runtime/routing` からimportする（`@flue/runtime` 本体ではない）。

6. **永続化設定は `flue.config.ts` ではなく `db.ts` に分離する**
   ([Database](https://flueframework.com/docs/guide/database/))。
   `flue.config.ts` は `target` / `app` / `db` のパスなどプロジェクト全体の設定のみを持つ。

7. **パッケージのバージョンは2.0.3（`latest`）** — READMEの旧版が「1.0 Beta」としていたのは誤り。
   `npm view @flue/runtime` で確認済み。

8. **トリガーは `@flue/github` channel + `dispatch()`**
   ([GitHub channel](https://flueframework.com/docs/ecosystem/channels/github/))。
   `createGitHubChannel({ webhookSecret, webhook })` が署名検証を行い、
   `delivery.name` / `delivery.payload.action` で分岐して `dispatch(PrReview, { id, initialData, message })`
   する。対象repo/PR番号を `initialData` として渡し、`useInitialData()` で受け取る設計にすることで、
   モデルが投稿先を選べない（trusted codeが固定する）ようにしている。コメント投稿も同じ理由で
   `gh pr comment`（シェル経由）ではなくOctokitの `defineTool` に切り替えた。

## 次のステップ（批評記事に向けて）

このバージョンは「1回のチェックで完結」する単発フローになっている。
記事の検証タスクとして、「security/style/coverageのいずれかが `fail` の場合、
修正して再チェックを最大N回繰り返す」というループを足してみて、
宣言的モデルでどこまで素直に書けるか・どこで命令的コードに逃げる必要が
出るかを観察するとよい（`usePersistentState` でチェック回数を保持する形になるはず）。
