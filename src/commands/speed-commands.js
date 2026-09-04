// 速解き固有のセッション状態を書き込む操作命令。時計・表示・遷移は実行側に残す。
function startSpeedSessionCommand(){
  if(!speedSession||speedSession.started)return false;
  speedSession.started=true;
  return true;
}
function advanceSpeedSessionCommand(){
  if(!speedSession||speedSession.index>=speedSession.total-1)return false;
  // 2問目以降へ進む時点で開始待ちは終了している。開始フラグを
  // 明示的に維持し、次問題の描画で開始オーバーレイが一瞬戻らないようにする。
  speedSession.started=true;
  speedSession.index++;
  speedSession.board=null;
  speedSession.movedCurrent=false;
  speedSession.restartedCurrent=false;
  return true;
}
function setSpeedManualPauseCommand(value){speedManuallyPaused=value===true;return speedManuallyPaused;}
function startSpeedClockStateCommand(startedAt){speedClockStarted=startedAt;return speedClockStarted;}
function pauseSpeedClockStateCommand(now=commandNow()){
  if(speedClockStarted){if(speedSession)speedSession.elapsedMs+=now-speedClockStarted;speedClockStarted=0;}
  return speedSession?.elapsedMs||0;
}
function persistSpeedSessionCommand(){
  if(!speedSession)return false;
  const elapsed=speedElapsedMs();
  // 保存先と定義は、画面の選択状態ではなく実行中セッション自身のvariantで決める。
  // 九番勝負から十八番勝負へ切り替えた直後に、古いセッションへ上書きする事故を防ぐ。
  const variant=SPEED_MODE_DEFINITIONS[speedSession.variant]?speedSession.variant:'training9';
  const payload={...speedSession,variant,elapsedMs:elapsed,board:isMode('speed')?serializeActiveBoard():speedSession.board};
  commandStorageSetJson(speedSessionStorageKey(variant),payload);commandStorageSet(STORAGE_KEY_GROUPS.speed.activeVariant,variant);
  return true;
}
function clearSpeedSessionCommand(variant=speedVariant){commandStorageRemove(speedSessionStorageKey(variant));return true;}
function completeSpeedSessionCommand(result){
  if(!speedSession)return false;
  setSpeedSessionCommand({...speedSession,...result,completed:true});
  return true;
}
export {};
