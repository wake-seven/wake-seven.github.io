// ===== クリア内容の選択 =====
// クリア後の文章・挿絵・詳細データを、表示側から切り離して解決する。
// ここでは既存のグローバル状態と公開関数名を維持し、生成順の依存を増やさない。
function twoMoveDiscoveryText(card){
  const position=TWO_MOVE_PATTERN_POSITION[card];
  const key=TWO_MOVE_CLEAR_MESSAGE_KEYS[position];
  const {language}=runtimeSnapshot();
  return language==='ja'&&key?tr(key,{n:position}):tr('twoMoveDiscovery',{n:position});
}
function stageClearTextAt(mode,index){
  const entry=clearContentAt(mode,index);
  if(!entry)return mode?'':'';
  if(entry.twoMoveCard!==undefined)return twoMoveDiscoveryText(entry.twoMoveCard);
  if(entry.guideCard)return resolveLocaleText(entry.guideCard.text);
  return entry.tip?resolveLocaleText(entry.tip):'';
}
function stageClearText(){const {mode,masteryIndex,stageIndex}=runtimeSnapshot();return mode==='free'||mode==='custom'||mode==='satori'?'':stageClearTextAt(mode==='mastery',mode==='mastery'?masteryIndex:stageIndex);}
function clearEntryForCurrent(){
  const {mode,masteryIndex,stageIndex}=runtimeSnapshot();
  if(mode==='mastery')return clearContentAt(true,masteryIndex);
  if(mode==='free'||mode==='custom'||mode==='satori')return undefined;
  return clearContentAt(false,stageIndex);
}
function stageClearArtAt(mode,index){
  const entry=clearContentAt(mode,index);
  if(!entry)return '';
  if(entry.twoMoveCard!==undefined)return 'twoMoveCard:'+entry.twoMoveCard;
  if(entry.guideCard)return 'guideCard:'+entry.guideCard.state.join('');
  return entry.art||'';
}
function stageClearArt(){const {mode,masteryIndex,stageIndex}=runtimeSnapshot();return mode==='satori'?'':stageClearArtAt(mode==='mastery',mode==='mastery'?masteryIndex:stageIndex);}
// 公開ネイティブモジュールの構文境界。
export {};
