// ===== アプリケーション共有状態の入口 =====
// 画面やコマンドから runtime.js の変数を直接読み書きする箇所を
// 少しずつ減らすための、小さな共有状態ゲートウェイ。
// ここでは状態の所有権を奪わず、既存ランタイムの値へ安全に委譲する。
// 共有状態・コース定義・DOM・イベントの提供場所をここに集約する。
// 各機能は必要な時に遅延評価するため、runtime.jsで初期化される値も安全に参照できる。
const WakeSevenAppContext=Object.freeze({
  dom:Object.freeze({
    get(id){return document.getElementById(id);},
    query(selector,root=document){return root.querySelector(selector);},
    queryAll(selector,root=document){return [...root.querySelectorAll(selector)];},
    refs(ids,documentRef=document){return Object.freeze(Object.fromEntries(ids.map(id=>[id,documentRef?.getElementById(id)||null])));}
  }),
  events:Object.freeze({
    click(id,handler){const element=WakeSevenAppContext.dom.get(id);if(!element)return null;element.addEventListener('click',handler);return element;},
    on(id,type,handler,options){const element=WakeSevenAppContext.dom.get(id);if(!element)return null;element.addEventListener(type,handler,options);return element;}
  }),
  // コース定義の源泉はデータ配列そのもの。画面ごとに配列名を再定義しない。
  courses:Object.freeze({
    primary:()=>STAGES,
    mastery:()=>EXTRA_STAGES,
    satori:()=>SATORI_STAGES,
    tutorial:()=>TUTORIAL_STEPS
  }),
  state:Object.freeze({
    read(){return gameState;},
    snapshot(){return WakeSevenAppContext.snapshot();}
  }),
  // 現在の画面状態を、表示処理が使える読み取り専用スナップショットで返す。
  snapshot(){
    return Object.freeze({
      mode:activeMode,
      clearShown,
      lap:activeLap,
      stageIndex,
      masteryIndex:extraIndex,
      satoriIndex,
      tutorialStep
    });
  },
  isClearShown(){return clearShown===true;},
  // clearShown の変更はここを通す。保存は既存の syncGameState の責務とする。
  setClearShown(value){clearShown=value===true;return clearShown;},
  setMode(mode){setActiveMode(mode);return activeMode;}
});
