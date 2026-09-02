// ===== クリア後の状態遷移 =====
// クリア演出の表示と、次の問題/コースへの遷移を進行UI本体から分離する。
// clearShown は保存・進行用の状態なので、表示予約の重複防止には使わない。
// 演出とタイマーの段階を名前で持ち、同じクリアに対する再描画が
// 「演出を再生し直す」「ダイアログを前倒しする」ことを防ぐ。
const CLEAR_FLOW_PHASE=Object.freeze({idle:'idle',celebrating:'celebrating',dialogPending:'dialog-pending',dialog:'dialog'});
let clearFlowPhase=CLEAR_FLOW_PHASE.idle;
// クリア時の揺れと円の拡大を担当する。盤面入力や進行状態は変更しない。
function playWakeCelebrationEffect(targetSvg,tilesArr){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  tilesArr.forEach((el,i)=>{
    const base=el.style.transform;
    el.animate([{transform:base},{transform:base+' scale(1.13,.78) skewX(-7deg)',offset:.2},{transform:base+' scale(.86,1.18) skewX(6deg)',offset:.42},{transform:base+' scale(1.08,.91) skewX(-3deg)',offset:.64},{transform:base}],{duration:820,delay:i*65,easing:'cubic-bezier(.2,.8,.25,1)'});
  });
  const NS_='http://www.w3.org/2000/svg',burst=document.createElementNS(NS_,'g');
  burst.setAttribute('class','clear-burst');burst.setAttribute('pointer-events','none');
  const addBurstRing=(radius,stroke,width,opacity)=>{const ring=document.createElementNS(NS_,'circle');ring.setAttribute('cx',CELL[3].x);ring.setAttribute('cy',CELL[3].y);ring.setAttribute('r',radius);ring.setAttribute('fill','none');ring.setAttribute('stroke',stroke);ring.setAttribute('stroke-width',width);if(opacity)ring.setAttribute('opacity',opacity);burst.appendChild(ring);};
  addBurstRing(47,'#C9A54E',4);addBurstRing(58,'#F3E8D5',1.5,'.7');
  burst.style.transformOrigin=CELL[3].x+'px '+CELL[3].y+'px';burst.style.transformBox='view-box';targetSvg.appendChild(burst);
  const a=burst.animate([{transform:'scale(.55)',opacity:0},{transform:'scale(.8)',opacity:1,offset:.2},{transform:'scale(2.45)',opacity:0}],{duration:820,easing:'cubic-bezier(.15,.7,.2,1)'});a.onfinish=a.oncancel=()=>burst.remove();
}
// クリア演出を開始し、ダイアログ表示まで待つ時間を返す。
function celebrateClear(){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(svg.classList.contains('celebrating'))return reduced?0:820;
  svg.classList.add('celebrating');playClearSound(clearSoundKind());if(reduced)return 0;playWakeCelebrationEffect(svg,tileEls);return 820;
}
// クリア処理の開始入口。演出とダイアログ表示を一度だけ予約する。
function startClearFlow(){
  const clearCycle=beginClearFlow();if(!clearCycle)return;
  const delay=celebrateClear();
  scheduleClearFlowDialog(()=>{if(!clearShown||!isSolved()){resetClearFlow();return;}finishClearFlow();},delay,clearCycle);
}
// クリア周期を識別する世代番号。表示予約がキャンセルされても、古い
// 完了処理が後から実行された場合に現在の盤面へ作用しないようにする。
let clearFlowCycle=1;
function resetClearFlow(){
  clearFlowCycle++;
  clearFlowPhase=CLEAR_FLOW_PHASE.idle;
  clearUiEffectTimers('clear-transition');
}
function beginClearFlow(){
  if(clearFlowPhase!==CLEAR_FLOW_PHASE.idle)return false;
  clearFlowPhase=CLEAR_FLOW_PHASE.celebrating;
  return clearFlowCycle;
}
function scheduleClearFlowDialog(callback,delay,cycle=clearFlowCycle){
  if(clearFlowPhase!==CLEAR_FLOW_PHASE.celebrating)return false;
  clearFlowPhase=CLEAR_FLOW_PHASE.dialogPending;
  setUiEffectTimer('clear-transition','show-dialog',()=>{
    if(cycle!==clearFlowCycle||clearFlowPhase!==CLEAR_FLOW_PHASE.dialogPending)return;
    callback();
  },delay);
  return true;
}
function finishClearFlowDialog(){clearFlowPhase=CLEAR_FLOW_PHASE.dialog;}
// クリア演出完了後の表示入口。予約済みの周期だけを完了させる。
function finishClearFlow(){
  if(clearFlowPhase!==CLEAR_FLOW_PHASE.dialogPending)return false;
  finishClearFlowDialog();
  showClearDialog();
  requestAnimationFrame(()=>{
    if(clearShown&&isSolved()&&!hasCompetingDialogForClear())$('clearDialog').hidden=false;
  });
  return true;
}
// クリア後の次の進行先を決める入口。表示処理は各画面へ委譲する。
function advanceAfterClear(){
  makerButtonBlockedUntil=performance.now()+600;
  clearUiEffectTimers('maker-reveal');
  setUiEffectTimer('maker-reveal','unlock',()=>{makerButtonBlockedUntil=0;renderStageNav();},600);
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
  $('clearNext').disabled=false;
  try{renderBoardQuiz('boardQuiz',boardQuizConfigForCurrent(),{requireAnswer:true});}
  catch(error){console.error('clear board quiz render failed',error);$('boardQuiz').hidden=true;}
  $('clearNext').hidden=false;$('clearDialog').hidden=false;$('clearTipLink').focus();
}

// この抽出断片は、公開ネイティブモジュールスクリプトへ連結される間もソース監査で明示的に扱う。
export {};
