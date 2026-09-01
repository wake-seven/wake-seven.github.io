// ===== クリア後の状態遷移 =====
// クリア演出の表示と、次の問題/コースへの遷移を進行UI本体から分離する。
function advanceAfterClear(){
  makerButtonBlockedUntil=performance.now()+600;
  clearTimeout(makerRevealTimer);
  makerRevealTimer=setTimeout(()=>{makerButtonBlockedUntil=0;renderStageNav();},600);
  if(isMode('free')) startFree();
  else if(isMode('custom')){setPosition(currentInitialState,currentInitialPar);renderStageNav();}
  else if(isMode('satori')){if(satoriIndex<SATORI_STAGES.length-1)loadSatoriStage(satoriIndex+1);else openSatoriPicker();}
  else if(isMode('mastery')){if(extraIndex===EXTRA_STAGES.length-1)restoreFreeSession();else loadExtraStage(extraIndex+1);}
  else if(stageIndex===ACADEMY_STAGE_COUNT-1&&academyCleared()) showMasterDialog('primary');
  else if(stageIndex===STAGES.length-1&&allPrimaryCleared()) showMasterDialog('intermediate');
  else if(stageIndex===STAGES.length-1) restoreFreeSession();
  else{const before=clearContentBefore(false,stageIndex+1);if(before?.dialog){openChainedDialog(before.dialog);return;}loadStage(stageIndex+1);}
}
let returnToClearCard=false,twoMovePatternsReturnTarget=null,twoMoveDetailReturnTarget=null,guideHubReturn=false;
function returnToClearDialog(){
  returnToClearCard=false;$('clearDialogMessage').textContent=clearDialogHeading();renderClearStageContext();renderClearTip();renderClearQuiz();
  $('clearNext').disabled=false;renderBoardQuiz('boardQuiz',boardQuizConfigForCurrent(),{requireAnswer:true});$('clearNext').hidden=false;$('clearDialog').hidden=false;$('clearTipLink').focus();
}

// Keep this extracted fragment explicit in the source audit while it remains
// concatenated into the single published native-module script.
export {};
