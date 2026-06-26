export const getSingleValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export const parsePositiveInteger = (
  value: unknown,
  defaultValue: number,
  maxValue: number
) => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(String(rawValue ?? ""), 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return defaultValue;
  }

  return Math.min(parsed, maxValue);
};

export const parsePagination = (
  query: Record<string, unknown>,
  options: { defaultLimit?: number; maxLimit?: number } = {}
) => {
  const defaultLimit = options.defaultLimit ?? 10;
  const maxLimit = options.maxLimit ?? 50;
  const page = parsePositiveInteger(query.page, 1, 10_000);
  const limit = parsePositiveInteger(query.limit, defaultLimit, maxLimit);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};
