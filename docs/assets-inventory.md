# 固定アセット・SVGインベントリ

この文書は、固定SVGと挿絵データを将来さらに分離するための調査メモです。今回の段階では表示結果と生成順を変えないことを優先し、コードの移動は行いません。公開物は引き続き `scripts/build-index.mjs` から生成する単一の `index.html` です。

## 現在の配置

| アセット | 現在の場所 | 種別 | 主な利用箇所 | 分離方針 |
| --- | --- | --- | --- | --- |
| `academyEnrollArtSvg()` | `src/data-assets.js` | SVG生成関数 | 入学案内ダイアログ | 既にデータ側へ分離済み。`#daruma-body` などテンプレートのSVG定義に依存するため、関数の移動はしない |
| `TRAINING_WELCOME_ART_SVG` | `src/data-assets.js` | SVG文字列 | 修行開始ダイアログ | 既にデータ側へ分離済み。`href="#daruma-body"` / `href="#face-happy"` を保持する |
| `tipArt()` の挿絵識別子 | `src/progression-ui.js` | 識別子→描画分岐 | クリア後メッセージ | 識別子は `CLEAR_CONTENT` と照合し、描画関数だけを処理側に残す |
| 称号・報酬バッジSVG | `src/progression-ui.js` | SVGテンプレート／パス | 称号・報酬表示 | 固定パスと表示テンプレートを別ける。まず文字列リテラルの移動だけを行う |
| 盤面・ダイアログ内の小SVG | `src/board-ui.js` | SVG生成・インライン markup | 学園・修行の案内 | 盤面の座標計算と密接なため、データ移動はダイアログ単位で検証する |
| 共通シンボル定義 | `src/index.template.html` の `<defs>` | SVG構造 | 盤面・挿絵から参照 | HTMLテンプレートのDOM構造に直結するため、現段階では移動対象外 |

## 依存関係

```text
index.template.html
  └─ SVG <defs> (#daruma-body / #face-happy)
       ├─ data-assets.js
       │    ├─ academyEnrollArtSvg()
       │    └─ TRAINING_WELCOME_ART_SVG
       ├─ board-ui.js（案内用の盤面SVG）
       └─ progression-ui.js（称号・報酬・tipArt）

data-clear-content.js
  └─ art 識別子
       └─ progression-ui.js / tipArt()
```

`data-assets.js` を `core-data.js` より前に生成すると、データ側の関数が利用する共通定義を壊す可能性があります。現行のビルド順では `core-data.js`、`data-assets.js`、描画モジュールの順を維持してください。アセット自体を先に読み込む必要が生じた場合は、`<defs>` の存在を前提にするタイミングを回帰チェックへ追加します。

## 将来の分離手順

1. `tipArt()` が扱う識別子を一覧化し、`CLEAR_CONTENT.*.art` の値と一対一で照合する。
2. 称号・報酬のSVGから固定パス・色・viewBoxだけを `data-assets.js` の定数へ移す。HTML文字列の組み立てとDOM操作はUI側に残す。
3. `board-ui.js` 内の案内用SVGを、`academy` / `training` / `lesson` のアセット単位へ移す。ただし、盤面状態を描くSVG生成関数は `board-ui.js` に残す。
4. 各移動後にビルドし、生成HTMLのSVG数・ID・参照先を比較する。
5. 内蔵ブラウザで入学案内、修行開始、クリア後の挿絵、称号表示を確認する。

## 不変条件

- SVGの `id`、`viewBox`、`href`、`aria-hidden` を変更しない。
- `#daruma-body` と `#face-happy` はテンプレート側の定義を維持する。
- `CLEAR_CONTENT` の `art` 識別子を削除・改名しない。
- 表示順、アニメーション用クラス、ダイアログのDOM IDを変更しない。
- SVGを外部ファイル化する場合も、GitHub Pagesで相対パスが解決できる単一公開物の要件を確認する。

## 検証コマンド

```text
npm run build
npm run check
git diff --check
```

構造確認だけでは不十分なため、少なくとも入学案内・修行開始・クリア後メッセージの3導線をブラウザで確認してから、アセット移動をコミットします。
