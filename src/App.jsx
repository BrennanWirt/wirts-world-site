import { useState, useEffect } from "react";

// ── Config ───────────────────────────────────────────────────────────────────
// Update these before deploying
const BLUEMAP_URL = "https://map.wirts.world";
const DISCORD_INVITE = "https://discord.gg/UY553CYev7";
const AUTH_URL = "https://auth.wirts.world/login";
const SERVER_IP = "mc.wirts.world";

// Gallery - replace placeholder URLs with real screenshot paths
// Drop images in public/gallery/ and reference them like "/gallery/spawn.png"
const GALLERY_IMAGES = [
  { id: 1, url: "", caption: "Spawn area at sunset", placeholder: "🌅" },
  { id: 2, url: "", caption: "Community builds", placeholder: "🏰" },
  { id: 3, url: "", caption: "Nether hub", placeholder: "🔥" },
  { id: 4, url: "", caption: "Ocean monument base", placeholder: "🌊" },
  { id: 5, url: "", caption: "Village trading hall", placeholder: "🏘️" },
  { id: 6, url: "", caption: "End raid", placeholder: "🐉" },
];

export default function App() {
  const [page, setPage] = useState("home");
  const [serverStatus, setServerStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [step, setStep] = useState("landing");
  const [user, setUser] = useState(null);
  const [platform, setPlatform] = useState(null);
  const [console_, setConsole_] = useState(null);
  const [copied, setCopied] = useState(false);
  const [cardFade, setCardFade] = useState(true);
  const [modsOpen, setModsOpen] = useState(false);
  const [expandedMod, setExpandedMod] = useState(null);
  const [selectedImg, setSelectedImg] = useState(null);

  const [particles] = useState(() =>
    [...Array(18)].map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 6}s`,
      dur: `${5 + Math.random() * 8}s`,
      size: `${2 + Math.random() * 3}px`,
      op: 0.08 + Math.random() * 0.14,
    }))
  );

  // ── Handle Discord OAuth callback ──
  // When the Cloudflare Worker redirects back, the URL will have params like:
  // ?auth=success&username=brennanwirt&member=true
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const auth = params.get("auth");

    if (auth === "success") {
      const username = params.get("username") || "unknown";
      const isMember = params.get("member") === "true";
      setUser({ username, isMember });
      setPage("join");
      setStep(isMember ? "platform" : "not_member");
      // Clean the URL so it doesn't show the params
      window.history.replaceState({}, "", window.location.pathname);
    } else if (auth === "error") {
      setPage("join");
      setStep("landing");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // ── Fetch server status ──
  useEffect(() => {
    const f = () => {
      setStatusLoading(true);
      fetch(`https://mcapi.us/server/status?ip=${SERVER_IP}`)
        .then((r) => r.json())
        .then((d) => { setServerStatus(d); setStatusLoading(false); })
        .catch(() => { setServerStatus(null); setStatusLoading(false); });
    };
    f();
    const i = setInterval(f, 60000);
    return () => clearInterval(i);
  }, []);

  const changeStep = (s) => { setCardFade(false); setTimeout(() => { setStep(s); setCardFade(true); }, 180); };

  const handleDiscordLogin = () => {
    // Redirect to the Cloudflare Worker which starts the real OAuth flow
    window.location.href = AUTH_URL;
  };

  // Mock login for testing locally (remove in production or keep hidden)
  const handleMockLogin = (isMember) => {
    changeStep("auth_checking");
    setTimeout(() => {
      setUser({ username: "testuser", isMember });
      changeStep(isMember ? "platform" : "not_member");
    }, 1800);
  };

  const copy = (t) => { navigator.clipboard.writeText(t); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const navTo = (p) => { setPage(p); if (p === "join") { setStep("landing"); setUser(null); setPlatform(null); setConsole_(null); setModsOpen(false); setExpandedMod(null); } };

  const vids = { xbox: "g8mHvasVHMs", playstation: "fDmTWBL-_tA", switch: "zalT_oR1nPM" };
  const cLabels = { xbox: "Xbox", playstation: "PlayStation", switch: "Switch" };
  const mods = [
    { id: "fabric", icon: "⚙️", name: "Fabric Installer", hint: "Mod loader", url: "https://maven.fabricmc.net/net/fabricmc/fabric-installer/1.1.0/fabric-installer-1.1.0.jar", desc: "Lightweight mod loader for Minecraft. Download the installer, pick your MC version, and it handles everything." },
    { id: "fabric-api", icon: "📦", name: "Fabric API", hint: "Required library", url: "https://modrinth.com/mod/fabric-api", desc: "Most Fabric mods need this. Grab the one that matches your MC version and toss it in your mods folder." },
    { id: "voice", icon: "🎙️", name: "Simple Voice Chat", hint: "Proximity voice", url: "https://modrinth.com/plugin/simple-voice-chat", desc: "Proximity voice chat in-game. Players near you can hear you talk. Drop it in mods folder next to Fabric API." },
    { id: "shulker", icon: "📦", name: "Shulker Box Tooltip", hint: "QoL / inventory", url: "https://modrinth.com/mod/shulkerboxtooltip", desc: "Hover over a shulker box in your inventory and see what's inside without having to place it down. Already installed on the server, but install it client-side to actually see the tooltips." },
    { id: "elytra", icon: "🪽", name: "Armored Elytra", hint: "QoL / equipment", url: "https://modrinth.com/datapack/elytra-armor", desc: "Combine an elytra with a chestplate so you don't have to choose between flying and armor. Already on the server as a datapack, but if you install the Fabric mod client-side you get the proper combined item texture." },
  ];

  const pc = serverStatus?.players?.now || 0;
  const mp = serverStatus?.players?.max || 20;
  const on = serverStatus?.online;
  const playerNames = serverStatus?.players?.sample || [];

  // Colors
  const gold = "#d4a84b";
  const goldDim = "rgba(212,168,75,0.12)";
  const goldBorder = "rgba(212,168,75,0.2)";
  const goldGlow = "rgba(212,168,75,0.35)";
  const bg = "#131416";
  const card = "#191b1e";
  const border = "#222426";
  const textPrimary = "#e8e5df";
  const textSec = "#7a7672";
  const textDim = "#4a4744";

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "'Sora', sans-serif", color: textPrimary, position: "relative", display: "flex", flexDirection: "column" }}>
      {/* Grain */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, opacity: 0.03, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundRepeat: "repeat", backgroundSize: "128px" }} />
      {/* Particles */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        {particles.map((p, i) => (
          <div key={i} style={{ position: "absolute", borderRadius: "50%", background: gold, left: p.left, top: p.top, width: p.size, height: p.size, opacity: p.op, animation: `float ${p.dur} ease-in-out ${p.delay} infinite` }} />
        ))}
      </div>

      {/* Nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(19,20,22,0.9)", backdropFilter: "blur(14px)", borderBottom: `1px solid ${border}`, padding: "0 20px" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "54px" }}>
          <button onClick={() => navTo("home")} style={{ display: "flex", alignItems: "center", gap: "10px", background: "none", border: "none", cursor: "pointer" }}>
            <span style={{ width: "30px", height: "30px", borderRadius: "8px", background: `linear-gradient(135deg, ${gold}, #8b6d3f)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "800", color: bg }}>W</span>
            <span style={{ fontSize: "14px", fontWeight: "700", color: textPrimary, fontFamily: "'Sora', sans-serif", letterSpacing: "-0.3px" }}>Wirt's World</span>
          </button>
          <div style={{ display: "flex", gap: "2px" }}>
            {["home", "join", "gallery", "map"].map((p) => (
              <button key={p} onClick={() => navTo(p)} style={{ padding: "6px 14px", borderRadius: "6px", background: page === p ? goldDim : "none", border: "none", color: page === p ? gold : textDim, fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "'Sora', sans-serif" }}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main style={{ position: "relative", zIndex: 1, flex: 1 }}>
        {/* ══ HOME ══ */}
        {page === "home" && (
          <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "56px 20px 80px" }}>
            <div style={{ marginBottom: "48px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "5px 14px", borderRadius: "6px", background: goldDim, border: `1px solid ${goldBorder}`, fontSize: "12px", fontFamily: "'DM Mono', monospace", color: textSec, marginBottom: "20px" }}>
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: statusLoading ? textDim : on ? "#22c55e" : "#ef4444", boxShadow: on ? "0 0 6px rgba(34,197,94,0.5)" : "none" }} />
                {statusLoading ? "Checking..." : on ? `${pc} playing right now` : "Server offline"}
              </div>
              <h1 style={{ fontSize: "clamp(40px, 7vw, 64px)", fontWeight: "800", lineHeight: 1, letterSpacing: "-2px", color: textPrimary }}>Wirt's World</h1>
              <p style={{ fontSize: "16px", color: textSec, lineHeight: 1.7, marginTop: "16px", maxWidth: "500px" }}>
                A vanilla Minecraft server that supports both Java and Bedrock. Running on Fabric with server-side performance and feature mods. Nothing you need to install.
              </p>
              <div style={{ display: "flex", gap: "10px", marginTop: "24px", flexWrap: "wrap" }}>
                <button onClick={() => navTo("join")} style={{ padding: "12px 26px", borderRadius: "8px", border: "none", background: `linear-gradient(135deg, ${gold}, #a8873e)`, color: bg, fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: "'Sora', sans-serif", boxShadow: `0 2px 16px ${goldGlow}` }}>Join Server</button>
                <button onClick={() => navTo("map")} style={{ padding: "12px 26px", borderRadius: "8px", border: `1px solid ${border}`, background: "transparent", color: textSec, fontSize: "14px", fontWeight: "500", cursor: "pointer", fontFamily: "'Sora', sans-serif" }}>Live Map</button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1px", background: border, borderRadius: "10px", overflow: "hidden", marginBottom: "24px" }}>
              {[{ k: "VERSION", v: "26.1.2" }, { k: "PLATFORM", v: "Java + Bedrock" }, { k: "PLAYERS", v: statusLoading ? "..." : `${pc} / ${mp}` }, { k: "MODS", v: "Server-side only" }].map((s, i) => (
                <div key={i} style={{ background: card, padding: "18px 20px" }}>
                  <div style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", letterSpacing: "1.5px", color: textDim, marginBottom: "6px" }}>{s.k}</div>
                  <div style={{ fontSize: "15px", fontWeight: "700", color: textPrimary }}>{s.v}</div>
                </div>
              ))}
            </div>

            {on && playerNames.length > 0 && (
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: "10px", padding: "16px 20px", marginBottom: "48px" }}>
                <div style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", letterSpacing: "1.5px", color: textDim, marginBottom: "10px" }}>WHO'S ONLINE</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {playerNames.map((p, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 12px", borderRadius: "6px", background: goldDim, border: `1px solid ${goldBorder}` }}>
                      <img src={`https://mc-heads.net/avatar/${p.name || p.id}/24`} alt="" style={{ width: "18px", height: "18px", borderRadius: "4px", imageRendering: "pixelated" }} />
                      <span style={{ fontSize: "13px", fontWeight: "600", color: textPrimary }}>{p.name || p.id}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {on && playerNames.length === 0 && pc > 0 && (
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: "10px", padding: "16px 20px", marginBottom: "48px" }}>
                <div style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", letterSpacing: "1.5px", color: textDim, marginBottom: "6px" }}>WHO'S ONLINE</div>
                <p style={{ fontSize: "13px", color: textSec }}>{pc} player{pc !== 1 ? "s" : ""} online</p>
              </div>
            )}

            <h2 style={{ fontSize: "24px", fontWeight: "800", letterSpacing: "-0.5px", marginBottom: "20px" }}>Server Information</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" }}>
              {[
                { tag: "MAP", t: "3D World Map", d: "BlueMap renders the entire world in 3D right in your browser. Check out builds, scope out terrain, or just see where everyone is.", link: true },
                { tag: "VOICE", t: "Proximity Voice Chat", d: "If you're on Java and install Simple Voice Chat, you can talk to nearby players in-game." },
                { tag: "SYNC", t: "Discord Nicknames", d: "Once you link your accounts, your Discord nickname and role color automatically sync to your in-game display name." },
              ].map((f, i) => (
                <div key={i} style={{ background: card, border: `1px solid ${border}`, borderRadius: "10px", padding: "24px" }}>
                  <span style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", letterSpacing: "2px", color: gold }}>{f.tag}</span>
                  <h3 style={{ fontSize: "16px", fontWeight: "700", marginTop: "8px", marginBottom: "8px" }}>{f.t}</h3>
                  <p style={{ fontSize: "13px", color: textSec, lineHeight: 1.7 }}>{f.d}</p>
                  {f.link && <button onClick={() => navTo("map")} style={{ marginTop: "14px", padding: "6px 14px", borderRadius: "6px", border: `1px solid ${goldBorder}`, background: goldDim, color: gold, fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>Open Map →</button>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ GALLERY ══ */}
        {page === "gallery" && (
          <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "48px 20px 80px" }}>
            <h2 style={{ fontSize: "28px", fontWeight: "800", letterSpacing: "-0.5px", marginBottom: "6px" }}>Gallery</h2>
            <p style={{ fontSize: "14px", color: textSec, marginBottom: "24px" }}>Some screenshots from the server.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
              {GALLERY_IMAGES.map((img) => (
                <button key={img.id} onClick={() => img.url && setSelectedImg(img)} style={{ position: "relative", background: card, border: `1px solid ${border}`, borderRadius: "10px", overflow: "hidden", cursor: img.url ? "pointer" : "default", aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Sora', sans-serif" }}>
                  {img.url ? (
                    <img src={img.url} alt={img.caption} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "36px" }}>{img.placeholder}</span>
                      <span style={{ fontSize: "12px", color: textDim }}>{img.caption}</span>
                    </div>
                  )}
                  {img.url && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "10px 14px", background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}><span style={{ fontSize: "13px", fontWeight: "600", color: "#fff" }}>{img.caption}</span></div>}
                </button>
              ))}
            </div>
            {selectedImg && selectedImg.url && (
              <div onClick={() => setSelectedImg(null)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: "24px" }}>
                <img src={selectedImg.url} alt={selectedImg.caption} style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: "8px", objectFit: "contain" }} />
                <div style={{ position: "absolute", bottom: "32px", textAlign: "center", color: "#fff", fontSize: "15px", fontWeight: "600" }}>{selectedImg.caption}</div>
              </div>
            )}
          </div>
        )}

        {/* ══ MAP ══ */}
        {page === "map" && (
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "48px 20px 80px" }}>
            <h2 style={{ fontSize: "28px", fontWeight: "800", textAlign: "center" }}>World Map</h2>
            <p style={{ fontSize: "14px", color: textSec, textAlign: "center", marginTop: "6px", marginBottom: "20px" }}>Powered by BlueMap. Full 3D, explorable right here.</p>
            <div style={{ position: "relative", width: "100%", height: "70vh", minHeight: "400px", borderRadius: "10px", overflow: "hidden", border: `1px solid ${border}`, background: card }}>
              <iframe src={BLUEMAP_URL} title="BlueMap" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }} allow="fullscreen" />
            </div>
          </div>
        )}

        {/* ══ JOIN ══ */}
        {page === "join" && (
          <div style={{ display: "flex", justifyContent: "center", padding: "56px 20px 80px" }}>
            <div style={{ width: "100%", maxWidth: "460px", opacity: cardFade ? 1 : 0, transform: cardFade ? "translateY(0)" : "translateY(8px)", transition: "opacity 0.2s, transform 0.2s" }}>

              {step === "landing" && <>
                <h2 style={{ fontSize: "28px", fontWeight: "800", letterSpacing: "-0.5px", marginBottom: "6px" }}>Join Server</h2>
                <p style={{ fontSize: "14px", color: textSec, lineHeight: 1.7, marginBottom: "20px" }}>To get the server info, we need to verify that you're in the Discord. This is how we keep the IP from getting out to random people.</p>
                <button onClick={handleDiscordLogin} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", padding: "12px", borderRadius: "8px", border: "none", background: "#5865F2", color: "#fff", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "'Sora', sans-serif", boxShadow: "0 2px 12px rgba(88,101,242,0.3)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z"/></svg>
                  Sign in with Discord
                </button>
                <p style={{ fontSize: "12px", color: textDim, marginTop: "12px" }}>We only check if you're in the server. We don't read your messages or do anything weird.</p>
              </>}

              {step === "auth_checking" && <>
                <div style={{ width: "32px", height: "32px", border: `2px solid ${border}`, borderTopColor: gold, borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 16px" }} />
                <p style={{ fontSize: "14px", color: textSec, textAlign: "center" }}>Checking your Discord...</p>
              </>}

              {step === "not_member" && <>
                <div style={{ display: "inline-block", padding: "4px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)", marginBottom: "14px" }}>Not a member</div>
                <p style={{ fontSize: "14px", color: textSec, lineHeight: 1.7, marginBottom: "16px" }}>Looks like you aren't in our Discord yet! Join us first, then come back here.</p>
                <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" style={{ display: "block", width: "100%", padding: "12px", borderRadius: "8px", background: "#5865F2", color: "#fff", fontSize: "14px", fontWeight: "600", textAlign: "center", textDecoration: "none", fontFamily: "'Sora', sans-serif" }}>Join the Discord</a>
                <button onClick={() => changeStep("landing")} style={{ background: "none", border: "none", color: textDim, fontSize: "13px", cursor: "pointer", fontFamily: "'Sora', sans-serif", marginTop: "14px" }}>← Try again</button>
              </>}

              {step === "platform" && <>
                <div style={{ display: "inline-block", padding: "4px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)", marginBottom: "14px" }}>Verified</div>
                <h2 style={{ fontSize: "24px", fontWeight: "800", letterSpacing: "-0.5px", marginBottom: "4px" }}>Hey, {user?.username}!</h2>
                <p style={{ fontSize: "14px", color: textSec, lineHeight: 1.7, marginBottom: "16px" }}>What are you playing on?</p>
                <div style={{ display: "grid", gap: "8px" }}>
                  {[
                    { k: "java", icon: "☕", name: "Java Edition", sub: "PC, Mac, Linux", fn: () => { setPlatform("java"); changeStep("java"); } },
                    { k: "bed", icon: "🪟", name: "Bedrock", sub: "Win10/11 or Mobile", fn: () => { setPlatform("bedrock_pc"); changeStep("java"); } },
                    { k: "con", icon: "🎮", name: "Console", sub: "Xbox, PlayStation, Switch", fn: () => { setPlatform("console"); changeStep("bedrock_console"); } },
                  ].map((o) => (
                    <button key={o.k} onClick={o.fn} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px", borderRadius: "8px", border: `1px solid ${border}`, background: card, cursor: "pointer", fontFamily: "'Sora', sans-serif", textAlign: "left", color: textPrimary }}>
                      <span style={{ fontSize: "22px" }}>{o.icon}</span>
                      <div><div style={{ fontSize: "15px", fontWeight: "600" }}>{o.name}</div><div style={{ fontSize: "12px", color: textDim }}>{o.sub}</div></div>
                    </button>
                  ))}
                </div>
              </>}

              {step === "java" && <>
                <h2 style={{ fontSize: "24px", fontWeight: "800", letterSpacing: "-0.5px", marginBottom: "4px" }}>{platform === "java" ? "Java Edition" : "Bedrock (PC/Mobile)"}</h2>
                <p style={{ fontSize: "14px", color: textSec, lineHeight: 1.7, marginBottom: "16px" }}>All you have to do is enter this info into the add server section of the multiplayer menu!</p>
                <div style={{ background: card, border: `1px solid ${border}`, borderRadius: "8px", padding: "14px 16px", marginBottom: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "5px 0" }}>
                    <span style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", color: textDim, letterSpacing: "1.5px", width: "40px" }}>IP</span>
                    <span style={{ fontSize: "16px", fontFamily: "'DM Mono', monospace", color: gold, flex: 1 }}>{SERVER_IP}</span>
                    <button onClick={() => copy(SERVER_IP)} style={{ padding: "3px 10px", borderRadius: "4px", border: `1px solid ${goldBorder}`, background: goldDim, color: gold, fontSize: "11px", cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>{copied ? "copied!" : "copy"}</button>
                  </div>
                  {platform === "bedrock_pc" && <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "5px 0" }}>
                    <span style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", color: textDim, letterSpacing: "1.5px", width: "40px" }}>PORT</span>
                    <span style={{ fontSize: "16px", fontFamily: "'DM Mono', monospace", color: gold, flex: 1 }}>19132</span>
                    <button onClick={() => copy("19132")} style={{ padding: "3px 10px", borderRadius: "4px", border: `1px solid ${goldBorder}`, background: goldDim, color: gold, fontSize: "11px", cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>{copied ? "copied!" : "copy"}</button>
                  </div>}
                </div>
                <div style={{ background: goldDim, border: `1px solid ${goldBorder}`, borderRadius: "8px", padding: "12px 16px", fontSize: "13px", color: goldGlow, lineHeight: 1.6, marginBottom: "14px" }}>
                  <strong style={{ color: gold }}>Whitelist:</strong> <span style={{ color: "#b8a878" }}>To get whitelisted, please attempt to join the server with the info above, then DM <strong>@Wirt's World Bot</strong> with your link code that is displayed.</span>
                </div>
                {platform === "java" && (
                  <div style={{ border: `1px solid ${border}`, borderRadius: "8px", overflow: "hidden", marginBottom: "14px" }}>
                    <button onClick={() => setModsOpen(!modsOpen)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "12px 14px", background: card, border: "none", cursor: "pointer", fontFamily: "'Sora', sans-serif" }}>
                      <span style={{ fontSize: "11px", fontWeight: "700", color: textDim, letterSpacing: "1px", fontFamily: "'DM Mono', monospace" }}>OPTIONAL MODS</span>
                      <span style={{ color: textDim, transition: "transform 0.2s", transform: modsOpen ? "rotate(180deg)" : "none" }}>▾</span>
                    </button>
                    {modsOpen && <div style={{ padding: "0 14px 14px", background: card }}>
                      <p style={{ fontSize: "13px", color: textSec, lineHeight: 1.6, marginBottom: "10px" }}>These are all optional but can make the experience better if you're on Java. You'll need Fabric installed first (the first two items), then grab whatever else sounds good.</p>
                      {mods.map((m) => (
                        <div key={m.id} style={{ border: `1px solid ${border}`, borderRadius: "6px", marginBottom: "4px", overflow: "hidden" }}>
                          <button onClick={() => setExpandedMod(expandedMod === m.id ? null : m.id)} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", width: "100%", background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Sora', sans-serif", textAlign: "left" }}>
                            <span style={{ fontSize: "16px" }}>{m.icon}</span>
                            <div style={{ flex: 1 }}><div style={{ fontSize: "13px", fontWeight: "600", color: textPrimary }}>{m.name}</div><div style={{ fontSize: "11px", color: textDim }}>{m.hint}</div></div>
                            <span style={{ color: textDim, fontSize: "12px", transition: "transform 0.2s", transform: expandedMod === m.id ? "rotate(180deg)" : "none" }}>▾</span>
                          </button>
                          {expandedMod === m.id && <div style={{ padding: "0 12px 12px", marginLeft: "36px", borderTop: `1px solid ${border}`, paddingTop: "8px" }}>
                            <p style={{ fontSize: "12px", color: textSec, lineHeight: 1.6, marginBottom: "8px" }}>{m.desc}</p>
                            <a href={m.url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", padding: "4px 12px", borderRadius: "4px", background: goldDim, border: `1px solid ${goldBorder}`, color: gold, fontSize: "11px", fontWeight: "600", textDecoration: "none", fontFamily: "'DM Mono', monospace" }}>Download ↗</a>
                          </div>}
                        </div>
                      ))}
                    </div>}
                  </div>
                )}
                <button onClick={() => changeStep("platform")} style={{ background: "none", border: "none", color: textDim, fontSize: "13px", cursor: "pointer", fontFamily: "'Sora', sans-serif" }}>← Back</button>
              </>}

              {step === "bedrock_console" && !console_ && <>
                <h2 style={{ fontSize: "24px", fontWeight: "800", letterSpacing: "-0.5px", marginBottom: "12px" }}>Which console?</h2>
                <div style={{ display: "grid", gap: "8px" }}>
                  {Object.entries(cLabels).map(([k, v]) => (
                    <button key={k} onClick={() => setConsole_(k)} style={{ padding: "14px 16px", borderRadius: "8px", border: `1px solid ${border}`, background: card, cursor: "pointer", fontFamily: "'Sora', sans-serif", color: textPrimary, fontSize: "15px", fontWeight: "600", textAlign: "left" }}>{v}</button>
                  ))}
                </div>
                <button onClick={() => changeStep("platform")} style={{ background: "none", border: "none", color: textDim, fontSize: "13px", cursor: "pointer", fontFamily: "'Sora', sans-serif", marginTop: "14px" }}>← Back</button>
              </>}

              {step === "bedrock_console" && console_ && <>
                <h2 style={{ fontSize: "24px", fontWeight: "800", letterSpacing: "-0.5px", marginBottom: "16px" }}>{cLabels[console_]} Setup</h2>
                <div style={{ marginBottom: "14px" }}>
                  {[
                    { n: "1", content: <div style={{ flex: 1 }}><p style={{ fontSize: "13px", color: textSec, lineHeight: 1.7 }}>Change your console's DNS settings following this video guide:</p><div style={{ marginTop: "10px", borderRadius: "8px", overflow: "hidden", position: "relative", paddingBottom: "56.25%", height: 0, border: `1px solid ${border}` }}><iframe src={`https://www.youtube.com/embed/${vids[console_]}`} title="DNS Guide" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} /></div></div> },
                    { n: "2", content: <p style={{ fontSize: "13px", color: textSec, lineHeight: 1.7 }}>Once the DNS settings have been updated, select any of the featured servers in the multiplayer section (Mineville, Lifeboat, The Hive, whatever)</p> },
                    { n: "3", content: <div style={{ flex: 1 }}><p style={{ fontSize: "13px", color: textSec, lineHeight: 1.7 }}>Enter the server info:</p><div style={{ background: card, border: `1px solid ${border}`, borderRadius: "8px", padding: "12px", marginTop: "8px" }}><div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "4px 0" }}><span style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", color: textDim, letterSpacing: "1.5px", width: "40px" }}>IP</span><span style={{ fontSize: "14px", fontFamily: "'DM Mono', monospace", color: gold, flex: 1 }}>{SERVER_IP}</span><button onClick={() => copy(SERVER_IP)} style={{ padding: "3px 10px", borderRadius: "4px", border: `1px solid ${goldBorder}`, background: goldDim, color: gold, fontSize: "11px", cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>{copied ? "copied!" : "copy"}</button></div><div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "4px 0" }}><span style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", color: textDim, letterSpacing: "1.5px", width: "40px" }}>PORT</span><span style={{ fontSize: "14px", fontFamily: "'DM Mono', monospace", color: gold }}>19132</span></div></div></div> },
                  ].map((s) => (
                    <div key={s.n} style={{ display: "flex", gap: "12px", marginBottom: "18px", alignItems: "flex-start" }}>
                      <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: goldDim, border: `1px solid ${goldBorder}`, color: gold, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "700", flexShrink: 0 }}>{s.n}</div>
                      {s.content}
                    </div>
                  ))}
                </div>
                <div style={{ background: goldDim, border: `1px solid ${goldBorder}`, borderRadius: "8px", padding: "12px 16px", fontSize: "13px", lineHeight: 1.6, marginBottom: "14px" }}>
                  <strong style={{ color: gold }}>Whitelist:</strong> <span style={{ color: "#b8a878" }}>To get whitelisted, please attempt to join the server with the info above, then DM <strong>@Wirt's World Bot</strong> with your link code that is displayed.</span>
                </div>
                <p style={{ fontSize: "12px", color: textDim, fontStyle: "italic", marginBottom: "14px" }}>If you are on Bedrock and have issues, please shoot me a message. I have been using this plugin for a long time and it has bugs that I know how to fix.</p>
                <button onClick={() => setConsole_(null)} style={{ background: "none", border: "none", color: textDim, fontSize: "13px", cursor: "pointer", fontFamily: "'Sora', sans-serif" }}>← Back</button>
              </>}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ position: "relative", zIndex: 1, borderTop: `1px solid ${border}`, padding: "32px 20px", marginTop: "auto" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ width: "24px", height: "24px", borderRadius: "6px", background: `linear-gradient(135deg, ${gold}, #8b6d3f)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "800", color: bg }}>W</span>
            <span style={{ fontSize: "13px", color: textDim }}>Wirt's World</span>
          </div>
          <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", borderRadius: "6px", background: "rgba(88,101,242,0.1)", border: "1px solid rgba(88,101,242,0.2)", color: "#8b9aff", fontSize: "13px", fontWeight: "600", textDecoration: "none" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z"/></svg>
            Discord
          </a>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @keyframes float { 0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.1; } 50% { transform: translateY(-25px) rotate(180deg); opacity: 0.3; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        button { transition: opacity 0.12s, transform 0.12s; }
        button:active { transform: scale(0.97); }
      `}</style>
    </div>
  );
}
