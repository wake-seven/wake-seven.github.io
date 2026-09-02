// ===== デバッグツール =====
function debugClearCurrent(extraMoves=0){
  if(!DEBUG_MODE||busy||editingBoard)return;
  extraMoves=Number.isInteger(extraMoves)?extraMoves:0;
  cancelTutorialHint();
  cancelTileAnimations();
  clearHintVisuals();
  ori=new Uint8Array(N);spin=new Int16Array(N);tileEls=baseTiles.slice();
  history=[];moves=best+extraMoves;clearShown=false;
  svg.classList.remove('clear-pending','celebrating');
  svg.querySelectorAll('.clear-burst').forEach(el=>el.remove());
  $('clearNext').hidden=true;
  GameBoard.repaint();
  // 速解きのデバッグ即クリアは、通常クリアダイアログではなく
  // 実プレイと同じ専用の完了処理（保存→次問）へ接続する。
  if(isMode('speed')){completeBoard({mode:'speed'});return;}
  // デバッグ即クリアでも、通常操作と同じクリア演出・ダイアログ遷移を直ちに予約する。
  // 再描画側の予約と重なっても、同じタイマーキーで冪等に置き換わる。
  startClearFlow();
  // 即クリアでも、通常操作と同じくメッセージ一覧の開始位置を更新する。
  if(extraMoves===0&&!isMode('satori')&&!isMode('free')&&!isMode('custom')){
    rememberClearedMessage(isMode('mastery'),isMode('mastery')?extraIndex:stageIndex);
  }
}
$('debugClear').addEventListener('click',()=>debugClearCurrent(0));
function debugGrantRainbowDaruma(){
  rainbowDarumaGranted=setUnlock('rainbowDarumaGranted',true);
  darumaColor='rainbow';
  darumaColorChosen=false;
  try{
    storage.set(STORAGE_KEY_GROUPS.rewards.rainbowDarumaGranted,'1');
    storage.set(STORAGE_KEY_GROUPS.settings.darumaColor,'rainbow');
    storage.remove(STORAGE_KEY_GROUPS.settings.darumaColorChosen);
  }catch(_){ }
}
$('debugAlmost').addEventListener('click',()=>debugClearCurrent(1));
$('debugMore').addEventListener('click',()=>debugClearCurrent(2));
$('debugFar').addEventListener('click',()=>debugClearCurrent(3));
function debugPrepareSecondLapCheckpoint(){
  lap1ClearedStages=fullStageSet(STAGES);
  lap1ClearedExtraStages=fullStageSet(EXTRA_STAGES);
  lap1ClearedSatoriStages=fullStageSet(SATORI_STAGES);
  lap2ClearedStages.clear();
  lap2ClearedExtraStages.clear();
  lap2ClearedSatoriStages.clear();
  secondLapUnlocked=setUnlock('secondLap',true);
  awakenedGranted=setUnlock('awakened',false);
  masterGoldGranted=setUnlock('masterGoldGranted',true);
  satoriDesignGranted=setUnlock('satoriDesignGranted',true);
  try{
    storage.set(STORAGE_KEY_GROUPS.progression.secondLapUnlocked,'1');
    storage.remove(STORAGE_KEY_GROUPS.rewards.awakenedGranted);
    for(const variant of ['standard','training9','training18','mastery27','satori73'])clearSpeedSession(variant);
    storage.set(STORAGE_KEY_GROUPS.rewards.masterGoldGranted,'1');
    storage.set(STORAGE_KEY_GROUPS.rewards.satoriDesignGranted,'1');
  }catch(_){ }
  activateCampaignLap(2);
}
function debugPrepareFirstLapCheckpoint(){
  lap1ClearedStages.clear();
  lap1ClearedExtraStages.clear();
  lap1ClearedSatoriStages.clear();
  lap2ClearedStages.clear();
  lap2ClearedExtraStages.clear();
  lap2ClearedSatoriStages.clear();
  secondLapUnlocked=setUnlock('secondLap',false);
  awakenedGranted=setUnlock('awakened',false);
  // 一周目の節目を検証するデバッグでは、卒業試験も未合格から始める。
  speedTrainingTrialCleared=false;
  speedIntermediateTrialCleared=false;
  speedMasteryTrialCleared=false;
  try{
    storage.remove(STORAGE_KEY_GROUPS.progression.secondLapUnlocked);
  storage.remove(STORAGE_KEY_GROUPS.progression.secondLapActive);
  storage.remove(STORAGE_KEY_GROUPS.rewards.awakenedGranted);
  storage.remove(STORAGE_KEY_GROUPS.speed.trainingTrialCleared);
  storage.remove(STORAGE_KEY_GROUPS.speed.intermediateTrialCleared);
  storage.remove(STORAGE_KEY_GROUPS.speed.masteryTrialCleared);
  }catch(_){ }
  activateCampaignLap(1);
}
function debugUnlockStageCheckpoint(index,secondLap=false){
  if(!DEBUG_MODE)return;
  if(secondLap)debugPrepareSecondLapCheckpoint();
  else debugPrepareFirstLapCheckpoint();
  // 修行の問題へ飛ぶ場合は、学園の修了試験も通過済みとして扱う。
  if(index>=TRAINING_STAGE_START&&!secondLap)grantSpeedTrialCleared('training9');
  for(let i=0;i<index;i++)clearedStages.add(i);
  try{
      storage.set(STORAGE_KEY_GROUPS.progression.cleared,JSON.stringify([...clearedStages]));
    if(secondLap){
      storage.set(STORAGE_KEY_GROUPS.progression.extraCleared,'[]');
      storage.set(STORAGE_KEY_GROUPS.progression.satoriCleared,'[]');
    }
  }catch(_){}
  persistLapProgress();updateMasterTheme();
  if(index>0)rememberClearedMessage(false,index-1);
  GameNavigation.stage(index);
}
$('debugIntro2').addEventListener('click',()=>debugUnlockStageCheckpoint(INTRO_STAGE_COUNT-1));
$('debugBasic11').addEventListener('click',()=>debugUnlockStageCheckpoint(DEVELOPMENT_STAGE_START-1));
$('debugAcademy20').addEventListener('click',()=>debugUnlockStageCheckpoint(ACADEMY_STAGE_COUNT-1));
$('debugTrainingUpper').addEventListener('click',()=>debugUnlockStageCheckpoint(TRAINING_STAGE_START+TRAINING_UPPER_COUNT-1));
$('debugTrainingMiddle').addEventListener('click',()=>debugUnlockStageCheckpoint(TRAINING_STAGE_START+TRAINING_UPPER_COUNT+TRAINING_MIDDLE_COUNT-1));
$('debugTrainingLower').addEventListener('click',()=>debugUnlockStageCheckpoint(STAGES.length-1));
$('debugSecondIntro2').addEventListener('click',()=>debugUnlockStageCheckpoint(INTRO_STAGE_COUNT-1,true));
$('debugSecondBasic11').addEventListener('click',()=>debugUnlockStageCheckpoint(DEVELOPMENT_STAGE_START-1,true));
$('debugSecondAcademy20').addEventListener('click',()=>debugUnlockStageCheckpoint(ACADEMY_STAGE_COUNT-1,true));
$('debugSecondTrainingUpper').addEventListener('click',()=>debugUnlockStageCheckpoint(TRAINING_STAGE_START+TRAINING_UPPER_COUNT-1,true));
$('debugSecondTrainingMiddle').addEventListener('click',()=>debugUnlockStageCheckpoint(TRAINING_STAGE_START+TRAINING_UPPER_COUNT+TRAINING_MIDDLE_COUNT-1,true));
$('debugSecondTrainingLower').addEventListener('click',()=>debugUnlockStageCheckpoint(STAGES.length-1,true));
function debugUnlockExtra(count,secondLap=false){
  if(!DEBUG_MODE)return;
  if(secondLap)debugPrepareSecondLapCheckpoint();
  else debugPrepareFirstLapCheckpoint();
  // 名人への道を直接検証するときも、学園・修行と修了試験の前提を揃える。
  if(!secondLap)grantCampaignProgressThrough('training');
  else STAGES.forEach((_,i)=>clearedStages.add(i));
  for(let i=0;i<count;i++)clearedExtraStages.add(i);
  try{
    storage.set(STORAGE_KEY_GROUPS.progression.cleared,JSON.stringify([...clearedStages]));
    storage.set(STORAGE_KEY_GROUPS.progression.extraCleared,JSON.stringify([...clearedExtraStages]));
    if(secondLap)storage.set(STORAGE_KEY_GROUPS.progression.satoriCleared,'[]');
  }catch(_){}
  persistLapProgress();updateMasterTheme();
  if(count>0)rememberClearedMessage(true,count-1);
  GameNavigation.mastery(Math.min(count,EXTRA_STAGES.length-1));
}
$('debugExtra14').addEventListener('click',()=>debugUnlockExtra(14));
$('debugExtra29').addEventListener('click',()=>debugUnlockExtra(29));
$('debugExtra44').addEventListener('click',()=>debugUnlockExtra(44));
$('debugSecondExtra14').addEventListener('click',()=>debugUnlockExtra(14,true));
$('debugSecondExtra29').addEventListener('click',()=>debugUnlockExtra(29,true));
$('debugSecondExtra44').addEventListener('click',()=>debugUnlockExtra(44,true));
function debugUnlockSatori(count,secondLap=false){
  if(!DEBUG_MODE)return;
  if(secondLap)debugPrepareSecondLapCheckpoint();
  else debugPrepareFirstLapCheckpoint();
  if(!secondLap)grantCampaignProgressThrough('mastery');
  else{STAGES.forEach((_,i)=>clearedStages.add(i));EXTRA_STAGES.forEach((_,i)=>clearedExtraStages.add(i));}
  for(let i=0;i<count;i++)clearedSatoriStages.add(i);
  try{
    storage.set(STORAGE_KEY_GROUPS.progression.cleared,JSON.stringify([...clearedStages]));
    storage.set(STORAGE_KEY_GROUPS.progression.extraCleared,JSON.stringify([...clearedExtraStages]));
    storage.set(STORAGE_KEY_GROUPS.progression.satoriCleared,JSON.stringify([...clearedSatoriStages]));
  }catch(_){}
  persistLapProgress();updateMasterTheme();
  if(secondLap){debugGrantRainbowDaruma();updateMasterTheme();}
  rememberClearedMessage(true,EXTRA_STAGES.length-1);
  GameNavigation.satori(Math.min(count,SATORI_STAGES.length-1));
}
$('debugSatori72').addEventListener('click',()=>debugUnlockSatori(72));
// 現在アクティブな速解きセッション（メニューから選んだもの）を、そのまま最終問題まで進める。
function debugJumpSpeedFinish(){
  if(!DEBUG_MODE||!isMode('speed')||!speedSession)return;
  speedSession.started=true;
  const total=speedSession.total||activeSpeedDefinition().total;
  speedSession.index=Math.max(0,total-1);
  speedSession.optimalClears=speedSession.index;
  speedSession.movedCurrent=false;speedSession.restartedCurrent=false;speedSession.board=null;
  loadSpeedStage(false,true);
}
$('debugSpeedJumpFinish').addEventListener('click',debugJumpSpeedFinish);
function debugOpenSpeedExam(variant,index){
  if(!DEBUG_MODE)return;
  debugPrepareFirstLapCheckpoint();
  // 試験だけを直接試す場合にも、その試験が現れる直前までの進行を再現する。
  if(variant==='training9'){
    for(let i=0;i<ACADEMY_STAGE_COUNT;i++)clearedStages.add(i);
    unlockSpeedVariant('training9');
  }else if(variant==='training18'){
    grantCampaignProgressThrough('training');
  }else if(variant==='mastery27'){
    grantCampaignProgressThrough('mastery');
  }
  try{
    storage.set(STORAGE_KEY_GROUPS.progression.cleared,JSON.stringify([...clearedStages]));
    storage.set(STORAGE_KEY_GROUPS.progression.extraCleared,JSON.stringify([...clearedExtraStages]));
  }catch(_){ }
  persistLapProgress();updateMasterTheme();
  speedVariant=variant;
  if(variant==='training9'){
    speedTrainingTrialCleared=false;
    storage.remove(STORAGE_KEY_GROUPS.speed.trainingTrialCleared);
  }
  if(variant==='training18'){
    speedIntermediateTrialCleared=false;
    storage.remove(STORAGE_KEY_GROUPS.speed.intermediateTrialCleared);
  }
  if(variant==='mastery27'){
    speedMasteryTrialCleared=false;
    storage.remove(STORAGE_KEY_GROUPS.speed.masteryTrialCleared);
  }
  speedSession=newSpeedSession();
  speedSession.index=Math.max(0,Math.min(speedSession.total-1,index));
  speedSession.optimalClears=speedSession.index;
  speedSession.requiredTrial=variant;
    setSpeedManualPauseCommand(false);
  try{
    if(variant==='training9')storage.set(STORAGE_KEY_GROUPS.speed.trainingUnlocked,'1');
    if(variant==='training18')storage.set(STORAGE_KEY_GROUPS.speed.intermediateUnlocked,'1');
    if(variant==='mastery27')storage.set(STORAGE_KEY_GROUPS.speed.masteryUnlocked,'1');
  }catch(_){ }
  loadSpeedStage(false);
}
$('debugSpeedTraining8').addEventListener('click',()=>debugOpenSpeedExam('training9',DEBUG_MODE?Number(new URLSearchParams(location.search).get('debugSpeedIndex')||8):8));
$('debugSpeedIntermediate17').addEventListener('click',()=>debugOpenSpeedExam('training18',17));
$('debugSpeedMastery26').addEventListener('click',()=>debugOpenSpeedExam('mastery27',26));
$('debugSecondSatori72').addEventListener('click',()=>debugUnlockSatori(72,true));
function debugSkipTutorial(){
  if(!DEBUG_MODE)return;
  storage.set(STORAGE_KEY_GROUPS.progression.introSeen,'1');
  completeTutorialCommand();
  GameNavigation.stage(0);
  setUiEffectTimer('dialog-transition','academy-enroll',()=>openChainedDialog('academyEnroll'),260);
}
$('debugSkipTutorial').addEventListener('click',debugSkipTutorial);
$('tutorialDebugSkip').addEventListener('click',debugSkipTutorial);
$('debugReset').addEventListener('click',()=>resetStoredProgress({resetIntro:true,showIntro:true}));
// ===== イベントリスナー群A =====
function handleClearTipLink(){
  if($('clearTipLink').dataset.target==='rank'){
    $('clearDialog').hidden=true;
    GameDialogs.ranks({dialogId:'clearDialog',focusId:'clearTipLink'});
    return;
  }
  if($('clearTipLink').dataset.target==='messages'){
    $('clearDialog').hidden=true;
    GameDialogs.messages({resume:true,returnTarget:{dialogId:'clearDialog',focusId:'clearTipLink'}});
    return;
  }
  if($('clearTipLink').dataset.target==='tips'){
    returnToClearCard=true;
    hideGameDialogs();
    openTipGuide();
    return;
  }
  if($('clearTipLink').dataset.target==='patterns'){
    returnToClearCard=true;
    hideGameDialogs();
    openTwoMovePatterns({returnToClear:true});
    return;
  }
  if(!isMode('mastery'))return;
  const clickClearEntry=clearContentAt(true,extraIndex);
  const twoMoveCard=clickClearEntry?.twoMoveCard,guideCard=clickClearEntry?.guideCard;
  if(twoMoveCard!==undefined){
    returnToClearCard=true;
    hideGameDialogs();
    openTwoMoveDetail(TWO_MOVE_STAGES[twoMoveCard].state,twoMoveCard);
  }else if(guideCard){
    returnToClearCard=true;
    hideGameDialogs();
    openTipGuide();
    tipGuideIndex=guideCard.page;
    renderTipGuide();
    $('closeTipGuide').textContent=tr('backToClear');
  }
}
function bindClearDialogEvents(){
  WakeSevenEventBindings.click('clearNext',()=>{
    WakeSevenProgressionCommands.advanceAfterClear();
  });
  WakeSevenEventBindings.click('clearClose',()=>{
    hideGameDialogs();
    nextStageAttention=isCampaignMode()&&!editingBoard;
    renderStageNav();
  });
  WakeSevenEventBindings.click('optimalRetry',()=>{
    $('optimalFailDialog').hidden=true;
    GameBoard.reset(currentInitialState,currentInitialPar);
    renderStageNav();
  });
  WakeSevenEventBindings.click('clearMessages',()=>GameDialogs.messages({resume:true}));
  WakeSevenEventBindings.click('clearTipLink',handleClearTipLink);
}
bindClearDialogEvents();
function bindMenuEvents(){
  WakeSevenEventBindings.click('guideHub',()=>{closeAppMenu();openGuideHub();});
  WakeSevenEventBindings.click('menuStagePicker',()=>{closeAppMenu();openStagePicker();});
  WakeSevenEventBindings.click('menuRankList',()=>{closeAppMenu();GameDialogs.ranks();});
  WakeSevenEventBindings.click('menuAbout',()=>{
    closeAppMenu();
    $('settingsDialog').hidden=true;
    $('aboutDialog').hidden=false;
    $('aboutDialogCloseBtn').focus();
  });
  WakeSevenEventBindings.click('aboutDialogCloseBtn',()=>setDialogOpenState('aboutDialog',false));
  $('aboutDialog').addEventListener('click',e=>{if(e.target===e.currentTarget)setDialogOpenState('aboutDialog',false);});
  WakeSevenEventBindings.click('menuSettings',()=>{
    closeAppMenu();
    $('settingsDialog').hidden=false;
    $('settingsDialogClose').focus();
  });
  WakeSevenEventBindings.click('settingsDialogClose',()=>setDialogOpenState('settingsDialog',false));
  $('settingsDialog').addEventListener('click',e=>{if(e.target===e.currentTarget)setDialogOpenState('settingsDialog',false);});
  WakeSevenEventBindings.click('menuAllPatterns',()=>{window.open('all-patterns.html','_blank','noopener');});
  WakeSevenEventBindings.click('menuOpen3D',()=>{window.open('index_3D.html','_blank','noopener');});
  WakeSevenEventBindings.click('menuSatori',()=>{closeAppMenu();openSatoriPicker();});
  WakeSevenEventBindings.click('menuSpeed',()=>{
    closeAppMenu();
    if(isMode('speed')){pauseSpeedRun();GameNavigation.speedPicker();return;}
    GameNavigation.speedPicker();
  });
}
// 速解きの再開・再スタートは、イベントから直接状態を書き換えず操作単位へ集約する。
function resumeSpeedRun(){
  $('speedPauseDialog').hidden=true;
  setSpeedManualPauseCommand(false);
  startSpeedClock();
}
function confirmSpeedRestart(){
  $('speedRestartDialog').hidden=true;
  setSpeedManualPauseCommand(false);
  clearSpeedSession();
  enterSpeedMode(true);
}
function bindSpeedEvents(){
  WakeSevenEventBindings.click('speedBoardStart',WakeSevenProgressionCommands.startSpeedRun);
  WakeSevenEventBindings.click('speedPause',()=>{
    if(!isMode('speed'))return;
    openSpeedPauseDialog();
    $('speedResume').focus();
  });
  WakeSevenEventBindings.click('speedResume',resumeSpeedRun);
  WakeSevenEventBindings.click('speedRestart',()=>{
    $('speedPauseDialog').hidden=true;
    $('speedRestartDialog').hidden=false;
    $('speedRestartCancel').focus();
  });
  WakeSevenEventBindings.click('speedRestartCancel',()=>{
    $('speedRestartDialog').hidden=true;
    $('speedPauseDialog').hidden=false;
    $('speedResume').focus();
  });
  WakeSevenEventBindings.click('speedRestartConfirm',confirmSpeedRestart);
  WakeSevenEventBindings.click('speedPauseStageMode',()=>{
    $('speedPauseDialog').hidden=true;
    pauseSpeedRun();GameNavigation.stageMenu();
  });
  WakeSevenEventBindings.click('speedPauseFreeMode',()=>{
    $('speedPauseDialog').hidden=true;
    if(!isMode('free'))restoreFreeSession();
  });
  WakeSevenEventBindings.click('speedPauseCustomMode',()=>{
    $('speedPauseDialog').hidden=true;
    if(!isMode('custom'))GameNavigation.maker();
  });
}
function bindMessageReviewEvents(){
  $('closeMessages').addEventListener('click',()=>{
    const returnTarget=messageDialogReturn;
    messageDialogReturn=null;
    $('messageDialog').hidden=true;
    focusReturnTarget(returnTarget);
  });
  $('messagePrev').addEventListener('click',()=>moveMessageReview(-1));
  $('messageNext').addEventListener('click',()=>moveMessageReview(1));
  document.addEventListener('keydown',event=>{
  const target=event.target;
  const typing=target instanceof HTMLElement&&target.matches('input, textarea, select, [contenteditable]');
  const dialogOpen=[...document.querySelectorAll('.game-dialog-backdrop')].some(dialog=>!dialog.hidden);
  if(!typing&&event.key.toLowerCase()==='p'&&!event.altKey&&!event.ctrlKey&&!event.metaKey&&!dialogOpen){
    event.preventDefault();
    closeAppMenu();
    openTwoMovePatterns();
    return;
  }
  if(!typing&&DEBUG_MODE&&event.key.toLowerCase()==='c'&&!event.altKey&&!event.ctrlKey&&!event.metaKey&&!dialogOpen){
    event.preventDefault();
    debugClearCurrent(0);
    return;
  }
  if(!typing&&event.key.toLowerCase()==='m'&&!event.altKey&&!event.ctrlKey&&!event.metaKey&&$('messageDialog').hidden){
    if(!dialogOpen&&buildMessageReviewEntries().length){
      event.preventDefault();
      closeAppMenu();
      GameDialogs.messages({resume:true});
      return;
    }
  }
  if($('messageDialog').hidden)return;
  if(event.key==='ArrowLeft'&&moveMessageReview(-1))event.preventDefault();
  if(event.key==='ArrowRight'&&moveMessageReview(1))event.preventDefault();
  });
}
bindMenuEvents();
bindSpeedEvents();
bindMessageReviewEvents();
// マスターダイアログを閉じた/開始した直後に、続けて開く特別ダイアログをまとめて管理する。
// 今後この手の2段階演出が増えたら、ここに1行足すだけで済むようにする。
// 悟り・名人などコース全体の節目同士の連鎖はCLEAR_CONTENTのキーで表せないので、ここにまとめる。
// ステージ単位の節目(だるま学園卒業→だるま修行など)はCLEAR_CONTENTの`○○before`/`○○after`キー側で管理する。
const MASTER_DIALOG_CHAIN={
  // 二周目を既に制覇していても、一周目をもう一度完走したら新しい二周目を始められるようにする。
  satori:{via:'close',when:()=>activeLap===1,
    setup:()=>{if(!secondLapUnlocked)beginSecondLap();else{activateCampaignLap(2);GameNavigation.stage(0);}},
    open:'secondLapIntro'},
  mastery:{via:'close',when:()=>secondLapActive||speedMasteryTrialCleared,open:'satoriIntro'}
};
$('masterClose').addEventListener('click',()=>{
  const chain=MASTER_DIALOG_CHAIN[masterDialogKind];
  const chainActive=chain?.via==='close'&&chain.when();
  const restartTraining=masterDialogKind==='awakening';
  const leaveSpeed=['speedComplete','speedTrialFailed'].includes(masterDialogKind);
  const resumeSpeed=masterDialogKind==='speedIntro'&&isMode('speed');
  hideGameDialogs();
  if(resumeSpeed){startSpeedClock();return;}
  if(chainActive){
    chain.setup?.();
    rememberSpecialMessage(chain.open);
    openChainedDialog(chain.open);
    return;
  }
  if(restartTraining){activateCampaignLap(1);GameNavigation.stage(0);return;}
  if(leaveSpeed){GameNavigation.stageMenu();return;}
  renderStageNav();
});
$('shareGame').addEventListener('click',()=>shareWakeSeven('game',$('shareGame')));
$('masterShare').addEventListener('click',()=>shareWakeSeven($('masterShare').dataset.shareKind,$('masterShare')));
$('messageRankLink').addEventListener('click',()=>{
  if($('messageRankLink').dataset.target==='tips'){
    $('messageDialog').hidden=true;
    tipGuideReturnTarget={dialogId:'messageDialog',focusId:'messageRankLink'};
    openTipGuide();
    return;
  }
  if($('messageRankLink').dataset.target==='patterns'){
    $('messageDialog').hidden=true;
    twoMovePatternsReturnTarget={dialogId:'messageDialog',focusId:'messageRankLink'};
    openTwoMovePatterns();
    return;
  }
  if($('messageRankLink').dataset.target==='guide'){
    const entry=messageReviewEntries[messageReviewIndex],guideCard=clearContentAt(true,entry.index).guideCard;
    $('messageDialog').hidden=true;
    tipGuideReturnTarget={dialogId:'messageDialog',focusId:'messageRankLink'};
    openTipGuide();
    tipGuideIndex=guideCard.page;
    renderTipGuide();
    return;
  }
  if($('messageRankLink').dataset.target==='card'){
    const entry=messageReviewEntries[messageReviewIndex],card=clearContentAt(true,entry.index).twoMoveCard;
    $('messageDialog').hidden=true;
    twoMovePatternsReturnTarget={dialogId:'messageDialog',focusId:'messageRankLink'};
    openTwoMovePatterns();
    twoMoveDetailReturnTarget={dialogId:'messageDialog',focusId:'messageRankLink'};
    openTwoMoveDetail(TWO_MOVE_STAGES[card].state,card);
    return;
  }
  $('messageDialog').hidden=true;
  GameDialogs.ranks({dialogId:'messageDialog',focusId:'messageRankLink'});
});
$('rankBadge').addEventListener('click',openRankDialog);
$('masterSeal').addEventListener('click',()=>openRankDialogFrom('masterDialog','masterSeal'));
$('messageMasterSeal').addEventListener('click',()=>openRankDialogFrom('messageDialog','messageMasterSeal'));
for(const [sealId,dialogId] of [['masterSeal','masterDialog'],['messageMasterSeal','messageDialog']]){
  $(sealId).addEventListener('keydown',event=>{
    if(event.key==='Enter'||event.key===' '){event.preventDefault();openRankDialogFrom(dialogId,sealId);}
  });
}
$('closeRankDialog').addEventListener('click',()=>{
  const returnTarget=rankDialogReturn;rankDialogReturn=null;
  $('rankDialog').hidden=true;
  if(!focusReturnTarget(returnTarget))$('rankBadge').focus();
});
$('masterStart').addEventListener('click',()=>{
  const speedTarget=$('masterStart').dataset.speedVariant;
  hideGameDialogs();
  if(speedTarget){speedVariant=speedTarget;speedSession=null;enterSpeedMode(true);return;}
  if(masterDialogKind==='awakening'){enterSpeedMode(true);return;}
  if(masterDialogKind==='speedIntro'){enterSpeedMode(!readSpeedSession());return;}
  if(masterDialogKind==='speedTrialFailed'){
    speedVariant=['training9','training18','mastery27'].includes(speedSession?.requiredTrial)?speedSession.requiredTrial:'training9';
    speedSession=null;enterSpeedMode(true);return;
  }
  if(masterDialogKind==='speedComplete'){enterSpeedMode(true);return;}
  if(masterDialogKind==='primary'){
    if(!secondLapActive&&!speedTrainingTrialCleared){speedVariant='training9';speedSession=null;enterSpeedMode(true);return;}
    const before=clearContentBefore(false,TRAINING_STAGE_START);
    if(before?.dialog){rememberSpecialMessage(before.dialog);openChainedDialog(before.dialog);return;}
    GameNavigation.stage(TRAINING_STAGE_START);return;
  }
  if(masterDialogKind==='intermediate'&&!secondLapActive&&!speedIntermediateTrialCleared){
    speedVariant='training18';speedSession=null;enterSpeedMode(true);return;
  }
  if(masterDialogKind==='mastery'&&!secondLapActive&&!speedMasteryTrialCleared){
    speedVariant='mastery27';speedSession=null;enterSpeedMode(true);return;
  }
  if(masterDialogKind==='intermediate'){GameNavigation.mastery(0);return;}
  if(masterDialogKind==='pathInfo')GameNavigation.mastery(0);
  else if(masterDialogKind==='secondLapIntro')GameNavigation.stage(0);
  else if(masterDialogKind==='satoriIntro')GameNavigation.satori(0);
  else if(masterDialogKind==='satori')openSatoriPicker();
  else if(masterDialogKind==='mastery')openSatoriPicker();
  else GameNavigation.mastery(extraIndex+1);
});
$('masterSpeedUnlockStart').addEventListener('click',()=>{
  hideGameDialogs();
  speedVariant='satori73';
  speedSession=null;
  enterSpeedMode(true);
});
$('introStart').addEventListener('click',()=>{
  clearUiEffectTimers('intro');
  $('introDialog').hidden=true;
  storage.set(STORAGE_KEY_GROUPS.progression.introSeen,'1');
  GameNavigation.tutorial();
});
$('chainDialogAction').addEventListener('click',()=>{
  const step=chainActiveStep;
  const name=chainActiveName;
  // onAction が次の連続ダイアログを開く場合だけ、現在のステップを履歴に積む。
  // 問題開始などで連鎖が終わる場合は、下の判定で履歴を破棄する。
  if(name)chainHistory.push(name);
  closeChainDialog();
  chainTransitioning=true;
  step.onAction();
  chainTransitioning=false;
  if($('chainDialog').hidden)chainHistory=[];
});
$('chainDialogPrev').addEventListener('click',()=>{
  const previous=chainHistory.pop();
  if(previous)openChainedDialog(previous);
});
for(let i=0;i<2;i++)$('twoMoveLessonTab'+i).addEventListener('click',()=>{
  twoMoveLessonTipIndex=i;
  renderTwoMoveLessonTip();
});
$('twoMoveLessonOpen').addEventListener('click',()=>openTwoMoveLessonDialog());
$('twoMoveLessonPrev').addEventListener('click',()=>navigateTwoMoveLesson(-1));
$('twoMoveLessonNext').addEventListener('click',()=>navigateTwoMoveLesson(1));
$('closeTwoMoveLesson').addEventListener('click',closeTwoMoveLessonDialog);
$('retryTwoMoveLesson').addEventListener('click',()=>{
  closeTwoMoveLessonDialog();
  WakeSevenBoardCommands.reset();
});
$('twoMoveLessonDialog').addEventListener('click',event=>{
  if(event.target===$('twoMoveLessonDialog'))closeTwoMoveLessonDialog();
});
// ===== ヒントガイド(盤面の見分け方・ミニ講座カルーセル) =====
const PLAY_TIPS={
  ja:[
    '4体立ち：寝ダルマの小三角は最短1手、大三角は最短4手、ほかは最短3手',
    '2体寝が中央と外側：向きに関係なく最短2手',
    '2体寝が外側の隣同士：盤面を時計に見立て、進んでいる方のだるまがあと一手で起きるなら最短2手',
    '5体立ちで寝た2体が外周で離れていれば最短3手',
    '4体寝のひし形：対角が違う向きなら最短2手（同じ向きなら最短3手）',
    '4体寝の芋虫：目玉同士、体同士がそれぞれ同じ向きなら最短2手',
    '5体寝台形：同じ向きの三角を除いて2体を並べて残し、盤面を時計に見立てて遅れている方のだるまがあと一手で起きるなら最短2手',
    '5体寝台形：同じ向きの三角を除いて2体を並べて残し、盤面を時計に見立てて遅れている方のだるまがあと一手で起きるなら最短2手',
    '5体寝のリボン：同じ向きの三角を除いて2体を並べて残し、盤面を時計に見立てて遅れている方のだるまがあと一手で起きるなら最短2手',
    '中央だけが立っている形は、向きに関係なく最短4手',
    '外周に1つおきに3体立っている形は最短3手です。逆に、外周に1つおきに3体寝ている形は最短4手なので違いに注意しよう。',
    '最短2手は対称な形を除くと9パターン。ステージ4〜12で全種類を網羅'
  ],
  en:[
    'With 4 standing: a small triangle of fallen daruma is 1 move, a large triangle 4, and all other shapes 3.',
    'With 5 standing, if the center is fallen, the solution is always 2 moves regardless of direction.',
    'With 5 standing and two adjacent outer fallen daruma: the 10-minutes-before one falling right and the 10-minutes-after one falling left means 2 moves.',
    'With 5 standing, two separated fallen daruma on the rim mean 3 moves.',
    'Four fallen in a diamond: matching diagonal directions mean 3 moves; different directions mean 2.',
    'Four fallen in a caterpillar: matching eyes and matching body directions mean 2 moves.',
    'Five fallen in a trapezoid: an off-center odd one is 2 moves when it is 10 minutes before the nearer standing daruma and falls right, or 10 minutes after and falls left.',
    'Five fallen in a trapezoid: an off-center odd one is 2 moves when it is 20 minutes before the nearer standing daruma and falls left, or 20 minutes after and falls right.',
    'Five fallen in a ribbon: an off-center odd one is 2 moves when it is 10 minutes before the adjacent standing daruma and falls right, or 10 minutes after and falls left.',
    'If only the center is standing, the solution is always 4 moves regardless of direction.',
    'Three standing on alternating outer positions always means 3 moves.',
    'Up to symmetry there are only nine 2-move patterns. Puzzles 4–12 cover them all.'
  ],
  zh:[
    '4个站立：倒下的不倒翁组成小三角时最少1步，大三角最少4步，其他形状最少3步。',
    '5个站立且中央倒下时，无论朝向都最少2步。',
    '5个站立、外圈相邻的两个倒下：10分钟前位置向右倒＋10分钟后位置向左倒时，最少2步。',
    '5个站立且外圈两个倒下不相邻时，最少3步。',
    '4个倒下呈菱形：对角朝向相同最少3步，不同则最少2步。',
    '4个倒下呈毛毛虫形：两只眼同向、身体两格也同向时，最少2步。',
    '5个倒下呈梯形：异类不在中央，位于较近站立者的10分钟前并向右倒，或10分钟后并向左倒时，最少2步。',
    '5个倒下呈梯形：异类不在中央，位于较近站立者的20分钟前并向左倒，或20分钟后并向右倒时，最少2步。',
    '5个倒下呈杠铃形：异类不在中央，位于相邻站立者的10分钟前并向右倒，或10分钟后并向左倒时，最少2步。',
    '只有中央站立时，无论朝向都最少4步。',
    '外圈每隔一个站立，共3个站立时，最少3步。',
    '排除对称后，最少2步的形状只有9种。关卡4～12涵盖全部。'
  ],
  ko:[
    '4개가 서 있을 때: 누운 다루마의 작은 삼각형은 최단 1수, 큰 삼각형은 4수, 나머지는 3수입니다.',
    '5개가 서 있고 중앙이 누워 있으면 방향과 관계없이 최단 2수입니다.',
    '5개가 서 있고 바깥쪽의 누운 둘이 이웃할 때, 10분 전 위치가 오른쪽으로 눕고 10분 후 위치가 왼쪽으로 누우면 최단 2수입니다.',
    '5개가 서 있고 바깥쪽의 누운 둘이 떨어져 있으면 최단 3수입니다.',
    '4개가 마름모로 누울 때 대각선 방향이 같으면 최단 3수, 다르면 2수입니다.',
    '4개가 애벌레 모양으로 누울 때 두 눈끼리, 두 몸끼리 각각 같은 방향이면 최단 2수입니다.',
    '5개가 사다리꼴로 누울 때 예외가 중앙 밖이며 가까운 선 다루마의 10분 전＋오른쪽 눕기, 또는 10분 후＋왼쪽 눕기면 최단 2수입니다.',
    '5개가 사다리꼴로 누울 때 예외가 중앙 밖이며 가까운 선 다루마의 20분 전＋왼쪽 눕기, 또는 20분 후＋오른쪽 눕기면 최단 2수입니다.',
    '5개가 바벨 모양으로 누울 때 예외가 중앙 밖이며 이웃한 선 다루마의 10분 전＋오른쪽 눕기, 또는 10분 후＋왼쪽 눕기면 최단 2수입니다.',
    '중앙만 서 있으면 방향과 관계없이 최단 4수입니다.',
    '바깥쪽에 하나씩 건너 3개가 서 있으면 최단 3수입니다.',
    '대칭을 제외하면 최단 2수 패턴은 9개뿐이며 문제 4~12에 모두 나옵니다.'
  ]
};
const GUIDE_TIP_INDEX=[3,10,9,0];
const GUIDE_PLAY_STATES=[
  [[2,0,0,0,1,0,0]],
  [[0,2,2,1,0,0,1]],
  [[1,1,1,0,1,1,1]],
  [[0,0,1,1,0,1,0],[0,1,1,0,0,0,1]]
];
const GUIDE_DOUBLE_INDEX=3;
let tipGuideIndex=0,tipGuideStates=[],tipGuideDrag=null,tipGuideReturnTarget=null;
const tipGuideGuard=createAnimGuard();
const TIP_CELL=[[85,25],[125,25],[66,59],[105,59],[144,59],[85,93],[125,93]];
function tipGuideBoard(state,cx=105,cy=59,scale=1){
  return '<g class="tip-guide-board" transform="translate('+cx+' '+cy+') scale('+scale+') translate(-105 -59)">'+TIP_CELL.map(([x,y],i)=>'<g class="tip-guide-tile" data-cell="'+i+'" transform="translate('+x+' '+y+')">'
    +'<path d="M0 -23L19.92 -11.5L19.92 11.5L0 23L-19.92 11.5L-19.92 -11.5Z" fill="'+(state[i]===0?'#F3E8D5':'#B9C6D6')+'" stroke="'+(state[i]===0?'#C9A54E':'#8795A3')+'" stroke-width="'+(state[i]===0?'1.3':'.8')+'"/>'
    +'<g class="tip-guide-daruma" transform="rotate('+miniAngle(state[i])+')"><g transform="translate(0 1) scale(.42)"><use href="#daruma-body"/><use href="#'+(state[i]===0?'face-open':'face-shut')+'"/></g></g></g>').join('')+'</g>';
}
function tipGuideBestLabel(n){
  const {language}=runtimeSnapshot();
  return ({ja:'最短'+n+'手',en:'Best: '+n+' moves',zh:'最少'+n+'步',ko:'최단 '+n+'수'}[language]||('最短'+n+'手'));
}
function tipGuideSvg(index,states){
  const labels={ja:['小三角の寝ダルマ','大三角の寝ダルマ'],en:['Small triangle of fallen daruma','Large triangle of fallen daruma'],zh:['倒下的小三角','倒下的大三角'],ko:['누운 다루마의 작은 삼각형','누운 다루마의 큰 삼각형']};
  const {language}=runtimeSnapshot();
  const l=labels[language]||labels.ja;
  const best=tipGuideBestLabel;
  const boards=[
    ()=>tipGuideBoard(states[0]),
    ()=>tipGuideBoard(states[0]),
    ()=>tipGuideBoard(states[0]),
    ()=>'<g class="tip-guide-drag-board">'+tipGuideBoard(states[0],49,57,.84)
      +'<text x="49" y="130" text-anchor="middle" class="tip-guide-label">'+l[0]+'</text><text x="49" y="148" text-anchor="middle" class="tip-text" style="font-size:15px">'+best(1)+'</text></g>'
      +'<g class="tip-guide-drag-board">'+tipGuideBoard(states[1],161,57,.84)
      +'<text x="161" y="130" text-anchor="middle" class="tip-guide-label">'+l[1]+'</text><text x="161" y="148" text-anchor="middle" class="tip-text" style="font-size:15px">'+best(4)+'</text></g>'
  ];
  return '<svg viewBox="0 0 210 '+(index===GUIDE_DOUBLE_INDEX?180:120)+'" aria-hidden="true">'+boards[index]()+'</svg>';
}
function tipGuideControls(index,count){
  const position=count>1?' double'+(index?' second':''):'';
  const buttons=[['rotateBack','rotateCcw'],['rotate','rotateCw'],['mirror','mirror'],['vertical','flipVertical']]
    .map(([transform,label])=>'<button class="chip" type="button" data-tip-transform="'+transform+'" data-tip-board-index="'+index+'" aria-label="'+tr(label)+'">'+transformIcon(transform)+'</button>').join('');
  return '<div class="tip-guide-transform transform-icons transform-corners tip-guide-board-controls'+position+'">'+buttons+'</div>';
}
function tipGuideDoubleVisualMarkup(state){
  return '<svg viewBox="0 0 105 120" aria-hidden="true"><g class="tip-guide-drag-board">'+tipGuideBoard(state,52.5,57,.84)+'</g></svg>';
}
function tipGuideDoubleMarkup(states){
  const labels={ja:['小三角の寝ダルマ','大三角の寝ダルマ'],en:['Small triangle of fallen daruma','Large triangle of fallen daruma'],zh:['倒下的小三角','倒下的大三角'],ko:['누운 다루마의 작은 삼각형','누운 다루마의 큰 삼각형']};
  const {language}=runtimeSnapshot();
  const names=labels[language]||labels.ja;
  const best=[1,4];
  return states.map((state,index)=>'<div class="tip-guide-double-board"><div class="tip-guide-double-visual">'+tipGuideDoubleVisualMarkup(state)+'</div><div class="tip-guide-double-caption">'+names[index]+'<strong>'+tipGuideBestLabel(best[index])+'</strong></div>'+tipGuideControls(index,1)+'</div>').join('');
}
function renderTipGuide(model={}){
  const guideIndex=Number.isInteger(model.index)?model.index:tipGuideIndex;
  const guideStates=model.states||tipGuideStates;
  const guideLang=model.lang||runtimeSnapshot().language;
  const tips=PLAY_TIPS[guideLang]||PLAY_TIPS.ja;
  $('tipGuideTitle').textContent=tr('tipGuideTitle');
  $('tipGuidePage').textContent=(guideIndex+1)+' / '+GUIDE_TIP_INDEX.length;
  $('tipGuideCompareHint').textContent=tr('compareBoard');
  const currentBoards=guideStates[guideIndex];
  const captions=['寝た2体が外周で離れている','外周に1つおきに3体立っている','6体寝て、中央だけ立っている'];
  const caption=$('tipGuideBoardCaption');
  const compact=guideIndex!==GUIDE_DOUBLE_INDEX;
  $('tipGuideArt').classList.toggle('compact',compact);
  $('tipGuideArt').classList.toggle('double',!compact);
  caption.hidden=!compact;
  if(compact){
    const best=[3,3,4][guideIndex];
    caption.replaceChildren();
    const template=$('tipGuideCaptionTemplate');
    const fragment=template?.content?.cloneNode(true);
    if(fragment){
      fragment.querySelector('[data-caption-text]').textContent=captions[guideIndex];
      fragment.querySelector('[data-caption-best]').textContent=tipGuideBestLabel(best);
      caption.append(fragment);
    }else caption.textContent=captions[guideIndex]+' '+tipGuideBestLabel(best);
  }
  replaceRenderedContent($('tipGuideArt'),compact
    ?'<div class="tip-guide-single-visual">'+tipGuideSvg(guideIndex,currentBoards)+'</div>'+tipGuideControls(0,1)
    :tipGuideDoubleMarkup(currentBoards));
  const tipText=tips[GUIDE_TIP_INDEX[guideIndex]];
  const tipTextRoot=$('tipGuideText');
  tipTextRoot.replaceChildren();
  const emphasized=guideLang==='ja'&&guideIndex===GUIDE_DOUBLE_INDEX;
  if(emphasized){
    const phrase='ほかは最短3手',at=tipText.indexOf(phrase);
    const template=$('tipGuideTextEmphasisTemplate'),fragment=template?.content?.cloneNode(true);
    if(fragment&&at>=0){
      fragment.querySelector('[data-tip-prefix]').textContent=tipText.slice(0,at);
      fragment.querySelector('[data-tip-emphasis]').textContent=phrase;
      fragment.querySelector('[data-tip-suffix]').textContent=tipText.slice(at+phrase.length);
      tipTextRoot.append(fragment);
    }else tipTextRoot.textContent=tipText;
  }else tipTextRoot.textContent=tipText;
  const names={ja:['小三角','大三角'],en:['Small triangle','Large triangle'],zh:['小三角','大三角'],ko:['작은 삼각형','큰 삼각형']}[guideLang]||['小三角','大三角'];
  const playRoot=$('tipGuidePlay');
  playRoot.replaceChildren();
  const playTemplate=$('tipGuidePlayItemTemplate');
  guideStates[guideIndex].forEach((state,index)=>{
    const label=guideIndex===GUIDE_DOUBLE_INDEX?names[index]+'　'+tr('playThisBoard'):tr('playThisBoard');
    const button=playTemplate?.content?.firstElementChild?.cloneNode(true)||document.createElement('button');
    button.className='chip on';
    button.type='button';
    button.dataset.state=enc(state);
    button.textContent=label;
    playRoot.append(button);
  });
  $('tipGuidePrev').textContent='← '+tr('prev');
  $('tipGuideNext').textContent=tr('next')+' →';
  $('closeTipGuide').textContent=(returnToClearCard||tipGuideReturnTarget)?tr('backToClear'):tr('close');
  $('tipGuidePrev').disabled=false;
  $('tipGuideNext').disabled=false;
}
function openTipGuide(){
  tipGuideGuard.reset();
  tipGuideIndex=0;tipGuideStates=GUIDE_PLAY_STATES.map(page=>page.map(state=>Uint8Array.from(state)));renderTipGuide();
  $('tipGuideDialog').hidden=false;
  $('tipGuideNext').focus();
}
function transformTipGuide(angle=0,mirror=false,boardIndex=0,inPlace=false){
  const symmetry={permutation:makeBoardPermutation(angle,mirror),flip:mirror};
  tipGuideStates[tipGuideIndex][boardIndex]=dec(transformStateBySymmetry(enc(tipGuideStates[tipGuideIndex][boardIndex]),symmetry));
  if(!inPlace){renderTipGuide();return;}
  const state=tipGuideStates[tipGuideIndex][boardIndex];
  if(tipGuideIndex===GUIDE_DOUBLE_INDEX){
    const visual=document.querySelectorAll('.tip-guide-double-visual')[boardIndex];
    if(visual)visual.innerHTML=tipGuideDoubleVisualMarkup(state);
  }else{
    const visual=$('tipGuideArt').querySelector('.tip-guide-single-visual');
    if(visual)visual.innerHTML=tipGuideSvg(tipGuideIndex,[state]);
  }
}
function animateTipGuide(angle=0,mirror=false,boardIndex=0){
  if(tipGuideGuard.isBusy())return;
  const symmetry={permutation:makeBoardPermutation(angle,mirror),flip:mirror};
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){transformTipGuide(angle,mirror,boardIndex);return;}
  tipGuideGuard.begin();
  const state=tipGuideStates[tipGuideIndex][boardIndex],after=dec(transformStateBySymmetry(enc(state),symmetry));
  const board=document.querySelectorAll('.tip-guide-board')[boardIndex];
  if(!board){tipGuideGuard.cancel();return;}
  animateMiniBoardTiles(board,'.tip-guide-tile','.tip-guide-daruma',i=>({x:TIP_CELL[i][0],y:TIP_CELL[i][1]}),symmetry.permutation,state,after);
  tipGuideGuard.arm(480,()=>transformTipGuide(angle,mirror,boardIndex));
}
function closeTipGuide(){
  finishTipGuideDrag();
  $('tipGuideDialog').hidden=true;
  if(returnToClearCard){returnToClearDialog();return;}
  if(tipGuideReturnTarget){
    const target=tipGuideReturnTarget;
    tipGuideReturnTarget=null;
    focusReturnTarget(target);
    return;
  }
  if(guideHubReturn){guideHubReturn=false;openGuideHub();return;}
  $('menuToggle').focus();
}
WakeSevenEventBindings.click('guideHubTips',()=>{closeGuideHub();returnToClearCard=false;guideHubReturn=true;openTipGuide();});
WakeSevenEventBindings.click('guideHubPatterns',()=>{closeGuideHub();guideHubReturn=true;openTwoMovePatterns();});
WakeSevenEventBindings.click('guideHubClose',closeGuideHub);
$('guideHubDialog').addEventListener('click',event=>{if(event.target===$('guideHubDialog'))closeGuideHub();});
function openGuideHub(){
  guideHubReturn=false;
  hideGameDialogs();
  $('guideHubDialog').hidden=false;
  $('guideHubTips').focus();
}
function closeGuideHub(){
  $('guideHubDialog').hidden=true;
  $('menuToggle').focus();
}
function startTipGuideDrag(event){
  if(event.target.closest('[data-tip-transform]'))return;
  if(tipGuideGuard.isBusy()||tipGuideDrag||(event.pointerType==='mouse'&&event.button!==0))return;
  const art=$('tipGuideArt');
  const board=tipGuideIndex===GUIDE_DOUBLE_INDEX?event.target.closest('.tip-guide-double-visual'):event.target.closest('svg');
  if(!board)return;
  event.preventDefault();
  tipGuideDrag={id:event.pointerId,art,board,startX:event.clientX,startY:event.clientY};
  board.classList.add('is-comparing');
  art.setPointerCapture(event.pointerId);
  $('tipGuideDialog').classList.add('comparing');
}
function moveTipGuideDrag(event){
  if(!tipGuideDrag||event.pointerId!==tipGuideDrag.id)return;
  const dx=event.clientX-tipGuideDrag.startX,dy=event.clientY-tipGuideDrag.startY;
  tipGuideDrag.board.style.transform='translate('+dx+'px,'+dy+'px)';
}
function finishTipGuideDrag(event){
  if(!tipGuideDrag||(event&&event.pointerId!==tipGuideDrag.id))return;
  const drag=tipGuideDrag;tipGuideDrag=null;
  try{drag.art.releasePointerCapture(drag.id)}catch(_){}
  drag.board.style.transform='';
  drag.board.classList.remove('is-comparing');
  $('tipGuideDialog').classList.remove('comparing');
}
$('showTip').addEventListener('click',()=>{returnToClearCard=false;openTipGuide();});
$('tipGuidePrev').addEventListener('click',()=>{if(!tipGuideGuard.isBusy()){tipGuideIndex=(tipGuideIndex+GUIDE_TIP_INDEX.length-1)%GUIDE_TIP_INDEX.length;renderTipGuide();}});
$('tipGuideNext').addEventListener('click',()=>{if(!tipGuideGuard.isBusy()){tipGuideIndex=(tipGuideIndex+1)%GUIDE_TIP_INDEX.length;renderTipGuide();}});
$('tipGuideArt').addEventListener('click',event=>{
  const button=event.target.closest('[data-tip-transform]');
  if(!button)return;
  event.stopPropagation();
  const transforms={rotateBack:[-60,false],rotate:[60,false],mirror:[0,true],vertical:[180,true]};
  const [angle,mirror]=transforms[button.dataset.tipTransform];
  animateTipGuide(angle,mirror,Number(button.dataset.tipBoardIndex));
});
$('tipGuideArt').addEventListener('pointerdown',startTipGuideDrag);
$('tipGuideArt').addEventListener('pointermove',moveTipGuideDrag);
$('tipGuideArt').addEventListener('pointerup',finishTipGuideDrag);
$('tipGuideArt').addEventListener('pointercancel',finishTipGuideDrag);
$('tipGuidePlay').addEventListener('click',event=>{
  const button=event.target.closest('button[data-state]');
  if(!button)return;
  returnToClearCard=false;
  $('tipGuideDialog').hidden=true;
  startFreeFromState(Number(button.dataset.state));
});
$('closeTipGuide').addEventListener('click',closeTipGuide);
$('tipGuideDialog').addEventListener('click',event=>{if(event.target===$('tipGuideDialog'))closeTipGuide();});
// ===== 言語切替・アプリメニュー・盤面テーマ(イベント配線群B) =====
// 単純な$(id).textContent=tr(key) / $(id).setAttribute(attr,tr(key))パターンをまとめて処理する。
// [id,key]はtextContent、[id,key,attr]はsetAttribute(attr,...)。条件分岐・文字列結合・
// innerHTML・他のrender関数呼び出しが絡むものはここに入れず、下に明示コードとして残す。
const LANGUAGE_TEXT_TARGETS=[
  ['linkWelcome','linkWelcome'],['analyticsNotice','analyticsNotice'],
  ['shareGameLabel','share'],['shareGame','share','aria-label'],
  ['languageToggle','language','aria-label'],['languageMenu','language','aria-label'],
  ['menuToggle','menu'],['menuToggle','menu','aria-label'],
  ['prevStage','prev','aria-label'],['nextStage','next','aria-label'],
  ['stagePickerTrigger','stagePicker','aria-label'],
  ['pickerFreeMode','stagePickerFree'],['pickerCustomMode','stagePickerCustom'],['pickerSpeedMode','stagePickerSpeed'],
  ['speedPauseStageMode','stageModeReturn'],['speedPauseFreeMode','stagePickerFree'],['speedPauseCustomMode','stagePickerCustom'],
  ['shortestLabel','shortestDisplay'],['moveUnit','moveUnit'],['academyClearSuffix','academyClearSuffix'],['movesLabel','moves'],['movesUnit','moveUnit'],
  ['stageMode','stageMode'],['freeMode','freeMode'],
  ['menuStagePicker','stagePicker'],['menuRankList','rankListMenu'],['menuSettings','settings'],['guideHub','guideHub'],
  ['settingsDialogTitle','settings'],['settingsDialogClose','close'],['menuAbout','menuAbout'],
  ['aboutDialogTitle','menuAbout'],['aboutDialogCloseBtn','close'],
  ['menuBoardTheme','boardTheme'],['boardThemeTitle','boardTheme'],
  ['boardThemeColorLabel','boardThemeColor'],['boardThemeLayoutLabel','boardThemeLayout'],
  ['boardThemeDefault','boardThemeDefault'],['boardThemeGold','boardThemeGold'],['boardThemeSatori','boardThemeSatori'],
  ['darumaColorLabel','darumaColor'],['darumaColorRed','darumaColorRed'],['darumaColorRainbow','darumaColorRainbow'],
  ['boardLayoutNormal','boardLayoutNormal'],['boardThemeTilted','boardThemeTilted'],['closeBoardTheme','close'],
  ['menuSatori','satori'],['menuSpeed','speedMode'],['masterAllPatterns','allPatternsOpen'],['master3DLink','threeDOpen'],
  ['clearMessages','clearMessages'],['stageModeReturn','stageModeReturn'],['shuffle','shuffle'],['undo','undo'],['hint','hint'],
  ['speedClockLabel','timeLabel'],['speedPause','speedPause'],['speedBoardStart','speedGo'],
  ['speedPauseTitle','speedPauseTitle'],['speedResume','speedResume'],
  ['speedRestart','speedRestartConfirm'],['speedRestartTitle','speedRestartTitle'],['speedRestartText','speedRestartText'],
  ['speedRestartCancel','speedRestartCancel'],['speedRestartConfirm','speedRestartConfirm'],
  ['debugReset','debugReset'],['debugClear','debugClear'],['debugSpeedJumpFinish','debugSpeedJumpFinish'],
  ['debugAlmost','debugAlmost'],['debugMore','debugMore'],['debugFar','debugFar'],['debugSkipTutorial','debugSkipTutorial'],
  ['debugIntro2','debugIntro2'],['debugBasic11','debugBasic11'],['debugAcademy20','debugAcademy20'],
  ['debugTrainingUpper','debugTrainingUpper'],['debugTrainingMiddle','debugTrainingMiddle'],['debugTrainingLower','debugTrainingLower'],
  ['debugExtra14','debugExtra14'],['debugExtra29','debugExtra29'],['debugExtra44','debugExtra44'],['debugSatori72','debugSatori72'],
  ['debugSpeedTraining8','debugSpeedTraining8'],['debugSpeedIntermediate17','debugSpeedIntermediate17'],['debugSpeedMastery26','debugSpeedMastery26'],
  ['debugSecondIntro2','debugIntro2'],['debugSecondBasic11','debugBasic11'],['debugSecondAcademy20','debugAcademy20'],
  ['debugSecondTrainingUpper','debugTrainingUpper'],['debugSecondTrainingMiddle','debugTrainingMiddle'],['debugSecondTrainingLower','debugTrainingLower'],
  ['debugSecondExtra14','debugExtra14'],['debugSecondExtra29','debugExtra29'],['debugSecondExtra44','debugExtra44'],['debugSecondSatori72','debugSatori72'],
  ['board','boardLabel','aria-label'],['showTip','tips'],
  ['guideHubTitle','guideHubTitle'],['guideHubTips','guideHubTips'],['guideHubPatterns','guideHubPatterns'],['guideHubClose','close'],
  ['resetProgress','resetProgress'],['resetDialogTitle','resetProgress'],['resetDialogText','resetConfirm'],
  ['resetDialogClose','close','aria-label'],['resetDialogConfirm','resetProgress'],['resetDialogAll','resetEverything'],
  ['twoMovePatterns','twoMovePatterns'],['twoMoveTitle','twoMoveTitle'],['twoMoveText','twoMoveText'],
  ['closeTwoMovePatterns','close'],['twoMoveDetailTitle','twoMoveDetailTitle'],['twoMoveDetailCompareHint','compareBoard'],
  ['closeTwoMoveDetail','backToPatterns'],['returnToClearDetail','backToClear'],['playTwoMoveFree','playInFree'],
  ['introTitle','introTitle'],['introText','introText'],['introStart','introStart'],
  ['clearClose','close'],['masterClose','close'],['masterShareLabel','shareShort'],
  ['masterSeal','rankCollection','aria-label'],['messageMasterSeal','rankCollection','aria-label'],
];
function applyLanguage(lang){
  if(!setLanguageCommand(lang))return;
  document.documentElement.lang=lang==='zh'?'zh-CN':lang;
  document.title=tr('pageTitle');
  document.querySelector('h1').textContent=tr('title');
  LANGUAGE_TEXT_TARGETS.forEach(([id,key,attr])=>{
    if(attr)$(id).setAttribute(attr,tr(key));
    else $(id).textContent=tr(key);
  });
  $('analyticsNotice').href='https://policies.google.com/technologies/partner-sites?hl='+(lang==='zh'?'zh-CN':lang);
  $('aboutVersion').textContent='v'+APP_VERSION;
  document.querySelectorAll('[data-lang]').forEach(button=>{
    button.setAttribute('aria-checked',String(button.dataset.lang===lang));
  });
  $('prevStage').textContent='← '+tr('prev');
  $('nextStage').textContent=tr('next')+' →';
  if(!$('speedModeOptions').hidden)renderSpeedModeOptions();
  const updateExternalMenuLabel=(id,key)=>{const button=$(id),label=button.firstChild;if(label?.nodeType===3)label.nodeValue=tr(key);else button.prepend(document.createTextNode(tr(key)));};
  updateExternalMenuLabel('menuAllPatterns','allPatternsMenu');
  updateExternalMenuLabel('menuOpen3D','threeDMenu');
  updateSoundToggle();
  if(!$('twoMoveLessonDialog').hidden)openTwoMoveLessonDialog();
  if(!$('speedPauseDialog').hidden)renderSpeedPauseStats();
  [['mirrorBoard','mirror','mirror'],['flipBoardVertical','vertical','flipVertical'],['rotateBoardBack','rotateBack','rotateCcw'],['rotateBoard','rotate','rotateCw']].forEach(([id,icon,label])=>{const button=$(id);svgSetIcon(button.querySelector('[data-transform-icon]'),transformIcon(icon));button.querySelector('[data-transform-label]').textContent=tr(label);});
  [
    ['twoMoveDetailRotateBack','rotateBack','rotateCcw'],['twoMoveDetailRotate','rotate','rotateCw'],['twoMoveDetailMirror','mirror','mirror'],['twoMoveDetailFlipVertical','vertical','flipVertical']
  ].forEach(([id,icon,label])=>{svgSetIcon($(id),transformIcon(icon));$(id).setAttribute('aria-label',tr(label));});
  if(!$('chainDialog').hidden&&chainActiveName)openChainedDialog(chainActiveName);
  $('tutorialReset').textContent='↻ '+tr('tutorialReset');
  $('gripPromptText').textContent=isMode('tutorial')&&TUTORIAL_STEPS[tutorialStep]?.cue==='grab'?tutorialPrompt('grab'):tr('gripPrompt');
  if(!$('rankDialog').hidden)renderRankList();
  if(!$('masterDialog').hidden)GameDialogs.mastery(masterDialogKind);
  renderCurrentView();
  if(!$('twoMoveDialog').hidden)renderTwoMovePatterns();
  if(!$('twoMoveDetailDialog').hidden)renderTwoMoveDetail();
  if(!$('messageDialog').hidden)renderMessageReview();
  if(!$('optimalFailDialog').hidden){
    renderOptimalFail();
  }
  if(editingBoard)showMakerMessage();
  else if(clearShown){
    $('clearDialogMessage').textContent=clearDialogHeading();
    renderClearStageContext();
    renderClearTip();
    renderClearQuiz();
    showProgressionQuiz({rootId:'boardQuiz',boardQuizConfig:boardQuizConfigForCurrent(),requireAnswer:true});
    const action=$('clearNext');
    const {mode,masteryIndex,stageIndex}=runtimeSnapshot();
    if(mode==='free')action.textContent=tr('another');
    else if(mode==='custom')action.textContent=tr('again');
    else if(mode==='mastery')action.textContent=masteryIndex===EXTRA_STAGES.length-1?tr('toFree'):tr('nextPattern');
    else if(stageIndex===STAGES.length-1&&allPrimaryCleared())action.textContent=tr('allPatternsNext');
    else if(stageIndex===STAGES.length-1)action.textContent=tr('toFree');
    else action.textContent=tr('nextPuzzle');
  }else if(!$('tipGuideDialog').hidden){
    renderTipGuide();
  }
  if(window.reportWake7EmbedHeight)window.reportWake7EmbedHeight();
}
$('languageToggle').addEventListener('click',e=>{
  e.stopPropagation();
  const menu=$('languageMenu'),open=!menu.classList.contains('show');
  menu.classList.toggle('show',open);
  $('languageToggle').setAttribute('aria-expanded',String(open));
  if(open){
    const selected=menu.querySelector('[data-lang="'+runtimeSnapshot().language+'"]');
    if(selected)selected.focus();
  }
});
function closeAppMenu(){
  $('appMenu').classList.remove('show');
  $('menuToggle').setAttribute('aria-expanded','false');
}
$('menuToggle').addEventListener('click',e=>{
  e.stopPropagation();
  const menu=$('appMenu'),open=!menu.classList.contains('show');
  menu.classList.toggle('show',open);
  $('menuToggle').setAttribute('aria-expanded',String(open));
  if(open){
    $('languageMenu').classList.remove('show');
    $('languageToggle').setAttribute('aria-expanded','false');
  }
});
['stageMode','freeMode','customMode','clearMessages','showTip','resetProgress'].forEach(id=>{
  $(id).addEventListener('click',closeAppMenu);
});
$('soundToggle').addEventListener('click',()=>{
  toggleSoundCommand();
});
$('twoMovePatterns').addEventListener('click',()=>{
  closeAppMenu();
  openTwoMovePatterns();
});
$('menuBoardTheme').addEventListener('click',()=>{
  $('settingsDialog').hidden=true;
  closeAppMenu();
  openBoardThemeDialog();
});
$('closeBoardTheme').addEventListener('click',()=>{$('boardThemeDialog').hidden=true;});
$('boardThemeDialog').addEventListener('click',event=>{
  if(event.target===$('boardThemeDialog'))$('boardThemeDialog').hidden=true;
});
$('boardThemeOptions').addEventListener('click',event=>{
  const button=event.target.closest('[data-board-color],[data-board-layout],[data-daruma-color]');
  if(!button||button.disabled)return;
  selectBoardThemeCommand(button);
});
function closeTwoMovePatterns(){
  $('twoMoveDialog').hidden=true;
  if(returnToClearCard){returnToClearDialog();return;}
  if(twoMovePatternsReturnTarget){
    const target=twoMovePatternsReturnTarget;
    twoMovePatternsReturnTarget=null;
    focusReturnTarget(target);
    return;
  }
  if(guideHubReturn){guideHubReturn=false;openGuideHub();return;}
  $('menuToggle').focus();
}
$('closeTwoMovePatterns').addEventListener('click',closeTwoMovePatterns);
$('twoMoveDialog').addEventListener('click',event=>{
  if(event.target!==$('twoMoveDialog'))return;
  closeTwoMovePatterns();
});
$('twoMoveGrid').addEventListener('click',event=>{
  const card=event.target.closest('.two-move-card');
  if(!card||twoMoveGuard.isBusy())return;
  const transform=event.target.closest('[data-two-move-transform]');
  if(transform){
    const transforms={rotateBack:[-60,false],rotate:[60,false],mirror:[0,true],vertical:[180,true]};
    const [angle,mirror]=transforms[transform.dataset.twoMoveTransform];
    animateTwoMovePattern(Number(card.dataset.boardIndex),angle,mirror);
    return;
  }
  if(!event.target.closest('.two-move-card-open'))return;
  if(twoMovePatternsReturnTarget)twoMoveDetailReturnTarget={...twoMovePatternsReturnTarget};
  openTwoMoveDetail(Number(card.dataset.state),Number(card.dataset.pattern));
});
$('closeTwoMoveDetail').addEventListener('click',closeTwoMoveDetail);
$('returnToClearDetail').addEventListener('click',()=>{
  if(returnToClearCard){
    $('twoMoveDetailDialog').hidden=true;
    $('returnToClearDetail').hidden=true;
    returnToClearDialog();
    return;
  }
  if(!twoMoveDetailReturnTarget)return;
  const target=twoMoveDetailReturnTarget;
  twoMoveDetailReturnTarget=null;
  $('twoMoveDetailDialog').hidden=true;
  $('returnToClearDetail').hidden=true;
  focusReturnTarget(target);
});
$('twoMoveDetailPrev').addEventListener('click',()=>moveTwoMoveDetail(-1));
$('twoMoveDetailNext').addEventListener('click',()=>moveTwoMoveDetail(1));
$('twoMoveDetailRotateBack').addEventListener('click',()=>animateTwoMoveDetail(-60,false));
$('twoMoveDetailRotate').addEventListener('click',()=>animateTwoMoveDetail(60,false));
$('twoMoveDetailMirror').addEventListener('click',()=>animateTwoMoveDetail(0,true));
$('twoMoveDetailFlipVertical').addEventListener('click',()=>animateTwoMoveDetail(180,true));
$('twoMoveDetailBoard').addEventListener('pointerdown',startDetailDrag);
$('twoMoveDetailBoard').addEventListener('pointermove',moveDetailDrag);
$('twoMoveDetailBoard').addEventListener('pointerup',finishDetailDrag);
$('twoMoveDetailBoard').addEventListener('pointercancel',event=>finishDetailDrag(event,true));
$('twoMoveDetailDialog').addEventListener('click',event=>{
  if(event.target===$('twoMoveDetailDialog'))closeTwoMoveDetail();
});
$('playTwoMoveFree').addEventListener('click',()=>{
  if(twoMoveDetailGuard.isBusy())return;
  returnToClearCard=false;
  $('twoMoveDetailDialog').hidden=true;
  startFreeFromState(twoMoveDetailState);
});
$('clearShapeRuleRotateBack').addEventListener('click',()=>transformClearShapeRule(-60,false));
$('clearShapeRuleRotate').addEventListener('click',()=>transformClearShapeRule(60,false));
$('clearShapeRuleMirror').addEventListener('click',()=>transformClearShapeRule(0,true));
$('clearShapeRuleFlipVertical').addEventListener('click',()=>transformClearShapeRule(180,true));
document.querySelectorAll('[data-lang]').forEach(button=>{
  button.addEventListener('click',()=>{
    applyLanguage(button.dataset.lang);
    $('languageMenu').classList.remove('show');
    $('languageToggle').setAttribute('aria-expanded','false');
    $('languageToggle').focus();
  });
});
document.addEventListener('click',e=>{
  if(!e.target.closest('.language-picker')){
    $('languageMenu').classList.remove('show');
    $('languageToggle').setAttribute('aria-expanded','false');
  }
  if(!e.target.closest('.app-menu'))closeAppMenu();
});
// 卒業試験バッジをタップすると、何を速解きで突破したかの説明を吹き出しで見せる。もう一度押すか他所を押すと消える。
// 周囲の行と重ならないよう、position:fixedで画面上の空きに合わせて上下・左右を選ぶ。
document.addEventListener('click',e=>{
  const badge=e.target.closest('.speed-exam-badge');
  const openTip=document.querySelector('.speed-exam-tip');
  const wasOpenForThisBadge=openTip&&openTip.__badge===badge;
  if(openTip)openTip.remove();
  if(badge&&!wasOpenForThisBadge){
    const tip=document.createElement('div');
    tip.className='speed-exam-tip';
    const lines=speedExamBadgeLabel(Number(badge.dataset.examIndex)).split('\n');
    const roles=lines.length===3?['tip-verdict','tip-variant','tip-title']:['tip-variant','tip-title'];
    lines.forEach((line,i)=>{
      const div=document.createElement('div');
      div.className=roles[i];
      div.textContent=line;
      tip.appendChild(div);
    });
    tip.__badge=badge;
    document.body.appendChild(tip);
    const r=badge.getBoundingClientRect();
    const tipRect=tip.getBoundingClientRect();
    const spaceBelow=window.innerHeight-r.bottom,spaceAbove=r.top;
    const top=(spaceBelow>=tipRect.height+10||spaceBelow>=spaceAbove)?r.bottom+6:r.top-tipRect.height-6;
    let left=r.left+r.width/2-tipRect.width/2;
    left=Math.max(8,Math.min(left,window.innerWidth-tipRect.width-8));
    tip.style.top=top+'px';
    tip.style.left=left+'px';
  }
});
// ===== 進捗リセット・チュートリアル移行・起動シーケンス =====
function resetStoredProgress({resetIntro=false,showIntro=false,preserveRewards=false}={}){
  if(isMode('speed'))pauseSpeedRun();
  lap1ClearedStages=new Set();lap1ClearedExtraStages=new Set();lap1ClearedSatoriStages=new Set();
  lap2ClearedStages=new Set();lap2ClearedExtraStages=new Set();lap2ClearedSatoriStages=new Set();
  activeLap=1;secondLapUnlocked=false;
  clearedStages=lap1ClearedStages;clearedExtraStages=lap1ClearedExtraStages;clearedSatoriStages=lap1ClearedSatoriStages;
  fourthCheckUsage={};
  try{
    storage.remove(STORAGE_KEY_GROUPS.progression.cleared);
    storage.remove(STORAGE_KEY_GROUPS.progression.extraCleared);
    storage.remove(STORAGE_KEY_GROUPS.progression.satoriCleared);
    storage.remove(STORAGE_KEY_GROUPS.progression.currentStage);
    storage.remove(STORAGE_KEY_GROUPS.progression.activeSession);
    storage.remove(STORAGE_KEY_GROUPS.progression.secondLapActive);
    storage.remove(STORAGE_KEY_GROUPS.progression.secondLapUnlocked);
    storage.remove(STORAGE_KEY_GROUPS.progression.activeLap);
    for(const lap of [1,2])for(const part of ['primary','extra','satori'])storage.remove(STORAGE_KEY_GROUPS.progression.lapCleared(lap,part));
    storage.remove(STORAGE_KEY_GROUPS.rewards.awakenedGranted);
    if(!preserveRewards){
      // デバッグの完全リセットでは、ゲノム側で選んだ表示設定も初期化する。
      storage.remove('wakeSevenGenomeBoardSize');
      storage.remove('wakeSevenGenomeBoardLayout');
      storage.remove(STORAGE_KEY_GROUPS.settings.boardTheme);
      storage.remove(STORAGE_KEY_GROUPS.settings.boardLayout);
      storage.remove(STORAGE_KEY_GROUPS.settings.boardThemeChosen);
      storage.remove(STORAGE_KEY_GROUPS.settings.boardLayoutChosen);
      storage.remove(STORAGE_KEY_GROUPS.settings.darumaColor);
      storage.remove(STORAGE_KEY_GROUPS.settings.darumaColorChosen);
      storage.remove(STORAGE_KEY_GROUPS.rewards.masterGoldGranted);
      storage.remove(STORAGE_KEY_GROUPS.rewards.satoriDesignGranted);
      storage.remove(STORAGE_KEY_GROUPS.rewards.rainbowDarumaGranted);
      storage.remove(STORAGE_KEY_GROUPS.speed.unlocked);
      storage.remove(STORAGE_KEY_GROUPS.speed.trainingUnlocked);
      storage.remove(STORAGE_KEY_GROUPS.speed.intermediateUnlocked);
      storage.remove(STORAGE_KEY_GROUPS.speed.masteryUnlocked);
      storage.remove(STORAGE_KEY_GROUPS.speed.satoriUnlocked);
      storage.remove(STORAGE_KEY_GROUPS.speed.trainingTrialCleared);
      storage.remove(STORAGE_KEY_GROUPS.speed.intermediateTrialCleared);
      storage.remove(STORAGE_KEY_GROUPS.speed.masteryTrialCleared);
      storage.remove(STORAGE_KEY_GROUPS.rewards.threeDUnlocked);
      for(const variant of ['standard','training9','training18','mastery27','satori73']){
        clearSpeedSession(variant);
        storage.remove(speedBestStorageKey(variant));
        storage.remove(speedHistoryStorageKey(variant));
      }
      storage.remove(STORAGE_KEY_GROUPS.speed.activeVariant);
    }
    storage.remove(FOURTH_CHECKS_STORAGE_KEY);
    storage.remove(MESSAGE_REVIEW_STORAGE_KEY);
    storage.remove(MESSAGE_REVIEW_LAST_CLEAR_STORAGE_KEY);
    if(resetIntro){
      storage.remove(STORAGE_KEY_GROUPS.progression.introSeen);
      storage.remove(STORAGE_KEY_GROUPS.progression.tutorialComplete);
      resetTutorialCommand();
    }
  }catch(_){}
  // 盤面デザインや速解きの解放を残すリセットでも、卒業試験はコース進行
  // に属するため新しい周回では未合格に戻す。
  speedTrainingTrialCleared=false;
  speedIntermediateTrialCleared=false;
  speedMasteryTrialCleared=false;
  storage.remove(STORAGE_KEY_GROUPS.speed.trainingTrialCleared);
  storage.remove(STORAGE_KEY_GROUPS.speed.intermediateTrialCleared);
  storage.remove(STORAGE_KEY_GROUPS.speed.masteryTrialCleared);
  if(!preserveRewards){
    resetSettingsCommand();
    masterGoldGranted=false;
    satoriDesignGranted=false;
    rainbowDarumaGranted=false;
    speedModeUnlocked=false;
    speedTrainingUnlocked=false;
    speedIntermediateUnlocked=false;
    speedMasteryUnlocked=false;
    speedSatoriUnlocked=false;
    threeDUnlocked=false;
  }
  secondLapActive=false;
  awakenedGranted=false;
  setActiveMode('stage');speedSession=null;pauseSpeedClock();
  updateMasterTheme();
  GameNavigation.stage(0);
  if(showIntro)setUiEffectTimer('dialog-transition','deferred-intro',()=>{if(typeof canShowDeferredBootDialog==='function'&&canShowDeferredBootDialog())openIntroGuide();},80);
}
$('resetProgress').addEventListener('click',()=>{
  $('settingsDialog').hidden=true;
  const canKeepRewards=hasMasterReward();
  $('resetDialogText').textContent=tr(canKeepRewards?'resetConfirmKeepRewards':'resetConfirmEarly');
  $('resetDialogAll').hidden=!canKeepRewards;
  $('resetDialogConfirm').textContent=tr('resetProgress');
  $('resetDialogAll').textContent=tr('resetEverything');
  $('resetDialog').hidden=false;
  $('resetDialogClose').focus();
});
$('resetDialogClose').addEventListener('click',()=>{$('resetDialog').hidden=true;});
$('resetDialogConfirm').addEventListener('click',()=>{
  $('resetDialog').hidden=true;
  resetStoredProgress({resetIntro:true,showIntro:true,preserveRewards:true});
});
$('resetDialogAll').addEventListener('click',()=>{
  $('resetDialog').hidden=true;
  resetStoredProgress({resetIntro:true,showIntro:true});
});

// 公開ネイティブモジュールの構文境界。
export {};
