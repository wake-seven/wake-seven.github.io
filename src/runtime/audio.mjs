/** ブラウザ音声サービス。ゲームのグローバル変数を必要としない。 */
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
    (tunes[kind] || tunes.normal).forEach(([tone, offset]) => playTone(tone, 0.18, 0.032, offset));
  };
  return Object.freeze({ get enabled() { return soundEnabled; }, setEnabled: value => (soundEnabled = value !== false), playTone, playRotateSound, playClearSound });
}
