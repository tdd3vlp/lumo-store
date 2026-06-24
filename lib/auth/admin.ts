/**
 * Checks an email against the comma-separated ADMIN_EMAILS allowlist.
 * Server-only usage (reads process.env.ADMIN_EMAILS); safe to import from
 * route handlers and server components.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}
