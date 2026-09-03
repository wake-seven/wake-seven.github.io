import { domIds } from './lib/source-analysis.mjs';

// 公開版の生成物を、セクション単位で比較できる形に計測する。
// ここは判定を持たず、check/update の両方から同じ計測結果を利用する。
const commentPattern = /\/\/[^\r\n]*|\/\*[\s\S]*?\*\//g;
const headingPattern = /^\/\/ ===== (.+) =====$/gm;
const functionPattern = /\bfunction\s+[A-Za-z_$][\w$]*\s*\(|\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*(?:async\s*)?\(?[^=]*?\)?\s*=>/g;

const countComments = text => {
  const comments = text.match(commentPattern) || [];
  return {
    bytes: Buffer.byteLength(comments.join('\n'), 'utf8'),
    count: comments.length,
    japanese: comments.filter(comment => /[ぁ-んァ-ン一-龯]/.test(comment)).length
  };
};

const countGlobalReferences = (text, globalNames) => {
  let count = 0;
  for (const name of globalNames) {
    const escaped = name.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
    const occurrences = [...text.matchAll(new RegExp(`\\b${escaped}\\b`, 'g'))];
    count += occurrences.filter(match => {
      const before = text.slice(Math.max(0, match.index - 20), match.index);
      const after = text.slice(match.index + name.length);
      return !new RegExp(`(?:const|let|var|function|class)\\s+$`).test(before)
        && before.at(-1) !== '.' && !/^\\s*:/.test(after);
    }).length;
  }
  return count;
};

export const extractBundleMetrics = ({ script, template, globalNames = [] }) => {
  const comments = countComments(script);
  const headings = [...script.matchAll(headingPattern)];
  const sectionMetrics = headings.map((heading, index) => {
    const start = heading.index;
    const end = headings[index + 1]?.index ?? script.length;
    const text = script.slice(start, end);
    const sectionComments = countComments(text);
    return {
      name: heading[1],
      ordinal: index,
      bytes: Buffer.byteLength(text, 'utf8'),
      lines: text.split(/\r?\n/).length,
      commentBytes: sectionComments.bytes,
      comments: sectionComments.count,
      japaneseComments: sectionComments.japanese,
      functionCount: (text.match(functionPattern) || []).length,
      globalReferenceCount: countGlobalReferences(text, globalNames),
      domIdCount: domIds(text).length
    };
  });
  const templateIds = domIds(template);
  return {
    schemaVersion: 2,
    bytes: Buffer.byteLength(script, 'utf8'),
    lines: script.split(/\r?\n/).length,
    commentBytes: comments.bytes,
    comments: comments.count,
    japaneseComments: comments.japanese,
    sections: sectionMetrics.length,
    blankLines: (script.match(/\n\s*\n/g) || []).length,
    functionCount: (script.match(functionPattern) || []).length,
    globalReferenceCount: countGlobalReferences(script, globalNames),
    domIdCount: templateIds.length,
    domIds: templateIds,
    sectionMetrics
  };
};
