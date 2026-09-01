/** Speed-trial unlock state service for the ESM runtime. */
export function createSpeedUnlockService({ initialUnlocks = {}, awakenedGranted = false } = {}) {
  const initialize = () => Object.freeze({
    modeUnlocked: initialUnlocks.speedTraining === true || initialUnlocks.speedIntermediate === true
      || initialUnlocks.speedMastery === true || initialUnlocks.speedSatori === true || awakenedGranted === true,
    training: initialUnlocks.speedTraining === true,
    intermediate: initialUnlocks.speedIntermediate === true,
    mastery: initialUnlocks.speedMastery === true,
    satori: initialUnlocks.speedSatori === true,
    trainingTrial: initialUnlocks.speedTrainingTrialCleared === true,
    intermediateTrial: initialUnlocks.speedIntermediateTrialCleared === true,
    masteryTrial: initialUnlocks.speedMasteryTrialCleared === true
  });
  return Object.freeze({ initialize });
}
