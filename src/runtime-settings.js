// ===== 実行設定 =====
// 設定の初期化と旧保存キーからの読み込みだけを担当する。
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
  // Legacy settings are only a fallback while upgrading an incomplete vNext document.
  if(!gameState.settings.boardTheme||!gameState.settings.boardLayout)try{
    const savedTheme=storage.get(STORAGE_KEYS.boardTheme);
    // 旧「縦配置」テーマは、通常色 + 縦配置へ移行する。
    if(savedTheme==='tilted')boardLayout='tilted';
    else if(['default','gold','satori'].includes(savedTheme))boardTheme=savedTheme;
    const savedLayout=storage.get(STORAGE_KEYS.boardLayout);
    if(['normal','tilted'].includes(savedLayout))boardLayout=savedLayout;
  }catch(_){ }
  try{boardThemeChosen=storage.get(STORAGE_KEYS.boardThemeChosen)==='1';}catch(_){ }
  try{boardLayoutChosen=storage.get(STORAGE_KEYS.boardLayoutChosen)==='1';}catch(_){ }
  darumaColor=['red','rainbow'].includes(gameState.settings.darumaColor)?gameState.settings.darumaColor:'red';
  if(!gameState.settings.darumaColor)try{
    const savedDarumaColor=storage.get(STORAGE_KEYS.darumaColor);
    // 旧版の特別色は、七色のだるまへ移行する。
    if(['red','rainbow'].includes(savedDarumaColor))darumaColor=savedDarumaColor;
    else if(['indigo','gold','green'].includes(savedDarumaColor))darumaColor='rainbow';
    darumaColorChosen=storage.get(STORAGE_KEYS.darumaColorChosen)==='1';
  }catch(_){ }
}
