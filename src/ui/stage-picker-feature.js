// ===== ステージ選択・称号一覧の入口 =====
// 選択画面と称号一覧の相互遷移を一つの機能入口から追跡する。
// 解放判定、一覧描画、ステージ読込は既存の所有モジュールへ委譲する。
function readStagePickerContext(){const navigation=readNavigationContext();return Object.freeze({
  mode:navigation.mode,lap:navigation.lap,stageIndex:navigation.stageIndex,
  pickerOpen:!$('stagePicker').hidden,rankOpen:!$('rankDialog').hidden,
  rankReturn:readDialogContext().rankDialogReturn
});}
const WakeSevenStagePickerFeature=Object.freeze({
  context:readStagePickerContext,
  open(options={}){return openDialog('stagePicker',options);},
  select(options={}){return openStagePickerAt(options);},
  openRank(returnTarget=null){return openDialog('rankDialog',{returnTarget});},
  close(){return closeStagePicker();},
  restore(options={}){return openDialog('stagePicker',options);}
});
export {};
