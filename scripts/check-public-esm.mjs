import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const html = await readFile(join(root, 'index.html'), 'utf8');
const template = await readFile(join(root, 'src', 'index.template.html'), 'utf8');
const metricsBaseline = JSON.parse(await readFile(join(root, 'scripts', 'public-esm-metrics.json'), 'utf8'));
const startMarker = '<!-- WAKE7:APPLICATION-MODULES:START -->';
const endMarker = '<!-- WAKE7:APPLICATION-MODULES:END -->';
const sourceStartMarkers = ['<!-- WAKE7:STATE-MODULE:START -->', '<!-- WAKE7:PROGRESSION-POLICY:START -->'];
const sourceEndMarkers = ['<!-- WAKE7:STATE-MODULE:END -->', '<!-- WAKE7:PROGRESSION-POLICY:END -->'];
const start = html.indexOf(startMarker);
const end = html.indexOf(endMarker);
assert.ok(start >= 0 && end > start, 'Generated index.html is missing the application module markers.');

const application = html.slice(start + startMarker.length, end);
const scripts = [...application.matchAll(/<script(?:\s[^>]*)?>[\s\S]*?<\/script>/gi)];
assert.equal(scripts.length, 1, `Expected one bundled application script, found ${scripts.length}.`);
const [applicationScript] = scripts;
assert.match(applicationScript[0], /<script\b[^>]*\btype=["']module["'][^>]*>/i,
  'The bundled application script must be <script type="module">.');
assert.doesNotMatch(applicationScript[0], /<script\b(?![^>]*\btype=["']module["'])[^>]*>/i,
  'A classic application script remains in the generated application region.');
for (const marker of sourceStartMarkers) {
  assert.match(applicationScript[0], new RegExp(`//\\s*${marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
    `Generated application is missing source boundary comment: ${marker}`);
}
for (const marker of sourceEndMarkers) assert.ok(html.includes(marker), `Generated HTML is missing source boundary comment: ${marker}`);

// 生成HTMLの構造重複を検出する。重複idは導線イベントが別要素へ結び付くため、
// 単なるサイズ増加より優先して失敗させる。
const ids = [...template.matchAll(/\bid=["']([^"']+)["']/g)].map(([, id]) => id);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
assert.deepEqual(duplicateIds, [], `Generated HTML contains duplicate ids: ${duplicateIds.join(', ')}`);

// インデントされたIIFE内部の同名factoryは別スコープなので、公開モジュールの
// top-level宣言だけを重複測定する。
const declarations = [...applicationScript[0].matchAll(/^function\s+([A-Za-z_$][\w$]*)\s*\(/gm)].map(([, name]) => name);
const duplicateDeclarations = [...new Set(declarations.filter((name, index) => declarations.indexOf(name) !== index))];
const moduleBytes = Buffer.byteLength(applicationScript[0], 'utf8');
const commentBytes = Buffer.byteLength((applicationScript[0].match(/\/\/[^\r\n]*|\/\*[\s\S]*?\*\//g) || []).join('\n'), 'utf8');
const blankLines = (applicationScript[0].match(/\n\s*\n/g) || []).length;
const comments = applicationScript[0].match(/\/\/[^\r\n]*|\/\*[\s\S]*?\*\//g) || [];
const japaneseCommentCount = comments.filter(comment => /[ぁ-んァ-ン一-龯]/.test(comment)).length;
const sectionHeadingCount = (applicationScript[0].match(/^\/\/ ===== .+ =====$/gm) || []).length;
const lineCount = applicationScript[0].split(/\r?\n/).length;
const sectionSizes = [...applicationScript[0].matchAll(/^\/\/ ===== (.+) =====$/gm)].map((match, index, headings) => ({
  name: match[1], bytes: Buffer.byteLength(applicationScript[0].slice(match.index, headings[index + 1]?.index ?? applicationScript[0].length), 'utf8')
}));
console.log(`Generated application payload: ${(moduleBytes / 1024).toFixed(1)} KiB; duplicate function declarations: ${duplicateDeclarations.length}.`);
console.log(`Formatting measurement: ${lineCount} lines, comments ${(commentBytes / 1024).toFixed(1)} KiB, Japanese comments ${japaneseCommentCount}, section headings ${sectionHeadingCount}, blank-line boundaries ${blankLines}.`);
console.log(`Largest concatenated sections: ${[...sectionSizes].sort((a, b) => b.bytes - a.bytes).slice(0, 5).map(section => `${section.name} ${(section.bytes / 1024).toFixed(1)} KiB`).join(', ')}.`);
const percent = (current, previous) => previous ? `${current - previous >= 0 ? '+' : ''}${current - previous} (${((current - previous) / previous * 100).toFixed(1)}%)` : 'n/a';
console.log(`Previous snapshot: bytes ${percent(moduleBytes, metricsBaseline.bytes)}, lines ${percent(lineCount, metricsBaseline.lines)}, comments ${percent(commentBytes, metricsBaseline.commentBytes)}, Japanese comments ${percent(japaneseCommentCount, metricsBaseline.japaneseComments)}, sections ${percent(sectionHeadingCount, metricsBaseline.sections)}, blank boundaries ${percent(blankLines, metricsBaseline.blankLines)}.`);
const baselineSections = metricsBaseline.sectionBytes || {};
const sectionDeltas = sectionSizes
  .filter(section => Object.hasOwn(baselineSections, section.name))
  .map(section => `${section.name} ${percent(section.bytes, baselineSections[section.name])}`);
if (sectionDeltas.length) console.log(`Section deltas: ${sectionDeltas.slice(0, 10).join(', ')}.`);
assert.ok(commentBytes >= 40 * 1024, 'Generated application comments were compressed away.');
assert.ok(japaneseCommentCount >= 100, 'Generated Japanese implementation comments were lost.');
assert.ok(sectionHeadingCount >= 20, 'Generated source section headings were lost.');
assert.ok(blankLines >= 80, 'Generated application readability boundaries were compressed away.');
const warnings = [];
if (moduleBytes > metricsBaseline.bytes * 1.25) warnings.push(`payload grew ${(moduleBytes / metricsBaseline.bytes * 100 - 100).toFixed(1)}% from snapshot`);
if (lineCount > metricsBaseline.lines * 1.25) warnings.push(`payload lines grew ${(lineCount / metricsBaseline.lines * 100 - 100).toFixed(1)}% from snapshot`);
for (const section of sectionSizes) if (section.bytes > 90 * 1024) warnings.push(`section ${section.name} is ${(section.bytes / 1024).toFixed(1)} KiB`);
if (warnings.length) console.warn(`Bundle growth warnings: ${warnings.join('; ')}`);
if (duplicateDeclarations.length) console.log(`Duplicate declarations (review only): ${duplicateDeclarations.slice(0, 20).join(', ')}`);

for (const api of [
  'WakeSevenBoardDomain',
  'WakeSevenState',
  'WakeSevenProgressionCommands',
  'WakeSevenBoardCommands',
  'window.WakeSeven'
]) {
  assert.ok(application.includes(api), `Bundled application module is missing ${api}.`);
}

console.log('Validated generated index.html as an ESM-only application bundle.');
