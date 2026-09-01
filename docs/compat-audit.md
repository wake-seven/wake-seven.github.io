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

## 公開初期化順序

公開版は状態API、進行ポリシー、アプリケーション本体、公開名前空間の順に初期化する。`scripts/application-manifest.mjs` と `check:compat-e2e` でこの順序を監査する。各attach関数は既存の公開オブジェクトがある場合に再初期化を行わず、重複読込で外部参照を差し替えない。公開境界は最後の `WakeSeven` 名前空間だけで、状態・進行の内部APIはその依存先として利用する。

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

チュートリアルの巻き戻しは、指を離した時点の角度から初期位置へ直接戻す。中間の120度位置を経由しないことを `check-ui-effects` で監査する。

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

pointer操作中の選択・回転・hover・不正操作フィードバック用クラスは `setBoardTransientClass()` 経由へ統一した。`drag`、`busy`、`boardTouchActive`、選択タイルは既存の専用APIを使用する。操作判定、盤面command、アニメーションの順序は変更していない。動的に生成したタイル個別のflashクラスは即時フィードバックのため、操作イベント内に保持する。

称号アニメーションは、通常の序・破・急および一周目の文字称号を `masterRankSeal 1.05s ease-out both` に統一済み。`無心`・`覚者`を含むフレーム型称号は既存の `.72s` 演出を変更しない。`check-ui-effects.mjs` でこのduration/easing/fill-mode契約を監査する。クリア演出の速度は盤面WAAPI/CSSの既存仕様を維持する。

## CSS演出の最終監査

2026-09-01に称号・クリア演出のCSSを全件確認した。通常称号の開始状態は `opacity:0; transform:translateY(-0.375rem)`、終了状態は `opacity:1; transform:translateY(0)` で、`1.05s ease-out both` に統一されている。これは修了演出を基準にした現在の仕様と一致するため、今回の段階では数値を変更しない。

変更しなかった `.rank-frame-seal.animate`（`.72s`）は、無心・覚者の大きなSVGフレーム用であり、通常称号と同じtransformを適用すると表示領域が二段階に膨らむ既知の問題を再発させる。`masterSeal` の円形演出と `masterSpark` の装飾も別系統で、通常称号の見え方を変更せずに統一する対象ではない。クリア演出のWAAPIはJavaScriptの完了順序と結び付いているため、CSSのduration変更は行わない。
盤面復元経路の監査では、`replaceBoardState()` の呼び出しは `replaceBoardStateCommand()` への薄いラッパーに統一され、低レベルの `ori` / `spin` / `tileEls` 書き込みは `src/commands/board-commands.js` に限定されていることを確認した。保存盤面、makerリセット、undo、free/custom復元はいずれもこの境界を通る。動的SVGの生成とpointer直後の表示は対象外として保持する。

## 動的SVG・pointer即時フィードバック最終監査

動的SVG生成は、`buildBoard()` の盤面初期化、`animateGroupedSwipe()` のpointer座標に応じた3枚の逐次回転、`animateUndoSwipe()` の履歴復元アニメーション、各種ガイド盤面の生成に分類される。前者の初期化とガイド表示は既存renderer/command境界で呼び出しを分けており、後二者はpointer座標・現在のdrag・回転中のDOM順序・完了callbackに依存するため、描画だけを別rendererへ移すと操作順序が変わる。今回は保持する。

回転軸の補助線生成は `board-render.js:renderAxisGuide()` へ分離した。`board-ui.js` は既存の表示条件と座標データを渡し、rendererがSVG要素だけを生成する。盤面状態・pointer判定・イベント処理はrendererへ渡さない。

クリア後の形レッスンは `progression-ui.js` が状態モデル（盤面状態・形・発展/基本区分）を算出し、`progression-render.js:renderClearShapeRuleContent()` が固定テキスト欄とレッスン盤面を更新する。形盤面自体は動的SVGのためrenderer内に残し、表示条件・状態更新・変換操作は呼び出し側で維持する。

リセット時の各タイルWAAPIは `startBoardAnimationSession('restart-tiles', ...)` で管理する。セッションcleanupで子アニメーションと145msのsettleタイマーを停止し、完了時だけ一度paintする。既存の300msアニメーション、145msの立つ/寝る切替、リセット後の盤面状態は変更しない。

pointer直後の `grip-hover`、`invalid-grab`、`selecting`、`spinning`、`rotation-started` は `setBoardTransientClass()` 経由へ移行済み。個々のタイルのflash、SVGグループの一時移動、pointer captureの解除は即時反応と逐次アニメーションの一部であり、rendererへ分離しない。`check-ui-effects.mjs` は、分離済みのガイドrendererと、保持すべきpointerアニメーションの入口が失われていないことを監査する。

盤面入力の正規化境界として `src/ui/board-interaction.js` を追加した。pointer座標・pointerId・移動量・回転方向・終了理由を副作用なしでモデル化し、`board-ui.js` のdown/move/endから利用する。正解判定、`applySwipe`相当の盤面command、アニメーション適用は既存側に残すため、タッチ反応と順序は変わらない。

操作中の `pointerId/type`、開始/現在座標、delta、angle、対象3枚組、cancelledは `startBoardPointerContext()` / `updateBoardPointerContext()` / `finishBoardPointerContext()` で一つの操作コンテキストとして扱う。board-uiはイベント受け取りと既存処理の接続を担当し、正解判定・盤面command・アニメーションは変更していない。

チュートリアル巻き戻しの横断監査として、`check-ui-effects.mjs` はモデルの全フィールド、snapshot復元、セッションのactive参照解放、タイマーのstale callback無効化、共通cancel経路を検査し、生成済み `index.html` にもモデル/renderer/cancel APIが含まれることを確認する。内蔵ブラウザ接続は2026-09-01時点で利用できなかったため、実操作の開始→巻き戻し→リセット/遷移確認は未実施とし、静的全回帰チェックで代替した。

操作中の盤面フィードバック（selecting / spinning / rotation-started / grip-hover / invalid-grab）は `renderBoardInteractionFeedback()` へ表示モデルとして渡す構成にした。入力判定と文言・残り手数・hint arrowの算出はboard-ui側に残し、rendererは固定DOM/SVGのクラスと案内欄の反映だけを担当する。pointer座標依存の逐次アニメーション自体は第2段階の境界を維持する。

pointer captureは `captureBoardPointer()` / `releaseBoardPointer()`、別pointerの無視は `isBoardPointerEventFor()` に統一した。pointerup/cancel/leaveのイベント順序とtouchmove抑止は変更していない。capture APIはブラウザ実装差を吸収するための境界で、操作判定や盤面状態は扱わない。

タイルの固定表示反映は `renderBoardTileState()`（stand/fallen、visibility、transform）と `renderBoardTileFlash()`（flash再始動）へ分離した。状態判定・pointer座標計算・flashの発火条件はboard-ui側に残し、個別WAAPIのタイミングは変更しない。回転中のorbit transform、DOM順序変更、pointer直後の即時判定は操作順序に依存するため保持する。

チュートリアルの案内欄（回して・はなす・そこじゃないよ等）の固定DOM反映は `renderTutorialFeedback()` へ分離した。`tutorialPrompt`、正解判定、矢印の表示条件、段階別クラスの判定はboard-ui側に残し、文言と表示タイミングを変更しない。矢印生成そのものはhint rendererとの既存境界を維持する。

今回の7段階を横断する回帰監査として、`check-ui-effects.mjs` で操作コンテキスト、feedback renderer、SVG group/frame renderer、pointer capture、タイルrenderer、tutorial feedback、完了callbackのcommand接続、cancel後の無効化を検査する。旧SVG生成名とpointer captureの直接呼び出しが再導入されないことも確認する。内蔵ブラウザはこの環境では利用できないため、代表スワイプは静的契約と既存の全回帰チェックで確認する。

`animateGroupedSwipe()` と `animateUndoSwipe()` は同ファイルのアニメーションセッションAPIで管理する。セッションは `id` / `type` / `pointerId` / `startedAt` / `cancelled` / `frameHandle` / `cleanup` を持ち、`cancelTileAnimations()` からも先にキャンセルされる。完了・キャンセル時のcleanupは一度だけ実行し、古いcallbackや次フレームは無効化する。盤面command、回転角、表示順、完了順序は変更していない。

チュートリアル巻き戻しの表示モデルは `src/ui/tutorial-animation.js:createTutorialRewindModel()` で生成する。`startAngle` / `endAngle` / `direction` / `pivot` / `items` / `duration` / `cue` を演出側へ渡し、`board-ui.js` は入力判定と状態遷移を保持する。モデル生成は副作用を持たず、既存の指を離した角度から初期位置へ戻る見た目とタイミングを変更しない。

巻き戻し開始時は、pointerイベントや座標を含まない操作モデルを生成する。`animateTutorialRewind(model, visualItems)` は角度・方向・pivot等の正規化モデルと、描画対象の明示的なvisual itemsを受け取り、イベントオブジェクトを参照しない。操作判定とDOMイベント接続は呼び出し側に残す。

巻き戻しで一時的にSVG groupへ移す要素は、同ファイルの `captureTutorialRewindDomSnapshot()` / `restoreTutorialRewindDomSnapshot()` でDOM親・兄弟順・inline styleを退避・復元する。DOM順序の探索・整列もsnapshot API側に閉じ込め、board-uiは対象要素を渡すだけにする。finish/cancelは同じ復元処理を一度だけ通るため、水色の棒との前後関係とvisibilityを含む表示状態を維持する。

チュートリアル巻き戻しのWAAPI、遅延タイマー、DOM snapshot、cleanup済み状態は `startTutorialRewindSession()` 以下の専用セッションAPIで一元管理する。cancel時はWAAPIと未実行タイマーを停止し、finish/cancelのどちらでもsnapshot復元を一度だけ実行する。完了後の案内表示だけは既存のUI演出タイマー境界へ登録し、画面遷移時に残留しないようにする。演出の速度・見た目・完了後の案内表示は変更しない。

アクティブな巻き戻しセッションは `cancelActiveTutorialRewindSession()` で共有キャンセルできる。盤面アニメーションの共通キャンセル境界から呼び出すため、pointercancel、リセット、undo、位置/モード遷移、ダイアログ閉鎖で同じ終了処理を通り、古いWAAPI・遅延タイマー・DOM移動が残らない。

巻き戻し中の立つ/寝る状態とテーマ色は `board-render.js:renderTutorialRewindAppearance()` に分離し、`board-ui.js` はターン差分だけを渡す。rendererは進行・保存・操作を行わず、従来どおり245ms/440msの表示タイミングとテーマ適用順を維持する。

アニメーションフレームのDOM/SVG反映は `board-render.js:renderBoardAnimationFrame()` へ分離した。`board-ui.js` は回転角・進捗・方向を計算してモデルを渡し、rendererがグループtransformと持ち上がり/表情/色の反映を行う。座標・DOM順序・タイミングは変更していない。

動的SVGの生成入口を `board-animation.js:createSwipeGroup()`、フレーム反映入口を `board-render.js:renderSwipeFrame()` に明示した。Grouped swipeとundo swipeは生成とフレーム反映をこれらのAPI経由で行い、pointer座標・DOM順序・タイミングは維持する。個別タイルのpointer依存アニメーションは引き続きboard-ui側に保持する。

アニメーション完了時の盤面確定と結果通知は `completeGroupedSwipeAnimation()` / `completeUndoSwipeAnimation()` へ分離した。frame callbackは完了処理へ委譲し、通常回転は `applySwipe()`、undoは `restoreBoardSnapshotCommand()` を経由する。セッションのactive判定と一度だけのfinishで二重callbackを防止し、クリア判定・表示更新・効果音の順序を維持する。

盤面アニメーションのキャンセル入口は `cancelBoardAnimation()` に統一した。pointercancel、リセット・undo開始（`cancelTileAnimations()`）、ステージ/位置変更、ダイアログ全体のcloseから同じセッションキャンセルを通り、active判定で遅延callbackと次フレームを無効化する。チュートリアル巻き戻しの個別WAAPIは、reduced-motion分岐と段階的な表情更新を持つ別系統のため、今回のセッションへ統合せず保持する。

入力・セッション・renderer・完了・キャンセルを横断する静的契約を `check-ui-effects.mjs` に追加した。二重開始/二重cleanup、pointercancel後の古いframe無効化、reset/undo/遷移時cancel、rendererの永続状態非変更、完了時のboard command経由を検査する。内蔵ブラウザはこの環境で利用できないため代表スワイプの実画面確認は未実施だが、既存のbuild/check契約はすべて成功している。
