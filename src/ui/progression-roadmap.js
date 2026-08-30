// ===== 名人ロードマップ表示 =====
function renderMasterRoadmap(kind){
  const roadmap=$('masterRoadmap'),roadmapNote=$('masterRoadmapNote');
  const primaryNeedsTrial=kind==='primary'&&!secondLapActive&&!speedTrainingTrialCleared;
  const intermediateNeedsTrial=kind==='intermediate'&&!secondLapActive&&!speedIntermediateTrialCleared;
  roadmap.hidden=primaryNeedsTrial||intermediateNeedsTrial||['primary','mastery','satori','satoriIntro','secondLapIntro','awakening','speedIntro','speedComplete','speedTrialFailed'].includes(kind);
  roadmapNote.hidden=true;
  const rules=$('masterRules');rules.hidden=kind!=='intermediate'||intermediateNeedsTrial;
  if(roadmap.hidden)return;
  const milestones=[speedTrainingTrialCleared,speedIntermediateTrialCleared,clearedExtraStages.has(14),clearedExtraStages.has(29),clearedExtraStages.has(44)];
  const current=Math.min(5,milestones.findIndex(done=>!done)+1||5);
  roadmap.replaceChildren(masterRoadmapFragment(current));
  if(kind==='intermediate')rules.textContent=masterCommonRules();
}
function masterRoadmapFragment(current){
  const template=document.getElementById('master-road-step-template');
  const fragment=document.createDocumentFragment();
  if(!template)return fragment;
  Array.from({length:5},(_,i)=>{
    const volume=i-1;
    const label=i===0?tr('academyPickerRound'):i===1?tr('darumaTraining'):(currentLang==='ja'?'名人への道・'+volumeLabel(volume):tr('allPatternsKind')+' · '+volumeLabel(volume));
    const detail=i===0?tr('roadmapCount',{n:ACADEMY_STAGE_COUNT}):i===1?tr('roadmapCount',{n:TRAINING_STAGE_COUNT}):masterSubtitle(volume)+'　'+tr('roadmapCount',{n:MASTER_VOLUME_SIZE});
    const earned=i<current-1;
    const rank=earned?masterPath().ranks[i]:'？';
    const examBadge=earned&&speedExamClearedForRank(i);
    const step=template.content.cloneNode(true).firstElementChild;
    step.classList.add(i+1<current?'done':i+1===current?'current':'');
    setText(step.querySelector('[data-road-name]'),label);
    setText(step.querySelector('[data-road-detail]'),detail);
    const rankElement=step.querySelector('[data-road-rank]');
    rankElement.innerHTML=rankFrameSvg(rank,!earned,i,secondLapActive,secondLapActive);
    if(examBadge){
      const badgeTemplate=document.getElementById('speed-exam-badge-template');
      const badge=badgeTemplate?.content?.firstElementChild?.cloneNode(true)||document.createElement('button');
      badge.dataset.examIndex=String(i);
      badge.querySelector('[data-exam-badge-art]')?.insertAdjacentHTML('afterbegin',speedExamBadgeSvg());
      rankElement.append(badge);
    }
    fragment.append(step);
  });
  return fragment;
}
function masterCommonRules(){return currentLang==='ja'?'名人への道は最短の手でクリアする必要があります。\nまた、進むほど自力で考える場面が増えていきます。':'Path to Mastery must be cleared in the fewest moves. As you advance, the rules become stricter.';}

// Keep this extracted fragment explicit in the source audit while it remains
// concatenated into the single published native-module script.
export {};
