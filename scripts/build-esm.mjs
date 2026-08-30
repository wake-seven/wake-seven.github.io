import { access, readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const entryPath = join(root, 'src', 'main.mjs');

// 開発用ESM入口のローカル依存を辿り、公開ビルド前に欠落したモジュールを検出する。
const visited = new Set();
const visit = async filePath => {
  const absolutePath = resolve(filePath);
  if (visited.has(absolutePath)) return;
  visited.add(absolutePath);
  const source = await readFile(absolutePath, 'utf8');
  const imports = [...source.matchAll(/(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"](\.\.?\/[^'"]+)['"]/g)]
    .map(([, specifier]) => specifier);
  for (const specifier of imports) {
    const dependency = resolve(dirname(absolutePath), specifier);
    await access(dependency);
    await visit(dependency);
  }
};

await visit(entryPath);
const module = await import(`${pathToFileURL(entryPath).href}?build=${Date.now()}`);
if (typeof module.createDevelopmentRuntime !== 'function') {
  throw new Error('src/main.mjs must export createDevelopmentRuntime().');
}
const runtime = module.createDevelopmentRuntime({ triangles: [{ cells: [0, 1, 2] }] });
if (runtime.board.stateCount !== 2187 || typeof runtime.store.subscribe !== 'function') {
  throw new Error('Development ESM runtime failed its build smoke check.');
}

console.log(`Validated development ESM graph (${visited.size} modules).`);
