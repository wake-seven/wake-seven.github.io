# P0 dialog inventory

Source: frozen `index.html`. Line numbers are current baseline line numbers, recorded so a rebuild task can use `rg -n` to rediscover the source. “Restore now” describes current behavior, not a V2 commitment. The current persistence descriptor is captured at lines 4491–4524 and dispatched at 4529–4555; boot restoration occurs at 12814–12818.

| Dialog ID | Purpose / trigger | Close path | Restore now | V2 handling | Source anchors |
| --- | --- | --- | --- | --- | --- |
| `introDialog` | First-run game explanation; deferred boot (`openIntroGuide`) | `introStart` | Captured in generic fallback but no dedicated restore handler; first-run state is also governed by `wake7-intro-seen` | P8: do not restore mid-dialog; return to stable initial board | DOM 1148; open 6110; capture loop 4508 |
| `chainDialog` | Chained course/milestone notices, including academy/training transitions | action/previous buttons; `closeChainDialog` | Yes, `{type:'chain', name}` maps to `openChainedDialog` if name exists | P3/P8: allowlist after route/context validation | DOM 1156; open/close 6489/6510; map 4493/4530 |
| `twoMoveLessonDialog` | Two-move lesson and retry lesson | prev/next, OK, retry, backdrop | Generic fallback calls lesson opener with retry descriptor | P8: allow only a valid lesson/catalog context | DOM 1217; open/close 6782/6796; fallback 4508/4552 |
| `clearDialog` | Normal stage-clear card and optional tip/next route | close, next, child links | Yes only when `clearShown && isSolved()`; rebuilt through clear feature | P3: required allowlist entry, restoring a stable solved state not animation time | DOM 1230; capture 4494; map 4531; clear restore 11296 |
| `messageDialog` | Review of post-clear messages | prev/next/close and child links | Captured with index; restore handler is indirect/partial and must validate available entries | P8: allowlist only after index/return route validation | DOM 1259; capture 4495; render refs 12524 |
| `optimalFailDialog` | Shortest-path failure / retry | retry button | Yes, when optimal-clear condition remains true | P8: allow only with a valid failed puzzle context | DOM 1288; render 9683; restore 4548–4551 |
| `masterDialog` | Course completion, examination and speed completion branches | close, start, optional link/share interactions | Yes, `kind` is passed to `showMasterDialog` | P3/P8: allowlist only known catalog kinds; validate rewards/routes | DOM 1297; show 10534; capture/map 4499/4541 |
| `speedPauseDialog` | Pauses an active speed run and shows stats | restart or resume | Yes, dedicated descriptor | P7: restore as paused only, pending OPEN-007 | DOM 1330; open 5476; capture 4500 |
| `speedRestartDialog` | Confirmation before restarting speed run | cancel/confirm | Yes, dedicated descriptor | P7/P8: allow only with valid active speed session | DOM 1339; capture 4501 |
| `rankDialog` | Collected title list, possibly opened from another dialog | close, restore return target | Yes, but return target must exist | P8: allowlist only with validated return target; otherwise stable board | DOM 1346; open 11555; capture 4502 |
| `resetDialog` | Progress reset / complete reset confirmation | ×, confirm, complete reset | Generic fallback captures open state but lacks context-safe dedicated renderer | P8: do not restore; return to settings/stable board | DOM 1354; close binding 12792–12797; fallback 4508 |
| `aboutDialog` | Game/about information | close or backdrop | Generic fallback only | P8: do not restore | DOM 1362; close event 11888–11889; fallback 4508 |
| `settingsDialog` | Settings menu, links to about/reset | close or backdrop | Not represented by dedicated capture descriptor | P8: do not restore; settings persist separately | DOM 1372; close 9763/11894; boot list 12806 |
| `boardThemeDialog` | Board-theme selection | close or backdrop | Generic fallback only | P8: do not restore; selected theme persists as settings | DOM 1383; open 5151; close 12587; fallback 4508 |
| `twoMoveDialog` | Two-move pattern list | close/backdrop, then optional detail | Yes, dedicated descriptor | P8: allowlist with valid catalog index | DOM 1404; open 9542; capture 4506 |
| `guideHubDialog` | Guide hub for tips/patterns | close/backdrop | Yes, dedicated descriptor | P8: do not restore; it is a navigational overlay | DOM 1415; open/close 12368/12374; capture 4504 |
| `twoMoveDetailDialog` | Detailed two-move pattern board/comparison | close/backdrop; return target may be another dialog | Yes, state/index descriptor | P8: allow only valid state/index and return route | DOM 1425; open/close 9568/9578; capture 4505 |
| `tipGuideDialog` | Interactive tip guide and comparison mode | close/backdrop; may return to clear/message | Yes, descriptor only | P8: do not restore unless all descriptor/return data can be reconstructed; default closed | DOM 1436; open/close 12321/12351; capture 4503 |
| `stagePicker` | Modal stage/round picker (not a `.game-dialog-backdrop`) | close, selection, rank route | Not included in `captureDialogState` | P8: do not restore; reopening must follow current navigation policy | DOM 1448; open 9912/9987; close 9830 |

## Known current limitations

The generic capture fallback (4508–4511) records only an open ID for several dialogs. It cannot preserve dynamic body content, return target, focus target, animation frame, or permission to act. V2 must treat those records as insufficient and use the OPEN-006 allowlist rather than reproducing a broken restoration path.
