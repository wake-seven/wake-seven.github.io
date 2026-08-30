// ===== 盤面ジオメトリ定数 =====
const R=54, W=Math.sqrt(3)*R, H=1.5*R, OX=66.77, OY=74;
const CELL=[[0.5,0],[1.5,0],[0,1],[1,1],[2,1],[0.5,2],[1.5,2]]
  .map(([cx,ry])=>({x:OX+cx*W, y:OY+ry*H}));
const N=7;

/* 3枚が互いに隣り合う組（＝三角形）を座標から求め、時計回りに並べる */
const TRI=(()=>{
  const near=(a,b)=>Math.abs(Math.hypot(CELL[a].x-CELL[b].x,CELL[a].y-CELL[b].y)-W)<2;
  const out=[];
  for(let a=0;a<N;a++)for(let b=a+1;b<N;b++)for(let c=b+1;c<N;c++)
    if(near(a,b)&&near(b,c)&&near(a,c)){
      const cx=(CELL[a].x+CELL[b].x+CELL[c].x)/3, cy=(CELL[a].y+CELL[b].y+CELL[c].y)/3;
      const t=[a,b,c].sort((p,q)=>Math.atan2(CELL[p].y-cy,CELL[p].x-cx)-Math.atan2(CELL[q].y-cy,CELL[q].x-cx));
      out.push({cells:t,x:cx,y:cy});
    }
  return out;
})();
function makeBoardPermutation(angleDeg=0,mirror=false){
  const center=CELL[3], q=angleDeg*Math.PI/180, co=Math.cos(q), si=Math.sin(q);
  return CELL.map(p=>{
    let x=p.x-center.x,y=p.y-center.y;
    if(mirror)x=-x;
    const tx=center.x+x*co-y*si,ty=center.y+x*si+y*co;
    let bestIndex=0,bestDistance=Infinity;
    CELL.forEach((target,i)=>{
      const d=Math.hypot(tx-target.x,ty-target.y);
      if(d<bestDistance){bestDistance=d;bestIndex=i;}
    });
    return bestIndex;
  });
}
const VIEW_ROTATE_60=makeBoardPermutation(60);
const VIEW_ROTATE_MINUS60=makeBoardPermutation(-60);
const VIEW_MIRROR=makeBoardPermutation(0,true);
const VIEW_FLIP_VERTICAL=makeBoardPermutation(180,true);
// 縦配置は盤を30°左へ傾けているため、画面上の水平・垂直に見える反転軸を補正する。
const VIEW_TILTED_MIRROR=makeBoardPermutation(60,true);
const VIEW_TILTED_FLIP_VERTICAL=makeBoardPermutation(-120,true);
// 速解きは、悟り一周目の盤面を60°左へ回した見え方で統一する。
const SPEED_BOARD_VIEW={permutation:VIEW_ROTATE_MINUS60,flip:false};

/* ---- 全探索ソルバ（向き3値・7マス = 3進7桁） ---- */
// ===== ソルバーコア =====
const P3=[1,3,9,27,81,243,729], NS=2187;
const enc=o=>{let n=0;for(let i=0;i<N;i++)n+=o[i]*P3[i];return n;};
const dec=n=>{const a=new Uint8Array(N);for(let i=0;i<N;i++){a[i]=n%3;n=(n/3)|0;}return a;};
function swipeOnce(o,ti,dir){
  const t=Uint8Array.from(o), c=TRI[ti].cells;
  for(let i=0;i<3;i++){
    const f=dir>0?c[i]:c[(i+1)%3], to=dir>0?c[(i+1)%3]:c[i];
    t[to]=o[f];
  }
  return t;
}
function clickOnce(o,ti,dir=1){
  const t=Uint8Array.from(o);
  for(const i of TRI[ti].cells) t[i]=(t[i]+dir+3)%3;
  return t;
}
function rollOnce(o,ti,dir){
  const t=Uint8Array.from(o), c=TRI[ti].cells;
  for(let i=0;i<3;i++){
    const f=dir>0?c[i]:c[(i+1)%3], to=dir>0?c[(i+1)%3]:c[i];
    t[to]=(o[f]+(dir>0?1:2))%3;
  }
  return t;
}
function centerOnce(o,dir=1){
  const t=Uint8Array.from(o); t[3]=(t[3]+dir+3)%3; return t;
}
function buildSolver(kind){
  const dist=new Uint8Array(NS).fill(255), byDepth=[];
  let fr=[0]; dist[0]=0; byDepth.push([0]);
  let d=0;
  while(fr.length){
    const nx=[];
    for(const s of fr){ const a=dec(s);
      for(let ti=0;ti<TRI.length;ti++){
        if(kind==='triple'){
          const clicked=enc(clickOnce(a,ti,-1));
          if(dist[clicked]===255){ dist[clicked]=d+1; nx.push(clicked); }
        }else if(kind==='roll'){
          for(const dir of [1,-1]){
            const rolled=enc(rollOnce(a,ti,dir));
            if(dist[rolled]===255){ dist[rolled]=d+1; nx.push(rolled); }
          }
        }
        if(kind!=='roll') for(const dir of [1,-1]){
          const n=enc(swipeOnce(a,ti,dir));
          if(dist[n]===255){ dist[n]=d+1; nx.push(n); }
        }
      }
      if(kind==='center'){
        const clicked=enc(centerOnce(a,-1));
        if(dist[clicked]===255){ dist[clicked]=d+1; nx.push(clicked); }
      }
    }
    if(nx.length) byDepth.push(nx);
    fr=nx; d++;
  }
  return {dist,byDepth};
}
const SOLVER=buildSolver('roll');
const INTRO_STAGE_COUNT=3;
const BASIC_STAGE_COUNT=9;
const BASIC_STAGE_START=INTRO_STAGE_COUNT;
// 発展クラス: 3くるり5問+4くるり3問。補助なし2くるりはだるま修行・上巻で扱う
// (修行の入口にする方が学習導線として自然なため)。
const DEVELOPMENT_THREE_COUNT=5;
const DEVELOPMENT_FOUR_COUNT=3;
const DEVELOPMENT_STAGE_COUNT=DEVELOPMENT_THREE_COUNT+DEVELOPMENT_FOUR_COUNT;
const DEVELOPMENT_STAGE_START=BASIC_STAGE_START+BASIC_STAGE_COUNT;
const ACADEMY_STAGE_COUNT=DEVELOPMENT_STAGE_START+DEVELOPMENT_STAGE_COUNT;
const TRAINING_STAGE_START=ACADEMY_STAGE_COUNT;
// だるま修行: 上巻=2くるり9(補助なし)/中巻=3くるり9(補助なし)/下巻=4くるり9(補助なし)。
const TRAINING_UPPER_COUNT=9;
const TRAINING_MIDDLE_COUNT=9;
const TRAINING_LOWER_COUNT=9;
const TRAINING_STAGE_COUNT=TRAINING_UPPER_COUNT+TRAINING_MIDDLE_COUNT+TRAINING_LOWER_COUNT;
const MASTER_VOLUME_SIZE=15;
// ===== ステージデータ構築パイプライン =====
// 不可分ブロック: STAGES → ... → SATORI_STAGES の連鎖。STAGES.push/EXTRA_STAGES.push による
// 2回のin-place mutationを含む厳密な順序依存ブロックのため、内部の並び替え禁止。
const STAGES=[
  // 入門
  { state:31, par:1 },
  { state:558, par:1 },
  { state:837, par:1 },
  // 基本
  { state:1732, par:2 },
  { state:922, par:2 },
  { state:526, par:2 },
  { state:1516, par:2 },
  { state:544, par:2 },
  { state:196, par:2 },
  { state:76, par:2 },
  { state:57, par:2 },
  { state:7, par:2 }
];
// 本編へ入る前の補助輪付き3問。最短1手盤面のうち、本編の入門とは別の向きを使う。
const tutorialCandidates=SOLVER.byDepth[1].filter(state=>!STAGES.slice(0,3).some(stage=>stage.state===state));
const tutorialPool=tutorialCandidates.length>=3?tutorialCandidates:SOLVER.byDepth[1];
// 3問目は画面右下の三枚を、逆向き(-1)に回す盤面に固定する。
// 条件(この棒・この向きで最短1手)を満たす盤面は本編の入門3問目と同じ1つしかないため、
// ここだけは例外的に本編と同じ盤面を使う。
const tutorialRightLowerTri=TRI.findIndex(t=>t.cells.length===3&&t.cells.includes(3)&&t.cells.includes(4)&&t.cells.includes(6));
const tutorialSecondState=SOLVER.byDepth[1].find(state=>{
  const board=dec(state);
  return tutorialRightLowerTri>=0&&SOLVER.dist[enc(rollOnce(board,tutorialRightLowerTri,-1))]===0;
})??tutorialPool[Math.floor(tutorialPool.length/2)];
const tutorialTwoStepState=SOLVER.byDepth[2][0];
// 最短2手の九パターンのうち、寝た五体が台形に並ぶ型。
const TUTORIAL_TRAPEZOID_VIEW={permutation:makeBoardPermutation(120,true),flip:true};
// 上方の棒を回すと指が下の盤面を隠して見にくいため、下半分の棒になるようもう一段回転させる。
const TUTORIAL_TRAPEZOID_FIX_VIEW={permutation:makeBoardPermutation(120),flip:false};
const tutorialTrapezoidState=transformStateBySymmetry(transformStateBySymmetry(STAGES[4].state,TUTORIAL_TRAPEZOID_VIEW),TUTORIAL_TRAPEZOID_FIX_VIEW);
// 案内メッセージは常に上部に置くため、回す対象が上半分に来る問題だけ回転して下半分へ寄せる。
const TUTORIAL_LOWER_VIEW={permutation:makeBoardPermutation(-120),flip:false};
// 4問目(chain)は、下中央の棒を右向きに回す配置だと右手スワイプの指で矢印が隠れてしまうため、
// 下半分のうち左側の棒になるよう別の向きを使う。
const TUTORIAL_CHAIN_VIEW={permutation:makeBoardPermutation(180,true),flip:true};
const TUTORIAL_STEPS=[
  {state:transformStateBySymmetry(tutorialPool[0],TUTORIAL_LOWER_VIEW),par:1,cue:'grab'},
  {state:tutorialPool[tutorialPool.length-1],par:1,cue:'grab'},
  {state:tutorialSecondState,par:1,cue:'find'},
  {state:transformStateBySymmetry(tutorialTwoStepState,TUTORIAL_CHAIN_VIEW),par:2,cue:'chain'},
  {state:tutorialTrapezoidState,par:2,cue:'chain-direction'}
];
// 一覧・解説は、比較しやすい基準の向きを保つ。
const TWO_MOVE_STAGES=STAGES.filter(stage=>stage.par===2).map(stage=>({...stage}));
// 基本編とだるま修行・上巻は、9つの型を単に並べるのではなく、二つの原理を段階的に覚える順。
// 先頭5問は「外側の寝た2枚へ1枚を合わせる」、後半4問はその逆を学ぶ。
// TWO_MOVE_STAGES 自体は一覧・解説の基準順なので、ここでは触らない。
const BASIC_LESSON_PATTERN_ORDER=[1,3,2,4,0,5,6,8,7];
BASIC_LESSON_PATTERN_ORDER.forEach((patternIndex,lessonIndex)=>{
  STAGES[lessonIndex+3]={...TWO_MOVE_STAGES[patternIndex]};
});
// だるま修行・上巻の開始時に見せる「こんな形が登場するよ」用: TWO_MOVE_TIP3_SHAPES(後方で定義)の
// 6種類それぞれの代表出題順(初出位置)から、実際の盤面状態を引く。
const TRAINING_UPPER_GOAL_SHAPES=['Trapezoid','Caterpillar','Ribbon','Diamond','OuterNeighbor','CenterOuter'];
const TRAINING_UPPER_GOAL_POSITIONS=[1,2,5,6,8,9];
const TRAINING_UPPER_GOAL_STATES=TRAINING_UPPER_GOAL_POSITIONS.map(p=>TWO_MOVE_STAGES[BASIC_LESSON_PATTERN_ORDER[p-1]].state);
// 覚えやすい順。番号は TWO_MOVE_STAGES 内での元の並び順（1 始まり）。
const TWO_MOVE_PATTERN_ORDER=[7,6,5,4,3,8,0,2,1];
const TWO_MOVE_PATTERN_POSITION=Object.fromEntries(TWO_MOVE_PATTERN_ORDER.map((pattern,position)=>[pattern,position+1]));
const TWO_MOVE_CLEAR_MESSAGE_KEYS={
  1:'twoMoveDiscovery1',
  2:'twoMoveDiscovery23',3:'twoMoveDiscovery23',
  4:'twoMoveDiscovery45',5:'twoMoveDiscovery45',
  6:'twoMoveDiscovery6',
  7:'twoMoveDiscovery7',
  8:'twoMoveDiscovery89',9:'twoMoveDiscovery89'
};
const CLEAR_CONTENT={
  // 入門
  academy1_1:{tip:{ja:'水色の棒のあたりをタップしてスワイプすると、3体を回しやすいよ。',en:'Start your swipe near a blue handle to turn the three daruma more easily.',zh:'从浅蓝色短条附近开始滑动，会更容易转动三个不倒翁。',ko:'하늘색 막대 근처에서 스와이프하면 세 다루마를 더 쉽게 돌릴 수 있어요.'},art:'introGuide'},
  academy1_2:{tip:{ja:'ゲームを中断して閉じても、今やっている問題から再開できます。',en:'Even after reloading, you can resume from the puzzle you were playing.',zh:'重新加载后，也会从正在玩的关卡继续。',ko:'새로고침해도 방금 하던 문제부터 다시 시작할 수 있어요.'}},
  // 基本
  academy2_1:{tip:{ja:'「あと ○くるり」を見ると、今の盤面からあと何回で全員を起こせるかわかります。',en:'“Left ○ turns” tells you the fewest turns needed to wake everyone from the current board.',zh:'“还差○转”表示从当前棋盘叫醒全部不倒翁最少还要转几次。',ko:'“앞으로 ○번”을 보면 현재 보드에서 모두 깨우기까지 최소 몇 번 남았는지 알 수 있어요.'},art:'remaining'},
  academy2_3:{tip:{ja:'「だるまさんがころんだ」遊びの由来は比較的新しい可能性もあり、明治生まれの人々の記憶のなかには無いという話もあります。',en:'The origin of “Daruma-san ga koronda” has several theories; it may be a relatively new folk game.',zh:'“不倒翁倒了”的由来众说纷纭，也有人认为它是较新的民间游戏。',ko:'“다루마상이 넘어졌다”의 유래에는 여러 설이 있으며 비교적 새 민속놀이일 수도 있습니다.'},art:'theories'},
  academy2_4:{tip:{ja:'回転したら3体のだるまがどの向きになるか、想像しながら回してみよう。',en:'Before you turn, try to picture which way the three daruma will face.',zh:'转动前，试着想象三个不倒翁会朝向哪里。',ko:'돌리기 전에 세 다루마가 어느 방향을 볼지 상상해 보세요.'}},
  academy2_6:{tip:{ja:'高崎だるまは、群馬県ふるさと伝統工芸品に指定されています。1859年に赤い顔料が輸入されると、だるまづくりは盛んになりました。',en:'Takasaki daruma are designated Gunma traditional crafts. Production flourished after red pigment began to be imported in 1859.',zh:'高崎不倒翁被指定为群马县传统工艺品。1859年红色颜料开始进口后，高崎不倒翁的制作兴盛起来。',ko:'다카사키 다루마는 군마현 전통 공예품으로 지정되어 있습니다. 1859년 붉은 안료가 수입되며 제작도 활발해졌습니다.'},art:'craft'},
  academy2_8:{art:'red',quiz:{ja:{q:'だるまの赤は、何を表す色？',a:['まよけや生命力','お祝いごとの華やかさ','火のあたたかさ','秋のもみじ'],correct:0,note:'だるまの赤は、まよけや生命力を表す色です。'},en:{q:'What does daruma red represent?',a:['Protection and vitality','Celebration','The warmth of fire','Autumn leaves'],correct:0,note:'Daruma red represents protection and vitality.'},zh:{q:'不倒翁的红色象征什么？',a:['避邪与生命力','喜庆热闹','火的温暖','秋天的红叶'],correct:0,note:'不倒翁的红色象征避邪与生命力。'},ko:{q:'다루마의 붉은색은 무엇을 뜻할까?',a:['액막이와 생명력','축하의 화려함','불의 따뜻함','가을 단풍'],correct:0,note:'다루마의 붉은색은 액막이와 생명력을 뜻합니다.'}}},
  // 発展
  academy3_6before:{dialog:'developmentFourStart'},
  // だるま修行・上巻
  training1_2:{tip:{ja:'「やり直す」ボタンで盤面を最初に戻せます\n「1手戻す」ボタンで一つ前の手に戻れます',en:'Restart returns to the starting board. Undo takes back your last move.',zh:'“重新开始”会回到初始棋盘。“撤销一步”会回到上一步。',ko:'다시 시작은 처음 보드로 돌아갑니다. 한 수 되돌리기는 바로 전 수로 돌아갑니다.'},art:'controls'},
  training1_5:{tip:{ja:'次からは、後半の基本問題です。',en:'The next puzzles introduce the second basic idea.',zh:'从下一题开始，进入后半段基本问题。',ko:'다음 문제부터는 후반 기본 문제입니다.'},art:'twoMoveLessonTwo'},
  training1_7:{tip:{ja:'一度クリアした問題は、「← 前へ」「次へ →」と、その真ん中のボタンでいつでも戻れます。',en:'Use Previous, Next, or the button between them to revisit cleared puzzles at any time.',zh:'已通过的关卡可随时用“上一题”“下一题”或中间的按钮返回。',ko:'성공한 문제는 이전, 다음 또는 그 사이의 버튼으로 언제든 다시 갈 수 있어요.'},art:'navigation'},
  training1_9:{tip:{ja:'次からは、最短3くるりの問題です。',en:'The next puzzles take three turns.',zh:'接下来是最少3转的问题。',ko:'다음부터는 최단 3번 문제입니다.'}},
  // だるま学園卒業→だるま修行の間に挟む案内ダイアログ。stageIndexで言えばacademy3_8とtraining1_1の境目。
  training1_1before:{dialog:'trainingWelcome'},
  // 上巻完了→中巻開始の間に挟む案内ダイアログ。
  training2_1before:{dialog:'trainingMiddleSpin'},
  training3_1before:{dialog:'trainingLowerGoal'},
  training3_1:{tip:{ja:'だるまは縁起物なので、お菓子もいろんな種類があります。特に「だるま最中」が定番ですね。',en:'As lucky charms, daruma also appear in many kinds of sweets. Daruma-shaped monaka are especially classic.',zh:'不倒翁是吉祥物，也有许多点心。达摩形最中尤其经典。',ko:'다루마는 길상물이라 여러 과자가 있어요. 다루마 모나카가 특히 대표적입니다.'},art:'monaka'},
  training3_2:{art:'menuButtons'},
  training3_8:{tip:{ja:'突破まであと一歩！\nメニューから、フリーモードや盤面を自分でつくるモードでも遊べます。',en:'Just one more step to a breakthrough!\nThe Menu also has Free Play and a mode for making your own board.',zh:'距离突破只差一步！\n菜单中还有自由模式和自己制作棋盘的模式。',ko:'돌파까지 이제 한 걸음!\n메뉴에는 자유 모드와 직접 보드를 만드는 모드도 있어요.'}},
  training3_9:{tip:{ja:'だるま修行を終え、名人への道が開かれました。\n制覇の先には、名人だけのささやかなご褒美も。',en:'The Path to Mastery is now open.\nA small reward awaits true masters.',zh:'名人之路现已开启。\n真正的名人还有一份小小奖励。',ko:'명인의 길이 열렸습니다.\n명인만을 위한 작은 보상도 기다립니다.'}},
  // 名人への道・序
  mastery1_1:{tip:{ja:'七転八起（しちてんはっき）は、何度倒れても起き上がることのたとえです。七転び八起きとも言いますね。難しくてもあきらめないで！',en:'“Fall down seven times, get up eight” means never giving up.',zh:'“七转八起”比喻无论跌倒多少次都要重新站起来。',ko:'“일곱 번 넘어져도 여덟 번 일어난다”는 포기하지 않는다는 뜻입니다.'},art:'rise'},
  mastery1_2:{tip:{ja:'この7枚の配置のだるま起こしでは、最短4手以内に必ずクリアできる仕組みになっています。',en:'Every arrangement of these seven daruma can be solved in four moves or fewer.',zh:'这七个不倒翁的任何布局，都一定能在最少4步以内完成。',ko:'이 7개 다루마의 모든 배치는 반드시 최단 4수 이내에 풀 수 있도록 되어 있어요.'}},
  mastery1_3:{tip:{ja:'左上の称号をタップすると、集めた称号が見られます。がんばってクリアして集めよう。',en:'Tap the title at top left to view the titles you have collected. Clear puzzles to earn them all!',zh:'点击左上角的称号，即可查看已收集的称号。努力通关，把它们都收集起来吧！',ko:'왼쪽 위의 칭호를 누르면 모은 칭호를 한눈에 볼 수 있어요. 열심히 클리어해서 모두 모아 보세요!'},art:'rankBadgeArt',link:'rank'},
  mastery1_4:{tip:{ja:'攻略のカギは、最短2手の盤面を見分けられるようになることです。終盤では残り最短手数が表示されないので、少しずつ身につけよう。',en:'Volume 4 does not show moves left. Start building an eye for two-move boards now.',zh:'第四卷不会显示剩余最少步数。现在就开始培养识别最少2步棋盘的感觉吧。',ko:'4권에서는 남은 최단 수가 표시되지 않습니다. 지금부터 최단 2수 보드를 알아보는 감각을 길러 보세요.'},link:'patterns'},
  mastery1_5:{twoMoveCard:7},
  mastery1_6:{quiz:{ja:{q:'新しいだるまを迎える時期として多いのは？',a:['お正月ごろ','夏休み','お盆','ハロウィン'],correct:0,note:'年末年始の初詣やだるま市で、願いを込めて新しいだるまを迎える人が多いです。'},en:{q:'When do people often welcome a new daruma?',a:['Around New Year','During summer vacation','During Obon','At Halloween'],correct:0,note:'Many people welcome a new daruma with a wish at New Year shrine visits or daruma fairs.'},zh:{q:'人们常在什么时候迎来新的不倒翁？',a:['新年期间','暑假','盂兰盆节','万圣节'],correct:0,note:'许多人会在年末年初的初诣或不倒翁市集，带着愿望迎来新的不倒翁。'},ko:{q:'새 다루마를 맞이하는 시기로 많은 때는?',a:['새해 무렵','여름방학','오봉','할로윈'],correct:0,note:'많은 사람이 연말연시의 하쓰모데나 다루마 시장에서 소원을 담아 새 다루마를 맞이합니다.'}}},
  mastery1_7:{tip:{ja:'「だるまさんがころんだ」は10文字。10まで数える代わりの言葉として使われてきました。',en:'“Daruma-san ga koronda” has ten syllables, used in place of counting to ten.',zh:'“不倒翁倒了”有十个音节，常用来代替数到十。',ko:'“다루마상이 넘어졌다”는 열 음절로, 열까지 세는 대신 쓰였습니다.'},art:'count'},
  mastery1_8:{twoMoveCard:6},
  mastery1_9:{tip:{ja:'もう一度見たいクリア後メッセージは、メニューからいつでも見られます。',en:'You can revisit any clear message from the Menu.',zh:'想再看的通关后消息，随时可以从菜单中查看。',ko:'다시 보고 싶은 클리어 메시지는 메뉴에서 언제든 볼 수 있어요.'},link:'messages'},
  mastery1_10:{twoMoveCard:5},
  mastery1_11:{boardQuiz:{kind:'moves',pattern:1}},
  mastery1_12:{quiz:{ja:{q:'だるまのモデルになったお坊さんの名前は？',a:['空海','達磨大師','行基','一休'],correct:1,note:'インドから中国へ渡ったと伝えられる達磨大師。5〜6世紀ごろの人物で、その教えは後に日本の禅へ受け継がれました。'},en:{q:'What is the name of the monk who inspired the daruma?',a:['Kūkai','Bodhidharma','Gyōki','Ikkyū'],correct:1,note:'Bodhidharma is traditionally said to have travelled from India to China. He lived around the fifth to sixth centuries, and his teachings later influenced Japanese Zen.'},zh:{q:'不倒翁的原型是哪位僧人？',a:['空海','达摩大师','行基','一休'],correct:1,note:'相传达摩大师从印度来到中国。他生活在约5～6世纪，他的教法后来传入日本禅宗。'},ko:{q:'다루마의 모델이 된 스님의 이름은?',a:['구카이','달마대사','교키','잇큐'],correct:1,note:'달마대사는 인도에서 중국으로 건너왔다고 전해집니다. 5~6세기 무렵의 인물이며, 그의 가르침은 훗날 일본 선종으로 이어졌어요.'}}},
  mastery1_13:{tip:{ja:'「だるまさんがころんだ」以外の10の数え方として、地域によっては「へいたいさんがとおる」など、別の唱え言葉もありました。',en:'Other regions used different counting chants, such as “Heitai-san ga tōru.”',zh:'不同地区也有其他数数口令，例如“士兵先生走过”。',ko:'지역에 따라 다른 세기 구호도 있었어요. 예: “헤이타이상이 지난다.”'},art:'chants'},
  mastery1_14:{tip:{ja:'高崎だるまのお腹には、「福入」と書かれることがあります。福が入るようにという願いです。',en:'Takasaki daruma sometimes carry the words “Fuku-iri” — a wish for good fortune to enter.',zh:'高崎不倒翁的腹部有时写着“福入”，寓意福气进入。',ko:'다카사키 다루마의 배에는 복이 들어오라는 뜻의 “후쿠이리”가 쓰이기도 합니다.'},art:'fuku'},
  // 名人への道・破
  mastery2_1:{tip:{ja:'達磨大師（だるまだいし）が9年座禅を続けたという伝説があり、これを面壁九年（めんぺきくねん）と言います。この伝説にちなみ、だるまは手足のない姿に描かれます。',en:'Legend says Bodhidharma meditated for nine years. This is called “nine years facing a wall,” and it inspired the limbless daruma form.',zh:'传说达摩大师面壁坐禅九年，称为“面壁九年”。不倒翁没有手脚的样子便来自这个传说。',ko:'달마대사가 9년 동안 좌선했다는 전설을 면벽구년이라고 합니다. 다루마가 손발 없는 모습으로 그려지는 것은 이 전설에서 비롯되었습니다.'},art:'legend'},
  mastery2_2:{twoMoveCard:4},
  mastery2_3:{tip:{ja:'反転と回転で向きを変えて、覚えた盤面と同じかどうか確かめてみよう。',en:'Use Mirror and Rotate 60° in the list to check whether boards are the same pattern.',zh:'在列表中使用“左右翻转”和“旋转60°”，可以确认棋盘是否是同一种图案。',ko:'목록의 좌우 반전과 60° 회전으로 같은 보드 패턴인지 확인할 수 있어요.'}},
  mastery2_4:{boardQuiz:{kind:'choose',pattern:2,topic:'diamond',correct:1}},
  mastery2_5:{twoMoveCard:3},
  mastery2_6:{quiz:{ja:{q:'「七転び八起き」、起きる回数が1回多いのはなぜ？',a:['縁起をかつぐため','最初に起き上がるぶんを数えるから','数え間違い','八が末広がりだから'],correct:1,note:'諸説ありますが、生まれたときに起き上がる1回を足す、という説がよく知られています。'},en:{q:'Why does “fall seven times, rise eight” have one more rise?',a:['For good luck','It counts the first time one rises','A counting mistake','Because eight widens at the end'],correct:1,note:'There are several theories. A familiar one counts the first time a person rises when they are born.'},zh:{q:'“七转八起”为什么起身次数多一次？',a:['为了讨吉利','把出生后第一次站起也算进去','数错了','八字末尾张开'],correct:1,note:'有多种说法。其中一种常见说法是，把出生时第一次站起也算进去。'},ko:{q:'“일곱 번 넘어져도 여덟 번 일어난다”에서 일어나는 횟수가 하나 더 많은 이유는?',a:['복을 빌기 위해서','처음 일어나는 것도 세기 때문에','숫자를 잘못 세서','8이 끝에서 넓어지기 때문에'],correct:1,note:'여러 설이 있습니다. 태어날 때 처음 일어나는 한 번을 더한다는 설이 잘 알려져 있어요.'}}},
  mastery2_7:{twoMoveCard:8},
  mastery2_8:{tip:{ja:'高崎だるまの顔は、眉毛が鶴、ヒゲが亀を表すように描かれます。「縁起だるま」「福だるま」とも呼ばれます。',en:'Takasaki daruma feature cranes and turtles, and are also called lucky daruma.',zh:'高崎不倒翁的脸上画有鹤和龟，也被称作吉祥不倒翁。',ko:'다카사키 다루마의 얼굴에는 학과 거북이 그려져 있어 복 다루마라고도 합니다.'},art:'crane'},
  mastery2_9:{tip:{ja:'メニューの「攻略のコツ」では、特徴的な形を図解で見られます。',en:'Open “Quick tips” from the Menu to see illustrated characteristic shapes.',zh:'菜单的“攻略提示”中可以查看具有代表性的形状图解。',ko:'메뉴의 “공략 팁”에서 특징적인 모양을 그림으로 볼 수 있어요.'},link:'tips'},
  mastery2_10:{tip:{ja:'「棚から落ちた達磨」は、威張っていた人が落ち目になり、格好がつかなくなるたとえです。',en:'“A daruma fallen from a shelf” compares someone once proud who has fallen on hard times and looks foolish.',zh:'“从架子上掉下来的不倒翁”比喻曾经趾高气扬的人失势后难看的样子。',ko:'“선반에서 떨어진 다루마”는 으스대던 사람이 몰락해 체면을 구긴 모습을 비유합니다.'},art:'shelfFall'},
  mastery2_11:{boardQuiz:{kind:'choose',pattern:4,topic:'caterpillar',correct:0}},
  mastery2_12:{tip:{ja:'盤面は全部で73パターン\n・最短1手：1パターン\n・最短2手：9パターン\n・最短3手：39パターン\n・最短4手：24パターン\nこのステージモードで全パターンを遊べます\n（回転・左右反転で同じになる盤面は、同じパターンとして数えています。）',en:'There are 73 board patterns in all.\n1 takes one move, 9 take two, 39 take three, and 24 take four.\nPatterns equivalent through rotation or reflection are counted as one.\nTogether, the first 15 puzzles and Path to Mastery let you play every pattern.',zh:'棋盘一共有73种图案。\n最少1步：1种／2步：9种／3步：39种／4步：24种。\n旋转或左右翻转后相同的图案，按一种计算。\n最初24题和名人之路合在一起，可以玩到全部图案。',ko:'보드 패턴은 모두 73가지예요.\n최단 1수: 1가지／2수: 9가지／3수: 39가지／4수: 24가지.\n회전이나 좌우 반전으로 같은 패턴은 하나로 셉니다.\n처음 24문제와 명인의 길을 합치면 모든 패턴을 플레이할 수 있어요.'}},
  mastery2_13:{twoMoveCard:0},
  mastery2_14:{quiz:{ja:{q:'だるまの原型になったとされる郷土玩具は？',a:['こけし','起き上がり小法師','張り子の虎','土鈴'],correct:1,note:'底を重くして必ず起き上がる玩具。これに達磨大師の姿を重ねたのがだるまです。'},en:{q:'Which folk toy is said to have inspired the daruma?',a:['Kokeshi','Okiagari-kobōshi','Papier-mâché tiger','Clay bell'],correct:1,note:'It is a toy weighted at the bottom so it always rises again. Daruma were created by combining this form with Bodhidharma.'},zh:{q:'被认为是不倒翁原型的乡土玩具是？',a:['木芥子','起身小法师','纸糊老虎','土铃'],correct:1,note:'它的底部较重，一定会重新立起。不倒翁就是把达摩大师的形象和这种玩具结合而成的。'},ko:{q:'다루마의 원형이 되었다고 전해지는 향토 장난감은?',a:['고케시','오키아가리코보시','종이호랑이','흙방울'],correct:1,note:'밑을 무겁게 만들어 반드시 다시 일어나는 장난감입니다. 여기에 달마대사의 모습을 겹친 것이 다루마예요.'}}},
  // 名人への道・急
  mastery3_1:{tip:{ja:'不立文字（ふりゅうもんじ）は、悟りは文字や言葉だけでは伝えられず、心から心へ伝わるものだ、という禅の考え方です。達磨大師を始祖とする禅宗で大切にされてきました。',en:'不立文字（ふりゅうもんじ）は、悟りは文字や言葉だけでは伝えられず、心から心へ伝わるものだ、という禅の考え方です。達磨大師を始祖とする禅宗で大切にされてきました。',zh:'不立文字（ふりゅうもんじ）は、悟りは文字や言葉だけでは伝えられず、心から心へ伝わるものだ、という禅の考え方です。達磨大師を始祖とする禅宗で大切にされてきました。',ko:'不立文字（ふりゅうもんじ）は、悟りは文字や言葉だけでは伝えられず、心から心へ伝わるものだ、という禅の考え方です。達磨大師を始祖とする禅宗で大切にされてきました。'},art:'unwritten'},
  mastery3_2:{twoMoveCard:2},
  mastery3_3:{tip:{ja:'最短3手の盤面での次の一手の確率です。\n・最短2手になるのは約17% (9パターン)\n・最短3手にとどまるのは約56% (39パターン)\n・最短4手になるのは約27% (24パターン)',en:'From a three-move board, a random choice among 12 turns reaches a two-move board about 17% of the time, stays at three moves about 56%, and goes to four moves about 27%.',zh:'在最少3步的棋盘中，随机选择12种转法之一，约17％会变为最少2步，约56％仍为最少3步，约27％会变为最少4步。',ko:'최단 3수 보드에서 12가지 회전 중 하나를 무작위로 고르면 약 17％는 최단 2수, 약 56％는 그대로 최단 3수, 약 27％는 최단 4수가 됩니다.'},art:'moveGraph'},
  mastery3_4:{twoMoveCard:1},
  mastery3_5:{tip:{ja:'だるまは、木型に紙を重ねて作る「張り子」の工芸品です。\n紙を乾かして型から抜き、赤く塗って顔や文字を描くと完成します。',en:'Daruma are papier-mâché crafts: paper is layered over a mold.\nAfter drying and removing the mold, the body is painted red and the face and lettering are added.',zh:'不倒翁是把纸一层层贴在木模上制成的张子工艺品。\n干燥脱模后，涂成红色，再画上脸和文字便完成了。',ko:'다루마는 나무 틀에 종이를 겹쳐 붙이는 장지 공예품입니다.\n말린 뒤 틀에서 빼내고, 붉게 칠한 다음 얼굴과 글씨를 그려 완성합니다.'},art:'paper'},
  mastery3_6:{tip:{ja:'次からは、最短4手の問題です。',en:'From the next puzzle, the best solution takes four moves.',zh:'从下一题开始，最少需要四步。',ko:'다음 문제부터는 최단 4수 문제입니다.'}},
  mastery3_7:{quiz:{ja:{q:'願かけのとき、だるまの目はどちらから入れる？',a:['だるまの左目','だるまの右目','両目いっしょ','どちらでもよい'],correct:0,note:'だるまの左目を先に入れ、願いが叶ったら右目を入れるのが一般的です。'},en:{q:'Which eye is painted first when making a wish?',a:['The right eye as you face it','The left eye as you face it','Both together','Either is fine'],correct:0,note:'Usually the eye on your right (the daruma’s left eye) is painted first, and the other is added when the wish comes true.'},zh:{q:'许愿时，先画不倒翁的哪只眼？',a:['面对不倒翁时右边的眼','面对不倒翁时左边的眼','两只一起','哪只都行'],correct:0,note:'一般先画面对不倒翁时右边的眼（不倒翁自己的左眼），愿望实现后再画另一只。'},ko:{q:'소원을 빌 때 다루마의 어느 쪽 눈부터 그릴까?',a:['마주 보았을 때 오른쪽','마주 보았을 때 왼쪽','양쪽을 함께','어느 쪽이든'],correct:0,note:'보통 마주 보았을 때 오른쪽 눈(다루마 자신에게는 왼쪽 눈)을 먼저 그리고, 소원이 이루어지면 다른 쪽을 그립니다.'}}},
  mastery3_8:{boardQuiz:{kind:'choose',pattern:6,topic:'outer',correct:1}},
  mastery3_9:{guideCard:{state:[2,0,0,0,1,0,0],text:{ja:'5体立ち：寝た2体が外周で離れていれば最短3手',en:'Five standing: two fallen daruma separated on the outer ring take three moves.',zh:'5个站立：两只倒下的不倒翁在外圈分开时最少3步。',ko:'5개가 서 있을 때: 바깥쪽에서 떨어진 두 누운 다루마는 최단 3수예요.'},page:0}},
  mastery3_10:{quiz:{ja:{q:'江戸時代、赤いだるまは何よけとして求められた？',a:['疱瘡（ほうそう）よけ','火事よけ','雨よけ','虫よけ'],correct:0,note:'赤い色には邪気を払う力があると信じられ、疱瘡よけとしても求められました。'},en:{q:'In the Edo period, red daruma were sought as protection against what?',a:['Smallpox','Fire','Rain','Insects'],correct:0,note:'Red was believed to ward off evil, and daruma were sought as protection against smallpox.'},zh:{q:'江户时代，人们把红色不倒翁当作什么的护身符？',a:['天花','火灾','大雨','虫害'],correct:0,note:'人们相信红色能驱邪，因此也会用红色不倒翁祈求免受天花侵扰。'},ko:{q:'에도 시대에 붉은 다루마는 무엇을 막기 위해 찾았을까?',a:['천연두','화재','비','벌레'],correct:0,note:'붉은색에는 사악한 기운을 물리치는 힘이 있다고 믿어, 천연두를 막기 위한 다루마도 찾았습니다.'}}},
  mastery3_11:{tip:{ja:'1829年の高崎の、市でだるまを売る様子が版画と文章に残されています。',en:'In 1829, prints and writing recorded daruma being sold at a market in Takasaki.',zh:'1829年的高崎，版画和文字记录了市场中售卖不倒翁的情景。',ko:'1829년 다카사키 시장에서 다루마를 팔던 모습이 판화와 글로 남아 있습니다.'},art:'market'},
  mastery3_12:{boardQuiz:{kind:'choose',pattern:7,topic:'ribbon',correct:0}},
  mastery3_13:{tip:{ja:'メニューの「最短2手の9パターン」と「攻略のコツ」では、盤面をスワイプするとゲーム中の盤面と並べて見比べられます。',en:'In “2-move boards” and “Quick tips” in the Menu, swipe a board to compare it side by side with the game board.',zh:'在菜单的“最少2步棋盘”和“攻略提示”中，滑动棋盘可与游戏中的棋盘并排比较。',ko:'메뉴의 “최단 2수 보드”와 “공략 팁”에서는 보드를 스와이프해 게임 보드와 나란히 비교할 수 있어요.'}},
  mastery3_14:{quiz:{ja:{q:'達磨大師が開いたとされる仏教の宗派は？',a:['禅宗','浄土宗','真言宗','日蓮宗'],correct:0,note:'達磨大師は、中国禅宗の開祖とされています。'},en:{q:'Which Buddhist school is Bodhidharma said to have founded?',a:['Zen','Pure Land','Shingon','Nichiren'],correct:0,note:'Bodhidharma is regarded as the founder of Chinese Zen Buddhism.'},zh:{q:'达摩大师被认为开创了哪个佛教宗派？',a:['禅宗','净土宗','真言宗','日莲宗'],correct:0,note:'达摩大师被视为中国禅宗的开祖。'},ko:{q:'달마대사가 열었다고 전해지는 불교 종파는?',a:['선종','정토종','진언종','일련종'],correct:0,note:'달마대사는 중국 선종의 개조로 여겨집니다.'}}},
};
// クリア後・開始前・盤面案内を同じメッセージカタログから引く。
const MESSAGE_CATALOG={clear:CLEAR_CONTENT,guidance:{}};
function messageDefinition(kind,key){return MESSAGE_CATALOG[kind]?.[key]||null;}
// stageIndex/extraIndex から CLEAR_CONTENT のキーへ変換する。
function clearContentKey(mode,index){
  if(mode){
    const vol=Math.floor(index/MASTER_VOLUME_SIZE)+1,q=index%MASTER_VOLUME_SIZE+1;
    return 'mastery'+vol+'_'+q;
  }
  if(index<INTRO_STAGE_COUNT)return 'academy1_'+(index+1);
  if(index<DEVELOPMENT_STAGE_START)return 'academy2_'+(index-BASIC_STAGE_START+1);
  if(index<TRAINING_STAGE_START)return 'academy3_'+(index-DEVELOPMENT_STAGE_START+1);
  if(index<TRAINING_STAGE_START+TRAINING_UPPER_COUNT)return 'training1_'+(index-TRAINING_STAGE_START+1);
  if(index<TRAINING_STAGE_START+TRAINING_UPPER_COUNT+TRAINING_MIDDLE_COUNT)return 'training2_'+(index-TRAINING_STAGE_START-TRAINING_UPPER_COUNT+1);
  return 'training3_'+(index-TRAINING_STAGE_START-TRAINING_UPPER_COUNT-TRAINING_MIDDLE_COUNT+1);
}
function clearContentAt(mode,index){return messageDefinition('clear',clearContentKey(mode,index));}
// その問題が始まる直前/終わった直後に、追加でダイアログを挟みたい場合に使う。
function clearContentBefore(mode,index){return messageDefinition('clear',clearContentKey(mode,index)+'before');}
// 埋め込み済みの{ja,en,zh,ko}オブジェクトから、現在の言語(なければ日本語)を解決する。
function resolveLocaleText(obj){return obj?(obj[currentLang]||obj.ja):"";}
// ===== 未使用の下書き置き場 =====
// ここに集めた2つの配列は、tr()やCLEAR_CONTENTから一切参照されない下書きコンテンツです。
// かつてstageClear*/extraClear*/extraAdvice*/mastery4_*などのキーで用意されていましたが、
// 出題範囲の変更で参照先を失いました。配列+連番というだけの形にしてあるのは、
// 「academyN_M」「masteryN_M」のような本編の命名規則と紐づいて見えないようにするためです。
// 将来また使うかもしれない下書きとして残しているだけなので、未使用だからと消さないこと。
const UNUSED_DRAFT_TRIVIA=[
  {ja:'次からは、最短2手の問題です。',en:'The next puzzles take two turns.',zh:'从下一题开始，最少需要转2次。',ko:'다음 문제부터는 최단 2번 문제입니다.'},
  {ja:'だるまの赤は、まよけや生命力を表す色です。諸説ありますが、達磨大師（だるまだいし）の赤い法衣にちなむとされます。',en:'Daruma red represents protection and vitality.',zh:'不倒翁的红色象征避邪与生命力。',ko:'다루마의 붉은색은 액막이와 생명력을 뜻합니다.'},
  {ja:'次からは実践編です。今度は、最短2手の9パターンを補助なしで解いてみよう。',en:'Next comes Practice. Solve the nine 2-turn patterns without the training wheels.',zh:'接下来是实践篇。请不依靠辅助，解开9种最少2转的图案。',ko:'다음은 실전입니다. 최단 2번의 9가지 패턴을 도움 없이 풀어 보세요.'},
  {ja:'高崎のだるまづくりは、1859年に赤い顔料が輸入されると盛んになりました。',en:'Takasaki daruma production grew after red pigment began to be imported in 1859.',zh:'1859年开始进口红色颜料后，高崎不倒翁的制作兴盛起来。',ko:'1859년 붉은 안료가 수입되며 다카사키 다루마 제작이 활발해졌습니다.'},
  {ja:'名人への道では、「急」の途中まで最短3手の問題が続きます。',en:'Path to Mastery continues with three-move puzzles through the middle of Volume 3.',zh:'名人之路会持续出现最少3步的题目，直到第三卷中途。',ko:'명인의 길에서는 3권 중간까지 최단 3수 문제가 이어집니다.'},
  {ja:'メニューの「最短2手の9パターンを見る」から、9種類の盤面を一覧で見られます。',en:'Open “View 2-move boards” from the Menu to see all nine patterns at once.',zh:'从菜单打开“查看最少2步棋盘”，即可一次查看全部9种图案。',ko:'메뉴의 “최단 2수 보드 보기”에서 9가지 패턴을 한눈에 볼 수 있어요.'},
  {ja:'名人への道の終盤では、残り最短手数が表示されません。\n「ヒント」ボタンで表示されるので、困ったら押してください',en:'In Volume 4, moves left are shown as “?”.\nWhile a Hint arrow is visible, you see the moves left after following it.\nWhen it disappears, the current moves left are shown; move the board to return to “?”.',zh:'第四卷中，最少步数会显示为“？”。\n按下“提示”后，箭头出现期间会显示照着走一步后的剩余步数。\n箭头消失后会显示当前剩余步数；移动棋盘后会再次变为“？”。',ko:'4권에서는 남은 최단 수가 “?”로 표시됩니다.\n힌트 화살표가 보이는 동안에는 그 수를 둔 뒤의 남은 수가 보입니다.\n화살표가 사라지면 현재 남은 수가 표시되고, 보드를 움직이면 다시 “?”가 됩니다.'},
  {ja:'4体立ち：寝ダルマの小三角は最短1手',en:'Four standing: the small triangle of fallen daruma takes one move.',zh:'4个站立：倒下小三角形最少1步。',ko:'4개가 서 있을 때: 누운 다루마의 작은 삼각형은 최단 1수예요.'},
  {ja:'最短2手の盤面は、だるまの形だけでなく向きも大事です。少しずつ覚えやすいものから覚えていこう。',en:'Two-move boards depend not only on the daruma shapes but also on their directions. Learn the easier ones little by little.',zh:'最少2步的棋盘不仅形状重要，不倒翁的朝向也很重要。先从容易记住的开始，一点点记下来吧。',ko:'최단 2수 보드에서는 다루마의 모양뿐 아니라 방향도 중요해요. 외우기 쉬운 것부터 조금씩 익혀 보세요.'},
  {ja:'ヒントなしでは、回す前に「次は何手になりそうか」を想像してみよう。',en:'Without hints, try to imagine how many moves the next board might take before you turn.',zh:'没有提示时，试着在转动前想象下一盘大概需要几步。',ko:'힌트 없이 돌리기 전, 다음 보드가 몇 수쯤 될지 상상해 보세요.'},
  {ja:'迷ったら、寝ているだるまの形と向きを、いったん別々に見てみよう。',en:'When stuck, look at the shape of the fallen daruma and their directions separately.',zh:'迷茫时，把倒下不倒翁的形状和朝向分开来看。',ko:'막히면 누운 다루마의 모양과 방향을 따로 살펴보세요.'},
  {ja:'盤面を回すと景色は変わる。でも、だるまたちの向きも一緒に変わります。',en:'Turning the board changes the view—but the daruma directions turn with it.',zh:'转动棋盘会改变眼前的景色，但不倒翁的朝向也会一起转动。',ko:'보드를 돌리면 풍경은 바뀌지만, 다루마의 방향도 함께 돌아갑니다.'},
  {ja:'最短4手では、まず最短3手になる一手を探すのが近道です。',en:'On a four-move board, first look for a turn that reaches three moves.',zh:'最少4步时，先寻找能变成最少3步的一手。',ko:'최단 4수에서는 먼저 최단 3수가 되는 수를 찾는 것이 지름길이에요.'},
  {ja:'次の形が最短2手に近づくなら、大きな前進です。',en:'If the next board gets closer to two moves, that is real progress.',zh:'如果下一盘更接近最少2步，就是很大的前进。',ko:'다음 보드가 최단 2수에 가까워진다면 큰 전진이에요.'},
  {ja:'三手先を全部読むより、最短2手の形に近づくかを見てみよう。',en:'Rather than reading three moves ahead, look for a board approaching a two-move shape.',zh:'与其读完三步之后，不如看看能否接近最少2步的形状。',ko:'세 수 앞을 모두 읽기보다 최단 2수 모양에 가까워지는지 살펴보세요.'},
  {ja:'ここまで来たら、答えを探す目はもう自分の中にあります。',en:'By now, the eye that finds the answer is already within you.',zh:'走到这里，寻找答案的眼睛已经在你心中了。',ko:'여기까지 왔다면 답을 찾는 눈은 이미 당신 안에 있어요.'},
  {ja:'もう一度チャレンジしよう。',en:'Try again.',zh:'再挑战一次吧。',ko:'다시 도전해 보세요.'}
];
const UNUSED_DRAFT_CLEAR_ENTRIES=[
  {tip:{ja:'サンスクリット語「dharma」は、仏が説いた教えやこの世の真理のこと。「達磨大師」の「達磨」も、だるまの名前も、この言葉に由来します。',en:'The name “daruma” comes from Bodhidharma, the master’s name. Its “dharma” is Sanskrit for teaching or law.',zh:'“不倒翁”这个名字来自达摩大师的名字“菩提达摩”。其中“达摩”来自梵语 dharma，意为教义或法。',ko:'“다루마”라는 이름은 가르침 또는 법을 뜻하는 산스크리트어 dharma에서 왔습니다.'},art:'dharma'},
  {guideCard:{state:[1,1,1,0,1,1,1],text:{ja:'6体寝て、中央だけ立っている形は最短4手',en:'Six fallen, with only the center standing: four moves.',zh:'6个倒下、只有中央站立时最少4步。',ko:'6개가 누워 있고 중앙만 서 있으면 최단 4수예요.'},page:2}},
  {tip:{ja:'だるまには、願いを込めて片目を入れ、かなったらもう片方も描く風習があります。',en:'A daruma often receives one eye with a wish, then the other when it comes true.',zh:'不倒翁常在许愿时画上一只眼，实现愿望后再画另一只。',ko:'다루마는 소원을 빌며 한쪽 눈을 그리고, 이루어지면 다른 눈도 그리는 풍습이 있습니다.'},art:'eyes'},
  {boardQuiz:{kind:'choose-two',patterns:[8,9],topic:'trapezoid',correct:[0,3],outerOddOnly:true}},
  {quiz:{ja:{q:'役目を終えただるまは、どうするのが一般的？',a:['川に流す','お寺で供養して焼く','土に埋める','売り戻す'],correct:1,note:'だるま供養。年末年始に寺社へ納め、感謝とともにお焚き上げしてもらいます。'},en:{q:'What is commonly done with a daruma that has fulfilled its role?',a:['Float it down a river','Return it to a temple for a memorial burning','Bury it','Sell it back'],correct:1,note:'This is daruma kuyō. Around the New Year, daruma are returned to a temple or shrine and ritually burned with gratitude.'},zh:{q:'完成使命的不倒翁，一般怎么处理？',a:['放进河里','送到寺院供养焚烧','埋进土里','卖回去'],correct:1,note:'这叫不倒翁供养。年末年初送到寺社，带着感谢进行焚烧仪式。'},ko:{q:'역할을 마친 다루마는 보통 어떻게 할까?',a:['강에 띄운다','절에서 공양하고 태운다','땅에 묻는다','되판다'],correct:1,note:'다루마 공양입니다. 연말연시에 절이나 신사에 돌려드리고, 감사와 함께 태워 올립니다.'}}},
  {tip:{ja:'次から「残り手数」ボタンが使えるのは1回限りです。',en:'From the next puzzle, Moves Left can be checked only once.',zh:'从下一题起，“剩余步数”只能查看一次。',ko:'다음 문제부터 남은 수는 한 번만 확인할 수 있어요.'}},
  {tip:{ja:'だるま落としは江戸時代から親しまれてきたおもちゃです。ハンマーで胴体をたたいて、だるまの顔を倒さないように落とすゲームです。',en:'Daruma otoshi has been a beloved toy since the Edo period. Hit the body blocks with a hammer, without knocking over the daruma head.',zh:'达摩落是自江户时代以来深受喜爱的玩具。用小锤敲击身体的木块，同时不能让最上面的达摩脸倒下。',ko:'다루마오토시는 에도 시대부터 사랑받은 장난감이에요. 망치로 몸통 블록을 쳐서, 맨 위 다루마 얼굴을 넘어뜨리지 않고 빼냅니다.'},art:'darumaOtoshi'},
  {guideCard:{state:[0,2,2,1,0,0,1],text:{ja:'外周に1つおきに3体立っている形は最短3手',en:'Three standing at every other outer position: three moves.',zh:'外圈每隔一个站立3个时最少3步。',ko:'바깥쪽에 하나씩 건너 3개가 서 있으면 최단 3수예요.'},page:1}},
  {tip:{ja:'次からは「残り手数」ボタンの使用回数が、「元に戻す」などで復活しません。\n(手数オーバーで全員起きた場合にのみ復活)',en:'From the next puzzle, Moves Left uses do not return after restarting, undoing, or similar actions.\n(They return only if everyone wakes up over par.)',zh:'从下一题起，“剩余步数”的使用次数不会因重新开始、撤销等操作而恢复。\n（只有超过最少步数叫醒全部不倒翁时才会恢复。）',ko:'다음 문제부터 남은 수 사용 횟수는 다시 시작이나 되돌리기 등을 해도 돌아오지 않아요.\n(최단 수보다 많이 써서 모두 깨우면 다시 돌아옵니다.)'},art:'cheer'},
  {tip:{ja:'最初からやり直したいときは、メニューの「進行状況をリセット」を使えます。集めた称号も消えるので注意。',en:'To start again from the beginning, choose “Reset progress” from the Menu. Your collected titles will also be erased.',zh:'想从头再来时，可从菜单选择“重置进度”。已获得的称号也会被删除，请注意。',ko:'처음부터 다시 하려면 메뉴의 “진행 상황 초기화”를 사용하세요. 모은 칭호도 함께 사라지니 주의하세요.'}},
  {quiz:{ja:{q:'だるまの生産量が日本一の県は？',a:['京都府','群馬県','愛知県','福島県'],correct:1,note:'群馬県高崎市。少林山達磨寺のふもとで作られてきた高崎だるまが、全国の大半を占めています。'},en:{q:'Which prefecture produces the most daruma in Japan?',a:['Kyoto','Gunma','Aichi','Fukushima'],correct:1,note:'Takasaki, Gunma. Takasaki daruma, made near Shōrinzan Daruma Temple, account for the majority nationwide.'},zh:{q:'日本不倒翁产量第一的县是？',a:['京都府','群马县','爱知县','福岛县'],correct:1,note:'群马县高崎市。少林山达磨寺附近制作的高崎不倒翁占全国大部分产量。'},ko:{q:'일본에서 다루마 생산량이 가장 많은 현은?',a:['교토부','군마현','아이치현','후쿠시마현'],correct:1,note:'군마현 다카사키시입니다. 소린잔 다루마사 근처에서 만들어진 다카사키 다루마가 전국 대다수를 차지합니다.'}}},
  {tip:{ja:'とうとうここまで来ました。\n次からは残り手数のボタンが使えません。\nいよいよ正念場です。',en:'You have come a long way.\nFrom the next puzzle, the Moves Left button is unavailable.\nThis is the true critical moment.',zh:'你已经走到这里了。\n从下一题起，不能再使用“剩余步数”按钮。\n真正的关键时刻到了。',ko:'여기까지 정말 잘 왔어요.\n다음 문제부터는 남은 수 버튼을 쓸 수 없습니다.\n이제부터가 진짜 고비예요.'}},
  {boardQuiz:{kind:'choose',options:[{state:[0,1,1,0,0,0,1],distance:4},{state:[1,0,0,1,1,1,0],distance:3}],topic:'largeTriangle',questionKey:'chooseThree',correct:1,guidePages:[1,3]}},
  {tip:{ja:'名人まであと1問！\n「1手戻す」が使えません。',en:'The next puzzle is the last one.\nWho rises last: the daruma, or you?\nUndo is unavailable in the final puzzle.',zh:'下一题就是最后一题。\n最后站起来的是不倒翁，还是你？\n最后一题不能撤销。',ko:'다음 문제가 마지막 문제예요.\n마지막에 일어나는 것은 다루마일까요, 당신일까요?\n마지막 문제에서는 되돌리기를 쓸 수 없습니다.'}}
];
const SYMMETRIES=Array.from({length:6},(_,k)=>[
  {permutation:makeBoardPermutation(k*60),flip:false},
  {permutation:makeBoardPermutation(k*60,true),flip:true}
]).flat();
function transformStateBySymmetry(state,symmetry){
  const source=dec(state),next=new Uint8Array(N);
  for(let from=0;from<N;from++){
    next[symmetry.permutation[from]]=symmetry.flip?(3-source[from])%3:source[from];
  }
  return enc(next);
}
// だるま修行・上巻(補助なし2くるり)は、基本編と同じ型を異なる見え方で解く。
const TRAINING_UPPER_VIEWS=[
  {permutation:makeBoardPermutation(60),flip:false},
  {permutation:makeBoardPermutation(120),flip:false},
  {permutation:makeBoardPermutation(180),flip:false},
  {permutation:makeBoardPermutation(240),flip:false},
  {permutation:makeBoardPermutation(180),flip:false},
  {permutation:makeBoardPermutation(300),flip:false},
  {permutation:makeBoardPermutation(300),flip:false},
  {permutation:makeBoardPermutation(60),flip:false},
  {permutation:makeBoardPermutation(120),flip:false}
];
TRAINING_UPPER_VIEWS.forEach((view,index)=>{
  if(view)STAGES[index+3].state=transformStateBySymmetry(STAGES[index+3].state,view);
});
// 基本編は、9つの型を基準の向きで学ぶ補助輪付き区間。
// だるま修行・上巻は、見え方を変えた同じ9つの型を自力で解く区間。
const GUIDED_BASIC_STAGES=BASIC_LESSON_PATTERN_ORDER.map(patternIndex=>({...TWO_MOVE_STAGES[patternIndex]}));
STAGES.splice(BASIC_STAGE_START,0,...GUIDED_BASIC_STAGES);
// 別視点に変えた基礎と同じ9つの型(補助なしで解く)を抜き出し、だるま修行・上巻の素材にする。
const TRAINING_UPPER_STAGES=STAGES.splice(DEVELOPMENT_STAGE_START,TRAINING_UPPER_VIEWS.length);
// 二周目は全コースを180°回した見え方で出題する。
// 回転対称なので、盤面の最短手数や解法そのものは変わらない。
const SECOND_LAP_BOARD_VIEW={permutation:makeBoardPermutation(180),flip:false};
function campaignStageState(state){
  return activeLap===2?transformStateBySymmetry(state,SECOND_LAP_BOARD_VIEW):state;
}
function canonicalState(state){
  let canonical=state;
  for(const symmetry of SYMMETRIES)canonical=Math.min(canonical,transformStateBySymmetry(state,symmetry));
  return canonical;
}
function progressOptionCounts(stage){
  let progress=0,worse=0;
  const board=dec(stage.state);
  for(let ti=0;ti<TRI.length;ti++)for(const dir of [1,-1]){
    const next=SOLVER.dist[enc(rollOnce(board,ti,dir))];
    if(next<stage.par)progress++;
    else if(next>stage.par)worse++;
  }
  return {progress,worse};
}
function fourMoveEase(stage){
  let progress=0,followup=0;
  const board=dec(stage.state);
  for(let ti=0;ti<TRI.length;ti++)for(const dir of [1,-1]){
    const nextState=enc(rollOnce(board,ti,dir));
    if(SOLVER.dist[nextState]===3){
      progress++;
      followup+=progressOptionCounts({state:nextState,par:3}).progress;
    }
  }
  return {progress,followup};
}
const ALL_THREE_MOVE_STAGES=[];
{
  const seen=new Set();
  for(const state of SOLVER.byDepth[3]){
    const canonical=canonicalState(state);
    if(seen.has(canonical))continue;
    seen.add(canonical);
    ALL_THREE_MOVE_STAGES.push({state:canonical,par:3});
  }
}
ALL_THREE_MOVE_STAGES.sort((a,b)=>{
  const ae=progressOptionCounts(a),be=progressOptionCounts(b);
  return be.progress-ae.progress||ae.worse-be.worse;
});
// ゲノムの形分類から選んだ「だるま修行・中巻」の素材18問のうち後半9問(前半9問は発展クラスの
// 4くるり3問+だるま修行・下巻9問の新規状態に置き換わったため、この配列自体は中巻専用になった)。
// 外隣り、ひし形、芋虫、台形、リボン、猫の耳、両岸、お皿、
// ネックレス、直角三角形、直線、手裏剣の順に並べる。
const TRAINING_THREE_MOVE_STATE_IDS=[
  5,52,150,132,148,122,202,372,390,21,15,99,13,39,93,91,117,380
];
const threeMoveStageByState=new Map(ALL_THREE_MOVE_STAGES.map(stage=>[stage.state,stage]));
// 中巻で使う後半9だけを名人への道から除外する。前半9は名人・3くるり30問側へ回す
// (3くるり30問+4くるり15問=45問で名人への道の巻数は変わらない)。
const trainingStateSet=new Set(TRAINING_THREE_MOVE_STATE_IDS.slice(9));
function threeMoveStage(state){
  const stage=threeMoveStageByState.get(state);
  if(!stage)throw new Error('Missing three-move training pattern: '+state);
  return {...stage};
}
// 発展クラス・3くるり5問: 棒を1本(soloRod)だけ正解として保証し、soloDir方向へ回すと真ん中が倒れて
// 既知の「あと2くるり」5形(中と外/ひし形/いも虫/リボン/台形の順)に着地する。
// りぼん(4/5)だけは名人への道「序6」の盤面を流用(長方形型の3くるり)。
// initialRodCountは問題ごとに増える初期候補本数(1→2→3→4→6)。間違えた棒はその都度落ちる。
const DEVELOPMENT_THREE_STAGES=[
  {state:39,soloRod:0,soloDir:-1,initialRodCount:1},
  {state:21,soloRod:0,soloDir:1,initialRodCount:2},
  {state:93,soloRod:3,soloDir:-1,initialRodCount:3},
  {state:420,soloRod:4,soloDir:1,initialRodCount:4},
  {state:91,soloRod:0,soloDir:1,initialRodCount:5}
].map(({state,soloRod,soloDir,initialRodCount})=>({...threeMoveStage(state),soloRod,soloDir,initialRodCount}));
// 発展クラスのクリア時にも中巻と同じ「あと2くるり形を覚えよう」を出す。唯一の正解方向へ
// 回した後の到達盤面から、形名の判定はTWO_MOVE_CANONICAL_POSITION側で汎用的に行う。
const DEVELOPMENT_THREE_CLEAR_SHAPE_STATES=DEVELOPMENT_THREE_STAGES.map(stage=>enc(rollOnce(dec(stage.state),stage.soloRod,stage.soloDir)));
// 発展クラス・4くるり3問: 名人への道の4くるり15問(寝静まり/ひづめ/亀/リング)のうち、
// fourMoveEase(進みやすさ)が最も高い=易しい3状態を採用。発展編は他と重複してもよいため、
// 名人への道の出題プールとは独立にここで直接指定する(正解棒は自動判定に任せる)。
const DEVELOPMENT_FOUR_STAGES=[
  {state:364,initialRodCount:1},
  {state:1121,initialRodCount:3},
  {state:1391,initialRodCount:6}
].map(({state,initialRodCount})=>({state,par:4,initialRodCount}));
const DEVELOPMENT_STAGES=[...DEVELOPMENT_THREE_STAGES,...DEVELOPMENT_FOUR_STAGES];
// だるま修行・中巻: 見た目だけでは知っている2くるり形と分からない、3くるり盤面。
const TRAINING_MIDDLE_STAGES=TRAINING_THREE_MOVE_STATE_IDS.slice(9,18).map(threeMoveStage);
// 中巻開始ダイアログで見せる7形プレビュー用(9問中7問は、形だけで「あと3くるり」と分かる)。
const TRAINING_MIDDLE_GOAL_SHAPES=['CatEars','BothBanks','Plate','Necklace','RightTriangle','StraightLine','Shuriken'];
const TRAINING_MIDDLE_GOAL_STATES=[21,99,13,39,93,117,380];
// 中巻クリア時「あと2くるりの形を覚えよう」用: 各ステージで最短の1手を進めた後の
// 「あと2くるり」状態を求めておく(形名の判定はTWO_MOVE_CANONICAL_POSITION側で行う)。
const TRAINING_MIDDLE_CLEAR_SHAPE_STATES=TRAINING_MIDDLE_STAGES.map(stage=>{
  const board=dec(stage.state);
  for(let ti=0;ti<TRI.length;ti++)for(const dir of[1,-1]){
    const next=rollOnce(board,ti,dir);
    if(SOLVER.dist[enc(next)]===2)return enc(next);
  }
  return null;
});
// 「あと2くるり」の6形のうち、外隣り(OuterNeighbor)だけはtrainingShapeRule*Condition訳文が
// 無いため、対象形がこれに当たるステージではこの機能自体を出さない(表示のグレースフルな省略)。
const TRAINING_SHAPE_RULE_SUPPORTED_SHAPES=new Set(['Trapezoid','Caterpillar','Ribbon','Diamond','CenterOuter']);
// だるま修行・下巻: 4くるり9問(新規)。王冠/弓矢/長方形×2/気球×2/大三角/いも虫×2。
const TRAINING_LOWER_STAGES=[104,358,426,582,332,344,325,146,200].map(state=>({state,par:4}));
// 下巻開始ダイアログで見せる6形プレビュー用: 9問の代表(長方形/気球/いも虫はそれぞれ2状態のうち1つ)。
const TRAINING_LOWER_GOAL_SHAPES=['Crown','BowArrow','Rectangle','Balloon','LargeTriangle','Caterpillar'];
const TRAINING_LOWER_GOAL_STATES=[104,358,426,332,325,146];
STAGES.push(...DEVELOPMENT_STAGES,...TRAINING_UPPER_STAGES,...TRAINING_MIDDLE_STAGES,...TRAINING_LOWER_STAGES);
// 修了試験「速解き十八番勝負」の出題範囲: 上巻9(2くるり)+中巻9(3くるり)=18問。4くるりの下巻は含めない。
const TRAINING_EXAM_STAGES=[...TRAINING_UPPER_STAGES,...TRAINING_MIDDLE_STAGES];
const EXTRA_STAGES=ALL_THREE_MOVE_STAGES.filter(stage=>!trainingStateSet.has(stage.state)).map(stage=>({...stage}));
const FOUR_MOVE_STAGES=[];
{
  const seen=new Set();
  for(const state of SOLVER.byDepth[4]){
    const canonical=canonicalState(state);
    if(seen.has(canonical))continue;
    seen.add(canonical);
    FOUR_MOVE_STAGES.push({state:canonical,par:4});
  }
}
FOUR_MOVE_STAGES.sort((a,b)=>{
  const ae=fourMoveEase(a),be=fourMoveEase(b);
  return be.progress-ae.progress||be.followup-ae.followup;
});
// 名人への道の4くるりは、全24canonical状態のうち「寝静まり/ひづめ/亀/リング」形の15個だけを使う
// (王冠/弓矢/長方形/気球/いも虫/大三角の9個はだるま修行・下巻専用に温存し、ネタバレしない)。
const MASTER_FOUR_MOVE_STATE_IDS=new Set([1097,1121,1183,340,346,418,364,401,403,455,1066,1079,1157,1159,1391]);
const MASTER_FOUR_MOVE_STAGES=FOUR_MOVE_STAGES.filter(stage=>MASTER_FOUR_MOVE_STATE_IDS.has(stage.state));
/* 確認2回→1回→なしと情報を減らす。難しい順に並べ、易しくなるほど確認回数を減らす。 */
EXTRA_STAGES.push(
  ...MASTER_FOUR_MOVE_STAGES.slice().reverse()
);
// 悟りへの道：対称な盤面をひとつと数えた73種を集める。
function satoriStagesAtDepth(depth){
  const seen=new Set(),stages=[];
  for(const state of SOLVER.byDepth[depth]){
    const canonical=canonicalState(state);
    if(seen.has(canonical))continue;
    seen.add(canonical);stages.push({state:canonical,par:depth});
  }
  return stages.sort((a,b)=>{
    const ae=progressOptionCounts(a),be=progressOptionCounts(b);
    return be.progress-ae.progress||ae.worse-be.worse||a.state-b.state;
  });
}
// 最短手数ぶん、毎手12通りを完全にランダムに選んだときの最短クリア確率で並べる。
// 最短4手に入った途端に急に易しくなることを避ける。
const LEGACY_SATORI_STAGES=[1,2,3,4].flatMap(satoriStagesAtDepth);
const SATORI_PROBABILITY_ASCENDING=[...LEGACY_SATORI_STAGES].sort((a,b)=>{
  const ae=progressOptionCounts(a),be=progressOptionCounts(b);
  return ae.progress-be.progress||be.worse-ae.worse||a.state-b.state;
});
const SATORI_PROBABILITY_DESCENDING=[...LEGACY_SATORI_STAGES].sort((a,b)=>{
  const ae=progressOptionCounts(a),be=progressOptionCounts(b);
  return be.progress-ae.progress||ae.worse-be.worse||a.state-b.state;
});
function satoriExpectedNextDistance(stage){
  const ae=progressOptionCounts(stage);
  return stage.par+(ae.worse-ae.progress)/12;
}
const SATORI_EXPECTED_STAGES=[
  ...LEGACY_SATORI_STAGES.filter(stage=>stage.par===1),
  ...LEGACY_SATORI_STAGES.filter(stage=>stage.par===2),
  ...LEGACY_SATORI_STAGES.filter(stage=>stage.par>=3).sort((a,b)=>{
    const delta=satoriExpectedNextDistance(a)-satoriExpectedNextDistance(b);
    return delta||a.par-b.par||a.state-b.state;
  })
];
const satoriOptimalPathMemo=new Map();
function satoriOptimalPathCount(state,steps){
  if(steps===0)return state===0?1:0;
  const key=state+'|'+steps;
  if(satoriOptimalPathMemo.has(key))return satoriOptimalPathMemo.get(key);
  const board=dec(state);
  let count=0;
  for(let ti=0;ti<TRI.length;ti++)for(const dir of [1,-1]){
    count+=satoriOptimalPathCount(enc(rollOnce(board,ti,dir)),steps-1);
  }
  satoriOptimalPathMemo.set(key,count);
  return count;
}
function satoriOptimalClearProbability(stage){
  return satoriOptimalPathCount(stage.state,stage.par)/(12**stage.par);
}
// ひとつ前の並び。保存済みの悟り進行を、盤面そのものを基準に移し替えるために残す。
const SATORI_GLOBAL_OPTIMAL_STAGES=[...LEGACY_SATORI_STAGES].sort((a,b)=>{
  const delta=satoriOptimalClearProbability(b)-satoriOptimalClearProbability(a);
  return delta||a.par-b.par||a.state-b.state;
});
// 一時的に採用していた「手数優先」の並び。保存済み進行の移行にだけ使う。
const SATORI_DEPTH_OPTIMAL_STAGES=[...LEGACY_SATORI_STAGES].sort((a,b)=>{
  // まず最短手数の少ない順。その同じ手数の中だけ、最短で解ける確率順にする。
  // 3手の問題が4手の問題より後になることはない。
  const depth=a.par-b.par;
  if(depth)return depth;
  const delta=satoriOptimalClearProbability(b)-satoriOptimalClearProbability(a);
  return delta||a.state-b.state;
});
// 以前の確率順。保存済みの悟り進行を盤面基準で移行するためにも残す。
const SATORI_HUMAN_TIE_STAGES=[...LEGACY_SATORI_STAGES].sort((a,b)=>{
  const probability=satoriOptimalClearProbability(b)-satoriOptimalClearProbability(a);
  if(probability)return probability;
  const ae=progressOptionCounts(a),be=progressOptionCounts(b);
  return be.progress-ae.progress||ae.worse-be.worse||a.par-b.par||a.state-b.state;
});
// 第25問までは1手→2手→3手。第26問以降は3手と4手を予測しにくい固定順で混ぜる。
// 各手数の中では従来の難易度順を保ち、8問ごとに3手・4手を4問ずつ配置する。
const SATORI_MIXED_DEPTHS=[
  4,3,4,4,3,3,4,3,
  3,4,3,4,4,3,3,4,
  4,3,3,4,3,4,4,3,
  3,4,4,3,4,3,3,4,
  3,4,3,3,4,4,3,4,
  4,3,4,3,3,4,4,3
];
const satoriIntroStages=SATORI_HUMAN_TIE_STAGES.filter(stage=>stage.par<=2);
const satoriThreeStages=SATORI_HUMAN_TIE_STAGES.filter(stage=>stage.par===3);
const satoriFourStages=SATORI_HUMAN_TIE_STAGES.filter(stage=>stage.par===4);
let satoriMixedThreeIndex=15,satoriMixedFourIndex=0;
const SATORI_MIXED_STAGES=[
  ...satoriIntroStages,
  ...satoriThreeStages.slice(0,15),
  ...SATORI_MIXED_DEPTHS.map(depth=>depth===3
    ?satoriThreeStages[satoriMixedThreeIndex++]
    :satoriFourStages[satoriMixedFourIndex++])
];
const SATORI_STAGES=[...SATORI_MIXED_STAGES];
[SATORI_STAGES[71],SATORI_STAGES[72]]=[SATORI_STAGES[72],SATORI_STAGES[71]];
const SATORI_ORDER_VERSION='mixed-depths-final-swap-10';
const satoriStageIndexByState=new Map(SATORI_STAGES.map((stage,index)=>[stage.state,index]));
let currentLang='ja';
// ===== UI_TEXT(多言語辞書) =====
// 現在tr()から呼ばれていないキーが一定数ある(2026年時点で384キー中20キー、
// makerKind/customKind/speedModeSelect/speedUnlockedStart系など)。
// 今後のステージ・演出追加で使う予定の下書き文言なので、「未使用だから」という理由だけで
// 削除しないこと。
// (雑学・クイズ・クリア後メッセージの下書きは、CLEAR_CONTENT付近のUNUSED_DRAFT_TRIVIA/
// UNUSED_DRAFT_CLEAR_ENTRIESにまとめてあるので、そちらを参照)
const UI_TEXT={
  ja:{
    pageTitle:'だるまさんを起こして！ — WAKE SEVEN',
    language:'言語を選ぶ',
    title:'だるまさんを起こして！',
    prev:'前へ',
    next:'次へ',
    progress:'進捗',
    shortest:'あと',
    shortestDisplay:'あと',
    moveUnit:'くるり',
    academyClearSuffix:'でクリア',
    moves:'いま',
    stageMode:'ステージモード',
    freeMode:'フリーモード',
    shuffle:'シャッフル',
    reset:'やり直す',
    resetAll:'全員起きる',
    undo:'1手戻す',
    shortestMoves:'最短手数',
    hint:'次の1手を見る',
    remainingCheck:'残り手数 ×{n}',
    debugReset:'リ',
    debugClear:'即',
    debugAlmost:'＋１',
    debugMore:'＋２',
    debugFar:'＋３',
    debugExtra14:'序',
    debugExtra29:'破',
    debugExtra44:'急',
    debugSpeedJumpFinish:'速',
    mirror:'左右反転',
    rotate:'60°回転',
    boardLabel:'七枚のだるま盤',
    tips:'攻略のコツ',
    makeBoard:'自作モード',
    playBoard:'この盤面で遊ぶ',
    nextPuzzle:'次の問題へ →',
    resetProgress:'進行状況をリセット',
    menuAbout:'このゲームについて',
    stage:'問題',
    intro:'入門',
    basic:'基本',
    development:'発展',
    challenge:'挑戦',
    academyClassSuffix:'クラス',
    freePlay:'フリーモード',
    boardMaker:'盤面を編集する',
    customPuzzle:'自作問題',
    freeKind:'FREE PLAY',
    makerKind:'BOARD MAKER',
    customKind:'CUSTOM PLAY',
    another:'もう一問',
    again:'もう一度',
    toFree:'フリーモードへ →',
    allPatternsKind:'名人への道',
    allPatternsNext:'名人への道へ →',
    nextPattern:'次の問題へ →',
    stagePicker:'ステージを選ぶ',
    stagePickerFree:'フリーモードへ',
    stagePickerCustom:'自作モードへ',
    stagePickerSpeed:'速解きモードへ',
    close:'閉じる',
    rankCollection:'称号',
    rankListMenu:'獲得した称号一覧',
    primaryRound:'だるま修行',
    patternRound:'名人への道・{n}　全15問',
    extraStageAria:'名人への道 {n} / {total}',
    optimalClear:'最短手数で全員起きました！',
    clear:'全員起きました！',
    remaining:'あと {n}くるり',
    stageAria:'問題{n}、あと{par}くるり',
    makerImpossible:'この配置は解けません。ダルマをタップして向きを変えてください',
    makerStatus:'ダルマをタップして向きを変更　現在の最短は{n}手',
    resetConfirm:'進行状況と、集めた称号がすべて消えます。最初からやり直しますか？',
    introTitle:'だるまさんを起こして！',
    introText:'くるりと3体をまわして、みんな起こそう',
    introStart:'はじめる',
    tutorialReset:'リセット',
    tutorialFreedom:'ここからは、自由に回してみよう。',
    gripPrompt:'水色の棒をつかんで回そう',
    guidedBasicWrongGrip:'水色の棒をつかもう',
    tutorialGrabPrompt:'水色の棒をつかもう',
    tutorialArrowPrompt:'回し始めたら、スワイプしながらはなす位置を考えよう',
    tutorialReleasePrompt:'ここではなそう',
    tutorialWrongPrompt:'おしい！そこじゃないよ！',
    tutorialWrongPlacePrompt:'そこじゃないよ',
    tutorialFirstClearPrompt:'お見事！ほかの3枚でやってみよう！',
    tutorialSecondGrabPrompt:'水色をつかんで…',
    tutorialSecondArrowPrompt:'くるりとまわして…',
    tutorialSecondReleasePrompt:'はなそう',
    tutorialSecondClearPrompt:'そう、その調子！また場所が変わるよ',
    tutorialFindPrompt:'どこをつかめばいいかな？',
    tutorialFindTurnPrompt:'そう、そこを回して、そろったらはなそう',
    tutorialFindClearPrompt:'いいね！では次は連続で回すよ',
    tutorialChainPrompt:'棒をつかんで…',
    tutorialChainTurnPrompt:'まわして…',
    tutorialChainReleasePrompt:'はなす',
    tutorialChainAgainPrompt:'どこをつかめばいいかな？',
    tutorialTrySoloPrompt:'OK！あとは一人でできるかな？',
    tutorialChainDirectionPrompt:'さぁ、どっちにまわそう？',
    tutorialChainClearPrompt:'OK！また場所が変わるよ',
    tutorialClearPrompt:'全員おきたね！お見事！',
    tutorialFinalClearPrompt:'やったね！それでは本編のはじまり～',
    masterTitle:'おめでとうございます！',
    masterText:'だるま修行を終え、名人への道が開かれました。\n制覇の先には、名人だけのささやかなご褒美も。',
    masterStart:'名人への道・序　七転八起へ →',
    volumeName:'{n}の巻',
    volumeClearTitle:'{n}\nクリア！',
    volumeClearText:'次の巻へ進めます。',
    volumeStart:'次の巻へ →',
    masteryTitle:'名人への道 制覇！',
    masteryText:'金色の盤面を獲得しました。\nメニューから盤面の色を選べます。',
    masteryStart:'フリーモードへ →',
    pathInfoTitle:'名人への道',
    pathInfoText:'「序」から「極」まで、各15問。全60問の道のりです。',
    pathInfoStart:'序を始める →',
    breakthroughSeal:'突破',
    masterySeal:'名人',
    secondMasteryTitle:'二周目 名人への道 制覇！',
    menu:'メニュー',
    clearMessages:'クリア後のメッセージ',
    messageDialogTitle:'クリア後のメッセージ',
    optimalFailOne:'おしい！あと1手短縮できればクリア。',
    optimalFailTwo:'もう少し！あと2手短縮できればクリア。',
    optimalFailMany:'回し方を変えて最短への道を探そう！',
    optimalFailRule:'名人への道は最短手数でのクリアが必要です。',
    optimalFailResult:'この問題は最短{best}手でした。（あなたの手数：{moves}手）',
    optimalFailEncourage:'もう一度チャレンジしよう。',
    optimalRetry:'再挑戦する',
    twoMovePatterns:'最短2手の9パターン',
    twoMoveTitle:'最短2手の9パターン',
    twoMoveText:'攻略のカギは、最短2手の盤面を見分けることです。\n↓ 盤面をクリックして詳しい解説を見よう。',
    twoMoveDetailTitle:'最短2手の盤面解説',
    compareBoard:'盤面をスワイプしてゲーム中の盤面と比べよう',
    playInFree:'フリーモードで遊ぶ →',
    backToPatterns:'一覧へ',
    stageModeReturn:'ステージモードへ',
    tipGuideTitle:'攻略のコツを見る',
    playThisBoard:'この盤面で遊ぶ →',
    twoMoveDiscovery:'最短2手の9パターン　{n} / 9\nこの形と向きを、そのまま覚えておこう。',
    detailsLink:'詳しい解説はこちら →',
    backToClear:'戻る',
    speedStatsTop:'ベスト3',
    speedStatsEntry:'{num}回目　{time}　最短 {optimal} / {total}',
    speedStatsPlace:'{n}位',
    speedStatsOptimal:'最短 {optimal} / 73',
    speedStatsAttempt:'（{n}回目）',
    resetConfirmEarly:'進行状況がすべて消えます。最初からやり直しますか？',
    resetConfirmKeepRewards:'「進行状況をリセット」では、盤面のデザインと「全パターン一覧」を残して最初から始めます。\n「全てリセット」では、それらも含めてすべて消去します。',
    resetEverything:'全てリセット',
    rankDialogTitle:'獲得した称号一覧',
    linkWelcome:'リンク・紹介はご自由に。',
    analyticsNotice:'Google Analyticsでアクセス解析しています。',
    share:'共有する',
    shareShort:'共有',
    shareCopied:'URLをコピーしました',
    shareCopyPrompt:'このURLをコピーしてください',
    shareGameText:'だるまさんを起こして！を遊んでいます。 #WakeSeven',
    shareTrainingText:'だるまさんを起こして！ だるま修行の道を突破した。 #WakeSeven',
    shareMasteryText:'だるまさんを起こして！ 名人への道を制覇した。 #WakeSeven',
    shareSatoriText:'だるまさんを起こして！ 悟りへの道を制覇した。 #WakeSeven',
    soundOn:'効果音ON',
    soundOff:'効果音OFF',
    basicGuideJoinOne:'外側の寝た2枚に1枚を合わせにいき、残り2枚を同時に起こそう',
    basicGuideJoinTwo:'外側の寝た1枚に2枚を合わせにいき、残り1枚を同時に起こそう',
    twoMoveLessonLink:'詳しい解説を見る →',
    twoMoveLessonOpen:'コツを見る',
    twoMoveLessonTitle:'あと2くるりのコツ',
    twoMoveLessonTipTitle:'「{name}」のコツ',
    twoMoveTip3DescTemplate:'「{name}」は、{text}形だよ',
    twoMoveLessonTab1:'選び方のコツ',
    twoMoveLessonTab2:'回し方のコツ',
    twoMoveLessonPractice:'外側の寝た2枚に、1枚を合わせにいこう',
    twoMoveLessonSecond:'外側の寝た1枚に、2枚を合わせにいこう',
    twoMoveLessonClose:'OK',
    twoMoveTip3TrapezoidName:'台形',
    twoMoveTip3TrapezoidText:'寝ただるまが台形に並んでいる',
    twoMoveTip3TrapezoidHint:'寝た三角のうち、向きがそろってない方を選ぼう',
    twoMoveTip3RibbonName:'りぼん',
    twoMoveTip3RibbonText:'寝ただるまがりぼんの形に並んでいる',
    twoMoveTip3RibbonHint:'寝た三角のうち、向きがそろってない方を選ぼう',
    twoMoveTip3CaterpillarName:'いも虫',
    twoMoveTip3CaterpillarText:'寝ただるまがいも虫の形に並んでいる',
    twoMoveTip3CaterpillarHint:'しっぽの左右どちらかを選ぼう',
    twoMoveTip3DiamondName:'ひし形',
    twoMoveTip3DiamondText:'寝ただるまがひし形に並んでいる',
    twoMoveTip3DiamondHint:'寝ている三角のうちどちらかを選ぼう',
    twoMoveTip3OuterNeighborName:'外隣り',
    twoMoveTip3OuterNeighborText:'外側で2枚が隣り合って寝ている',
    twoMoveTip3OuterNeighborHint:'外隣りの外側を選ぼう',
    twoMoveTip3CenterOuterName:'中と外',
    twoMoveTip3CenterOuterText:'真ん中と外側で寝ている',
    twoMoveTip3CenterOuterHint:'外側で寝ている隣で起きているだるまの、奥の棒を選ぼう',
    trainingShapeRuleIntro:'「あと2くるり」の形と向きを覚えよう',
    developmentShapeRuleIntro:'今とおった「あと2くるり」の形だよ',
    trainingShapeRuleHeading:'「あと2くるり」となる条件',
    trainingShapeRuleTrapezoidCondition:'同じ向きの三角を除き、時計回りに遅れてる方が左向き',
    trainingShapeRuleCaterpillarCondition:'目玉同士・体同士が同じ向き',
    trainingShapeRuleRibbonCondition:'同じ向きの三角を除き、時計回りに遅れてる方が左向き',
    trainingShapeRuleDiamondCondition:'対角が違う向き',
    trainingShapeRuleCenterOuterCondition:'向きに関係なし',
    roadmapNote:'・習：だるま修行の道（24問） ： クリア済\n・序～極：名人への道（各15問、計60問）',
    roadmapCount:'{n}問',
    cheerCaption:'もうすぐ名人です！\nさらに難しくなるけど、だるまさんも応援してます!',
    quizTitle:'だるまクイズ',
    quizCorrect:'正解！',
    quizWrong:'おしい！',
    quizContinue:'つづける →',
    rankLink:'称号一覧を見る →',
    clearMessagesLink:'クリア後のメッセージを見る →',
    twoMoveDiscovery1:'最短2手の9パターン　{n} / 9\nこの形をそのまま覚えておこう。',
    twoMoveDiscovery23:'最短2手の9パターン　{n} / 9\nこの形と向きを、そのまま覚えておこう。ひし形の対角線同士の向きに注目すると覚えやすいです。',
    twoMoveDiscovery45:'最短2手の9パターン　{n} / 9\nこの形と向きを、そのまま覚えておこう。芋虫の目と胴体の向きに注目すると覚えやすいです。',
    twoMoveDiscovery6:'最短2手の9パターン　{n} / 9\n外周の隣り合う寝た2体は、盤面の全体を回転すると向きが変わって見えるので覚えにくい形です。',
    twoMoveDiscovery7:'最短2手の9パターン　{n} / 9\nリボン型は仲間外れダルマの向きに注目。盤面の全体を回転すると向きが変わって見えるので覚えにくい形です。',
    twoMoveDiscovery89:'最短2手の9パターン　{n} / 9\n台形型は仲間外れダルマの向きに注目。盤面の全体を回転すると向きが変わって見えるので覚えにくい形です。',
    allPatternsMenu:'全パターン一覧',
    allPatternsOpen:'全パターン一覧を見る →',
    masteryBoardNote:'これで盤面の全パターンを制覇したことになります。\nメニューに「全パターン一覧」が追加されました。',
    satori:'悟りへの道',
    satoriPicker:'悟りへの道　73問',
    satoriChoose:'問題を選ぶ',
    satoriFailRule:'悟りへの道は最短の手でのみクリアできます。',
    satoriFailEncourage:'',
    satoriTitle:'悟りへの道 制覇！',
    satoriText:'白い盤・新しい角度の盤を手に入れました。',
    satoriStart:'悟りへの道へ →',
    satoriRank:'無心',
    satoriUnlock:'悟りへの道が開かれました。',
    twoMovePatternsLink:'最短2手の9パターンを見る',
    satoriFailLimit:'最短手数に達しました。',
    satoriFailResult:'この問題の最短手数は{best}手です。',
    satoriSecondFailTitle:'最短手数ではありません。',
    satoriSecondFailRule:'悟りへの道では、最短手数で全員を起こそう。\n（二周目では最短手数はここにも表示されません）',
    satoriIntroTitle:'悟りへの道',
    satoriIntroText:'名人となったあなたに、悟りへの道が開かれました。\n全73パターンを最短手数で見抜く道です。\nメニューから行ける「全パターン一覧」も参考に。',
    satoriIntroStart:'第一問へ →',
    debugSkipTutorial:'飛',
    debugIntro2:'入',
    debugBasic11:'基',
    debugAcademy20:'発',
    debugSpeedTraining8:'９',
    debugTrainingUpper:'上',
    debugTrainingMiddle:'中',
    debugTrainingLower:'下',
    debugSpeedIntermediate17:'18',
    debugSpeedMastery26:'27',
    debugSatori72:'悟',
    secondLapTitle:'ここから二周目へ',
    secondLapText:'すべてをもう一度制覇すれば、本当のクリアです。\n二周目ではスワイプし始めたら一手が確定します。\nクリア後には特別な称号を獲得できます。',
    secondLapStart:'二周目を始める →',
    secondLapPath:'二周目',
    awakenedRank:'覚者',
    awakenedTitle:'二周目 制覇！',
    awakenedText:'二周目も、すべての道を歩ききりました。\n七色のだるまさんを手に入れました。',
    firstLapLabel:'一周目',
    secondLapLabel:'二周目',
    secondLapBadge:'二周目',
    satoriThanks:'ステージモードはこれで本当に終わりです。\n最後までプレイしてくださりありがとうございます。',
    speedMode:'速解きモード',
    speedTitle:'速解きモード',
    speedIntro:'73の盤面を、タイマー付きで駆け抜けるモードです。\n途中で閉じても時間と盤面を保存して再開できます。',
    speedStart:'挑戦する →',
    speedGo:'スタート',
    speedUnlockedStart:'速解きモードに挑戦する →',
    speedResume:'再開する →',
    speedRetry:'再挑戦する',
    speedPause:'一時停止',
    speedPauseTitle:'一時停止中',
    speedPauseText:'タイマーを止めています。盤面と時間は保存されています。',
    speedPauseProgress:'現在：{current} / {total}　{time}',
    speedRestart:'最初から',
    speedPuzzleRestart:'この問題をやり直す',
    speedRestartTitle:'最初からやり直しますか？',
    speedRestartText:'今のタイムと進行状況は失われます。',
    speedRestartCancel:'戻る',
    speedRestartConfirm:'最初からやり直す',
    speedCompleteTitle:'速解きモード 完走！',
    speedComplete:'今回の記録：{time}　最短クリア：{optimal} / {total}　{attempt}',
    speedUnlocked:'速解きモードが開放されました。\n73の盤面を駆け抜け、自己ベストに挑戦できます。',
    speedStats:'速解きの成績',
    speedStatsSummary:'完走回数：{runs}回',
    speedStatsEmpty:'まだ完走記録がありません。',
    secondMasteryReward:'七色のだるまさんを手に入れました。\nメニューの「盤面のデザイン」から選べます。',
    timeLabel:'タイム',
    speedModeSelect:'速解きモード',
    speedOpen:'速解きモードへ →',
    speedTrainingLabel:'速解き九番勝負',
    speedTrainingIntro:'だるま学園の卒業試験 「速解き九番勝負」\n出題範囲：2くるりの全9パターン',
    speedIntermediateLabel:'速解き十八番勝負',
    speedIntermediateIntro:'だるま修行の修了試験 「速解き十八番勝負」\n出題範囲：上巻（最短2くるり）・中巻（最短3くるり）の18問',
    speedMasteryLabel:'速解き二十七番勝負',
    speedMasteryIntro:'名人への道の皆伝試験 「速解き二十七番勝負」\n出題範囲：全73の盤面からランダムで選ばれた27問',
    speedSatoriLabel:'速解き七十三番勝負',
    speedSatoriIntro:'悟りへの道クリアの報酬 「速解き七十三番勝負」\n出題範囲：全73の盤面',
    primaryTrialTitle:'だるま学園 卒業試験へ',
    primaryTrialText:'卒業試験として、「速解き九番勝負」に挑戦します。',
    primaryTrialNote:'出題範囲：今まででてきた「2くるり」の全9パターン',
    primaryTrialStart:'卒業試験 速解き九番勝負へ →',
    primaryTrialFooter:'メニューに「速解きモード」が追加されました。\n繰り返し挑戦して最短記録の更新を目指そう。',
    intermediateTrialTitle:'だるま修行 修了試験へ',
    intermediateTrialText:'だるま修行の仕上げに、修了試験「速解き十八番勝負」に挑戦します。',
    intermediateTrialNote:'速解き十八番勝負では、上巻・下巻に出てきた最短3手の18問が出題されます。',
    intermediateTrialStart:'修了試験 速解き十八番勝負へ →',
    masteryTrialTitle:'名人への道 皆伝試験へ',
    masteryTrialText:'さぁ、名人になるための皆伝試験「速解き二十七番勝負」に挑戦しましょう！',
    masteryTrialNote:'速解き二十七番勝負では、全73の盤面からランダムに27問が出題されます。',
    masteryTrialStart:'皆伝試験 速解き二十七番勝負へ →',
    speedTrialFailTitle:'試験に再挑戦',
    speedTrainingTrialFailText:'全9問を最短2手で解くと、だるま学園を卒業できます。',
    speedIntermediateTrialFailText:'全18問を最短3手で解くと、名人への道が開かれます。',
    speedMasteryTrialFailText:'全27問を最短手数で解くと、悟りへの道が開かれます。',
    speedTrialRetry:'試験に再挑戦する',
    speedExamBadgePrimary:'修了試験\n速解き九番勝負\n合格',
    speedExamBadgeIntermediate:'修行卒業試験\n速解き十八番勝負\n突破',
    speedExamBadgeMastery:'免許皆伝\n速解き二十七番勝負\n制覇',
    speedExamBadgeSatori:'速解き七十三番勝負\n完遂',
    speedSatoriUnlockText:'速解き七十三番勝負が解禁されました。\n73の盤面を駆け抜け、自己ベストに挑戦できます。',
    speedSatoriUnlockStart:'速解き七十三番勝負へ →',
    darumaTraining:'だるま修行',
    trainingUpper:'だるま修行・上巻',
    trainingMiddle:'だるま修行・中巻',
    trainingLower:'だるま修行・下巻',
    academyPickerRound:'だるま学園',
    academyEnrollTitle:'だるま学園 入学おめでとう！',
    academyWelcomeTitle:'はじめは入門クラスだよ！',
    academyWelcomeText:'最初はゆっくりまわそう',
    academyWelcomeStart:'はじめる',
    academyWelcomeRemaining:'あと {n} くるり',
    academyWelcomeRelease:'ここで はなそう',
    basicWelcomeTitle:'基本クラスへようこそ！',
    basicWelcomeText:'あと○くるりが減ったら、指をはなそう',
    basicWelcomeStart:'はじめる',
    developmentWelcomeTitle:'発展クラス 開始！',
    developmentWelcomeText:'発展クラスでは「あと3くるり」「あと4くるり」にも挑戦するよ！',
    developmentWelcomeSpinHint:'くるくる回して、「あと○くるり」が減ったら指をはなそう',
    developmentWelcomeStart:'はじめる',
    developmentFourStartTitle:'次は4くるり！',
    developmentFourStartText:'次からは、「あと4くるり」の問題です。',
    developmentFourStartStart:'はじめる',
    academyCompleteTitle:'だるま学園 卒業！',
    academyCompleteText:'だるま学園を卒業し、だるま修行の旅に出ます。\nここからは補助なしで「2くるり」にチャレンジしよう。',
    academyCompleteStart:'だるま修行へ →',
    trainingWelcomeTitle:'だるま修行 出発！',
    trainingWelcomeText:'ここからは補助なし。自分の力で解いてみよう',
    trainingWelcomeNext:'つぎへ',
    trainingWelcomeStart:'はじめる',
    trainingUpperGoalKind:'だるま修行・上巻 開始',
    trainingUpperGoalTitle:'上巻ではこんな形が登場するよ',
    trainingUpperGoalStart:'はじめる',
    trainingMiddleGoalKind:'だるま修行・中巻 開始',
    trainingMiddleGoalTitle:'中巻ではこんな形が登場するよ',
    trainingMiddleGoalStart:'はじめる',
    trainingLowerGoalKind:'だるま修行・下巻 開始',
    trainingLowerGoalTitle:'下巻ではこんな形が登場するよ',
    trainingLowerGoalStart:'はじめる',
    shapeNameCatEars:'猫の耳',
    shapeNameBothBanks:'両岸',
    shapeNamePlate:'お皿',
    shapeNameNecklace:'ネックレス',
    shapeNameRightTriangle:'直角三角形',
    shapeNameStraightLine:'一直線',
    shapeNameShuriken:'手裏剣',
    shapeNameCrown:'王冠',
    shapeNameBowArrow:'弓矢',
    shapeNameRectangle:'長方形',
    shapeNameBalloon:'気球',
    shapeNameLargeTriangle:'大三角',
    shapeNameCaterpillar:'いも虫',
    trainingTwoMoreLabel:'あと2くるり',
    trainingMiddleSpinTitle:'くるくる回して「あと2くるり」になったら指をはなそう。',
    trainingCompleteTitle:'だるま修行 修了！',
    trainingCompleteText:'だるま修行を終え、名人への道が開かれました。',
    trainingCompleteStart:'名人への道・序　七転八起へ →',
    assistedWrongPlace:'そこじゃないよ',
    assistedWrongDirection:'そっちじゃないよ',
    retryLesson:'再挑戦する',
    threeDMenu:'3Dだるまを見る',
    threeDUnlockedText:'二周目クリアの報酬として、特別な3Dページが開放されました。リアルな盤面で遊べます。',
    threeDOpen:'3Dページを見る →',
    boardTheme:'盤面のデザイン',
    boardThemeColor:'色',
    boardThemeLayout:'配置',
    boardThemeDefault:'通常',
    boardThemeGold:'金',
    boardThemeSatori:'白黒',
    boardLayoutNormal:'横配置',
    boardThemeTilted:'縦配置',
    darumaColor:'だるま',
    darumaColorRed:'赤',
    darumaColorRainbow:'七色',
    rotateCcw:'60°回転',
    rotateCw:'60°回転',
    flipVertical:'上下反転'
  },
  en:{
    pageTitle:'Wake the Daruma! — WAKE SEVEN',
    language:'Choose language',
    title:'Wake the Daruma!',
    prev:'Prev',
    next:'Next',
    progress:'Progress',
    shortest:'Left',
    shortestDisplay:'Left',
    moveUnit:'turns',
    academyClearSuffix:'to clear',
    moves:'Now',
    stageMode:'Puzzles',
    freeMode:'Free Play',
    shuffle:'Shuffle',
    reset:'Restart',
    resetAll:'Stand all up',
    undo:'Undo',
    shortestMoves:'Moves left',
    hint:'See next move',
    remainingCheck:'Moves left ×{n}',
    mirror:'Mirror',
    rotate:'Rotate 60°',
    debugReset:'リ',
    debugClear:'Clear',
    debugAlmost:'＋１',
    debugMore:'＋２',
    debugFar:'＋３',
    debugExtra14:'序',
    debugExtra29:'破',
    debugExtra44:'急',
    debugSpeedJumpFinish:'Speed',
    boardLabel:'Seven-daruma puzzle board',
    tips:'Quick tip',
    makeBoard:'Board Maker',
    playBoard:'Play this board',
    nextPuzzle:'Next puzzle →',
    resetProgress:'Reset progress',
    menuAbout:'About this game',
    stage:'Puzzle',
    intro:'INTRO',
    basic:'BASIC',
    development:'DEVELOPMENT',
    challenge:'CHALLENGE',
    freePlay:'Free Play',
    academyClassSuffix:' Class',
    boardMaker:'Edit board',
    customPuzzle:'Custom Puzzle',
    freeKind:'FREE PLAY',
    makerKind:'BOARD MAKER',
    customKind:'CUSTOM PLAY',
    another:'Another puzzle',
    again:'Try again',
    toFree:'Go to Free Play →',
    optimalClear:'Everyone is awake in the fewest moves!',
    allPatternsKind:'PATH TO MASTERY',
    allPatternsNext:'Path to Mastery →',
    nextPattern:'Next puzzle →',
    stagePicker:'Choose a stage',
    stagePickerFree:'Free Play',
    stagePickerCustom:'Board Maker',
    stagePickerSpeed:'Speed Run',
    close:'Close',
    rankCollection:'Titles',
    rankListMenu:'Collected titles',
    primaryRound:'DARUMA TRAINING',
    patternRound:'Path to Mastery {n} · 15 puzzles',
    extraStageAria:'Path to Mastery {n} / {total}',
    clear:'Everyone is awake!',
    remaining:'Best: {n} moves left',
    stageAria:'Puzzle {n}, best in {par} moves',
    makerImpossible:'This position cannot be solved. Tap a daruma to change its direction.',
    makerStatus:'Tap a daruma to change its direction · Best: {n} moves',
    resetConfirm:'This will erase all progress and collected titles. Start again from the beginning?',
    introTitle:'Wake the Daruma!',
    introText:'Grab three daruma, then give them a turn.',
    introStart:'Start',
    tutorialReset:'Reset',
    tutorialFreedom:'Now try turning them freely.',
    gripPrompt:'Grab a blue bar to turn.',
    guidedBasicWrongGrip:'Grab the blue one.',
    tutorialGrabPrompt:'Grab the blue bar.',
    tutorialArrowPrompt:'Keep holding and turn.',
    tutorialReleasePrompt:'Release here.',
    tutorialWrongPrompt:'Close! Not that one.',
    tutorialWrongPlacePrompt:'Not that one.',
    tutorialFirstClearPrompt:'Well done! Now try another three.',
    tutorialSecondGrabPrompt:'Grab the blue bar…',
    tutorialSecondArrowPrompt:'Give it a turn…',
    tutorialSecondReleasePrompt:'Release it.',
    tutorialSecondClearPrompt:'That’s it! The place changes too.',
    tutorialFindPrompt:'Which bar should you grab?',
    tutorialFindTurnPrompt:'Yes—turn that one, then release it.',
    tutorialFindClearPrompt:'Nice! Next, make two turns in a row.',
    tutorialChainPrompt:'Grab the bar…',
    tutorialChainTurnPrompt:'Turn it…',
    tutorialChainReleasePrompt:'Release it.',
    tutorialChainAgainPrompt:'Which bar should you grab?',
    tutorialTrySoloPrompt:'OK! Can you finish it on your own?',
    tutorialChainDirectionPrompt:'Which way should you turn?',
    tutorialChainClearPrompt:'OK! The place changes again.',
    tutorialClearPrompt:'Everyone is up! Well done!',
    tutorialFinalClearPrompt:'Great! The real game starts now.',
    masterTitle:'First 24 puzzles complete!',
    masterText:'The Path to Mastery is now open.\nA small reward awaits true masters.',
    masterStart:'Path to Mastery →',
    volumeName:'Volume {n}',
    volumeClearTitle:'{n} complete!',
    volumeClearText:'The next volume is ready.',
    volumeStart:'Next volume →',
    masteryTitle:'Path to Mastery complete!',
    masteryText:'You earned the golden board.\nChoose board colors from the Menu.',
    masteryStart:'Go to Free Play →',
    pathInfoTitle:'Path to Mastery',
    pathInfoText:'Four volumes of 15 puzzles await: 60 puzzles in all.',
    pathInfoStart:'Begin Volume 1 →',
    breakthroughSeal:'PASS',
    masterySeal:'MASTER',
    menu:'Menu',
    clearMessages:'Clear messages',
    messageDialogTitle:'Clear messages',
    optimalFailOne:'So close! One move shorter clears it.',
    optimalFailTwo:'Almost! Two moves shorter clears it.',
    optimalFailMany:'Try a different turn and find the shortest path.',
    optimalFailRule:'Path to Mastery puzzles must be cleared in the fewest moves.',
    optimalFailResult:'This puzzle takes {best} moves. You took {moves}.',
    optimalFailEncourage:'Give it another try.',
    optimalRetry:'Try again',
    twoMovePatterns:'View 2-move boards',
    twoMoveTitle:'Nine 2-move patterns',
    twoMoveText:'The key is learning to recognize the 2-turn boards.\n↓ Select a board for a detailed explanation.',
    twoMoveDetailTitle:'Tip for this board',
    compareBoard:'Swipe a board to compare it with the game board.',
    playInFree:'Play in Free Mode →',
    backToPatterns:'Back to list',
    stageModeReturn:'Back to puzzles',
    tipGuideTitle:'Quick tips',
    playThisBoard:'Play this board →',
    twoMoveDiscovery:'Two-move board {n} / 9\nRemember this exact shape and orientation.',
    detailsLink:'See the full explanation →',
    backToClear:'Back',
    speedStatsTop:'Top 3',
    speedStatsEntry:'Run {num} · {time} · Optimal {optimal} / {total}',
    speedStatsPlace:'Rank {n}',
    speedStatsOptimal:'Optimal {optimal} / 73',
    speedStatsAttempt:'(Run {n})',
    resetConfirmEarly:'This will erase all progress. Start again from the beginning?',
    resetConfirmKeepRewards:'“Reset progress” keeps your board design and All Patterns access.\n“Reset everything” erases those as well.',
    resetEverything:'Reset everything',
    rankDialogTitle:'Collected titles',
    linkWelcome:'Feel free to share this.',
    analyticsNotice:'Uses Google Analytics for access analysis.',
    share:'Share',
    shareShort:'Share',
    shareCopied:'Link copied',
    shareCopyPrompt:'Copy this link',
    shareGameText:'Playing Wake the Daruma! #WakeSeven',
    shareTrainingText:'I completed Daruma Training in Wake the Daruma! #WakeSeven',
    shareMasteryText:'I conquered the Path to Mastery in Wake the Daruma! #WakeSeven',
    shareSatoriText:'I completed the Path to Awakening in Wake the Daruma! #WakeSeven',
    soundOn:'Sound on',
    soundOff:'Sound off',
    basicGuideJoinOne:'Match one to the two fallen outer daruma; wake the other two.',
    basicGuideJoinTwo:'Match two to the one fallen outer daruma; wake the other one.',
    twoMoveLessonLink:'See the full explanation →',
    twoMoveLessonOpen:'See the tip',
    twoMoveLessonTitle:'Tips for 2 Turns Left',
    twoMoveLessonTipTitle:'Tips for "{name}"',
    twoMoveTip3DescTemplate:'"{name}": {text}',
    twoMoveLessonTab1:'How to Choose',
    twoMoveLessonTab2:'How to Turn',
    twoMoveLessonPractice:'Match the one to the two fallen tiles on the outside.',
    twoMoveLessonSecond:'Match the two to the one fallen tile on the outside.',
    twoMoveLessonClose:'Got it',
    twoMoveTip3TrapezoidName:'Trapezoid',
    twoMoveTip3TrapezoidText:'The fallen daruma line up in a trapezoid.',
    twoMoveTip3TrapezoidHint:'Choose the fallen trio that isn\'t aligned yet.',
    twoMoveTip3RibbonName:'Ribbon',
    twoMoveTip3RibbonText:'The fallen daruma line up in a ribbon shape.',
    twoMoveTip3RibbonHint:'Choose the fallen trio that isn\'t aligned yet.',
    twoMoveTip3CaterpillarName:'Caterpillar',
    twoMoveTip3CaterpillarText:'The fallen daruma line up like a caterpillar.',
    twoMoveTip3CaterpillarHint:'Choose either side of the tail.',
    twoMoveTip3DiamondName:'Diamond',
    twoMoveTip3DiamondText:'The fallen daruma line up in a diamond.',
    twoMoveTip3DiamondHint:'Choose either fallen trio.',
    twoMoveTip3OuterNeighborName:'Outer Neighbors',
    twoMoveTip3OuterNeighborText:'Two fallen tiles sit next to each other on the outside.',
    twoMoveTip3OuterNeighborHint:'Choose the one next to them.',
    twoMoveTip3CenterOuterName:'Center & Outer',
    twoMoveTip3CenterOuterText:'One lies in the center, one on the outside.',
    twoMoveTip3CenterOuterHint:'Choose the bar beyond the center tile\'s head or tail.',
    trainingShapeRuleIntro:'Memorize the shape and orientation of "two turns left"',
    developmentShapeRuleIntro:'That\'s the "two turns left" shape you just passed through!',
    trainingShapeRuleHeading:'Condition for "two turns left"',
    trainingShapeRuleTrapezoidCondition:'Ignore the matching pair — the one lagging clockwise faces left.',
    trainingShapeRuleCaterpillarCondition:'The eyes-pair and the body-pair each face the same way.',
    trainingShapeRuleRibbonCondition:'Ignore the matching pair — the one lagging clockwise faces left.',
    trainingShapeRuleDiamondCondition:'The diagonal pair faces opposite ways.',
    trainingShapeRuleCenterOuterCondition:'Any orientation works.',
    roadmapNote:'I: Daruma Training (24) / II–V: Path to Mastery (15 each, 60 total)',
    roadmapCount:'{n} puzzles',
    cheerCaption:'You are nearing the end.\nIt gets harder from here, but the daruma are cheering for you.',
    quizTitle:'Daruma Quiz',
    quizCorrect:'Correct!',
    quizWrong:'Not quite!',
    quizContinue:'Continue →',
    rankLink:'View titles →',
    clearMessagesLink:'View clear messages →',
    allPatternsMenu:'All patterns',
    allPatternsOpen:'View all patterns →',
    masteryBoardNote:'“All patterns” is now available in the Menu.',
    satori:'Path to Awakening',
    satoriPicker:'Path to Awakening · 73 puzzles',
    satoriChoose:'Choose a puzzle',
    satoriFailRule:'Path to Awakening must be cleared in the fewest moves.',
    satoriFailEncourage:'Study the Genome, then try again.',
    satoriTitle:'Path to Awakening complete!',
    satoriText:'You earned the white board and its new angle.',
    satoriStart:'Path to Awakening →',
    satoriRank:'No Mind',
    satoriUnlock:'Path to Awakening is now open.',
    twoMovePatternsLink:'View the nine 2-move patterns',
    satoriFailLimit:'You reached the move limit.',
    satoriFailResult:'The fewest solution is {best} moves.',
    satoriSecondFailTitle:'That was not the fewest path.',
    satoriSecondFailRule:'On the Path to Awakening, wake everyone in the fewest moves.',
    satoriIntroTitle:'Path to Awakening',
    satoriIntroText:'Recognize all 73 patterns in the fewest moves.\nThere are no hints and no moves-left display.\nStudy the Genome, then begin.',
    satoriIntroStart:'First puzzle →',
    debugSkipTutorial:'飛',
    debugIntro2:'入',
    debugBasic11:'基',
    debugAcademy20:'発',
    debugSpeedTraining8:'９',
    debugTrainingUpper:'上',
    debugTrainingMiddle:'中',
    debugTrainingLower:'下',
    debugSpeedIntermediate17:'18',
    debugSpeedMastery26:'27',
    debugSatori72:'悟',
    secondLapTitle:'The Second Journey',
    secondLapText:'Your progress returns to the beginning, while earned titles remain.\nOn this journey, a move is committed as soon as you begin swiping, and the board automatically turns 120°.\nComplete every path once more to earn the special title “Awakened”.',
    secondLapStart:'Begin the second journey →',
    secondLapPath:'Second Journey',
    awakenedRank:'Awakened',
    awakenedTitle:'Second Journey Complete!',
    awakenedText:'You have walked every path once again.\nYou earned seven colorful daruma.',
    firstLapLabel:'First',
    secondLapLabel:'Second',
    secondLapBadge:'2nd',
    satoriThanks:'This is truly the end of Stage Mode.\nThank you for playing all the way through.',
    speedMode:'Speed Run',
    speedTitle:'Speed Run',
    speedIntro:'Race through all 73 boards against the clock.\nYour time and board are saved if you leave partway.',
    speedStart:'Start →',
    speedGo:'Start',
    speedUnlockedStart:'Try Speed Run →',
    speedResume:'Resume →',
    speedRetry:'Try again',
    speedPause:'Pause',
    speedPauseTitle:'Paused',
    speedPauseText:'The timer is stopped. Your board and time are saved.',
    speedPauseProgress:'Current: {current} / {total} · {time}',
    speedRestart:'Restart',
    speedPuzzleRestart:'Restart this puzzle',
    speedRestartTitle:'Restart from the beginning?',
    speedRestartText:'Your current time and progress will be lost.',
    speedRestartCancel:'Back',
    speedRestartConfirm:'Restart',
    speedCompleteTitle:'Speed Run Complete!',
    speedComplete:'All {total} boards cleared.\nTime: {time}\nOptimal clears: {optimal} / {total}\nPersonal best: {best}',
    speedUnlocked:'Speed Run is now unlocked.\nRace through all 73 boards and set your best time.',
    speedStats:'Speed Run Results',
    speedStatsSummary:'Runs: {runs}',
    speedStatsEmpty:'No completed runs yet.',
    secondMasteryReward:'You earned the seven-color daruma.\nChoose it from Board Design in the Menu.',
    timeLabel:'Time',
    speedModeSelect:'Choose a speed run',
    speedOpen:'Open speed run →',
    speedTrainingLabel:'Speed Run: Nine',
    speedTrainingIntro:'Graduation trial for Daruma Training: race through nine two-move patterns.',
    speedIntermediateLabel:'Speed Run: Eighteen',
    speedIntermediateIntro:'Graduation trial for Daruma Training: "Speed Run: Eighteen"\nCoverage: 9 two-turn boards from Volume 1 and 9 three-turn boards from Volume 2',
    speedMasteryLabel:'Speed Run: Twenty-Seven',
    speedMasteryIntro:'Mastery trial for the Path to Mastery: "Speed Run: Twenty-Seven"\nCoverage: 27 boards randomly chosen from all 73',
    speedSatoriLabel:'Speed Run: Seventy-Three',
    speedSatoriIntro:'A reward for the Path to Satori: race through all 73 boards.',
    primaryTrialText:'Daruma Training is complete.\nBefore the Path to Mastery opens, pass the graduation trial: Speed Run: Nine.',
    primaryTrialStart:'Speed Run: Nine →',
    intermediateTrialText:'As the finishing touch of Daruma Training, take on the graduation trial: Speed Run: Eighteen.',
    intermediateTrialStart:'Graduation Trial: Speed Run: Eighteen →',
    masteryTrialText:'Now, take on the mastery trial to become a true master: Speed Run: Twenty-Seven!',
    masteryTrialStart:'Mastery Trial: Speed Run: Twenty-Seven →',
    speedTrialFailTitle:'Retry the graduation trial',
    speedTrainingTrialFailText:'Clear every board in its minimum moves to open the Path to Mastery.',
    speedIntermediateTrialFailText:'Clear every board in 3 moves to open Path to Mastery III.',
    speedMasteryTrialFailText:'Clear every board in its minimum moves to open the Path to Satori.',
    speedTrialRetry:'Retry graduation trial',
    speedExamBadgePrimary:'Graduation Trial\nSpeed Run: Nine\nPassed',
    speedExamBadgeIntermediate:'Training Graduation\nSpeed Run: Eighteen\nCleared',
    speedExamBadgeMastery:'Full Transmission\nSpeed Run: Twenty-Seven\nMastered',
    speedExamBadgeSatori:'Speed Run: Seventy-Three\nCompleted',
    speedSatoriUnlockText:'Speed Run: Seventy-Three is now unlocked.\nRace through all 73 boards and set a new personal best.',
    speedSatoriUnlockStart:'Speed Run: Seventy-Three →',
    darumaTraining:'DARUMA TRAINING',
    trainingUpper:'DARUMA TRAINING · VOL. 1',
    trainingMiddle:'DARUMA TRAINING · VOL. 2',
    trainingLower:'DARUMA TRAINING · VOL. 3',
    academyPickerRound:'DARUMA ACADEMY',
    academyEnrollTitle:'Welcome to Daruma Academy!',
    academyWelcomeTitle:'First up: the Intro Class!',
    academyWelcomeText:'Start by turning it slowly.',
    academyWelcomeStart:'Start',
    academyWelcomeRemaining:'{n} turns left',
    academyWelcomeRelease:'Release here',
    academyCompleteTitle:'Daruma Academy complete!',
    academyCompleteText:'You graduated from Daruma Academy. Daruma Training is now open.',
    academyCompleteStart:'Begin Daruma Training →',
    trainingWelcomeTitle:'Daruma Training Begins!',
    trainingWelcomeText:'No more assists from here — solve it on your own.',
    trainingWelcomeNext:'Next',
    trainingWelcomeStart:'Start',
    trainingUpperGoalKind:'DARUMA TRAINING · VOL. 1 START',
    trainingUpperGoalTitle:'Here are the shapes you\'ll see in Volume 1',
    trainingUpperGoalStart:'Start',
    trainingMiddleGoalKind:'DARUMA TRAINING · VOL. 2 START',
    trainingMiddleGoalTitle:'Here are the shapes you\'ll see in Volume 2',
    trainingMiddleGoalStart:'Start',
    trainingLowerGoalKind:'DARUMA TRAINING · VOL. 3 START',
    trainingLowerGoalTitle:'Here are the shapes you\'ll see in Volume 3',
    trainingLowerGoalStart:'Start',
    shapeNameCatEars:'Cat ears',
    shapeNameBothBanks:'Two banks',
    shapeNamePlate:'Dish',
    shapeNameNecklace:'Necklace',
    shapeNameRightTriangle:'Right triangle',
    shapeNameStraightLine:'Straight line',
    shapeNameShuriken:'Shuriken',
    shapeNameCrown:'Crown',
    shapeNameBowArrow:'Bow and arrow',
    shapeNameRectangle:'Rectangle',
    shapeNameBalloon:'Balloon',
    shapeNameLargeTriangle:'Large triangle',
    shapeNameCaterpillar:'Caterpillar',
    trainingTwoMoreLabel:'Two turns left',
    trainingMiddleSpinTitle:'Keep turning — let go once it becomes "two turns left."',
    trainingCompleteTitle:'Daruma Training complete!',
    trainingCompleteText:'The Path to Mastery is now open.',
    trainingCompleteStart:'Begin the Path to Mastery →',
    retryLesson:'Try again',
    basicWelcomeTitle:'Welcome to Basic Class!',
    basicWelcomeText:'Release when the turns left go down.',
    basicWelcomeStart:'Start',
    developmentWelcomeTitle:'Development Class Start!',
    developmentWelcomeText:'You\'ll see puzzles marked "3 turns left" and "4 turns left"!',
    developmentWelcomeSpinHint:'Give it a spin — once "turns left" drops, let go!',
    developmentWelcomeStart:'Start',
    threeDMenu:'View in 3D',
    threeDUnlockedText:'As a reward for completing the second lap, a special 3D page has been unlocked. Play on a realistic board.',
    threeDOpen:'Open the 3D page →',
    boardTheme:'Board design',
    boardThemeColor:'Color',
    boardThemeLayout:'Layout',
    boardThemeDefault:'Standard',
    boardThemeGold:'Gold',
    boardThemeSatori:'Monochrome',
    boardLayoutNormal:'Horizontal',
    boardThemeTilted:'Vertical',
    darumaColor:'Daruma',
    darumaColorRed:'Red',
    darumaColorRainbow:'Seven colors',
    secondMasteryTitle:'Second Lap: Path to Mastery complete!',
    rotateCcw:'Rotate 60°',
    rotateCw:'Rotate 60°',
    flipVertical:'Flip vertical'
  },
  zh:{
    pageTitle:'叫醒不倒翁！— WAKE SEVEN',
    language:'选择语言',
    title:'叫醒不倒翁！',
    prev:'上一题',
    next:'下一题',
    progress:'进度',
    shortest:'还差',
    shortestDisplay:'还差',
    moveUnit:'转',
    academyClearSuffix:'就能过关',
    moves:'现在',
    stageMode:'关卡模式',
    freeMode:'自由模式',
    shuffle:'打乱',
    reset:'重新开始',
    resetAll:'全部立起',
    undo:'撤销一步',
    shortestMoves:'最少步数',
    hint:'查看下一步',
    remainingCheck:'剩余步数 ×{n}',
    mirror:'左右翻转',
    rotate:'旋转60°',
    debugReset:'リ',
    debugClear:'即',
    debugAlmost:'＋１',
    debugMore:'＋２',
    debugFar:'＋３',
    debugExtra14:'序',
    debugExtra29:'破',
    debugExtra44:'急',
    debugSpeedJumpFinish:'速',
    boardLabel:'七个不倒翁的谜题棋盘',
    tips:'攻略提示',
    makeBoard:'制作棋盘',
    playBoard:'玩这个棋盘',
    nextPuzzle:'下一题 →',
    resetProgress:'重置进度',
    menuAbout:'关于本游戏',
    stage:'关卡',
    intro:'入门',
    basic:'基础',
    development:'发展',
    challenge:'挑战',
    freePlay:'自由模式',
    academyClassSuffix:'班',
    boardMaker:'编辑棋盘',
    customPuzzle:'自制关卡',
    freeKind:'自由模式',
    makerKind:'制作棋盘',
    customKind:'自制关卡',
    another:'再来一题',
    again:'再来一次',
    toFree:'进入自由模式 →',
    optimalClear:'用最少步数叫醒了全部不倒翁！',
    allPatternsKind:'名人之路',
    allPatternsNext:'进入名人之路 →',
    nextPattern:'下一题 →',
    stagePicker:'选择关卡',
    stagePickerFree:'前往自由模式',
    stagePickerCustom:'前往自制模式',
    stagePickerSpeed:'速解模式',
    close:'关闭',
    rankCollection:'称号',
    rankListMenu:'已获得的称号',
    primaryRound:'不倒翁修行',
    patternRound:'名人之路 {n} · 15题',
    extraStageAria:'名人之路 {n} / {total}',
    clear:'全部醒来了！',
    remaining:'还需最少 {n} 步',
    stageAria:'第{n}题，最少{par}步',
    makerImpossible:'这个布局无法解开。点击不倒翁改变方向。',
    makerStatus:'点击不倒翁改变方向　目前最少需要{n}步',
    resetConfirm:'进度和已获得的称号都会被删除。要从头再来吗？',
    introTitle:'叫醒不倒翁！',
    introText:'抓住三个不倒翁，轻轻转一圈。',
    introStart:'开始',
    tutorialReset:'重置',
    tutorialFreedom:'接下来，自由转动试试看。',
    gripPrompt:'抓住蓝色横杆转动。',
    guidedBasicWrongGrip:'抓住蓝色的吧',
    tutorialGrabPrompt:'抓住蓝色横杆。',
    tutorialArrowPrompt:'抓住后转一圈。',
    tutorialReleasePrompt:'在这里松开。',
    tutorialWrongPrompt:'差一点！不是这里。',
    tutorialWrongPlacePrompt:'不是这里。',
    tutorialFirstClearPrompt:'做得好！再试试另外三个。',
    tutorialSecondGrabPrompt:'抓住蓝色横杆…',
    tutorialSecondArrowPrompt:'轻轻转一圈…',
    tutorialSecondReleasePrompt:'松开吧。',
    tutorialSecondClearPrompt:'就是这样！位置也会改变。',
    tutorialFindPrompt:'该抓哪一根呢？',
    tutorialFindTurnPrompt:'对，转动这里，然后松开。',
    tutorialFindClearPrompt:'很好！接下来连续转两次。',
    tutorialChainPrompt:'抓住横杆…',
    tutorialChainTurnPrompt:'转动…',
    tutorialChainReleasePrompt:'松开。',
    tutorialChainAgainPrompt:'该抓哪一根呢？',
    tutorialTrySoloPrompt:'好！接下来试着自己完成吧？',
    tutorialChainDirectionPrompt:'该往哪边转呢？',
    tutorialChainClearPrompt:'好！位置又变了。',
    tutorialClearPrompt:'全都站起来了！做得好！',
    tutorialFinalClearPrompt:'太好了！正式游戏现在开始。',
    masterTitle:'最初24题完成！',
    masterText:'名人之路现已开启。\n真正的名人还有一份小小奖励。',
    masterStart:'进入名人之路 →',
    volumeName:'第 {n} 卷',
    volumeClearTitle:'{n}完成！',
    volumeClearText:'可以进入下一卷。',
    volumeStart:'下一卷 →',
    masteryTitle:'名人之路制霸！',
    masteryText:'已获得金色棋盘。\n可在菜单中选择棋盘颜色。',
    masteryStart:'进入自由模式 →',
    pathInfoTitle:'名人之路',
    pathInfoText:'共有四卷，每卷15题，总计60题。',
    pathInfoStart:'开始第一卷 →',
    breakthroughSeal:'突破',
    masterySeal:'名人',
    menu:'菜单',
    clearMessages:'通关后消息',
    messageDialogTitle:'通关后消息',
    optimalFailOne:'差一点！再少一步就能通关。',
    optimalFailTwo:'再加把劲！再少两步就能通关。',
    optimalFailMany:'换一种转法，寻找最短路线吧。',
    optimalFailRule:'名人之路必须用最少步数通关。',
    optimalFailResult:'这题最少需要{best}步。你用了{moves}步。',
    optimalFailEncourage:'再试一次吧。',
    optimalRetry:'再挑战',
    twoMovePatterns:'查看最少2步棋盘',
    twoMoveTitle:'9种最少2步图案',
    twoMoveText:'攻略的关键是学会辨认最少2转的棋盘。\n↓ 选择棋盘查看详细说明。',
    twoMoveDetailTitle:'这个棋盘的提示',
    compareBoard:'滑动棋盘，可与游戏中的棋盘进行比较。',
    playInFree:'在自由模式中玩 →',
    backToPatterns:'返回列表',
    stageModeReturn:'返回关卡模式',
    tipGuideTitle:'攻略提示',
    playThisBoard:'玩这个棋盘 →',
    twoMoveDiscovery:'最少2步棋盘 {n} / 9\n记住这个形状和朝向。',
    detailsLink:'查看详细说明 →',
    backToClear:'返回',
    speedRetry:'再挑战',
    speedPauseProgress:'当前：{current} / {total}　{time}',
    speedStats:'速解成绩',
    speedStatsSummary:'完成次数：{runs}',
    speedStatsEmpty:'还没有完成记录。',
    speedStatsEntry:'第{num}名　{time}　最短 {optimal} / 73',
    speedUnlockedStart:'挑战速解模式 →',
    speedStatsTop:'最佳3次',
    speedStatsPlace:'第{n}名',
    speedStatsOptimal:'最短 {optimal} / 73',
    speedStatsAttempt:'（第{n}次）',
    resetConfirmEarly:'进度都会被删除。要从头再来吗？',
    resetConfirmKeepRewards:'“重置进度”会保留棋盘设计和全部图案页面。\n“全部重置”也会删除它们。',
    resetEverything:'全部重置',
    rankDialogTitle:'已获得的称号',
    linkWelcome:'欢迎自由分享本站。',
    analyticsNotice:'使用Google Analytics进行访问分析。',
    share:'分享',
    shareShort:'分享',
    shareCopied:'链接已复制',
    shareCopyPrompt:'请复制此链接',
    shareGameText:'我正在玩《叫醒不倒翁！》 #WakeSeven',
    shareTrainingText:'我完成了《叫醒不倒翁！》的不倒翁修行！ #WakeSeven',
    shareMasteryText:'我征服了《叫醒不倒翁！》的名人之路！ #WakeSeven',
    shareSatoriText:'我完成了《叫醒不倒翁！》的悟道之路！ #WakeSeven',
    soundOn:'音效开启',
    soundOff:'音效关闭',
    basicGuideJoinOne:'让1个不倒翁与外圈倒下的2个对齐，同时叫醒另外2个。',
    basicGuideJoinTwo:'让2个不倒翁与外圈倒下的1个对齐，同时叫醒另外1个。',
    twoMoveLessonLink:'查看详细说明 →',
    twoMoveLessonOpen:'查看诀窍',
    twoMoveLessonTitle:'还差2转的诀窍',
    twoMoveLessonTipTitle:'“{name}”的诀窍',
    twoMoveTip3DescTemplate:'“{name}”是{text}的形状',
    twoMoveLessonTab1:'选择的诀窍',
    twoMoveLessonTab2:'转动的诀窍',
    twoMoveLessonPractice:'让1个不倒翁去对齐外圈倒下的2个',
    twoMoveLessonSecond:'让2个不倒翁去对齐外圈倒下的1个',
    twoMoveLessonClose:'明白了',
    twoMoveTip3TrapezoidName:'梯形',
    twoMoveTip3TrapezoidText:'倒下的不倒翁排成梯形',
    twoMoveTip3TrapezoidHint:'选择倒下三角中尚未对齐的那一侧',
    twoMoveTip3RibbonName:'丝带',
    twoMoveTip3RibbonText:'倒下的不倒翁排成丝带形',
    twoMoveTip3RibbonHint:'选择倒下三角中尚未对齐的那一侧',
    twoMoveTip3CaterpillarName:'毛毛虫',
    twoMoveTip3CaterpillarText:'倒下的不倒翁排成毛毛虫形',
    twoMoveTip3CaterpillarHint:'选择尾巴左右任一侧',
    twoMoveTip3DiamondName:'菱形',
    twoMoveTip3DiamondText:'倒下的不倒翁排成菱形',
    twoMoveTip3DiamondHint:'选择倒下的三角中的任意一个',
    twoMoveTip3OuterNeighborName:'外侧相邻',
    twoMoveTip3OuterNeighborText:'外圈有2个相邻倒下',
    twoMoveTip3OuterNeighborHint:'选择它们旁边的那一个',
    twoMoveTip3CenterOuterName:'中间与外侧',
    twoMoveTip3CenterOuterText:'中间和外侧各有1个倒下',
    twoMoveTip3CenterOuterHint:'选择中间不倒翁头部或尾部方向的那根轴',
    trainingShapeRuleIntro:'一起记住「还差2圈」的形状和朝向吧',
    developmentShapeRuleIntro:'刚刚经过的就是这个「还差2圈」的形状！',
    trainingShapeRuleHeading:'「还差2圈」的判断条件',
    trainingShapeRuleTrapezoidCondition:'排除同向的一对，顺时针落后的那个朝左',
    trainingShapeRuleCaterpillarCondition:'眼睛一对、身体一对，各自方向相同',
    trainingShapeRuleRibbonCondition:'排除同向的一对，顺时针落后的那个朝左',
    trainingShapeRuleDiamondCondition:'对角朝向不同',
    trainingShapeRuleCenterOuterCondition:'朝向不影响',
    roadmapNote:'习：不倒翁修行（24题）／序～极：名人之路（每卷15题，共60题）',
    roadmapCount:'{n}题',
    cheerCaption:'快到最后了。\n接下来会更难，但不倒翁也在为你加油。',
    quizTitle:'不倒翁小测验',
    quizCorrect:'答对了！',
    quizWrong:'差一点！',
    quizContinue:'继续 →',
    rankLink:'查看称号一览 →',
    clearMessagesLink:'查看通关后消息 →',
    allPatternsMenu:'全部图案',
    allPatternsOpen:'查看全部图案 →',
    masteryBoardNote:'菜单中已新增“全部图案”。',
    satoriText:'已获得白色棋盘和新的角度布局。',
    satori:'悟道之路',
    satoriPicker:'悟道之路 · 73题',
    satoriChoose:'选择题目',
    satoriFailRule:'悟道之路必须用最少步数通关。',
    satoriFailEncourage:'看看图鉴，再试一次吧。',
    satoriTitle:'悟道之路 完成！',
    satoriStart:'前往悟道之路 →',
    satoriRank:'无心',
    satoriUnlock:'悟道之路已开启。',
    twoMovePatternsLink:'查看最少2步的9种图案',
    satoriFailLimit:'已达到最短步数。',
    satoriFailResult:'这题最少需要{best}步。',
    satoriSecondFailTitle:'这不是最少步数。',
    satoriSecondFailRule:'悟道之路要用最少步数叫醒全部不倒翁。',
    satoriIntroTitle:'悟道之路',
    satoriIntroText:'用最少步数看穿全部73种图案。\n没有提示，也不显示剩余步数。\n看着图鉴来挑战吧。',
    satoriIntroStart:'第一题 →',
    debugSkipTutorial:'飛',
    debugIntro2:'入',
    debugBasic11:'基',
    debugAcademy20:'発',
    debugSpeedTraining8:'９',
    debugTrainingUpper:'上',
    debugTrainingMiddle:'中',
    debugTrainingLower:'下',
    debugSpeedIntermediate17:'18',
    debugSpeedMastery26:'27',
    debugSatori72:'悟',
    secondLapTitle:'第二周目',
    secondLapText:'进度将回到起点，已获得的称号会保留。\n第二周目中，开始滑动时操作便会确定，棋盘会朝所选方向自动旋转120°。\n再次完成所有道路，即可获得特别称号“觉者”。',
    secondLapStart:'开始第二周目 →',
    secondLapPath:'第二周目',
    awakenedRank:'觉者',
    awakenedTitle:'第二周目完成！',
    awakenedText:'你再次走完了所有道路。\n获得了七色不倒翁。',
    firstLapLabel:'第一周目',
    secondLapLabel:'第二周目',
    secondLapBadge:'第2周',
    satoriThanks:'这就是关卡模式真正的终点。\n感谢你一路玩到最后。',
    speedMode:'速解模式',
    speedTitle:'速解模式',
    speedIntro:'带计时器挑战全部73种棋盘。\n中途关闭后仍会保存时间和棋盘。',
    speedStart:'开始挑战 →',
    speedGo:'开始',
    speedResume:'继续 →',
    speedPause:'暂停',
    speedPauseTitle:'已暂停',
    speedPauseText:'计时已停止。棋盘和时间已保存。',
    speedRestart:'重新开始',
    speedPuzzleRestart:'重新开始这一题',
    speedRestartTitle:'要从头重新开始吗？',
    speedRestartText:'当前时间和进度将会丢失。',
    speedRestartCancel:'返回',
    speedRestartConfirm:'从头开始',
    speedCompleteTitle:'速解模式完成！',
    speedComplete:'完成全部73题。\n本次记录：{time}\n最佳记录：{best}',
    speedUnlocked:'速解模式已开放。\n挑战全部73种棋盘，刷新最佳记录吧。',
    secondMasteryReward:'获得了七色不倒翁。\n可在菜单的“棋盘设计”中选择。',
    timeLabel:'计时',
    speedModeSelect:'选择速解模式',
    speedOpen:'前往速解 →',
    speedTrainingLabel:'速解九番胜负',
    speedTrainingIntro:'达摩修行的毕业考试：挑战9个最短两步棋盘。',
    speedMasteryLabel:'速解二十七番胜负',
    speedMasteryIntro:'名人之路的毕业考试 "速解二十七番胜负"\n出题范围：从全部73个棋盘中随机选出的27题',
    speedSatoriLabel:'速解七十三番胜负',
    speedSatoriIntro:'悟道之路的奖励：挑战全部73种棋盘。',
    speedTrainingUnlocked:'达摩修行的毕业考试“速解九番胜负”已开放。',
    speedMasteryUnlocked:'名人之路的毕业考试“速解十五番胜负”已开放。',
    speedSatoriUnlocked:'悟道之路的奖励“速解七十三番胜负”已开放。',
    primaryTrialText:'达摩修行完成。\n进入名人之路前，请通过毕业考试“速解九番胜负”。',
    primaryTrialStart:'前往速解九番胜负 →',
    masteryTrialText:'来吧，为了成为真正的名人，挑战毕业考试"速解二十七番胜负"！',
    masteryTrialStart:'毕业考试 速解二十七番胜负 →',
    speedTrialFailTitle:'再次挑战毕业考试',
    speedTrainingTrialFailText:'以最少步数完成所有棋盘，即可开启名人之路。',
    speedMasteryTrialFailText:'以最少步数完成所有棋盘，即可开启悟道之路。',
    speedTrialRetry:'再次挑战毕业考试',
    speedExamBadgePrimary:'毕业考试\n速解九番胜负\n合格',
    speedExamBadgeIntermediate:'修行毕业试炼\n速解十八番胜负\n突破',
    speedExamBadgeMastery:'免许皆传\n速解二十七番胜负\n制霸',
    speedExamBadgeSatori:'速解七十三番胜负\n完成',
    speedSatoriUnlockText:'速解七十三番胜负已解锁。\n挑战全部73种棋盘，刷新最佳记录吧。',
    speedSatoriUnlockStart:'前往速解七十三番胜负 →',
    speedIntermediateLabel:'速解十八番胜负',
    speedIntermediateIntro:'达摩修行的毕业考试 "速解十八番胜负"\n出题范围：上卷（最少2转）和中卷（最少3转）的18题',
    intermediateTrialText:'作为达摩修行的收尾，请挑战毕业考试"速解十八番胜负"。',
    intermediateTrialStart:'毕业考试 速解十八番胜负 →',
    speedIntermediateTrialFailText:'以最少3步完成所有棋盘，即可开启名人之路·离。',
    darumaTraining:'不倒翁修行',
    trainingUpper:'不倒翁修行·上卷',
    trainingMiddle:'不倒翁修行·中卷',
    trainingLower:'不倒翁修行·下卷',
    academyPickerRound:'不倒翁学园',
    academyEnrollTitle:'欢迎来到不倒翁学园！',
    academyWelcomeTitle:'首先是入门班！',
    academyWelcomeText:'一开始先慢慢转动吧',
    academyWelcomeStart:'开始',
    academyWelcomeRemaining:'还差 {n} 转',
    academyWelcomeRelease:'在这里松手',
    academyCompleteTitle:'不倒翁学园毕业！',
    academyCompleteText:'不倒翁修行现已开启。',
    academyCompleteStart:'前往不倒翁修行 →',
    trainingWelcomeTitle:'不倒翁修行 启程！',
    trainingWelcomeText:'从这里开始没有辅助，靠自己解开吧。',
    trainingWelcomeNext:'下一步',
    trainingWelcomeStart:'开始',
    trainingUpperGoalKind:'不倒翁修行·上卷 开始',
    trainingUpperGoalTitle:'上卷会出现这样的形状哦',
    trainingUpperGoalStart:'开始',
    trainingMiddleGoalKind:'不倒翁修行·中卷 开始',
    trainingMiddleGoalTitle:'中卷会出现这样的形状哦',
    trainingMiddleGoalStart:'开始',
    trainingLowerGoalKind:'不倒翁修行·下卷 开始',
    trainingLowerGoalTitle:'下卷会出现这样的形状哦',
    trainingLowerGoalStart:'开始',
    shapeNameCatEars:'猫耳',
    shapeNameBothBanks:'两岸',
    shapeNamePlate:'盘子',
    shapeNameNecklace:'项链',
    shapeNameRightTriangle:'直角三角',
    shapeNameStraightLine:'一字',
    shapeNameShuriken:'手里剑',
    shapeNameCrown:'王冠',
    shapeNameBowArrow:'弓箭',
    shapeNameRectangle:'长方形',
    shapeNameBalloon:'气球',
    shapeNameLargeTriangle:'大三角',
    shapeNameCaterpillar:'毛毛虫',
    trainingTwoMoreLabel:'还差2圈',
    trainingMiddleSpinTitle:'不断转动，变成「还差2圈」时就松手吧。',
    trainingCompleteTitle:'不倒翁修行完成！',
    trainingCompleteText:'名人之路现已开启。',
    trainingCompleteStart:'前往名人之路 →',
    retryLesson:'再次挑战',
    basicWelcomeTitle:'欢迎来到基础班！',
    basicWelcomeText:'还差的转数减少时，就松手。',
    basicWelcomeStart:'开始',
    developmentWelcomeTitle:'发展班开始！',
    developmentWelcomeText:'会出现"还差3转""还差4转"的题目哦',
    developmentWelcomeSpinHint:'转一转，"还差○转"变少了就松开手指吧',
    developmentWelcomeStart:'开始',
    threeDMenu:'查看3D效果',
    threeDUnlockedText:'作为二周目通关的奖励，解锁了特别的3D页面。可以在逼真的棋盘上畅玩。',
    threeDOpen:'打开3D页面 →',
    boardTheme:'棋盘设计',
    boardThemeColor:'颜色',
    boardThemeLayout:'布局',
    boardThemeDefault:'标准',
    boardThemeGold:'金色',
    boardThemeSatori:'黑白',
    boardLayoutNormal:'横向布局',
    boardThemeTilted:'纵向布局',
    darumaColor:'不倒翁',
    darumaColorRed:'红色',
    darumaColorRainbow:'七色',
    secondMasteryTitle:'二周目：名人之路制霸！',
    rotateCcw:'旋转60°',
    rotateCw:'旋转60°',
    flipVertical:'上下翻转'
  },
  ko:{
    pageTitle:'다루마를 깨워라! — WAKE SEVEN',
    language:'언어 선택',
    title:'다루마를 깨워라!',
    prev:'이전',
    next:'다음',
    progress:'진행 상황',
    shortest:'앞으로',
    shortestDisplay:'앞으로',
    moveUnit:'번',
    academyClearSuffix:'이면 클리어',
    moves:'지금',
    stageMode:'문제 모드',
    freeMode:'자유 모드',
    shuffle:'섞기',
    reset:'다시 시작',
    resetAll:'모두 세우기',
    undo:'한 수 되돌리기',
    shortestMoves:'최단 수',
    hint:'다음 수 보기',
    remainingCheck:'남은 수 ×{n}',
    mirror:'좌우 반전',
    rotate:'60° 회전',
    debugReset:'リ',
    debugClear:'즉시',
    debugAlmost:'＋１',
    debugMore:'＋２',
    debugFar:'＋３',
    debugExtra14:'序',
    debugExtra29:'破',
    debugExtra44:'急',
    debugSpeedJumpFinish:'속',
    boardLabel:'일곱 다루마 퍼즐판',
    tips:'공략 팁',
    makeBoard:'보드 만들기',
    playBoard:'이 보드로 플레이',
    nextPuzzle:'다음 문제 →',
    resetProgress:'진행 상황 초기화',
    menuAbout:'이 게임에 대하여',
    stage:'문제',
    intro:'입문',
    basic:'기본',
    development:'발전',
    challenge:'도전',
    freePlay:'자유 모드',
    academyClassSuffix:'반',
    boardMaker:'보드 편집',
    customPuzzle:'사용자 문제',
    freeKind:'자유 모드',
    makerKind:'보드 만들기',
    customKind:'사용자 문제',
    another:'다른 문제',
    again:'다시 하기',
    toFree:'자유 모드로 →',
    optimalClear:'최단 수로 모두 깨웠습니다!',
    allPatternsKind:'명인의 길',
    allPatternsNext:'명인의 길로 →',
    nextPattern:'다음 문제 →',
    stagePicker:'문제 선택',
    stagePickerFree:'자유 모드로',
    stagePickerCustom:'보드 만들기로',
    stagePickerSpeed:'속도전 모드',
    close:'닫기',
    rankCollection:'칭호',
    rankListMenu:'획득한 칭호',
    primaryRound:'다루마 수행',
    patternRound:'명인의 길 {n} · 15문제',
    extraStageAria:'명인의 길 {n} / {total}',
    clear:'모두 깨어났습니다!',
    remaining:'남은 최단 {n}수',
    stageAria:'문제 {n}, 최단 {par}수',
    makerImpossible:'이 배치는 풀 수 없습니다. 다루마를 눌러 방향을 바꾸세요.',
    makerStatus:'다루마를 눌러 방향 변경　현재 최단 {n}수',
    resetConfirm:'진행 상황과 모은 칭호가 모두 사라집니다. 처음부터 다시 시작할까요?',
    introTitle:'다루마를 깨워라!',
    introText:'다루마 세 개를 잡고 빙글 돌려 보세요.',
    introStart:'시작',
    tutorialReset:'초기화',
    tutorialFreedom:'이제 자유롭게 돌려 보세요.',
    gripPrompt:'하늘색 막대를 잡고 돌려 보세요.',
    guidedBasicWrongGrip:'하늘색을 잡으세요',
    tutorialGrabPrompt:'하늘색 막대를 잡아 보세요.',
    tutorialArrowPrompt:'잡은 채로 빙글 돌려 보세요.',
    tutorialReleasePrompt:'여기서 놓아 보세요.',
    tutorialWrongPrompt:'아쉬워요! 거기가 아니에요.',
    tutorialWrongPlacePrompt:'거기가 아니에요.',
    tutorialFirstClearPrompt:'잘했어요! 다른 세 개도 해 봐요.',
    tutorialSecondGrabPrompt:'하늘색을 잡고…',
    tutorialSecondArrowPrompt:'빙글 돌리고…',
    tutorialSecondReleasePrompt:'놓아 보세요.',
    tutorialSecondClearPrompt:'좋아요! 자리도 바뀌어요.',
    tutorialFindPrompt:'어느 막대를 잡아야 할까요?',
    tutorialFindTurnPrompt:'맞아요. 그곳을 돌리고 놓아 보세요.',
    tutorialFindClearPrompt:'좋아요! 다음은 연속해서 두 번 돌려요.',
    tutorialChainPrompt:'막대를 잡고…',
    tutorialChainTurnPrompt:'돌리고…',
    tutorialChainReleasePrompt:'놓아 보세요.',
    tutorialChainAgainPrompt:'어느 막대를 잡아야 할까요?',
    tutorialTrySoloPrompt:'좋아요! 이제 혼자 해 볼까요?',
    tutorialChainDirectionPrompt:'어느 쪽으로 돌릴까요?',
    tutorialChainClearPrompt:'좋아요! 자리도 바뀌어요.',
    tutorialClearPrompt:'모두 일어났어요! 잘했어요!',
    tutorialFinalClearPrompt:'잘했어요! 이제 본편이 시작돼요.',
    masterTitle:'처음 24문제 완료!',
    masterText:'명인의 길이 열렸습니다.\n명인만을 위한 작은 보상도 기다립니다.',
    masterStart:'명인의 길로 →',
    volumeName:'{n}권',
    volumeClearTitle:'{n} 완료!',
    volumeClearText:'다음 권으로 갈 수 있습니다.',
    volumeStart:'다음 권으로 →',
    masteryTitle:'명인의 길 제패!',
    masteryText:'황금 보드를 얻었습니다.\n메뉴에서 보드 색을 고를 수 있습니다.',
    masteryStart:'자유 모드로 →',
    pathInfoTitle:'명인의 길',
    pathInfoText:'1권부터 4권까지, 각 15문제. 모두 60문제입니다.',
    pathInfoStart:'1권 시작 →',
    breakthroughSeal:'돌파',
    masterySeal:'명인',
    menu:'메뉴',
    clearMessages:'클리어 메시지',
    messageDialogTitle:'클리어 메시지',
    optimalFailOne:'아쉬워요! 한 수만 줄이면 됩니다.',
    optimalFailTwo:'조금만 더! 두 수만 줄이면 됩니다.',
    optimalFailMany:'다른 회전으로 최단 길을 찾아보세요!',
    optimalFailRule:'명인의 길은 최단 수로 클리어해야 합니다.',
    optimalFailResult:'이 문제의 최단 수는 {best}수입니다. 당신은 {moves}수였습니다.',
    optimalFailEncourage:'한 번 더 도전해 보세요.',
    optimalRetry:'다시 도전',
    twoMovePatterns:'최단 2수 보드 보기',
    twoMoveTitle:'최단 2수 9가지 패턴',
    twoMoveText:'공략의 핵심은 최단 2번 보드를 구별하는 것입니다.\n↓ 보드를 선택해 자세한 설명을 보세요.',
    twoMoveDetailTitle:'이 보드의 팁',
    compareBoard:'보드를 스와이프하면 게임 보드와 비교할 수 있어요.',
    playInFree:'자유 모드에서 하기 →',
    backToPatterns:'목록으로',
    stageModeReturn:'문제 모드로',
    tipGuideTitle:'공략 팁',
    playThisBoard:'이 보드로 하기 →',
    twoMoveDiscovery:'최단 2수 보드 {n} / 9\n이 모양과 방향을 그대로 기억해 보세요.',
    detailsLink:'자세한 설명 보기 →',
    backToClear:'돌아가기',
    speedRetry:'다시 도전',
    speedPauseProgress:'현재: {current} / {total} · {time}',
    speedStats:'속도전 기록',
    speedStatsSummary:'완주 횟수: {runs}회',
    speedStatsEmpty:'아직 완주 기록이 없습니다.',
    speedStatsEntry:'{num}위 · {time} · 최단 {optimal} / 73',
    speedUnlockedStart:'속도전 모드에 도전 →',
    speedStatsTop:'베스트 3',
    speedStatsPlace:'{n}위',
    speedStatsOptimal:'최단 {optimal} / 73',
    speedStatsAttempt:'({n}회차)',
    resetConfirmEarly:'진행 상황이 모두 사라집니다. 처음부터 다시 시작할까요?',
    resetConfirmKeepRewards:'“진행 상황 초기화”는 보드 디자인과 모든 패턴 목록을 유지합니다.\n“모두 초기화”는 이것들도 삭제합니다.',
    resetEverything:'모두 초기화',
    rankDialogTitle:'획득한 칭호',
    linkWelcome:'자유롭게 공유해 주세요.',
    analyticsNotice:'접속 분석에 Google Analytics를 사용합니다.',
    share:'공유',
    shareShort:'공유',
    shareCopied:'링크를 복사했어요',
    shareCopyPrompt:'이 링크를 복사하세요',
    shareGameText:'다루마를 깨워라!를 플레이하고 있어요. #WakeSeven',
    shareTrainingText:'다루마를 깨워라!의 다루마 수행을 완료했어요! #WakeSeven',
    shareMasteryText:'다루마를 깨워라!의 명인의 길을 정복했어요! #WakeSeven',
    shareSatoriText:'다루마를 깨워라!의 깨달음의 길을 완료했어요! #WakeSeven',
    soundOn:'효과음 켜짐',
    soundOff:'효과음 꺼짐',
    basicGuideJoinOne:'바깥쪽에 누운 2개에 1개를 맞추고, 나머지 2개를 깨우세요.',
    basicGuideJoinTwo:'바깥쪽에 누운 1개에 2개를 맞추고, 나머지 1개를 깨우세요.',
    twoMoveLessonLink:'자세한 해설 보기 →',
    twoMoveLessonOpen:'요령 보기',
    twoMoveLessonTitle:'앞으로 2회전 요령',
    twoMoveLessonTipTitle:'"{name}" 요령',
    twoMoveTip3DescTemplate:'"{name}"은 {text} 모양이에요',
    twoMoveLessonTab1:'고르는 요령',
    twoMoveLessonTab2:'돌리는 요령',
    twoMoveLessonPractice:'바깥쪽에 누운 2개에 1개를 맞추러 가자',
    twoMoveLessonSecond:'바깥쪽에 누운 1개에 2개를 맞추러 가자',
    twoMoveLessonClose:'알겠어요',
    twoMoveTip3TrapezoidName:'사다리꼴',
    twoMoveTip3TrapezoidText:'누운 다루마가 사다리꼴로 늘어서 있어요',
    twoMoveTip3TrapezoidHint:'누운 삼각형 중 맞춰지지 않은 쪽을 고르자',
    twoMoveTip3RibbonName:'리본',
    twoMoveTip3RibbonText:'누운 다루마가 리본 모양으로 늘어서 있어요',
    twoMoveTip3RibbonHint:'누운 삼각형 중 맞춰지지 않은 쪽을 고르자',
    twoMoveTip3CaterpillarName:'애벌레',
    twoMoveTip3CaterpillarText:'누운 다루마가 애벌레 모양으로 늘어서 있어요',
    twoMoveTip3CaterpillarHint:'꼬리의 좌우 중 한쪽을 고르자',
    twoMoveTip3DiamondName:'마름모',
    twoMoveTip3DiamondText:'누운 다루마가 마름모로 늘어서 있어요',
    twoMoveTip3DiamondHint:'누운 삼각형 중 하나를 고르자',
    twoMoveTip3OuterNeighborName:'바깥 이웃',
    twoMoveTip3OuterNeighborText:'바깥쪽에서 2개가 서로 이웃하여 누워 있어요',
    twoMoveTip3OuterNeighborHint:'그 옆을 고르자',
    twoMoveTip3CenterOuterName:'가운데와 바깥',
    twoMoveTip3CenterOuterText:'가운데와 바깥쪽에 하나씩 누워 있어요',
    twoMoveTip3CenterOuterHint:'가운데 다루마의 머리나 꼬리 쪽에 있는 축을 고르자',
    trainingShapeRuleIntro:'"앞으로 2바퀴"의 모양과 방향을 기억해두자',
    developmentShapeRuleIntro:'방금 지나온 "앞으로 2바퀴" 모양이에요!',
    trainingShapeRuleHeading:'"앞으로 2바퀴"가 되는 조건',
    trainingShapeRuleTrapezoidCondition:'같은 방향인 것을 제외하고, 시계 방향으로 뒤처진 쪽이 왼쪽을 향함',
    trainingShapeRuleCaterpillarCondition:'눈끼리·몸통끼리 같은 방향',
    trainingShapeRuleRibbonCondition:'같은 방향인 것을 제외하고, 시계 방향으로 뒤처진 쪽이 왼쪽을 향함',
    trainingShapeRuleDiamondCondition:'대각선끼리 다른 방향',
    trainingShapeRuleCenterOuterCondition:'방향은 상관없음',
    roadmapNote:'습: 다루마 수행(24문제) / 서~극: 명인의 길(각 15문제, 총 60문제)',
    roadmapCount:'{n}문제',
    cheerCaption:'마지막이 가까워졌어요.\n더 어려워지지만 다루마도 응원하고 있어요.',
    quizTitle:'다루마 퀴즈',
    quizCorrect:'정답!',
    quizWrong:'아쉬워요!',
    quizContinue:'계속 →',
    rankLink:'칭호 목록 보기 →',
    clearMessagesLink:'클리어 메시지 보기 →',
    allPatternsMenu:'모든 패턴',
    allPatternsOpen:'모든 패턴 보기 →',
    masteryBoardNote:'메뉴에 “모든 패턴”이 추가되었습니다.',
    satoriText:'하얀 보드와 새로운 각도 배치를 얻었습니다.',
    satori:'깨달음의 길',
    satoriPicker:'깨달음의 길 · 73문제',
    satoriChoose:'문제 선택',
    satoriFailRule:'깨달음의 길은 최단 수로만 클리어할 수 있습니다.',
    satoriFailEncourage:'게놈을 보고 다시 도전해 보세요.',
    satoriTitle:'깨달음의 길 완료!',
    satoriStart:'깨달음의 길로 →',
    satoriRank:'무심',
    satoriUnlock:'깨달음의 길이 열렸습니다.',
    twoMovePatternsLink:'최단 2수의 9가지 패턴 보기',
    satoriFailLimit:'최단 수에 도달했습니다.',
    satoriFailResult:'이 문제의 최단 수는 {best}수입니다.',
    satoriSecondFailTitle:'최단 수가 아닙니다.',
    satoriSecondFailRule:'깨달음의 길에서는 최단 수로 모두 깨워야 합니다.',
    satoriIntroTitle:'깨달음의 길',
    satoriIntroText:'73가지 패턴을 최단 수로 꿰뚫어 보세요.\n힌트와 남은 수 표시는 없습니다.\n게놈을 보며 도전하세요.',
    satoriIntroStart:'첫 문제 →',
    debugSkipTutorial:'飛',
    debugIntro2:'入',
    debugBasic11:'基',
    debugAcademy20:'発',
    debugSpeedTraining8:'９',
    debugTrainingUpper:'上',
    debugTrainingMiddle:'中',
    debugTrainingLower:'下',
    debugSpeedIntermediate17:'18',
    debugSpeedMastery26:'27',
    debugSatori72:'悟',
    secondLapTitle:'두 번째 여정',
    secondLapText:'진행 상황은 처음으로 돌아가지만 획득한 칭호는 유지됩니다.\n두 번째 여정에서는 스와이프를 시작하는 순간 한 수가 확정되고 선택한 방향으로 120° 자동 회전합니다.\n모든 길을 다시 완주하면 특별 칭호 “각자”를 얻습니다.',
    secondLapStart:'두 번째 여정 시작 →',
    secondLapPath:'두 번째 여정',
    awakenedRank:'각자',
    awakenedTitle:'두 번째 여정 완료!',
    awakenedText:'모든 길을 다시 한번 걸어냈습니다.\n일곱 색 다루마를 얻었습니다.',
    firstLapLabel:'1주차',
    secondLapLabel:'2주차',
    secondLapBadge:'2주차',
    satoriThanks:'스테이지 모드는 여기서 정말 끝입니다.\n끝까지 플레이해 주셔서 감사합니다.',
    speedMode:'속도전 모드',
    speedTitle:'속도전 모드',
    speedIntro:'타이머와 함께 73개 보드를 도전하는 모드입니다.\n도중에 닫아도 시간과 보드가 저장됩니다.',
    speedStart:'도전하기 →',
    speedGo:'시작',
    speedResume:'계속하기 →',
    speedPause:'일시 중지',
    speedPauseTitle:'일시 중지됨',
    speedPauseText:'타이머가 멈췄습니다. 보드와 시간은 저장됩니다.',
    speedRestart:'처음부터',
    speedPuzzleRestart:'이 문제 다시 하기',
    speedRestartTitle:'처음부터 다시 할까요?',
    speedRestartText:'현재 시간과 진행 상황이 사라집니다.',
    speedRestartCancel:'돌아가기',
    speedRestartConfirm:'처음부터 다시',
    speedCompleteTitle:'속도전 완주!',
    speedComplete:'73문제를 모두 풀었습니다.\n이번 기록: {time}\n최고 기록: {best}',
    speedUnlocked:'속도전 모드가 열렸습니다.\n73개 보드를 달려 최고 기록에 도전하세요.',
    secondMasteryReward:'일곱 색 다루마를 얻었습니다.\n메뉴의 보드 디자인에서 선택할 수 있습니다.',
    timeLabel:'시간',
    speedModeSelect:'속도전 선택',
    speedOpen:'속도전으로 →',
    speedTrainingLabel:'속도전 아홉 판',
    speedTrainingIntro:'다루마 수련의 졸업 시험: 최단 2수 보드 9개에 도전합니다.',
    speedMasteryLabel:'속도전 스물일곱 판',
    speedMasteryIntro:'명인의 길 개전 시험 "속도전 스물일곱 판"\n출제 범위: 전체 73개 보드 중 무작위로 뽑힌 27문제',
    speedSatoriLabel:'속도전 일흔세 판',
    speedSatoriIntro:'깨달음의 길 보상: 73개 보드를 모두 달립니다.',
    speedTrainingUnlocked:'다루마 수련 졸업 시험 “속도전 아홉 판”이 열렸습니다.',
    speedMasteryUnlocked:'명인의 길 졸업 시험 “속도전 열다섯 판”이 열렸습니다.',
    speedSatoriUnlocked:'깨달음의 길 보상 “속도전 일흔세 판”이 열렸습니다.',
    primaryTrialText:'다루마 수련을 마쳤습니다.\n명인의 길로 가기 전에 졸업 시험 “속도전 아홉 판”에 도전하세요.',
    primaryTrialStart:'속도전 아홉 판으로 →',
    masteryTrialText:'자, 진정한 명인이 되기 위한 개전 시험 "속도전 스물일곱 판"에 도전합시다!',
    masteryTrialStart:'개전 시험 속도전 스물일곱 판으로 →',
    speedTrialFailTitle:'졸업 시험 재도전',
    speedTrainingTrialFailText:'모든 보드를 최단 수로 풀면 명인의 길이 열립니다.',
    speedMasteryTrialFailText:'모든 보드를 최단 수로 풀면 깨달음의 길이 열립니다.',
    speedTrialRetry:'졸업 시험 다시 도전',
    speedExamBadgePrimary:'졸업 시험\n속도전 아홉 판\n합격',
    speedExamBadgeIntermediate:'수행 졸업 시험\n속도전 열여덟 판\n돌파',
    speedExamBadgeMastery:'면허개전\n속도전 스물일곱 판\n제패',
    speedExamBadgeSatori:'속도전 일흔세 판\n완주',
    speedSatoriUnlockText:'속도전 일흔세 판이 열렸습니다.\n73개 보드를 달려 최고 기록에 도전하세요.',
    speedSatoriUnlockStart:'속도전 일흔세 판으로 →',
    speedIntermediateLabel:'속도전 열여덟 판',
    speedIntermediateIntro:'다루마 수행의 수료 시험 "속도전 열여덟 판"\n출제 범위: 상권(최단 2회전)과 중권(최단 3회전) 18문제',
    intermediateTrialText:'다루마 수행의 마무리로, 수료 시험 "속도전 열여덟 판"에 도전합니다.',
    intermediateTrialStart:'수료 시험 속도전 열여덟 판으로 →',
    speedIntermediateTrialFailText:'모든 보드를 최단 3수로 풀면 명인의 길·리가 열립니다.',
    darumaTraining:'다루마 수행',
    trainingUpper:'다루마 수행·상권',
    trainingMiddle:'다루마 수행·중권',
    trainingLower:'다루마 수행·하권',
    academyPickerRound:'다루마 학원',
    academyEnrollTitle:'다루마 학원 입학을 축하합니다!',
    academyWelcomeTitle:'먼저 입문 클래스야!',
    academyWelcomeText:'처음에는 천천히 돌려 보세요',
    academyWelcomeStart:'시작',
    academyWelcomeRemaining:'앞으로 {n}회전',
    academyWelcomeRelease:'여기서 놓기',
    academyCompleteTitle:'다루마 학원 졸업!',
    academyCompleteText:'다루마 수행이 열렸습니다.',
    academyCompleteStart:'다루마 수행으로 →',
    trainingWelcomeTitle:'다루마 수행 출발!',
    trainingWelcomeText:'여기서부터는 보조 없이 스스로 풀어 보자',
    trainingWelcomeNext:'다음으로',
    trainingWelcomeStart:'시작',
    trainingUpperGoalKind:'다루마 수행·상권 시작',
    trainingUpperGoalTitle:'상권에는 이런 모양이 나와',
    trainingUpperGoalStart:'시작',
    trainingMiddleGoalKind:'다루마 수행·중권 시작',
    trainingMiddleGoalTitle:'중권에는 이런 모양이 나와',
    trainingMiddleGoalStart:'시작',
    trainingLowerGoalKind:'다루마 수행·하권 시작',
    trainingLowerGoalTitle:'하권에는 이런 모양이 나와',
    trainingLowerGoalStart:'시작',
    shapeNameCatEars:'고양이 귀',
    shapeNameBothBanks:'양쪽 둑',
    shapeNamePlate:'접시',
    shapeNameNecklace:'목걸이',
    shapeNameRightTriangle:'직각삼각형',
    shapeNameStraightLine:'일자',
    shapeNameShuriken:'수리검',
    shapeNameCrown:'왕관',
    shapeNameBowArrow:'활과 화살',
    shapeNameRectangle:'직사각형',
    shapeNameBalloon:'풍선',
    shapeNameLargeTriangle:'큰 삼각형',
    shapeNameCaterpillar:'애벌레',
    trainingTwoMoreLabel:'앞으로 2바퀴',
    trainingMiddleSpinTitle:'계속 돌리다가 "앞으로 2바퀴"가 되면 손을 떼자.',
    trainingCompleteTitle:'다루마 수행 완료!',
    trainingCompleteText:'명인의 길이 열렸습니다.',
    trainingCompleteStart:'명인의 길로 →',
    retryLesson:'다시 도전',
    basicWelcomeTitle:'기본반에 오신 것을 환영합니다!',
    basicWelcomeText:'남은 회전 수가 줄면 손을 놓으세요.',
    basicWelcomeStart:'시작하기',
    developmentWelcomeTitle:'발전반 시작!',
    developmentWelcomeText:'"앞으로 3바퀴", "앞으로 4바퀴" 문제가 나와요!',
    developmentWelcomeSpinHint:'빙글빙글 돌리다가 "앞으로 ○바퀴"가 줄어들면 손을 떼세요',
    developmentWelcomeStart:'시작하기',
    threeDMenu:'3D로 보기',
    threeDUnlockedText:'2회차 클리어 보상으로 특별한 3D 페이지가 열렸습니다. 리얼한 보드에서 플레이할 수 있습니다.',
    threeDOpen:'3D 페이지 열기 →',
    boardTheme:'보드 디자인',
    boardThemeColor:'색상',
    boardThemeLayout:'배치',
    boardThemeDefault:'기본',
    boardThemeGold:'금색',
    boardThemeSatori:'흑백',
    boardLayoutNormal:'가로 배치',
    boardThemeTilted:'세로 배치',
    darumaColor:'다루마',
    darumaColorRed:'빨강',
    darumaColorRainbow:'일곱 색',
    secondMasteryTitle:'2회차 명인의 길 제패!',
    rotateCcw:'60° 회전',
    rotateCw:'60° 회전',
    flipVertical:'상하 반전'
  }
};
