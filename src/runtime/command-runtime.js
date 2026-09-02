// commandからブラウザAPIと保存形式を隔離する実行境界。
// command側は状態変更の意図だけを記述し、時計・保存APIへ直接依存しない。
function commandStorageGet(key,fallback=''){return storage.get(key,fallback);}
function commandStorageSet(key,value){storage.set(key,value);return value;}
function commandStorageRemove(key){storage.remove(key);return true;}
function commandStorageJson(key,fallback=null){return storage.json(key,fallback);}
function commandStorageSetJson(key,value){storage.setJson(key,value);return value;}
function commandNow(){return performance.now();}
function commandTimestamp(){return Date.now();}
