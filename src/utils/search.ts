export const MAX_SEARCH_QUERY_LENGTH = 80;

export const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const normalizeSearchQuery = (value: unknown) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, MAX_SEARCH_QUERY_LENGTH);
};

const DIACRITIC_CLASSES: Record<string, string> = {
  a: "aąàáâãä",
  c: "cćç",
  e: "eęèéêë",
  i: "iìíîï",
  l: "lł",
  n: "nń",
  o: "oóòôõö",
  s: "sś",
  u: "uùúûü",
  y: "yýÿ",
  z: "zźż",
};

const foldToBase = (char: string) => {
  const lower = char.toLowerCase();
  for (const base of Object.keys(DIACRITIC_CLASSES)) {
    if (DIACRITIC_CLASSES[base].includes(lower)) {
      return base;
    }
  }
  return lower;
};

export const buildSearchRegex = (value: unknown) => {
  const normalized = normalizeSearchQuery(value);
  if (!normalized) {
    return null;
  }

  const source = [...normalized]
    .map((char) => {
      const base = foldToBase(char);
      if (DIACRITIC_CLASSES[base]) {
        return `[${DIACRITIC_CLASSES[base]}]`;
      }
      return escapeRegex(char);
    })
    .join("");

  return new RegExp(source, "i");
};
