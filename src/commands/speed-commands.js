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
function pauseSpeedClockStateCommand(now=performance.now()){
  if(speedClockStarted){if(speedSession)speedSession.elapsedMs+=now-speedClockStarted;speedClockStarted=0;}
  return speedSession?.elapsedMs||0;
}
function persistSpeedSessionCommand(){
  if(!speedSession)return false;
  const elapsed=speedElapsedMs();
  const payload={...speedSession,variant:activeSpeedDefinition().id,elapsedMs:elapsed,board:isMode('speed')?serializeActiveBoard():speedSession.board};
  storage.setJson(speedSessionStorageKey(),payload);storage.set(STORAGE_KEY_GROUPS.speed.activeVariant,payload.variant);
  return true;
}
function clearSpeedSessionCommand(variant=speedVariant){storage.remove(speedSessionStorageKey(variant));return true;}
function completeSpeedSessionCommand(result){
  if(!speedSession)return false;
  speedSession={...speedSession,...result,completed:true};
  return true;
}
export {};
