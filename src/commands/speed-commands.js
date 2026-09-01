// 速解き固有のセッション状態を書き込むcommand。時計・表示・遷移はruntime側に残す。
function startSpeedSessionCommand(){
  if(!speedSession||speedSession.started)return false;
  speedSession.started=true;
  return true;
}
function advanceSpeedSessionCommand(){
  if(!speedSession||speedSession.index>=speedSession.total-1)return false;
  speedSession.index++;
  speedSession.board=null;
  speedSession.movedCurrent=false;
  speedSession.restartedCurrent=false;
  return true;
}
function setSpeedManualPauseCommand(value){speedManuallyPaused=value===true;return speedManuallyPaused;}
function persistSpeedSessionCommand(){
  if(!speedSession)return false;
  const elapsed=speedElapsedMs();
  const payload={...speedSession,variant:activeSpeedDefinition().id,elapsedMs:elapsed,board:isMode('speed')?serializeActiveBoard():speedSession.board};
  storage.setJson(speedSessionStorageKey(),payload);storage.set(STORAGE_KEYS.speedActiveVariant,payload.variant);
  return true;
}
function clearSpeedSessionCommand(variant=speedVariant){storage.remove(speedSessionStorageKey(variant));return true;}
function completeSpeedSessionCommand(result){
  if(!speedSession)return false;
  speedSession={...speedSession,...result,completed:true};
  return true;
}
export {};
