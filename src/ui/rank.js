// 称号表示と称号一覧ダイアログ。
// 盤面選択画面やクリア後演出からも利用するため、描画の共通部をここに集約する。
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
  $('rankDialogTitle').textContent=tr('rankDialogTitle');
  $('closeRankDialog').textContent=tr('close');
  $('rankLapSwitch').hidden=!secondLapUnlocked;
  $('rankLap1').textContent=tr('firstLapLabel');
  $('rankLap2').textContent=tr('secondLapLabel');
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
      rankDialogReturn=null;$('rankDialog').hidden=true;
      if(index===6||index===5)openSatoriPicker();
      else openStagePickerForRank(index);
    });
    condition.append(path,count);list.appendChild(row);
  });
}
function openRankDialog(returnTarget=null){
  rankDialogReturn=returnTarget;
  rankListLap=activeLap;
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
  openRankDialog({dialogId,focusId:sealId});
}
// 公開native moduleの構文境界。
export {};
