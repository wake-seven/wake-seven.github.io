// ===== 共通クイズUI =====
function shuffledIndices(length){const order=Array.from({length},(_,index)=>index);for(let index=order.length-1;index>0;index--){const swap=Math.floor(Math.random()*(index+1));[order[index],order[swap]]=[order[swap],order[index]];}return order;}
function quizPresentation(quiz){const order=shuffledIndices(quiz.a.length);return {answers:order.map(index=>quiz.a[index]),correct:order.indexOf(quiz.correct)};}
function celebrateQuiz(root){root.classList.remove('quiz-success');void root.offsetWidth;root.classList.add('quiz-success');playTone(784,.09,.024);playTone(1047,.13,.026,.07);haptic([10,32,16]);}
function renderQuizInto(ids,quiz){
  const root=$(ids.root),options=$(ids.options),note=$(ids.note),wasHidden=root.hidden;
  const quizKey=JSON.stringify([quiz.q,quiz.a]);
  // 再描画（リサイズ・言語反映・状態更新など）では同じ問題を再シャッフルしない。
  // 毎回順番を作り直すと、表示中の4択が別順へ入れ替わって見えるため。
  if(root.dataset.quizKey===quizKey&&options.childElementCount===quiz.a.length){
    root.hidden=wasHidden;
    return;
  }
  root.dataset.quizKey=quizKey;
  // 選択肢を差し替える間は一時的に隠す。表示中の古い4択が一瞬見えてから
  // 新しいシャッフル順へ入れ替わる、というちらつきを防ぐ。
  root.hidden=true;
  root.classList.remove('quiz-success');
  const {answers,correct}=quizPresentation(quiz);
  $(ids.title).textContent=tr('quizTitle');$(ids.question).textContent=quiz.q;note.textContent='';
  const fragment=document.createDocumentFragment();
  answers.forEach((answer,index)=>{
    const button=document.createElement('button');
    button.className='quiz-option';button.type='button';button.textContent=answer;
    button.addEventListener('click',()=>{[...options.children].forEach(item=>item.disabled=true);options.children[correct].classList.add('correct');if(index===correct){note.textContent=tr('quizCorrect')+'　'+quiz.note;celebrateQuiz(root);}else{button.classList.add('wrong');note.textContent=tr('quizWrong')+'　'+quiz.note;}});
    fragment.appendChild(button);
  });
  // 4択を1件ずつ表示領域へ追加せず、完成した順番を一度に差し替える。
  options.replaceChildren(fragment);
  root.hidden=wasHidden;
}
function boardQuizPatternState(position){return TWO_MOVE_STAGES[TWO_MOVE_PATTERN_ORDER[position-1]].state;}
function boardQuizMatchingStates(state,match,limit=Infinity,accept=()=>true){const target=dec(state),candidates=[];for(let next=0;next<NS;next++){const distance=SOLVER.dist[next];if(distance===255||!match(distance))continue;const board=dec(next);if(board.some((value,index)=>(value===0)!==(target[index]===0))||!accept(board))continue;let changes=0;board.forEach((value,index)=>{if(value!==0&&value!==target[index])changes++;});candidates.push({state:next,distance,changes});}candidates.sort((a,b)=>a.distance-b.distance||a.changes-b.changes||a.state-b.state);return candidates.slice(0,limit).map(candidate=>candidate.state);}
function boardQuizSameShapeState(state,shapeState){const shape=dec(shapeState);for(const symmetry of SYMMETRIES){const transformed=transformStateBySymmetry(state,symmetry),board=dec(transformed);if(board.every((value,index)=>(value===0)===(shape[index]===0)))return transformed;}return state;}
function boardQuizCenterIsNotOdd(board){if(board[3]===0)return true;const count=[0,0,0];board.forEach(value=>{if(value!==0)count[value]++;});return count[board[3]]===Math.max(...count);}
function boardQuizConfigForCurrent(){
  const masteryContext=isMode('mastery')||lastStageMode?.extra===true;
  if(!masteryContext)return null;
  // クリア後は activeMode が次の導線用に切り替わることがあるため、
  // 名人の盤面を最後に表示した文脈を優先する。extraIndex は常に整数で
  // 初期化されるので、単純なフォールバックにすると序盤の問題 (0) を
  // 参照して boardQuiz が消える。
  const index=isMode('mastery')&&Number.isInteger(extraIndex)
    ?extraIndex
    :(Number.isInteger(lastStageMode?.index)?lastStageMode.index:-1);
  const config=Number.isInteger(index)?clearContentAt(true,index)?.boardQuiz:null;
  if(!config)return null;
  // 問題定義の pattern は表示順の番号。描画時に都度参照せず、
  // 現在の盤面状態を設定取得時に確定してクイズへ渡す。
  if(config.pattern&&!config.state){
    const stage=TWO_MOVE_STAGES[TWO_MOVE_PATTERN_ORDER[config.pattern-1]];
    if(stage?.state!==undefined)return Object.assign({},config,{state:stage.state});
  }
  return config;
}
function boardQuizPresentation(config,state,copy){
  let states=[],correct=[],question=copy.choose,moveChoiceOrder=null;
  if(config.kind==='moves'){
    states=[state];
    moveChoiceOrder=shuffledIndices(copy.moveChoices.length);
    correct=[moveChoiceOrder.indexOf(1)];
    question=copy.moves;
  }else if(config.kind==='choose-two'){
    const accept=config.outerOddOnly?boardQuizCenterIsNotOdd:undefined;
    const good=[state];
    if(config.patterns)good.push(boardQuizSameShapeState(boardQuizPatternState(config.patterns[1]),state));
    for(const candidate of boardQuizMatchingStates(state,distance=>distance===2,Infinity,accept))if(!good.includes(candidate))good.push(candidate);
    const wrong=boardQuizMatchingStates(state,distance=>distance>=3,2,accept);
    states=[...wrong];
    for(const index of config.correct)states.splice(index,0,good.shift());
    correct=config.correct;
    question=copy.chooseTwo||copy.choose;
  }else if(config.options){
    states=config.options.map(option=>{
      const reference=enc(Uint8Array.from(option.state));
      return SOLVER.dist[reference]===option.distance?reference:boardQuizMatchingStates(reference,distance=>distance===option.distance,1)[0]??reference;
    });
    correct=[config.correct];
    question=copy[config.questionKey]||copy.choose;
  }else{
    const targetDistance=config.targetDistance||2;
    const target=SOLVER.dist[state]===targetDistance?state:boardQuizMatchingStates(state,distance=>distance===targetDistance,1)[0]??state;
    states=boardQuizMatchingStates(target,distance=>distance>targetDistance,1);
    states.splice(config.correct,0,target);
    correct=[config.correct];
    question=targetDistance===3?(copy.chooseThree||copy.choose):copy.choose;
  }
  return {states,correct,question,moveChoiceOrder};
}
function boardQuizTransformControls(index){
  const buttons=[
    ['rotateBack','rotateCcw'],
    ['rotate','rotateCw'],
    ['mirror','mirror'],
    ['vertical','flipVertical']
  ];
  return '<div class="board-quiz-tools">'+buttons.map(([kind,label])=>'<button type="button" data-board-transform="'+kind+'" data-board-index="'+index+'" aria-label="'+tr(label)+'">'+transformIcon(kind)+'</button>').join('')+'</div>';
}
function boardQuizMarkup(config,states,moveChoiceOrder,copy,rootId,detailPatterns){
  const card=(board,index)=>{const template=document.getElementById('boardQuizCardTemplate'),wrapper=document.createElement('div');if(!template)return '<div class="board-quiz-card"><button class="board-quiz-option" type="button" data-board-answer="'+index+'"><span class="board-quiz-board">'+miniBoardSvg(board)+'</span></button></div>';const fragment=template.content.cloneNode(true),card=fragment.firstElementChild,answer=card.querySelector('.board-quiz-option');answer.dataset.boardAnswer=index;card.querySelector('.board-quiz-board').innerHTML=miniBoardSvg(board);card.querySelectorAll('[data-board-transform]').forEach(button=>{button.dataset.boardIndex=index;svgSetIcon(button,transformIcon(button.dataset.boardTransform));});wrapper.appendChild(card);return wrapper.innerHTML;};
  const boardMarkup=config.kind==='moves'
    ?'<div class="board-quiz-single"><span class="board-quiz-board">'+miniBoardSvg(states[0])+'</span>'+boardQuizTransformControls(0)+'</div><div class="board-quiz-moves">'+moveChoiceOrder.map((choice,index)=>'<button class="board-quiz-option" type="button" data-board-answer="'+index+'">'+copy.moveChoices[choice]+'</button>').join('')+'</div>'
    :'<div class="board-quiz-options '+(states.length===3?'three':'')+'">'+states.map(card).join('')+'</div>';
  const detailLinks=detailPatterns.map(pattern=>'<button class="clear-tip-link" id="'+rootId+'Patterns'+pattern+'" type="button" data-board-patterns data-board-pattern="'+pattern+'" hidden>'+(detailPatterns.length>1?'最短2手の9パターン　'+pattern+' / 9 →':tr('detailsLink'))+'</button>').join('');
  return {boardMarkup,detailLinks};
}
function bindBoardQuizAnswerEvents(root,{config,correct,states,copy,note,noteKey,requireAnswer=false,isAnimating=()=>false}){
  const required=correct.length,selected=[];
  root.querySelectorAll('[data-board-answer]').forEach(button=>button.addEventListener('click',()=>{
    if(isAnimating()||button.disabled)return;
    const index=Number(button.dataset.boardAnswer);
    const selectedAt=selected.indexOf(index);
    if(selectedAt>=0){selected.splice(selectedAt,1);button.classList.remove('selected');}
    else if(selected.length<required){selected.push(index);button.classList.add('selected');}
    if(selected.length<required){
      note.textContent=required>1?(copy.selectMore||'Choose one more.').replace('{n}',required-selected.length):'';
      return;
    }
    root.querySelectorAll('[data-board-answer]').forEach(item=>item.disabled=true);
    correct.forEach(rightIndex=>root.querySelector('[data-board-answer="'+rightIndex+'"]').classList.add('correct'));
    selected.filter(selectedIndex=>!correct.includes(selectedIndex)).forEach(wrongIndex=>root.querySelector('[data-board-answer="'+wrongIndex+'"]').classList.add('wrong'));
    const passed=selected.length===correct.length&&selected.every(selectedIndex=>correct.includes(selectedIndex));
    note.textContent=(passed?tr('quizCorrect'):tr('quizWrong'))+'　'+copy[noteKey];
    if(passed)celebrateQuiz(root);
    root.querySelectorAll('[data-board-patterns],[data-guide-page]').forEach(link=>link.hidden=false);
    if(requireAnswer)$('clearNext').disabled=false;
  }));
}
// 公開native moduleの構文境界。
export {};
