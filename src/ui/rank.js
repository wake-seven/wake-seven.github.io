// 称号表示と称号一覧ダイアログ。
// 盤面選択画面やクリア後演出からも利用するため、描画の共通部をここに集約する。
// 称号の定義・判定・色は、ステージ選択や進行UIから参照される共通の称号領域。
// ステージ選択そのものは progression-ui.js に残し、ここでは称号の意味だけを扱う。
const MASTER_PATH={
  ja:{subtitles:['七転八起','面壁九年','不立文字'],ranks:['卒業生','一人前','不屈','熟練','名人','無心','覚者'],earned:'称号「{rank}」を獲得しました。'},
  en:{subtitles:['Seven Falls, Eight Rises','Nine Years Facing the Wall','Beyond Words'],roadSubtitles:['Seven Falls','Nine Years','Beyond Words'],ranks:['Graduate','Adept','Unyielding','Seasoned','Master','No Mind','Awakened'],earned:'You earned the title “{rank}”.'},
  zh:{subtitles:['七转八起','面壁九年','不立文字'],ranks:['毕业生','独当一面','不屈','熟练','名人','无心','觉者'],earned:'获得称号“{rank}”。'},
  ko:{subtitles:['칠전팔기','면벽구년','불립문자'],ranks:['졸업생','일인분','불굴','숙련','명인','무심','깨달은 자'],earned:'칭호 “{rank}”을(를) 획득했습니다.'}
};
const masterPath=()=>MASTER_PATH[currentLang]||MASTER_PATH.ja;
const masterSubtitle=volume=>masterPath().subtitles[volume-1]||'';
const rankForVolume=volume=>masterPath().ranks[volume+1]||'';
function highestRankIndex(){
  if(awakenedGranted)return 6;
  return rankIndexForProgress(lap1ClearedStages,lap1ClearedExtraStages,lap1ClearedSatoriStages,false);
}
function rankIndexForProgress(primary,extra,satori,second=false){
  if(SATORI_STAGES.every((_,i)=>satori.has(i)))return second?(awakenedGranted?6:4):5;
  if(extra.has(44)&&(second||speedMasteryTrialCleared))return 4;
  if(extra.has(29))return 3;
  if(extra.has(14))return 2;
  if(STAGES.every((_,i)=>primary.has(i))&&(second||speedIntermediateTrialCleared))return 1;
  const academyDone=Array.from({length:ACADEMY_STAGE_COUNT},(_,i)=>i).every(i=>primary.has(i));
  return academyDone&&(second||speedTrainingTrialCleared)?0:-1;
}
const firstLapRankIndex=()=>rankIndexForProgress(lap1ClearedStages,lap1ClearedExtraStages,lap1ClearedSatoriStages,false);
const secondLapRankIndex=()=>rankIndexForProgress(lap2ClearedStages,lap2ClearedExtraStages,lap2ClearedSatoriStages,true);
function rankEarnedText(rank){return masterPath().earned.replace('{rank}',rank);}
const RANK_FRAME_COLORS=[
  {stroke:'#E2CFA8',ink:'#F0E3C8'},
  {stroke:'#D9827A',ink:'#D9827A'},
  {stroke:'#9A86D6',ink:'#9A86D6'},
  {stroke:'#62B8D2',ink:'#62B8D2'},
  {stroke:'#C9A54E',ink:'#C9A54E'},
  {stroke:'#BCC9CD',ink:'#E6EEF0'},
  {stroke:'#24282B',ink:'#454B4F'}
];
function setSealColor(seal,index){
  const stroke=(RANK_FRAME_COLORS[index]||RANK_FRAME_COLORS[0]).stroke;
  seal.style.setProperty('--seal-color',stroke);
  seal.style.setProperty('--spark-color',index===6?'#C9A54E':stroke);
}
function speedExamBadgeSvg(){
  return '<svg viewBox="0 0 34 34" aria-hidden="true"><g transform="rotate(-15 17 17)"><rect x="5" y="4" width="24" height="21" rx="2.5" fill="#7C9463" stroke="#2B2118" stroke-width="1.6" stroke-linejoin="round"/><rect x="8.5" y="7.5" width="17" height="14" rx="1" fill="#F1E6C8" stroke="#8A8478" stroke-width="1.3"/><path d="M13.4 10.5q1.6 2 0 4t0 4" fill="none" stroke="#6B5A44" stroke-width="1.1" stroke-linecap="round" opacity=".75"/><path d="M17 10q1.6 2 0 4t0 4.4" fill="none" stroke="#6B5A44" stroke-width="1.1" stroke-linecap="round" opacity=".75"/><path d="M20.6 10.5q1.6 2 0 4t0 4" fill="none" stroke="#6B5A44" stroke-width="1.1" stroke-linecap="round" opacity=".75"/></g></svg>';
}
function speedExamBadgeLabel(index){
  if(index===0)return tr('speedExamBadgePrimary');
  if(index===1)return tr('speedExamBadgeIntermediate');
  if(index===4)return tr('speedExamBadgeMastery');
  if(index===5)return tr('speedExamBadgeSatori');
  return '';
}
function speedExamClearedForRank(index){
  if(index===0)return speedTrainingTrialCleared;
  if(index===1)return speedIntermediateTrialCleared;
  if(index===4)return speedMasteryTrialCleared;
  if(index===5)return Number(storage.get(speedBestStorageKey('satori73'),'0'))>0;
  return false;
}
function rankFrameSvg(text,locked=false,index=0,doubleFrame=false,dimmed=false){
  const colors=RANK_FRAME_COLORS[index]||RANK_FRAME_COLORS[0];
  const noMind=index===5&&!locked;
  const awakened=index===6&&!locked;
  const secondLapBand=doubleFrame&&dimmed&&!locked;
  const stroke=locked?'#64778A':colors.stroke;
  const fill=locked?'rgba(80,101,120,.08)':awakened?'#FAFAF7':noMind?'#14262E':index===0?'rgba(226,207,168,.09)':'rgba(201,165,78,.05)';
  const ink=locked?'#73869A':colors.ink;
  const size=awakened?(text.length>=7?20:29):text.length>=8?18:text.length>=3?23:27;
  const band=secondLapBand?'<path d="M15 3H135L147 29 135 55H15L3 29Z M19 9H131L139 29 131 49H19L11 29Z" fill="'+colors.stroke+'" fill-opacity=".22" fill-rule="evenodd"/>':'';
  const inner=doubleFrame||(!locked&&awakened)?'<path d="M19 9H131L139 29 131 49H19L11 29Z" fill="none" stroke="'+(awakened?'#34393C':stroke)+'" stroke-width="'+(awakened?'.75':'.8')+'" opacity="'+(awakened?'1':'.7')+'" stroke-linejoin="round"/>':'';
  return '<svg class="'+(dimmed?'second-lap-rank':'')+'" viewBox="0 0 150 58" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+text+'"><path d="M15 3H135L147 29 135 55H15L3 29Z" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+(awakened?'1.7':noMind?'1.5':'2')+'" stroke-linejoin="round"/>'+band+inner+'<text x="75" y="30" text-anchor="middle" dominant-baseline="central" font-family="Hiragino Sans,Yu Gothic,sans-serif" font-size="'+size+'" font-weight="700" fill="'+ink+'" letter-spacing="1">'+text+'</text></svg>';
}
function renderRankBadge(){
  const first=firstLapRankIndex(),second=secondLapRankIndex(),badge=$('rankBadge');
  badge.hidden=first<0;
  badge.classList.remove('dual-rank');
  if(first>=0){
    const index=secondLapUnlocked&&second>=0?second:first;
    badge.innerHTML=rankFrameSvg(masterPath().ranks[index],false,index,secondLapUnlocked&&second>=0,secondLapUnlocked&&second>=0);
    badge.title=tr('rankCollection');
    badge.setAttribute('aria-label',tr('rankCollection'));
  }
}
function renderStagePickerRankBadge(){
  const first=firstLapRankIndex(),second=secondLapRankIndex(),badge=$('stagePickerRankBadge');
  badge.hidden=first<0;
  badge.classList.remove('dual-rank');
  if(first>=0){
    const index=secondLapUnlocked&&second>=0?second:first;
    badge.innerHTML=rankFrameSvg(masterPath().ranks[index],false,index,secondLapUnlocked&&second>=0,secondLapUnlocked&&second>=0);
    badge.title=tr('rankCollection');
    badge.setAttribute('aria-label',tr('rankCollection'));
  }
}
function rankPathLabel(index){
  if(index===0)return tr('academyPickerRound');
  if(index===1)return tr('primaryRound');
  if(index===5)return tr('satori');
  if(index===6)return tr('secondLapPath');
  const volume=index-1;
  return currentLang==='ja'?'名人への道・'+volumeLabel(volume)+'　'+masterSubtitle(volume):tr('allPatternsKind')+' '+volumeLabel(volume)+' · '+masterSubtitle(volume);
}
function rankProblemCount(index){
  const count=(index===5||index===6)?SATORI_STAGES.length:index===1?TRAINING_STAGE_COUNT:index===0?ACADEMY_STAGE_COUNT:MASTER_VOLUME_SIZE;
  if(currentLang==='ja')return '　'+count+'問';
  if(currentLang==='zh')return '　'+count+'题';
  if(currentLang==='ko')return '　'+count+'문제';
  return ' · '+count+' puzzles';
}
function renderRankList(){
  if(!secondLapUnlocked)rankListLap=1;
  const second=rankListLap===2;
  const highest=second?secondLapRankIndex():firstLapRankIndex();
  const sequence=second?[0,1,2,3,4,6]:[0,1,2,3,4,5];
  const earnedCount=second?(awakenedGranted?sequence.length:Math.max(0,highest+1)):Math.max(0,highest+1);
  const list=$('rankList');
  setText('rankDialogTitle',tr('rankDialogTitle'));
  setText('closeRankDialog',tr('close'));
  setVisible('rankLapSwitch',secondLapUnlocked);
  setText('rankLap1',tr('firstLapLabel'));
  setText('rankLap2',tr('secondLapLabel'));
  $('rankLap1').classList.toggle('on',!second);
  $('rankLap2').classList.toggle('on',second);
  list.replaceChildren();
  const rowTemplate=document.getElementById('rank-list-row-template');
  const visible=second?sequence:sequence.slice(0,Math.min(sequence.length,Math.max(1,highest+2)));
  visible.forEach((index,position)=>{
    const rank=masterPath().ranks[index];
    const earned=second?(index===6?awakenedGranted:position<earnedCount):index<=highest;
    const next=position===earnedCount;
    const linkable=earned||next;
    const row=rowTemplate?.content.cloneNode(true).firstElementChild||document.createElement('div');
    row.className='rank-row'+(earned?' earned':'')+(next?' next':'');
    const condition=row.querySelector('[data-rank-condition]')||document.createElement('span'),path=document.createElement(linkable?'button':'span'),count=document.createElement('span'),title=row.querySelector('[data-rank-title]')||document.createElement('b');
    condition.className='rank-condition';
    path.className=linkable?'rank-stage-link':'rank-stage-label';
    if(linkable)path.type='button';
    path.textContent=index===6?tr('satori'):rankPathLabel(index);
    title.innerHTML=rankFrameSvg(earned?rank:'？',!earned,index,second,second);
    if(earned&&speedExamClearedForRank(index))title.insertAdjacentHTML('beforeend','<button type="button" class="speed-exam-badge" data-exam-index="'+index+'">'+speedExamBadgeSvg()+'</button>');
    count.textContent=rankProblemCount(index);
    if(linkable)path.addEventListener('click',()=>{
      activateCampaignLap(second?2:1);
      updateDialogStateOwner({rankDialogReturn:null});$('rankDialog').hidden=true;
      if(index===6||index===5)openDialog('stagePicker',{lap:second?2:1,round:'satori'});
      else openDialog('stagePicker',{lap:second?2:1,round:index===0?-PRIMARY_PICKER_SECTION_COUNT:index===1?PICKER_TRAINING_FIRST_ROUND:index-2});
    });
    condition.append(path,count);list.appendChild(row);
  });
}
function openRankDialog(returnTarget=null){
  const {navigation}=readProgressionContext();
  updateDialogStateOwner({rankDialogReturn:returnTarget});
  rankListLap=navigation.lap;
  renderRankList();
  $('rankDialog').hidden=false;
  $('closeRankDialog').focus();
}
$('rankLap1').addEventListener('click',()=>{rankListLap=1;renderRankList();});
$('rankLap2').addEventListener('click',()=>{if(secondLapUnlocked){rankListLap=2;renderRankList();}});
function openRankDialogFrom(dialogId,sealId){
  const seal=$(sealId);
  if(!seal.classList.contains('rank-seal'))return;
  $(dialogId).hidden=true;
  openDialog('rankDialog',{returnTarget:{dialogId,focusId:sealId}});
}
// 公開ネイティブモジュールの構文境界。
export {};
