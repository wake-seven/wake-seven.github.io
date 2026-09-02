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
  else if(returnStageContext.satori)loadSatoriStage(returnStageContext.index);
  else if(returnStageContext.extra)loadExtraStage(returnStageContext.index);
  else loadStage(returnStageContext.index);
});
$('stageModeReturn').addEventListener('click',()=>{
  returnToStageMode();
});
$('freeMode').addEventListener('click',()=>{
  if(busy||isMode('free'))return;
  restoreFreeSession();
});

// この抽出断片は、公開ネイティブモジュールスクリプトへ連結される間もソース監査で明示的に扱う。
export {};

// ステージ選択画面の開閉と、選択画面から各モードへ移るイベント。
// 旧 progression-mode-controls.js の薄い入口をここへ統合し、
// 進行ナビゲーションのイベントを一つのファイルから追跡できるようにする。
function closeStagePicker(){closeStagePickerCore();}
$('stagePickerTrigger').addEventListener('click',openStagePicker);
$('closeStagePicker').addEventListener('click',closeStagePicker);
$('stagePickerRankBadge').addEventListener('click',()=>{
  if($('stagePickerRankBadge').hidden)return;
  $('stagePicker').hidden=true;
  openRankDialog({dialogId:'stagePicker',focusId:'stagePickerRankBadge'});
});
$('stagePicker').addEventListener('click',e=>{if(e.target===$('stagePicker'))closeStagePicker();});
$('pickerPrevRound').addEventListener('click',()=>{
  if(pickerRound==='satori'&&satoriPickerPage>0)satoriPickerPage--;
  else if(pickerRound==='satori')pickerRound=EXTRA_ROUNDS-1;
  else if(pickerRound===-PRIMARY_PICKER_SECTION_COUNT&&pickerLap===2){pickerLap=1;pickerRound='satori';satoriPickerPage=SATORI_PICKER_PAGES-1;}
  else pickerRound--;
  renderStagePicker();
});
$('pickerNextRound').addEventListener('click',()=>{
  const pickerPrimary=pickerLap===2?lap2ClearedStages:lap1ClearedStages;
  const pickerExtra=pickerLap===2?lap2ClearedExtraStages:lap1ClearedExtraStages;
  const pickerAcademyDone=Array.from({length:ACADEMY_STAGE_COUNT},(_,i)=>pickerPrimary.has(i)).every(Boolean);
  const pickerPrimaryDone=STAGES.every((_,i)=>pickerPrimary.has(i));
  const pickerMastered=EXTRA_STAGES.every((_,i)=>pickerExtra.has(i));
  if(pickerRound==='satori'&&satoriPickerPage<SATORI_PICKER_PAGES-1)satoriPickerPage++;
  else if(pickerRound==='satori'&&pickerLap===1&&secondLapUnlocked){pickerLap=2;pickerRound=-PRIMARY_PICKER_SECTION_COUNT;satoriPickerPage=0;}
  else if(pickerRound===EXTRA_ROUNDS-1&&pickerMastered){pickerRound='satori';satoriPickerPage=0;}
  else if(pickerRound===PICKER_ACADEMY_LAST_ROUND&&pickerAcademyDone&&(pickerLap===2||speedTrainingTrialCleared))pickerRound=PICKER_TRAINING_FIRST_ROUND;
  else if(pickerRound===PICKER_TRAINING_LAST_ROUND&&pickerPrimaryDone&&(pickerLap===2||speedIntermediateTrialCleared))pickerRound=0;
  else if(typeof pickerRound==='number')pickerRound++;
  renderStagePicker();
});
$('pickerFreeMode').addEventListener('click',()=>{if(busy)return;closeStagePicker();if(!isMode('free'))restoreFreeSession();});
$('pickerCustomMode').addEventListener('click',()=>{if(busy)return;closeStagePicker();if(!isMode('custom'))enterBoardMaker();});
$('pickerSpeedMode').addEventListener('click',()=>{if(!featureUnlocked('speedRun'))return;closeStagePicker();if(isMode('speed'))return;openSpeedPicker();});
