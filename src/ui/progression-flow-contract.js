// ===== 進行フローの遷移契約 =====
// 画面ごとの条件分岐を再実装するためのものではなく、既存の入口が
// どの状態を経由するかを読み取るための監査用の宣言データ。
// 実際の副作用は progression-clear-flow.js / speed.js / runtime.js が担当する。
const PROGRESSION_FLOW_CONTRACT=Object.freeze([
  {id:'campaign-clear',mode:'campaign',from:'playing',event:'盤面が解けた',entry:'startClearFlow',persist:'clearShown→progress記録',cancel:'resetClearFlow・別盤面への遷移',to:'clear-animation'},
  {id:'campaign-clear-dialog',mode:'campaign',from:'clear-animation',event:'演出完了',entry:'finishClearFlow',persist:'clearDialog状態',cancel:'clear-transitionタイマー取消',to:'clear-dialog'},
  {id:'campaign-next',mode:'campaign',from:'clear-dialog|quiz/message',event:'次へ',entry:'advanceAfterClear→dispatchClearFlowAction',persist:'次の問題・周回・解放状態',cancel:'hideGameDialogs・遷移世代無効化',to:'next-stage-dialog|next-playing'},
  {id:'speed-start',mode:'speed',from:'speed-start-dialog',event:'開始/再開',entry:'startSpeedRun|resumeSpeedRun',persist:'speed session・開始時刻',cancel:'pauseSpeedRun・speed transition timer取消',to:'playing'},
  {id:'speed-clear',mode:'speed',from:'playing',event:'速解き問題が解けた',entry:'finishStage→advanceSpeedRun',persist:'問題記録・speed session',cancel:'pauseSpeedRun・旧セッション退役',to:'playing|speed-finished'},
  {id:'rank-reward',mode:'campaign|speed',from:'clear-dialog|speed-finished',event:'称号条件達成',entry:'openRankDialog',persist:'称号・報酬・解放状態',cancel:'closeRankDialog',to:'rank-dialog|next-stage-dialog'},
  {id:'reload-session',mode:'any',from:'page-load',event:'保存状態を検出',entry:'restoreActiveSession→restoreProgressionDialog',persist:'読み取りのみ（再保存は各復元処理）',cancel:'壊れた保存値を無視',to:'playing|保存済みダイアログ'},
  {id:'reload-clear',mode:'campaign',from:'page-load',event:'clearShownかつ解決済み',entry:'restoreDialogState→showClearDialog',persist:'clear状態を維持',cancel:'clear状態不整合時は通常盤面',to:'clear-dialog'},
  {id:'reload-speed',mode:'speed',from:'page-load',event:'speed sessionを検出',entry:'restoreActiveSession→readActiveSpeedSession',persist:'speed sessionを維持',cancel:'一時停止状態へ退避',to:'speed-pause-dialog|playing'}
]);
function getProgressionFlowContract(){return PROGRESSION_FLOW_CONTRACT;}

// 進行の主要オーケストレーターを、状態判断→遷移→描画の順で追跡するための監査メタデータ。
// ここは実装を呼び出す層ではなく、各入口の責務と読み進める順番を明示する地図である。
// 新しい抽象化を増やさず、実装側の関数名を参照して契約検査に利用する。
const PROGRESSION_ORCHESTRATORS=Object.freeze([
  {id:'clear-start',name:'クリア開始オーケストレーター',entry:'startClearFlow',source:'src/ui/progression-clear-flow.js',order:{decision:['beginClearFlow','createClearTransitionContext'],transition:['persistClearFlowCheckpoint'],render:['scheduleClearFlowDialog']}},
  {id:'clear-advance',name:'クリア後進行オーケストレーター',entry:'dispatchClearFlowAction',source:'src/ui/progression-clear-flow.js',order:{decision:['resolveAfterClearRoute'],transition:['persistClearFlowCheckpoint','setClearFlowPhase'],render:['showMasterDialog']}},
  {id:'dialog-restore',name:'ダイアログ復元オーケストレーター',entry:'restoreDialogState',source:'src/runtime/runtime.js',order:{decision:['clear:()=>'],transition:['createClearTransitionContext'],render:['showClearDialog']}},
  {id:'stage-advance',name:'ステージ進行オーケストレーター',entry:'dispatchClearFlowAction',source:'src/ui/progression-clear-flow.js',order:{decision:['resolveAfterClearRoute'],transition:['setClearFlowPhase'],render:['loadStage']}}
]);
export {};
