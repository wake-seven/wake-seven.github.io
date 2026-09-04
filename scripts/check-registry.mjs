import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// check:gate の手順は check-registry.json を正本とし、旧来の補助定義が
// 同じ手順集合・領域・実行区分を表していることを検証する。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const readJson = async (workspaceRoot, file) => JSON.parse(await readFile(join(workspaceRoot, 'scripts', file), 'utf8'));
const unique = values => [...new Set(values)];
const sameSet = (left, right) => left.length === right.length && left.every(value => right.includes(value));
const normalizeCommand = value => value.trim().replace(/^node(?=\s)/, 'node').replace(/\\/g, '/').replace(/\s+/g, ' ');

export async function loadCheckRegistry(workspaceRoot = root) {
  return readJson(workspaceRoot, 'check-registry.json');
}

export async function validateCheckRegistry(workspaceRoot = root) {
  const [registry, pipeline, profiles, domains, packageJson] = await Promise.all([
    loadCheckRegistry(workspaceRoot),
    readJson(workspaceRoot, 'check-pipeline.json'),
    readJson(workspaceRoot, 'check-profiles.json'),
    readJson(workspaceRoot, 'check-domains.json'),
    JSON.parse(await readFile(join(workspaceRoot, 'package.json'), 'utf8'))
  ]);
  const errors = [];
  const steps = Array.isArray(registry.steps) ? registry.steps : [];
  const domainNames = Object.keys(registry.domains || {});
  const executionProfiles = registry.executionProfiles || [];
  const stepNames = steps.map(step => step?.name).filter(name => typeof name === 'string');
  const byName = new Map();
  const byCommand = new Map();

  if (registry.schemaVersion !== 1) errors.push('check-registry.json の schemaVersion は 1 である必要があります。');
  if (!steps.length) errors.push('check-registry.json の steps が空です。');
  if (!domainNames.length) errors.push('check-registry.json に領域定義がありません。');
  if (!executionProfiles.length) errors.push('check-registry.json に実行区分定義がありません。');
  if (unique(domainNames).length !== domainNames.length) errors.push('check-registry.json の領域名が重複しています。');
  if (unique(executionProfiles).length !== executionProfiles.length) errors.push('check-registry.json の実行区分が重複しています。');

  for (const step of steps) {
    if (!step || typeof step.name !== 'string' || !step.name) {
      errors.push('check-registry.json の各手順には name が必要です。');
      continue;
    }
    if (byName.has(step.name)) errors.push(`正本に重複した手順があります: ${step.name}`);
    byName.set(step.name, step);
    if (typeof step.command !== 'string' || !step.command.trim()) errors.push(`正本のコマンドがありません: ${step.name}`);
    else {
      const command = normalizeCommand(step.command);
      if (byCommand.has(command)) errors.push(`正本に重複したコマンドがあります: ${step.name} / ${byCommand.get(command)}`);
      byCommand.set(command, step.name);
      const [program, argument] = command.split(' ');
      if (program === 'node') {
        if (!argument?.startsWith('scripts/') || command.split(' ').length !== 2) errors.push(`正本の node コマンド形式が不正です: ${step.name} -> ${command}`);
        else {
          try { await access(join(workspaceRoot, argument)); } catch { errors.push(`正本のコマンド対象がありません: ${step.name} -> ${argument}`); }
        }
      } else if (command !== 'npm run build') errors.push(`正本に未知の実行コマンドがあります: ${step.name} -> ${command}`);
    }
    if (!domainNames.includes(step.domain)) errors.push(`正本に未知の領域があります: ${step.name} -> ${step.domain}`);
    if (!executionProfiles.includes(step.executionProfile)) errors.push(`正本に未知の実行区分があります: ${step.name} -> ${step.executionProfile}`);
  }

  const pipelineSteps = pipeline.steps || {};
  const pipelineNames = Object.keys(pipelineSteps);
  for (const name of stepNames) {
    if (!(name in pipelineSteps)) errors.push(`check-pipeline.json に正本の手順がありません: ${name}`);
    else if (pipelineSteps[name] !== byName.get(name).executionProfile) {
      errors.push(`実行区分が正本と一致しません: ${name} (${pipelineSteps[name]} != ${byName.get(name).executionProfile})`);
    }
  }
  for (const name of pipelineNames) if (!byName.has(name)) errors.push(`check-pipeline.json に未知の手順があります: ${name}`);

  const grouped = new Map();
  for (const [domain, group] of Object.entries(pipeline.groups || {})) {
    if (!domainNames.includes(domain)) errors.push(`check-pipeline.json に正本外の領域があります: ${domain}`);
    if (registry.domains?.[domain]?.label !== group?.label) errors.push(`領域ラベルが正本と一致しません: ${domain}`);
    for (const name of group?.steps || []) {
      if (!byName.has(name)) errors.push(`check-pipeline.json の領域に未知の手順があります: ${domain} -> ${name}`);
      if (grouped.has(name)) errors.push(`check-pipeline.json で領域が重複しています: ${name} (${grouped.get(name)} / ${domain})`);
      grouped.set(name, domain);
      if (byName.get(name)?.domain !== domain) errors.push(`領域が正本と一致しません: ${name} (${domain} != ${byName.get(name)?.domain})`);
    }
  }
  for (const name of stepNames) if (!grouped.has(name)) errors.push(`check-pipeline.json に正本の領域登録がありません: ${name}`);
  for (const domain of domainNames) if (!pipeline.groups?.[domain]) errors.push(`check-pipeline.json に正本の領域グループがありません: ${domain}`);

  const profileEntries = profiles.profiles || {};
  for (const [profileName, profile] of Object.entries(profileEntries)) {
    const profileSteps = profile?.steps || [];
    if (unique(profileSteps).length !== profileSteps.length) errors.push(`check-profiles.json の ${profileName} に重複した手順があります。`);
    for (const name of profileSteps) if (!byName.has(name)) errors.push(`check-profiles.json の ${profileName} に未知の手順があります: ${name}`);
  }
  const fullSteps = profileEntries.full?.steps || [];
  if (!sameSet(fullSteps, stepNames)) errors.push('check-profiles.json の full は正本の全手順集合と一致しません。');
  for (const [domain, names] of Object.entries(profileEntries.affected?.byDomain || {})) {
    if (!domainNames.includes(domain)) errors.push(`check-profiles.json の affected.byDomain に未知の領域があります: ${domain}`);
    for (const name of names || []) if (!byName.has(name)) errors.push(`affected.byDomain に未知の手順があります: ${domain} -> ${name}`);
  }

  const classified = new Map();
  for (const entry of domains.checks || []) {
    if (!entry || typeof entry.name !== 'string') continue;
    if (classified.has(entry.name)) errors.push(`check-domains.json に重複した検査があります: ${entry.name}`);
    classified.set(entry.name, entry.domain);
  }
  const excluded = new Set(domains.excluded || []);
  const packageScripts = packageJson.scripts || {};
  if (packageScripts['check:feature-registry'] !== 'node scripts/check-feature-registry.mjs') {
    errors.push('package.json の check:feature-registry 入口が正しくありません。');
  }
  try { await access(join(workspaceRoot, 'scripts', 'feature-registry.json')); } catch { errors.push('feature-registry.json がありません。'); }
  for (const [scriptName, command] of Object.entries(packageScripts)) {
    if (!scriptName.startsWith('check:') || excluded.has(scriptName) || !classified.has(scriptName)) continue;
    const matchingStep = byCommand.get(normalizeCommand(command));
    if (matchingStep && scriptName === `check:${matchingStep}` && classified.get(scriptName) !== byName.get(matchingStep).domain) {
      errors.push(`check-domains.json の領域が正本と一致しません: ${scriptName} -> ${matchingStep}`);
    }
  }

  return {
    registry,
    errors,
    summary: {
      steps: steps.length,
      domains: domainNames.length,
      executionProfiles: executionProfiles.length,
      pipelineSteps: pipelineNames.length,
      fullProfileSteps: fullSteps.length
    }
  };
}

export async function writeCheckRegistryReport(workspaceRoot = root, result) {
  const reportPath = join(workspaceRoot, 'build', 'report', 'check-registry.json');
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, JSON.stringify({
    schemaVersion: 1,
    name: 'wake7-check-registry',
    generatedAt: new Date().toISOString(),
    passed: result.errors.length === 0,
    ...result.summary,
    errors: result.errors
  }, null, 2) + '\n');
  return reportPath;
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  const result = await validateCheckRegistry();
  const reportPath = await writeCheckRegistryReport(root, result);
  if (result.errors.length) {
    console.error(result.errors.join('\n'));
    console.error(`Report: ${relative(root, reportPath)}`);
    process.exitCode = 1;
  } else {
    console.log(`Check registry OK: ${result.summary.steps} steps across ${result.summary.domains} domains`);
    console.log(`Report: ${relative(root, reportPath)}`);
  }
}
