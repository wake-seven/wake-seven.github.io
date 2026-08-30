// 盤面の座標変換表示だけを担当する小さな境界。
// DOMやゲーム状態を参照せず、board.jsから安全に再利用できる。
const WakeSevenBoardGeometry=Object.freeze({
  tileTransform:(x,y,turn)=>'translate('+x.toFixed(2)+'px,'+y.toFixed(2)+'px) rotate('+(turn*120)+'deg)',
  tileTransformDeg:(x,y,deg)=>'translate('+x.toFixed(2)+'px,'+y.toFixed(2)+'px) rotate('+deg+'deg)',
  nearestRotationDeg:(fromDeg,toDeg)=>{const delta=((toDeg-fromDeg+180)%360+360)%360-180;return fromDeg+delta;}
});

export {};
