// ===== 共通DOM更新API =====
function setText(elementOrId,value){const element=typeof elementOrId==='string'?document.getElementById(elementOrId):elementOrId;if(element)element.textContent=value==null?'':String(value);return element;}
function setVisible(elementOrId,visible){const element=typeof elementOrId==='string'?document.getElementById(elementOrId):elementOrId;if(element)element.hidden=!visible;return element;}
function setDisabled(elementOrId,disabled){const element=typeof elementOrId==='string'?document.getElementById(elementOrId):elementOrId;if(element)element.disabled=!!disabled;return element;}
function setAttribute(elementOrId,name,value){const element=typeof elementOrId==='string'?document.getElementById(elementOrId):elementOrId;if(element)element.setAttribute(name,String(value));return element;}
function clear(elementOrId){const element=typeof elementOrId==='string'?document.getElementById(elementOrId):elementOrId;if(element)element.replaceChildren();return element;}
function createRefs(ids,documentRef=document){return Object.freeze(Object.fromEntries(ids.map(id=>[id,documentRef?.getElementById(id)||null])));}

// 公開バンドルへ連結する断片でもESM境界を明示する。
export {};
