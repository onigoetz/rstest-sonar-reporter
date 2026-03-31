// Ported from https://github.com/AriPerkkio/vitest-sonar-reporter/blob/main/src/xml-escape.ts

type PatternAndReplace = [RegExp, string];

const PATTERN_AMP: PatternAndReplace = [/&/g, '&amp;'];
const PATTERN_DOUBLE_QUOTE: PatternAndReplace = [/"/g, '&quot;'];
const PATTERN_SINGLE_QUOTE: PatternAndReplace = [/'/g, '&apos;'];
const PATTERN_OPEN_BRACKET: PatternAndReplace = [/</g, '&lt;'];
const PATTERN_CLOSE_BRACKET: PatternAndReplace = [/>/g, '&gt;'];

// https://www.w3.org/TR/xml/#charsets
// Char ::= #x9 | #xA | #xD | [#x20-#xD7FF] | [#xE000-#xFFFD] | [#x10000-#x10FFFF]
const PATTERN_FORBIDDEN_XML_TO_REMOVE =
  /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uD800-\uDFFF\uFFFE\uFFFF]/gu;

// https://www.w3.org/TR/xml/#sec-xml-id (discouraged but not forbidden)
const PATTERN_DISCOURAGED_XML_TO_REMOVE =
  /[\x85\u{1FFFE}\u{1FFFF}\u{2FFFE}\u{2FFFF}\u{3FFFE}\u{3FFFF}\u{4FFFE}\u{4FFFF}\u{5FFFE}\u{5FFFF}\u{6FFFE}\u{6FFFF}\u{7FFFE}\u{7FFFF}\u{8FFFE}\u{8FFFF}\u{9FFFE}\u{9FFFF}\u{AFFFE}\u{AFFFF}\u{BFFFE}\u{BFFFF}\u{CFFFE}\u{CFFFF}\u{DFFFE}\u{DFFFF}\u{EFFFE}\u{EFFFF}\u{FFFFE}\u{FFFFF}\u{10FFFE}\u{10FFFF}]/gu;

export function escapeXML(value: unknown): string {
  const text = String(value);
  const clean = removeInvalidXMLCharacters(text);

  return [
    PATTERN_AMP,
    PATTERN_DOUBLE_QUOTE,
    PATTERN_SINGLE_QUOTE,
    PATTERN_OPEN_BRACKET,
    PATTERN_CLOSE_BRACKET,
  ].reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), clean);
}

function removeInvalidXMLCharacters(text: string): string {
  return text
    .replace(PATTERN_FORBIDDEN_XML_TO_REMOVE, '')
    .replace(PATTERN_DISCOURAGED_XML_TO_REMOVE, '');
}
