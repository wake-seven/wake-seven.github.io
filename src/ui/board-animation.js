// ===== 盤面アニメーション補助 =====
// 自動回転・戻す演出で共有する、クローン盤面の生成と状態反映だけを担当する。
// 実際の盤面状態は board-ui.js 側で確定し、このヘルパーは表示中の一時状態を扱う。
function animationTileState(turn){
  return mod3(turn)===0?'stand':'fallen';
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
