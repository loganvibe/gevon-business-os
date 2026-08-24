import { encryptSecret, decryptSecret } from "../crypto";

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  redirectUri: string;
}

export interface OAuthTokenResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
  scope?: string;
}

export async function exchangeCodeForToken(config: OAuthConfig, code: string): Promise<OAuthTokenResult> {
  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`OAuth token exchange failed: ${res.status}`);
  return res.json();
}

export async function refreshAccessToken(config: OAuthConfig, refreshToken: string): Promise<OAuthTokenResult> {
  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });
  if (!res.ok) throw new Error(`OAuth refresh failed: ${res.status}`);
  return res.json();
}

export async function encryptToken(token: string): Promise<string> {
  return encryptSecret(token);
}

export async function decryptToken(encrypted: string): Promise<string> {
  return decryptSecret(encrypted);
}
