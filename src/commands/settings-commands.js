// 設定変更の書き込み境界。UIイベントはこのcommandを呼び、保存形式を直接扱わない。
function toggleSoundCommand(){
  const settings=WakeSevenAppContext.state.settings.read();
  const soundEnabledNext=!settings.soundEnabled;
  WakeSevenAppContext.state.settings.update({soundEnabled:soundEnabledNext});
  try{commandStorageSet(STORAGE_KEY_GROUPS.settings.sound,soundEnabledNext?'on':'off');}catch(_){ }
  updateSoundToggle();
  if(soundEnabledNext)playTone(523,.07,.025);
}
function selectBoardThemeCommand(button){
  if(!button||button.disabled)return;
  if(button.dataset.boardColor){
    WakeSevenAppContext.state.settings.update({boardTheme:button.dataset.boardColor,boardThemeChosen:true});
    try{commandStorageSet(STORAGE_KEY_GROUPS.settings.boardThemeChosen,'1');}catch(_){ }
  }else if(button.dataset.boardLayout){
    WakeSevenAppContext.state.settings.update({boardLayout:button.dataset.boardLayout,boardLayoutChosen:true});
    try{commandStorageSet(STORAGE_KEY_GROUPS.settings.boardLayoutChosen,'1');}catch(_){ }
  }else if(button.dataset.darumaColor){
    WakeSevenAppContext.state.settings.update({darumaColor:button.dataset.darumaColor,darumaColorChosen:true});
    try{commandStorageSet(STORAGE_KEY_GROUPS.settings.darumaColor,darumaColor);commandStorageSet(STORAGE_KEY_GROUPS.settings.darumaColorChosen,'1');}catch(_){ }
  }else return;
  updateMasterTheme();
  renderBoardThemeOptions();
}
function grantMasterRewardSettingsCommand(){
  WakeSevenAppContext.state.settings.update({boardTheme:'gold',boardThemeChosen:false});
  try{commandStorageRemove(STORAGE_KEY_GROUPS.settings.boardThemeChosen);}catch(_){ }
}
function resetSettingsCommand(){
  WakeSevenAppContext.state.settings.update({soundEnabled:true,boardTheme:'default',boardLayout:'normal',boardThemeChosen:false,boardLayoutChosen:false,darumaColor:'red',darumaColorChosen:false});
}
function setLanguageCommand(lang){
  if(!UI_TEXT[lang])return false;
  WakeSevenAppContext.state.settings.update({currentLang:lang});
  try{commandStorageSet(STORAGE_KEY_GROUPS.settings.language,lang);}catch(_){ }
  return true;
}
export {};
