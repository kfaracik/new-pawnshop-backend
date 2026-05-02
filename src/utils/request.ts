export const getSingleValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;
