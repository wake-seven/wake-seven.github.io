import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const html = await readFile(join(root, 'index.html'), 'utf8');
const stateModule = await readFile(join(root, 'src', 'game-state.js'), 'utf8');
const required = [
  'WAKE7:STATE-MODULE:START',
  'wake7-state-vnext',
  'const ACTIVE_MODES=',
  'const SPEED_MODE_DEFINITIONS=',
  'function restoreActiveSession()'
];
const missing = required.filter(token => !html.includes(token));
if (missing.length) throw new Error(`index.html is missing: ${missing.join(', ')}`);

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match => match[1]);
for (const script of inlineScripts) new Function(script);

const data = new Map([
  ['wake7-language', 'en'],
  ['wake7-sound', 'off'],
  ['wake7-active-lap', '2'],
  ['wake7-cleared', '[0,1]'],
  ['wake7-extra-cleared', '[3]'],
  ['wake7-satori-cleared', '[7]'],
  ['wake7-active-session', JSON.stringify({mode:'mastery',extra:true,index:3,lap:2,board:{o:[0,0,0,0,0,0,0]}})]
]);
const localStorage = {
  getItem:key => data.has(key) ? data.get(key) : null,
  setItem:(key,value) => data.set(key, String(value))
};
const context = {window:{localStorage}, JSON};
context.window.window = context.window;
vm.runInNewContext(stateModule, context, {filename:'src/game-state.js'});
const migrated = context.window.WakeSevenState.migrateLegacy(localStorage);
if (migrated.navigation.mode !== 'mastery' || migrated.navigation.masteryIndex !== 3 || migrated.navigation.lap !== 2) {
  throw new Error('Legacy navigation migration failed.');
}
if (migrated.settings.language !== 'en' || migrated.settings.sound !== false || migrated.progress.lap1.primary.join(',') !== '0,1') {
  throw new Error('Legacy settings or progress migration failed.');
}
if (!data.has('wake7-state-vnext')) throw new Error('Migration did not write wake7-state-vnext.');

console.log(`Validated ${inlineScripts.length} inline scripts and a legacy-to-vNext state migration.`);
