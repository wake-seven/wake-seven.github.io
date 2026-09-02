// 進行に関わるダイアログの共通入口。
// 実際の表示内容は既存の各UI実装へ委譲し、呼び出し側が個別関数を
// 覚えなくて済むようにする。ダイアログの状態形式は runtime 側と共有する。
function openProgressionDialog(id,context={}){
  const name=context.name||context.dialogName||id;
  if(id==='chain'||CHAIN_STEPS[name])return openChainedDialog(name);
  if(id==='clear')return showClearDialog();
  if(id==='message')return openMessageReview({resume:!!context.resume,returnTarget:context.returnTarget||null});
  if(id==='master')return showMasterDialog(context.kind||'primary');
  if(id==='rank')return openRankDialog(context.returnTarget||null);
  if(id==='tipGuide')return openTipGuide();
  if(id==='guideHub')return openGuideHub();
  if(id==='twoMove')return openTwoMovePatterns();
  if(id==='twoMoveDetail')return openTwoMoveDetail(context.state,context.index);
  if(id==='twoMoveLesson')return openTwoMoveLessonDialog(!!context.retry);
  if(id==='speedPause')return openSpeedPauseDialog();
  if(id==='optimalFail')return renderOptimalFail();
  const dialog=$(id);
  if(dialog){dialog.hidden=false;return true;}
  return false;
}

// 進行中のダイアログと、その付随する案内演出をまとめて閉じる。
function closeProgressionDialog(){
  if(typeof hideGameDialogs==='function'){hideGameDialogs();return true;}
  return false;
}

// 保存済みのダイアログ状態を既存の復元処理へ渡す共通入口。
function restoreProgressionDialog(state){
  if(typeof restoreDialogState!=='function')return false;
  return !!restoreDialogState(state);
}
