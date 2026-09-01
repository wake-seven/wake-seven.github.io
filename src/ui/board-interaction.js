// ポインタイベントを盤面操作で使う最小の入力モデルへ正規化する。
// DOMや盤面状態を変更せず、判定・command・アニメーションは呼び出し側に残す。
function normalizeBoardPointer(event,toView){
  const point=toView(event);
  return {pointerId:event.pointerId,pointerType:event.pointerType,button:event.button,point:{x:point.x,y:point.y}};
}
function normalizeBoardPointerDelta(input,center,previousAngle){
  const dx=input.point.x-center.x,dy=input.point.y-center.y,distance=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);
  let delta=previousAngle===null?0:angle-previousAngle;
  while(delta>Math.PI)delta-=2*Math.PI;
  while(delta<-Math.PI)delta+=2*Math.PI;
  return {dx,dy,distance,angle,delta,degrees:delta*180/Math.PI};
}
function normalizeBoardPointerEnd(event,drag,{cancel=false,forcedTurns=null}={}){
  return {pointerId:event?.pointerId??drag?.id,cancelled:cancel,forcedTurns,rawDegrees:drag?.rawDeg||0,maxAbsDegrees:drag?.maxAbsDeg||0};
}
function startBoardPointerContext(input,targetGroup,details={}){
  return Object.assign({id:input.pointerId,pointerId:input.pointerId,pointerType:input.pointerType,start:{...input.point},current:{...input.point},delta:{x:0,y:0},angle:null,targetGroup,cancelled:false},details);
}
function updateBoardPointerContext(context,input){
  if(!context||context.cancelled)return null;
  const previous=context.current;context.current={...input.point};context.delta={x:input.point.x-previous.x,y:input.point.y-previous.y};context.angle=Math.atan2(input.point.y-context.targetGroup.y,input.point.x-context.targetGroup.x);return context;
}
function finishBoardPointerContext(context,cancelled=false){if(!context)return false;context.cancelled=cancelled===true;return true;}
function captureBoardPointer(element,pointerId){try{element?.setPointerCapture(pointerId);return true;}catch(_){return false;}}
function releaseBoardPointer(element,pointerId){try{if(element?.hasPointerCapture?.(pointerId))element.releasePointerCapture(pointerId);return true;}catch(_){return false;}}
function isBoardPointerEventFor(context,event){return !!context&&!!event&&event.pointerId===context.pointerId&&!context.cancelled;}
let boardAnimationSession=null,boardAnimationSequence=0;
function startBoardAnimationSession(type,pointerId=null,cleanup=()=>{}){
  cancelBoardAnimationSession();
  const session={id:++boardAnimationSequence,type,pointerId,startedAt:performance.now(),cancelled:false,frameHandle:0,cleanup,cleaned:false};
  boardAnimationSession=session;
  return session;
}
function isBoardAnimationSessionActive(session){return boardAnimationSession===session&&!session.cancelled&&!session.cleaned;}
function requestBoardAnimationFrame(session,callback){if(!isBoardAnimationSessionActive(session))return 0;session.frameHandle=requestAnimationFrame(now=>{session.frameHandle=0;if(isBoardAnimationSessionActive(session))callback(now);});return session.frameHandle;}
function finishBoardAnimationSession(session){if(!session||session.cleaned)return false;session.cleaned=true;if(session.frameHandle)cancelAnimationFrame(session.frameHandle);session.frameHandle=0;session.cleanup?.();if(boardAnimationSession===session)boardAnimationSession=null;return true;}
function cancelBoardAnimationSession(session=boardAnimationSession){if(!session||session.cleaned)return false;session.cancelled=true;return finishBoardAnimationSession(session);}
function cancelBoardAnimation(reason='cancelled'){return cancelBoardAnimationSession();}
export {};
