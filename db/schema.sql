--
-- PostgreSQL database dump
--

-- Dumped from database version 18.3 (Debian 18.3-1.pgdg13+1)
-- Dumped by pg_dump version 18.3 (Debian 18.3-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: api_discord; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_discord (
    bot_token text NOT NULL,
    server_id text NOT NULL,
    url_member_role text NOT NULL,
    url_member text NOT NULL,
    notification_channel_id text DEFAULT ''::text NOT NULL
);


--
-- Name: api_itad; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_itad (
    api_key text NOT NULL,
    url_lookup_game text NOT NULL,
    url_get_current_prices text NOT NULL,
    country character varying(2) NOT NULL,
    trusted_shops text NOT NULL
);


--
-- Name: api_steam; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_steam (
    api_key text NOT NULL,
    url_get_app_details text NOT NULL,
    url_get_player_summaries text NOT NULL
);


--
-- Name: attendee_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendee_roles (
    role integer NOT NULL,
    label character varying(50) NOT NULL,
    discord_role_ids text[],
    is_base boolean DEFAULT false NOT NULL
);


--
-- Name: attendees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendees (
    id integer NOT NULL,
    steam_id character varying(20) NOT NULL,
    persona_name text,
    avatar text,
    avatar_medium text,
    avatar_full text,
    discord_id text,
    first_name character varying(100),
    last_name character varying(100),
    role integer,
    level integer DEFAULT 1 NOT NULL,
    is_new boolean DEFAULT false NOT NULL,
    active boolean DEFAULT false NOT NULL,
    last_update bigint DEFAULT 0 NOT NULL
);


--
-- Name: attendees_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attendees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attendees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attendees_id_seq OWNED BY public.attendees.id;


--
-- Name: config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.config (
    event_date timestamp with time zone NOT NULL,
    motd_title text DEFAULT ''::text NOT NULL,
    motd_body text DEFAULT ''::text NOT NULL,
    use_twitch boolean DEFAULT false NOT NULL,
    game_ttl bigint DEFAULT 0 NOT NULL,
    attendee_ttl bigint DEFAULT 0 NOT NULL,
    show_inactive_games boolean DEFAULT false NOT NULL,
    show_inactive_attendees boolean DEFAULT false NOT NULL,
    update_inactive_games boolean DEFAULT false NOT NULL,
    update_inactive_attendees boolean DEFAULT false NOT NULL
);


--
-- Name: games; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.games (
    id integer NOT NULL,
    steam_appid character varying(20),
    itad_id character varying(60),
    name text NOT NULL,
    header_image text,
    is_free boolean DEFAULT false NOT NULL,
    is_gamepass boolean DEFAULT false NOT NULL,
    gamepass_url text,
    url text,
    price_old numeric(8,2),
    price_new numeric(8,2),
    priority integer DEFAULT 999 NOT NULL,
    active boolean DEFAULT false NOT NULL,
    last_update bigint DEFAULT 0 NOT NULL
);


--
-- Name: games_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.games_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: games_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.games_id_seq OWNED BY public.games.id;


--
-- Name: attendees id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendees ALTER COLUMN id SET DEFAULT nextval('public.attendees_id_seq'::regclass);


--
-- Name: games id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.games ALTER COLUMN id SET DEFAULT nextval('public.games_id_seq'::regclass);


--
-- Name: attendee_roles attendee_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendee_roles
    ADD CONSTRAINT attendee_roles_pkey PRIMARY KEY (role);


--
-- Name: attendees attendees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendees
    ADD CONSTRAINT attendees_pkey PRIMARY KEY (id);


--
-- Name: attendees attendees_steam_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendees
    ADD CONSTRAINT attendees_steam_id_key UNIQUE (steam_id);


--
-- Name: games games_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_pkey PRIMARY KEY (id);


--
-- Name: attendees attendees_role_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendees
    ADD CONSTRAINT attendees_role_fkey FOREIGN KEY (role) REFERENCES public.attendee_roles(role);


--
-- PostgreSQL database dump complete
--