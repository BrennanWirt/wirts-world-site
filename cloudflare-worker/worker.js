// Cloudflare Worker: Discord OAuth for Wirt's World
// Handles the OAuth flow and checks guild membership
//
// Environment variables (set as secrets in Cloudflare dashboard):
//   DISCORD_CLIENT_ID
//   DISCORD_CLIENT_SECRET
//   DISCORD_GUILD_ID
//   FRONTEND_URL (e.g., https://wirts.world)

const DISCORD_API = "https://discord.com/api/v10";
const SCOPES = "identify guilds.members.read";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS headers for the frontend
    const corsHeaders = {
      "Access-Control-Allow-Origin": env.FRONTEND_URL,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // ── /login - Start the OAuth flow ──
    if (url.pathname === "/login") {
      const redirectUri = `${url.origin}/callback`;
      const discordUrl = new URL(`${DISCORD_API}/oauth2/authorize`);
      discordUrl.searchParams.set("client_id", env.DISCORD_CLIENT_ID);
      discordUrl.searchParams.set("redirect_uri", redirectUri);
      discordUrl.searchParams.set("response_type", "code");
      discordUrl.searchParams.set("scope", SCOPES);

      return Response.redirect(discordUrl.toString(), 302);
    }

    // ── /callback - Discord redirects here after auth ──
    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      if (!code) {
        return Response.redirect(`${env.FRONTEND_URL}?auth=error&reason=no_code`, 302);
      }

      const redirectUri = `${url.origin}/callback`;

      try {
        // Exchange code for access token
        const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: env.DISCORD_CLIENT_ID,
            client_secret: env.DISCORD_CLIENT_SECRET,
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri,
          }),
        });

        if (!tokenRes.ok) {
          return Response.redirect(`${env.FRONTEND_URL}?auth=error&reason=token_exchange`, 302);
        }

        const { access_token } = await tokenRes.json();

        // Get the user's info
        const userRes = await fetch(`${DISCORD_API}/users/@me`, {
          headers: { Authorization: `Bearer ${access_token}` },
        });

        if (!userRes.ok) {
          return Response.redirect(`${env.FRONTEND_URL}?auth=error&reason=user_fetch`, 302);
        }

        const user = await userRes.json();

        // Check if they're in the guild
        const memberRes = await fetch(
          `${DISCORD_API}/users/@me/guilds/${env.DISCORD_GUILD_ID}/member`,
          { headers: { Authorization: `Bearer ${access_token}` } }
        );

        const isMember = memberRes.ok;

        // Redirect back to the frontend with the result
        const params = new URLSearchParams({
          auth: "success",
          username: user.username,
          member: isMember ? "true" : "false",
        });

        return Response.redirect(`${env.FRONTEND_URL}?${params.toString()}`, 302);

      } catch (err) {
        return Response.redirect(`${env.FRONTEND_URL}?auth=error&reason=unknown`, 302);
      }
    }

    // ── Anything else ──
    return new Response("Not found", { status: 404 });
  },
};
