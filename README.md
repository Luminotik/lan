# LynxLAN

A self-hosted LAN party organizer that tracks games, attendees, and event information. Displays upcoming games with live pricing from Steam and IsThereAnyDeal, shows attendee Steam profiles, counts down to the next event, syncs attendee roles to a Discord server, and posts price-drop notifications to Discord.

## Features

- **Games list**: real-time pricing from Steam and IsThereAnyDeal, including sale prices and Game Pass availability
- **Attendees**: Steam profiles pulled live from the Steam API with hierarchical role and level styling
- **Event countdown**: real-time timer to the next event date
- **MOTD banner**: optional message of the day for event announcements
- **Media**: embedded YouTube video or live Twitch stream
- **Background refresh**: game prices and attendee profiles refresh automatically based on configurable TTLs
- **Discord price-drop notifications**: posts to a configured channel, mentioning attendees who don't own the game (or the base attendee role when ownership can't be checked)
- **Discord role sync**: assigns and removes roles in a Discord server based on attendee active status and role
- **Admin alerts**: server errors and failed integrations are sent as Discord DMs to a configured admin
- **Admin console**: protected web UI for managing games, attendees, configuration, and manual Discord announcements

## Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: React, Vite
- **Database**: PostgreSQL
- **Reverse proxy**: Traefik
- **Authentication**: JWT in an httpOnly cookie, bcrypt password hashing
- **External APIs**: Steam Web API, IsThereAnyDeal API, Discord API

## Running Locally

### Prerequisites

- Node.js v24 (matches the Docker image)
- PostgreSQL v16+

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/luminotik/lan.git
   cd lan
   ```

2. Install server and client dependencies:
   ```bash
   npm install
   cd client && npm install && cd ..
   ```

3. Create a `.env` file in the project root (see [Environment Variables](#environment-variables)).

4. Create the database schema:
   ```bash
   psql -U youruser -d lan -f db/schema.sql
   ```

5. Populate the `config`, `api_steam`, `api_itad`, `api_discord`, and `attendee_roles` tables. See [External API Setup](#external-api-setup).

6. Build the client and start the server:
   ```bash
   cd client && npm run build && cd ..
   node server/index.js
   ```

   For frontend work with hot reload, also run the Vite dev server in a separate terminal (it proxies `/api` to port 3001):
   ```bash
   cd client && npm run dev
   ```

7. Open `http://localhost:3001` (production build) or `http://localhost:5173` (dev server). The admin console is at `/admin`.

## Environment Variables

See [`.env.example`](.env.example):

| Variable | Purpose |
|---|---|
| `PORT` | HTTP port (default `3001`) |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` | PostgreSQL connection |
| `ADMIN_PASSWORD_HASH` | bcrypt hash of the admin console password |
| `JWT_SECRET` | Secret used to sign admin session tokens |
| `NODE_ENV` | Set to `production` in the Docker image; enables the `Secure` cookie flag. Leave unset for local HTTP development |

Steam, ITAD, and Discord credentials and URL templates live in the database (`api_steam`, `api_itad`, `api_discord`), not in environment variables. Site configuration lives in the `config` table.

## External API Setup

URL columns are templates; placeholders like `{key}`, `{appid}`, `{server_id}` are substituted at request time.

### Steam Web API

Obtain a key at [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey) and populate `api_steam`:

| Column | Example |
|---|---|
| `url_get_app_details` | `https://store.steampowered.com/api/appdetails?appids={appids}` |
| `url_get_player_summaries` | `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key={key}&steamids={steamids}` |
| `url_get_owned_games` | `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key={key}&steamid={steamid}` |

Owned games are used to target price-drop mentions. Attendees with private Steam libraries keep their last-known library.

### IsThereAnyDeal API

Obtain a key at [isthereanydeal.com/dev/app](https://isthereanydeal.com/dev/app) and populate `api_itad`, including `url_lookup_game`, `url_get_current_prices`, `url_get_shops`, and `url_search_games`. `trusted_shops` is a comma-separated list of shop IDs used to limit price comparisons, and can be managed from the admin Config page.

### Discord

Create an application and bot at [discord.com/developers/applications](https://discord.com/developers/applications). The bot needs:

- **Manage Roles** permission
- **Server Members Intent** enabled under Privileged Gateway Intents
- A role positioned above the LAN roles it manages
- Permission to send messages in the notification channel

Populate `api_discord` with the bot token, server ID, URL templates (`url_member`, `url_member_role`, `url_channel_message`, `url_private_message`), `notification_channel_id` for price drops and announcements, and `admin_user_id` for error alerts.

In `attendee_roles`, set `discord_role_ids` to the Discord roles each LAN role should receive, and mark the base attendee role with `is_base = true`.

## Deployment

LynxLAN runs as a Docker container behind a Traefik reverse proxy.

- Images are built and pushed to [Docker Hub](https://hub.docker.com/r/luminotik/lan) by GitHub Actions on every push to `master`, and rebuilt weekly to pick up base-image patches.
- Dependabot opens weekly PRs for npm, Docker, and GitHub Actions updates.
- Provide all environment variables to the container at runtime; don't bake secrets into the image.
- Map `/app/logs` to persistent storage to keep the application log (`app.log`, rotated at 10 MB) across container recreation.

To build locally:

```bash
docker build -t lan-app .
```

## Admin Console

Available at `/admin`, protected by the password in `ADMIN_PASSWORD_HASH`. Sessions last 30 days. Login attempts are rate-limited to 5 per 15 minutes per client.

- **Games**: add, edit, activate/deactivate, and delete games. New games are validated against Steam and IsThereAnyDeal from a Steam App ID or store URL, or entered manually.
- **Attendees**: add, edit, activate/deactivate, and delete attendees. New attendees are validated against Steam, and Discord IDs are validated as server members. Discord roles sync automatically on every change.
- **Config**: event date, MOTD, Twitch/YouTube toggle, refresh TTLs, inactive-record display and refresh flags, and ITAD trusted shops.
- **Notifications**: post a one-off message to the Discord notification channel, optionally mentioning the attendee role.

## License

GPL-3.0. See [LICENSE](LICENSE) for details.
