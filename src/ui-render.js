/* ---- 画面描画の境界 ----
 * 進行状態を変更する処理と、現在の状態を画面へ反映する処理を分ける。
 * 既存の個別レンダラーは互換のため残し、画面全体を更新する入口だけを
 * ここへ集約していく。
 */
function renderCurrentView({includeBoard=false,includePicker=true}={}){
  if(includeBoard)paint();
  renderStageNav();
  if(includePicker&&!$('stagePicker').hidden)renderStagePicker();
}
