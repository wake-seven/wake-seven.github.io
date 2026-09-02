// ===== ヒント表示・チュートリアル補助 =====
function clearHintVisuals(preserveSelection=false){
  clearAxisGuide();
  svg.querySelectorAll('.hint-arrow').forEach(el=>el.remove());
  svg.classList.remove('hinting');
  if(!preserveSelection)baseTiles.forEach(el=>el.classList.remove('selected'));
}
function showHintArrow(ti,dir,both=false,persistent=false){
  clearHintVisuals();
  const NS_='http://www.w3.org/2000/svg',t=TRI[ti],r=38;
  svg.classList.add('hinting');
  for(const i of t.cells) tileEls[i].classList.add('selected');
  const boardCenter=CELL[3];
  const outwardAngle=Math.atan2(t.y-boardCenter.y,t.x-boardCenter.x)*180/Math.PI;
  const startAngle=outwardAngle,endAngle=startAngle+dir*120,shaftEnd=endAngle-dir*22;
  const point=a=>{const q=a*Math.PI/180;return {x:t.x+r*Math.cos(q),y:t.y+r*Math.sin(q)};};
  const start=point(startAngle),base=point(shaftEnd),tip=point(endAngle),q=endAngle*Math.PI/180;
  const ax=-Math.sin(q)*dir,ay=Math.cos(q)*dir,nx=-ay,ny=ax;
  const w1={x:base.x+nx*9,y:base.y+ny*9},w2={x:base.x-nx*9,y:base.y-ny*9};
  let secondHead='';
  if(both){const sb=point(startAngle+dir*22),sq=startAngle*Math.PI/180,sax=Math.sin(sq)*dir,say=-Math.cos(sq)*dir,snx=-say,sny=sax,sw1={x:sb.x+snx*9,y:sb.y+sny*9},sw2={x:sb.x-snx*9,y:sb.y-sny*9};secondHead='<path class="head" d="M '+start.x.toFixed(2)+' '+start.y.toFixed(2)+' L '+sw1.x.toFixed(2)+' '+sw1.y.toFixed(2)+' L '+sw2.x.toFixed(2)+' '+sw2.y.toFixed(2)+' Z"/>';}
  const arcD='M '+start.x.toFixed(2)+' '+start.y.toFixed(2)+' A '+r+' '+r+' 0 0 '+(dir>0?1:0)+' '+base.x.toFixed(2)+' '+base.y.toFixed(2);
  const g=document.createElementNS(NS_,'g');g.setAttribute('class','hint-arrow'+(persistent?' tutorial':''));
  g.innerHTML=(persistent?'<path class="arc-border" d="'+arcD+'"/>':'')+'<path class="arc" pathLength="100" d="'+arcD+'"/>'+(persistent?'<path class="arc-glow" pathLength="100" d="'+arcD+'"/>':'')+'<path class="head" d="M '+tip.x.toFixed(2)+' '+tip.y.toFixed(2)+' L '+w1.x.toFixed(2)+' '+w1.y.toFixed(2)+' L '+w2.x.toFixed(2)+' '+w2.y.toFixed(2)+' Z"/>'+secondHead;
  svg.appendChild(g);
  if(!persistent)setUiEffectTimer('hint','preview',()=>{if(g.isConnected){clearHintVisuals();if(usesHiddenRemaining()){fourthHintPreview=false;fourthDistanceRevealed=true;fourthHintDistance=null;showRemaining(remainingForDisplay(SOLVER.dist[enc(ori)]));}}},1400);
}
function showBestMoveHint(persistent=false){
  if(busy||isSolved()||masterHintsDisabled())return;
  const dist=SOLVER.dist,d=dist[enc(ori)];
  if(usesHiddenRemaining()){fourthHintPreview=true;fourthDistanceRevealed=false;fourthHintDistance=Math.max(0,d-1);showRemaining(remainingForDisplay(d));}
  for(let ti=0;ti<TRI.length;ti++)for(const dir of [1,-1]){const next=rollOnce(ori,ti,dir);if(dist[enc(next)]!==d-1)continue;const el=svg.querySelector('.pivot[data-tri="'+ti+'"]');el.classList.add('hi');setUiEffectTimer('hint','pivot',()=>el.classList.remove('hi'),1100);showHintArrow(ti,dir,false,persistent);return;}
}
function cancelTutorialHint(preserveSelection=false){clearUiEffectTimers('hint');clearAxisGuide();clearHintVisuals(preserveSelection);svg.querySelectorAll('.pivot.hi').forEach(el=>el.classList.remove('hi'));}
function scheduleStageOneTutorial(){cancelTutorialHint();}
function scheduleBasicLessonAssist(){cancelTutorialHint();}
$('hint').addEventListener('click',()=>{cancelTutorialHint();if(isFourthVolume())revealFourthDistance();else showBestMoveHint();});

// この抽出断片は、公開ネイティブモジュールスクリプトへ連結される間もソース監査で明示的に扱う。
export {};
