# runtime 設定・音声処理インベントリ

この文書は、`runtime.js` に残る設定・音声・起動処理を、挙動を変えずに分離するための調査記録です。現段階ではコードを移動せず、依存関係と安全な順序だけを固定します。

## 現在の配置

| 領域 | 現在のファイル | 主なAPI／状態 | 備考 |
| --- | --- | --- | --- |
| 設定の初期化 | `runtime-settings.js` | `initializeRuntimeSettings`, `soundEnabled`, `boardTheme`, `boardLayout`, `darumaColor` | `gameState.settings` を優先し、旧保存キーをフォールバックとして読む |
| 音声 | `runtime-audio.js` | `playTone`, `playRotateSound`, `playClearSound`, `clearSoundKind`, `updateSoundToggle` | `soundEnabled`、モード／進行状態、DOM、翻訳に依存 |
| 起動・状態復元 | `runtime.js` | `syncGameState`, `migrateSatoriOrder`, 各種 unlock 初期化 | 設定初期化の直後に unlock と進行を復元する |
| テーマ適用 | `runtime.js` | `updateMasterTheme`, `applyBoardTheme`, `renderBoardThemeOptions`, `openBoardThemeDialog` | 報酬状態、盤面DOM、`board-ui.js` の `tileEls`／`baseTiles` に依存 |
| 共有・計測 | `runtime.js` | `shareData`, `shareWakeSeven`, `trackAnalyticsEvent`, `trackGameStart` | 設定分離の対象外。`currentLang` と保存APIだけ共通境界にする |

## 依存関係

生成順は `scripts/build-index.mjs` の `appModuleFiles` に従います。現在の関連順は次のとおりです。

```text
game-state.js
  ↓
core-data.js / data-ui-text.js
  ↓
runtime-settings.js
  ↓
runtime.js
  ↓
speed-runtime.js / board-animation.js / board-ui.js / ...
  ↓
runtime-audio.js の利用箇所
```

実際には `runtime-audio.js` は `runtime.js` より前に生成されているため、上図の「音声の利用」は宣言順に依存しない利用時参照として扱う必要があります。音声関数を移動するときは、関数本体の実行時に必要な名前が必ず初期化済みであることを確認します。

設定初期化の必須依存は以下です。

- `WakeSevenState.migrateLegacy()` が返す `gameState`
- `WakeSevenState.STORAGE_KEYS` と `WakeSevenState.storage`
- `UI_TEXT`（言語設定の妥当性確認は `runtime.js` 側の `tr` で行う）

音声の必須依存は以下です。

- `soundEnabled`
- `document.hidden`、`window.AudioContext`／`webkitAudioContext`
- `tr` と `$`（音声トグル描画）
- `isMode`, `stageIndex`, `extraIndex`, `satoriIndex`
- `isSatoriMastered`, `allPrimaryCleared`, `MASTER_VOLUME_SIZE`, `SATORI_STAGES`, `STAGES`, `EXTRA_STAGES`

テーマ処理の必須依存は以下です。

- 報酬フラグ（`masterGoldGranted`, `satoriDesignGranted`, `rainbowDarumaGranted`）
- 選択状態（`boardThemeChosen`, `boardLayoutChosen`, `darumaColorChosen`）
- 盤面描画状態（`tileEls`, `baseTiles`）
- `applyBoardTheme` を呼ぶ盤面描画側のライフサイクル
- `STORAGE_KEYS` と `storage`

## 安全な分割順

### 1. 設定APIの読み取り境界を固定する

`runtime-settings.js` の既存変数名は当面維持し、次の小さなAPIを追加するだけにします。

```js
getRuntimeSettings()
setRuntimeSetting(name, value)
```

最初は `getRuntimeSettings()` を計測・UI側から使うだけにし、書き込みの移行は後段に回します。旧キーの読み込みと `gameState.settings` の優先順位は変更しません。

### 2. 音声の状態と効果音を分ける

次の2層へ整理するのが安全です。

```text
audio-settings: soundEnabled、トグル状態、AudioContext生成
audio-effects: playTone、回転音、クリア音、clearSoundKind
```

`updateSoundToggle()` はDOM描画なので `audio-effects` へ混ぜず、設定UI側または `audio-settings` の表示アダプターとして残します。`clearSoundKind()` は進行判定に依存するため、音声低レイヤーへ移動しません。

### 3. テーマを独立した境界へ出す

音声分離の後、`updateMasterTheme` の報酬更新と、`applyBoardTheme`／選択肢描画を `board-theme.js` へ移動します。移動前に以下を関数の引数またはFacadeで明示します。

- 報酬状態
- 選択中のテーマ・配置・だるま色
- 盤面要素
- 保存API

この段階ではテーマの値や保存キーを変更しません。

### 4. runtime の起動処理を最後に分ける

`initializeRuntimeSettings()` 呼び出しと unlock／進行復元の順序を保ったまま、次の単位へ移動します。

```text
runtime-bootstrap.js   初期化順序・初回復元
runtime-persistence.js syncGameState、進行保存
runtime-migration.js   旧キー・SATORI順序・モデル移行
```

起動順を変更すると既存保存データの移行結果が変わる可能性があるため、最後に実施します。

## 移動しない方がよいもの

- `tr`：全モジュールの共通翻訳入口であり、先に移動すると生成順依存が増える
- `getGameContext`／`isMode`：音声専用ではなく進行全体の基盤
- `clearSoundKind`：音声処理に見えるが、実体は進行ポリシーとの結合点
- `trackAnalyticsEvent`：設定ではなく計測の関心事
- `migrateSatoriOrder`：設定分離に便乗して触ると進行データを壊すリスクがある

## 各分割での確認項目

分割単位ごとに次を実行します。

1. `npm run build`
2. `npm run check`
3. `git diff --check`
4. 内蔵ブラウザで初期表示し、盤面7枚とJavaScriptエラーを確認
5. 音声ON／OFFの表示、テーマダイアログ表示、リロード後の設定復元を確認

特に音声はブラウザの自動再生制限で実音が出ない場合があるため、まず `AudioContext` の例外がないこととトグル状態を確認します。

## 結論

設定と音声のファイル自体はすでに分離済みです。次の安全な作業は、さらにファイルを増やすことではなく、`runtime.js` に残るテーマ・移行・進行判定の境界を明記し、設定Facadeを読み取り専用から導入することです。音声の低レイヤー分離とテーマ移動は、その後に小さなコミット単位で行うのが適切です。
