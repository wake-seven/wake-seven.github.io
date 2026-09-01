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
// 公開native moduleの構文境界。
export {};
