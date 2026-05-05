# Wirt's World Website - Deployment Guide

This guide walks you through getting the site live at `wirts.world` with
real Discord authentication. There are three parts:

1. **The website itself** (Vite + React, hosted on GitHub Pages)
2. **The Discord OAuth backend** (Cloudflare Worker)
3. **DNS setup** (pointing wirts.world to GitHub Pages)

---

## Part 1: Discord Application Setup

Before anything else, you need to set up Discord OAuth for your app.

1. Go to https://discord.com/developers/applications
2. You can either use the existing SDLink bot application or create a new one.
   Creating a new one keeps things separate, which is cleaner. Click **New Application**.
3. Name it something like "Wirt's World Site"
4. Go to the **OAuth2** tab
5. Copy the **Client ID** and **Client Secret** - you'll need these later
6. Under **Redirects**, add this URL:
   ```
   https://auth.wirts.world/callback
   ```
   (We'll create this Cloudflare Worker subdomain in Part 3)
7. Save changes

---

## Part 2: Cloudflare Worker (Discord OAuth Backend)

This handles the Discord login flow. GitHub Pages can only serve static files,
so we need this tiny backend to exchange OAuth tokens and check guild membership.

### 2a. Create the Worker

1. Go to your Cloudflare dashboard → **Workers & Pages** → **Create**
2. Click **"Create Worker"**
3. Name it `wirts-world-auth`
4. Click **Deploy** (it'll deploy a "Hello World" placeholder)
5. Click **Edit code** and replace everything with the contents of
   `cloudflare-worker/worker.js` from this project
6. Click **Deploy**

### 2b. Set Environment Variables (Secrets)

1. Go to your Worker → **Settings** → **Variables and Secrets**
2. Click **Add variable** and add these as **Secrets** (encrypted):

   | Name | Value |
   |------|-------|
   | DISCORD_CLIENT_ID | (from step 1.5) |
   | DISCORD_CLIENT_SECRET | (from step 1.5) |
   | DISCORD_GUILD_ID | 1497627351809392691 |
   | FRONTEND_URL | https://wirts.world |

3. Click **Save and deploy**

### 2c. Add a Custom Domain to the Worker

1. Go to your Worker → **Triggers** → **Custom Domains**
2. Add: `auth.wirts.world`
3. Cloudflare will automatically add the DNS record for you

Now `https://auth.wirts.world/login` is your OAuth entry point.

---

## Part 3: The Website

### 3a. Set Up the Project Locally

Make sure you have Node.js installed (you already do from the bot setup).

```bash
# Clone or create your repo
mkdir wirts-world-site
cd wirts-world-site
git init

# Copy all the project files from the zip I'm giving you, then:
npm install
```

### 3b. Update the Config

Open `src/App.jsx` and update the constants at the top:

```js
const DISCORD_INVITE = "https://discord.gg/YOUR_ACTUAL_INVITE";
const AUTH_URL = "https://auth.wirts.world/login";
```

The `AUTH_URL` should match the Cloudflare Worker domain from Part 2.

### 3c. Test Locally

```bash
npm run dev
```

This opens a local dev server. The Discord login won't work locally
(the redirect URL points to production), but you can verify everything
else looks right.

### 3d. Deploy to GitHub Pages

1. Create a new repo on GitHub (e.g., `wirts-world-site`)
2. Push your code:
   ```bash
   git add .
   git commit -m "initial site"
   git remote add origin https://github.com/YOUR_USERNAME/wirts-world-site.git
   git push -u origin main
   ```
3. The project includes a GitHub Actions workflow that automatically builds
   and deploys to GitHub Pages on every push to `main`.
4. Go to your repo → **Settings** → **Pages**
5. Under **Source**, select **GitHub Actions**
6. Under **Custom domain**, enter: `wirts.world`

### 3e. DNS for GitHub Pages

Go to Cloudflare DNS and add these records:

| Type  | Name | Content              | Proxy  |
|-------|------|----------------------|--------|
| CNAME | @    | YOUR_USERNAME.github.io | DNS only |

**Important:** Set this to **DNS only** (gray cloud), not Proxied.
GitHub Pages needs to handle SSL itself with its own certificate.

You'll also want to create a `CNAME` file in the `public/` folder of your
project containing just `wirts.world` — this is already included in the
project files.

After the DNS propagates (a few minutes), go to your GitHub repo →
Settings → Pages and check that the custom domain shows a green checkmark.
Enable **Enforce HTTPS**.

---

## Part 4: Gallery Images

1. Take some screenshots in-game
2. Drop them in `public/gallery/`
3. Update the `GALLERY_IMAGES` array in `src/App.jsx` with the filenames:
   ```js
   { id: 1, url: "/gallery/spawn.png", caption: "Spawn area at sunset" },
   ```
4. Push to GitHub and the site auto-deploys

---

## How the Discord OAuth Flow Works

1. User clicks "Sign in with Discord" on the site
2. Site redirects to `https://auth.wirts.world/login`
3. Worker redirects to Discord's OAuth page
4. User authorizes → Discord redirects to `https://auth.wirts.world/callback`
5. Worker exchanges the code for an access token
6. Worker checks if the user is in your guild (server)
7. Worker redirects back to `https://wirts.world` with the result in the URL
   (username + member status, no sensitive tokens)
8. Site reads the result and shows the appropriate step

---

## Troubleshooting

- **"Not a member" even though you are**: Make sure DISCORD_GUILD_ID is correct
  in the Worker secrets
- **OAuth redirect error**: Make sure the redirect URL in Discord Developer Portal
  exactly matches `https://auth.wirts.world/callback`
- **Site not loading at wirts.world**: DNS propagation can take up to an hour.
  Make sure the CNAME record is set to DNS only (gray cloud)
- **HTTPS errors**: GitHub Pages needs DNS only mode (not Proxied) to issue its
  own SSL cert. Wait a few minutes after setting up the custom domain.
