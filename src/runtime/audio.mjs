/** Browser audio service. No game globals are required. */
export function createAudioService({ enabled = true, documentRef, windowRef } = {}) {
  let soundEnabled = enabled !== false;
  let audioContext = null;
  const playTone = (frequency, duration = 0.06, volume = 0.028, delay = 0) => {
    if (!soundEnabled || documentRef?.hidden) return false;
    try {
      const AudioCtor = windowRef?.AudioContext || windowRef?.webkitAudioContext;
      if (!AudioCtor) return false;
      if (!audioContext) audioContext = new AudioCtor();
      if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
      const start = audioContext.currentTime + delay;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(start); oscillator.stop(start + duration + 0.02);
      return true;
    } catch { return false; }
  };
  const playRotateSound = direction => playTone(direction > 0 ? 392 : 349, 0.055, 0.022);
  const playClearSound = (kind = 'normal') => {
    const tunes = { normal: [[523, 0], [659, 0.075], [784, 0.15]], volume: [[440, 0], [554, 0.08], [659, 0.16], [880, 0.26]], training: [[440, 0], [554, 0.07], [659, 0.14], [880, 0.23], [1109, 0.33]], mastery: [[392, 0], [523, 0.08], [659, 0.16], [784, 0.24], [1047, 0.34], [1319, 0.47]], satori: [[392, 0], [523, 0.075], [659, 0.15], [784, 0.225], [1047, 0.31], [1319, 0.405], [1568, 0.51], [2093, 0.64]] };
    (tunes[kind] || tunes.normal).forEach(([tone, offset]) => playTone(tone, 0.18, 0.032, offset));
  };
  return Object.freeze({ get enabled() { return soundEnabled; }, setEnabled: value => (soundEnabled = value !== false), playTone, playRotateSound, playClearSound });
}
