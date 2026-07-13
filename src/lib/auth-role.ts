import { jwtDecode } from "jwt-decode";

interface SupabaseJwt {
  role?: string;
  app_metadata?: { role?: string };
  email?: string;
}

// Read the caller's role straight from the access token on the client.
// Saves a round-trip to the server for gating the admin UI.
export function getRoleFromAccessToken(accessToken: string): string {
  const decoded = jwtDecode<SupabaseJwt>(accessToken);
  return decoded.app_metadata?.role ?? decoded.role ?? "employee";
}

export function isAdminToken(accessToken: string): boolean {
  return getRoleFromAccessToken(accessToken) === "manager";
}
