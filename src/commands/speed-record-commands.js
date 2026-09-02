// 速解きの記録データを書き込む操作命令。表示用の集計・描画は実行側に残す。
function updateSpeedOptimalClearsCommand(){
  if(!speedSession)return false;
  speedSession.optimalClears=speedOptimalClears()+1;
  return true;
}
function recordSpeedCompletionCommand(elapsed,optimalClears){
  if(!speedSession)return null;
  const time=Math.max(0,Math.round(elapsed));
  let bestTime=Number(storage.get(speedBestStorageKey(),'0'))||0;
  if(!bestTime||time<bestTime){bestTime=time;storage.set(speedBestStorageKey(),String(bestTime));}
  const entries=storage.json(speedHistoryStorageKey(),[]);
  const history=Array.isArray(entries)?entries.filter(entry=>Number.isFinite(entry?.elapsedMs)&&entry.elapsedMs>=0):[];
  history.unshift({elapsedMs:time,optimalClears,total:speedSession.total||activeSpeedDefinition().total,completedAt:Date.now()});
  storage.setJson(speedHistoryStorageKey(),history.slice(0,20));
  clearSpeedSessionCommand();
  storage.remove(STORAGE_KEY_GROUPS.speed.activeVariant);
  completeSpeedSessionCommand({elapsedMs:time,bestMs:bestTime,optimalClears,runNumber:history.length});
  return {bestTime,history,runNumber:history.length};
}
export {};
