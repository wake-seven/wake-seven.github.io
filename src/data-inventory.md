# データ分割候補インベントリ

この文書は、データと処理をさらに分離する際の調査メモです。今回は挙動を変えないため、コードの移動は行っていません。公開物は引き続き `scripts/build-index.mjs` で生成する単一の `index.html` です。

## 現在の配置

### `src/core-data.js`

| 範囲 | 内容 | 移動候補 | 注意点 |
| --- | --- | --- | --- |
| 1–104 | 盤面ジオメトリ、三角形生成、3進エンコード、ソルバー | `board-core-data.js` / `solver.js` | `STAGES` の生成がこのソルバーに依存するため、先に移動するときはビルド順を固定する |
| 105–121 | 問題数・開始位置・巻のサイズ | `course-constants.js` | `clearContentKey`、進行UI、速解き定義が参照する共有契約。重複定義を作らない |
| 125–194 | 入門・基本・チュートリアル・2くるり問題の初期データと並び順 | `data-primary-stages.js` | `STAGES` を後段で `splice` / `push` するため、単純なデータファイル移動ではなく構築処理との境界を先に決める |
| 227–290 | 未使用の雑学・クリアエントリ | `data-drafts.js` | 現在の実行経路から参照されないことを維持し、削除ではなく保管データとして移動する |
| 298–432 | 発展・修行・名人の問題生成と並び替え | `stage-pipeline.js` | `STAGES` と `EXTRA_STAGES` の in-place mutation があり、最も移動リスクが高い。まず純粋関数化が必要 |
| 434–531 | 悟り73問の候補生成、旧並び、移行用並び、最終並び | `data-satori.js` + `satori-ordering.js` | `LEGACY_*` / `*_OPTIMAL_*` は保存済み進行の移行に使うため、現行データと同時に分離する。順序と `SATORI_ORDER_VERSION` を固定する |
| 195–225, 532 | メッセージカタログの入口、キー変換、ロケール解決 | `message-data-adapter.js` | `CLEAR_CONTENT` 本体は既に `data-clear-content.js`。ここはデータ本体ではなく共通アダプターなので処理側に残す選択肢もある |

## 他ファイルにあるデータ候補

### 盤面クイズ

- `src/progression-ui.js:967–975` の `BOARD_QUIZ_COPY` は翻訳データです。
- クイズの状態・出題・描画・イベントは同ファイル内に続くため、`BOARD_QUIZ_COPY` だけを `data-board-quiz.js` に移すのが低リスクです。
- 追加移動時は `BOARD_QUIZ_COPY` の宣言がクイズ処理より先に生成されることを `scripts/check-state.mjs` で検査します。

### SVG・挿絵

- `src/board-ui.js:350–370` の `TRAINING_WELCOME_ART_SVG` は、表示専用の固定SVGデータです。
- `src/progression-ui.js:144–205` の称号・報酬バッジSVGは、データとテンプレート処理が混在しています。まず固定パス文字列だけを `data-assets.js` に移す候補です。
- `src/index.template.html:1310` 付近のSVG `<defs>` はHTMLテンプレートの構造に直結するため、現段階では移動対象外です。
- `tipArt()` で参照する挿絵識別子と描画関数の対応表は、識別子をデータ、描画を処理として分けられます。ただし既存のクリアメッセージとの対応を同時に検査する必要があります。

## 推奨する次回の移動順

1. `BOARD_QUIZ_COPY` を `data-board-quiz.js` へ移動する（データのみ、低リスク）。
2. `TRAINING_WELCOME_ART_SVG` など固定SVGを `data-assets.js` へ移動する（表示結果をブラウザで確認）。
3. `SATORI_STAGES` の最終配列と並び替え処理を分離する（`SATORI_ORDER_VERSION` と移行用配列の静的検査を追加）。
4. `STAGES` / `EXTRA_STAGES` の構築を純粋な段階関数へ整理してから、問題データを分離する。

## 移動時の不変条件

- `STAGES.length`、`EXTRA_STAGES.length`、`SATORI_STAGES.length` は変更しない。
- `SATORI_STAGES` の各 state の順序と `SATORI_ORDER_VERSION` は変更しない。
- `STAGES.splice(...)` と `EXTRA_STAGES.push(...)` の順序を変更しない。
- `CLEAR_CONTENT` のキー、`BOARD_QUIZ_COPY` の言語キー、挿絵識別子を欠落させない。
- 生成後の `index.html` における宣言順を `scripts/build-index.mjs` で固定する。

