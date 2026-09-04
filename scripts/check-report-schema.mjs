import { readdir, readFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateReport, writeReport } from './lib/report.mjs';
import './check-report-inventory.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const reportDir = join(root, 'build', 'report');
const files = (await readdir(reportDir)).filter(file => file.endsWith('.json'));
const errors = [];
for (const file of files) {
  const path = join(reportDir, file);
  let report;
  try { report = JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { errors.push(`${file}: invalid JSON (${error.message})`); continue; }
  const warnings = Array.isArray(report.warnings) ? report.warnings : [];
  const reportErrors = Array.isArray(report.errors) ? report.errors : [];
  const normalized = {
    ...report,
    name: report.name || basename(file, '.json'),
    status: report.status || (reportErrors.length || report.passed === false ? 'failed' : warnings.length ? 'warning' : 'passed'),
    summary: report.summary && typeof report.summary === 'object' && !Array.isArray(report.summary) ? report.summary : {},
    warnings,
    errors: reportErrors,
    generatedAt: report.generatedAt || report.finishedAt || report.startedAt || new Date().toISOString(),
    sourceRevision: report.sourceRevision || report.gitSha || 'working-tree'
  };
  try { validateReport(normalized, file); await writeReport(path, normalized); }
  catch (error) { errors.push(error.message); }
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Report schema OK: ${files.length} reports`);
