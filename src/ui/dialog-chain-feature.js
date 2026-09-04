// ===== ダイアログ連鎖機能の入口 =====
// 連鎖の状態と操作入口を近くに置き、描画本体は既存の共通処理へ委譲する。
function readDialogChainContext(){return Object.freeze({
  name:typeof chainActiveName==='string'?chainActiveName:null,
  step:typeof chainActiveStep==='object'&&chainActiveStep?chainActiveStep:null,
  history:Object.freeze(chainHistory.slice()),
  open:typeof $('chainDialog')!=='undefined'&&!$('chainDialog').hidden
});}
function showDialogChainStep(name){return openChainedDialog(name);}
function startDialogChain(name){chainHistory=[];return showDialogChainStep(name);}
const WakeSevenDialogChainFeature=Object.freeze({
  start(name){return startDialogChain(name);},
  show(name){return showDialogChainStep(name);},
  next(){return $('chainDialogAction')?.click();},
  back(){return $('chainDialogPrev')?.click();},
  close(){return closeChainDialog();},
  restore(name){return showDialogChainStep(name);},
  context:readDialogChainContext
});
export {};
