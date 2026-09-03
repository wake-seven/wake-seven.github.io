// ===== スピードラン(速解き)ランタイム =====
/* 速解きは同じセッション基盤で派生ルールを増やせるよう、モード定義を分離する。 */
// ===== スピードラン(速解き)モード =====
const SPEED_MODE_DEFINITIONS=PROGRESSION.speedModes;
let speedVariant='standard';
// 速解き画面の骨格は固定なので、静的DOM参照を画面単位でまとめて再利用する。
let speedUiRefs=null;
function getSpeedUiRefs(){
  return speedUiRefs??=createRefs([
    'speedModeOptionsList','masterStart','speedModeOptionsDetail','speedModeOptionsScope','speedModeOptions',
    'speedPauseDialog','speedPauseProgress','speedPauseStats','speedPauseStatsSummary','speedPauseStatsTitle','speedPauseStatsList',
    'masterSpeedStatsSummary','masterSpeedStatsTitle','masterSpeedStatsList'
  ]);
}
function activeSpeedDefinition(){return SPEED_MODE_DEFINITIONS[speedVariant]||SPEED_MODE_DEFINITIONS.standard;}
const speedShowsRemaining=()=>isMode('speed')&&activeSpeedDefinition().showsRemaining;
const speedAllowsUndo=()=>isMode('speed')&&activeSpeedDefinition().allowsUndo;
function speedStagePool(definition=activeSpeedDefinition()){
  if(definition.source==='twoMove')return SATORI_STAGES.filter(stage=>stage.par===2).slice(0,definition.total);
  if(definition.source==='training')return TRAINING_EXAM_STAGES;
  if(definition.source==='mastery')return EXTRA_STAGES;
  if(definition.source==='threeMove')return SATORI_STAGES.filter(stage=>stage.par===3);
  // 「全部から」の派生版も、同じ正規化済みの全パターンを母集団にする。
  return SATORI_STAGES;
}
function speedVariantUnlocked(id){
  return PROGRESSION.speedUnlocked(id,{
    speedTraining:speedTrainingUnlocked,speedIntermediate:speedIntermediateUnlocked,
    speedMastery:speedMasteryUnlocked,speedSatori:speedSatoriUnlocked
  });
}
const SPEED_VARIANT_ORDER=PROGRESSION.publicSpeedIds;
function speedVariantCopy(id){
  const definition=SPEED_MODE_DEFINITIONS[id];
  return {label:tr(definition.labelKey),intro:tr(definition.introKey),definition};
}
function speedTabLabel(id){
  const definition=SPEED_MODE_DEFINITIONS[id];
  return currentLang==='ja'?(definition?.jaLabel||definition?.total+'番'):String(definition?.total||'');
}
function preferredSpeedVariant(){
  const available=SPEED_VARIANT_ORDER.filter(speedVariantUnlocked);
  const newlyUnlocked=storage.get(SPEED_NEW_TAB_STORAGE_KEY);
  if(available.includes(newlyUnlocked)){
    storage.remove(SPEED_NEW_TAB_STORAGE_KEY);
    return newlyUnlocked;
  }
  const lastTab=storage.get(SPEED_LAST_TAB_STORAGE_KEY);
  if(available.includes(lastTab))return lastTab;
  return available.includes(speedVariant)?speedVariant:(available[0]||'training9');
}
const unlockedSpeedVariants=()=>SPEED_VARIANT_ORDER.filter(speedVariantUnlocked);
function renderSpeedModeOptions(){
  const refs=getSpeedUiRefs(),list=refs.speedModeOptionsList;
  if(!list)return;
  while(list.firstChild)list.removeChild(list.firstChild);
  const available=unlockedSpeedVariants();
  list.style.gridTemplateColumns='repeat('+Math.max(1,available.length)+',minmax(0,1fr))';
  available.forEach(id=>{
    const copy=speedVariantCopy(id),template=document.getElementById('speedModeTabTemplate'),button=template?template.content.cloneNode(true).firstElementChild:document.createElement('button');
    button.type='button';button.className='speed-mode-tab'+(id===speedVariant?' selected':'');
    button.dataset.speedVariant=id;
    button.setAttribute('role','tab');
    button.setAttribute('aria-selected',String(id===speedVariant));
    button.textContent=speedTabLabel(id);
    button.addEventListener('click',()=>{
       setSpeedVariantCommand(id);
      storage.set(SPEED_LAST_TAB_STORAGE_KEY,id);
      renderSpeedModeOptions();
      renderMasterSpeedStats();
      setText(refs.masterStart,readSpeedSession()?tr('speedResume'):tr('speedStart'));
    });
    list.appendChild(button);
  });
  const copy=speedVariantCopy(speedVariant);
  const [introMain,...introRest]=copy.intro.split('\n');
  setText(refs.speedModeOptionsDetail,introMain);
  setText(refs.speedModeOptionsScope,introRest.join('\n'));
  setVisible(refs.speedModeOptionsScope,!!introRest.length);
  setVisible(refs.speedModeOptions,available.length>1);
}
function openSpeedPicker(){
  if(!DEBUG_MODE&&!featureUnlocked('speedRun'))return;
  // 実行中の速解きから開始選択へ戻さない。問題切替や再描画で
  // 同じ入口が再度呼ばれても、開始ダイアログを一瞬表示しない。
  if(isMode('speed')&&(speedSession?.started||Number(speedSession?.index)>0))return;
  setSpeedVariantCommand(preferredSpeedVariant());
  storage.set(SPEED_LAST_TAB_STORAGE_KEY,speedVariant);
  showMasterDialog('speedIntro');
}
const SPEED_SESSION_KEY=STORAGE_KEY_GROUPS.speed.session;
const SPEED_BEST_KEY=STORAGE_KEY_GROUPS.speed.bestMs;
const SPEED_HISTORY_KEY=STORAGE_KEY_GROUPS.speed.history;
function speedStorageKey(base,variant=speedVariant){return variant==='standard'?base:base+'-'+variant;}
function speedSessionStorageKey(variant=speedVariant){return speedStorageKey(SPEED_SESSION_KEY,variant);}
function speedBestStorageKey(variant=speedVariant){return speedStorageKey(SPEED_BEST_KEY,variant);}
function speedHistoryStorageKey(variant=speedVariant){return speedStorageKey(SPEED_HISTORY_KEY,variant);}
// 速解きの開始・終了で使う共有状態を、入口ごとに一度だけ取得する。
// セッション保存や画面遷移の途中でactiveLap/variantを読み直さないための境界。
function createSpeedTransitionContext(){
  const navigation=readNavigationContext();
  const session=WakeSevenAppContext.state.session.read();
  return Object.freeze({navigation,session,speedVariant:session.speedVariant||speedVariant,returnMode:navigation.lastStageMode||navigation.mode});
}
let speedSession=null,speedClockStarted=0,speedManuallyPaused=false;
function shuffleCopy(values){
  const result=[...values];
  for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
}
function makeSpeedOrder(variant=activeSpeedDefinition().id){
  const definition=SPEED_MODE_DEFINITIONS[variant]||SPEED_MODE_DEFINITIONS.standard;
  const pool=speedStagePool(definition),total=definition.total||pool.length;
  if(definition.order==='shuffle')return shuffleCopy(Array.from({length:pool.length},(_,i)=>i)).slice(0,total);
  if(definition.order==='sample')return shuffleCopy(Array.from({length:pool.length},(_,i)=>i)).slice(0,total);
  // 1手問題は先頭、2手問題はひとまとまり。以降は難易度の流れを保ちつつ5問ごとに入れ替える。
  const order=[0,...shuffleCopy(Array.from({length:Math.min(9,pool.length-1)},(_,i)=>i+1))];
  for(let start=10;start<pool.length;start+=5){
    order.push(...shuffleCopy(Array.from({length:Math.min(5,pool.length-start)},(_,i)=>start+i)));
  }
  return order.slice(0,total);
}
function validSpeedSession(data){
  const definition=SPEED_MODE_DEFINITIONS[data?.variant]||SPEED_MODE_DEFINITIONS.standard;
  const total=Number.isInteger(data?.total)?data.total:definition.total;
  return data&&Array.isArray(data.order)&&data.order.length===total
    &&new Set(data.order).size===total
    &&data.order.every(i=>Number.isInteger(i)&&i>=0&&i<speedStagePool(definition).length)
    &&Number.isInteger(data.index)&&data.index>=0&&data.index<total
    &&Number.isFinite(data.elapsedMs)&&data.elapsedMs>=0&&!data.completed;
}
function speedOptimalClears(session=speedSession){return Math.max(0,Math.min(Number(session?.total)||SATORI_STAGES.length,Number(session?.optimalClears)||0));}
function readSpeedHistory(){
  const entries=storage.json(speedHistoryStorageKey(),[]);
  return Array.isArray(entries)?entries.filter(entry=>Number.isFinite(entry?.elapsedMs)&&entry.elapsedMs>=0).slice(0,20):[];
}
function readSpeedSession(variant=speedVariant){
  const data=storage.json(speedSessionStorageKey(variant),null);
  if(!validSpeedSession(data))return null;
  if(!SPEED_MODE_DEFINITIONS[data.variant])data.variant='standard';
  return data;
}
function readActiveSpeedSession(){
  const lastVariant=storage.get(STORAGE_KEY_GROUPS.speed.activeVariant,'');
  if(SPEED_MODE_DEFINITIONS[lastVariant]){
    const saved=readSpeedSession(lastVariant);
    if(saved)return saved;
  }
  // 旧保存形式との互換用。最後に見つかった未完走セッションを復帰候補にする。
  for(const variant of Object.keys(SPEED_MODE_DEFINITIONS)){
    const saved=readSpeedSession(variant);
    if(saved)return saved;
  }
  return null;
}
function speedElapsedMs(){return (speedSession?.elapsedMs||0)+(speedClockStarted?performance.now()-speedClockStarted:0);}
function formatSpeedTime(ms){
  const tenths=Math.floor(ms/100),minutes=Math.floor(tenths/600),seconds=Math.floor(tenths/10)%60;
  return String(minutes).padStart(2,'0')+':'+String(seconds).padStart(2,'0')+'.'+(tenths%10);
}
function formatSpeedClock(ms){
  const totalSeconds=Math.floor(ms/1000),minutes=Math.floor(totalSeconds/60),seconds=totalSeconds%60;
  return String(minutes).padStart(2,'0')+':'+String(seconds).padStart(2,'0');
}
let speedViewRefs=null;
function renderSpeedClock(model={}){
  if(!isMode('speed')&&!model.force)return;
  const elapsed=Number.isFinite(model.elapsedMs)?model.elapsedMs:speedElapsedMs();
  const text=formatSpeedClock(elapsed);
  speedViewRefs??=createRefs(['speedClockValue']);
  setText(speedViewRefs.speedClockValue,text);
}
function startSpeedClock(){
  if(!isMode('speed')||speedManuallyPaused||speedClockStarted||document.visibilityState==='hidden'||speedAwaitingStart())return;
  startSpeedClockStateCommand(performance.now());setUiEffectInterval('speed-clock','render',renderSpeedClock,100);renderSpeedClock();
}
function pauseSpeedClock(){
  pauseSpeedClockStateCommand();
  clearUiEffectTimers('speed-clock');renderSpeedClock();
}
// 速解きセッションの永続化境界。経過時間と現在盤面をここで保存する。
function persistSpeedSession(){
  persistSpeedSessionCommand();
}
function clearSpeedSession(variant=speedVariant){clearSpeedSessionCommand(variant);}
function pauseSpeedRun(){if(!isMode('speed'))return;pauseSpeedClock();persistSpeedSession();}
function openSpeedPauseDialog(){
  if(!isMode('speed'))return;
  setSpeedManualPauseCommand(true);
  pauseSpeedClock();persistSpeedSession();
  renderSpeedPauseStats();
  setVisible(getSpeedUiRefs().speedPauseDialog,true);
  persistDialogState();
}
function rotateSpeedSnapshot(data){
  if(!validSavedBoard(data))return data;
  const position=transformPosition(Uint8Array.from(data.o),Int16Array.from(data.s),data.t.map(index=>baseTiles[index]),SPEED_BOARD_VIEW.permutation,false);
  return {...data,
    o:[...position.o],s:[...position.s],t:position.t.map(tile=>baseTiles.indexOf(tile)),
    initialState:Number.isInteger(data.initialState)?transformStateCode(data.initialState,SPEED_BOARD_VIEW.permutation,false):data.initialState,
    history:(Array.isArray(data.history)?data.history:[]).filter(validSavedBoard).map(rotateSpeedSnapshot)
  };
}
function ensureSpeedBoardView(session){
  if(session.view==='left60')return session;
  session.board=rotateSpeedSnapshot(session.board);
  session.view='left60';
  return session;
}
function randomTrainingSpeedView(){
  // 九番勝負は同じ9パターンでも、出題ごとに6方向×表裏を変える。
  // 対称変換なので最短手数は保ったまま、暗記ではなく盤面の読み取りを問える。
  return SYMMETRIES[Math.floor(Math.random()*SYMMETRIES.length)];
}
function pendingSpeedTrial(variant=activeSpeedDefinition().id,navigation=readNavigationContext()){
  // 卒業試験は一周目だけ。二周目は各コースをそのまま進める。
  if(navigation.lap===2)return null;
  if(variant==='training9'&&!speedTrainingTrialCleared)return 'training9';
  if(variant==='training18'&&!speedIntermediateTrialCleared)return 'training18';
  if(variant==='mastery27'&&!speedMasteryTrialCleared)return 'mastery27';
  return null;
}
function newSpeedSession(){const definition=activeSpeedDefinition();return {version:5,variant:definition.id,total:definition.total,view:'left60',order:makeSpeedOrder(definition.id),index:0,elapsedMs:0,board:null,completed:false,optimalClears:0,started:false,requiredTrial:pendingSpeedTrial(definition.id)};}
// 1問目を始める前だけ、タイマーを止めた「スタート待ち」の状態にする。
function speedAwaitingStart(){
  return !!(isMode('speed')&&speedSession&&!speedSession.started&&speedSession.index===0&&!speedSession.movedCurrent);
}
// 問題が切り替わった時に、盤面が中央から広がって現れる演出。速解きモード専用だったが、
// 通常モード（次へ・ステージ選択・フリー等）の問題開始時にも共通で使う。
function animateBoardArrival(){
  clearUiEffectTimers('board-arrival');
  svg.classList.add('arriving');
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){
    svg.classList.remove('arriving');
    return;
  }
  const center=CELL[3];
  tileEls.forEach((tile,index)=>{
    const end=tile.style.transform;
    const turn=spin[index]*120;
    tile.animate([
      {transform:'translate('+center.x+'px,'+center.y+'px) rotate('+turn+'deg) scale(.42)',opacity:0},
      {transform:'translate('+center.x+'px,'+center.y+'px) rotate('+turn+'deg) scale(.64)',opacity:.72,offset:.48},
      {transform:end,opacity:1}
    ],{duration:430,delay:index*32,easing:'cubic-bezier(.18,.8,.2,1)',fill:'backwards'});
  });
  setUiEffectTimer('board-arrival','remove',()=>svg.classList.remove('arriving'),560);
}
function loadSpeedStage(restoreBoard=false,arriving=false){
  if(!speedSession)return;
  const sessionContext=WakeSevenAppContext.state.session.read();
  const currentVariant=sessionContext.speedVariant||speedVariant;
  if(speedSession.index>0)speedSession.started=true;
  setSpeedManualPauseCommand(false);
  setCampaignModeCommand('speed');editingBoard=false;
  const pool=speedStagePool(activeSpeedDefinition());
  if(!speedSession.started&&speedSession.index===0&&!speedSession.movedCurrent){
    // スタート前は問題を見せず、全員が起きたまっさらな盤面で開始を促す。
    setPosition(0,0);
    renderStageNav();
    persistSpeedSession();persistActiveSession();
    return;
  }
  const stage=pool[speedSession.order[speedSession.index]];
  const view=currentVariant==='training9'?randomTrainingSpeedView():SPEED_BOARD_VIEW;
  setPosition(transformStateBySymmetry(stage.state,view),stage.par);
  if(restoreBoard&&validSavedBoard(speedSession.board)){
    restoreSavedBoard(speedSession.board);
    // クリア演出中に閉じた場合は、同じ問題を重ねて出さず次へ進める。
    if(isSolved()){setClearShownCommand(false);WakeSevenProgressionCommands.advanceSpeedRun();return;}
  }
  renderStageNav();
  if(arriving)animateBoardArrival();
  persistSpeedSession();persistActiveSession();startSpeedClock();
}
function enterSpeedMode(forceNew=false){
  pauseSpeedRun();
  const transitionContext=createSpeedTransitionContext();
  const requestedVariant=transitionContext.speedVariant;
  const saved=forceNew?null:readSpeedSession();
  const isNew=forceNew||!saved;
  setSpeedVariantCommand(saved?.variant&&SPEED_MODE_DEFINITIONS[saved.variant]?saved.variant:requestedVariant);
  setSpeedSessionCommand(saved||newSpeedSession());
  ensureSpeedBoardView(speedSession);
  loadSpeedStage(!isNew,isNew);
}
function beginSpeedRun(){
  if(!isMode('speed')||!speedSession||speedSession.started)return;
  startSpeedSessionCommand();
  loadSpeedStage(false,true);
}
function finishSpeedRun(){
  pauseSpeedClock();
  const transitionContext=createSpeedTransitionContext();
  const {navigation,session:sessionContext}=transitionContext;
  // セッションを保存・削除する前に、卒業試験として起動されたかを確定する。
  const trialVariant=(speedSession?.requiredTrial===true?'training9':speedSession?.requiredTrial)
    ||pendingSpeedTrial(speedSession?.variant||sessionContext.speedVariant||speedVariant,navigation);
  const elapsed=Math.round(speedSession.elapsedMs);
  const optimalClears=speedOptimalClears();
  const record=recordSpeedCompletionCommand(elapsed,optimalClears);
  if(!record)return;
  const {bestTime,history}=record;
  // 速解き自体の完走では報酬を付けない。3Dページは二周目制覇の報酬。
  if(trialVariant){
    // 卒業試験は、最短手数を問わず全問を完走すれば合格。
    grantSpeedTrialCleared(trialVariant);
    if(trialVariant==='training9')rememberSpecialMessage('primary');
    else if(trialVariant==='training18')rememberSpecialMessage('volume');
    else if(trialVariant==='mastery27'){grantMasterReward();rememberSpecialMessage('mastery');}
    setActiveMode('stage');
    // 合格後は元コースの最終盤面を再ロードせず、節目ダイアログへ直接合流する。
    // 先に下巻などをロードすると、描画更新でダイアログが閉じたまま残る経路がある。
    showMasterDialog(trialVariant==='training9'?'primary':trialVariant==='training18'?'intermediate':'mastery');
  }else showMasterDialog('speedComplete');
}
function speedStatsData(){
  const history=readSpeedHistory();
  const storedBest=Number(storage.get(speedBestStorageKey(),'0'))||0;
  const best=storedBest||(history.length?Math.min(...history.map(entry=>entry.elapsedMs)):0);
  const total=speedSession?.total||activeSpeedDefinition().total;
  const optimal=history.reduce((max,entry)=>Math.max(max,Math.max(0,Math.min(total,Number(entry.optimalClears)||0))),0);
  return {history,best,optimal};
}
function renderSpeedStatsList(list,history){
  while(list.firstChild)list.removeChild(list.firstChild);
  if(!history.length){const template=document.getElementById('speedStatsEmptyTemplate'),empty=template?template.content.cloneNode(true).firstElementChild:document.createElement('p');empty.textContent=tr('speedStatsEmpty');list.appendChild(empty);return;}
  [...history].sort((a,b)=>a.elapsedMs-b.elapsedMs).slice(0,3).forEach((entry,index)=>{
    const rank=index+1,optimalClears=Math.max(0,Math.min(Number(entry.total)||activeSpeedDefinition().total,Number(entry.optimalClears)||0)),runNumber=history.length-history.indexOf(entry);
    const template=document.getElementById('speedStatsRowTemplate'),row=template?template.content.cloneNode(true).firstElementChild:document.createElement('div');
    row.dataset.rank=rank;const medal=row.querySelector('.speed-result-medal'),number=row.querySelector('.speed-result-medal span');medal.setAttribute('aria-label',tr('speedStatsPlace',{n:rank}));number.textContent=rank;row.querySelector('.speed-result-time').textContent=formatSpeedTime(entry.elapsedMs);row.querySelector('.speed-result-note').textContent=tr('speedStatsOptimal',{optimal:optimalClears})+' '+tr('speedStatsAttempt',{n:runNumber});list.appendChild(row);
  });
}
function renderSpeedPauseStats(){
  const {history,best,optimal}=speedStatsData();
  const refs=getSpeedUiRefs();
  setText(refs.speedPauseProgress,tr('speedPauseProgress',{current:(speedSession?.index||0)+1,total:speedSession?.total||activeSpeedDefinition().total,time:formatSpeedTime(speedElapsedMs())}));
  setVisible(refs.speedPauseStats,!!history.length);
  if(!history.length)return;
  setText(refs.speedPauseStatsSummary,tr('speedStatsSummary',{runs:history.length,best:best?formatSpeedTime(best):'--:--.-',optimal}));
  setText(refs.speedPauseStatsTitle,tr('speedStatsTop'));
  renderSpeedStatsList(refs.speedPauseStatsList,history);
}
function renderMasterSpeedStats(){
  const {history,best,optimal}=speedStatsData();
  const refs=getSpeedUiRefs();
  setText(refs.masterSpeedStatsSummary,tr('speedStatsSummary',{runs:history.length,best:best?formatSpeedTime(best):'--:--.-',optimal}));
  setText(refs.masterSpeedStatsTitle,tr('speedStatsTop'));
  renderSpeedStatsList(refs.masterSpeedStatsList,history);
}
function advanceSpeedRun(){
  if(!isMode('speed')||!speedSession)return;
  if(speedSession.index>=speedSession.total-1){finishSpeedRun();return;}
  advanceSpeedSessionCommand();loadSpeedStage(false,true);
}
function completeSpeedStage(){
  setClearShownCommand(true);
  if(speedSession&&moves===best&&!speedSession.restartedCurrent) updateSpeedOptimalClearsCommand();
  pauseSpeedClock();persistSpeedSession();
  const delay=celebrateClear();
  setUiEffectTimer('clear-transition','advance-speed',WakeSevenProgressionCommands.advanceSpeedRun,delay+120);
}
// 公開ネイティブモジュールの構文境界。
export {};
