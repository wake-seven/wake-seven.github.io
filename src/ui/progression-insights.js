// 進行画面の補助的な鑑賞・解説UI。盤面本体の進行状態は変更しない。
// 名人の盤面、最短2手の見本、クリア後の形ルールをここで描画する。
function masteryBoardSvg(tilted=false,forceStandardColor=false){
  const tiles=CELL.map((cell,i)=>{
    const color=forceStandardColor?'':darumaBodyColor(i);
    return '<g class="tile stand mastery-tile" data-cell="'+i+'" style="'+(color?'--daruma-body:'+color+';':'')+'transform:'+tileTransform(cell.x,cell.y,0)+'">'
    +'<path class="hex" d="'+hexPath(R)+'"/><g class="mastery-daruma-shell"'+(tilted?' transform="rotate(30)"':'')+'><use href="#daruma-body"/><g class="open"><use href="#face-open"/></g><g class="shut"><use href="#face-shut"/></g><g class="happy"><use href="#face-happy"/></g></g></g>';
  }).join('');
  const layout=tilted?'<g transform="rotate(-30 160 155)">'+tiles+'</g>':tiles;
  return '<svg viewBox="14 0 293 310" aria-hidden="true">'+layout+'</svg>';
}
const masteryBoardRuns=new Map();
function animateMasteryBoard(id){
  const board=$(id);
  const run=masteryBoardRuns.get(id);
  const play=()=>{
    if(run!==masteryBoardRuns.get(id)||board.hidden||!board.isConnected)return;
    const tiles=[...board.querySelectorAll('.mastery-tile')];
    if(!tiles.length||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    let remaining=tiles.length;
    tiles.forEach(tile=>{
      const from=Number(tile.dataset.cell),to=VIEW_ROTATE_60[from];
      const middle=rotatePointAroundBoard(CELL[from],30);
      const final=tileTransform(CELL[to].x,CELL[to].y,0);
      const animation=tile.animate([
        {transform:tileTransform(CELL[from].x,CELL[from].y,0)},
        {transform:tileTransform(middle.x,middle.y,0),offset:.5},
        {transform:final}
      ],{duration:680,easing:'cubic-bezier(.2,.72,.2,1)',fill:'forwards'});
      animation.onfinish=()=>{
        if(run!==masteryBoardRuns.get(id))return;
        tile.style.transform=final;tile.dataset.cell=to;
        if(--remaining===0)setUiEffectTimer('mastery-board:'+id,'cycle',play,130);
      };
    });
  };
    setUiEffectTimer('mastery-board:'+id,'cycle',play,180);
}
function renderMasteryBoard(id,show,theme='gold',animate=true){
  const board=$(id);
  clearUiEffectTimers('mastery-board:'+id);
  masteryBoardRuns.set(id,(masteryBoardRuns.get(id)||0)+1);
  board.getAnimations?.({subtree:true}).forEach(animation=>animation.cancel());
  board.classList.toggle('satori-theme',show&&theme.startsWith('satori'));
  board.classList.toggle('tilted-theme',show&&(theme==='satori-tilted'||theme==='gold-3d'));
  board.classList.toggle('pseudo-3d',show&&theme==='gold-3d');
  board.hidden=!show;
  board.innerHTML=show?masteryBoardSvg(theme==='satori-tilted'||theme==='gold-3d',theme==='gold-3d'):'';
  if(show&&animate)animateMasteryBoard(id);
}
function renderTwoMovePatterns(){
  const controls=[['rotateBack','rotateCcw'],['rotate','rotateCw'],['mirror','mirror'],['vertical','flipVertical']];
  const cardTemplate=document.getElementById('two-move-card-template');
  const grid=$('twoMoveGrid');
  if(!cardTemplate){
    grid.innerHTML=twoMoveDisplayStates.map((state,index)=>{
      const buttons=controls.map(([transform,label])=>'<button class="chip" type="button" data-two-move-transform="'+transform+'" aria-label="'+tr(label)+'">'+transformIcon(transform)+'</button>').join('');
      return '<article class="two-move-card" data-state="'+state+'" data-pattern="'+twoMoveDisplayPatterns[index]+'" data-board-index="'+index+'"><div class="two-move-card-tools">'+buttons+'</div><button class="two-move-card-open" type="button">'+miniBoardSvg(state)+'</button></article>';
    }).join('');
    return;
  }
  const fragment=document.createDocumentFragment();
  twoMoveDisplayStates.forEach((state,index)=>{
    const buttonTemplate=document.getElementById('two-move-transform-button-template');
    const card=cardTemplate.content.cloneNode(true).firstElementChild;
    card.dataset.state=String(state);card.dataset.pattern=String(twoMoveDisplayPatterns[index]);card.dataset.boardIndex=String(index);
    const tools=card.querySelector('[data-two-move-tools]');
    controls.forEach(([transform,label])=>{
      const button=buttonTemplate
        ?buttonTemplate.content.cloneNode(true).firstElementChild
        :document.createElement('button');
      if(!buttonTemplate){
        button.className='chip';button.type='button';
        const art=document.createElement('span');art.dataset.transformArt='';art.setAttribute('aria-hidden','true');button.appendChild(art);
      }
      button.dataset.twoMoveTransform=transform;
      button.setAttribute('aria-label',tr(label));
      svgSetIcon(button.querySelector('[data-transform-art]'),transformIcon(transform));
      tools.appendChild(button);
    });
    card.querySelector('[data-two-move-open]').innerHTML=miniBoardSvg(state);
    fragment.appendChild(card);
  });
  grid.replaceChildren(fragment);
}
function openTwoMovePatterns({returnToClear=false}={}){
  returnToClearCard=returnToClear;
  twoMoveDetailReturnTarget=null;
  $('returnToClearDetail').hidden=true;
  $('closeTwoMoveDetail').textContent=tr('backToPatterns');
  twoMoveGuard.reset();
  twoMoveDisplayPatterns=[...TWO_MOVE_PATTERN_ORDER];
  twoMoveDisplayStates=twoMoveDisplayPatterns.map(index=>TWO_MOVE_STAGES[index].state);
  renderTwoMovePatterns();
  $('twoMoveDialog').hidden=false;
  $('closeTwoMovePatterns').focus();
}
function renderTwoMoveDetail(){
  replaceRenderedContent($('twoMoveDetailBoard'),miniBoardSvg(twoMoveDetailState));
  const tips=PLAY_TIPS[currentLang]||PLAY_TIPS.ja;
  const intro=(TWO_MOVE_DETAIL_INTROS[currentLang]||TWO_MOVE_DETAIL_INTROS.ja)[twoMoveDetailIndex]||'';
  $('twoMoveDetailIntro').textContent=intro;
  $('twoMoveDetailIntro').hidden=!intro;
  $('twoMoveDetailTip').textContent=tips[TWO_MOVE_TIP_INDEX[twoMoveDetailIndex]];
  const position=TWO_MOVE_PATTERN_ORDER.indexOf(twoMoveDetailIndex);
  $('twoMoveDetailTitle').textContent=tr('twoMoveDetailTitle')+'　'+(position+1)+' / '+TWO_MOVE_PATTERN_ORDER.length;
  $('twoMoveDetailPrev').textContent='← '+tr('prev');
  $('twoMoveDetailNext').textContent=tr('next')+' →';
  $('twoMoveDetailPrev').disabled=false;
  $('twoMoveDetailNext').disabled=false;
}
function openTwoMoveDetail(state,index){
  twoMoveDetailGuard.reset();
  twoMoveDetailState=state;twoMoveDetailIndex=index;
  renderTwoMoveDetail();
  $('returnToClearDetail').hidden=!returnToClearCard&&!twoMoveDetailReturnTarget;
  $('returnToClearDetail').textContent=tr('backToClear');
  $('twoMoveDialog').hidden=true;
  $('twoMoveDetailDialog').hidden=false;
  $('playTwoMoveFree').focus();
}
function closeTwoMoveDetail(){
  const returnToClear=returnToClearCard;
  $('twoMoveDetailDialog').hidden=true;
  $('returnToClearDetail').hidden=true;
  openTwoMovePatterns({returnToClear});
}
// 盤面回転/反転アニメの共通部分。tile/daruma各1本ずつのanimateTransform(translate+rotate)を
// 組み立ててbeginElementするだけ。ガード管理・reduced-motion判定・確定処理は呼び出し側に残す
// (4箇所で微妙に違う: 要素解決方法・座標テーブル・確定時の処理が異なるため)。
function animateMiniBoardTiles(boardEl,tileSelector,darumaSelector,coord,permutation,before,after){
  const NS_='http://www.w3.org/2000/svg',duration='.48s';
  boardEl.querySelectorAll(tileSelector).forEach(tile=>{
    const from=Number(tile.dataset.cell),to=permutation[from];
    const fromXY=coord(from),toXY=coord(to);
    const move=document.createElementNS(NS_,'animateTransform');
    move.setAttribute('attributeName','transform');move.setAttribute('type','translate');
    move.setAttribute('from',fromXY.x+' '+fromXY.y);move.setAttribute('to',toXY.x+' '+toXY.y);
    move.setAttribute('dur',duration);move.setAttribute('fill','freeze');tile.appendChild(move);
    const daruma=tile.querySelector(darumaSelector);
    const turn=document.createElementNS(NS_,'animateTransform');
    turn.setAttribute('attributeName','transform');turn.setAttribute('type','rotate');
    turn.setAttribute('from',String(miniAngle(before[from])));turn.setAttribute('to',String(miniTargetAngle(before[from],after[to])));
    turn.setAttribute('dur',duration);turn.setAttribute('fill','freeze');daruma.appendChild(turn);
    move.beginElement();turn.beginElement();
  });
}
function animateTwoMoveDetail(angle=0,mirror=false){
  if(twoMoveDetailGuard.isBusy())return;
  const symmetry={permutation:makeBoardPermutation(angle,mirror),flip:mirror};
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){
    twoMoveDetailState=transformStateBySymmetry(twoMoveDetailState,symmetry);renderTwoMoveDetail();return;
  }
  twoMoveDetailGuard.begin();
  const before=dec(twoMoveDetailState),after=dec(transformStateBySymmetry(twoMoveDetailState,symmetry));
  animateMiniBoardTiles($('twoMoveDetailBoard'),'.mini-tile','.mini-daruma',i=>CELL[i],symmetry.permutation,before,after);
  twoMoveDetailGuard.arm(480,()=>{
    twoMoveDetailState=transformStateBySymmetry(twoMoveDetailState,symmetry);
    renderTwoMoveDetail();
  });
}
// だるま修行・中巻と発展クラスの各ステージクリア時、クリアダイアログの中に到達した
// 「あと2くるり」形を大きな条件文つきでそのまま表示する(別ダイアログへのリンクは挟まない)。
// 中巻の3くるり盤面は見た目だけでは形が分からないため、クリア後にここで答え合わせする。
// 「今このアニメはまだ有効か」を守る小さいガード。busy中は新しい操作を弾き、
// タイマー発火時にcommitコールバックを呼んでからbusyを解除する。
// 盤面見本の逐次アニメーションは、共有の名前付きガードで世代管理する。
const createAnimGuard=()=>createNamedAnimationGuard('progression-animation');
let clearShapeRuleState=null,clearShapeRuleShape=null,clearShapeRuleIsDevelopment=false;
const clearShapeRuleGuard=createAnimGuard();
function renderClearShapeRule(){
  renderClearShapeRuleContent({state:clearShapeRuleState,shape:clearShapeRuleShape,isDevelopment:clearShapeRuleIsDevelopment});
}
function transformClearShapeRule(angle=0,mirror=false){
  if(clearShapeRuleGuard.isBusy())return;
  const symmetry={permutation:makeBoardPermutation(angle,mirror),flip:mirror};
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){
    clearShapeRuleState=transformStateBySymmetry(clearShapeRuleState,symmetry);renderClearShapeRule();return;
  }
  clearShapeRuleGuard.begin();
  const before=dec(clearShapeRuleState),after=dec(transformStateBySymmetry(clearShapeRuleState,symmetry));
  $('clearShapeRuleBoard').querySelector('.mini-shape-outline')?.remove();
  animateMiniBoardTiles($('clearShapeRuleBoard'),'.mini-tile','.mini-daruma',i=>CELL[i],symmetry.permutation,before,after);
  clearShapeRuleGuard.arm(480,()=>{
    clearShapeRuleState=transformStateBySymmetry(clearShapeRuleState,symmetry);
    renderClearShapeRule();
  });
}
function startDetailDrag(event){
  if(twoMoveDetailGuard.isBusy()||detailDrag||(event.pointerType==='mouse'&&event.button!==0))return;
  const board=$('twoMoveDetailBoard');
  event.preventDefault();
  detailDrag={id:event.pointerId,board,startX:event.clientX,startY:event.clientY};
  board.setPointerCapture(event.pointerId);
  $('twoMoveDetailDialog').classList.add('comparing');
}
function moveDetailDrag(event){
  if(!detailDrag||event.pointerId!==detailDrag.id)return;
  const dx=event.clientX-detailDrag.startX,dy=event.clientY-detailDrag.startY;
  detailDrag.board.style.transform='translate('+dx+'px,'+dy+'px)';
}
function finishDetailDrag(event,cancel=false){
  if(!detailDrag||(event&&event.pointerId!==detailDrag.id))return;
  const drag=detailDrag;detailDrag=null;
  try{drag.board.releasePointerCapture(drag.id);}catch(_){ }
  drag.board.style.transform='';
  $('twoMoveDetailDialog').classList.remove('comparing');
}
function transformTwoMovePattern(boardIndex,angle=0,mirror=false){
  const symmetry={permutation:makeBoardPermutation(angle,mirror),flip:mirror};
  twoMoveDisplayStates[boardIndex]=transformStateBySymmetry(twoMoveDisplayStates[boardIndex],symmetry);
  renderTwoMovePatterns();
}
function animateTwoMovePattern(boardIndex,angle=0,mirror=false){
  if(twoMoveGuard.isBusy())return;
  const symmetry={permutation:makeBoardPermutation(angle,mirror),flip:mirror};
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){transformTwoMovePattern(boardIndex,angle,mirror);return;}
  twoMoveGuard.begin();
  const card=document.querySelectorAll('.two-move-card')[boardIndex];
  if(!card){twoMoveGuard.cancel();return;}
  const before=dec(twoMoveDisplayStates[boardIndex]);
  const after=dec(transformStateBySymmetry(twoMoveDisplayStates[boardIndex],symmetry));
  animateMiniBoardTiles(card,'.mini-tile','.mini-daruma',i=>CELL[i],symmetry.permutation,before,after);
  twoMoveGuard.arm(480,()=>transformTwoMovePattern(boardIndex,angle,mirror));
}
// 報酬の確定はcommand側へ委譲し、ここは表示内容の組み立てに専念する。
function renderOptimalFail(){
  const secondSatori=isMode('satori')&&secondLapActive;
  const over=Math.max(1,moves-best);
  const satoriLimit=isMode('satori')&&!isSolved()&&moves>=best;
  if(secondSatori){
    $('optimalFailTitle').textContent=tr('satoriSecondFailTitle');
    $('optimalFailRule').textContent=tr('satoriSecondFailRule');
    $('optimalFailResult').hidden=true;
    $('optimalFailEncourage').hidden=true;
    $('optimalRetry').textContent=tr('optimalRetry');
    return;
  }
  $('optimalFailResult').hidden=false;
  const encourage=tr(isMode('satori')?'satoriFailEncourage':'optimalFailEncourage');
  $('optimalFailEncourage').hidden=!encourage;
  $('optimalFailTitle').textContent=satoriLimit?tr('satoriFailLimit'):tr(over===1?'optimalFailOne':over===2?'optimalFailTwo':'optimalFailMany');
  $('optimalFailRule').textContent=tr(isMode('satori')?'satoriFailRule':'optimalFailRule');
  $('optimalFailResult').textContent=satoriLimit?tr('satoriFailResult',{best}):tr('optimalFailResult',{best,moves});
  $('optimalFailEncourage').textContent=encourage;
  $('optimalRetry').textContent=tr('optimalRetry');
}
function tipDaruma(x,y,scale=.55){
  return '<g transform="translate('+x+' '+y+') scale('+scale+')"><use href="#daruma-body"/><use href="#face-open"/></g>';
}
