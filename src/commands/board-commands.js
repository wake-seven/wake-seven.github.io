// 盤面操作のコマンド入口。実装本体は当面 board-ui.js に残し、入力経路だけを統一する。
// options をオブジェクト化しておくことで、将来の状態ストア移行時に呼び出し側を変えずに済む。
const WakeSevenBoardCommands=Object.freeze({
  applySwipe:(ti,dir,options={})=>applySwipe(ti,dir,options.save??true,options.playEffects??true),
  undo:()=>undoLastMove()
});
// 1回分の確定状態を書き込むcommand。アニメーションや正解判定は呼び出し側に残し、
// ori/spin/tiles/moves/history の更新順だけをここで保証する。
function commitBoardMoveCommand(ti,dir,{save=true}={}){
  const oldSpin=Int16Array.from(spin),oldTiles=tileEls.slice(),cells=TRI[ti].cells;
  if(save){history.push(snapshot());trackGameStart();}
  const nextOri=rollOnce(ori,ti,dir),nextSpin=oldSpin.slice(),nextTiles=oldTiles.slice();
  for(let i=0;i<3;i++){
    const from=dir>0?cells[i]:cells[(i+1)%3],to=dir>0?cells[(i+1)%3]:cells[i];
    nextTiles[to]=oldTiles[from];nextSpin[to]=oldSpin[from]+dir;
  }
  replaceBoardState({ori:nextOri,spin:nextSpin,tiles:nextTiles,moves:moves+1});
  return {oldSpin,oldTiles,nextOri,nextSpin,nextTiles};
}
function restoreBoardSnapshotCommand(snapshotValue,{paintNow=false}={}){
  if(!snapshotValue||!snapshotValue.o)return false;
  replaceBoardState({ori:snapshotValue.o,spin:snapshotValue.s,tiles:snapshotValue.t,moves:snapshotValue.m},{paintNow});
  return true;
}
// 公開native moduleの構文境界。
export {};
