// 解析スクリプトで共通利用する、依存のない軽量なソース解析ユーティリティ。
// 完全なJavaScript ASTではなく、監査・比較レポート用の保守的な抽出を行う。

export const maskSource = source => source
  .replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, ' '))
  .replace(/\/\/[^\n]*/g, match => match.replace(/[^\n]/g, ' '))
  .replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g, match => match.replace(/[^\n]/g, ' '));

export const lineOf = (source, offset) => source.slice(0, offset).split('\n').length;

export const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const braceDepthAt = (code, offset) => {
  let depth = 0;
  for (const char of code.slice(0, offset)) {
    if (char === '{') depth++;
    else if (char === '}') depth = Math.max(0, depth - 1);
  }
  return depth;
};

export const topLevelDeclarations = source => {
  const code = maskSource(source);
  const declarations = [];
  let depth = 0;
  for (let index = 0; index < code.length; index++) {
    const char = code[index];
    if (char === '{') depth++;
    else if (char === '}') depth--;
    if (depth !== 0) continue;
    const rest = code.slice(index);
    let match = rest.match(/^function\s+([A-Za-z_$][\w$]*)\s*\(/);
    if (!match) match = rest.match(/^class\s+([A-Za-z_$][\w$]*)\b/);
    if (!match) match = rest.match(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*[=;]/);
    if (!match) continue;
    declarations.push({
      name: match[1],
      kind: match[0].startsWith('function') ? 'function' : match[0].startsWith('class') ? 'class' : 'variable',
      line: lineOf(source, index),
      offset: index
    });
    index += match[0].length - 1;
  }
  for (const match of code.matchAll(/\b(?:const|let|var)\s+([^;\n]+)/g)) {
    if (braceDepthAt(code, match.index) !== 0) continue;
    for (const item of match[1].matchAll(/(?:^|,)\s*([A-Za-z_$][\w$]*)\s*=/g)) {
      const offset = match.index + match[0].indexOf(item[1]);
      if (!declarations.some(declaration => declaration.name === item[1] && declaration.offset === offset)) {
        declarations.push({ name: item[1], kind: 'variable', line: lineOf(source, offset), offset });
      }
    }
  }
  return declarations;
};

export const functionDeclarations = source => {
  const code = maskSource(source);
  return [...code.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)]
    .map(match => ({ name: match[1], line: lineOf(source, match.index), offset: match.index }));
};

export const functionAt = (source, offset) => {
  const matches = [...source.slice(0, offset).matchAll(/(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(?[^>]*?\)?\s*=>)/g)];
  return matches.length ? (matches.at(-1)[1] || matches.at(-1)[2]) : null;
};

// 呼び出し候補を共通形式で抽出する。予約語や組み込み名の判定は各監査の
// 方針が異なるため、ここでは構文上の「識別子 + 開き括弧」だけを返す。
export const functionReferences = source => {
  const code = maskSource(source);
  return [...code.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)]
    .filter(match => code[match.index - 1] !== '.')
    .map(match => ({ name: match[1], offset: match.index, line: lineOf(source, match.index) }));
};

export const domIds = source => [...source.matchAll(/\bid=["']([A-Za-z][A-Za-z0-9_:-]*)["']/g)].map(match => match[1]);

export const uniqueByJson = items => [...new Map(items.map(item => [JSON.stringify(item), item])).values()];

export const compareMetrics = (current, baseline, keys, threshold = 1.2) => keys.flatMap(key => {
  const before = Number(baseline?.[key]);
  const after = Number(current?.[key]);
  return Number.isFinite(before) && before > 0 && after > before * threshold
    ? [{ metric: key, baseline: before, current: after, growth: after / before - 1 }]
    : [];
});

export const reportResult = ({ name, summary = {}, warnings = [], errors = [], extra = {} }) => ({
  name,
  status: errors.length ? 'failed' : 'passed',
  summary,
  warnings,
  errors,
  generatedAt: new Date().toISOString(),
  ...extra
});

export const formatIssues = (issues, { prefix = '' } = {}) => issues.map(issue => {
  if (typeof issue === 'string') return `${prefix}${issue}`;
  const location = issue.file ? `${issue.file}${issue.line ? `:${issue.line}` : ''}` : '';
  return `${prefix}${location}${location ? ': ' : ''}${issue.message || issue.name || JSON.stringify(issue)}`;
});
