---
name: coverage-check
description: PRブランチのテストカバレッジ（未テストファイル、カバレッジ増減）を確認する。coverage-check subagentに委譲されたときに使う。
---

# カバレッジチェック

サンドボックス内で以下を確認する。

## チェック項目

1. `npm run test -- --coverage` を実行
2. 変更されたファイルのうち、テストが追加されていないものを列挙
3. カバレッジがベースブランチ比で低下していないか確認

## 出力形式

```json
{
  "status": "pass" | "warn" | "fail",
  "coverage_delta": "+2.3%" | "-1.1%" | "0%",
  "findings": ["具体的な指摘事項", ...]
}
```
