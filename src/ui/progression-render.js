// ステージ進行に関する表示補助。状態更新は行わず、現在の状態を画面へ反映する。
// 描画のたびにID検索を繰り返さないよう、静的な進行UIの参照を一度だけ束ねる。
let progressionRenderRefs=null;
// ステージナビの表示判定を、状態やDOMに触れずに組み立てる。
function createStageNavDisplayModel({mode,tutorialMode=false,assistedLearning=false,editingBoard=false}={}){
  return Object.freeze({mode,tutorialMode:tutorialMode===true||mode==='tutorial',assistedLearning:assistedLearning===true,editingBoard:editingBoard===true,campaignMode:!['free','custom','speed'].includes(mode)});
}
// 残り手数の表示値を、DOM更新から分離する。
function createRemainingMovesDisplayModel({value,hidden=false}={}){return Object.freeze({value,hidden:hidden===true});}
// 進行ゲージの割合を、現在の状態から純粋に算出する。
function createProgressDisplayModel({mode,stageIndex=0,extraIndex=0,satoriIndex=0,speedIndex=0,speedTotal=0,satoriTotal=0,masteryTotal=0,academyCount=0,trainingCount=0}={}){
  let fraction=0;
  if(mode==='speed')fraction=(speedIndex+1)/(speedTotal||1);
  else if(mode==='satori')fraction=(satoriIndex+1)/(satoriTotal||1);
  else if(mode==='mastery')fraction=(extraIndex+1)/(masteryTotal||1);
  else if(!['free','custom'].includes(mode))fraction=stageIndex<academyCount?(stageIndex+1)/(academyCount||1):(stageIndex-academyCount+1)/(trainingCount||1);
  return Object.freeze({fraction:Math.max(0,Math.min(1,fraction))});
}
function getProgressionRenderRefs(){
  return progressionRenderRefs??=createRefs([
    'stageAccentFill','shortestLabel','moveUnit','academyClearSuffix',
    'movesLabel','moves','movesUnit'
  ]);
}
// ステージ上部の手数表示だけを担当するrenderer。進行状態の変更や遷移は行わない。
function renderMovesMetric(moveCount,hidden=false){
  const refs=getProgressionRenderRefs();
  const metric=document.querySelector('.status-metric.moves');
  if(metric)metric.hidden=hidden;
  setText(refs.movesLabel,tr('moves'));
  setText(refs.moves,moveCount);
  setText(refs.movesUnit,tr('moveUnit'));
}
// ステージナビゲーションの前後ボタン表示だけを担当するrenderer。
// 有効/無効の判定は呼び出し側で行い、ここでは渡された結果をDOMへ反映する。
function renderStageNavPager({prevHidden=false,nextHidden=false,prevDisabled,nextDisabled,highlightNext=false}={}){
  const prev=$('prevStage'),next=$('nextStage');
  if(!prev||!next)return;
  prev.hidden=prevHidden;next.hidden=nextHidden;
  if(prevDisabled!==undefined)prev.disabled=prevDisabled;
  if(nextDisabled!==undefined)next.disabled=nextDisabled;
  next.classList.toggle('next-attention',highlightNext);
}
// クリアダイアログの固定コンテキスト欄だけを描画する。表示内容の判定や進行状態の変更は呼び出し側で行う。
function renderClearStageContextElement(context,{visible=false,text=''}={}){
  if(!context)return;
  context.hidden=!visible;
  context.textContent=visible?text:'';
}
// クリア後チップの固定テキスト・詳細リンク欄を描画する。リンク先の判定は呼び出し側で行う。
function renderClearTipHeader({text='',linkVisible=false,target='details',label=''}={}){
  const body=$('clearDialogTextBody'),copy=$('clearDialogText'),link=$('clearTipLink');
  if(body)body.textContent=text;
  if(copy)copy.hidden=!text;
  if(link){link.hidden=!linkVisible;link.dataset.target=target;link.textContent=label;}
}
// クリア後の形レッスン表示モデルをDOMへ反映する。状態・遷移の判定は呼び出し側で行う。
function renderClearShapeRuleContent({state,shape,isDevelopment=false}={}){
  const intro=$('clearShapeRuleIntro'),name=$('clearShapeRuleName'),board=$('clearShapeRuleBoard');
  if(intro)intro.textContent=tr(isDevelopment?'developmentShapeRuleIntro':'trainingShapeRuleIntro');
  if(name)name.textContent=tr('twoMoveTip3'+shape+'Name');
  if(board)board.innerHTML=miniBoardSvg(state,{outline:true});
  const box=$('clearShapeRuleBox');if(box)box.hidden=isDevelopment;
  if(!isDevelopment){
    const heading=$('clearShapeRuleHeading'),condition=$('clearShapeRuleCondition');
    if(heading)heading.textContent=tr('trainingShapeRuleHeading');
    if(condition)condition.textContent=tr('trainingShapeRule'+shape+'Condition');
  }
}
function renderStageNavAccent(context={}){
  const progress=createProgressDisplayModel(context);
  /* 進行割合は呼び出し側のスナップショットから算出する。 */
  const refs=getProgressionRenderRefs();
  if(refs.stageAccentFill)refs.stageAccentFill.style.width=(progress.fraction*100)+'%';
  if(context.mode!=='speed'){
    setText(refs.shortestLabel,tr('shortestDisplay'));
    setText(refs.moveUnit,tr('moveUnit'));
    setText(refs.academyClearSuffix,tr('academyClearSuffix'));
    setText(refs.movesLabel,tr('moves'));
    setText(refs.moves,moves);
    setText(refs.movesUnit,tr('moveUnit'));
  }
  renderRankBadge();
}
// 公開ネイティブモジュールの構文境界。
export {};

// 名人ロードマップの描画。進行表示の責務に隣接するためここへ統合する。
function renderMasterRoadmap(kind){
  const roadmap=$('masterRoadmap'),roadmapNote=$('masterRoadmapNote');
  const primaryNeedsTrial=kind==='primary'&&!secondLapActive&&!speedTrainingTrialCleared;
  const intermediateNeedsTrial=kind==='intermediate'&&!secondLapActive&&!speedIntermediateTrialCleared;
  roadmap.hidden=primaryNeedsTrial||intermediateNeedsTrial||['primary','mastery','satori','satoriIntro','secondLapIntro','awakening','speedIntro','speedComplete','speedTrialFailed'].includes(kind);
  roadmapNote.hidden=true;
  const rules=$('masterRules');rules.hidden=kind!=='intermediate'||intermediateNeedsTrial;
  if(roadmap.hidden)return;
  const milestones=[speedTrainingTrialCleared,speedIntermediateTrialCleared,clearedExtraStages.has(14),clearedExtraStages.has(29),clearedExtraStages.has(44)];
  const current=Math.min(5,milestones.findIndex(done=>!done)+1||5);
  roadmap.replaceChildren(masterRoadmapFragment(current));
  if(kind==='intermediate')rules.textContent=masterCommonRules();
}
function masterRoadmapFragment(current){
  const template=document.getElementById('master-road-step-template');
  const fragment=document.createDocumentFragment();if(!template)return fragment;
  Array.from({length:5},(_,i)=>{
    const volume=i-1;
    const label=i===0?tr('academyPickerRound'):i===1?tr('darumaTraining'):(currentLang==='ja'?'名人への道・'+volumeLabel(volume):tr('allPatternsKind')+' · '+volumeLabel(volume));
    const detail=i===0?tr('roadmapCount',{n:ACADEMY_STAGE_COUNT}):i===1?tr('roadmapCount',{n:TRAINING_STAGE_COUNT}):masterSubtitle(volume)+'　'+tr('roadmapCount',{n:MASTER_VOLUME_SIZE});
    const earned=i<current-1,rank=earned?masterPath().ranks[i]:'？';
    const step=template.content.cloneNode(true).firstElementChild;const stateClass=i+1<current?'done':i+1===current?'current':'';
    if(stateClass)step.classList.add(stateClass);setText(step.querySelector('[data-road-name]'),label);setText(step.querySelector('[data-road-detail]'),detail);
    const rankElement=step.querySelector('[data-road-rank]');rankElement.innerHTML=rankFrameSvg(rank,!earned,i,secondLapActive,secondLapActive);
    if(earned&&speedExamClearedForRank(i)){const badgeTemplate=document.getElementById('speed-exam-badge-template');const badge=badgeTemplate?.content?.firstElementChild?.cloneNode(true)||document.createElement('button');badge.dataset.examIndex=String(i);badge.querySelector('[data-exam-badge-art]')?.insertAdjacentHTML('afterbegin',speedExamBadgeSvg());rankElement.append(badge);}
    fragment.append(step);
  });return fragment;
}
function masterCommonRules(){return currentLang==='ja'?'名人への道は最短の手でクリアする必要があります。\nまた、進むほど自力で考える場面が増えていきます。':'Path to Mastery must be cleared in the fewest moves. As you advance, the rules become stricter.';}
