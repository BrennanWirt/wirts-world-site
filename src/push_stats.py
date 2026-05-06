#!/usr/bin/env python3
"""
push_stats.py — reads vanilla Minecraft player stat files and pushes
aggregated data to the Wirt's World Cloudflare worker.

Set up as a cron job to run every 10-15 minutes:
  */10 * * * * /usr/bin/python3 /opt/push_stats.py >> /var/log/push_stats.log 2>&1

Environment variables (put these in /etc/environment or a .env file):
  STATS_SECRET   — must match the STATS_SECRET set on the Cloudflare worker
  WORKER_URL     — e.g. https://auth.wirts.world
"""

import json
import os
import urllib.request
import urllib.error
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────

WORLD_PATH = Path("/var/opt/minecraft/crafty/crafty-4/servers/ad5f8475-552f-44d7-88a1-b4adf7472a56")
STATS_DIR  = WORLD_PATH / "world" / "stats"
USERCACHE  = WORLD_PATH / "usercache.json"

WORKER_URL   = os.environ.get("WORKER_URL", "https://auth.wirts.world")
STATS_SECRET = os.environ.get("STATS_SECRET", "")

# ── Stat keys we care about ───────────────────────────────────────────────────
# Vanilla stores these under minecraft:custom, minecraft:mined, etc.

# Total ticks played (20 ticks = 1 second)
TICKS_PLAYED_KEY = ("minecraft:custom", "minecraft:play_time")

# Blocks mined — sum of everything under minecraft:mined
MINED_CATEGORY = "minecraft:mined"

# Deaths
DEATHS_KEY = ("minecraft:custom", "minecraft:deaths")

# Mob kills
MOB_KILLS_KEY = ("minecraft:custom", "minecraft:mob_kills")


def load_usercache():
    """Returns a dict of uuid -> username from usercache.json."""
    if not USERCACHE.exists():
        return {}
    try:
        with open(USERCACHE) as f:
            entries = json.load(f)
        return {e["uuid"]: e["name"] for e in entries}
    except Exception as e:
        print(f"Warning: could not read usercache.json: {e}")
        return {}


def ticks_to_hours(ticks):
    return round(ticks / 20 / 3600, 1)


def parse_player_stats(uuid, username, stat_file):
    try:
        with open(stat_file) as f:
            data = json.load(f)
        stats = data.get("stats", {})

        # Time played
        custom = stats.get("minecraft:custom", {})
        ticks = custom.get("minecraft:play_time", custom.get("minecraft:play_one_minute", 0))
        hours = ticks_to_hours(ticks)

        # Blocks mined (sum all entries in minecraft:mined)
        mined_cat = stats.get("minecraft:mined", {})
        blocks_mined = sum(mined_cat.values())

        # Deaths
        deaths = custom.get("minecraft:deaths", 0)

        # Mob kills
        mob_kills = custom.get("minecraft:mob_kills", 0)

        return {
            "uuid": uuid,
            "username": username,
            "hoursPlayed": hours,
            "blocksMined": blocks_mined,
            "deaths": deaths,
            "mobKills": mob_kills,
        }
    except Exception as e:
        print(f"Warning: could not parse stats for {uuid}: {e}")
        return None


def push(players):
    payload = json.dumps({"players": players}).encode("utf-8")
    req = urllib.request.Request(
        f"{WORKER_URL}/api/stats",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {STATS_SECRET}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            body = res.read().decode()
            print(f"Pushed {len(players)} players. Response: {body}")
    except urllib.error.HTTPError as e:
        print(f"HTTP error pushing stats: {e.code} {e.reason}")
    except urllib.error.URLError as e:
        print(f"Network error pushing stats: {e.reason}")


def main():
    if not STATS_SECRET:
        print("Error: STATS_SECRET environment variable is not set.")
        return

    if not STATS_DIR.exists():
        print(f"Error: stats directory not found at {STATS_DIR}")
        return

    usercache = load_usercache()
    players = []

    for stat_file in STATS_DIR.glob("*.json"):
        uuid = stat_file.stem
        username = usercache.get(uuid, uuid)  # fall back to UUID if not in cache
        result = parse_player_stats(uuid, username, stat_file)
        if result:
            players.append(result)

    # Sort by hours played descending
    players.sort(key=lambda p: p["hoursPlayed"], reverse=True)

    if not players:
        print("No player stats found.")
        return

    push(players)


if __name__ == "__main__":
    main()
