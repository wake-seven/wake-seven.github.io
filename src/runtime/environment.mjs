/** アプリケーション境界でホスト機能を一度だけ解決する。 */
export function createRuntimeEnvironment({ windowRef, documentRef, storage } = {}) {
  const hostWindow = windowRef ?? (typeof window === 'undefined' ? undefined : window);
  const hostDocument = documentRef ?? (typeof document === 'undefined' ? undefined : document);
  return Object.freeze({ windowRef: hostWindow, documentRef: hostDocument, storage: storage ?? hostWindow?.localStorage });
}
