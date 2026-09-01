// 設定変更の書き込み境界。UIイベントはこのcommandを呼び、保存形式を直接扱わない。
function toggleSoundCommand(){
  soundEnabled=!soundEnabled;
  try{storage.set(STORAGE_KEY_GROUPS.settings.sound,soundEnabled?'on':'off');}catch(_){ }
  updateSoundToggle();
  if(soundEnabled)playTone(523,.07,.025);
}
function selectBoardThemeCommand(button){
  if(!button||button.disabled)return;
  if(button.dataset.boardColor){
    boardTheme=button.dataset.boardColor;
    boardThemeChosen=true;
    try{storage.set(STORAGE_KEY_GROUPS.settings.boardThemeChosen,'1');}catch(_){ }
  }else if(button.dataset.boardLayout){
    boardLayout=button.dataset.boardLayout;
    boardLayoutChosen=true;
    try{storage.set(STORAGE_KEY_GROUPS.settings.boardLayoutChosen,'1');}catch(_){ }
  }else if(button.dataset.darumaColor){
    darumaColor=button.dataset.darumaColor;
    darumaColorChosen=true;
    try{storage.set(STORAGE_KEY_GROUPS.settings.darumaColor,darumaColor);storage.set(STORAGE_KEY_GROUPS.settings.darumaColorChosen,'1');}catch(_){ }
  }else return;
  updateMasterTheme();
  renderBoardThemeOptions();
}
export {};
