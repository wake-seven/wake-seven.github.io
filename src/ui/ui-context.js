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
function setBoardTransientClass(className,active){if(svg)svg.classList.toggle(className,active===true);}
const uiContextTimers=new Map();
function clearUiContextTimer(key){const id=uiContextTimers.get(key);if(id!==undefined){clearTimeout(id);uiContextTimers.delete(key);}}
function setUiContextTimer(key, callback, delay) {
  clearUiContextTimer(key);
  const id = setTimeout(() => {
    uiContextTimers.delete(key);
    callback();
  }, delay);
  uiContextTimers.set(key, id);
  return id;
}
function clearUiContextInterval(key){clearUiContextTimer(key);}
function setUiContextInterval(key,callback,delay){clearUiContextInterval(key);const id=setInterval(callback,delay);uiContextTimers.set(key,id);return id;}
const uiEffects=new Map();
// 演出を取り消した直後に、すでにキューへ入ったcallbackが実行されても
// 現在の画面へ作用しないよう、演出ごとに世代を持たせる。
const uiEffectGenerations=new Map();
function uiEffectGeneration(effect){return uiEffectGenerations.get(effect)||0;}
function advanceUiEffectGeneration(effect){const next=uiEffectGeneration(effect)+1;uiEffectGenerations.set(effect,next);return next;}
function uiEffectTimerKey(effect,key){return 'effect:'+effect+':'+key;}
function registerUiEffectTimer(effect, key, id) {
  if (!uiEffects.has(effect)) uiEffects.set(effect, new Set());
  uiEffects.get(effect).add(uiEffectTimerKey(effect, key));
  return id;
}

function clearUiEffectTimers(effect) {
  advanceUiEffectGeneration(effect);
  const keys = uiEffects.get(effect);
  if (!keys) return;
  keys.forEach(clearUiContextTimer);
  uiEffects.delete(effect);
}

function setUiEffectTimer(effect, key, callback, delay) {
  const timerKey = uiEffectTimerKey(effect, key);
  clearUiEffectTimer(effect, key);
  const generation = uiEffectGeneration(effect);
  return registerUiEffectTimer(effect, key, setUiContextTimer(
    timerKey,
    () => {
      if (generation !== uiEffectGeneration(effect)) return;
      uiEffects.get(effect)?.delete(timerKey);
      callback();
    },
    delay
  ));
}

function setUiEffectInterval(effect, key, callback, delay) {
  const timerKey = uiEffectTimerKey(effect, key);
  clearUiEffectTimer(effect, key);
  const generation = uiEffectGeneration(effect);
  return registerUiEffectTimer(effect, key, setUiContextInterval(
    timerKey,
    () => {
      if (generation === uiEffectGeneration(effect)) callback();
    },
    delay
  ));
}
// 個別の演出を途中で止める入口。演出側でタイマーIDを保持しない。
function clearUiEffectTimer(effect, key) {
  advanceUiEffectGeneration(effect);
  const timerKey = uiEffectTimerKey(effect, key);
  clearUiContextTimer(timerKey);
  uiEffects.get(effect)?.delete(timerKey);
}
// タイマーと完了状態をひとまとめにした、短いUIアニメーション用のガード。
let namedAnimationGuardSerial=0;
function createNamedAnimationGuard(name='ui-animation'){
  const key=name+':'+(++namedAnimationGuardSerial);let busy=false;
  return {
    isBusy:()=>busy,
    begin(){busy=true;},
    cancel(){busy=false;clearUiEffectTimer(name,key);},
    arm(delay,commit){clearUiEffectTimer(name,key);setUiEffectTimer(name,key,()=>{if(!busy)return;commit();busy=false;},delay);},
    reset(){busy=false;clearUiEffectTimer(name,key);}
  };
}
function setDialogOpenState(id,open){const dialog=$(id);if(dialog)dialog.hidden=!open;return !!open;}
export {};
