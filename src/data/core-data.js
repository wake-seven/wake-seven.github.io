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
// 盤面アルゴリズムはDOMから切り離したドメイン実装を利用し、既存名は互換ラッパーとして残す。
const BOARD_DOMAIN=WakeSevenBoardDomain.create({cellCount:N,triangles:TRI});
const P3=BOARD_DOMAIN.powers, NS=BOARD_DOMAIN.stateCount;
const enc=o=>BOARD_DOMAIN.encode(o);
const dec=n=>BOARD_DOMAIN.decode(n);
const swipeOnce=(o,ti,dir)=>BOARD_DOMAIN.swipe(o,ti,dir);
const clickOnce=(o,ti,dir=1)=>BOARD_DOMAIN.click(o,ti,dir);
const rollOnce=(o,ti,dir)=>BOARD_DOMAIN.roll(o,ti,dir);
const centerOnce=(o,dir=1)=>BOARD_DOMAIN.center(o,dir);
const buildSolver=kind=>BOARD_DOMAIN.buildSolver(kind);
const SOLVER=buildSolver('roll');
const INTRO_STAGE_COUNT=3;
const BASIC_STAGE_COUNT=9;
const BASIC_STAGE_START=INTRO_STAGE_COUNT;
// 応用クラスは目標の3枚だけを示す9問。基本クラスと同じ2くるりの9型を使い、
// 発展クラスは目標も示さない8問。
// いずれも6本の棒から自分で回す場所を考える学習区間。
const APPLICATION_STAGE_COUNT=9;
const APPLICATION_STAGE_START=BASIC_STAGE_START+BASIC_STAGE_COUNT;
const DEVELOPMENT_THREE_COUNT=5;
const DEVELOPMENT_FOUR_COUNT=3;
const DEVELOPMENT_STAGE_COUNT=DEVELOPMENT_THREE_COUNT+DEVELOPMENT_FOUR_COUNT;
const DEVELOPMENT_STAGE_START=APPLICATION_STAGE_START+APPLICATION_STAGE_COUNT;
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
// クリア後・開始前・盤面案内を同じメッセージカタログから引く。
const MESSAGE_CATALOG={clear:CLEAR_CONTENT,guidance:{}};
function messageDefinition(kind,key){
  const content=MESSAGE_CATALOG[kind]?.[key];
  return content==null?null:{id:key,kind,content};
}
function messageContent(kind,key){return messageDefinition(kind,key)?.content||null;}
// 画面ごとに個別のオブジェクトを組み立てず、すべてのメッセージを
// 同じ descriptor 形に正規化する。表示側は content の構造だけを解釈する。
function messageDescriptor({id,kind,type='text',timing='afterClear',content,titleKey=null,bodyKey=null,actions=[]}={}){
  return {id,kind,type,timing,content,titleKey,bodyKey,actions};
}
function normalizeMessage(kind,key,content=messageContent(kind,key)){
  if(content==null)return null;
  const timing=kind==='guidance'?'inBoard':key.endsWith('before')?'beforeStart':'afterClear';
  const type=kind==='guidance'?'guidance':content.quiz?'quiz':content.boardQuiz?'boardQuiz':content.art?'trivia':'text';
  return messageDescriptor({id:key,kind,type,timing,content});
}
function clearMessageDescriptor(mode,index){return normalizeMessage('clear',clearContentKey(mode,index));}
function milestoneMessageDescriptor(key){return messageDescriptor({id:key,kind:'milestone',type:'dialog',timing:'beforeStart',content:key});}
// stageIndex/extraIndex から CLEAR_CONTENT のキーへ変換する。
function clearContentKey(mode,index){
  if(mode){
    const vol=Math.floor(index/MASTER_VOLUME_SIZE)+1,q=index%MASTER_VOLUME_SIZE+1;
    return 'mastery'+vol+'_'+q;
  }
  if(index<INTRO_STAGE_COUNT)return 'academy1_'+(index+1);
  if(index<APPLICATION_STAGE_START)return 'academy2_'+(index-BASIC_STAGE_START+1);
  if(index<DEVELOPMENT_STAGE_START)return 'academy3_'+(index-APPLICATION_STAGE_START+1);
  if(index<TRAINING_STAGE_START)return 'academy4_'+(index-DEVELOPMENT_STAGE_START+1);
  if(index<TRAINING_STAGE_START+TRAINING_UPPER_COUNT)return 'training1_'+(index-TRAINING_STAGE_START+1);
  if(index<TRAINING_STAGE_START+TRAINING_UPPER_COUNT+TRAINING_MIDDLE_COUNT)return 'training2_'+(index-TRAINING_STAGE_START-TRAINING_UPPER_COUNT+1);
  return 'training3_'+(index-TRAINING_STAGE_START-TRAINING_UPPER_COUNT-TRAINING_MIDDLE_COUNT+1);
}
function clearContentAt(mode,index){return messageContent('clear',clearContentKey(mode,index));}
// その問題が始まる直前/終わった直後に、追加でダイアログを挟みたい場合に使う。
function clearContentBefore(mode,index){return messageContent('clear',clearContentKey(mode,index)+'before');}
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
const TRAINING_UPPER_STAGES=STAGES.splice(APPLICATION_STAGE_START,TRAINING_UPPER_VIEWS.length);
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
// 中巻で使う後半9問だけを応用編から名人への道へ振り分けるための除外集合。
const trainingStateSet=new Set(TRAINING_THREE_MOVE_STATE_IDS.slice(9));
const threeMoveStageByState=new Map(ALL_THREE_MOVE_STAGES.map(stage=>[stage.state,stage]));
// 応用クラス: 目標にする3枚を問題ごとに明示した2くるり問題。
// targetCellsは「正しい棒を1回回した後に、同じ向きで寝る3枚」を表す。
// 表示側でソルバーから推測しないため、画像を見ながら問題単位で調整できる。
const APPLICATION_STAGE_TARGETS=[
  {source:1,targetCells:[0,1,4]},
  {source:0,targetCells:[0,1,6]},
  {source:2,targetCells:[0,1,5]},
  {source:3,targetCells:[0,1,5]},
  {source:4,targetCells:[0,1,2]},
  {source:5,targetCells:[0,1,4]},
  {source:6,targetCells:[1,2,3]},
  {source:7,targetCells:[0,1,2]},
  {source:8,targetCells:[4,5,6]}
];
const APPLICATION_STAGES=APPLICATION_STAGE_TARGETS.map(({source,targetCells})=>({
  ...TWO_MOVE_STAGES[source],application:true,targetCells:Object.freeze(targetCells)
}));
// 中巻で使う後半9だけを名人への道から除外する。前半9は名人・3くるり30問側へ回す
// (3くるり30問+4くるり15問=45問で名人への道の巻数は変わらない)。
function threeMoveStage(state){
  const stage=threeMoveStageByState.get(state);
  if(!stage)throw new Error('Missing three-move training pattern: '+state);
  return {...stage};
}
// 発展クラス・3くるり5問: 棒を1本(soloRod)だけ正解として保証し、soloDir方向へ回すと真ん中が倒れて
// 既知の「あと2くるり」5形(中と外/ひし形/いも虫/リボン/台形の順)に着地する。
// りぼん(4/5)だけは名人への道「序6」の盤面を流用(長方形型の3くるり)。
// initialRodCountは問題ごとの初期候補本数。表示時は学園のルールで最大3本に制限し、
// 残り1くるりになったときだけ6本に戻す。間違えた棒はその都度落ちる。
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
STAGES.push(...APPLICATION_STAGES,...DEVELOPMENT_STAGES,...TRAINING_UPPER_STAGES,...TRAINING_MIDDLE_STAGES,...TRAINING_LOWER_STAGES);
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
// 悟りへの道の出題データは src/data/satori.js で構築する。
let currentLang='ja';
// 公開ネイティブモジュールの構文境界。
export {};
