/* ---- 画面描画の境界 ----
 * 進行状態を変更する処理と、現在の状態を画面へ反映する処理を分ける。
 * 既存の個別レンダラーは互換のため残し、画面全体を更新する入口だけを
 * ここへ集約していく。
 */
// SVGアイコンの差し替えは描画処理の一部なので、専用の薄いモジュールへ
// 分散させず、画面描画の入口と同じ場所で追跡できるようにする。
function svgMount(root,markup=''){
  if(!root)return null;
  root.replaceChildren();
  if(markup)root.insertAdjacentHTML('afterbegin',markup);
  return root;
}
function svgSetIcon(root,markup=''){return svgMount(root,markup);}

const WakeSevenRendererRegistry=Object.freeze({
  create(renderers={}){const entries=new Map(Object.entries(renderers).filter(([,render])=>typeof render==='function').map(([name,render])=>[name,Object.freeze({render})]));return Object.freeze({get:name=>entries.get(name)||null,names:()=>[...entries.keys()]});}
});
function renderCurrentView(model={},context={}){
  const {includeBoard=false,includePicker=true}=model;
  const screenRenderers={board:()=>includeBoard&&paint(context),navigation:()=>renderStageNav(),picker:()=>includePicker&&!$('stagePicker').hidden&&renderStagePicker()};
  if(model.screen==='speed')screenRenderers.speed=()=>renderMasterSpeedStats();
  if(model.screen==='message')screenRenderers.message=()=>renderMessageReview();
  if(model.screen==='guide'&&typeof renderTipGuide==='function')screenRenderers.guide=()=>renderTipGuide();
  const renderers=WakeSevenRendererRegistry.create(screenRenderers);
  renderers.names().forEach(name=>renderers.get(name).render(model,context));
}
// 動的コンテナ更新の共通境界。既存rendererのmarkup生成は維持する。
function replaceRenderedContent(root,markup=''){return svgMount(root,markup);}
// 公開ネイティブモジュールの構文境界。
export {};
