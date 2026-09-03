import assert from 'node:assert/strict';
import { createBoardDomain } from '../src/domain/board-domain.mjs';

// 実ゲームと同じ7枚配置・6つの三角形を、DOMなしで組み立てる。
const cells = [[.5, 0], [1.5, 0], [0, 1], [1, 1], [2, 1], [.5, 2], [1.5, 2]];
const width = Math.sqrt(3) * 54;
const height = 1.5 * 54;
const points = cells.map(([x, y]) => ({ x: x * width, y: y * height }));
const near = (a, b) => Math.abs(Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y) - width) < 2;
const triangles = [];
for (let a = 0; a < cells.length; a++) {
  for (let b = a + 1; b < cells.length; b++) {
    for (let c = b + 1; c < cells.length; c++) {
      if (!near(a, b) || !near(b, c) || !near(a, c)) continue;
      const cx = (points[a].x + points[b].x + points[c].x) / 3;
      const cy = (points[a].y + points[b].y + points[c].y) / 3;
      const ordered = [a, b, c].sort((p, q) =>
        Math.atan2(points[p].y - cy, points[p].x - cx) - Math.atan2(points[q].y - cy, points[q].x - cx));
      triangles.push({ cells: ordered });
    }
  }
}

const domain = createBoardDomain({ cellCount: cells.length, triangles });
assert.equal(domain.N, 7);
assert.equal(domain.stateCount, 2187);
assert.equal(triangles.length, 6);

const sameBoard = (a, b) => a.length === b.length && a.every((value, index) => value === b[index]);
const zero = new Uint8Array(7);

// enc/dec は全2187状態で相互変換できることを確認する。
for (let state = 0; state < domain.stateCount; state++) {
  assert.equal(domain.encode(domain.decode(state)), state, `encode/decode state ${state}`);
}

// rollは逆方向で戻り、3回同方向に回すと元に戻る。
const sample = Uint8Array.from([0, 1, 2, 1, 2, 0, 1]);
for (let ti = 0; ti < triangles.length; ti++) {
  const clockwise = domain.roll(sample, ti, 1);
  const counterClockwise = domain.roll(clockwise, ti, -1);
  assert.ok(sameBoard(counterClockwise, sample), `roll inverse triangle ${ti}`);
  assert.ok(sameBoard(domain.roll(domain.roll(clockwise, ti, 1), ti, 1), sample), `roll cycle triangle ${ti}`);
}

// clickも3回で元に戻り、正負方向が逆操作になる。
for (let ti = 0; ti < triangles.length; ti++) {
  const clicked = domain.click(sample, ti, 1);
  assert.ok(sameBoard(domain.click(domain.click(clicked, ti, 1), ti, 1), sample), `click cycle triangle ${ti}`);
  assert.ok(sameBoard(domain.click(clicked, ti, -1), sample), `click inverse triangle ${ti}`);
}

// 盤面の回転とセンター操作は対象外のセルを変更しない。
for (let ti = 0; ti < triangles.length; ti++) {
  const next = domain.roll(sample, ti, 1);
  const affected = new Set(triangles[ti].cells);
  sample.forEach((value, index) => { if (!affected.has(index)) assert.equal(next[index], value); });
}
const centered = domain.center(sample, 1);
sample.forEach((value, index) => { if (index !== 3) assert.equal(centered[index], value); });

// 最短手数を検証する。全状態の距離分布も、ゲームの12通り探索と一致する。
const distances = domain.buildSolver('roll').dist;
const distribution = [...distances].filter(distance => distance < 255).reduce((counts, distance) => {
  counts[distance] = (counts[distance] ?? 0) + 1;
  return counts;
}, []);
assert.deepEqual(distribution, [1, 12, 102, 402, 212]);
assert.equal(distances[domain.encode(zero)], 0);
for (let ti = 0; ti < triangles.length; ti++) {
  for (const direction of [1, -1]) {
    const next = domain.roll(zero, ti, direction);
    assert.equal(distances[domain.encode(next)], 1, `one-move distance triangle ${ti}/${direction}`);
  }
}

// 回転・反転で同一視した代表盤面は、1/9/39/24の73パターンになる。
const permutationFor = (angle, mirror = false) => {
  const q = angle * Math.PI / 180;
  return points.map(point => {
    let x = point.x - points[3].x;
    let y = point.y - points[3].y;
    if (mirror) x = -x;
    const tx = points[3].x + x * Math.cos(q) - y * Math.sin(q);
    const ty = points[3].y + x * Math.sin(q) + y * Math.cos(q);
    return points.reduce((best, candidate, index) => {
      const distance = Math.hypot(candidate.x - tx, candidate.y - ty);
      return distance < best.distance ? { index, distance } : best;
    }, { index: 0, distance: Infinity }).index;
  });
};
const symmetries = [0, 60, 120, 180, 240, 300].flatMap(angle => [
  { permutation: permutationFor(angle), mirror: false },
  { permutation: permutationFor(angle, true), mirror: true }
]);
const transformState = (state, permutation, mirror = false) => {
  const board = domain.decode(state);
  const transformed = new Uint8Array(7);
  permutation.forEach((target, source) => { transformed[target] = mirror ? (3 - board[source]) % 3 : board[source]; });
  return domain.encode(transformed);
};
const canonical = state => Math.min(...symmetries.map(symmetry => transformState(state, symmetry.permutation, symmetry.mirror)));
const representatives = new Map();
for (let state = 0; state < domain.stateCount; state++) {
  if (distances[state] < 1 || distances[state] > 4) continue;
  representatives.set(canonical(state), distances[state]);
}
const byDepth = [...representatives.values()].reduce((counts, depth) => {
  counts[depth] = (counts[depth] ?? 0) + 1;
  return counts;
}, []);
assert.deepEqual(byDepth, [, 1, 9, 39, 24]);
assert.equal(representatives.size, 73);

console.log('board-domain tests passed: 2187 round-trips, roll/click invariants, solver distances, 73 canonical patterns');
