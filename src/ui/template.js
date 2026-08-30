// ===== template mount API =====
function cloneTemplate(id,documentRef=document){const template=documentRef.getElementById(id);return template?.content?.cloneNode(true)||null;}
function mountTemplate(target,id,documentRef=document){const host=typeof target==='string'?documentRef.getElementById(target):target;if(!host)return null;const fragment=cloneTemplate(id,documentRef);if(!fragment)return null;host.replaceChildren(fragment);return host;}

// 公開バンドルへ連結する断片でもESM境界を明示する。
export {};
