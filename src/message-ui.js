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
function configureMilestoneHeader(entry,title){$('messageDialogTitle').textContent=title;$('messageDialogPlace').textContent=messageReviewPlace(entry);}
function prepareMessageReview(entry){const art=messageReviewArt(entry),twoMoveLesson=lessonVariantFromArt(art),messageClearEntry=configureMessageReviewType(entry);configureMessageReviewLinks(entry,messageClearEntry);return {art,twoMoveLesson,messageClearEntry};}
function milestoneRenderer(entry){return MILESTONE_RENDERERS[entry.master]||MILESTONE_RENDERERS.volume;}
function messageReviewRenderer(entry){if(entry.quiz!==undefined)return MESSAGE_RENDERERS.quiz;if(entry.boardQuiz)return MESSAGE_RENDERERS.boardQuiz;return MESSAGE_RENDERERS.text;}
