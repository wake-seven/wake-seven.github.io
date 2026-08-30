// 速解き解放状態の読み込みと、旧保存形式からの移行。
// 実行時の状態変数は runtime.js が所有し、ここは保存境界だけを担当する。
function initializeSpeedUnlockState({initialUnlocks,storage,storageKeys,awakenedGranted}){
  let modeUnlocked=false;
  try{modeUnlocked=storage.get(storageKeys.speedUnlocked)==='1'||awakenedGranted;}
  catch(_){modeUnlocked=awakenedGranted;}
  if(modeUnlocked)try{storage.set(storageKeys.speedUnlocked,'1');}catch(_){ }

  const hasTrialModel=storage.get(storageKeys.speedTrialModelVersion)==='3';
  let training=false,intermediate=false,mastery=false,satori=false;
  let trainingTrial=false,intermediateTrial=false,masteryTrial=false;
  try{
    training=storage.get('wake7-speed-training-unlocked')==='1';
    intermediate=storage.get(storageKeys.speedIntermediateUnlocked)==='1';
    mastery=storage.get('wake7-speed-mastery-unlocked')==='1';
    satori=storage.get('wake7-speed-satori-unlocked')==='1';
    trainingTrial=storage.get(storageKeys.speedTrainingTrialCleared)==='1';
    intermediateTrial=storage.get(storageKeys.speedIntermediateTrialCleared)==='1';
    masteryTrial=storage.get(storageKeys.speedMasteryTrialCleared)==='1';
  }catch(_){ }
  if(modeUnlocked&&!hasTrialModel){
    training=true;intermediate=true;mastery=true;satori=true;
  }

  // 旧保存の合格状態は、盤面クリア状況を読み込んだ後で新しい関門へ対応付ける。
  storage.set(storageKeys.speedTrialModelVersion,'3');
  if(trainingTrial)try{storage.set(storageKeys.speedTrainingTrialCleared,'1');}catch(_){ }
  if(intermediateTrial)try{storage.set(storageKeys.speedIntermediateTrialCleared,'1');}catch(_){ }
  if(masteryTrial)try{storage.set(storageKeys.speedMasteryTrialCleared,'1');}catch(_){ }
  if(modeUnlocked&&!hasTrialModel)try{
    storage.set(storageKeys.speedTrainingUnlocked,'1');
    storage.set(storageKeys.speedIntermediateUnlocked,'1');
    storage.set(storageKeys.speedMasteryUnlocked,'1');
    storage.set(storageKeys.speedSatoriUnlocked,'1');
  }catch(_){ }
  return Object.freeze({
    modeUnlocked,
    training,intermediate,mastery,satori,
    trainingTrial,intermediateTrial,masteryTrial
  });
}
// 公開native moduleの構文境界。
export {};
