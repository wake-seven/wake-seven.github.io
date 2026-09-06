# P0 baseline evidence — Wake Seven

## Scope and provenance

- Frozen target: `index.html` only. `README.md` was not consulted.
- Baseline ref: annotated tag `rebuild-baseline-2026-09-06` (`be03b8435a09074a6365ddc40f31998c2b5902b0`).
- Capture URL: `http://127.0.0.1:4173/index.html?debug=1`, served locally with `python -m http.server 4173 --bind 127.0.0.1`. The server is never exposed beyond loopback.
- Capture date: 2026-09-06 (Asia/Tokyo).
- Image renderer: Chrome headless, fresh per-viewport profile, `--virtual-time-budget=1200`; images are lossless PNG.
- Interactive confirmation: the local page was also opened and operated through the available CUA in-app browser. It confirmed normal-board navigation, menu → settings, the stage picker, and the debug-only application and speed entry controls without editing `index.html`.

The screenshots use a fresh profile. Therefore they intentionally show the first-run introduction dialog; the board visible behind it is the normal initial board, not a mocked screen. Debug mode only exposes existing in-page test controls and does not alter the game code.

## Stable screenshot ledger

| File | Viewport | State and way to reach it | What to compare |
| --- | --- | --- | --- |
| `pc-1440x1000-intro.png` | 1440 × 1000 CSS px | Fresh local profile → initial load → wait 1.2 s for the first-run intro | dialog backdrop/card, intro board, tile geometry, rods/axes, title, CTA, background and desktop centering |
| `mobile-360x800-intro.png` | 360 × 800 CSS px | Same fresh-profile procedure, mobile viewport | dialog/card fit, board scale, no horizontal clipping, type wrapping, CTA reachability, safe vertical spacing |
| `pc-1440x1000-normal-board.png` | 1440 × 1000 CSS px | Fresh profile → start → existing debug-only tutorial skip → dismiss the academy enrolment chain → stage 1 | interactive board, tile states, all six rods/axes, stage/remaining UI and enabled/disabled navigation |
| `pc-1440x1000-menu.png` | 1440 × 1000 CSS px | Normal debug URL → `メニュー` | menu panel position, routes, text wrapping and background interaction lock |
| `pc-1440x1000-stage-picker.png` | 1440 × 1000 CSS px | Same normal board → `ステージを選ぶ` | modal bounds, stage lock states, round navigation, free/custom routes and focus outline |
| `pc-1440x1000-settings-dialog.png` | 1440 × 1000 CSS px | Menu → `設定` | card size, backdrop, about/reset/close actions and keyboard focus |
| `pc-1440x1000-speed-entry.png` | 1440 × 1000 CSS px | Existing debug-only `速解き九番勝負9` control | speed title/progress, remaining-move header, 00:00 clock, pause control and board UI |
| `pc-1440x1000-clear-dialog.png` | 1440 × 1000 CSS px | Normal stage 1 → existing debug-only `即` clear control → wait for clear flow | solved board, dialog title/context, instructional text, close/next actions and backdrop |
| `mobile-360x800-normal-board.png` | 360 × 800 CSS px | Same normal-board preparation at 360 × 800 | playable board scale, control reachability, clipping and horizontal overflow |
| `mobile-360x800-menu.png` | 360 × 800 CSS px | Same mobile normal board → `メニュー` | mobile menu fit, tap targets, text wrapping and underlying board lock |

**Observed baseline exception:** `mobile-360x800-intro.png` visibly clips the right edge of the first-run dialog/card and its text at this viewport. This is evidence of the frozen current behavior, not an acceptance target for V2. Treat it as a responsive defect to eliminate unless the project owner explicitly requires pixel-for-pixel preservation under OPEN-002.

### Observed interactive states (CUA run)

| State | Reproduction from `?debug=1` | Observation |
| --- | --- | --- |
| Normal board | Initial stage (`だるま学園 / 入門クラス / 1 / 3`) | remaining-move indicator, seven-tile board, disabled previous/next navigation at the first stage |
| Menu and settings dialog | `メニュー` → `設定` | menu entries for stages/free/custom/guides/messages and a closable settings dialog containing about/reset/close actions |
| Stage picker | `ステージを選ぶ` | one accessible first-stage button, locked later stages, free/custom routes and close action |
| Application intro | Debug control `応用クラス9` | `だるま学園 / 応用クラス / 9 / 9`; board announced `1回まわして / この形をめざそう` and showed remaining 2 moves |
| Speed entry | Debug control `速解き九番勝負9` | `pc-1440x1000-speed-entry.png` confirms ninth-board UI, clock and pause control; pause/restart/reload remains a P7 comparison case |

## PC/mobile comparison contract

Run the same scenario on 1440 × 1000 and 360 × 800 CSS px. Capture before interaction, during any specified arrival/intro state, immediately after an accepted move, and while each modal is open. Compare the same language (Japanese), theme (default), sound setting, and a fresh/profile-reset start state unless the scenario explicitly tests restore.

Required comparison regions are: seven tiles and their orientation; all rods and gold axes; board frame/viewport clipping; remaining-move and stage UI; messages/callouts; menu/navigation controls; and dialog backdrop/card/title/body/actions/focus order. Confirm mouse on PC and touch/pointer behavior on mobile, plus Escape/Tab/Enter where the dialog exposes controls.

Acceptance tolerance: game-bearing geometry (tile centers, rods, axes, purple target frames, callout and speed-header placement) must be visually equivalent with no overlap, clipped control, or missing state. Dialogs must remain fully operable in the viewport. Non-game decorative shadows, antialiasing, and font rasterization may differ by browser; any change to color hierarchy, readable wrapping, spacing that changes interaction, or animation ordering is a defect, not a tolerated variance.

## Tag reproducibility check

Read-only verification was performed without checkout/reset:

```text
git show -s --format='%H' rebuild-baseline-2026-09-06
# be03b8435a09074a6365ddc40f31998c2b5902b0

git ls-tree rebuild-baseline-2026-09-06 -- index.html
# 100644 blob 2136f6c620eee64eb952da2e35526f3ee4a60bc9  index.html

git show rebuild-baseline-2026-09-06:index.html | git hash-object --stdin
git hash-object index.html
# both 2136f6c620eee64eb952da2e35526f3ee4a60bc9
```

Result: the tag resolves, contains `index.html`, and its blob equals the frozen working `index.html`. No frozen source file was changed during P0.

## Follow-up capture matrix

P1+ must extend this ledger with stable files for academy guidance, application intro at its key transitions, speed-running and pause/restart dialogs, clear flows, and every dialog classified as visual-regression critical in `P0_DIALOG_INVENTORY.md`. Those captures depend on OPEN-006 and the relevant phase implementation; they are deliberately not fabricated in P0.
