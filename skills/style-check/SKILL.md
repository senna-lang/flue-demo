---
name: style-check
description: PRブランチのコードスタイル（lint、命名規則、ファイルサイズ）を確認する。style-check subagentに委譲されたときに使う。
---

# スタイルチェック

サンドボックス内で以下を確認する。

## チェック項目

1. `npm run lint` を実行し、エラー・警告を収集
2. 命名規則（camelCase関数名、PascalCaseコンポーネント名）からの逸脱がないか
3. 1ファイルあたりの変更行数が300行を超える場合、分割を提案

## 出力形式

```json
{
  "status": "pass" | "warn" | "fail",
  "findings": ["具体的な指摘事項", ...]
}
```
