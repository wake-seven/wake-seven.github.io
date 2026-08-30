// ===== 共通ユーティリティ =====
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
const gameState=window.WakeSevenState.migrateLegacy();
let stageIndex=gameState.navigation.stageIndex,extraIndex=gameState.navigation.masteryIndex,satoriIndex=gameState.navigation.satoriIndex,tutorialStep=gameState.navigation.tutorialStep,activeMode=gameState.navigation.mode,clearShown=false,clearTimer=0,nextStageAttention=false;
let tutorialAdvanceTimer=0,boardArrivalTimer=0;
let pendingMasterThemeRefresh=false;
let lastAnalyticsStageKey='';

/* モードの実体は activeMode のみ。 */
const ACTIVE_MODES=Object.freeze(['tutorial','stage','mastery','satori','speed','free','custom']);
function setActiveMode(mode){
  activeMode=ACTIVE_MODES.includes(mode)?mode:'stage';
  gameState.navigation.mode=activeMode;
}
const isMode=mode=>activeMode===mode;

/* ---- 状態管理の境界 ----
 * 盤面の描画や操作は歴史的にこのファイルへ段階的に追加されてきたため、
 * モード判定と保存キーが各所に散らばりやすい。新しい解放要素・速解き派生
 * モード・問題ごとの案内を追加するときは、まずここを経由する。
 */
const STORAGE_KEYS=Object.freeze({
  language:'wake7-language',sound:'wake7-sound',
  boardTheme:'wake7-board-theme',boardThemeChosen:'wake7-board-theme-chosen',
  boardLayout:'wake7-board-layout',boardLayoutChosen:'wake7-board-layout-chosen',
  darumaColor:'wake7-daruma-color',darumaColorChosen:'wake7-daruma-color-chosen',
  cleared:'wake7-cleared',extraCleared:'wake7-extra-cleared',satoriCleared:'wake7-satori-cleared',
  currentStage:'wake7-current-stage',activeSession:'wake7-active-session',activeLap:'wake7-active-lap',
  introSeen:'wake7-intro-seen',tutorialComplete:'wake7-tutorial-complete',tutorialStep:'wake7-tutorial-step',messageReview:'wake7-message-review',messageReviewLast:'wake7-message-review-last-clear',
  speedSession:'wake7-speed-session',speedActiveVariant:'wake7-speed-active-variant',speedBestMs:'wake7-speed-best-ms',speedHistory:'wake7-speed-history',
  speedUnlocked:'wake7-speed-unlocked',speedTrainingUnlocked:'wake7-speed-training-unlocked',speedIntermediateUnlocked:'wake7-speed-intermediate-unlocked',speedMasteryUnlocked:'wake7-speed-mastery-unlocked',speedSatoriUnlocked:'wake7-speed-satori-unlocked',speedUnlockModelVersion:'wake7-speed-unlock-model-version',speedTrainingTrialCleared:'wake7-speed-training-trial-cleared',speedIntermediateTrialCleared:'wake7-speed-intermediate-trial-cleared',speedMasteryTrialCleared:'wake7-speed-mastery-trial-cleared',speedTrialModelVersion:'wake7-speed-trial-model-version',stagesLayoutVersion:'wake7-stages-layout-version',threeDUnlocked:'wake7-3d-unlocked',
  masterGoldGranted:'wake7-master-gold-granted',satoriDesignGranted:'wake7-satori-design-granted',
  secondLapActive:'wake7-second-lap-active',secondLapUnlocked:'wake7-second-lap-unlocked',
  rainbowDarumaGranted:'wake7-rainbow-daruma-granted',awakenedGranted:'wake7-awakened-granted',
  satoriOrderVersion:'wake7-satori-order-version'
});
const storage={
  get(key,fallback=null){try{const value=localStorage.getItem(key);return value===null?fallback:value;}catch(_){return fallback;}},
  set(key,value){try{localStorage.setItem(key,value);return true;}catch(_){return false;}},
  remove(key){try{localStorage.removeItem(key);return true;}catch(_){return false;}},
  json(key,fallback=null){try{const raw=localStorage.getItem(key);return raw===null?fallback:JSON.parse(raw);}catch(_){return fallback;}},
  setJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch(_){return false;}}
};
/*
 * New persistence boundary. Existing code still reads legacy keys during the
 * incremental migration, but every saved session is also one versioned state
 * document. New features should add fields here instead of new top-level keys.
 */
function syncGameState(legacySession=null){
  gameState.navigation={mode:activeMode,lap:activeLap,stageIndex,masteryIndex:extraIndex,satoriIndex,tutorialStep};
  gameState.progress={
    lap1:{primary:[...lap1ClearedStages],mastery:[...lap1ClearedExtraStages],satori:[...lap1ClearedSatoriStages]},
    lap2:{primary:[...lap2ClearedStages],mastery:[...lap2ClearedExtraStages],satori:[...lap2ClearedSatoriStages]}
  };
  gameState.settings={language:currentLang,sound:soundEnabled,boardTheme,boardLayout,darumaColor};
  gameState.unlocks={
    secondLap:secondLapUnlocked,awakened:awakenedGranted,threeD:threeDUnlocked,
    speedTraining:speedTrainingUnlocked,speedIntermediate:speedIntermediateUnlocked,
    speedMastery:speedMasteryUnlocked,speedSatori:speedSatoriUnlocked
  };
  gameState.speed={activeVariant:speedVariant,sessions:Object.fromEntries(Object.keys(SPEED_MODE_DEFINITIONS).map(variant=>[variant,readSpeedSession(variant)]).filter(([,session])=>session))};
  gameState.ui={editingBoard,lastStageMode};
  gameState.board=typeof serializeActiveBoard==='function'?serializeActiveBoard():gameState.board;
  if(legacySession)gameState.legacySession=legacySession;
  return window.WakeSevenState.write(gameState);
}
const SPEED_LAST_TAB_STORAGE_KEY='wake7-speed-last-tab';
const SPEED_NEW_TAB_STORAGE_KEY='wake7-speed-new-tab';
const COURSE_DEFINITIONS=Object.freeze({
  tutorial:{id:'tutorial',total:TUTORIAL_STEPS.length,label:'tutorial'},
  primary:{id:'primary',total:STAGES.length,label:'training'},
  mastery:{id:'mastery',total:EXTRA_STAGES.length,label:'mastery'},
  satori:{id:'satori',total:SATORI_STAGES.length,label:'satori'},
  speed:{id:'speed',total:SATORI_STAGES.length,label:'speed'},
  free:{id:'free',total:null,label:'free'},custom:{id:'custom',total:null,label:'custom'}
});
const PRIMARY_SECTIONS=Object.freeze([
  {id:'intro',labelKey:'intro',start:0,total:INTRO_STAGE_COUNT,analytics:'training_intro'},
  {id:'basic',labelKey:'basic',start:BASIC_STAGE_START,total:BASIC_STAGE_COUNT,analytics:'training_basic'},
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
function runtimeContext(){
  if(isMode('tutorial'))return {mode:'tutorial',course:COURSE_DEFINITIONS.tutorial,index:tutorialStep,position:tutorialStep+1,total:TUTORIAL_STEPS.length,lap:1};
  if(isMode('custom'))return {mode:'custom',course:COURSE_DEFINITIONS.custom,index:null,position:null,total:null,lap:activeLap};
  if(isMode('free'))return {mode:'free',course:COURSE_DEFINITIONS.free,index:null,position:null,total:null,lap:activeLap};
  if(isMode('speed')){
    const index=speedSession?.index||0;
    return {mode:'speed',course:COURSE_DEFINITIONS.speed,index,position:index+1,total:SATORI_STAGES.length,lap:activeLap};
  }
  if(isMode('satori'))return {mode:'satori',course:COURSE_DEFINITIONS.satori,index:satoriIndex,position:satoriIndex+1,total:SATORI_STAGES.length,lap:activeLap};
  if(isMode('mastery'))return {mode:'mastery',course:COURSE_DEFINITIONS.mastery,index:extraIndex,position:extraIndex+1,total:EXTRA_STAGES.length,lap:activeLap};
  return {mode:'primary',course:COURSE_DEFINITIONS.primary,index:stageIndex,position:stageIndex+1,total:STAGES.length,lap:activeLap};
}
function runtimeStageKey(){
  const ctx=runtimeContext();
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
// 初めて原理を見せる問題は矢印つき、次の問題は「回す3枚」だけを示す。
const BASIC_LESSON_ASSISTS=Object.freeze({
  3:'arrow',4:'axis',8:'arrow',9:'axis'
});
function mainBoardGuidance(){return MAIN_BOARD_GUIDANCE[runtimeStageKey()]||null;}
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
  const context=runtimeContext();
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
    const storedLanguage=storage.get('wake7-language');
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
let soundEnabled=gameState.settings.sound!==false,audioContext=null;
let boardTheme=['default','gold','satori'].includes(gameState.settings.boardTheme)?gameState.settings.boardTheme:'default';
let boardLayout=gameState.settings.boardTheme==='tilted'||gameState.settings.boardLayout==='tilted'?'tilted':'normal';
// Legacy settings are only a fallback while upgrading an incomplete vNext document.
if(!gameState.settings.boardTheme||!gameState.settings.boardLayout)try{
  const savedTheme=storage.get('wake7-board-theme');
  // 旧「縦配置」テーマは、通常色 + 縦配置へ移行する。
  if(savedTheme==='tilted')boardLayout='tilted';
  else if(['default','gold','satori'].includes(savedTheme))boardTheme=savedTheme;
  const savedLayout=storage.get('wake7-board-layout');
  if(['normal','tilted'].includes(savedLayout))boardLayout=savedLayout;
}catch(_){ }
let boardThemeChosen=false;
try{boardThemeChosen=storage.get('wake7-board-theme-chosen')==='1';}catch(_){ }
let boardLayoutChosen=false;
try{boardLayoutChosen=storage.get('wake7-board-layout-chosen')==='1';}catch(_){ }
let darumaColor=['red','rainbow'].includes(gameState.settings.darumaColor)?gameState.settings.darumaColor:'red',darumaColorChosen=false;
if(!gameState.settings.darumaColor)try{
  const savedDarumaColor=storage.get('wake7-daruma-color');
  // 旧版の特別色は、七色のだるまへ移行する。
  if(['red','rainbow'].includes(savedDarumaColor))darumaColor=savedDarumaColor;
  else if(['indigo','gold','green'].includes(savedDarumaColor))darumaColor='rainbow';
  darumaColorChosen=storage.get('wake7-daruma-color-chosen')==='1';
}catch(_){ }
let masterGoldGranted=false;
try{masterGoldGranted=storage.get('wake7-master-gold-granted')==='1';}catch(_){ }
let satoriDesignGranted=false;
try{satoriDesignGranted=storage.get('wake7-satori-design-granted')==='1';}catch(_){ }
let secondLapActive=false;
try{secondLapActive=storage.get('wake7-second-lap-active')==='1';}catch(_){ }
let awakenedGranted=gameState.unlocks.awakened===true;
if(!awakenedGranted)try{awakenedGranted=storage.get('wake7-awakened-granted')==='1';}catch(_){ }
// 速解きモードは、進行状況をリセットしても残す独立した解放要素。
let speedModeUnlocked=false;
try{speedModeUnlocked=storage.get('wake7-speed-unlocked')==='1'||awakenedGranted;}catch(_){speedModeUnlocked=awakenedGranted;}
if(speedModeUnlocked)try{storage.set('wake7-speed-unlocked','1');}catch(_){ }
// この印がない保存データだけを、旧「速解き一括解放」仕様として移行する。
const hasSpeedTrialModel=storage.get(STORAGE_KEYS.speedTrialModelVersion)==='3';
// 速解きは解放された範囲ごとに選択できる。旧版の一括解放は、互換性のため全て解放済みとして移行する。
let speedTrainingUnlocked=false,speedIntermediateUnlocked=false,speedMasteryUnlocked=false,speedSatoriUnlocked=false;
let speedTrainingTrialCleared=false,speedIntermediateTrialCleared=false,speedMasteryTrialCleared=false;
try{
  speedTrainingUnlocked=storage.get('wake7-speed-training-unlocked')==='1';
  speedIntermediateUnlocked=storage.get(STORAGE_KEYS.speedIntermediateUnlocked)==='1';
  speedMasteryUnlocked=storage.get('wake7-speed-mastery-unlocked')==='1';
  speedSatoriUnlocked=storage.get('wake7-speed-satori-unlocked')==='1';
  speedTrainingTrialCleared=storage.get(STORAGE_KEYS.speedTrainingTrialCleared)==='1';
  speedIntermediateTrialCleared=storage.get(STORAGE_KEYS.speedIntermediateTrialCleared)==='1';
  speedMasteryTrialCleared=storage.get(STORAGE_KEYS.speedMasteryTrialCleared)==='1';
}catch(_){ }
if(speedModeUnlocked&&!hasSpeedTrialModel){speedTrainingUnlocked=true;speedIntermediateUnlocked=true;speedMasteryUnlocked=true;speedSatoriUnlocked=true;}
// 旧保存の合格状態は、盤面クリア状況を読み込んだ後で新しい関門へ対応付ける。
// 見た目の報酬だけを残したリセットでは、試験を通過済みにしない。
storage.set(STORAGE_KEYS.speedTrialModelVersion,'3');
if(speedTrainingTrialCleared)try{storage.set(STORAGE_KEYS.speedTrainingTrialCleared,'1');}catch(_){ }
if(speedIntermediateTrialCleared)try{storage.set(STORAGE_KEYS.speedIntermediateTrialCleared,'1');}catch(_){ }
if(speedMasteryTrialCleared)try{storage.set(STORAGE_KEYS.speedMasteryTrialCleared,'1');}catch(_){ }
if(speedModeUnlocked&&!hasSpeedTrialModel)try{
  storage.set(STORAGE_KEYS.speedTrainingUnlocked,'1');
  storage.set(STORAGE_KEYS.speedIntermediateUnlocked,'1');
  storage.set(STORAGE_KEYS.speedMasteryUnlocked,'1');
  storage.set(STORAGE_KEYS.speedSatoriUnlocked,'1');
}catch(_){ }
function syncSpeedUnlockFlag(){
  speedModeUnlocked=speedTrainingUnlocked||speedIntermediateUnlocked||speedMasteryUnlocked||speedSatoriUnlocked;
  if(speedModeUnlocked)storage.set(STORAGE_KEYS.speedUnlocked,'1');
  else storage.remove(STORAGE_KEYS.speedUnlocked);
}
function unlockSpeedVariant(id){
  const wasUnlocked=speedVariantUnlocked(id);
  if(id==='training9')speedTrainingUnlocked=true;
  else if(id==='mastery15')speedIntermediateUnlocked=true;
  else if(id==='mastery24')speedMasteryUnlocked=true;
  else if(id==='satori73'||id==='standard')speedSatoriUnlocked=true;
  syncSpeedUnlockFlag();
  if(!wasUnlocked)storage.set(SPEED_NEW_TAB_STORAGE_KEY,id);
  try{
    if(speedTrainingUnlocked)storage.set(STORAGE_KEYS.speedTrainingUnlocked,'1');
    if(speedIntermediateUnlocked)storage.set(STORAGE_KEYS.speedIntermediateUnlocked,'1');
    if(speedMasteryUnlocked)storage.set(STORAGE_KEYS.speedMasteryUnlocked,'1');
    if(speedSatoriUnlocked)storage.set(STORAGE_KEYS.speedSatoriUnlocked,'1');
  }catch(_){ }
}
// 卒業試験1つ分の合格を、称号判定用の「試験フラグ」と速解きモード側の「解放フラグ」の
// 両方へ一括で反映する。どちらか片方だけ更新してズレる不具合（称号が付かない／メニューに出ない等）を防ぐため、
// 卒業試験に合格させる処理は必ずここを通す。
function grantSpeedTrialCleared(variant){
  if(variant==='training9'){speedTrainingTrialCleared=true;storage.set(STORAGE_KEYS.speedTrainingTrialCleared,'1');}
  else if(variant==='mastery15'){speedIntermediateTrialCleared=true;storage.set(STORAGE_KEYS.speedIntermediateTrialCleared,'1');}
  else if(variant==='mastery24'){speedMasteryTrialCleared=true;storage.set(STORAGE_KEYS.speedMasteryTrialCleared,'1');}
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
    grantSpeedTrialCleared('mastery15');
  }
  if(checkpoint==='mastery'){
    EXTRA_STAGES.forEach((_,i)=>clearedExtraStages.add(i));
    grantSpeedTrialCleared('mastery24');
  }
}
// 3Dページは速解きモード初回クリアの報酬。速解きの解放同様、進行状況リセットでは残す。
let threeDUnlocked=gameState.unlocks.threeD===true;
if(!threeDUnlocked)try{threeDUnlocked=storage.get('wake7-3d-unlocked')==='1';}catch(_){ }
// 七色だるまは二周目の名人達成報酬。旧版で覚者まで到達済みなら移行して保持する。
let rainbowDarumaGranted=false;
try{rainbowDarumaGranted=storage.get('wake7-rainbow-daruma-granted')==='1'||awakenedGranted;}catch(_){rainbowDarumaGranted=awakenedGranted;}
if(rainbowDarumaGranted)try{storage.set('wake7-rainbow-daruma-granted','1');}catch(_){ }
let secondLapUnlocked=gameState.unlocks.secondLap===true;
try{secondLapUnlocked=secondLapUnlocked||storage.get('wake7-second-lap-unlocked')==='1'||secondLapActive||awakenedGranted;}catch(_){secondLapUnlocked=secondLapActive||awakenedGranted;}
let activeLap=gameState.navigation.lap===2?2:1;
let lastStageMode={extra:false,satori:false,index:0};
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
let tutorialHintTimers=[];
let makerButtonBlockedUntil=0,makerRevealTimer=0;
let currentInitialState=0, currentInitialPar=0;
let savedFreeSession=null;
let clearedStages=new Set(gameState.progress.lap1.primary);
let clearedExtraStages=new Set(gameState.progress.lap1.mastery);
let clearedSatoriStages=new Set(gameState.progress.lap1.satori);
function readLapProgress(lap,part){
  const statePart=part==='extra'?'mastery':part;
  const vNextProgress=gameState.progress?.['lap'+lap]?.[statePart];
  if(Array.isArray(vNextProgress))return new Set(vNextProgress);
  const key='wake7-lap'+lap+'-'+part+'-cleared';
  const value=storage.json(key,null);
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
if(storage.get(STORAGE_KEYS.stagesLayoutVersion)!==STAGES_LAYOUT_VERSION){
  lap1ClearedStages=new Set();lap2ClearedStages=new Set();
  clearedStages=activeLap===2?lap2ClearedStages:lap1ClearedStages;
  lap1ClearedExtraStages=new Set();lap2ClearedExtraStages=new Set();
  clearedExtraStages=activeLap===2?lap2ClearedExtraStages:lap1ClearedExtraStages;
  speedTrainingTrialCleared=false;speedIntermediateTrialCleared=false;
  try{
    storage.remove(STORAGE_KEYS.cleared);
    storage.remove('wake7-lap1-primary-cleared');
    storage.remove('wake7-lap2-primary-cleared');
    storage.remove(STORAGE_KEYS.extraCleared);
    storage.remove('wake7-lap1-extra-cleared');
    storage.remove('wake7-lap2-extra-cleared');
    storage.remove(STORAGE_KEYS.currentStage);
    storage.set(STORAGE_KEYS.speedTrainingTrialCleared,'0');
    storage.set(STORAGE_KEYS.speedIntermediateTrialCleared,'0');
  }catch(_){}
  storage.set(STORAGE_KEYS.stagesLayoutVersion,STAGES_LAYOUT_VERSION);
}
// 速解きの段階解放を導入した直後だけ、旧実装が一括で保存してしまった
// 解放フラグを、実際の一周目の到達状況から作り直す。
if(storage.get(STORAGE_KEYS.speedUnlockModelVersion)!=='3'){
  speedTrainingUnlocked=STAGES.every((_,i)=>lap1ClearedStages.has(i));
  speedIntermediateUnlocked=lap1ClearedExtraStages.has(29);
  speedMasteryUnlocked=EXTRA_STAGES.every((_,i)=>lap1ClearedExtraStages.has(i));
  speedSatoriUnlocked=SATORI_STAGES.every((_,i)=>lap1ClearedSatoriStages.has(i));
  // 旧仕様で既に関門より先へ進んでいた人は、新しい試験を通過済みとして扱う。
  speedTrainingTrialCleared=speedTrainingTrialCleared||lap1ClearedExtraStages.size>0;
  speedIntermediateTrialCleared=speedIntermediateTrialCleared||lap1ClearedExtraStages.has(30);
  speedMasteryTrialCleared=speedMasteryTrialCleared||lap1ClearedSatoriStages.size>0;
  syncSpeedUnlockFlag();
  storage.set(STORAGE_KEYS.speedTrainingUnlocked,speedTrainingUnlocked?'1':'0');
  storage.set(STORAGE_KEYS.speedIntermediateUnlocked,speedIntermediateUnlocked?'1':'0');
  storage.set(STORAGE_KEYS.speedMasteryUnlocked,speedMasteryUnlocked?'1':'0');
  storage.set(STORAGE_KEYS.speedSatoriUnlocked,speedSatoriUnlocked?'1':'0');
  storage.set(STORAGE_KEYS.speedTrainingTrialCleared,speedTrainingTrialCleared?'1':'0');
  storage.set(STORAGE_KEYS.speedIntermediateTrialCleared,speedIntermediateTrialCleared?'1':'0');
  storage.set(STORAGE_KEYS.speedMasteryTrialCleared,speedMasteryTrialCleared?'1':'0');
  storage.set(STORAGE_KEYS.speedUnlockModelVersion,'3');
}
function persistLapProgress(){
  for(const [lap,primary,extra,satori] of [[1,lap1ClearedStages,lap1ClearedExtraStages,lap1ClearedSatoriStages],[2,lap2ClearedStages,lap2ClearedExtraStages,lap2ClearedSatoriStages]]){
    storage.setJson('wake7-lap'+lap+'-primary-cleared',[...primary]);
    storage.setJson('wake7-lap'+lap+'-extra-cleared',[...extra]);
    storage.setJson('wake7-lap'+lap+'-satori-cleared',[...satori]);
  }
  storage.setJson(STORAGE_KEYS.cleared,[...clearedStages]);
  storage.setJson(STORAGE_KEYS.extraCleared,[...clearedExtraStages]);
  storage.setJson(STORAGE_KEYS.satoriCleared,[...clearedSatoriStages]);
  storage.set(STORAGE_KEYS.activeLap,String(activeLap));
  if(secondLapUnlocked)storage.set(STORAGE_KEYS.secondLapUnlocked,'1');
  else storage.remove(STORAGE_KEYS.secondLapUnlocked);
  if(activeLap===2)storage.set(STORAGE_KEYS.secondLapActive,'1');
  else storage.remove(STORAGE_KEYS.secondLapActive);
}
function activateCampaignLap(lap){
  if(lap===2&&!secondLapUnlocked)return false;
  activeLap=lap;
  secondLapActive=lap===2;
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
  secondLapUnlocked=true;
  activateCampaignLap(2);
  try{
    storage.set('wake7-second-lap-unlocked','1');
    storage.remove('wake7-current-stage');
    storage.remove('wake7-active-session');
    storage.remove(FOURTH_CHECKS_STORAGE_KEY);
    storage.remove(MESSAGE_REVIEW_STORAGE_KEY);
    storage.remove(MESSAGE_REVIEW_LAST_CLEAR_STORAGE_KEY);
  }catch(_){ }
  lastStageMode={extra:false,satori:false,index:0};
  persistLapProgress();
  updateMasterTheme();
  loadStage(0);
}
function migrateSatoriOrder(){
  let version='';
  try{version=storage.get('wake7-satori-order-version')||'';}catch(_){}
  if(version===SATORI_ORDER_VERSION)return;
  const sourceStages=version==='probability-2'?SATORI_PROBABILITY_ASCENDING
    :version==='probability-3'?SATORI_PROBABILITY_DESCENDING
    :version==='expected-4'?SATORI_EXPECTED_STAGES
    :version==='optimal-path-5'?SATORI_GLOBAL_OPTIMAL_STAGES
    :version==='optimal-path-by-depth-6'?SATORI_DEPTH_OPTIMAL_STAGES
    :version==='optimal-path-7'?SATORI_GLOBAL_OPTIMAL_STAGES
    :version==='optimal-path-human-ties-8'?SATORI_HUMAN_TIE_STAGES
    :version==='mixed-depths-from-26-9'?SATORI_MIXED_STAGES
    :LEGACY_SATORI_STAGES;
  const remapIndex=index=>{
    const stage=sourceStages[index];
    return stage?satoriStageIndexByState.get(stage.state):undefined;
  };
  clearedSatoriStages=new Set([...clearedSatoriStages].map(remapIndex).filter(Number.isInteger));
  for(const key of ['wake7-current-stage','wake7-active-session']){
    try{
      const saved=JSON.parse(storage.get(key)||'null');
      if(saved&&saved.satori===true&&Number.isInteger(saved.index)){
        const next=remapIndex(saved.index);
        if(Number.isInteger(next)){saved.index=next;storage.set(key,JSON.stringify(saved));}
      }
    }catch(_){}
  }
  try{
    storage.set('wake7-satori-cleared',JSON.stringify([...clearedSatoriStages]));
    storage.set('wake7-satori-order-version',SATORI_ORDER_VERSION);
  }catch(_){}
}
migrateSatoriOrder();
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
  masterGoldGranted=true;
  boardTheme='gold';boardThemeChosen=false;
  try{
    storage.set(STORAGE_KEYS.masterGoldGranted,'1');
    storage.remove(STORAGE_KEYS.boardThemeChosen);
  }catch(_){ }
}
function updateMasterTheme(){
  document.body.classList.toggle('mastered',hasMasterReward());
  document.body.classList.toggle('satori-mastered',hasSatoriReward());
  // 悟り制覇の瞬間は、白黒と縦配置をセットで新しい褒美として見せる。
  if(isSatoriMastered()&&!satoriDesignGranted){
    boardTheme='satori';boardLayout='tilted';satoriDesignGranted=true;
    try{storage.set('wake7-satori-design-granted','1');}catch(_){ }
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
  try{storage.set('wake7-board-theme',boardTheme);storage.set('wake7-board-layout',boardLayout);storage.set('wake7-daruma-color',darumaColor);}catch(_){ }
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
// 速解き九番勝負: 棒を6本とも見せ、間違えた棒はその都度落ちる(発展クラスと同じ仕組み、絞り込みなし)。
const isSpeedFallingRodStage=()=>currentUiPolicy().speedFalling===true;
// 発展クラス・速解き九番勝負のどちらでも、間違えた棒を落として二度と選べなくする対象区間。
const isFallingRodStage=()=>currentUiPolicy().eliminateWrongRods===true;
// だるま修行(上巻・中巻・下巻)全体: 「あと2くるり」に到達した瞬間、形の名前を演出する対象区間。
const isTrainingRangeStage=()=>currentUiPolicy().trainingShapes===true;
let guidedBasicCandidateTis=null,guidedBasicCandidateSignature=null;
// 基本クラス・発展クラス・速解き九番勝負で、間違えて落ちた棒(消すのではなくグレーアウトして残す)。
let fallenRodTis=new Set();
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
  // 最初の2問(0,1)は棒1本、そこから1問ごとに1本ずつ増え、6本になったら残りはずっと6本。
  const count=Math.min(TRI.length,Math.max(1,stageIndex-BASIC_STAGE_START));
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
  const count=Math.min(TRI.length,stage.initialRodCount||TRI.length);
  return new Set([primary,...decoyPool.slice(0,count-1)]);
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
        // 絞り込みは最初の1手(3くるり5問なら3→2、4くるり3問なら4→3)だけ。
        // 一度でも進んだら(あと3くるり・2くるりになったら)6本全部を候補にする。
        guidedBasicCandidateTis=(SOLVER.dist[enc(ori)]<stage.par)?fullSet():computeDevelopmentCandidateTis();
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
        guidedBasicCandidateTis=fullSet();
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
const usesSecondLapSwipe=()=>secondLapActive&&!isMode('free')&&!isMode('custom')&&!isMode('speed');
const requiresOptimalClear=()=>isMode('mastery')||isMode('satori');
const masterHintsDisabled=()=>masterVolume()>=2;
const isThirdVolume=()=>isMode('mastery')&&extraIndex>=30&&extraIndex<45;
// 三巻構成では最後の「不立文字」に、従来の終盤ルールをまとめる。
const isFourthVolume=()=>isThirdVolume();

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
function saveSpeedSession(){
  if(!speedSession)return;
  const elapsed=speedElapsedMs();
  const payload={...speedSession,variant:activeSpeedDefinition().id,elapsedMs:elapsed,board:isMode('speed')?serializeActiveBoard():speedSession.board};
  storage.setJson(speedSessionStorageKey(),payload);
  storage.set(STORAGE_KEYS.speedActiveVariant,payload.variant);
}
function pauseSpeedRun(){if(!isMode('speed'))return;pauseSpeedClock();saveSpeedSession();}
function openSpeedPauseDialog(){
  if(!isMode('speed'))return;
  speedManuallyPaused=true;
  pauseSpeedClock();saveSpeedSession();
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
    saveSpeedSession();saveActiveSession();
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
  saveSpeedSession();saveActiveSession();startSpeedClock();
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
  storage.remove(speedSessionStorageKey());
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
  pauseSpeedClock();saveSpeedSession();
  const delay=celebrateClear();
  clearTimer=setTimeout(advanceSpeedRun,delay+120);
}
// ===== 残り手数チェック(第四巻) =====
const FOURTH_CHECKS_STORAGE_KEY='wake7-fourth-checks';
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
// ===== HUD・サウンド =====
function playTone(frequency,duration=.06,volume=.028,delay=0){
  if(!soundEnabled||document.hidden)return;
  try{
    const AudioCtor=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtor)return;
    if(!audioContext)audioContext=new AudioCtor();
    if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
    const start=audioContext.currentTime+delay;
    const oscillator=audioContext.createOscillator();
    const gain=audioContext.createGain();
    oscillator.type='sine';
    oscillator.frequency.setValueAtTime(frequency,start);
    gain.gain.setValueAtTime(.0001,start);
    gain.gain.exponentialRampToValueAtTime(volume,start+.008);
    gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(start);oscillator.stop(start+duration+.02);
  }catch(_){ }
}
function playRotateSound(direction){playTone(direction>0?392:349,.055,.022);}
function playClearSound(kind='normal'){
  const tunes={
    normal:[[523,0],[659,.075],[784,.15]],
    volume:[[440,0],[554,.08],[659,.16],[880,.26]],
    training:[[440,0],[554,.07],[659,.14],[880,.23],[1109,.33]],
    mastery:[[392,0],[523,.08],[659,.16],[784,.24],[1047,.34],[1319,.47]],
    // 悟りの制覇は名人クリアよりさらに一段高い、C7 まで届く上昇音にする。
    satori:[[392,0],[523,.075],[659,.15],[784,.225],[1047,.31],[1319,.405],[1568,.51],[2093,.64]]
  };
  (tunes[kind]||tunes.normal).forEach(([tone,delay])=>playTone(tone,.18,.032,delay));
}
function clearSoundKind(){
  if(isMode('free')||isMode('custom')||isMode('speed'))return 'normal';
  if(isMode('satori')&&satoriIndex===SATORI_STAGES.length-1&&isSatoriMastered())return 'satori';
  if(!isMode('mastery')&&stageIndex===STAGES.length-1&&allPrimaryCleared())return 'training';
  if(isMode('mastery')&&(extraIndex+1)%MASTER_VOLUME_SIZE===0)return extraIndex===EXTRA_STAGES.length-1?'mastery':'volume';
  return 'normal';
}
function updateSoundToggle(){
  const button=$('soundToggle');
  button.setAttribute('aria-label',tr(soundEnabled?'soundOn':'soundOff'));
  button.setAttribute('aria-pressed',String(soundEnabled));
  button.innerHTML=soundEnabled
    ?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6l-5 4H4Z"/><path d="M16 9.5a4 4 0 0 1 0 5M18.5 7a7.5 7.5 0 0 1 0 10"/></svg>'
    :'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6l-5 4H4Z"/><path d="m4 4 16 16"/></svg>';
}

function hexPath(r){
  let p='';
  for(let i=0;i<6;i++){
    const a=Math.PI/180*(90+60*i);
    p+=(i?'L':'M')+(r*Math.cos(a)).toFixed(2)+' '+(-r*Math.sin(a)).toFixed(2);
  }
  return p+'Z';
}
