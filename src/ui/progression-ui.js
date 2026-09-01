// ===== ヒントシステム・段位・名人ロードマップ =====

// 問題選択の区分: -2=だるま学園、-1=だるま修行、0..=名人への道、'satori'=悟りへの道。
let pickerRound=-2,satoriPickerPage=0,pickerLap=activeLap;
const EXTRA_ROUNDS=Math.ceil(EXTRA_STAGES.length/MASTER_VOLUME_SIZE);
const SATORI_PICKER_PAGES=5;
const allPrimaryCleared=()=>STAGES.every((_,i)=>clearedStages.has(i));
// en.roadSubtitlesは現状どこからも読まれていない下書きの短縮版タイトル。
// 未使用だからと削除しないこと(後で使う予定)。
const MASTER_PATH={
  ja:{subtitles:['七転八起','面壁九年','不立文字'],ranks:['卒業生','一人前','不屈','熟練','名人','無心','覚者'],earned:'称号「{rank}」を獲得しました。'},
  en:{subtitles:['Seven Falls, Eight Rises','Nine Years Facing the Wall','Beyond Words'],roadSubtitles:['Seven Falls','Nine Years','Beyond Words'],ranks:['Graduate','Adept','Unyielding','Seasoned','Master','No Mind','Awakened'],earned:'You earned the title “{rank}”.'},
  zh:{subtitles:['七转八起','面壁九年','不立文字'],ranks:['毕业生','独当一面','不屈','熟练','名人','无心','觉者'],earned:'获得称号“{rank}”。'},
  ko:{subtitles:['칠전팔기','면벽구년','불립문자'],ranks:['졸업생','일인분','불굴','숙련','명인','무심','깨달은 자'],earned:'칭호 “{rank}”을(를) 획득했습니다.'}
};
const masterPath=()=>MASTER_PATH[currentLang]||MASTER_PATH.ja;
const masterSubtitle=volume=>masterPath().subtitles[volume-1]||'';
const rankForVolume=volume=>masterPath().ranks[volume+1]||'';
function highestRankIndex(){
  if(awakenedGranted)return 6;
  return rankIndexForProgress(lap1ClearedStages,lap1ClearedExtraStages,lap1ClearedSatoriStages,false);
}
function rankIndexForProgress(primary,extra,satori,second=false){
  if(SATORI_STAGES.every((_,i)=>satori.has(i)))return second?(awakenedGranted?6:4):5;
  if(extra.has(44)&&(second||speedMasteryTrialCleared))return 4;
  if(extra.has(29))return 3;
  if(extra.has(14))return 2;
  if(STAGES.every((_,i)=>primary.has(i))&&(second||speedIntermediateTrialCleared))return 1;
  const academyDone=Array.from({length:ACADEMY_STAGE_COUNT},(_,i)=>i).every(i=>primary.has(i));
  return academyDone&&(second||speedTrainingTrialCleared)?0:-1;
}
const firstLapRankIndex=()=>rankIndexForProgress(lap1ClearedStages,lap1ClearedExtraStages,lap1ClearedSatoriStages,false);
const secondLapRankIndex=()=>rankIndexForProgress(lap2ClearedStages,lap2ClearedExtraStages,lap2ClearedSatoriStages,true);
function rankEarnedText(rank){return masterPath().earned.replace('{rank}',rank);}
const RANK_FRAME_COLORS=[
  {stroke:'#E2CFA8',ink:'#F0E3C8'},
  {stroke:'#D9827A',ink:'#D9827A'},
  {stroke:'#9A86D6',ink:'#9A86D6'},
  {stroke:'#62B8D2',ink:'#62B8D2'},
  {stroke:'#C9A54E',ink:'#C9A54E'},
  {stroke:'#BCC9CD',ink:'#E6EEF0'},
  {stroke:'#24282B',ink:'#454B4F'}
];
function setSealColor(seal,index){
  const stroke=(RANK_FRAME_COLORS[index]||RANK_FRAME_COLORS[0]).stroke;
  seal.style.setProperty('--seal-color',stroke);
  seal.style.setProperty('--spark-color',index===6?'#C9A54E':stroke);
}
// 速解きモード完走の印。時計の文字盤とスピード線で「速さ」を表す。
function speedSealSvg(){
  return '<svg viewBox="0 0 64 64" aria-hidden="true">'
    +'<line x1="6" y1="20" x2="16" y2="20" stroke="#62B8D2" stroke-width="3" stroke-linecap="round" opacity=".6"/>'
    +'<line x1="4" y1="28" x2="17" y2="28" stroke="#62B8D2" stroke-width="3" stroke-linecap="round" opacity=".6"/>'
    +'<line x1="6" y1="36" x2="15" y2="36" stroke="#62B8D2" stroke-width="3" stroke-linecap="round" opacity=".6"/>'
    +'<rect x="27" y="4" width="10" height="6" rx="2" fill="none" stroke="#F2D77A" stroke-width="3"/>'
    +'<line x1="44" y1="14" x2="49" y2="9" stroke="#F2D77A" stroke-width="3" stroke-linecap="round"/>'
    +'<circle cx="38" cy="34" r="22" fill="none" stroke="#F2D77A" stroke-width="3.5"/>'
    +'<line x1="38" y1="34" x2="38" y2="20" stroke="#F2D77A" stroke-width="3" stroke-linecap="round"/>'
    +'<line x1="38" y1="34" x2="48" y2="40" stroke="#F2D77A" stroke-width="3" stroke-linecap="round"/>'
    +'<circle cx="38" cy="34" r="2.4" fill="#F2D77A"/>'
    +'</svg>';
}
// 悟りへの道の印。円相（一筆書きの円）で悟りを表す。
function satoriSealSvg(){
  return '<svg viewBox="0 0 64 64" aria-hidden="true">'
    +'<circle cx="32" cy="32" r="21" fill="none" stroke="#F2D77A" stroke-width="2.5"/>'
    +'<text x="32" y="34" text-anchor="middle" dominant-baseline="central" font-family="Hiragino Mincho ProN,Yu Mincho,YuMincho,serif" font-size="30" font-weight="700" fill="#F2D77A">悟</text>'
    +'</svg>';
}
// 称号一覧・ロードマップに添える、卒業試験（修・破・極）を速解きで突破した印のバッジ。
// 巻物ではなく、斜めに傾いた賞状（緑の縁取り＋中の用紙）としてシンプルにまとめる。
function speedExamBadgeSvg(){
  return '<svg viewBox="0 0 34 34" aria-hidden="true">'
    +'<g transform="rotate(-15 17 17)">'
    +'<rect x="5" y="4" width="24" height="21" rx="2.5" fill="#7C9463" stroke="#2B2118" stroke-width="1.6" stroke-linejoin="round"/>'
    +'<rect x="8.5" y="7.5" width="17" height="14" rx="1" fill="#F1E6C8" stroke="#8A8478" stroke-width="1.3"/>'
    +'<path d="M13.4 10.5q1.6 2 0 4t0 4" fill="none" stroke="#6B5A44" stroke-width="1.1" stroke-linecap="round" opacity=".75"/>'
    +'<path d="M17 10q1.6 2 0 4t0 4.4" fill="none" stroke="#6B5A44" stroke-width="1.1" stroke-linecap="round" opacity=".75"/>'
    +'<path d="M20.6 10.5q1.6 2 0 4t0 4" fill="none" stroke="#6B5A44" stroke-width="1.1" stroke-linecap="round" opacity=".75"/>'
    +'</g>'
    +'</svg>';
}
// バッジをクリックした時に見せる、どの卒業試験を速解きで突破したかの説明文。
function speedExamBadgeLabel(index){
  if(index===0)return tr('speedExamBadgePrimary');
  if(index===1)return tr('speedExamBadgeIntermediate');
  if(index===4)return tr('speedExamBadgeMastery');
  if(index===5)return tr('speedExamBadgeSatori');
  return '';
}
// 学園・修行の卒業試験、名人への道の皆伝試験、および悟り後の任意の速解き七十三番勝負が対象の称号indexだけ、クリア済みかを返す。それ以外はfalse。
function speedExamClearedForRank(index){
  if(index===0)return speedTrainingTrialCleared;
  if(index===1)return speedIntermediateTrialCleared;
  if(index===4)return speedMasteryTrialCleared;
  if(index===5)return Number(storage.get(speedBestStorageKey('satori73'),'0'))>0;
  return false;
}
const primaryStageUnlocked=index=>(index<TRAINING_STAGE_START||canEnterTraining())
  &&(index===0||clearedStages.has(index)||clearedStages.has(index-1));
const satoriStageUnlocked=index=>index===0||clearedSatoriStages.has(index)||clearedSatoriStages.has(index-1);
const extraStageUnlocked=index=>index===0||clearedExtraStages.has(index)||clearedExtraStages.has(index-1);
function extraRoundLabel(round){
  if(currentLang==='ja')return (['序','破','急'][round]||String(round+1))+'　'+masterSubtitle(round+1);
  return volumeLabel(round+1)+' · '+masterSubtitle(round+1);
}
function closeStagePicker(){
  $('stagePicker').hidden=true;
}
function renderSatoriStagePicker(){
  const picker=$('stagePicker'),grid=$('stagePickerGrid');
  const pickerSatori=pickerLap===2?lap2ClearedSatoriStages:lap1ClearedSatoriStages;
  renderStagePickerRankBadge();
  $('pickerSpeedMode').hidden=!featureUnlocked('speedRun');
  $('stagePickerActions').classList.toggle('two-actions',!featureUnlocked('speedRun'));
  const pageSize=Math.ceil(SATORI_STAGES.length/SATORI_PICKER_PAGES);
  const start=satoriPickerPage*pageSize,end=Math.min(SATORI_STAGES.length,start+pageSize);
  picker.classList.add('satori-picker');
  $('stagePickerTitle').textContent=tr('stagePicker');
  $('closeStagePicker').setAttribute('aria-label',tr('close'));
  $('stagePickerRound').hidden=false;
  $('pickerRoundLabel').textContent=(pickerLap===2?tr('secondLapBadge')+'　':'')+tr('satoriPicker')+'　'+(satoriPickerPage+1)+' / '+SATORI_PICKER_PAGES;
  $('pickerPrevRound').hidden=false;$('pickerNextRound').hidden=false;
  $('pickerPrevRound').disabled=false;
  $('pickerNextRound').disabled=satoriPickerPage===SATORI_PICKER_PAGES-1&&!(pickerLap===1&&secondLapUnlocked);
  grid.replaceChildren();
  SATORI_STAGES.slice(start,end).forEach((stage,offset)=>{
    const index=start+offset;
    const button=document.createElement('button');
    button.textContent=index+1;
    button.classList.toggle('cleared',pickerSatori.has(index));
    button.classList.toggle('current',pickerLap===activeLap&&isMode('satori')&&satoriIndex===index);
    button.disabled=!(index===0||pickerSatori.has(index)||pickerSatori.has(index-1));
    button.setAttribute('aria-label',tr('satori')+' '+(index+1));
    button.addEventListener('click',()=>{closeStagePicker();activateCampaignLap(pickerLap);loadSatoriStage(index);});
    grid.appendChild(button);
  });
}
function openSatoriPicker(){
  if(!canEnterSatori()){
    if(activeLap===1&&isMastered())showMasterDialog('mastery');
    return;
  }
  pickerLap=activeLap;
  pickerRound='satori';
  satoriPickerPage=isMode('satori')?Math.floor(satoriIndex/Math.ceil(SATORI_STAGES.length/SATORI_PICKER_PAGES)):0;
  renderSatoriStagePicker();
  $('stagePicker').hidden=false;
}
function renderStagePicker(){
  if(pickerRound==='satori'){renderSatoriStagePicker();return;}
  const pickerRefs=createRefs(['stagePickerTitle','closeStagePicker','stagePickerRound','pickerRoundLabel','pickerPrevRound','pickerNextRound','stagePickerGrid']);
  renderStagePickerRankBadge();
  $('pickerSpeedMode').hidden=!featureUnlocked('speedRun');
  $('stagePickerActions').classList.toggle('two-actions',!featureUnlocked('speedRun'));
  $('stagePicker').classList.remove('satori-picker');
  const pickerPrimary=pickerLap===2?lap2ClearedStages:lap1ClearedStages;
  const pickerExtra=pickerLap===2?lap2ClearedExtraStages:lap1ClearedExtraStages;
  const pickerAcademyDone=Array.from({length:ACADEMY_STAGE_COUNT},(_,i)=>pickerPrimary.has(i)).every(Boolean);
  const pickerPrimaryDone=STAGES.every((_,i)=>pickerPrimary.has(i));
  const pickerMastered=EXTRA_STAGES.every((_,i)=>pickerExtra.has(i));
  const canSeeTraining=pickerAcademyDone&&(pickerLap===2||speedTrainingTrialCleared);
  const canSeeMaster=pickerPrimaryDone&&(pickerLap===2||speedIntermediateTrialCleared);
  // 悟りへの道は、名人への道を制覇してから初めて選択画面に現す。
  const canSeeSatori=pickerMastered&&(pickerLap===2||speedMasteryTrialCleared);
  const onAcademyPage=round=>typeof round==='number'&&round>=-PRIMARY_PICKER_SECTION_COUNT&&round<=PICKER_ACADEMY_LAST_ROUND;
  if(!canSeeTraining&&!onAcademyPage(pickerRound))pickerRound=-PRIMARY_PICKER_SECTION_COUNT;
  else if(!canSeeMaster&&typeof pickerRound==='number'&&pickerRound>=0)pickerRound=PICKER_TRAINING_FIRST_ROUND;
  if(pickerRound>=EXTRA_ROUNDS)pickerRound=EXTRA_ROUNDS-1;
  const isPrimary=typeof pickerRound==='number'&&pickerRound<0;
  const section=isPrimary?pickerRoundToSection(pickerRound):null;
  const isAcademy=isPrimary&&onAcademyPage(pickerRound);
  const isTraining=isPrimary&&!isAcademy;
  const canGoPrev=!(pickerRound===-PRIMARY_PICKER_SECTION_COUNT&&pickerLap===1);
  const canGoNext=isAcademy?(pickerRound===PICKER_ACADEMY_LAST_ROUND?canSeeTraining:true)
    :isTraining?(pickerRound===PICKER_TRAINING_LAST_ROUND?canSeeMaster:true)
    :pickerRound<EXTRA_ROUNDS-1||canSeeSatori;
  const canNavigateRounds=canGoPrev||canGoNext;
  setText(pickerRefs.stagePickerTitle,tr('stagePicker'));
  setAttribute(pickerRefs.closeStagePicker,'aria-label',tr('close'));
  setVisible(pickerRefs.stagePickerRound,canNavigateRounds);
  const roundName=isAcademy?tr(section.labelKey)+tr('academyClassSuffix')
    :isTraining?tr(section.labelKey)
    :tr('patternRound',{n:extraRoundLabel(pickerRound)});
  setText(pickerRefs.pickerRoundLabel,(pickerLap===2?tr('secondLapBadge')+'　':'')+roundName);
  setVisible(pickerRefs.pickerPrevRound,canNavigateRounds);
  setVisible(pickerRefs.pickerNextRound,canGoNext);
  setDisabled(pickerRefs.pickerPrevRound,!canGoPrev);
  setDisabled(pickerRefs.pickerNextRound,!canGoNext);
  const grid=pickerRefs.stagePickerGrid;
  grid.replaceChildren();
  const primaryStart=isPrimary?section.start:0;
  const pageSize=isPrimary?section.total:MASTER_VOLUME_SIZE;
  const rowTemplate=document.getElementById('stage-picker-row-template');
  for(let i=0;i<pageSize;i++){
    const index=isPrimary?primaryStart+i:pickerRound*MASTER_VOLUME_SIZE+i;
    const stage=isPrimary?STAGES[index]:EXTRA_STAGES[index];
    if(!stage)continue;
    const b=rowTemplate?.content.cloneNode(true).firstElementChild||document.createElement('button');
    const cleared=isPrimary?pickerPrimary.has(index):pickerExtra.has(index);
    b.disabled=(isPrimary
      ?!(index===0||pickerPrimary.has(index)||pickerPrimary.has(index-1))
      :!(index===0||pickerExtra.has(index)||pickerExtra.has(index-1)));
    b.classList.toggle('cleared',cleared);
    if(!isPrimary)b.classList.add('extra-lap-'+pickerRound);
    b.classList.toggle('current',pickerLap===activeLap&&!isMode('speed')&&(isPrimary?!isMode('mastery')&&!isMode('satori')&&stageIndex===index:isMode('mastery')&&extraIndex===index));
    const displayNumber=isPrimary?primarySectionPosition(index).position:i+1;
    const number=b.querySelector('[data-picker-number]'),detail=b.querySelector('[data-picker-detail]');
    if(number){number.textContent=String(displayNumber);detail.textContent=tr('shortest')+' '+stage.par+' '+tr('moveUnit');}
    else b.innerHTML=displayNumber+'<span>'+tr('shortest')+' '+stage.par+' '+tr('moveUnit')+'</span>';
    b.addEventListener('click',()=>{
      closeStagePicker();
      activateCampaignLap(pickerLap);
      if(isPrimary)loadStage(index);
      else if(allPrimaryCleared())loadExtraStage(index);
    });
    grid.appendChild(b);
  }
}
function openStagePicker(){
  pickerLap=activeLap;
  if(isMode('satori')||(isSideCourseMode()&&lastStageMode.satori)){openSatoriPicker();return;}
  const showingExtra=isMode('mastery')||(isSideCourseMode()&&lastStageMode.extra);
  const showingIndex=isMode('mastery')?extraIndex:lastStageMode.index;
  pickerRound=showingExtra?Math.floor(showingIndex/MASTER_VOLUME_SIZE):PRIMARY_SECTIONS.indexOf(primarySection(showingIndex))-PRIMARY_PICKER_SECTION_COUNT;
  renderStagePicker();
  $('stagePicker').hidden=false;
}
function openStagePickerForRank(rankIndex){
  rankDialogReturn=null;
  $('rankDialog').hidden=true;
  $('resetDialog').hidden=true;
  // 称号一覧で選択した周（activeLap）を、そのまま問題選択にも引き継ぐ。
  pickerLap=activeLap;
  pickerRound=rankIndex===0?-PRIMARY_PICKER_SECTION_COUNT:rankIndex===1?PICKER_TRAINING_FIRST_ROUND:rankIndex-2;
  renderStagePicker();
  $('stagePicker').hidden=false;
}
$('stagePickerTrigger').addEventListener('click',openStagePicker);
$('closeStagePicker').addEventListener('click',closeStagePicker);
$('stagePickerRankBadge').addEventListener('click',()=>{
  if($('stagePickerRankBadge').hidden)return;
  $('stagePicker').hidden=true;
  openRankDialog({dialogId:'stagePicker',focusId:'stagePickerRankBadge'});
});
$('stagePicker').addEventListener('click',e=>{if(e.target===$('stagePicker'))closeStagePicker();});
$('pickerPrevRound').addEventListener('click',()=>{
  if(pickerRound==='satori'&&satoriPickerPage>0)satoriPickerPage--;
  else if(pickerRound==='satori')pickerRound=EXTRA_ROUNDS-1;
  else if(pickerRound===-PRIMARY_PICKER_SECTION_COUNT&&pickerLap===2){pickerLap=1;pickerRound='satori';satoriPickerPage=SATORI_PICKER_PAGES-1;}
  else pickerRound--;
  renderStagePicker();
});
$('pickerNextRound').addEventListener('click',()=>{
  const pickerPrimary=pickerLap===2?lap2ClearedStages:lap1ClearedStages;
  const pickerExtra=pickerLap===2?lap2ClearedExtraStages:lap1ClearedExtraStages;
  const pickerAcademyDone=Array.from({length:ACADEMY_STAGE_COUNT},(_,i)=>pickerPrimary.has(i)).every(Boolean);
  const pickerPrimaryDone=STAGES.every((_,i)=>pickerPrimary.has(i));
  const pickerMastered=EXTRA_STAGES.every((_,i)=>pickerExtra.has(i));
  if(pickerRound==='satori'&&satoriPickerPage<SATORI_PICKER_PAGES-1)satoriPickerPage++;
  else if(pickerRound==='satori'&&pickerLap===1&&secondLapUnlocked){pickerLap=2;pickerRound=-PRIMARY_PICKER_SECTION_COUNT;satoriPickerPage=0;}
  else if(pickerRound===EXTRA_ROUNDS-1&&pickerMastered){pickerRound='satori';satoriPickerPage=0;}
  else if(pickerRound===PICKER_ACADEMY_LAST_ROUND&&pickerAcademyDone&&(pickerLap===2||speedTrainingTrialCleared))pickerRound=PICKER_TRAINING_FIRST_ROUND;
  else if(pickerRound===PICKER_TRAINING_LAST_ROUND&&pickerPrimaryDone&&(pickerLap===2||speedIntermediateTrialCleared))pickerRound=0;
  else if(typeof pickerRound==='number')pickerRound++;
  renderStagePicker();
});
$('pickerFreeMode').addEventListener('click',()=>{
  if(busy)return;
  closeStagePicker();
  if(!isMode('free'))restoreFreeSession();
});
$('pickerCustomMode').addEventListener('click',()=>{
  if(busy)return;
  closeStagePicker();
  if(!isMode('custom'))enterBoardMaker();
});
$('pickerSpeedMode').addEventListener('click',()=>{
  if(!featureUnlocked('speedRun'))return;
  closeStagePicker();
  if(isMode('speed'))return;
  openSpeedPicker();
});

// ===== ステージナビゲーション描画・クリア演出・メッセージ履歴 =====
function renderStageNav(){
  const tutorialMode=isMode('tutorial');
  const assistedLearning=isAssistedLearningStage();
  // 入門・基本は、盤面を読むことだけに集中する補助輪付き区間。
  // 「やり直す／1手戻す／次の1手を見る」と現在手数は表示しない。
  const hideLearningControls=assistedLearning;
  document.body.classList.toggle('tutorial-mode',tutorialMode);
  document.body.classList.toggle('academy-metric-mode',assistedLearning);
  $('tutorialReset').hidden=!tutorialMode;
  $('tutorialDebugSkip').hidden=!tutorialMode||!DEBUG_MODE;
  if(tutorialMode){
    closeAppMenu();
    $('languageMenu').classList.remove('show');
    $('languageToggle').setAttribute('aria-expanded','false');
    $('stageAccent').hidden=true;
    $('playbar').hidden=true;
    $('boardGuidance').hidden=true;
    $('speedStartOverlay').hidden=true;
    $('debugTools').hidden=true;
    return;
  }
  // 以降は独立した関心事ごとに名前付き関数へ切り出す(実行順序・中身は無変更)。
  function renderStageNavControls(){
    $('speedClockInline').hidden=true;
    // 進行ゲージの代わりのアクセント線は、全モード共通で表示する。
    $('stageAccent').hidden=false;
    const modeRow=document.querySelector('.mode-row');
    document.querySelector('.status-metric.moves').hidden=assistedLearning;
    document.querySelector('.status-separator').hidden=assistedLearning;
    modeRow.classList.toggle('satori-mode',isMode('satori'));
    modeRow.classList.toggle('speed-mode',isMode('speed'));
    modeRow.classList.toggle('speed-training',speedShowsRemaining());
    modeRow.classList.toggle('speed-with-remaining',speedShowsRemaining());
    $('stagePickerTrigger').classList.toggle('master-stage',isMode('mastery')||isMode('satori'));
    $('stageSubtitle').hidden=true;
    $('stageCount').hidden=true;
    $('stagePickerTrigger').disabled=false;
    $('stagePickerTrigger').classList.toggle('second-lap-stage',activeLap===2&&isCampaignMode());
    $('lapBadge').hidden=activeLap!==2||!isCampaignMode();
    $('lapBadge').textContent=secondLapMark();
    $('shuffle').hidden=true;
    $('undo').hidden=hideLearningControls||editingBoard||isMode('satori')||(isMode('speed')&&!speedAllowsUndo());
    $('undo').disabled=hideLearningControls||editingBoard||isMode('satori')||(isMode('speed')&&!speedAllowsUndo())||isFinalMasterPuzzle();
    $('hint').hidden=hideLearningControls||editingBoard||isMode('satori')||isMode('speed');
    if(isFourthVolume()){
      $('hint').textContent=tr('remainingCheck',{n:fourthChecksLeft()});
      $('hint').disabled=fourthChecksLeft()<=0||fourthDistanceRevealed;
    }else{
      $('hint').textContent=tr('hint');
      $('hint').disabled=masterHintsDisabled();
    }
    $('debugTools').hidden=!DEBUG_MODE;
    for(const id of ['debugReset','debugClear','debugSpeedJumpFinish','debugAlmost','debugMore','debugFar','debugSkipTutorial','debugIntro2','debugBasic11','debugAcademy20','debugSpeedTraining8','debugTrainingUpper','debugTrainingMiddle','debugTrainingLower','debugSpeedIntermediate17','debugExtra14','debugExtra29','debugExtra44','debugSpeedMastery26','debugSatori72','debugSecondIntro2','debugSecondBasic11','debugSecondAcademy20','debugSecondTrainingUpper','debugSecondTrainingMiddle','debugSecondTrainingLower','debugSecondExtra14','debugSecondExtra29','debugSecondExtra44','debugSecondSatori72'])$(id).hidden=!DEBUG_MODE;
    const pauseButton=$('speedPause'),pauseInline=$('speedPauseInline'),playActions=document.querySelector('.play-actions');
    const awaitingSpeedStart=isMode('speed')&&speedAwaitingStart();
    if(isMode('speed')&&!speedShowsRemaining())pauseInline.appendChild(pauseButton);
    else playActions.appendChild(pauseButton);
    $('reset').textContent=editingBoard?tr('resetAll'):speedShowsRemaining()?tr('reset'):isMode('speed')?tr('speedPuzzleRestart'):tr('reset');
    $('reset').hidden=hideLearningControls||isMode('satori')||(isMode('speed')&&!speedShowsRemaining());
    $('speedPause').hidden=!isMode('speed');
    $('speedStartOverlay').hidden=!awaitingSpeedStart;
    $('playbar').hidden=hideLearningControls||(awaitingSpeedStart&&!speedShowsRemaining());
    const hideBoardViewControls=assistedLearning||isMode('speed')||(isMode('stage')&&stageIndex>=TRAINING_STAGE_START&&stageIndex<TRAINING_STAGE_START+TRAINING_UPPER_COUNT);
    for(const id of ['rotateBoardBack','rotateBoard','mirrorBoard','flipBoardVertical'])$(id).hidden=hideBoardViewControls;
    $('twoMoveLessonOpen').hidden=!((isMode('stage')&&stageIndex>=TRAINING_STAGE_START&&stageIndex<TRAINING_STAGE_START+TRAINING_UPPER_COUNT)||isTwoMoveLessonSpeedStage());
    $('twoMoveLessonOpen').textContent=tr('twoMoveLessonOpen');
  }
  function renderStageNavModeButtons(){
    const inSideMode=isSideCourseMode();
    $('stageKind').hidden=false;
    $('stageNav').classList.toggle('side-mode-nav',inSideMode);
    $('prevStage').textContent=inSideMode?tr('stageModeReturn'):tr('prev');
    $('prevStage').setAttribute('aria-label',inSideMode?tr('stageModeReturn'):tr('prev'));
    $('prevStage').disabled=isMode('speed')||(!inSideMode&&(!isMode('mastery')&&!isMode('satori')&&stageIndex===0&&activeLap===1));
    const customPlaying=isMode('custom')&&!editingBoard;
    const nextLabel=customPlaying?tr('boardMaker'):isMode('free')?tr('shuffle'):tr('next');
    $('nextStage').textContent=nextLabel;
    $('nextStage').setAttribute('aria-label',nextLabel);
    $('nextStage').hidden=isMode('speed')||(isMode('custom')&&!customPlaying);
    $('nextStage').disabled=customPlaying?false:isMode('custom')?true:isMode('free')?false:isMode('mastery')
      ?(extraIndex===EXTRA_STAGES.length-1?!canEnterSatori():!clearedExtraStages.has(extraIndex))
      :(stageIndex===STAGES.length-1?!allPrimaryCleared():!clearedStages.has(stageIndex));
    $('stageMode').classList.toggle('on',isCampaignMode());
    $('freeMode').classList.toggle('on',isMode('free'));
    $('menuSpeed').classList.toggle('on',isMode('speed'));
    $('stageMode').setAttribute('aria-pressed',String(isCampaignMode()));
    $('freeMode').setAttribute('aria-pressed',String(isMode('free')));
    $('stageModeReturn').hidden=true;
    $('menuRankList').hidden=highestRankIndex()<0;
    $('menuAllPatterns').hidden=!featureUnlocked('genome');
    $('menuBoardTheme').hidden=!featureUnlocked('boardTheme');
    $('menuSatori').hidden=true;
    $('menuSpeed').hidden=!DEBUG_MODE&&!featureUnlocked('speedRun');
    $('menuOpen3D').hidden=!featureUnlocked('threeD');
    $('customMode').textContent=tr('makeBoard');
    $('customMode').classList.remove('ready');
    $('customMode').hidden=false;
    $('customMode').disabled=false;
    $('playCustomBoard').hidden=!editingBoard;
    if(editingBoard){
      const d=makerDistance();
      $('playCustomBoard').disabled=d===255||d===0;
    }
  }
  function renderStageNavStageText(){
    if(isMode('speed')){
      setText('stageKind',speedVariantCopy(speedVariant).label);
      $('stageNumber').textContent=(speedSession.index+1)+' / '+(speedSession.total||activeSpeedDefinition().total);
      const showsRemaining=speedShowsRemaining();
      $('shortestLabel').textContent=showsRemaining?tr('shortestDisplay'):'';
      $('moveUnit').textContent=showsRemaining?tr('moveUnit'):'';
      $('academyClearSuffix').textContent=showsRemaining?tr('academyClearSuffix'):'';
      $('speedClockInline').hidden=false;
      setText('speedClockLabel','');
      renderMovesMetric(moves,isTwoMoveLessonSpeedStage());
      if(showsRemaining)showRemaining(remainingForDisplay(SOLVER.dist[enc(ori)]),false);
      renderSpeedClock();
    }else if(isMode('free')){
      setText('stageKind',tr('freeKind'));
      $('stageNumber').textContent=tr('freePlay');
      showRemaining(remainingForDisplay(SOLVER.dist[enc(ori)]),false);
    }else if(isMode('custom')){
      setText('stageKind','CUSTOM');
      $('stageNumber').textContent=tr('makeBoard');
      const d=SOLVER.dist[enc(ori)];
      if(editingBoard)$('stagePar').textContent=d===255?'—':d;
      else showRemaining(d,false);
    }else if(isMode('satori')){
      setText('stageKind',tr('satori'));
      $('stageNumber').textContent=(satoriIndex+1)+' / '+SATORI_STAGES.length;
      showRemaining('?',false);
    }else if(isMode('mastery')){
      const volume=Math.floor(extraIndex/MASTER_VOLUME_SIZE)+1;
      setText('stageKind',currentLang==='ja'?'名人への道・'+volumeLabel(volume):tr('allPatternsKind')+' '+volumeLabel(volume));
      $('stageNumber').textContent=masterSubtitle(volume);
      $('stageCount').textContent=(extraIndex%MASTER_VOLUME_SIZE+1)+' / '+MASTER_VOLUME_SIZE;
      $('stageCount').hidden=false;
      $('stageSubtitle').hidden=true;
      showRemaining(remainingForDisplay(SOLVER.dist[enc(ori)]),false);
    }else{
      const {section,position}=primarySectionPosition(stageIndex);
      const isAcademySection=['intro','basic','development'].includes(section.id);
      if(isAcademySection){
        setText('stageKind',tr('academyPickerRound'));
        $('stageNumber').textContent=tr(section.labelKey)+tr('academyClassSuffix');
        $('stageCount').textContent=position+' / '+section.total;
        $('stageCount').hidden=false;
        $('stageSubtitle').hidden=true;
      }else{
        setText('stageKind',tr(section.labelKey));
        $('stageNumber').textContent=position+' / '+section.total;
      }
      showRemaining(remainingForDisplay(SOLVER.dist[enc(ori)]),false);
    }
  }
  function renderStageNavPrevNext(){
    const customPlaying=isMode('custom')&&!editingBoard;
    const speed=isMode('speed'),satori=isMode('satori');
    const nextDisabled=satori
      ?(satoriIndex===SATORI_STAGES.length-1?!(activeLap===1&&secondLapUnlocked):!clearedSatoriStages.has(satoriIndex))
      :speed?true:undefined;
    renderStageNavPager({
      nextHidden:!speed&&!satori&&isMode('custom')&&!customPlaying,
      prevDisabled:speed||satori?(!satori||false):undefined,
      nextDisabled,
      highlightNext:nextStageAttention&&isCampaignMode()&&!$('nextStage').hidden&&!$('nextStage').disabled
    });
  }
  function renderStageNavGuidance(){
    renderMainBoardGuidance();
    if(assistedLearning)$('boardGuidance').hidden=true;
  }
  renderStageNavControls();
  renderStageNavModeButtons();
  renderStageNavStageText();
  renderStageNavAccent();
  renderStageNavPrevNext();
  renderStageNavGuidance();
}
// 全員起きた瞬間の演出(タイルの揺れ+金色のバースト)。本編のクリアと、各所のデモ盤面で共用する。
function playWakeCelebrationEffect(targetSvg,tilesArr){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  tilesArr.forEach((el,i)=>{
    const base=el.style.transform;
    el.animate([
      {transform:base},
      {transform:base+' scale(1.13,.78) skewX(-7deg)',offset:.2},
      {transform:base+' scale(.86,1.18) skewX(6deg)',offset:.42},
      {transform:base+' scale(1.08,.91) skewX(-3deg)',offset:.64},
      {transform:base}
    ],{duration:820,delay:i*65,easing:'cubic-bezier(.2,.8,.25,1)'});
  });
  const NS_='http://www.w3.org/2000/svg';
  const burst=document.createElementNS(NS_,'g');
  burst.setAttribute('class','clear-burst');
  burst.setAttribute('pointer-events','none');
  const addBurstRing=(radius,stroke,width,opacity)=>{const ring=document.createElementNS(NS_,'circle');ring.setAttribute('cx',CELL[3].x);ring.setAttribute('cy',CELL[3].y);ring.setAttribute('r',radius);ring.setAttribute('fill','none');ring.setAttribute('stroke',stroke);ring.setAttribute('stroke-width',width);if(opacity)ring.setAttribute('opacity',opacity);burst.appendChild(ring);};
  addBurstRing(47,'#C9A54E',4);
  addBurstRing(58,'#F3E8D5',1.5,'.7');
  burst.style.transformOrigin=CELL[3].x+'px '+CELL[3].y+'px';
  burst.style.transformBox='view-box';
  targetSvg.appendChild(burst);
  const a=burst.animate([
    {transform:'scale(.55)',opacity:0},
    {transform:'scale(.8)',opacity:1,offset:.2},
    {transform:'scale(2.45)',opacity:0}
  ],{duration:820,easing:'cubic-bezier(.15,.7,.2,1)'});
  a.onfinish=a.oncancel=()=>burst.remove();
}
function celebrateClear(){
  svg.classList.add('celebrating');
  playClearSound(clearSoundKind());
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return 0;
  playWakeCelebrationEffect(svg,tileEls);
  return 650;
}
function showClearActions(){
  setUiEffectTimer('clear-transition','show-dialog',showClearDialog,celebrateClear());
}
function renderClearStageContext(){
  const context=$('clearStageContext');
  if(isMode('free')||isMode('custom')){
    renderClearStageContextElement(context,{visible:false});
    return;
  }
  const showsCount=clearDialogShowsStageCount();
  const text=showsCount
    ?$('stageKind').textContent+'　'+$('stageNumber').textContent+' '+$('stageCount').textContent
    :$('stageKind').textContent+' '+$('stageNumber').textContent;
  renderClearStageContextElement(context,{visible:true,text});
}
function clearDialogShowsStageCount(){
  return isMode('mastery')||(!isMode('satori')&&!isMode('speed')&&['intro','basic','development'].includes(primarySectionPosition(stageIndex).section.id));
}
function clearDialogUsesStageProgression(){
  return !isMode('free')&&!isMode('custom')&&!isMode('mastery')&&!isMode('satori');
}
function clearDialogHeading(){
  return tr(isMode('mastery')||isMode('satori')?'optimalClear':'clear');
}
function showClearDialog(){
  // 悟りの最終問題は、再挑戦で解いた場合も制覇ダイアログを見せる。
  // それ以外の悟り問題は、制覇後も通常のクリアダイアログにする。
  const showSatoriMastery=isMode('satori')&&satoriIndex===SATORI_STAGES.length-1&&isSatoriMastered();
  if(pendingMasterThemeRefresh){
    pendingMasterThemeRefresh=false;
    updateMasterTheme();
  }
  if(showSatoriMastery){
    showMasterDialog(secondLapActive?'awakening':'satori');
    return;
  }
  if(clearDialogUsesStageProgression()&&stageIndex===ACADEMY_STAGE_COUNT-1&&academyCleared()){
    showMasterDialog('primary');
    return;
  }
  // 入門クラス最終問題のクリアは、通常のクリアダイアログの代わりに
  // だるま学園入学と同じ演出の「基本クラスへようこそ」を毎回そのまま見せる。
  if(clearDialogUsesStageProgression()&&stageIndex===INTRO_STAGE_COUNT-1){
    openChainedDialog('basicWelcome');
    return;
  }
  // 基本クラス最終問題のクリアも、同じ演出で「発展クラス開始」を毎回そのまま見せる。
  if(clearDialogUsesStageProgression()&&stageIndex===DEVELOPMENT_STAGE_START-1){
    openChainedDialog('developmentWelcome');
    return;
  }
  const currentLapPrimaryCleared=(activeLap===2?lap2ClearedStages:lap1ClearedStages);
  const currentLapPrimaryComplete=STAGES.every((_,i)=>currentLapPrimaryCleared.has(i));
  if(clearDialogUsesStageProgression()&&stageIndex===STAGES.length-1&&currentLapPrimaryComplete){
    showMasterDialog('intermediate');
    return;
  }
  const masteryClearContext=isMode('mastery')||lastStageMode?.extra===true;
  const clearedMasteryIndex=masteryClearContext&&Number.isInteger(extraIndex)
    ?extraIndex
    :(masteryClearContext&&Number.isInteger(lastStageMode?.index)?lastStageMode.index:-1);
  if(clearedMasteryIndex>=0&&(clearedMasteryIndex+1)%MASTER_VOLUME_SIZE===0){
    showMasterDialog(clearedMasteryIndex===EXTRA_STAGES.length-1?'mastery':'volume');
    return;
  }
  const action=$('clearNext');
  if(isMode('free'))action.textContent=tr('another');
  else if(isMode('custom'))action.textContent=tr('again');
  else if(isMode('satori'))action.textContent=satoriIndex===SATORI_STAGES.length-1?tr('satoriChoose'):tr('nextPuzzle');
  else if(isMode('mastery'))action.textContent=extraIndex===EXTRA_STAGES.length-1?tr('toFree'):tr('nextPattern');
  else if(stageIndex===STAGES.length-1&&allPrimaryCleared())action.textContent=tr('allPatternsNext');
  else if(stageIndex===STAGES.length-1)action.textContent=tr('toFree');
  else action.textContent=tr('nextPuzzle');
  $('clearDialogMessage').textContent=clearDialogHeading();
  renderClearStageContext();
  renderClearTip();
  renderClearQuiz();
  action.hidden=false;
  action.disabled=false;
  renderBoardQuiz('boardQuiz',boardQuizConfigForCurrent(),{requireAnswer:true});
  $('clearDialog').hidden=false;
}
function renderOptimalFail(){
  const secondSatori=isMode('satori')&&secondLapActive;
  const over=Math.max(1,moves-best);
  const satoriLimit=isMode('satori')&&!isSolved()&&moves>=best;
  if(secondSatori){
    $('optimalFailTitle').textContent=tr('satoriSecondFailTitle');
    $('optimalFailRule').textContent=tr('satoriSecondFailRule');
    $('optimalFailResult').hidden=true;
    $('optimalFailEncourage').hidden=true;
    $('optimalRetry').textContent=tr('optimalRetry');
    return;
  }
  $('optimalFailResult').hidden=false;
  const encourage=tr(isMode('satori')?'satoriFailEncourage':'optimalFailEncourage');
  $('optimalFailEncourage').hidden=!encourage;
  $('optimalFailTitle').textContent=satoriLimit?tr('satoriFailLimit'):tr(over===1?'optimalFailOne':over===2?'optimalFailTwo':'optimalFailMany');
  $('optimalFailRule').textContent=tr(isMode('satori')?'satoriFailRule':'optimalFailRule');
  $('optimalFailResult').textContent=satoriLimit?tr('satoriFailResult',{best}):tr('optimalFailResult',{best,moves});
  $('optimalFailEncourage').textContent=encourage;
  $('optimalRetry').textContent=tr('optimalRetry');
}
function tipDaruma(x,y,scale=.55){
  return '<g transform="translate('+x+' '+y+') scale('+scale+')"><use href="#daruma-body"/><use href="#face-open"/></g>';
}
function tipPaperCraftArt(){
  const egg='M0 -34C17 -34 31 -18 31 4C31 24 18 36 0 36C-18 36 -31 24 -31 4C-31 -18-17-34 0-34Z';
  return tipSvg(
    '<g transform="translate(35 46) scale(.64)"><path d="'+egg+'" fill="#E7D8BA" stroke="#241D1A" stroke-width="2.5"/>'
      +'<path d="M-26 15Q0 11 26 15C24 29 13 36 0 36C-13 36-24 29-26 15Z" fill="#C9B08A"/>'
      +'<path d="M-23 -15Q0 -19 23 -15" fill="none" stroke="#B99158" stroke-width="3.6" stroke-linecap="round" opacity=".8"/>'
      +'<path d="M-26 0Q0 -4 26 0" fill="none" stroke="#B99158" stroke-width="7.4" stroke-linecap="round" opacity=".8"/>'
      +'<path d="M-25 15Q0 11 25 15" fill="none" stroke="#B99158" stroke-width="4.3" stroke-linecap="round" opacity=".8"/>'
      +'<g transform="translate(34 25) rotate(38)"><path d="M-3.2 -13H3.2V1H-3.2Z" fill="#B77E45" stroke="#6B4630" stroke-width="1.4"/><path d="M-5 1H5V6H-5Z" fill="#D2A94A" stroke="#6B4630" stroke-width="1.3"/><path d="M-6 6H6L4 24Q0 29-4 24Z" fill="#F1DEB8" stroke="#6B4630" stroke-width="1.25"/><path d="M-4 23Q0 30 4 23Z" fill="#E3C98F" stroke="none"/><path d="M-2 8Q0 19 0 26M2 8Q2 18 1 25" fill="none" stroke="#CDBB9D" stroke-width=".8" stroke-linecap="round"/></g></g>'
    +'<path d="M64 45h14m-5-5 6 5-6 5" fill="none" stroke="#A88D66" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    +'<g transform="translate(105 46) scale(.64)"><path d="'+egg+'" fill="#C8352C" stroke="#241D1A" stroke-width="2.5"/>'
      +'<g transform="scale(.75)"><path d="'+egg+'" fill="#EEE5D2" stroke="#241D1A" stroke-width="1.8"/></g>'
      +'<path d="M-18 18Q0 23 18 18" fill="none" stroke="#9A733B" stroke-width="2.5" stroke-linecap="round" opacity=".8"/></g>'
    +'<path d="M133 45h14m-5-5 6 5-6 5" fill="none" stroke="#A88D66" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    +tipDaruma(176,47,.64)
  );
}
function tipMarketArt(){
  const d=(x,y,scale)=>tipDaruma(x,y,scale);
  return tipSvg(
    '<rect x="3" y="3" width="204" height="112" rx="8" fill="#F3E8D5"/>'
    +'<path d="M4 42L28 27 48 38 70 21 94 40 116 30 136 42 160 26 182 39 206 29V47H4Z" fill="#A9B9C8"/>'
    +'<path d="M129 39L158 26 188 39Q159 35 129 39Z" fill="#4A5A6B" stroke="#241D1A" stroke-width=".9"/><path d="M138 39H179V47H138Z" fill="#7A6A56" stroke="#241D1A" stroke-width=".8"/>'
    +'<path d="M34 38V103M176 38V103" stroke="#8A6A3F" stroke-width="3.5" stroke-linecap="round"/>'
    +'<path d="M30 40H180V55H30Z" fill="#2F4B6B" stroke="#241D1A" stroke-width="1"/><path d="M30 55q6 6 12 0q6 6 12 0q6 6 12 0q6 6 12 0q6 6 12 0q6 6 12 0q6 6 12 0q6 6 12 0q6 6 12 0q6 6 12 0q6 6 12 0q6 6 12 0" fill="#2F4B6B" stroke="#241D1A" stroke-width="1"/>'
    +'<g stroke="#241D1A" stroke-width="1"><path d="M53 78H157V85H53Z" fill="#C9A16A"/><path d="M47 88H163V96H47Z" fill="#B98F5A"/><path d="M42 101H168V110H42Z" fill="#A87F4C"/></g>'
    +d(72,70,.15)+d(88,70,.15)+d(104,70,.15)+d(120,70,.15)+d(136,70,.15)
    +d(65,81,.2)+d(90,81,.2)+d(115,81,.2)+d(140,81,.2)
    +d(59,94,.27)+d(93,94,.27)+d(127,94,.27)+d(156,94,.27)
    +'<g stroke="#241D1A" stroke-width="1"><circle cx="21" cy="88" r="6" fill="#E8CFA8"/><path d="M10 110q1-17 11-17t11 17Z" fill="#3E5B78"/><path d="M15 86q2-5 12 0" fill="#3A3128" stroke="none"/><circle cx="189" cy="84" r="6" fill="#E8CFA8"/><path d="M178 110q1-18 11-18t11 18Z" fill="#7A6A56"/><path d="M183 82q2-5 12 0" fill="#3A3128" stroke="none"/></g>'
    +d(189,97,.18)
    +'<g stroke="#241D1A" stroke-width="1"><path d="M18 10v6M192 10v6"/><g transform="translate(12 16)"><ellipse cx="6" cy="8" rx="6" ry="8" fill="#D8543F"/><path d="M1 5h10M0 8h12M1 11h10" opacity=".5"/></g><g transform="translate(186 16)"><ellipse cx="6" cy="8" rx="6" ry="8" fill="#D8543F"/><path d="M1 5h10M0 8h12M1 11h10" opacity=".5"/></g></g>'
    +'<path d="M5 111H205" stroke="#8A6A3F" stroke-width="1" opacity=".6"/>',true);
}
function tipTakasakiDaruma(x,y,scale=.55){
  return '<g transform="translate('+x+' '+y+') scale('+(scale*1.15)+' '+scale+')"><use href="#daruma-body"/>'
    +'<path d="M-20 8H20V16H-20Z" fill="#C8352C"/>'
    +'<path d="M-11-22C-5-25 5-25 11-22C20-18 23-12 23 0C23 6 21 8.5 18 9.5C12 10.5 6 11 0 11C-6 11-12 10.5-18 9.5C-21 8.5-23 6-23 0C-23-12-20-18-11-22Z" fill="#F3E8D5"/>'
    +'<use href="#face-open"/>'
    +'<path d="M-15 22C-8 28 8 28 15 22" fill="none" stroke="#C8352C" stroke-width="4.4" stroke-linecap="round"/></g>';
}
function tipSvg(content,tall=false){return '<svg viewBox="0 0 210 '+(tall?'118':'86')+'" aria-hidden="true">'+content+'</svg>';}
function tipMonakaFaceArt(){
  return tipSvg('<g transform="translate(105 45) scale(1.3) translate(-105 -40)"><g transform="translate(83 40) scale(.8) translate(-83 -40)" stroke="#6B4630" stroke-linejoin="round">'
    +'<path d="M69 66C54 61 48 47 52 31C56 16 68 9 82 9C96 9 108 16 112 31C116 47 110 61 95 66Z" fill="#D9A65F" stroke-width="2"/>'
    +'<path d="M98 66C113 61 119 47 115 31C111 16 99 9 85 9C71 9 59 16 55 31C51 47 57 61 72 66Z" fill="#E8C17D" stroke-width="2"/>'
    +'<path d="M83 12V64M61 39C70 35 79 34 83 34C88 34 98 35 106 39" fill="none" stroke="#A77443" stroke-width="1.5"/>'
    +'<g transform="translate(72 49) scale(1.22)" fill="none" stroke="#A77443" stroke-width="1.05" stroke-linecap="round" stroke-linejoin="round"><path d="M-8 7C-10 2-8-5-4-8C0-11 5-9 7-5C10 1 9 6 6 8C2 10-4 10-8 7Z"/><ellipse cx="0" cy="-3" rx="5.8" ry="4.8"/><path d="M-2-3Q-1.65-4.1-1.3-3M2.1-3Q2.45-4.1 2.8-3M-1-.35Q0 .65 1-.35"/></g>'
    +'</g><g stroke="#6B4630" stroke-linejoin="round"><path d="M126 19C140 18 153 29 154 45C155 60 144 71 130 72C116 73 105 64 104 50C103 36 112 21 126 19Z" fill="#E8C17D" stroke-width="2"/><path d="M126 22C137 21 147 31 148 44C149 56 141 66 130 68C119 70 110 62 109 51C108 39 115 24 126 22Z" fill="#70402C" stroke="none" opacity=".92"/><path d="M126 22C137 21 147 31 148 44C149 56 141 66 130 68C119 70 110 62 109 51C108 39 115 24 126 22Z" fill="none" stroke="#A77443" stroke-width="2"/></g></g><text x="105" y="105" text-anchor="middle" fill="#E8C17D" font-family="sans-serif" font-size="11" font-weight="800" letter-spacing=".12em">だるま最中</text>',true);
}
function tipArt(key){
  if(key==='monaka')return tipMonakaFaceArt();
  if(key==='rankBadgeArt')return rankFrameSvg(masterPath().ranks[0],false,0);
  const d=tipDaruma;
  if(key.startsWith('twoMoveCard:'))return clearBoardSvg(TWO_MOVE_STAGES[Number(key.slice(12))].state);
  if(key.startsWith('guideCard:'))return clearBoardSvg(enc(Uint8Array.from(key.slice(10).split('').map(Number))));
  if(key==='moveGraph'){
    const label={ja:['進む','足踏み','悪化','残り最短'],en:['Advance','Hold','Worse','Moves left'],zh:['前进','原地','变难','最少还需'],ko:['전진','제자리','악화','최단 남은 수']}[currentLang]||['進む','足踏み','悪化','残り最短'];
    const rows=[[8.3,8.3,83.3],[9.8,24.5,65.7],[16.7,56.2,27.1],[51.4,48.6,0]];
    const colors=['#42C6BE','#8295A8','#DF6C61'];
    const bars=rows.map((row,i)=>{let x=98;const y=31+i*25;const parts=row.map((p,j)=>{const width=p*1.18,part=width?'<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+width.toFixed(1)+'" height="18" fill="'+colors[j]+'"/>' : '';x+=width;return part;}).join('');const values=row.map((p,j)=>'<text x="'+(238+j*28)+'" y="'+(y+13)+'" text-anchor="middle" fill="'+colors[j]+'">'+Math.round(p)+'%</text>').join('');return '<text x="88" y="'+(y+13)+'" text-anchor="end" fill="#D4E6EC">'+label[3]+' '+(i+1)+'手</text><rect x="98" y="'+y+'" width="118" height="18" fill="#253F55"/>'+parts+values;}).join('');
    return '<svg viewBox="0 0 320 130" aria-hidden="true"><g font-family="sans-serif" font-size="9" font-weight="700"><text x="238" y="17" text-anchor="middle" fill="'+colors[0]+'">'+label[0]+'</text><text x="266" y="17" text-anchor="middle" fill="'+colors[1]+'">'+label[1]+'</text><text x="294" y="17" text-anchor="middle" fill="'+colors[2]+'">'+label[2]+'</text></g><g font-family="sans-serif" font-size="10" font-weight="700">'+bars+'</g></svg>';
  }
  if(key==='remaining')return tipSvg('<rect x="24" y="8" width="162" height="66" rx="8" fill="#173842" stroke="#62B8D2" stroke-width="1.6"/><text x="50" y="56" fill="#9BCBDD" font-family="sans-serif" font-size="13" font-weight="600">あと</text><text x="101" y="56" text-anchor="middle" fill="#62B8D2" font-family="sans-serif" font-size="34" font-weight="750">2</text><text x="145" y="56" text-anchor="middle" fill="#9BCBDD" font-family="sans-serif" font-size="13" font-weight="600">くるり</text>');
  switch(key){
    case 'controls':return tipSvg('<g font-family="A1 Gothic,Hiragino Kaku Gothic ProN,Yu Gothic,sans-serif" font-size="12" font-weight="400" text-anchor="middle"><rect x="5" y="25.5" width="100" height="35" rx="17.5" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.14)"/><text x="55" y="48.5" fill="#B9C6D6">やり直す</text><rect x="110" y="25.5" width="100" height="35" rx="17.5" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.14)"/><text x="160" y="48.5" fill="#B9C6D6">1手戻す</text></g>');
    case 'hintButton':return tipSvg('<g font-family="A1 Gothic,Hiragino Kaku Gothic ProN,Yu Gothic,sans-serif" font-size="14" font-weight="400" text-anchor="middle"><rect x="54" y="25.5" width="102" height="35" rx="17.5" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.14)"/><text x="105" y="49.5" fill="#B9C6D6">'+tr('hint')+'</text></g>');
    case 'navigation':return tipSvg('<g font-family="A1 Gothic,Hiragino Kaku Gothic ProN,Yu Gothic,sans-serif" text-anchor="middle"><rect x="4" y="24" width="47" height="32" rx="16" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.14)"/><text x="27.5" y="44" fill="#B9C6D6" font-size="9">← 前へ</text><rect x="58" y="19" width="94" height="42" rx="7" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.14)"/><text x="105" y="36" fill="#9FB0C4" font-size="9">基本</text><text x="105" y="52" fill="#F3E8D5" font-size="14">7 / 9</text><rect x="159" y="24" width="47" height="32" rx="16" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.14)"/><text x="182.5" y="44" fill="#B9C6D6" font-size="9">次へ →</text></g>');
    case 'menuButtons':return tipSvg('<g font-family="A1 Gothic,Hiragino Kaku Gothic ProN,Yu Gothic,sans-serif" text-anchor="middle"><rect x="54" y="23" width="102" height="40" rx="20" fill="rgba(98,184,210,.055)"/><rect x="56" y="25" width="98" height="36" rx="18" fill="rgba(22,40,60,.76)" stroke="rgba(98,184,210,.58)"/><text x="105" y="48" fill="#B9E8F2" font-size="13" font-weight="700" letter-spacing=".06em">'+tr('menu')+'</text></g>');
    case 'unwritten':return tipSvg('<path d="M39 20Q105 6 171 20L166 39Q105 48 44 39Z" fill="#F3E8D5" opacity=".12" stroke="#B9E8F2" stroke-width="1.2"/><path d="M45 21Q105 13 165 21" fill="none" stroke="#F3E8D5" stroke-width="1" opacity=".45"/><text x="72" y="34" text-anchor="middle" fill="#B9E8F2" font-family="serif" font-size="18" opacity=".54">文</text><text x="105" y="34" text-anchor="middle" fill="#B9E8F2" font-family="serif" font-size="15" opacity=".3">・</text><text x="137" y="34" text-anchor="middle" fill="#B9E8F2" font-family="serif" font-size="12" opacity=".12">字</text><path d="M75 62Q105 51 135 62" fill="none" stroke="#62B8D2" stroke-width="1.7" stroke-linecap="round" opacity=".7"/><circle cx="105" cy="59" r="10" fill="#62B8D2" opacity=".1"/><circle cx="105" cy="59" r="4" fill="#C9A54E" opacity=".9"/>'+d(59,67,.35)+d(151,67,.35));
    case 'rise':return tipSvg('<path class="tip-blue" d="M37 58C53 25 85 20 113 34"/><path class="tip-blue" d="M104 25l10 9-13 4"/><text class="tip-text" x="22" y="24">7</text><text class="tip-text" x="133" y="28">8</text>'+d(119,52));
    case 'eyes':return tipSvg(d(105,53,.75)+'<circle cx="99" cy="49" r="3" fill="#F3E8D5"/><path d="M96 50Q99 46 102 50" fill="none" stroke="#241D1A" stroke-width="1.8" stroke-linecap="round"/>');
    case 'cheer':return tipSvg('<g transform="translate(105 51) scale(.76)"><use href="#daruma-body"/><use href="#face-happy"/></g><g stroke="#B9E8F2" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M49 66L39 25M161 66l10-41"/><path d="M40 27l-17 6 20 9Z" fill="#62B8D2"/><path d="M170 27l17 6-20 9Z" fill="#62B8D2"/></g><g fill="none" stroke="#62B8D2" stroke-width="2.2" stroke-linecap="round"><path d="M47 20l-5-5M163 20l5-5M35 53l-8 2M175 53l8 2"/></g>');
    case 'red':return tipSvg('<path class="tip-line" d="M105 7v11M68 20l8 8M142 20l-8 8M58 52h12M140 52h12"/>'+d(105,52,.7));
    case 'count':return tipSvg('<g text-anchor="middle"><text class="tip-text" x="16" y="20">1</text><text class="tip-text" x="36" y="20">2</text><text class="tip-text" x="56" y="20">3</text><text class="tip-text" x="76" y="20">4</text><text class="tip-text" x="96" y="20">5</text><text class="tip-text" x="116" y="20">6</text><text class="tip-text" x="136" y="20">7</text><text class="tip-text" x="156" y="20">8</text><text class="tip-text" x="176" y="20">9</text><text class="tip-text" x="196" y="20">10</text><text class="tip-caption" x="16" y="51">だ</text><text class="tip-caption" x="36" y="51">る</text><text class="tip-caption" x="56" y="51">ま</text><text class="tip-caption" x="76" y="51">さ</text><text class="tip-caption" x="96" y="51">ん</text><text class="tip-caption" x="116" y="51">が</text><text class="tip-caption" x="136" y="51">こ</text><text class="tip-caption" x="156" y="51">ろ</text><text class="tip-caption" x="176" y="51">ん</text><text class="tip-caption" x="196" y="51">だ</text></g><path class="tip-line" d="M10 32h190" opacity=".45"/><g transform="translate(105 88) rotate(90) scale(.62)"><use href="#daruma-body"/><use href="#face-shut"/></g>',true);
    case 'chants':return tipSvg('<g text-anchor="middle">'+Array.from({length:10},(_,i)=>'<text class="tip-text" x="'+(16+i*20)+'" y="22">'+(i+1)+'</text>').join('')+Array.from({length:10},(_,i)=>'<text class="tip-caption" x="'+(16+i*20)+'" y="52" style="fill:#C9A54E">'+'だるまさんがころんだ'[i]+'</text>').join('')+Array.from({length:10},(_,i)=>'<text class="tip-caption" x="'+(16+i*20)+'" y="81" style="fill:#62B8D2">'+'へいたいさんがとおる'[i]+'</text>').join('')+'</g>',true);
    case 'craft':return tipSvg(tipTakasakiDaruma(105,51,.95)+'<defs><clipPath id="takasaki-belly"><ellipse cx="105" cy="54" rx="34" ry="31"/></clipPath></defs><g clip-path="url(#takasaki-belly)"><path d="M78 62C76 67 77 72 80 75M88 64C86 68 86 73 88 76M132 62C134 67 133 72 130 75M122 64C124 68 124 73 122 76" fill="none" stroke="#C9A54E" stroke-width="4.4" stroke-linecap="round"/></g><text x="105" y="77" text-anchor="middle" fill="#F3E8D5" font-family="sans-serif" font-size="17" font-weight="800">福</text>');
    case 'dharma':return tipSvg(d(105,39,.72)+'<text class="tip-text" x="105" y="91" text-anchor="middle" style="font-size:24px;letter-spacing:.04em">dharma</text>',true);
    case 'pigment':return tipSvg(tipTakasakiDaruma(105,51,.95)+'<defs><clipPath id="takasaki-pigment-belly"><ellipse cx="105" cy="54" rx="34" ry="31"/></clipPath></defs><g clip-path="url(#takasaki-pigment-belly)"><path d="M78 62C76 67 77 72 80 75M88 64C86 68 86 73 88 76M132 62C134 67 133 72 130 75M122 64C124 68 124 73 122 76" fill="none" stroke="#C9A54E" stroke-width="4.4" stroke-linecap="round"/></g><text x="105" y="77" text-anchor="middle" fill="#F3E8D5" font-family="sans-serif" font-size="17" font-weight="800">福</text>');
    case 'legend':return tipSvg('<g><path d="M88 58L91 38C87 31 88 15 95 8C101 3 109 3 115 8C122 15 123 31 119 38L122 58Q115 64 105 64Q95 64 88 58Z" fill="#C8352C" stroke="#241D1A" stroke-width="1.7"/><circle cx="105" cy="21" r="10.5" fill="#F3E8D5" stroke="#241D1A" stroke-width="1.7"/><path d="M100 20h3M107 20h3M103 25Q105 27 107 25" fill="none" stroke="#241D1A" stroke-width="1.5" stroke-linecap="round"/><path d="M94 35L105 50L116 35M105 50V60" fill="none" stroke="#C9A54E" stroke-width="2" stroke-linecap="round"/><path d="M89 58C79 62 76 70 83 74C90 78 99 71 105 67C111 71 120 78 127 74C134 70 131 62 121 58C116 61 111 63 105 63C99 63 94 61 89 58Z" fill="#C8352C" stroke="#241D1A" stroke-width="1.7"/><path d="M91 66Q98 70 105 67Q112 70 119 66" fill="none" stroke="#E2897B" stroke-width="2" stroke-linecap="round"/><path d="M99 48Q105 52 111 48" fill="none" stroke="#F3E8D5" stroke-width="3" stroke-linecap="round"/></g>');
    case 'paper':return tipPaperCraftArt();
    case 'market':return tipMarketArt();
    case 'crane':return tipSvg('<g stroke="#292827" stroke-width="1.8" stroke-linejoin="round"><path d="M61 48L22 14L53 31L64 7L70 37L103 17L80 50L61 62Z" fill="#F3E8D5"/><path d="M61 48L22 14L53 31Z" fill="#DDEDF0"/><path d="M61 48L64 7L70 37Z" fill="#FFF9ED"/><path d="M61 48L103 17L80 50Z" fill="#C9DDE2"/><path d="M53 31L70 37L61 48Z" fill="#C9A54E" opacity=".55"/><path d="M80 50L89 29L100 25L93 35L86 52Z" fill="#F3E8D5"/><path d="M99 25L108 27L98 31Z" fill="#C8352C"/><path d="M61 48L40 58L55 58Z" fill="#292827"/><path d="M132 46L158 33L184 46L178 66L151 75L127 62Z" fill="#6E9C78"/><path d="M158 33L161 55L132 46Z" fill="#8FB598"/><path d="M158 33L184 46L161 55Z" fill="#5D8B6A"/><path d="M132 46L161 55L151 75L127 62Z" fill="#79A986"/><path d="M161 55L184 46L178 66L151 75Z" fill="#4F7E60"/><path d="M184 49L199 54L185 61Z" fill="#8FB598"/><circle cx="193" cy="54" r="1.4" fill="#292827" stroke="none"/><path d="M135 45L121 36L127 51ZM132 63L119 72L139 69ZM176 66L187 76L169 72ZM179 45L190 36L185 51Z" fill="#8FB598"/></g>');
    case 'monaka':return tipSvg('<g stroke="#6B4630" stroke-linejoin="round"><path d="M69 66C54 61 48 47 52 31C56 16 68 9 82 9C96 9 108 16 112 31C116 47 110 61 95 66Z" fill="#D9A65F" stroke-width="2"/><path d="M98 66C113 61 119 47 115 31C111 16 99 9 85 9C71 9 59 16 55 31C51 47 57 61 72 66Z" fill="#E8C17D" stroke-width="2"/><path d="M83 12V64" fill="none" stroke="#A77443" stroke-width="1.5"/><path d="M61 39C70 35 79 34 83 34C88 34 98 35 106 39" fill="none" stroke="#A77443" stroke-width="1.5"/><path d="M74 24Q83 18 92 24M74 46Q83 51 92 46" fill="none" stroke="#B27D45" stroke-width="1.6" stroke-linecap="round"/><path d="M126 19C140 18 153 29 154 45C155 60 144 71 130 72C116 73 105 64 104 50C103 36 112 21 126 19Z" fill="#E8C17D" stroke-width="2"/><path d="M126 22C137 21 147 31 148 44C149 56 141 66 130 68C119 70 110 62 109 51C108 39 115 24 126 22Z" fill="#70402C" stroke="none" opacity=".92"/><path d="M126 22C137 21 147 31 148 44C149 56 141 66 130 68C119 70 110 62 109 51C108 39 115 24 126 22Z" fill="none" stroke="#A77443" stroke-width="2"/></g><text x="105" y="82" text-anchor="middle" fill="#E8C17D" font-family="sans-serif" font-size="11" font-weight="800" letter-spacing=".12em">だるま最中</text>');
    case 'redTheory':return tipSvg('<text class="tip-text" x="30" y="28">？</text><text class="tip-text" x="166" y="28">？</text><path class="tip-blue" d="M47 34l22 14M163 34l-22 14"/>'+d(105,54,.68));
    case 'shelfFall':return tipSvg('<path d="M25 22H115V28H25Z" fill="#B77E45" stroke="#6B4630" stroke-width="1.7"/><path d="M35 28v13M105 28v13" stroke="#6B4630" stroke-width="2" stroke-linecap="round"/><path d="M112 34q10 4 15 15M125 29q10 4 15 14" fill="none" stroke="#B9E8F2" stroke-width="2" stroke-linecap="round"/><g transform="translate(143 61) rotate(42) scale(.52)"><use href="#daruma-body"/><use href="#face-open"/></g><path d="M113 79h66M128 75q5 4 10 0M158 75q5 4 10 0" fill="none" stroke="#6B4630" stroke-width="1.5" stroke-linecap="round"/>');
    case 'darumaOtoshi':return tipSvg('<g stroke="#6B4630" stroke-linejoin="round"><rect x="92" y="45" width="30" height="11" rx="1.5" fill="#E5B94B" stroke-width="1.7"/><rect x="92" y="58" width="30" height="11" rx="1.5" fill="#62B8D2" stroke-width="1.7"/><rect x="92" y="71" width="30" height="11" rx="1.5" fill="#D9685B" stroke-width="1.7"/><path d="M94 50h26M94 63h26M94 76h26" stroke="#F3E8D5" stroke-width="1.25" opacity=".72"/><g transform="translate(107 35) scale(.45)"><use href="#daruma-body"/><use href="#face-open"/></g><path d="M45 66L82 63" stroke="#A77443" stroke-width="6" stroke-linecap="round"/><path d="M29 59L53 64L49 74L25 69Z" fill="#B77E45" stroke-width="1.7"/><path d="M80 63l8-1M80 68l8 1" stroke="#B9E8F2" stroke-width="2" stroke-linecap="round"/></g>');
    case 'fuku':return tipSvg(tipTakasakiDaruma(105,51,.95)+'<defs><clipPath id="takasaki-fuku-belly"><ellipse cx="105" cy="54" rx="34" ry="31"/></clipPath></defs><g clip-path="url(#takasaki-fuku-belly)"><path d="M78 62C76 67 77 72 80 75M88 64C86 68 86 73 88 76M132 62C134 67 133 72 130 75M122 64C124 68 124 73 122 76" fill="none" stroke="#C9A54E" stroke-width="4.4" stroke-linecap="round"/></g><text x="105" y="77" text-anchor="middle" fill="#F3E8D5" font-family="sans-serif" font-size="14" font-weight="800">福入</text>');
    case 'theories':return tipSvg('<g transform="translate(105 62) scale(.7)"><use href="#daruma-body"/><use href="#face-shut"/><path d="M-15 22C-8 28 8 28 15 22" fill="none" stroke="#C8352C" stroke-width="4" stroke-linecap="round"/></g><text x="105" y="82" text-anchor="middle" fill="#C9A54E" font-family="sans-serif" font-size="10" font-weight="800">鬼</text>'+d(62,29,.28)+'<g transform="translate(145 36) rotate(-24) translate(-145 -36)">'+d(145,36,.42)+'</g><path d="M161 20l5-3M162 25l6-1" fill="none" stroke="#B9E8F2" stroke-width="1.8" stroke-linecap="round"/>');
    default:return '';
  }
}
function clearBoardSvg(state){return miniBoardSvg(state).replace('viewBox="14 0 293 310"','viewBox="14 20 293 270"');}
function renderClearTip(){
  const text=stageClearText(),art=stageClearArt(),illustration=$('clearTipIllustration');
  const twoMoveLesson=lessonVariantFromArt(art);
  const lessonCopy=$('clearTwoMoveLessonCopy');
  const lessonRule=$('clearTwoMoveLessonRule');
  const clearEntry=isMode('mastery')?clearEntryForCurrent():null;
  const twoMoveCard=clearEntry?clearEntry.twoMoveCard:undefined;
  const guideCard=clearEntry?clearEntry.guideCard:null;
  const rankLink=!!clearEntry&&clearEntry.link==='rank';
  const messagesLink=!!clearEntry&&clearEntry.link==='messages';
  const tipsLink=!!clearEntry&&clearEntry.link==='tips';
  const patternsLink=!!clearEntry&&clearEntry.link==='patterns';
  const detailLink=$('clearTipLink');
  $('clearDialogTextBody').textContent=text;
  $('clearDialogText').hidden=!text;
  detailLink.hidden=twoMoveCard===undefined&&!guideCard&&!rankLink&&!messagesLink&&!tipsLink&&!patternsLink;
  detailLink.dataset.target=rankLink?'rank':messagesLink?'messages':tipsLink?'tips':patternsLink?'patterns':'details';
  detailLink.textContent=tipsLink?tr('tipGuideTitle')+' →':patternsLink?tr('twoMovePatternsLink')+' →':tr(rankLink?'rankLink':messagesLink?'clearMessagesLink':'detailsLink');
  const middleStart=TRAINING_STAGE_START+TRAINING_UPPER_COUNT;
  const middleIndex=!isMode('mastery')&&!isMode('satori')&&stageIndex>=middleStart&&stageIndex<middleStart+TRAINING_MIDDLE_COUNT?stageIndex-middleStart:-1;
  const developmentIndex=!isMode('mastery')&&!isMode('satori')&&stageIndex>=DEVELOPMENT_STAGE_START&&stageIndex<DEVELOPMENT_STAGE_START+DEVELOPMENT_THREE_COUNT?stageIndex-DEVELOPMENT_STAGE_START:-1;
  const shapeState=middleIndex>=0?TRAINING_MIDDLE_CLEAR_SHAPE_STATES[middleIndex]:developmentIndex>=0?DEVELOPMENT_THREE_CLEAR_SHAPE_STATES[developmentIndex]:null;
  const shapeName=shapeState!=null?TWO_MOVE_TIP3_SHAPES[TWO_MOVE_CANONICAL_POSITION.get(canonicalState(shapeState))]:null;
  const showShapeRule=!!shapeName&&TRAINING_SHAPE_RULE_SUPPORTED_SHAPES.has(shapeName);
  $('clearShapeRuleWrap').hidden=!showShapeRule;
  if(showShapeRule){
    clearShapeRuleGuard.reset();
    clearShapeRuleShape=shapeName;
    clearShapeRuleState=shapeState;
    clearShapeRuleIsDevelopment=developmentIndex>=0;
    renderClearShapeRule();
  }
  illustration.classList.toggle('move-graph',art==='moveGraph');
  illustration.classList.toggle('board-card',art.startsWith('twoMoveCard:')||art.startsWith('guideCard:'));
  illustration.classList.toggle('controls-art',art==='controls');
  illustration.classList.toggle('navigation-art',art==='navigation');
  illustration.classList.toggle('menu-art',art==='menuButtons');
  illustration.classList.toggle('rank-badge-art',art==='rankBadgeArt');
  illustration.classList.toggle('unwritten-art',art==='unwritten');
  illustration.classList.toggle('cheer-art',art==='cheer');
  illustration.classList.toggle('intro-guide-art',art==='introGuide');
  illustration.classList.toggle('two-move-lesson-art',!!twoMoveLesson);
  stopClearGuideBoard('clearGuideBoard');
  stopClearGuideBoard('clearTwoMoveLessonBoard');
  replaceRenderedContent(illustration,art==='introGuide'?'<svg id="clearGuideBoard" viewBox="14 0 293 310" aria-hidden="true"></svg>'
    :twoMoveLesson?'<svg id="clearTwoMoveLessonBoard" viewBox="14 0 293 310" aria-hidden="true"></svg>'
    :art?tipArt(art)+(art==='cheer'?'<p class="cheer-caption">'+tr('cheerCaption')+'</p>':''):'');
  if(art==='introGuide')buildClearGuideBoard('clearGuideBoard');
  if(twoMoveLesson)buildTwoMoveLessonBoard('clearTwoMoveLessonBoard',twoMoveLesson);
  illustration.hidden=!art;
  // 上巻5問目は案内文を本文へ統合したため、旧ルール行と重複する実演コピーは出さない。
  const showLessonCopy=!!twoMoveLesson&&art!=='twoMoveLessonTwo';
  lessonCopy.hidden=!showLessonCopy;
  lessonRule.hidden=true;
  if(twoMoveLesson){
    if(showLessonCopy)renderTwoMoveLessonCopy('clearTwoMoveLessonCopy',twoMoveLesson);
    else lessonCopy.replaceChildren();
    // 本文の案内 → 実演 → 具体策、の順で読めるようにする。
    $('clearDialogText').after(illustration);
    if(showLessonCopy)illustration.after(lessonCopy);
  }else{
    // 節目以外のクリアでは、前回の最短2手レッスンを残さない。
    lessonRule.replaceChildren();
    lessonCopy.replaceChildren();
    document.querySelector('#clearDialog .clear-dialog-heading').after(illustration);
  }
}
// メッセージ見直しUIは src/ui/message.js に分離済み。
// 盤面クイズの翻訳データは src/data/board-quiz.js に分離。
function volumeLabel(n){
  const labels={
    ja:['序','破','急'],
    en:['I','II','III','IV'],
    zh:['序','破','急','极'],
    ko:['서','파','급','극']
  };
  return (labels[currentLang]||labels.ja)[n-1]||String(n);
}
function hideGameDialogs(){
  closeChainDialog();
  closeTwoMoveLessonDialog();
  stopClearGuideBoard('clearGuideBoard');
  stopClearGuideBoard('clearTwoMoveLessonBoard');
  stopClearGuideBoard('messageClearGuideBoard');
  stopClearGuideBoard('messageTwoMoveLessonBoard');
  $('clearDialog').hidden=true;
  $('messageDialog').hidden=true;
  messageDialogReturn=null;
  $('optimalFailDialog').hidden=true;
  $('clearQuiz').hidden=true;
  $('boardQuiz').hidden=true;
  $('messageBoardQuiz').hidden=true;
  $('masterDialog').hidden=true;
  $('speedPauseDialog').hidden=true;
  $('speedRestartDialog').hidden=true;
  $('boardThemeDialog').hidden=true;
  $('settingsDialog').hidden=true;
  $('guideHubDialog').hidden=true;
  $('aboutDialog').hidden=true;
  $('rankDialog').hidden=true;
  $('twoMoveDialog').hidden=true;
  $('twoMoveDetailDialog').hidden=true;
  $('tipGuideDialog').hidden=true;
  tipGuideReturnTarget=null;
  twoMovePatternsReturnTarget=null;
  $('clearNext').hidden=true;
}
function renderClearQuiz(){
  const clearEntry=clearEntryForCurrent();
  const quiz=clearEntry&&clearEntry.quiz?resolveLocaleText(clearEntry.quiz):undefined;
  const root=$('clearQuiz');
  root.classList.remove('quiz-success');
  root.hidden=quiz===undefined;
  if(quiz===undefined){root.dataset.quizKey='';return;}
  renderQuizInto({root:'clearQuiz',options:'quizOptions',note:'quizNote',title:'quizTitle',question:'quizQuestion'},quiz);
}
let twoMoveDisplayStates=[],twoMoveDisplayPatterns=[];
const twoMoveGuard=createAnimGuard();
let twoMoveDetailState=null,twoMoveDetailIndex=-1,detailDrag=null;
const twoMoveDetailGuard=createAnimGuard();
const TWO_MOVE_TIP_INDEX=[8,7,6,5,5,4,4,1,2];
const TWO_MOVE_DETAIL_INTROS={
  ja:{
    7:'最初に覚えたい最短2手の盤面です。だるまさんの向きに関係ないので覚えやすい！',
    6:'寝ているだるまさんがひし形にまとまっている場合、対角線同士のだるまさんの向きも確認しよう。',
    5:'寝ているだるまさんがひし形にまとまっている場合、対角線同士のだるまさんの向きも確認しよう。',
    4:'寝ているだるまさんの並びが芋虫の形に見える場合、目玉と体の部分のだるまさんの向きも要確認！',
    3:'寝ているだるまさんの並びが芋虫の形に見える場合、目玉と体の部分のだるまさんの向きも要確認！',
    8:'だるまさんが外側で隣同士で寝ている場合、だるまさんの向きが大事です。',
    0:'寝ているだるまさんがリボン型に並んでいる場合は、同じ向きの三角を除いた2体に注目！',
    2:'寝ているだるまさんが台形型に並んでいる場合は、同じ向きの三角を除いた部分に注目！',
    1:'寝ているだるまさんが台形型に並んでいる場合は、同じ向きの三角を除いた部分に注目！'
  },
  en:{7:'A great first 2-move board to remember: the daruma directions do not matter.'},
  zh:{7:'这是最适合先记住的最少2步棋盘：不倒翁的朝向无关紧要。'},
  ko:{7:'처음 외우기 좋은 최단 2수 판입니다. 다루마의 방향은 상관없어요!'}
};
const miniAngle=value=>value===2?-120:value*120;
const miniTargetAngle=(fromValue,toValue)=>nearestRotationDeg(miniAngle(fromValue),miniAngle(toValue));
function hexVertices(cx,cy){
  const pts=[];
  for(let k=0;k<6;k++){
    const a=Math.PI/180*(90+60*k);
    pts.push({x:cx+R*Math.cos(a),y:cy-R*Math.sin(a)});
  }
  return pts;
}
// 寝ている軸の六角形をつなげ、内側で接する辺(隣同士で共有する辺)を取り除いて外周だけ残す。
function shapeOutlinePath(board){
  const cells=CELL.map((c,i)=>i).filter(i=>board[i]!==0);
  if(!cells.length)return '';
  const key=p=>p.x.toFixed(1)+','+p.y.toFixed(1);
  const edgeList=[];
  cells.forEach(i=>{
    const verts=hexVertices(CELL[i].x,CELL[i].y);
    for(let k=0;k<6;k++)edgeList.push({a:verts[k],b:verts[(k+1)%6]});
  });
  const forwardSet=new Set(edgeList.map(e=>key(e.a)+'|'+key(e.b)));
  const remaining=edgeList.filter(e=>!forwardSet.has(key(e.b)+'|'+key(e.a)));
  let d='';
  while(remaining.length){
    let current=remaining.shift();
    const loop=[current.a,current.b];
    for(;;){
      const idx=remaining.findIndex(e=>key(e.a)===key(current.b));
      if(idx<0)break;
      current=remaining.splice(idx,1)[0];
      loop.push(current.b);
    }
    d+=loop.map((p,i)=>(i===0?'M':'L')+p.x.toFixed(2)+' '+p.y.toFixed(2)).join('')+'Z';
  }
  return d?'<path class="mini-shape-outline" d="'+d+'"/>':'';
}
function miniBoardSvg(state,{outline=false}={}){
  const board=dec(state);
  const tiles=CELL.map((cell,i)=>{
    const fallen=board[i]!==0;
    return '<g class="mini-tile" data-cell="'+i+'" transform="translate('+cell.x+' '+cell.y+')"><g class="mini-daruma" transform="rotate('+miniAngle(board[i])+')">'
      +'<path d="'+hexPath(R)+'" fill="'+(fallen?'#B9C6D6':'#F3E8D5')+'" stroke="'+(fallen?'#718297':'#C9A54E')+'" stroke-width="2"/>'
      +'<use href="#daruma-body"/><use href="#'+(fallen?'face-shut':'face-open')+'"/></g></g>';
  }).join('');
  return '<svg viewBox="14 0 293 310" aria-hidden="true">'+tiles+(outline?shapeOutlinePath(board):'')+'</svg>';
}
function transformIcon(kind){
  const paths={
    rotateBack:'<g transform="rotate(-36 12 12)"><path d="M3 12a9 9 0 1 0 6.22-8.56"/></g><path d="M3 3v6h6"/>',
    rotate:'<g transform="rotate(36 12 12)"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></g><path d="M21 3v6h-6"/>',
    mirror:'<path d="M4 12h16"/><path d="m8 8-4 4 4 4"/><path d="m16 8 4 4-4 4"/>',
    vertical:'<path d="M12 4v16"/><path d="m8 8 4-4 4 4"/><path d="m8 16 4 4 4-4"/>'
  };
  return '<svg class="transform-svg" viewBox="0 0 24 24" aria-hidden="true">'+paths[kind]+'</svg>';
}
function renderBoardQuiz(rootId,config,{requireAnswer=false}={}){
  const root=$(rootId);
  root.classList.remove('quiz-success');
  if(!config){root.hidden=true;if(requireAnswer)$('clearNext').disabled=false;return;}
  // 状態更新や再表示で同じ問題を再描画しても、4つの手数選択肢を再シャッフルしない。
  // 表示中に別順へ入れ替わると、初期順が見えてから動いたように感じられるため。
  const stateKey=config.state?enc(Uint8Array.from(config.state)):config.pattern||config.patterns?.join(',')||'';
  const boardQuizKey=JSON.stringify([config.kind,stateKey,config.questionKey,config.correct,config.patterns,currentLang]);
  if(root.dataset.boardQuizKey===boardQuizKey&&root.childElementCount){root.hidden=false;return;}
  root.dataset.boardQuizKey=boardQuizKey;
  root.hidden=true;
  const copy=BOARD_QUIZ_COPY[currentLang]||BOARD_QUIZ_COPY.ja;
  const state=config.state?enc(Uint8Array.from(config.state)):config.options?null:boardQuizPatternState(config.pattern||config.patterns[0]);
  let {states,correct,question,moveChoiceOrder}=boardQuizPresentation(config,state,copy);
  if(config.kind!=='moves'){
    const order=shuffledIndices(states.length);
    states=order.map(index=>states[index]);
    correct=correct.map(index=>order.indexOf(index));
  }
  const noteKey=config.kind==='moves'?'movesNote':config.topic;
  const detailPatterns=config.patterns||(config.pattern?[config.pattern]:[]);
  const guideLinks=(config.guidePages||[]).map(page=>'<button class="clear-tip-link" id="'+rootId+'Guide'+page+'" type="button" data-guide-page="'+page+'" hidden>'+tr('tipGuideTitle').replace('を見る','')+' '+(page+1)+' / '+GUIDE_TIP_INDEX.length+' →</button>').join('');
  const {boardMarkup,detailLinks}=boardQuizMarkup(config,states,moveChoiceOrder,copy,rootId,detailPatterns);
  const shellTemplate=document.getElementById('boardQuizShellTemplate');
  if(shellTemplate){
    const shell=shellTemplate.content.cloneNode(true);
    shell.querySelector('[data-board-quiz-title]').textContent=copy.title;
    shell.querySelector('[data-board-quiz-question]').textContent=question;
    shell.querySelector('[data-board-quiz-content]').innerHTML=boardMarkup;
    shell.querySelector('[data-board-quiz-links]').innerHTML=detailLinks+guideLinks;
    root.replaceChildren(shell);
  }else{
    root.innerHTML='<div class="quiz-label">'+copy.title+'</div><p class="board-quiz-question">'+question+'</p>'+boardMarkup+'<p class="board-quiz-note"></p>'+detailLinks+guideLinks;
  }
  // 完成した順番のDOMを一度に公開し、旧選択肢が描画される隙間を作らない。
  root.hidden=false;
  const note=root.querySelector('.board-quiz-note');
  let animating=false;
  const updateCard=index=>{
    const button=root.querySelector('[data-board-answer="'+index+'"]');
    if(button&&config.kind!=='moves')button.querySelector('.board-quiz-board').innerHTML=miniBoardSvg(states[index]);
    if(config.kind==='moves')root.querySelector('.board-quiz-single .board-quiz-board').innerHTML=miniBoardSvg(states[0]);
  };
  const animateTransform=(index,kind)=>{
    if(animating)return;
    const transform={
      rotateBack:{permutation:VIEW_ROTATE_MINUS60,flip:false},
      rotate:{permutation:VIEW_ROTATE_60,flip:false},
      mirror:{permutation:VIEW_MIRROR,flip:true},
      vertical:{permutation:VIEW_FLIP_VERTICAL,flip:true}
    }[kind];
    if(!transform)return;
    const symmetry=transform;
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){
      states[index]=transformStateBySymmetry(states[index],symmetry);updateCard(index);return;
    }
    const holder=config.kind==='moves'
      ?root.querySelector('.board-quiz-single')
      :root.querySelector('[data-board-answer="'+index+'"]');
    if(!holder)return;
    const boardVisual=holder.querySelector('.board-quiz-board');
    const boardSvg=boardVisual?.querySelector('svg');
    if(!boardSvg)return;
    animating=true;
    const before=dec(states[index]),after=dec(transformStateBySymmetry(states[index],symmetry));
    const NS_='http://www.w3.org/2000/svg',duration='.48s';
    boardSvg.querySelectorAll('.mini-tile').forEach(tile=>{
      const from=Number(tile.dataset.cell),to=symmetry.permutation[from];
      const move=document.createElementNS(NS_,'animateTransform');
      move.setAttribute('attributeName','transform');move.setAttribute('type','translate');
      move.setAttribute('from',CELL[from].x+' '+CELL[from].y);move.setAttribute('to',CELL[to].x+' '+CELL[to].y);
      move.setAttribute('dur',duration);move.setAttribute('fill','freeze');tile.appendChild(move);
      const daruma=tile.querySelector('.mini-daruma');
      const turn=document.createElementNS(NS_,'animateTransform');
      turn.setAttribute('attributeName','transform');turn.setAttribute('type','rotate');
      turn.setAttribute('from',String(miniAngle(before[from])));turn.setAttribute('to',String(miniTargetAngle(before[from],after[to])));
      turn.setAttribute('dur',duration);turn.setAttribute('fill','freeze');daruma.appendChild(turn);
      move.beginElement();turn.beginElement();
    });
    setTimeout(()=>{
      states[index]=transformStateBySymmetry(states[index],symmetry);
      updateCard(index);animating=false;
    },480);
  };
  root.onclick=event=>{
    const guide=event.target.closest('[data-guide-page]');
    if(guide){
      const dialogId=rootId==='boardQuiz'?'clearDialog':'messageDialog';
      $(dialogId).hidden=true;
      tipGuideReturnTarget={dialogId,focusId:guide.id};
      openTipGuide();
      tipGuideIndex=Number(guide.dataset.guidePage);
      renderTipGuide();
      return;
    }
    const patterns=event.target.closest('[data-board-patterns]');
    if(patterns){
      const pattern=Number(patterns.dataset.boardPattern),state=boardQuizPatternState(pattern),index=TWO_MOVE_PATTERN_ORDER[pattern-1];
      if(rootId==='boardQuiz'){
        $('clearDialog').hidden=true;
        openTwoMovePatterns();
        twoMovePatternsReturnTarget={dialogId:'clearDialog',focusId:patterns.id};
        twoMoveDetailReturnTarget={dialogId:'clearDialog',focusId:patterns.id};
        openTwoMoveDetail(state,index);
      }else{
        $('messageDialog').hidden=true;
        openTwoMovePatterns();
        twoMovePatternsReturnTarget={dialogId:'messageDialog',focusId:patterns.id};
        twoMoveDetailReturnTarget={dialogId:'messageDialog',focusId:patterns.id};
        openTwoMoveDetail(state,index);
      }
      return;
    }
    const transform=event.target.closest('[data-board-transform]');
    if(!transform)return;
    const index=Number(transform.dataset.boardIndex);
    animateTransform(index,transform.dataset.boardTransform);
  };
  bindBoardQuizAnswerEvents(root,{config,correct,states,copy,note,noteKey,requireAnswer,isAnimating:()=>animating});
  if(requireAnswer)$('clearNext').disabled=true;
}
// ===== クリア後フロー・最短2手ギャラリー・名人ダイアログ =====
function masteryBoardSvg(tilted=false,forceStandardColor=false){
  const tiles=CELL.map((cell,i)=>{
    const color=forceStandardColor?'':darumaBodyColor(i);
    return '<g class="tile stand mastery-tile" data-cell="'+i+'" style="'+(color?'--daruma-body:'+color+';':'')+'transform:'+tileTransform(cell.x,cell.y,0)+'">'
    +'<path class="hex" d="'+hexPath(R)+'"/><g class="mastery-daruma-shell"'+(tilted?' transform="rotate(30)"':'')+'><use href="#daruma-body"/><g class="open"><use href="#face-open"/></g><g class="shut"><use href="#face-shut"/></g><g class="happy"><use href="#face-happy"/></g></g></g>';
  }).join('');
  const layout=tilted?'<g transform="rotate(-30 160 155)">'+tiles+'</g>':tiles;
  return '<svg viewBox="14 0 293 310" aria-hidden="true">'+layout+'</svg>';
}
const masteryBoardRuns=new Map();
function animateMasteryBoard(id){
  const board=$(id);
  const run=masteryBoardRuns.get(id);
  const play=()=>{
    if(run!==masteryBoardRuns.get(id)||board.hidden||!board.isConnected)return;
    const tiles=[...board.querySelectorAll('.mastery-tile')];
    if(!tiles.length||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    let remaining=tiles.length;
    tiles.forEach(tile=>{
      const from=Number(tile.dataset.cell),to=VIEW_ROTATE_60[from];
      const middle=rotatePointAroundBoard(CELL[from],30);
      const final=tileTransform(CELL[to].x,CELL[to].y,0);
      const animation=tile.animate([
        {transform:tileTransform(CELL[from].x,CELL[from].y,0)},
        {transform:tileTransform(middle.x,middle.y,0),offset:.5},
        {transform:final}
      ],{duration:680,easing:'cubic-bezier(.2,.72,.2,1)',fill:'forwards'});
      animation.onfinish=()=>{
        if(run!==masteryBoardRuns.get(id))return;
        tile.style.transform=final;tile.dataset.cell=to;
        if(--remaining===0)setUiEffectTimer('mastery-board:'+id,'cycle',play,130);
      };
    });
  };
    setUiEffectTimer('mastery-board:'+id,'cycle',play,180);
}
function renderMasteryBoard(id,show,theme='gold',animate=true){
  const board=$(id);
  clearUiEffectTimers('mastery-board:'+id);
  masteryBoardRuns.set(id,(masteryBoardRuns.get(id)||0)+1);
  board.getAnimations?.({subtree:true}).forEach(animation=>animation.cancel());
  board.classList.toggle('satori-theme',show&&theme.startsWith('satori'));
  board.classList.toggle('tilted-theme',show&&(theme==='satori-tilted'||theme==='gold-3d'));
  board.classList.toggle('pseudo-3d',show&&theme==='gold-3d');
  board.hidden=!show;
  board.innerHTML=show?masteryBoardSvg(theme==='satori-tilted'||theme==='gold-3d',theme==='gold-3d'):'';
  if(show&&animate)animateMasteryBoard(id);
}
function renderTwoMovePatterns(){
  const controls=[['rotateBack','rotateCcw'],['rotate','rotateCw'],['mirror','mirror'],['vertical','flipVertical']];
  const cardTemplate=document.getElementById('two-move-card-template');
  const grid=$('twoMoveGrid');
  if(!cardTemplate){
    grid.innerHTML=twoMoveDisplayStates.map((state,index)=>{
      const buttons=controls.map(([transform,label])=>'<button class="chip" type="button" data-two-move-transform="'+transform+'" aria-label="'+tr(label)+'">'+transformIcon(transform)+'</button>').join('');
      return '<article class="two-move-card" data-state="'+state+'" data-pattern="'+twoMoveDisplayPatterns[index]+'" data-board-index="'+index+'"><div class="two-move-card-tools">'+buttons+'</div><button class="two-move-card-open" type="button">'+miniBoardSvg(state)+'</button></article>';
    }).join('');
    return;
  }
  const fragment=document.createDocumentFragment();
  twoMoveDisplayStates.forEach((state,index)=>{
    const buttonTemplate=document.getElementById('two-move-transform-button-template');
    const card=cardTemplate.content.cloneNode(true).firstElementChild;
    card.dataset.state=String(state);card.dataset.pattern=String(twoMoveDisplayPatterns[index]);card.dataset.boardIndex=String(index);
    const tools=card.querySelector('[data-two-move-tools]');
    controls.forEach(([transform,label])=>{
      const button=buttonTemplate
        ?buttonTemplate.content.cloneNode(true).firstElementChild
        :document.createElement('button');
      if(!buttonTemplate){
        button.className='chip';button.type='button';
        const art=document.createElement('span');art.dataset.transformArt='';art.setAttribute('aria-hidden','true');button.appendChild(art);
      }
      button.dataset.twoMoveTransform=transform;
      button.setAttribute('aria-label',tr(label));
      svgSetIcon(button.querySelector('[data-transform-art]'),transformIcon(transform));
      tools.appendChild(button);
    });
    card.querySelector('[data-two-move-open]').innerHTML=miniBoardSvg(state);
    fragment.appendChild(card);
  });
  grid.replaceChildren(fragment);
}
function openTwoMovePatterns({returnToClear=false}={}){
  returnToClearCard=returnToClear;
  twoMoveDetailReturnTarget=null;
  $('returnToClearDetail').hidden=true;
  $('closeTwoMoveDetail').textContent=tr('backToPatterns');
  twoMoveGuard.reset();
  twoMoveDisplayPatterns=[...TWO_MOVE_PATTERN_ORDER];
  twoMoveDisplayStates=twoMoveDisplayPatterns.map(index=>TWO_MOVE_STAGES[index].state);
  renderTwoMovePatterns();
  $('twoMoveDialog').hidden=false;
  $('closeTwoMovePatterns').focus();
}
function renderTwoMoveDetail(){
  replaceRenderedContent($('twoMoveDetailBoard'),miniBoardSvg(twoMoveDetailState));
  const tips=PLAY_TIPS[currentLang]||PLAY_TIPS.ja;
  const intro=(TWO_MOVE_DETAIL_INTROS[currentLang]||TWO_MOVE_DETAIL_INTROS.ja)[twoMoveDetailIndex]||'';
  $('twoMoveDetailIntro').textContent=intro;
  $('twoMoveDetailIntro').hidden=!intro;
  $('twoMoveDetailTip').textContent=tips[TWO_MOVE_TIP_INDEX[twoMoveDetailIndex]];
  const position=TWO_MOVE_PATTERN_ORDER.indexOf(twoMoveDetailIndex);
  $('twoMoveDetailTitle').textContent=tr('twoMoveDetailTitle')+'　'+(position+1)+' / '+TWO_MOVE_PATTERN_ORDER.length;
  $('twoMoveDetailPrev').textContent='← '+tr('prev');
  $('twoMoveDetailNext').textContent=tr('next')+' →';
  $('twoMoveDetailPrev').disabled=false;
  $('twoMoveDetailNext').disabled=false;
}
function openTwoMoveDetail(state,index){
  twoMoveDetailGuard.reset();
  twoMoveDetailState=state;twoMoveDetailIndex=index;
  renderTwoMoveDetail();
  $('returnToClearDetail').hidden=!returnToClearCard&&!twoMoveDetailReturnTarget;
  $('returnToClearDetail').textContent=tr('backToClear');
  $('twoMoveDialog').hidden=true;
  $('twoMoveDetailDialog').hidden=false;
  $('playTwoMoveFree').focus();
}
function closeTwoMoveDetail(){
  const returnToClear=returnToClearCard;
  $('twoMoveDetailDialog').hidden=true;
  $('returnToClearDetail').hidden=true;
  openTwoMovePatterns({returnToClear});
}
// 盤面回転/反転アニメの共通部分。tile/daruma各1本ずつのanimateTransform(translate+rotate)を
// 組み立ててbeginElementするだけ。ガード管理・reduced-motion判定・確定処理は呼び出し側に残す
// (4箇所で微妙に違う: 要素解決方法・座標テーブル・確定時の処理が異なるため)。
function animateMiniBoardTiles(boardEl,tileSelector,darumaSelector,coord,permutation,before,after){
  const NS_='http://www.w3.org/2000/svg',duration='.48s';
  boardEl.querySelectorAll(tileSelector).forEach(tile=>{
    const from=Number(tile.dataset.cell),to=permutation[from];
    const fromXY=coord(from),toXY=coord(to);
    const move=document.createElementNS(NS_,'animateTransform');
    move.setAttribute('attributeName','transform');move.setAttribute('type','translate');
    move.setAttribute('from',fromXY.x+' '+fromXY.y);move.setAttribute('to',toXY.x+' '+toXY.y);
    move.setAttribute('dur',duration);move.setAttribute('fill','freeze');tile.appendChild(move);
    const daruma=tile.querySelector(darumaSelector);
    const turn=document.createElementNS(NS_,'animateTransform');
    turn.setAttribute('attributeName','transform');turn.setAttribute('type','rotate');
    turn.setAttribute('from',String(miniAngle(before[from])));turn.setAttribute('to',String(miniTargetAngle(before[from],after[to])));
    turn.setAttribute('dur',duration);turn.setAttribute('fill','freeze');daruma.appendChild(turn);
    move.beginElement();turn.beginElement();
  });
}
function animateTwoMoveDetail(angle=0,mirror=false){
  if(twoMoveDetailGuard.isBusy())return;
  const symmetry={permutation:makeBoardPermutation(angle,mirror),flip:mirror};
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){
    twoMoveDetailState=transformStateBySymmetry(twoMoveDetailState,symmetry);renderTwoMoveDetail();return;
  }
  twoMoveDetailGuard.begin();
  const before=dec(twoMoveDetailState),after=dec(transformStateBySymmetry(twoMoveDetailState,symmetry));
  animateMiniBoardTiles($('twoMoveDetailBoard'),'.mini-tile','.mini-daruma',i=>CELL[i],symmetry.permutation,before,after);
  twoMoveDetailGuard.arm(480,()=>{
    twoMoveDetailState=transformStateBySymmetry(twoMoveDetailState,symmetry);
    renderTwoMoveDetail();
  });
}
// だるま修行・中巻と発展クラスの各ステージクリア時、クリアダイアログの中に到達した
// 「あと2くるり」形を大きな条件文つきでそのまま表示する(別ダイアログへのリンクは挟まない)。
// 中巻の3くるり盤面は見た目だけでは形が分からないため、クリア後にここで答え合わせする。
// 「今このアニメはまだ有効か」を守る小さいガード。busy中は新しい操作を弾き、
// タイマー発火時にcommitコールバックを呼んでからbusyを解除する。
function createAnimGuard(){
  let busy=false,timer=0;
  return {
    isBusy:()=>busy,
    begin(){busy=true;},
    cancel(){busy=false;},
    arm(delay,commit){clearTimeout(timer);timer=setTimeout(()=>{commit();busy=false;},delay);},
    reset(){clearTimeout(timer);busy=false;}
  };
}
let clearShapeRuleState=null,clearShapeRuleShape=null,clearShapeRuleIsDevelopment=false;
const clearShapeRuleGuard=createAnimGuard();
function renderClearShapeRule(){
  const shape=clearShapeRuleShape;
  $('clearShapeRuleIntro').textContent=tr(clearShapeRuleIsDevelopment?'developmentShapeRuleIntro':'trainingShapeRuleIntro');
  $('clearShapeRuleName').textContent=tr('twoMoveTip3'+shape+'Name');
  $('clearShapeRuleBoard').innerHTML=miniBoardSvg(clearShapeRuleState,{outline:true});
  // 発展クラスでは、条件の解説エリア(見出し+条件文)ごと出さない。
  $('clearShapeRuleBox').hidden=clearShapeRuleIsDevelopment;
  if(!clearShapeRuleIsDevelopment){
    $('clearShapeRuleHeading').textContent=tr('trainingShapeRuleHeading');
    $('clearShapeRuleCondition').textContent=tr('trainingShapeRule'+shape+'Condition');
  }
}
function transformClearShapeRule(angle=0,mirror=false){
  if(clearShapeRuleGuard.isBusy())return;
  const symmetry={permutation:makeBoardPermutation(angle,mirror),flip:mirror};
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){
    clearShapeRuleState=transformStateBySymmetry(clearShapeRuleState,symmetry);renderClearShapeRule();return;
  }
  clearShapeRuleGuard.begin();
  const before=dec(clearShapeRuleState),after=dec(transformStateBySymmetry(clearShapeRuleState,symmetry));
  $('clearShapeRuleBoard').querySelector('.mini-shape-outline')?.remove();
  animateMiniBoardTiles($('clearShapeRuleBoard'),'.mini-tile','.mini-daruma',i=>CELL[i],symmetry.permutation,before,after);
  clearShapeRuleGuard.arm(480,()=>{
    clearShapeRuleState=transformStateBySymmetry(clearShapeRuleState,symmetry);
    renderClearShapeRule();
  });
}
function startDetailDrag(event){
  if(twoMoveDetailGuard.isBusy()||detailDrag||(event.pointerType==='mouse'&&event.button!==0))return;
  const board=$('twoMoveDetailBoard');
  event.preventDefault();
  detailDrag={id:event.pointerId,board,startX:event.clientX,startY:event.clientY};
  board.setPointerCapture(event.pointerId);
  $('twoMoveDetailDialog').classList.add('comparing');
}
function moveDetailDrag(event){
  if(!detailDrag||event.pointerId!==detailDrag.id)return;
  const dx=event.clientX-detailDrag.startX,dy=event.clientY-detailDrag.startY;
  detailDrag.board.style.transform='translate('+dx+'px,'+dy+'px)';
}
function finishDetailDrag(event,cancel=false){
  if(!detailDrag||(event&&event.pointerId!==detailDrag.id))return;
  const drag=detailDrag;detailDrag=null;
  try{drag.board.releasePointerCapture(drag.id);}catch(_){ }
  drag.board.style.transform='';
  $('twoMoveDetailDialog').classList.remove('comparing');
}
function transformTwoMovePattern(boardIndex,angle=0,mirror=false){
  const symmetry={permutation:makeBoardPermutation(angle,mirror),flip:mirror};
  twoMoveDisplayStates[boardIndex]=transformStateBySymmetry(twoMoveDisplayStates[boardIndex],symmetry);
  renderTwoMovePatterns();
}
function animateTwoMovePattern(boardIndex,angle=0,mirror=false){
  if(twoMoveGuard.isBusy())return;
  const symmetry={permutation:makeBoardPermutation(angle,mirror),flip:mirror};
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){transformTwoMovePattern(boardIndex,angle,mirror);return;}
  twoMoveGuard.begin();
  const card=document.querySelectorAll('.two-move-card')[boardIndex];
  if(!card){twoMoveGuard.cancel();return;}
  const before=dec(twoMoveDisplayStates[boardIndex]);
  const after=dec(transformStateBySymmetry(twoMoveDisplayStates[boardIndex],symmetry));
  animateMiniBoardTiles(card,'.mini-tile','.mini-daruma',i=>CELL[i],symmetry.permutation,before,after);
  twoMoveGuard.arm(480,()=>transformTwoMovePattern(boardIndex,angle,mirror));
}
// 報酬の確定はcommand側へ委譲し、ここは表示内容の組み立てに専念する。
function showMasterDialog(kind='primary'){
  const masterDialog=$('masterDialog');
  // 同じ節目ダイアログを状態更新のために再描画することがあるが、
  // そのたびに称号アニメーションを再開すると「称号が二度出る」ように見える。
  const shouldAnimate=masterDialog.hidden||masterDialogKind!==kind;
  masterDialogKind=kind;
  $('masterStart').dataset.speedVariant='';
  const trialState=masterDialogTrialState(kind);
  const needsMasteryTrial=trialState.mastery;
  const needsIntermediateTrial=trialState.intermediate;
  const dialogVisibility=masterDialogVisibility(kind,needsMasteryTrial);
  grantMasterDialogRewardsCommand(kind);
  if(kind==='mastery'&&!needsMasteryTrial)$('menuAllPatterns').hidden=false;
  const masteryBoardTheme=masterDialogBoardTheme(kind);
  const boardOptions=masterDialogBoardOptions(kind,needsMasteryTrial,masteryBoardTheme);
  renderMasteryBoard('masteryBoard',...boardOptions.mastery);
  renderMasteryBoard('awakeningRewardBoard',...boardOptions.awakening);
  const seal=$('masterSeal');
  const rankText=$('masterRankText');
  const shareButton=$('masterShare');
  const allPatternsLink=$('masterAllPatterns');
  const threeDRewardBox=$('master3DRewardBox');
  const speedUnlockBox=$('masterSpeedUnlockBox');
  const trialFooter=$('masterTrialFooter');
  const finalThanks=$('masterFinalThanks');
  const speedStats=$('masterSpeedStats');
  const speedIntroArt=$('speedIntroArt');
  const speedIntroNote=$('masterSpeedIntroNote');
  const speedModeOptions=$('speedModeOptions');
  const boardNote=$('masterBoardNote');
  finalThanks.hidden=true;
  speedStats.hidden=true;
  speedIntroArt.hidden=true;
  speedIntroNote.hidden=true;
  speedModeOptions.hidden=true;
  $('masterDialogText').hidden=false;
  boardNote.hidden=true;
  shareButton.hidden=dialogVisibility.share;
  allPatternsLink.hidden=true;
  threeDRewardBox.hidden=true;
  speedUnlockBox.hidden=true;
  trialFooter.hidden=true;
  $('masterStart').hidden=dialogVisibility.start;
  shareButton.dataset.shareKind=masterDialogShareKind(kind);
  $('masterShareLabel').textContent=tr('shareShort');
  rankText.hidden=true;
  seal.hidden=false;
  seal.classList.remove('rank-seal','rank-frame-seal','second-lap-mark','rank-index-0','rank-index-1','rank-index-2','rank-index-3','rank-index-4','rank-index-5','rank-index-6');
  seal.classList.toggle('speed-seal',kind==='speedComplete');
  const showRankSeal=(rank,index)=>{
    setSealColor(seal,index);
    seal.classList.add('rank-index-'+index);
    seal.classList.add('rank-seal');
    if(secondLapActive){
      $('masterSealLabel').innerHTML=rankFrameSvg(rank,false,index,true,true);
      seal.classList.add('rank-frame-seal');
    }else $('masterSealLabel').textContent=rank;
  };
  // kindごとの表示内容を、名前付き関数として切り出す(共通の前処理・後処理はこの外側のまま)。
  const kindRenderers={
    primary(){
      const needsTrial=!secondLapActive&&!speedTrainingTrialCleared;
      $('masterDialogTitle').textContent=needsTrial?tr('primaryTrialTitle'):tr('academyCompleteTitle');
      if(needsTrial)shareButton.hidden=true;
      if(needsTrial){
        // まだ称号は渡さない。速解きモードと同じ印を、卒業試験の目印にする。
        seal.hidden=true;
        speedIntroArt.hidden=false;
        $('masterStart').dataset.speedVariant='training9';
        trialFooter.textContent=tr('primaryTrialFooter');
        trialFooter.hidden=false;
      }else showRankSeal(masterPath().ranks[0],0);
      rankText.hidden=needsTrial;
      rankText.textContent=needsTrial?'':rankEarnedText(masterPath().ranks[0]);
      $('masterDialogText').textContent=needsTrial?tr('primaryTrialText'):tr('academyCompleteText');
      if(needsTrial){
        speedIntroNote.textContent=tr('primaryTrialNote');
        speedIntroNote.hidden=false;
      }
      $('masterStart').textContent=needsTrial?tr('primaryTrialStart'):tr('academyCompleteStart');
    },
    pathInfo(){
      $('masterSealLabel').textContent='道';
      $('masterDialogTitle').textContent=tr('pathInfoTitle');
      $('masterDialogText').textContent=tr('pathInfoText');
      $('masterStart').textContent=tr('pathInfoStart');
    },
    volume(){
      const volume=Math.ceil((extraIndex+1)/MASTER_VOLUME_SIZE);
      const rank=rankForVolume(volume);
      showRankSeal(rank,volume+1);
      const clearName=currentLang==='ja'?'名人への道・'+volumeLabel(volume)+'　'+masterSubtitle(volume):volumeLabel(volume)+'　'+masterSubtitle(volume);
      $('masterDialogTitle').textContent=needsIntermediateTrial?tr('intermediateTrialTitle'):tr('volumeClearTitle',{n:clearName});
      const nextRules={ja:['「破」からは、ヒントが使えなくなります。','「急」では途中から最短4手の問題です。\nスワイプ中は残り最短手数が「？」になります。','「極」では残り最短手数が表示されません。\nかわりに回数限定で「残り手数」のボタンが使えますが、これも途中から使用回数が減っていきます。'],en:['Hints are unavailable from Volume 2.','Volume 3 introduces four-move puzzles.\nMoves left are hidden while swiping.','Volume 4 hides moves left.\nThe Moves Left button has limited uses, with fewer available later.']}[currentLang]||[];
      const nextRule=needsIntermediateTrial?tr('intermediateTrialText'):(nextRules[volume-1]||tr('volumeClearText'));
      if(needsIntermediateTrial){
        seal.hidden=true;
        speedIntroArt.hidden=false;
        rankText.hidden=true;
        speedIntroNote.textContent=tr('intermediateTrialNote');
        speedIntroNote.hidden=false;
        $('masterStart').dataset.speedVariant='training18';
      }else{
        rankText.hidden=false;
        rankText.textContent=rankEarnedText(rank);
      }
      $('masterDialogText').textContent=nextRule;
      $('masterStart').textContent=needsIntermediateTrial?tr('intermediateTrialStart'):(currentLang==='ja'?'名人への道・'+volumeLabel(volume+1)+'　'+masterSubtitle(volume+1)+'へ →':tr('volumeStart'));
    },
    intermediate(){
      if(needsIntermediateTrial){
        seal.hidden=true;
        speedIntroArt.hidden=false;
        $('masterDialogTitle').textContent=tr('intermediateTrialTitle');
        $('masterDialogText').textContent=tr('intermediateTrialText');
        speedIntroNote.textContent=tr('intermediateTrialNote');
        speedIntroNote.hidden=false;
        $('masterStart').dataset.speedVariant='training18';
        $('masterStart').textContent=tr('intermediateTrialStart');
      }else{
        showRankSeal(masterPath().ranks[1],1);
        $('masterDialogTitle').textContent=tr('trainingCompleteTitle');
        rankText.hidden=false;rankText.textContent=rankEarnedText(masterPath().ranks[1]);
        $('masterDialogText').textContent=tr('trainingCompleteText');
        $('masterStart').textContent=tr('trainingCompleteStart');
      }
    },
    satori(){
      $('masterSealLabel').innerHTML=rankFrameSvg(tr('satoriRank'),false,5);setSealColor(seal,5);seal.classList.add('rank-index-5');
      seal.classList.add('rank-seal','rank-frame-seal');
      $('masterDialogTitle').textContent=tr('satoriTitle');
      rankText.hidden=false;rankText.textContent=rankEarnedText(tr('satoriRank'));
      $('masterDialogText').textContent=tr('satoriText');
      $('masterStart').textContent=tr('satoriStart');
      if(!secondLapActive){
        $('masterSpeedUnlockText').textContent=tr('speedSatoriUnlockText');
        $('masterSpeedUnlockStart').textContent=tr('speedSatoriUnlockStart');
        speedUnlockBox.hidden=false;
      }
    },
    secondLapIntro(){
      seal.hidden=false;
      seal.classList.add('second-lap-mark');
      $('masterSealLabel').textContent=secondLapMark();
      $('masterDialogTitle').textContent=tr('secondLapTitle');
      $('masterDialogText').textContent=tr('secondLapText');
      $('masterStart').textContent=tr('secondLapStart');
    },
    awakening(){
      $('masterSealLabel').innerHTML=rankFrameSvg(tr('awakenedRank'),false,6);setSealColor(seal,6);seal.classList.add('rank-index-6');
      seal.classList.add('rank-seal','rank-frame-seal');
      $('masterDialogTitle').textContent=tr('awakenedTitle');
      rankText.hidden=false;rankText.textContent=rankEarnedText(tr('awakenedRank'));
      $('masterDialogText').textContent=tr('satoriThanks');
      $('masterStart').textContent=tr('close');
      $('master3DReward').textContent=tr('threeDUnlockedText');
      threeDRewardBox.hidden=false;
    },
    speedIntro(){
      seal.hidden=true;
      $('masterDialogTitle').textContent=tr('speedTitle');
      speedIntroArt.hidden=false;
      if(!speedVariantUnlocked(speedVariant))speedVariant=preferredSpeedVariant();
      const showSpeedTabs=unlockedSpeedVariants().length>1;
      $('masterDialogText').textContent=speedVariantCopy(speedVariant).intro;
      $('masterDialogText').hidden=showSpeedTabs;
      renderSpeedModeOptions();
      renderMasterSpeedStats();
      speedStats.hidden=false;
      $('masterStart').textContent=readSpeedSession()?tr('speedResume'):tr('speedStart');
    },
    speedTrialFailed(){
      const failedVariant=['training9','training18','mastery27'].includes(speedSession?.requiredTrial)?speedSession.requiredTrial:'training9';
      seal.hidden=true;speedIntroArt.hidden=false;
      $('masterDialogTitle').textContent=tr('speedTrialFailTitle');
      $('masterDialogText').textContent=tr(failedVariant==='training9'?'speedTrainingTrialFailText':failedVariant==='training18'?'speedIntermediateTrialFailText':'speedMasteryTrialFailText');
      $('masterStart').textContent=tr('speedTrialRetry');
      renderMasterSpeedStats();
      speedStats.hidden=false;
    },
    speedComplete(){
      seal.hidden=false;$('masterSealLabel').innerHTML=speedSealSvg();setSealColor(seal,3);
      $('masterDialogTitle').textContent=tr('speedCompleteTitle');
      $('masterDialogText').textContent=tr('speedComplete',{time:formatSpeedTime(speedSession.elapsedMs),optimal:speedOptimalClears(),total:speedSession.total||activeSpeedDefinition().total,attempt:tr('speedStatsAttempt',{n:speedSession.runNumber||1}),best:formatSpeedTime(speedSession.bestMs)});
      renderMasterSpeedStats();
      speedStats.hidden=false;
      if(speedSession.unlockedThreeD){
        $('master3DReward').textContent=tr('threeDUnlockedText');
        threeDRewardBox.hidden=false;
      }
      $('masterStart').textContent=tr('speedRetry');
    },
    satoriIntro(){
      $('masterSealLabel').innerHTML=satoriSealSvg();
      $('masterDialogTitle').textContent=tr('satoriIntroTitle');
      $('masterDialogText').textContent=tr('satoriIntroText');
      $('masterStart').textContent=tr('satoriIntroStart');
    },
    mastery(){
      if(needsMasteryTrial){
        // 急のクリア時点ではまだ「名人」を授与しない。修了試験（速解き27）
        // を完走した後に、改めて制覇ダイアログで称号を表示する。
        seal.hidden=true;
        speedIntroArt.hidden=false;
        $('masterDialogTitle').textContent=tr('masteryTrialTitle');
        $('masterDialogText').textContent=tr('masteryTrialText');
        speedIntroNote.textContent=tr('masteryTrialNote');
        speedIntroNote.hidden=false;
        rankText.hidden=true;
        $('masterStart').dataset.speedVariant='mastery27';
        $('masterStart').textContent=tr('masteryTrialStart');
      }else{
        showRankSeal(masterPath().ranks[4],4);
        $('masterDialogTitle').textContent=secondLapActive?tr('secondMasteryTitle'):tr('masteryTitle');
        rankText.hidden=false;rankText.textContent=rankEarnedText(masterPath().ranks[4]);
        $('masterDialogText').textContent=secondLapActive?tr('secondMasteryReward'):tr('masteryText');
        boardNote.hidden=secondLapActive;
        if(!secondLapActive)boardNote.textContent=tr('masteryBoardNote');
        $('masterStart').textContent=tr('satoriStart');
      }
    },
  };
  (kindRenderers[kind]||kindRenderers.mastery)();
  seal.tabIndex=seal.classList.contains('rank-seal')?0:-1;
  renderMasterRoadmap(kind);
  masterDialog.hidden=false;
  if(!shouldAnimate){
    seal.classList.remove('animate');
    return;
  }
  seal.classList.remove('animate');
  void seal.offsetWidth;
  seal.classList.add('animate');
}
function returnToStageMode(){
  if(busy)return;
  if(isMode('free'))leaveFreeMode();
  else if(lastStageMode.satori)loadSatoriStage(lastStageMode.index);
  else if(lastStageMode.extra)loadExtraStage(lastStageMode.index);
  else loadStage(lastStageMode.index);
}
function moveTwoMoveDetail(direction){
  if(twoMoveDetailGuard.isBusy())return;
  const position=TWO_MOVE_PATTERN_ORDER.indexOf(twoMoveDetailIndex);
  const nextPosition=(position+direction+TWO_MOVE_PATTERN_ORDER.length)%TWO_MOVE_PATTERN_ORDER.length;
  twoMoveDetailIndex=TWO_MOVE_PATTERN_ORDER[nextPosition];
  twoMoveDetailState=TWO_MOVE_STAGES[twoMoveDetailIndex].state;
  renderTwoMoveDetail();
}

// 公開native moduleの構文境界。
export {};
