---
name: security-check
description: PRブランチのセキュリティリスク（脆弱性、シークレット混入、サプライチェーンリスク）を確認する。security-check subagentに委譲されたときに使う。
---

# セキュリティチェック

サンドボックス内のPRブランチに対して以下を確認する。

## チェック項目

1. `npm audit --production` を実行し、high/critical脆弱性がないか確認
2. 差分中にAPIキー・トークンらしき文字列（`sk-`, `AKIA`, 32文字以上のhex文字列など）が
   混入していないかgrepで確認
3. 新規追加された依存パッケージがある場合、ダウンロード数や最終更新日から
   サプライチェーンリスクを簡易評価

## 出力形式

```json
{
  "status": "pass" | "warn" | "fail",
  "findings": ["具体的な指摘事項", ...]
}
```
