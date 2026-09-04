# 現行アーキテクチャ案内

この文書は、実装仕様の一覧ではなく、ソースを読む入口と責務の境界を示す短い案内です。動作・件数・問題一覧はソースと検査結果を正とし、ここへ複製しません。

## ソースを読む順番

1. `scripts/application-manifest.mjs` — 公開版へ連結するファイル
2. `src/main.mjs` — 開発用ESMの組み立て
3. `src/domain/` — 盤面ルールとソルバー
4. `src/data/` — 問題・文言・クリア後コンテンツ
5. `src/state/` — 状態・保存・進行
6. `src/commands/` — 操作と進行の入口
7. `src/ui/` — 盤面・入力・ダイアログ・演出
8. `src/runtime/` — 起動・復元・環境接続

## 層の役割

```text
data → domain → commands → state → ui
                         runtime（起動・復元・環境接続）
```

- `domain` はDOM・保存・表示に依存しない盤面ルールを持つ
- `state` は共有状態と保存・復元を所有する
- `commands` は状態変更の入口を提供する
- `ui` は状態を表示し、入力をcommandsへ渡す
- `runtime` は起動順、外部環境、公開APIを接続する

## 公開境界と配布

外部公開APIは `window.WakeSeven` に限定します。開発時は `src/main.mjs` からESMを組み立て、公開時は `scripts/build-index.mjs` が自己完結した単体 `index.html` を生成します。公開物を直接編集しません。

## 状態・ダイアログ・アニメーションの境界

- 進行状態の判定と遷移は `state` / `commands` / `progression-*` が担当する
- ダイアログの表示・復元は `message` と `progression-dialogs` が担当する
- クリア後の順序は `progression-clear-flow` が担当する
- pointer座標の解釈は `board-interaction` が担当する
- 回転セッション、一時リソース、cleanupは `board-animation` が担当する
- SVGの描画順は盤面rendererのAPIで管理する
- アニメーションは進行・保存状態を直接変更しない

動的SVG、pointer入力、逐次アニメーションは、DOMと時間に密接なため無理に汎用化しません。固定UIの骨格はHTMLテンプレート、表示文言はデータ、ゲームの状態と処理はJavaScriptで管理します。

## 修正時の最短入口

```text
盤面操作・重なり順       → src/ui/board-interaction.js / board-animation.js / board-ui.js
クリア後の遷移           → src/ui/progression-clear-flow.js
ダイアログ・メッセージ   → src/ui/message.js / progression-dialogs.js
保存・復元               → src/state/ / src/runtime/
進行・速解き             → src/state/progression-policy.js / src/commands/
```

入口や影響範囲を調べるときは `npm run trace:entry -- <name>`、`npm run trace:impact -- <file>`、`npm run trace:progression` を使います。

## 大規模な構造変更の停止基準

大規模な分割・統合は、先に主要導線のブラウザE2Eを通し、失敗時に原因を特定できる最小の変更単位を作ってから進めます。`progression-ui.js`の責務予算を超える分割や、公開境界・状態所有者を変える変更は、対応する検査と影響レポートを追加できない限り停止します。変更後は `npm run check:gate` を通過するまで次の構造変更を始めません。

## 検証入口

- 通常の変更確認：`npm run check:auto`
- 最終ゲート：`npm run check`（`check:gate`）
- 領域別確認：`check:structure` / `check:state` / `check:flows` / `check:browser`
- 整形方針の正本：`scripts/source-format-policy.json`
- 検査の対応付け：`scripts/check-pipeline.json`、`scripts/check-profiles.json`

失敗時の詳細は `build/report/check-gate.json` と各検査レポートを確認します。個別の検査仕様は `scripts/check-*.mjs` と対応するJSONを正とします。

## バージョン

公開版の識別値は `src/runtime/runtime.js` の `APP_VERSION` を定義元とします。`npm run build` が生成後にバージョンを検証し、Aboutダイアログと公開版へ反映します。

