import vm from 'node:vm';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// UI_TEXT と CLEAR_CONTENT の多言語オブジェクトを、キー構造・空文字・かな混入で監査する。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const load = async (file, name) => {
  let source = await readFile(join(root, 'src/data', file), 'utf8');
  source = source.replace(/export\s*\{[^}]*\};?\s*$/m, '');
  const context = {}; vm.runInNewContext(`${source}\nglobalThis.__value=${name};`, context);
  return context.__value;
};
const ui = await load('ui-text.js', 'UI_TEXT');
const clear = await load('clear-content.js', 'CLEAR_CONTENT');
const languages = ['ja', 'en', 'zh', 'ko']; const missing = []; const empty = []; const kana = [];
const isObject = value => value && typeof value === 'object' && !Array.isArray(value);
const walk = (value, path) => {
  if (!isObject(value)) return;
  if (languages.some(language => Object.hasOwn(value, language))) {
    for (const language of languages) {
      if (!Object.hasOwn(value, language)) missing.push(`${path}.${language}`);
      else if (typeof value[language] === 'string' && !value[language].trim()) empty.push(`${path}.${language}`);
      else if (language !== 'ja' && typeof value[language] === 'string' && /[ぁ-んァ-ン]/u.test(value[language])) kana.push({ path: `${path}.${language}`, sample: value[language].slice(0, 100) });
    }
  }
  for (const [key, child] of Object.entries(value)) if (isObject(child)) walk(child, `${path}.${key}`);
};
walk(ui, 'UI_TEXT'); walk(clear, 'CLEAR_CONTENT');
const report = { schemaVersion: 1, name: 'wake7-translation-audit', generatedAt: new Date().toISOString(), sourceRevision: 'working-tree', status: missing.length || empty.length || kana.length ? 'failed' : 'passed', warnings: kana.length ? ['日本語かなを含む翻訳候補があります'] : [], errors: [...missing.map(value => `欠落: ${value}`), ...empty.map(value => `空文字: ${value}`), ...kana.map(value => `かな混入: ${value.path}`)], summary: { languages, missingCount: missing.length, emptyCount: empty.length, japaneseKanaCandidateCount: kana.length, uiTextLanguages: Object.keys(ui), clearContentEntries: Object.keys(clear).length }, findings: { missing, empty, japaneseKanaCandidates: kana }, allowlist: { japaneseKana: [], note: '固有名詞などの例外は、確認後ここへ追加する' } };
await mkdir(join(root, 'build/report'), { recursive: true });
await writeFile(join(root, 'build/report/translation-audit.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`Translation audit: ${missing.length} missing, ${empty.length} empty, ${kana.length} Japanese-kana candidates.`);
if (report.status === 'failed') process.exitCode = 1;
