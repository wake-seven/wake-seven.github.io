# P1 verification evidence — board domain and static board

## Scope

- Candidate: `http://127.0.0.1:4174/index.rebuild.html`
- Current-version reference: `http://127.0.0.1:4174/index.html?debug=1`
- Viewports: 1440 × 1000 and 360 × 800 CSS px
- Renderer: bundled Playwright driving installed Chrome, with a fresh browser context for each page and viewport
- P1 scope only: `BOARD-001`. No rods, controls, pointer input, or P2 behavior is exposed by the candidate.

## Stable screenshots

| File | Viewport | Result |
| --- | --- | --- |
| `pc-1440x1000-static-board.png` | 1440 × 1000 | Initial reference problem, seven cells, no clipping |
| `mobile-360x800-static-board.png` | 360 × 800 | Initial reference problem, seven cells, no horizontal clipping |

## Current-version comparison

The current version and candidate were loaded in the same Chrome run. Values below are browser-observed values, not estimates from the screenshots.

| Check | Current version | P1 candidate | Result |
| --- | ---: | ---: | --- |
| Board width at 1440 px | 558 px | 558 px | match |
| Board width at 360 px | 352 px | 352 px | match |
| SVG viewBox | `14 0 293 310` | `14 0 293 310` | match |
| Cell count | 7 | 7 | match |
| Standing panel fill | `rgb(247, 238, 220)` | `rgb(247, 238, 220)` | match |
| Fallen panel fill | `rgb(188, 205, 211)` | `rgb(188, 205, 211)` | match |
| Panel border | `rgb(192, 172, 136)` | `rgb(192, 172, 136)` | match |
| Initial fallen cells | 0, 1, 3 | 0, 1, 3 | match |
| Initial rotations | `120,120,0,120,0,0,0` degrees | `120,120,0,120,0,0,0` degrees | match |

All seven candidate cell centers match the current version after rounding to the current renderer's two decimals:

```text
(113.54,74) (207.07,74)
(66.77,155) (160.30,155) (253.83,155)
(113.54,236) (207.07,236)
```

The six current-version axis centers and outward grip centers were captured from its live SVG. P1 independently checks the same values during boot:

| Axis | Pivot | Grip |
| ---: | --- | --- |
| 0 | (160.30, 101) | (160.30, 69) |
| 1 | (113.54, 128) | (85.82, 112) |
| 2 | (207.07, 128) | (234.78, 112) |
| 3 | (113.54, 182) | (85.82, 198) |
| 4 | (207.07, 182) | (234.78, 198) |
| 5 | (160.30, 209) | (160.30, 241) |

Axes are validated geometry in P1; they are intentionally not visible controls. Visible rods and pointer operation begin in P2.

## Automated verification

Chrome completed the in-page self-test before each screenshot and exposed this result on `#w7-board`:

```text
data-selftest="passed"
data-checked-states="2187"
data-checked-axes="6"
data-checked-renders="7+7"
```

The self-test verifies:

- encode/decode across all 2187 possible 3-value × 7-cell states;
- forward roll followed by inverse roll for every state and all six axes;
- solver reachability (729 reachable, 1458 unreachable) and distance distribution `1,12,102,402,212`;
- a distance-reducing move for every reachable non-solved state;
- the one P1 reference problem (`stage-001`, state 31, par 1);
- the six axis cell groups, pivots, and grip points against the current-version values above;
- initial-board rendering, including all seven exact rotations;
- solved-board rendering, including seven standing cells at zero rotation.

## Search contract

One command locates the entire implemented board feature:

```powershell
rg -n "FEATURE-BOARD|SPEC: BOARD-001" index.rebuild.html
```

Its results lead directly to:

- CSS at lines 20–28;
- board DOM and the copied daruma SVG assets at lines 33–67;
- board constants, domain, view transform, renderer, and self-test inside the single JavaScript feature range at lines 76–307.

There are no empty controls/event sections, future feature anchors, or multi-stage catalog placeholders in the P1 source.
