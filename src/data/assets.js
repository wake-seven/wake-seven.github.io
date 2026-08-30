// ===== 固定挿絵・SVGデータ =====
// 画面ロジックから分離した、内容を変更しない固定アセット。
function academyEnrollArtSvg(){
  const sakura=(x,y,scale=1)=>{
    let petals='';
    for(let i=0;i<5;i++)petals+='<ellipse cx="0" cy="-3.6" rx="2.6" ry="4.2" fill="#F4BFD1" stroke="#E191AC" stroke-width=".4" transform="rotate('+i*72+')"/>';
    return '<g transform="translate('+x+' '+y+') scale('+scale+')">'+petals+'<circle r="1.4" fill="#F6D77C"/></g>';
  };
  const petal=(x,y,rot,scale=1)=>'<ellipse cx="'+x+'" cy="'+y+'" rx="'+(2.6*scale)+'" ry="'+(4.6*scale)+'" fill="#F4BFD1" transform="rotate('+rot+' '+x+' '+y+')"/>';
  const spark=(x,y,s=5)=>'<rect x="'+(-s/2)+'" y="'+(-s/2)+'" width="'+s+'" height="'+s+'" fill="#C9A54E" transform="translate('+x+' '+y+') rotate(45)"/>';
  const school='<g transform="translate(168 48) scale(1.05)">'
    +'<path d="M-60 40L0 0L60 40Z" fill="#C8524A" stroke="#7A2E28" stroke-width="2"/>'
    +'<circle cx="0" cy="21" r="10.5" fill="#FBF3E4" stroke="#3A2A22" stroke-width="1.6"/>'
    +'<path d="M0 21L0 14M0 21L6 24" stroke="#3A2A22" stroke-width="1.4" stroke-linecap="round"/>'
    +'<rect x="-52" y="40" width="104" height="70" fill="#8B5E3C" stroke="#5C3D25" stroke-width="1.8"/>'
    +'<path d="M-52 58H52M-52 76H52M-52 94H52" stroke="#5C3D25" stroke-width="1" opacity=".3"/>'
    +'<rect x="-38" y="52" width="16" height="16" fill="#3E7FBF" stroke="#F1E4C8" stroke-width="2"/>'
    +'<rect x="-8" y="52" width="16" height="16" fill="#3E7FBF" stroke="#F1E4C8" stroke-width="2"/>'
    +'<rect x="22" y="52" width="16" height="16" fill="#3E7FBF" stroke="#F1E4C8" stroke-width="2"/>'
    +'<rect x="-38" y="82" width="16" height="16" fill="#3E7FBF" stroke="#F1E4C8" stroke-width="2"/>'
    +'<rect x="22" y="82" width="16" height="16" fill="#3E7FBF" stroke="#F1E4C8" stroke-width="2"/>'
    +'<path d="M-20 84L0 62L20 84Z" fill="#DCE3E6" stroke="#C8524A" stroke-width="4"/>'
    +'<rect x="-13" y="84" width="26" height="26" fill="#201914" stroke="#5C3D25" stroke-width="1.6"/>'
    +'<path d="M13 84L13 110" stroke="#DCE3E6" stroke-width="3" stroke-linecap="round"/>'
    +'</g>';
  return '<svg viewBox="0 0 204 236" aria-hidden="true">'
    +school
    +'<path d="M2 2C14 10 22 20 26 34" fill="none" stroke="#6B4630" stroke-width="2.2" stroke-linecap="round"/>'
    +'<path d="M10 9C14 7 18 8 20 11" fill="none" stroke="#6B4630" stroke-width="1.5" stroke-linecap="round"/>'
    +sakura(8,6,1)+sakura(19,16,.85)+sakura(24,29,.7)
    +'<path d="M202 2C190 10 182 20 178 34" fill="none" stroke="#6B4630" stroke-width="2.2" stroke-linecap="round"/>'
    +'<path d="M194 9C190 7 186 8 184 11" fill="none" stroke="#6B4630" stroke-width="1.5" stroke-linecap="round"/>'
    +sakura(196,6,1)+sakura(185,16,.85)+sakura(180,29,.7)
    +'<path d="M28 24Q102 4 176 24L176 46Q102 26 28 46Z" fill="#FBF3E4" stroke="#B23B2E" stroke-width="2.4"/>'
    +'<path d="M28 24L14 30L28 46Z" fill="#B23B2E"/><path d="M176 24L190 30L176 46Z" fill="#B23B2E"/>'
    +'<text x="102" y="32" text-anchor="middle" fill="#B23B2E" font-family="serif" font-size="17" font-weight="800" letter-spacing=".15em">祝　入学</text>'
    +petal(50,66,25)+petal(154,60,-40,.9)+petal(172,98,60,.85)+petal(32,102,-15,.85)
    +spark(20,54)+spark(186,64,4.2)
    +'<g transform="translate(102 152) scale(2.05)"><use href="#daruma-body"/><use href="#face-happy"/></g>'
    +'<g transform="translate(61 172) scale(.9)">'
      +'<ellipse cx="0" cy="-7" rx="4.2" ry="7" fill="#FBF3E4" stroke="#B23B2E" stroke-width="1" transform="rotate(0)"/>'
      +'<ellipse cx="0" cy="-7" rx="4.2" ry="7" fill="#FBF3E4" stroke="#B23B2E" stroke-width="1" transform="rotate(60)"/>'
      +'<ellipse cx="0" cy="-7" rx="4.2" ry="7" fill="#FBF3E4" stroke="#B23B2E" stroke-width="1" transform="rotate(120)"/>'
      +'<ellipse cx="0" cy="-7" rx="4.2" ry="7" fill="#FBF3E4" stroke="#B23B2E" stroke-width="1" transform="rotate(180)"/>'
      +'<ellipse cx="0" cy="-7" rx="4.2" ry="7" fill="#FBF3E4" stroke="#B23B2E" stroke-width="1" transform="rotate(240)"/>'
      +'<ellipse cx="0" cy="-7" rx="4.2" ry="7" fill="#FBF3E4" stroke="#B23B2E" stroke-width="1" transform="rotate(300)"/>'
      +'<path d="M3 6L11 24L4 21Z" fill="#B23B2E"/><path d="M-2 7L1 25L-5 22Z" fill="#B23B2E"/>'
      +'<circle r="3.2" fill="#C9A54E" stroke="#B23B2E" stroke-width=".8"/>'
    +'</g>'
  +'</svg>';
}

const TRAINING_WELCOME_ART_SVG=`<svg id="trainingWelcomeArt" viewBox="0 0 320 220" aria-hidden="true">
  <defs>
    <linearGradient id="twSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#16283C"/>
      <stop offset=".58" stop-color="#3E4F63"/>
      <stop offset="1" stop-color="#C98A57"/>
    </linearGradient>
    <radialGradient id="twSun" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#FCE7B0"/>
      <stop offset=".55" stop-color="#F2C063" stop-opacity=".8"/>
      <stop offset="1" stop-color="#E0985A" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="0" y="0" width="320" height="220" fill="url(#twSky)"/>
  <circle cx="238" cy="122" r="48" fill="url(#twSun)"/>
  <circle cx="238" cy="122" r="21" fill="#F6D68A"/>
  <path d="M0,158 L35,116 L70,146 L108,103 L150,150 L195,113 L235,148 L280,108 L320,153 L320,220 L0,220 Z" fill="#4C6478" opacity=".5"/>
  <path d="M-10,168 L40,110 L85,158 L135,95 L190,163 L245,113 L300,158 L330,166 L330,220 L-10,220 Z" fill="#233549"/>
  <path d="M0,178 Q160,152 320,180 L320,220 L0,220 Z" fill="#332821"/>
  <path d="M160,220 C150,196 182,182 168,160 C158,148 172,140 165,128" fill="none" stroke="#C9A54E" stroke-width="6" stroke-linecap="round" stroke-dasharray="1.5 11" opacity=".55"/>
  <path d="M54,58 q6,-8 12,0 q6,-8 12,0" fill="none" stroke="#8FB9CC" stroke-width="2" stroke-linecap="round" opacity=".8"/>
  <path d="M96,76 q5,-7 10,0 q5,-7 10,0" fill="none" stroke="#8FB9CC" stroke-width="1.8" stroke-linecap="round" opacity=".7"/>
  <ellipse cx="163" cy="200" rx="32" ry="6" fill="#000" opacity=".26"/>
  <line x1="193" y1="196" x2="206" y2="100" stroke="#8A6A3C" stroke-width="4" stroke-linecap="round"/>
  <path d="M197,104 Q189,89 204,85 Q217,89 210,102 Q203,109 197,104Z" fill="#62B8D2" stroke="#1B2A3A" stroke-width="2"/>
  <g transform="translate(163,160) scale(1.05)">
    <use href="#daruma-body"/>
    <use href="#face-happy"/>
    <path d="M-30,-36 Q0,-64 30,-36 Q0,-46 -30,-36 Z" fill="#D9B67A" stroke="#241D1A" stroke-width="2.2"/>
    <ellipse cx="0" cy="-36" rx="32" ry="6.5" fill="#E4C88F" stroke="#241D1A" stroke-width="2.2"/>
  </g>
</svg>`;

// 公開バンドルではnative moduleへ連結されることを明示する境界。
export {};
