// ダイアログとクイズが共有する表示文脈を、入口で固定する。
// 値の決定だけを担当し、状態やDOMは変更しない。
function createProgressionMessageContext(context={}){
  const source=context||{};
  const appState=typeof WakeSevenAppContext!=='undefined'?WakeSevenAppContext.snapshot():{};
  return Object.freeze({
    mode:source.mode??appState.mode??null,
    stageIndex:source.stageIndex??appState.stageIndex??null,
    section:source.section??null,
    lap:source.lap??appState.lap??null,
    clearType:source.clearType??null,
    dialogId:source.dialogId??null,
    quizId:source.quizId??null
  });
}

// 進行に関わるダイアログの唯一の要求入口。
// kind/context/sourceを固定し、既存の描画関数へ委譲する。
function requestProgressionDialog(kind,context={},source='unknown'){
  // 旧オブジェクト形式も内部呼び出しの移行期間だけ受け付ける。
  if(kind&&typeof kind==='object'){const request=kind;kind=request.kind;source=request.source||source;context=request.options||{};}
  const options={...(context||{}),source,...createProgressionMessageContext({...context,dialogId:context?.dialogId??kind})};
  const name=options.name||options.dialogName||kind;
  if(kind==='chain'||CHAIN_STEPS[name])return openChainedDialog(name);
  if(kind==='clear')return showClearDialog(options);
  if(kind==='message'||kind==='messages')return openMessageReview({resume:!!options.resume,returnTarget:options.returnTarget||null});
  if(kind==='master'||kind==='mastery')return showMasterDialog(options.kind||'primary');
  if(kind==='rank'||kind==='ranks')return openRankDialog(options.returnTarget||null);
  if(kind==='tipGuide')return openTipGuide();
  if(kind==='guideHub')return openGuideHub();
  if(kind==='twoMove')return openTwoMovePatterns();
  if(kind==='twoMoveDetail')return openTwoMoveDetail(options.state,options.index);
  if(kind==='twoMoveLesson')return openTwoMoveLessonDialog(!!options.retry);
  if(kind==='speedPause')return openSpeedPauseDialog();
  if(kind==='optimalFail')return renderOptimalFail();
  const dialog=$(kind);
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

// 進行クイズの公開入口も、進行ダイアログと同じ文脈で管理する。
let progressionQuizContext=null;
function showProgressionQuiz(context={}){
  const options={...(context||{}),...createProgressionMessageContext({...context,quizId:context?.quizId??context?.rootId??'boardQuiz'})};
  const rootId=options.rootId||'boardQuiz';progressionQuizContext={...options,rootId};
  // クリアダイアログ内のクイズは、クリア後フローの表示段階として記録する。
  // 通常の盤面クイズはプレイ中のUIなので、状態機械を変更しない。
  if(['clearQuiz','boardQuiz','messageQuiz','messageBoardQuiz'].includes(rootId)&&typeof markClearFlowContent==='function')markClearFlowContent('quiz');
  if(options.quiz!==undefined){renderQuizInto(options.ids||{root:rootId,options:rootId==='messageQuiz'?'messageQuizOptions':'quizOptions',note:rootId==='messageQuiz'?'messageQuizNote':'quizNote',title:rootId==='messageQuiz'?'messageQuizTitle':'quizTitle',question:rootId==='messageQuiz'?'messageQuizQuestion':'quizQuestion'},options.quiz);return true;}
  const entry=options.clearEntry??clearEntryForCurrent();if(rootId==='clearQuiz')renderClearQuizForEntry(entry);
  const config=options.boardQuizConfig??boardQuizConfigForCurrent?.();
  if(rootId==='boardQuiz'||rootId==='messageBoardQuiz')try{renderBoardQuiz(rootId,config,{requireAnswer:options.requireAnswer??rootId==='boardQuiz'});}catch(error){console.error('progression quiz render failed',error);resetBoardQuiz(rootId,{requireAnswer:options.requireAnswer??rootId==='boardQuiz'});}
  return !!(options.quiz!==undefined||config);
}
function resolveProgressionQuiz(answer){const value=answer&&typeof answer==='object'?answer:{};const rootId=value.rootId||progressionQuizContext?.rootId||'boardQuiz';const index=Number(value.index??answer);if(!Number.isInteger(index)||index<0)return false;const root=$(rootId);const button=root.querySelector('[data-board-answer="'+index+'"]')||root.querySelector('.quiz-option:nth-child('+(index+1)+')');if(!button||button.disabled)return false;button.click();return true;}
function closeProgressionQuiz(){const rootIds=new Set([progressionQuizContext?.rootId,'clearQuiz','boardQuiz','messageQuiz','messageBoardQuiz'].filter(Boolean));rootIds.forEach(rootId=>{const root=$(rootId);if(!root)return;root.hidden=true;root.classList.remove('quiz-success');if(rootId==='boardQuiz'||rootId==='messageBoardQuiz')resetBoardQuiz(rootId);});progressionQuizContext=null;}
