// チュートリアル巻き戻し演出へ渡す表示モデル。副作用を持たない。
function createTutorialRewindModel({startAngle=0,endAngle=0,direction=1,pivot,items=[],duration=720,cue=''}){
  return {startAngle,endAngle,direction,pivot,items,duration,cue};
}

// 巻き戻し中に一時的にgroupへ移す要素のDOM位置とインライン表示を退避する。
function captureTutorialRewindDomSnapshot(items=[]){
  return items.map(item=>({
    el:item.el,
    parent:item.el?.parentNode||null,
    nextSibling:item.el?.nextSibling||null,
    style:item.el?.getAttribute('style')
  }));
}

// 終了・キャンセルのどちらからも同じ復元経路を通し、棒との前後関係を戻す。
function restoreTutorialRewindDomSnapshot(snapshot=[]){
  for(const entry of snapshot){
    if(!entry.el||!entry.parent)continue;
    const reference=entry.nextSibling&&entry.nextSibling.parentNode===entry.parent
      ?entry.nextSibling:null;
    entry.parent.insertBefore(entry.el,reference);
    if(entry.style===null||entry.style===undefined)entry.el.removeAttribute('style');
    else entry.el.setAttribute('style',entry.style);
  }
}

let tutorialRewindSessionSerial=0;
function startTutorialRewindSession({snapshot=[],group=null,onCleanup=()=>{}}={}){
  return {id:++tutorialRewindSessionSerial,snapshot,group,onCleanup,animation:null,timers:[],cancelled:false,cleaned:false,cancelling:false};
}
function setTutorialRewindTimer(session,callback,delay){
  const timer=setTimeout(()=>{
    if(session.cleaned||session.cancelled)return;
    callback();
  },delay);
  session.timers.push(timer);
  return timer;
}
function bindTutorialRewindAnimation(session,animation){
  session.animation=animation;
  animation.onfinish=()=>finishTutorialRewindSession(session);
  animation.oncancel=()=>{
    if(!session.cancelling)cancelTutorialRewindSession(session);
  };
  return session;
}
function cleanupTutorialRewindSession(session){
  if(session.cleaned)return false;
  session.cleaned=true;
  for(const timer of session.timers)clearTimeout(timer);
  session.timers.length=0;
  restoreTutorialRewindDomSnapshot(session.snapshot);
  session.group?.remove();
  session.onCleanup({cancelled:session.cancelled});
  return true;
}
function finishTutorialRewindSession(session){
  return cleanupTutorialRewindSession(session);
}
function cancelTutorialRewindSession(session){
  if(session.cleaned)return false;
  session.cancelled=true;
  session.cancelling=true;
  try{session.animation?.cancel();}catch{}
  session.cancelling=false;
  return cleanupTutorialRewindSession(session);
}
export {};
