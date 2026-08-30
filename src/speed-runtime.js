// ===== スピードラン(速解き)ランタイム =====
/* 速解きは同じセッション基盤で派生ルールを増やせるよう、モード定義を分離する。 */
// ===== スピードラン(速解き)モード =====
const SPEED_MODE_DEFINITIONS=PROGRESSION.speedModes;
let speedVariant='standard';
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
  const list=$('speedModeOptionsList');
  if(!list)return;
  list.innerHTML='';
  const available=unlockedSpeedVariants();
  list.style.gridTemplateColumns='repeat('+Math.max(1,available.length)+',minmax(0,1fr))';
  available.forEach(id=>{
    const copy=speedVariantCopy(id),button=document.createElement('button');
    button.type='button';button.className='speed-mode-tab'+(id===speedVariant?' selected':'');
    button.dataset.speedVariant=id;
    button.setAttribute('role','tab');
    button.setAttribute('aria-selected',String(id===speedVariant));
    button.textContent=speedTabLabel(id);
    button.addEventListener('click',()=>{
      speedVariant=id;
      storage.set(SPEED_LAST_TAB_STORAGE_KEY,id);
      renderSpeedModeOptions();
      renderMasterSpeedStats();
      $('masterStart').textContent=readSpeedSession()?tr('speedResume'):tr('speedStart');
    });
    list.appendChild(button);
  });
  const copy=speedVariantCopy(speedVariant);
  const [introMain,...introRest]=copy.intro.split('\n');
  $('speedModeOptionsDetail').textContent=introMain;
  $('speedModeOptionsScope').textContent=introRest.join('\n');
  $('speedModeOptionsScope').hidden=!introRest.length;
  $('speedModeOptions').hidden=available.length<=1;
}
function openSpeedPicker(){
  if(!DEBUG_MODE&&!featureUnlocked('speedRun'))return;
  speedVariant=preferredSpeedVariant();
  storage.set(SPEED_LAST_TAB_STORAGE_KEY,speedVariant);
  showMasterDialog('speedIntro');
}
const SPEED_SESSION_KEY=STORAGE_KEYS.speedSession;
const SPEED_BEST_KEY=STORAGE_KEYS.speedBestMs;
const SPEED_HISTORY_KEY=STORAGE_KEYS.speedHistory;
function speedStorageKey(base,variant=speedVariant){return variant==='standard'?base:base+'-'+variant;}
function speedSessionStorageKey(variant=speedVariant){return speedStorageKey(SPEED_SESSION_KEY,variant);}
function speedBestStorageKey(variant=speedVariant){return speedStorageKey(SPEED_BEST_KEY,variant);}
function speedHistoryStorageKey(variant=speedVariant){return speedStorageKey(SPEED_HISTORY_KEY,variant);}
let speedSession=null,speedClockStarted=0,speedClockTimer=0,speedManuallyPaused=false;
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
function writeSpeedHistory(entries){storage.setJson(speedHistoryStorageKey(),entries.slice(0,20));}
function readSpeedSession(variant=speedVariant){
  const data=storage.json(speedSessionStorageKey(variant),null);
  if(!validSpeedSession(data))return null;
  if(!SPEED_MODE_DEFINITIONS[data.variant])data.variant='standard';
  return data;
}
function readActiveSpeedSession(){
  const lastVariant=storage.get(STORAGE_KEYS.speedActiveVariant,'');
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
function renderSpeedClock(){
  if(!isMode('speed'))return;
  const text=formatSpeedClock(speedElapsedMs());
  $('speedClockValue').textContent=text;
}
function startSpeedClock(){
  if(!isMode('speed')||speedManuallyPaused||speedClockStarted||document.visibilityState==='hidden'||speedAwaitingStart())return;
  speedClockStarted=performance.now();clearInterval(speedClockTimer);speedClockTimer=setInterval(renderSpeedClock,100);renderSpeedClock();
}
function pauseSpeedClock(){
  if(speedClockStarted){if(speedSession)speedSession.elapsedMs+=performance.now()-speedClockStarted;speedClockStarted=0;}
  clearInterval(speedClockTimer);speedClockTimer=0;renderSpeedClock();
}
// 速解きセッションの永続化境界。経過時間と現在盤面をここで保存する。
function persistSpeedSession(){
  if(!speedSession)return;
  const elapsed=speedElapsedMs();
  const payload={...speedSession,variant:activeSpeedDefinition().id,elapsedMs:elapsed,board:isMode('speed')?serializeActiveBoard():speedSession.board};
  storage.setJson(speedSessionStorageKey(),payload);
  storage.set(STORAGE_KEYS.speedActiveVariant,payload.variant);
}
function clearSpeedSession(variant=speedVariant){storage.remove(speedSessionStorageKey(variant));}
function pauseSpeedRun(){if(!isMode('speed'))return;pauseSpeedClock();persistSpeedSession();}
function openSpeedPauseDialog(){
  if(!isMode('speed'))return;
  speedManuallyPaused=true;
  pauseSpeedClock();persistSpeedSession();
  renderSpeedPauseStats();
  $('speedPauseDialog').hidden=false;
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
function pendingSpeedTrial(variant=activeSpeedDefinition().id){
  // 卒業試験は一周目だけ。二周目は各コースをそのまま進める。
  if(activeLap===2)return null;
  if(variant==='training9'&&!speedTrainingTrialCleared)return 'training9';
  if(variant==='mastery15'&&!speedIntermediateTrialCleared)return 'mastery15';
  if(variant==='mastery24'&&!speedMasteryTrialCleared)return 'mastery24';
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
  clearTimeout(boardArrivalTimer);
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
  boardArrivalTimer=setTimeout(()=>svg.classList.remove('arriving'),560);
}
function loadSpeedStage(restoreBoard=false,arriving=false){
  if(!speedSession)return;
  speedManuallyPaused=false;
  setActiveMode('speed');editingBoard=false;
  const pool=speedStagePool(activeSpeedDefinition());
  if(!speedSession.started&&speedSession.index===0&&!speedSession.movedCurrent){
    // スタート前は問題を見せず、全員が起きたまっさらな盤面で開始を促す。
    setPosition(0,0);
    renderStageNav();
    persistSpeedSession();persistActiveSession();
    return;
  }
  const stage=pool[speedSession.order[speedSession.index]];
  setPosition(transformStateBySymmetry(stage.state,SPEED_BOARD_VIEW),stage.par);
  if(restoreBoard&&validSavedBoard(speedSession.board)){
    restoreSavedBoard(speedSession.board);
    // クリア演出中に閉じた場合は、同じ問題を重ねて出さず次へ進める。
    if(isSolved()){clearShown=false;advanceSpeedRun();return;}
  }
  renderStageNav();
  if(arriving)animateBoardArrival();
  persistSpeedSession();persistActiveSession();startSpeedClock();
}
function enterSpeedMode(forceNew=false){
  pauseSpeedRun();
  const requestedVariant=speedVariant;
  const saved=forceNew?null:readSpeedSession();
  const isNew=forceNew||!saved;
  speedVariant=saved?.variant&&SPEED_MODE_DEFINITIONS[saved.variant]?saved.variant:requestedVariant;
  speedSession=saved||newSpeedSession();
  ensureSpeedBoardView(speedSession);
  loadSpeedStage(!isNew,isNew);
}
function beginSpeedRun(){
  if(!isMode('speed')||!speedSession||speedSession.started)return;
  speedSession.started=true;
  loadSpeedStage(false,true);
}
function finishSpeedRun(){
  pauseSpeedClock();
  const elapsed=Math.round(speedSession.elapsedMs);
  const optimalClears=speedOptimalClears();
  let bestTime=0;
  bestTime=Number(storage.get(speedBestStorageKey(),'0'))||0;
  if(!bestTime||elapsed<bestTime){bestTime=elapsed;storage.set(speedBestStorageKey(),String(bestTime));}
  const history=readSpeedHistory();
  history.unshift({elapsedMs:elapsed,optimalClears,total:speedSession.total||activeSpeedDefinition().total,completedAt:Date.now()});
  writeSpeedHistory(history);
  clearSpeedSession();
  storage.remove(STORAGE_KEYS.speedActiveVariant);
  // 速解き自体の完走では報酬を付けない。3Dページは二周目制覇の報酬。
  speedSession={...speedSession,completed:true,elapsedMs:elapsed,bestMs:bestTime,optimalClears,runNumber:history.length};
  const trialVariant=speedSession.requiredTrial===true?'training9':speedSession.requiredTrial;
  if(trialVariant){
    // 卒業試験は、最短手数を問わず全問を完走すれば合格。
    grantSpeedTrialCleared(trialVariant);
    if(trialVariant==='training9')rememberSpecialMessage('primary');
    else if(trialVariant==='mastery15')rememberSpecialMessage('volume');
    else if(trialVariant==='mastery24'){grantMasterReward();rememberSpecialMessage('mastery');}
    setActiveMode('stage');
    // 合格後に速解き最終盤の状態を残さない。元のコースの節目へ戻して、
    // 既存のクリア演出・次の道への導線にそのまま合流させる。
    if(trialVariant==='training9')loadStage(ACADEMY_STAGE_COUNT-1);
    else if(trialVariant==='mastery15')loadStage(STAGES.length-1);
    else loadExtraStage(EXTRA_STAGES.length-1);
    // 合格後は、それぞれの道を終えたときの既存の昇格ダイアログに合流する。
    showMasterDialog(trialVariant==='training9'?'primary':trialVariant==='mastery15'?'intermediate':'mastery');
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
  if(!history.length){list.innerHTML='<p>'+tr('speedStatsEmpty')+'</p>';return;}
  list.innerHTML=[...history].sort((a,b)=>a.elapsedMs-b.elapsedMs).slice(0,3).map((entry,index)=>{
    const rank=index+1,optimalClears=Math.max(0,Math.min(Number(entry.total)||activeSpeedDefinition().total,Number(entry.optimalClears)||0)),runNumber=history.length-history.indexOf(entry);
    return '<div class="speed-result" data-rank="'+rank+'"><span class="speed-result-medal" aria-label="'+tr('speedStatsPlace',{n:rank})+'"><span>'+rank+'</span></span><span><strong class="speed-result-time">'+formatSpeedTime(entry.elapsedMs)+'</strong><small class="speed-result-note">'+tr('speedStatsOptimal',{optimal:optimalClears})+' '+tr('speedStatsAttempt',{n:runNumber})+'</small></span></div>';
  }).join('');
}
function renderSpeedPauseStats(){
  const {history,best,optimal}=speedStatsData();
  $('speedPauseProgress').textContent=tr('speedPauseProgress',{current:(speedSession?.index||0)+1,total:speedSession?.total||activeSpeedDefinition().total,time:formatSpeedTime(speedElapsedMs())});
  $('speedPauseStats').hidden=!history.length;
  if(!history.length)return;
  $('speedPauseStatsSummary').textContent=tr('speedStatsSummary',{runs:history.length,best:best?formatSpeedTime(best):'--:--.-',optimal});
  $('speedPauseStatsTitle').textContent=tr('speedStatsTop');
  renderSpeedStatsList($('speedPauseStatsList'),history);
}
function renderMasterSpeedStats(){
  const {history,best,optimal}=speedStatsData();
  $('masterSpeedStatsSummary').textContent=tr('speedStatsSummary',{runs:history.length,best:best?formatSpeedTime(best):'--:--.-',optimal});
  $('masterSpeedStatsTitle').textContent=tr('speedStatsTop');
  renderSpeedStatsList($('masterSpeedStatsList'),history);
}
function advanceSpeedRun(){
  if(!isMode('speed')||!speedSession)return;
  if(speedSession.index>=speedSession.total-1){finishSpeedRun();return;}
  speedSession.index++;speedSession.board=null;speedSession.movedCurrent=false;speedSession.restartedCurrent=false;loadSpeedStage(false,true);
}
function completeSpeedStage(){
  clearShown=true;
  if(speedSession&&moves===best&&!speedSession.restartedCurrent) speedSession.optimalClears=speedOptimalClears()+1;
  pauseSpeedClock();persistSpeedSession();
  const delay=celebrateClear();
  clearTimer=setTimeout(advanceSpeedRun,delay+120);
}
