// ダイアログとクイズが共有する表示文脈を、入口で固定する。
// 値の決定だけを担当し、状態やDOMは変更しない。
function createProgressionMessageContext(context={}){
  const source=context||{};
  return Object.freeze({
    mode:source.mode??(typeof activeMode==='undefined'?null:activeMode),
    stageIndex:source.stageIndex??(typeof stageIndex==='undefined'?null:stageIndex),
    section:source.section??null,
    lap:source.lap??(typeof activeLap==='undefined'?null:activeLap),
    clearType:source.clearType??null,
    dialogId:source.dialogId??null,
    quizId:source.quizId??null
  });
}

// 進行に関わるダイアログの共通入口。
// 実際の表示内容は既存の各UI実装へ委譲し、呼び出し側が個別関数を
// 覚えなくて済むようにする。ダイアログの状態形式は runtime 側と共有する。
function openProgressionDialog(id,context={}){
  const messageContext=createProgressionMessageContext({...context,dialogId:context.dialogId??id});
  const options={...context,...messageContext};
  const name=options.name||options.dialogName||id;
  if(id==='chain'||CHAIN_STEPS[name])return openChainedDialog(name);
  if(id==='clear')return showClearDialog(messageContext);
  if(id==='message')return openMessageReview({resume:!!options.resume,returnTarget:options.returnTarget||null});
  if(id==='master')return showMasterDialog(options.kind||'primary');
  if(id==='rank')return openRankDialog(options.returnTarget||null);
  if(id==='tipGuide')return openTipGuide();
  if(id==='guideHub')return openGuideHub();
  if(id==='twoMove')return openTwoMovePatterns();
  if(id==='twoMoveDetail')return openTwoMoveDetail(options.state,options.index);
  if(id==='twoMoveLesson')return openTwoMoveLessonDialog(!!options.retry);
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

// 進行クイズの公開入口も、進行ダイアログと同じ文脈で管理する。
let progressionQuizContext=null;
function showProgressionQuiz(context={}){
  const options={...(context||{}),...createProgressionMessageContext({...context,quizId:context?.quizId??context?.rootId??'boardQuiz'})};
  const rootId=options.rootId||'boardQuiz';progressionQuizContext={...options,rootId};
  if(options.quiz!==undefined){renderQuizInto(options.ids||{root:rootId,options:rootId==='messageQuiz'?'messageQuizOptions':'quizOptions',note:rootId==='messageQuiz'?'messageQuizNote':'quizNote',title:rootId==='messageQuiz'?'messageQuizTitle':'quizTitle',question:rootId==='messageQuiz'?'messageQuizQuestion':'quizQuestion'},options.quiz);return true;}
  const entry=options.clearEntry??clearEntryForCurrent();if(rootId==='clearQuiz')renderClearQuizForEntry(entry);
  const config=options.boardQuizConfig??boardQuizConfigForCurrent?.();
  if(rootId==='boardQuiz'||rootId==='messageBoardQuiz')try{renderBoardQuiz(rootId,config,{requireAnswer:options.requireAnswer??rootId==='boardQuiz'});}catch(error){console.error('progression quiz render failed',error);resetBoardQuiz(rootId,{requireAnswer:options.requireAnswer??rootId==='boardQuiz'});}
  return !!(options.quiz!==undefined||config);
}
function resolveProgressionQuiz(answer){const value=answer&&typeof answer==='object'?answer:{};const rootId=value.rootId||progressionQuizContext?.rootId||'boardQuiz';const index=Number(value.index??answer);if(!Number.isInteger(index)||index<0)return false;const root=$(rootId);const button=root.querySelector('[data-board-answer="'+index+'"]')||root.querySelector('.quiz-option:nth-child('+(index+1)+')');if(!button||button.disabled)return false;button.click();return true;}
function closeProgressionQuiz(){const rootIds=new Set([progressionQuizContext?.rootId,'clearQuiz','boardQuiz','messageQuiz','messageBoardQuiz'].filter(Boolean));rootIds.forEach(rootId=>{const root=$(rootId);if(!root)return;root.hidden=true;root.classList.remove('quiz-success');if(rootId==='boardQuiz'||rootId==='messageBoardQuiz')resetBoardQuiz(rootId);});progressionQuizContext=null;}
