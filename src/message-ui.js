// ===== メッセージUIの宣言データ =====
const MESSAGE_ROADMAP_MASTERS=Object.freeze(['primary','mastery','satori','satoriIntro','secondLapIntro','awakening','trainingWelcome']);
const MESSAGE_MASTERY_BOARD_MASTERS=Object.freeze(['mastery','satori','awakening']);
const MESSAGE_TILTED_BOARD_MASTERS=Object.freeze(['satori','awakening']);
const INTRO_MILESTONE_COPY=Object.freeze({
  satoriIntro:['satoriIntroTitle','satoriIntroText'],
  secondLapIntro:['secondLapTitle','secondLapText'],
  trainingWelcome:['trainingWelcomeTitle','trainingWelcomeText']
});
const VOLUME_NEXT_RULES=Object.freeze({
  ja:[
    '「破」からは、ヒントが使えなくなります。',
    '「急」では途中から最短4手の問題です。\nスワイプ中は残り最短手数が「？」になります。',
    '「極」では残り最短手数が表示されません。\nかわりに回数限定で「残り手数」のボタンが使えますが、これも途中から使用回数が減っていきます。'
  ]
});
function messageReviewView(){return {seal:$('messageMasterSeal'),rankText:$('messageRankText'),masterText:$('messageMasterText'),boardNote:$('messageMasterBoardNote'),rules:$('messageRules'),roadmap:$('messageRoadmap'),roadmapNote:$('messageRoadmapNote'),illustration:$('messageIllustration'),lessonCopy:$('messageTwoMoveLessonCopy'),lessonRule:$('messageTwoMoveLessonRule')};}
