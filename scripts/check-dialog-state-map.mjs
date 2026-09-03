import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ダイアログ復元の分岐を置き換えず、対応表と実装の識別子だけを照合する。
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const map=JSON.parse(await readFile(join(root,'scripts/dialog-state-map.json'),'utf8'));
const source=await readFile(join(root,'src/runtime/runtime.js'),'utf8');
assert.equal(map.source,'src/runtime/runtime.js');
assert.ok(Array.isArray(map.dialogs)&&map.dialogs.length>0,'dialog map is empty');
const ids=map.dialogs.map(entry=>entry.dialogId);
assert.equal(new Set(ids).size,ids.length,'dialogId must be unique');
assert.match(source,/function captureDialogState\(\)/);
assert.match(source,/function restoreDialogState\(state\)/);
assert.match(source,/const DIALOG_RESTORE_HANDLERS=Object\.freeze\(\{/,'mapped dialog restore handlers are missing');
for(const id of ids){
  if(['chain','clear','message','master','speedPause','speedRestart','rank','tipGuide','guideHub','twoMove','twoMoveDetail','optimalFail'].includes(id)){
    assert.ok(source.includes(`type:'${id}'`),`captureDialogState is missing ${id}`);
  }else assert.ok(source.includes(`'${id}'`),`dialog map id is missing from runtime: ${id}`);
}
for(const entry of map.dialogs){
  assert.ok(entry.captureCondition&&entry.restoreCondition&&entry.restoreFunction&&entry.returnTo,'dialog metadata is incomplete');
  assert.ok(Array.isArray(entry.state)&&Array.isArray(entry.relatedE2E),'dialog metadata arrays are missing');
}
// 対応表に追加したIDが、保存側にも復元側にも現れることを確認する。
const captureSource=source.slice(source.indexOf('function captureDialogState'),source.indexOf('const DIALOG_STATE_STORAGE_KEY'));
const restoreSource=source.slice(source.indexOf('function restoreDialogState'),source.indexOf('function restoreDialogState')+4000);
for(const id of ids){
  assert.ok(captureSource.includes(`type:'${id}'`)||captureSource.includes(`'${id}'`),`capture path is missing: ${id}`);
  assert.ok(restoreSource.includes(`${id}:`)||restoreSource.includes(`state.id==='${id}'`)||restoreSource.includes('const element=$(state.id)'),`restore path is missing: ${id}`);
}
for(const id of ['chain','clear','message','rank','tipGuide','guideHub']) assert.match(source,new RegExp(`${id}:`),`mapped restore handler is missing: ${id}`);
const report={schemaVersion:1,name:'dialog-state-map',generatedAt:new Date().toISOString(),source:'src/runtime/runtime.js',count:map.dialogs.length,dialogs:map.dialogs,contract:{capture:'表示中のdialogIdと必要状態を保存',restore:'保存状態を検証して既存描画関数または固定DOMへ戻す',behavior:'対応表は現状固定用であり分岐置換を行わない'}};
await mkdir(join(root,'build/report'),{recursive:true});
await writeFile(join(root,'build/report/dialog-state-map.json'),JSON.stringify(report,null,2)+'\n');
console.log(`Dialog state map OK: ${map.dialogs.length} dialog types. Report: build/report/dialog-state-map.json`);
