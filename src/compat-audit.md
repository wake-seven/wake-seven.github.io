# 互換層・未使用候補監査

`npm run check:compat-e2e` が報告する候補は、宣言と参照が一度だけの関数を機械的に抽出したものです。削除を自動化せず、次の理由で現時点では保持します。

| 候補 | 判定 | 理由 |
| --- | --- | --- |
| `src/main.mjs:createDevelopmentRuntime` | 保持 | 開発用ESMの公開エントリーポイント。`check-esm`と`build-esm`から利用する。 |
| `src/runtime/namespace.js:attachWakeSevenNamespace` | 保持 | 公開版の`window.WakeSeven`互換APIを初期化する。 |
| `src/state/game-state.js:attachWakeSevenState` | 保持 | 公開版の状態APIを初期化する。 |
| `src/state/progression-policy.js:attachWakeSevenProgression` | 保持 | 公開版の進行ポリシーAPIを初期化する。 |
| `src/ui/board.js:academyEnrollArtSvgLegacy` | 保留 | 旧演出の互換資産。表示経路をブラウザで確認してから削除する。 |

## 互換ID

`mastery15` と `mastery24` は旧保存データの読み込み時だけ、それぞれ `training18` と `mastery27` へ変換する。新規保存では canonical ID を使用する。

## 互換キー

旧localStorageキーは `WakeSevenState.LEGACY_STORAGE_KEYS` に閉じ込め、vNext状態への移行以外から参照しない。キーを削除する場合は、既存ユーザーの移行確認と公開版の回帰確認を先に行う。
