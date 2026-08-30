/** Pure ES module version of the board domain used by development tooling. */
export function createBoardDomain({ cellCount, triangles }) {
  const N = cellCount;
  const powers = Array.from({ length: N }, (_, i) => 3 ** i);
  const stateCount = 3 ** N;
  const encode = board => board.reduce((state, value, i) => state + value * powers[i], 0);
  const decode = state => Uint8Array.from({ length: N }, () => { const value = state % 3; state = (state / 3) | 0; return value; });
  const roll = (board, triangleIndex, direction) => {
    const next = Uint8Array.from(board), cells = triangles[triangleIndex].cells;
    for (let i = 0; i < 3; i++) {
      const from = direction > 0 ? cells[i] : cells[(i + 1) % 3];
      const to = direction > 0 ? cells[(i + 1) % 3] : cells[i];
      next[to] = (board[from] + (direction > 0 ? 1 : 2)) % 3;
    }
    return next;
  };
  const swipe = (board, triangleIndex, direction) => {
    const next = Uint8Array.from(board), cells = triangles[triangleIndex].cells;
    for (let i = 0; i < 3; i++) {
      const from = direction > 0 ? cells[i] : cells[(i + 1) % 3];
      const to = direction > 0 ? cells[(i + 1) % 3] : cells[i];
      next[to] = board[from];
    }
    return next;
  };
  const click = (board, triangleIndex, direction = 1) => {
    const next = Uint8Array.from(board);
    for (const cell of triangles[triangleIndex].cells) next[cell] = (next[cell] + direction + 3) % 3;
    return next;
  };
  const center = (board, direction = 1) => {
    const next = Uint8Array.from(board);
    next[Math.floor(N / 2)] = (next[Math.floor(N / 2)] + direction + 3) % 3;
    return next;
  };
  const buildSolver = kind => {
    const dist = new Uint8Array(stateCount).fill(255), byDepth = [];
    let frontier = [0]; dist[0] = 0; byDepth.push([0]);
    let depth = 0;
    while (frontier.length) {
      const next = [];
      for (const state of frontier) {
        const board = decode(state);
        for (let triangleIndex = 0; kind !== 'center' && triangleIndex < triangles.length; triangleIndex++) {
          const candidates = kind === 'triple'
            ? [encode(click(board, triangleIndex, -1))]
            : kind === 'roll'
              ? [encode(roll(board, triangleIndex, 1)), encode(roll(board, triangleIndex, -1))]
              : [encode(swipe(board, triangleIndex, 1)), encode(swipe(board, triangleIndex, -1))];
          for (const candidate of candidates) if (dist[candidate] === 255) { dist[candidate] = depth + 1; next.push(candidate); }
        }
        if (kind === 'center') {
          const candidate = encode(center(board, -1));
          if (dist[candidate] === 255) { dist[candidate] = depth + 1; next.push(candidate); }
        }
      }
      if (next.length) byDepth.push(next);
      frontier = next; depth++;
    }
    return { dist, byDepth };
  };
  return Object.freeze({ N, powers, stateCount, encode, decode, swipe, click, roll, center, buildSolver });
}
