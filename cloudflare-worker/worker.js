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

const DEFAULT_MODS = [
  { name: "Sodium",              cat: "perf",    desc: "Complete rendering engine replacement for Fabric. Huge FPS gains on the client side with no gameplay changes.", note: null },
  { name: "Lithium",             cat: "perf",    desc: "Optimizes server-side game logic including mob AI, block ticking, and chunk loading. Keeps things running smooth with more people on.", note: null },
  { name: "Krypton",             cat: "perf",    desc: "Optimizes the networking stack to reduce packet overhead and improve connection stability for everyone on the server.", note: null },
  { name: "Spark",               cat: "perf",    desc: "Performance profiler that watches for lag spikes and helps track down what is causing them. Runs quietly in the background.", note: null },
  { name: "Chunky",              cat: "perf",    desc: "Pre-generates world chunks so players never hit unloaded terrain. Cuts down on the lag spikes you get when exploring new areas.", note: null },
  { name: "View Distance Fix",   cat: "perf",    desc: "Fixes a vanilla bug where simulation distance and view distance are incorrectly tied together, which was limiting how many players could connect.", note: null },
  { name: "Simple Voice Chat",   cat: "feature", desc: "Proximity voice chat built into the game. You can hear players near you talk in real time. You need to install the client mod separately to use it.", note: "Optional client mod available" },
  { name: "BlueMap",             cat: "feature", desc: "Generates a live 3D map of the server world that you can view from the Map page. Updates as people build and explore.", note: null },
  { name: "Image2Map",           cat: "feature", desc: "Turn any image URL into an in-game map item. Place it in an item frame and it shows up as the actual image. Good for custom art builds.", note: null },
  { name: "Vein Miner",          cat: "feature", desc: "Hold sneak while mining to break a whole connected ore vein at once. Works the same way for trees if you want to chop a full one.", note: null },
  { name: "Falling Tree",        cat: "feature", desc: "Chop the base of a tree with an axe and the whole thing comes down at once. Makes gathering wood a lot less tedious.", note: null },
  { name: "Armored Elytra",      cat: "feature", desc: "Combine an elytra with a chestplate at the smithing table and get both flight and armor from one item. No more choosing one or the other.", note: null },
  { name: "Audio Player",        cat: "feature", desc: "Play audio from URLs through note blocks and jukeboxes. Supports MP3, OGG, and live streams. Good for custom music setups.", note: null },
  { name: "Double Doors",        cat: "qol",     desc: "Right-click one side of a double door and both sides open together. Works on all wood types and fence gates.", note: null },
  { name: "FSit",                cat: "qol",     desc: "Right-click a stair block to sit on it. Purely cosmetic, just a nice touch for hanging out.", note: null },
  { name: "Custom Name Tags",    cat: "qol",     desc: "Lets players customize how their nametag looks above their head using formatting codes.", note: null },
  { name: "First Join Message",  cat: "qol",     desc: "Sends a welcome message to new players the first time they connect. Gives people the basic info they need right away.", note: null },
  { name: "Styled Nicknames",    cat: "qol",     desc: "Players can set a nickname with color and formatting that shows up in chat and above their head.", note: null },
  { name: "No Rollback",         cat: "qol",     desc: "Stops the server from snapping players back to their previous position after a lag spike, which cuts down on rubber-banding.", note: null },
  { name: "Geyser",              cat: "compat",  desc: "The main plugin that translates between Java and Bedrock. This is what lets console and mobile players connect to a Java server.", note: null },
  { name: "Floodgate",           cat: "compat",  desc: "Works alongside Geyser to handle auth for Bedrock players so they can join without a Java account.", note: null },
  { name: "ViaVersion",          cat: "compat",  desc: "Lets players on newer client versions connect even if the server is running an older version. Keeps more people able to join.", note: null },
  { name: "ViaFabric",           cat: "compat",  desc: "Plugs ViaVersion directly into the Fabric server so multi-version support works without needing a proxy layer.", note: null },
  { name: "TAB",                 cat: "admin",   desc: "Customizes the player tab list with groups, prefixes, and server info like TPS and current player count.", note: null },
  { name: "Simple Discord Link", cat: "admin",   desc: "Bridges in-game chat with a Discord channel. Messages sent in Minecraft show up in Discord and the other way around.", note: null },
  { name: "Mod Menu",            cat: "admin",   desc: "Adds a mod list screen to the in-game menu. Mostly useful for checking what is loaded on the server side.", note: null },
  { name: "Fabric API",          cat: "lib",     desc: "Core library that most Fabric mods depend on. Required by the majority of everything else on this list.", note: null },
  { name: "Fabric Language Kotlin", cat: "lib",  desc: "Adds Kotlin runtime support so mods written in Kotlin can run on Fabric.", note: null },
  { name: "Placeholder API",     cat: "lib",     desc: "Shared variable system that lets mods expose and read dynamic values like player counts and server stats.", note: null },
  { name: "Silk",                cat: "lib",     desc: "Kotlin-based utility library used by Armored Elytra and a couple of other mods on the server.", note: null },
  { name: "Collective",          cat: "lib",     desc: "Shared library used by several mods from the same developer. Keeps individual mods small by handling common code in one place.", note: null },
  { name: "Polymer",             cat: "lib",     desc: "Lets server-side mods add custom blocks and items that work for vanilla clients with no client mod required.", note: null },
  { name: "CraterLib",           cat: "lib",     desc: "Cross-platform library that bridges Fabric and other mod loaders. Required by Simple Discord Link.", note: null },
];

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

    // GET /api/mods - public, returns mod list
    if (url.pathname === "/api/mods" && request.method === "GET") {
      let mods = await env.CONTENT.get("mods", { type: "json" });
      if (!mods) {
        await env.CONTENT.put("mods", JSON.stringify(DEFAULT_MODS));
        mods = DEFAULT_MODS;
      }
      return jsonResponse(mods, 200, env);
    }

    // PUT /api/mods - admin only, updates mod list
    if (url.pathname === "/api/mods" && request.method === "PUT") {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return jsonResponse({ error: "Unauthorized" }, 401, env);
      }

      const token = authHeader.split(" ")[1];
      const user = await getDiscordUser(token);
      if (!user || !isAdmin(user.id, env)) {
        return jsonResponse({ error: "Forbidden" }, 403, env);
      }

      const mods = await request.json();
      await env.CONTENT.put("mods", JSON.stringify(mods));
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
