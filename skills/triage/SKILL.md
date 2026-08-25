---
name: triage
description: PRの差分を読み、security/style/coverageのどのチェックを重点的に行うべきか判断する。PRレビューを開始するときに使う。
---

# PRトリアージ

差分（diff）を読み、このPRに対してどのチェックを重点的に行うべきかを判断する。

## 判断基準

- `package.json` や lockfile に変更がある → security-check を重点的に
- UIコンポーネント (`*.tsx`, `*.css`) の変更が中心 → style-check を重点的に
- テストファイル (`*.test.ts`) の追加・削除がある → coverage-check を重点的に
- 上記いずれにも当てはまらない小規模な変更 → 3つとも軽めに流す

## 出力形式

以下のJSON形式で返すこと:

```json
{
  "focus": ["security" | "style" | "coverage", ...],
  "reasoning": "判断理由を一文で"
}
```
