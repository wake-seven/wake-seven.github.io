# P2 verification evidence — interaction, history, exclusive effects

## Current status

P2 is **not accepted yet**. The current candidate contains corrective work after commits `7eaa5e9` and `80923b7`; PC and mobile operation must be confirmed manually before the corrective work is committed and P2 is marked complete again.

Automated visual/E2E judgment is intentionally not used for current acceptance. The user performs the final visual and interaction check directly.

## Scope

- Candidate: `index.rebuild.html`
- Specifications: `BOARD-002`, `BOARD-003`, `BOARD-004`, `ASYNC-001`
- P3 has not started: there is no persistence, problem progression, navigation, or clear dialog.

## Current code checks

The following non-visual checks were run after the current corrective work:

- The module body extracted from `index.rebuild.html` passes `node --check -`.
- `git diff --check` passes; only the repository's existing LF-to-CRLF working-copy warnings are emitted.
- A standalone numeric check confirms the inner, outer, and across hit boundaries for all six rods.
- Raw `requestAnimationFrame`, `setTimeout`, and Web Animations calls remain inside `WAKE7:JS:EFFECT-RUNNER`.
- `renderRotationPreview` no longer rebuilds the seven-cell board on every pointer or animation frame; it updates the existing rotating three-cell layer.
- Normal settle, short-drag return, and Undo use `settleBoardRotation`.

The boot self-test names its P2 contracts in `data-checked-p2-contracts` instead of publishing a manually maintained count. The current source checks:

- `commit-undo-model`
- `drag-turn-count`
- `continuous-rotation`
- `input-gate`
- `grip-center-excluded`
- `all-grip-regions`
- `settled-frame-alignment`
- `cancelled-frame-alignment`
- `wake-angle-window`
- `clear-face-asset`

These source-level checks do not replace manual visual acceptance.

## Manual acceptance required

| Scenario | PC | Mobile | Expected result |
| --- | --- | --- | --- |
| Rod hover and hit area | Pending | Pending | Hand cursor only in the six rod regions; center excluded; each rod has center-side padding |
| Short drag | Pending | Pending | Returns without position, face, panel-color, state, or history drift |
| One 120-degree turn | Pending | Pending | Rotating three panels stay in front and stop without a final pixel jump |
| Continuous 240/360-degree turn | Pending | Pending | Rotation remains continuous and records one history entry per 120 degrees |
| Wake/sleep timing | Pending | Pending | Panel color and face change together only near the upright angle |
| Pointer cancel / outside release | Pending | Pending | Cancel restores exactly; outside release safely commits when applicable |
| Undo | Pending | Pending | Uses the same settled coordinates as a normal turn and removes one confirmed turn |
| Restart | Pending | Pending | Restores state 31 and clears history |
| Clear effect | Pending | Pending | Happy faces and clear motion appear; the central burst does not remain afterward |
| Reduced motion | Pending | Pending | Every command reaches the same final state without stale effects |

## Search contract

```powershell
rg -n "FEATURE-BOARD|SPEC: BOARD-002|SPEC: BOARD-003|SPEC: BOARD-004|SPEC: ASYNC-001" index.rebuild.html
```

That one search reaches the board CSS and DOM plus RuntimeState, frame calculation, pointer input, shared settling, Effect Runner, commands, event bindings, and self-test. P2 remains inside the single HTML source.

## Historical artifacts

`p2-browser-check.cjs` and the PNG files in this directory were produced for the initial P2 implementation before the current corrective work. They are retained only as historical comparison material and **must not be treated as passing evidence for the current candidate**. They are not rerun for current acceptance.
