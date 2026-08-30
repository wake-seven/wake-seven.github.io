// ===== 共通クイズUI =====
function shuffledIndices(length){const order=Array.from({length},(_,index)=>index);for(let index=order.length-1;index>0;index--){const swap=Math.floor(Math.random()*(index+1));[order[index],order[swap]]=[order[swap],order[index]];}return order;}
function quizPresentation(quiz){const order=shuffledIndices(quiz.a.length);return {answers:order.map(index=>quiz.a[index]),correct:order.indexOf(quiz.correct)};}
function celebrateQuiz(root){root.classList.remove('quiz-success');void root.offsetWidth;root.classList.add('quiz-success');playTone(784,.09,.024);playTone(1047,.13,.026,.07);haptic([10,32,16]);}
function renderQuizInto(ids,quiz){const root=$(ids.root),options=$(ids.options),note=$(ids.note);root.classList.remove('quiz-success');const {answers,correct}=quizPresentation(quiz);$(ids.title).textContent=tr('quizTitle');$(ids.question).textContent=quiz.q;note.textContent='';options.innerHTML='';answers.forEach((answer,index)=>{const button=document.createElement('button');button.className='quiz-option';button.type='button';button.textContent=answer;button.addEventListener('click',()=>{[...options.children].forEach(item=>item.disabled=true);options.children[correct].classList.add('correct');if(index===correct){note.textContent=tr('quizCorrect')+'　'+quiz.note;celebrateQuiz(root);}else{button.classList.add('wrong');note.textContent=tr('quizWrong')+'　'+quiz.note;}});options.appendChild(button);});}
function boardQuizPatternState(position){return TWO_MOVE_STAGES[TWO_MOVE_PATTERN_ORDER[position-1]].state;}
function boardQuizMatchingStates(state,match,limit=Infinity,accept=()=>true){const target=dec(state),candidates=[];for(let next=0;next<NS;next++){const distance=SOLVER.dist[next];if(distance===255||!match(distance))continue;const board=dec(next);if(board.some((value,index)=>(value===0)!==(target[index]===0))||!accept(board))continue;let changes=0;board.forEach((value,index)=>{if(value!==0&&value!==target[index])changes++;});candidates.push({state:next,distance,changes});}candidates.sort((a,b)=>a.distance-b.distance||a.changes-b.changes||a.state-b.state);return candidates.slice(0,limit).map(candidate=>candidate.state);}
function boardQuizSameShapeState(state,shapeState){const shape=dec(shapeState);for(const symmetry of SYMMETRIES){const transformed=transformStateBySymmetry(state,symmetry),board=dec(transformed);if(board.every((value,index)=>(value===0)===(shape[index]===0)))return transformed;}return state;}
function boardQuizCenterIsNotOdd(board){if(board[3]===0)return true;const count=[0,0,0];board.forEach(value=>{if(value!==0)count[value]++;});return count[board[3]]===Math.max(...count);}
function boardQuizConfigForCurrent(){return isMode('mastery')?(clearContentAt(true,extraIndex)?.boardQuiz||null):null;}
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
