import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 削除は「参照が少ない」だけでは決めない。公開マニフェスト、ESM依存、
// 境界API、E2Eのいずれかに属するファイルは安全な削除候補にしない。
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const manifest=await readFile(join(root,'scripts/application-manifest.mjs'),'utf8');
const report=JSON.parse(await readFile(join(root,'build/report/refactor-candidates.json'),'utf8'));
const boundaryAudit=JSON.parse(await readFile(join(root,'build/report/compat-boundary-audit.json'),'utf8').catch(()=>'{"entries":[]}'));
const protectedFiles=new Set([...manifest.matchAll(/['"]([^'"]+\.(?:js|mjs))['"]/g)].map(match=>match[1]));
const safeToDelete=report.candidates.filter(candidate=>!protectedFiles.has(candidate.file));
// 現在の候補は全て公開連結対象または意図的な境界であり、未参照削除候補はない。
assert.equal(safeToDelete.length,0,'安全な削除条件を満たすソースが見つかりました。個別レビューが必要です。');
const auditByFile=new Map(boundaryAudit.entries.map(entry=>[entry.file,entry]));
const result={generatedAt:new Date().toISOString(),safeToDelete:[],reviewOnly:report.candidates.map(candidate=>{
  const audit=auditByFile.get(candidate.file) || {};
  return {file:candidate.file,classification:candidate.classification,action:candidate.action,purpose:audit.purpose || '要確認',referenceSources:audit.referenceSources || [],removalCondition:audit.removalCondition || '公開・検査経路を再確認してから判断',reassessOn:audit.reassessOn || null};
}),reason:'全候補が公開マニフェストまたは意図的な境界に属するため、自動削除しない'};
await mkdir(join(root,'build/report'),{recursive:true});
await writeFile(join(root,'build/report/unused-file-audit.json'),JSON.stringify(result,null,2)+'\n');
console.log(`Unused-file audit passed: safeToDelete=${result.safeToDelete.length}, reviewOnly=${result.reviewOnly.length}.`);
