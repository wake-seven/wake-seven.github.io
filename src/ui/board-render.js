// 盤面上の補助表示だけを担当するrenderer。盤面状態の変更・保存・操作判定は行わない。
let trainingShapeCalloutTimer=null;
function showTrainingShapeCallout(){
  const position=TWO_MOVE_CANONICAL_POSITION.get(canonicalState(enc(ori)));
  const shape=position?TWO_MOVE_TIP3_SHAPES[position]:null;
  if(!shape)return;
  svg.querySelectorAll('.training-shape-callout').forEach(el=>el.remove());
  clearTimeout(trainingShapeCalloutTimer);
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
  trainingShapeCalloutTimer=setTimeout(()=>{
    g.classList.remove('show');
    setTimeout(()=>g.remove(),260);
  },1000);
}
export {};
