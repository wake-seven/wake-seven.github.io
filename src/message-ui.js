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
function messageReviewContent(entry){return entry?.message?.content||null;}
function messageReviewArt(entry){const content=messageReviewContent(entry);return entry?.art||content?.art||'';}
function configureMessageReviewType(entry){const content=messageReviewContent(entry),messageClearEntry=content||(entry.extra?clearContentAt(true,entry.index):null);$('messageDialogText').hidden=!!entry.master||entry.quiz!==undefined||!!entry.boardQuiz;$('messageQuiz').hidden=entry.quiz===undefined;$('messageBoardQuiz').hidden=!entry.boardQuiz;return messageClearEntry;}
function configureMessageReviewLinks(entry,messageClearEntry){const twoMoveCard=messageClearEntry?.twoMoveCard,guideCard=messageClearEntry?.guideCard,rankLink=messageClearEntry?.link==='rank',tipsLink=messageClearEntry?.link==='tips',patternsLink=messageClearEntry?.link==='patterns',link=$('messageRankLink');link.hidden=twoMoveCard===undefined&&!guideCard&&!rankLink&&!tipsLink&&!patternsLink;link.dataset.target=tipsLink?'tips':patternsLink?'patterns':twoMoveCard!==undefined?'card':guideCard?'guide':'rank';link.textContent=tipsLink?tr('tipGuideTitle')+' →':patternsLink?tr('twoMovePatternsLink')+' →':twoMoveCard!==undefined||guideCard?tr('detailsLink'):tr('rankLink');}
function isMilestoneMessage(entry){return !!entry?.master;}
function milestoneVolume(entry){return entry?.master==='primary'?0:Math.ceil((entry.index+1)/MASTER_VOLUME_SIZE);}
function resetMessageReviewView(entry,view){const {roadmap,roadmapNote}=view;$('messagePrev').textContent='← '+tr('prev');$('messageNext').textContent=tr('next')+' →';$('closeMessages').textContent=tr('close');$('messageStageContext').textContent=messageReviewStageContext(entry);$('messageDialogPlace').hidden=true;renderMasteryBoard('messageMasteryBoard',MESSAGE_MASTERY_BOARD_MASTERS.includes(entry.master),MESSAGE_TILTED_BOARD_MASTERS.includes(entry.master)?'satori-tilted':'gold');roadmap.hidden=!entry.master||!MESSAGE_ROADMAP_MASTERS.includes(entry.master);roadmapNote.hidden=true;view.boardNote.hidden=true;view.rules.hidden=true;view.seal.hidden=!entry.master;view.seal.classList.add('rank-seal');view.seal.classList.remove('rank-frame-seal','second-lap-mark');view.seal.tabIndex=0;view.rankText.hidden=true;view.masterText.hidden=true;}
function updateMessageReviewNavigation(entry){$('messagePrev').disabled=messageReviewIndex===0;$('messageNext').disabled=messageReviewIndex===messageReviewEntries.length-1;try{storage.set(MESSAGE_REVIEW_STORAGE_KEY,messageReviewEntryKey(entry));}catch(_){}
}
function configureMilestoneHeader(entry,title){$('messageDialogTitle').textContent=title;$('messageDialogPlace').textContent=messageReviewPlace(entry);}
function prepareMessageReview(entry){const art=messageReviewArt(entry),twoMoveLesson=lessonVariantFromArt(art),messageClearEntry=configureMessageReviewType(entry);configureMessageReviewLinks(entry,messageClearEntry);return {art,twoMoveLesson,messageClearEntry};}
function milestoneRenderer(entry){return MILESTONE_RENDERERS[entry.master]||MILESTONE_RENDERERS.volume;}
function messageReviewRenderer(entry){if(entry.quiz!==undefined)return MESSAGE_RENDERERS.quiz;if(entry.boardQuiz)return MESSAGE_RENDERERS.boardQuiz;return MESSAGE_RENDERERS.text;}
function renderMessageArtwork(art,twoMoveLesson,illustration,lessonCopy,lessonRule){const classByArt={'move-graph':art==='moveGraph','board-card':art.startsWith('twoMoveCard:')||art.startsWith('guideCard:'),'controls-art':art==='controls','navigation-art':art==='navigation','menu-art':art==='menuButtons','rank-badge-art':art==='rankBadgeArt','unwritten-art':art==='unwritten','cheer-art':art==='cheer','intro-guide-art':art==='introGuide','two-move-lesson-art':!!twoMoveLesson};Object.entries(classByArt).forEach(([className,enabled])=>illustration.classList.toggle(className,enabled));stopClearGuideBoard('messageClearGuideBoard');stopClearGuideBoard('messageTwoMoveLessonBoard');illustration.innerHTML=art==='introGuide'?'<svg id="messageClearGuideBoard" viewBox="14 0 293 310" aria-hidden="true"></svg>':twoMoveLesson?'<svg id="messageTwoMoveLessonBoard" viewBox="14 0 293 310" aria-hidden="true"></svg>':art?tipArt(art)+(art==='cheer'?'<p class="cheer-caption">'+tr('cheerCaption')+'</p>':''):'';if(art==='introGuide')buildClearGuideBoard('messageClearGuideBoard');if(twoMoveLesson)buildTwoMoveLessonBoard('messageTwoMoveLessonBoard',twoMoveLesson);illustration.hidden=!art;lessonCopy.hidden=!twoMoveLesson;lessonRule.hidden=!twoMoveLesson;}
function renderMessageLesson(twoMoveLesson,illustration,lessonCopy,lessonRule){if(twoMoveLesson){renderTwoMoveLessonRule('messageTwoMoveLessonRule');renderTwoMoveLessonCopy('messageTwoMoveLessonCopy',twoMoveLesson);$('messageDialogText').after(illustration);illustration.before(lessonRule);illustration.after(lessonCopy);}else{lessonRule.replaceChildren();lessonCopy.replaceChildren();}}
