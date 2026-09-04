// 学園・応用・速解きで使う候補棒の計算。
// DOMは変更せず、現在の盤面から「候補にする棒」を返す。
const ACADEMY_GRIP_DISPLAY_RULE=Object.freeze({oneMove:TRI.length,maxGuided:3});
function academyGripDisplayCount(configuredCount,fallbackCount=1){
  if(SOLVER.dist[enc(ori)]===1)return ACADEMY_GRIP_DISPLAY_RULE.oneMove;
  return Math.min(ACADEMY_GRIP_DISPLAY_RULE.maxGuided,Math.max(1,configuredCount??fallbackCount));
}
const TOP_RIGHT_TI=TRI.findIndex(t=>t.cells.includes(1)&&t.cells.includes(4));
function computeGuidedBasicCandidateTis(){
  const correctTis=[];
  for(let ti=0;ti<TRI.length;ti++)for(const dir of [1,-1]){
    if(SOLVER.dist[enc(rollOnce(ori,ti,dir))]===SOLVER.dist[enc(ori)]-1){correctTis.push(ti);break;}
  }
  if(!correctTis.length)return null;
  const forceTopRight=stageIndex===BASIC_STAGE_START+5&&correctTis.includes(TOP_RIGHT_TI);
  const primary=forceTopRight?TOP_RIGHT_TI:correctTis[Math.floor(Math.random()*correctTis.length)];
  const count=academyGripDisplayCount(undefined,stageIndex-BASIC_STAGE_START+1);
  const shuffle=arr=>{for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;};
  const safe=shuffle(Array.from({length:TRI.length},(_,i)=>i).filter(i=>i!==primary&&!correctTis.includes(i)));
  const fallback=shuffle(Array.from({length:TRI.length},(_,i)=>i).filter(i=>i!==primary&&correctTis.includes(i)));
  return new Set([primary,...[...safe,...fallback].slice(0,count-1)]);
}
function computeDevelopmentCandidateTis(){
  const stage=STAGES[stageIndex],correctTis=[];
  for(let ti=0;ti<TRI.length;ti++)for(const dir of [1,-1]){
    if(SOLVER.dist[enc(rollOnce(ori,ti,dir))]===SOLVER.dist[enc(ori)]-1){correctTis.push(ti);break;}
  }
  if(!correctTis.length)return null;
  const primary=stage.soloRod!==undefined&&correctTis.includes(stage.soloRod)?stage.soloRod:correctTis[Math.floor(Math.random()*correctTis.length)];
  const shuffle=arr=>{for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;};
  const safe=shuffle(Array.from({length:TRI.length},(_,i)=>i).filter(i=>i!==primary&&!correctTis.includes(i)));
  const fallback=shuffle(Array.from({length:TRI.length},(_,i)=>i).filter(i=>i!==primary&&correctTis.includes(i)));
  const count=moves>0?academyGripDisplayCount(3):academyGripDisplayCount(stage.initialRodCount);
  return new Set([primary,...[...safe,...fallback].slice(0,count-1)]);
}
function computeSpeedTrainingCandidateTis(){
  const correctTis=[];
  for(let ti=0;ti<TRI.length;ti++)for(const dir of [1,-1]){
    if(SOLVER.dist[enc(rollOnce(ori,ti,dir))]===SOLVER.dist[enc(ori)]-1){correctTis.push(ti);break;}
  }
  if(!correctTis.length)return null;
  const primary=correctTis[Math.floor(Math.random()*correctTis.length)];
  // 九番勝負は、1〜3問目を3本、4〜6問目を4本、7〜9問目を5本に段階化する。
  // speedSession.indexは0始まりなので、問題番号の境界をここで一元管理する。
  const questionIndex=Math.max(0,Number(speedSession?.index)||0);
  const count=questionIndex<3?3:questionIndex<6?4:5;
  const pool=Array.from({length:TRI.length},(_,i)=>i).filter(i=>i!==primary);
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  return new Set([primary,...pool.slice(0,count-1)]);
}

// 学園補助UIの表示を担当する。候補計算とは分離し、盤面DOMへの反映だけを行う。
let applicationTargetTiles=new Set();
function bindApplicationTargetTiles(){
  applicationTargetTiles=new Set();
  if(isApplicationTargetStage()){
    for(const index of STAGES[stageIndex]?.targetCells||[]){
      if(tileEls[index])applicationTargetTiles.add(tileEls[index]);
    }
  }
  renderApplicationTargetCells();
}
function renderApplicationTargetCells(){
  if(!isApplicationTargetStage())applicationTargetTiles.clear();
  tileEls.forEach(tile=>tile.classList.toggle('application-target',applicationTargetTiles.has(tile)));
  // 静止表示も開始アニメ・スワイプと同じ共有レイヤーAPIを使う。
  placeApplicationTargetTiles(svg,tileEls,applicationTargetTiles,{anchorSelector:'.pivot'});
  renderApplicationTargetLayer(svg,tileEls,applicationTargetTiles,{anchorSelector:'.pivot'});
  renderApplicationTargetPreview();
}

// 応用編の目標3枚を、1回正しく回した直後の小型見本として表示する。
// targetCellsは「1手後に同じ向きで寝る3枚」なので、ソルバーで距離を1つ縮めた状態を描く。
function applicationGoalPreviewState(stage){
  if(!stage)return null;
  const start=dec(stage.state),distance=SOLVER.dist[enc(start)],targets=stage.targetCells||[];
  for(let ti=0;ti<TRI.length;ti++)for(const dir of [1,-1]){
    const next=rollOnce(start,ti,dir);
    if(SOLVER.dist[enc(next)]!==distance-1)continue;
    if(targets.length===3&&targets.every(cell=>next[cell]===next[targets[0]]))return enc(next);
  }
  for(let ti=0;ti<TRI.length;ti++)for(const dir of [1,-1]){
    const next=rollOnce(start,ti,dir);
    if(SOLVER.dist[enc(next)]===distance-1)return enc(next);
  }
  return stage.state;
}
function renderApplicationTargetPreview(){
  const preview=$('applicationTargetPreview'),board=$('applicationTargetPreviewBoard');
  if(!preview||!board)return;
  const remaining=SOLVER.dist[enc(ori)];
  const stage=isApplicationTargetStage()?STAGES[stageIndex]:null;
  const targets=stage?.targetCells||[];
  if(!stage||targets.length!==3){
    clearUiEffectTimer('application-preview','hide');preview.classList.remove('is-fading');preview.hidden=true;board.replaceChildren();return;
  }
  if(remaining<=1){
    if(!preview.hidden&&!preview.classList.contains('is-fading')){
      preview.classList.add('is-fading');clearUiEffectTimer('application-preview','hide');
      setUiEffectTimer('application-preview','hide',()=>{preview.hidden=true;preview.classList.remove('is-fading');board.replaceChildren();},300);
    }
    return;
  }
  clearUiEffectTimer('application-preview','hide');preview.classList.remove('is-fading');preview.hidden=false;
  // 目標3枚は「左上・右上・下中央」の逆三角形に固定して描く。
  const targetValue=1;
  const positions=[[45,29],[99,29],[72,76]],scale=.60;
  board.setAttribute('viewBox','0 0 144 106');
  board.innerHTML=targets.map((cell,index)=>{
    const value=targetValue,fallen=value!==0;
    return '<g class="mini-tile application-preview-target" data-cell="'+cell+'" transform="translate('+positions[index][0]+' '+positions[index][1]+') scale('+scale+')">'
      +'<path d="'+hexPath(R)+'" fill="'+(fallen?'#B9C6D6':'#F3E8D5')+'" stroke="#8B35F0" stroke-width="6" stroke-linejoin="round"/>'
      +'<g class="mini-daruma" transform="rotate('+miniAngle(value)+')"><use href="#daruma-body"/><use href="#'+(fallen?'face-shut':'face-open')+'"/></g>'
      +'</g>';
  }).join('');
}

// スワイプ中はタイル自身が動くため、静止用の重ね枠を一時的に外す。
function removeApplicationTargetOverlay(){ clearApplicationTargetLayer(svg); }

// 候補棒とグレーアウト状態を盤面へ反映する。
let guidedBasicCandidateTis=null,guidedBasicCandidateSignature=null;
let fallenRodTis=new Set();
function refreshGuidedBasicCandidates(){
  const fullSet=()=>new Set(Array.from({length:TRI.length},(_,i)=>i));
  if(isDevelopmentStage()){
    const stage=STAGES[stageIndex];
    if(isSolved()){guidedBasicCandidateTis=null;guidedBasicCandidateSignature=null;}
    else {const signature=stageIndex+':'+moves+':'+enc(ori);if(signature!==guidedBasicCandidateSignature){fallenRodTis.clear();guidedBasicCandidateTis=computeDevelopmentCandidateTis()||fullSet();guidedBasicCandidateSignature=signature;}}
  }else if(isSpeedFallingRodStage()){
    if(isSolved()){guidedBasicCandidateTis=null;guidedBasicCandidateSignature=null;}
    else {const signature='speedFalling:'+moves+':'+enc(ori);if(signature!==guidedBasicCandidateSignature){fallenRodTis.clear();guidedBasicCandidateTis=computeSpeedTrainingCandidateTis()||fullSet();guidedBasicCandidateSignature=signature;}}
  }else if(isWrongMoveRewindStage()){
    if(isSolved()){guidedBasicCandidateTis=null;guidedBasicCandidateSignature=null;}
    else {const signature='application:'+stageIndex+':'+moves+':'+enc(ori);if(signature!==guidedBasicCandidateSignature){fallenRodTis.clear();guidedBasicCandidateTis=fullSet();guidedBasicCandidateSignature=signature;}}
  }else if(isGuidedBasicStage()){
    if(isSolved()){guidedBasicCandidateTis=null;guidedBasicCandidateSignature=null;}
    else {const signature=stageIndex+':'+moves+':'+enc(ori);if(signature!==guidedBasicCandidateSignature){fallenRodTis.clear();guidedBasicCandidateTis=(isNarrowedBasicStage()&&SOLVER.dist[enc(ori)]>1)?computeGuidedBasicCandidateTis():fullSet();guidedBasicCandidateSignature=signature;}}
  }else {guidedBasicCandidateTis=null;guidedBasicCandidateSignature=null;}
  svg.querySelectorAll('.grip-marker').forEach(marker=>{
    const ti=Number(marker.dataset.tri),restrict=guidedBasicCandidateTis!==null,isOut=restrict&&!guidedBasicCandidateTis.has(ti),isFallen=isOut&&fallenRodTis.has(ti);
    marker.classList.toggle('narrow-hidden',isOut&&!isFallen);marker.classList.toggle('eliminated',isFallen);
  });
}
