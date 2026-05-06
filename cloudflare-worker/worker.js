// Cloudflare Worker: Discord OAuth + Content Management for Wirt's World
//
// Environment variables (set as secrets):
//   DISCORD_CLIENT_ID
//   DISCORD_CLIENT_SECRET
//   DISCORD_GUILD_ID
//   FRONTEND_URL (e.g., https://wirts.world)
//   ADMIN_DISCORD_ID (your Discord user ID: 1336375427073183815)
//
// KV Namespace binding (set in wrangler.jsonc or dashboard):
//   CONTENT - KV namespace for storing site content

const DISCORD_API = "https://discord.com/api/v10";
const SCOPES = "identify guilds.members.read";

// ── CORS headers ─────────────────────────────────────────────────────────────

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.FRONTEND_URL,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function jsonResponse(data, status = 200, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(env) },
  });
}

// ── Admin check ──────────────────────────────────────────────────────────────

async function getDiscordUser(accessToken) {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return res.json();
}

function isAdmin(userId, env) {
  return userId === env.ADMIN_DISCORD_ID;
}

// ── Default content (used to seed KV on first load) ──────────────────────────

const DEFAULT_FAQS = [
  { q: "What kind of server is this?", a: 'Wirt\'s World is a Vanilla Minecraft server that supports both Bedrock and Java edition. It is primarily based on the "Hermitcraft" series of Minecraft servers, which you may be familiar with on YouTube.' },
  { q: "Is this a modded server?", a: "Nope. It's vanilla. We run Fabric on the server side for performance and a few quality of life things, but you don't need to install anything to play." },
  { q: "How do I get whitelisted?", a: "Try to join the server and you'll get a link code on screen. DM that code to @Wirt's World Bot in the Discord and you'll be added automatically." },
  { q: "Can I play on Bedrock?", a: "Yeah! We support both Java and Bedrock through Geyser and Floodgate. PC, mobile, and console all work. Console players need to change their DNS settings first though, the join page walks you through it." },
  { q: "What's the deal with the nickname thing?", a: "Once you link your Discord and Minecraft accounts through the whitelist process, your Discord server nickname automatically syncs as your in-game display name. It'll also match the color of your highest Discord role. You can opt out anytime with /nicksync off." },
  { q: "Do I need to install mods?", a: "Nope, nothing required. But if you're on Java, there are some optional mods that make things nicer. Simple Voice Chat gives you proximity voice in-game, Shulker Box Tooltip lets you peek inside shulker boxes, and Armored Elytra lets you combine elytra with chestplates. Check the join page for download links." },
  { q: "How do I use voice chat?", a: "Install Fabric, Fabric API, and the Simple Voice Chat mod. Once you're in the server it just works. Players near you can hear you talk. You'll need to be on Java for this one." },
  { q: "Is there a map?", a: "Yeah, we've got BlueMap running. You can explore the entire world in 3D right from your browser. Check the Map page on this site." },
  { q: "What are the rules?", a: "Xray and other cheating methods are not allowed. Basically everything else is fair game. If you're not sure whether something's ok, just ask." },
  { q: "I'm on Bedrock and something's broken", a: "Shoot me a message on Discord. I've been running this Bedrock setup for a while now and I know how to fix most of the bugs that come up." },
  { q: "Can my friend join?", a: "If they're in the Discord, yeah! Just have them go through the join process on the website. The whitelist is tied to the Discord server so they need to be a member first." },
];

const DEFAULT_GALLERY = [];

// ── Route handler ────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(env) });
    }

    // ── OAuth routes (unchanged) ──

    if (url.pathname === "/login") {
      const redirectUri = `${url.origin}/callback`;
      const discordUrl = new URL(`${DISCORD_API}/oauth2/authorize`);
      discordUrl.searchParams.set("client_id", env.DISCORD_CLIENT_ID);
      discordUrl.searchParams.set("redirect_uri", redirectUri);
      discordUrl.searchParams.set("response_type", "code");
      discordUrl.searchParams.set("scope", SCOPES);
      return Response.redirect(discordUrl.toString(), 302);
    }

    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      if (!code) {
        return Response.redirect(`${env.FRONTEND_URL}?auth=error&reason=no_code`, 302);
      }

      const redirectUri = `${url.origin}/callback`;

      try {
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

        const userRes = await fetch(`${DISCORD_API}/users/@me`, {
          headers: { Authorization: `Bearer ${access_token}` },
        });

        if (!userRes.ok) {
          return Response.redirect(`${env.FRONTEND_URL}?auth=error&reason=user_fetch`, 302);
        }

        const user = await userRes.json();

        const memberRes = await fetch(
          `${DISCORD_API}/users/@me/guilds/${env.DISCORD_GUILD_ID}/member`,
          { headers: { Authorization: `Bearer ${access_token}` } }
        );

        const isMember = memberRes.ok;
        const admin = isAdmin(user.id, env);

        // Include access_token in redirect if admin (needed for admin API calls)
        const params = new URLSearchParams({
          auth: "success",
          username: user.username,
          member: isMember ? "true" : "false",
          admin: admin ? "true" : "false",
          ...(admin ? { token: access_token } : {}),
        });

        return Response.redirect(`${env.FRONTEND_URL}?${params.toString()}`, 302);

      } catch (err) {
        return Response.redirect(`${env.FRONTEND_URL}?auth=error&reason=unknown`, 302);
      }
    }

    // ── Content API routes ──

    // GET /api/faqs - public, returns FAQ list
    if (url.pathname === "/api/faqs" && request.method === "GET") {
      let faqs = await env.CONTENT.get("faqs", { type: "json" });
      if (!faqs) {
        // Seed default content
        await env.CONTENT.put("faqs", JSON.stringify(DEFAULT_FAQS));
        faqs = DEFAULT_FAQS;
      }
      return jsonResponse(faqs, 200, env);
    }

    // PUT /api/faqs - admin only, updates FAQ list
    if (url.pathname === "/api/faqs" && request.method === "PUT") {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return jsonResponse({ error: "Unauthorized" }, 401, env);
      }

      const token = authHeader.split(" ")[1];
      const user = await getDiscordUser(token);
      if (!user || !isAdmin(user.id, env)) {
        return jsonResponse({ error: "Forbidden" }, 403, env);
      }

      const faqs = await request.json();
      await env.CONTENT.put("faqs", JSON.stringify(faqs));
      return jsonResponse({ ok: true }, 200, env);
    }

    // GET /api/gallery - public, returns gallery image list
    if (url.pathname === "/api/gallery" && request.method === "GET") {
      let gallery = await env.CONTENT.get("gallery", { type: "json" });
      if (!gallery) {
        await env.CONTENT.put("gallery", JSON.stringify(DEFAULT_GALLERY));
        gallery = DEFAULT_GALLERY;
      }
      return jsonResponse(gallery, 200, env);
    }

    // POST /api/gallery - admin only, upload an image
    // Stores the image as base64 in KV (fine for small galleries, KV values can be up to 25MB)
    if (url.pathname === "/api/gallery" && request.method === "POST") {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return jsonResponse({ error: "Unauthorized" }, 401, env);
      }

      const token = authHeader.split(" ")[1];
      const user = await getDiscordUser(token);
      if (!user || !isAdmin(user.id, env)) {
        return jsonResponse({ error: "Forbidden" }, 403, env);
      }

      const formData = await request.formData();
      const file = formData.get("image");
      const caption = formData.get("caption") || "";

      if (!file) {
        return jsonResponse({ error: "No image provided" }, 400, env);
      }

      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      const dataUrl = `data:${file.type};base64,${base64}`;

      const id = `img_${Date.now()}`;

      // Store image data separately (KV can hold up to 25MB per value)
      await env.CONTENT.put(`gallery_img_${id}`, dataUrl);

      // Update gallery index
      let gallery = await env.CONTENT.get("gallery", { type: "json" }) || [];
      gallery.push({ id, caption, type: file.type });
      await env.CONTENT.put("gallery", JSON.stringify(gallery));

      return jsonResponse({ ok: true, id }, 200, env);
    }

    // GET /api/gallery/:id - public, returns a single image's data URL
    if (url.pathname.startsWith("/api/gallery/img_") && request.method === "GET") {
      const id = url.pathname.replace("/api/gallery/", "");
      const dataUrl = await env.CONTENT.get(`gallery_img_${id}`);
      if (!dataUrl) {
        return jsonResponse({ error: "Not found" }, 404, env);
      }
      return jsonResponse({ dataUrl }, 200, env);
    }

    // DELETE /api/gallery/:id - admin only, removes an image
    if (url.pathname.startsWith("/api/gallery/img_") && request.method === "DELETE") {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return jsonResponse({ error: "Unauthorized" }, 401, env);
      }

      const token = authHeader.split(" ")[1];
      const user = await getDiscordUser(token);
      if (!user || !isAdmin(user.id, env)) {
        return jsonResponse({ error: "Forbidden" }, 403, env);
      }

      const id = url.pathname.replace("/api/gallery/", "");

      // Remove image data
      await env.CONTENT.delete(`gallery_img_${id}`);

      // Update gallery index
      let gallery = await env.CONTENT.get("gallery", { type: "json" }) || [];
      gallery = gallery.filter((img) => img.id !== id);
      await env.CONTENT.put("gallery", JSON.stringify(gallery));

      return jsonResponse({ ok: true }, 200, env);
    }

    // ── Admin check route ──
    if (url.pathname === "/api/admin-check" && request.method === "GET") {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return jsonResponse({ admin: false }, 200, env);
      }

      const token = authHeader.split(" ")[1];
      const user = await getDiscordUser(token);
      if (!user) {
        return jsonResponse({ admin: false }, 200, env);
      }

      return jsonResponse({ admin: isAdmin(user.id, env), username: user.username }, 200, env);
    }

    return new Response("Not found", { status: 404 });
  },
};
