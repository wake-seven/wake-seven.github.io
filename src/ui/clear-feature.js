// ===== クリア機能の入口 =====
// クリア完了から次の問題までの「状態判断・表示・操作」を、
// ひとつの機能入口から追跡できるようにする。
// 盤面ルール・保存・共通ダイアログの実装は既存の所有モジュールへ委譲する。
// クリア機能のオーケストレーター入口。実処理はclear-flowや共通UIへ委譲し、
// ここでは「どの入口がいつ呼ばれたか」だけを一貫して観測できるようにする。
const clearFeatureTrace=[];
function traceClearFeature(action,context=null){
  clearFeatureTrace.push(Object.freeze({action,phase:typeof getClearFlowState==='function'?getClearFlowState().phase:null,cycle:typeof getClearFlowState==='function'?getClearFlowState().cycle:null,context:context||null,at:Date.now()}));
  if(clearFeatureTrace.length>32)clearFeatureTrace.shift();
}
const clearFeatureRestoreDialog=context=>{
    traceClearFeature('restore-dialog',context);
    if(!restoreClearFlowDialog(context))return false;
    showClearDialog(context);
    return true;
};
const WakeSevenClearFeature=Object.freeze({
  start(options={}){traceClearFeature('start',options);return startClearFlow(options);},
  restoreClearDialog:clearFeatureRestoreDialog,
  next(){traceClearFeature('next');return dispatchClearFlowAction(CLEAR_FLOW_ACTION.next);},
  close(){
    traceClearFeature('close');
    hideGameDialogs();
    updateDialogStateOwner({nextStageAttention:isCampaignMode()&&!editingBoard});
    renderStageNav();
    return true;
  },
  trace(){return clearFeatureTrace.slice();},
  state(){return typeof getClearFlowState==='function'?getClearFlowState():null;}
});
export {};
