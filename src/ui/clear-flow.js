// ===== クリア内容の選択 =====
// クリア後の文章・挿絵・詳細データを、表示側から切り離して解決する。
// ここでは既存のグローバル状態と公開関数名を維持し、生成順の依存を増やさない。
function twoMoveDiscoveryText(card){
  const position=TWO_MOVE_PATTERN_POSITION[card];
  const key=TWO_MOVE_CLEAR_MESSAGE_KEYS[position];
  return currentLang==='ja'&&key?tr(key,{n:position}):tr('twoMoveDiscovery',{n:position});
}
function stageClearTextAt(mode,index){
  const entry=clearContentAt(mode,index);
  if(!entry)return mode?'':'';
  if(entry.twoMoveCard!==undefined)return twoMoveDiscoveryText(entry.twoMoveCard);
  if(entry.guideCard)return resolveLocaleText(entry.guideCard.text);
  return entry.tip?resolveLocaleText(entry.tip):'';
}
function stageClearText(){return isMode('free')||isMode('custom')||isMode('satori')?'':stageClearTextAt(isMode('mastery'),isMode('mastery')?extraIndex:stageIndex);}
function clearEntryForCurrent(){
  if(isMode('mastery'))return clearContentAt(true,extraIndex);
  if(isMode('free')||isMode('custom')||isMode('satori'))return undefined;
  return clearContentAt(false,stageIndex);
}
function stageClearArtAt(mode,index){
  const entry=clearContentAt(mode,index);
  if(!entry)return '';
  if(entry.twoMoveCard!==undefined)return 'twoMoveCard:'+entry.twoMoveCard;
  if(entry.guideCard)return 'guideCard:'+entry.guideCard.state.join('');
  return entry.art||'';
}
function stageClearArt(){return isMode('satori')?'':stageClearArtAt(isMode('mastery'),isMode('mastery')?extraIndex:stageIndex);}
// 公開native moduleの構文境界。
export {};
