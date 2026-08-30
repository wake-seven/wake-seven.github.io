// 悟りへの道の最終出題順。直前の構築処理は基礎データ側に残す。
const SATORI_STAGES=[...SATORI_MIXED_STAGES];
[SATORI_STAGES[71],SATORI_STAGES[72]]=[SATORI_STAGES[72],SATORI_STAGES[71]];
const SATORI_ORDER_VERSION='mixed-depths-final-swap-10';
const satoriStageIndexByState=new Map(SATORI_STAGES.map((stage,index)=>[stage.state,index]));
