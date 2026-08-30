// ===== 盤面SVG構築・入門/学園ダイアログ・最短2手レッスン =====
function buildBoard(){
  svg.innerHTML='';
  const NS_='http://www.w3.org/2000/svg';
  tileEls=[];
  CELL.forEach((c,i)=>{
    const g=document.createElementNS(NS_,'g');
    g.setAttribute('class','tile');
    g.dataset.cell=i;
    g.innerHTML='<path class="hex" d="'+hexPath(R)+'"/>'
      +'<g class="daruma-shell"><use href="#daruma-body"/><g class="open"><use href="#face-open"/></g><g class="shut"><use href="#face-shut"/></g>'
      +'<g class="happy"><use href="#face-happy"/></g></g>';
    svg.appendChild(g); tileEls.push(g);
  });
  TRI.forEach((t,ti)=>{
    const g=document.createElementNS(NS_,'g');
    g.setAttribute('class','pivot');
    g.dataset.tri=ti;
    g.innerHTML='<circle class="dot" cx="'+t.x.toFixed(2)+'" cy="'+t.y.toFixed(2)+'" r="4.5"/>';
    svg.appendChild(g);
  });
  TRI.forEach((t,ti)=>{
    const angle=Math.atan2(t.y-CELL[3].y,t.x-CELL[3].x)*180/Math.PI;
    const q=angle*Math.PI/180,r=32;
    const x=t.x+r*Math.cos(q),y=t.y+r*Math.sin(q);
    const g=document.createElementNS(NS_,'g');
    g.setAttribute('class','grip-marker');
    g.dataset.tri=ti;
    g.setAttribute('transform','translate('+x.toFixed(2)+' '+y.toFixed(2)+') rotate('+angle.toFixed(2)+')');
    g.innerHTML='<rect x="-18" y="-4" width="36" height="8" rx="4"/>';
    svg.appendChild(g);
  });
  baseTiles=tileEls.slice();
}
let introTimer=0;
function buildIntroBoard(){
  const intro=$('introBoard'),NS_='http://www.w3.org/2000/svg';
  intro.innerHTML='';
  const start=dec(STAGES[0].state),tiles=[];
  CELL.forEach((c,i)=>{
    const g=document.createElementNS(NS_,'g');
    g.setAttribute('class','tile '+(start[i]?'fallen':'stand'));
    g.innerHTML='<path class="hex" d="'+hexPath(R)+'"/><use href="#daruma-body"/><g class="open"><use href="#face-open"/></g><g class="shut"><use href="#face-shut"/></g><g class="happy"><use href="#face-happy"/></g>';
    g.style.transform=tileTransform(c.x,c.y,start[i]);
    intro.appendChild(g);tiles[i]=g;
  });
  const grips=[];
  TRI.forEach(t=>{
    const angle=Math.atan2(t.y-CELL[3].y,t.x-CELL[3].x)*180/Math.PI,q=angle*Math.PI/180,r=32;
    const x=t.x+r*Math.cos(q),y=t.y+r*Math.sin(q),marker=document.createElementNS(NS_,'g');
    marker.setAttribute('class','grip-marker');
    marker.setAttribute('transform','translate('+x.toFixed(2)+' '+y.toFixed(2)+') rotate('+angle.toFixed(2)+')');
    marker.innerHTML='<rect x="-18" y="-4" width="36" height="8" rx="4"/>';
    intro.appendChild(marker);grips.push(marker);
  });
  const swipe=document.createElementNS(NS_,'circle');
  swipe.setAttribute('class','intro-swipe');
  swipe.setAttribute('cx',TRI[0].x);
  swipe.setAttribute('cy',TRI[0].y-40);
  swipe.setAttribute('r','6.5');
  intro.appendChild(swipe);
  grips.forEach(marker=>intro.appendChild(marker));
  // 回転をまとめる<g>は毎回作り直さず使い回す。ダイアログを開いた時点からwill-changeを
  // 効かせておき、実際に回転が始まるまでの1750msをレイヤー確保の猶予にする
  // (iOSで、生成直後の要素をtransformすると初回フレームだけ描画がずれることがある対策)。
  const rotationUnit=document.createElementNS(NS_,'g');
  rotationUnit.style.transformBox='view-box';rotationUnit.style.transformOrigin=TRI[0].x+'px '+TRI[0].y+'px';
  rotationUnit.style.willChange='transform';
  intro.appendChild(rotationUnit);
  const play=()=>{
    intro.classList.remove('welcome-cycle-fade');
    swipe.style.display='none';
    intro.appendChild(swipe);
    grips.forEach(marker=>{marker.style.display='';intro.appendChild(marker);});
    tiles.forEach((g,i)=>{
      g.classList.remove('guide-happy');
      g.setAttribute('class','tile '+(start[i]?'fallen':'stand'));
      g.style.transform=tileTransform(CELL[i].x,CELL[i].y,start[i]);
    });
    const c=TRI[0].cells,old=tiles.slice();
    const rotateDuration=2000;
    // 指の水色の点が触れた瞬間に、6本の棒を消す(どれを回すか、もう決まったことを伝える)。
    setTimeout(()=>{swipe.style.display='';grips.forEach(marker=>marker.style.display='none');},1050);
    setTimeout(()=>{
      // 本編と同じく、3体をひとつの塊として軸のまわりに回す。
      const unit=rotationUnit;
      for(let i=0;i<3;i++)unit.appendChild(old[c[(i+1)%3]]);
      unit.appendChild(swipe);
      // 使い回すunitは先に挿入済みのため、最前面に出すには回転開始のたびに一度前面へ出し直す。
      intro.appendChild(unit);
      unit.animate([{transform:'rotate(0deg)'},{transform:'rotate(-120deg)'}],
        {duration:rotateDuration,easing:'cubic-bezier(.33,0,.67,1)',fill:'forwards'});
      setTimeout(()=>{
        for(let i=0;i<3;i++){
          const from=c[(i+1)%3],to=c[i],el=old[from];
          el.style.transform=tileTransform(CELL[to].x,CELL[to].y,0);
          el.setAttribute('class','tile stand');tiles[to]=el;
          intro.appendChild(el);
        }
        // unitは使い回すので削除しない(中身だけ全部intro直下へ戻す)。
        swipe.setAttribute('cx',TRI[0].x);
        swipe.setAttribute('cy',TRI[0].y-40);
        intro.appendChild(swipe);
        tiles.forEach(el=>el.classList.add('guide-happy'));
        swipe.style.display='none';
        // 本編で全員起きた瞬間と同じ演出(タイルの揺れ+金色のバースト)を再現する。
        playWakeCelebrationEffect(intro,tiles);
      },rotateDuration);
    },1750);
    // 次のサイクルへ戻る直前だけ、盤面全体を短くフェードアウトして切替を見せる。
    setTimeout(()=>{intro.classList.add('welcome-cycle-fade');},1750+rotateDuration+820+400);
  };
  play();clearInterval(introTimer);introTimer=setInterval(play,5400);
}
function openIntroGuide(){
  buildIntroBoard();
  $('introDialog').hidden=false;
}
// 入門へ入る直前に、「残りくるり」が減ったところで指を離す感覚だけを見せる。
// 盤面は実際の最短2手問題を使い、最短1手になる一回転をそのまま再生する。
let academyWelcomeTimer=0,academyWelcomeRun=0;
function stopAcademyWelcomeBoard(){
  clearInterval(academyWelcomeTimer);
  academyWelcomeTimer=0;
  academyWelcomeRun++;
  $('academyWelcomeBoard')?.classList.remove('welcome-cycle-fade');
}
function buildAcademyWelcomeBoard(variant='enroll'){
  // 入学（1くるり）も基本クラス（2くるり）も、演出のスピード感は基本同じにする。
  // ただし基本クラスの初回ダイアログだけは、1.5倍速で見せる。
  const pace=variant==='basic'?5/1.5:5;
  const leadDelay=950,holdAfter=710;
  // 行き過ぎるまでの区間は長く見せる。戻り・収まりの区間は絶対時間を変えず素早いまま。
  const overshootBase=612,settleBase=240,snapBase=144;
  const rotateDur=Math.round((overshootBase+settleBase+snapBase)*pace);
  const overshootFrac=(overshootBase/(overshootBase+settleBase+snapBase)).toFixed(4);
  const settleFrac=((overshootBase+settleBase)/(overshootBase+settleBase+snapBase)).toFixed(4);
  stopAcademyWelcomeBoard();
  const board=$('academyWelcomeBoard'),NS_='http://www.w3.org/2000/svg';
  board.innerHTML='';
  // くるり数と盤面を、ひとつの案内カードとして見せる。
  const frame=document.createElementNS(NS_,'rect');
  frame.setAttribute('x','4');frame.setAttribute('y','-52');frame.setAttribute('width','312');frame.setAttribute('height','354');
  frame.setAttribute('rx','0');frame.setAttribute('fill','rgba(255,255,255,.025)');frame.setAttribute('stroke','rgba(159,176,196,.4)');frame.setAttribute('stroke-width','1');
  board.appendChild(frame);
  // 入学は最短1手（あと1くるり）、基本クラスは最短2手（あと2くるり）のデモ盤面を使う。
  const initialState=(variant==='basic'||variant==='development'?STAGES[BASIC_STAGE_START]:STAGES[0]).state,start=dec(initialState);
  const startDistance=SOLVER.dist[enc(start)];
  let move=null,after=null;
  for(let ti=0;ti<TRI.length&&!move;ti++)for(const dir of [1,-1]){
    const candidate=rollOnce(start,ti,dir);
    if(SOLVER.dist[enc(candidate)]===startDistance-1){move={ti,dir};after=candidate;break;}
  }
  if(!move)return;
  const tiles=[];
  CELL.forEach((c,i)=>{
    const g=document.createElementNS(NS_,'g');
    g.setAttribute('class','tile '+(start[i]?'fallen':'stand'));
    g.innerHTML='<path class="hex" d="'+hexPath(R)+'"/><use href="#daruma-body"/><g class="open"><use href="#face-open"/></g><g class="shut"><use href="#face-shut"/></g><g class="happy"><use href="#face-happy"/></g>';
    g.style.transform=tileTransform(c.x,c.y,start[i]);
    board.appendChild(g);tiles[i]=g;
  });
  const baseWelcomeTiles=tiles.slice();
  const t=TRI[move.ti],angle=Math.atan2(t.y-CELL[3].y,t.x-CELL[3].x)*180/Math.PI,q=angle*Math.PI/180,r=32;
  const gripX=t.x+r*Math.cos(q),gripY=t.y+r*Math.sin(q);
  const marker=document.createElementNS(NS_,'g');
  marker.setAttribute('class','grip-marker tutorial-target');
  marker.setAttribute('transform','translate('+gripX.toFixed(2)+' '+gripY.toFixed(2)+') rotate('+angle.toFixed(2)+')');
  marker.innerHTML='<rect x="-18" y="-4" width="36" height="8" rx="4"/>';
  board.appendChild(marker);
  const touch=document.createElementNS(NS_,'circle');
  touch.setAttribute('class','intro-swipe');touch.setAttribute('r','6.5');
  touch.setAttribute('cx',gripX);touch.setAttribute('cy',gripY);board.appendChild(touch);
  // 回転をまとめる<g>は毎回作り直さず使い回す。ダイアログを開いた時点からwill-changeを
  // 効かせておき、実際に回転が始まるまでの950ms(leadDelay)をレイヤー確保の猶予にする
  // (iOSで、生成直後の要素をtransformすると初回フレームだけ描画がずれることがある対策)。
  const rotationUnit=document.createElementNS(NS_,'g');
  rotationUnit.style.transformBox='view-box';rotationUnit.style.transformOrigin=t.x+'px '+t.y+'px';
  rotationUnit.style.willChange='transform';
  board.appendChild(rotationUnit);
  const counterLabel=document.createElementNS(NS_,'text');
  // 盤面の上に専用の余白を取り、本編と同じ「あと / 大きな数字 / くるり」の見え方にする。
  counterLabel.setAttribute('x','34');counterLabel.setAttribute('y','4');counterLabel.setAttribute('fill','#9BCBDD');counterLabel.setAttribute('font-size','11');counterLabel.setAttribute('font-weight','700');
  counterLabel.textContent=tr('shortestDisplay');board.appendChild(counterLabel);
  const counterNumber=document.createElementNS(NS_,'text');
  counterNumber.setAttribute('x','76');counterNumber.setAttribute('y','6');counterNumber.setAttribute('fill','#62B8D2');counterNumber.setAttribute('font-size','48');counterNumber.setAttribute('font-weight','750');counterNumber.setAttribute('text-anchor','middle');
  board.appendChild(counterNumber);
  const counterUnit=document.createElementNS(NS_,'text');
  counterUnit.setAttribute('x','96');counterUnit.setAttribute('y','4');counterUnit.setAttribute('fill','#9BCBDD');counterUnit.setAttribute('font-size','11');counterUnit.setAttribute('font-weight','700');
  counterUnit.textContent=tr('moveUnit');board.appendChild(counterUnit);
  const release=document.createElementNS(NS_,'text');
  release.setAttribute('x','160');release.setAttribute('y','5');release.setAttribute('text-anchor','middle');
  release.setAttribute('fill','#62B8D2');release.setAttribute('font-size','12');release.setAttribute('font-weight','700');
  board.appendChild(release);
  const play=()=>{
    const token=++academyWelcomeRun;
    const alive=()=>token===academyWelcomeRun&&!$('chainDialog').hidden;
    board.classList.remove('welcome-cycle-fade');
    counterLabel.textContent=tr('shortestDisplay');counterNumber.textContent=String(startDistance);counterUnit.textContent=tr('moveUnit');
    release.textContent='';touch.style.display='';marker.style.display='';
    const cycleTiles=baseWelcomeTiles.slice();
    cycleTiles.forEach((tile,i)=>{
      tile.setAttribute('class','tile '+(start[i]?'fallen':'stand'));
      tile.style.transform=tileTransform(CELL[i].x,CELL[i].y,start[i]);
      board.appendChild(tile);
    });
    board.appendChild(marker);board.appendChild(touch);board.appendChild(counterLabel);board.appendChild(counterNumber);board.appendChild(counterUnit);board.appendChild(release);
    setTimeout(()=>{
      if(!alive())return;
      marker.style.display='none';
      // 水色の持ち手をつかんだ瞬間、回る3枚を本編と同じ見え方で強調する。
      t.cells.forEach(index=>cycleTiles[index].classList.add('welcome-selected'));
      const unit=rotationUnit;
      // 指で少し行き過ぎてから離し、次の120°位置へぴたりと収まる感覚を再現する。
      const overshootAmount=8;
      const turn=move.dir>0?120:-120,overshoot=move.dir>0?120+overshootAmount:-(120+overshootAmount),undershoot=move.dir>0?114:-114;
      // SMILのanimateTransform+beginElement()は、iOS Safariで挿入直後に最終フレームが
      // 一瞬先に描かれてから巻き戻る不具合が出たため、Web Animations API(他の演出でも
      // 使っている書き方)に統一する。
      for(const index of t.cells)unit.appendChild(cycleTiles[index]);
      unit.appendChild(touch);
      // 使い回すunitは先に挿入済みのため、最前面に出すには回転開始のたびに一度前面へ出し直す。
      board.appendChild(unit);
      unit.animate([
        {transform:'rotate(0deg)',offset:0},
        {transform:'rotate('+overshoot+'deg)',offset:Number(overshootFrac)},
        {transform:'rotate('+undershoot+'deg)',offset:Number(settleFrac)},
        {transform:'rotate('+turn+'deg)',offset:1}
      ],{duration:rotateDur,easing:'cubic-bezier(.33,0,.67,1)',fill:'forwards'});
      // 本編のpreviewWakeと同じ非対称なしきい値で、だるまの起き伏せ（パネル色）を切り替える。
      // 寝る（起立→伏せ）のは22°動いた時点、起きる（伏せ→起立）のは120°中98°まで進んでから、と判定が厳しい。
      // rollOnce は位置ごとの値ではなく「隣の位置から回ってくる値」を返すため、
      // 今回転している当のタイルの次の状態は、自分の元の値を1手分進めた値で計算する。
      const overshootAngle=120+overshootAmount,overshootDuration=overshootBase*pace;
      const wakeDelay=Math.round(overshootDuration*(98/overshootAngle));
      let wakeHappens=false;
      for(const index of t.cells){
        const nextValue=(start[index]+(move.dir>0?1:2))%3;
        const wasStand=start[index]===0,willStand=nextValue===0;
        if(wasStand===willStand)continue;
        const thresholdDeg=willStand?98:22;
        if(willStand)wakeHappens=true;
        const delay=Math.round(overshootDuration*(thresholdDeg/overshootAngle));
        setTimeout(()=>{
          if(!alive())return;
          cycleTiles[index].setAttribute('class','tile '+(willStand?'stand':'fallen')+' welcome-selected');
        },delay);
      }
      // 「あと○くるり」の数字も、起きる判定と同じタイミングで切り替える。
      setTimeout(()=>{
        if(!alive())return;
        counterNumber.textContent=String(startDistance-1);
        counterNumber.classList.remove('welcome-counter-pulse');
        void counterNumber.getBoundingClientRect();
        counterNumber.classList.add('welcome-counter-pulse');
      },wakeHappens?wakeDelay:Math.round(overshootDuration*(22/overshootAngle)));
      setTimeout(()=>{
        if(!alive())return;
        // unitは使い回すので削除しない(中身だけ全部board直下へ戻す)。
        // 回転後は全7枚を描き直す。中心の1枚を含めて必ず残るよう、移動中のDOM順に依存しない。
        baseWelcomeTiles.forEach((tile,i)=>{
          tile.setAttribute('class','tile '+(after[i]?'fallen':'stand'));
          tile.style.transform=tileTransform(CELL[i].x,CELL[i].y,after[i]);
          board.appendChild(tile);
        });
        release.textContent='';
        touch.style.display='none';
      },rotateDur);
    },leadDelay);
    // 次の「あと 2 くるり」へ戻る直前だけ、案内全体を短く消して切替を見せる。
    setTimeout(()=>{if(alive())board.classList.add('welcome-cycle-fade');},leadDelay+rotateDur+holdAfter);
  };
  play();
  academyWelcomeTimer=setInterval(play,leadDelay+rotateDur+holdAfter+240);
}
function academyEnrollArtSvg(){
  const sakura=(x,y,scale=1)=>{
    let petals='';
    for(let i=0;i<5;i++)petals+='<ellipse cx="0" cy="-3.6" rx="2.6" ry="4.2" fill="#F4BFD1" stroke="#E191AC" stroke-width=".4" transform="rotate('+i*72+')"/>';
    return '<g transform="translate('+x+' '+y+') scale('+scale+')">'+petals+'<circle r="1.4" fill="#F6D77C"/></g>';
  };
  const petal=(x,y,rot,scale=1)=>'<ellipse cx="'+x+'" cy="'+y+'" rx="'+(2.6*scale)+'" ry="'+(4.6*scale)+'" fill="#F4BFD1" transform="rotate('+rot+' '+x+' '+y+')"/>';
  const spark=(x,y,s=5)=>'<rect x="'+(-s/2)+'" y="'+(-s/2)+'" width="'+s+'" height="'+s+'" fill="#C9A54E" transform="translate('+x+' '+y+') rotate(45)"/>';
  const school='<g transform="translate(168 48) scale(1.05)">'
    +'<path d="M-60 40L0 0L60 40Z" fill="#C8524A" stroke="#7A2E28" stroke-width="2"/>'
    +'<circle cx="0" cy="21" r="10.5" fill="#FBF3E4" stroke="#3A2A22" stroke-width="1.6"/>'
    +'<path d="M0 21L0 14M0 21L6 24" stroke="#3A2A22" stroke-width="1.4" stroke-linecap="round"/>'
    +'<rect x="-52" y="40" width="104" height="70" fill="#8B5E3C" stroke="#5C3D25" stroke-width="1.8"/>'
    +'<path d="M-52 58H52M-52 76H52M-52 94H52" stroke="#5C3D25" stroke-width="1" opacity=".3"/>'
    +'<rect x="-38" y="52" width="16" height="16" fill="#3E7FBF" stroke="#F1E4C8" stroke-width="2"/>'
    +'<rect x="-8" y="52" width="16" height="16" fill="#3E7FBF" stroke="#F1E4C8" stroke-width="2"/>'
    +'<rect x="22" y="52" width="16" height="16" fill="#3E7FBF" stroke="#F1E4C8" stroke-width="2"/>'
    +'<rect x="-38" y="82" width="16" height="16" fill="#3E7FBF" stroke="#F1E4C8" stroke-width="2"/>'
    +'<rect x="22" y="82" width="16" height="16" fill="#3E7FBF" stroke="#F1E4C8" stroke-width="2"/>'
    +'<path d="M-20 84L0 62L20 84Z" fill="#DCE3E6" stroke="#C8524A" stroke-width="4"/>'
    +'<rect x="-13" y="84" width="26" height="26" fill="#201914" stroke="#5C3D25" stroke-width="1.6"/>'
    +'<path d="M13 84L13 110" stroke="#DCE3E6" stroke-width="3" stroke-linecap="round"/>'
    +'</g>';
  return '<svg viewBox="0 0 204 236" aria-hidden="true">'
    +school
    +'<path d="M2 2C14 10 22 20 26 34" fill="none" stroke="#6B4630" stroke-width="2.2" stroke-linecap="round"/>'
    +'<path d="M10 9C14 7 18 8 20 11" fill="none" stroke="#6B4630" stroke-width="1.5" stroke-linecap="round"/>'
    +sakura(8,6,1)+sakura(19,16,.85)+sakura(24,29,.7)
    +'<path d="M202 2C190 10 182 20 178 34" fill="none" stroke="#6B4630" stroke-width="2.2" stroke-linecap="round"/>'
    +'<path d="M194 9C190 7 186 8 184 11" fill="none" stroke="#6B4630" stroke-width="1.5" stroke-linecap="round"/>'
    +sakura(196,6,1)+sakura(185,16,.85)+sakura(180,29,.7)
    +'<path d="M28 24Q102 4 176 24L176 46Q102 26 28 46Z" fill="#FBF3E4" stroke="#B23B2E" stroke-width="2.4"/>'
    +'<path d="M28 24L14 30L28 46Z" fill="#B23B2E"/><path d="M176 24L190 30L176 46Z" fill="#B23B2E"/>'
    +'<text x="102" y="32" text-anchor="middle" fill="#B23B2E" font-family="serif" font-size="17" font-weight="800" letter-spacing=".15em">祝　入学</text>'
    +petal(50,66,25)+petal(154,60,-40,.9)+petal(172,98,60,.85)+petal(32,102,-15,.85)
    +spark(20,54)+spark(186,64,4.2)
    +'<g transform="translate(102 152) scale(2.05)"><use href="#daruma-body"/><use href="#face-happy"/></g>'
    +'<g transform="translate(61 172) scale(.9)">'
      +'<ellipse cx="0" cy="-7" rx="4.2" ry="7" fill="#FBF3E4" stroke="#B23B2E" stroke-width="1" transform="rotate(0)"/>'
      +'<ellipse cx="0" cy="-7" rx="4.2" ry="7" fill="#FBF3E4" stroke="#B23B2E" stroke-width="1" transform="rotate(60)"/>'
      +'<ellipse cx="0" cy="-7" rx="4.2" ry="7" fill="#FBF3E4" stroke="#B23B2E" stroke-width="1" transform="rotate(120)"/>'
      +'<ellipse cx="0" cy="-7" rx="4.2" ry="7" fill="#FBF3E4" stroke="#B23B2E" stroke-width="1" transform="rotate(180)"/>'
      +'<ellipse cx="0" cy="-7" rx="4.2" ry="7" fill="#FBF3E4" stroke="#B23B2E" stroke-width="1" transform="rotate(240)"/>'
      +'<ellipse cx="0" cy="-7" rx="4.2" ry="7" fill="#FBF3E4" stroke="#B23B2E" stroke-width="1" transform="rotate(300)"/>'
      +'<path d="M3 6L11 24L4 21Z" fill="#B23B2E"/><path d="M-2 7L1 25L-5 22Z" fill="#B23B2E"/>'
      +'<circle r="3.2" fill="#C9A54E" stroke="#B23B2E" stroke-width=".8"/>'
    +'</g>'
  +'</svg>';
}
// ===== 案内ダイアログ連鎖(だるま学園/だるま修行の節目) =====
// 1つの共有ダイアログ枠(#chainDialog)を、CHAIN_STEPSに登録した「ステップ」で使い回す。
// 新しい案内ダイアログを増やすときは、ここにエントリを1つ足すだけでよい
// (HTML・hideGameDialogs()・ボタンハンドラは一切さわらない)。
function shapeGridRenderer(states,shapeNames,nameKey,labelKey){
  return body=>{
    body.innerHTML='<div class="training-departure-goal-frame">'
      +(labelKey?'<p class="chain-label">'+tr(labelKey)+'</p>':'')
      +'<div class="training-departure-goal-boards">'
      +states.map((state,i)=>'<div class="training-departure-goal-card">'+miniBoardSvg(state,{outline:true})+'<p>'+tr(nameKey(shapeNames[i]))+'</p></div>').join('')
      +'</div></div>';
  };
}
function academyBoardStep(variant,titleKey,textKey,actionKey,onAction){
  return {
    titleKey,actionKey,
    render(body){
      body.innerHTML='<p class="chain-text-highlight" id="chainDialogText"></p><div class="academy-welcome-board-wrap"><svg id="academyWelcomeBoard" viewBox="0 -60 320 370" aria-hidden="true"></svg></div>';
      $('chainDialogText').textContent=tr(textKey);
      buildAcademyWelcomeBoard(variant);
      return stopAcademyWelcomeBoard;
    },
    onAction
  };
}
const TRAINING_WELCOME_ART_SVG=`<svg id="trainingWelcomeArt" viewBox="0 0 320 220" aria-hidden="true">
  <defs>
    <linearGradient id="twSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#16283C"/>
      <stop offset=".58" stop-color="#3E4F63"/>
      <stop offset="1" stop-color="#C98A57"/>
    </linearGradient>
    <radialGradient id="twSun" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#FCE7B0"/>
      <stop offset=".55" stop-color="#F2C063" stop-opacity=".8"/>
      <stop offset="1" stop-color="#E0985A" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="0" y="0" width="320" height="220" fill="url(#twSky)"/>
  <circle cx="238" cy="122" r="48" fill="url(#twSun)"/>
  <circle cx="238" cy="122" r="21" fill="#F6D68A"/>
  <path d="M0,158 L35,116 L70,146 L108,103 L150,150 L195,113 L235,148 L280,108 L320,153 L320,220 L0,220 Z" fill="#4C6478" opacity=".5"/>
  <path d="M-10,168 L40,110 L85,158 L135,95 L190,163 L245,113 L300,158 L330,166 L330,220 L-10,220 Z" fill="#233549"/>
  <path d="M0,178 Q160,152 320,180 L320,220 L0,220 Z" fill="#332821"/>
  <path d="M160,220 C150,196 182,182 168,160 C158,148 172,140 165,128" fill="none" stroke="#C9A54E" stroke-width="6" stroke-linecap="round" stroke-dasharray="1.5 11" opacity=".55"/>
  <path d="M54,58 q6,-8 12,0 q6,-8 12,0" fill="none" stroke="#8FB9CC" stroke-width="2" stroke-linecap="round" opacity=".8"/>
  <path d="M96,76 q5,-7 10,0 q5,-7 10,0" fill="none" stroke="#8FB9CC" stroke-width="1.8" stroke-linecap="round" opacity=".7"/>
  <ellipse cx="163" cy="200" rx="32" ry="6" fill="#000" opacity=".26"/>
  <line x1="193" y1="196" x2="206" y2="100" stroke="#8A6A3C" stroke-width="4" stroke-linecap="round"/>
  <path d="M197,104 Q189,89 204,85 Q217,89 210,102 Q203,109 197,104Z" fill="#62B8D2" stroke="#1B2A3A" stroke-width="2"/>
  <g transform="translate(163,160) scale(1.05)">
    <use href="#daruma-body"/>
    <use href="#face-happy"/>
    <path d="M-30,-36 Q0,-64 30,-36 Q0,-46 -30,-36 Z" fill="#D9B67A" stroke="#241D1A" stroke-width="2.2"/>
    <ellipse cx="0" cy="-36" rx="32" ry="6.5" fill="#E4C88F" stroke="#241D1A" stroke-width="2.2"/>
  </g>
</svg>`;
const CHAIN_STEPS={
  academyEnroll:{
    titleKey:'academyEnrollTitle', actionKey:'trainingWelcomeNext',
    render(body){
      body.innerHTML='<div class="clear-tip-illustration academy-welcome-art" id="academyEnrollArt"></div>';
      $('academyEnrollArt').innerHTML=academyEnrollArtSvg();
    },
    onAction(){openChainedDialog('academyWelcome');}
  },
  academyWelcome:academyBoardStep('enroll','academyWelcomeTitle','academyWelcomeText','academyWelcomeStart',()=>{}),
  basicWelcome:academyBoardStep('basic','basicWelcomeTitle','basicWelcomeText','basicWelcomeStart',()=>loadStage(stageIndex+1)),
  developmentWelcome:{
    titleKey:'developmentWelcomeTitle', actionKey:'developmentWelcomeStart',
    render(body){
      body.innerHTML='<p class="chain-text-left" id="developmentWelcomeSpinHint"></p>'
        +'<div class="development-welcome-frame">'
        +'<div class="status-metric remaining training-spin-counter" id="developmentWelcomeSpinCounter"><span id="developmentWelcomeSpinCounterLabel"></span><b id="developmentWelcomeSpinCounterNumber"></b><span id="developmentWelcomeSpinCounterUnit"></span></div>'
        +'<div class="two-move-detail-board-area"><div class="two-move-detail-board" id="developmentWelcomeSpinBoardWrap"><svg id="developmentWelcomeSpinBoard" viewBox="14 0 293 310" aria-hidden="true"></svg></div></div>'
        +'</div>'
        +'<p class="chain-text-left" id="chainDialogText"></p>';
      $('developmentWelcomeSpinCounterLabel').textContent=tr('shortestDisplay');
      $('developmentWelcomeSpinCounterUnit').textContent=tr('moveUnit');
      $('chainDialogText').textContent=tr('developmentWelcomeText');
      $('developmentWelcomeSpinHint').textContent=tr('developmentWelcomeSpinHint');
      // 修行・中巻開始と同じ「240°まで行き過ぎてから120°へ戻る」スピンを、発展クラスの最初でも見せる。
      buildTrainingMiddleSpinBoard('developmentWelcomeSpinBoard','developmentWelcomeSpinCounter',DEVELOPMENT_THREE_STAGES[0].state);
      return ()=>stopClearGuideBoard('developmentWelcomeSpinBoard');
    },
    onAction(){loadStage(stageIndex+1);}
  },
  developmentFourStart:{
    titleKey:'developmentFourStartTitle', actionKey:'developmentFourStartStart',
    render(body){
      body.innerHTML='<p class="chain-text-left" id="chainDialogText"></p>';
      $('chainDialogText').textContent=tr('developmentFourStartText');
    },
    onAction(){loadStage(stageIndex+1);}
  },
  trainingWelcome:{
    wide:true, titleKey:'trainingWelcomeTitle', actionKey:'trainingWelcomeStart',
    render(body){
      body.innerHTML='<div class="training-welcome-art-wrap">'+TRAINING_WELCOME_ART_SVG+'</div><p class="chain-text-left" id="chainDialogText"></p>';
      $('chainDialogText').textContent=tr('trainingWelcomeText');
    },
    onAction(){openChainedDialog('trainingUpperGoal');}
  },
  trainingUpperGoal:{
    kindKey:'trainingUpperGoalKind', titleKey:'trainingUpperGoalTitle', actionKey:'trainingUpperGoalStart',
    render:shapeGridRenderer(TRAINING_UPPER_GOAL_STATES,TRAINING_UPPER_GOAL_SHAPES,s=>'twoMoveTip3'+s+'Name'),
    onAction(){loadStage(TRAINING_STAGE_START);}
  },
  trainingMiddleSpin:{
    kindKey:'trainingMiddleGoalKind', titleKey:'trainingMiddleSpinTitle', actionKey:'trainingWelcomeNext',
    render(body){
      body.innerHTML='<div class="status-metric remaining training-spin-counter" id="trainingMiddleSpinCounter"><span id="trainingMiddleSpinCounterLabel"></span><b id="trainingMiddleSpinCounterNumber"></b><span id="trainingMiddleSpinCounterUnit"></span></div>'
        +'<div class="two-move-detail-board-area"><div class="two-move-detail-board" id="trainingMiddleSpinBoardWrap"><svg id="trainingMiddleSpinBoard" viewBox="14 0 293 310" aria-hidden="true"></svg></div></div>';
      $('trainingMiddleSpinCounterLabel').textContent=tr('shortestDisplay');
      $('trainingMiddleSpinCounterUnit').textContent=tr('moveUnit');
      buildTrainingMiddleSpinBoard('trainingMiddleSpinBoard','trainingMiddleSpinCounter');
      return ()=>stopClearGuideBoard('trainingMiddleSpinBoard');
    },
    onAction(){openChainedDialog('trainingMiddleGoal');}
  },
  trainingMiddleGoal:{
    kindKey:'trainingMiddleGoalKind', titleKey:'trainingMiddleGoalTitle', actionKey:'trainingMiddleGoalStart',
    render:shapeGridRenderer(TRAINING_MIDDLE_GOAL_STATES,TRAINING_MIDDLE_GOAL_SHAPES,s=>'shapeName'+s),
    onAction(){loadStage(TRAINING_STAGE_START+TRAINING_UPPER_COUNT);}
  },
  trainingLowerGoal:{
    kindKey:'trainingLowerGoalKind', titleKey:'trainingLowerGoalTitle', actionKey:'trainingLowerGoalStart',
    render:shapeGridRenderer(TRAINING_LOWER_GOAL_STATES,TRAINING_LOWER_GOAL_SHAPES,s=>'shapeName'+s),
    onAction(){loadStage(TRAINING_STAGE_START+TRAINING_UPPER_COUNT+TRAINING_MIDDLE_COUNT);}
  },
};
let chainCleanup=null, chainActiveStep=null, chainActiveName=null;
function openChainedDialog(name){
  const step=CHAIN_STEPS[name];
  if(!step){showMasterDialog(name);return;}
  if(chainCleanup){chainCleanup();chainCleanup=null;}
  chainActiveStep=step;chainActiveName=name;
  $('chainDialogKind').hidden=!step.kindKey;
  if(step.kindKey)$('chainDialogKind').textContent=tr(step.kindKey);
  $('chainDialogTitle').textContent=tr(step.titleKey);
  $('chainDialogTitle').className=step.titleClass||'';
  $('chainDialogAction').textContent=tr(step.actionKey);
  $('chainDialogCard').classList.toggle('chain-wide',!!step.wide);
  $('chainDialogBody').innerHTML='';
  chainCleanup=step.render($('chainDialogBody'))||null;
  $('chainDialog').hidden=false;
}
function closeChainDialog(){
  if(chainCleanup){chainCleanup();chainCleanup=null;}
  $('chainDialog').hidden=true;
  chainActiveStep=null;chainActiveName=null;
}
const clearGuideTimers=new Map();
const clearGuideRuns=new Map();
// 呼び出しのたびに世代を進めることで、前の呼び出しが仕込んだsetTimeout群が
// 後から発火しても盤面をいじらないようにする(パターン送りで前のアニメが混ざる不具合の対策)。
function stopClearGuideBoard(id){
  clearInterval(clearGuideTimers.get(id));
  clearGuideTimers.delete(id);
  clearGuideRuns.set(id,(clearGuideRuns.get(id)||0)+1);
}
// 上巻開始: 1本の棒を連続で(途切れず)回し続け、「あと3くるり」⇄「あと2くるり」が
// 実際のドラッグ中と同じ表情切り替え(previewWake)で移り変わり、正解の位置でなめらかに確定するループ。
function buildTrainingMiddleSpinBoard(boardId,counterId,startState=TRAINING_MIDDLE_GOAL_STATES[0]){
  stopClearGuideBoard(boardId);
  const guide=$(boardId),NS_='http://www.w3.org/2000/svg';
  if(!guide)return;
  const run=clearGuideRuns.get(boardId);
  const isCurrent=()=>run===clearGuideRuns.get(boardId);
  const startBoard=dec(startState);
  // 同じ棒を1手ぶん(120°)回すと「あと2くるり」、さらに1手(240°)で「あと3くるり」に戻る組を探す。
  // 258°まで回り込むため、盤面上部で回すと案内文と干渉しやすい。候補の中から
  // 回転の軸(t.y)が最も下にあるものを選び、上部と重ならないようにする。
  const candidates=[];
  for(let ti=0;ti<TRI.length;ti++)for(const dir of[1,-1]){
    const s1=rollOnce(startBoard,ti,dir);
    if(SOLVER.dist[enc(s1)]===2&&SOLVER.dist[enc(rollOnce(s1,ti,dir))]===3)candidates.push({ti,dir});
  }
  if(!candidates.length)return;
  const target=candidates.reduce((best,c)=>TRI[c.ti].y>TRI[best.ti].y?c:best,candidates[0]);
  const{ti,dir}=target,t=TRI[ti],cells=t.cells;
  const cycleStates=[startState,0,0];
  cycleStates[1]=enc(rollOnce(dec(cycleStates[0]),ti,dir));
  cycleStates[2]=enc(rollOnce(dec(cycleStates[1]),ti,dir));
  guide.innerHTML='';
  const tiles=[];
  CELL.forEach((c,i)=>{
    const g=document.createElementNS(NS_,'g');
    g.setAttribute('class','tile '+(startBoard[i]?'fallen':'stand'));
    g.innerHTML='<path class="hex" d="'+hexPath(R)+'"/><use href="#daruma-body"/><g class="open"><use href="#face-open"/></g><g class="shut"><use href="#face-shut"/></g><g class="happy"><use href="#face-happy"/></g>';
    g.style.transform=tileTransform(c.x,c.y,startBoard[i]);
    guide.appendChild(g);tiles[i]=g;
  });
  // 学園のクラス開始ダイアログ(buildAcademyWelcomeBoard)と同じく、回っている3枚を枠で強調し、つかんでいる指の点も表示する。
  cells.forEach(c=>tiles[c].classList.add('welcome-selected'));
  const spinItems=cells.map(c=>({el:tiles[c],turn:startBoard[c]}));
  const group=document.createElementNS(NS_,'g');
  spinItems.forEach(item=>group.appendChild(item.el));
  const grip=gripPoint(t);
  const touch=document.createElementNS(NS_,'circle');
  touch.setAttribute('class','intro-swipe');touch.setAttribute('r','6.5');
  touch.setAttribute('cx',grip.x);touch.setAttribute('cy',grip.y);
  group.appendChild(touch);
  guide.appendChild(group);
  const numberEl=$(counterId+'Number');
  let lastShown=null;
  const setCounter=found=>{
    if(!numberEl)return;
    const value=found?'2':'3';
    if(value===lastShown)return;
    lastShown=value;
    numberEl.textContent=value;
    numberEl.classList.remove('distance-pulse');
    void numberEl.getBoundingClientRect();
    numberEl.classList.add('distance-pulse');
  };
  // 120°で「あと2くるり」を通過し、240°より少し先(258°)まで回してから「あと3くるり」→
  // そこからは止まらずゆっくり折り返し、最後は学園のクラス開始ダイアログの着地演出と同じように
  // 小さく行き過ぎてから(114°)、120°(あと2くるり)へすっと収まる。
  const waypoints=[0,258,114,120],durations=[1800,2100,500];
  // 指でなぞっている想定なので、途中で急加速・急減速しない緩やかなイージングにする。
  const easeInOut=p=>-(Math.cos(Math.PI*p)-1)/2;
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const spinOnce=()=>new Promise(resolve=>{
    let segIndex=0,phaseStart=null;
    const frame=now=>{
      if(!isCurrent()||!guide.isConnected)return;
      if(phaseStart===null)phaseStart=now;
      const from=waypoints[segIndex],to=waypoints[segIndex+1],dur=durations[segIndex];
      const progress=Math.min(1,(now-phaseStart)/dur);
      const deg=dir*(from+(to-from)*easeInOut(progress));
      let done=false;
      if(progress>=1){
        if(segIndex<durations.length-1){segIndex++;phaseStart=now;}
        else done=true;
      }
      group.setAttribute('transform','rotate('+deg+' '+t.x+' '+t.y+')');
      spinItems.forEach(item=>{previewWake(item,deg);item.el.classList.add('welcome-selected');});
      const applications=visualTurns(deg)*dir,idx=((applications%3)+3)%3;
      setCounter(SOLVER.dist[cycleStates[idx]]===2);
      if(done){resolve();return;}
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  const resetTiles=()=>{
    group.removeAttribute('transform');
    CELL.forEach((c,i)=>{
      tiles[i].setAttribute('class','tile '+(startBoard[i]?'fallen':'stand'));
      tiles[i].style.transform=tileTransform(c.x,c.y,startBoard[i]);
    });
    cells.forEach(c=>tiles[c].classList.add('welcome-selected'));
  };
  const play=async()=>{
    if(!isCurrent()||!guide.isConnected)return;
    resetTiles();setCounter(false);
    // 他の案内デモと同じく、周回の切り替わりをフェードイン/アウトで見せる。
    guide.classList.remove('welcome-cycle-fade');
    await wait(500);
    if(!isCurrent()||!guide.isConnected)return;
    // 回転する3枚のgroupを毎周、必ず最後の子要素に付け直す。iOS Safariでは早い段階で
    // 挿入した要素がその後追加された兄弟より背面に描画されることがあるための対策。
    guide.appendChild(group);
    await spinOnce();
    if(!isCurrent()||!guide.isConnected)return;
    await wait(1500);
    if(!isCurrent()||!guide.isConnected)return;
    guide.classList.add('welcome-cycle-fade');
    await wait(220);
    if(isCurrent()&&guide.isConnected)play();
  };
  play();
}
function currentTwoMoveLessonVariant(){
  // リロード直後でも、復元済みの画面案内と同じ解説を開く。
  if(isMode('stage')&&stageIndex>=TRAINING_STAGE_START&&stageIndex<TRAINING_STAGE_START+TRAINING_UPPER_COUNT)
    return stageIndex-TRAINING_STAGE_START<5?'joinOne':'joinTwo';
  return mainBoardGuidance()==='basicGuideJoinTwo'?'joinTwo':'joinOne';
}
function lessonVariantFromArt(art){
  return art==='twoMoveLessonTwo'?'joinTwo':art==='twoMoveLesson'?'joinOne':null;
}
function renderTwoMoveLessonRule(id){
  const root=$(id);
  if(!root)return;
  root.replaceChildren();
  const line=document.createElement('p');
  appendMoveCountEmphasis(line,tr('twoMoveLessonRule'));
  root.appendChild(line);
  root.hidden=false;
}
function renderTwoMoveLessonCopy(id,variant='joinOne'){
  const root=$(id);
  if(!root)return;
  root.replaceChildren();
  const lines=[variant==='joinTwo'?'twoMoveLessonSecond':'twoMoveLessonPractice'];
  lines.forEach(key=>{
    const line=document.createElement('p');
    appendMoveCountEmphasis(line,tr(key));
    root.appendChild(line);
  });
  root.hidden=false;
}
const TWO_MOVE_TIP3_SHAPES={1:'Trapezoid',3:'Trapezoid',5:'Ribbon',2:'Caterpillar',4:'Caterpillar',6:'Diamond',7:'Diamond',8:'OuterNeighbor',9:'CenterOuter'};
// コツ3の文言は型ごとに長さが違うため、一行表示を保てる最小限の字間だけを個別に詰める。
const TWO_MOVE_TIP3_LETTER_SPACING={Trapezoid:'-0.06em',Ribbon:'-0.06em',Caterpillar:'0',Diamond:'0',OuterNeighbor:'0',CenterOuter:'0'};
const isTwoMoveLessonStage=()=>isMode('stage')&&((stageIndex>=BASIC_STAGE_START&&stageIndex<BASIC_STAGE_START+BASIC_STAGE_COUNT)
  ||(stageIndex>=TRAINING_STAGE_START&&stageIndex<TRAINING_STAGE_START+TRAINING_UPPER_COUNT));
// 盤面の向きに関係なく型を判定できるよう、9パターンの正規化済み状態から出題順(1〜9)を逆引きする。
const TWO_MOVE_CANONICAL_POSITION=new Map(TWO_MOVE_STAGES.map((stage,patternIndex)=>[canonicalState(stage.state),BASIC_LESSON_PATTERN_ORDER.indexOf(patternIndex)+1]));
const isTwoMoveLessonSpeedStage=()=>isMode('speed')&&speedVariant==='training9';
function currentTwoMoveLessonContext(){
  if(isTwoMoveLessonStage()){
    const base=stageIndex<BASIC_STAGE_START+BASIC_STAGE_COUNT?BASIC_STAGE_START:TRAINING_STAGE_START;
    // 型の名前は、基本編の出題順（問題1〜9）で対応させる。TWO_MOVE_PATTERN_ORDER の「覚えやすい順」とは別物。
    const position=stageIndex-base+1;
    // 出題そのものの型は見せるが、盤面をそのまま答えにしないよう180°回した見え方にする。
    return {state:transformStateBySymmetry(campaignStageState(STAGES[stageIndex].state),SECOND_LAP_BOARD_VIEW),position,group:position<=5?'joinOne':'joinTwo'};
  }
  if(isTwoMoveLessonSpeedStage()){
    const liveState=enc(ori);
    const position=TWO_MOVE_CANONICAL_POSITION.get(canonicalState(liveState))||1;
    return {state:transformStateBySymmetry(liveState,SECOND_LAP_BOARD_VIEW),position,group:position<=5?'joinOne':'joinTwo'};
  }
  const group=currentTwoMoveLessonVariant();
  return {state:null,position:group==='joinTwo'?6:1,group};
}
let twoMoveLessonTipIndex=0,twoMoveLessonContext=null;
function renderTwoMoveLessonShape(){
  const shape=TWO_MOVE_TIP3_SHAPES[twoMoveLessonContext.position];
  const name=tr('twoMoveTip3'+shape+'Name');
  $('twoMoveLessonTitle').textContent=tr('twoMoveLessonTipTitle',{name});
  const root=$('twoMoveLessonShape');
  root.replaceChildren();
  const line=document.createElement('p');
  line.innerHTML=tr('twoMoveTip3DescTemplate',{name:'<strong>'+name+'</strong>',text:tr('twoMoveTip3'+shape+'Text')});
  root.append(line);
  root.hidden=false;
}
function renderTwoMoveLessonTip(){
  const root=$('twoMoveLessonText');
  root.replaceChildren();
  const context=twoMoveLessonContext;
  for(let i=0;i<2;i++)$('twoMoveLessonTab'+i).classList.toggle('on',i===twoMoveLessonTipIndex);
  let key;
  if(twoMoveLessonTipIndex===0)key='twoMoveTip3'+TWO_MOVE_TIP3_SHAPES[context.position]+'Hint';
  else key=context.group==='joinTwo'?'twoMoveLessonSecond':'twoMoveLessonPractice';
  const line=document.createElement('p');
  if(twoMoveLessonTipIndex===0){
    line.classList.add('two-move-tip3-hint-line');
    line.style.letterSpacing=TWO_MOVE_TIP3_LETTER_SPACING[TWO_MOVE_TIP3_SHAPES[context.position]]||'0';
  }
  appendMoveCountEmphasis(line,tr(key));
  root.append(line);
  root.hidden=false;
}
function renderTwoMoveLessonPattern(){
  renderTwoMoveLessonShape();
  renderTwoMoveLessonTip();
  $('twoMoveLessonPosition').textContent=twoMoveLessonContext.position+' / '+TWO_MOVE_STAGES.length;
  buildTwoMoveLessonBoard('twoMoveLessonBoard',twoMoveLessonContext.group,twoMoveLessonContext.state);
}
function navigateTwoMoveLesson(delta){
  const total=TWO_MOVE_STAGES.length;
  const position=((twoMoveLessonContext.position-1+delta)%total+total)%total+1;
  const state=transformStateBySymmetry(campaignStageState(STAGES[BASIC_STAGE_START+position-1].state),SECOND_LAP_BOARD_VIEW);
  twoMoveLessonContext={state,position,group:position<=5?'joinOne':'joinTwo'};
  renderTwoMoveLessonPattern();
}
function openTwoMoveLessonDialog(retry=false){
  twoMoveLessonTipIndex=0;
  twoMoveLessonContext=currentTwoMoveLessonContext();
  for(let i=0;i<2;i++)$('twoMoveLessonTab'+i).textContent=tr('twoMoveLessonTab'+(i+1));
  renderTwoMoveLessonPattern();
  $('closeTwoMoveLesson').textContent=tr('twoMoveLessonClose');
  $('retryTwoMoveLesson').textContent=tr('retryLesson');
  $('twoMoveLessonPrev').setAttribute('aria-label',tr('prev'));
  $('twoMoveLessonNext').setAttribute('aria-label',tr('next'));
  $('retryTwoMoveLesson').hidden=!retry;
  $('closeTwoMoveLesson').hidden=retry;
  $('twoMoveLessonDialog').hidden=false;
  $(retry?'retryTwoMoveLesson':'closeTwoMoveLesson').focus();
}
function closeTwoMoveLessonDialog(){
  stopClearGuideBoard('twoMoveLessonBoard');
  $('twoMoveLessonDialog').hidden=true;
}
function buildClearGuideBoard(id){
  stopClearGuideBoard(id);
  const guide=$(id),NS_='http://www.w3.org/2000/svg';
  if(!guide)return;
  guide.innerHTML='';
  const start=dec(STAGES[0].state),tiles=[];
  CELL.forEach((c,i)=>{
    const g=document.createElementNS(NS_,'g');
    g.setAttribute('class','tile '+(start[i]?'fallen':'stand'));
    g.innerHTML='<path class="hex" d="'+hexPath(R)+'"/><use href="#daruma-body"/><g class="open"><use href="#face-open"/></g><g class="shut"><use href="#face-shut"/></g><g class="happy"><use href="#face-happy"/></g>';
    g.style.transform=tileTransform(c.x,c.y,start[i]);guide.appendChild(g);tiles[i]=g;
  });
  const grips=[];
  TRI.forEach(t=>{
    const angle=Math.atan2(t.y-CELL[3].y,t.x-CELL[3].x)*180/Math.PI,q=angle*Math.PI/180,r=32;
    const x=t.x+r*Math.cos(q),y=t.y+r*Math.sin(q),marker=document.createElementNS(NS_,'g');
    marker.setAttribute('class','grip-marker');
    marker.setAttribute('transform','translate('+x.toFixed(2)+' '+y.toFixed(2)+') rotate('+angle.toFixed(2)+')');
    marker.innerHTML='<rect x="-18" y="-4" width="36" height="8" rx="4"/>';
    guide.appendChild(marker);grips.push(marker);
  });
  const swipe=document.createElementNS(NS_,'circle');
  swipe.setAttribute('class','intro-swipe');swipe.setAttribute('cx',TRI[0].x);swipe.setAttribute('cy',TRI[0].y-40);swipe.setAttribute('r','6.5');guide.appendChild(swipe);
  grips.forEach(marker=>guide.appendChild(marker));
  // 回転をまとめる<g>は毎回作り直さず使い回す(iOSで初回フレームの描画がずれる対策)。
  const rotationUnit=document.createElementNS(NS_,'g');
  rotationUnit.style.transformBox='view-box';rotationUnit.style.transformOrigin=TRI[0].x+'px '+TRI[0].y+'px';
  rotationUnit.style.willChange='transform';
  guide.appendChild(rotationUnit);
  const play=()=>{
    if(!guide.isConnected){stopClearGuideBoard(id);return;}
    swipe.style.display='none';guide.appendChild(swipe);grips.forEach(marker=>{marker.style.display='';guide.appendChild(marker);});
    tiles.forEach((g,i)=>{g.classList.remove('guide-happy');g.setAttribute('class','tile '+(start[i]?'fallen':'stand'));g.style.transform=tileTransform(CELL[i].x,CELL[i].y,start[i]);});
    const cells=TRI[0].cells,old=tiles.slice();
    setTimeout(()=>{if(guide.isConnected)swipe.style.display='';},1050);
    setTimeout(()=>{
      if(!guide.isConnected)return;
      grips.forEach(marker=>marker.style.display='none');
      const unit=rotationUnit;
      for(let i=0;i<3;i++)unit.appendChild(old[cells[(i+1)%3]]);
      unit.appendChild(swipe);
      // 使い回すunitは先に挿入済みのため、最前面に出すには回転開始のたびに一度前面へ出し直す。
      guide.appendChild(unit);
      unit.animate([{transform:'rotate(0deg)'},{transform:'rotate(-120deg)'}],
        {duration:760,easing:'cubic-bezier(.2,.75,.2,1)',fill:'forwards'});
      setTimeout(()=>{
        if(!guide.isConnected)return;
        for(let i=0;i<3;i++){
          const from=cells[(i+1)%3],to=cells[i],el=old[from];
          el.style.transform=tileTransform(CELL[to].x,CELL[to].y,0);el.setAttribute('class','tile stand');tiles[to]=el;guide.appendChild(el);
        }
        swipe.setAttribute('cx',TRI[0].x);swipe.setAttribute('cy',TRI[0].y-40);guide.appendChild(swipe);tiles.forEach(el=>el.classList.add('guide-happy'));swipe.style.display='none';
      },760);
    },1750);
  };
  play();clearGuideTimers.set(id,setInterval(play,3500));
}
function lessonBestMove(state){
  const board=dec(state),distance=SOLVER.dist[enc(board)];
  let fallback=null;
  for(let ti=0;ti<TRI.length;ti++)for(const dir of[-1,1]){
    if(SOLVER.dist[enc(rollOnce(board,ti,dir))]!==distance-1)continue;
    // 「寝ている3体をまわす」定石に沿う候補があれば、それを優先する。
    if(TRI[ti].cells.every(c=>board[c]!==0))return {ti,dir};
    if(!fallback)fallback={ti,dir};
  }
  return fallback;
}
// 入門の最後に見せる「最短2手」の実演。
// 基本1の実際の盤面を、一手回して最短1手になるところまでを繰り返す。
function buildTwoMoveLessonBoard(id,variant='joinOne',overrideState=null){
  stopClearGuideBoard(id);
  const guide=$(id),NS_='http://www.w3.org/2000/svg';
  if(!guide)return;
  const run=clearGuideRuns.get(id);
  const isCurrent=()=>run===clearGuideRuns.get(id);
  const initialState=overrideState??STAGES[variant==='joinTwo'?8:3].state,move=lessonBestMove(initialState);
  if(!move)return;
  const start=dec(initialState),after=rollOnce(start,move.ti,move.dir),tiles=[];
  guide.innerHTML='';
  CELL.forEach((c,i)=>{
    const g=document.createElementNS(NS_,'g');
    g.setAttribute('class','tile '+(start[i]?'fallen':'stand'));
    g.innerHTML='<path class="hex" d="'+hexPath(R)+'"/><use href="#daruma-body"/><g class="open"><use href="#face-open"/></g><g class="shut"><use href="#face-shut"/></g><g class="happy"><use href="#face-happy"/></g>';
    g.style.transform=tileTransform(c.x,c.y,start[i]);guide.appendChild(g);tiles[i]=g;
  });
  const initialTiles=tiles.slice(),t=TRI[move.ti];
  // 軸ごとに、盤面の外側からつかむ。本編チュートリアルの上側始点と同じ考え方。
  const outerAngle=Math.atan2(t.y-CELL[3].y,t.x-CELL[3].x);
  const swipeStart={x:t.x+40*Math.cos(outerAngle),y:t.y+40*Math.sin(outerAngle)};
  const grips=[];
  TRI.forEach(triangle=>{
    const angle=Math.atan2(triangle.y-CELL[3].y,triangle.x-CELL[3].x)*180/Math.PI,q=angle*Math.PI/180,r=32;
    const marker=document.createElementNS(NS_,'g');
    marker.setAttribute('class','grip-marker');
    marker.setAttribute('transform','translate('+(triangle.x+r*Math.cos(q)).toFixed(2)+' '+(triangle.y+r*Math.sin(q)).toFixed(2)+') rotate('+angle.toFixed(2)+')');
    marker.innerHTML='<rect x="-18" y="-4" width="36" height="8" rx="4"/>';
    guide.appendChild(marker);grips.push(marker);
  });
  const swipe=document.createElementNS(NS_,'circle');
  swipe.setAttribute('class','intro-swipe');swipe.setAttribute('cx',swipeStart.x.toFixed(2));swipe.setAttribute('cy',swipeStart.y.toFixed(2));swipe.setAttribute('r','6.5');guide.appendChild(swipe);
  // 回転をまとめる<g>は毎回作り直さず使い回す(iOSで初回フレームの描画がずれる対策)。
  const rotationUnit=document.createElementNS(NS_,'g');
  rotationUnit.style.transformBox='view-box';rotationUnit.style.transformOrigin=t.x+'px '+t.y+'px';
  rotationUnit.style.willChange='transform';
  guide.appendChild(rotationUnit);
  const play=()=>{
    if(!isCurrent())return;
    if(!guide.isConnected){stopClearGuideBoard(id);return;}
    guide.style.opacity='1';
    tiles.splice(0,N,...initialTiles);
    initialTiles.forEach((tile,i)=>{
      tile.classList.remove('guide-happy');
      tile.setAttribute('class','tile '+(start[i]?'fallen':'stand'));
      tile.style.transform=tileTransform(CELL[i].x,CELL[i].y,start[i]);
      guide.appendChild(tile);
    });
    grips.forEach(marker=>{marker.style.display='';guide.appendChild(marker);});
    swipe.style.display='none';guide.appendChild(swipe);
    // まず盤面を十分に観察してから、つかむ位置と回転を見せる。
    setTimeout(()=>{if(isCurrent()&&guide.isConnected)swipe.style.display='';},1450);
    setTimeout(()=>{
      if(!isCurrent()||!guide.isConnected)return;
      grips.forEach(marker=>marker.style.display='none');
      const old=tiles.slice(),cells=t.cells,unit=rotationUnit;
      for(let i=0;i<3;i++){
        const from=move.dir>0?cells[i]:cells[(i+1)%3];
        unit.appendChild(old[from]);
      }
      unit.appendChild(swipe);
      // 使い回すunitは先に挿入済みのため、最前面に出すには回転開始のたびに一度前面へ出し直す。
      guide.appendChild(unit);
      unit.animate([{transform:'rotate(0deg)'},{transform:'rotate('+(move.dir*120)+'deg)'}],
        {duration:400,easing:'cubic-bezier(.2,.75,.2,1)',fill:'forwards'});
      setTimeout(()=>{
        if(!isCurrent()||!guide.isConnected)return;
        for(let i=0;i<3;i++){
          const from=move.dir>0?cells[i]:cells[(i+1)%3],to=move.dir>0?cells[(i+1)%3]:cells[i],tile=old[from];
          tile.style.transform=tileTransform(CELL[to].x,CELL[to].y,after[to]);
          tile.setAttribute('class','tile '+(after[to]?'fallen':'stand'));tiles[to]=tile;guide.appendChild(tile);
        }
        swipe.setAttribute('cx',swipeStart.x.toFixed(2));swipe.setAttribute('cy',swipeStart.y.toFixed(2));guide.appendChild(swipe);swipe.style.display='none';
      },400);
    },2450);
    // 次の初期盤面へ戻す直前に短く消し、ループの切り替わりを明確にする。
    setTimeout(()=>{if(isCurrent()&&guide.isConnected)guide.style.opacity='0';},3350);
  };
  play();clearGuideTimers.set(id,setInterval(play,3600));
}
// ===== 描画・座標変換・スワイプアニメーション =====
function paint(){
  for(let i=0;i<N;i++){
    const up=mod3(spin[i])===0;
    tileEls[i].setAttribute('class','tile '+(up?'stand':'fallen'));
    tileEls[i].style.transform='translate('+CELL[i].x.toFixed(2)+'px,'+CELL[i].y.toFixed(2)+'px) rotate('+(spin[i]*120)+'deg)';
  }
  applyBoardTheme();
  showMoves(moves);
  refreshGuidedBasicCandidates();
  if(isMode('tutorial')){
    if(isSolved()&&!clearShown){
      clearShown=true;
      cancelTutorialHint(true);
      svg.classList.add('tutorial-clear-step');
      // 本編の全員起きた瞬間と同じく、笑顔にして揺れ+バーストの演出を見せる。
      svg.classList.add('celebrating');
      playWakeCelebrationEffect(svg,tileEls);
      clearTimeout(tutorialAdvanceTimer);
      $('gripPromptText').textContent=tutorialPrompt('clear');
      $('gripPrompt').hidden=false;
      tutorialAdvanceTimer=setTimeout(advanceTutorial,1250);
    }
    return;
  }
  if(!editingBoard&&!isMode('speed'))showRemaining(remainingForDisplay(SOLVER.dist[enc(ori)]));
  else if(isMode('speed')){
    if(speedShowsRemaining())showRemaining(remainingForDisplay(SOLVER.dist[enc(ori)]));
    renderSpeedClock();
  }
  if(isMode('speed')&&isSolved()&&!clearShown&&speedSession&&!speedAwaitingStart()){
    completeSpeedStage();
    return;
  }
  // 二周目の悟りは、最短手数を手がかりにさせない。成功しない限り4手目まで続けられる。
  const satoriFailureLimit=secondLapActive?4:best;
  if(isMode('satori')&&!isSolved()&&moves>=satoriFailureLimit&&!clearShown){
    clearShown=true;
    renderOptimalFail();
    $('optimalFailDialog').hidden=false;
    return;
  }
  if(!editingBoard&&!isMode('speed')&&isSolved()&&!clearShown){
    clearShown=true;
    svg.classList.add('clear-pending');
    if(requiresOptimalClear()&&moves!==best){
      renewFourthChecks();
      renderOptimalFail();
      $('optimalFailDialog').hidden=false;
      return;
    }
    const analyticsStage=analyticsStageInfo();
    if(analyticsStage){
      const firstClear=isMode('satori')?!clearedSatoriStages.has(satoriIndex)
        :isMode('mastery')?!clearedExtraStages.has(extraIndex)
        :!clearedStages.has(stageIndex);
      trackAnalyticsEvent('stage_clear',Object.assign({},analyticsStage,{
        moves_used:moves,first_clear:firstClear
      }));
    }
    if(isMode('satori')){
      const wasSatoriMastered=isSatoriMastered();
      clearedSatoriStages.add(satoriIndex);
      persistLapProgress();
      if(isSatoriMastered())rememberClearedMessage(false,satoriIndex,true);
      if(!wasSatoriMastered&&isSatoriMastered())pendingMasterThemeRefresh=true;
      else updateMasterTheme();
      renderStageNav();
    }else if(isMode('mastery')){
      clearedExtraStages.add(extraIndex);
      persistLapProgress();
      rememberClearedMessage(true,extraIndex);
      updateMasterTheme();
    }else if(!isMode('free')&&!isMode('custom')){
      clearedStages.add(stageIndex);
      persistLapProgress();
      rememberClearedMessage(false,stageIndex);
    }
    const m=$('msg');
    m.textContent='';
    m.classList.remove('show','tip','long-tip');
    clearTimeout(clearTimer);
    clearTimer=setTimeout(showClearActions,650);
  }
}
function tileTransform(x,y,turn){
  return 'translate('+x.toFixed(2)+'px,'+y.toFixed(2)+'px) rotate('+(turn*120)+'deg)';
}
function tileTransformDeg(x,y,deg){
  return 'translate('+x.toFixed(2)+'px,'+y.toFixed(2)+'px) rotate('+deg+'deg)';
}
function nearestRotationDeg(fromDeg,toDeg){
  const delta=((toDeg-fromDeg+180)%360+360)%360-180;
  return fromDeg+delta;
}
function snapshot(){
  return {o:Uint8Array.from(ori),s:Int16Array.from(spin),t:tileEls.slice(),m:moves};
}
function transformPosition(o,s,t,permutation,flip){
  const nextOri=new Uint8Array(N),nextSpin=new Int16Array(N),nextTiles=Array(N);
  for(let from=0;from<N;from++){
    const to=permutation[from];
    nextOri[to]=flip?mod3(-o[from]):o[from];
    nextSpin[to]=flip?-s[from]:s[from];
    nextTiles[to]=t[from];
  }
  return {o:nextOri,s:nextSpin,t:nextTiles};
}
function transformStateCode(state,permutation,flip){
  const a=dec(state),next=new Uint8Array(N);
  for(let from=0;from<N;from++){
    next[permutation[from]]=flip?mod3(-a[from]):a[from];
  }
  return enc(next);
}
function rotatePointAroundBoard(p,angleDeg){
  const center=CELL[3],q=angleDeg*Math.PI/180,co=Math.cos(q),si=Math.sin(q);
  const x=p.x-center.x,y=p.y-center.y;
  return {x:center.x+x*co-y*si,y:center.y+x*si+y*co};
}
function reorientBoard(permutation,flip=false,rotationDeg=0){
  if(busy||drag)return;
  cancelTileAnimations();
  clearHintVisuals();
  if(usesHiddenRemaining())resetFourthDistance();
  const applyTransform=()=>{
    const transformed=transformPosition(ori,spin,tileEls,permutation,flip);
    ori=transformed.o;spin=transformed.s;tileEls=transformed.t;
    history=history.map(h=>{
      const next=transformPosition(h.o,h.s,h.t,permutation,flip);
      return {o:next.o,s:next.s,t:next.t,m:h.m};
    });
    currentInitialState=transformStateCode(currentInitialState,permutation,flip);
  };
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const before=new Map(tileEls.map((el,i)=>[el,{cell:i,spin:spin[i]}]));
  applyTransform();
  paint();
  if(reduced)return;
  busy=true;
  let remaining=baseTiles.length;
  const finished=new Set();
  for(const el of baseTiles){
    const old=before.get(el),to=tileEls.indexOf(el);
    const finalDeg=nearestRotationDeg(old.spin*120,spin[to]*120);
    const finalTransform=tileTransformDeg(CELL[to].x,CELL[to].y,finalDeg);
    let frames;
    if(rotationDeg){
      const middle=rotatePointAroundBoard(CELL[old.cell],rotationDeg/2);
      frames=[
        {transform:tileTransform(CELL[old.cell].x,CELL[old.cell].y,old.spin)},
        {transform:tileTransform(middle.x,middle.y,old.spin),offset:.5},
        {transform:finalTransform}
      ];
    }else{
      frames=[
        {transform:tileTransform(CELL[old.cell].x,CELL[old.cell].y,old.spin)},
        {transform:finalTransform}
      ];
    }
    const animation=el.animate(frames,{
      duration:680,easing:'cubic-bezier(.2,.72,.2,1)'
    });
    const done=()=>{
      if(finished.has(el))return;
      finished.add(el);
      if(--remaining===0){busy=false;paint();}
    };
    animation.onfinish=done;animation.oncancel=done;
  }
}
function cancelTileAnimations(){
  for(const el of baseTiles) for(const a of el.getAnimations()) a.cancel();
}
function wakeFeedback(elements){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  elements.forEach((el,i)=>el.animate([
    {filter:'brightness(1) drop-shadow(0 0 0 rgba(201,165,78,0))'},
    {filter:'brightness(1.3) drop-shadow(0 0 10px rgba(201,165,78,.85))',offset:.42},
    {filter:'brightness(1.04) drop-shadow(0 0 0 rgba(201,165,78,0))'}
  ],{duration:480,delay:i*45,easing:'cubic-bezier(.2,.8,.25,1)'}));
}
function applySwipe(ti,dir,save=true,playEffects=true){
  if(usesHiddenRemaining())resetFourthDistance();
  if(save) history.push(snapshot());
  if(save)trackGameStart();
  const oldSpin=Int16Array.from(spin), oldTiles=tileEls.slice(), c=TRI[ti].cells;
  ori=rollOnce(ori,ti,dir);
  for(let i=0;i<3;i++){
    const from=dir>0?c[i]:c[(i+1)%3], to=dir>0?c[(i+1)%3]:c[i];
    tileEls[to]=oldTiles[from];
    spin[to]=oldSpin[from]+dir;
  }
  moves++;
  if(save&&activeLap===1&&isMode('stage')&&stageIndex>=TRAINING_STAGE_START&&stageIndex<TRAINING_STAGE_START+TRAINING_UPPER_COUNT&&moves===5&&SOLVER.dist[enc(ori)]!==0){
    setTimeout(()=>{
      if(isMode('stage')&&stageIndex>=TRAINING_STAGE_START&&stageIndex<TRAINING_STAGE_START+TRAINING_UPPER_COUNT&&moves>=5&&!isSolved())
        openTwoMoveLessonDialog(true);
    },520);
  }
  if(!isMode('speed')&&isTrainingRangeStage()&&SOLVER.dist[enc(ori)]===2)showTrainingShapeCallout();
  if(!isMode('speed')&&isAssistedLearningStage()&&!isSolved())showAcademyRemainingCallout();
  if(isMode('speed')&&speedSession){
    if(save)speedSession.movedCurrent=true;
    saveSpeedSession();
  }
  if(playEffects){
    haptic(SOLVER.dist[enc(ori)]===0?[20,32,42]:10);
    playRotateSound(dir);
  }
}
let trainingShapeCalloutTimer=null;
// だるま修行で「あと2くるり」に到達した瞬間、盤面中央に形の名前と型取りを1秒ほど表示する。
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
let academyRemainingCalloutTimer=null;
// だるま学園(入門・基本・発展)では、手を進めるたびに盤面中央へ大きく「あと○くるり」を短時間表示する。
function showAcademyRemainingCallout(){
  clearTimeout(academyRemainingCalloutTimer);
  const el=$('academyRemainingCallout');
  el.querySelector('.academy-remaining-callout-label').textContent=tr('shortestDisplay');
  $('academyRemainingCalloutNumber').textContent=String(remainingForDisplay(SOLVER.dist[enc(ori)]));
  el.querySelector('.academy-remaining-callout-unit').textContent=tr('moveUnit');
  el.hidden=false;
  requestAnimationFrame(()=>el.classList.add('show'));
  academyRemainingCalloutTimer=setTimeout(()=>{
    el.classList.remove('show');
    setTimeout(()=>{el.hidden=true;},260);
  },700);
}
function replaceBoardState(next,{paintNow=false}={}){
  if(next.ori)ori=next.ori;
  if(next.spin)spin=next.spin;
  if(next.tiles)tileEls=next.tiles;
  if(Number.isInteger(next.moves))moves=next.moves;
  if(Number.isInteger(next.best))best=next.best;
  if(next.history)history=next.history;
  if(paintNow)paint();
}
function setPosition(state,par){
  loadFourthChecks();
  resetFourthDistance();
  cancelTutorialHint();
  cancelTileAnimations();
  clearHintVisuals();
  svg.querySelectorAll('.clear-burst').forEach(el=>el.remove());
  clearTimeout(clearTimer);
  svg.querySelectorAll('.training-shape-callout').forEach(el=>el.remove());
  clearTimeout(trainingShapeCalloutTimer);
  currentInitialState=state; currentInitialPar=par;
  const nextOri=dec(state);
  replaceBoardState({ori:nextOri,spin:Int16Array.from(nextOri),tiles:baseTiles.slice(),best:par,moves:0,history:[]}); clearShown=false;
  clearTimeout(boardArrivalTimer);
  busy=false; drag=null;boardTouchActive=false; svg.classList.remove('spinning','selecting','clear-pending','celebrating','arriving');
  svg.classList.remove('tutorial-grab-step','tutorial-clear-step','invalid-grab');
  svg.querySelectorAll('.grip-marker.tutorial-target').forEach(marker=>marker.classList.remove('tutorial-target'));
  $('gripPrompt').classList.remove('tutorial-prompt-top');
  $('gripPrompt').hidden=true;
  invalidGrabPointerId=null;
  baseTiles.forEach(el=>el.classList.remove('selected'));
  svg.querySelectorAll('.pivot.active').forEach(el=>el.classList.remove('active'));
  $('msg').textContent='';
  $('msg').classList.remove('show','tip','long-tip');
  hideGameDialogs();
  paint();
}
function tutorialSolvingMoves(state=enc(ori)){
  const board=dec(state),moves=[],distance=SOLVER.dist[state];
  if(!distance)return moves;
  for(let ti=0;ti<TRI.length;ti++)for(const dir of [1,-1]){
    if(SOLVER.dist[enc(rollOnce(board,ti,dir))]===distance-1)moves.push({ti,dir});
  }
  return moves;
}
function tutorialMoveAllowed(ti,dir){
  const solutions=tutorialSolvingMoves();
  if(TUTORIAL_STEPS[tutorialStep]?.cue==='none')return solutions.some(move=>move.ti===ti&&move.dir===dir);
  const expected=solutions[0];
  return !!expected&&expected.ti===ti&&expected.dir===dir;
}
function tutorialPrompt(phase){
  const second=tutorialStep===1;
  const cue=TUTORIAL_STEPS[tutorialStep]?.cue;
  if(cue==='find'){
    return tr({grab:'tutorialFindPrompt',turn:'tutorialFindTurnPrompt',release:'tutorialFindTurnPrompt',clear:'tutorialFindClearPrompt'}[phase]);
  }
  if(cue==='chain'){
    return tr({grab:moves===0?'tutorialChainPrompt':'tutorialChainAgainPrompt',turn:moves===0?'tutorialChainTurnPrompt':'tutorialChainDirectionPrompt',release:'tutorialChainReleasePrompt',clear:'tutorialChainClearPrompt'}[phase]);
  }
  if(cue==='chain-direction'){
    return tr({grab:moves===0?'tutorialChainPrompt':'tutorialTrySoloPrompt',turn:moves===0?'tutorialChainDirectionPrompt':'tutorialTrySoloPrompt',release:'tutorialArrowPrompt',clear:'tutorialFinalClearPrompt'}[phase]);
  }
  const keys={
    grab:second?'tutorialSecondGrabPrompt':'tutorialGrabPrompt',
    turn:second?'tutorialSecondArrowPrompt':'tutorialArrowPrompt',
    release:second?'tutorialSecondReleasePrompt':'tutorialReleasePrompt',
    clear:second?'tutorialSecondClearPrompt':tutorialStep===0?'tutorialFirstClearPrompt':'tutorialClearPrompt'
  };
  return tr(keys[phase]);
}
function showTutorialCue(){
  if(!isMode('tutorial')||busy||isSolved())return;
  const step=TUTORIAL_STEPS[tutorialStep],move=tutorialSolvingMoves()[0];
  if(!step||!move)return;
  cancelTutorialHint();
  svg.classList.remove('tutorial-grab-step');
  svg.querySelectorAll('.grip-marker.tutorial-target').forEach(marker=>marker.classList.remove('tutorial-target'));
  $('gripPrompt').hidden=true;
  if(step.cue==='grab'){
    svg.classList.add('tutorial-grab-step');
    svg.querySelector('.grip-marker[data-tri="'+move.ti+'"]')?.classList.add('tutorial-target');
    $('gripPromptText').textContent=tutorialPrompt('grab');
    $('gripPrompt').hidden=false;
  }else if(step.cue==='find'){
    $('gripPromptText').textContent=tutorialPrompt('grab');
    $('gripPrompt').hidden=false;
  }else if(step.cue==='chain'){
    if(moves===0){
      svg.classList.add('tutorial-grab-step');
      svg.querySelector('.grip-marker[data-tri="'+move.ti+'"]').classList.add('tutorial-target');
    }
    $('gripPromptText').textContent=tutorialPrompt('grab');
    $('gripPrompt').hidden=false;
  }else if(step.cue==='chain-direction'){
    if(moves===0){
      svg.classList.add('tutorial-grab-step');
      svg.querySelector('.grip-marker[data-tri="'+move.ti+'"]').classList.add('tutorial-target');
    }
    $('gripPromptText').textContent=tutorialPrompt('grab');
    $('gripPrompt').hidden=false;
  }else if(step.cue==='move'){
    showHintArrow(move.ti,move.dir,false,true);
    svg.querySelector('.pivot[data-tri="'+move.ti+'"]')?.classList.add('hi');
  }else if(step.cue==='axis'){
    svg.classList.add('hinting');
    for(const cell of TRI[move.ti].cells)tileEls[cell].classList.add('selected');
    svg.querySelector('.pivot[data-tri="'+move.ti+'"]')?.classList.add('hi');
    showAxisGuide(TRI[move.ti]);
  }
}
function loadTutorialStep(index=0){
  clearTimeout(tutorialAdvanceTimer);
  setActiveMode('tutorial');editingBoard=false;
  tutorialStep=Math.max(0,Math.min(TUTORIAL_STEPS.length-1,index));
  storage.set(STORAGE_KEYS.tutorialStep,String(tutorialStep));
  const step=TUTORIAL_STEPS[tutorialStep];
  setPosition(step.state,step.par);
  $('gripPrompt').classList.add('tutorial-prompt-top');
  renderStageNav();
  animateBoardArrival();
  setTimeout(showTutorialCue,430);
  saveActiveSession();
}
function startTutorial(){
  if(storage.get(STORAGE_KEYS.tutorialComplete)==='1'){loadStage(0);return;}
  const savedStep=Number(storage.get(STORAGE_KEYS.tutorialStep,'0'));
  loadTutorialStep(Number.isInteger(savedStep)?savedStep:0);
}
function advanceTutorial(){
  if(!isMode('tutorial'))return;
  if(tutorialStep<TUTORIAL_STEPS.length-1){loadTutorialStep(tutorialStep+1);return;}
  storage.set(STORAGE_KEYS.tutorialComplete,'1');
  storage.remove(STORAGE_KEYS.tutorialStep);
  loadStage(0);
  setTimeout(()=>openChainedDialog('academyEnroll'),260);
}
// ===== チュートリアル・ステージ読込・セッション復元・フリーモード =====
function loadStage(index){
  if(index>=TRAINING_STAGE_START&&!canEnterTraining()){
    showMasterDialog('primary');
    return;
  }
  if(isMode('speed'))pauseSpeedRun();
  setActiveMode('stage');editingBoard=false;
  nextStageAttention=false;
  stageIndex=Math.max(0,Math.min(STAGES.length-1,index));
  lastStageMode={extra:false,satori:false,index:stageIndex};
  const stage=STAGES[stageIndex];
  saveCurrentStage(false,stageIndex);
  setPosition(campaignStageState(stage.state),stage.par);
  renderStageNav();
  animateBoardArrival();
  trackStageView();
  if(stageIndex===0&&!hasMasterReward())scheduleStageOneTutorial();
  else scheduleBasicLessonAssist();
}
function loadExtraStage(index){
  // 一周目は、だるま修行の修了試験を終えるまで名人への道へ進めない。
  if(!canEnterMastery()){showMasterDialog('intermediate');return;}
  if(isMode('speed'))pauseSpeedRun();
  setActiveMode('mastery');editingBoard=false;
  nextStageAttention=false;
  extraIndex=Math.max(0,Math.min(EXTRA_STAGES.length-1,index));
  lastStageMode={extra:true,satori:false,index:extraIndex};
  const stage=EXTRA_STAGES[extraIndex];
  saveCurrentStage(true,extraIndex);
  setPosition(campaignStageState(stage.state),stage.par);
  renderStageNav();
  animateBoardArrival();
  trackStageView();
}
function loadSatoriStage(index){
  if(!canEnterSatori()){
    if(activeLap===1&&isMastered())showMasterDialog('mastery');
    return;
  }
  if(isMode('speed'))pauseSpeedRun();
  setActiveMode('satori');editingBoard=false;
  nextStageAttention=false;
  satoriIndex=Math.max(0,Math.min(SATORI_STAGES.length-1,index));
  lastStageMode={extra:false,satori:true,index:satoriIndex};
  const stage=SATORI_STAGES[satoriIndex];
  try{storage.set('wake7-current-stage',JSON.stringify({satori:true,index:satoriIndex,lap:activeLap}));}catch(_){}
  setPosition(campaignStageState(stage.state),stage.par);
  renderStageNav();
  animateBoardArrival();
  trackStageView();
}
function saveCurrentStage(extra,index){
  try{storage.set('wake7-current-stage',JSON.stringify({extra,index,lap:activeLap}));}catch(_){}
}
function restoreCurrentStage(){
  let saved=null;
  try{saved=JSON.parse(storage.get('wake7-current-stage')||'null');}catch(_){}
  if(saved&&(saved.lap===1||saved.lap===2))activateCampaignLap(saved.lap);
  if(saved&&saved.satori===true&&Number.isInteger(saved.index)
    &&saved.index>=0&&saved.index<SATORI_STAGES.length&&canEnterSatori()){
    loadSatoriStage(saved.index);
  }else if(saved&&saved.extra===true&&Number.isInteger(saved.index)
    &&saved.index>=0&&saved.index<EXTRA_STAGES.length&&allPrimaryCleared()&&extraStageUnlocked(saved.index)){
    loadExtraStage(saved.index);
  }else if(saved&&saved.extra===false&&Number.isInteger(saved.index)
    &&saved.index>=0&&saved.index<STAGES.length&&primaryStageUnlocked(saved.index)){
    loadStage(saved.index);
  }else loadStage(0);
}
function serializeBoardSnapshot(s){
  return {o:[...s.o],s:[...s.s],t:s.t.map(el=>baseTiles.indexOf(el)),m:s.m};
}
function serializeActiveBoard(){
  return {
    o:[...ori],s:[...spin],t:tileEls.map(el=>baseTiles.indexOf(el)),m:moves,best,
    history:history.map(serializeBoardSnapshot),initialState:currentInitialState,initialPar:currentInitialPar,
    clearShown,fourthChecksUsed,fourthDistanceRevealed
  };
}
function validSavedTiles(tiles){
  return Array.isArray(tiles)&&tiles.length===N&&tiles.every(i=>Number.isInteger(i)&&i>=0&&i<N)&&new Set(tiles).size===N;
}
function validSavedBoard(data){
  return data&&Array.isArray(data.o)&&data.o.length===N&&data.o.every(v=>Number.isInteger(v)&&v>=0&&v<3)
    &&Array.isArray(data.s)&&data.s.length===N&&data.s.every(Number.isInteger)&&validSavedTiles(data.t);
}
function restoreSavedBoard(data){
  if(!validSavedBoard(data))return false;
  cancelTileAnimations();clearHintVisuals();clearTimeout(clearTimer);
  ori=Uint8Array.from(data.o);spin=Int16Array.from(data.s);tileEls=data.t.map(i=>baseTiles[i]);
  moves=Number.isInteger(data.m)&&data.m>=0?data.m:0;
  best=Number.isInteger(data.best)&&data.best>=0?data.best:SOLVER.dist[enc(ori)];
  currentInitialState=Number.isInteger(data.initialState)?data.initialState:enc(ori);
  currentInitialPar=Number.isInteger(data.initialPar)?data.initialPar:best;
  history=(Array.isArray(data.history)?data.history:[]).filter(validSavedBoard).map(h=>({o:Uint8Array.from(h.o),s:Int16Array.from(h.s),t:h.t.map(i=>baseTiles[i]),m:h.m}));
  clearShown=!!data.clearShown||isSolved();
  loadFourthChecks();
  fourthDistanceRevealed=!!data.fourthDistanceRevealed;
  fourthHintPreview=false;fourthHintDistance=null;busy=false;drag=null;boardTouchActive=false;
  svg.classList.remove('spinning','selecting','clear-pending','celebrating');
  svg.classList.toggle('clear-pending',clearShown&&isSolved());
  baseTiles.forEach(el=>el.classList.remove('selected'));
  $('clearNext').hidden=!clearShown;
  paint();
  return true;
}
function saveActiveSession(){
  if(isMode('tutorial')){
    const payload={mode:'tutorial',step:tutorialStep};
    syncGameState(payload);
    storage.setJson(STORAGE_KEYS.activeSession,payload);
    storage.set(STORAGE_KEYS.tutorialStep,String(tutorialStep));
    return;
  }
  if(isMode('speed')){
    // 速解きの保存盤だけでは「最後に遊んでいたモード」を判定しない。
    // 他モードへ戻った後に古い速解きセッションが残っていても、復元先を奪わないための印。
    saveSpeedSession();
    const payload={mode:'speed',variant:speedVariant,lap:activeLap};
    syncGameState(payload);
    try{storage.set(STORAGE_KEYS.activeSession,JSON.stringify(payload));}catch(_){ }
    return;
  }
  persistLapProgress();
  const mode=activeMode;
  const payload={
    mode,editingBoard,extra:isMode('mastery'),satori:isMode('satori'),index:isMode('satori')?satoriIndex:isMode('mastery')?extraIndex:stageIndex,lap:activeLap,
    lastStageMode,board:serializeActiveBoard()
  };
  syncGameState(payload);
  try{storage.set('wake7-active-session',JSON.stringify(payload));}catch(_){ }
}
function restoreActiveSession(){
  let saved=null;
  try{saved=JSON.parse(storage.get('wake7-active-session')||'null');}catch(_){ }
  if(!saved)saved=window.WakeSevenState.read()?.legacySession||null;
  if(saved?.mode==='tutorial'&&storage.get(STORAGE_KEYS.tutorialComplete)!=='1'){
    loadTutorialStep(Number.isInteger(saved.step)?saved.step:Number(storage.get(STORAGE_KEYS.tutorialStep,'0'))||0);
    return;
  }
  // 速解きは「最後に遊んでいたモード」として保存されていた場合だけ再開する。
  // セッションを途中保存しているだけでは、通常ステージ／フリー／自作の復元を上書きしない。
  if(saved?.mode==='speed'){
    const savedSpeed=readActiveSpeedSession();
    if(savedSpeed&&speedVariantUnlocked(savedSpeed.variant)){
      speedVariant=savedSpeed.variant;speedSession=ensureSpeedBoardView(savedSpeed);loadSpeedStage(true);return;
    }
    try{storage.remove(STORAGE_KEYS.activeSession);}catch(_){ }
    restoreCurrentStage();return;
  }
  if(!saved||!validSavedBoard(saved.board)){restoreCurrentStage();return;}
  if(saved.lap===1||saved.lap===2)activateCampaignLap(saved.lap);
  const canRestoreSatori=saved.satori===true&&Number.isInteger(saved.index)&&saved.index>=0&&saved.index<SATORI_STAGES.length&&canEnterSatori();
  const canRestoreExtra=saved.extra===true&&Number.isInteger(saved.index)&&saved.index>=0&&saved.index<EXTRA_STAGES.length&&allPrimaryCleared()&&extraStageUnlocked(saved.index);
  const canRestoreStage=saved.extra===false&&Number.isInteger(saved.index)&&saved.index>=0&&saved.index<STAGES.length&&primaryStageUnlocked(saved.index);
  if(saved.mode==='stage'||saved.mode==='satori'){
    if(canRestoreSatori)loadSatoriStage(saved.index);
    else if(canRestoreExtra)loadExtraStage(saved.index);
    else if(canRestoreStage)loadStage(saved.index);
    else{restoreCurrentStage();return;}
  }else if(saved.mode==='free'){
    setActiveMode('free');editingBoard=false;
  }else if(saved.mode==='custom'){
    setActiveMode('custom');editingBoard=!!saved.editingBoard;
  }else{restoreCurrentStage();return;}
  if(saved.lastStageMode&&typeof saved.lastStageMode.extra==='boolean'&&Number.isInteger(saved.lastStageMode.index)){
    lastStageMode={extra:saved.lastStageMode.extra,satori:!!saved.lastStageMode.satori,index:saved.lastStageMode.index};
  }
  restoreSavedBoard(saved.board);
  renderStageNav();
  if(isMode('custom')&&editingBoard)showMakerMessage();
}
function startFree(){
  if(isMode('speed'))pauseSpeedRun();
  savedFreeSession=null;
  setActiveMode('free');editingBoard=false;
  const pool=[...SOLVER.byDepth[2],...SOLVER.byDepth[3],...SOLVER.byDepth[4]];
  let state=pool[(Math.random()*pool.length)|0];
  if(pool.length>1)while(state===currentInitialState)state=pool[(Math.random()*pool.length)|0];
  setPosition(state,SOLVER.dist[state]);
  renderStageNav();
}
function revealFourthDistance(){
  if(!isFourthVolume()||busy||fourthChecksLeft()<=0)return;
  fourthChecksUsed++;
  persistFourthChecks();
  fourthHintPreview=false;fourthHintDistance=null;fourthDistanceRevealed=true;
  showRemaining(SOLVER.dist[enc(ori)]);
  renderStageNav();
}
function startFreeFromState(state){
  if(isMode('speed'))pauseSpeedRun();
  savedFreeSession=null;
  setActiveMode('free');editingBoard=false;
  setPosition(state,SOLVER.dist[state]);
  renderStageNav();
}
function cloneHistoryEntry(h){
  return {o:Uint8Array.from(h.o),s:Int16Array.from(h.s),t:h.t.slice(),m:h.m};
}
function saveFreeSession(){
  savedFreeSession={
    ori:Uint8Array.from(ori),spin:Int16Array.from(spin),tileEls:tileEls.slice(),
    moves,best,history:history.map(cloneHistoryEntry),
    initialState:currentInitialState,initialPar:currentInitialPar,clearShown
  };
}
function restoreFreeSession(){
  if(isMode('speed'))pauseSpeedRun();
  const s=savedFreeSession;
  if(!s){startFree();return;}
  cancelTileAnimations();
  clearHintVisuals();
  svg.querySelectorAll('.clear-burst').forEach(el=>el.remove());
  clearTimeout(clearTimer);
  setActiveMode('free');editingBoard=false;
  resetFourthDistance();
  ori=Uint8Array.from(s.ori);spin=Int16Array.from(s.spin);
  tileEls=s.tileEls.slice();moves=s.moves;best=s.best;
  history=s.history.map(cloneHistoryEntry);
  currentInitialState=s.initialState;currentInitialPar=s.initialPar;clearShown=s.clearShown;
  busy=false;drag=null;boardTouchActive=false;svg.classList.remove('spinning','selecting','clear-pending','celebrating');
  baseTiles.forEach(el=>el.classList.remove('selected'));
  svg.querySelectorAll('.pivot.active').forEach(el=>el.classList.remove('active'));
  $('msg').textContent='';
  $('msg').classList.remove('show','tip','long-tip');
  $('clearNext').hidden=!clearShown;
  if(clearShown)$('clearNext').textContent=tr('another');
  paint();
  renderStageNav();
}
function leaveFreeMode(){
  saveFreeSession();
  lastStageMode.satori?loadSatoriStage(lastStageMode.index):lastStageMode.extra?loadExtraStage(lastStageMode.index):loadStage(lastStageMode.index);
}
function makerDistance(){
  return SOLVER.dist[enc(ori)];
}
function showMakerMessage(){
  const d=makerDistance(),m=$('msg');
  m.classList.remove('long-tip');
  m.classList.add('tip','show');
  m.textContent=d===255?tr('makerImpossible'):tr('makerStatus',{n:d});
  $('stagePar').textContent=d===255?'—':d;
  $('playCustomBoard').disabled=d===255||d===0;
}
function enterBoardMaker(){
  if(busy)return;
  if(isMode('speed'))pauseSpeedRun();
  if(isMode('free'))saveFreeSession();
  // 自作モードは常にまっさらな盤面から。直前の悟り／速解き盤面を
  // そのまま最短手数の確認に使えないようにする。
  const state=0;
  setActiveMode('custom');editingBoard=true;
  setPosition(state,0);
  clearShown=true;
  renderStageNav();
  showMakerMessage();
}
function playCustomBoard(){
  const state=enc(ori),d=SOLVER.dist[state];
  if(d===255||d===0)return;
  setActiveMode('custom');editingBoard=false;
  setPosition(state,d);
  renderStageNav();
  animateBoardArrival();
}
function resetMakerBoard(){
  ori=new Uint8Array(N);spin=new Int16Array(N);tileEls=baseTiles.slice();
  moves=0;history=[];clearShown=true;
  paint();renderStageNav();showMakerMessage();
}

/* ---- ドラッグに追従して自転・公転 ---- */
const MINR=18;
let invalidGrabPointerId=null;
function toView(e){
  const p=svg.createSVGPoint();
  p.x=e.clientX; p.y=e.clientY;
  const local=p.matrixTransform(svg.getScreenCTM().inverse());
  return {x:local.x,y:local.y};
}
function gripPoint(t){
  const angle=Math.atan2(t.y-CELL[3].y,t.x-CELL[3].x);
  return {x:t.x+32*Math.cos(angle),y:t.y+32*Math.sin(angle),angle};
}
function gripAt(p){
  let hit=null,best=Infinity;
  TRI.forEach((t,ti)=>{
    const grip=gripPoint(t),dx=p.x-grip.x,dy=p.y-grip.y;
    const along=dx*Math.cos(grip.angle)+dy*Math.sin(grip.angle);
    const across=-dx*Math.sin(grip.angle)+dy*Math.cos(grip.angle);
    // 見えている水色の棒（36×8）よりかなり広く、指でもつかみやすい当たり判定にする。
    if(Math.abs(along)>46||Math.abs(across)>30)return;
    const score=(along/46)**2+(across/30)**2;
    if(score<best){best=score;hit={ti,t,grip};}
  });
  return hit;
}
function rejectBoardGrab(event){
  invalidGrabPointerId=event.pointerId;
  svg.classList.remove('grip-hover');
  svg.classList.add('invalid-grab');
  const tutorialCue=isMode('tutorial')?TUTORIAL_STEPS[tutorialStep]?.cue:'';
  const tutorialFindGrip=isMode('tutorial')&&(tutorialCue==='find'||tutorialCue==='chain-direction'||(tutorialCue==='chain'&&moves>0));
  $('gripPromptText').textContent=tr(tutorialFindGrip?'tutorialWrongPlacePrompt':guidedBasicCandidateTis!==null?'guidedBasicWrongGrip':'gripPrompt');
  $('gripPrompt').hidden=false;
  haptic(4);
  try{svg.setPointerCapture(event.pointerId);}catch(_){}
}
function clearInvalidGrab(event){
  if(invalidGrabPointerId===null||event.pointerId!==invalidGrabPointerId)return false;
  try{svg.releasePointerCapture(event.pointerId);}catch(_){}
  invalidGrabPointerId=null;
  svg.classList.remove('invalid-grab');
  $('gripPrompt').hidden=true;
  if(isMode('tutorial'))setTimeout(showTutorialCue,80);
  return true;
}
function flashGrabbedTiles(t){
  for(const cell of t.cells){
    const tile=tileEls[cell];
    tile.classList.remove('grab-flash');
    // 同じ場所を続けてつかんだ場合も、毎回光るようにアニメーションを再始動する。
    void tile.getBoundingClientRect();
    tile.classList.add('grab-flash');
    setTimeout(()=>tile.classList.remove('grab-flash'),380);
  }
}
function orbitTransform(item,deg,kc){
  const r=deg*Math.PI/180, co=Math.cos(r), si=Math.sin(r);
  const x=kc.x+item.dx*co-item.dy*si, y=kc.y+item.dx*si+item.dy*co;
  return tileTransformDeg(x,y,item.turn*120+deg);
}
function animateGroupedSwipe(dg,target,dir,waking){
  const group=document.createElementNS('http://www.w3.org/2000/svg','g');
  group.setAttribute('class','auto-swipe-group');
  const clones=[];
  for(const item of dg.items){
    const clone=item.el.cloneNode(true);
    clone.style.transform=orbitTransform(item,0,dg.kc);
    clone.setAttribute('class','tile '+(mod3(item.turn)===0?'stand':'fallen'));
    item.el.style.visibility='hidden';
    group.appendChild(clone);
    clones.push({item,clone,hex:clone.querySelector('.hex')});
  }
  svg.appendChild(group);
  busy=true;
  const duration=Math.max(190,Math.min(620,Math.abs(target-dg.deg)*4.65));
  const previewState=rollOnce(ori,dg.ti,dir);
  showMoves(moves+1);
  showRemaining(remainingForDisplay(SOLVER.dist[enc(previewState)]));
  let start=null;
  const ease=t=>1-Math.pow(1-t,3);
  const frame=now=>{
    if(start===null)start=now;
    const progress=Math.min(1,(now-start)/duration);
    const deg=dg.deg+(target-dg.deg)*ease(progress);
    group.setAttribute('transform','rotate('+deg+' '+dg.kc.x+' '+dg.kc.y+')');
    for(const {item,clone,hex} of clones){
      // 自動回転では半分を越えた時点で次の状態へ切り替える。
      // 終端付近まで古い表情が残り、回転後に遅れて変わるように見えるのを防ぐ。
      const turnProgress=Math.abs(target-dg.deg)<.001?1:Math.abs(deg-dg.deg)/Math.abs(target-dg.deg);
      const turn=turnProgress>=.5?item.turn+dir:item.turn;
      const state=mod3(turn)===0?'stand':'fallen';
      clone.setAttribute('class','tile '+state);
      // 金色・白黒テーマは六角形にインライン色を持つため、
      // class だけでなく複製パネルの色も同じフレームで更新する。
      if(hex){
        const tone=BOARD_THEME_TONES[boardTheme]?.[state];
        hex.style.fill=tone?.fill||'';
        hex.style.stroke=tone?.stroke||'';
      }
    }
    if(progress<1){requestAnimationFrame(frame);return;}
    // 効果音や振動より先に、盤面の見た目を確定する。
    applySwipe(dg.ti,dir,true,false);
    group.remove();
    for(const item of dg.items)item.el.style.visibility='';
    busy=false;
    paint();
    haptic(SOLVER.dist[enc(ori)]===0?[20,32,42]:10);
    playRotateSound(dir);
    wakeFeedback(waking);
  };
  requestAnimationFrame(frame);
}
function findSwipeThatReached(beforeState,afterState){
  const before=dec(beforeState);
  for(let ti=0;ti<TRI.length;ti++)for(const dir of[-1,1]){
    if(enc(rollOnce(before,ti,dir))===afterState)return {ti,dir};
  }
  return null;
}
function animateUndoSwipe(target){
  const move=findSwipeThatReached(enc(target.o),enc(ori));
  if(!move){
    ori=target.o;spin=target.s;tileEls=target.t;moves=target.m;paint();
    return;
  }
  const c=TRI[move.ti].cells;
  const reverseDir=-move.dir;
  const pivot={x:TRI[move.ti].x,y:TRI[move.ti].y};
  const items=c.map(cell=>{
    const el=tileEls[cell];
    return {el,cell,turn:spin[cell],dx:CELL[cell].x-pivot.x,dy:CELL[cell].y-pivot.y};
  });
  const group=document.createElementNS('http://www.w3.org/2000/svg','g');
  group.setAttribute('class','auto-swipe-group');
  const clones=[];
  for(const item of items){
    const clone=item.el.cloneNode(true);
    clone.style.transform=orbitTransform(item,0,pivot);
    clone.setAttribute('class','tile '+(mod3(item.turn)===0?'stand':'fallen'));
    item.el.style.visibility='hidden';
    group.appendChild(clone);
    clones.push({item,clone,hex:clone.querySelector('.hex')});
  }
  svg.appendChild(group);
  busy=true;
  const duration=420;
  let started=null;
  const ease=t=>1-Math.pow(1-t,3);
  const frame=now=>{
    if(started===null)started=now;
    const progress=Math.min(1,(now-started)/duration);
    const deg=reverseDir*120*ease(progress);
    group.setAttribute('transform','rotate('+deg+' '+pivot.x+' '+pivot.y+')');
    for(const {item,clone,hex} of clones){
      const turn=progress>=.5?item.turn+reverseDir:item.turn;
      const state=mod3(turn)===0?'stand':'fallen';
      clone.setAttribute('class','tile '+state);
      if(hex){
        const tone=BOARD_THEME_TONES[boardTheme]?.[state];
        hex.style.fill=tone?.fill||'';
        hex.style.stroke=tone?.stroke||'';
      }
    }
    if(progress<1){requestAnimationFrame(frame);return;}
    group.remove();
    for(const item of items)item.el.style.visibility='';
    ori=target.o;spin=target.s;tileEls=target.t;moves=target.m;
    busy=false;paint();
    haptic(7);playRotateSound(reverseDir);
  };
  requestAnimationFrame(frame);
}
function restartWithAnimation(){
  const beforeOri=Uint8Array.from(ori),beforeSpin=Int16Array.from(spin);
  // 速解きでは、一度動かしてからのやり直しは最短クリアとして数えない。
  if(isMode('speed')&&speedSession&&speedSession.movedCurrent)speedSession.restartedCurrent=true;
  // 極1〜9はやり直しで回復、極10〜12は使用回数を維持する。
  if(!fourthChecksSurviveRestart())renewFourthChecks();
  setPosition(currentInitialState,currentInitialPar);
  if(isMode('speed')&&speedSession)saveSpeedSession();
  renderStageNav();
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  busy=true;
  let remaining=baseTiles.length;
  const targetOri=Uint8Array.from(ori),targetSpin=Int16Array.from(spin);
  // パネルの場所は動かさず、それぞれの向きだけ最短方向へ整える。
  for(let cell=0;cell<N;cell++){
    const el=tileEls[cell];
    el.setAttribute('class','tile '+(beforeOri[cell]===0?'stand':'fallen'));
    const targetDeg=nearestRotationDeg(beforeSpin[cell]*120,targetSpin[cell]*120);
    const animation=el.animate([
      {transform:tileTransform(CELL[cell].x,CELL[cell].y,beforeSpin[cell])},
      {transform:tileTransformDeg(CELL[cell].x,CELL[cell].y,targetDeg)}
    ],{duration:300,easing:'cubic-bezier(.18,.78,.22,1)'});
    animation.onfinish=animation.oncancel=()=>{
      if(--remaining===0){busy=false;paint();}
    };
  }
  setTimeout(()=>{
    if(!busy)return;
    for(let cell=0;cell<N;cell++)tileEls[cell].setAttribute('class','tile '+(targetOri[cell]===0?'stand':'fallen'));
  },145);
}
function previewWake(item,deg){
  let angle=(item.turn*120+deg)%360;
  if(angle>180) angle-=360;
  if(angle<-180) angle+=360;
  item.el.setAttribute('class','tile selected '+(Math.abs(angle)<=22?'stand':'fallen'));
}
function effectiveTurn(turns){
  const n=((turns%3)+3)%3;
  return n===1?1:n===2?-1:0;
}
// Keep the numeric preview in sync with the visual wake threshold (120°-22°).
function visualTurns(deg){
  if(!deg)return 0;
  const sign=deg<0?-1:1;
  return sign*Math.floor((Math.abs(deg)+22)/120);
}
function clearAxisGuide(){
  svg.querySelectorAll('.axis-guide').forEach(el=>el.remove());
}
function showAxisGuide(t){
  clearAxisGuide();
  const NS_='http://www.w3.org/2000/svg';
  const g=document.createElementNS(NS_,'g');
  g.setAttribute('class','axis-guide');
  const rays=document.createElementNS(NS_,'g');
  rays.setAttribute('class','axis-rays');
  for(const i of t.cells){
    const c=CELL[i], ratio=.57;
    const line=document.createElementNS(NS_,'line');
    line.setAttribute('class','ray');
    line.setAttribute('x1',t.x);line.setAttribute('y1',t.y);
    line.setAttribute('x2',t.x+(c.x-t.x)*ratio);
    line.setAttribute('y2',t.y+(c.y-t.y)*ratio);
    rays.appendChild(line);
  }
  g.appendChild(rays);
  const ring=document.createElementNS(NS_,'circle');
  ring.setAttribute('class','axis-ring');
  ring.setAttribute('cx',t.x);ring.setAttribute('cy',t.y);ring.setAttribute('r',7);
  g.appendChild(ring);
  svg.appendChild(g);
}
// ===== ドラッグ/スワイプ操作(ポインタイベント) =====
svg.addEventListener('pointerdown',e=>{
  if(busy||svg.classList.contains('arriving')||(e.pointerType==='mouse'&&e.button!==0)) return;
  // 棒をつかめたかどうかに関わらず、盤面上で始まったタッチはページスワイプに奪われたくない。
  boardTouchActive=true;
  if(isMode('tutorial')&&clearShown)return;
  if(editingBoard){
    cancelTutorialHint();
    e.preventDefault();
    const p=toView(e);
    let cell=0,distance=Infinity;
    CELL.forEach((c,i)=>{
      const d=Math.hypot(p.x-c.x,p.y-c.y);
      if(d<distance){distance=d;cell=i;}
    });
    if(distance>R*.92)return;
    ori[cell]=mod3(ori[cell]+1);
    spin[cell]=ori[cell];
    moves=0;history=[];clearShown=true;
    paint();
    showMakerMessage();
    return;
  }
  if(isSolved()&&clearShown){
    nextStageAttention=false;
    $('msg').classList.remove('show');
    svg.classList.remove('clear-pending','celebrating');
    svg.querySelectorAll('.clear-burst').forEach(el=>el.remove());
  }
  e.preventDefault();
  const p=toView(e);
  const grip=gripAt(p);
  if(!grip){rejectBoardGrab(e);return;}
  const tutorialStepData=isMode('tutorial')?TUTORIAL_STEPS[tutorialStep]:null;
  const tutorialMove=['grab','find','chain','chain-direction'].includes(tutorialStepData?.cue)?tutorialSolvingMoves()[0]:null;
  if(tutorialMove&&grip.ti!==tutorialMove.ti){rejectBoardGrab(e);return;}
  if(guidedBasicCandidateTis!==null&&!guidedBasicCandidateTis.has(grip.ti)){rejectBoardGrab(e);return;}
  if(usesHiddenRemaining()){
    resetFourthDistance();
    showRemaining(remainingForDisplay(SOLVER.dist[enc(ori)]));
  }
  const ti=grip.ti,t=grip.t,selectedTiles=new Set(t.cells.map(i=>tileEls[i]));
  // 最初の3問だけ対象の3体を見分けやすくし、それ以降は全員を見渡せるよう暗転しない。
  if(usesSwipeDimming())svg.classList.add('selecting');
  for(const i of t.cells) tileEls[i].classList.add('selected');
  cancelTutorialHint(true);
  if(tutorialMove){
    const soloSecondMove=tutorialStepData?.cue==='chain-direction'&&moves>0;
    if(soloSecondMove){
      $('gripPrompt').hidden=true;
    }else{
      $('gripPromptText').textContent=tutorialPrompt('turn');
      $('gripPrompt').hidden=false;
      if(!(tutorialStepData?.cue==='chain'&&moves>0)&&tutorialStepData?.cue!=='chain-direction')showHintArrow(tutorialMove.ti,tutorialMove.dir,false,true);
    }
  }
  baseTiles.forEach(el=>el.classList.toggle('selected',selectedTiles.has(el)));
  flashGrabbedTiles(t);
  cancelTileAnimations();
  const r=Math.hypot(p.x-t.x,p.y-t.y);
  const items=t.cells.map(from=>({
    from,el:tileEls[from],turn:spin[from],
    dx:CELL[from].x-t.x,dy:CELL[from].y-t.y
  }));
  drag={
    id:e.pointerId,ti,kc:t,items,rawDeg:0,deg:0,
    last:r>=MINR?Math.atan2(p.y-t.y,p.x-t.x):null,
    start:p,t0:performance.now(),tutorialReleaseCue:false
  };
  // 回す3体は他のパネルより手前に。ただし軸の点・持ち手・スワイプ中の点線より奥に留める。
  const frontMarker=svg.querySelector('.pivot');
  for(const item of items){ item.el.classList.add('selected'); svg.insertBefore(item.el,frontMarker); }
  svg.querySelector('.pivot[data-tri="'+ti+'"]').classList.add('active');
  svg.setPointerCapture(e.pointerId);
  svg.classList.add('spinning');
});
svg.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.id){
    if(!drag&&e.pointerType==='mouse')svg.classList.toggle('grip-hover',!!gripAt(toView(e)));
    // 棒をつかめていなくても、盤面上で始まったタッチならページスワイプに奪われないようにする。
    if(!drag&&boardTouchActive&&e.pointerType!=='mouse')e.preventDefault();
    return;
  }
  // touch-action:none が効かない一部のアプリ内ブラウザ向けに、ドラッグ中は明示的にスクロール等を止める。
  e.preventDefault();
  const p=toView(e), t=drag.kc;
  const dx=p.x-t.x, dy=p.y-t.y;
  if(Math.hypot(dx,dy)<MINR){ drag.last=null; return; }
  const a=Math.atan2(dy,dx);
  if(drag.last===null){ drag.last=a; return; }
  let d=a-drag.last;
  while(d>Math.PI) d-=2*Math.PI;
  while(d<-Math.PI) d+=2*Math.PI;
  drag.last=a;
  drag.rawDeg+=d*180/Math.PI;
  drag.deg=drag.rawDeg;
  // 5問目は、動かし始めたら「はなす位置を考える」案内に固定する。
  // 逆向きへ戻しても、案内や矢印を出し直さない。
  const tutorialCue=TUTORIAL_STEPS[tutorialStep]?.cue;
  if(isMode('tutorial')&&tutorialCue==='chain-direction'&&moves===0){
    if(!drag.tutorialStarted&&Math.abs(drag.rawDeg)>=3){
      drag.tutorialStarted=true;
      cancelTutorialHint(true);
      $('gripPromptText').textContent=tutorialPrompt('release');
      $('gripPrompt').hidden=false;
    }
  // 最初の補助輪では、正しい向きへ120°近く回せたときだけ「はなす」合図を出す。
  }else if(isMode('tutorial')&&(tutorialCue==='grab'||(tutorialCue==='chain'&&moves===0))){
    const expected=tutorialSolvingMoves()[0];
    const readyToRelease=!!expected&&drag.ti===expected.ti&&drag.rawDeg*expected.dir>=102;
    if(readyToRelease&&!drag.tutorialReleaseCue){
      drag.tutorialReleaseCue=true;
      // 120°まで回せたら、持ち手と矢印を片づけて「はなす」だけを伝える。
      cancelTutorialHint(true);
      $('gripPromptText').textContent=tutorialPrompt('release');
      $('gripPrompt').hidden=false;
    }else if(!readyToRelease&&drag.tutorialReleaseCue){
      // 角度を戻したら、離す合図を取り消してもう一度回す方向を示す。
      drag.tutorialReleaseCue=false;
      $('gripPromptText').textContent=tutorialPrompt('turn');
      $('gripPrompt').hidden=false;
      if(expected)showHintArrow(expected.ti,expected.dir,false,true);
    }
  }
  // 二周目は指が円周方向へ動き始めた時点で一手を確定し、120°まで自動で回す。
  if(usesSecondLapSwipe()){
    const startX=drag.start.x-t.x,startY=drag.start.y-t.y;
    const startR=Math.max(MINR,Math.hypot(startX,startY));
    const moveX=p.x-drag.start.x,moveY=p.y-drag.start.y;
    const tangential=(startX*moveY-startY*moveX)/startR;
    if(Math.abs(tangential)>=2.5||Math.abs(drag.rawDeg)>=3){
      const dir=tangential!==0?(tangential>0?1:-1):(drag.rawDeg>0?1:-1);
      drag.deg=dir*Math.max(3,Math.abs(drag.rawDeg));
      finishDrag(e,false,dir);
      return;
    }
  }
  const guideRays=svg.querySelector('.axis-guide .axis-rays');
  if(guideRays)guideRays.setAttribute('transform','rotate('+drag.deg+' '+t.x+' '+t.y+')');
  const previewTurns=visualTurns(drag.deg);
  showMoves(moves+(effectiveTurn(previewTurns)?1:0));
  const previewDir=effectiveTurn(previewTurns);
  const previewState=previewDir?rollOnce(ori,drag.ti,previewDir):ori;
  showRemaining(remainingForDisplay(SOLVER.dist[enc(previewState)]));
  for(const item of drag.items){
    item.el.style.transform=orbitTransform(item,drag.deg,t);
    previewWake(item,drag.deg);
  }
  applyBoardTheme();
});
svg.addEventListener('pointerleave',()=>{if(!drag)svg.classList.remove('grip-hover');});
function resumeTutorialCue(){
  if(isMode('tutorial')&&!isSolved())setTimeout(showTutorialCue,110);
}
function finishDrag(e,cancel=false,forcedTurns=null){
  if(!drag||(e&&e.pointerId!==drag.id)) return;
  const dg=drag; drag=null;boardTouchActive=false; clearAxisGuide(); svg.classList.remove('spinning');
  svg.classList.remove('selecting');
  for(const item of dg.items) item.el.classList.remove('selected');
  svg.querySelectorAll('.pivot.active').forEach(el=>el.classList.remove('active'));
  try{svg.releasePointerCapture(dg.id);}catch(_){}

  let turns=cancel?0:forcedTurns===null?Math.round(dg.deg/120):forcedTurns;
  if(forcedTurns===null&&!turns&&Math.abs(dg.deg)>=18&&performance.now()-dg.t0<320)
    turns=dg.deg>0?1:-1;
  const target=turns*120;
  const dir=effectiveTurn(turns);
  const waking=dir?dg.items.filter(item=>mod3(item.turn)!==0&&mod3(item.turn+dir)===0).map(item=>item.el):[];
  if(isMode('tutorial')&&dir&&!tutorialMoveAllowed(dg.ti,dir)){
    cancelTutorialHint(true);
    $('gripPromptText').textContent=tr(TUTORIAL_STEPS[tutorialStep]?.cue==='chain-direction'?'tutorialWrongPlacePrompt':'tutorialWrongPrompt');
    $('gripPrompt').hidden=false;
    animateTutorialRewind(dg,target,dir);
    return;
  }
  if(isMode('tutorial')&&!dir){
    paint();
    setTimeout(showTutorialCue,120);
    return;
  }
  if((isGuidedBasicStage()||isFallingRodStage())&&dir){
    const before=SOLVER.dist[enc(ori)];
    const after=SOLVER.dist[enc(rollOnce(ori,dg.ti,dir))];
    if(after!==before-1){
      const correctPlace=[1,-1].some(candidate=>SOLVER.dist[enc(rollOnce(ori,dg.ti,candidate))]===before-1);
      // 棒そのものが違った場合は、その棒を候補から落として同じ手の間は選べなくする
      // (消すのではなくグレーアウトして残すため、fallenRodTisにも記録しておく)。
      // guidedBasicCandidateTisは学園・速解き九番勝負では常に非nullなので、ここが実質的に
      // 「学園のどの場面でも、棒選択を間違えたらグレーアウトする」という統一ルールになる。
      if(!correctPlace&&guidedBasicCandidateTis){
        guidedBasicCandidateTis.delete(dg.ti);
        fallenRodTis.add(dg.ti);
      }
      // 棒は合っていたが向きが違った場合は、その棒が正解だと分かった合図として
      // 他の候補棒は全てグレーアウトし、残す棒を一本に絞る。
      if(correctPlace&&guidedBasicCandidateTis){
        for(const ti of guidedBasicCandidateTis){
          if(ti!==dg.ti)fallenRodTis.add(ti);
        }
        guidedBasicCandidateTis.clear();
        guidedBasicCandidateTis.add(dg.ti);
      }
      $('gripPromptText').textContent=tr(correctPlace?'assistedWrongDirection':'assistedWrongPlace');
      $('gripPrompt').hidden=false;
      animateGuidedBasicRewind(dg);
      return;
    }
  }
  if(forcedTurns!==null&&dir&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
    animateGroupedSwipe(dg,target,dir,waking);
    return;
  }
  if(dir) applySwipe(dg.ti,dir,!isMode('tutorial'));
  paint();
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){wakeFeedback(waking);resumeTutorialCue();return;}
  const delta=Math.abs(target-dg.deg);
  if(delta<.1){wakeFeedback(waking);resumeTutorialCue();return;}
  busy=true; let done=0;
  for(const item of dg.items){
    const a=item.el.animate([
      {transform:orbitTransform(item,dg.deg,dg.kc)},
      {transform:orbitTransform(item,target,dg.kc)}
    ],{duration:Math.max(190,Math.min(620,delta*4.65)),easing:'cubic-bezier(.2,.75,.25,1)'});
    a.onfinish=a.oncancel=()=>{ if(++done===3){busy=false;paint();wakeFeedback(waking);resumeTutorialCue();} };
  }
}
function animateTutorialRewind(dg,target,dir){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){paint();setTimeout(showTutorialCue,520);return;}
  busy=true;
  const duration=720;
  // 3枚を個別にanimate()すると僅かなずれでばらばらに見えるため、1つのgroupへ一時的に
  // まとめて入れ、group側の回転を1つだけ再生することで常に揃って動くようにする。
  const NS_='http://www.w3.org/2000/svg';
  const group=document.createElementNS(NS_,'g');
  group.setAttribute('class','auto-swipe-group');
  svg.appendChild(group);
  // 元のDOM位置(水色の棒より前)を覚えておき、終了後に同じ位置へ戻す。末尾に付け直すと
  // 棒(grip-marker)より後ろになってしまい、棒が裏に隠れて見えなくなるため。
  const domOrder=[...svg.children];
  const sortedItems=[...dg.items].sort((a,b)=>domOrder.indexOf(a.el)-domOrder.indexOf(b.el));
  const restoreAnchor=sortedItems[sortedItems.length-1].el.nextSibling;
  for(const item of dg.items){
    item.el.style.transform=orbitTransform(item,0,dg.kc);
    group.appendChild(item.el);
  }
  setTimeout(()=>{
    if(!isMode('tutorial'))return;
    for(const item of dg.items)item.el.setAttribute('class','tile '+(mod3(item.turn+dir)===0?'stand':'fallen'));
    applyBoardTheme();haptic(6);
  },245);
  setTimeout(()=>{
    if(!isMode('tutorial'))return;
    for(const item of dg.items)item.el.setAttribute('class','tile '+(mod3(item.turn)===0?'stand':'fallen'));
    applyBoardTheme();
  },440);
  group.style.transformOrigin=dg.kc.x+'px '+dg.kc.y+'px';
  const animation=group.animate([
    {transform:'rotate('+dg.deg+'deg)',offset:0},
    {transform:'rotate('+target+'deg)',offset:.36},
    {transform:'rotate('+target+'deg)',offset:.56},
    {transform:'rotate(0deg)',offset:1}
  ],{duration,easing:'cubic-bezier(.2,.72,.24,1)'});
  animation.onfinish=animation.oncancel=()=>{
    for(const item of sortedItems){
      svg.insertBefore(item.el,restoreAnchor);
      item.el.style.transform='';
    }
    group.remove();
    busy=false;paint();setTimeout(showTutorialCue,150);
  };
}
function animateGuidedBasicRewind(dg){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){
    paint();haptic(8);return;
  }
  busy=true;
  svg.classList.add('spinning'); // 巻き戻り中は水色の棒を隠し、戻り切ってから復活させる。
  const duration=680;
  // 間違いの向きへぴったり120度まで揃えてから戻すのではなく、離した角度から直接0度へ戻す。
  // 表情・パネル色は、ドラッグ中の実際の表示(previewWake)と同じ角度基準の式で切り替える。
  const NS_='http://www.w3.org/2000/svg';
  const group=document.createElementNS(NS_,'g');
  group.setAttribute('class','auto-swipe-group');
  const clones=dg.items.map(item=>{
    const clone=item.el.cloneNode(true);
    clone.style.transform=orbitTransform(item,0,dg.kc);
    item.el.style.visibility='hidden';
    group.appendChild(clone);
    return {item,clone,hex:clone.querySelector('.hex')};
  });
  svg.appendChild(group);
  haptic(8);
  let start=null;
  const ease=t=>1-Math.pow(1-t,3);
  const frame=now=>{
    if(start===null)start=now;
    const progress=Math.min(1,(now-start)/duration);
    const deg=dg.deg*(1-ease(progress));
    group.setAttribute('transform','rotate('+deg+' '+dg.kc.x+' '+dg.kc.y+')');
    for(const{item,clone,hex} of clones){
      let angle=(item.turn*120+deg)%360;
      if(angle>180)angle-=360;
      if(angle<-180)angle+=360;
      const state=Math.abs(angle)<=22?'stand':'fallen';
      clone.setAttribute('class','tile '+state);
      if(hex){
        const tone=BOARD_THEME_TONES[boardTheme]?.[state];
        hex.style.fill=tone?.fill||'';
        hex.style.stroke=tone?.stroke||'';
      }
    }
    if(progress<1){requestAnimationFrame(frame);return;}
    for(const{item} of clones)item.el.style.visibility='';
    group.remove();
    busy=false;svg.classList.remove('spinning');paint();
    setTimeout(()=>{if(isAssistedLearningStage()||isFallingRodStage())$('gripPrompt').hidden=true;},450);
  };
  requestAnimationFrame(frame);
}
svg.addEventListener('pointerup',e=>{if(!clearInvalidGrab(e))finishDrag(e);});
svg.addEventListener('pointercancel',e=>{if(!clearInvalidGrab(e))finishDrag(e,true);});
// pointermoveのpreventDefault()だけではスワイプ操作を吸収しきれないアプリ内ブラウザ(LINE等の
// WebView)向けに、生のtouchmoveでも盤面ドラッグ中だけ明示的に止める。passive:falseが必須。
svg.addEventListener('touchmove',e=>{if(boardTouchActive)e.preventDefault();},{passive:false});

$('undo').addEventListener('click',()=>{
  if(busy||isFinalMasterPuzzle()||!history.length) return;
  cancelTileAnimations();
  clearTimeout(clearTimer); clearShown=false;
  $('clearNext').hidden=true;
  svg.classList.remove('clear-pending','celebrating');
  const h=history.pop();
  if(isFourthVolume()&&!fourthChecksPersist())fourthChecksUsed=0;
  if(usesHiddenRemaining())resetFourthDistance();
  $('msg').classList.remove('show');
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){
    replaceBoardState({ori:h.o,spin:h.s,tiles:h.t,moves:h.m},{paintNow:true});
    if(isMode('speed')&&speedSession)saveSpeedSession();
  }else{
    animateUndoSwipe(h);
    // アニメーション完了後の盤面を保存する。
    if(isMode('speed')&&speedSession)setTimeout(saveSpeedSession,460);
  }
});
$('reset').addEventListener('click',()=>{
  if(busy)return;
  if(editingBoard){resetMakerBoard();return;}
  restartWithAnimation();
  if(!isMode('free')&&!isMode('custom')&&!isMode('mastery')&&stageIndex===0&&!hasMasterReward())
    setTimeout(scheduleStageOneTutorial,500);
});
$('tutorialReset').addEventListener('click',()=>{
  if(busy||!isMode('tutorial'))return;
  // 補助輪中のリセットは、練習問題の途中ではなく「はじめる」からやり直す。
  clearTimeout(tutorialAdvanceTimer);
  cancelTutorialHint();
  tutorialStep=0;
  storage.remove(STORAGE_KEYS.tutorialStep);
  storage.remove(STORAGE_KEYS.introSeen);
  loadTutorialStep(0);
  openIntroGuide();
});
$('shuffle').addEventListener('click',()=>{
  if(!busy&&isMode('free'))startFree();
});

const GameBoard=Object.freeze({
  repaint:()=>paint(),
  reset:(state,par)=>setPosition(state,par)
});
