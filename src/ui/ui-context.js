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
const uiContextTimers=new Map();
function clearUiContextTimer(key){const id=uiContextTimers.get(key);if(id!==undefined){clearTimeout(id);uiContextTimers.delete(key);}}
function setUiContextTimer(key,callback,delay){clearUiContextTimer(key);const id=setTimeout(()=>{uiContextTimers.delete(key);callback();},delay);uiContextTimers.set(key,id);return id;}
function setDialogOpenState(id,open){const dialog=$(id);if(dialog)dialog.hidden=!open;return !!open;}
export {};
