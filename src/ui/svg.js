// ===== SVG表示境界 =====
// SVGを生成するrendererと、DOMコンテナへの取り付けを分離する。
function svgMount(root,markup=''){
  if(!root)return null;
  root.replaceChildren();
  if(markup)root.insertAdjacentHTML('afterbegin',markup);
  return root;
}
function svgSetIcon(root,markup=''){return svgMount(root,markup);}
export {};
