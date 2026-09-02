// ===== 盤面アニメーション補助 =====
// 自動回転・戻す演出で共有する、クローン盤面の生成と状態反映だけを担当する。
// 実際の盤面状態は board-ui.js 側で確定し、このヘルパーは表示中の一時状態を扱う。
function animationTileState(turn){
  return mod3(turn)===0?'stand':'fallen';
}
const APPLICATION_TARGET_FRAME_CLASS='application-target-overlay';
const APPLICATION_TARGET_LAYER_CLASS='application-target-overlay-layer';
// 応用編の目標枠を描画する共通API。枠をパネルの外側に一度だけ作り、
// 対象パネルと同じ親・同じtransformの下に置くことで、隣接パネルに隠れず、
// スワイプや開始演出でも物理パネルに追従させる。
function clearApplicationTargetLayer(root=svg){
  root?.querySelectorAll?.('.'+APPLICATION_TARGET_LAYER_CLASS).forEach(layer=>layer.remove());
  root?.querySelectorAll?.('.'+APPLICATION_TARGET_FRAME_CLASS).forEach(frame=>frame.remove());
}
function renderApplicationTargetLayer(root,tiles,targetTiles,{anchorSelector=null}={}){
  if(!root)return null;
  clearApplicationTargetLayer(root);
  const marked=new Set(targetTiles||[]);
  const layer=document.createElementNS('http://www.w3.org/2000/svg','g');
  layer.setAttribute('class',APPLICATION_TARGET_LAYER_CLASS);
  for(const tile of tiles||[]){
    if(!marked.has(tile))continue;
    const hex=tile.querySelector?.('.hex');
    if(!hex)continue;
    const frame=document.createElementNS('http://www.w3.org/2000/svg','path');
    frame.setAttribute('class',APPLICATION_TARGET_FRAME_CLASS);
    frame.setAttribute('d',hex.getAttribute('d')||'');
    if(tile.style.transform)frame.style.transform=tile.style.transform;
    layer.appendChild(frame);
  }
  const anchor=anchorSelector?root.querySelector(anchorSelector):null;
  if(anchor)root.insertBefore(layer,anchor);else root.appendChild(layer);
  return layer;
}
// タイルの描画順はここだけで決める。棒・軸の前に目標タイルを置き、
// 目標枠レイヤーはその直後に置くため、棒や軸より背面で全周が見える。
function placeApplicationTargetTiles(root,tiles,targetTiles,{anchorSelector='.pivot'}={}){
  if(!root)return;
  const marked=new Set(targetTiles||[]);
  const anchor=anchorSelector?root.querySelector(anchorSelector):null;
  for(const tile of tiles||[]){
    if(marked.has(tile))continue;
    if(anchor)root.insertBefore(tile,anchor);else root.appendChild(tile);
  }
  for(const tile of tiles||[]){
    if(!marked.has(tile))continue;
    if(anchor)root.insertBefore(tile,anchor);else root.appendChild(tile);
  }
}
// 回転中の一時グループは、通常タイルの後ろかつ軸・棒の直前に置く。
// SVGではグループ内の要素を動かしても、グループ自身の描画順が変わらないため、
// 末尾へ追加するのではなく、盤面のタイル層の最前面へ明示的に挿入する。
function placeSwipeGroupOnTop(group,root=svg){
  const marker=root?.querySelector('.pivot');
  if(marker)root.insertBefore(group,marker);
  else root?.appendChild(group);
}
function createSwipeGroup(items,pivot){
  const group=document.createElementNS('http://www.w3.org/2000/svg','g');
  group.setAttribute('class','auto-swipe-group');
  // 静止時の枠は回転中のクローンと二重になり、古い位置に残って見えるため退避する。
  // アニメーション終了後のpaint()で、現在位置に再生成される。
  clearApplicationTargetLayer(svg);
  const clones=[];
  // 同じ回転グループ内でも、目標パネルを最後に描画する。
  // SVGは後から描画した要素が前面になるため、隣接パネルに枠を隠されない。
  const orderedItems=[...items].sort((a,b)=>
    Number(a.el.classList.contains('application-target'))-
    Number(b.el.classList.contains('application-target')));
  for(const item of orderedItems){
    const clone=item.el.cloneNode(true);
    clone.style.transform=orbitTransform(item,0,pivot);
    const marked=item.el.classList.contains('application-target');
    clone.setAttribute('class','tile '+animationTileState(item.turn)+(marked?' application-target':''));
    item.el.style.visibility='hidden';
    group.appendChild(clone);
    clones.push({item,clone,hex:clone.querySelector('.hex')});
  }
  // 枠は共有APIで生成し、クローンと同じ回転グループに置く。
  renderApplicationTargetLayer(group,clones.map(({clone})=>clone),
    clones.filter(({clone})=>clone.classList.contains('application-target')).map(({clone})=>clone));
  placeSwipeGroupOnTop(group);
  return {group,clones};
}
function updateAutoSwipePreview(clones,progress,turnDelta){
  for(const {item,clone,hex} of clones){
    const turn=progress>=.5?item.turn+turnDelta:item.turn;
    const state=animationTileState(turn);
    const marked=clone.classList.contains('application-target');
    clone.setAttribute('class','tile '+state+(marked?' application-target':''));
    if(hex){
      const tone=BOARD_THEME_TONES[boardTheme]?.[state];
      hex.style.fill=tone?.fill||'';
      hex.style.stroke=tone?.stroke||'';
    }
  }
}
// 公開ネイティブモジュールの構文境界。
export {};
