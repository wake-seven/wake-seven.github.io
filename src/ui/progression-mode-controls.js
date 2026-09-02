// ===== 進行モード操作 =====

// ステージ選択ダイアログを閉じる共通入口。
// 選択画面のDOM処理本体は progression-ui.js に残し、イベント側はこの名前だけを使う。
function closeStagePicker(){
  closeStagePickerCore();
}
// ステージ選択画面の開閉、ページ送り、フリー・自作・速解きへの切り替えを担当する。
// 表示内容の組み立ては progression-ui.js、問題選択の描画は progression-stage-picker.js に委譲する。

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
$('pickerFreeMode').addEventListener('click',()=>{
  if(busy)return;
  closeStagePicker();
  if(!isMode('free'))restoreFreeSession();
});
$('pickerCustomMode').addEventListener('click',()=>{
  if(busy)return;
  closeStagePicker();
  if(!isMode('custom'))enterBoardMaker();
});
$('pickerSpeedMode').addEventListener('click',()=>{
  if(!featureUnlocked('speedRun'))return;
  closeStagePicker();
  if(isMode('speed'))return;
  openSpeedPicker();
});

export {};
