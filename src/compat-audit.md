# 互換層・未使用候補監査

最終確認日: 2026-08-31

`npm run check:compat-e2e` が報告する候補は、宣言と参照が一度だけの関数を機械的に抽出したものです。削除を自動化せず、次の理由で現時点では保持します。

| 候補 | 判定 | 理由 |
| --- | --- | --- |
| `src/main.mjs:createDevelopmentRuntime` | 保持 | 開発用ESMの公開エントリーポイント。`check-esm`と`build-esm`から利用する。 |
| `src/runtime/namespace.js:attachWakeSevenNamespace` | 保持 | 公開版の`window.WakeSeven`互換APIを初期化する。 |
| `src/state/game-state.js:attachWakeSevenState` | 保持 | 公開版の状態APIを初期化する。 |
| `src/state/progression-policy.js:attachWakeSevenProgression` | 保持 | 公開版の進行ポリシーAPIを初期化する。 |
| `src/ui/board.js:academyEnrollArtSvgLegacy` | 保留 | 現在の静的参照は宣言のみだが、旧演出の互換資産。表示経路をブラウザで確認してから削除する。 |

## 互換ID

`mastery15` と `mastery24` は旧保存データの読み込み時だけ、それぞれ `training18` と `mastery27` へ変換する。新規保存では canonical ID を使用する。

## 互換キー

旧localStorageキーは `WakeSevenState.LEGACY_STORAGE_KEYS` に閉じ込め、vNext状態への移行以外から参照しない。キーを削除する場合は、既存ユーザーの移行確認と公開版の回帰確認を先に行う。

## 導線監査

`npm run check:compat-e2e` は次の実プレイ相当の契約を検査する。

- 開始ダイアログの開始操作がチュートリアル初期化へ接続されている
- チュートリアルの段階状態とリセット操作が存在する
- 盤面の pointer 操作と `rollOnce` / `paint()` が接続されている
- 通常ステージ、クリア後、速解きの主要DOMと遷移関数が残っている
- 旧速解きIDの参照場所が互換層・進行処理の許可範囲に限定されている

この監査はDOM構造とイベント接続を静的に確認する。実ブラウザのクリック・スワイプ確認は、内蔵ブラウザで別途実施する。未使用候補や下書きメッセージは、この検査では削除しない。

## 固定UI fallback

通常UIの互換fallbackは `src/ui/board.js` の `cloneDialogTemplate()` に残る
`body.innerHTML = fallback` の1箇所だけを許可する。公開版テンプレートが欠落した旧生成物を
読み込む場合の保険であり、現行のテンプレート経路では実行されない。動的SVGや問題数に応じて
変化するカード群のHTML生成は、固定構造fallbackとは区別して監査対象外とする。
