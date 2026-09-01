# 状態境界・未使用候補監査

最終確認日: 2026-09-01

`npm run check:compat-e2e` は、宣言と参照が一度だけの関数を機械的に抽出したうえで、公開境界・初期化入口を通常の未使用候補から分類除外します。削除は自動化せず、通常候補もレビュー対象として扱います。

| 候補 | 分類 | 理由 |
| --- | --- | --- |
| `src/main.mjs:createDevelopmentRuntime` | 公開エントリーポイント | 開発用ESMの公開エントリーポイント。`check-esm`と`build-esm`から利用する。 |
| `src/runtime/namespace.js:attachWakeSevenNamespace` | 公開名前空間初期化 | 公開版の`window.WakeSeven` APIを読み込み時に初期化する。 |
| `src/state/game-state.js:attachWakeSevenState` | 公開状態初期化 | 公開版の`WakeSevenState` APIを読み込み時に初期化する。 |
| `src/state/progression-policy.js:attachWakeSevenProgression` | 公開進行初期化 | 公開版の`WakeSevenProgression` APIを読み込み時に初期化する。 |

## 公開API契約

公開版では、外部から利用する入口を `window.WakeSeven` に限定する。各領域の責務と公開メンバーは次の通り。

| API | 責務 | 公開メンバー |
| --- | --- | --- |
| `WakeSeven.state` | 現在の状態の参照・保存・設定更新 | `current`, `navigation`, `settings`, `progress`, `persist`, `updateNavigation`, `updateSettings` |
| `WakeSeven.progression` | 進行ポリシーと現在コンテキストの参照 | `definition`, `context`, `uiPolicy` |
| `WakeSeven.messages` | クリア後メッセージ一覧の表示・参照 | `openReview`, `renderReview`, `entries` |
| `WakeSeven.speed` | 速解きの時計制御と定義参照 | `pause`, `startClock`, `pauseClock`, `definitions` |

各APIオブジェクトと名前空間は `Object.freeze` で固定する。内部のグローバル関数やDOM要素を新たに公開APIへ追加しない。変更時はこの表と `check:compat-e2e` の契約検査を同時に更新する。

## 解消済みの未使用候補

- `src/ui/svg.js:svgClear` — 実行時参照がないため削除。
- `src/ui/template.js:mountTemplate` — 実行時参照がないため削除。
- `src/ui/template.js:cloneTemplate` — `mountTemplate` 専用で、他の実行時参照がないため併せて削除。

## 導線監査

`npm run check:compat-e2e` は、実プレイ導線を支えるDOM・イベント接続・状態遷移の静的契約を検査する。

- 開始ダイアログの開始操作がチュートリアル初期化へ接続されている
- チュートリアルの段階状態とリセット操作が存在する
- 盤面の pointer 操作と `rollOnce` / `paint()` が接続されている
- 通常ステージ、クリア後、速解きの主要DOMと遷移関数が残っている
- 速解きIDが正式ID（`training9` / `training18` / `mastery27` / `satori73`）だけで構成されている

この監査はDOM構造、イベント接続、正式IDの使用、公開APIの最低限の形状を静的に確認する。実ブラウザのクリック・スワイプ確認は、内蔵ブラウザで別途実施する。公開境界として分類された初期化関数と下書きメッセージは、この検査では削除しない。

## 互換負債の解消

過去ユーザーの保存データ互換は提供しない方針とし、旧保存形式・旧速解き解放モデル・旧悟り並び順の移行処理を削除した。現行の状態は `wake7-state-vnext` のみを読み書きする。

旧モードフラグや旧速解きIDはゲーム状態の判定に使用しない。`freeMode` / `customMode` / `speedMode` は現行DOM ID・翻訳キーとしてのみ残る。`check:compat-e2e` は移行関数、旧並び順識別子、旧解放モデル識別子が再導入されていないことを検査する。

## UI一時状態の最終監査

盤面補助表示、チュートリアル導線、入門・学園のウェルカム演出、盤面到着演出のライフサイクルタイマーは、`src/ui/ui-context.js` の演出ID単位API（`setUiEffectTimer` / `setUiEffectInterval` / `clearUiEffectTimers`）へ集約した。これらは永続状態へ保存しない。連続ダイアログの開閉も、連鎖ダイアログ本体では `setDialogOpenState()` を経由する。演出を停止する際は演出ID全体をキャンセルするため、二重cleanupでも対象が空になり安全に終了する。

残る直接の `hidden` 操作は、同一レンダリング処理内で複数の子要素を同時に表示制御する画面状態（クリア結果、設定項目、メッセージ本文、クイズ部品など）である。これらを一括してダイアログAPIへ置き換えると、子要素の表示順・フォーカス・既存のcleanup順序を変えるため、現時点ではUI rendererの責務として保持する。`setDialogOpenState()` は単一ダイアログの外枠開閉に限定する。

`progression-hints.js` の短時間ハイライト、`progression-ui.js` の習熟盤面タイマー、各演出内部の遅延cleanupは、同一演出が複数要素を個別に破棄するため、既存の世代・Map単位のcleanupを維持している。永続gameStateへ混入しないことを確認済みで、今後は演出単位のcancel APIへ段階的に移行する。

速解き完走後の遅延遷移とmakerボタン解放遅延も、それぞれ `clear-transition` / `maker-reveal` の演出IDへ移行した。盤面リセット時にはclear演出をキャンセルし、`resetBoardUiContext()` が残存する盤面アニメーションクラスを除去する。称号・クリアの速度や見た目はCSSアニメーションが担っており、JavaScriptタイマーではないためUIコンテキストへ移行しない。

`check-ui-effects.mjs` は、clear/makerの直接タイマーハンドルが再導入されていないこと、代表的なキャンセル経路と盤面クラスcleanupが残っていることを回帰監査する。

固定ダイアログの閉じる操作（about/settings）は `setDialogOpenState()` を使う。`app-events.js` に残る背景クリック、連続ダイアログの遷移、pointer中の即時表示は、イベントの判定とcleanupを同じ順序で扱う必要があるため直接処理を保持する。`progression-ui.js` の複数部品を同時に切り替えるクリア・称号・クイズ表示も、状態判定とrenderer更新が結合しており、今回の細部整理では移動しない。

その後の分離として、クリア後チップの固定テキスト・詳細リンク欄を `progression-render.js:renderClearTipHeader()` へ移した。表示モデル（本文、リンク表示、リンク先、ラベル）の算出は `progression-ui.js` に残し、rendererはDOM更新だけを担当する。動的SVG、クイズ選択状態、称号の複数要素更新は引き続き対象外とする。

称号アニメーションは、通常の序・破・急および一周目の文字称号を `masterRankSeal 1.05s ease-out both` に統一済み。`無心`・`覚者`を含むフレーム型称号は既存の `.72s` 演出を変更しない。`check-ui-effects.mjs` でこのduration/easing/fill-mode契約を監査する。クリア演出の速度は盤面WAAPI/CSSの既存仕様を維持する。

## CSS演出の最終監査

2026-09-01に称号・クリア演出のCSSを全件確認した。通常称号の開始状態は `opacity:0; transform:translateY(-0.375rem)`、終了状態は `opacity:1; transform:translateY(0)` で、`1.05s ease-out both` に統一されている。これは修了演出を基準にした現在の仕様と一致するため、今回の段階では数値を変更しない。

変更しなかった `.rank-frame-seal.animate`（`.72s`）は、無心・覚者の大きなSVGフレーム用であり、通常称号と同じtransformを適用すると表示領域が二段階に膨らむ既知の問題を再発させる。`masterSeal` の円形演出と `masterSpark` の装飾も別系統で、通常称号の見え方を変更せずに統一する対象ではない。クリア演出のWAAPIはJavaScriptの完了順序と結び付いているため、CSSのduration変更は行わない。
