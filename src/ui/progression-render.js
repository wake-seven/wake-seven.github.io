// ステージ進行に関する表示補助。状態更新は行わず、現在の状態を画面へ反映する。
function renderStageNavAccent(){
  let accentFrac=0;
  if(isMode('speed'))accentFrac=(speedSession.index+1)/(speedSession.total||activeSpeedDefinition().total);
  else if(isMode('satori'))accentFrac=(satoriIndex+1)/SATORI_STAGES.length;
  else if(isMode('mastery'))accentFrac=(extraIndex+1)/EXTRA_STAGES.length;
  else if(!isMode('free')&&!isMode('custom'))accentFrac=stageIndex<ACADEMY_STAGE_COUNT?(stageIndex+1)/ACADEMY_STAGE_COUNT:(stageIndex-ACADEMY_STAGE_COUNT+1)/TRAINING_STAGE_COUNT;
  $('stageAccentFill').style.width=(Math.max(0,Math.min(1,accentFrac))*100)+'%';
  if(!isMode('speed')){$('shortestLabel').textContent=tr('shortestDisplay');$('moveUnit').textContent=tr('moveUnit');$('academyClearSuffix').textContent=tr('academyClearSuffix');$('movesLabel').textContent=tr('moves');$('moves').textContent=moves;$('movesUnit').textContent=tr('moveUnit');}
  renderRankBadge();
}
// 公開native moduleの構文境界。
export {};
