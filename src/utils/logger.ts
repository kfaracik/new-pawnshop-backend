type AuditPayload = Record<string, unknown>;

const formatLine = (level: string, message: string, payload?: AuditPayload) => {
  const timestamp = new Date().toISOString();
  return JSON.stringify({
    timestamp,
    level,
    message,
    ...(payload || {}),
  });
};

export const logInfo = (message: string, payload?: AuditPayload) => {
  console.log(formatLine("info", message, payload));
};

export const logWarn = (message: string, payload?: AuditPayload) => {
  console.warn(formatLine("warn", message, payload));
};

export const logError = (message: string, payload?: AuditPayload) => {
  console.error(formatLine("error", message, payload));
};

export const logAudit = (action: string, payload?: AuditPayload) => {
  console.log(formatLine("audit", action, payload));
};
