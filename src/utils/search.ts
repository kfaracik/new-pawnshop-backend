export const MAX_SEARCH_QUERY_LENGTH = 80;

export const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const normalizeSearchQuery = (value: unknown) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, MAX_SEARCH_QUERY_LENGTH);
};

export const buildSearchRegex = (value: unknown) => {
  const normalized = normalizeSearchQuery(value);
  if (!normalized) {
    return null;
  }

  return new RegExp(escapeRegex(normalized), "i");
};
