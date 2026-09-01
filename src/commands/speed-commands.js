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
export {};
