// 盤面上の補助表示だけを担当するrenderer。盤面状態の変更・保存・操作判定は行わない。
function showTrainingShapeCallout(){
  const position=TWO_MOVE_CANONICAL_POSITION.get(canonicalState(enc(ori)));
  const shape=position?TWO_MOVE_TIP3_SHAPES[position]:null;
  if(!shape)return;
  svg.querySelectorAll('.training-shape-callout').forEach(el=>el.remove());
  clearUiContextTimer('training-shape-callout');
  const NS_='http://www.w3.org/2000/svg';
  const g=document.createElementNS(NS_,'g');
  g.setAttribute('class','training-shape-callout');
  g.innerHTML=shapeOutlinePath(ori);
  const text=document.createElementNS(NS_,'text');
  text.setAttribute('class','training-shape-callout-text');
  const line1=document.createElementNS(NS_,'tspan');
  line1.setAttribute('class','training-shape-callout-line1');
  line1.setAttribute('x',CELL[3].x);line1.setAttribute('dy','-0.85em');
  line1.textContent=tr('trainingTwoMoreLabel');
  const line2=document.createElementNS(NS_,'tspan');
  line2.setAttribute('class','training-shape-callout-line2');
  line2.setAttribute('x',CELL[3].x);line2.setAttribute('dy','1.3em');
  line2.textContent=tr('twoMoveTip3'+shape+'Name');
  text.appendChild(line1);text.appendChild(line2);
  text.setAttribute('x',CELL[3].x);text.setAttribute('y',CELL[3].y);
  g.appendChild(text);
  svg.appendChild(g);
  const box=text.getBBox(),padX=14,padY=8;
  const rect=document.createElementNS(NS_,'rect');
  rect.setAttribute('class','training-shape-callout-badge');
  rect.setAttribute('x',box.x-padX);rect.setAttribute('y',box.y-padY);
  rect.setAttribute('width',box.width+padX*2);rect.setAttribute('height',box.height+padY*2);
  rect.setAttribute('rx',(box.height+padY*2)/2);
  g.insertBefore(rect,text);
  requestAnimationFrame(()=>g.classList.add('show'));
  setUiContextTimer('training-shape-callout',()=>{
    g.classList.remove('show');
    setTimeout(()=>g.remove(),260);
  },1000);
}
// 学園の残り手数コールアウトに固定されたDOM欄だけを描画する。
function renderAcademyRemainingCalloutElement(element,{label='',number='',unit=''}={}){
  if(!element)return;
  element.querySelector('.academy-remaining-callout-label').textContent=label;
  element.querySelector('.academy-remaining-callout-number').textContent=number;
  element.querySelector('.academy-remaining-callout-unit').textContent=unit;
  element.hidden=false;
}
// 自動回転中の1フレームをDOM/SVGへ反映する。角度・進捗の計算と操作判定は呼び出し側に残す。
function renderSwipeFrame({group,pivot,deg,progress,preview}){
  if(group&&pivot)group.setAttribute('transform','rotate('+deg+' '+pivot.x+' '+pivot.y+')');
  if(preview?.kind==='grouped')updateAutoSwipePreview(preview.clones,progress,preview.dir);
  if(preview?.kind==='undo')for(const{item,clone,hex}of preview.clones){
    let angle=(item.turn*120+deg)%360;
    if(angle>180)angle-=360;
    if(angle<-180)angle+=360;
    const state=Math.abs(angle)<=22?'stand':'fallen';
    clone.setAttribute('class','tile '+state);
    if(hex){const tone=BOARD_THEME_TONES[boardTheme]?.[state];hex.style.fill=tone?.fill||'';hex.style.stroke=tone?.stroke||'';}
  }
}
// 操作中の固定フィードバックを表示する。入力値の判定や盤面変更は行わない。
function renderBoardInteractionFeedback({classes={},promptText,promptVisible}={}){
  Object.entries(classes).forEach(([className,active])=>svg?.classList.toggle(className,active===true));
  if(promptText!==undefined){const text=$('gripPromptText');if(text)text.textContent=promptText;}
  if(promptVisible!==undefined){const prompt=$('gripPrompt');if(prompt)prompt.hidden=promptVisible!==true;}
}
// タイル1枚の表示状態だけを反映する。状態判定やpointer座標計算は呼び出し側に残す。
function renderBoardTileState(tile,{state='stand',visibility,transform}={}){
  if(!tile)return;
  tile.setAttribute('class','tile '+state);
  if(visibility!==undefined)tile.style.visibility=visibility;
  if(transform!==undefined)tile.style.transform=transform;
}
function renderBoardTileFlash(tile,active=true){
  if(!tile)return;
  tile.classList.remove('grab-flash');
  if(active){void tile.getBoundingClientRect();tile.classList.add('grab-flash');}
}
export {};
