// ステージ進行に関する表示補助。状態更新は行わず、現在の状態を画面へ反映する。
// 描画のたびにID検索を繰り返さないよう、静的な進行UIの参照を一度だけ束ねる。
let progressionRenderRefs=null;
function getProgressionRenderRefs(){
  return progressionRenderRefs??=createRefs([
    'stageAccentFill','shortestLabel','moveUnit','academyClearSuffix',
    'movesLabel','moves','movesUnit'
  ]);
}
// ステージ上部の手数表示だけを担当するrenderer。進行状態の変更や遷移は行わない。
function renderMovesMetric(moveCount,hidden=false){
  const refs=getProgressionRenderRefs();
  const metric=document.querySelector('.status-metric.moves');
  if(metric)metric.hidden=hidden;
  setText(refs.movesLabel,tr('moves'));
  setText(refs.moves,moveCount);
  setText(refs.movesUnit,tr('moveUnit'));
}
// ステージナビゲーションの前後ボタン表示だけを担当するrenderer。
// 有効/無効の判定は呼び出し側で行い、ここでは渡された結果をDOMへ反映する。
function renderStageNavPager({prevHidden=false,nextHidden=false,prevDisabled,nextDisabled,highlightNext=false}={}){
  const prev=$('prevStage'),next=$('nextStage');
  if(!prev||!next)return;
  prev.hidden=prevHidden;next.hidden=nextHidden;
  if(prevDisabled!==undefined)prev.disabled=prevDisabled;
  if(nextDisabled!==undefined)next.disabled=nextDisabled;
  next.classList.toggle('next-attention',highlightNext);
}
// クリアダイアログの固定コンテキスト欄だけを描画する。表示内容の判定や進行状態の変更は呼び出し側で行う。
function renderClearStageContextElement(context,{visible=false,text=''}={}){
  if(!context)return;
  context.hidden=!visible;
  context.textContent=visible?text:'';
}
// クリア後チップの固定テキスト・詳細リンク欄を描画する。リンク先の判定は呼び出し側で行う。
function renderClearTipHeader({text='',linkVisible=false,target='details',label=''}={}){
  const body=$('clearDialogTextBody'),copy=$('clearDialogText'),link=$('clearTipLink');
  if(body)body.textContent=text;
  if(copy)copy.hidden=!text;
  if(link){link.hidden=!linkVisible;link.dataset.target=target;link.textContent=label;}
}
// クリア後の形レッスン表示モデルをDOMへ反映する。状態・遷移の判定は呼び出し側で行う。
function renderClearShapeRuleContent({state,shape,isDevelopment=false}={}){
  const intro=$('clearShapeRuleIntro'),name=$('clearShapeRuleName'),board=$('clearShapeRuleBoard');
  if(intro)intro.textContent=tr(isDevelopment?'developmentShapeRuleIntro':'trainingShapeRuleIntro');
  if(name)name.textContent=tr('twoMoveTip3'+shape+'Name');
  if(board)board.innerHTML=miniBoardSvg(state,{outline:true});
  const box=$('clearShapeRuleBox');if(box)box.hidden=isDevelopment;
  if(!isDevelopment){
    const heading=$('clearShapeRuleHeading'),condition=$('clearShapeRuleCondition');
    if(heading)heading.textContent=tr('trainingShapeRuleHeading');
    if(condition)condition.textContent=tr('trainingShapeRule'+shape+'Condition');
  }
}
function renderStageNavAccent(){
  let accentFrac=0;
  if(isMode('speed'))accentFrac=(speedSession.index+1)/(speedSession.total||activeSpeedDefinition().total);
  else if(isMode('satori'))accentFrac=(satoriIndex+1)/SATORI_STAGES.length;
  else if(isMode('mastery'))accentFrac=(extraIndex+1)/EXTRA_STAGES.length;
  else if(!isMode('free')&&!isMode('custom'))accentFrac=stageIndex<ACADEMY_STAGE_COUNT?(stageIndex+1)/ACADEMY_STAGE_COUNT:(stageIndex-ACADEMY_STAGE_COUNT+1)/TRAINING_STAGE_COUNT;
  const refs=getProgressionRenderRefs();
  if(refs.stageAccentFill)refs.stageAccentFill.style.width=(Math.max(0,Math.min(1,accentFrac))*100)+'%';
  if(!isMode('speed')){
    setText(refs.shortestLabel,tr('shortestDisplay'));
    setText(refs.moveUnit,tr('moveUnit'));
    setText(refs.academyClearSuffix,tr('academyClearSuffix'));
    setText(refs.movesLabel,tr('moves'));
    setText(refs.moves,moves);
    setText(refs.movesUnit,tr('moveUnit'));
  }
  renderRankBadge();
}
// 公開ネイティブモジュールの構文境界。
export {};
