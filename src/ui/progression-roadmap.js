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
  roadmap.innerHTML=masterRoadmapMarkup(current);
  if(kind==='intermediate')rules.textContent=masterCommonRules();
}
function masterRoadmapMarkup(current){
  const template=document.getElementById('master-road-step-template');
  return Array.from({length:5},(_,i)=>{
    const volume=i-1;
    const label=i===0?tr('academyPickerRound'):i===1?tr('darumaTraining'):(currentLang==='ja'?'名人への道・'+volumeLabel(volume):tr('allPatternsKind')+' · '+volumeLabel(volume));
    const detail=i===0?tr('roadmapCount',{n:ACADEMY_STAGE_COUNT}):i===1?tr('roadmapCount',{n:TRAINING_STAGE_COUNT}):masterSubtitle(volume)+'　'+tr('roadmapCount',{n:MASTER_VOLUME_SIZE});
    const earned=i<current-1;
    const rank=earned?masterPath().ranks[i]:'？';
    const examBadge=earned&&speedExamClearedForRank(i)?'<button type="button" class="speed-exam-badge" data-exam-index="'+i+'">'+speedExamBadgeSvg()+'</button>':'';
    if(!template)return '';
    const step=template.content.cloneNode(true).firstElementChild;
    step.classList.add(i+1<current?'done':i+1===current?'current':'');
    step.querySelector('[data-road-name]').textContent=label;
    step.querySelector('[data-road-detail]').textContent=detail;
    step.querySelector('[data-road-rank]').innerHTML=rankFrameSvg(rank,!earned,i,secondLapActive,secondLapActive)+examBadge;
    return step.outerHTML;
  }).join('');
}
function masterCommonRules(){return currentLang==='ja'?'名人への道は最短の手でクリアする必要があります。\nまた、進むほど自力で考える場面が増えていきます。':'Path to Mastery must be cleared in the fewest moves. As you advance, the rules become stricter.';}

// Keep this extracted fragment explicit in the source audit while it remains
// concatenated into the single published native-module script.
export {};
