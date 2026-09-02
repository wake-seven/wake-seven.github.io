/*
 * 盤面ドメインロジック。
 *
 * DOM、保存、表示状態には依存せず、盤面の値だけを受け取って新しい値を返す。
 * 公開用HTMLでは WakeSevenBoardDomain という名前空間に埋め込まれる。
 */
const WakeSevenBoardDomain=(()=>{
  function create({cellCount,triangles}){
    const N=cellCount;
    const powers=Array.from({length:N},(_,i)=>3**i);
    const stateCount=3**N;
    const encode=board=>{
      let state=0;
      for(let i=0;i<N;i++)state+=board[i]*powers[i];
      return state;
    };
    const decode=state=>{
      const board=new Uint8Array(N);
      for(let i=0;i<N;i++){board[i]=state%3;state=(state/3)|0;}
      return board;
    };
    const swipe= (board,triangleIndex,direction)=>{
      const next=Uint8Array.from(board), cells=triangles[triangleIndex].cells;
      for(let i=0;i<3;i++){
        const from=direction>0?cells[i]:cells[(i+1)%3];
        const to=direction>0?cells[(i+1)%3]:cells[i];
        next[to]=board[from];
      }
      return next;
    };
    const click=(board,triangleIndex,direction=1)=>{
      const next=Uint8Array.from(board);
      for(const cell of triangles[triangleIndex].cells)next[cell]=(next[cell]+direction+3)%3;
      return next;
    };
    const roll=(board,triangleIndex,direction)=>{
      const next=Uint8Array.from(board), cells=triangles[triangleIndex].cells;
      for(let i=0;i<3;i++){
        const from=direction>0?cells[i]:cells[(i+1)%3];
        const to=direction>0?cells[(i+1)%3]:cells[i];
        next[to]=(board[from]+(direction>0?1:2))%3;
      }
      return next;
    };
    const center=(board,direction=1)=>{
      const next=Uint8Array.from(board);
      next[3]=(next[3]+direction+3)%3;
      return next;
    };
    const buildSolver=kind=>{
      const dist=new Uint8Array(stateCount).fill(255), byDepth=[];
      let frontier=[0]; dist[0]=0; byDepth.push([0]);
      let depth=0;
      while(frontier.length){
        const next=[];
        for(const state of frontier){
          const board=decode(state);
          for(let triangleIndex=0;triangleIndex<triangles.length;triangleIndex++){
            if(kind==='triple'){
              const clicked=encode(click(board,triangleIndex,-1));
              if(dist[clicked]===255){dist[clicked]=depth+1;next.push(clicked);}
            }else if(kind==='roll'){
              for(const direction of [1,-1]){
                const rolled=encode(roll(board,triangleIndex,direction));
                if(dist[rolled]===255){dist[rolled]=depth+1;next.push(rolled);}
              }
            }
            if(kind!=='roll')for(const direction of [1,-1]){
              const swiped=encode(swipe(board,triangleIndex,direction));
              if(dist[swiped]===255){dist[swiped]=depth+1;next.push(swiped);}
            }
          }
          if(kind==='center'){
            const clicked=encode(center(board,-1));
            if(dist[clicked]===255){dist[clicked]=depth+1;next.push(clicked);}
          }
        }
        if(next.length)byDepth.push(next);
        frontier=next; depth++;
      }
      return {dist,byDepth};
    };
    return Object.freeze({N,powers,stateCount,encode,decode,swipe,click,roll,center,buildSolver});
  }
  return Object.freeze({create});
})();
// 公開ネイティブモジュールの構文境界。
export {};
