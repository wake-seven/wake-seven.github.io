# 互換層の段階的削除計画

この一覧は、旧保存形式・旧命名・未使用データを「現行処理」「移行専用」「削除候補」に分けるための記録です。ここに載っている項目は、ブラウザでの復元確認と移行fixtureの更新なしには削除しません。

## 判定基準

| 区分 | 意味 | 変更方針 |
| --- | --- | --- |
| 現行処理 | 現在の画面・ゲーム進行・設定が直接利用するもの | 削除しない。必要ならFacade/API経由へ寄せる |
| 移行専用 | 旧プレイヤーの保存データを新形式へ変換するためだけに必要なもの | `WakeSevenState.migrateLegacy()` とfixtureに閉じ込める |
| 削除候補 | 現行処理と移行処理のどちらからも到達しないもの | 参照レポートと回帰確認後に削除を検討 |

## 互換モード名・フラグ

| 名前 | 分類 | 根拠・注意点 |
| --- | --- | --- |
| `extraMode` | 削除候補（識別子）／一部現行データは別 | 旧フラグとしての参照は検査で禁止。`extra` プロパティや翻訳文は現行のため一括置換しない |
| `satoriMode` | 削除候補（識別子）／一部現行データは別 | 旧フラグとしての参照は検査で禁止。`satori` コース・保存プロパティ・翻訳キーは現行 |
| `freeMode` / `customMode` | 現行UI識別子 | DOM idや設定名に残るため、旧フラグとみなして削除しない。判定は `isMode('free')` / `isMode('custom')` を使う |
| `speedMode` | 現行名称 | DOM id、翻訳キー、速解き定義で使用。識別子全体の削除対象ではない |

## 保存形式

### 現行処理

- `wake7-state-vnext`：統合状態の保存先
- `WakeSevenState.STORAGE_KEYS`：現行キーの一覧
- `storage.get/set/remove/setJson`：ストレージ境界
- `wake7-ga-game-started`（`sessionStorage`）：解析イベントの重複防止。ゲーム進行の互換キーではない

### 移行専用

`WakeSevenState.migrateLegacy()` が次の旧キーを読み取り、`wake7-state-vnext` の `navigation`、`board`、`progress`、`unlocks`、`settings`、`speed` へ変換します。

- 設定：`wake7-language`、`wake7-sound`、テーマ・配置・色と各 `*-chosen`
- 進行：`wake7-cleared`、`wake7-extra-cleared`、`wake7-satori-cleared`、`wake7-current-stage`、`wake7-active-session`
- 周回：`wake7-lap1/2-*`、`wake7-active-lap`、`wake7-second-lap-*`
- 導入：`wake7-intro-seen`、`wake7-tutorial-*`
- 報酬：`wake7-*-granted`、`wake7-3d-unlocked`
- 速解き：`wake7-speed-*` の解放・試験・セッション・記録・履歴・モデルバージョン
- 特殊状態：`wake7-message-review*`、`wake7-fourth-checks`、`wake7-satori-order-version`

移行完了後も現行コードが旧キーを直接読むことは許可しません。旧キーの読み取りは移行関数に限定し、fixtureで一周目・二周目・速解き途中・設定・報酬を検証します。

### 削除候補

旧キーの読み込み停止と削除は、次の条件を満たすリリース以降に行います。

1. 旧キーだけを持つストレージからの移行fixtureがある
2. 移行後にリロードしても新キーだけで復元できる
3. 一周目・二周目、速解き途中、報酬、設定が保持される
4. リセット操作が新旧キーを意図した範囲だけ処理する
5. 内蔵ブラウザで導入・クリア後メッセージ・速解きを確認する

条件を満たすまで、旧キーを機械的に `removeItem` する変更は行いません。

## 未使用データ・翻訳

| 対象 | 分類 | 次の確認 |
| --- | --- | --- |
| `UNUSED_DRAFT_TRIVIA` | 削除候補 | `tr()`、`CLEAR_CONTENT`、メッセージ導線から未到達であることを確認 |
| `UNUSED_DRAFT_CLEAR_ENTRIES` | 削除候補 | 開始前・クリア後・見直し一覧のキー変換を確認 |
| 到達しない可能性のある `UI_TEXT` キー | 削除候補 | 4言語辞書、動的キー、HTML idからの参照を確認 |
| `CLEAR_CONTENT` の現行エントリ | 現行処理 | クリア後表示とメッセージ見直しから参照されるため保持 |

下書きは今すぐ削除せず、参照レポートを追加してからデータ単位で判断します。

## 削除前チェックリスト

- `rg` で定義・現行参照・移行参照を別々に確認する
- `npm run build`、`npm run check`、`git diff --check` を通す
- 旧状態のfixtureを維持または追加する
- 生成HTMLの重複APIと直接ストレージ呼び出し数を確認する
- 内蔵ブラウザで初期表示、復元、クリア後メッセージ、速解きを確認する
- 削除対象と保持対象を同じ検索語だけで判断しない

