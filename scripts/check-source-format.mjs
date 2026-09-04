import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';

const root = process.cwd();
const sourceRoot = join(root, 'src');
const reportPath = join(root, 'build', 'report', 'source-format-baseline.json');
const policy = JSON.parse(await readFile(join(root, 'scripts', 'source-format-policy.json'), 'utf8'));
const maxLength = policy.javascript.maxControlLineLength;
const ignoredFileParts = ['/data/', '/core-data.', '/clear-content.', '/board-quiz.'];

const isDataFile = file => ignoredFileParts.some(part => file.replaceAll('\\', '/').includes(part));
const isGeneratedOrAssetLine = line => {
  const trimmed = line.trim();
  return trimmed.includes('data:image/') || trimmed.includes('viewBox=') ||
    trimmed.includes('<svg') || trimmed.includes('<path') || trimmed.includes(' d="') ||
    trimmed.startsWith("+ '<") || trimmed.startsWith("+'<") ||
    trimmed.startsWith('const STAGES') || trimmed.startsWith('const CLEAR_CONTENT') ||
    trimmed.startsWith('const UI_TEXT');
};

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (['.js', '.mjs', '.html'].includes(extname(entry.name))) files.push(path);
  }
  return files;
}

const files = await walk(sourceRoot);
const issues = [];
const fileMetrics = [];
for (const file of files) {
  const rel = relative(root, file).replaceAll('\\', '/');
  const text = await readFile(file, 'utf8');
  const lines = text.split(/\r?\n/);
  const cssOnly = rel === 'src/index.template.html';
  let max = 0;
  let considered = 0;
  lines.forEach((line, index) => {
    // CSSは公開テンプレートの方針として1ブロック1行を許可し、
    // JavaScriptの制御コード行長監査からは除外する。
    const inScope = cssOnly ? false : !isDataFile(rel);
    if (!inScope || isGeneratedOrAssetLine(line)) return;
    considered += 1;
    max = Math.max(max, line.length);
    if (line.length > maxLength) issues.push({ file: rel, line: index + 1, length: line.length });
  });
  fileMetrics.push({ file: rel, lines: lines.length, consideredLines: considered, maxLength: max });
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
    policy: {
      maxControlLineLength: maxLength,
      mode: policy.javascript.mode,
      cssFormat: policy.css.format,
      cssLineLengthAudit: policy.css.lineLengthAudit,
      excluded: policy.excluded
    },
  files: fileMetrics,
  issueCount: issues.length,
  issues
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Source format audit: ${issues.length} long control lines (threshold ${maxLength}); report: ${relative(root, reportPath)}`);
