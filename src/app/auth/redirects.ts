/** Where an auth link goes on success (a same-site path) and on failure. */
export function authRedirects(next: string | null): { destination: string; failure: string } {
  // Only allow same-site relative redirects.
  const destination = next?.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
  return {
    destination,
    failure: destination === "/reset-password" ? "/forgot-password?error=link" : "/login?error=callback",
  };
}
