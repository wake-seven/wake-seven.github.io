// チュートリアル巻き戻し演出へ渡す表示モデル。副作用を持たない。
function createTutorialRewindModel({startAngle=0,endAngle=0,direction=1,pivot,items=[],duration=720,cue=''}){
  return {startAngle,endAngle,direction,pivot,items,duration,cue};
}
export {};
