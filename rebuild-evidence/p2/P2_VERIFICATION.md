# P2 verification evidence — interaction, history, exclusive effects

Verified on 2026-09-06 from P1 base commit `a0cd7a0`.

## Scope

- Candidate: `index.rebuild.html`
- Specifications: `BOARD-002`, `BOARD-003`, `BOARD-004`, `ASYNC-001`
- Viewports: PC 1440×1000 and mobile 360×800
- Browser: installed Chrome driven by bundled Playwright, plus an interactive pass in the Codex in-app browser
- P3 was not started: there is no persistence, problem progression, navigation, or clear dialog.

## Automated browser check

Run from the repository root while `http://127.0.0.1:8765` serves the repository:

```powershell
$env:NODE_PATH='C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
& 'C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'rebuild-evidence\p2\p2-browser-check.cjs'
```

Observed result:

```json
{"pc":"passed","mobile":"passed","reducedMotion":"passed"}
```

The script asserts all of the following against live DOM state:

| Scenario | Expected and observed result |
| --- | --- |
| Tap during arrival | Rejected; state 31 and empty history remain unchanged |
| Short drag | Returns to state 31 without adding history |
| Drag preview then `pointercancel` | Shows moves 1 / remaining 0 without mutating state or history, then returns to state 31 |
| Release outside the board | Safely commits one move; Undo restores state 31 |
| Positive and negative drag | Both directions commit; the negative reference move solves the problem |
| Input during rotation | A rapid second tap is ignored; only one history entry is created |
| Input during clear | Rejected; solved state and history remain unchanged |
| Restart during Undo | Restart stays disabled and cannot supersede the Undo generation |
| Restart | Restores state 31 and empties history |
| Touch drag at 360×800 | Solves to state 0; Undo restores state 31 |
| Touch scroll policy | Computed `touch-action` is `none` on the board |
| Reload | Returns to the single static P2 problem with aligned empty history |
| Reduced motion | Arrival, rotation, and clear reach their correct final states immediately |

Every stable render asserts that RuntimeState cells, confirmed history length, encoded state, and per-cell DOM orientation agree. The browser exposes the result as `data-invariant="passed"`.

## Domain and source checks

The boot self-test still enumerates all 2187 encoded values. It verifies encode/decode, inverse rolls on all six axes, BFS distances, the 729/1458 reachable split, symmetry invariance, the stage reference, static renders, six visible rods and axes, drag thresholds, the input gate, and the commit/Undo model. Browser-observed boot attributes were:

- `data-selftest="passed"`
- `data-checked-states="2187"`
- `data-checked-axes="6"`
- `data-checked-p2-contracts="4"`

The feature-local search entry is:

```powershell
rg -n "FEATURE-BOARD|SPEC: BOARD-002|SPEC: BOARD-003|SPEC: BOARD-004|SPEC: ASYNC-001" index.rebuild.html
```

That one search reaches the board CSS, DOM, RuntimeState, effect runner, pointer input, commands, event bindings, and self-test. Raw `requestAnimationFrame`, `setTimeout`, and Web Animations calls occur only inside `WAKE7:JS:EFFECT-RUNNER`; all callers register against the current generation.

`git diff --check` passed.

The candidate was also opened directly as `file:///C:/git_work/wake-seven/index.rebuild.html`; it reached `ready` with no page errors, self-test passed, state 31, and all six rods present. The product still has no runtime or build dependency outside the one HTML file.

## Interactive browser pass

The localhost candidate was opened in the Codex in-app browser. A real pointer drag changed state 31 → state 0 with history 1 and `data-invariant="passed"`; clicking “一手戻す” returned state 0 → state 31 with history 0 and the invariant still passing.

## Visual evidence

- `pc-1440x1000-ready.png`: initial board with six cyan rods, six gold pivots, status, Undo, and Restart
- `mobile-360x800-ready.png`: the same controls fitted at 360×800
- `pc-1440x1000-clear.png`: solved board during the exclusive clear effect with happy faces and the central ring
