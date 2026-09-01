// 速解き解放状態の読み込み。
// 実行時の状態変数は runtime.js が所有し、ここは保存境界だけを担当する。
function initializeSpeedUnlockState({initialUnlocks={},awakenedGranted=false}={}){
  return Object.freeze({
    modeUnlocked:initialUnlocks.speedTraining===true||initialUnlocks.speedIntermediate===true||initialUnlocks.speedMastery===true||initialUnlocks.speedSatori===true||awakenedGranted===true,
    training:initialUnlocks.speedTraining===true,
    intermediate:initialUnlocks.speedIntermediate===true,
    mastery:initialUnlocks.speedMastery===true,
    satori:initialUnlocks.speedSatori===true,
    trainingTrial:initialUnlocks.speedTrainingTrialCleared===true,
    intermediateTrial:initialUnlocks.speedIntermediateTrialCleared===true,
    masteryTrial:initialUnlocks.speedMasteryTrialCleared===true
  });
}
// 公開native moduleの構文境界。
export {};
