/** Resolves host capabilities once at the application boundary. */
export function createRuntimeEnvironment({ windowRef, documentRef, storage } = {}) {
  const hostWindow = windowRef ?? (typeof window === 'undefined' ? undefined : window);
  const hostDocument = documentRef ?? (typeof document === 'undefined' ? undefined : document);
  return Object.freeze({ windowRef: hostWindow, documentRef: hostDocument, storage: storage ?? hostWindow?.localStorage });
}
