// ===== 盤面クイズデータ =====
/* クイズは見直すたびに選択肢の位置を変える。 */
// en/zh/koのnotTwoは現状どこからも読まれていない下書きの出題文(「最短2手でない盤面はどれ？」)。
// 未使用だからと削除しないこと(後で使う予定)。
const BOARD_QUIZ_COPY={
  ja:{title:'盤面クイズ',moves:'この盤面は最短何手？',choose:'最短2手の盤面を選んでね。',chooseThree:'どちらが最短3手？正解だと思う盤面を選択してね。',chooseTwo:'最短2手の盤面を、2つ選んでね。',selectMore:'あと{n}つ選んでね。',moveChoices:['最短1手','最短2手','最短3手','最短4手'],movesNote:'2体寝ていて片方が真ん中なら最短2手です。',diamond:'ひし形は、対角線のだるまが逆向きなら最短2手です。',caterpillar:'芋虫は、目玉同士・胴体同士がそれぞれ同じ向きなら最短2手です。',outer:'外周で隣り合う2体の向きまで合っていれば、最短2手です。',ribbon:'リボン型は、だるまの向きまで見分ける必要があります。',trapezoid:'台形型は、だるまの向きまで見分ける必要があります。',largeTriangle:'大三角が起きてる方は最短3手、寝てる方は最短4手です。'},
  en:{title:'Board Quiz',moves:'What is this board’s shortest solution?',choose:'Which board takes only 2 moves?',notTwo:'Which board does not take 2 moves?',moveChoices:['1 move','2 moves','3 moves','4 moves'],movesNote:'This is pattern 1 of the nine 2-move boards.',diamond:'For a diamond, opposite corners must face opposite ways.',caterpillar:'For a caterpillar, the eyes match each other and the body pair match each other.',outer:'The two neighboring outer daruma must also have the right directions.',ribbon:'In a ribbon, the odd daruma’s direction is decisive.',trapezoid:'For a trapezoid, distinguish the odd daruma’s direction too.'},
  zh:{title:'棋盘小测验',moves:'这个棋盘最少需要几步？',choose:'哪一个最少只要2步？',notTwo:'哪一个不是最少2步？',moveChoices:['最少1步','最少2步','最少3步','最少4步'],movesNote:'这是“最少2步的9种图案”中的第1种。',diamond:'菱形中，对角线上的不倒翁方向相反时才是最少2步。',caterpillar:'毛毛虫形中，眼睛彼此同向、身体彼此同向时才是最少2步。',outer:'外圈相邻的两个不倒翁方向也必须正确。',ribbon:'缎带形的关键是那个不同方向的不倒翁。',trapezoid:'梯形还需要辨认那个不同方向的不倒翁。'},
  ko:{title:'보드 퀴즈',moves:'이 보드의 최단 수는?',choose:'어느 보드가 최단 2수일까요?',notTwo:'최단 2수가 아닌 것은?',moveChoices:['최단 1수','최단 2수','최단 3수','최단 4수'],movesNote:'최단 2수 9가지 패턴 중 1번입니다.',diamond:'마름모는 대각선 다루마가 서로 반대 방향이면 최단 2수입니다.',caterpillar:'애벌레는 눈끼리, 몸통끼리 각각 같은 방향이면 최단 2수입니다.',outer:'바깥쪽에서 이웃한 두 다루마의 방향도 맞아야 합니다.',ribbon:'리본형은 다른 하나의 다루마 방향이 핵심입니다.',trapezoid:'사다리꼴은 다른 하나의 다루마 방향도 구별해야 합니다.'}
};
Object.assign(BOARD_QUIZ_COPY.en,{chooseThree:'Which board takes 3 moves?',largeTriangle:'A large triangle of fallen daruma can take either 3 or 4 moves, depending on their directions.'});
Object.assign(BOARD_QUIZ_COPY.zh,{chooseThree:'哪一个最少需要3步？',largeTriangle:'倒下的大三角形会因方向不同而需要3步或4步。'});
Object.assign(BOARD_QUIZ_COPY.ko,{chooseThree:'어느 보드가 최단 3수일까요?',largeTriangle:'누운 다루마의 큰 삼각형은 방향에 따라 최단 3수 또는 4수가 됩니다.'});
