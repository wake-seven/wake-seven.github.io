// 共有状態を書き換える操作命令。
// 画面イベントは個別の let や保存形式を直接変更せず、この入口へ意図を渡す。
function updateNavigationStateCommand(patch={}){
  return WakeSevenAppContext.state.navigation.update(patch);
}
function updateDialogStateCommand(patch={}){
  return WakeSevenAppContext.state.dialog.update(patch);
}
function updateSessionStateCommand(patch={}){
  return WakeSevenAppContext.state.session.update(patch);
}
function setCampaignModeCommand(mode,patch={}){
  return updateNavigationStateCommand({ ...patch, mode });
}
function restoreNavigationStateCommand(navigation={}){
  return updateNavigationStateCommand({
    mode:navigation.mode,
    lap:navigation.lap,
    stageIndex:navigation.stageIndex,
    masteryIndex:navigation.masteryIndex,
    satoriIndex:navigation.satoriIndex,
    tutorialStep:navigation.tutorialStep,
    lastStageMode:navigation.lastStageMode
  });
}
export {};
