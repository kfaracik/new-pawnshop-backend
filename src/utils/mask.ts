// Bidder/winner identities are public on unauthenticated auction endpoints, so
// the raw email is never exposed — only a masked handle (j***@gmail.com).
export const maskEmail = (email?: string | null): string | undefined => {
  if (typeof email !== "string" || !email.includes("@")) return undefined;
  const [local, domain] = email.split("@");
  const head = local.slice(0, 1);
  return `${head}${"*".repeat(Math.max(1, local.length - 1))}@${domain}`;
};

export const maskUserRef = (ref: any) => {
  if (!ref || typeof ref !== "object") return ref;
  const { email, ...rest } = ref;
  return { ...rest, maskedEmail: maskEmail(email) };
};
