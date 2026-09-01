// 節目ダイアログの表示条件をまとめる。報酬付与や遷移は progression-ui.js 側が担当する。
function masterDialogTrialState(kind){
  const {lap}=runtimeSnapshot();
  const secondLap=lap===2;
  return {
    mastery:kind==='mastery'&&!secondLap&&!speedMasteryTrialCleared,
    intermediate:kind==='intermediate'&&!secondLap&&!speedIntermediateTrialCleared,
    primary:kind==='primary'&&!secondLap&&!speedTrainingTrialCleared
  };
}
function masterDialogBoardTheme(kind){
  const {lap}=runtimeSnapshot();
  if(kind==='awakening')return 'gold-3d';
  if((kind==='mastery'&&lap===2)||kind==='satori')return 'satori-tilted';
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
