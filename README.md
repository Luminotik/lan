# LynxLAN

A self-hosted LAN party organizer that tracks games, attendees, and event information. Displays upcoming games with live pricing from Steam and IsThereAnyDeal, shows attendee Steam profiles, counts down to the next event, and optionally syncs attendee roles to a Discord server and notifies subscribed attendees of price drops via SMS.

## Features

- **Games list** — real-time pricing from Steam and IsThereAnyDeal, including sale prices and Game Pass availability
- **Attendees** — Steam profiles pulled live from the Steam API with hierarchical role and level styling
- **Event countdown** — real-time timer to the next event date
- **MOTD banner** — optional message of the day for event announcements
- **Skeleton loaders** — placeholder UI while data loads
- **Background refresh** — game prices and attendee profiles refresh automatically based on configurable TTLs
- **SMS notifications** — optional Twilio integration for notifying attendees when games drop in price
- **Discord role sync** — optional integration that automatically assigns and removes roles in a Discord server based on attendee active status and role
- **Admin console** — protected web UI for managing games, attendees, and event configuration, with Steam and Discord validation at entry

## Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: React, Vite
- **Database**: PostgreSQL
- **Reverse proxy**: Traefik
- **Authentication**: JWT with bcrypt password hashing
- **External APIs**: Steam Web API, IsThereAnyDeal API, Discord API, Twilio

## Running Locally

### Prerequisites

- Node.js v20+
- PostgreSQL v16+

### Setup

1. Clone the repository:
```bash
git clone https://github.com/luminotik/lan.git
cd lan
```

2. Install server dependencies:
```bash
npm install
```

3. Install client dependencies:
```bash
cd client
npm install
cd ..
```

4. Create a `.env` file in the project root (see [Environment Variables](#environment-variables) below).

5. Set up the database:
```bash
psql -U youruser -d lan -f db/schema.sql
```

6. Populate API configuration in the `api_steam`, `api_itad`, and `api_discord` tables. See [External API Setup](#external-api-setup) for details.

7. Build the client and start the server:
```bash
cd client
npm run build
cd ..
node server/index.js
```

Or for active development with hot reload, start the Vite dev server in a separate terminal:
```bash
cd client
npm run dev
```

8. Open `http://localhost:5173` (dev) or `http://localhost:3001` (production build) in your browser.

The admin console is available at `/admin`.

## Environment Variables

Create a `.env` file in the project root with the following:

```
# Server
PORT=3001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lan
DB_USER=lan
DB_PASS=yourpassword

# Twilio (optional, for SMS notifications)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_TEST_ACCOUNT_SID=
TWILIO_TEST_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
SMS_ENABLED=false
SMS_TEST_MODE=true
SMS_TEST_PHONE=

# Admin console
# Generate a hash with: node -e "import('bcrypt').then(m => m.default.hash('yourpassword', 12).then(h => console.log(h)))"
ADMIN_PASSWORD_HASH=
# Generate a secret with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=
```

API keys for Steam, ITAD, and Discord live in the database (`api_steam`, `api_itad`, `api_discord` tables), not in environment variables. Site configuration lives in the `config` table.

## External API Setup

### Steam Web API

Obtain a key at [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey), then populate the `api_steam` table.

### IsThereAnyDeal API

Obtain a key at [isthereanydeal.com/dev/app](https://isthereanydeal.com/dev/app), then populate the `api_itad` table. The `trusted_shops` column accepts a comma-separated list of shop IDs used to limit price comparisons.

### Discord

Create a Discord application and bot at [discord.com/developers/applications](https://discord.com/developers/applications). The bot needs:
- **Manage Roles** permission
- **Server Members Intent** enabled under Privileged Gateway Intents
- A role hierarchy position above the LAN roles it will manage

Invite the bot to your server, then populate the `api_discord` table with the bot token and server ID. Populate the `discord_role_ids` column in the `attendee_roles` table with the Discord role IDs that should be assigned for each LAN role.

### Twilio

Create a Twilio account and register a messaging campaign for 10DLC compliance. Set the credentials in `.env`. Use `SMS_ENABLED=false` to disable SMS entirely or `SMS_TEST_MODE=true` to route all messages to `SMS_TEST_PHONE`.

## Deployment

LynxLAN is designed to run as a Docker container behind a Traefik reverse proxy.

### Build the image

```bash
docker build -t lan-app .
```

### Pull a published image

Images are published to [Docker Hub](https://hub.docker.com/r/luminotik/lan) on every push to master via GitHub Actions.

### Environment

All environment variables listed above should be provided to the container at runtime. Do not bake secrets into the Docker image.

## Admin Console

The admin console is available at `/admin`. It requires a password set via the `ADMIN_PASSWORD_HASH` environment variable. Sessions expire after 8 hours.

From the admin console you can:

- **Games** — add, edit, activate/deactivate, and delete games. New games are validated against Steam and IsThereAnyDeal before being saved, with Steam-sourced fields locked post-validation. Accepts a Steam App ID or full Steam store URL.
- **Attendees** — add, edit, activate/deactivate, and delete attendees. New attendees are validated against Steam, and if a Discord ID is provided, validated as a member of the configured Discord server. Discord role assignment happens automatically based on LAN role and active status.
- **Configuration** — event date, MOTD title and body, Twitch/YouTube toggle, site name and URL, VCF URL, refresh TTLs, and display flags for inactive records.

## License

GPL-3.0 — see [LICENSE](LICENSE) for details.