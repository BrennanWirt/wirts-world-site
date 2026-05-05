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
so we need this tiny backend to do the token exchange and guild membership check.

The Cloudflare dashboard pushes you to connect a git repo when creating Workers
now, which is overkill for this. We'll use the Wrangler CLI instead since you
already have Node installed.

### 2a. Install Wrangler and log in

Open a terminal on your computer (not the server, your local machine is fine):

```bash
npm install -g wrangler
wrangler login
```

This will open a browser window asking you to authorize Wrangler with your
Cloudflare account. Click Allow.

### 2b. Create the Worker project

```bash
mkdir wirts-world-auth
cd wirts-world-auth
```

Create a file called `wrangler.jsonc` in this folder with this content:

```json
{
  "name": "wirts-world-auth",
  "main": "worker.js",
  "compatibility_date": "2026-05-04"
}
```

Then copy the `worker.js` file from the `cloudflare-worker/` folder in the
project zip into this `wirts-world-auth/` folder.

### 2c. Deploy the Worker

```bash
wrangler deploy
```

You should see output like:
```
Published wirts-world-auth (0.5 sec)
  https://wirts-world-auth.YOUR_SUBDOMAIN.workers.dev
```

### 2d. Set your secrets

These are the sensitive values the Worker needs. Run each of these commands
and paste the value when prompted:

```bash
wrangler secret put DISCORD_CLIENT_ID
```
(Paste your Client ID from the Discord Developer Portal, hit Enter)

```bash
wrangler secret put DISCORD_CLIENT_SECRET
```
(Paste your Client Secret from the Discord Developer Portal, hit Enter)

```bash
wrangler secret put DISCORD_GUILD_ID
```
(Paste: 1497627351809392691)

```bash
wrangler secret put FRONTEND_URL
```
(Paste: https://wirts.world)

### 2e. Add a custom domain to the Worker

1. Go to the Cloudflare dashboard → Workers & Pages
2. Click on your **wirts-world-auth** worker
3. Go to **Settings** → **Domains & Routes** (or **Triggers** depending on UI version)
4. Click **Add** → **Custom Domain**
5. Enter: `auth.wirts.world`
6. Click **Add Domain**

Cloudflare will automatically create the DNS record for you. After a minute
or two, `https://auth.wirts.world/login` should redirect you to Discord's
OAuth page (it'll error because we haven't set the redirect URL yet, but
that confirms the Worker is live).

### 2f. Update the Discord redirect URL

Now that the Worker is live, go back to the Discord Developer Portal:

1. Go to your application → **OAuth2** tab
2. Under **Redirects**, add exactly this URL:
   ```
   https://auth.wirts.world/callback
   ```
3. Save

That's it for the Worker. You can close the `wirts-world-auth` folder.
If you ever need to update the Worker code, just edit `worker.js` and run
`wrangler deploy` again from that folder.

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
