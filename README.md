# LynxLAN

A self-hosted LAN party organizer that displays upcoming games with live pricing from Steam and IsThereAnyDeal, shows attendee Steam profiles, and includes a countdown timer to the next event. Built with a Node.js/Express backend, React frontend, and PostgreSQL database.

## Features

- **Games list** — displays active games with real-time pricing sourced from Steam and IsThereAnyDeal, including sale prices and Game Pass availability
- **Attendees** — shows Steam profiles for all active attendees, pulled live from the Steam API
- **Event countdown** — counts down to the next LAN event date
- **MOTD** — optional message of the day banner for announcements
- **Skeleton loaders** — placeholder UI while data loads
- **Background refresh** — game prices and attendee profiles refresh automatically based on configurable TTLs
- **Admin console** — protected web UI for managing games, attendees, and event configuration

## Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: React, Vite
- **Database**: PostgreSQL
- **Reverse proxy**: Traefik
- **Authentication**: JWT with bcrypt password hashing
- **External APIs**: Steam Web API, IsThereAnyDeal API

## Running Locally

### Prerequisites

- Node.js v20+
- PostgreSQL

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

6. Start the Express server:
   ```bash
   node server/index.js
   ```

7. In a separate terminal, start the React dev server:
   ```bash
   cd client
   npm run dev
   ```

8. Open `http://localhost:5173` in your browser.

The admin console is available at `http://localhost:5173/admin`.

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

# Steam Web API
# Obtain a key at https://steamcommunity.com/dev/apikey
STEAM_API_KEY=

# IsThereAnyDeal API
# Obtain a key at https://isthereanydeal.com/dev/app/
ITAD_API_KEY=

# Twilio (optional, for SMS notifications)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# Admin console
# Generate a hash with: node -e "import('bcrypt').then(m => m.default.hash('yourpassword', 12).then(h => console.log(h)))"
ADMIN_PASSWORD_HASH=
# Generate a secret with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=
```

## Deployment

LynxLAN is designed to run as a Docker container behind a Traefik reverse proxy.

### Build the image

```bash
docker build -t lan-app .
```

### Run with Docker Compose

A `docker-compose.yml` is provided for deployment alongside PostgreSQL and Traefik. Copy `.env` to your server and run:

```bash
docker compose up -d
```

### Environment

All environment variables listed above should be provided to the container at runtime. Do not bake secrets into the Docker image.

## Admin Console

The admin console is available at `/admin`. It requires a password set via the `ADMIN_PASSWORD_HASH` environment variable. Sessions expire after 8 hours.

From the admin console you can:

- Add, edit, activate, deactivate, and delete games
- Add, edit, activate, deactivate, and delete attendees
- Configure the event date, MOTD, Twitch/YouTube toggle, and refresh TTLs

## License

MIT — see [LICENSE](LICENSE) for details.