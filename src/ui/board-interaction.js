// ポインタイベントを盤面操作で使う最小の入力モデルへ正規化する。
// DOMや盤面状態を変更せず、判定・command・アニメーションは呼び出し側に残す。
function normalizeBoardPointer(event,toView){
  const point=toView(event);
  return {
    pointerId:event.pointerId,
    pointerType:event.pointerType,
    button:event.button,
    point:{x:point.x,y:point.y}
  };
}
function normalizeBoardPointerDelta(input,center,previousAngle){
  const dx=input.point.x-center.x;
  const dy=input.point.y-center.y;
  const distance=Math.hypot(dx,dy);
  const angle=Math.atan2(dy,dx);
  let delta=previousAngle===null?0:angle-previousAngle;
  while(delta>Math.PI) delta-=2*Math.PI;
  while(delta<-Math.PI) delta+=2*Math.PI;
  return {
    dx,dy,distance,angle,delta,
    degrees:delta*180/Math.PI
  };
}
function normalizeBoardPointerEnd(event,drag,{cancel=false,forcedTurns=null}={}){
  return {
    pointerId:event?.pointerId??drag?.id,
    cancelled:cancel,
    forcedTurns,
    rawDegrees:drag?.rawDeg||0,
    maxAbsDegrees:drag?.maxAbsDeg||0
  };
}
function startBoardPointerContext(input,targetGroup,details={}){
  return Object.assign({
    id:input.pointerId,
    pointerId:input.pointerId,
    pointerType:input.pointerType,
    start:{...input.point},
    current:{...input.point},
    delta:{x:0,y:0},
    angle:null,
    targetGroup,
    cancelled:false
  },details);
}
function updateBoardPointerContext(context,input){
  if(!context||context.cancelled)return null;
  const previous=context.current;
  context.current={...input.point};
  context.delta={
    x:input.point.x-previous.x,
    y:input.point.y-previous.y
  };
  context.angle=Math.atan2(
    input.point.y-context.targetGroup.y,
    input.point.x-context.targetGroup.x
  );
  return context;
}
function finishBoardPointerContext(context,cancelled=false){
  if(!context)return false;
  context.cancelled=cancelled===true;
  return true;
}
function captureBoardPointer(element,pointerId){
  try{
    element?.setPointerCapture(pointerId);
    return true;
  }catch(_){
    return false;
  }
}
function releaseBoardPointer(element,pointerId){
  try{
    if(element?.hasPointerCapture?.(pointerId)) element.releasePointerCapture(pointerId);
    return true;
  }catch(_){
    return false;
  }
}
function isBoardPointerEventFor(context,event){
  return !!context&&!!event&&
    event.pointerId===context.pointerId&&!context.cancelled;
}
// アニメーションのライフサイクルを明示する。演出ごとの細かな実装は残すが、
// 開始・更新・完了・中止の観測点だけは共通にして、古い演出の混入を追跡しやすくする。
const BOARD_ANIMATION_PHASE=Object.freeze({idle:'idle',starting:'starting',running:'running',finishing:'finishing',cancelled:'cancelled'});
let boardAnimationSession=null,boardAnimationSequence=0;
function startBoardAnimationSession(type,pointerId=null,cleanup=()=>{}){
  cancelBoardAnimationSession();
  const session={
    id:++boardAnimationSequence,
    type,pointerId,
    phase:BOARD_ANIMATION_PHASE.starting,
    startedAt:performance.now(),
    cancelled:false,
    frameHandle:0,
    cleanup,
    cleaned:false,
    resources:[],
    resourceKinds:[]
  };
  boardAnimationSession=session;
  return session;
}
function isBoardAnimationSessionActive(session){return boardAnimationSession===session&&!session.cancelled&&!session.cleaned;}
function setBoardAnimationPhase(session,phase){
  if(!session||session.cleaned)return false;
  if(!Object.values(BOARD_ANIMATION_PHASE).includes(phase))return false;
  session.phase=phase;
  return true;
}
function getBoardAnimationSession(){return boardAnimationSession;}
function requestBoardAnimationFrame(session,callback){
  if(!isBoardAnimationSessionActive(session))return 0;
  setBoardAnimationPhase(session,BOARD_ANIMATION_PHASE.running);
  session.frameHandle=requestAnimationFrame(now=>{
    session.frameHandle=0;
    if(isBoardAnimationSessionActive(session)) callback(now);
  });
  return session.frameHandle;
}
// 回転セッションが所有する一時リソースを登録する。終了・キャンセルの経路が
// 増えても、rAF/WAAPI/一時DOMの後始末を個別の呼び出し側に複製しない。
function registerBoardAnimationResource(session,resource,dispose){
  if(!session||session.cleaned||typeof dispose!=='function') return resource;
  session.resources.push({resource,dispose,disposed:false});
  session.resourceKinds.push(resource?.constructor?.name||typeof resource);
  return resource;
}
function finishBoardAnimationSession(session){
  if(!session||session.cleaned)return false;
  if(!session.cancelled) {
    setBoardAnimationPhase(session,BOARD_ANIMATION_PHASE.finishing);
  }
  session.cleaned=true;
  if(session.frameHandle)cancelAnimationFrame(session.frameHandle);
  session.frameHandle=0;
  for(const entry of session.resources.splice(0)){
    if(entry.disposed)continue;
    entry.disposed=true;
    try{
      entry.dispose(entry.resource);
    }catch(_){
      /* 後処理失敗で次の後処理を止めない */
    }
  }
  session.cleanup?.();
  if(boardAnimationSession===session)boardAnimationSession=null;
  return true;
}
function cancelBoardAnimationSession(session=boardAnimationSession){if(!session||session.cleaned)return false;session.cancelled=true;setBoardAnimationPhase(session,BOARD_ANIMATION_PHASE.cancelled);return finishBoardAnimationSession(session);}
function cancelBoardAnimation(reason='cancelled'){cancelActiveTutorialRewindSession(reason);return cancelBoardAnimationSession();}
export {};
