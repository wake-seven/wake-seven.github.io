# 現行アーキテクチャ監査

最終確認日: 2026-09-01

この文書は、頻繁に変わる実装詳細を列挙するものではなく、公開境界と「意図的に残している複雑性」を記録するための短い監査メモです。実装の正しさは `npm run check` が検査します。

## 公開境界

公開版で外部から利用する入口は `window.WakeSeven` だけです。公開領域は次の4つに限定しています。

| API | 責務 |
| --- | --- |
| `WakeSeven.state` | 現在状態の参照・保存・設定更新 |
| `WakeSeven.progression` | 進行ポリシーとコンテキスト参照 |
| `WakeSeven.messages` | クリア後メッセージの表示・参照 |
| `WakeSeven.speed` | 速解き時計と定義参照 |

状態API、進行ポリシー、アプリケーション本体、公開名前空間の順に初期化します。初期化関数は重複実行時に既存の公開オブジェクトを差し替えません。

## 保存と互換性

現行の保存キーは `wake7-state-vnext` です。過去ユーザーの保存データ、旧速解きID、旧モードフラグの移行処理は提供しません。正式な速解きIDは `training9`、`training18`、`mastery27`、`satori73` です。

## 意図的にイベント側へ残す処理

次の処理は、pointer座標・DOM順序・逐次アニメーションのタイミングに依存するため、無理に汎用rendererへ移しません。

- 動的SVGの盤面生成と回転中フレーム反映
- pointer直後の即時フィードバックとpointer capture
- 回転中の一時的なSVGグループ移動・DOM順序復元
- 完了callbackと盤面commandの順序
- チュートリアル巻き戻しの専用WAAPIセッション

入力は `src/ui/board-interaction.js` の操作モデルへ正規化し、演出の開始・完了・キャンセルはセッションAPIを経由します。固定UIの文言・表示切替はテンプレートとrenderer側で管理します。

## 監査コマンド

通常の確認は次の1コマンドで行います。

```sh
npm run check
```

このコマンドは状態復元、ダイアログ連鎖、UI演出のキャンセル、進行フロー、ESM依存、ソース境界、公開版生成物、未使用候補を検査します。生成物の更新は `npm run build` で行います。

2026-09-01時点の監査結果は、未使用候補0件、公開版の重複関数宣言0件、通常UI fallbackなしです。内蔵ブラウザは利用できない環境のため、実際のスワイプ操作確認は未実施です。

classic/ESMの役割は固定する。`publishedSourceFiles` は単体HTMLへ連結する `.js` 群、`developmentSourceFiles` は開発用入口から import される `.mjs` 群とし、両マニフェストのパスは重複させない。現在の同名ペア（audio、board-commands、board-domain、board-quiz、progression-commands、progression-runtime、render、satori、settings）は開発用ESMと公開互換層の意図的な境界として監査で許可する。新しい同名ペアを追加する場合は、`check-source-boundaries` の許可リストを先に更新する。

## 履歴資料

`docs/archive/` は過去の調査・計画メモです。現行仕様の根拠やビルド入力ではありません。現在の実装と異なる記述を含むため、保守時に参照する必要はありません。
