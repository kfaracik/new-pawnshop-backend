type ViewThrottleOptions = {
  windowMs?: number;
  maxEntries?: number;
  now?: () => number;
};

export const createViewThrottle = ({
  windowMs = 10 * 60 * 1000,
  maxEntries = 20_000,
  now = () => Date.now(),
}: ViewThrottleOptions = {}) => {
  const seen = new Map<string, number>();

  const shouldCount = (key: string) => {
    const current = now();
    const last = seen.get(key);

    if (last !== undefined && current - last < windowMs) {
      return false;
    }

    if (seen.size > maxEntries) {
      for (const [entryKey, timestamp] of seen) {
        if (current - timestamp >= windowMs) {
          seen.delete(entryKey);
        }
      }
    }

    seen.set(key, current);
    return true;
  };

  return { shouldCount, size: () => seen.size };
};
