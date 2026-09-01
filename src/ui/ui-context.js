// 画面だけに存在する一時状態の境界。永続gameStateやlocalStorageには書き込まない。
function resetBoardUiContext(){
  busy=false;drag=null;boardTouchActive=false;invalidGrabPointerId=null;
  svg.classList.remove('spinning','selecting','rotation-started','clear-pending','celebrating','arriving');
  baseTiles.forEach(el=>el.classList.remove('selected'));
  svg.querySelectorAll('.pivot.active').forEach(el=>el.classList.remove('active'));
}
function setBoardTouchActive(value){boardTouchActive=value===true;return boardTouchActive;}
function setBoardDrag(value){drag=value||null;return drag;}
function setBoardBusy(value){busy=value===true;return busy;}
function setBoardTileSelected(tile,selected){tile?.classList.toggle('selected',selected===true);}
function setBoardPivotActive(pivot,active){pivot?.classList.toggle('active',active===true);}
export {};
