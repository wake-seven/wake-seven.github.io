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
  scheduleClearFlowDialog(()=>{if(!WakeSevenAppContext.isClearShown()||!isSolved()){resetClearFlow();return;}finishClearFlow();},delay,clearCycle);
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

// クリア後の画面が参照する進行状態を、ひとつの読み取り専用文脈に固定する。
// 各表示処理が activeMode や stageIndex を個別に読み直すと、ダイアログを
// 閉じる副作用や連続表示の切り替えで判定がずれるため、同じクリア周期の
// ルート判定と表示判定にはこの入口を使う。
function createClearTransitionContext(nextStageIndex=stageIndex){
  const appState=WakeSevenAppContext.snapshot();
  const {mode,lap,masteryIndex}=appState;
  const currentLapPrimaryCleared=lap===2?lap2ClearedStages:lap1ClearedStages;
  return Object.freeze({
    mode,stageIndex,extraIndex:masteryIndex,satoriIndex,activeLap:lap,
    nextStageIndex,
    solved:isSolved(),clearShown:appState.clearShown,
    academyIsCleared:academyCleared(),
    allPrimaryIsCleared:allPrimaryCleared(),
    currentLapPrimaryComplete:STAGES.every((_,i)=>currentLapPrimaryCleared.has(i)),
    hasBeforeDialog:Boolean(clearContentBefore(false,nextStageIndex)?.dialog),
    masteryClearContext:mode==='mastery'||returnStageContext?.extra===true,
    returnStageContext
  });
}
// クリア演出完了後の表示入口。予約済みの周期だけを完了させる。
function finishClearFlow(){
  if(clearFlowPhase!==CLEAR_FLOW_PHASE.dialogPending)return false;
  finishClearFlowDialog();
  openProgressionDialog('clear');
  requestAnimationFrame(()=>{
    if(WakeSevenAppContext.isClearShown()&&isSolved()&&!hasCompetingDialogForClear())$('clearDialog').hidden=false;
  });
  return true;
}
// クリア後の次の進行先を副作用なしで決める。
// 判定と実行を分けておくことで、進行先の調査・契約テストがしやすくなる。
function resolveAfterClearRoute(context){
  const {mode,stageIndex,extraIndex,satoriIndex,academyIsCleared,allPrimaryIsCleared,hasBeforeDialog}=context;
  if(mode==='free')return {kind:'free'};
  if(mode==='custom')return {kind:'custom'};
  if(mode==='satori')return satoriIndex<SATORI_STAGES.length-1
    ? {kind:'satori-stage',index:satoriIndex+1}
    : {kind:'satori-picker'};
  if(mode==='mastery')return extraIndex===EXTRA_STAGES.length-1
    ? {kind:'restore-free'}
    : {kind:'mastery-stage',index:extraIndex+1};
  if(stageIndex===ACADEMY_STAGE_COUNT-1&&academyIsCleared)return {kind:'master-dialog',section:'primary'};
  if(stageIndex===STAGES.length-1&&allPrimaryIsCleared)return {kind:'master-dialog',section:'intermediate'};
  if(stageIndex===STAGES.length-1)return {kind:'restore-free'};
  if(hasBeforeDialog)return {kind:'before-dialog'};
  return {kind:'stage',index:stageIndex+1};
}

// クリア後の次の進行先を実行する入口。判定は resolveAfterClearRoute に委譲する。
function advanceAfterClear(){
  // 遷移判定に必要な状態を先に確定する。ダイアログを閉じる処理が
  // クイズや連鎖の後始末を行っても、次の進行先が変わらないようにする。
  makerButtonBlockedUntil=performance.now()+600;
  clearUiEffectTimers('maker-reveal');
  setUiEffectTimer('maker-reveal','unlock',()=>{makerButtonBlockedUntil=0;renderStageNav();},600);
  const context=createClearTransitionContext(stageIndex+1);
  const nextStageIndex=context.nextStageIndex;
  const route=resolveAfterClearRoute(context);
  // 現在のダイアログだけを閉じてから、確定済みの遷移先を開く。
  // ボタン側では閉じる処理を行わず、クリア後遷移をこの入口に一本化する。
  hideGameDialogs();
  if(route.kind==='free')return startFree();
  if(route.kind==='custom'){setPosition(currentInitialState,currentInitialPar);return renderStageNav();}
  if(route.kind==='satori-stage')return loadSatoriStage(route.index);
  if(route.kind==='satori-picker')return openSatoriPicker();
  if(route.kind==='mastery-stage')return loadExtraStage(route.index);
  if(route.kind==='master-dialog')return showMasterDialog(route.section);
  if(route.kind==='restore-free')return restoreFreeSession();
  if(route.kind==='before-dialog')return openProgressionDialog('chain',{name:clearContentBefore(false,nextStageIndex).dialog});
  return loadStage(route.index);
}
let returnToClearCard=false,twoMovePatternsReturnTarget=null,twoMoveDetailReturnTarget=null,guideHubReturn=false;
function returnToClearDialog(){
  returnToClearCard=false;$('clearDialogMessage').textContent=clearDialogHeading();renderClearStageContext();renderClearTip();showProgressionQuiz({rootId:'clearQuiz',clearEntry:clearEntryForCurrent()});
  $('clearNext').disabled=false;
  showProgressionQuiz({rootId:'boardQuiz',boardQuizConfig:boardQuizConfigForCurrent(),requireAnswer:true});
  $('clearNext').hidden=false;$('clearDialog').hidden=false;$('clearTipLink').focus();
}

// この抽出断片は、公開ネイティブモジュールスクリプトへ連結される間もソース監査で明示的に扱う。
export {};
