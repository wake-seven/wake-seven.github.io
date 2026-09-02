// 進行報酬を書き込む操作命令。節目ダイアログの表示処理から状態更新を分離する。
function grantMasterDialogRewardsCommand(kind){
  if(kind==='satori'&&!secondLapActive){unlockSpeedVariant('satori73');renderStageNav();}
  if(kind==='mastery'&&secondLapActive&&!rainbowDarumaGranted){
    rainbowDarumaGranted=setUnlock('rainbowDarumaGranted',true);darumaColor='rainbow';darumaColorChosen=false;
    try{storage.set(STORAGE_KEY_GROUPS.rewards.rainbowDarumaGranted,'1');storage.remove(STORAGE_KEY_GROUPS.settings.darumaColorChosen);}catch(_){ }
    updateMasterTheme();renderStageNav();
  }
  if(kind==='awakening'&&!awakenedGranted){
    awakenedGranted=setUnlock('awakened',true);threeDUnlocked=setUnlock('threeD',true);
    try{storage.set(STORAGE_KEY_GROUPS.rewards.awakenedGranted,'1');storage.set(STORAGE_KEY_GROUPS.rewards.threeDUnlocked,'1');}catch(_){ }
    persistLapProgress();updateMasterTheme();renderStageNav();rememberSpecialMessage('awakening');
  }
}
// クリア済み集合への反映と保存を一つの境界にまとめる。
function recordProgressClearCommand(kind,index){
  if(!Number.isInteger(index)||index<0)return false;
  if(kind==='satori')clearedSatoriStages.add(index);
  else if(kind==='mastery')clearedExtraStages.add(index);
  else if(kind==='primary')clearedStages.add(index);
  else return false;
  persistLapProgress();
  return true;
}
export {};
