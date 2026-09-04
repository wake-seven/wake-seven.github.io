# 現行アーキテクチャ案内

この文書は、実装仕様の一覧ではなく、ソースを読む入口を示すための短い案内です。コース構成・保存形式・画面の詳細はソースを正とし、整合性は `npm run check` で確認します。

## 読む順番

1. `scripts/application-manifest.mjs` — 公開版へ連結するファイルの定義
2. `src/main.mjs` — 開発用ESMの組み立て
3. `src/domain/` — 盤面ルールとソルバー
4. `src/data/` — 問題・文言・クリア後コンテンツ
5. `src/state/` — 状態・保存・進行
6. `src/commands/` — 操作と進行の入口
7. `src/ui/` — 盤面・入力・ダイアログの表示
8. `src/runtime/` — 起動・復元・環境接続

必要な処理を探すときは、上記の責務に対応するソースを確認してください。関数の呼び出し順や問題一覧は、変更で古くなるためこの文書には複製しません。

## 公開境界

公開版で外部から利用する入口は `window.WakeSeven` です。公開APIの詳細は `src/runtime/namespace.js` と各APIの実装を確認してください。

開発時は `src/main.mjs` からESMを組み立て、公開時は `scripts/build-index.mjs` が公開用ソースを単体の `index.html` に連結します。ユーザーが実行するのは生成された `index.html` です。

## バージョン

公開版の識別値は `src/runtime/runtime.js` の `APP_VERSION` を定義元とします。形式と更新時の検査は `scripts/check-version.mjs` に従います。Aboutダイアログと生成版の値はビルド時にこの定義から反映されるため、現在値を文書へ重複記載しません。

## ソース整形

整形方針の正本は `scripts/source-format-policy.json` です。`scripts/check-source-format.mjs` がこの設定を読み、JavaScriptの制御コードを監査します。CSSは1ブロック1行を維持し、SVG・データ・文言は整形対象外です。方針の詳細をMarkdownへ複製しないことで、実装と文書の不一致を防ぎます。

## 変更時の確認

通常の変更では、最終ゲートを1回実行します。

```sh
npm run check
```

`npm run check` は `check:gate` の別名です。普段の変更確認は `npm run check:auto` を使い、変更ファイルから fast / affected / full を自動選択します。`scripts/check-all.mjs` が最初に公開版をビルドし、その後に定義順で検査を一度ずつ実行します。利用者向けの表示とレポートは、手順を「構造」「状態」「進行」「ブラウザ」の4領域に集約します。途中で失敗した場合は後続を実行せず、`build/report/check-gate.json` に失敗した領域・検査、終了コード、標準出力・標準エラー、所要時間、詳細レポートへのリンクを保存します。個別の検査が必要な場合だけ `package.json` と `scripts/check-*.mjs` を確認してください。

開発時の固定入口は `scripts/development-entrypoints.json` にまとめています。`npm run trace:entry -- progression`（または `state` / `clear-flow`）で、主要ソース・入口シンボル・関連する状態/DOM/E2E/フローレポートを一覧できます。変更対象を確認するときは `npm run trace:impact -- <変更ファイル>` を使い、生成された `build/report/change-impact.json` から影響範囲を確認してから `npm run check:gate` を実行します。入口の定義自体は `npm run check:development-entrypoints` で検査され、詳細な関数一覧は生成済みtraceレポートを正とします。

progressionの外部入口を調べる場合は `npm run trace:progression` を使います。`start` / `complete` / `openDialog` / `advance` ごとに、定義・呼び出し元・状態読み書き・DOM/イベント・遷移・E2E件数・公開セクションを `build/report/progression-trace.json` にまとめます。

検査を領域単位で実行する公開入口は `check:structure`（構造）、`check:state`（状態）、`check:flows`（進行）、`check:browser`（ブラウザ）です。各入口は `scripts/check-entry-groups.json` で内部検査と対応付けています。個別の `check:*` は内部検査として残し、通常は領域入口または `npm run check` を使用してください。`check:script-audit` は `audit:scripts` への移行前のlegacy aliasで、新規利用は禁止です。削除条件は同JSONに記録します。

公開版の識別子監査は `npm run check:public-symbols` で実行します。候補は実未定義、ローカル/スコープ、オブジェクトキー、ブラウザAPI、公開名前空間、設定/データに分類され、実未定義だけが失敗になります。候補数と分類別上限は `scripts/public-symbols-budget.json` で管理し、分類済み候補の増加も検査で止めます。詳細は `build/report/public-symbols.json` を参照してください。

最終ゲートには、公開マニフェストの依存順・公開シンボル・イベント配線・導線契約・実Chrome E2Eを含みます。`npm run build` を別に実行する必要はありません。`npm run build` は生成物だけを確認したい場合に使います。

検査の実行区分と時間予算は `scripts/check-pipeline.json` を正とします。`build-required` は公開物生成直後、`normal-check` は通常変更、`large-change-only` は大規模変更時の詳細監査向けです。ただし `npm run check:gate` は品質を落とさないため全区分を実行します。実測値は `build/report/check-runtime.json`、同一ゲートの入力基準は `build/report/check-context.json` で確認できます。検査スクリプトを追加・改名した場合は、同JSONへ区分を追加しないとゲートが失敗します。

共有状態の直接参照は `npm run check:global-access` で監査します。`build/report/global-access.json` に、参照を `gateway`（入口経由）、`owner`（状態所有者）、`needs-migration`（個別移行候補）へ分類し、読み取り・書き換え別の件数と前回レポートとの差分を出力します。候補は一括置換せず、対応するE2Eを先に確認します。

navigation/dialogの移行途中参照は `scripts/state-access-exceptions.json` の `temporaryExceptions` で期限と理由を管理します。`npm run check:state-access-policy` は新規temporary参照、期限メタデータ漏れ、期限超過を失敗にします。状態所有者（ownerFiles）の内部参照は期限対象外です。期限を延長する場合は、移行理由を更新してから明示的にポリシーを再生成します。

進行処理の追跡は `build/report/progression-responsibility.json` を入口にします。シンボルを責務（状態・遷移・表示など）と処理順（`entry → state-decision → transition → render`）の両方で分類し、ファイルごとの責務と複数責務シンボルを自動生成します。関数一覧を手書きで複製せず、`npm run trace:generate` と `npm run check:progression-responsibility` でソースとの差分を検査します。

公開版のサイズ比較や基準値の更新手順も、固定値を文書へ転記せず、対応する `scripts/` の検査結果を正とします。

## 互換層・薄い入口の棚卸し

薄いモジュールや一度しか呼ばれない入口は、参照回数だけで削除しません。`npm run check:compat-boundaries` が公開マニフェスト、開発用ESM入口、ソース・検査からの参照を確認し、保持理由または削除候補を `build/report/compat-boundary-audit.json` に生成します。削除候補が出た場合も、公開版をビルドしてE2Eを通す変更として個別に判断します。

監査レポートの各候補には、目的（`purpose`）、参照元（`referenceSources`）、削除条件（`removalCondition`）、次回再評価日（`reassessOn`）を自動記録します。再評価日は監査実行日から90日後です。`npm run check:unused-files` のレビュー一覧にも同じ情報を複製し、候補の判断を別の手書き台帳に分散させません。安全な削除候補がない場合も `safeToDelete: 0` として明示します。

## 大規模な構造変更の停止基準

今後は機能改修を優先し、`progression` を含む大規模な分割・再設計は通常の作業として続けません。構造変更を行うのは、次の両方を先に用意できる場合だけです。

- 変更対象の主要導線を実ブラウザE2Eで固定している
- 変更前後で、改修時間・回帰・読みやすさの比較結果を確認できる

分割後にファイル数が増えただけで、実際の改修が速くならない場合は、その変更を中止または統合します。`npm run check:refactor-policy` は、分割の細切れ化と確認経路の欠落を軽く監査します。機能コードの正しさは、既存のブラウザE2Eと各 `check-*` の結果で判断します。

## 意図的に分けているもの

盤面の動的SVG、pointer入力、逐次アニメーションなど、DOMや時間に密接な処理は `src/ui/` と操作・command側に置きます。固定UIの骨格はHTMLテンプレート、表示文言はデータ、ゲームの状態と処理はJavaScriptで管理します。

## 過去資料

`docs/archive/` にある資料は履歴であり、現行仕様の根拠やビルド入力ではありません。現在の動作を調べる場合は、必ずソースと `npm run check` を確認してください。
