// チュートリアル状態の書き込みcommand。演出・誤操作判定はUI側に残す。
function setTutorialStepCommand(index){
  tutorialStep=Math.max(0,Math.min(TUTORIAL_STEPS.length-1,index));
  WakeSevenState.setNavigationIndex(gameState,'tutorial',tutorialStep);
  commandStorageSet(STORAGE_KEY_GROUPS.progression.tutorialStep,String(tutorialStep));
  return tutorialStep;
}
function completeTutorialCommand(){
  commandStorageSet(STORAGE_KEY_GROUPS.progression.tutorialComplete,'1');
  commandStorageRemove(STORAGE_KEY_GROUPS.progression.tutorialStep);
  return true;
}
function resetTutorialCommand(){
  tutorialStep=0;
  commandStorageRemove(STORAGE_KEY_GROUPS.progression.tutorialStep);
  commandStorageRemove(STORAGE_KEY_GROUPS.progression.introSeen);
  return true;
}
function persistTutorialSessionCommand(step=tutorialStep){
  syncGameState();
  commandStorageSetJson(STORAGE_KEY_GROUPS.progression.activeSession,{mode:'tutorial',step});
  commandStorageSet(STORAGE_KEY_GROUPS.progression.tutorialStep,String(step));
  return true;
}
export {};
