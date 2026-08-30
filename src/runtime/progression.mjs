/** Speed-trial unlock migration service for the ESM runtime. */
export function createSpeedUnlockService({ storage, storageKeys = {}, awakenedGranted = false } = {}) {
  const get = key => { try { return storage?.getItem ? storage.getItem(key) : storage?.get?.(key); } catch { return null; } };
  const set = (key, value = '1') => { try { if (storage?.setItem) storage.setItem(key, value); else storage?.set?.(key, value); } catch {} };
  const initialize = () => {
    const modeUnlocked = get(storageKeys.speedUnlocked) === '1' || awakenedGranted;
    if (modeUnlocked) set(storageKeys.speedUnlocked);
    const hasTrialModel = get(storageKeys.speedTrialModelVersion) === '3';
    let training = get('wake7-speed-training-unlocked') === '1';
    let intermediate = get(storageKeys.speedIntermediateUnlocked) === '1';
    let mastery = get('wake7-speed-mastery-unlocked') === '1';
    let satori = get('wake7-speed-satori-unlocked') === '1';
    const trainingTrial = get(storageKeys.speedTrainingTrialCleared) === '1';
    const intermediateTrial = get(storageKeys.speedIntermediateTrialCleared) === '1';
    const masteryTrial = get(storageKeys.speedMasteryTrialCleared) === '1';
    if (modeUnlocked && !hasTrialModel) training = intermediate = mastery = satori = true;
    set(storageKeys.speedTrialModelVersion, '3');
    if (modeUnlocked && !hasTrialModel) {
      set(storageKeys.speedTrainingUnlocked); set(storageKeys.speedIntermediateUnlocked);
      set(storageKeys.speedMasteryUnlocked); set(storageKeys.speedSatoriUnlocked);
    }
    return Object.freeze({ modeUnlocked, training, intermediate, mastery, satori, trainingTrial, intermediateTrial, masteryTrial });
  };
  return Object.freeze({ initialize });
}
