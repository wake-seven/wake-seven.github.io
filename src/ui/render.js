/* ---- 画面描画の境界 ----
 * 進行状態を変更する処理と、現在の状態を画面へ反映する処理を分ける。
 * 既存の個別レンダラーは互換のため残し、画面全体を更新する入口だけを
 * ここへ集約していく。
 */
const WakeSevenRendererRegistry=Object.freeze({
  create(renderers={}){const entries=new Map(Object.entries(renderers).filter(([,render])=>typeof render==='function').map(([name,render])=>[name,Object.freeze({render})]));return Object.freeze({get:name=>entries.get(name)||null,names:()=>[...entries.keys()]});}
});
function renderCurrentView(model={},context={}){
  const {includeBoard=false,includePicker=true}=model;
  const renderers=WakeSevenRendererRegistry.create({board:()=>includeBoard&&paint(context),navigation:()=>renderStageNav(),picker:()=>includePicker&&!$('stagePicker').hidden&&renderStagePicker()});
  renderers.get('board').render();
  renderers.get('navigation').render();
  renderers.get('picker').render();
}
// 動的コンテナ更新の共通境界。既存rendererのmarkup生成は維持する。
function replaceRenderedContent(root,markup=''){return svgMount(root,markup);}
// 公開native moduleの構文境界。
export {};
