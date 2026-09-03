// 進行画面のHUDとステージナビを描画する。状態遷移は行わず、表示更新だけを担当する。
function createProgressionViewContext({
  mode,
  lap,
  stage,
  extra,
  satori,
  editing,
  tutorial,
  assisted,
  speedRemaining,
  speedIndex=0,
  speedTotal=0
}={}){
  return Object.freeze({
    mode,
    activeLap:lap,
    stageIndex:stage,
    extraIndex:extra,
    satoriIndex:satori,
    editingBoard:editing===true,
    tutorialMode:tutorial===true,
    assistedLearning:assisted===true,
    speedShowsRemaining:speedRemaining===true,
    speedIndex,
    speedTotal,
    satoriTotal:SATORI_STAGES.length,
    masteryTotal:EXTRA_STAGES.length,
    academyCount:ACADEMY_STAGE_COUNT,
    trainingCount:TRAINING_STAGE_COUNT
  });
}
function renderStageNav(){
  const appState=WakeSevenAppContext.snapshot();
  const navigation=WakeSevenAppContext.state.navigation.read();
  const session=WakeSevenAppContext.state.session.read().speedSession;
  const {currentLang:language}=WakeSevenAppContext.state.settings.read();
  const viewContext=createProgressionViewContext({
    mode:appState.mode,
    lap:appState.lap,
    stage:appState.stageIndex,
    extra:appState.masteryIndex,
    satori:appState.satoriIndex,
    editing:editingBoard,
    tutorial:isMode('tutorial'),
    assisted:isAssistedLearningStage(),
    speedRemaining:speedShowsRemaining(),
    speedIndex:session?.index??0,
    speedTotal:session?.total||activeSpeedDefinition().total
  });
  const navModel=createStageNavDisplayModel(viewContext);
  const tutorialMode=navModel.tutorialMode;
  const assistedLearning=navModel.assistedLearning;
  // 入門・基本は、盤面を読むことだけに集中する補助輪付き区間。
  // 「やり直す／1手戻す／次の1手を見る」と現在手数は表示しない。
  const hideLearningControls=assistedLearning;
  document.body.classList.toggle('tutorial-mode',tutorialMode);
  document.body.classList.toggle('academy-metric-mode',assistedLearning);
  $('tutorialReset').hidden=!tutorialMode;
  $('tutorialDebugSkip').hidden=!tutorialMode||!DEBUG_MODE;
  if(tutorialMode){
    closeAppMenu();
    $('languageMenu').classList.remove('show');
    $('languageToggle').setAttribute('aria-expanded','false');
    $('stageAccent').hidden=true;
    $('playbar').hidden=true;
    $('boardGuidance').hidden=true;
    $('speedStartOverlay').hidden=true;
    $('debugTools').hidden=true;
    return;
  }
  // 以降は独立した関心事ごとに名前付き関数へ切り出す(実行順序・中身は無変更)。
  function renderStageNavControls(){
    $('speedClockInline').hidden=true;
    // 進行ゲージの代わりのアクセント線は、全モード共通で表示する。
    $('stageAccent').hidden=false;
    const modeRow=document.querySelector('.mode-row');
    document.querySelector('.status-metric.moves').hidden=assistedLearning;
    document.querySelector('.status-separator').hidden=assistedLearning;
    modeRow.classList.toggle('satori-mode',isMode('satori'));
    modeRow.classList.toggle('application-mode',isApplicationTargetStage());
    modeRow.classList.toggle('speed-mode',isMode('speed'));
    modeRow.classList.toggle('speed-training',speedShowsRemaining());
    modeRow.classList.toggle('speed-with-remaining',speedShowsRemaining());
    $('stagePickerTrigger').classList.toggle('master-stage',isMode('mastery')||isMode('satori'));
    $('stageSubtitle').hidden=true;
    $('stageCount').hidden=true;
    $('stagePickerTrigger').disabled=false;
    $('stagePickerTrigger').classList.toggle('second-lap-stage',navigation.lap===2&&isCampaignMode());
    $('lapBadge').hidden=navigation.lap!==2||!isCampaignMode();
    $('lapBadge').textContent=secondLapMark();
    $('shuffle').hidden=true;
    $('undo').hidden=hideLearningControls||editingBoard||isMode('satori')||(isMode('speed')&&!speedAllowsUndo());
    $('undo').disabled=hideLearningControls||editingBoard||isMode('satori')||(isMode('speed')&&!speedAllowsUndo())||isFinalMasterPuzzle();
    $('hint').hidden=hideLearningControls||editingBoard||isMode('satori')||isMode('speed');
    if(isFourthVolume()){
      $('hint').textContent=tr('remainingCheck',{n:fourthChecksLeft()});
      $('hint').disabled=fourthChecksLeft()<=0||fourthDistanceRevealed;
    }else{
      $('hint').textContent=tr('hint');
      $('hint').disabled=masterHintsDisabled();
    }
    $('debugTools').hidden=!DEBUG_MODE;
    for(const id of ['debugReset','debugClear','debugSpeedJumpFinish','debugAlmost','debugMore','debugFar','debugSkipTutorial','debugIntro2','debugBasic11','debugAcademy20','debugSpeedTraining8','debugTrainingUpper','debugTrainingMiddle','debugTrainingLower','debugSpeedIntermediate17','debugExtra14','debugExtra29','debugExtra44','debugSpeedMastery26','debugSatori72','debugSecondIntro2','debugSecondBasic11','debugSecondAcademy20','debugSecondTrainingUpper','debugSecondTrainingMiddle','debugSecondTrainingLower','debugSecondExtra14','debugSecondExtra29','debugSecondExtra44','debugSecondSatori72'])$(id).hidden=!DEBUG_MODE;
    const pauseButton=$('speedPause'),pauseInline=$('speedPauseInline'),playActions=document.querySelector('.play-actions');
    const awaitingSpeedStart=isMode('speed')&&speedAwaitingStart();
    if(isMode('speed')&&!speedShowsRemaining())pauseInline.appendChild(pauseButton);
    else playActions.appendChild(pauseButton);
    $('reset').textContent=editingBoard?tr('resetAll'):speedShowsRemaining()?tr('reset'):isMode('speed')?tr('speedPuzzleRestart'):tr('reset');
    $('reset').hidden=hideLearningControls||isMode('satori')||(isMode('speed')&&!speedShowsRemaining());
    $('speedPause').hidden=!isMode('speed');
    $('speedStartOverlay').hidden=!awaitingSpeedStart;
    $('playbar').hidden=hideLearningControls||(awaitingSpeedStart&&!speedShowsRemaining());
    const hideBoardViewControls=assistedLearning||isMode('speed')||(isMode('stage')&&navigation.stageIndex>=TRAINING_STAGE_START&&navigation.stageIndex<TRAINING_STAGE_START+TRAINING_UPPER_COUNT);
    for(const id of ['rotateBoardBack','rotateBoard','mirrorBoard','flipBoardVertical'])$(id).hidden=hideBoardViewControls;
    $('twoMoveLessonOpen').hidden=!((isMode('stage')&&navigation.stageIndex>=TRAINING_STAGE_START&&navigation.stageIndex<TRAINING_STAGE_START+TRAINING_UPPER_COUNT)||isTwoMoveLessonSpeedStage());
    $('twoMoveLessonOpen').textContent=tr('twoMoveLessonOpen');
  }
  function renderStageNavModeButtons(){
    const inSideMode=isSideCourseMode();
    $('stageKind').hidden=false;
    $('stageNav').classList.toggle('side-mode-nav',inSideMode);
    $('prevStage').textContent=inSideMode?tr('stageModeReturn'):tr('prev');
    $('prevStage').setAttribute('aria-label',inSideMode?tr('stageModeReturn'):tr('prev'));
    $('prevStage').disabled=isMode('speed')||(!inSideMode&&(!isMode('mastery')&&!isMode('satori')&&navigation.stageIndex===0&&navigation.lap===1));
    const customPlaying=isMode('custom')&&!editingBoard;
    const nextLabel=customPlaying?tr('boardMaker'):isMode('free')?tr('shuffle'):tr('next');
    $('nextStage').textContent=nextLabel;
    $('nextStage').setAttribute('aria-label',nextLabel);
    $('nextStage').hidden=isMode('speed')||(isMode('custom')&&!customPlaying);
    $('nextStage').disabled=customPlaying?false:isMode('custom')?true:isMode('free')?false:isMode('mastery')
      ?(navigation.masteryIndex===EXTRA_STAGES.length-1?!canEnterSatori():!clearedExtraStages.has(navigation.masteryIndex))
      :(navigation.stageIndex===STAGES.length-1?!allPrimaryCleared():!clearedStages.has(navigation.stageIndex));
    $('stageMode').classList.toggle('on',isCampaignMode());
    $('freeMode').classList.toggle('on',isMode('free'));
    $('menuSpeed').classList.toggle('on',isMode('speed'));
    $('stageMode').setAttribute('aria-pressed',String(isCampaignMode()));
    $('freeMode').setAttribute('aria-pressed',String(isMode('free')));
    $('stageModeReturn').hidden=true;
    $('menuRankList').hidden=highestRankIndex()<0;
    $('menuAllPatterns').hidden=!featureUnlocked('genome');
    $('menuBoardTheme').hidden=!featureUnlocked('boardTheme');
    $('menuSatori').hidden=true;
    $('menuSpeed').hidden=!DEBUG_MODE&&!featureUnlocked('speedRun');
    $('menuOpen3D').hidden=!featureUnlocked('threeD');
    $('customMode').textContent=tr('makeBoard');
    $('customMode').classList.remove('ready');
    $('customMode').hidden=false;
    $('customMode').disabled=false;
    $('playCustomBoard').hidden=!editingBoard;
    if(editingBoard){
      const d=makerDistance();
      $('playCustomBoard').disabled=d===255||d===0;
    }
  }
  function renderStageNavStageText(){
    const showRemainingModel=value=>{const model=createRemainingMovesDisplayModel({value});showRemaining(model.value,model.hidden);};
    if(isMode('speed')){
      setText('stageKind',speedVariantCopy(speedVariant).label);
      $('stageNumber').textContent=(speedSession.index+1)+' / '+(speedSession.total||activeSpeedDefinition().total);
      const showsRemaining=speedShowsRemaining();
      $('shortestLabel').textContent=showsRemaining?tr('shortestDisplay'):'';
      $('moveUnit').textContent=showsRemaining?tr('moveUnit'):'';
      $('academyClearSuffix').textContent=showsRemaining?tr('academyClearSuffix'):'';
      $('speedClockInline').hidden=false;
      setText('speedClockLabel','');
      renderMovesMetric(moves,isTwoMoveLessonSpeedStage());
      if(showsRemaining)showRemainingModel(remainingForDisplay(SOLVER.dist[enc(ori)]));
      renderSpeedClock();
    }else if(isMode('free')){
      setText('stageKind',tr('freeKind'));
      $('stageNumber').textContent=tr('freePlay');
      showRemainingModel(remainingForDisplay(SOLVER.dist[enc(ori)]));
    }else if(isMode('custom')){
      setText('stageKind','CUSTOM');
      $('stageNumber').textContent=tr('makeBoard');
      const d=SOLVER.dist[enc(ori)];
      if(editingBoard)$('stagePar').textContent=d===255?'—':d;
      else showRemainingModel(d);
    }else if(isMode('satori')){
      setText('stageKind',tr('satori'));
      $('stageNumber').textContent=(navigation.satoriIndex+1)+' / '+SATORI_STAGES.length;
      showRemainingModel('?');
    }else if(isMode('mastery')){
      const volume=Math.floor(navigation.masteryIndex/MASTER_VOLUME_SIZE)+1;
      setText('stageKind',language==='ja'?'名人への道・'+volumeLabel(volume):tr('allPatternsKind')+' '+volumeLabel(volume));
      $('stageNumber').textContent=masterSubtitle(volume);
      $('stageCount').textContent=(navigation.masteryIndex%MASTER_VOLUME_SIZE+1)+' / '+MASTER_VOLUME_SIZE;
      $('stageCount').hidden=false;
      $('stageSubtitle').hidden=true;
      showRemainingModel(remainingForDisplay(SOLVER.dist[enc(ori)]));
    }else{
      const {section,position}=primarySectionPosition(navigation.stageIndex);
      const isAcademySection=['intro','basic','application','development'].includes(section.id);
      if(isAcademySection){
        setText('stageKind',tr('academyPickerRound'));
        $('stageNumber').textContent=tr(section.labelKey)+tr('academyClassSuffix');
        $('stageCount').textContent=position+' / '+section.total;
        $('stageCount').hidden=false;
        $('stageSubtitle').hidden=true;
      }else{
        setText('stageKind',tr(section.labelKey));
        $('stageNumber').textContent=position+' / '+section.total;
      }
      showRemainingModel(remainingForDisplay(SOLVER.dist[enc(ori)]));
    }
  }
  function renderStageNavPrevNext(){
    const customPlaying=isMode('custom')&&!editingBoard;
    const speed=isMode('speed'),satori=isMode('satori');
    const nextDisabled=satori
      ?(navigation.satoriIndex===SATORI_STAGES.length-1?!(navigation.lap===1&&secondLapUnlocked):!clearedSatoriStages.has(navigation.satoriIndex))
      :speed?true:undefined;
    renderStageNavPager({
      nextHidden:!speed&&!satori&&isMode('custom')&&!customPlaying,
      prevDisabled:speed||satori?(!satori||false):undefined,
      nextDisabled,
      highlightNext:nextStageAttention&&isCampaignMode()&&!$('nextStage').hidden&&!$('nextStage').disabled
    });
  }
  function renderStageNavGuidance(){
    renderMainBoardGuidance();
    if(assistedLearning)$('boardGuidance').hidden=true;
  }
  renderStageNavControls();
  renderStageNavModeButtons();
  renderStageNavStageText();
  renderStageNavAccent(viewContext);
  renderStageNavPrevNext();
  renderStageNavGuidance();
}
