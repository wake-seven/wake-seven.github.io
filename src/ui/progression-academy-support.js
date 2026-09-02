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
  const pool=Array.from({length:TRI.length},(_,i)=>i).filter(i=>i!==primary);
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  return new Set([primary,...pool.slice(0,2)]);
}
