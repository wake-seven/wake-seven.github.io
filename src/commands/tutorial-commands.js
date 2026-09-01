// チュートリアル状態の書き込みcommand。演出・誤操作判定はUI側に残す。
function setTutorialStepCommand(index){
  tutorialStep=Math.max(0,Math.min(TUTORIAL_STEPS.length-1,index));
  WakeSevenState.setNavigationIndex(gameState,'tutorial',tutorialStep);
  storage.set(STORAGE_KEY_GROUPS.progression.tutorialStep,String(tutorialStep));
  return tutorialStep;
}
function completeTutorialCommand(){
  storage.set(STORAGE_KEY_GROUPS.progression.tutorialComplete,'1');
  storage.remove(STORAGE_KEY_GROUPS.progression.tutorialStep);
  return true;
}
function resetTutorialCommand(){
  tutorialStep=0;
  storage.remove(STORAGE_KEY_GROUPS.progression.tutorialStep);
  storage.remove(STORAGE_KEY_GROUPS.progression.introSeen);
  return true;
}
function persistTutorialSessionCommand(step=tutorialStep){
  syncGameState();
  storage.setJson(STORAGE_KEY_GROUPS.progression.activeSession,{mode:'tutorial',step});
  storage.set(STORAGE_KEY_GROUPS.progression.tutorialStep,String(step));
  return true;
}
export {};
