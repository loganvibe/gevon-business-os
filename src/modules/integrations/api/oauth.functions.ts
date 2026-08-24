import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { exchangeCodeForToken, refreshAccessToken, encryptToken, decryptToken } from "@/platform/integrations/oauth";
import { writeAudit } from "@/platform/audit.helpers";

export const initiateOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      companyId: z.string().uuid(),
      integrationId: z.string().uuid(),
      provider: z.string().min(1),
      scopes: z.array(z.string()).default([]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: integration } = await supabase.from("integration_registries").select("config_requirements").eq("id", data.integrationId).single();
    if (!integration) throw new Error("Integration not found");
    const config = integration.config_requirements as any;
    const redirectUri = `${process.env.SUPABASE_URL}/api/public/hooks/oauth/callback`;
    const authUrl = `${config.authorizationUrl}?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${data.scopes.join(" ")}&response_type=code&state=${crypto.randomUUID()}`;
    const { data: connection, error } = await supabase
      .from("oauth_connections")
      .insert({
        company_id: data.companyId,
        integration_id: data.integrationId,
        provider: data.provider,
        scopes: data.scopes,
        status: "disconnected",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { connectionId: connection.id, authorizationUrl: authUrl };
  });

export const completeOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      connectionId: z.string().uuid(),
      code: z.string().min(1),
      state: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: connection } = await supabase.from("oauth_connections").select("*, integration_registries(config_requirements)").eq("id", data.connectionId).single();
    if (!connection) throw new Error("Connection not found");
    const config = (connection as any).integration_registries.config_requirements as any;
    const redirectUri = `${process.env.SUPABASE_URL}/api/public/hooks/oauth/callback`;
    const oauthConfig = { clientId: config.clientId, clientSecret: config.clientSecret, authorizationUrl: config.authorizationUrl, tokenUrl: config.tokenUrl, scopes: connection.scopes, redirectUri };
    const tokens = await exchangeCodeForToken(oauthConfig, data.code);
    const accessEncrypted = await encryptToken(tokens.accessToken);
    const refreshEncrypted = tokens.refreshToken ? await encryptToken(tokens.refreshToken) : null;
    const { error } = await supabase.from("oauth_connections").update({
      status: "connected",
      external_user_id: tokens.accessToken,
      connected_at: new Date().toISOString(),
      last_refreshed_at: new Date().toISOString(),
    }).eq("id", data.connectionId);
    if (error) throw new Error(error.message);
    await supabase.from("oauth_tokens").insert({
      connection_id: data.connectionId,
      access_token_encrypted: accessEncrypted,
      refresh_token_encrypted: refreshEncrypted,
      expires_at: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString() : null,
      token_type: tokens.tokenType ?? "Bearer",
      scope: tokens.scope,
    });
    await writeAudit(context, { companyId: connection.company_id, action: "oauth.connected", entityType: "oauth_connection", entityId: data.connectionId });
    return { ok: true };
  });

export const disconnectOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ connectionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: connection, error } = await supabase.from("oauth_connections").select("company_id, provider").eq("id", data.connectionId).single();
    if (error) throw new Error(error.message);
    await supabase.from("oauth_connections").update({ status: "disconnected", disconnected_at: new Date().toISOString() }).eq("id", data.connectionId);
    await supabase.from("oauth_tokens").delete().eq("connection_id", data.connectionId);
    await writeAudit(context, { companyId: connection.company_id, action: "oauth.disconnected", entityType: "oauth_connection", entityId: data.connectionId });
    return { ok: true };
  });

export const refreshOAuthToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ connectionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: connection } = await supabase.from("oauth_connections").select("*, integration_registries(config_requirements)").eq("id", data.connectionId).single();
    if (!connection) throw new Error("Connection not found");
    const { data: token } = await supabase.from("oauth_tokens").select("*").eq("connection_id", data.connectionId).single();
    if (!token?.refresh_token_encrypted) throw new Error("No refresh token available");
    const config = (connection as any).integration_registries.config_requirements as any;
    const refreshToken = await decryptToken(token.refresh_token_encrypted);
    const oauthConfig = { clientId: config.clientId, clientSecret: config.clientSecret, authorizationUrl: config.authorizationUrl, tokenUrl: config.tokenUrl, scopes: connection.scopes, redirectUri: "" };
    const tokens = await refreshAccessToken(oauthConfig, refreshToken);
    await supabase.from("oauth_tokens").update({ access_token_encrypted: await encryptToken(tokens.accessToken), refresh_token_encrypted: tokens.refreshToken ? await encryptToken(tokens.refreshToken) : null, expires_at: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString() : null }).eq("connection_id", data.connectionId);
    await supabase.from("oauth_connections").update({ last_refreshed_at: new Date().toISOString() }).eq("id", data.connectionId);
    return { ok: true };
  });
