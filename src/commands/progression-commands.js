// 進行報酬の書き込みcommand。節目ダイアログの表示処理から状態更新を分離する。
function grantMasterDialogRewardsCommand(kind){
  if(kind==='satori'&&!secondLapActive){unlockSpeedVariant('satori73');renderStageNav();}
  if(kind==='mastery'&&secondLapActive&&!rainbowDarumaGranted){
    rainbowDarumaGranted=setUnlock('rainbowDarumaGranted',true);darumaColor='rainbow';darumaColorChosen=false;
    try{storage.set(STORAGE_KEYS.rainbowDarumaGranted,'1');storage.remove('wake7-daruma-color-chosen');}catch(_){ }
    updateMasterTheme();renderStageNav();
  }
  if(kind==='awakening'&&!awakenedGranted){
    awakenedGranted=setUnlock('awakened',true);threeDUnlocked=setUnlock('threeD',true);
    try{storage.set(STORAGE_KEYS.awakenedGranted,'1');storage.set(STORAGE_KEYS.threeDUnlocked,'1');}catch(_){ }
    persistLapProgress();updateMasterTheme();renderStageNav();rememberSpecialMessage('awakening');
  }
}
export {};
