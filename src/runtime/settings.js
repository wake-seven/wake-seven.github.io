// ===== 実行設定 =====
// 設定の初期化だけを担当する。
// gameState / storage / STORAGE_KEYS は runtime.js 側で準備された後に呼び出す。
let soundEnabled=false;
let boardTheme='default';
let boardLayout='normal';
let boardThemeChosen=false;
let boardLayoutChosen=false;
let darumaColor='red';
let darumaColorChosen=false;

function initializeRuntimeSettings(){
  soundEnabled=gameState.settings.sound!==false;
  boardTheme=['default','gold','satori'].includes(gameState.settings.boardTheme)?gameState.settings.boardTheme:'default';
  boardLayout=gameState.settings.boardTheme==='tilted'||gameState.settings.boardLayout==='tilted'?'tilted':'normal';
  boardThemeChosen=gameState.settings.boardThemeChosen===true;
  boardLayoutChosen=gameState.settings.boardLayoutChosen===true;
  darumaColor=['red','rainbow'].includes(gameState.settings.darumaColor)?gameState.settings.darumaColor:'red';
  darumaColorChosen=gameState.settings.darumaColorChosen===true;
}

// 公開バンドルではnative moduleへ連結されることを明示する境界。
export {};
