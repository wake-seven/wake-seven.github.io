// チュートリアル状態の書き込みcommand。演出・誤操作判定はUI側に残す。
function setTutorialStepCommand(index){
  tutorialStep=Math.max(0,Math.min(TUTORIAL_STEPS.length-1,index));
  WakeSevenState.setNavigationIndex(gameState,'tutorial',tutorialStep);
  storage.set(STORAGE_KEYS.tutorialStep,String(tutorialStep));
  return tutorialStep;
}
function completeTutorialCommand(){
  storage.set(STORAGE_KEYS.tutorialComplete,'1');
  storage.remove(STORAGE_KEYS.tutorialStep);
  return true;
}
function resetTutorialCommand(){
  tutorialStep=0;
  storage.remove(STORAGE_KEYS.tutorialStep);
  storage.remove(STORAGE_KEYS.introSeen);
  return true;
}
function persistTutorialSessionCommand(step=tutorialStep){
  syncGameState();
  storage.setJson(STORAGE_KEYS.activeSession,{mode:'tutorial',step});
  storage.set(STORAGE_KEYS.tutorialStep,String(step));
  return true;
}
export {};
