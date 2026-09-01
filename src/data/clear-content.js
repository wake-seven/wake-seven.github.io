// ===== クリア後・開始前メッセージデータ =====
// 問題データやUIロジックから分離した、クリア後・開始前の多言語コンテンツ。
// キーと内容は変更せず、公開用index.htmlへビルド時に埋め込む。
const CLEAR_CONTENT={
  // 入門
  academy1_1:{tip:{ja:'水色の棒をつかんで回そう',en:'Start your swipe near a blue handle to turn the three daruma more easily.',zh:'从浅蓝色短条附近开始滑动，会更容易转动三个不倒翁。',ko:'하늘색 막대 근처에서 스와이프하면 세 다루마를 더 쉽게 돌릴 수 있어요.'},art:'introGuide'},
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
  training1_5:{tip:{ja:'上巻の後半では、外側の寝た1枚に、2枚を合わせにいこう',en:'In the second half of Volume 1, match two daruma to the one fallen on the outside.',zh:'上卷后半段，把两个不倒翁对齐到外圈倒下的一个。',ko:'상권 후반에는 바깥쪽에 누운 1개에 2개를 맞추러 가자.'},art:'twoMoveLessonTwo'},
  training1_7:{tip:{ja:'一度クリアした問題は、「← 前へ」「次へ →」と、その真ん中のボタンでいつでも戻れます。',en:'Use Previous, Next, or the button between them to revisit cleared puzzles at any time.',zh:'已通过的关卡可随时用“上一题”“下一题”或中间的按钮返回。',ko:'성공한 문제는 이전, 다음 또는 그 사이의 버튼으로 언제든 다시 갈 수 있어요.'},art:'navigation'},
  training1_9:{tip:{ja:'次からは、最短3くるりの問題です。',en:'The next puzzles take three turns.',zh:'接下来是最少3转的问题。',ko:'다음부터는 최단 3번 문제입니다.'}},
  // だるま学園卒業→だるま修行の間に挟む案内ダイアログ。stageIndexで言えばacademy3_8とtraining1_1の境目。
  training1_1before:{dialog:'trainingWelcome'},
  // 上巻完了→中巻開始の間に挟む案内ダイアログ。
  training2_1before:{dialog:'trainingMiddleGoal'},
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
// 表示種別をデータ上で明示する。通常の問題クリア後メッセージと、
// 次の節・クラスへ進む節目ダイアログを同じ入口で監査できるようにする。
Object.values(CLEAR_CONTENT).forEach(entry=>{entry.kind=entry.dialog?'milestone':'clear';});
// 公開native moduleの構文境界。
export {};
