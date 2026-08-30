// 節目ダイアログの表示条件をまとめる。報酬付与や遷移は progression-ui.js 側が担当する。
function masterDialogTrialState(kind){
  return {
    mastery:kind==='mastery'&&!secondLapActive&&!speedMasteryTrialCleared,
    intermediate:kind==='intermediate'&&!secondLapActive&&!speedIntermediateTrialCleared,
    primary:kind==='primary'&&!secondLapActive&&!speedTrainingTrialCleared
  };
}
function masterDialogBoardTheme(kind){
  if(kind==='awakening')return 'gold-3d';
  if((kind==='mastery'&&secondLapActive)||kind==='satori')return 'satori-tilted';
  return 'gold';
}
function masterDialogBoardOptions(kind,needsMasteryTrial,theme){
  return {
    mastery:[kind!=='awakening'&&((kind==='mastery'&&!needsMasteryTrial)||['satori','awakening'].includes(kind)),theme,kind!=='awakening'],
    awakening:[kind==='awakening',theme,false]
  };
}
function masterDialogShareKind(kind){
  return kind==='primary'?'training':['satori','awakening'].includes(kind)?'satori':'mastery';
}
function masterDialogVisibility(kind,needsMasteryTrial){
  return {
    share:!['primary','satori','awakening'].includes(kind),
    start:['satori','awakening'].includes(kind)||(kind==='mastery'&&!needsMasteryTrial)
  };
}
// 公開native moduleの構文境界。
export {};
