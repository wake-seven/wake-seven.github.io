# 互換層・未使用データの棚卸し

この文書は、旧実装との互換処理を整理していた時点の履歴メモです。現行コードの仕様ではありません。特に移行関数・旧キーの記述は当時の計画を示すだけで、現在の実装へ適用しないでください。

## 1. モード名と互換参照

現在のゲーム状態で使うモードは `tutorial` / `stage` / `mastery` / `satori` / `speed` / `free` / `custom` です。`activeMode` と `isMode()` が判定の入口になっており、ゲームロジック内の旧フラグは整理済みです。

| 名前 | 現在の扱い | 棚卸し方針 |
| --- | --- | --- |
| `extraMode` | 旧モードフラグ。ゲームコードの判定には使わない | 削除候補。ただし表示文や保存データの `extra` フィールドとは別物なので、文字列検索だけで削除しない |
| `satoriMode` | 旧モードフラグ。ゲームコードの判定には使わない | 削除候補。`satori` コース名、保存データの `satori` プロパティ、翻訳キーは現役 |
| `speedMode` | 旧フラグ名としては使わない | `speedMode` を含む DOM id・翻訳キー・`SPEED_MODE_DEFINITIONS` は現役。識別子全体を一括削除しない |
| `freeMode` / `customMode` | モードフラグではなく、現在も画面要素の id として使用 | 削除対象外。状態判定は `isMode('free')`、`isMode('custom')` を使う |

## 2. 保存キー

当時の計画では、旧キーを `wake7-state-vnext` へ移行する案を検討していました。現在は過去ユーザーの保存データ互換を提供せず、`WakeSevenState.migrateLegacy()` も存在しません。現行仕様は `docs/architecture-audit.md` を参照してください。

### 継続利用している旧キー群

- 設定: `wake7-language`, `wake7-sound`, `wake7-board-theme`, `wake7-board-layout`, `wake7-daruma-color` と各 `*-chosen`
- 進行: `wake7-cleared`, `wake7-extra-cleared`, `wake7-satori-cleared`, `wake7-current-stage`, `wake7-active-session`, `wake7-active-lap`
- 周回: `wake7-lap1/2-{primary,extra,satori}-cleared`, `wake7-second-lap-active`, `wake7-second-lap-unlocked`
- 導入: `wake7-intro-seen`, `wake7-tutorial-complete`, `wake7-tutorial-step`
- 報酬: `wake7-master-gold-granted`, `wake7-satori-design-granted`, `wake7-rainbow-daruma-granted`, `wake7-awakened-granted`, `wake7-3d-unlocked`
- 速解き: `wake7-speed-*` の解放、試験、セッション、記録、履歴、モデルバージョン
- メッセージ・特殊操作: `wake7-message-review*`, `wake7-fourth-checks`, `wake7-satori-order-version`

`WakeSevenState.STORAGE_KEYS` をキー名の一覧として扱い、まだ直接リテラルで参照されている箇所は今後段階的に置き換えます。`sessionStorage` の `wake7-ga-game-started` は解析イベントの重複送信防止用で、ゲーム進行とは別系統です。

### 削除候補

`wake7-state-vnext` が十分に普及した後、旧キーの読み込みを停止できるリリースを設け、その後に旧キーを削除する候補です。停止前に、少なくとも次を確認します。

1. 旧キーだけを持つ新規ブラウザで移行できること
2. 一周目・二周目、速解き途中セッション、報酬、設定が保持されること
3. 移行後のリロードで旧キーがなくても復元できること
4. リセット操作が新旧キーを意図した範囲だけ消すこと

## 3. 未使用データ

`src/core-data.js` の `UNUSED_DRAFT_TRIVIA` と `UNUSED_DRAFT_CLEAR_ENTRIES` は、`tr()`、`CLEAR_CONTENT`、メッセージカタログから参照されない下書きです。出題範囲変更前の雑学・案内・クイズ・盤面ガイドを保持しているため、現時点では削除しません。

`UI_TEXT` 内にも、現時点で `tr()` から到達しない下書きキーがあります。現在のソースコメントでは、`makerKind` / `customKind` / `speedModeSelect` / `speedUnlockedStart` 系などが例として記録されています。新しい導線で再利用する可能性があるため、削除ではなく使用状況の再確認を先に行います。

### 削除前の確認手順

- `rg` でキーの定義と参照を別々に調べる
- 日本語以外の辞書からも参照を調べる
- `CLEAR_CONTENT` のキー変換 (`clearContentKey`) と開始前メッセージを確認する
- クリア後メッセージ、盤面クイズ、速解き導線を内蔵ブラウザで確認する
- 影響範囲を確認してから、データ単位で削除し、生成HTMLと回帰チェックを更新する

## 4. 次に安全に進められる整理

1. `WakeSevenState.STORAGE_KEYS` を、設定・進行・報酬・速解きの名前空間ごとに分ける
2. `runtime.js` と `app-events.js` に残る保存キーの直接リテラルを `STORAGE_KEYS` へ寄せる
3. 互換移行を `migrateLegacy()` のテストデータで拡張し、旧キー停止の判断材料を作る
4. 未使用辞書キーと下書きデータの参照レポートをチェック script に追加する

この段階では、互換層を「不要なコード」とみなして削除するより、現行参照・移行専用・削除候補を分けてから変更するのが安全です。
