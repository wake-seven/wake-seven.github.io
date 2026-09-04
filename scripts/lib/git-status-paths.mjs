// Git の porcelain v1 status を、影響調査で使えるパス一覧へ正規化する。
// rename/copy は旧パスと新パスの組で返るため、最終パスだけを採用する。
export function changedPathFromStatusEntry(entry) {
  const value = String(entry ?? '').slice(3);
  if (!value) return '';
  const separator = value.lastIndexOf(' -> ');
  return (separator >= 0 ? value.slice(separator + 4) : value).replaceAll('\\', '/');
}

export function changedPathsFromStatus(status) {
  return [...new Set(String(status ?? '').split('\0').filter(Boolean)
    .map(changedPathFromStatusEntry).filter(Boolean))];
}
