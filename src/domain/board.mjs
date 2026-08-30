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
  return Object.freeze({ N, powers, stateCount, encode, decode, roll });
}
