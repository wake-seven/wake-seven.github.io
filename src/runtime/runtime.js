// ===== 共通ユーティリティ =====
// 公開版を識別するための単一のアプリケーションバージョン。
// Aboutダイアログと生成済みindex.htmlは、この値を通じて同じ版を表示する。
const APP_VERSION='2026.09.02-21:35';
function tr(key,vars){
  const locale=UI_TEXT[currentLang]||{},fallback=UI_TEXT.ja||{};
  let value=Object.prototype.hasOwnProperty.call(locale,key)?locale[key]
    :Object.prototype.hasOwnProperty.call(fallback,key)?fallback[key]:key;
  if(vars)Object.keys(vars).forEach(name=>value=value.replaceAll('{'+name+'}',vars[name]));
  return value;
}
function secondLapMark(){return currentLang==='zh'?'贰':(currentLang==='en'||currentLang==='ko')?'Ⅱ':'弐'}
function shareData(kind='game'){
  const key=kind==='training'?'shareTrainingText':kind==='mastery'?'shareMasteryText':kind==='satori'?'shareSatoriText':'shareGameText';
  const url=new URL(location.href);
  url.search='';url.hash='';
  return {title:tr('pageTitle'),text:tr(key),url:url.href};
}
async function shareWakeSeven(kind='game',button){
  const data=shareData(kind);
  trackAnalyticsEvent('share',{
    method:navigator.share?'web_share':'clipboard',
    content_type:'game',item_id:kind,
    share_location:button&&button.id==='masterShare'?'clear_dialog':'footer'
  });
  try{
    if(navigator.share){await navigator.share(data);return;}
  }catch(error){
    if(error&&error.name==='AbortError')return;
  }
  try{
    await navigator.clipboard.writeText(data.text+'\n'+data.url);
    if(button){
      const label=button.querySelector('span:last-child');
      const text=label.textContent;
      label.textContent=tr('shareCopied');
      setTimeout(()=>{if(button.isConnected)label.textContent=text;},1600);
    }
  }catch(_){
    window.prompt(tr('shareCopyPrompt'),data.url);
  }
}
// ===== コア状態・モードシステム・進行状態管理 =====
/* ---- 盤面 ---- */
// iPadOS Safariは:hover付きの要素だと「1回目のタップはhoverだけ、2回目でclick」になることがある。
// ダミーのtouchstartリスナーを一つ登録しておくと、その挙動を止められる（既知の回避策）。
document.addEventListener('touchstart',()=>{},{passive:true});
const svg=document.getElementById('board'), $=id=>document.getElementById(id);
const DEBUG_MODE=new URLSearchParams(location.search).get('debug')==='1'
  &&(location.protocol==='file:'||['localhost','127.0.0.1','::1'].includes(location.hostname));
document.body.classList.toggle('debug-mode',DEBUG_MODE);
if(!DEBUG_MODE)document.addEventListener('copy',e=>e.preventDefault());
// LINEアプリ内ブラウザ等、手元で再現できない環境でのスワイプ競合調査用。
// ?debug=touch を付けた時だけ、画面隅にタッチ/スクロール系イベントを表示する
// (本番環境でも動作させたいため、上のDEBUG_MODEのlocalhost限定とは別枠にする)。
if(new URLSearchParams(location.search).get('debug')==='touch'){
  const touchHud=document.createElement('div');
  touchHud.style.cssText='position:fixed;left:4px;top:4px;z-index:99999;max-width:94vw;max-height:40vh;overflow:hidden;padding:6px 8px;background:rgba(0,0,0,.78);color:#7CFC7C;font:10px/1.45 monospace;white-space:pre-wrap;pointer-events:none;';
  document.addEventListener('DOMContentLoaded',()=>document.body.appendChild(touchHud));
  let touchHudLines=[];
  const touchHudLog=line=>{
    touchHudLines.unshift(line);
    if(touchHudLines.length>8)touchHudLines.length=8;
    const vv=window.visualViewport;
    touchHud.textContent='scrollY:'+window.scrollY+' vvTop:'+(vv?vv.offsetTop.toFixed(1):'-')+' vvH:'+(vv?vv.height.toFixed(0):'-')+'\n'+touchHudLines.join('\n');
  };
  ['pointerdown','pointermove','pointerup','pointercancel'].forEach(type=>{
    document.addEventListener(type,e=>touchHudLog(type+' prevented:'+e.defaultPrevented),{capture:true});
  });
  document.addEventListener('touchmove',e=>touchHudLog('touchmove prevented:'+e.defaultPrevented+' n:'+e.touches.length),{capture:true,passive:true});
  window.addEventListener('scroll',()=>touchHudLog('scroll y:'+window.scrollY),{passive:true});
  if(window.visualViewport)window.visualViewport.addEventListener('resize',()=>touchHudLog('viewport-resize'));
}
let ori=new Uint8Array(N), spin=new Int16Array(N), history=[], moves=0, best=0;
let tileEls=[], baseTiles=[], drag=null, busy=false, boardTouchActive=false;
const gameState=window.WakeSevenState.read()||window.WakeSevenState.create();
// 旧バージョンのフラットな保存キーは現行状態へ持ち込まず破棄する。
WakeSevenState.purgeExternalStorage();
const initialNavigation=WakeSevenState.navigationView(gameState);
let stageIndex=initialNavigation.stageIndex,extraIndex=initialNavigation.masteryIndex,satoriIndex=initialNavigation.satoriIndex,tutorialStep=initialNavigation.tutorialStep,activeMode=initialNavigation.mode,clearShown=false,nextStageAttention=false;
let pendingMasterThemeRefresh=false;
let lastAnalyticsStageKey='';

/* モードの実体は activeMode のみ。 */
const ACTIVE_MODES=Object.freeze(['tutorial','stage','mastery','satori','speed','free','custom']);
function setActiveMode(mode){
  const navigation=WakeSevenState.updateNavigation(gameState,{mode:ACTIVE_MODES.includes(mode)?mode:'stage'});
  activeMode=navigation.mode;
}
const isMode=mode=>activeMode===mode;
function setUnlock(key,value){
  const unlocks=WakeSevenState.updateUnlocks(gameState,{[key]:value===true});
  return unlocks[key];
}

/* ---- 状態管理の境界 ----
 * 盤面の描画や操作は歴史的にこのファイルへ段階的に追加されてきたため、
 * モード判定と保存キーが各所に散らばりやすい。新しい解放要素・速解き派生
 * モード・問題ごとの案内を追加するときは、まずグループ入口を経由する。
 */
const STORAGE_KEY_GROUPS=WakeSevenState.STORAGE_KEY_GROUPS;
const storage=WakeSevenState.storage;
/*
 * バージョン付き保存境界。新機能のフィールドは別の保存形式を増やさず、ここへ追加する。
 */
// リロード時に、盤面だけでなくユーザーが見ていたダイアログも復元する。
// 動的な内容を持つダイアログは識別子だけ保存し、起動後に通常の描画関数で再構築する。
function captureDialogState(){
  const visible=id=>{const el=$(id);return !!el&&!el.hidden;};
  if(visible('chainDialog')&&chainActiveName)return {type:'chain',name:chainActiveName};
  if(visible('clearDialog'))return {type:'clear'};
  if(visible('messageDialog')){
    const entry=messageReviewEntries[messageReviewIndex];
    return {type:'message',key:entry&&typeof messageReviewEntryKey==='function'?messageReviewEntryKey(entry):null};
  }
  if(visible('masterDialog'))return {type:'master',kind:masterDialogKind};
  if(visible('speedPauseDialog'))return {type:'speedPause'};
  if(visible('speedRestartDialog'))return {type:'speedRestart'};
  if(visible('rankDialog'))return {type:'rank'};
  if(visible('tipGuideDialog'))return {type:'tipGuide'};
  if(visible('guideHubDialog'))return {type:'guideHub'};
  if(visible('twoMoveDetailDialog'))return {type:'twoMoveDetail',index:twoMoveDetailIndex,state:Number.isInteger(twoMoveDetailState)?twoMoveDetailState:enc(twoMoveDetailState)};
  if(visible('twoMoveDialog'))return {type:'twoMove'};
  if(visible('optimalFailDialog'))return {type:'optimalFail'};
  for(const id of ['introDialog','resetDialog','aboutDialog','boardThemeDialog','twoMoveDialog','twoMoveDetailDialog','twoMoveLessonDialog','optimalFailDialog']){
    if(visible(id))return {type:id};
  }
  return null;
}
const DIALOG_STATE_STORAGE_KEY=STORAGE_KEY_GROUPS.dialogs.state;
function persistDialogState(){
  try{const state=captureDialogState();if(state)storage.setJson(DIALOG_STATE_STORAGE_KEY,{id:state.type,name:state.name,kind:state.kind,key:state.key});else storage.remove(DIALOG_STATE_STORAGE_KEY);}catch(_){ }
}
function restoreDialogState(state){
  if(!state||typeof state.id!=='string')return false;
  try{
    if(state.id==='chain'&&CHAIN_STEPS[state.name]){openChainedDialog(state.name);return true;}
    if(state.id==='clear'&&clearShown&&isSolved()){showClearDialog();return true;}
    if(state.id==='message'){openMessageReview({resume:true});if(state.key){const index=messageReviewEntries.findIndex(entry=>messageReviewEntryKey(entry)===state.key);if(index>=0){messageReviewIndex=index;renderMessageReview();}}return true;}
    if(state.id==='master'){showMasterDialog(state.kind||'primary');return true;}
    if(state.id==='speedPause'&&isMode('speed')){openSpeedPauseDialog();return true;}
    if(state.id==='rank'){openRankDialog();return true;}
    if(state.id==='tipGuide'){openTipGuide();return true;}
    if(state.id==='guideHub'){openGuideHub();return true;}
    if(state.id==='twoMove'){
      openTwoMovePatterns();return true;
    }
    if(state.id==='twoMoveDetail'&&Number.isInteger(state.state)&&Number.isInteger(state.index)){
      openTwoMoveDetail(state.state,state.index);return true;
    }
    if(state.id==='optimalFail'){
      renderOptimalFail();$('optimalFailDialog').hidden=false;return true;
    }
    if(state.id==='twoMoveLesson'){openTwoMoveLessonDialog(!!state.retry);return true;}
    const element=$(state.id);if(element){element.hidden=false;return true;}
  }catch(_){/* 壊れた保存状態は盤面復元を妨げない */}
  return false;
}
function syncGameState(){
  WakeSevenState.updateNavigation(gameState,{mode:activeMode,lap:activeLap,stageIndex,masteryIndex:extraIndex,satoriIndex,tutorialStep});
  WakeSevenState.updateProgress(gameState,{
    lap1:{primary:[...lap1ClearedStages],mastery:[...lap1ClearedExtraStages],satori:[...lap1ClearedSatoriStages]},
    lap2:{primary:[...lap2ClearedStages],mastery:[...lap2ClearedExtraStages],satori:[...lap2ClearedSatoriStages]}
  });
  WakeSevenState.updateSettings(gameState,{language:currentLang,sound:soundEnabled,boardTheme,boardLayout,boardThemeChosen,boardLayoutChosen,darumaColor,darumaColorChosen});
  WakeSevenState.updateUnlocks(gameState,{
    secondLap:secondLapUnlocked,awakened:awakenedGranted,threeD:threeDUnlocked,
    speedTraining:speedTrainingUnlocked,speedIntermediate:speedIntermediateUnlocked,
    speedMastery:speedMasteryUnlocked,speedSatori:speedSatoriUnlocked,
    masterGoldGranted,satoriDesignGranted,rainbowDarumaGranted,
    speedTrainingTrialCleared,speedIntermediateTrialCleared,speedMasteryTrialCleared
  });
  gameState.speed={activeVariant:speedVariant,sessions:Object.fromEntries(Object.keys(SPEED_MODE_DEFINITIONS).map(variant=>[variant,readSpeedSession(variant)]).filter(([,session])=>session))};
  // activeModeが現在モードの正。ここはfree/custom/speed画面から
  // 復元するキャンペーン先だけを保持する。
  gameState.ui={editingBoard,returnStageContext};
  if(typeof serializeActiveBoard==='function')WakeSevenState.updateBoard(gameState,serializeActiveBoard());
  return window.WakeSevenState.write(gameState);
}
const SPEED_LAST_TAB_STORAGE_KEY=STORAGE_KEY_GROUPS.speed.lastTab;
const SPEED_NEW_TAB_STORAGE_KEY=STORAGE_KEY_GROUPS.speed.newTab;
const COURSE_DEFINITIONS=Object.freeze({
  tutorial:{id:'tutorial',total:TUTORIAL_STEPS.length,label:'tutorial',indexKey:'tutorialStep'},
  primary:{id:'primary',total:STAGES.length,label:'training',indexKey:'stageIndex'},
  mastery:{id:'mastery',total:EXTRA_STAGES.length,label:'mastery',indexKey:'masteryIndex'},
  satori:{id:'satori',total:SATORI_STAGES.length,label:'satori',indexKey:'satoriIndex'},
  speed:{id:'speed',total:SATORI_STAGES.length,label:'speed',indexKey:'speedIndex'},
  free:{id:'free',total:null,label:'free',indexKey:null},
  custom:{id:'custom',total:null,label:'custom',indexKey:null}
});
const COURSE_MODE_ALIASES=Object.freeze({stage:'primary'});
function courseDefinitionForMode(mode=activeMode){
  return COURSE_DEFINITIONS[COURSE_MODE_ALIASES[mode]||mode]||COURSE_DEFINITIONS.primary;
}
function runtimeNavigation(){
  return {mode:activeMode,lap:activeLap,stageIndex,masteryIndex:extraIndex,satoriIndex,tutorialStep};
}
const isSideCourseMode=()=>isMode('free')||isMode('custom');
// 複数の画面で共通する「通常の進行中」判定。サイドコースと速解きは除外する。
const isCampaignMode=()=>!isSideCourseMode()&&!isMode('speed');
const PRIMARY_SECTIONS=Object.freeze([
  {id:'intro',labelKey:'intro',start:0,total:INTRO_STAGE_COUNT,analytics:'training_intro'},
  {id:'basic',labelKey:'basic',start:BASIC_STAGE_START,total:BASIC_STAGE_COUNT,analytics:'training_basic'},
  {id:'application',labelKey:'application',start:APPLICATION_STAGE_START,total:APPLICATION_STAGE_COUNT,analytics:'training_application'},
  {id:'development',labelKey:'development',start:DEVELOPMENT_STAGE_START,total:DEVELOPMENT_STAGE_COUNT,analytics:'training_development'},
  {id:'trainingUpper',labelKey:'trainingUpper',start:TRAINING_STAGE_START,total:TRAINING_UPPER_COUNT,analytics:'daruma_training_upper'},
  {id:'trainingMiddle',labelKey:'trainingMiddle',start:TRAINING_STAGE_START+TRAINING_UPPER_COUNT,total:TRAINING_MIDDLE_COUNT,analytics:'daruma_training_middle'},
  {id:'trainingLower',labelKey:'trainingLower',start:TRAINING_STAGE_START+TRAINING_UPPER_COUNT+TRAINING_MIDDLE_COUNT,total:TRAINING_LOWER_COUNT,analytics:'daruma_training_lower'}
]);
function primarySection(index=stageIndex){
  return PRIMARY_SECTIONS.find(section=>index>=section.start&&index<section.start+section.total)||PRIMARY_SECTIONS[0];
}
function primarySectionPosition(index=stageIndex){
  const section=primarySection(index);
  return {section,position:index-section.start+1};
}
// ステージ選択ダイアログでは、だるま学園・だるま修行もPRIMARY_SECTIONSの6区分をそれぞれ1ページとして見せる。
// pickerRoundは負の数(-6〜-1)でこの6区分を表し、0以上は名人への道の巻、'satori'は悟りへの道のページ。
const PRIMARY_PICKER_SECTION_COUNT=PRIMARY_SECTIONS.length;
const pickerRoundToSection=round=>PRIMARY_SECTIONS[round+PRIMARY_PICKER_SECTION_COUNT];
const PICKER_ACADEMY_LAST_ROUND=PRIMARY_SECTIONS.findIndex(s=>s.id==='development')-PRIMARY_PICKER_SECTION_COUNT;
const PICKER_TRAINING_FIRST_ROUND=PRIMARY_SECTIONS.findIndex(s=>s.id==='trainingUpper')-PRIMARY_PICKER_SECTION_COUNT;
const PICKER_TRAINING_LAST_ROUND=PRIMARY_SECTIONS.findIndex(s=>s.id==='trainingLower')-PRIMARY_PICKER_SECTION_COUNT;
// 現在のモード・コース・問題位置を、画面や計測から共通して参照する実行コンテキスト。
// 既存の runtimeContext() は互換入口として残し、段階的にこちらへ寄せる。
function getGameContext(){
  const navigation=runtimeNavigation();
  if(isMode('tutorial'))return {mode:'tutorial',course:courseDefinitionForMode(),index:WakeSevenState.navigationIndex(navigation,'tutorial'),position:tutorialStep+1,total:TUTORIAL_STEPS.length,lap:1};
  if(isSideCourseMode())return {mode:activeMode,course:courseDefinitionForMode(),index:null,position:null,total:null,lap:activeLap};
  if(isMode('speed')){
    const index=speedSession?.index||0;
    return {mode:'speed',course:courseDefinitionForMode(),index,position:index+1,total:SATORI_STAGES.length,lap:activeLap};
  }
  if(isMode('satori'))return {mode:'satori',course:courseDefinitionForMode(),index:WakeSevenState.navigationIndex(navigation,'satori'),position:satoriIndex+1,total:SATORI_STAGES.length,lap:activeLap};
  if(isMode('mastery'))return {mode:'mastery',course:courseDefinitionForMode(),index:WakeSevenState.navigationIndex(navigation,'mastery'),position:extraIndex+1,total:EXTRA_STAGES.length,lap:activeLap};
  return {mode:'primary',course:courseDefinitionForMode('stage'),index:WakeSevenState.navigationIndex(navigation,'stage'),position:stageIndex+1,total:STAGES.length,lap:activeLap};
}
function runtimeContext(){return getGameContext();}
// UI/補助モジュールから実行状態を読むための薄い境界。
// 個別のランタイム変数を直接参照する箇所を増やさず、読み取り専用のスナップショットを渡す。
function runtimeSnapshot(){return Object.freeze({mode:activeMode,lap:activeLap,stageIndex,masteryIndex:extraIndex,satoriIndex,tutorialStep,language:currentLang,speedVariant});}
function runtimeStageKey(){
  const ctx=getGameContext();
  return ctx.position===null?ctx.mode:ctx.mode+':'+ctx.index;
}
function featureUnlocked(feature){
  switch(feature){
    case 'speedRun':return speedTrainingUnlocked||speedIntermediateUnlocked||speedMasteryUnlocked||speedSatoriUnlocked;
    case 'genome':return hasMasterReward();
    case 'boardTheme':return hasMasterReward();
    case 'threeD':return threeDUnlocked;
    default:return false;
  }
}
// 問題ごとのメイン画面案内。値を追加するだけで描画側へ接続できる拡張点。
// key は runtimeStageKey() の形式（例: primary:0, mastery:12）。
// 基本1〜5 / 基本6〜9は、同じ最短2手の原理を繰り返し見ながら学ぶ。
const MAIN_BOARD_GUIDANCE=Object.freeze({
  'primary:3':'basicGuideJoinOne',
  'primary:4':'basicGuideJoinOne',
  'primary:5':'basicGuideJoinOne',
  'primary:6':'basicGuideJoinOne',
  'primary:7':'basicGuideJoinOne',
  'primary:8':'basicGuideJoinTwo',
  'primary:9':'basicGuideJoinTwo',
  'primary:10':'basicGuideJoinTwo',
  'primary:11':'basicGuideJoinTwo'
});
Object.assign(MESSAGE_CATALOG.guidance,MAIN_BOARD_GUIDANCE);
// 初めて原理を見せる問題は矢印つき、次の問題は「回す3枚」だけを示す。
const BASIC_LESSON_ASSISTS=Object.freeze({
  3:'arrow',4:'axis',8:'arrow',9:'axis'
});
function mainBoardGuidance(){return messageContent('guidance',runtimeStageKey());}
function appendMoveCountEmphasis(root,message){
  message.split(/([12]枚)/g).forEach(part=>{
    if(!part)return;
    if(/^[12]枚$/.test(part)){
      const strong=document.createElement('strong');
      strong.textContent=part;root.append(strong);
    }else root.append(document.createTextNode(part));
  });
}
function renderMainBoardGuidance(){
  const key=mainBoardGuidance(),guide=$('boardGuidance');
  guide.hidden=!key;
  document.body.classList.toggle('board-guidance-active',!!key);
  const text=$('boardGuidanceText');
  text.replaceChildren();
  if(!key)return;
  appendMoveCountEmphasis(text,tr(key));
  const link=document.createElement('button');
  link.type='button';
  link.className='board-guidance-link';
  link.textContent=tr('twoMoveLessonLink');
  link.addEventListener('click',()=>openTwoMoveLessonDialog());
  text.append(link);
}
function analyticsStageInfo(){
  const context=getGameContext();
  if(context.mode==='free'||context.mode==='custom')return null;
  if(context.mode==='speed'){
    const position=(speedSession?.index||0)+1;
    return {game_mode:'speed',course:'speed_run',stage_id:'speed_'+String(position).padStart(2,'0'),stage_number:position,stage_total:SATORI_STAGES.length,minimum_moves:best,level_name:'speed '+position};
  }
  if(context.mode==='satori'){
    const position=satoriIndex+1;
    return {
      game_mode:'satori',course:'satori',stage_id:'satori_'+String(position).padStart(2,'0'),
      stage_number:position,stage_order:75+position,stage_total:SATORI_STAGES.length,
      minimum_moves:best,level_name:'satori '+position
    };
  }
  if(context.mode==='mastery'){
    const volume=Math.floor(extraIndex/MASTER_VOLUME_SIZE)+1;
    const position=extraIndex%MASTER_VOLUME_SIZE+1;
    const course=['mastery_jo','mastery_ha','mastery_ri','mastery_kiwami'][volume-1];
    return {
      game_mode:'stage',course,stage_id:course+'_'+String(position).padStart(2,'0'),
      stage_number:position,stage_order:STAGES.length+extraIndex+1,stage_total:MASTER_VOLUME_SIZE,
      mastery_volume:volume,minimum_moves:best,level_name:course+' '+position
    };
  }
  const {section,position}=primarySectionPosition(stageIndex);
  const course=section.analytics;
  const total=section.total;
  return {
    game_mode:'stage',course,stage_id:course+'_'+String(position).padStart(2,'0'),
    stage_number:position,stage_order:stageIndex+1,stage_total:total,
    minimum_moves:best,level_name:course+' '+position
  };
}
function trackAnalyticsEvent(name,parameters={}){
  if(!WAKE7_GA_ENABLED||typeof window.gtag!=='function')return;
  let analyticsLanguage=currentLang;
  try{
    const storedLanguage=storage.get(STORAGE_KEY_GROUPS.settings.language);
    if(UI_TEXT[storedLanguage])analyticsLanguage=storedLanguage;
  }catch(_){ }
  window.gtag('event',name,Object.assign({
    game_language:analyticsLanguage,
    embedded:document.documentElement.classList.contains('embed')
  },parameters));
}
function trackStageView(){
  const stage=analyticsStageInfo();
  if(!stage)return;
  const key=stage.stage_id;
  if(key===lastAnalyticsStageKey)return;
  lastAnalyticsStageKey=key;
  trackAnalyticsEvent('stage_view',stage);
}
function trackGameStart(){
  if(!WAKE7_GA_ENABLED)return;
  try{
    if(sessionStorage.getItem('wake7-ga-game-started')==='1')return;
    sessionStorage.setItem('wake7-ga-game-started','1');
  }catch(_){ }
  const stage=analyticsStageInfo();
  trackAnalyticsEvent('game_start',stage||{
    game_mode:isMode('custom')?'custom':'free',course:isMode('custom')?'custom':'free'
  });
}
initializeRuntimeSettings();
const initialUnlocks=WakeSevenState.sectionView(gameState,'unlocks');
let masterGoldGranted=initialUnlocks.masterGoldGranted===true;
if(!masterGoldGranted)try{masterGoldGranted=storage.get(STORAGE_KEY_GROUPS.rewards.masterGoldGranted)==='1';}catch(_){ }
let satoriDesignGranted=initialUnlocks.satoriDesignGranted===true;
if(!satoriDesignGranted)try{satoriDesignGranted=storage.get(STORAGE_KEY_GROUPS.rewards.satoriDesignGranted)==='1';}catch(_){ }
let secondLapActive=false;
try{secondLapActive=storage.get(STORAGE_KEY_GROUPS.progression.secondLapActive)==='1';}catch(_){ }
let awakenedGranted=initialUnlocks.awakened===true;
if(!awakenedGranted)try{awakenedGranted=storage.get(STORAGE_KEY_GROUPS.rewards.awakenedGranted)==='1';}catch(_){ }
// 速解きモードは、進行状況をリセットしても残す独立した解放要素。
const speedUnlockState=initializeSpeedUnlockState({initialUnlocks,storage,awakenedGranted});
let speedModeUnlocked=speedUnlockState.modeUnlocked;
// 速解きは解放された範囲ごとに選択できる。解放状態は現行の統合状態ストアから復元する。
let speedTrainingUnlocked=speedUnlockState.training;
let speedIntermediateUnlocked=speedUnlockState.intermediate;
let speedMasteryUnlocked=speedUnlockState.mastery;
let speedSatoriUnlocked=speedUnlockState.satori;
let speedTrainingTrialCleared=speedUnlockState.trainingTrial;
let speedIntermediateTrialCleared=speedUnlockState.intermediateTrial;
let speedMasteryTrialCleared=speedUnlockState.masteryTrial;
function syncSpeedUnlockFlag(){
  speedModeUnlocked=speedTrainingUnlocked||speedIntermediateUnlocked||speedMasteryUnlocked||speedSatoriUnlocked;
  setUnlock('speedTraining',speedTrainingUnlocked);
  setUnlock('speedIntermediate',speedIntermediateUnlocked);
  setUnlock('speedMastery',speedMasteryUnlocked);
  setUnlock('speedSatori',speedSatoriUnlocked);
  if(speedModeUnlocked)storage.set(STORAGE_KEY_GROUPS.speed.unlocked,'1');
  else storage.remove(STORAGE_KEY_GROUPS.speed.unlocked);
}
function unlockSpeedVariant(id){
  const wasUnlocked=speedVariantUnlocked(id);
  if(id==='training9')speedTrainingUnlocked=true;
  else if(id==='training18')speedIntermediateUnlocked=true;
  else if(id==='mastery27')speedMasteryUnlocked=true;
  else if(id==='satori73'||id==='standard')speedSatoriUnlocked=true;
  syncSpeedUnlockFlag();
  if(!wasUnlocked)storage.set(SPEED_NEW_TAB_STORAGE_KEY,id);
  try{
    if(speedTrainingUnlocked)storage.set(STORAGE_KEY_GROUPS.speed.trainingUnlocked,'1');
    if(speedIntermediateUnlocked)storage.set(STORAGE_KEY_GROUPS.speed.intermediateUnlocked,'1');
    if(speedMasteryUnlocked)storage.set(STORAGE_KEY_GROUPS.speed.masteryUnlocked,'1');
    if(speedSatoriUnlocked)storage.set(STORAGE_KEY_GROUPS.speed.satoriUnlocked,'1');
  }catch(_){ }
}
// 卒業試験1つ分の合格を、称号判定用の「試験フラグ」と速解きモード側の「解放フラグ」の
// 両方へ一括で反映する。どちらか片方だけ更新してズレる不具合（称号が付かない／メニューに出ない等）を防ぐため、
// 卒業試験に合格させる処理は必ずここを通す。
function grantSpeedTrialCleared(variant){
  if(variant==='training9'){speedTrainingTrialCleared=setUnlock('speedTrainingTrialCleared',true);storage.set(STORAGE_KEY_GROUPS.speed.trainingTrialCleared,'1');}
  else if(variant==='training18'){speedIntermediateTrialCleared=setUnlock('speedIntermediateTrialCleared',true);storage.set(STORAGE_KEY_GROUPS.speed.intermediateTrialCleared,'1');}
  else if(variant==='mastery27'){speedMasteryTrialCleared=setUnlock('speedMasteryTrialCleared',true);storage.set(STORAGE_KEY_GROUPS.speed.masteryTrialCleared,'1');}
  else return;
  unlockSpeedVariant(variant);
}
// 「ここまでの節目は突破済み」という前提を、問題クリア状態と卒業試験の合格の両方でまとめて再現する。
// デバッグの節目ボタン・Sボタンは、個別にフラグを立てるのではなくここを土台にすることで、
// 「片方だけ更新してズレる」を構造的に防ぐ。
function grantCampaignProgressThrough(checkpoint){
  for(let i=0;i<ACADEMY_STAGE_COUNT;i++)clearedStages.add(i);
  grantSpeedTrialCleared('training9');
  if(checkpoint==='training'||checkpoint==='mastery'){
    STAGES.forEach((_,i)=>clearedStages.add(i));
    grantSpeedTrialCleared('training18');
  }
  if(checkpoint==='mastery'){
    EXTRA_STAGES.forEach((_,i)=>clearedExtraStages.add(i));
    grantSpeedTrialCleared('mastery27');
  }
}
// 3Dページは速解きモード初回クリアの報酬。速解きの解放同様、進行状況リセットでは残す。
let threeDUnlocked=initialUnlocks.threeD===true;
if(!threeDUnlocked)try{threeDUnlocked=storage.get(STORAGE_KEY_GROUPS.rewards.threeDUnlocked)==='1';}catch(_){ }
// 七色だるまは二周目の名人達成報酬。覚者報酬が保存済みなら解放状態として保持する。
let rainbowDarumaGranted=initialUnlocks.rainbowDarumaGranted===true;
try{rainbowDarumaGranted=rainbowDarumaGranted||storage.get(STORAGE_KEY_GROUPS.rewards.rainbowDarumaGranted)==='1'||awakenedGranted;}catch(_){rainbowDarumaGranted=awakenedGranted;}
if(rainbowDarumaGranted)try{storage.set(STORAGE_KEY_GROUPS.rewards.rainbowDarumaGranted,'1');}catch(_){ }
let secondLapUnlocked=initialUnlocks.secondLap===true;
try{secondLapUnlocked=secondLapUnlocked||storage.get(STORAGE_KEY_GROUPS.progression.secondLapUnlocked)==='1'||secondLapActive||awakenedGranted;}catch(_){secondLapUnlocked=secondLapActive||awakenedGranted;}
const initialNavigationState=WakeSevenState.sectionView(gameState,'navigation');
let activeLap=initialNavigationState.lap===2?2:1;
// activeModeが現在画面の正となる。最後にいたキャンペーン位置は明示的な名前で保持し、
// 2つ目のモード状態と誤認しないようにする。
let returnStageContext={extra:false,satori:false,index:0};
let editingBoard=false;
let masterDialogKind='primary';
let rankDialogReturn=null;
let rankListLap=activeLap;
let messageDialogReturn=null;
// ダイアログを閉じたときに元の場所へ戻る「戻り先」の共通形: {dialogId,focusId}を
// unhide+focusする。rankDialogReturn/messageDialogReturn/tipGuideReturnTarget/
// twoMovePatternsReturnTarget/twoMoveDetailReturnTargetの5つが、この形でセット→消費される。
function focusReturnTarget(target){
  if(!target)return false;
  $(target.dialogId).hidden=false;
  $(target.focusId).focus();
  return true;
}
let makerButtonBlockedUntil=0;
let currentInitialState=0, currentInitialPar=0;
let savedFreeSession=null;
const initialProgress=WakeSevenState.sectionView(gameState,'progress');
let clearedStages=new Set(initialProgress.lap1?.primary||[]);
let clearedExtraStages=new Set(initialProgress.lap1?.mastery||[]);
let clearedSatoriStages=new Set(initialProgress.lap1?.satori||[]);
function readLapProgress(lap,part){
  const statePart=part==='extra'?'mastery':part;
  const vNextProgress=gameState.progress?.['lap'+lap]?.[statePart];
  const key='wake7-lap'+lap+'-'+part+'-cleared';
  const value=storage.json(key,null);
  // 状態ストア移行直後など、progress が空でも flat に最新値が残る場合がある。
  // 実績のある flat 値を優先し、空の progress が保存値を隠さないようにする。
  if(Array.isArray(vNextProgress)&&vNextProgress.length===0&&Array.isArray(value)&&value.length>0)return new Set(value);
  if(Array.isArray(vNextProgress))return new Set(vNextProgress);
  return value===null?null:new Set(Array.isArray(value)?value:[]);
}
const fullStageSet=stages=>new Set(stages.map((_,i)=>i));
let lap1ClearedStages=readLapProgress(1,'primary');
let lap1ClearedExtraStages=readLapProgress(1,'extra');
let lap1ClearedSatoriStages=readLapProgress(1,'satori');
let lap2ClearedStages=readLapProgress(2,'primary');
let lap2ClearedExtraStages=readLapProgress(2,'extra');
let lap2ClearedSatoriStages=readLapProgress(2,'satori');
if(!lap1ClearedStages||!lap1ClearedExtraStages||!lap1ClearedSatoriStages){
  if(secondLapUnlocked){
    lap1ClearedStages=fullStageSet(STAGES);
    lap1ClearedExtraStages=fullStageSet(EXTRA_STAGES);
    lap1ClearedSatoriStages=fullStageSet(SATORI_STAGES);
  }else{
    lap1ClearedStages=new Set(clearedStages);
    lap1ClearedExtraStages=new Set(clearedExtraStages);
    lap1ClearedSatoriStages=new Set(clearedSatoriStages);
  }
}
if(!lap2ClearedStages||!lap2ClearedExtraStages||!lap2ClearedSatoriStages){
  lap2ClearedStages=secondLapUnlocked?new Set(clearedStages):new Set();
  lap2ClearedExtraStages=secondLapUnlocked?new Set(clearedExtraStages):new Set();
  lap2ClearedSatoriStages=secondLapUnlocked?new Set(clearedSatoriStages):new Set();
}
if(activeLap===2&&!secondLapUnlocked)activeLap=1;
clearedStages=activeLap===2?lap2ClearedStages:lap1ClearedStages;
clearedExtraStages=activeLap===2?lap2ClearedExtraStages:lap1ClearedExtraStages;
clearedSatoriStages=activeLap===2?lap2ClearedSatoriStages:lap1ClearedSatoriStages;
secondLapActive=activeLap===2;
// STAGES(だるま学園・だるま修行)の構成を変えた際、既存プレイヤーの位置ベース進行データ
// (clearedStages系・現在地・修了試験の合格フラグ)が新しい問題を指してしまわないよう、
// レイアウトを識別するバージョンが一致しない場合だけ、それらだけをリセットする。
// clearedSatoriStagesやコスメティック系のフラグは対象外。
// 名人への道の45問構成(3くるり30+4くるり15)も組み替えたため、clearedExtraStages系も対象に含める。
const STAGES_LAYOUT_VERSION='2026-08-master-path-reshuffle';
if(storage.get(STORAGE_KEY_GROUPS.progression.stagesLayoutVersion)!==STAGES_LAYOUT_VERSION){
  lap1ClearedStages=new Set();lap2ClearedStages=new Set();
  clearedStages=activeLap===2?lap2ClearedStages:lap1ClearedStages;
  lap1ClearedExtraStages=new Set();lap2ClearedExtraStages=new Set();
  clearedExtraStages=activeLap===2?lap2ClearedExtraStages:lap1ClearedExtraStages;
  speedTrainingTrialCleared=false;speedIntermediateTrialCleared=false;
  try{
    storage.remove(STORAGE_KEY_GROUPS.progression.cleared);
    storage.remove(STORAGE_KEY_GROUPS.progression.lapCleared(1,'primary'));
    storage.remove(STORAGE_KEY_GROUPS.progression.lapCleared(2,'primary'));
    storage.remove(STORAGE_KEY_GROUPS.progression.extraCleared);
    storage.remove(STORAGE_KEY_GROUPS.progression.lapCleared(1,'extra'));
    storage.remove(STORAGE_KEY_GROUPS.progression.lapCleared(2,'extra'));
    storage.remove(STORAGE_KEY_GROUPS.progression.currentStage);
    storage.set(STORAGE_KEY_GROUPS.speed.trainingTrialCleared,'0');
    storage.set(STORAGE_KEY_GROUPS.speed.intermediateTrialCleared,'0');
  }catch(_){}
  storage.set(STORAGE_KEY_GROUPS.progression.stagesLayoutVersion,STAGES_LAYOUT_VERSION);
}
function persistLapProgress(){
  for(const [lap,primary,extra,satori] of [[1,lap1ClearedStages,lap1ClearedExtraStages,lap1ClearedSatoriStages],[2,lap2ClearedStages,lap2ClearedExtraStages,lap2ClearedSatoriStages]]){
    storage.setJson(STORAGE_KEY_GROUPS.progression.lapCleared(lap,'primary'),[...primary]);
    storage.setJson(STORAGE_KEY_GROUPS.progression.lapCleared(lap,'extra'),[...extra]);
    storage.setJson(STORAGE_KEY_GROUPS.progression.lapCleared(lap,'satori'),[...satori]);
  }
  storage.setJson(STORAGE_KEY_GROUPS.progression.cleared,[...clearedStages]);
  storage.setJson(STORAGE_KEY_GROUPS.progression.extraCleared,[...clearedExtraStages]);
  storage.setJson(STORAGE_KEY_GROUPS.progression.satoriCleared,[...clearedSatoriStages]);
  storage.set(STORAGE_KEY_GROUPS.progression.activeLap,String(activeLap));
  if(secondLapUnlocked)storage.set(STORAGE_KEY_GROUPS.progression.secondLapUnlocked,'1');
  else storage.remove(STORAGE_KEY_GROUPS.progression.secondLapUnlocked);
  if(activeLap===2)storage.set(STORAGE_KEY_GROUPS.progression.secondLapActive,'1');
  else storage.remove(STORAGE_KEY_GROUPS.progression.secondLapActive);
}
function activateCampaignLap(lap){
  if(lap===2&&!secondLapUnlocked)return false;
  activeLap=lap;
  secondLapActive=lap===2;
  setUnlock('secondLap',secondLapUnlocked);
  clearedStages=lap===2?lap2ClearedStages:lap1ClearedStages;
  clearedExtraStages=lap===2?lap2ClearedExtraStages:lap1ClearedExtraStages;
  clearedSatoriStages=lap===2?lap2ClearedSatoriStages:lap1ClearedSatoriStages;
  persistLapProgress();
  return true;
}
function beginSecondLap(){
  // 一周目の達成状況は残し、二周目だけを新しい進行として開始する。
  lap2ClearedStages.clear();
  lap2ClearedExtraStages.clear();
  lap2ClearedSatoriStages.clear();
  fourthCheckUsage={};
  secondLapUnlocked=setUnlock('secondLap',true);
  activateCampaignLap(2);
  try{
    storage.set(STORAGE_KEY_GROUPS.progression.secondLapUnlocked,'1');
    storage.remove(STORAGE_KEY_GROUPS.progression.currentStage);
    storage.remove(STORAGE_KEY_GROUPS.progression.activeSession);
    storage.remove(FOURTH_CHECKS_STORAGE_KEY);
    storage.remove(MESSAGE_REVIEW_STORAGE_KEY);
    storage.remove(MESSAGE_REVIEW_LAST_CLEAR_STORAGE_KEY);
  }catch(_){ }
  returnStageContext={extra:false,satori:false,index:0};
  persistLapProgress();
  updateMasterTheme();
  loadStage(0);
}
if(activeLap===2)lap2ClearedSatoriStages=clearedSatoriStages;
else lap1ClearedSatoriStages=clearedSatoriStages;
const isMastered=()=>EXTRA_STAGES.every((_,i)=>clearedExtraStages.has(i));
const isSatoriMastered=()=>SATORI_STAGES.every((_,i)=>clearedSatoriStages.has(i));
const academyCleared=()=>Array.from({length:ACADEMY_STAGE_COUNT},(_,i)=>i).every(i=>clearedStages.has(i));
const progressionTrials=()=>({training:speedTrainingTrialCleared,intermediate:speedIntermediateTrialCleared,mastery:speedMasteryTrialCleared});
const canEnterTraining=()=>PROGRESSION.canEnter('training',{lap:activeLap,trials:progressionTrials()});
const canEnterMastery=()=>PROGRESSION.canEnter('mastery',{lap:activeLap,trials:progressionTrials()});
const canEnterSatori=()=>PROGRESSION.canEnter('satori',{lap:activeLap,mastered:isMastered(),trials:progressionTrials()});
const hasMasterReward=()=>masterGoldGranted;
const hasSatoriReward=()=>isSatoriMastered()||satoriDesignGranted;
function grantMasterReward(){
  if(masterGoldGranted)return;
  masterGoldGranted=setUnlock('masterGoldGranted',true);
  grantMasterRewardSettingsCommand();
  try{storage.set(STORAGE_KEY_GROUPS.rewards.masterGoldGranted,'1');}catch(_){ }
}
function updateMasterTheme(){
  document.body.classList.toggle('mastered',hasMasterReward());
  document.body.classList.toggle('satori-mastered',hasSatoriReward());
  // 悟り制覇の瞬間は、白黒と縦配置をセットで新しい褒美として見せる。
  if(isSatoriMastered()&&!satoriDesignGranted){
    boardTheme='satori';boardLayout='tilted';satoriDesignGranted=setUnlock('satoriDesignGranted',true);
    try{storage.set(STORAGE_KEY_GROUPS.rewards.satoriDesignGranted,'1');}catch(_){ }
  }
  if(hasMasterReward()&&!boardThemeChosen)boardTheme=hasSatoriReward()?'satori':'gold';
  if(hasSatoriReward()&&!boardLayoutChosen)boardLayout='tilted';
  if(rainbowDarumaGranted&&!darumaColorChosen)darumaColor='rainbow';
  if(!rainbowDarumaGranted)darumaColor='red';
  if((boardTheme==='gold'&&!hasMasterReward())||(boardTheme==='satori'&&!hasSatoriReward()))boardTheme='default';
  if(boardLayout==='tilted'&&!hasSatoriReward())boardLayout='normal';
  document.body.dataset.boardTheme=boardTheme;
  document.body.dataset.boardLayout=boardLayout;
  applyBoardTheme();
  try{storage.set(STORAGE_KEY_GROUPS.settings.boardTheme,boardTheme);storage.set(STORAGE_KEY_GROUPS.settings.boardLayout,boardLayout);storage.set(STORAGE_KEY_GROUPS.settings.darumaColor,darumaColor);}catch(_){ }
}
const BOARD_THEME_TONES={
  gold:{stand:{fill:'#F6DE93',stroke:'#C89C35'},fallen:{fill:'#D7B75F',stroke:'#A67D28'}},
  satori:{stand:{fill:'#F1F1ED',stroke:'#D6D6D0'},fallen:{fill:'#AAA9A4',stroke:'#8E8D88'}}
};
const AWAKENED_DARUMA_COLORS=['#C93D35','#D7763D','#C89A36','#4F9676','#4C7FAE','#6B63A4','#AF5E84'];
function darumaBodyColor(index){
  return rainbowDarumaGranted&&darumaColor==='rainbow'?AWAKENED_DARUMA_COLORS[index%AWAKENED_DARUMA_COLORS.length]:'';
}
function applyBoardTheme(){
  const tones=BOARD_THEME_TONES[boardTheme];
  tileEls.forEach(tile=>{
    const hex=tile.querySelector('.hex');
    if(!hex)return;
    const tone=tones?.[tile.classList.contains('fallen')?'fallen':'stand'];
    hex.style.fill=tone?.fill||'';
    hex.style.stroke=tone?.stroke||'';
  });
  const bodyPath=document.querySelector('#daruma-body path:first-child');
  // 二周目の名人への道を制覇した人だけに見える、七色のだるま。
  baseTiles.forEach((tile,index)=>{
    const color=darumaBodyColor(index);
    if(color)tile.style.setProperty('--daruma-body',color);
    else tile.style.removeProperty('--daruma-body');
  });
  if(bodyPath)bodyPath.style.fill='';
  const accentPath=document.querySelector('#daruma-body path:nth-child(4)');
  if(accentPath)accentPath.style.stroke='';
}
function renderBoardThemeOptions(){
  const colors={default:true,gold:hasMasterReward(),satori:hasSatoriReward()};
  $('boardThemeLayoutSection').hidden=!hasSatoriReward();
  $('boardThemeColorLabel').closest('.board-theme-section').classList.toggle('two-color-choice',!hasSatoriReward());
  document.querySelectorAll('[data-board-color]').forEach(button=>{
    const color=button.dataset.boardColor;
    button.hidden=color==='satori'&&!hasSatoriReward();
    button.disabled=!colors[color];
    button.classList.toggle('selected',color===boardTheme);
    button.setAttribute('aria-pressed',String(color===boardTheme));
  });
  document.querySelectorAll('[data-board-layout]').forEach(button=>{
    const layout=button.dataset.boardLayout;
    button.hidden=layout==='tilted'&&!hasSatoriReward();
    button.disabled=layout==='tilted'&&!hasSatoriReward();
    button.classList.toggle('selected',layout===boardLayout);
    button.setAttribute('aria-pressed',String(layout===boardLayout));
  });
  $('darumaColorSection').hidden=!rainbowDarumaGranted;
  document.querySelectorAll('[data-daruma-color]').forEach(button=>{
    const color=button.dataset.darumaColor;
    button.classList.toggle('selected',color===darumaColor);
    button.setAttribute('aria-pressed',String(color===darumaColor));
  });
}
function openBoardThemeDialog(){
  renderBoardThemeOptions();
  $('boardThemeDialog').hidden=false;
  $('boardThemeOptions').querySelector('[data-board-color]:not(:disabled),[data-board-layout]:not(:disabled)')?.focus();
}
const mod3=v=>((v%3)+3)%3;
const isSolved=()=>SOLVER.dist[enc(ori)]===0;
let displayedMoves=null,displayedRemaining=null;
const masterVolume=()=>isMode('mastery')?Math.floor(extraIndex/MASTER_VOLUME_SIZE)+1:0;
const isFinalMasterPuzzle=()=>isMode('mastery')&&extraIndex===EXTRA_STAGES.length-1;
const PROGRESSION=window.WakeSevenProgression.create({
  satoriTotal:SATORI_STAGES.length,
  trainingExamTotal:TRAINING_EXAM_STAGES.length,
  academyTotal:ACADEMY_STAGE_COUNT,
  applicationStart:APPLICATION_STAGE_START,
  applicationTotal:APPLICATION_STAGE_COUNT,
  developmentStart:DEVELOPMENT_STAGE_START,
  developmentTotal:DEVELOPMENT_STAGE_COUNT,
  trainingStart:TRAINING_STAGE_START,
  trainingTotal:TRAINING_STAGE_COUNT,
  basicStart:BASIC_STAGE_START
});
const currentUiPolicy=()=>PROGRESSION.uiPolicy({mode:activeMode,lap:activeLap,stageIndex,speedVariant:isMode('speed')?speedVariant:null});
const isGuidedBasicStage=()=>currentUiPolicy().guidedBasic===true;
// 入門・基本・だるま学園の発展クラスは周回を問わず、余計な操作や現在手数を見せない学習区間。
const isAssistedLearningStage=()=>currentUiPolicy().assisted===true;
// 基本クラス（入門は含まない）だけ、つかめる水色の棒を1〜3本に絞る。
const isNarrowedBasicStage=()=>currentUiPolicy().narrowRods===true;
// だるま学園・発展クラス: 初期候補本数(stage.initialRodCount)だけ棒を絞り込み、間違えた棒はその都度落ちる。
const isDevelopmentStage=()=>currentUiPolicy().development===true;
// 速解き九番勝負: 正解候補を1本含む3本だけを固定表示し、間違えた棒はその都度落ちる。
const isSpeedFallingRodStage=()=>currentUiPolicy().speedFalling===true;
// 発展クラス・速解き九番勝負のどちらでも、間違えた棒を落として二度と選べなくする対象区間。
const isFallingRodStage=()=>currentUiPolicy().eliminateWrongRods===true;
// 応用編は、目標以外を回した場合に盤面を自動で元へ戻す。
const isWrongMoveRewindStage=()=>currentUiPolicy().rewindWrongMove===true;
// 応用編の目標3枚は問題データに書かれた配列だけを表示する。
const isApplicationTargetStage=()=>currentUiPolicy().showTargetCells===true;
// 応用編の強調は「盤面上の位置」ではなく、開始時に選んだ物理パネルへ保持する。
// これによりスワイプでパネルが移動しても、強調が開始位置へ取り残されない。
let applicationTargetTiles=new Set();
function bindApplicationTargetTiles(){
  applicationTargetTiles=new Set();
  if(isApplicationTargetStage()){
    for(const index of STAGES[stageIndex]?.targetCells||[]){
      if(tileEls[index])applicationTargetTiles.add(tileEls[index]);
    }
  }
  renderApplicationTargetCells();
}
function renderApplicationTargetCells(){
  if(!isApplicationTargetStage())applicationTargetTiles.clear();
  tileEls.forEach(tile=>tile.classList.toggle('application-target',applicationTargetTiles.has(tile)));
  // パネル自身のstrokeだけでは隣接パネルの塗りに一部覆われるため、
  // 同じ形の枠をタイル層の最前面にも置く。タイルと同じtransformを使うので、
  // 盤面の並べ替えやスワイプ後も物理パネルに追従する。
  svg.querySelector('.application-target-overlay-layer')?.remove();
  const overlayLayer=document.createElementNS('http://www.w3.org/2000/svg','g');
  overlayLayer.setAttribute('class','application-target-overlay-layer');
  for(const tile of tileEls){
    if(!applicationTargetTiles.has(tile))continue;
    const hex=tile.querySelector('.hex');
    if(!hex)continue;
    const frame=document.createElementNS('http://www.w3.org/2000/svg','path');
    frame.setAttribute('class','application-target-overlay');
    frame.setAttribute('d',hex.getAttribute('d')||'');
    frame.style.transform=tile.style.transform;
    overlayLayer.appendChild(frame);
  }
  // 目標パネルを他のパネルより先に描画する。水色の棒・軸は後ろに置かず、
  // SVGの後続要素として常に目標パネルの境界線より前に表示する。
  const firstPivot=svg.querySelector('.pivot');
  if(firstPivot){
    for(const tile of tileEls){
      if(applicationTargetTiles.has(tile))svg.insertBefore(tile,firstPivot);
    }
    svg.insertBefore(overlayLayer,firstPivot);
  }else svg.appendChild(overlayLayer);
}
// 直接スワイプ中はタイル自身が動くため、静止用の重ね枠を一時的に外す。
// スワイプ完了後は paint() から renderApplicationTargetCells() が再生成する。
function removeApplicationTargetOverlay(){
  svg?.querySelector('.application-target-overlay-layer')?.remove();
}
// だるま修行(上巻・中巻・下巻)全体: 「あと2くるり」に到達した瞬間、形の名前を演出する対象区間。
const isTrainingRangeStage=()=>currentUiPolicy().trainingShapes===true;
let guidedBasicCandidateTis=null,guidedBasicCandidateSignature=null;
// 基本クラス・発展クラス・速解き九番勝負で、間違えて落ちた棒(消すのではなくグレーアウトして残す)。
let fallenRodTis=new Set();
// 学園の補助輪で最初に見せる棒の本数。残り1くるりだけは6本、その他は最大3本にする。
const ACADEMY_GRIP_DISPLAY_RULE=Object.freeze({oneMove:TRI.length,maxGuided:3});
function academyGripDisplayCount(configuredCount,fallbackCount=1){
  if(SOLVER.dist[enc(ori)]===1)return ACADEMY_GRIP_DISPLAY_RULE.oneMove;
  return Math.min(ACADEMY_GRIP_DISPLAY_RULE.maxGuided,Math.max(1,configuredCount??fallbackCount));
}
// 中央の右上に来る軸（右上・中段右のペア）。「定石」として基本6/9で固定表示するのに使う。
const TOP_RIGHT_TI=TRI.findIndex(t=>t.cells.includes(1)&&t.cells.includes(4));
function computeGuidedBasicCandidateTis(){
  const correctTis=[];
  for(let ti=0;ti<TRI.length;ti++){
    for(const dir of [1,-1]){
      if(SOLVER.dist[enc(rollOnce(ori,ti,dir))]===SOLVER.dist[enc(ori)]-1){correctTis.push(ti);break;}
    }
  }
  if(!correctTis.length)return null;
  // 基本6/9だけは、定石として右上の軸を必ず正解として見せる。
  const forceTopRight=stageIndex===BASIC_STAGE_START+5&&correctTis.includes(TOP_RIGHT_TI);
  const primary=forceTopRight?TOP_RIGHT_TI:correctTis[Math.floor(Math.random()*correctTis.length)];
  // 基本クラスは問題が進むほど1→2→3本と増やす。残り1くるりでは6本に戻す。
  const count=academyGripDisplayCount(undefined,stageIndex-BASIC_STAGE_START+1);
  // ダミーは、たまたま正解になってしまう軸を避けて選ぶ（それぞれの候補内だけをシャッフルする）。
  const shuffle=arr=>{for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;};
  const safeDecoyPool=shuffle(Array.from({length:TRI.length},(_,i)=>i).filter(i=>i!==primary&&!correctTis.includes(i)));
  const fallbackDecoyPool=shuffle(Array.from({length:TRI.length},(_,i)=>i).filter(i=>i!==primary&&correctTis.includes(i)));
  const decoyPool=[...safeDecoyPool,...fallbackDecoyPool];
  return new Set([primary,...decoyPool.slice(0,count-1)]);
}
// 発展クラス用: stage.soloRodがあれば必ず候補に含め(3くるり5問の保証された正解棒)、
// なければ距離を縮められる棒からランダムに1本を軸候補にする(4くるり3問)。
// ダミーは、たまたま正解になってしまう軸を避けて選ぶ。本数はstage.initialRodCountに従う。
function computeDevelopmentCandidateTis(){
  const stage=STAGES[stageIndex];
  const correctTis=[];
  for(let ti=0;ti<TRI.length;ti++){
    for(const dir of [1,-1]){
      if(SOLVER.dist[enc(rollOnce(ori,ti,dir))]===SOLVER.dist[enc(ori)]-1){correctTis.push(ti);break;}
    }
  }
  if(!correctTis.length)return null;
  const primary=stage.soloRod!==undefined&&correctTis.includes(stage.soloRod)?stage.soloRod:correctTis[Math.floor(Math.random()*correctTis.length)];
  const shuffle=arr=>{for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;};
  const safeDecoyPool=shuffle(Array.from({length:TRI.length},(_,i)=>i).filter(i=>i!==primary&&!correctTis.includes(i)));
  const fallbackDecoyPool=shuffle(Array.from({length:TRI.length},(_,i)=>i).filter(i=>i!==primary&&correctTis.includes(i)));
  const decoyPool=[...safeDecoyPool,...fallbackDecoyPool];
  // 最初の盤面は問題ごとの本数で導入し、1回進んだ後は残り2〜3くるりの間を3本にそろえる。
  // 残り1くるりに入った時だけ、全6本を見せて最後の正解候補を探せるようにする。
  const count=moves>0?academyGripDisplayCount(3):academyGripDisplayCount(stage.initialRodCount);
  return new Set([primary,...decoyPool.slice(0,count-1)]);
}
// 速解き九番勝負は、毎回3本の中に少なくとも1本の正解候補を含める。
function computeSpeedTrainingCandidateTis(){
  const correctTis=[];
  for(let ti=0;ti<TRI.length;ti++){
    for(const dir of [1,-1]){
      if(SOLVER.dist[enc(rollOnce(ori,ti,dir))]===SOLVER.dist[enc(ori)]-1){correctTis.push(ti);break;}
    }
  }
  if(!correctTis.length)return null;
  const primary=correctTis[Math.floor(Math.random()*correctTis.length)];
  const pool=Array.from({length:TRI.length},(_,i)=>i).filter(i=>i!==primary);
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  return new Set([primary,...pool.slice(0,2)]);
}
function refreshGuidedBasicCandidates(){
  // だるま学園(入門・基本・発展)と速解き九番勝負では、絞り込みが効かない場面でも
  // 「6本全部が候補」として扱う(nullにはしない)。これにより、どの盤面・何くるりでも
  // 間違えた棒を選んだ場合はその場でグレーアウトする挙動を、学園全体で統一できる。
  const fullSet=()=>new Set(Array.from({length:TRI.length},(_,i)=>i));
  if(isDevelopmentStage()){
    const stage=STAGES[stageIndex];
    if(isSolved()){
      guidedBasicCandidateTis=null;guidedBasicCandidateSignature=null;
    }else{
      const signature=stageIndex+':'+moves+':'+enc(ori);
      if(signature!==guidedBasicCandidateSignature){
        fallenRodTis.clear();
        // 初回は問題ごとの候補数で始め、進んだ後も残り2〜3くるりは3本に絞る。
        // 残り1くるりに入った時だけ6本すべてを候補にする。
        guidedBasicCandidateTis=computeDevelopmentCandidateTis()||fullSet();
        guidedBasicCandidateSignature=signature;
      }
    }
  }
  else if(isSpeedFallingRodStage()){
    if(isSolved()){
      guidedBasicCandidateTis=null;guidedBasicCandidateSignature=null;
    }else{
      const signature='speedFalling:'+moves+':'+enc(ori);
      if(signature!==guidedBasicCandidateSignature){
        fallenRodTis.clear();
        guidedBasicCandidateTis=computeSpeedTrainingCandidateTis()||fullSet();
        guidedBasicCandidateSignature=signature;
      }
    }
  }
  else if(isGuidedBasicStage()){
    if(isSolved()){
      guidedBasicCandidateTis=null;guidedBasicCandidateSignature=null;
    }else{
      const signature=stageIndex+':'+moves+':'+enc(ori);
      if(signature!==guidedBasicCandidateSignature){
        fallenRodTis.clear();
        // 基本クラスは1〜9本まで段階的に絞り込む。残り1手や入門はまだ絞り込みが無いので6本全部。
        guidedBasicCandidateTis=(isNarrowedBasicStage()&&SOLVER.dist[enc(ori)]>1)?computeGuidedBasicCandidateTis():fullSet();
        guidedBasicCandidateSignature=signature;
      }
    }
  }
  else{
    guidedBasicCandidateTis=null;guidedBasicCandidateSignature=null;
  }
  svg.querySelectorAll('.grip-marker').forEach(marker=>{
    const ti=Number(marker.dataset.tri);
    const restrict=guidedBasicCandidateTis!==null;
    const isOut=restrict&&!guidedBasicCandidateTis.has(ti);
    const isFallen=isOut&&fallenRodTis.has(ti);
    // 一度も候補に出てこなかった棒は本編の基本クラスと同じく完全に隠す。
    // 候補として出た後に間違えて落ちた棒は、消すのではなくグレーアウトして残す。
    marker.classList.toggle('narrow-hidden',isOut&&!isFallen);
    marker.classList.toggle('eliminated',isFallen);
  });
}
// 補助輪中も盤面全体を見比べられるよう、選択外の4枚は暗転させない。
const usesSwipeDimming=()=>false;
const usesSecondLapSwipe=()=>secondLapActive&&!isSideCourseMode()&&!isMode('speed');
const requiresOptimalClear=()=>isMode('mastery')||isMode('satori');
const masterHintsDisabled=()=>masterVolume()>=2;
const isThirdVolume=()=>isMode('mastery')&&extraIndex>=30&&extraIndex<45;
// 三巻構成では最後の「不立文字」に、従来の終盤ルールをまとめる。
const isFourthVolume=()=>isThirdVolume();

// 速解きランタイムは src/runtime/speed.js に分離しています。

// ===== 残り手数チェック(第四巻) =====
const FOURTH_CHECKS_STORAGE_KEY=STORAGE_KEY_GROUPS.dialogs.fourthChecks;
let fourthCheckUsage={};
try{fourthCheckUsage=JSON.parse(storage.get(FOURTH_CHECKS_STORAGE_KEY)||'{}')||{};}catch(_){fourthCheckUsage={};}
let fourthHintPreview=false,fourthDistanceRevealed=false,fourthHintDistance=null,fourthChecksUsed=0;
const fourthCheckLimit=()=>!isFourthVolume()?0:(extraIndex%MASTER_VOLUME_SIZE<6?2:extraIndex%MASTER_VOLUME_SIZE<12?1:0);
// 極1〜12では、戻す操作で残り手数の使用回数を復活させない。
// 手数オーバーで全員起きた場合だけ、再挑戦用に回数を戻す。
const fourthChecksPersist=()=>isFourthVolume()&&extraIndex%MASTER_VOLUME_SIZE<12;
// 極10〜12だけは、「やり直す」でも残り手数を復活させない。
const fourthChecksSurviveRestart=()=>isFourthVolume()&&extraIndex%MASTER_VOLUME_SIZE>=9&&extraIndex%MASTER_VOLUME_SIZE<12;
const fourthChecksLeft=()=>Math.max(0,fourthCheckLimit()-fourthChecksUsed);
const usesHiddenRemaining=()=>isMode('satori')||isMode('free')||isFourthVolume();
function persistFourthChecks(){
  if(!fourthChecksPersist())return;
  fourthCheckUsage[extraIndex]=fourthChecksUsed;
  try{storage.set(FOURTH_CHECKS_STORAGE_KEY,JSON.stringify(fourthCheckUsage));}catch(_){ }
}
function loadFourthChecks(){
  fourthChecksUsed=fourthChecksPersist()&&Number.isInteger(fourthCheckUsage[extraIndex])?fourthCheckUsage[extraIndex]:0;
}
function renewFourthChecks(){
  if(!isFourthVolume())return;
  fourthChecksUsed=0;
  delete fourthCheckUsage[extraIndex];
  try{storage.set(FOURTH_CHECKS_STORAGE_KEY,JSON.stringify(fourthCheckUsage));}catch(_){ }
}
function resetFourthDistance(){
  fourthHintPreview=false;fourthDistanceRevealed=false;fourthHintDistance=null;
  if(isFourthVolume())renderStageNav();
}
function remainingForDisplay(actual){
  if(isFourthVolume())return fourthDistanceRevealed?actual:'?';
  if(isThirdVolume()&&drag)return '?';
  if(!usesHiddenRemaining())return actual;
  if(fourthHintPreview&&fourthHintDistance!==null)return fourthHintDistance;
  return fourthDistanceRevealed?actual:'?';
}
function showMoves(value){
  const el=$('moves');
  if(displayedMoves===value)return;
  displayedMoves=value; el.textContent=value;
  el.classList.remove('pulse');
  void el.getBoundingClientRect();
  el.classList.add('pulse');
}
function showRemaining(value,animate=true){
  // 九番・十五番勝負では、タイマーと残り最短手数を並べて表示する。
  if(isMode('speed')&&!speedShowsRemaining()){renderSpeedClock();return;}
  const el=$('stagePar');
  if(displayedRemaining===value&&el.textContent===String(value))return;
  displayedRemaining=value;el.textContent=value;
  el.classList.remove('distance-pulse');
  if(animate){
    void el.getBoundingClientRect();
    el.classList.add('distance-pulse');
  }
}
// Android 系ブラウザなど、Vibration API 対応端末だけで軽い手触りを添える。
function haptic(pattern){
  if(document.hidden||typeof navigator==='undefined'||typeof navigator.vibrate!=='function')return;
  try{navigator.vibrate(pattern);}catch(_){ }
}
function hexPath(r){
  let p='';
  for(let i=0;i<6;i++){
    const a=Math.PI/180*(90+60*i);
    p+=(i?'L':'M')+(r*Math.cos(a)).toFixed(2)+' '+(-r*Math.sin(a)).toFixed(2);
  }
  return p+'Z';
}
// 公開ネイティブモジュールの構文境界。
export {};
