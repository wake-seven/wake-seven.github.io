// ===== 進行クイズの公開入口 =====
// クイズの描画・回答・終了を、クリアフローやメッセージUIから呼ぶための入口。
// 問題の解決やDOMの細部は既存のクイズUIへ委譲し、ここでは文脈だけを受け取る。
let progressionQuizContext=null;

function showProgressionQuiz(context={}){
  const options={...(context||{}),...createProgressionMessageContext({
    ...(context||{}),
    quizId:context?.quizId??context?.rootId??'boardQuiz'
  })};
  const rootId=options.rootId||'boardQuiz';
  progressionQuizContext={...options,rootId};
  if(options.quiz!==undefined){
    renderQuizInto(options.ids||{
      root:rootId,
      options:rootId==='messageQuiz'?'messageQuizOptions':'quizOptions',
      note:rootId==='messageQuiz'?'messageQuizNote':'quizNote',
      title:rootId==='messageQuiz'?'messageQuizTitle':'quizTitle',
      question:rootId==='messageQuiz'?'messageQuizQuestion':'quizQuestion'
    },options.quiz);
    return true;
  }
  const entry=options.clearEntry??clearEntryForCurrent();
  if(rootId==='clearQuiz')renderClearQuizForEntry(entry);
  const config=options.boardQuizConfig??boardQuizConfigForCurrent?.();
  if(rootId==='boardQuiz'||rootId==='messageBoardQuiz'){
    try{renderBoardQuiz(rootId,config,{requireAnswer:options.requireAnswer??rootId==='boardQuiz'});}
    catch(error){console.error('progression quiz render failed',error);resetBoardQuiz(rootId,{requireAnswer:options.requireAnswer??rootId==='boardQuiz'});}
  }
  return !!(options.quiz!==undefined||config);
}

// 回答処理は既存ボタンのイベントへ委譲する。answer は選択肢番号、または
// { index, rootId } 形式を受け取るため、通常クイズと盤面クイズを同じ入口で扱える。
function resolveProgressionQuiz(answer){
  const value=answer&&typeof answer==='object'?answer:{};
  const rootId=value.rootId||progressionQuizContext?.rootId||'boardQuiz';
  const index=Number(value.index??answer);
  if(!Number.isInteger(index)||index<0)return false;
  const root=$(rootId);
  const button=root.querySelector('[data-board-answer="'+index+'"]')||root.querySelector('.quiz-option:nth-child('+(index+1)+')');
  if(!button||button.disabled)return false;
  button.click();
  return true;
}

function closeProgressionQuiz(){
  const rootIds=new Set([progressionQuizContext?.rootId,'clearQuiz','boardQuiz','messageQuiz','messageBoardQuiz'].filter(Boolean));
  rootIds.forEach(rootId=>{
    const root=$(rootId);if(!root)return;
    root.hidden=true;
    root.classList.remove('quiz-success');
    if(rootId==='boardQuiz'||rootId==='messageBoardQuiz')resetBoardQuiz(rootId);
  });
  progressionQuizContext=null;
}
