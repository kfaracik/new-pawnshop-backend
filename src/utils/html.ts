const ALLOWED_TAGS = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "p",
  "br",
  "ul",
  "ol",
  "li",
  "blockquote",
]);

const stripDangerousBlocks = (value: string) =>
  value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");

const stripDangerousAttributes = (value: string) =>
  value
    .replace(/\son\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "")
    .replace(/\sstyle\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "")
    .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, "");

const stripDisallowedTags = (value: string) =>
  value.replace(/<\/?([a-z0-9-]+)([^>]*)>/gi, (match, tagName) => {
    return ALLOWED_TAGS.has(String(tagName).toLowerCase()) ? match : "";
  });

export const sanitizeHtml = (value: unknown) => {
  if (typeof value !== "string") {
    return "";
  }

  return stripDisallowedTags(stripDangerousAttributes(stripDangerousBlocks(value))).trim();
};
