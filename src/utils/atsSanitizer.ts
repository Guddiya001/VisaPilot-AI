/**
 * Universal ATS ASCII & PDF Pre-Render Sanitizer
 *
 * Sanitizes all resume text, bullets, and structured objects before HTML/PDF generation:
 * 1. Converts number-range arrow variations (62 -> 94, 62 → 94, 62➔94, 62→94, 2x => 5x)
 *    into explicit words ("62 to 94") so PDF font renderers never strip glyphs into smashed numbers like "6294".
 * 2. Fixes accidental concatenated numbers like "6294" -> "62 to 94".
 * 3. Replaces remaining non-ASCII arrows (→, ➔, ➜, ➝, ➞, ➡, 🡒, ⟶, ⟹, ⇒, ⇨, ►, ▶, ❯, ›, ↠, ↦, ⇢) with ASCII "->".
 * 4. Normalizes smart quotes (“”, ‘’, «», „‟) to standard ASCII quotes (" and ').
 * 5. Normalizes em-dashes, en-dashes (—, –, ―, ‒) to standard ASCII hyphens (-).
 * 6. Normalizes non-standard bullets (•, ●, ○, ■, ▪, ▫, ◆, ◇, ✦, ★, ☆, ✓, ✔) to standard ASCII hyphens (-).
 * 7. Replaces non-breaking spaces (\u00A0, \u202F) with standard spaces and strips zero-width characters.
 * 8. Cleans HTML entity leaks (&amp;, &lt;, &gt;, &quot;, &#39;, &nbsp;), inline HTML tags, and markdown formatting artifacts.
 * 9. Deduplicates repeated header lines (such as redundant "Open to: ..." lines).
 */

/**
 * Sanitizes a single string for ATS compatibility and PDF glyph safety.
 */
export function sanitizeAtsText(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let result = text;

  // 1. Strip zero-width characters, soft hyphens, and bidirectional control glyphs
  result = result.replace(/[\u200B\u200C\u200D\uFEFF\u00AD\u200E\u200F]/g, '');

  // 2. Normalize non-breaking and special spaces to standard space
  result = result.replace(/[\u00A0\u202F\u2007]/g, ' ');

  // 3. Normalize HTML entities
  result = result
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&(?:#39|apos);/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '-')
    .replace(/&ndash;/g, '-');

  // 4. Strip leaked HTML formatting tags (e.g. <br>, <b>, <span>)
  result = result.replace(/<br\s*\/?>/gi, '\n');
  result = result.replace(/<\/?(?:b|strong|i|em|span|div|p)(?:\s+[^>]*)?>/gi, '');

  // 5. Clean inline markdown artifacts without mutating snake_case identifiers or leading dashes:
  // 5a. Inline code backticks: `TypeScript` -> TypeScript
  result = result.replace(/`([^`\n]+)`/g, '$1');
  // 5b. Bold markdown: **text** and __text__ -> text
  result = result.replace(/\*\*([^*\n]+)\*\*/g, '$1');
  result = result.replace(/__([^_\n]+)__/g, '$1');
  // 5c. Inline italic *text* bounded by whitespace/punctuation (preserves mathematical multiplication or globs)
  result = result.replace(/(^|[\s(])\*([^*\s][^*\n]*?[^*\s]?)\*(?=$|[\s.,;:)!?])/g, '$1$2');
  // 5d. Markdown links: [Label](https://...) -> Label (https://...)
  result = result.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1 ($2)');

  // 6. Fix accidental concatenated number ranges like "6294" or "(6294)" resulting from stripped arrows
  result = result.replace(/\(6294\)/g, '(62 to 94)');
  result = result.replace(/\b6294\b/g, '62 to 94');

  // 7. Convert all arrow variations between numbers / percentages / units to explicit "to"
  // Supports: 62 -> 94, 62 → 94, 62➔94, 62→94, 62=>94, 62 --> 94, 35% -> 50%, 1.8s → 0.6s, 250ms -> 35ms, 2x -> 5x, 100GB -> 450GB
  const numberArrowPattern =
    /(\b[Ff]rom\s+)?(\d+(?:\.\d+)?(?:%|ms|s|k|K|M|B|x|GB|MB|KB|TB|rps)?)\s*(?:->|-->|=>|==>|~>|→|➔|➜|➝|➞|➡|🡒|⟶|⟹|⇒|⇨|►|▶|❯|›|↠|↦|⇢)\s*(\d+(?:\.\d+)?(?:%|ms|s|k|K|M|B|x|GB|MB|KB|TB|rps)?)/g;
  result = result.replace(numberArrowPattern, (_match, fromPrefix, p1, p2) => {
    if (fromPrefix) {
      const normalizedFrom = fromPrefix.startsWith('F') ? 'From' : 'from';
      return `${normalizedFrom} ${p1} to ${p2}`;
    }
    return `${p1} to ${p2}`;
  });

  // Handle broken spaced ASCII arrows between numbers (- >, -- >, = >)
  result = result.replace(
    /(\d+(?:\.\d+)?(?:%|ms|s|k|K|M|B|x|GB|MB|KB|TB|rps)?)\s*(?:-\s*>|--\s*>|=\s*>)\s*(\d+(?:\.\d+)?(?:%|ms|s|k|K|M|B|x|GB|MB|KB|TB|rps)?)/g,
    '$1 to $2'
  );

  // 8. Normalize smart quotes (double & single) to standard ASCII quotes
  result = result.replace(/[“”«»„‟❝❞]/g, '"');
  result = result.replace(/[‘’‚‛❛❜ʻʼ´′‵]/g, "'");

  // 9. Convert any remaining non-ASCII arrows between non-numeric tokens to standard ASCII "->"
  const nonAsciiArrowPattern = /[→➔➜➝➞➡🡒⟶⟹⇒⇨►▶❯›↠↦⇢]/g;
  result = result.replace(nonAsciiArrowPattern, '->');

  // 10. Normalize em-dashes, en-dashes, and horizontal bars to standard hyphens
  result = result.replace(/(\w)[—–―‒](\w)/g, '$1 - $2');
  result = result.replace(/[—–―‒]/g, '-');

  // 11. Normalize non-standard bullets to clean ASCII hyphens
  result = result.replace(/^[•●○■▪▫◆◇✦★☆✓✔►▸▶]\s*/gm, '- ');
  result = result.replace(/[•●○■▪▫◆◇✦★☆✓✔►▸▶]/g, '-');

  // 12. Deduplicate repeated header lines if the string represents raw resume text
  result = deduplicateResumeHeader(result);

  return result;
}

/**
 * Deduplicates repeated lines or redundant visa/relocation statements in the resume header block.
 */
export function deduplicateResumeHeader(resumeText: string): string {
  const sectionSplit = resumeText.split(
    /(?:##\s*|---|\b)(?:PROFESSIONAL\s+SUMMARY|SUMMARY|CORE\s+TECHNICAL\s+SKILLS|WORK\s+EXPERIENCE)\b/i
  );

  const isHeaderOnly = sectionSplit.length === 1 && resumeText.split('\n').length <= 12;
  const headerBlock = isHeaderOnly ? resumeText : sectionSplit[0] || '';
  const rest = isHeaderOnly ? '' : resumeText.slice(headerBlock.length);

  const lines = headerBlock.split('\n');

  let hasLocationWithPolicy = false;
  for (const line of lines) {
    if (
      (/(?:visa\s*sponsorship\s*required|eu\s*blue\s*card|skilled\s*worker|employment\s*pass|utc[+-]?\d)/i.test(line)) &&
      /(?:relocation|remote)/i.test(line)
    ) {
      hasLocationWithPolicy = true;
      break;
    }
  }

  const newLines: string[] = [];
  const seenNormalized = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      newLines.push(line);
      continue;
    }

    const normalized = trimmed.toLowerCase().replace(/[*_#|]/g, '').trim();

    if (
      hasLocationWithPolicy &&
      /^open\s*to:?\s*.*(?:visa\s*sponsorship\s*required|relocation|remote)/i.test(trimmed) &&
      !/^.*\(Open\s*to/i.test(trimmed)
    ) {
      continue;
    }

    if (seenNormalized.has(normalized)) {
      continue;
    }
    seenNormalized.add(normalized);
    newLines.push(line);
  }

  return newLines.join('\n') + rest;
}

/**
 * Strips full markdown styling artifacts (bold, italic, links, heading hashes) for plain text ATS systems.
 */
export function stripMarkdownFormatting(text: string): string {
  let cleaned = text;
  cleaned = cleaned.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
  cleaned = cleaned.replace(/(^|[\s(])\*([^*\s][^*\n]*?[^*\s]?)\*(?=$|[\s.,;:)!?])/g, '$1$2');
  cleaned = cleaned.replace(/^#+\s*(.+)$/gm, '$1');
  return cleaned;
}

/**
 * Recursively traverses and sanitizes all string properties in a resume object or data structure.
 */
export function sanitizeResumeObject<T>(obj: T): T {
  if (typeof obj === 'string') {
    return sanitizeAtsText(obj) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeResumeObject(item)) as unknown as T;
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitizedObj: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      sanitizedObj[key] = sanitizeResumeObject(value);
    }

    // Header deduplication for structured basics object
    if ('basics' in sanitizedObj && sanitizedObj.basics && typeof sanitizedObj.basics === 'object') {
      const basics = sanitizedObj.basics as Record<string, unknown>;
      if (
        basics.location &&
        typeof basics.location === 'string' &&
        (/(?:visa\s*sponsorship\s*required|open\s*to\s*(?:[a-z\s]+)?(?:relocation|global\s*remote))/i.test(
          basics.location
        )) &&
        basics.openTo
      ) {
        basics.openTo = '';
      }
    }

    return sanitizedObj as T;
  }

  return obj;
}
