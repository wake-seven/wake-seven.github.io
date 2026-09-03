// 起動・復元・ページライフサイクル。画面イベントの定義とは分離する。
const canShowDeferredBootDialog=()=>[
  'introDialog','chainDialog','clearDialog','messageDialog','masterDialog',
  'speedPauseDialog','speedRestartDialog','rankDialog','tipGuideDialog',
  'guideHubDialog','twoMoveDialog','twoMoveDetailDialog','optimalFailDialog',
  'resetDialog','aboutDialog','settingsDialog','boardThemeDialog'
].every(id=>$(id)?.hidden!==false);
buildBoard();
updateMasterTheme();
restoreActiveSession();
let savedLanguage=UI_TEXT[gameState.settings.language]?gameState.settings.language:'ja';
applyLanguage(savedLanguage);
// 保存済みダイアログの復元は、進行UIの共通入口へ委譲する。
restoreProgressionDialog(storage.json(DIALOG_STATE_STORAGE_KEY,null));
// 初期HTMLの仮状態ではなく、保存状態を反映した最初の画面だけを公開する。
document.body.classList.remove('app-booting');
if(storage.get(STORAGE_KEY_GROUPS.progression.introSeen)!=='1')setUiEffectTimer('dialog-transition','boot-intro',()=>{if(canShowDeferredBootDialog())openIntroGuide();},350);
else if(storage.get(STORAGE_KEY_GROUPS.progression.tutorialComplete)!=='1'&&!isMode('tutorial'))setUiEffectTimer('dialog-transition','boot-tutorial',()=>{if(canShowDeferredBootDialog())startTutorial();},80);
window.addEventListener('pagehide',()=>{if(isMode('speed'))pauseSpeedClock();persistActiveSession();});
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden'){if(isMode('speed'))pauseSpeedClock();persistActiveSession();}
  else if(isMode('speed')&&!speedAwaitingStart()){
    if(isSolved()&&WakeSevenAppContext.state.session.read().speedSession){
      // 非表示の間にクリア演出や、その後の次の問題へ進む処理が止まってしまうことがある
      // (裏に回った端末がタイマーの発火を止める・遅らせる等)。
      // 復帰時にクリア済みの盤面が残っていたら、保留中のタイマーは捨てて即座に確定させる。
      clearUiEffectTimers('clear-transition');
      if(!clearShown)ProgressionEntryPoints.finishStage({mode:'speed'});else WakeSevenProgressionCommands.advanceSpeedRun();
    }
    // 非表示から戻った時はタイマーを黙って再開せず、一時停止ダイアログを出して本人の操作で再開させる。
    else if($('speedPauseDialog').hidden)openSpeedPauseDialog();
  }
});

if(document.documentElement.classList.contains('embed')&&window.parent!==window){
  const embedContentEnd=document.querySelector('.debug-tools');
  const reportEmbedHeight=()=>{
    requestAnimationFrame(()=>{
      const bodyStyle=getComputedStyle(document.body);
      const height=embedContentEnd.getBoundingClientRect().bottom+
        window.scrollY+parseFloat(bodyStyle.paddingBottom);
      window.parent.postMessage({
        type:'wake7:height',
        height:Math.ceil(height)
      },location.origin==='null'?'*':location.origin);
    });
  };
  window.reportWake7EmbedHeight=reportEmbedHeight;
  if(window.ResizeObserver){
    const embedResizeObserver=new ResizeObserver(reportEmbedHeight);
    embedResizeObserver.observe(document.body);
    embedResizeObserver.observe(embedContentEnd);
  }
  window.addEventListener('resize',reportEmbedHeight);
  window.addEventListener('load',reportEmbedHeight);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(reportEmbedHeight);
  reportEmbedHeight();
}
// 公開ネイティブモジュールの構文境界。
export {};
