import fetch from 'node-fetch';

import pool from '../db.js';

async function getSteamConfig() {
	const { rows } = await pool.query(
		`SELECT	api_key,
				url_get_app_details,
				url_get_player_summaries
		 FROM	api_steam
		 LIMIT	1`
	);
	return rows[0];
}

// Get app details for a given Steam App ID. Returns { name, header_image, is_free } or null.
export async function getAppDetails(steam_appid) {
	const steam = await getSteamConfig();

	const url = steam.url_get_app_details.replace('{appids}', steam_appid);
	const res = await fetch(url);
	const json = await res.json();
	const data = json[steam_appid]?.data;

	if (!data) return null;

	return {
		name: data.name,
		header_image: data.header_image,
		is_free: data.is_free
	};
}

// Get player summaries for one or more Steam IDs. Returns an array of player objects.
export async function getPlayerSummaries(steam_ids) {
	const steam = await getSteamConfig();

	const ids = Array.isArray(steam_ids) ? steam_ids.join(',') : steam_ids;
	const url = steam.url_get_player_summaries
		.replace('{key}', steam.api_key)
		.replace('{steamids}', ids);

	const res = await fetch(url);
	const json = await res.json();

	return json.response?.players ?? [];
}