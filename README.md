# だるまさんを起こして！

**WAKE SEVEN** は、7枚のパネルにいるだるまさんを、くるりと回して起こしていくブラウザパズルです。

遊ぶほどに「次に何が起こるか」が少しずつ見えてくるタイプのゲームです。まずは説明を読まずに、触ってみてください。

<https://wake-seven.github.io/>

## 遊び方

盤面の水色の目印をつまみ、スワイプして3枚のパネルを回します。すべてのだるまさんが起きたらクリアです。

ステージでは少しずつルールと操作を覚えられます。行き詰まったときは、画面内の「ヒント」「やり直す」「1手戻す」を使えます。

## このリポジトリについて

公開版はビルドやインストール不要です。`index.html` をブラウザで開くだけで遊べます。

- `index.html` — ゲーム本体
- `src/index.template.html` — `index.html` の保守用テンプレート
- `src/` — 開発用ESMと公開版へ連結する保守用ソース
- `src/state/game-state.js` — 統合ゲーム状態と保存境界
- `src/state/progression-policy.js` — コース解放・速解き・学習用UIの宣言ポリシー
- `src/main.mjs` — 開発用ESMの入口
- `scripts/` — 公開版生成と自動監査
- `scripts/build-index.mjs` — 単体HTMLを生成するスクリプト
- 主要処理の追跡は `npm run trace:entry -- progression` / `state` / `clear-flow`、変更影響の確認は `npm run trace:impact -- <変更ファイル>` です。詳細な確認と公開版の検証は `npm run check:gate` で行います。
- `all-patterns.html` — クリア後に楽しめる盤面一覧
- `docs/architecture-audit.md` — 公開境界・保存方針・アーキテクチャ監査

進行状況や設定は、ブラウザの Local Storage に保存されます。外部サーバーへの送信やアカウント登録はありません。

## 開発

Node.js があれば、保守用ファイルを変更後に次で公開版を生成できます。

```sh
npm run build
npm run check
```

`npm run check` には、公開HTMLの生成物監査とブラウザ相当の導線検査（`npm run check:browser-flow`）も含まれます。

変更範囲に応じた実行契約は `npm run check:execution-contract` で確認できます。変更対象から scope、推奨profile、必須検査、full gate の要否を `build/report/check-execution-contract.json` に出力します。未実行や契約違反は成功扱いにしません。

Aboutダイアログに表示する公開版バージョンは `src/runtime/runtime.js` の `APP_VERSION` だけを更新します。形式は `YYYY.MM.DD-HH:mm`（日本時間）です。`npm run build` で生成版にも反映され、Pages上の版を画面から識別できます。テンプレートや生成物へ別のバージョン値を直接書かないでください。

公開版の構成を意図的に大きく変更した場合だけ、生成物を確認してから `npm run metrics:update -- --reason "変更理由"` を実行し、baseline更新前後の `npm run check:public-esm` が通ることを確認します。通常の `npm run check` はbaselineを更新しません。更新理由はコミットメッセージまたはレビューにも残します。

生成物メトリクスは、全体と連結セクションごとの bytes / 行数 / コメント / 関数数 / グローバル参照数 / DOM ID数を比較します。セクション名が重複する場合も出現順で対応付けます。通常の検査では基準値を変更せず、意図した大規模変更のときだけ `metrics:update` で明示的に更新してください。

保存状態は `wake7-state-vnext` に集約しています。過去版の保存データ互換や旧キーからの移行は行いません。

## 共有について

ゲームへのリンク・紹介はご自由にどうぞ。
