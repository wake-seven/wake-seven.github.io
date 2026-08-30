# 状態境界・未使用候補監査

最終確認日: 2026-08-31

`npm run check:compat-e2e` が報告する候補は、宣言と参照が一度だけの関数を機械的に抽出したものです。削除を自動化せず、次の理由で現時点では保持します。

| 候補 | 判定 | 理由 |
| --- | --- | --- |
| `src/main.mjs:createDevelopmentRuntime` | 保持 | 開発用ESMの公開エントリーポイント。`check-esm`と`build-esm`から利用する。 |
| `src/runtime/namespace.js:attachWakeSevenNamespace` | 保持 | 公開版の`window.WakeSeven`互換APIを初期化する。 |
| `src/state/game-state.js:attachWakeSevenState` | 保持 | 公開版の状態APIを初期化する。 |
| `src/state/progression-policy.js:attachWakeSevenProgression` | 保持 | 公開版の進行ポリシーAPIを初期化する。 |
| `src/ui/svg.js:svgClear` | 保持 | SVG描画領域を空にする共通API。現時点では直接参照がなくても、UI renderer APIの公開境界として残す。 |
| `src/ui/template.js:mountTemplate` | 保持 | テンプレートをDOMへマウントする共通API。監査スクリプトでも存在を確認している。 |

## 導線監査

`npm run check:compat-e2e` は、実プレイ導線を支えるDOM・イベント接続・状態遷移の静的契約を検査する。

- 開始ダイアログの開始操作がチュートリアル初期化へ接続されている
- チュートリアルの段階状態とリセット操作が存在する
- 盤面の pointer 操作と `rollOnce` / `paint()` が接続されている
- 通常ステージ、クリア後、速解きの主要DOMと遷移関数が残っている
- 速解きIDが正式ID（`training9` / `training18` / `mastery27` / `satori73`）だけで構成されている

この監査はDOM構造、イベント接続、正式IDの使用を静的に確認する。実ブラウザのクリック・スワイプ確認は、内蔵ブラウザで別途実施する。未使用候補や下書きメッセージは、この検査では削除しない。
