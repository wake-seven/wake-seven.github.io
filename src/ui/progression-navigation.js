// ===== 進行ナビゲーションのイベント =====
// 画面遷移のイベント登録を、ロードマップ/ダイアログ描画から分離する。
$('prevStage').addEventListener('click',()=>{
  if(isMode('free')||isMode('custom')){returnToStageMode();return;}
  if(!isMode('mastery')&&!isMode('satori')&&stageIndex===0&&activeLap===2){
    activateCampaignLap(1);
    loadSatoriStage(SATORI_STAGES.length-1);
    return;
  }
  if(isMode('satori')){
    if(satoriIndex>0)loadSatoriStage(satoriIndex-1);
    else loadExtraStage(EXTRA_STAGES.length-1);
    return;
  }
  if(isMode('mastery')){
    if(extraIndex===0)loadStage(STAGES.length-1);
    else loadExtraStage(extraIndex-1);
  }else loadStage(stageIndex-1);
 });
$('nextStage').addEventListener('click',()=>{
  if(isMode('free')){startFree();return;}
  if(isMode('custom')&&!editingBoard){enterBoardMaker();return;}
  if(isMode('satori')){
    if(satoriIndex<SATORI_STAGES.length-1&&satoriStageUnlocked(satoriIndex+1))loadSatoriStage(satoriIndex+1);
    else if(satoriIndex===SATORI_STAGES.length-1&&activeLap===1&&secondLapUnlocked){activateCampaignLap(2);loadStage(0);}
    return;
  }
  if(isMode('mastery')){
    if(extraIndex===EXTRA_STAGES.length-1&&canEnterSatori())loadSatoriStage(0);
    else loadExtraStage(extraIndex+1);
  }
  else if(stageIndex===STAGES.length-1&&allPrimaryCleared())loadExtraStage(0);
  else loadStage(stageIndex+1);
 });
$('mirrorBoard').addEventListener('click',()=>reorientBoard(boardLayout==='tilted'?VIEW_TILTED_MIRROR:VIEW_MIRROR,true));
$('flipBoardVertical').addEventListener('click',()=>reorientBoard(boardLayout==='tilted'?VIEW_TILTED_FLIP_VERTICAL:VIEW_FLIP_VERTICAL,true));
$('rotateBoardBack').addEventListener('click',()=>reorientBoard(VIEW_ROTATE_MINUS60,false,-60));
$('rotateBoard').addEventListener('click',()=>reorientBoard(VIEW_ROTATE_60,false,60));
$('customMode').addEventListener('click',()=>{
  if(performance.now()<makerButtonBlockedUntil||editingBoard)return;
  enterBoardMaker();
});
$('playCustomBoard').addEventListener('click',playCustomBoard);
$('stageMode').addEventListener('click',()=>{
  if(busy||(!isMode('free')&&!isMode('custom')&&!isMode('mastery')&&!isMode('satori')&&!isMode('speed')))return;
  if(isMode('speed')){pauseSpeedRun();returnToStageMode();return;}
  if(isMode('free'))leaveFreeMode();
  else if(lastStageMode.satori)loadSatoriStage(lastStageMode.index);
  else if(lastStageMode.extra)loadExtraStage(lastStageMode.index);
  else loadStage(lastStageMode.index);
});
$('stageModeReturn').addEventListener('click',()=>{
  returnToStageMode();
});
$('freeMode').addEventListener('click',()=>{
  if(busy||isMode('free'))return;
  restoreFreeSession();
});

// Keep this extracted fragment explicit in the source audit while it remains
// concatenated into the single published native-module script.
export {};
