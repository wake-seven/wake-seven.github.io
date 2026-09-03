// ===== サウンド =====
let audioContext=null;

function playTone(frequency,duration=.06,volume=.028,delay=0){
  if(!soundEnabled||document.hidden)return;
  try{
    const AudioCtor=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtor)return;
    if(!audioContext)audioContext=new AudioCtor();
    if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
    const start=audioContext.currentTime+delay;
    const oscillator=audioContext.createOscillator();
    const gain=audioContext.createGain();
    oscillator.type='sine';
    oscillator.frequency.setValueAtTime(frequency,start);
    gain.gain.setValueAtTime(.0001,start);
    gain.gain.exponentialRampToValueAtTime(volume,start+.008);
    gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(start);oscillator.stop(start+duration+.02);
  }catch(_){ }
}
function playRotateSound(direction){playTone(direction>0?392:349,.055,.022);}
function playClearSound(kind='normal'){
  const tunes={
    normal:[[523,0],[659,.075],[784,.15]],
    volume:[[440,0],[554,.08],[659,.16],[880,.26]],
    training:[[440,0],[554,.07],[659,.14],[880,.23],[1109,.33]],
    mastery:[[392,0],[523,.08],[659,.16],[784,.24],[1047,.34],[1319,.47]],
    // 悟りの制覇は名人クリアよりさらに一段高い、C7 まで届く上昇音にする。
    satori:[[392,0],[523,.075],[659,.15],[784,.225],[1047,.31],[1319,.405],[1568,.51],[2093,.64]]
  };
  (tunes[kind]||tunes.normal).forEach(([tone,delay])=>playTone(tone,.18,.032,delay));
}
function clearSoundKind(){
  const navigation=readNavigationContext();
  if(navigation.mode==='free'||navigation.mode==='custom'||navigation.mode==='speed')return 'normal';
  if(navigation.mode==='satori'&&navigation.satoriIndex===SATORI_STAGES.length-1&&isSatoriMastered())return 'satori';
  if(navigation.mode!=='mastery'&&navigation.stageIndex===STAGES.length-1&&allPrimaryCleared())return 'training';
  if(navigation.mode==='mastery'&&(navigation.masteryIndex+1)%MASTER_VOLUME_SIZE===0)return navigation.masteryIndex===EXTRA_STAGES.length-1?'mastery':'volume';
  return 'normal';
}
function updateSoundToggle(){
  const button=$('soundToggle');
  button.setAttribute('aria-label',tr(soundEnabled?'soundOn':'soundOff'));
  button.setAttribute('aria-pressed',String(soundEnabled));
  const paths=button.querySelectorAll('path');
  if(paths.length>=2){
    paths[0].setAttribute('d','M4 10v4h4l5 4V6l-5 4H4Z');
    paths[1].setAttribute('d',soundEnabled?'M16 9.5a4 4 0 0 1 0 5M18.5 7a7.5 7.5 0 0 0 0 10':'m4 4 16 16');
    return;
  }
  button.innerHTML=soundEnabled
    ?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6l-5 4H4Z"/><path d="M16 9.5a4 4 0 0 1 0 5M18.5 7a7.5 7.5 0 0 1 0 10"/></svg>'
    :'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6l-5 4H4Z"/><path d="m4 4 16 16"/></svg>';
}
// 公開ネイティブモジュールの構文境界。
export {};
