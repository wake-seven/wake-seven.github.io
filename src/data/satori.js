// 悟りへの道の最終出題順。直前の構築処理は基礎データ側に残す。
function satoriStagesAtDepth(depth){
  const seen=new Set(),stages=[];
  for(const state of SOLVER.byDepth[depth]){
    const canonical=canonicalState(state);
    if(seen.has(canonical))continue;
    seen.add(canonical);stages.push({state:canonical,par:depth});
  }
  return stages.sort((a,b)=>{
    const ae=progressOptionCounts(a),be=progressOptionCounts(b);
    return be.progress-ae.progress||ae.worse-be.worse||a.state-b.state;
  });
}
// 最短手数ぶん、毎手12通りを完全にランダムに選んだときの最短クリア確率で並べる。
// 最短4手に入った途端に急に易しくなることを避ける。
const SATORI_CATALOG=[1,2,3,4].flatMap(satoriStagesAtDepth);
const SATORI_PROBABILITY_ASCENDING=[...SATORI_CATALOG].sort((a,b)=>{
  const ae=progressOptionCounts(a),be=progressOptionCounts(b);
  return ae.progress-be.progress||be.worse-ae.worse||a.state-b.state;
});
const SATORI_PROBABILITY_DESCENDING=[...SATORI_CATALOG].sort((a,b)=>{
  const ae=progressOptionCounts(a),be=progressOptionCounts(b);
  return be.progress-ae.progress||ae.worse-be.worse||a.state-b.state;
});
function satoriExpectedNextDistance(stage){
  const ae=progressOptionCounts(stage);
  return stage.par+(ae.worse-ae.progress)/12;
}
const SATORI_EXPECTED_STAGES=[
  ...SATORI_CATALOG.filter(stage=>stage.par===1),
  ...SATORI_CATALOG.filter(stage=>stage.par===2),
  ...SATORI_CATALOG.filter(stage=>stage.par>=3).sort((a,b)=>{
    const delta=satoriExpectedNextDistance(a)-satoriExpectedNextDistance(b);
    return delta||a.par-b.par||a.state-b.state;
  })
];
const satoriOptimalPathMemo=new Map();
function satoriOptimalPathCount(state,steps){
  if(steps===0)return state===0?1:0;
  const key=state+'|'+steps;
  if(satoriOptimalPathMemo.has(key))return satoriOptimalPathMemo.get(key);
  const board=dec(state);
  let count=0;
  for(let ti=0;ti<TRI.length;ti++)for(const dir of [1,-1]){
    count+=satoriOptimalPathCount(enc(rollOnce(board,ti,dir)),steps-1);
  }
  satoriOptimalPathMemo.set(key,count);
  return count;
}
function satoriOptimalClearProbability(stage){
  return satoriOptimalPathCount(stage.state,stage.par)/(12**stage.par);
}
// ひとつ前の並び。比較検証用の固定データとして残す。
const SATORI_GLOBAL_OPTIMAL_STAGES=[...SATORI_CATALOG].sort((a,b)=>{
  const delta=satoriOptimalClearProbability(b)-satoriOptimalClearProbability(a);
  return delta||a.par-b.par||a.state-b.state;
});
// 一時的に採用していた「手数優先」の並び。比較検証用に残す。
const SATORI_DEPTH_OPTIMAL_STAGES=[...SATORI_CATALOG].sort((a,b)=>{
  // まず最短手数の少ない順。その同じ手数の中だけ、最短で解ける確率順にする。
  // 3手の問題が4手の問題より後になることはない。
  const depth=a.par-b.par;
  if(depth)return depth;
  const delta=satoriOptimalClearProbability(b)-satoriOptimalClearProbability(a);
  return delta||a.state-b.state;
});
// 以前の確率順。比較検証用の固定データとして残す。
const SATORI_HUMAN_TIE_STAGES=[...SATORI_CATALOG].sort((a,b)=>{
  const probability=satoriOptimalClearProbability(b)-satoriOptimalClearProbability(a);
  if(probability)return probability;
  const ae=progressOptionCounts(a),be=progressOptionCounts(b);
  return be.progress-ae.progress||ae.worse-be.worse||a.par-b.par||a.state-b.state;
});
// 第25問までは1手→2手→3手。第26問以降は3手と4手を予測しにくい固定順で混ぜる。
// 各手数の中では従来の難易度順を保ち、8問ごとに3手・4手を4問ずつ配置する。
const SATORI_MIXED_DEPTHS=[
  4,3,4,4,3,3,4,3,
  3,4,3,4,4,3,3,4,
  4,3,3,4,3,4,4,3,
  3,4,4,3,4,3,3,4,
  3,4,3,3,4,4,3,4,
  4,3,4,3,3,4,4,3
];
const satoriIntroStages=SATORI_HUMAN_TIE_STAGES.filter(stage=>stage.par<=2);
const satoriThreeStages=SATORI_HUMAN_TIE_STAGES.filter(stage=>stage.par===3);
const satoriFourStages=SATORI_HUMAN_TIE_STAGES.filter(stage=>stage.par===4);
let satoriMixedThreeIndex=15,satoriMixedFourIndex=0;
const SATORI_MIXED_STAGES=[
  ...satoriIntroStages,
  ...satoriThreeStages.slice(0,15),
  ...SATORI_MIXED_DEPTHS.map(depth=>depth===3
    ?satoriThreeStages[satoriMixedThreeIndex++]
    :satoriFourStages[satoriMixedFourIndex++])
];
const SATORI_STAGES=[...SATORI_MIXED_STAGES];
[SATORI_STAGES[71],SATORI_STAGES[72]]=[SATORI_STAGES[72],SATORI_STAGES[71]];
const SATORI_ORDER_VERSION='mixed-depths-final-swap-10';
const satoriStageIndexByState=new Map(SATORI_STAGES.map((stage,index)=>[stage.state,index]));
// 公開ネイティブモジュールの構文境界。
export {};
