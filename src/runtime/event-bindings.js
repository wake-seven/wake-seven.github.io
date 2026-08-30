// DOMイベント登録の共通境界。イベント配線から要素検索の細部を分離する。
const WakeSevenEventBindings=Object.freeze({
  click(id,handler){
    const element=$(id);
    if(!element)return null;
    element.addEventListener('click',handler);
    return element;
  },
  on(id,type,handler,options){
    const element=$(id);
    if(!element)return null;
    element.addEventListener(type,handler,options);
    return element;
  }
});
export {};
