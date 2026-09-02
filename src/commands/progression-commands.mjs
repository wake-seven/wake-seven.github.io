/** 開発用のナビゲーション・速解き操作コマンド境界。 */
export function createProgressionCommands({ startSpeedRun, advanceSpeedRun, navigate, setState } = {}) {
  const call = (handler, ...args) => typeof handler === 'function'
    ? handler(...args)
    : { ok: false, reason: 'command is unavailable' };
  return Object.freeze({
    startSpeedRun: (...args) => call(startSpeedRun, ...args),
    advanceSpeedRun: (...args) => call(advanceSpeedRun, ...args),
    navigate: (...args) => {
      const result = call(navigate, ...args);
      if (result?.state && typeof setState === 'function') setState(result.state);
      return result;
    }
  });
}
