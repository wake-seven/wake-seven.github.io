// ===== 盤面アニメーション補助 =====
// 自動回転・戻す演出で共有する、クローン盤面の生成と状態反映だけを担当する。
// 実際の盤面状態は board-ui.js 側で確定し、このヘルパーは表示中の一時状態を扱う。
function animationTileState(turn){
  return mod3(turn)===0?'stand':'fallen';
}
function createSwipeGroup(items,pivot){
  const group=document.createElementNS('http://www.w3.org/2000/svg','g');
  group.setAttribute('class','auto-swipe-group');
  const clones=[];
  for(const item of items){
    const clone=item.el.cloneNode(true);
    clone.style.transform=orbitTransform(item,0,pivot);
    clone.setAttribute('class','tile '+animationTileState(item.turn));
    item.el.style.visibility='hidden';
    group.appendChild(clone);
    clones.push({item,clone,hex:clone.querySelector('.hex')});
  }
  svg.appendChild(group);
  return {group,clones};
}
function updateAutoSwipePreview(clones,progress,turnDelta){
  for(const {item,clone,hex} of clones){
    const turn=progress>=.5?item.turn+turnDelta:item.turn;
    const state=animationTileState(turn);
    clone.setAttribute('class','tile '+state);
    if(hex){
      const tone=BOARD_THEME_TONES[boardTheme]?.[state];
      hex.style.fill=tone?.fill||'';
      hex.style.stroke=tone?.stroke||'';
    }
  }
}
// 公開ネイティブモジュールの構文境界。
export {};
