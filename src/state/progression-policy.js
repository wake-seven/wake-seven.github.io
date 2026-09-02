/* コース進行と速解きの宣言ポリシー。公開版では単体HTMLへ埋め込む。 */
(function attachWakeSevenProgression(global) {
  'use strict';
  // 進行ポリシーは状態APIの後に一度だけ公開する。
  if (global.WakeSevenProgression?.create) return;

  const SPEED_BLUEPRINTS = Object.freeze([
    {id:'standard',visible:false,labelKey:'speedMode',introKey:'speedSatoriIntro',jaLabel:null,order:'mixed',source:'satori',total:'satori',unlockKey:'speedSatori',showsRemaining:false,allowsUndo:false},
    {id:'training9',visible:true,labelKey:'speedTrainingLabel',introKey:'speedTrainingIntro',jaLabel:'九番',order:'shuffle',source:'twoMove',total:9,unlockKey:'speedTraining',showsRemaining:true,allowsUndo:true,trial:'training'},
    {id:'training18',visible:true,labelKey:'speedIntermediateLabel',introKey:'speedIntermediateIntro',jaLabel:'十八番',order:'shuffle',source:'training',total:'trainingExam',unlockKey:'speedIntermediate',showsRemaining:true,allowsUndo:true,trial:'intermediate'},
    {id:'mastery27',visible:true,labelKey:'speedMasteryLabel',introKey:'speedMasteryIntro',jaLabel:'二十七番',order:'sample',source:'satori',total:27,unlockKey:'speedMastery',showsRemaining:false,allowsUndo:true,trial:'mastery'},
    {id:'satori73',visible:true,labelKey:'speedSatoriLabel',introKey:'speedSatoriIntro',jaLabel:'七十三番',order:'mixed',source:'satori',total:'satori',unlockKey:'speedSatori',showsRemaining:false,allowsUndo:false}
  ]);

  const GATE_BLUEPRINTS = Object.freeze({
    training:{trial:'training'},
    mastery:{trial:'intermediate'},
    satori:{trial:'mastery',requiresMastery:true}
  });

  function create({satoriTotal,trainingExamTotal,academyTotal,applicationStart,applicationTotal,developmentStart,developmentTotal,trainingStart,trainingTotal,basicStart}) {
    const totalFor = value => value === 'satori' ? satoriTotal : value === 'trainingExam' ? trainingExamTotal : value;
    const speedModes = Object.freeze(Object.fromEntries(SPEED_BLUEPRINTS.map(blueprint => {
      const definition = Object.freeze({...blueprint,total:totalFor(blueprint.total)});
      return [definition.id,definition];
    })));
    const publicSpeedIds = Object.freeze(SPEED_BLUEPRINTS.filter(definition => definition.visible).map(definition => definition.id));

    return Object.freeze({
      speedModes,
      publicSpeedIds,
      canEnter(target,{lap,mastered,trials}) {
        const gate = GATE_BLUEPRINTS[target];
        if(!gate)return false;
        if(gate.requiresMastery&&!mastered)return false;
        return lap === 2 || !!trials?.[gate.trial];
      },
      speedUnlocked(id,unlocks) {
        const definition = speedModes[id];
        return !!definition && !!unlocks?.[definition.unlockKey];
      },
      uiPolicy({mode,lap,stageIndex,speedVariant}) {
        if(mode === 'tutorial') return {id:'tutorial',assisted:true};
        if(mode === 'speed' && speedVariant === 'training9') return {id:'speed-training9',eliminateWrongRods:true,speedFalling:true};
        if(mode !== 'stage') return {id:'standard'};
        if(stageIndex < academyTotal) {
          if(stageIndex >= developmentStart) return {id:'development',assisted:true,development:lap === 1,eliminateWrongRods:lap === 1};
          if(stageIndex >= applicationStart) return {id:'application',assisted:true,application:lap === 1,showTargetCells:lap === 1,rewindWrongMove:lap === 1};
          if(stageIndex >= basicStart) return {id:'basic',assisted:true,guidedBasic:lap === 1,narrowRods:lap === 1};
          return {id:'intro',assisted:true,guidedBasic:lap === 1};
        }
        if(stageIndex >= trainingStart && stageIndex < trainingStart + trainingTotal) return {id:'training',trainingShapes:true};
        return {id:'standard'};
      }
    });
  }

  global.WakeSevenProgression = Object.freeze({create});
})(window);
// 公開ネイティブモジュールの構文境界。
export {};
