// ===== 設定・About・リセットの機能入口 =====
// 設定画面の入口と復帰状態だけをまとめ、設定値の保存・描画は既存の所有処理へ委譲する。
function readSettingsFeatureContext(){
  const settings=WakeSevenAppContext.state.settings.read();
  const dialog=(id)=>!$(id)?.hidden;
  return Object.freeze({
    ...settings,
    settingsOpen:dialog('settingsDialog'),
    aboutOpen:dialog('aboutDialog'),
    resetOpen:dialog('resetDialog')
  });
}
function openSettingsFeature(){
  $('settingsDialog').hidden=false;
  $('settingsDialogClose').focus();
  return true;
}
function openAboutFeature(){
  $('settingsDialog').hidden=true;
  $('aboutDialog').hidden=false;
  $('aboutDialogCloseBtn').focus();
  return true;
}
function closeSettingsFeature(id='settingsDialog'){
  return setDialogOpenState(id,false);
}
function openResetFeature(){
  $('settingsDialog').hidden=true;
  const canKeepRewards=hasMasterReward();
  $('resetDialogText').textContent=tr(canKeepRewards?'resetConfirmKeepRewards':'resetConfirmEarly');
  $('resetDialogAll').hidden=!canKeepRewards;
  $('resetDialogConfirm').textContent=tr('resetProgress');
  $('resetDialogAll').textContent=tr('resetEverything');
  $('resetDialog').hidden=false;
  $('resetDialogClose').focus();
  return true;
}
function resetSettingsFeature(options={resetIntro:true,showIntro:true,preserveRewards:true}){
  $('resetDialog').hidden=true;
  resetStoredProgress(options);
  return true;
}
const WakeSevenSettingsFeature=Object.freeze({
  context:readSettingsFeatureContext,
  open:openSettingsFeature,
  openAbout:openAboutFeature,
  openReset:openResetFeature,
  reset:resetSettingsFeature,
  close:closeSettingsFeature,
  restore:openSettingsFeature
});
export {};
