# P8a layout comparison

This is the working comparison record for `index.html` and `index.rebuild.html`. A row is **not** marked visually confirmed until both pages have been inspected at the same course, question, lap, theme, layout, dialog state, and viewport. Source inspection can identify a difference, but cannot prove placement parity.

## Comparison contract

- Baseline: `index.html`; rebuild target: `index.rebuild.html`.
- Required viewports: desktop 1280×900 and phone 360×800.
- Compare position, visible size, order, and spacing. Browser font rasterization, shadows, and anti-aliasing are not layout failures by themselves.
- Keep approved rebuild behavior: the simultaneous seven-panel arrival and the application three-panel flash.
- Debug controls may reach a state, but are never part of that state’s normal-page placement reference.

## P8a shared-screen observations

| Group | State | Current evidence | P8 action | Status |
| --- | --- | --- | --- | --- |
| Header | Normal course | **HTTP runtime observation (2026-09-18):** rebuild menu exposes stage, free, custom, and unlocked speed. It closes by Escape/outside click, returns focus to the toggle, and its item clicks are not mistaken for outside clicks. | Sound, language, rank, and the later menu destinations still belong to P8b–P8d. | Behavior confirmed; exact viewport measurements recorded below |
| Header title | 入門クラス 1 / 3、通常操作中 | At both required viewports the title top matches old (desktop 61.5px; phone 41.0px). The rebuild title is a full-width heading while the old page measures its text width only; this is not a placement difference. | Keep the current title markup; do not imitate old text-width layout just for a rect value. | Confirmed |
| Course identity | Training | **Source observation:** old has previous / stage card / next; rebuild has a centered stage label. | P8b owns old stage navigation behavior. Keep the current label until that route is implemented. | Known difference; visual comparison pending |
| Board frame | 入門クラス 1 / 3、通常操作中 | At 1280×900, old/new board is 558×590.4px and its top is 275.7/277.1px. At 360×800, old is 352×372.4px; rebuild is also 352×372.4px at x=4px. The rebuild dev tray is a fixed 192px internal scroll, so it does not create a page scrollbar or narrow any normal board. | Keep the fixed, bounded dev tray on phone. It preserves every debug entry while separating it from normal-page placement. | Shared board confirmed |
| Academy HUD | 入門クラス 1 / 3、通常操作中 | Desktop: old/new shared HUD row top is 217.2/217.8px, 51px high; board follows at 275.7/277.1px. Phone: HUD top 144.3/144.7px, 34px high. | Keep the rem-height / transform-only counter rule. It preserves the vertical rhythm without changing board SVG coordinates. | Confirmed for vertical placement |
| Speed HUD | Nine/eighteen/twenty-seven/seventy-three | Rebuild has dedicated remaining/timer/pause layouts. | Preserve the accepted one-line phone behavior; compare offsets after menu work. | Pending |
| Dialog frame | Welcome/clear/failure/pause | Rebuild has shared backdrop and course-specific card variants; scroll-lock correction is code-reviewed only. | Compare card width, outer margin, title order, and actions by dialog type. | Pending |
| Tilted board | Satori theme + tilted layout | Rebuild uses a presentation transform with separate pointer conversion. | Do not make layout-only changes without checking pointer/grip behavior too. | Pending |

### Recorded same-course HTTP observation

On 2026-09-18, both pages were opened through the local HTTP server, entered the normal **だるま学園 / 入門クラス 1 / 3** state, and were measured after the introductory dialogs were closed. This is a real browser observation, not a `file:///` result. The 1001px-wide observation remains useful for detecting structural drift; the required viewport measurements follow it.

| Page | Stable state | Stage / HUD / board rect | Observation |
| --- | --- | --- | --- |
| `index.html` | だるま学園 / 入門クラス 1 / 3; no dialog | stage top 118px, 558×78px; HUD top 217px, 558×51px; board top 276px, 558×590px | Reference layout. The stage area includes working previous/next controls, which is P8b scope. |
| `index.rebuild.html` (before HUD correction) | 同上; no dialog | stage top 121px, 330×76px; HUD top 213px, 558×114px; board top 342px, 558×590px | Board size matched, but the scaled academy HUD created a 66px vertical drift. |
| `index.rebuild.html` (after HUD correction) | 同上; no dialog | stage top 121px, 330×76px; HUD top 218px, 558×51px; board top 277px, 558×590px; number visual height 77px | HUD and board are within 1–2px of the old reference. The number is visually enlarged without increasing the HUD row, as in the old page. The narrower non-interactive stage label remains intentional until P8b can supply the old working navigation instead of decorative controls. |

### Required viewport measurements (HTTP, same state)

| Viewport | Page | title top | stage top / size | shared HUD top / height | board top / size | Result |
| --- | --- | ---: | --- | --- | --- | --- |
| 1280×900 | `index.html` | 61.5px | 118.2px / 558×78px | 217.2px / 51px | 275.7px / 558×590.4px | Reference |
| 1280×900 | `index.rebuild.html` | 61.5px | 120.6px / 330×75.6px | 217.8px / 51px | 277.1px / 558×590.4px | Board/HUD vertical placement matches; stage width is the P8b navigation gap. |
| 360×800 | `index.html` | 41.0px | 78.3px / 344×52px | 144.3px / 34px | 183.3px / 352×372.4px | Reference |
| 360×800 | `index.rebuild.html` | 41.0px | 79.9px / 220×50.4px | 144.7px / 34px | 184.3px / 352×372.4px | Shared board/HUD placement and board width match. Debug buttons remain reachable through their fixed 192px tray scroll. |

## Runtime comparison status

A local read-only HTTP server is available for this work; direct `file:///` results must not be used as the visual reference. Required PC and phone measurements are signed off for the shared board/HUD. The phone debug tray is deliberately a fixed internal scroll region, so it cannot create a page scrollbar and change the board width. The remaining P8a rows (speed HUD, dialog frame, tilted board) still require their own state-by-state comparison.

## P8a behavior differences discovered by source comparison

| Difference | Rebuild correction | Verification |
| --- | --- | --- |
| Academy navigation factories could lose lap 2. | Navigation, app-state factories, return-route normalization, recovery, and next-puzzle creation preserve lap 2. | Self-test checks lap-2 navigation and recovery. |
| Second-lap courses reused the first-lap problem state instead of old version's 180° view. | `transformPuzzleForCampaignLap` transforms the stage state, application target panels, development preferred rod / first move / first-after state together with `SECOND_LAP_PUZZLE_SYMMETRY`; common board, solver, pointer, undo, restart, and clear examples then read one descriptor. | Startup self-test checks transformed state, PAR, all application target panels, and every development first-move descriptor. |
| A raw persisted `lap:2` could bypass the first-lap satori gate. | Persistent navigation clamps to lap 1 unless the first-lap satori catalog is complete. | Self-test checks both accepted and rejected restores. |
| Second lap had normal drag/continuous input and first-lap candidate/rewind restrictions. | A lap-2 stage move commits on the first 3° of circular swipe and the existing common rotation settles it to 120°; lap 2 removes academy candidate limits and application rewind only. | Self-test covers the policy; manual PC/touch check remains required. |
| Application lap 2 still showed the first-lap target introduction, upper-right preview, and three-panel flash. | One `usesAcademyApplicationVisualGuide` policy now gates those three visual aids; puzzle `targetCells` remains available for clear-dialog examples. | Startup self-test checks lap 1 enabled / lap 2 disabled. |
| A persisted speed session could retain a lap-2 return route without first-lap satori completion. | `normalizeSpeedReturnRoute` now accepts progress and applies the same first-lap satori gate at session creation, restore, result, and trial-entry paths. | Startup self-test rejects the raw route without satori and accepts it only after the full first-lap catalog. |
| Second-lap clear and course boundaries were only tested with pre-filled factory progress. | Self-test now verifies the lap-2 clear write and F5 normalization through development→training, training→mastery, and mastery→satori boundaries. | Startup self-test. |
| Rebuild had no normal menu entry, and leaving a speed session had no explicit discard boundary. | `menu` / `メニュー` code now owns the four P8a mode entries, open/close/focus behavior, and the speed-pause handoff. A speed target is only stored in runtime; cancel returns to the unchanged pause dialog, while confirm removes only `activeSession` and uses the existing normal/free/custom factories. | HTTP runtime check: custom→free→stage return; free→speed picker→nine start; picker close; speed awaiting→free; paused speed→menu→free→cancel; paused speed→menu→free→confirm. Startup self-test covers return targets, unstarted leave, and paused-session reload. |
| Leaving speed mode could leave its timer HUD visible on a non-speed route. | Non-speed status rendering explicitly hides the speed HUD; custom editor rendering restores its own status visibility on later route changes. | HTTP runtime check after speed→custom confirmation. |
| A common dialog marked itself modal but keyboard focus could still leave its card, and a paused speed menu opened behind that card. | While a dialog is present, the app shell is inert/aria-hidden, pointer-blocked, and Tab-cycled inside the dialog. Opening the paused-speed menu temporarily hides the pause card; closing the menu restores the pause card and its `再開する` focus. | HTTP runtime check at 360×800: enroll dialog Tab cycles; paused speed → メニューへ hides the dialog, Escape restores it with focus on `再開する`. |
| Paused speed leave self-test only exercised app-state factories, not the runtime confirmation flags used by the UI. | Request / cancel / confirm share `makePausedSpeedLeave…` transactions. The intents apply those patches and startup self-test runs the same transaction sequence without mutating live runtime. | Fresh HTTP startup reports `data-selftest="passed"`; console error log empty. |
