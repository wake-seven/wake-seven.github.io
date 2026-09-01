# 現行アーキテクチャ監査

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

状態は `navigation`、`board`、`progression`、`settings`、`speed`、`ui` の領域に分けて保持します。永続キーの参照口は `WakeSevenState.STORAGE_KEY_GROUPS` の `settings`、`progression`、`rewards`、`speed`、`dialogs` に集約しています。ダイアログの表示中状態とメッセージ見直し位置も `dialogs` 群を経由し、通常の盤面/UI一時状態とは分離します。既存キー名や保存形式は変更していません。
周回別クリアキーのような動的キーも `progression.lapCleared(lap, part)` を入口にします。解析用 `sessionStorage` はゲーム状態とは別の用途のため、保存境界の対象外です。

## 開発用ESMの薄い境界

開発用ESMの `store`、`persistence`、`session`、`environment`、`application` は、公開版のグローバル実装への単なる転送ではありません。各々を独立したテスト注入点として使い、状態更新、保存形式、セッションライフサイクル、ホスト依存、イベント/描画接続を分離しています。

| モジュール | 保持理由 |
| --- | --- |
| `src/state/store.mjs` | 状態購読とセクション更新をブラウザ非依存で検査する境界 |
| `src/state/persistence.mjs` | 保存キー・バージョン検証を storage adapter から分離する境界 |
| `src/runtime/session.mjs` | 復元・保存・破棄のライフサイクルを persistence と分離する境界 |
| `src/runtime/environment.mjs` | `window`/`document`/storage の注入と解決を一箇所にする境界 |
| `src/runtime/application.mjs` | store・events・renderer・session の接続/解除を管理する境界 |

これらは現在 `src/main.mjs` と `scripts/check-esm.mjs` から利用されているため、統合すると開発用の依存注入・回帰テスト境界を失います。単なる委譲ラッパーとして削除できるものはありません。

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

公開版生成物の監査は、コメント・セクション見出し・空白境界を保持していることと、セクション別連結サイズを計測します。サイズや行数の上限は警告方式で、保守上の可読性を守りつつ内容の変化を機械的に追跡します。現行の実装値を文書へ固定するのではなく、詳細は `npm run check:public-esm` の出力を参照します。

ブラウザ相当の導線契約は `npm run check:browser-flow`（`npm run check` に含む）で検査します。開始前の仮画面抑制、状態復元後のダイアログ表示、pointer正規化、別pointer無視、スワイプのフレームrenderer接続、二重セッションの退役、キャンセル時のアニメーションフレーム無効化、クリア演出の二重起動防止、チュートリアル巻き戻しのsnapshot復元、リセット入口をVM/DOM契約で確認します。内蔵ブラウザを利用できない実行環境では、この契約を実ブラウザ操作の代替とし、実操作未実施であることを明記します。

classic/ESMの役割は固定する。`publishedSourceFiles` は単体HTMLへ連結する `.js` 群、`developmentSourceFiles` は開発用入口から import される `.mjs` 群とし、両マニフェストのパスは重複させない。現行処理に `legacy` を冠したファイル名・公開関数名は追加せず、互換専用でない境界は役割を表す名前にする。同名ペアは開発用ESMと公開互換層の意図的な境界として監査で許可し、追加時は `check-source-boundaries` の許可リストを先に更新する。

## 履歴資料

`docs/archive/` は過去の調査・計画メモです。現行仕様の根拠やビルド入力ではありません。現在の実装と異なる記述を含むため、保守時に参照する必要はありません。
