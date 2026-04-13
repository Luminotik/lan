-- Configuration (single row)
CREATE TABLE config (
    event_date                TIMESTAMPTZ,
    motd_title                TEXT        NOT NULL DEFAULT '',
    motd_body                 TEXT        NOT NULL DEFAULT '',
    use_twitch                BOOLEAN     NOT NULL DEFAULT false,
    game_ttl                  BIGINT      NOT NULL,
    attendee_ttl              BIGINT      NOT NULL,
    show_inactive_games       BOOLEAN     NOT NULL DEFAULT false,
    show_inactive_attendees   BOOLEAN     NOT NULL DEFAULT false,
    update_inactive_games     BOOLEAN     NOT NULL DEFAULT false,
    update_inactive_attendees BOOLEAN     NOT NULL DEFAULT false
);

-- Steam API configuration (single row)
CREATE TABLE api_steam (
    api_key                  TEXT NOT NULL,
    url_get_app_details      TEXT NOT NULL,
    url_get_player_summaries TEXT NOT NULL
);

-- ITAD API configuration (single row)
CREATE TABLE api_itad (
    api_key                TEXT NOT NULL,
    url_get_current_prices TEXT NOT NULL,
    country                VARCHAR(2) NOT NULL,
    trusted_shops          TEXT NOT NULL
);

-- Attendee roles reference table
CREATE TABLE attendee_roles (
    role     INTEGER PRIMARY KEY,
    label    VARCHAR(50) NOT NULL
);

-- Games
CREATE TABLE games (
    id           SERIAL PRIMARY KEY,
    steam_appid  VARCHAR(20),
    itad_id      VARCHAR(60),
    name         TEXT        NOT NULL,
    header_image TEXT,
    is_free      BOOLEAN     NOT NULL DEFAULT false,
    is_gamepass  BOOLEAN     NOT NULL DEFAULT false,
    gamepass_url TEXT,
    url          TEXT,
    price_old    NUMERIC(8,2),
    price_new    NUMERIC(8,2),
    priority     INTEGER     NOT NULL DEFAULT 999,
    active       BOOLEAN     NOT NULL DEFAULT false,
    last_update  BIGINT      NOT NULL DEFAULT 0
);

-- Attendees
CREATE TABLE attendees (
    id                SERIAL PRIMARY KEY,
    steam_id          VARCHAR(20) UNIQUE NOT NULL,
    persona_name      TEXT,
    avatar            TEXT,
    avatar_medium     TEXT,
    avatar_full       TEXT,
    first_name        VARCHAR(100),
    last_name         VARCHAR(100),
    phone             VARCHAR(20),
    active            BOOLEAN     NOT NULL DEFAULT false,
    role              INTEGER     REFERENCES attendee_roles(role),
    level             INTEGER,
    is_new            BOOLEAN     NOT NULL DEFAULT false,
    sms_notifications BOOLEAN     NOT NULL DEFAULT false,
    last_update       BIGINT      NOT NULL DEFAULT 0,
    last_notification BIGINT      NOT NULL DEFAULT 0
);