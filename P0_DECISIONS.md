# P0 decision register

This register turns the eight open items in `REBUILD_PLAN.md` into implementation gates. “Project owner” means the user/product decision-maker; P0 records recommendations but does not silently convert them into a requirement.

| ID | Status | Decision deadline / owner | Current recommendation and basis | Stop gate if still open |
| --- | --- | --- | --- | --- |
| OPEN-001 | Undecided; content scope inventory pending | Before P8 / Project owner | Preserve Japanese functional UI and every flow-critical dialog; inventory exact multilingual copy and long-form tips separately, then decide whether they are parity scope. This protects playability without claiming that unreviewed prose is identical. | P8 (dialog/content parity) |
| OPEN-002 | Undecided; visual fidelity contract is now recorded in P0 baseline | Before P1 visual acceptance / Project owner | Match game-bearing geometry and interaction layout; permit browser font rasterization and non-functional shadow/antialias variance. The P0 comparison contract makes the boundary testable. | P1 for board visual sign-off; P8 for final polish |
| OPEN-003 | **Decided (2026-09-06)** | Decided by project owner before P1 | **V2の改修対象は `index.html` のみ。** `all-patterns.html` と `index_3D.html` は対象外として凍結し、V2の受入れ・比較・実装には含めない。これにより単一HTML化の移行対象と検証範囲を一意に保つ。 | Cleared: P1 may start; the two companion HTML files must remain unchanged. |
| OPEN-004 | **Decided (2026-09-07)** | Decided by project owner for P3 | **新版の保存キーは `wake7-rebuild-v1`。** 旧 `wake7-*` キーは読まない・移行しない・列挙しない・削除しない。旧版と新版を同じブラウザで安全に比較でき、旧保存値を壊さない。 | Cleared: P3 may implement only the new key. |
| OPEN-005 | **Decided (2026-09-07)** | Decided by project owner before P5 | **応用問題を履歴0手で開くたびに導入演出を再生する。** 同じ問題への再訪も0手なら再生する。1手以上進んだ保存盤面を再読込したときは導入を再生せず、その安定盤面へ直接復帰する。導入途中のフレームは保存しない。 | Cleared: P5 may implement the 0手／1手以上の別々の復元契約. |
| OPEN-006 | **Partly decided (2026-09-07): P3 clear flow only** | P8 before full dialog matrix / Project owner | **P3では通常問題の `clear` だけを復元対象にする。** 有効な問題IDと解決済み盤面から本文・ボタン・次への経路・初期focusを再描画する。演出途中は復元せず、安定した解決盤面へ正規化する。`clearCommitted` が有効でdescriptorが欠けても問題文脈からclearを再構成する。盤面／文脈が壊れていれば通常問題の安全な初期盤面へ戻す。他のdialogの許可リストと復元契約はP8まで保留する。 | Cleared for P3 clear flow; P8 for every other dialog. |
| OPEN-007 | **Decided (2026-09-15)** | Decided by project owner before P7 | **進行中の速解きを通常リロードした後は、一時停止状態で同じセッションを復元し、ユーザーが明示的に再開するまで時計を動かさない。** hidden復帰と通常リロードで同じ契約にし、見えない時間の加算と復帰経路の分岐を避ける。開始待ちは開始待ちのまま、問題クリア確定済みなら次問／完走を一度だけ確定してから停止状態を表示する。 | Cleared: P7a may implement one explicit-resume recovery policy. |
| OPEN-008 | **Decided (2026-09-15)** | Decided by project owner before P7 | **自由モードの最後の有効な盤面・初期盤面・履歴を永続化し、別モードへ移動してリロードした後も、自由モードへ戻った時に同じ問題を復元する。** 現在表示中のモードを自由へ強制変更はせず、再入場時だけ保存済み自由セッションを使う。破損値は捨てて新しい自由問題を作る。 | Cleared: P7d may persist and validate the saved free session. |

## P0 exit and next action

P0 evidence and decision preparation are complete. OPEN-003 was decided by the project owner on 2026-09-06, so its P1 stop gate is cleared: V2 rebuild work is limited to the future replacement of `index.html`, while `all-patterns.html` and `index_3D.html` remain frozen. OPEN-004 and the P3 slice of OPEN-006 were decided on 2026-09-07; the remaining dialog matrix is still intentionally open until P8.
