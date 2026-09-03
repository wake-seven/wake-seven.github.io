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
  // 共有状態は用途ごとの小さな入口から読む。各入口は現在のランタイム
  // 変数へ遅延して委譲するため、初期化順を変えずに段階移行できる。
  state:Object.freeze({
    read(){return gameState;},
    snapshot(){return WakeSevenAppContext.snapshot();},
    navigation:Object.freeze({
      read(){return typeof readNavigationStateOwner==='function'?readNavigationStateOwner():Object.freeze({mode:activeMode,lap:activeLap,stageIndex,masteryIndex:extraIndex,satoriIndex,tutorialStep,lastStageMode:typeof lastStageMode==='undefined'?null:lastStageMode});},
      update(patch={}){return typeof updateNavigationStateOwner==='function'?updateNavigationStateOwner(patch):(patch.mode!==undefined&&setActiveMode(patch.mode),this.read());}
    }),
    board:Object.freeze({
      read(){return Object.freeze({ori,spin,history,moves,best,drag,busy,boardTouchActive});},
      update(patch={}){if(patch.ori!==undefined)ori=patch.ori;if(patch.spin!==undefined)spin=patch.spin;if(patch.history!==undefined)history=patch.history;if(patch.moves!==undefined)moves=patch.moves;if(patch.best!==undefined)best=patch.best;if(patch.drag!==undefined)drag=patch.drag;if(patch.busy!==undefined)busy=patch.busy;if(patch.boardTouchActive!==undefined)boardTouchActive=patch.boardTouchActive;return this.read();}
    }),
    progress:Object.freeze({
      read(){return Object.freeze({clearedStages,clearedExtraStages,clearedSatoriStages,lap1ClearedStages,lap1ClearedExtraStages,lap1ClearedSatoriStages,lap2ClearedStages,lap2ClearedExtraStages,lap2ClearedSatoriStages});},
      update(patch={}){if(patch.clearedStages!==undefined)clearedStages=patch.clearedStages;if(patch.clearedExtraStages!==undefined)clearedExtraStages=patch.clearedExtraStages;if(patch.clearedSatoriStages!==undefined)clearedSatoriStages=patch.clearedSatoriStages;if(patch.lap1ClearedStages!==undefined)lap1ClearedStages=patch.lap1ClearedStages;if(patch.lap1ClearedExtraStages!==undefined)lap1ClearedExtraStages=patch.lap1ClearedExtraStages;if(patch.lap1ClearedSatoriStages!==undefined)lap1ClearedSatoriStages=patch.lap1ClearedSatoriStages;if(patch.lap2ClearedStages!==undefined)lap2ClearedStages=patch.lap2ClearedStages;if(patch.lap2ClearedExtraStages!==undefined)lap2ClearedExtraStages=patch.lap2ClearedExtraStages;if(patch.lap2ClearedSatoriStages!==undefined)lap2ClearedSatoriStages=patch.lap2ClearedSatoriStages;return this.read();}
    }),
    dialog:Object.freeze({
      read(){return typeof readDialogStateOwner==='function'?readDialogStateOwner():Object.freeze({clearShown,nextStageAttention,masterDialogKind,rankDialogReturn,messageDialogReturn});},
      update(patch={}){return typeof updateDialogStateOwner==='function'?updateDialogStateOwner(patch):(patch.clearShown!==undefined&&setClearShownCommand(patch.clearShown),this.read());}
    }),
    animation:Object.freeze({
      read(){return Object.freeze({busy,drag,clearFlowState:typeof clearFlowState!=='undefined'?clearFlowState:null});},
      update(patch={}){if(patch.busy!==undefined)busy=patch.busy;if(patch.drag!==undefined)drag=patch.drag;return this.read();}
    }),
    session:Object.freeze({
      read(){return Object.freeze({savedFreeSession,speedSession:typeof speedSession!=='undefined'?speedSession:null,speedVariant});},
      update(patch={}){if(patch.savedFreeSession!==undefined)savedFreeSession=patch.savedFreeSession;if(patch.speedSession!==undefined&&typeof speedSession!=='undefined')speedSession=patch.speedSession;if(patch.speedVariant!==undefined)speedVariant=patch.speedVariant;return this.read();}
    }),
    settings:Object.freeze({
      read(){return Object.freeze({soundEnabled,boardTheme,boardLayout,boardThemeChosen,boardLayoutChosen,darumaColor,darumaColorChosen,currentLang});},
      update(patch={}){if(patch.soundEnabled!==undefined)soundEnabled=patch.soundEnabled===true;if(patch.boardTheme!==undefined)boardTheme=patch.boardTheme;if(patch.boardLayout!==undefined)boardLayout=patch.boardLayout;if(patch.boardThemeChosen!==undefined)boardThemeChosen=patch.boardThemeChosen===true;if(patch.boardLayoutChosen!==undefined)boardLayoutChosen=patch.boardLayoutChosen===true;if(patch.darumaColor!==undefined)darumaColor=patch.darumaColor;if(patch.darumaColorChosen!==undefined)darumaColorChosen=patch.darumaColorChosen===true;if(patch.currentLang!==undefined)currentLang=patch.currentLang;return this.read();}
    })
  }),
  // 現在の画面状態を、表示処理が使える読み取り専用スナップショットで返す。
  snapshot(){
    return Object.freeze({
      ...WakeSevenAppContext.state.navigation.read(),
      clearShown:WakeSevenAppContext.state.dialog.read().clearShown
    });
  },
  isClearShown(){return WakeSevenAppContext.state.dialog.read().clearShown===true;},
  // clearShown の変更はここを通す。保存は既存の syncGameState の責務とする。
  setClearShown(value){return WakeSevenAppContext.state.dialog.update({clearShown:value}).clearShown;},
  setMode(mode){return WakeSevenAppContext.state.navigation.update({mode}).mode;}
});
// 個別の共有状態を書き換える場合も、呼び出し側が所有変数へ直接代入しないようにする。
function setNavigationIndexCommand(kind,value){
  const patch=kind==='stageIndex'?{stageIndex:value}:kind==='masteryIndex'?{masteryIndex:value}:kind==='satoriIndex'?{satoriIndex:value}:kind==='tutorialStep'?{tutorialStep:value}:{};
  return updateNavigationStateCommand(patch);
}
function setClearShownCommand(value){return updateDialogStateCommand({clearShown:value}).clearShown;}
function setSpeedSessionCommand(value){return updateSessionStateCommand({speedSession:value}).speedSession;}
function setSpeedVariantCommand(value){return updateSessionStateCommand({speedVariant:value}).speedVariant;}
