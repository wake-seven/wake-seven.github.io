/** Minimal DOM-independent board view facade for development tooling. */
export function createBoardView({ document, root, cells = [], triangles = [], renderCell, renderTriangle } = {}) {
  const requireDocument = () => document ?? globalThis.document;
  const build = () => {
    const doc = requireDocument();
    if (!doc || !root) return false;
    root.replaceChildren();
    cells.forEach((cell, index) => {
      const element = renderCell?.({ document: doc, cell, index }) ?? doc.createElement('g');
      element.dataset.cell = String(index);
      root.append(element);
    });
    triangles.forEach((triangle, index) => {
      const element = renderTriangle?.({ document: doc, triangle, index }) ?? doc.createElement('g');
      element.dataset.triangle = String(index);
      root.append(element);
    });
    return true;
  };
  const render = (state, context) => {
    if (!root) return false;
    cells.forEach((cell, index) => renderCell?.({ document: requireDocument(), cell, index, state, context, element: root.querySelector(`[data-cell="${index}"]`) }));
    triangles.forEach((triangle, index) => renderTriangle?.({ document: requireDocument(), triangle, index, state, context, element: root.querySelector(`[data-triangle="${index}"]`) }));
    return true;
  };
  return Object.freeze({ build, render });
}
